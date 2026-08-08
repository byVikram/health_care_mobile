import React from 'react'
import {
	Image,
	ScrollView,
	StyleSheet,
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
	const serviceName = bookingData.serviceName || 'Wound Dressing & Care'
	const serviceDesc =
		bookingData.serviceDesc ||
		'Sterile dressing, cleansing, and post-surgical wound management by certified nurses.'
	const duration = bookingData.duration || '30 - 45 mins'
	const serviceImage =
		bookingData.serviceImage ||
		'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=500&q=80'

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

	const professional = bookingData.professional || {
		name: 'Nurse Sarah Jenkins, RN',
		profession: 'Certified Home Healthcare Nurse',
		rating: '4.9 ★ (124 reviews)',
		experience: '7 yrs experience',
		verified: true,
		distance: '2.4 km away',
		avatar:
			'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=300&q=80',
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
						Appointment Confirmed
					</AppTypography>
					<AppTypography variant="caption" style={styles.statusSubtitle}>
						Healthcare professional assigned and scheduled for home visit.
					</AppTypography>
				</View>

				{/* 2. Assigned Healthcare Professional Profile */}
				<View style={styles.card}>
					<AppTypography variant="h3" style={styles.cardSectionTitle}>
						Assigned Healthcare Professional
					</AppTypography>

					<View style={styles.proProfileBox}>
						<View style={styles.proHeaderRow}>
							<Image source={{ uri: professional.avatar }} style={styles.proAvatar} resizeMode="cover" />

							<View style={styles.proInfoCol}>
								<View style={styles.proNameRow}>
									<AppTypography variant="h3" style={styles.proName}>
										{professional.name}
									</AppTypography>
									{professional.verified && (
										<View style={styles.verifiedTag}>
											<Ionicons name="checkmark-circle" size={12} color="#1F5F68" />
											<AppTypography variant="caption" style={styles.verifiedTagText}>
												Verified
											</AppTypography>
										</View>
									)}
								</View>

								<AppTypography variant="caption" style={styles.proProfession}>
									{professional.profession}
								</AppTypography>

								<View style={styles.proMetaRow}>
									<View style={styles.metaItem}>
										<Ionicons name="star" size={13} color="#F59E0B" />
										<AppTypography variant="caption" style={styles.metaText}>
											{professional.rating}
										</AppTypography>
									</View>
									<AppTypography variant="caption" style={styles.metaDivider}>
										•
									</AppTypography>
									<AppTypography variant="caption" style={styles.metaText}>
										{professional.experience}
									</AppTypography>
								</View>

								<View style={styles.distanceBadge}>
									<Ionicons name="navigate-outline" size={12} color="#1F5F68" />
									<AppTypography variant="caption" style={styles.distanceText}>
										{professional.distance}
									</AppTypography>
								</View>
							</View>
						</View>
					</View>
				</View>

				{/* 3. Healthcare Service Details */}
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

				{/* 4. Patient Information (Read-Only) */}
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
		</View>
	)
}

const styles = StyleSheet.create({
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
	proProfileBox: {
		backgroundColor: '#F8FAFC',
		borderRadius: 14,
		padding: 12,
		borderWidth: 1,
		borderColor: '#E2E8F0',
	},
	proHeaderRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
	},
	proAvatar: {
		width: 58,
		height: 58,
		borderRadius: 29,
		backgroundColor: '#E2E8F0',
	},
	proInfoCol: {
		flex: 1,
		marginLeft: 12,
	},
	proNameRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	proName: {
		fontSize: 15,
		fontWeight: '700',
		color: '#191C1D',
		flex: 1,
	},
	verifiedTag: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#E6F3F4',
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 10,
		gap: 2,
	},
	verifiedTagText: {
		fontSize: 10,
		fontWeight: '600',
		color: '#1F5F68',
	},
	proProfession: {
		fontSize: 12,
		color: '#526062',
		marginTop: 1,
	},
	proMetaRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 4,
		gap: 6,
	},
	metaItem: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 3,
	},
	metaText: {
		fontSize: 11,
		fontWeight: '600',
		color: '#64748B',
	},
	metaDivider: {
		color: '#94A3B8',
		fontSize: 10,
	},
	distanceBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 6,
		gap: 4,
	},
	distanceText: {
		fontSize: 11,
		fontWeight: '600',
		color: '#1F5F68',
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
