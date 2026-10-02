import React, { useState } from 'react'
import {
	Image,
	Linking,
	ScrollView,
	StyleSheet,
	TouchableOpacity,
	View,
	ActivityIndicator,
	useWindowDimensions,
} from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { ROUTES } from '../../../navigation/routes'
import AppScreenHeader from '../../../components/common/layout/AppScreenHeader'
import { AppTypography } from '../../../components/common/display/AppTypography'
import { AppButton } from '../../../components/common/buttons/AppButton'
import StatusModal from '../../../components/common/feedback/StatusModal'
import NurseMapTracker from '../components/NurseMapTracker'
import AppointmentTrackingTimeline, { TrackingStage } from '../components/AppointmentTrackingTimeline'
import AppRatingStars from '../../../components/common/display/AppRatingStars'
import RateAncillaryReviewModal from '../components/RateAncillaryReviewModal'
import ServiceMatchingPage from './ServiceMatchingPage'
import {
	AncillaryBooking,
	AncillaryReviewData,
	fetchAncillaryReviewByBooking,
	submitAncillaryReview,
	cancelCareRequestPatientBackend,
} from '../ancillaryService'
import CancellationDetailsModal from './CancellationDetailsModal'
import NursePulseRadarView from '../components/NursePulseRadarView'
import ApiService from '../../../services/apiService'
import { openAuthedSocket, type AuthedSocketHandle } from '../../../utils/authedSocket'
import { API_ENDPOINTS } from '../../../constants/apiUrls'

// ---------------------------------------------------------------------------
// Types -- mirror the real backend response from
// GET /api/ancillary/patient/requests/{id}/status (see
// dispatch_service.get_service_request_status), which is also what every
// WebSocket CARE_REQUEST_STATUS_CHANGE payload carries. Every field is
// optional/nullable because the backend only fills them in once real data
// exists (e.g. no provider fields until a provider is actually assigned).
// ---------------------------------------------------------------------------
export interface AncillaryProviderInfo {
	id: string
	name: string
	role: string | null
	specialization: string | null
	licenseNumber: string | null
	qualifications: string | null
	experienceYears: number | null
	rating: number | null
	totalVisits: number | null
	avatar: string | null
	phone: string | null
	currentLat: number | null
	currentLng: number | null
	heading?: number
}

export interface AncillaryProviderLocation {
	latitude: number
	longitude: number
	heading?: number
}

export interface AncillaryTrackingResponse {
	requestId?: string
	status?: string
	bookingType?: string
	serviceName?: string
	procedureDetails?: string
	assignedProvider?: AncillaryProviderInfo | null
	patientPublicId?: string | null
	patientName?: string
	patientPhone?: string
	patientAge?: number
	patientGender?: string
	patientRelationship?: string
	patientAvatar?: string | null
	providerLocation?: AncillaryProviderLocation | null
	streetAddress?: string
	createdAt?: string
	verificationOtp?: string | null
	completionPin?: string | null
	totalAmount?: number
	etaMinutes?: number | null
}

// Role-neutral tracking stages -- Ancillary now covers Nursing, Physiotherapy,
// and future specialties, so these must never say "Nurse". No fabricated
// timestamps either: the backend does not currently persist per-stage
// timestamps, so `time` is intentionally omitted rather than invented.
const TRACKING_STAGES: TrackingStage[] = [
	{ key: 'confirmed', label: 'Booking Confirmed' },
	{ key: 'assigned', label: 'Provider Assigned' },
	{ key: 'on_the_way', label: 'Provider En Route' },
	{ key: 'arrived', label: 'Provider Arrived' },
	{ key: 'started', label: 'Service Started' },
	{ key: 'completed', label: 'Service Completed' },
]

// Mirrors the canonical status vocabulary defined by the backend
// (app/models/ancillary.py AncillaryRequestStatus / *_STATUSES groups).
const ASSIGNED_STATUSES = new Set([
	'ASSIGNED',
	'NURSE_ASSIGNED',
	'EN_ROUTE',
	'ARRIVED',
	'IN_PROGRESS',
	'VERIFICATION_PENDING',
	'COMPLETED',
])

const SEARCHING_STATUSES = new Set([
	'SEARCHING',
	'SEARCHING_FOR_NURSE',
	'SCHEDULED_PENDING',
	'REQUESTED',
	'OFFERED',
	'PENDING',
])
const CANCELLED_STATUSES = new Set(['CANCELLED', 'CANCELLED_BY_PATIENT', 'CANCELLED_BY_PROVIDER', 'EXPIRED', 'FAILED'])

const hasConfirmedProvider = (prov?: AncillaryProviderInfo | null, st?: string): boolean => {
	const statusUpper = String(st || '').toUpperCase()
	return Boolean(prov?.id) && ASSIGNED_STATUSES.has(statusUpper)
}

const STAGE_INDEX_BY_STATUS: Record<string, number> = {
	SEARCHING: 0,
	SEARCHING_FOR_NURSE: 0,
	SCHEDULED_PENDING: 0,
	REQUESTED: 0,
	OFFERED: 0,
	ASSIGNED: 1,
	NURSE_ASSIGNED: 1,
	EN_ROUTE: 2,
	ARRIVED: 3,
	IN_PROGRESS: 4,
	VERIFICATION_PENDING: 4,
	COMPLETED: 5,
}

