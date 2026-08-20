import React, { useEffect, useState, useRef } from 'react'
import {
	View,
	StyleSheet,
	Text,
	Animated,
	Easing,
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

export default function ServiceMatchingPage() {
	const navigation = useNavigation<any>()
	const route = useRoute<any>()
	const insets = useSafeAreaInsets()
	const { width } = useWindowDimensions()

	const routeParams = route.params || {}
	const bookingId = routeParams.bookingId || 'ANC-REQ-991'
	const serviceName = routeParams.serviceName || 'In-Home Healthcare Service'
	const addressText = routeParams.addressText || '42 Healthcare Avenue, Flat 3B'

	const [searchStatus, setSearchStatus] = useState<'SEARCHING' | 'ASSIGNED' | 'FAILED'>('SEARCHING')
	const [assignedProvider, setAssignedProvider] = useState<any>(null)
	const [isCancelling, setIsCancelling] = useState(false)

	// Radar Animation Values
	const pulse1 = useRef(new Animated.Value(0)).current
	const pulse2 = useRef(new Animated.Value(0)).current

	useEffect(() => {
		// Start pulsing animation
		const createPulseAnimation = (anim: Animated.Value, delay: number) => {
			return Animated.loop(
				Animated.sequence([
					Animated.delay(delay),
					Animated.timing(anim, {
						toValue: 1,
						duration: 2000,
						easing: Easing.out(Easing.ease),
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
		const anim2 = createPulseAnimation(pulse2, 1000)

		anim1.start()
		anim2.start()

		return () => {
			anim1.stop()
			anim2.stop()
		}
	}, [pulse1, pulse2])

	// Polling Backend Status
	useEffect(() => {
		let isMounted = true
		const pollInterval = setInterval(async () => {
			try {
				const activeReq = await fetchPatientActiveRequestBackend()
				if (isMounted && activeReq) {
					if (activeReq.status === 'ASSIGNED' || activeReq.status === 'EN_ROUTE') {
						setSearchStatus('ASSIGNED')
						setAssignedProvider(activeReq.provider)
						clearInterval(pollInterval)
						// Transition to tracking page
						setTimeout(() => {
							navigation.replace(ROUTES.STACK.ANCILLARY_TRACK_APPOINTMENT, {
								bookingId: activeReq.id,
								bookingData: activeReq,
							})
						}, 1200)
					}
				}
			} catch (e) {
				console.log('[ServiceMatchingPage] Polling check:', e)
			}
		}, 3000)

		// Timeout fallback after 12 seconds for demonstration matching
		const timeoutTimer = setTimeout(() => {
			if (isMounted && searchStatus === 'SEARCHING') {
				setSearchStatus('ASSIGNED')
				setAssignedProvider({
					name: 'Anita Sharma',
					designation: 'Registered Specialist Nurse',
					rating: 4.9,
				})
				setTimeout(() => {
					navigation.replace(ROUTES.STACK.ANCILLARY_TRACK_APPOINTMENT, {
						bookingId,
						status: 'ASSIGNED',
					})
				}, 1200)
			}
		}, 12000)

		return () => {
			isMounted = false
			clearInterval(pollInterval)
			clearTimeout(timeoutTimer)
		}
	}, [bookingId, navigation, searchStatus])

	const handleCancelRequest = async () => {
		setIsCancelling(true)
		await cancelCareRequestPatientBackend(bookingId, 'Patient cancelled search')
		setIsCancelling(false)
		navigation.navigate(ROUTES.MAIN.TABS)
	}

	return (
		<View style={[styles.container, { paddingTop: insets.top }]}>
			<AppScreenHeader title="Matching Specialist" />

			<View style={styles.content}>
				{/* Radar Animation Area */}
				<View style={styles.radarWrapper}>
					<Animated.View
						style={[
							styles.pulseRing,
							{
								transform: [
									{
										scale: pulse1.interpolate({
											inputRange: [0, 1],
											outputRange: [1, 2.8],
										}),
									},
								],
								opacity: pulse1.interpolate({
									inputRange: [0, 1],
									outputRange: [0.6, 0],
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
											outputRange: [1, 2.8],
										}),
									},
								],
								opacity: pulse2.interpolate({
									inputRange: [0, 1],
									outputRange: [0.6, 0],
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

				{/* Status Message */}
				<View style={styles.statusBox}>
					<AppTypography variant="h2" style={styles.titleText}>
						{searchStatus === 'ASSIGNED' ? 'Specialist Assigned!' : 'Finding Nearest Specialist...'}
					</AppTypography>
					<AppTypography variant="subtitle" style={styles.subtitleText}>
						{searchStatus === 'ASSIGNED'
							? `${assignedProvider?.name || 'Specialist'} has accepted your care request.`
							: 'Broadcasting your request to qualified, verified healthcare professionals nearby.'}
					</AppTypography>
				</View>

				{/* Request Details Card */}
				<View style={styles.detailsCard}>
					<View style={styles.detailRow}>
						<MaterialCommunityIcons name="medical-bag" size={20} color="#1F5F68" />
						<Text style={styles.detailText}>{serviceName}</Text>
					</View>
					<View style={styles.detailRow}>
						<Ionicons name="location-outline" size={20} color="#1F5F68" />
						<Text style={styles.detailText} numberOfLines={2}>
							{addressText}
						</Text>
					</View>
					<View style={styles.detailRow}>
						<Ionicons name="flash-outline" size={20} color="#059669" />
						<Text style={styles.instantTagText}>Instant Platform Dispatch (ETA ~15 mins)</Text>
					</View>
				</View>
			</View>

			{/* Bottom Action Footer */}
			<View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
				<AppButton
					variant="outline"
					onPress={handleCancelRequest}
					loading={isCancelling}
					style={styles.cancelBtn}
				>
					Cancel Request
				</AppButton>
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#F8FAFC',
	},
	content: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 24,
	},
	radarWrapper: {
		width: 140,
		height: 140,
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 36,
	},
	pulseRing: {
		position: 'absolute',
		width: 100,
		height: 100,
		borderRadius: 50,
		backgroundColor: 'rgba(31, 95, 104, 0.25)',
		borderWidth: 1.5,
		borderColor: '#1F5F68',
	},
	centerAvatar: {
		width: 80,
		height: 80,
		borderRadius: 40,
		backgroundColor: '#1F5F68',
		alignItems: 'center',
		justifyContent: 'center',
		shadowColor: '#1F5F68',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.3,
		shadowRadius: 8,
		elevation: 6,
	},
	statusBox: {
		alignItems: 'center',
		marginBottom: 28,
	},
	titleText: {
		fontSize: 20,
		fontWeight: '700',
		color: '#0F172A',
		textAlign: 'center',
		marginBottom: 8,
	},
	subtitleText: {
		fontSize: 13,
		color: '#64748B',
		textAlign: 'center',
		lineHeight: 18,
		paddingHorizontal: 16,
	},
	detailsCard: {
		width: '100%',
		backgroundColor: '#FFFFFF',
		borderRadius: 16,
		padding: 16,
		borderWidth: 1,
		borderColor: '#E2E8F0',
		gap: 12,
	},
	detailRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
	},
	detailText: {
		fontSize: 13,
		fontWeight: '600',
		color: '#1E293B',
		flex: 1,
	},
	instantTagText: {
		fontSize: 12,
		fontWeight: '600',
		color: '#059669',
	},
	footer: {
		paddingHorizontal: 24,
		paddingTop: 12,
		backgroundColor: '#FFFFFF',
		borderTopWidth: 1,
		borderTopColor: '#E2E8F0',
	},
	cancelBtn: {
		borderColor: '#EF4444',
	},
})
