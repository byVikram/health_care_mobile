import React, { useState } from 'react'
import {
	Image,
	ScrollView,
	StyleSheet,
	TouchableOpacity,
	View,
	useWindowDimensions,
} from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { ROUTES } from '../../../navigation/routes'
import AppScreenHeader from '../../../components/common/layout/AppScreenHeader'
import { AppTypography } from '../../../components/common/display/AppTypography'
import { AppButton } from '../../../components/common/buttons/AppButton'
import StatusModal from '../../../components/common/feedback/StatusModal'
import RatingStars from '../components/RatingStars'
import RateAncillaryReviewModal from '../components/RateAncillaryReviewModal'
import {
	AncillaryBooking,
	AncillaryReviewData,
	fetchAncillaryReviewByBooking,
	submitAncillaryReview,
} from '../ancillaryService'

import ApiService from '../../../services/apiService'
import { API_ENDPOINTS } from '../../../constants/apiUrls'

export default function AncillaryBookingStatusPage() {
	const navigation = useNavigation<any>()
	const route = useRoute<any>()
	const insets = useSafeAreaInsets()
	const { width } = useWindowDimensions()
	const isTablet = width >= 768

	const bookingData = route.params?.bookingData || {}
	const bookingId = route.params?.bookingId || bookingData.bookingId

	const [liveData, setLiveData] = useState<any>(null)

	React.useEffect(() => {
		const loadLiveBooking = async () => {
			if (!bookingId) return
			try {
				const res = await ApiService.get<any>(API_ENDPOINTS.ANCILLARY.REQUEST_STATUS(bookingId))
				const data = res.data?.data || res.data
				if (data) {
					setLiveData(data)
				}
			} catch (e) {
				console.log('[AncillaryBookingStatusPage] Live status fetch notice')
			}
		}
		void loadLiveBooking()
	}, [bookingId])

	// Status & Data fallbacks
	const rawStatus = liveData?.status || bookingData.status || 'Assigned'
	const statusLabel = rawStatus.toUpperCase()
	const isCompleted = statusLabel.toLowerCase() === 'completed' || rawStatus.toLowerCase() === 'completed'

	const serviceName = liveData?.serviceName || bookingData.serviceName || 'Healthcare Visit'
	const serviceDesc =
		liveData?.procedureDetails ||
		bookingData.serviceDesc ||
		'Sterile dressing, cleansing, and doorstep healthcare management.'
	const duration = bookingData.duration || '30 - 45 mins'
	const serviceImage =
		bookingData.serviceImage ||
		'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=500&q=80'

	// Assigned Practitioner data
	const provider = liveData?.assignedProvider
		? {
				id: liveData.assignedProvider.id || 'n-prov-1',
				name: liveData.assignedProvider.name || 'Nurse Specialist',
				designation: liveData.assignedProvider.credentials || 'Certified Senior RN',
				rating: String(liveData.assignedProvider.rating || '4.9'),
				reviews: '142',
				phone: liveData.assignedProvider.phone || '',
				avatar: liveData.assignedProvider.avatar || 'https://images.unsplash.com/photo-1594824813573-246434de83fb?auto=format&fit=crop&q=80&w=200',
		  }
		: bookingData.provider || {
				id: 'n-prov-1',
				name: 'Nurse Specialist',
				designation: 'Certified Senior RN',
				rating: '4.9',
				reviews: '142',
				phone: '',
				avatar: 'https://images.unsplash.com/photo-1594824813573-246434de83fb?auto=format&fit=crop&q=80&w=200',
		  }

	// Review state
	const [reviewData, setReviewData] = useState<AncillaryReviewData | null>(() => bookingData.review || null)
	const [reviewModalVisible, setReviewModalVisible] = useState(false)
	const [isSubmittingReview, setIsSubmittingReview] = useState(false)
	const [statusFeedbackModal, setStatusFeedbackModal] = useState<{
		visible: boolean
		status?: 'success' | 'error' | 'info'
		title: string
		description: string
	} | null>(null)

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

	const patient = {
		name: liveData?.patientName || bookingData.patient?.name || '',
		age: String(liveData?.patientAge || bookingData.patient?.age || '45'),
		gender: liveData?.patientGender || bookingData.patient?.gender || 'Not Specified',
		relationship: bookingData.patient?.relationship || 'Self',
		bloodGroup: bookingData.patient?.bloodGroup || 'O+',
	}

	const appointment = {
		address: liveData?.streetAddress || bookingData.appointment?.address || 'Doorstep Delivery Address',
		addressLabel: bookingData.appointment?.addressLabel || 'Home',
		date: liveData?.createdAt || bookingData.scheduledStartTime || 'Today',
		timeSlot: bookingData.appointment?.timeSlot || 'Immediate Dispatch',
	}

	const pricing = bookingData.pricing || {
		basePrice: liveData?.totalAmount ? `₹${liveData.totalAmount}` : '₹499',
		visitFee: '₹150',
		taxes: '₹18',
		totalAmount: liveData?.totalAmount ? `₹${liveData.totalAmount}` : '₹667',
	}

	const otpCode = liveData?.verificationOtp || bookingData.otpCode || '4892'

	const handleSubmitReview = async (stars: number, comment: string) => {
		setIsSubmittingReview(true)
		try {
			const saved = await submitAncillaryReview({
				bookingId,
				providerId: provider.id,
				providerName: provider.name,
				serviceName,
				rating: stars,
				comment,
				patientName: patient?.name || liveData?.patientName || 'Patient',
			})
			setReviewData(saved)
			setReviewModalVisible(false)
			setStatusFeedbackModal({
				visible: true,
				status: 'success',
				title: 'Thank You!',
				description: 'Your rating and review have been submitted successfully.',
			})
		} catch (error: any) {
			const errorMsg =
				error?.response?.data?.detail ||
				error?.response?.data?.message ||
				error?.message ||
				'Unable to submit review. Please try again.'
			setStatusFeedbackModal({
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
		serviceName,
		serviceKey: bookingData.serviceKey || 'nursing-care',
		serviceLabel: bookingData.serviceLabel || 'Nursing Care',
		status: 'completed',
		date: appointment.date || 'Today',
		provider,
		hasReview: !!reviewData,
		rating: reviewData?.rating,
		review: reviewData || undefined,
	}

	return (
		<View style={styles.container}>
			<AppScreenHeader title="Track Visit & Appointment" />

			<ScrollView
				contentContainerStyle={[
					styles.scrollContent,
					isTablet && styles.scrollContentTablet,
					{ paddingBottom: insets.bottom + 40 },
				]}
				showsVerticalScrollIndicator={false}
			>
				{/* 1. STATUS BANNER BLOCK */}
				<View style={styles.sectionBlock}>
					<View style={styles.statusBannerRow}>
						<View style={[styles.statusBadge, isCompleted ? styles.completedBadge : styles.activeBadge]}>
							<View style={[styles.statusDot, isCompleted ? styles.completedDot : styles.activeDot]} />
							<AppTypography variant="caption" style={[styles.statusBadgeText, isCompleted ? styles.completedBadgeText : styles.activeBadgeText]}>
								{statusLabel}
							</AppTypography>
						</View>

						<AppTypography variant="caption" style={styles.bookingRefText}>
							Ref ID: {bookingId}
						</AppTypography>
					</View>

					<AppTypography variant="h2" style={styles.statusTitle}>
						{isCompleted ? 'Visit Completed' : 'Practitioner Assigned & En Route'}
					</AppTypography>

					<AppTypography variant="caption" style={styles.statusSub}>
						{isCompleted
							? 'Your home care visit has been completed successfully.'
							: 'Certified practitioner is en route to your location.'}
					</AppTypography>
				</View>

				{/* 8px GREY SECTION DIVIDER BAR */}
				<View style={styles.sectionDividerBar} />

				{/* 2. ASSIGNED PRACTITIONER BLOCK */}
				{!isCompleted && (
					<>
						<View style={styles.sectionBlock}>
							<View style={styles.sectionHeaderRow}>
								<AppTypography variant="h3" style={styles.sectionHeading}>
									Assigned Practitioner
								</AppTypography>
							</View>

							<View style={styles.nurseRow}>
								<Image source={{ uri: provider.avatar }} style={styles.nurseAvatar} resizeMode="cover" />
								<View style={styles.nurseInfoCol}>
									<View style={styles.nurseNameRow}>
										<AppTypography variant="h4" style={styles.nurseName}>
											{provider.name}
										</AppTypography>
										<View style={styles.verifiedChip}>
											<Ionicons name="checkmark-circle" size={12} color="#059669" />
											<AppTypography variant="caption" style={styles.verifiedChipText}>
												VERIFIED RN
											</AppTypography>
										</View>
									</View>

									<AppTypography variant="caption" style={styles.nurseDesig}>
										{provider.designation}
									</AppTypography>

									<View style={styles.nurseRatingRow}>
										<Ionicons name="star" size={13} color="#D97706" />
										<AppTypography variant="caption" style={styles.nurseRatingText}>
											{provider.rating} ({provider.reviews} visits)
										</AppTypography>
									</View>
								</View>

								<TouchableOpacity style={styles.callBtn} activeOpacity={0.8}>
									<Ionicons name="call" size={18} color="#FFFFFF" />
								</TouchableOpacity>
							</View>

							{/* OTP START VISIT BOX */}
							<View style={styles.otpBox}>
								<View style={styles.otpLeftCol}>
									<AppTypography variant="caption" style={styles.otpLabel}>
										Start Visit OTP
									</AppTypography>
									<AppTypography variant="h2" style={styles.otpValue}>
										{otpCode}
									</AppTypography>
								</View>
								<AppTypography variant="caption" style={styles.otpNote}>
									Share this OTP code with your nurse upon arrival to verify visit start.
								</AppTypography>
							</View>
						</View>

						<View style={styles.sectionDividerBar} />
					</>
				)}

				{/* 3. POST-SERVICE RATING CARD (IF COMPLETED) */}
				{isCompleted && (
					<>
						<View style={styles.sectionBlock}>
							<View style={styles.feedbackBox}>
								<View style={styles.feedbackHeaderRow}>
									<Ionicons name="star" size={20} color="#D97706" />
									<View style={styles.feedbackTextCol}>
										<AppTypography variant="h4" style={styles.feedbackTitle}>
											How was your care experience?
										</AppTypography>
										<AppTypography variant="caption" style={styles.feedbackSub}>
											Your review helps maintain clinical healthcare standards.
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

				{/* 4. SECTION: SELECTED PROCEDURES */}
				<View style={styles.sectionBlock}>
					<View style={styles.sectionHeaderRow}>
						<AppTypography variant="h3" style={styles.sectionHeading}>
							Service Details
						</AppTypography>
					</View>

					<View style={styles.serviceRow}>
						<Image source={{ uri: serviceImage }} style={styles.serviceThumb} resizeMode="cover" />
						<View style={styles.serviceTextCol}>
							<AppTypography variant="h4" style={styles.serviceTitle} numberOfLines={1}>
								{serviceName}
							</AppTypography>
							<AppTypography variant="caption" style={styles.serviceDesc} numberOfLines={2}>
								{serviceDesc}
							</AppTypography>
							<View style={styles.durationPill}>
								<Ionicons name="time-outline" size={12} color="#475569" />
								<AppTypography variant="caption" style={styles.durationText}>
									{duration}
								</AppTypography>
							</View>
						</View>
					</View>
				</View>

				{/* 8px GREY SECTION DIVIDER BAR */}
				<View style={styles.sectionDividerBar} />

				{/* 5. SECTION: PATIENT RECIPIENT */}
				<View style={styles.sectionBlock}>
					<View style={styles.sectionHeaderRow}>
						<AppTypography variant="h3" style={styles.sectionHeading}>
							Patient Recipient
						</AppTypography>
					</View>

					<View style={styles.infoList}>
						<View style={styles.infoRow}>
							<AppTypography variant="caption" style={styles.infoLabel}>
								Name
							</AppTypography>
							<AppTypography variant="body" style={styles.infoVal}>
								{patient.name} ({patient.relationship})
							</AppTypography>
						</View>
						<View style={styles.infoRow}>
							<AppTypography variant="caption" style={styles.infoLabel}>
								Age / Gender
							</AppTypography>
							<AppTypography variant="body" style={styles.infoVal}>
								{patient.age} Yrs • {patient.gender} • Blood Group: {patient.bloodGroup || 'O+'}
							</AppTypography>
						</View>
					</View>
				</View>

				{/* 8px GREY SECTION DIVIDER BAR */}
				<View style={styles.sectionDividerBar} />

				{/* 6. SECTION: VISIT LOCATION & SCHEDULE */}
				<View style={styles.sectionBlock}>
					<View style={styles.sectionHeaderRow}>
						<AppTypography variant="h3" style={styles.sectionHeading}>
							Visit Location & Schedule
						</AppTypography>
					</View>

					<View style={styles.infoList}>
						<View style={styles.infoRow}>
							<AppTypography variant="caption" style={styles.infoLabel}>
								Address
							</AppTypography>
							<AppTypography variant="body" style={styles.infoVal} numberOfLines={2}>
								{appointment.address}
							</AppTypography>
						</View>
						<View style={styles.infoRow}>
							<AppTypography variant="caption" style={styles.infoLabel}>
								Time Slot
							</AppTypography>
							<AppTypography variant="body" style={styles.infoVal}>
								{appointment.date} • {appointment.timeSlot}
							</AppTypography>
						</View>
					</View>
				</View>

				{/* 8px GREY SECTION DIVIDER BAR */}
				<View style={styles.sectionDividerBar} />

				{/* 7. SECTION: PAYMENT BREAKDOWN */}
				<View style={styles.sectionBlock}>
					<View style={styles.sectionHeaderRow}>
						<AppTypography variant="h3" style={styles.sectionHeading}>
							Payment Summary
						</AppTypography>
					</View>

					<View style={styles.billingList}>
						<View style={styles.billingRow}>
							<AppTypography variant="body" style={styles.billingLabel}>
								Base Treatment Charges
							</AppTypography>
							<AppTypography variant="body" style={styles.billingVal}>
								{pricing.basePrice}
							</AppTypography>
						</View>
						<View style={styles.billingRow}>
							<AppTypography variant="body" style={styles.billingLabel}>
								Doorstep Visit Fee
							</AppTypography>
							<AppTypography variant="body" style={styles.billingVal}>
								{pricing.visitFee}
							</AppTypography>
						</View>
						<View style={styles.billingRow}>
							<AppTypography variant="body" style={styles.billingLabel}>
								Taxes & GST (3%)
							</AppTypography>
							<AppTypography variant="body" style={styles.billingVal}>
								{pricing.taxes}
							</AppTypography>
						</View>
						<View style={styles.totalDivider} />
						<View style={styles.totalRow}>
							<AppTypography variant="h3" style={styles.totalLabel}>
								Total Paid
							</AppTypography>
							<AppTypography variant="h3" style={styles.totalVal}>
								{pricing.totalAmount}
							</AppTypography>
						</View>
					</View>
				</View>
			</ScrollView>

			{/* REVIEW MODAL */}
			<RateAncillaryReviewModal
				visible={reviewModalVisible}
				onClose={() => setReviewModalVisible(false)}
				booking={modalBookingObj}
				onSubmit={handleSubmitReview}
				isSubmitting={isSubmittingReview}
			/>

			{/* STATUS FEEDBACK MODAL */}
			{statusFeedbackModal && (
				<StatusModal
					visible={statusFeedbackModal.visible}
					status={statusFeedbackModal.status || 'success'}
					title={statusFeedbackModal.title}
					description={statusFeedbackModal.description}
					submitText={statusFeedbackModal.status === 'error' ? 'OK' : 'Done'}
					onSubmit={() => setStatusFeedbackModal(null)}
					onCancel={() => setStatusFeedbackModal(null)}
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
	scrollContent: {
		paddingHorizontal: 0,
		paddingTop: 12,
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
	sectionHeaderRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
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

	/* ASSIGNED NURSE ROW */
	nurseRow: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#F8FAFC',
		borderRadius: 12,
		padding: 12,
		gap: 12,
	},
	nurseAvatar: {
		width: 52,
		height: 52,
		borderRadius: 26,
	},
	nurseInfoCol: {
		flex: 1,
		gap: 2,
	},
	nurseNameRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	nurseName: {
		fontSize: 15,
		fontWeight: '700',
		color: '#0F172A',
	},
	verifiedChip: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#ECFDF5',
		paddingHorizontal: 6,
		paddingVertical: 1,
		borderRadius: 4,
		gap: 3,
	},
	verifiedChipText: {
		fontSize: 9.5,
		fontWeight: '700',
		color: '#047857',
	},
	nurseDesig: {
		fontSize: 12,
		color: '#64748B',
	},
	nurseRatingRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		marginTop: 2,
	},
	nurseRatingText: {
		fontSize: 12,
		fontWeight: '600',
		color: '#334155',
	},
	callBtn: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: '#2B6F71',
		justifyContent: 'center',
		alignItems: 'center',
	},

	/* OTP START VISIT BOX */
	otpBox: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#F1F5F9',
		borderRadius: 12,
		padding: 12,
		gap: 12,
	},
	otpLeftCol: {
		alignItems: 'center',
		paddingRight: 12,
		borderRightWidth: 1,
		borderRightColor: '#CBD5E1',
	},
	otpLabel: {
		fontSize: 10.5,
		color: '#475569',
		fontWeight: '600',
	},
	otpValue: {
		fontSize: 20,
		fontWeight: '800',
		color: '#2B6F71',
		letterSpacing: 2,
	},
	otpNote: {
		fontSize: 11.5,
		color: '#475569',
		flex: 1,
		lineHeight: 16,
	},

	/* SERVICE DETAILS */
	serviceRow: {
		flexDirection: 'row',
		gap: 14,
		alignItems: 'center',
	},
	serviceThumb: {
		width: 72,
		height: 72,
		borderRadius: 12,
		backgroundColor: '#F1F5F9',
	},
	serviceTextCol: {
		flex: 1,
		gap: 4,
	},
	serviceTitle: {
		fontSize: 15,
		fontWeight: '700',
		color: '#0F172A',
	},
	serviceDesc: {
		fontSize: 12.5,
		color: '#64748B',
		lineHeight: 17,
	},
	durationPill: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		backgroundColor: '#F1F5F9',
		paddingHorizontal: 8,
		paddingVertical: 3,
		borderRadius: 6,
		alignSelf: 'flex-start',
	},
	durationText: {
		fontSize: 11.5,
		color: '#475569',
		fontWeight: '500',
	},
	infoList: {
		gap: 10,
	},
	infoRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		justifyContent: 'space-between',
	},
	infoLabel: {
		fontSize: 13,
		color: '#64748B',
	},
	infoVal: {
		fontSize: 13.5,
		fontWeight: '600',
		color: '#0F172A',
		flex: 1,
		textAlign: 'right',
	},

	/* BILLING SUMMARY */
	billingList: {
		gap: 10,
	},
	billingRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	billingLabel: {
		fontSize: 13.5,
		color: '#475569',
	},
	billingVal: {
		fontSize: 13.5,
		fontWeight: '600',
		color: '#0F172A',
	},
	totalDivider: {
		height: 1,
		backgroundColor: '#E2E8F0',
		marginVertical: 4,
	},
	totalRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	totalLabel: {
		fontSize: 16,
		fontWeight: '700',
		color: '#0F172A',
	},
	totalVal: {
		fontSize: 19,
		fontWeight: '800',
		color: '#2B6F71',
	},

	/* FEEDBACK CARD */
	feedbackBox: {
		backgroundColor: '#FFFBEB',
		borderRadius: 14,
		padding: 14,
		borderWidth: 1,
		borderColor: '#FCD34D',
		gap: 12,
	},
	feedbackHeaderRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
	},
	feedbackTextCol: {
		flex: 1,
		gap: 2,
	},
	feedbackTitle: {
		fontSize: 14.5,
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
