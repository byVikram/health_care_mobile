import React, { useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Image, StyleSheet, TouchableOpacity, View, useWindowDimensions } from 'react-native'
import { useNavigation, useIsFocused } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import {
	MOCK_NURSE_BOOKINGS,
	NurseBooking,
	getBookingState,
	acceptCareRequest,
	getNurseAppointments,
	fetchProviderStatus,
	fetchProviderProfile,
	updateProviderLocation,
	fetchProviderDashboardMetrics,
	updateProviderStatus,
	ProviderDashboardMetrics,
	SoftReviewRequestData,
	AuthorizedDetailedPatientInfo,
} from '../ancillaryService'
import { ROUTES } from '../../../navigation/routes'
import NurseAvailabilityCard from './components/NurseAvailabilityCard'
import IncomingRequestNotificationOverlay, {
	AcceptConfirmationModal,
	DetailedReviewModal,
} from './components/IncomingRequestCard'
import StatusModal from '../../../components/common/StatusModal'
import { AppTypography } from '../../../components/common/AppTypography'
import { API_ENDPOINTS } from '../../../constants/apiUrls'

import { getCurrentLocation } from '../../../services/locationService'

const formatInr = (amount: number): string =>
	`₹${Math.round(amount).toLocaleString('en-IN')}`

