// src/features/ancillary/patient/ServiceMatchingPage.tsx
//
// "Instant booking · Finding a nurse near you": an ink hero with a searching ring, a request summary card,
// the TIP card (₹20 / ₹30 / ₹50 -> "Add ₹X tip", removable until a provider accepts; PUT .../tip), "What happens
// next" and the Cancel request footer. A provider accepting (socket push or the 2 s status poll) navigates to
// the visit screen (TrackAppointment). If nobody accepts in 5 minutes it says nothing is charged and offers to
// schedule instead (Book visit with the same services).
// The status poll also carries tip_amount / total_with_tip / asked_count; asked_count hides when absent.

import React, { useEffect, useRef, useState } from 'react'
import { Animated, BackHandler, Easing, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import Toast from 'react-native-toast-message'
import { APP_COLORS, CARD_SHADOW, TONES } from '../../../config/theme'
import { ROUTES } from '../../../navigation/routes'
import type { AncillaryServiceMatchingParams } from '../../../navigation/types'
import { AppButton, AppFooterBar, AppNumberedSteps } from '../../../components/common'
import { fetchPatientActiveRequestBackend, cancelCareRequestPatientBackend } from '../ancillaryService'
import { setAncillaryRequestTip } from '../ancillaryProviderBookingService'
import ApiService, { showStatusModal } from '../../../services/apiService'
import { openAuthedSocket, type AuthedSocketHandle } from '../../../utils/authedSocket'
import { API_ENDPOINTS } from '../../../constants/apiUrls'
import CancellationDetailsModal from './CancellationDetailsModal'
import { inr, itemsFee, providerNoun } from './ancillaryBookingCopy'
import { apiErrorMessage } from './useVisitPatientAddress'

const ASSIGNED_STATUSES = new Set([
	'ASSIGNED',
	'NURSE_ASSIGNED',
	'EN_ROUTE',
	'ARRIVED',
	'IN_PROGRESS',
	'VERIFICATION_PENDING',
	'COMPLETED',
])

/** Request ended on the server side without anyone accepting. */
const NO_MATCH_PATTERN = /EXPIRED|FAILED|NO_PROVIDER|UNASSIGNED/

const TIP_OPTIONS = [20, 30, 50]
const POPULAR_TIP = 30
/** No acceptance after this long -> offer to schedule instead. */
const NO_ACCEPT_SECONDS = 5 * 60

const elapsedLabel = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

export default function ServiceMatchingPage() {
	const navigation = useNavigation<any>()
	const route = useRoute<any>()
	const insets = useSafeAreaInsets()

	const routeParams: AncillaryServiceMatchingParams & Record<string, any> = route.params || {}
	const bookingId = routeParams.bookingId || routeParams.publicBookingId || routeParams.id || 'active'
	const serviceName = routeParams.serviceName || 'In-home care'
	const addressText = routeParams.addressText || 'Selected location'
	const patientName = routeParams.patientName || 'You'
	const booking = routeParams.booking
	const noun = providerNoun(booking?.serviceKey ?? 'nursing-care')
	const basePrice = booking ? itemsFee(booking.items) : null
	const canTip = bookingId !== 'active'

	const [assigned, setAssigned] = useState(false)
	const [isCancelling, setIsCancelling] = useState(false)
	const [cancelModalVisible, setCancelModalVisible] = useState(false)
	const [elapsed, setElapsed] = useState(0)
	const [endedByServer, setEndedByServer] = useState(false)
	const [askedCount, setAskedCount] = useState<number | null>(null)
	const [serverTotal, setServerTotal] = useState<number | null>(null)
	const [tip, setTip] = useState(0) // confirmed with the server
	const [pendingTip, setPendingTip] = useState(0) // picked, not yet confirmed
	const [tipBusy, setTipBusy] = useState(false)

	// The socket push and the status poll can both see "assigned"; only the first may navigate.
	const hasNavigatedRef = useRef(false)
	// The open socket (if any): while it is connected the status poll only needs to be a slower safety net.
	const socketRef = useRef<AuthedSocketHandle | null>(null)
	const spin = useRef(new Animated.Value(0)).current

	const noOneAccepted = !assigned && (endedByServer || elapsed >= NO_ACCEPT_SECONDS)

	// Searching ring
	useEffect(() => {
		const loop = Animated.loop(
			Animated.timing(spin, { toValue: 1, duration: 1200, easing: Easing.linear, useNativeDriver: true })
		)
		loop.start()
		return () => loop.stop()
	}, [spin])

	// Elapsed clock
	useEffect(() => {
		const id = setInterval(() => setElapsed((s) => s + 1), 1000)
		return () => clearInterval(id)
	}, [])

	// WebSocket Channel for Instant Push Assignment. The server only serves a socket for a
	// specific request the caller owns (no shared "active" feed), so without a booking id
	// we rely on the status polling below.
	useEffect(() => {
		if (!bookingId) return
		let navigateTimeout: ReturnType<typeof setTimeout> | null = null
		const targetId = String(bookingId)

		const socket = openAuthedSocket(API_ENDPOINTS.ANCILLARY.WS_PATIENT_REQUEST(targetId), (payload) => {
			if (payload.type === 'CARE_REQUEST_STATUS_CHANGE' && payload.data) {
				const st = String(payload.data.status || '').toUpperCase()
				if (ASSIGNED_STATUSES.has(st)) {
					setAssigned(true)
					if (navigateTimeout) clearTimeout(navigateTimeout)
					navigateTimeout = setTimeout(() => {
						if (hasNavigatedRef.current) return
						hasNavigatedRef.current = true
						navigation.replace(ROUTES.STACK.ANCILLARY_TRACK_APPOINTMENT, {
							bookingId: payload.data.requestId || payload.data.id || targetId,
							bookingData: payload.data,
						})
					}, 400)
				}
			}
		})
		socketRef.current = socket

		return () => {
			if (navigateTimeout) clearTimeout(navigateTimeout)
			socketRef.current = null
			socket.close()
		}
	}, [bookingId, navigation])

	// Active Real-Time Polling via Backend Status API
	useEffect(() => {
		let isMounted = true
		let navigateTimeout: ReturnType<typeof setTimeout> | null = null

		const checkStatus = async () => {
			if (!isMounted) return
			try {
				let data: any = null
				const targetBookingId = bookingId && bookingId !== 'active' ? String(bookingId) : ''

				// 1. Primary: Fetch specific booking status directly
				if (targetBookingId) {
					try {
						// Polled every ~2s: a failure must not pop the global error dialog on every tick.
						const res = await ApiService.get<any>(API_ENDPOINTS.ANCILLARY.REQUEST_STATUS(targetBookingId), {
							skipGlobalError: true,
						})
						data = res.data?.data || res.data
					} catch {
						// Fallback to active request
					}
				}

				// 2. Secondary: Fallback to active request endpoint
				if (!data || !data.status) {
					const activeReq = await fetchPatientActiveRequestBackend()
					if (activeReq) {
						data = {
							...activeReq,
							requestId: activeReq.id,
							assignedProvider: activeReq.provider?.id ? activeReq.provider : null,
						}
					}
				}

				if (isMounted && data && data.status) {
					const st = String(data.status).toUpperCase()
					const asked = Number(data.asked_count)
					if (Number.isFinite(asked) && asked > 0) setAskedCount(asked)
					const withTip = Number(data.total_with_tip)
					if (Number.isFinite(withTip) && withTip > 0) setServerTotal(withTip)
					if (data.tip_amount != null && Number.isFinite(Number(data.tip_amount))) {
						setTip(Number(data.tip_amount))
					}
					if (NO_MATCH_PATTERN.test(st)) setEndedByServer(true)
					if (ASSIGNED_STATUSES.has(st)) {
						setAssigned(true)
						if (!navigateTimeout) {
							navigateTimeout = setTimeout(() => {
								if (isMounted && !hasNavigatedRef.current) {
									hasNavigatedRef.current = true
									navigation.replace(ROUTES.STACK.ANCILLARY_TRACK_APPOINTMENT, {
										bookingId: data.requestId || data.id || targetBookingId || 'active',
										bookingData: data,
									})
								}
							}, 400)
						}
					}
				}
			} catch (e) {
				console.log('[ServiceMatchingPage] Status check notice:', e)
			}
		}

		let lastCheckAt = Date.now()
		void checkStatus()
		// Every 2 seconds on its own; every 6 seconds while the socket is connected and pushing the changes.
		const pollInterval = setInterval(() => {
			const wait = socketRef.current?.isConnected() ? 6000 : 2000
			if (Date.now() - lastCheckAt < wait - 100) return
			lastCheckAt = Date.now()
			void checkStatus()
		}, 2000)

		return () => {
			isMounted = false
			clearInterval(pollInterval)
			if (navigateTimeout) clearTimeout(navigateTimeout)
		}
	}, [bookingId, navigation])

	const handleNavigateToServices = () => {
		if (navigation.canGoBack()) {
			navigation.goBack()
		} else {
			navigation.navigate(ROUTES.MAIN.TABS)
		}
	}

	useEffect(() => {
		const onBackPress = () => {
			handleNavigateToServices()
			return true
		}

		const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress)
		return () => subscription.remove()
	}, [navigation, routeParams])

	const handleCancelRequestWithReason = async (reason: string) => {
		setIsCancelling(true)
		try {
			await cancelCareRequestPatientBackend(bookingId, reason)
			setCancelModalVisible(false)
			navigation.navigate(ROUTES.MAIN.TABS)
		} catch {
			showStatusModal({
				status: 'error',
				title: 'Could not cancel the request',
				description: 'Please try again.',
				submitText: 'OK',
			})
		} finally {
			setIsCancelling(false)
		}
	}

	// Stop the instant dispatch (best effort), then go to the Later flow with the same services.
	const handleScheduleInstead = async () => {
		if (!booking) {
			handleNavigateToServices()
			return
		}
		setIsCancelling(true)
		try {
			if (bookingId !== 'active') await cancelCareRequestPatientBackend(bookingId, 'Scheduling instead')
		} catch {
			// Already closed on the server, or it will expire on its own -- scheduling must not be blocked.
		} finally {
			setIsCancelling(false)
		}
		navigation.replace(ROUTES.STACK.ANCILLARY_BOOK_VISIT, booking)
	}

	// ---- Tip ----
	const confirmTip = async () => {
		if (!pendingTip || tipBusy) return
		setTipBusy(true)
		try {
			await setAncillaryRequestTip(String(bookingId), pendingTip)
			setTip(pendingTip)
			setPendingTip(0)
		} catch (e) {
			Toast.show({
				type: 'error',
				text1: "Couldn't add the tip",
				text2: apiErrorMessage(e) || 'It may be too late -- a nurse may have accepted already.',
			})
		} finally {
			setTipBusy(false)
		}
	}

	const removeTip = async () => {
		if (tipBusy) return
		setTipBusy(true)
		try {
			await setAncillaryRequestTip(String(bookingId), 0)
			setTip(0)
		} catch (e) {
			Toast.show({
				type: 'error',
				text1: "Couldn't remove the tip",
				text2: apiErrorMessage(e) || 'Please try again.',
			})
		} finally {
			setTipBusy(false)
		}
	}

	// ---- Copy ----
	const total = basePrice != null ? basePrice + tip : serverTotal
	const pillText = [total != null ? inr(total) : '', 'pay after the visit'].filter(Boolean).join(' · ')
	const askedText = askedCount != null ? `${askedCount} verified ${noun}s` : `verified ${noun}s`
	const spinRotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })

	let heroTitle = `Finding a ${noun} near you`
	let heroBody = `We’ve asked ${askedText} within 5 km. The first to accept is assigned, usually in under 2 minutes.`
	if (assigned) {
		heroTitle = `${noun.charAt(0).toUpperCase()}${noun.slice(1)} found!`
		heroBody = 'Opening your visit…'
	} else if (noOneAccepted) {
		heroTitle = `No ${noun} accepted yet`
		heroBody = 'Nothing is charged. You can schedule a visit for a time that suits you instead.'
	}

	const summaryRows = [
		{ label: 'Visit for', value: patientName },
		{ label: 'Address', value: addressText },
		{ label: 'Expected arrival', value: '~15 min after accepted' },
	]

	return (
		<View style={styles.container}>
			<ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
				{/* Hero */}
				<View style={[styles.hero, { paddingTop: 48 + insets.top }]} accessibilityLiveRegion="polite">
					<View style={styles.heroCircle} />
					<View style={styles.ringWrap}>
						{!noOneAccepted && !assigned && (
							<Animated.View style={[styles.ringArc, { transform: [{ rotate: spinRotate }] }]} />
						)}
						<View style={[styles.ringTrack, (noOneAccepted || assigned) && styles.ringTrackStatic]} />
						<View style={styles.ringCore}>
							<MaterialCommunityIcons
								name={
									assigned
										? 'account-check'
										: noOneAccepted
											? 'clock-alert-outline'
											: 'account-search'
								}
								size={34}
								color={APP_COLORS.mintAccent}
							/>
						</View>
					</View>
					<View style={styles.pill}>
						<Text style={styles.pillText}>{pillText}</Text>
					</View>
					<Text style={styles.heroTitle} accessibilityRole="header">
						{heroTitle}
					</Text>
					<Text style={styles.heroBody}>{heroBody}</Text>
					{!noOneAccepted && !assigned && (
						<Text style={styles.searching}>{`Searching · ${elapsedLabel(elapsed)}`}</Text>
					)}
				</View>

				{/* Request summary */}
				<View style={styles.card}>
					<Text style={styles.cardEyebrow}>{`INSTANT VISIT · ${serviceName}`.toUpperCase()}</Text>
					{summaryRows.map((r) => (
						<View key={r.label} style={styles.cardRow}>
							<Text style={styles.cardLabel}>{r.label}</Text>
							<Text style={styles.cardValue} numberOfLines={2}>
								{r.value}
							</Text>
						</View>
					))}
				</View>

				{/* Tip */}
				{canTip && !assigned && !noOneAccepted && (
					<View style={styles.section}>
						<View style={styles.tipHead}>
							<View style={styles.tipTile}>
								<MaterialCommunityIcons name="cash-plus" size={22} color={TONES.sand.ink} />
							</View>
							<View style={styles.flex}>
								<Text style={styles.sectionTitle}>{`Add a tip to get a ${noun} faster`}</Text>
								<Text
									style={styles.muted}
								>{`Nearby ${noun}s see your tip with the request. 100% goes to the ${noun}.`}</Text>
							</View>
						</View>

						{tip === 0 ? (
							<>
								<View
									style={styles.tipRow}
									accessibilityRole="radiogroup"
									accessibilityLabel="Tip amount"
								>
									{TIP_OPTIONS.map((v) => {
										const on = pendingTip === v
										return (
											<TouchableOpacity
												key={v}
												style={[styles.tipChip, on && styles.tipChipOn]}
												onPress={() => setPendingTip(on ? 0 : v)}
												activeOpacity={0.8}
												accessibilityRole="radio"
												accessibilityState={{ checked: on }}
												accessibilityLabel={`${inr(v)} tip${v === POPULAR_TIP ? ', popular' : ''}`}
											>
												<Text style={styles.tipChipText}>{inr(v)}</Text>
												{v === POPULAR_TIP && (
													<View style={styles.popular}>
														<Text style={styles.popularText}>POPULAR</Text>
													</View>
												)}
											</TouchableOpacity>
										)
									})}
								</View>
								{pendingTip > 0 && (
									<>
										<View style={styles.tipActions}>
											<AppButton
												variant="outline"
												size="md"
												style={styles.tipCancel}
												onPress={() => setPendingTip(0)}
												disabled={tipBusy}
											>
												Cancel
											</AppButton>
											<AppButton
												size="md"
												style={styles.tipConfirm}
												onPress={() => void confirmTip()}
												loading={tipBusy}
												disabled={tipBusy}
											>
												{`Add ${inr(pendingTip)} tip`}
											</AppButton>
										</View>
										{basePrice != null && (
											<Text style={styles.finePrint}>
												{`You’ll pay ${inr(basePrice + pendingTip)} after the visit. You can remove the tip until a ${noun} accepts.`}
											</Text>
										)}
									</>
								)}
							</>
						) : (
							<View style={styles.tipped} accessibilityRole="alert">
								<MaterialCommunityIcons name="check-circle" size={20} color={APP_COLORS.success} />
								<Text
									style={styles.tippedText}
								>{`${inr(tip)} tip added · all of it goes to the ${noun}`}</Text>
								<TouchableOpacity
									onPress={() => void removeTip()}
									disabled={tipBusy}
									accessibilityRole="button"
									accessibilityLabel="Remove tip"
									hitSlop={8}
								>
									<Text style={styles.removeText}>Remove</Text>
								</TouchableOpacity>
							</View>
						)}
					</View>
				)}

				{/* What happens next */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>What happens next</Text>
					<AppNumberedSteps
						steps={[
							{ title: `A verified ${noun} nearby accepts your request` },
							{ title: 'You see their name, live location and your start code' },
							{ title: 'Share the start code at your door. Pay after the visit.' },
						]}
					/>
				</View>

				<Text style={styles.footnote}>
					If no one accepts in 5 minutes, we’ll let you know and you can schedule instead. Nothing is charged.
				</Text>
			</ScrollView>

			<AppFooterBar>
				<AppButton
					variant="outline"
					size="lg"
					style={[styles.flex, styles.cancelBtn]}
					labelStyle={styles.cancelLabel}
					onPress={() => setCancelModalVisible(true)}
					loading={isCancelling}
					disabled={isCancelling || assigned}
				>
					Cancel request
				</AppButton>
				{noOneAccepted && (
					<AppButton
						size="lg"
						style={styles.flex}
						onPress={() => void handleScheduleInstead()}
						disabled={isCancelling}
					>
						{booking ? 'Schedule instead' : 'Back to services'}
					</AppButton>
				)}
			</AppFooterBar>

			<CancellationDetailsModal
				visible={cancelModalVisible}
				onClose={() => setCancelModalVisible(false)}
				onConfirmCancel={handleCancelRequestWithReason}
				isCancelling={isCancelling}
			/>
		</View>
	)
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: APP_COLORS.pageBg },
	flex: { flex: 1, minWidth: 0 },
	scroll: { gap: 12, paddingBottom: 16 },

	/* HERO */
	hero: {
		backgroundColor: APP_COLORS.ink,
		paddingHorizontal: 24,
		paddingBottom: 56,
		alignItems: 'center',
		gap: 10,
		overflow: 'hidden',
	},
	heroCircle: {
		position: 'absolute',
		right: -50,
		top: -50,
		width: 160,
		height: 160,
		borderRadius: 9999,
		backgroundColor: APP_COLORS.primary,
	},
	ringWrap: { width: 84, height: 84, alignItems: 'center', justifyContent: 'center' },
	ringTrack: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		borderRadius: 9999,
		borderWidth: 7,
		borderColor: 'rgba(255,255,255,0.15)',
	},
	ringTrackStatic: { borderColor: APP_COLORS.mintAccent },
	ringArc: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		borderRadius: 9999,
		borderWidth: 7,
		borderColor: 'transparent',
		borderTopColor: APP_COLORS.mintAccent,
		zIndex: 1,
	},
	ringCore: {
		width: 70,
		height: 70,
		borderRadius: 9999,
		backgroundColor: APP_COLORS.ink,
		alignItems: 'center',
		justifyContent: 'center',
	},
	pill: {
		paddingHorizontal: 12,
		paddingVertical: 4,
		borderRadius: 9999,
		backgroundColor: APP_COLORS.mintAccent,
	},
	pillText: { fontSize: 12, fontWeight: '800', color: APP_COLORS.ink },
	heroTitle: {
		fontSize: 24,
		lineHeight: 30,
		fontWeight: '800',
		color: APP_COLORS.surface,
		textAlign: 'center',
	},
	heroBody: { maxWidth: 300, fontSize: 14, lineHeight: 20, color: APP_COLORS.mint, textAlign: 'center' },
	searching: { fontSize: 12, fontWeight: '700', color: APP_COLORS.mintAccent },

	/* SUMMARY CARD */
	card: {
		marginTop: -36,
		marginHorizontal: 16,
		padding: 16,
		borderRadius: 14,
		backgroundColor: APP_COLORS.surface,
		gap: 2,
		...CARD_SHADOW,
	},
	cardEyebrow: { fontSize: 12, lineHeight: 16, fontWeight: '800', letterSpacing: 0.6, color: APP_COLORS.primary },
	cardRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 6 },
	cardLabel: { fontSize: 14, lineHeight: 20, color: APP_COLORS.inkMuted },
	cardValue: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: '700', color: APP_COLORS.ink, textAlign: 'right' },

	/* SECTIONS */
	section: { backgroundColor: APP_COLORS.surface, padding: 16, gap: 10 },
	sectionTitle: { fontSize: 16, lineHeight: 22, fontWeight: '800', color: APP_COLORS.ink },
	muted: { fontSize: 12, lineHeight: 17, color: APP_COLORS.inkMuted },
	finePrint: { fontSize: 11, lineHeight: 15, color: APP_COLORS.inkMuted },

	/* TIP */
	tipHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
	tipTile: {
		width: 40,
		height: 40,
		borderRadius: 10,
		backgroundColor: TONES.sand.bg,
		alignItems: 'center',
		justifyContent: 'center',
	},
	tipRow: { flexDirection: 'row', gap: 8 },
	tipChip: {
		flex: 1,
		height: 44,
		borderRadius: 10,
		borderWidth: 1.5,
		borderColor: APP_COLORS.divider,
		backgroundColor: APP_COLORS.surface,
		alignItems: 'center',
		justifyContent: 'center',
	},
	tipChipOn: { borderColor: APP_COLORS.primary, backgroundColor: APP_COLORS.mint },
	tipChipText: { fontSize: 14, fontWeight: '800', color: APP_COLORS.ink },
	popular: {
		position: 'absolute',
		top: -8,
		alignSelf: 'center',
		paddingHorizontal: 6,
		borderRadius: 6,
		backgroundColor: APP_COLORS.success,
	},
	popularText: { fontSize: 9, lineHeight: 14, fontWeight: '800', color: APP_COLORS.surface },
	tipActions: { flexDirection: 'row', gap: 8 },
	tipCancel: { flex: 1 },
	tipConfirm: { flex: 2 },
	tipped: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		paddingVertical: 10,
		paddingHorizontal: 12,
		borderRadius: 10,
		backgroundColor: APP_COLORS.successBg,
	},
	tippedText: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: '700', color: APP_COLORS.success },
	removeText: { fontSize: 13, fontWeight: '700', color: APP_COLORS.danger },

	footnote: {
		marginHorizontal: 16,
		fontSize: 12,
		lineHeight: 17,
		color: APP_COLORS.inkMuted,
		textAlign: 'center',
	},
	cancelBtn: { borderColor: APP_COLORS.danger },
	cancelLabel: { color: APP_COLORS.danger },
})
