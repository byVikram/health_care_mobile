// src/features/ancillary/patient/ServiceMatchingPage.tsx
//
// "Instant booking · Finding a nurse near you": an ink hero with a searching ring, a request summary card,
// the TIP card (₹20 / ₹30 / ₹50 -> "Add ₹X tip", removable until a provider accepts; PUT .../tip), "What happens
// next" and the Cancel request footer. A provider accepting (socket push or the 2 s status poll) navigates to
// the visit screen (TrackAppointment). If nobody accepts in 5 minutes it says nothing is charged and offers to
// search again (the nearby nurses are asked once more; a higher tip also asks the ones who declined) or to schedule instead (Book
// visit with the same services).
// The status poll also carries tip_amount / total_with_tip / asked_count; asked_count hides when absent.

import React, { useEffect, useRef, useState } from 'react'
import {
	Animated,
	AppState,
	BackHandler,
	Easing,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import Toast from 'react-native-toast-message'
import { APP_COLORS, CARD_SHADOW, TONES } from '../../../config/theme'
import { ROUTES } from '../../../navigation/routes'
import type { AncillaryServiceMatchingParams } from '../../../navigation/types'
import {
	AppButton,
	AppFooterBar,
	AppNumberedSteps,
	sheetErrorMessage,
	type AppCancelResult,
} from '../../../components/common'
import { fetchPatientActiveRequestBackend, cancelCareRequestPatientBackend } from '../ancillaryService'
import { searchAncillaryRequestAgain, setAncillaryRequestTip } from '../ancillaryProviderBookingService'
import ApiService from '../../../services/apiService'
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
/** The server's largest tip. */
const TIP_MAX = 100
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
	const [now, setNow] = useState(() => Date.now())
	// When the current search began (a search again starts a new 5 minutes), and whether one is being sent.
	// What the server says about the waiting time (searching_seconds: since the request was made; since_last_search_seconds: since the
	// nurses were last asked) and when this phone heard it. The screen counts on from that, so the time is right after the patient
	// leaves the page and comes back (it used to start again from 0:00). The "Searching" label shows the time since the nurses were last
	// asked, so a Search again (or a raised tip) puts it back to 0:00.
	const [mountMs] = useState(() => Date.now())
	const [searchClock, setSearchClock] = useState<{ searching: number; sinceLast: number; at: number } | null>(null)
	const [searchingAgain, setSearchingAgain] = useState(false)
	const [endedByServer, setEndedByServer] = useState(false)
	const [askedCount, setAskedCount] = useState<number | null>(null)
	const [serverTotal, setServerTotal] = useState<number | null>(null)
	const [tip, setTip] = useState(0) // confirmed with the server
	const [pendingTip, setPendingTip] = useState(0) // picked, not yet confirmed
	// "Other amount": the extra the patient types (whole rupees), added to the tip they have.
	const [customOpen, setCustomOpen] = useState(false)
	const [customText, setCustomText] = useState('')
	const [tipBusy, setTipBusy] = useState(false)

	// The socket push and the status poll can both see "assigned"; only the first may navigate.
	const hasNavigatedRef = useRef(false)
	// The open socket (if any): while it is connected the status poll only needs to be a slower safety net.
	const socketRef = useRef<AuthedSocketHandle | null>(null)
	// When this phone last started a new round itself (Search again, a raised tip): a status reply to a request sent before that
	// still describes the round that ended, so it must not put the old clock back.
	const roundResetAt = useRef(0)
	const spin = useRef(new Animated.Value(0)).current

	const sinceHeard = searchClock ? Math.max(0, Math.floor((now - searchClock.at) / 1000)) : 0
	// How long the patient has been waiting; before the server has answered, since this screen opened.
	const searchingSeconds = searchClock
		? searchClock.searching + sinceHeard
		: Math.max(0, Math.floor((now - mountMs) / 1000))
	// How long since the nurses were last asked (the request was made, or the patient searched again or raised the tip).
	const waited = searchClock ? searchClock.sinceLast + sinceHeard : searchingSeconds
	// The nurses were just asked: a new round starts now, the waiting time carries on.
	const startNewRound = () => {
		roundResetAt.current = Date.now()
		setSearchClock({ searching: searchingSeconds, sinceLast: 0, at: Date.now() })
	}
	const noOneAccepted = !assigned && (endedByServer || waited >= NO_ACCEPT_SECONDS)
	// The request is still open on the server, so the nearby nurses can be asked again.
	const canSearchAgain = bookingId !== 'active' && !endedByServer

	// Searching ring
	useEffect(() => {
		const loop = Animated.loop(
			Animated.timing(spin, { toValue: 1, duration: 1200, easing: Easing.linear, useNativeDriver: true })
		)
		loop.start()
		return () => loop.stop()
	}, [spin])

	// The clock is read from timestamps, not counted tick by tick: timers stop while the app is in the background or the screen is off, and
	// the 5 minutes must still have passed when the patient comes back (the listener refreshes it the moment the app is shown again).
	useEffect(() => {
		const id = setInterval(() => setNow(Date.now()), 1000)
		const sub = AppState.addEventListener('change', (state) => {
			if (state === 'active') setNow(Date.now())
		})
		return () => {
			clearInterval(id)
			sub.remove()
		}
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
			const requestedAt = Date.now()
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
					const searching = data.searching_seconds
					const sinceLast = data.since_last_search_seconds
					if (
						typeof searching === 'number' &&
						typeof sinceLast === 'number' &&
						requestedAt >= roundResetAt.current
					) {
						setSearchClock({ searching, sinceLast, at: Date.now() })
					}
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

	const handleCancelRequestWithReason = async (reason: string): Promise<AppCancelResult> => {
		try {
			await cancelCareRequestPatientBackend(bookingId, reason)
			return { ok: true }
		} catch (e) {
			return { ok: false, error: sheetErrorMessage(e, 'Please try again.') }
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

	// Ask the nearby nurses again (the request is still open); a new 5 minutes starts when someone was asked.
	const handleSearchAgain = async () => {
		if (searchingAgain || !canSearchAgain) return
		setSearchingAgain(true)
		try {
			const res = await searchAncillaryRequestAgain(String(bookingId))
			if (res.notifiedProviders > 0) {
				startNewRound()
				Toast.show({ type: 'success', text1: res.message || `Asked nearby ${noun}s again` })
			} else {
				Toast.show({ type: 'info', text1: res.message || `No ${noun}s are available near you right now` })
			}
		} catch (e) {
			const code = (e as any)?.response?.data?.detail?.code
			Toast.show({
				type: code === 'ALREADY_ASSIGNED' ? 'info' : 'error',
				text1: code === 'ALREADY_ASSIGNED' ? `A ${noun} has just accepted` : "Couldn't search again",
				text2: apiErrorMessage(e) || 'Please try again.',
			})
		} finally {
			setSearchingAgain(false)
		}
	}

	// ---- Tip ----
	const confirmTip = async () => {
		if (!pendingTip || tipBusy) return
		setTipBusy(true)
		try {
			await setAncillaryRequestTip(String(bookingId), pendingTip)
			setTip(pendingTip)
			setPendingTip(0)
			setCustomOpen(false)
			setCustomText('')
			// The nurses are asked again with the tip (also the ones who declined): a new 5 minutes.
			startNewRound()
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

	// A tip that has been added can be raised, never lowered or removed (the server refuses it too). The usual amounts (and "Other") are
	// then ADDED to the tip there is, so the patient picks how much more, up to the server's largest tip.
	const canRaise = tip < TIP_MAX
	const extraTip = pendingTip > 0 ? pendingTip - tip : 0
	const customTooHigh = (Number(customText) || 0) + tip > TIP_MAX
	const onCustomChange = (text: string) => {
		const digits = text.replace(/[^0-9]/g, '').slice(0, 3)
		setCustomText(digits)
		const add = Number(digits) || 0
		setPendingTip(add > 0 && tip + add <= TIP_MAX ? tip + add : 0)
	}

	// ---- Copy ----
	const total = basePrice != null ? basePrice + tip : serverTotal
	// The bill the patient sees next to the tip: the service charge, the tip and what they pay after the visit.
	const serviceCharge = basePrice ?? (serverTotal != null ? Math.max(0, serverTotal - tip) : null)
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
		heroBody = canSearchAgain
			? 'Nothing is charged. Search again, add a tip, or schedule a visit for a time that suits you.'
			: 'Nothing is charged. You can schedule a visit for a time that suits you instead.'
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
						<Text style={styles.searching}>{`Searching · ${elapsedLabel(waited)}`}</Text>
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
				{canTip && !assigned && !endedByServer && (
					<View style={styles.section}>
						<View style={styles.tipHead}>
							<View style={styles.tipTile}>
								<MaterialCommunityIcons name="cash-plus" size={22} color={TONES.sand.ink} />
							</View>
							<View style={styles.flex}>
								<Text style={styles.sectionTitle}>
									{tip > 0
										? `Raise your tip to get a ${noun} faster`
										: `Add a tip to get a ${noun} faster`}
								</Text>
								<Text
									style={styles.muted}
								>{`Nearby ${noun}s see your tip with the request. 100% goes to the ${noun}.`}</Text>
							</View>
						</View>

						{tip > 0 && (
							<View style={styles.tipped} accessibilityRole="alert">
								<MaterialCommunityIcons name="check-circle" size={20} color={APP_COLORS.success} />
								<Text
									style={styles.tippedText}
								>{`${inr(tip)} tip added · all of it goes to the ${noun}`}</Text>
							</View>
						)}
						{tip > 0 && serviceCharge != null && (
							<View
								style={styles.tipBill}
								accessibilityLabel={`Total ${inr(serviceCharge + tip)} after the visit`}
							>
								<View style={styles.tipBillRow}>
									<Text style={styles.tipBillLabel}>Service charge</Text>
									<Text style={styles.tipBillValue}>{inr(serviceCharge)}</Text>
								</View>
								<View style={styles.tipBillRow}>
									<Text style={styles.tipBillLabel}>Tip</Text>
									<Text style={styles.tipBillValue}>{inr(tip)}</Text>
								</View>
								<View style={[styles.tipBillRow, styles.tipBillTotal]}>
									<Text style={styles.tipBillTotalLabel}>Total to pay after the visit</Text>
									<Text style={styles.tipBillTotalValue}>{inr(serviceCharge + tip)}</Text>
								</View>
							</View>
						)}
						{canRaise ? (
							<>
								<Text style={styles.finePrint}>
									{tip > 0
										? `Want a ${noun} faster? Add more to your tip. A tip can’t be removed once it is added.`
										: 'Pick an amount, or enter your own.'}
								</Text>
								<View
									style={styles.tipRow}
									accessibilityRole="radiogroup"
									accessibilityLabel={tip > 0 ? 'Add to the tip' : 'Tip amount'}
								>
									{TIP_OPTIONS.map((v) => {
										const on = !customOpen && pendingTip === tip + v
										const tooHigh = tip + v > TIP_MAX
										return (
											<TouchableOpacity
												key={v}
												style={[
													styles.tipChip,
													on && styles.tipChipOn,
													tooHigh && styles.tipChipOff,
												]}
												onPress={() => {
													setCustomOpen(false)
													setCustomText('')
													setPendingTip(on ? 0 : tip + v)
												}}
												disabled={tooHigh}
												activeOpacity={0.8}
												accessibilityRole="radio"
												accessibilityState={{ checked: on, disabled: tooHigh }}
												accessibilityLabel={`${tip > 0 ? 'Add ' : ''}${inr(v)}${v === POPULAR_TIP && tip === 0 ? ', popular' : ''}`}
											>
												<Text style={styles.tipChipText}>
													{tip > 0 ? `+${inr(v)}` : inr(v)}
												</Text>
												{v === POPULAR_TIP && tip === 0 && (
													<View style={styles.popular}>
														<Text style={styles.popularText}>POPULAR</Text>
													</View>
												)}
											</TouchableOpacity>
										)
									})}
									<TouchableOpacity
										style={[styles.tipChip, customOpen && styles.tipChipOn]}
										onPress={() => {
											setCustomOpen((o) => !o)
											setCustomText('')
											setPendingTip(0)
										}}
										activeOpacity={0.8}
										accessibilityRole="radio"
										accessibilityState={{ checked: customOpen }}
										accessibilityLabel="Other amount"
									>
										<Text style={styles.tipChipText}>Other</Text>
									</TouchableOpacity>
								</View>
								{customOpen && (
									<View style={styles.customRow}>
										<Text style={styles.customRupee}>₹</Text>
										<TextInput
											value={customText}
											onChangeText={onCustomChange}
											style={styles.customInput}
											placeholder={tip > 0 ? 'Amount to add' : 'Tip amount'}
											placeholderTextColor={APP_COLORS.inkMuted}
											keyboardType="number-pad"
											maxLength={3}
											autoFocus
											accessibilityLabel={tip > 0 ? 'Amount to add to the tip' : 'Tip amount'}
										/>
									</View>
								)}
								{customOpen && customTooHigh && (
									<Text
										style={[styles.finePrint, { color: APP_COLORS.danger }]}
									>{`The tip can be ${inr(TIP_MAX)} at most.`}</Text>
								)}
								{pendingTip > 0 && (
									<>
										<View style={styles.tipActions}>
											<AppButton
												variant="outline"
												size="md"
												style={styles.tipCancel}
												onPress={() => {
													setPendingTip(0)
													setCustomOpen(false)
													setCustomText('')
												}}
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
												{tip > 0 ? `Add ${inr(extraTip)} more` : `Add ${inr(pendingTip)} tip`}
											</AppButton>
										</View>
										{basePrice != null && (
											<Text style={styles.finePrint}>
												{`${tip > 0 ? `Your tip becomes ${inr(pendingTip)}. ` : ''}You’ll pay ${inr(basePrice + pendingTip)} after the visit. Once added, a tip can be raised but not removed.`}
											</Text>
										)}
									</>
								)}
							</>
						) : (
							<Text style={styles.finePrint}>{`That is the largest tip (${inr(TIP_MAX)}).`}</Text>
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
					If no one accepts in 5 minutes, we’ll let you know and you can search again or schedule instead.
					Nothing is charged.
				</Text>
			</ScrollView>

			{noOneAccepted ? (
				<AppFooterBar direction="column">
					{canSearchAgain && (
						<AppButton
							size="lg"
							onPress={() => void handleSearchAgain()}
							loading={searchingAgain}
							disabled={searchingAgain || isCancelling}
						>
							Search again
						</AppButton>
					)}
					<View style={styles.footerRow}>
						<AppButton
							variant="outline"
							size="lg"
							style={[styles.flex, styles.cancelBtn]}
							labelStyle={styles.cancelLabel}
							onPress={() => setCancelModalVisible(true)}
							loading={isCancelling}
							disabled={isCancelling || searchingAgain || assigned}
						>
							Cancel request
						</AppButton>
						<AppButton
							variant={canSearchAgain ? 'outline' : 'primary'}
							size="lg"
							style={styles.flex}
							onPress={() => void handleScheduleInstead()}
							disabled={isCancelling || searchingAgain}
						>
							{booking ? 'Schedule instead' : 'Back to services'}
						</AppButton>
					</View>
				</AppFooterBar>
			) : (
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
				</AppFooterBar>
			)}

			<CancellationDetailsModal
				visible={cancelModalVisible}
				onClose={() => setCancelModalVisible(false)}
				onConfirmCancel={handleCancelRequestWithReason}
				onDone={() => {
					setCancelModalVisible(false)
					navigation.navigate(ROUTES.MAIN.TABS)
				}}
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
	tipChipOff: { opacity: 0.4 },
	customRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		paddingHorizontal: 12,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: APP_COLORS.border,
		backgroundColor: APP_COLORS.surface,
	},
	customRupee: { fontSize: 16, fontWeight: '800', color: APP_COLORS.ink },
	customInput: { flex: 1, minWidth: 0, height: 46, fontSize: 16, fontWeight: '700', color: APP_COLORS.ink },
	tipBill: { gap: 6, padding: 12, borderRadius: 12, backgroundColor: APP_COLORS.pageBg },
	tipBillRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
	tipBillLabel: { fontSize: 13, lineHeight: 18, color: APP_COLORS.inkMuted },
	tipBillValue: { fontSize: 13, lineHeight: 18, fontWeight: '700', color: APP_COLORS.ink },
	tipBillTotal: { marginTop: 4, paddingTop: 8, borderTopWidth: 1, borderTopColor: APP_COLORS.divider },
	tipBillTotalLabel: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: '800', color: APP_COLORS.ink },
	tipBillTotalValue: { fontSize: 15, lineHeight: 20, fontWeight: '800', color: APP_COLORS.ink },

	footnote: {
		marginHorizontal: 16,
		fontSize: 12,
		lineHeight: 17,
		color: APP_COLORS.inkMuted,
		textAlign: 'center',
	},
	cancelBtn: { borderColor: APP_COLORS.danger },
	cancelLabel: { color: APP_COLORS.danger },
	footerRow: { flexDirection: 'row', gap: 8 },
})
