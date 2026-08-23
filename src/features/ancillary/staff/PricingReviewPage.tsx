import React, { useState } from 'react'
import {
	ActivityIndicator,
	Image,
	ScrollView,
	StyleSheet,
	View,
	useWindowDimensions,
} from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { ROUTES } from '../../../navigation/routes'
import AppScreenHeader from '../../../components/common/AppScreenHeader'
import { AppTypography } from '../../../components/common/AppTypography'
import { AppButton } from '../../../components/common/AppButton'

export default function PricingReviewPage() {
	const navigation = useNavigation<any>()
	const route = useRoute<any>()
	const insets = useSafeAreaInsets()
	const { width } = useWindowDimensions()
	const isTablet = width >= 768

	const payload = route.params?.bookingPayload || {}
	const patient = payload.patient || { name: 'Patient Recipient', age: '', gender: '', relationship: 'Self' }
	const medical = payload.medical || { condition: 'Post-surgical wound dressing', notes: 'Gentle handling requested', uploadedFiles: [] }
	const schedule = payload.schedule || { dateLabel: 'Today, Oct 14', timeSlot: '09:00 AM - 10:00 AM' }
	const location = payload.location || '42 Healthcare Avenue, Flat 3B, Sector 18, New Delhi'
	const serviceName = payload.serviceName || 'Wound Dressing & Care'
	const servicesList = payload.services || [
		{
			id: 'gen1',
			title: serviceName,
			description: 'Sterile dressing for surgical, burn, or chronic diabetic wounds',
			duration: '30 - 45 mins',
			price: '₹499',
			image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=500&q=80',
		},
	]

	const [submitting, setSubmitting] = useState(false)

	// Mock pricing breakdown data (returned from backend service)
	const pricingBreakdown = {
		serviceBaseFee: '₹499',
		severityAdjustment: '₹100',
		homeVisitFee: '₹150',
		taxesAndFees: '₹45',
		finalTotal: '₹794',
	}

	const handleConfirmBooking = () => {
		setSubmitting(true)

		setTimeout(() => {
			setSubmitting(false)
			// On successful submission, navigate to Booking Confirmation & Healthcare Professional Assignment screen
			navigation.navigate(ROUTES.STACK.ANCILLARY_CONFIRMATION, {
				bookingId: `BK-${Math.floor(100000 + Math.random() * 900000)}`,
				bookingPayload: payload,
			})
		}, 1000)
	}

	return (
		<View style={styles.container}>
			<AppScreenHeader title="Pricing & Booking Review" />

			<ScrollView
				contentContainerStyle={[
					styles.scrollContent,
					isTablet && styles.scrollContentTablet,
					{ paddingBottom: insets.bottom + 24 },
				]}
				showsVerticalScrollIndicator={false}
			>
				{/* 1. Header Banner */}
				<View style={styles.reviewBanner}>
					<Ionicons name="shield-checkmark-outline" size={24} color="#1F5F68" style={styles.bannerIcon} />
					<View style={styles.bannerTextCol}>
						<AppTypography variant="h3" style={styles.bannerTitle}>
							Review Booking & Pricing
						</AppTypography>
						<AppTypography variant="caption" style={styles.bannerSubtitle}>
							Please verify all details and pricing breakdown before confirming.
						</AppTypography>
					</View>
				</View>

				{/* 2. Selected Healthcare Service(s) Card (Read-Only) */}
				<View style={styles.card}>
					<AppTypography variant="h3" style={styles.cardSectionTitle}>
						Selected Healthcare Service(s)
					</AppTypography>

					{servicesList.map((srv: any, index: number) => (
						<View key={srv.id || index} style={styles.serviceItemRow}>
							{srv.image ? (
								<Image source={{ uri: srv.image }} style={styles.serviceImage} resizeMode="cover" />
							) : null}
							<View style={styles.serviceInfoCol}>
								<AppTypography variant="h4" style={styles.serviceName}>
									{srv.title || srv.serviceName}
								</AppTypography>
								<AppTypography variant="caption" style={styles.serviceDesc} numberOfLines={2}>
									{srv.description}
								</AppTypography>
								{srv.duration && (
									<View style={styles.durationPill}>
										<Ionicons name="time-outline" size={12} color="#1F5F68" />
										<AppTypography variant="caption" style={styles.durationText}>
											{srv.duration}
										</AppTypography>
									</View>
								)}
							</View>
						</View>
					))}
				</View>

				{/* 3. Patient Details Card (Read-Only) */}
				<View style={styles.card}>
					<AppTypography variant="h3" style={styles.cardSectionTitle}>
						Patient Details
					</AppTypography>

					<View style={styles.infoRow}>
						<AppTypography variant="caption" style={styles.infoLabel}>
							Full Name:
						</AppTypography>
						<AppTypography variant="body" style={styles.infoValue}>
							{patient.name}
						</AppTypography>
					</View>

					<View style={styles.infoRow}>
						<AppTypography variant="caption" style={styles.infoLabel}>
							Age / Gender:
						</AppTypography>
						<AppTypography variant="body" style={styles.infoValue}>
							{patient.age} yrs • {patient.gender ? patient.gender.toUpperCase() : 'N/A'}
						</AppTypography>
					</View>

					<View style={styles.infoRow}>
						<AppTypography variant="caption" style={styles.infoLabel}>
							Relationship:
						</AppTypography>
						<AppTypography variant="body" style={styles.infoValue}>
							{patient.relationship || 'Self'}
						</AppTypography>
					</View>
				</View>

				{/* 4. Medical Details Card (Read-Only) */}
				<View style={styles.card}>
					<AppTypography variant="h3" style={styles.cardSectionTitle}>
						Medical Details
					</AppTypography>

					<View style={styles.infoRow}>
						<AppTypography variant="caption" style={styles.infoLabel}>
							Condition:
						</AppTypography>
						<AppTypography variant="body" style={styles.infoValue}>
							{medical.condition || 'Not specified'}
						</AppTypography>
					</View>

					<View style={styles.infoRow}>
						<AppTypography variant="caption" style={styles.infoLabel}>
							Notes:
						</AppTypography>
						<AppTypography variant="body" style={styles.infoValue}>
							{medical.notes || 'None'}
						</AppTypography>
					</View>

					<View style={styles.infoRow}>
						<AppTypography variant="caption" style={styles.infoLabel}>
							Prescription:
						</AppTypography>
						<AppTypography variant="body" style={styles.infoValue}>
							{medical.uploadedFiles && medical.uploadedFiles.length > 0
								? `${medical.uploadedFiles.length} Attachment(s) Uploaded`
								: 'No prescription attached'}
						</AppTypography>
					</View>
				</View>

				{/* 5. Visit Details Card (Read-Only) */}
				<View style={styles.card}>
					<AppTypography variant="h3" style={styles.cardSectionTitle}>
						Visit Details
					</AppTypography>

					<View style={styles.infoRow}>
						<AppTypography variant="caption" style={styles.infoLabel}>
							Visit Address:
						</AppTypography>
						<AppTypography variant="body" style={styles.infoValue} numberOfLines={2}>
							{location}
						</AppTypography>
					</View>

					<View style={styles.infoRow}>
						<AppTypography variant="caption" style={styles.infoLabel}>
							Date & Time:
						</AppTypography>
						<AppTypography variant="body" style={styles.infoValue}>
							{schedule.dateLabel || 'Today'}, {schedule.timeSlot || '09:00 AM'}
						</AppTypography>
					</View>
				</View>

				{/* 6. Pricing Breakdown Card */}
				<View style={styles.pricingCard}>
					<AppTypography variant="h3" style={styles.pricingTitle}>
						Pricing Breakdown
					</AppTypography>

					<View style={styles.lineItemRow}>
						<AppTypography variant="body" style={styles.lineItemLabel}>
							Base Service Price
						</AppTypography>
						<AppTypography variant="body" style={styles.lineItemValue}>
							{pricingBreakdown.serviceBaseFee}
						</AppTypography>
					</View>

					<View style={styles.lineItemRow}>
						<AppTypography variant="body" style={styles.lineItemLabel}>
							Case Severity Adjustment
						</AppTypography>
						<AppTypography variant="body" style={styles.lineItemValue}>
							{pricingBreakdown.severityAdjustment}
						</AppTypography>
					</View>

					<View style={styles.lineItemRow}>
						<AppTypography variant="body" style={styles.lineItemLabel}>
							Home Visit & Sanitization
						</AppTypography>
						<AppTypography variant="body" style={styles.lineItemValue}>
							{pricingBreakdown.homeVisitFee}
						</AppTypography>
					</View>

					<View style={styles.lineItemRow}>
						<AppTypography variant="body" style={styles.lineItemLabel}>
							Taxes & Admin Fee
						</AppTypography>
						<AppTypography variant="body" style={styles.lineItemValue}>
							{pricingBreakdown.taxesAndFees}
						</AppTypography>
					</View>

					<View style={styles.divider} />

					<View style={styles.totalRow}>
						<AppTypography variant="h3" style={styles.totalLabel}>
							Final Total Amount
						</AppTypography>
						<AppTypography variant="h2" style={styles.totalValue}>
							{pricingBreakdown.finalTotal}
						</AppTypography>
					</View>
				</View>

				{/* 7. Confirm Booking Action */}
				<View style={styles.buttonWrapper}>
					<AppButton
						variant="primary"
						formAction
						style={styles.confirmBtn}
						onPress={handleConfirmBooking}
						disabled={submitting}
					>
						{submitting ? 'Confirming Booking...' : 'Confirm Booking'}
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
	reviewBanner: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#F0F9F9',
		borderRadius: 14,
		padding: 14,
		marginBottom: 16,
		borderWidth: 1,
		borderColor: '#D4EFEF',
	},
	bannerIcon: {
		marginRight: 12,
	},
	bannerTextCol: {
		flex: 1,
	},
	bannerTitle: {
		fontSize: 15,
		fontWeight: '700',
		color: '#1F5F68',
	},
	bannerSubtitle: {
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
		shadowColor: '#000000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.04,
		shadowRadius: 4,
	},
	cardSectionTitle: {
		fontSize: 16,
		fontWeight: '700',
		color: '#191C1D',
		marginBottom: 12,
	},
	serviceItemRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 10,
	},
	serviceImage: {
		width: 64,
		height: 64,
		borderRadius: 10,
		backgroundColor: '#F1F5F9',
	},
	serviceInfoCol: {
		flex: 1,
		marginLeft: 12,
	},
	serviceName: {
		fontSize: 14,
		fontWeight: '700',
		color: '#191C1D',
	},
	serviceDesc: {
		fontSize: 12,
		color: '#526062',
		marginTop: 2,
		lineHeight: 16,
	},
	durationPill: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 4,
		gap: 3,
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
	infoValue: {
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
	lineItemValue: {
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
	totalValue: {
		fontSize: 20,
		fontWeight: '700',
		color: '#1F5F68',
	},
	buttonWrapper: {
		marginTop: 4,
		marginBottom: 16,
	},
	confirmBtn: {
		width: '100%',
		borderRadius: 14,
	},
})
