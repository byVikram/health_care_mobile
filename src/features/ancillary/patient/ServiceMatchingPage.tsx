import React, { useEffect, useState, useRef } from 'react'
import {
	Animated,
	BackHandler,
	Easing,
	StyleSheet,
	Text,
	View,
	useWindowDimensions,
} from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { ROUTES } from '../../../navigation/routes'
import AppScreenHeader from '../../../components/common/AppScreenHeader'
import { AppTypography } from '../../../components/common/AppTypography'
import { AppButton } from '../../../components/common/AppButton'
import { fetchPatientActiveRequestBackend, cancelCareRequestPatientBackend } from '../ancillaryService'
import { API_ENDPOINTS } from '../../../constants/apiUrls'
import CancellationDetailsModal from './CancellationDetailsModal'

export default function ServiceMatchingPage() {
	const navigation = useNavigation<any>()
	const route = useRoute<any>()
	const insets = useSafeAreaInsets()
	const { width } = useWindowDimensions()

	const routeParams = route.params || {}
	const bookingId = routeParams.bookingId || routeParams.publicBookingId || routeParams.id || 'active'
	const serviceName = routeParams.serviceName || 'In-Home Healthcare Service'
	const addressText = routeParams.addressText || 'Selected Delivery Location'

	const [searchStatus, setSearchStatus] = useState<'SEARCHING' | 'ASSIGNED' | 'FAILED'>('SEARCHING')
	const [assignedProvider, setAssignedProvider] = useState<any>(null)
	const [isCancelling, setIsCancelling] = useState(false)
	const [cancelModalVisible, setCancelModalVisible] = useState(false)

	// Radar Animation Values
	const pulse1 = useRef(new Animated.Value(0)).current
	const pulse2 = useRef(new Animated.Value(0)).current
	const pulse3 = useRef(new Animated.Value(0)).current

	useEffect(() => {
		const createPulseAnimation = (anim: Animated.Value, delay: number) => {
			return Animated.loop(
				Animated.sequence([
					Animated.delay(delay),
					Animated.timing(anim, {
						toValue: 1,
						duration: 2400,
						easing: Easing.out(Easing.quad),
						useNativeDriver: true,
					}),
					Animated.timing(anim, {
						toValue: 0,
						duration: 0,
						useNativeDriver: true,
					}),
				])
			)
		}

		const anim1 = createPulseAnimation(pulse1, 0)
		const anim2 = createPulseAnimation(pulse2, 800)
		const anim3 = createPulseAnimation(pulse3, 1600)

		anim1.start()
		anim2.start()
		anim3.start()

		return () => {
			anim1.stop()
			anim2.stop()
			anim3.stop()
		}
	}, [pulse1, pulse2, pulse3])

	// WebSocket Channel for Instant Push Assignment
	useEffect(() => {
		let ws: WebSocket | null = null
		let navigateTimeout: ReturnType<typeof setTimeout> | null = null
		try {
			const targetId = String(bookingId || 'active')
			const wsUrl = API_ENDPOINTS.ANCILLARY.WS_PATIENT_REQUEST(targetId)
			ws = new WebSocket(wsUrl)

			ws.onmessage = (event) => {
				try {
					const payload = JSON.parse(event.data)
					if (payload.type === 'CARE_REQUEST_STATUS_CHANGE' && payload.data) {
						const st = String(payload.data.status || '').toUpperCase()
						if (st === 'ASSIGNED' || st === 'NURSE_ASSIGNED' || st === 'EN_ROUTE') {
							setSearchStatus('ASSIGNED')
							if (payload.data.assignedProvider) {
								setAssignedProvider(payload.data.assignedProvider)
							}
							navigateTimeout = setTimeout(() => {
								navigation.replace(ROUTES.STACK.ANCILLARY_TRACK_APPOINTMENT, {
									bookingId: targetId,
									bookingData: payload.data,
								})
							}, 800)
						}
					}
				} catch (e) {
					console.log('[ServiceMatchingPage] WS parse notice:', e)
				}
			}
		} catch (e) {
			console.log('[ServiceMatchingPage] WS setup notice')
		}

		return () => {
			if (navigateTimeout) clearTimeout(navigateTimeout)
			if (ws) ws.close()
		}
	}, [bookingId, navigation])

	// Initial Status Check via HTTP
	useEffect(() => {
		let isMounted = true
		let navigateTimeout: ReturnType<typeof setTimeout> | null = null
		const checkInitialStatus = async () => {
			try {
				const activeReq = await fetchPatientActiveRequestBackend()
				if (isMounted && activeReq) {
					if (activeReq.status === 'ASSIGNED' || activeReq.status === 'EN_ROUTE') {
						setSearchStatus('ASSIGNED')
						setAssignedProvider(activeReq.provider)
						navigateTimeout = setTimeout(() => {
							navigation.replace(ROUTES.STACK.ANCILLARY_TRACK_APPOINTMENT, {
								bookingId: activeReq.id,
								bookingData: activeReq,
							})
						}, 800)
					}
				}
			} catch (e) {
				console.log('[ServiceMatchingPage] Initial check:', e)
			}
		}

		void checkInitialStatus()

		return () => {
			isMounted = false
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
		await cancelCareRequestPatientBackend(bookingId, reason)
		setIsCancelling(false)
		setCancelModalVisible(false)
		navigation.navigate(ROUTES.MAIN.TABS)
	}

	return (
		<View style={styles.container}>
			<AppScreenHeader title="Matching Specialist" onBack={handleNavigateToServices} />

			<View style={styles.content}>
				{/* 1. RADAR SCANNER ANIMATION AREA */}
				<View style={styles.radarWrapper}>
					<Animated.View
						style={[
							styles.pulseRing,
							{
								transform: [
									{
										scale: pulse1.interpolate({
											inputRange: [0, 1],
											outputRange: [1, 2.9],
										}),
									},
								],
								opacity: pulse1.interpolate({
									inputRange: [0, 1],
									outputRange: [0.5, 0],
								}),
							},
						]}
					/>
					<Animated.View
						style={[
							styles.pulseRing,
							{
								transform: [
									{
										scale: pulse2.interpolate({
											inputRange: [0, 1],
											outputRange: [1, 2.9],
										}),
									},
								],
								opacity: pulse2.interpolate({
									inputRange: [0, 1],
									outputRange: [0.5, 0],
								}),
							},
						]}
					/>
					<Animated.View
						style={[
							styles.pulseRing,
							{
								transform: [
									{
										scale: pulse3.interpolate({
											inputRange: [0, 1],
											outputRange: [1, 2.9],
										}),
									},
								],
								opacity: pulse3.interpolate({
									inputRange: [0, 1],
									outputRange: [0.5, 0],
								}),
							},
						]}
					/>

					<View style={styles.centerAvatar}>
						<MaterialCommunityIcons
							name={searchStatus === 'ASSIGNED' ? 'account-check' : 'account-search'}
							size={44}
							color="#FFFFFF"
						/>
					</View>
				</View>

				{/* 2. STATUS & INSTRUCTION */}
				<View style={styles.statusBox}>
					<View style={styles.liveSearchingChip}>
						<View style={styles.searchingDot} />
						<AppTypography variant="caption" style={styles.searchingChipText}>
							{searchStatus === 'ASSIGNED' ? 'MATCH FOUND' : 'SEARCHING NEARBY RNs'}
						</AppTypography>
					</View>

					<AppTypography variant="h2" style={styles.titleText}>
						{searchStatus === 'ASSIGNED'
							? 'Specialist Assigned!'
							: routeParams.bookingPayload?.selectedNurse
								? `Notifying ${routeParams.bookingPayload.selectedNurse.name}...`
								: 'Matching Nearest Nurse...'}
					</AppTypography>

					<AppTypography variant="subtitle" style={styles.subtitleText}>
						{searchStatus === 'ASSIGNED'
							? `${assignedProvider?.name || 'Specialist'} has accepted your care request.`
							: routeParams.bookingPayload?.selectedNurse
								? `Connecting with preferred nurse ${routeParams.bookingPayload.selectedNurse.name} (${routeParams.bookingPayload.selectedNurse.credentials})`
								: 'Broadcasting your care request to certified registered nurses within 5 km...'}
					</AppTypography>
				</View>

				{/* 3. REQUEST SUMMARY CARD */}
				<View style={styles.detailsCard}>
					<View style={styles.detailRow}>
						<View style={styles.iconCircle}>
							<MaterialCommunityIcons name="medical-bag" size={18} color="#2B6F71" />
						</View>
						<View style={styles.detailTextCol}>
							<AppTypography variant="caption" style={styles.detailLabel}>
								Procedure
							</AppTypography>
							<AppTypography variant="body" style={styles.detailVal}>
								{serviceName}
							</AppTypography>
						</View>
					</View>

					<View style={styles.detailRow}>
						<View style={styles.iconCircle}>
							<Ionicons name="location" size={18} color="#2B6F71" />
						</View>
						<View style={styles.detailTextCol}>
							<AppTypography variant="caption" style={styles.detailLabel}>
								Doorstep Location
							</AppTypography>
							<AppTypography variant="body" style={styles.detailVal} numberOfLines={2}>
								{addressText}
							</AppTypography>
						</View>
					</View>

					<View style={styles.detailRow}>
						<View style={styles.iconCircle}>
							<Ionicons name="flash" size={18} color="#059669" />
						</View>
						<View style={styles.detailTextCol}>
							<AppTypography variant="caption" style={styles.detailLabel}>
								Care Dispatch
							</AppTypography>
							<AppTypography variant="body" style={styles.instantTagText}>
								Instant Care: ETA ~15 - 30 minutes
							</AppTypography>
						</View>
					</View>
				</View>
			</View>

			{/* BOTTOM ACTION FOOTER */}
			<View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
				<AppButton
					variant="outline"
					onPress={() => setCancelModalVisible(true)}
					loading={isCancelling}
					style={styles.cancelBtn}
				>
					Cancel Care Request
				</AppButton>
			</View>

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
	container: {
		flex: 1,
		backgroundColor: '#FFFFFF',
	},
	content: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 24,
	},

	/* RADAR ANIMATION */
	radarWrapper: {
		width: 140,
		height: 140,
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 32,
	},
	pulseRing: {
		position: 'absolute',
		width: 100,
		height: 100,
		borderRadius: 50,
		backgroundColor: 'rgba(43, 111, 113, 0.18)',
		borderWidth: 1.5,
		borderColor: '#2B6F71',
	},
	centerAvatar: {
		width: 80,
		height: 80,
		borderRadius: 40,
		backgroundColor: '#2B6F71',
		alignItems: 'center',
		justifyContent: 'center',
		elevation: 6,
		shadowColor: '#2B6F71',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.3,
		shadowRadius: 8,
	},

	/* STATUS TEXT */
	statusBox: {
		alignItems: 'center',
		marginBottom: 28,
		gap: 8,
	},
	liveSearchingChip: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#E6F4F4',
		paddingHorizontal: 10,
		paddingVertical: 3,
		borderRadius: 12,
		gap: 6,
	},
	searchingDot: {
		width: 6,
		height: 6,
		borderRadius: 3,
		backgroundColor: '#2B6F71',
	},
	searchingChipText: {
		fontSize: 10.5,
		fontWeight: '800',
		color: '#2B6F71',
		letterSpacing: 0.4,
	},
	titleText: {
		fontSize: 21,
		fontWeight: '800',
		color: '#0F172A',
		textAlign: 'center',
	},
	subtitleText: {
		fontSize: 13,
		color: '#64748B',
		textAlign: 'center',
		lineHeight: 18,
		paddingHorizontal: 12,
	},

	/* DETAILS SUMMARY CARD */
	detailsCard: {
		width: '100%',
		backgroundColor: '#F8FAFC',
		borderRadius: 16,
		padding: 16,
		borderWidth: 1,
		borderColor: '#E2E8F0',
		gap: 12,
	},
	detailRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	iconCircle: {
		width: 36,
		height: 36,
		borderRadius: 10,
		backgroundColor: '#FFFFFF',
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: 1,
		borderColor: '#E2E8F0',
	},
	detailTextCol: {
		flex: 1,
	},
	detailLabel: {
		fontSize: 11.5,
		color: '#64748B',
	},
	detailVal: {
		fontSize: 13.5,
		fontWeight: '600',
		color: '#0F172A',
		marginTop: 1,
	},
	instantTagText: {
		fontSize: 13,
		fontWeight: '700',
		color: '#059669',
		marginTop: 1,
	},

	/* FOOTER */
	footer: {
		paddingHorizontal: 20,
		paddingTop: 12,
		backgroundColor: '#FFFFFF',
		borderTopWidth: 1,
		borderTopColor: '#E2E8F0',
	},
	cancelBtn: {
		borderColor: '#EF4444',
		borderRadius: 12,
	},
})
