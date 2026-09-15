import React, { useState } from 'react'
import {
	Image,
	Linking,
	ScrollView,
	StyleSheet,
	TouchableOpacity,
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
import StatusModal from '../../../components/common/StatusModal'
import NurseMapTracker from '../components/NurseMapTracker'
import AppointmentTrackingTimeline, { TrackingStage } from '../components/AppointmentTrackingTimeline'
import RatingStars from '../components/RatingStars'
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
import { API_ENDPOINTS } from '../../../constants/apiUrls'

const TRACKING_STAGES: TrackingStage[] = [
	{ key: 'confirmed', label: 'Booking Confirmed', time: '09:00 AM' },
	{ key: 'assigned', label: 'Nurse Assigned', time: '09:15 AM' },
	{ key: 'on_the_way', label: 'Nurse En Route', time: 'Expected 10:30 AM' },
	{ key: 'arrived', label: 'Nurse Arrived' },
	{ key: 'started', label: 'Service Started' },
	{ key: 'completed', label: 'Service Completed' },
]

export default function TrackAppointmentPage() {
	const navigation = useNavigation<any>()
	const route = useRoute<any>()
	const insets = useSafeAreaInsets()
	const { width } = useWindowDimensions()
	const isTablet = width >= 768

	const bookingData = route.params?.bookingData || {}
	const bookingId = String(route.params?.bookingId || bookingData.id || 'BK-882419')

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

	const [activeStageIndex, setActiveStageIndex] = useState<number>(
		() => bookingData.activeStageIndex ?? 2
	)
	const [liveStatus, setLiveStatus] = useState<string>(() => (bookingData.status || 'EN_ROUTE').toUpperCase())
	const [liveNurse, setLiveNurse] = useState<any>(bookingData.provider || null)
	const [liveOtp, setLiveOtp] = useState<string>(() => String(bookingData.verificationOtp || bookingData.otp || '4892'))
	const [liveAddress, setLiveAddress] = useState<string>(
		() => bookingData.streetAddress || bookingData.address || bookingData.appointment?.address || '42 Healthcare Avenue, Flat 3B, Sector 18'
	)
	const [liveDateTime, setLiveDateTime] = useState<string>(
		() => bookingData.createdAt || bookingData.dateTime || bookingData.appointment?.dateTime || 'Today • 09:00 AM - 10:00 AM'
	)
	const [liveServiceTitle, setLiveServiceTitle] = useState<string>(
		() => bookingData.serviceName || bookingData.service || bookingData.appointment?.service || 'Wound Dressing & Sterile Care'
	)

	const nurse = liveNurse || bookingData.assignedProvider || bookingData.provider || {
		id: 'n-prov-1',
		name: 'Healthcare Specialist',
		designation: 'Certified Care Professional',
		avatar: 'https://images.unsplash.com/photo-1594824813573-246434de83fb?auto=format&fit=crop&q=80&w=200',
		phone: '+91 98765 43210',
	}

	const rating = Number(bookingData.rating ?? 4.9)
	const reviewsCount = bookingData.reviewsCount ?? 142
	const experienceYears = bookingData.experienceYears ?? 8
	const etaMinutes = bookingData.etaMinutes ?? 15

	React.useEffect(() => {
		let ws: WebSocket | null = null

		const updateStatusFromData = (data: any) => {
			if (!data) return
			const st = String(data.status || '').toUpperCase()
			if (st) setLiveStatus(st)
			if (data.assignedProvider) setLiveNurse(data.assignedProvider)
			if (data.verificationOtp) setLiveOtp(String(data.verificationOtp))
			if (data.streetAddress) setLiveAddress(data.streetAddress)
			if (data.createdAt) setLiveDateTime(data.createdAt)
			if (data.serviceName) setLiveServiceTitle(data.serviceName)

			if (st === 'SEARCHING' || st === 'SEARCHING_FOR_NURSE') {
				setActiveStageIndex(0)
				navigation.replace(ROUTES.STACK.ANCILLARY_SERVICE_MATCHING, {
					bookingId,
					serviceName: data.serviceName || liveServiceTitle,
					addressText: data.streetAddress || liveAddress,
				})
			} else if (st === 'ASSIGNED' || st === 'NURSE_ASSIGNED') {
				setActiveStageIndex(1)
			} else if (st === 'EN_ROUTE') {
				setActiveStageIndex(2)
			} else if (st === 'ARRIVED') {
				setActiveStageIndex(3)
			} else if (st === 'IN_PROGRESS') {
				setActiveStageIndex(4)
			} else if (st === 'COMPLETED') {
				setActiveStageIndex(5)
			}
		}

		// Connect Real-Time WebSocket
		try {
			const wsUrl = API_ENDPOINTS.ANCILLARY.WS_PATIENT_REQUEST(bookingId)
			ws = new WebSocket(wsUrl)
			ws.onmessage = (event) => {
				try {
					const payload = JSON.parse(event.data)
					if (payload.type === 'CARE_REQUEST_STATUS_CHANGE' && payload.data) {
						updateStatusFromData(payload.data)
					}
				} catch (e) {
					console.log('[TrackAppointmentPage] WS parse notice:', e)
				}
			}
		} catch (e) {
			console.log('[TrackAppointmentPage] WS setup notice')
		}

		// Fetch Initial Status via HTTP on Mount
		const fetchInitialStatus = async () => {
			try {
				const res = await ApiService.get<any>(API_ENDPOINTS.ANCILLARY.REQUEST_STATUS(bookingId))
				const data = res.data?.data || res.data
				updateStatusFromData(data)
			} catch (e) {
				console.log('[TrackAppointmentPage] Initial status fetch notice')
			}
		}

		void fetchInitialStatus()

		return () => {
			if (ws) ws.close()
		}
	}, [bookingId])

	const otp = liveOtp || String(bookingData.otp || bookingData.verificationOtp || '4829')
	const completionPin = String(bookingData.completionPin || '9182')
	const isTravelling = activeStageIndex >= 1 && activeStageIndex <= 3
	const isCompleted = activeStageIndex >= 5 || liveStatus === 'COMPLETED'

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

	const handleCallNurse = () => {
		Linking.openURL(`tel:${nurse.phone || '+919876543210'}`)
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
		setIsSubmittingReview(true)
		try {
			const saved = await submitAncillaryReview({
				bookingId,
				providerId: nurse.id || 'n-prov-1',
				providerName: nurse.name,
				serviceName: liveServiceTitle || 'Nursing Care',
				rating: stars,
				comment,
				patientName: '',
			})
			setReviewData(saved)
			setReviewModalVisible(false)
			setStatusModal({
				visible: true,
				title: 'Thank You!',
				description: `Your feedback for ${nurse.name} has been recorded.`,
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
		serviceKey: bookingData.serviceKey || 'nursing-care',
		serviceLabel: bookingData.serviceLabel || 'Nursing Care',
		status: 'completed',
		date: liveDateTime,
		provider: {
			id: nurse.id || 'n-prov-1',
			name: nurse.name,
			designation: nurse.designation || 'Registered Nurse',
			avatar: nurse.avatar,
		},
		hasReview: !!reviewData,
		rating: reviewData?.rating,
		review: reviewData || undefined,
	}

	if (liveStatus === 'SEARCHING' || liveStatus === 'SEARCHING_FOR_NURSE') {
		return (
			<View style={styles.container}>
				<AppScreenHeader title="Searching for Nurse" onBack={() => {
					if (navigation.canGoBack()) navigation.goBack()
					else navigation.navigate(ROUTES.MAIN.TABS)
				}} />
				<View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 }}>
					<MaterialCommunityIcons name="account-search" size={56} color="#2B6F71" />
					<AppTypography variant="h3" style={{ textAlign: 'center', color: '#0F172A' }}>
						Searching for Available Nurse...
					</AppTypography>
					<AppTypography variant="caption" style={{ textAlign: 'center', color: '#64748B' }}>
						Broadcasting your request to qualified nurses nearby.
					</AppTypography>
					<AppButton
						variant="outline"
						onPress={() => setCancelModalVisible(true)}
						style={{ marginTop: 24, borderColor: '#EF4444', width: '100%' }}
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

	return (
		<View style={styles.container}>
			<AppScreenHeader
				title="Track Appointment"
				rightElement={
					<View style={[styles.topHeaderChip, isCompleted ? styles.topHeaderChipCompleted : styles.topHeaderChipActive]}>
						<Ionicons name={isCompleted ? "checkmark-circle" : "car"} size={12} color="#FFFFFF" />
						<AppTypography variant="caption" style={styles.topHeaderChipText}>
							{isCompleted ? 'COMPLETED' : 'EN ROUTE'}
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
								{isCompleted ? 'COMPLETED' : 'EN ROUTE'}
							</AppTypography>
						</View>

						<AppTypography variant="caption" style={styles.bookingRefText}>
							Ref ID: {bookingId}
						</AppTypography>
					</View>

					<AppTypography variant="h2" style={styles.statusTitle}>
						{isCompleted
							? 'Service Completed'
							: `Arriving in ${etaMinutes} mins`}
					</AppTypography>

					<AppTypography variant="caption" style={styles.statusSub}>
						{isCompleted
							? `Home care visit with ${nurse.name} has concluded successfully.`
							: `${nurse.name} is on the way to your doorstep address.`}
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
											How was your visit with {nurse.name}?
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
										<RatingStars rating={reviewData.rating} size={14} />
										<AppTypography variant="caption" style={styles.reviewedText}>
											★ {reviewData.rating}.0 • View Your Submitted Review
										</AppTypography>
									</TouchableOpacity>
								) : (
									<AppButton
										variant="primary"
										onPress={() => setReviewModalVisible(true)}
										style={styles.rateBtn}
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

							<View style={styles.nurseProfileCard}>
								<View style={styles.nurseAvatarWrap}>
									<Image source={{ uri: nurse.avatar }} style={styles.nurseAvatar} resizeMode="cover" />
									<View style={styles.onlineBadgeDot} />
								</View>

								<View style={styles.nurseDetailsCol}>
									<View style={styles.nurseNameRow}>
										<AppTypography variant="h4" style={styles.nurseName}>
											{nurse.name}
										</AppTypography>
										<View style={styles.rnChip}>
											<Ionicons name="shield-checkmark" size={11} color="#047857" />
											<AppTypography variant="caption" style={styles.rnChipText}>
												VERIFIED RN
											</AppTypography>
										</View>
									</View>

									<AppTypography variant="caption" style={styles.nurseDesig}>
										{nurse.designation || 'Registered Nurse'}
									</AppTypography>

									<View style={styles.ratingRow}>
										<Ionicons name="star" size={13} color="#D97706" />
										<AppTypography variant="caption" style={styles.ratingText}>
											{rating.toFixed(1)} ({reviewsCount} visits) • {experienceYears} yrs exp
										</AppTypography>
									</View>
								</View>
							</View>

							{/* 2-BUTTON QUICK ACTION BAR */}
							<View style={styles.actionButtonsRow}>
								<TouchableOpacity style={styles.primaryCallBtn} onPress={handleCallNurse} activeOpacity={0.85}>
									<Ionicons name="call" size={16} color="#FFFFFF" />
									<AppTypography variant="caption" style={styles.primaryCallText}>
										Call Nurse
									</AppTypography>
								</TouchableOpacity>

								<TouchableOpacity style={styles.secondaryMsgBtn} onPress={handleMessage} activeOpacity={0.85}>
									<Ionicons name="chatbubble-ellipses-outline" size={16} color="#2B6F71" />
									<AppTypography variant="caption" style={styles.secondaryMsgText}>
										Message
									</AppTypography>
								</TouchableOpacity>
							</View>

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

									<View style={styles.otpDigitsRow}>
										{otp.split('').map((digit: string, idx: number) => (
											<View key={idx} style={styles.otpDigitBox}>
												<AppTypography variant="h3" style={styles.otpDigitText}>
													{digit}
												</AppTypography>
											</View>
										))}
									</View>

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

									<View style={styles.otpDigitsRow}>
										{completionPin.split('').map((digit: string, idx: number) => (
											<View key={idx} style={[styles.otpDigitBox, styles.otpDigitBoxCompletion]}>
												<AppTypography variant="h3" style={[styles.otpDigitText, styles.otpDigitTextCompletion]}>
													{digit}
												</AppTypography>
											</View>
										))}
									</View>

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
									nurseAvatar={nurse.avatar}
									etaText={`Arriving in ${etaMinutes} mins`}
									distanceText="1.5 km away"
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
									{liveServiceTitle}
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
									{liveDateTime}
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
									{liveAddress}
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

				{!isCompleted && liveStatus !== 'CANCELLED_BY_PATIENT' && liveStatus !== 'CANCELLED_BY_PROVIDER' && (
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
