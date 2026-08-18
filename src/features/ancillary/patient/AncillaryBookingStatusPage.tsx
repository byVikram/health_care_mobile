import React, { useState } from 'react'
import {
	Image,
	ScrollView,
	StyleSheet,
	Text,
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
import RatingStars from '../components/RatingStars'
import RateAncillaryReviewModal from '../components/RateAncillaryReviewModal'
import {
	AncillaryBooking,
	AncillaryReviewData,
	getAncillaryReviewByBookingId,
	submitAncillaryReview,
} from '../ancillaryService'

export default function AncillaryBookingStatusPage() {
	const navigation = useNavigation<any>()
	const route = useRoute<any>()
	const insets = useSafeAreaInsets()
	const { width } = useWindowDimensions()
	const isTablet = width >= 768

	const bookingData = route.params?.bookingData || {}
	const bookingId = route.params?.bookingId || bookingData.bookingId || 'BK-882419'

	// Mock / Data fallback structures
	const statusLabel = bookingData.status || 'Assigned'
	const isCompleted = statusLabel.toLowerCase() === 'completed' || bookingData.status === 'completed'
	const serviceName = bookingData.serviceName || 'Wound Dressing & Care'
	const serviceDesc =
		bookingData.serviceDesc ||
		'Sterile dressing, cleansing, and post-surgical wound management by certified nurses.'
	const duration = bookingData.duration || '30 - 45 mins'
	const serviceImage =
		bookingData.serviceImage ||
		'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=500&q=80'

	// Review state
	const [reviewData, setReviewData] = useState<AncillaryReviewData | null>(() =>
		getAncillaryReviewByBookingId(bookingId)
	)
	const [reviewModalVisible, setReviewModalVisible] = useState(false)
	const [isSubmittingReview, setIsSubmittingReview] = useState(false)
	const [statusFeedbackModal, setStatusFeedbackModal] = useState<{
		visible: boolean
		title: string
		description: string
	} | null>(null)

	const patient = bookingData.patient || {
		name: 'John Doe',
		age: '34',
		gender: 'Male',
		relationship: 'Self',
	}

	const medical = bookingData.medical || {
		condition: 'Post-surgical wound dressing',
		notes: 'Sterile handling requested for chronic wound care.',
		prescription: '1 Document Uploaded (prescription.pdf)',
	}

	const appointment = bookingData.appointment || {
		address: '42 Healthcare Avenue, Flat 3B, Sector 18, New Delhi',
		date: 'Today, Oct 14',
		timeSlot: '09:00 AM - 10:00 AM',
	}

	const pricing = bookingData.pricing || {
		basePrice: '₹499',
		severityAdjustment: '₹100',
		visitFee: '₹150',
		taxes: '₹45',
		totalAmount: '₹794',
	}

	const handleGoToHistory = () => {
		if (ROUTES.STACK.APPOINTMENTS) {
			navigation.navigate(ROUTES.STACK.APPOINTMENTS)
		} else {
			navigation.navigate(ROUTES.MAIN.TABS)
		}
	}

	const handleBackToHome = () => {
		navigation.navigate(ROUTES.MAIN.TABS)
	}

	const handleSubmitReview = async (stars: number, comment: string) => {
		setIsSubmittingReview(true)
		try {
			const saved = await submitAncillaryReview({
				bookingId,
				providerId: bookingData.provider?.id || 'n-prov-1',
				providerName: bookingData.provider?.name || 'Healthcare Clinician',
				serviceName,
				rating: stars,
				comment,
				patientName: patient.name || 'John Doe',
			})
			setReviewData(saved)
			setReviewModalVisible(false)
			setStatusFeedbackModal({
				visible: true,
				title: 'Thank You!',
				description: 'Your rating and feedback have been successfully submitted.',
			})
		} finally {
			setIsSubmittingReview(false)
		}
	}

	const modalBookingObj: AncillaryBooking = {
		id: bookingId,
		serviceName,
		serviceKey: bookingData.serviceKey || 'nursing-care',
		serviceLabel: bookingData.serviceLabel || 'Nursing Care',
		status: 'completed',
		date: appointment.date || 'Today',
		provider: {
			id: bookingData.provider?.id || 'n-prov-1',
			name: bookingData.provider?.name || 'Anita Sharma',
			designation: bookingData.provider?.designation || 'Registered Nurse',
			avatar:
				bookingData.provider?.avatar ||
				'https://images.unsplash.com/photo-1594824813573-246434de83fb?auto=format&fit=crop&q=80&w=120',
		},
		hasReview: !!reviewData,
		rating: reviewData?.rating,
		review: reviewData || undefined,
	}

	return (
		<View style={styles.container}>
			<AppScreenHeader title="Booking Details & Status" />

			<ScrollView
				contentContainerStyle={[
					styles.scrollContent,
					isTablet && styles.scrollContentTablet,
					{ paddingBottom: insets.bottom + 24 },
				]}
				showsVerticalScrollIndicator={false}
			>
				{/* 1. Booking Status Header Banner */}
				<View style={styles.statusHeaderCard}>
					<View style={styles.statusRow}>
						<View style={styles.statusBadge}>
							<View style={styles.statusDot} />
							<AppTypography variant="caption" style={styles.statusBadgeText}>
								{statusLabel.toUpperCase()}
							</AppTypography>
						</View>

						<AppTypography variant="caption" style={styles.bookingIdText}>
							Ref: {bookingId}
						</AppTypography>
					</View>

					<AppTypography variant="h2" style={styles.statusTitle}>
						{isCompleted ? 'Service Completed' : 'Appointment Confirmed'}
					</AppTypography>
					<AppTypography variant="caption" style={styles.statusSubtitle}>
						{isCompleted
							? 'Your home care visit has been successfully completed.'
							: 'Your appointment has been scheduled for a home visit.'}
					</AppTypography>
				</View>

				{/* 1b. Post-Service Rating Prompt (Only when Completed) */}
				{isCompleted && (
					<View style={styles.feedbackCard}>
						<View style={styles.feedbackHeaderRow}>
							<View style={styles.feedbackIconWrap}>
								<Ionicons name="star" size={18} color="#D97706" />
							</View>
							<View style={styles.feedbackTextCol}>
								<AppTypography variant="h4" style={styles.feedbackTitle}>
									How was your care experience?
								</AppTypography>
								<AppTypography variant="caption" style={styles.feedbackSubtitle}>
									Your rating helps us improve clinical service quality.
								</AppTypography>
							</View>
						</View>

						{reviewData ? (
							<TouchableOpacity
								style={styles.feedbackActionBtnReviewed}
								onPress={() => setReviewModalVisible(true)}
								activeOpacity={0.8}
							>
								<RatingStars rating={reviewData.rating} size={14} />
								<Text style={styles.feedbackActionTextReviewed}>
									★ {reviewData.rating}.0 • View Your Submitted Review
								</Text>
								<Ionicons name="chevron-forward" size={14} color="#0C7C7C" />
							</TouchableOpacity>
						) : (
							<AppButton
								variant="primary"
								onPress={() => setReviewModalVisible(true)}
								style={{ width: '100%', borderRadius: 12, marginTop: 4 }}
							>
								Rate & Review Service
							</AppButton>
						)}
					</View>
				)}


				{/* 2. Healthcare Service Details */}
				<View style={styles.card}>
					<AppTypography variant="h3" style={styles.cardSectionTitle}>
						Healthcare Service Details
					</AppTypography>

					<View style={styles.serviceRow}>
						{serviceImage ? (
							<Image source={{ uri: serviceImage }} style={styles.serviceImg} resizeMode="cover" />
						) : null}
						<View style={styles.serviceTextCol}>
							<AppTypography variant="h4" style={styles.serviceNameText}>
								{serviceName}
							</AppTypography>
							<AppTypography variant="caption" style={styles.serviceDescText} numberOfLines={2}>
								{serviceDesc}
							</AppTypography>
							{duration && (
								<View style={styles.durationRow}>
									<Ionicons name="time-outline" size={12} color="#1F5F68" />
									<AppTypography variant="caption" style={styles.durationText}>
										{duration}
									</AppTypography>
								</View>
							)}
						</View>
					</View>
				</View>

				{/* 3. Patient Information (Read-Only) */}
				<View style={styles.card}>
					<AppTypography variant="h3" style={styles.cardSectionTitle}>
						Patient Information
					</AppTypography>

					<View style={styles.infoRow}>
						<AppTypography variant="caption" style={styles.infoLabel}>
							Full Name:
						</AppTypography>
						<AppTypography variant="body" style={styles.infoVal}>
							{patient.name}
						</AppTypography>
					</View>

					<View style={styles.infoRow}>
						<AppTypography variant="caption" style={styles.infoLabel}>
							Age / Gender:
						</AppTypography>
						<AppTypography variant="body" style={styles.infoVal}>
							{patient.age} yrs • {patient.gender}
						</AppTypography>
					</View>

					<View style={styles.infoRow}>
						<AppTypography variant="caption" style={styles.infoLabel}>
							Relationship:
						</AppTypography>
						<AppTypography variant="body" style={styles.infoVal}>
							{patient.relationship}
						</AppTypography>
					</View>
				</View>

				{/* 5. Medical Information (Read-Only) */}
				<View style={styles.card}>
					<AppTypography variant="h3" style={styles.cardSectionTitle}>
						Medical Information
					</AppTypography>

					<View style={styles.infoRow}>
						<AppTypography variant="caption" style={styles.infoLabel}>
							Condition:
						</AppTypography>
						<AppTypography variant="body" style={styles.infoVal}>
							{medical.condition || 'None specified'}
						</AppTypography>
					</View>

					<View style={styles.infoRow}>
						<AppTypography variant="caption" style={styles.infoLabel}>
							Notes:
						</AppTypography>
						<AppTypography variant="body" style={styles.infoVal}>
							{medical.notes || 'None'}
						</AppTypography>
					</View>

					<View style={styles.infoRow}>
						<AppTypography variant="caption" style={styles.infoLabel}>
							Prescription:
						</AppTypography>
						<AppTypography variant="body" style={styles.infoVal}>
							{medical.prescription || 'No document attached'}
						</AppTypography>
					</View>
				</View>

				{/* 6. Appointment Details */}
				<View style={styles.card}>
					<AppTypography variant="h3" style={styles.cardSectionTitle}>
						Appointment Details
					</AppTypography>

					<View style={styles.infoRow}>
						<AppTypography variant="caption" style={styles.infoLabel}>
							Visit Address:
						</AppTypography>
						<AppTypography variant="body" style={styles.infoVal} numberOfLines={2}>
							{appointment.address}
						</AppTypography>
					</View>

					<View style={styles.infoRow}>
						<AppTypography variant="caption" style={styles.infoLabel}>
							Date & Time:
						</AppTypography>
						<AppTypography variant="body" style={styles.infoVal}>
							{appointment.date}, {appointment.timeSlot}
						</AppTypography>
					</View>
				</View>

				{/* 7. Pricing Summary (Backend Data) */}
				<View style={styles.pricingCard}>
					<AppTypography variant="h3" style={styles.pricingTitle}>
						Pricing Summary
					</AppTypography>

					<View style={styles.lineItemRow}>
						<AppTypography variant="body" style={styles.lineItemLabel}>
							Service Base Price
						</AppTypography>
						<AppTypography variant="body" style={styles.lineItemVal}>
							{pricing.basePrice}
						</AppTypography>
					</View>

					<View style={styles.lineItemRow}>
						<AppTypography variant="body" style={styles.lineItemLabel}>
							Case Severity Adjustment
						</AppTypography>
						<AppTypography variant="body" style={styles.lineItemVal}>
							{pricing.severityAdjustment}
						</AppTypography>
					</View>

					<View style={styles.lineItemRow}>
						<AppTypography variant="body" style={styles.lineItemLabel}>
							Home Visit & Sanitization
						</AppTypography>
						<AppTypography variant="body" style={styles.lineItemVal}>
							{pricing.visitFee}
						</AppTypography>
					</View>

					<View style={styles.lineItemRow}>
						<AppTypography variant="body" style={styles.lineItemLabel}>
							Taxes & Admin Fee
						</AppTypography>
						<AppTypography variant="body" style={styles.lineItemVal}>
							{pricing.taxes}
						</AppTypography>
					</View>

					<View style={styles.divider} />

					<View style={styles.totalRow}>
						<AppTypography variant="h3" style={styles.totalLabel}>
							Final Total Paid
						</AppTypography>
						<AppTypography variant="h2" style={styles.totalVal}>
							{pricing.totalAmount}
						</AppTypography>
					</View>
				</View>

				{/* 8. Available Actions */}
				<View style={styles.buttonWrapper}>
					<AppButton
						variant="primary"
						formAction
						style={styles.actionBtn}
						onPress={handleGoToHistory}
					>
						View Booking History
					</AppButton>

					<AppButton
						variant="outline"
						formAction
						style={[styles.actionBtn, styles.secondaryBtn]}
						onPress={handleBackToHome}
					>
						Back to Home
					</AppButton>
				</View>
			</ScrollView>

			{/* Rating & Review Bottom Sheet */}
			<RateAncillaryReviewModal
				visible={reviewModalVisible}
				onClose={() => setReviewModalVisible(false)}
				booking={modalBookingObj}
				existingReview={reviewData}
				onSubmit={handleSubmitReview}
				isSubmitting={isSubmittingReview}
			/>

			{/* Status Feedback Confirmation */}
			{statusFeedbackModal && (
				<StatusModal
					visible={statusFeedbackModal.visible}
					status="success"
					title={statusFeedbackModal.title}
					description={statusFeedbackModal.description}
					submitText="Done"
					onSubmit={() => setStatusFeedbackModal(null)}
					onCancel={() => setStatusFeedbackModal(null)}
				/>
			)}
		</View>
	)
}

const styles = StyleSheet.create({
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
		backgroundColor: '#F8FAFC',
	},

	scrollContent: {
		paddingHorizontal: 16,
		paddingTop: 16,
	},
	scrollContentTablet: {
		maxWidth: 720,
		width: '100%',
		alignSelf: 'center',
		paddingHorizontal: 24,
		paddingTop: 24,
	},
	statusHeaderCard: {
		backgroundColor: '#FFFFFF',
		borderRadius: 16,
		padding: 16,
		marginBottom: 16,
		borderWidth: 1,
		borderColor: '#E8ECEC',
		elevation: 1,
	},
	statusRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 10,
	},
	statusBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#E6F3F4',
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 12,
		gap: 6,
	},
	statusDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: '#1F5F68',
	},
	statusBadgeText: {
		fontSize: 11,
		fontWeight: '700',
		color: '#1F5F68',
		letterSpacing: 0.5,
	},
	bookingIdText: {
		fontSize: 12,
		fontWeight: '600',
		color: '#64748B',
	},
	statusTitle: {
		fontSize: 20,
		fontWeight: '700',
		color: '#191C1D',
	},
	statusSubtitle: {
		fontSize: 12,
		color: '#526062',
		marginTop: 2,
	},
	card: {
		backgroundColor: '#FFFFFF',
		borderRadius: 16,
		padding: 16,
		marginBottom: 16,
		borderWidth: 1,
		borderColor: '#E8ECEC',
		elevation: 1,
	},
	cardSectionTitle: {
		fontSize: 16,
		fontWeight: '700',
		color: '#191C1D',
		marginBottom: 12,
	},
	serviceRow: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	serviceImg: {
		width: 64,
		height: 64,
		borderRadius: 10,
		backgroundColor: '#F1F5F9',
	},
	serviceTextCol: {
		flex: 1,
		marginLeft: 12,
	},
	serviceNameText: {
		fontSize: 15,
		fontWeight: '700',
		color: '#191C1D',
	},
	serviceDescText: {
		fontSize: 12,
		color: '#526062',
		marginTop: 2,
		lineHeight: 16,
	},
	durationRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 4,
		gap: 4,
	},
	durationText: {
		fontSize: 11,
		color: '#1F5F68',
		fontWeight: '600',
	},
	infoRow: {
		flexDirection: 'row',
		marginBottom: 8,
	},
	infoLabel: {
		width: 105,
		fontSize: 12,
		color: '#64748B',
		fontWeight: '600',
	},
	infoVal: {
		flex: 1,
		fontSize: 13,
		color: '#191C1D',
		fontWeight: '500',
	},
	pricingCard: {
		backgroundColor: '#FFFFFF',
		borderRadius: 16,
		padding: 16,
		marginBottom: 20,
		borderWidth: 1.5,
		borderColor: '#1F5F68',
		elevation: 2,
	},
	pricingTitle: {
		fontSize: 17,
		fontWeight: '700',
		color: '#1F5F68',
		marginBottom: 14,
	},
	lineItemRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 10,
	},
	lineItemLabel: {
		fontSize: 13,
		color: '#526062',
	},
	lineItemVal: {
		fontSize: 13,
		fontWeight: '600',
		color: '#191C1D',
	},
	divider: {
		height: 1,
		backgroundColor: '#E8ECEC',
		marginVertical: 12,
	},
	totalRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	totalLabel: {
		fontSize: 16,
		fontWeight: '700',
		color: '#191C1D',
	},
	totalVal: {
		fontSize: 20,
		fontWeight: '700',
		color: '#1F5F68',
	},
	buttonWrapper: {
		gap: 10,
		marginBottom: 16,
	},
	actionBtn: {
		width: '100%',
		borderRadius: 14,
	},
	secondaryBtn: {
		marginTop: 4,
	},
})