export default function StaffAncillaryDashboard() {
	const navigation = useNavigation<any>()
	const isFocused = useIsFocused()
	const { width, height } = useWindowDimensions()
	const isTablet = width >= 600
	const isLandscape = width > height
	const isWideTablet = width >= 960 || (isTablet && isLandscape && width >= 800)
	const isNarrowCol = isTablet && !isWideTablet

	const [bookings, setBookings] = useState<NurseBooking[]>([])
	const [metrics, setMetrics] = useState<ProviderDashboardMetrics | null>(null)
	const [isNurseOnline, setIsNurseOnline] = useState<boolean>(false)
	const [isVerified, setIsVerified] = useState<boolean>(false)
	const [incomingRequest, setIncomingRequest] = useState<SoftReviewRequestData | null>(null)
	const [detailedInfo, setDetailedInfo] = useState<AuthorizedDetailedPatientInfo | null>(null)
	const [requestStep, setRequestStep] = useState<'none' | 'request_card' | 'accept_confirm' | 'detailed_review'>(
		'none'
	)
	const [acceptLoading, setAcceptLoading] = useState(false)
	const [claimedModalVisible, setClaimedModalVisible] = useState(false)
	// Logged-in provider's own specialty (e.g. 'Physiotherapy', 'Nursing Care'), fetched from
	// their profile -- used so offer-card fallback text and default labels reflect this
	// provider's real specialty instead of being hardcoded to Nursing Care for everyone.
	const [specialtyLabel, setSpecialtyLabel] = useState<string>('Home Healthcare')

	// Fetch Initial Provider Status & Verification from DB on Mount
	useEffect(() => {
		let isMounted = true
		const loadStatus = async () => {
			try {
				const profile = await fetchProviderProfile()
				if (!isMounted) return
				const verified = Boolean(
					(profile as any)?.is_verified || (profile as any)?.verification_status === 'approved'
				)
				setIsVerified(verified)
				const label = (profile as any)?.specialty?.label
				if (label) setSpecialtyLabel(String(label))

				if (verified) {
					const status = await fetchProviderStatus()
					if (status && isMounted) {
						setIsNurseOnline(status.isOnline)
					}
				} else {
					setIsNurseOnline(false)
				}
			} catch (e) {
				console.log('[StaffAncillaryDashboard] Load status error:', e)
			}
		}
		loadStatus()
		return () => {
			isMounted = false
		}
	}, [isFocused])

	// Periodic Real Device GPS Location Sync to Database (Every 10 seconds when Online and Verified)
	useEffect(() => {
		if (!isNurseOnline || !isFocused || !isVerified) return

		const sendLocationPing = async () => {
			try {
				const loc = await getCurrentLocation()
				if (loc && loc.latitude != null && loc.longitude != null) {
					await updateProviderLocation(loc.latitude, loc.longitude)
				}
			} catch (err) {
				// Fallback if permission not granted or location unavailable
				const defaultLat = 12.9716
				const defaultLng = 77.5946
				await updateProviderLocation(defaultLat, defaultLng)
			}
		}

		void sendLocationPing()
		const locationInterval = setInterval(sendLocationPing, 10000)
		return () => clearInterval(locationInterval)
	}, [isNurseOnline, isFocused, isVerified])

	// Real-Time WebSocket Channel for Instant Push Notifications (with auto-reconnect)
	useEffect(() => {
		if (!isNurseOnline || !isFocused || !isVerified) return

		let ws: WebSocket | null = null
		let isMounted = true
		let reconnectTimer: ReturnType<typeof setTimeout> | null = null
		let reconnectDelay = 2000 // start at 2s, back off up to 30s

		const initWs = async () => {
			if (!isMounted) return
			try {
				const token = (await AsyncStorage.getItem('access_token')) || ''
				if (!isMounted) return

				const wsUrl = `${API_ENDPOINTS.ANCILLARY.WS_PROVIDER_DISPATCH}?token=${encodeURIComponent(token)}`
				console.log('[WS] Connecting to:', wsUrl)
				ws = new WebSocket(wsUrl)

				ws.onopen = () => {
					console.log('[WS] âœ… Connected to provider dispatch')
					reconnectDelay = 2000 // reset backoff on successful connect
				}

				ws.onmessage = (event) => {
					try {
						const payload = JSON.parse(event.data)
						console.log('[WS] ðŸ“¨ Message received:', payload.type)
						if (payload.type === 'NEW_CARE_REQUEST_OFFER' && payload.data) {
							const reqData = payload.data
							setIncomingRequest({
								id: reqData.requestId || reqData.publicBookingId,
								serviceName: reqData.serviceName,
								requestedDate: reqData.requestedDate || reqData.requestedDateTime,
								requestedTime: reqData.requestedTime,
								generalLocation: reqData.generalLocation || reqData.generalArea,
								distanceKm: reqData.distanceKm !== undefined ? `${reqData.distanceKm} km` : undefined,
								travelTime: reqData.travelTime,
								serviceRequirement: reqData.serviceRequirement,
								requiredSkills: reqData.requiredSkills,
								urgency: reqData.urgency || reqData.urgencyLevel,
								specialRequirements: reqData.specialRequirements,
								earning:
									reqData.providerEarning !== undefined
										? `₹${reqData.providerEarning}`
										: reqData.estimatedEarnings,
								// Patient's full charge, distinct from `earning` (this
								// provider's payout) -- see patient price / provider
								// payout separation requirement.
								patientAmount:
									reqData.totalAmount !== undefined ? `₹${reqData.totalAmount}` : undefined,
								expiresAt: reqData.expiresAt || Date.now() + 60000,
							})
							setRequestStep('request_card')
						}
					} catch (err) {
						console.log('[WS] Message parse error:', err)
					}
				}

				// ws.onmessage = (event) => {
				// 	try {
				// 		const payload = JSON.parse(event.data)
				// 		console.log('[WS] ðŸ“¨ Message received:', payload.type)
				// 		if (payload.type === 'NEW_CARE_REQUEST_OFFER' && payload.data) {
				// 			const reqData = payload.data
				// 			setIncomingRequest({
				// 				id: reqData.requestId || reqData.publicBookingId || 'REQ-OFFER-991',
				// 				serviceName: reqData.serviceName || specialtyLabel,
				// 				requestedDate: 'Today',
				// 				requestedTime: reqData.requestedTime || 'Just now',
				// 				generalLocation: reqData.generalArea || 'Sector 18',
				// 				distanceKm: reqData.distanceKm !== undefined ? `${reqData.distanceKm} km` : '-- km',
				// 				travelTime: reqData.travelTime || '~12 min',
				// 				serviceRequirement: reqData.generalArea || 'In-Home Healthcare Visit',
				// 				requiredSkills: [specialtyLabel, 'Doorstep Visit'],
				// 				urgency: reqData.urgencyLevel || 'Instant',
				// 				specialRequirements: 'Patient Doorstep Assessment',
				// 				earning: reqData.estimatedEarnings || '₹667',
				// 				expiresAt: Date.now() + 60000,
				// 			})
				// 			setRequestStep('request_card')
				// 		}
				// 	} catch (err) {
				// 		console.log('[WS] Message parse error:', err)
				// 	}
				// }

				ws.onerror = (err) => {
					console.log('[WS] âŒ Error:', err)
				}

				ws.onclose = (event) => {
					console.log(
						`[WS] ðŸ”Œ Disconnected — code=${event.code} reason="${event.reason}" wasClean=${event.wasClean}`
					)
					if (isMounted && isNurseOnline) {
						console.log(`[WS] Reconnecting in ${reconnectDelay / 1000}s...`)
						reconnectTimer = setTimeout(() => {
							reconnectDelay = Math.min(reconnectDelay * 2, 30000)
							void initWs()
						}, reconnectDelay)
					}
				}
			} catch (e) {
				console.log('[WS] Setup error:', e)
				if (isMounted) {
					reconnectTimer = setTimeout(() => void initWs(), reconnectDelay)
				}
			}
		}

		void initWs()

		return () => {
			isMounted = false
			if (reconnectTimer) clearTimeout(reconnectTimer)
			if (ws) {
				ws.onclose = null // prevent reconnect on intentional close
				ws.close()
			}
		}
	}, [isNurseOnline, isFocused, isVerified])

	const handleAvailabilityToggle = async (online: boolean) => {
		setIsNurseOnline(online)
		let lat = 0
		let lng = 0
		try {
			const loc = await getCurrentLocation()
			lat = loc.latitude
			lng = loc.longitude
		} catch (_) {
			// Permission denied or unavailable — backend will use last known location
		}
		await updateProviderStatus(online, lat, lng)
		if (!online) {
			setIncomingRequest(null)
			setDetailedInfo(null)
			setRequestStep('none')
		}
	}

	const handleDeclineRequest = () => {
		setIncomingRequest(null)
		setDetailedInfo(null)
		setRequestStep('none')
	}

	const handleAcceptClick = async () => {
		if (!incomingRequest) return
		setAcceptLoading(true)
		try {
			const result = await acceptCareRequest(incomingRequest.id, false)
			if (result.alreadyClaimed || !result.success) {
				setIncomingRequest(null)
				setDetailedInfo(null)
				setRequestStep('none')
				setClaimedModalVisible(true)
				return
			}

			const targetId = result.travelInfo?.requestId || incomingRequest.id

			const newBooking: NurseBooking = {
				id: targetId,
				patientName:
					(result.travelInfo as any)?.patientFullName ||
					(result.travelInfo as any)?.patientName ||
					(result.travelInfo as any)?.patientFirstName ||
					(incomingRequest as any)?.patientName ||
					(incomingRequest as any)?.patientFirstName ||
					'',
				patientAge: (result.travelInfo as any)?.patientAge || (incomingRequest as any)?.patientAge || 0,
				patientGender: (incomingRequest as any)?.patientGender || 'Not Specified',
				patientPhone: result.travelInfo?.patientPhone || (incomingRequest as any)?.patientPhone || '',
				serviceName: incomingRequest.serviceName || 'General Healthcare Service',
				serviceDescription: incomingRequest.serviceRequirement || 'In-home healthcare visit',
				appointmentDate: 'Today',
				appointmentTime: incomingRequest.requestedTime || 'Just now',
				patientAddress:
					result.travelInfo?.streetAddress ||
					incomingRequest.generalLocation ||
					'Healthcare Doorstep Address',
				status: 'assigned',
				otpCode: result.travelInfo?.verificationOtp || '4829',
				completePin: result.travelInfo?.completionPin || '9182',
			}

			setBookings((prev) => [newBooking, ...prev.filter((b) => b.id !== targetId)])
			setIncomingRequest(null)
			setDetailedInfo(null)
			setRequestStep('none')

			// 1-Tap Accept: Navigate directly to ActiveBookingPage (Navigation & En-Route screen)
			navigation.navigate(ROUTES.STACK.NURSE_ACTIVE_BOOKING, { bookingId: targetId })
		} catch (error) {
			console.error('Error accepting request:', error)
		} finally {
			setAcceptLoading(false)
		}
	}

	const handleProceedToVerification = () => {
		const targetId = detailedInfo?.id || incomingRequest?.id
		setRequestStep('none')
		setIncomingRequest(null)
		setDetailedInfo(null)
		if (targetId) {
			navigation.navigate(ROUTES.STACK.NURSE_PATIENT_VERIFICATION, { bookingId: targetId })
		}
	}

	useEffect(() => {
		const syncStatuses = async () => {
			try {
				const [myAppointments, dashboardMetrics] = await Promise.all([
					getNurseAppointments(),
					fetchProviderDashboardMetrics(),
				])

				if (myAppointments) {
					setBookings(myAppointments)
				}

				if (dashboardMetrics) {
					setMetrics(dashboardMetrics)
				}
			} catch (e) {
				console.log('[StaffAncillaryDashboard] Loading provider appointments/metrics notice:', e)
				console.log('[StaffAncillaryDashboard] Loading provider appointments/metrics notice:', e)
			}
		}

		if (isFocused) {
			void syncStatuses()
		}
	}, [isFocused])

	const acceptedCount = metrics?.acceptedCount ?? 0
	const completedCount = metrics?.completedCount ?? 0
	const cancelledCount = metrics?.cancelledCount ?? 0
	// const todayEarningsAmount = metrics?.todayEarnings ?? 0
	const weekEarningsAmount = metrics?.weekEarnings ?? 0
	// const acceptedCount = metrics?.acceptedCount ?? 0
// /	const completedCount = metrics?.completedCount ?? 0
	// const cancelledCount = metrics?.cancelledCount ?? 0
	const todayEarningsAmount = metrics?.todayEarnings ?? 0
	// const weekEarningsAmount = metrics?.weekEarnings ?? 0

	const inProgressBooking = bookings.find((b) => (b.status || '').toLowerCase() === 'in_progress')
	const enRouteOrArrivedBooking = bookings.find((b) => {
		const st = (b.status || '').toLowerCase()
		return st === 'en_route' || st === 'arrived'
	})
	const assignedBooking = bookings.find((b) => {
		const st = (b.status || '').toLowerCase()
		return st === 'assigned' || st === 'nurse_assigned' || st === 'verification_pending'
	})
	const activeBooking = inProgressBooking || enRouteOrArrivedBooking || assignedBooking || null

	const handleStartCare = () => {
		if (!activeBooking) return
		const st = activeBooking.status?.toUpperCase()
		if (st === 'IN_PROGRESS') {
			navigation.navigate(ROUTES.STACK.NURSE_SERVICE_IN_PROGRESS, { bookingId: activeBooking.id })
		} else if (st === 'ARRIVED' || st === 'VERIFICATION_PENDING') {
			navigation.navigate(ROUTES.STACK.NURSE_PATIENT_VERIFICATION, { bookingId: activeBooking.id })
		} else {
			navigation.navigate(ROUTES.STACK.NURSE_ACTIVE_BOOKING, { bookingId: activeBooking.id })
		}
	}

	// -- Helper Sub-Components for Section Rendering --------------------------

	const renderTodaySection = () => (
		<View style={styles.sectionBlock}>
			<View style={styles.sectionHeader}>
				<AppTypography variant="h3" style={styles.sectionTitle}>
					Today
				</AppTypography>
				<TouchableOpacity
					onPress={() => navigation.navigate(ROUTES.STACK.NURSE_TODAY_OVERVIEW, { filter: 'all' })}
					activeOpacity={0.7}
					style={styles.viewAllRow}
				>
					<AppTypography variant="caption" style={styles.viewAllText}>
						View all
					</AppTypography>
					<Ionicons name="arrow-forward" size={13} color="#0C7C7C" />
				</TouchableOpacity>
			</View>

			{isNarrowCol ? (
				/* -- TABLET PORTRAIT 2x2 QUADRANT KPI GRID -- */
				<View style={styles.kpiGridContainer}>
					{/* Top Half: Accepted + Completed */}
					<View style={styles.kpiGridRow}>
						{/* KPI 1: Accepted */}
						<TouchableOpacity
							style={styles.kpiGridCell}
							onPress={() =>
								navigation.navigate(ROUTES.STACK.NURSE_TODAY_OVERVIEW, { filter: 'accepted' })
							}
							activeOpacity={0.8}
						>
							<View style={styles.kpiTopRow}>
								<View style={[styles.kpiIconBox, { backgroundColor: '#E6F4F1' }]}>
									<Ionicons name="checkmark-circle-outline" size={14} color="#0C7C7C" />
								</View>
								<AppTypography variant="h3" style={styles.kpiValueText}>
									{acceptedCount}
								</AppTypography>
							</View>
							<AppTypography variant="caption" style={styles.kpiLabelText}>
								Accepted
							</AppTypography>
						</TouchableOpacity>

						<View style={styles.kpiGridVerticalDivider} />

						{/* KPI 2: Completed */}
						<TouchableOpacity
							style={styles.kpiGridCell}
							onPress={() =>
								navigation.navigate(ROUTES.STACK.NURSE_TODAY_OVERVIEW, { filter: 'completed' })
							}
							activeOpacity={0.8}
						>
							<View style={styles.kpiTopRow}>
								<View style={[styles.kpiIconBox, { backgroundColor: '#EFF6FF' }]}>
									<Ionicons name="bag-check-outline" size={14} color="#2563EB" />
								</View>
								<AppTypography variant="h3" style={[styles.kpiValueText, { color: '#2563EB' }]}>
									{completedCount}
								</AppTypography>
							</View>
							<AppTypography variant="caption" style={styles.kpiLabelText}>
								Completed
							</AppTypography>
						</TouchableOpacity>
					</View>

					<View style={styles.kpiGridHorizontalDivider} />

					{/* Bottom Half: Cancelled + Earnings */}
					<View style={styles.kpiGridRow}>
						{/* KPI 3: Cancelled */}
						<TouchableOpacity
							style={styles.kpiGridCell}
							onPress={() =>
								navigation.navigate(ROUTES.STACK.NURSE_TODAY_OVERVIEW, { filter: 'cancelled' })
							}
							activeOpacity={0.8}
						>
							<View style={styles.kpiTopRow}>
								<View style={[styles.kpiIconBox, { backgroundColor: '#FEF2F2' }]}>
									<Ionicons name="close-circle-outline" size={14} color="#EF4444" />
								</View>
								<AppTypography variant="h3" style={[styles.kpiValueText, { color: '#EF4444' }]}>
									{cancelledCount}
								</AppTypography>
							</View>
							<AppTypography variant="caption" style={styles.kpiLabelText}>
								Cancelled
							</AppTypography>
						</TouchableOpacity>

						<View style={styles.kpiGridVerticalDivider} />

						{/* KPI 4: Earnings */}
						<TouchableOpacity
							style={styles.kpiGridCell}
							onPress={() => navigation.navigate(ROUTES.STACK.NURSE_EARNINGS)}
							activeOpacity={0.8}
						>
							<View style={styles.kpiTopRow}>
								<View style={[styles.kpiIconBox, { backgroundColor: '#E6F4F1' }]}>
									<Ionicons name="wallet-outline" size={14} color="#0C7C7C" />
								</View>
								<AppTypography variant="h3" style={styles.kpiEarningsValueText} numberOfLines={1}>
									{formatInr(todayEarningsAmount)}
								</AppTypography>
							</View>
							<AppTypography variant="caption" style={styles.kpiLabelText}>
								Earnings
							</AppTypography>
						</TouchableOpacity>
					</View>
				</View>
			) : (
				/* -- 4-IN-A-ROW HORIZONTAL KPI STRIP (LANDSCAPE / DESKTOP / MOBILE) -- */
				<View style={styles.kpiCardContainer}>
					{/* KPI 1: Accepted */}
					<TouchableOpacity
						style={styles.kpiCol}
						onPress={() => navigation.navigate(ROUTES.STACK.NURSE_TODAY_OVERVIEW, { filter: 'accepted' })}
						activeOpacity={0.8}
					>
						<View style={styles.kpiTopRow}>
							<View style={[styles.kpiIconBox, { backgroundColor: '#E6F4F1' }]}>
								<Ionicons name="checkmark-circle-outline" size={13} color="#0C7C7C" />
							</View>
							<AppTypography variant="h3" style={styles.kpiValueText}>
								{acceptedCount}
							</AppTypography>
						</View>
						<AppTypography variant="caption" style={styles.kpiLabelText}>
							Accepted
						</AppTypography>
					</TouchableOpacity>

					<View style={styles.kpiDivider} />

					{/* KPI 2: Completed */}
					<TouchableOpacity
						style={styles.kpiCol}
						onPress={() => navigation.navigate(ROUTES.STACK.NURSE_TODAY_OVERVIEW, { filter: 'completed' })}
						activeOpacity={0.8}
					>
						<View style={styles.kpiTopRow}>
							<View style={[styles.kpiIconBox, { backgroundColor: '#EFF6FF' }]}>
								<Ionicons name="bag-check-outline" size={13} color="#2563EB" />
							</View>
							<AppTypography variant="h3" style={[styles.kpiValueText, { color: '#2563EB' }]}>
								{completedCount}
							</AppTypography>
						</View>
						<AppTypography variant="caption" style={styles.kpiLabelText}>
							Completed
						</AppTypography>
					</TouchableOpacity>

					<View style={styles.kpiDivider} />

					{/* KPI 3: Cancelled */}
					<TouchableOpacity
						style={styles.kpiCol}
						onPress={() => navigation.navigate(ROUTES.STACK.NURSE_TODAY_OVERVIEW, { filter: 'cancelled' })}
						activeOpacity={0.8}
					>
						<View style={styles.kpiTopRow}>
							<View style={[styles.kpiIconBox, { backgroundColor: '#FEF2F2' }]}>
								<Ionicons name="close-circle-outline" size={13} color="#EF4444" />
							</View>
							<AppTypography variant="h3" style={[styles.kpiValueText, { color: '#EF4444' }]}>
								{cancelledCount}
							</AppTypography>
						</View>
						<AppTypography variant="caption" style={styles.kpiLabelText}>
							Cancelled
						</AppTypography>
					</TouchableOpacity>

					<View style={styles.kpiDivider} />

					{/* KPI 4: Earnings */}
					<TouchableOpacity
						style={styles.kpiCol}
						onPress={() => navigation.navigate(ROUTES.STACK.NURSE_EARNINGS)}
						activeOpacity={0.8}
					>
						<View style={styles.kpiTopRow}>
							<View style={[styles.kpiIconBox, { backgroundColor: '#E6F4F1' }]}>
								<Ionicons name="wallet-outline" size={13} color="#0C7C7C" />
							</View>
							<AppTypography variant="h3" style={styles.kpiEarningsValueText} numberOfLines={1}>
								{formatInr(todayEarningsAmount)}
							</AppTypography>
						</View>
						<AppTypography variant="caption" style={styles.kpiLabelText}>
							Earnings
						</AppTypography>
					</TouchableOpacity>
				</View>
			)}
		</View>
	)

	const renderActiveCareSection = () => (
		<View style={styles.sectionBlock}>
			<View style={styles.sectionHeader}>
				<AppTypography variant="h3" style={styles.sectionTitle}>
					Active Care
				</AppTypography>
				<TouchableOpacity
					onPress={() => navigation.navigate(ROUTES.STACK.NURSE_TODAY_OVERVIEW, { filter: 'all' })}
					activeOpacity={0.7}
					style={styles.viewAllRow}
				>
					<AppTypography variant="caption" style={styles.viewAllText}>
						View all
					</AppTypography>
					<Ionicons name="arrow-forward" size={13} color="#0C7C7C" />
				</TouchableOpacity>
			</View>

			{activeBooking ? (
				<View style={styles.activeCareCard}>
					{/* Patient Header Row */}
					<View style={styles.patientRow}>
						<Image source={require('../../../assets/Banner/patient.png')} style={styles.patientAvatar} />
						<View style={styles.patientMetaCol}>
							<AppTypography variant="h4" style={styles.patientName} numberOfLines={1}>
								{activeBooking.patientName}
							</AppTypography>
							<AppTypography variant="caption" style={styles.patientSubtext} numberOfLines={1}>
								{activeBooking.patientGender || 'Patient'} • {activeBooking.patientAge} yrs • ID:{' '}
								{activeBooking.id}
							</AppTypography>
						</View>

						{/* Status Badge */}
						<View style={styles.statusPillBadge}>
							<AppTypography variant="caption" style={styles.statusPillText}>
								{(activeBooking.status || 'ASSIGNED').toUpperCase()}
							</AppTypography>
						</View>
					</View>

					{/* Service Requirement Badge Row */}
					<View style={styles.careDetailRow}>
						<Ionicons name="medkit-outline" size={15} color="#0C7C7C" />
						<AppTypography variant="body" style={styles.careServiceName} numberOfLines={1}>
							{activeBooking.serviceName}
						</AppTypography>
					</View>

					{/* Card Divider */}
					<View style={styles.cardDivider} />

					{/* Location & Visit Meta */}
					{isNarrowCol ? (
						<View style={styles.metaStackedContainer}>
							<View style={styles.metaRowLeftFull}>
								<Ionicons name="location-outline" size={15} color="#64748B" />
								<AppTypography variant="caption" style={styles.metaText} numberOfLines={2}>
									{activeBooking.patientAddress}
								</AppTypography>
							</View>
							<View style={styles.metaRowTimePill}>
								<View style={styles.metaTimeChip}>
									<Ionicons name="time-outline" size={13} color="#0C7C7C" />
									<AppTypography variant="caption" style={styles.metaTimeChipText}>
										Today • {activeBooking.appointmentTime}
									</AppTypography>
								</View>
							</View>
						</View>
					) : (
						<View style={styles.metaRowContainer}>
							<View style={styles.metaColLeft}>
								<Ionicons name="location-outline" size={15} color="#64748B" />
								<View style={{ flex: 1 }}>
									<AppTypography variant="caption" style={styles.metaText} numberOfLines={2}>
										{activeBooking.patientAddress}
									</AppTypography>
								</View>
							</View>

							<View style={styles.metaColRight}>
								<View style={styles.metaTimeChip}>
									<Ionicons name="time-outline" size={13} color="#0C7C7C" />
									<AppTypography variant="caption" style={styles.metaTimeChipText}>
										Today • {activeBooking.appointmentTime}
									</AppTypography>
								</View>
								<Ionicons name="chevron-forward" size={15} color="#94A3B8" />
							</View>
						</View>
					)}

					{/* Full Width Primary Action Button */}
					<TouchableOpacity style={styles.primaryActionButton} onPress={handleStartCare} activeOpacity={0.88}>
						<AppTypography variant="body" style={styles.primaryActionText}>
							{activeBooking.status === 'in_progress'
								? 'Resume Ongoing Care'
								: 'Start Verification & Care'}
						</AppTypography>
						<Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
					</TouchableOpacity>
				</View>
			) : (
				<View style={styles.emptyCard}>
					<Ionicons name="medkit-outline" size={28} color="#94A3B8" />
					<AppTypography variant="h4" style={styles.emptyTitle}>
						No Active Visit
					</AppTypography>
					<AppTypography variant="caption" style={styles.emptySubtext}>
						You currently have no active care visits assigned.
					</AppTypography>
				</View>
			)}
		</View>
	)

	const renderEarningsSection = () => (
		<View style={styles.sectionBlock}>
			<View style={styles.sectionHeader}>
				<AppTypography variant="h3" style={styles.sectionTitle}>
					Earnings
				</AppTypography>
				<TouchableOpacity
					onPress={() => navigation.navigate(ROUTES.STACK.NURSE_EARNINGS)}
					activeOpacity={0.7}
					style={styles.viewAllRow}
				>
					<AppTypography variant="caption" style={styles.viewAllText}>
						View earnings
					</AppTypography>
					<Ionicons name="arrow-forward" size={13} color="#0C7C7C" />
				</TouchableOpacity>
			</View>

			<View style={styles.earningsCard}>
				{isNarrowCol ? (
					/* -- TABLET PORTRAIT DUAL-ZONE EARNINGS LAYOUT -- */
					<View style={styles.earningsStackedContainer}>
						{/* Top Zone: Today + This Week metrics */}
						<View style={styles.earningsTopZone}>
							{/* Today Earnings */}
							<View style={styles.earningsHalfCol}>
								<View style={styles.earningsIconBox}>
									<Ionicons name="wallet-outline" size={15} color="#0C7C7C" />
								</View>
								<View style={{ flex: 1 }}>
									<AppTypography variant="caption" style={styles.earningsLabel}>
										Today
									</AppTypography>
									<AppTypography variant="h2" style={styles.earningsValueTeal} numberOfLines={1}>
										{formatInr(todayEarningsAmount)}
									</AppTypography>
									<AppTypography variant="caption" style={styles.trendGreenText} numberOfLines={1}>
										↑ ₹300 vs yesterday
									</AppTypography>
								</View>
							</View>

							<View style={styles.earningsVerticalDivider} />

							{/* This Week Earnings */}
							<View style={styles.earningsHalfCol}>
								<View style={{ flex: 1, paddingLeft: 4 }}>
									<AppTypography variant="caption" style={styles.earningsLabel}>
										This Week
									</AppTypography>
									<AppTypography variant="h2" style={styles.earningsValueDark} numberOfLines={1}>
										{formatInr(weekEarningsAmount)}
									</AppTypography>
									<AppTypography variant="caption" style={styles.trendGreenText} numberOfLines={1}>
										↑ 12% vs last week
									</AppTypography>
								</View>
							</View>
						</View>

						<View style={styles.earningsHorizontalDivider} />

						{/* Bottom Zone: 7-Day Mini Bar Chart Visualizer */}
						<View style={styles.earningsBottomZone}>
							<View style={styles.earningsChartHeader}>
								<AppTypography variant="caption" style={styles.earningsChartLabel}>
									Weekly Revenue Activity
								</AppTypography>
							</View>
							<View style={styles.barChartContainerWide}>
								<View style={styles.barChartBarsRow}>
									<View style={[styles.miniBar, { height: 12 }]} />
									<View style={[styles.miniBar, { height: 20 }]} />
									<View style={[styles.miniBar, { height: 32, backgroundColor: '#0C7C7C' }]} />
									<View style={[styles.miniBar, { height: 16 }]} />
									<View style={[styles.miniBar, { height: 26, backgroundColor: '#0C7C7C' }]} />
									<View style={[styles.miniBar, { height: 18 }]} />
									<View style={[styles.miniBar, { height: 14 }]} />
								</View>
								<View style={styles.barChartDaysRow}>
									{['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
										<AppTypography key={i} variant="caption" style={styles.barDayText}>
											{d}
										</AppTypography>
									))}
								</View>
							</View>
						</View>
					</View>
				) : (
					/* -- LANDSCAPE / DESKTOP / MOBILE 3-COL EARNINGS ROW -- */
					<View style={styles.earningsMainRow}>
						{/* Today Earnings */}
						<View style={styles.earningsLeftCol}>
							<View style={styles.earningsIconBox}>
								<Ionicons name="wallet-outline" size={16} color="#0C7C7C" />
							</View>
							<View>
								<AppTypography variant="caption" style={styles.earningsLabel}>
									Today
								</AppTypography>
								<AppTypography variant="h2" style={styles.earningsValueTeal}>
									{formatInr(todayEarningsAmount)}
								</AppTypography>
								<AppTypography variant="caption" style={styles.trendGreenText}>
									↑ ₹300 vs yesterday
								</AppTypography>
							</View>
						</View>

						<View style={styles.earningsVerticalDivider} />

						{/* Weekly Earnings */}
						<View style={styles.earningsMidCol}>
							<AppTypography variant="caption" style={styles.earningsLabel}>
								This Week
							</AppTypography>
							<AppTypography variant="h2" style={styles.earningsValueDark}>
								{formatInr(weekEarningsAmount)}
							</AppTypography>
							<AppTypography variant="caption" style={styles.trendGreenText}>
								↑ 12% vs last week
							</AppTypography>
						</View>

						{/* Mini Bar Chart Visualizer */}
						<View style={styles.barChartContainer}>
							<View style={styles.barChartBarsRow}>
								<View style={[styles.miniBar, { height: 12 }]} />
								<View style={[styles.miniBar, { height: 20 }]} />
								<View style={[styles.miniBar, { height: 32, backgroundColor: '#0C7C7C' }]} />
								<View style={[styles.miniBar, { height: 16 }]} />
								<View style={[styles.miniBar, { height: 26, backgroundColor: '#0C7C7C' }]} />
								<View style={[styles.miniBar, { height: 18 }]} />
								<View style={[styles.miniBar, { height: 14 }]} />
							</View>
							<View style={styles.barChartDaysRow}>
								{['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
									<AppTypography key={i} variant="caption" style={styles.barDayText}>
										{d}
									</AppTypography>
								))}
							</View>
						</View>
					</View>
				)}
			</View>
		</View>
	)

	return (
		<View style={[styles.screenWrapper, isTablet && styles.screenWrapperTablet]}>
			{/* Incoming Request Notification Overlay */}
			<IncomingRequestNotificationOverlay
				visible={
					incomingRequest !== null && (requestStep === 'request_card' || requestStep === 'accept_confirm')
				}
				request={incomingRequest}
				onAccept={handleAcceptClick}
				onDecline={handleDeclineRequest}
			/>

			{isTablet ? (
				/* -- TABLET BALANCED 2-COLUMN GRID ------------------------- */
				<View style={styles.tabletGridContainer}>
					{/* Row 1: Availability Card (Left) + Today KPIs (Right) */}
					<View style={styles.tabletRow}>
						<View style={styles.tabletCol}>
							<NurseAvailabilityCard
								initialAvailable={isNurseOnline}
								onAvailabilityChange={handleAvailabilityToggle}
							/>
						</View>
						<View style={styles.tabletCol}>{renderTodaySection()}</View>
					</View>

					{/* Row 2: Active Care (Left) + Earnings (Right) */}
					<View style={styles.tabletRow}>
						<View style={styles.tabletCol}>{renderActiveCareSection()}</View>
						<View style={styles.tabletCol}>{renderEarningsSection()}</View>
					</View>
				</View>
			) : (
				/* -- MOBILE RESPONSIVE 1-COLUMN COMPACT STACK ---------------- */
				<View style={styles.mobileStackContainer}>
					<NurseAvailabilityCard
						initialAvailable={isNurseOnline}
						onAvailabilityChange={handleAvailabilityToggle}
					/>
					{renderTodaySection()}
					{renderActiveCareSection()}
					{renderEarningsSection()}
				</View>
			)}

			{/* Modals */}
			<StatusModal
				visible={claimedModalVisible}
				status="error"
				title="Request no longer available"
				description="This care request has already been assigned to another provider."
				onSubmit={() => setClaimedModalVisible(false)}
			/>
		</View>
	)
}