const STATUS_HEADLINES: Record<string, string> = {
	ASSIGNED: 'Provider Assigned',
	NURSE_ASSIGNED: 'Provider Assigned',
	EN_ROUTE: 'Provider On The Way',
	ARRIVED: 'Provider Has Arrived',
	IN_PROGRESS: 'Service In Progress',
	VERIFICATION_PENDING: 'Verifying Your Visit',
}

const statusHeadline = (status: string): string => STATUS_HEADLINES[status] || 'Tracking Your Appointment'

const displayOrFallback = (value?: string | null): string => (value && value.trim() ? value : 'Not available')

export default function TrackAppointmentPage() {
	const navigation = useNavigation<any>()
	const route = useRoute<any>()
	const insets = useSafeAreaInsets()
	const { width } = useWindowDimensions()
	const isTablet = width >= 768

	const bookingData = route.params?.bookingData || {}
	const bookingId = String(route.params?.bookingId || bookingData.id || bookingData.requestId || '')

	// Review state
	const [reviewData, setReviewData] = useState<AncillaryReviewData | null>(() => bookingData.review || null)
	const [reviewModalVisible, setReviewModalVisible] = useState(false)
	const [isSubmittingReview, setIsSubmittingReview] = useState(false)
	const [cancelModalVisible, setCancelModalVisible] = useState(false)
	const [isCancelling, setIsCancelling] = useState(false)
	const [statusModal, setStatusModal] = useState<{
		visible: boolean
		status?: 'success' | 'error' | 'info'
		title: string
		description: string
	} | null>(null)

	const initialHasConfirmed = hasConfirmedProvider(
		bookingData.assignedProvider || bookingData.provider,
		bookingData.status
	)

	// True until the first HTTP status fetch resolves and verifies real backend provider
	// assignment. If bookingData passed in already contains a confirmed assigned provider,
	// we skip the spinner and render immediately.
	const [isInitializing, setIsInitializing] = useState<boolean>(() => !initialHasConfirmed)

	const [activeStageIndex, setActiveStageIndex] = useState<number>(() =>
		bookingData.status ? STAGE_INDEX_BY_STATUS[String(bookingData.status).toUpperCase()] ?? 0 : 0
	)
	const [liveStatus, setLiveStatus] = useState<string>(() => String(bookingData.status || '').toUpperCase())
	const liveStatusRef = React.useRef(liveStatus)
	React.useEffect(() => {
		liveStatusRef.current = liveStatus
	}, [liveStatus])

	const [liveProvider, setLiveProvider] = useState<AncillaryProviderInfo | null>(
		bookingData.assignedProvider || bookingData.provider || null
	)
	const [liveOtp, setLiveOtp] = useState<string>(() => String(bookingData.verificationOtp || bookingData.otp || ''))
	const [liveCompletionPin, setLiveCompletionPin] = useState<string>(() => String(bookingData.completionPin || ''))
	const [liveEtaMinutes, setLiveEtaMinutes] = useState<number | null>(
		() => (typeof bookingData.etaMinutes === 'number' ? bookingData.etaMinutes : null)
	)
	const [liveAddress, setLiveAddress] = useState<string>(
		() => bookingData.streetAddress || bookingData.address || bookingData.patientAddress || bookingData.appointment?.address || ''
	)
	const [liveDateTime, setLiveDateTime] = useState<string>(
		() => bookingData.createdAt || (bookingData.appointmentDate ? `${bookingData.appointmentDate} • ${bookingData.appointmentTime || ''}` : '') || bookingData.dateTime || bookingData.appointment?.dateTime || ''
	)
	const [liveServiceTitle, setLiveServiceTitle] = useState<string>(
		() => bookingData.serviceName || bookingData.service || bookingData.appointment?.service || ''
	)

	// Dynamic, backend-driven provider -- never a fabricated placeholder
	// object. `null` genuinely means "no assigned provider data available".
	const provider: AncillaryProviderInfo | null =
		liveProvider || bookingData.assignedProvider || bookingData.provider || null

	const isAssigned = hasConfirmedProvider(provider, liveStatus)

	// The long-lived socket/poll effect below only re-runs on bookingId, so its closures would
	// otherwise keep the first render's provider/title/address. Read them through this ref.
	const liveRef = React.useRef({ provider: liveProvider, title: liveServiceTitle, address: liveAddress })
	liveRef.current = { provider: liveProvider, title: liveServiceTitle, address: liveAddress }

	React.useEffect(() => {
		let socket: AuthedSocketHandle | null = null
		let isMounted = true
		let fetchInFlight = false
		let redirected = false

		const redirectToMatching = (serviceName: string, addressText: string, id: string = bookingId) => {
			if (!isMounted || redirected) return
			redirected = true
			navigation.replace(ROUTES.STACK.ANCILLARY_SERVICE_MATCHING, {
				bookingId: id,
				serviceName,
				addressText,
				bookingPayload: bookingData,
			})
		}

		const updateStatusFromData = (data: AncillaryTrackingResponse) => {
			if (!data || !isMounted) return
			const st = String(data.status || '').toUpperCase()
			const currentProv = data.assignedProvider !== undefined ? data.assignedProvider : liveRef.current.provider

			if (!hasConfirmedProvider(currentProv, st) && st !== 'COMPLETED') {
				redirectToMatching(
					data.serviceName || liveRef.current.title,
					data.streetAddress || liveRef.current.address
				)
				return
			}

			if (st) {
				setLiveStatus(st)
				liveStatusRef.current = st
			}
			if (data.assignedProvider !== undefined) setLiveProvider(data.assignedProvider ?? null)
			if (data.verificationOtp) setLiveOtp(String(data.verificationOtp))
			else if ((data as any).otp) setLiveOtp(String((data as any).otp))
			if (data.completionPin) setLiveCompletionPin(String(data.completionPin))
			else if ((data as any).pin) setLiveCompletionPin(String((data as any).pin))
			if (data.streetAddress) setLiveAddress(data.streetAddress)
			else if ((data as any).address) setLiveAddress((data as any).address)
			else if ((data as any).patientAddress) setLiveAddress((data as any).patientAddress)
			if (data.createdAt) setLiveDateTime(data.createdAt)
			else if ((data as any).appointmentDate) setLiveDateTime(`${(data as any).appointmentDate} • ${(data as any).appointmentTime || ''}`)
			if (data.serviceName) setLiveServiceTitle(data.serviceName)
			if (typeof data.etaMinutes === 'number') setLiveEtaMinutes(data.etaMinutes)
			else if (data.etaMinutes === null) setLiveEtaMinutes(null)

			if (st in STAGE_INDEX_BY_STATUS) {
				setActiveStageIndex(STAGE_INDEX_BY_STATUS[st])
			}
		}

		// Connect Real-Time WebSocket (authenticated + auto-reconnecting; see utils/authedSocket)
		socket = openAuthedSocket(API_ENDPOINTS.ANCILLARY.WS_PATIENT_REQUEST(bookingId), (payload) => {
			if (payload.type === 'CARE_REQUEST_STATUS_CHANGE' && payload.data) {
				updateStatusFromData(payload.data)
			}
		})

		// Fetch Status via HTTP
		const fetchStatus = async () => {
			if (fetchInFlight) return // a slow response must not stack up behind the 2s poll
			fetchInFlight = true
			try {
				// Polled every ~2s: a failure must not pop the global error dialog on every tick.
				const res = await ApiService.get<any>(API_ENDPOINTS.ANCILLARY.REQUEST_STATUS(bookingId), {
					skipGlobalError: true,
				})
				if (!isMounted) return
				const data: AncillaryTrackingResponse = res.data?.data || res.data
				const st = String(data?.status || '').toUpperCase()
				const prov = data?.assignedProvider || null

				if (!hasConfirmedProvider(prov, st) && st !== 'COMPLETED') {
					// Provider is NOT assigned yet according to backend.
					// Route back to the existing provider search/selection page.
					redirectToMatching(
						data?.serviceName || liveRef.current.title,
						data?.streetAddress || liveRef.current.address
					)
					return
				}

				updateStatusFromData(data)
			} catch (e) {
				console.log('[TrackAppointmentPage] Status fetch notice:', e)
			} finally {
				fetchInFlight = false
				if (isMounted) {
					setIsInitializing(false)
				}
			}
		}

		if (bookingId && bookingId !== 'BK-ACTIVE') {
			void fetchStatus()
		} else {
			redirectToMatching(liveRef.current.title, liveRef.current.address, '')
			setIsInitializing(false)
		}

		// Periodic background polling every 2.0 seconds until COMPLETED
		const pollInterval = setInterval(() => {
			if (isMounted && bookingId && bookingId !== 'BK-ACTIVE' && liveStatusRef.current !== 'COMPLETED') {
				void fetchStatus()
			}
		}, 2000)

		return () => {
			isMounted = false
			clearInterval(pollInterval)
			socket?.close()
		}
	}, [bookingId])

	const otp = liveOtp
	const completionPin = liveCompletionPin
	const etaMinutes = liveEtaMinutes
	const isSearching = SEARCHING_STATUSES.has(liveStatus)
	const isCancelled = CANCELLED_STATUSES.has(liveStatus)
	const isTravelling = ['EN_ROUTE', 'ARRIVED', 'ASSIGNED', 'NURSE_ASSIGNED'].includes(liveStatus)
	const isCompleted = liveStatus === 'COMPLETED'

	React.useEffect(() => {
		const loadBookingReview = async () => {
			if (!bookingId || !isCompleted) return
			if (reviewData) return
			try {
				const res = await fetchAncillaryReviewByBooking(bookingId)
				if (res) {
					setReviewData(res)
				}
			} catch (e) {
				// ignore
			}
		}
		void loadBookingReview()
	}, [bookingId, isCompleted])

	React.useEffect(() => {
		if (!isInitializing && !isAssigned && !isCompleted) {
			navigation.replace(ROUTES.STACK.ANCILLARY_SERVICE_MATCHING, {
				bookingId,
				serviceName: liveServiceTitle || bookingData.serviceName,
				addressText: liveAddress || bookingData.streetAddress,
				bookingPayload: bookingData,
			})
		}
	}, [isInitializing, isAssigned, isCompleted, bookingId, liveServiceTitle, liveAddress, navigation])

	const handleCallProvider = () => {
		if (!provider?.phone) return
		Linking.openURL(`tel:${provider.phone}`)
	}

	const handleCancelRequestWithReason = async (reason: string) => {
		setIsCancelling(true)
		await cancelCareRequestPatientBackend(bookingId, reason)
		setIsCancelling(false)
		setCancelModalVisible(false)
		if (navigation.canGoBack()) {
			navigation.goBack()
		} else {
			navigation.navigate(ROUTES.MAIN.TABS)
		}
	}

	const handleMessage = () => {
		navigation.navigate(ROUTES.STACK.NOTIFICATION)
	}

	const handleSubmitReview = async (stars: number, comment: string) => {
		if (!provider?.id) {
			setStatusModal({
				visible: true,
				status: 'error',
				title: 'Unable to Submit Review',
				description: 'We could not find the assigned provider for this booking, so a review cannot be submitted.',
			})
			return
		}
		setIsSubmittingReview(true)
		try {
			const saved = await submitAncillaryReview({
				bookingId,
				providerId: provider.id,
				providerName: provider.name,
				serviceName: liveServiceTitle,
				rating: stars,
				comment,
				patientName: '',
			})
			setReviewData(saved)
			setReviewModalVisible(false)
			setStatusModal({
				visible: true,
				title: 'Thank You!',
				description: `Your feedback for ${provider.name} has been recorded.`,
			})
		} catch (error: any) {
			const errorMsg =
				error?.response?.data?.detail ||
				error?.response?.data?.message ||
				error?.message ||
				'Unable to submit review. Please try again.'
			setStatusModal({
				visible: true,
				status: 'error',
				title: 'Review Submission Failed',
				description: errorMsg,
			})
		} finally {
			setIsSubmittingReview(false)
		}
	}

	const modalBookingObj: AncillaryBooking = {
		id: bookingId,
		serviceName: liveServiceTitle,
		serviceKey: bookingData.serviceKey || '',
		serviceLabel: liveServiceTitle,
		status: 'completed',
		date: liveDateTime,
		provider: {
			id: provider?.id,
			name: provider?.name || '',
			designation: provider?.role || provider?.specialization || '',
			avatar: provider?.avatar || '',
		},
		hasReview: !!reviewData,
		rating: reviewData?.rating,
		review: reviewData || undefined,
	}

	if (isInitializing || !isAssigned) {
		return (
			<View style={styles.container}>
				<AppScreenHeader title="Track Appointment" onBack={() => {
					if (navigation.canGoBack()) navigation.goBack()
					else navigation.navigate(ROUTES.MAIN.TABS)
				}} />
				<View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
					<ActivityIndicator size="large" color="#2B6F71" />
				</View>
			</View>
		)
	}

	return (
		<View style={styles.container}>
			<AppScreenHeader
				title="Track Appointment"
				rightElement={
					<View style={[styles.topHeaderChip, isCompleted ? styles.topHeaderChipCompleted : styles.topHeaderChipActive]}>
						<Ionicons name={isCompleted ? "checkmark-circle" : "car"} size={12} color="#FFFFFF" />
						<AppTypography variant="caption" style={styles.topHeaderChipText}>
							{isCompleted ? 'COMPLETED' : liveStatus.replace(/_/g, ' ')}
						</AppTypography>
					</View>
				}
			/>

			<ScrollView
				contentContainerStyle={[
					styles.scrollContent,
					isTablet && styles.scrollContentTablet,
					{ paddingBottom: insets.bottom + 40 },
				]}
				showsVerticalScrollIndicator={false}
			>
				{/* 1. LIVE STATUS SECTION BLOCK */}
				<View style={styles.sectionBlock}>
					<View style={styles.statusBannerRow}>
						<View style={[styles.statusBadge, isCompleted ? styles.completedBadge : styles.activeBadge]}>
							<View style={[styles.statusDot, isCompleted ? styles.completedDot : styles.activeDot]} />
							<AppTypography variant="caption" style={[styles.statusBadgeText, isCompleted ? styles.completedBadgeText : styles.activeBadgeText]}>
								{isCompleted ? 'COMPLETED' : liveStatus.replace(/_/g, ' ')}
							</AppTypography>
						</View>

						<AppTypography variant="caption" style={styles.bookingRefText}>
							Ref ID: {bookingId}
						</AppTypography>
					</View>

					<AppTypography variant="h2" style={styles.statusTitle}>
						{isCompleted
							? 'Service Completed'
							: liveStatus === 'IN_PROGRESS' || liveStatus === 'VERIFICATION_PENDING' || liveStatus === 'ARRIVED'
								? statusHeadline(liveStatus)
								: etaMinutes != null
									? `Arriving in ${etaMinutes} mins`
									: statusHeadline(liveStatus)}
					</AppTypography>

					<AppTypography variant="caption" style={styles.statusSub}>
						{isCompleted
							? provider?.name
								? `Home care visit with ${provider.name} has concluded successfully.`
								: 'Your home care visit has concluded successfully.'
							: liveStatus === 'IN_PROGRESS'
								? provider?.name
									? `${provider.name} is currently administering your requested care.`
									: 'Your healthcare specialist is currently administering your requested care.'
								: liveStatus === 'ARRIVED'
									? provider?.name
										? `${provider.name} has arrived at your doorstep.`
										: 'Your assigned provider has arrived at your doorstep.'
									: provider?.name
										? `${provider.name} is on the way to your doorstep address.`
										: 'Your assigned provider is on the way to your doorstep address.'}
					</AppTypography>
				</View>

				{/* 8px GREY DIVIDER BAR */}
				<View style={styles.sectionDividerBar} />

				{/* 2. RATING & REVIEW BANNER (IF COMPLETED) */}
				{isCompleted && (
					<>
						<View style={styles.sectionBlock}>
							<View style={styles.feedbackCard}>
								<View style={styles.feedbackHeaderRow}>
									<Ionicons name="star" size={22} color="#D97706" />
									<View style={styles.feedbackTextCol}>
										<AppTypography variant="h4" style={styles.feedbackTitle}>
											{provider?.name ? `How was your visit with ${provider.name}?` : 'How was your visit?'}
										</AppTypography>
										<AppTypography variant="caption" style={styles.feedbackSub}>
											Help us maintain clinical care quality by rating your visit.
										</AppTypography>
									</View>
								</View>

								{reviewData ? (
									<TouchableOpacity
										style={styles.reviewedBtn}
										onPress={() => setReviewModalVisible(true)}
										activeOpacity={0.8}
									>
										<AppRatingStars value={reviewData.rating} size={14} />
										<AppTypography variant="caption" style={styles.reviewedText}>
											★ {reviewData.rating}.0 • View Your Submitted Review
										</AppTypography>
									</TouchableOpacity>
								) : (
									<AppButton
										variant="primary"
										onPress={() => setReviewModalVisible(true)}
										style={styles.rateBtn}
										disabled={!provider?.id}
									>
										Rate & Review Visit
									</AppButton>
								)}
							</View>
						</View>

						<View style={styles.sectionDividerBar} />
					</>
				)}

				{/* 3. ASSIGNED PRACTITIONER CARD */}
				{!isCompleted && (
					<>
						<View style={styles.sectionBlock}>
							<AppTypography variant="h3" style={styles.sectionHeading}>
								Assigned Practitioner
							</AppTypography>

							{provider ? (
								<>
									<View style={styles.nurseProfileCard}>
										<View style={styles.nurseAvatarWrap}>
											{provider.avatar ? (
												<Image source={{ uri: provider.avatar }} style={styles.nurseAvatar} resizeMode="cover" />
											) : (
												<View style={[styles.nurseAvatar, styles.nurseAvatarPlaceholder]}>
													<Ionicons name="person" size={26} color="#94A3B8" />
												</View>
											)}
											<View style={styles.onlineBadgeDot} />
										</View>

										<View style={styles.nurseDetailsCol}>
											<View style={styles.nurseNameRow}>
												<AppTypography variant="h4" style={styles.nurseName}>
													{provider.name}
												</AppTypography>
												<View style={styles.rnChip}>
													<Ionicons name="shield-checkmark" size={11} color="#047857" />
													<AppTypography variant="caption" style={styles.rnChipText}>
														VERIFIED
													</AppTypography>
												</View>
											</View>

											<AppTypography variant="caption" style={styles.nurseDesig}>
												{displayOrFallback(provider.role || provider.specialization)}
											</AppTypography>

											{(provider.rating != null || provider.totalVisits != null || provider.experienceYears != null) && (
												<View style={styles.ratingRow}>
													<Ionicons name="star" size={13} color="#D97706" />
													<AppTypography variant="caption" style={styles.ratingText}>
														{[
															provider.rating != null ? provider.rating.toFixed(1) : null,
															provider.totalVisits != null ? `${provider.totalVisits} visits` : null,
															provider.experienceYears != null ? `${provider.experienceYears} yrs exp` : null,
														]
															.filter(Boolean)
															.join(' • ')}
													</AppTypography>
												</View>
											)}
										</View>
									</View>

									{/* 2-BUTTON QUICK ACTION BAR */}
									<View style={styles.actionButtonsRow}>
										<TouchableOpacity
											style={[styles.primaryCallBtn, !provider.phone && styles.primaryCallBtnDisabled]}
											onPress={handleCallProvider}
											activeOpacity={provider.phone ? 0.85 : 1}
											disabled={!provider.phone}
										>
											<Ionicons name="call" size={16} color="#FFFFFF" />
											<AppTypography variant="caption" style={styles.primaryCallText}>
												{provider.role ? `Call ${provider.role}` : 'Call Provider'}
											</AppTypography>
										</TouchableOpacity>

										<TouchableOpacity style={styles.secondaryMsgBtn} onPress={handleMessage} activeOpacity={0.85}>
											<Ionicons name="chatbubble-ellipses-outline" size={16} color="#2B6F71" />
											<AppTypography variant="caption" style={styles.secondaryMsgText}>
												Message
											</AppTypography>
										</TouchableOpacity>
									</View>
								</>
							) : (
								<View style={styles.providerUnavailableBox}>
									<Ionicons name="information-circle-outline" size={18} color="#64748B" />
									<AppTypography variant="caption" style={styles.providerUnavailableText}>
										Provider details are currently unavailable.
									</AppTypography>
								</View>
							)}

							{/* START VISIT & COMPLETION PIN OTP CARDS */}
							<View style={styles.otpGridRow}>
								{/* Start Visit OTP */}
								<View style={[styles.otpCard, styles.otpCardHalf]}>
									<View style={styles.otpHeaderRow}>
										<View style={styles.otpIconBadge}>
											<Ionicons name="key" size={13} color="#0C7C7C" />
										</View>
										<AppTypography variant="caption" style={styles.otpTitle}>
											Start Visit OTP
										</AppTypography>
									</View>

									{otp ? (
										<View style={styles.otpDigitsRow}>
											{otp.split('').map((digit: string, idx: number) => (
												<View key={idx} style={styles.otpDigitBox}>
													<AppTypography variant="h3" style={styles.otpDigitText}>
														{digit}
													</AppTypography>
												</View>
											))}
										</View>
									) : (
										<AppTypography variant="caption" style={styles.otpInstruction}>
											Not available yet.
										</AppTypography>
									)}

									<AppTypography variant="caption" style={styles.otpInstruction}>
										Share at doorstep to verify start.
									</AppTypography>
								</View>

								{/* Completion PIN */}
								<View style={[styles.otpCard, styles.otpCardHalf, styles.otpCardCompletion]}>
									<View style={styles.otpHeaderRow}>
										<View style={[styles.otpIconBadge, styles.otpIconBadgeCompletion]}>
											<Ionicons name="checkmark-done" size={13} color="#059669" />
										</View>
										<AppTypography variant="caption" style={styles.otpTitle}>
											Completion PIN
										</AppTypography>
									</View>

									{completionPin ? (
										<View style={styles.otpDigitsRow}>
											{completionPin.split('').map((digit: string, idx: number) => (
												<View key={idx} style={[styles.otpDigitBox, styles.otpDigitBoxCompletion]}>
													<AppTypography variant="h3" style={[styles.otpDigitText, styles.otpDigitTextCompletion]}>
														{digit}
													</AppTypography>
												</View>
											))}
										</View>
									) : (
										<AppTypography variant="caption" style={styles.otpInstruction}>
											Not available yet.
										</AppTypography>
									)}

									<AppTypography variant="caption" style={styles.otpInstruction}>
										Share after procedure completes.
									</AppTypography>
								</View>
							</View>
						</View>

						<View style={styles.sectionDividerBar} />
					</>
				)}

				{/* 4. LIVE MAP TRACKER */}
				{isTravelling && (
					<>
						<View style={styles.sectionBlock}>
							<AppTypography variant="h3" style={styles.sectionHeading}>
								Live GPS Route
							</AppTypography>

							<View style={styles.mapWrap}>
								<NurseMapTracker
									providerAvatar={provider?.avatar || undefined}
									etaText={etaMinutes != null ? `Arriving in ~${etaMinutes} mins` : undefined}
								/>
							</View>
						</View>

						<View style={styles.sectionDividerBar} />
					</>
				)}

				{/* 5. APPOINTMENT DETAILS */}
				<View style={styles.sectionBlock}>
					<AppTypography variant="h3" style={styles.sectionHeading}>
						Appointment Summary
					</AppTypography>

					<View style={styles.detailRowList}>
						<View style={styles.detailItemRow}>
							<View style={styles.detailIconBox}>
								<MaterialCommunityIcons name="medical-bag" size={18} color="#2B6F71" />
							</View>
							<View style={styles.detailItemTextCol}>
								<AppTypography variant="caption" style={styles.detailLabel}>
									Selected Procedure
								</AppTypography>
								<AppTypography variant="body" style={styles.detailVal}>
									{displayOrFallback(liveServiceTitle)}
								</AppTypography>
							</View>
						</View>

						<View style={styles.detailItemRow}>
							<View style={styles.detailIconBox}>
								<Ionicons name="calendar" size={18} color="#2B6F71" />
							</View>
							<View style={styles.detailItemTextCol}>
								<AppTypography variant="caption" style={styles.detailLabel}>
									Date & Schedule
								</AppTypography>
								<AppTypography variant="body" style={styles.detailVal}>
									{displayOrFallback(liveDateTime)}
								</AppTypography>
							</View>
						</View>

						<View style={styles.detailItemRow}>
							<View style={styles.detailIconBox}>
								<Ionicons name="location" size={18} color="#2B6F71" />
							</View>
							<View style={styles.detailItemTextCol}>
								<AppTypography variant="caption" style={styles.detailLabel}>
									Doorstep Visit Address
								</AppTypography>
								<AppTypography variant="body" style={styles.detailVal} numberOfLines={2}>
									{displayOrFallback(liveAddress)}
								</AppTypography>
							</View>
						</View>
					</View>
				</View>

				{/* 8px GREY DIVIDER BAR */}
				<View style={styles.sectionDividerBar} />

				{/* 6. TIMELINE PROGRESS SECTION */}
				<View style={styles.sectionBlock}>
					<AppTypography variant="h3" style={styles.sectionHeading}>
						Visit Stage Progress
					</AppTypography>

					<AppointmentTrackingTimeline stages={TRACKING_STAGES} activeIndex={activeStageIndex} />
				</View>

				{!isCompleted && !isCancelled && (
					<>
						<View style={styles.sectionDividerBar} />
						<View style={styles.sectionBlock}>
							<AppButton
								variant="outline"
								onPress={() => setCancelModalVisible(true)}
								style={{ borderColor: '#EF4444' }}
							>
								Cancel Care Request
							</AppButton>
						</View>
					</>
				)}
			</ScrollView>

			{/* Review Bottom Sheet */}
			<RateAncillaryReviewModal
				visible={reviewModalVisible}
				onClose={() => setReviewModalVisible(false)}
				booking={modalBookingObj}
				existingReview={reviewData}
				onSubmit={handleSubmitReview}
				isSubmitting={isSubmittingReview}
			/>

			{/* Status Feedback Confirmation */}
			{statusModal && (
				<StatusModal
					visible={statusModal.visible}
					status={statusModal.status || 'success'}
					title={statusModal.title}
					description={statusModal.description}
					submitText={statusModal.status === 'error' ? 'OK' : 'Done'}
					onSubmit={() => setStatusModal(null)}
					onCancel={() => setStatusModal(null)}
				/>
			)}

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
	topHeaderChip: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 12,
		gap: 4,
	},
	topHeaderChipActive: {
		backgroundColor: 'rgba(255, 255, 255, 0.22)',
	},
	topHeaderChipCompleted: {
		backgroundColor: 'rgba(16, 185, 129, 0.3)',
	},
	topHeaderChipText: {
		fontSize: 10.5,
		fontWeight: '800',
		color: '#FFFFFF',
		letterSpacing: 0.3,
	},
	scrollContent: {
		paddingHorizontal: 0,
		paddingTop: 0,
	},
	scrollContentTablet: {
		maxWidth: 640,
		alignSelf: 'center',
		width: '100%',
	},

	/* SECTION BLOCK & DIVIDERS */
	sectionBlock: {
		backgroundColor: '#FFFFFF',
		paddingHorizontal: 16,
		paddingVertical: 16,
		gap: 14,
	},
	sectionDividerBar: {
		height: 8,
		backgroundColor: '#F4F6F9',
		borderTopWidth: 1,
		borderBottomWidth: 1,
		borderColor: '#E2E8F0',
	},
	sectionHeading: {
		fontSize: 16.5,
		fontWeight: '700',
		color: '#0F172A',
		letterSpacing: -0.2,
	},

	/* STATUS HEADER BANNER */
	statusBannerRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	statusBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 8,
		paddingVertical: 3,
		borderRadius: 6,
		gap: 6,
	},
	activeBadge: {
		backgroundColor: 'rgba(43, 111, 113, 0.12)',
	},
	completedBadge: {
		backgroundColor: 'rgba(5, 150, 105, 0.12)',
	},
	statusDot: {
		width: 6,
		height: 6,
		borderRadius: 3,
	},
	activeDot: {
		backgroundColor: '#2B6F71',
	},
	completedDot: {
		backgroundColor: '#059669',
	},
	statusBadgeText: {
		fontSize: 11,
		fontWeight: '700',
		letterSpacing: 0.3,
	},
	activeBadgeText: {
		color: '#2B6F71',
	},
	completedBadgeText: {
		color: '#059669',
	},
	bookingRefText: {
		fontSize: 12,
		color: '#64748B',
		fontWeight: '500',
	},
	statusTitle: {
		fontSize: 18,
		fontWeight: '800',
		color: '#0F172A',
	},
	statusSub: {
		fontSize: 12.5,
		color: '#64748B',
		lineHeight: 17,
	},

	/* NURSE PROFILE CARD */
	nurseProfileCard: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#F8FAFC',
		borderRadius: 16,
		padding: 14,
		borderWidth: 1,
		borderColor: '#E2E8F0',
		gap: 12,
	},
	nurseAvatarWrap: {
		position: 'relative',
	},
	nurseAvatar: {
		width: 56,
		height: 56,
		borderRadius: 28,
		backgroundColor: '#E2E8F0',
	},
	nurseAvatarPlaceholder: {
		alignItems: 'center',
		justifyContent: 'center',
	},
	onlineBadgeDot: {
		position: 'absolute',
		bottom: 2,
		right: 2,
		width: 12,
		height: 12,
		borderRadius: 6,
		backgroundColor: '#10B981',
		borderWidth: 2,
		borderColor: '#FFFFFF',
	},
	nurseDetailsCol: {
		flex: 1,
		gap: 2,
	},
	nurseNameRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	nurseName: {
		fontSize: 15.5,
		fontWeight: '700',
		color: '#0F172A',
	},
	rnChip: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#ECFDF5',
		paddingHorizontal: 6,
		paddingVertical: 1.5,
		borderRadius: 4,
		gap: 3,
	},
	rnChipText: {
		fontSize: 9,
		fontWeight: '800',
		color: '#047857',
		letterSpacing: 0.2,
	},
	nurseDesig: {
		fontSize: 12.5,
		color: '#64748B',
	},
	ratingRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		marginTop: 2,
	},
	ratingText: {
		fontSize: 11.5,
		fontWeight: '600',
		color: '#334155',
	},

	/* PROVIDER UNAVAILABLE NOTICE */
	providerUnavailableBox: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		backgroundColor: '#F8FAFC',
		borderRadius: 12,
		padding: 12,
		borderWidth: 1,
		borderColor: '#E2E8F0',
	},
	providerUnavailableText: {
		fontSize: 12.5,
		color: '#64748B',
		flex: 1,
	},

	/* ACTION BUTTONS ROW */
	actionButtonsRow: {
		flexDirection: 'row',
		gap: 10,
	},
	primaryCallBtn: {
		flex: 1.2,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#2B6F71',
		height: 44,
		borderRadius: 12,
		gap: 8,
	},
	primaryCallBtnDisabled: {
		backgroundColor: '#94A3B8',
	},
	primaryCallText: {
		fontSize: 13.5,
		fontWeight: '700',
		color: '#FFFFFF',
	},
	secondaryMsgBtn: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#FFFFFF',
		height: 44,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#2B6F71',
		gap: 6,
	},
	secondaryMsgText: {
		fontSize: 13.5,
		fontWeight: '700',
		color: '#2B6F71',
	},

	/* OTP CARD */
	otpGridRow: {
		flexDirection: 'row',
		gap: 10,
	},
	otpCard: {
		backgroundColor: '#F8FAFC',
		borderRadius: 16,
		padding: 12,
		borderWidth: 1,
		borderColor: '#E2E8F0',
		gap: 8,
	},
	otpCardHalf: {
		flex: 1,
	},
	otpCardCompletion: {
		backgroundColor: '#F0FDF4',
		borderColor: '#BBF7D0',
	},
	otpHeaderRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	otpIconBadge: {
		width: 22,
		height: 22,
		borderRadius: 11,
		backgroundColor: '#E6F4F4',
		alignItems: 'center',
		justifyContent: 'center',
	},
	otpIconBadgeCompletion: {
		backgroundColor: '#DCFCE7',
	},
	otpTitle: {
		fontSize: 12,
		fontWeight: '700',
		color: '#0F172A',
	},
	otpDigitsRow: {
		flexDirection: 'row',
		gap: 4,
		justifyContent: 'center',
	},
	otpDigitBox: {
		width: 28,
		height: 32,
		borderRadius: 6,
		backgroundColor: '#FFFFFF',
		borderWidth: 1,
		borderColor: '#CBD5E1',
		alignItems: 'center',
		justifyContent: 'center',
	},
	otpDigitBoxCompletion: {
		borderColor: '#86EFAC',
		backgroundColor: '#FFFFFF',
	},
	otpDigitText: {
		fontSize: 15,
		fontWeight: '700',
		color: '#0C7C7C',
	},
	otpDigitTextCompletion: {
		color: '#059669',
	},
	otpInstruction: {
		fontSize: 11.5,
		color: '#64748B',
		textAlign: 'center',
		lineHeight: 16,
	},

	/* MAP WRAP */
	mapWrap: {
		borderRadius: 14,
		overflow: 'hidden',
	},

	/* APPOINTMENT SUMMARY DETAILS LIST */
	detailRowList: {
		gap: 12,
	},
	detailItemRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	detailIconBox: {
		width: 38,
		height: 38,
		borderRadius: 10,
		backgroundColor: '#F1F5F9',
		alignItems: 'center',
		justifyContent: 'center',
	},
	detailItemTextCol: {
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

	/* FEEDBACK CARD */
	feedbackCard: {
		backgroundColor: '#FFFBEB',
		borderRadius: 16,
		padding: 16,
		borderWidth: 1,
		borderColor: '#FCD34D',
		gap: 12,
	},
	feedbackHeaderRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	feedbackTextCol: {
		flex: 1,
		gap: 2,
	},
	feedbackTitle: {
		fontSize: 15,
		fontWeight: '700',
		color: '#92400E',
	},
	feedbackSub: {
		fontSize: 12,
		color: '#B45309',
	},
	rateBtn: {
		width: '100%',
		borderRadius: 10,
	},
	reviewedBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		backgroundColor: '#FFFFFF',
		paddingHorizontal: 12,
		paddingVertical: 10,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: '#FDE68A',
	},
	reviewedText: {
		fontSize: 12.5,
		fontWeight: '600',
		color: '#0C7C7C',
	},
})
