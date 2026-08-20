import React, { useState } from 'react'
import { Image, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { ROUTES } from '../../navigation/routes'
import AppScreenHeader from '../../components/common/AppScreenHeader'
import { AppTypography } from '../../components/common/AppTypography'
import { AppButton } from '../../components/common/AppButton'
import StatusModal from '../../components/common/StatusModal'
import NurseMapTracker from './components/NurseMapTracker'
import AppointmentTrackingTimeline, { TrackingStage } from './components/AppointmentTrackingTimeline'
import RatingStars from './components/RatingStars'
import RateAncillaryReviewModal from './components/RateAncillaryReviewModal'
import {
	AncillaryBooking,
	AncillaryReviewData,
	getAncillaryReviewByBookingId,
	submitAncillaryReview,
} from './ancillaryService'
import NursePulseRadarView from './components/NursePulseRadarView'
import ApiService from '../../services/apiService'
import { API_ENDPOINTS } from '../../constants/apiUrls'

const TRACKING_STAGES: TrackingStage[] = [
	{ key: 'confirmed', label: 'Booking Confirmed', time: '09:00 AM' },
	{ key: 'assigned', label: 'Nurse Assigned', time: '09:15 AM' },
	{ key: 'on_the_way', label: 'Nurse On The Way', time: 'Expected 10:30 AM' },
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
	const bookingId = String(route.params?.bookingId || bookingData.id || 'book-4')

	// Review state
	const [reviewData, setReviewData] = useState<AncillaryReviewData | null>(() =>
		getAncillaryReviewByBookingId(bookingId)
	)
	const [reviewModalVisible, setReviewModalVisible] = useState(false)
	const [isSubmittingReview, setIsSubmittingReview] = useState(false)
	const [statusModal, setStatusModal] = useState<{
		visible: boolean
		title: string
		description: string
	} | null>(null)

	const nurse = bookingData.provider || {
		id: 'n-prov-1',
		name: 'Anita Sharma',
		designation: 'Registered Nurse',
		avatar: 'https://images.unsplash.com/photo-1594824813573-246434de83fb?auto=format&fit=crop&q=80&w=200',
		phone: '+91 98765 43210',
	}

	const rating = Number(bookingData.rating ?? 4.8)
	const reviewsCount = bookingData.reviewsCount ?? 120
	const experienceYears = bookingData.experienceYears ?? 8
	const etaMinutes = bookingData.etaMinutes ?? 15

	const appointment = bookingData.appointment || {
		service: 'Wound Dressing & Assessment',
		dateTime: '12 Aug 2026 • 10:30 AM',
		locationLabel: 'Home Visit',
		address: '123 Horizon Lane, Apt 4B',
	}

	const [activeStageIndex, setActiveStageIndex] = useState<number>(
		() => bookingData.activeStageIndex ?? 0
	)
	const [liveStatus, setLiveStatus] = useState<string>(() => (bookingData.status || 'SEARCHING').toUpperCase())
	const [liveNurse, setLiveNurse] = useState<any>(bookingData.provider || null)
	const [liveOtp, setLiveOtp] = useState<string>(() => String(bookingData.verificationOtp || bookingData.otp || '4829'))

	React.useEffect(() => {
		const pollStatus = async () => {
			try {
				const res = await ApiService.get<any>(API_ENDPOINTS.ANCILLARY.REQUEST_STATUS(bookingId))
				const data = res.data?.data || res.data
				if (data && data.status) {
					const st = String(data.status).toUpperCase()
					setLiveStatus(st)
					if (data.assignedProvider) {
						setLiveNurse(data.assignedProvider)
					}
					if (data.verificationOtp) {
						setLiveOtp(String(data.verificationOtp))
					}
					if (st === 'SEARCHING' || st === 'SEARCHING_FOR_NURSE') {
						setActiveStageIndex(0)
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
			} catch (e) {
				console.log('[TrackAppointmentPage] Live status poll logged')
			}
		}

		void pollStatus()
		const interval = setInterval(pollStatus, 3000)
		return () => clearInterval(interval)
	}, [bookingId])

	const otp = liveOtp
	const isTravelling = activeStageIndex >= 1 && activeStageIndex <= 3
	const isCompleted = activeStageIndex >= 5 || liveStatus === 'COMPLETED'

	const handleCallNurse = () => {
		Linking.openURL(`tel:${nurse.phone || '+919876543210'}`)
	}

	const handleMessage = () => {
		navigation.navigate(ROUTES.STACK.NOTIFICATION)
	}

	const handleReschedule = () => {
		navigation.navigate(ROUTES.STACK.ANCILLARY_PROVIDERS, {
			serviceKey: bookingData.serviceKey,
			serviceLabel: bookingData.serviceLabel,
		})
	}

	const handleSubmitReview = async (stars: number, comment: string) => {
		setIsSubmittingReview(true)
		try {
			const saved = await submitAncillaryReview({
				bookingId,
				providerId: nurse.id || 'n-prov-1',
				providerName: nurse.name,
				serviceName: appointment.service || 'Nursing Care',
				rating: stars,
				comment,
				patientName: 'John Doe',
			})
			setReviewData(saved)
			setReviewModalVisible(false)
			setStatusModal({
				visible: true,
				title: 'Thank You!',
				description: `Your feedback for ${nurse.name} has been recorded.`,
			})
		} finally {
			setIsSubmittingReview(false)
		}
	}


	const renderStatusBanner = () => (
		<View style={styles.statusBanner}>
			<View style={styles.statusIconWrap}>
				<Ionicons
					name={isCompleted ? 'checkmark-circle' : 'car-outline'}
					size={20}
					color="#296769"
				/>
			</View>
			<View style={styles.statusTextCol}>
				<AppTypography variant="h4" style={styles.statusTitle}>
					{isCompleted
						? 'Service Completed'
						: activeStageIndex === 2
						? 'Your nurse is on the way'
						: TRACKING_STAGES[activeStageIndex]?.label || 'Service In Progress'}
				</AppTypography>
				<AppTypography variant="caption" style={styles.statusSubtitle}>
					{isCompleted
						? `Home visit with ${nurse.name} has concluded.`
						: `${nurse.name} is arriving in ${etaMinutes} minutes`}
				</AppTypography>
			</View>
		</View>
	)

	const renderDemoControl = () => {
		return (
			<View style={styles.demoBox}>
				<View style={styles.demoHeader}>
					<Ionicons name="construct-outline" size={13} color="#B45309" />
					<Text style={styles.demoTitle}>Frontend Testing Control</Text>
				</View>
				<TouchableOpacity
					style={styles.demoBtn}
					onPress={() => setActiveStageIndex(5)}
					activeOpacity={0.8}
				>
					<Ionicons name="checkmark-done-circle" size={16} color="#047857" />
					<Text style={styles.demoBtnText}>Demo: Mark Service Completed</Text>
				</TouchableOpacity>
			</View>
		)
	}

	const renderFeedbackCard = () => {
		if (!isCompleted) return null
		const hasReview = !!reviewData
		const reviewScore = reviewData?.rating || 5

		return (
			<View style={styles.feedbackCard}>
				<View style={styles.feedbackHeaderRow}>
					<View style={styles.feedbackIconWrap}>
						<Ionicons name="star" size={18} color="#D97706" />
					</View>
					<View style={styles.feedbackTextCol}>
						<AppTypography variant="h4" style={styles.feedbackTitle}>
							Service Completed
						</AppTypography>
						<AppTypography variant="h4" style={[styles.feedbackTitle, { marginTop: 2 }]}>
							How was your experience with {nurse.name}?
						</AppTypography>
						<AppTypography variant="caption" style={styles.feedbackSubtitle}>
							Your feedback helps us improve your care experience.
						</AppTypography>
					</View>
				</View>

				{hasReview ? (
					<TouchableOpacity
						style={styles.feedbackActionBtnReviewed}
						onPress={() => setReviewModalVisible(true)}
						activeOpacity={0.8}
					>
						<RatingStars rating={reviewScore} size={14} />
						<Text style={styles.feedbackActionTextReviewed}>
							★ {reviewScore}.0 • View Submitted Review
						</Text>
						<Ionicons name="chevron-forward" size={14} color="#0C7C7C" />
					</TouchableOpacity>
				) : (
					<TouchableOpacity
						style={styles.feedbackActionBtn}
						onPress={() => setReviewModalVisible(true)}
						activeOpacity={0.85}
					>
						<Ionicons name="star" size={15} color="#D97706" />
						<Text style={styles.feedbackActionText}>Rate & Review</Text>
					</TouchableOpacity>
				)}

				<TouchableOpacity
					style={styles.demoResetBtn}
					onPress={() => setActiveStageIndex(2)}
					activeOpacity={0.7}
				>
					<Text style={styles.demoResetBtnText}>Reset Demo to In Progress</Text>
				</TouchableOpacity>
			</View>
		)
	}

	const renderOtpCard = () => (
		<View style={[styles.otpCard, isTablet && styles.otpCardTablet]}>
			{isTablet ? (
				/* Approved Tablet Layout */
				<>
					<View style={styles.otpInfoSection}>
						<View style={styles.otpIconBadge}>
							<Ionicons name="lock-closed" size={14} color="#2B6F71" />
						</View>
						<View style={styles.otpTextCol}>
							<Text style={styles.otpHeaderText} numberOfLines={1}>Start-Service OTP</Text>
							<Text style={styles.otpSubtext}>Provide this to the nurse upon arrival</Text>
						</View>
					</View>

					<View style={styles.otpDigitsRow}>
						{otp.split('').map((digit: string, index: number) => (
							<View key={index} style={styles.otpDigitBoxTablet}>
								<Text style={styles.otpDigitTextTablet}>{digit}</Text>
							</View>
						))}
					</View>
				</>
			) : (
				/* Refined Mobile Layout */
				<View style={styles.otpMobileCardInner}>
					<View style={styles.otpMobileLeftBlock}>
						<View style={styles.otpIconBadgeMobile}>
							<Ionicons name="lock-closed" size={12} color="#2B6F71" />
						</View>
						<View style={styles.otpMobileTextCol}>
							<Text style={styles.otpHeaderTextMobile} numberOfLines={1}>Start-Service OTP</Text>
							<Text style={styles.otpSubtextMobile}>Provide this to the nurse upon arrival</Text>
						</View>
					</View>

					<View style={styles.otpDigitsRowMobile}>
						{otp.split('').map((digit: string, index: number) => (
							<View key={index} style={styles.otpDigitBoxMobile}>
								<Text style={styles.otpDigitTextMobile}>{digit}</Text>
							</View>
						))}
					</View>
				</View>
			)}
		</View>
	)

	const renderNurseCard = () => (
		<View style={styles.nurseCard}>
			<View style={styles.nurseHeaderRow}>
				<Image source={{ uri: nurse.avatar }} style={styles.nurseAvatar} />
				<View style={styles.nurseInfoCol}>
					<AppTypography variant="h4" style={styles.nurseName}>
						{nurse.name}
					</AppTypography>
					<AppTypography variant="caption" style={styles.nurseRole}>
						{nurse.designation || 'Registered Nurse'}
					</AppTypography>
					<View style={styles.ratingRow}>
						<RatingStars rating={rating} size={13} />
						<Text style={styles.ratingText}>
							{rating.toFixed(1)} ({reviewsCount} reviews) • {experienceYears} yrs exp
						</Text>
					</View>
				</View>
			</View>

			<View style={styles.nurseActionsRow}>
				<TouchableOpacity style={styles.nurseActionBtn} onPress={handleCallNurse} activeOpacity={0.8}>
					<Ionicons name="call-outline" size={16} color="#055759" />
					<Text style={styles.nurseActionText} numberOfLines={1}>Call Nurse</Text>
				</TouchableOpacity>
				<TouchableOpacity style={styles.nurseActionBtn} onPress={handleMessage} activeOpacity={0.8}>
					<Ionicons name="chatbubble-outline" size={16} color="#055759" />
					<Text style={styles.nurseActionText} numberOfLines={1}>Message</Text>
				</TouchableOpacity>
				<TouchableOpacity style={styles.nurseActionBtn} onPress={handleReschedule} activeOpacity={0.8}>
					<Ionicons name="calendar-outline" size={16} color="#055759" />
					<Text style={styles.nurseActionText} numberOfLines={1}>Reschedule</Text>
				</TouchableOpacity>
			</View>
		</View>
	)

	const renderAppointmentCard = () => (
		<View style={styles.card}>
			<AppTypography variant="h4" style={styles.cardTitle}>
				Appointment Details
			</AppTypography>

			<View style={styles.detailRow}>
				<View style={styles.detailIconWrap}>
					<MaterialCommunityIcons name="medical-bag" size={18} color="#3f4849" />
				</View>
				<View style={styles.detailTextCol}>
					<Text style={styles.detailLabel}>Service</Text>
					<Text style={styles.detailValue}>{appointment.service}</Text>
				</View>
			</View>

			<View style={styles.detailRow}>
				<View style={styles.detailIconWrap}>
					<Ionicons name="calendar-outline" size={18} color="#3f4849" />
				</View>
				<View style={styles.detailTextCol}>
					<Text style={styles.detailLabel}>Date & Time</Text>
					<Text style={styles.detailValue}>{appointment.dateTime}</Text>
				</View>
			</View>

			<View style={[styles.detailRow, styles.detailRowLast]}>
				<View style={styles.detailIconWrap}>
					<Ionicons name="location-outline" size={18} color="#3f4849" />
				</View>
				<View style={styles.detailTextCol}>
					<Text style={styles.detailLabel}>Location</Text>
					<Text style={styles.detailValue}>{appointment.locationLabel}</Text>
					<Text style={styles.detailSubValue}>{appointment.address}</Text>
				</View>
			</View>
		</View>
	)

	const renderTimelineCard = () => (
		<View style={styles.card}>
			<AppTypography variant="h4" style={styles.cardTitle}>
				Service Progress
			</AppTypography>
			<AppointmentTrackingTimeline stages={TRACKING_STAGES} activeIndex={activeStageIndex} />
		</View>
	)

	const modalBookingObj: AncillaryBooking = {
		id: bookingId,
		serviceName: appointment.service || 'Nursing Care',
		serviceKey: bookingData.serviceKey || 'nursing-care',
		serviceLabel: bookingData.serviceLabel || 'Nursing Care',
		status: 'completed',
		date: appointment.dateTime || 'Today',
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
				<AppScreenHeader title="Finding Nurse..." onBack={() => navigation.goBack()} />
				<NursePulseRadarView
					patientAddress={appointment.address}
					serviceName={appointment.service}
					onCancelSearch={() => navigation.goBack()}
				/>
			</View>
		)
	}

	return (
		<View style={styles.container}>
			<AppScreenHeader title="Track Appointment" />

			<ScrollView
				contentContainerStyle={[
					styles.scrollContent,
					isTablet && styles.scrollContentTablet,
					{ paddingBottom: insets.bottom + 24 },
				]}
				showsVerticalScrollIndicator={false}
			>
				{isTablet ? (
					<View style={styles.tabletGrid}>
						<View style={styles.tabletCol}>
							{renderStatusBanner()}
							{!isCompleted && renderDemoControl()}
							{renderFeedbackCard()}
							{!isCompleted && renderOtpCard()}
							{isTravelling && (
								<NurseMapTracker
									nurseAvatar={nurse.avatar}
									etaText={`Arriving in ${etaMinutes} mins`}
									distanceText="1.5 km away"
								/>
							)}
							{renderTimelineCard()}
						</View>

						<View style={styles.tabletCol}>
							{renderNurseCard()}
							{renderAppointmentCard()}
						</View>
					</View>
				) : (
					<>
						{renderStatusBanner()}
						{!isCompleted && renderDemoControl()}
						{renderFeedbackCard()}
						{!isCompleted && renderOtpCard()}
						{isTravelling && (
							<NurseMapTracker
								nurseAvatar={nurse.avatar}
								etaText={`Arriving in ${etaMinutes} mins`}
								distanceText="1.5 km away"
							/>
						)}
						{renderNurseCard()}
						{renderAppointmentCard()}
						{renderTimelineCard()}
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
					status="success"
					title={statusModal.title}
					description={statusModal.description}
					submitText="Done"
					onSubmit={() => setStatusModal(null)}
					onCancel={() => setStatusModal(null)}
				/>
			)}
		</View>
	)
}

const styles = StyleSheet.create({
	demoBox: {
		backgroundColor: '#FFFBEB',
		borderColor: '#FDE68A',
		borderWidth: 1.5,
		borderRadius: 14,
		padding: 12,
		marginBottom: 14,
		gap: 8,
	},
	demoHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	demoTitle: {
		fontSize: 11,
		fontWeight: '800',
		color: '#B45309',
		textTransform: 'uppercase',
		letterSpacing: 0.5,
	},
	demoBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 6,
		backgroundColor: '#ECFDF5',
		borderColor: '#A7F3D0',
		borderWidth: 1,
		borderRadius: 10,
		paddingVertical: 10,
		paddingHorizontal: 12,
	},
	demoBtnText: {
		fontSize: 13,
		fontWeight: '800',
		color: '#047857',
	},
	demoResetBtn: {
		alignSelf: 'center',
		paddingVertical: 6,
		paddingHorizontal: 12,
		marginTop: 4,
	},
	demoResetBtnText: {
		fontSize: 11.5,
		fontWeight: '600',
		color: '#94A3B8',
		textDecorationLine: 'underline',
	},
	feedbackCard: {
		backgroundColor: '#FFFFFF',
		borderRadius: 16,
		padding: 16,
		marginBottom: 16,
		borderWidth: 1.5,
		borderColor: '#FDE68A',
		shadowColor: '#F59E0B',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.08,
		shadowRadius: 6,
		elevation: 2,
		gap: 12,
	},
	feedbackHeaderRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
	},
	feedbackIconWrap: {
		width: 36,
		height: 36,
		borderRadius: 18,
		backgroundColor: '#FEF3C7',
		alignItems: 'center',
		justifyContent: 'center',
	},
	feedbackTextCol: {
		flex: 1,
	},
	feedbackTitle: {
		fontSize: 14.5,
		fontWeight: '700',
		color: '#191C1D',
	},
	feedbackSubtitle: {
		fontSize: 11.5,
		color: '#64748B',
		marginTop: 1,
	},
	feedbackActionBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 6,
		backgroundColor: '#FFFBEB',
		borderColor: '#FDE68A',
		borderWidth: 1,
		paddingVertical: 10,
		borderRadius: 12,
	},
	feedbackActionText: {
		fontSize: 13,
		fontWeight: '700',
		color: '#92400E',
	},
	feedbackActionBtnReviewed: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		backgroundColor: '#F0FDFA',
		borderColor: '#CCFBF1',
		borderWidth: 1,
		paddingHorizontal: 12,
		paddingVertical: 10,
		borderRadius: 12,
	},
	feedbackActionTextReviewed: {
		fontSize: 12.5,
		fontWeight: '700',
		color: '#0C7C7C',
		flex: 1,
		marginLeft: 8,
	},

	container: {
		flex: 1,
		backgroundColor: '#f8fafa',
	},
	scrollContent: {
		paddingHorizontal: 16,
		paddingTop: 16,
	},
	scrollContentTablet: {
		maxWidth: 960,
		width: '100%',
		alignSelf: 'center',
		paddingHorizontal: 24,
	},
	tabletGrid: {
		flexDirection: 'row',
		gap: 20,
	},
	tabletCol: {
		flex: 1,
	},
	statusBanner: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#adebec',
		borderRadius: 16,
		padding: 14,
		marginBottom: 14,
		gap: 12,
	},
	statusIconWrap: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: '#ffffff',
		alignItems: 'center',
		justifyContent: 'center',
	},
	statusTextCol: {
		flex: 1,
	},
	statusTitle: {
		fontSize: 15,
		fontWeight: '700',
		color: '#296769',
	},
	statusSubtitle: {
		fontSize: 12,
		color: '#296769',
		marginTop: 2,
	},
	otpCard: {
		backgroundColor: '#ffffff',
		borderRadius: 12,
		paddingVertical: 10,
		paddingHorizontal: 12,
		marginBottom: 12,
		borderWidth: 1.2,
		borderColor: '#2B6F71',
		elevation: 1,
		shadowColor: '#2B6F71',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.08,
		shadowRadius: 4,
	},
	otpCardTablet: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: 12,
		paddingHorizontal: 18,
		borderRadius: 14,
		marginBottom: 16,
	},
	otpMobileCardInner: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 10,
		width: '100%',
	},
	otpMobileLeftBlock: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		gap: 8,
		flex: 1,
	},
	otpIconBadgeMobile: {
		width: 22,
		height: 22,
		borderRadius: 11,
		backgroundColor: '#eef8f8',
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: 1,
	},
	otpMobileTextCol: {
		flex: 1,
	},
	otpHeaderTextMobile: {
		fontSize: 12.5,
		fontWeight: '700',
		color: '#12373E',
	},
	otpSubtextMobile: {
		fontSize: 10,
		color: '#4b5563',
		marginTop: 2,
		lineHeight: 13,
	},
	otpDigitsRowMobile: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	otpDigitBoxMobile: {
		width: 26,
		height: 32,
		borderRadius: 6,
		backgroundColor: '#f8fafc',
		borderWidth: 1,
		borderColor: '#94a3b8',
		alignItems: 'center',
		justifyContent: 'center',
	},
	otpDigitTextMobile: {
		fontSize: 14,
		fontWeight: '700',
		color: '#12373E',
	},
	otpInfoSection: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		flex: 1,
		marginRight: 10,
	},
	otpIconBadge: {
		width: 28,
		height: 28,
		borderRadius: 14,
		backgroundColor: '#eef8f8',
		alignItems: 'center',
		justifyContent: 'center',
	},
	otpTextCol: {
		flex: 1,
	},
	otpHeaderText: {
		fontSize: 13,
		fontWeight: '700',
		color: '#12373E',
	},
	otpSubtext: {
		fontSize: 10.5,
		color: '#4b5563',
		marginTop: 1,
	},
	otpDigitsRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	otpDigitBoxTablet: {
		width: 38,
		height: 40,
		borderRadius: 9,
		borderWidth: 1.2,
		backgroundColor: '#f8fafc',
		borderColor: '#94a3b8',
		alignItems: 'center',
		justifyContent: 'center',
	},
	otpDigitTextTablet: {
		fontSize: 18,
		fontWeight: '700',
		color: '#12373E',
	},
	nurseCard: {
		backgroundColor: '#ffffff',
		borderRadius: 16,
		padding: 16,
		marginBottom: 16,
		borderWidth: 1,
		borderColor: '#e1e3e3',
		elevation: 2,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 6,
	},
	nurseHeaderRow: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	nurseAvatar: {
		width: 60,
		height: 60,
		borderRadius: 30,
		backgroundColor: '#eceeee',
	},
	nurseInfoCol: {
		flex: 1,
		marginLeft: 12,
	},
	nurseName: {
		fontSize: 16,
		fontWeight: '700',
		color: '#191c1d',
	},
	nurseRole: {
		fontSize: 12,
		color: '#3f4849',
		marginTop: 1,
	},
	ratingRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 6,
		gap: 6,
	},
	ratingText: {
		fontSize: 11,
		color: '#3f4849',
		fontWeight: '600',
	},
	nurseActionsRow: {
		flexDirection: 'row',
		gap: 6,
		marginTop: 16,
	},
	nurseActionBtn: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 4,
		backgroundColor: '#f2f4f4',
		borderRadius: 10,
		paddingVertical: 10,
		paddingHorizontal: 4,
	},
	nurseActionText: {
		fontSize: 12,
		fontWeight: '700',
		color: '#055759',
	},
	card: {
		backgroundColor: '#ffffff',
		borderRadius: 16,
		padding: 16,
		marginBottom: 16,
		borderWidth: 1,
		borderColor: '#e1e3e3',
	},
	cardTitle: {
		fontSize: 15,
		fontWeight: '700',
		color: '#191c1d',
		marginBottom: 14,
	},
	detailRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		marginBottom: 14,
	},
	detailRowLast: {
		marginBottom: 0,
	},
	detailIconWrap: {
		width: 34,
		height: 34,
		borderRadius: 10,
		backgroundColor: '#eceeee',
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 10,
	},
	detailTextCol: {
		flex: 1,
	},
	detailLabel: {
		fontSize: 11,
		fontWeight: '700',
		color: '#3f4849',
	},
	detailValue: {
		fontSize: 13,
		color: '#191c1d',
		fontWeight: '600',
		marginTop: 2,
	},
	detailSubValue: {
		fontSize: 12,
		color: '#3f4849',
		marginTop: 1,
	},
	stickyBottomBar: {
		position: 'absolute',
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: '#ffffff',
		borderTopWidth: 1,
		borderTopColor: '#e1e3e3',
		paddingTop: 12,
		paddingHorizontal: 16,
		elevation: 8,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: -3 },
		shadowOpacity: 0.08,
		shadowRadius: 6,
	},
	bottomBarContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		width: '100%',
	},
	bottomBarContainerTablet: {
		maxWidth: 960,
		alignSelf: 'center',
		paddingHorizontal: 24,
	},
	actionBtn: {
		flex: 1,
		marginTop: 0,
		borderRadius: 24,
	},
	actionBtnOutline: {
		borderColor: '#2B6F71',
	},
	actionBtnLabel: {
		fontSize: 13,
		fontWeight: '700',
	},
	actionBtnOutlineLabel: {
		color: '#2B6F71',
	},
})