const styles = StyleSheet.create({
	screenWrapper: {
		flex: 1,
		paddingHorizontal: 16,
		paddingTop: 8,
		paddingBottom: 24,
	},
	screenWrapperTablet: {
		paddingHorizontal: 16,
		paddingTop: 10,
		maxWidth: 1200,
		alignSelf: 'center',
		width: '100%',
	},

	/* Responsive Containers */
	mobileStackContainer: {
		gap: 10,
	},
	tabletGridContainer: {
		gap: 14,
	},
	tabletRow: {
		flexDirection: 'row',
		alignItems: 'stretch',
		gap: 14,
	},
	tabletCol: {
		flex: 1,
		minWidth: 0,
	},

	/* Section Headers */
	sectionBlock: {
		gap: 6,
		flex: 1,
	},
	sectionHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginTop: 2,
	},
	sectionTitle: {
		fontSize: 16,
		fontWeight: '700',
		color: '#0F172A',
	},
	viewAllRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	viewAllText: {
		fontSize: 12.5,
		fontWeight: '600',
		color: '#0C7C7C',
	},

	/* Today KPI Container (Single Card with 4 Metrics - Horizontal Strip) */
	kpiCardContainer: {
		flexDirection: 'row',
		backgroundColor: '#FFFFFF',
		borderColor: '#E2E8F0',
		borderWidth: 1,
		borderRadius: 14,
		paddingVertical: 12,
		paddingHorizontal: 6,
		alignItems: 'center',
		shadowColor: '#0F172A',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.02,
		shadowRadius: 2,
		elevation: 1,
		flex: 1,
	},
	kpiCol: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		gap: 2,
		minWidth: 0,
	},
	kpiTopRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 5,
	},
	kpiIconBox: {
		width: 24,
		height: 24,
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
	},
	kpiValueText: {
		fontSize: 16,
		fontWeight: '800',
		color: '#0F172A',
		lineHeight: 20,
	},
	kpiEarningsValueText: {
		fontSize: 13.5,
		fontWeight: '800',
		color: '#0C7C7C',
		lineHeight: 20,
	},
	kpiLabelText: {
		fontSize: 11,
		fontWeight: '600',
		color: '#64748B',
		marginTop: 1,
	},
	kpiDivider: {
		width: 1,
		height: 28,
		backgroundColor: '#F1F5F9',
	},

	/* Today KPI 2x2 Quadrant Grid for Tablet Portrait */
	kpiGridContainer: {
		backgroundColor: '#FFFFFF',
		borderColor: '#E2E8F0',
		borderWidth: 1,
		borderRadius: 14,
		padding: 10,
		shadowColor: '#0F172A',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.02,
		shadowRadius: 2,
		elevation: 1,
		flex: 1,
		justifyContent: 'center',
	},
	kpiGridRow: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 4,
	},
	kpiGridCell: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		gap: 2,
		paddingVertical: 2,
	},
	kpiGridVerticalDivider: {
		width: 1,
		height: 26,
		backgroundColor: '#F1F5F9',
	},
	kpiGridHorizontalDivider: {
		height: 1,
		backgroundColor: '#F1F5F9',
		marginVertical: 4,
	},

	/* Active Care Card */
	activeCareCard: {
		backgroundColor: '#FFFFFF',
		borderColor: '#E2E8F0',
		borderWidth: 1,
		borderRadius: 14,
		padding: 12,
		gap: 8,
		shadowColor: '#0F172A',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.02,
		shadowRadius: 3,
		elevation: 1,
		flex: 1,
		justifyContent: 'space-between',
	},
	patientRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
	},
	patientAvatar: {
		width: 42,
		height: 42,
		borderRadius: 21,
		backgroundColor: '#E2E8F0',
	},
	patientMetaCol: {
		flex: 1,
		minWidth: 0,
	},
	patientName: {
		fontSize: 15,
		fontWeight: '700',
		color: '#0F172A',
	},
	patientSubtext: {
		fontSize: 11.5,
		color: '#64748B',
		marginTop: 1,
	},
	statusPillBadge: {
		backgroundColor: '#FEF3C7',
		paddingHorizontal: 8,
		paddingVertical: 3,
		borderRadius: 10,
		flexShrink: 0,
	},
	statusPillText: {
		fontSize: 11,
		fontWeight: '700',
		color: '#D97706',
	},
	careDetailRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		backgroundColor: '#F0FDFA',
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 8,
	},
	careServiceName: {
		fontSize: 12.5,
		fontWeight: '600',
		color: '#0C7C7C',
		flex: 1,
	},
	cardDivider: {
		height: 1,
		backgroundColor: '#F1F5F9',
		marginVertical: 1,
	},
	metaRowContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 8,
	},
	metaColLeft: {
		flex: 1.2,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 5,
		minWidth: 0,
	},
	metaText: {
		fontSize: 11,
		color: '#475569',
		lineHeight: 15,
	},
	metaColRight: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 5,
		justifyContent: 'flex-end',
		minWidth: 0,
	},
	metaLabelText: {
		fontSize: 10,
		color: '#64748B',
	},
	metaTextBold: {
		fontSize: 11,
		fontWeight: '700',
		color: '#0F172A',
	},
	metaStackedContainer: {
		gap: 6,
	},
	metaRowLeftFull: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		gap: 6,
	},
	metaRowTimePill: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	metaTimeChip: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 5,
		backgroundColor: '#F1F5F9',
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 6,
	},
	metaTimeChipText: {
		fontSize: 11,
		fontWeight: '700',
		color: '#334155',
	},
	primaryActionButton: {
		backgroundColor: '#0C7C7C',
		borderRadius: 10,
		height: 42,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 6,
		marginTop: 2,
	},
	primaryActionText: {
		color: '#FFFFFF',
		fontSize: 13.5,
		fontWeight: '700',
	},

	/* Empty Care Card */
	emptyCard: {
		backgroundColor: '#FFFFFF',
		borderColor: '#E2E8F0',
		borderWidth: 1,
		borderRadius: 14,
		padding: 20,
		alignItems: 'center',
		justifyContent: 'center',
		gap: 4,
		flex: 1,
	},
	emptyTitle: {
		fontSize: 14,
		fontWeight: '700',
		color: '#475569',
	},
	emptySubtext: {
		fontSize: 11.5,
		color: '#64748B',
		textAlign: 'center',
	},

	/* Earnings Card */
	earningsCard: {
		backgroundColor: '#FFFFFF',
		borderColor: '#E2E8F0',
		borderWidth: 1,
		borderRadius: 14,
		padding: 12,
		shadowColor: '#0F172A',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.02,
		shadowRadius: 2,
		elevation: 1,
		flex: 1,
		justifyContent: 'center',
	},
	earningsMainRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	earningsLeftCol: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		flex: 1,
		minWidth: 0,
	},
	earningsIconBox: {
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: '#E6F4F1',
		alignItems: 'center',
		justifyContent: 'center',
		flexShrink: 0,
	},
	earningsLabel: {
		fontSize: 10.5,
		color: '#64748B',
		fontWeight: '500',
	},
	earningsValueTeal: {
		fontSize: 16,
		fontWeight: '800',
		color: '#0C7C7C',
		lineHeight: 20,
	},
	earningsValueDark: {
		fontSize: 16,
		fontWeight: '800',
		color: '#0F172A',
		lineHeight: 20,
	},
	trendGreenText: {
		fontSize: 10,
		color: '#10B981',
		fontWeight: '600',
		marginTop: 1,
	},
	earningsVerticalDivider: {
		width: 1,
		height: 36,
		backgroundColor: '#F1F5F9',
		marginHorizontal: 6,
	},
	earningsMidCol: {
		gap: 1,
		flex: 1,
		minWidth: 0,
	},
	barChartContainer: {
		alignItems: 'center',
		gap: 2,
		paddingLeft: 4,
		flexShrink: 0,
	},
	barChartBarsRow: {
		flexDirection: 'row',
		alignItems: 'flex-end',
		gap: 3,
		height: 28,
	},
	miniBar: {
		width: 4.5,
		borderRadius: 2.2,
		backgroundColor: '#CBD5E1',
	},
	barChartDaysRow: {
		flexDirection: 'row',
		gap: 3,
	},
	barDayText: {
		width: 4.5,
		fontSize: 8,
		fontWeight: '700',
		color: '#94A3B8',
		textAlign: 'center',
	},

	/* Earnings Dual-Zone Layout for Tablet Portrait */
	earningsStackedContainer: {
		gap: 8,
	},
	earningsTopZone: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	earningsHalfCol: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		minWidth: 0,
	},
	earningsHorizontalDivider: {
		height: 1,
		backgroundColor: '#F1F5F9',
		marginVertical: 2,
	},
	earningsBottomZone: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingTop: 2,
	},
	earningsChartHeader: {
		flex: 1,
	},
	earningsChartLabel: {
		fontSize: 10.5,
		fontWeight: '600',
		color: '#64748B',
	},
	barChartContainerWide: {
		alignItems: 'center',
		gap: 2,
	},
})
