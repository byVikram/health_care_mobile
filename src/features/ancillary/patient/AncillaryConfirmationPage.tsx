import React from 'react'
import {
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

export default function AncillaryConfirmationPage() {
	const navigation = useNavigation<any>()
	const route = useRoute<any>()
	const insets = useSafeAreaInsets()
	const { width } = useWindowDimensions()
	const isTablet = width >= 768

	const payload = route.params?.bookingPayload || {}
	const bookingId = route.params?.bookingId || `BK-${Math.floor(100000 + Math.random() * 900000)}`
	const patient = payload.patient || { name: 'John Doe', age: '34', gender: 'male', relationship: 'Self' }
	const schedule = payload.schedule || { dateLabel: 'Today, Oct 14', timeSlot: '09:00 AM - 10:00 AM' }
	const location = payload.location || '42 Healthcare Avenue, Flat 3B, Sector 18, New Delhi'
	const serviceName = payload.serviceName || 'Wound Dressing & Care'

	const handleGoToBookings = () => {
		if (ROUTES.STACK.APPOINTMENTS) {
			navigation.navigate(ROUTES.STACK.APPOINTMENTS)
		} else {
			navigation.navigate(ROUTES.MAIN.TABS)
		}
	}

	const handleReturnHome = () => {
		navigation.navigate(ROUTES.MAIN.TABS)
	}

	return (
		<View style={styles.container}>
			<AppScreenHeader title="Booking Confirmation" />

			<ScrollView
				contentContainerStyle={[
					styles.scrollContent,
					isTablet && styles.scrollContentTablet,
					{ paddingBottom: insets.bottom + 24 },
				]}
				showsVerticalScrollIndicator={false}
			>
				{/* 1. Confirmation Banner */}
				<View style={styles.successCard}>
					<View style={styles.checkCircle}>
						<Ionicons name="checkmark-circle" size={56} color="#1F5F68" />
					</View>
					<AppTypography variant="h2" style={styles.successTitle}>
						Booking Successfully Confirmed!
					</AppTypography>
					<AppTypography variant="caption" style={styles.bookingIdText}>
						Reference ID: {bookingId}
					</AppTypography>

					<View style={styles.confirmMsgBox}>
						<MaterialCommunityIcons name="information-outline" size={18} color="#1F5F68" style={styles.msgIcon} />
						<AppTypography variant="caption" style={styles.confirmMsgText}>
							Your healthcare service has been successfully booked. You will receive appointment details and updates shortly.
						</AppTypography>
					</View>
				</View>

				{/* 3. Appointment Confirmation Details Card */}
				<View style={styles.card}>
					<AppTypography variant="h3" style={styles.cardHeading}>
						Appointment Details
					</AppTypography>

					<View style={styles.detailRow}>
						<AppTypography variant="caption" style={styles.detailLabel}>
							Service:
						</AppTypography>
						<AppTypography variant="body" style={styles.detailVal}>
							{serviceName}
						</AppTypography>
					</View>

					<View style={styles.detailRow}>
						<AppTypography variant="caption" style={styles.detailLabel}>
							Patient:
						</AppTypography>
						<AppTypography variant="body" style={styles.detailVal}>
							{patient.name} ({patient.age} yrs, {patient.gender || 'N/A'})
						</AppTypography>
					</View>

					<View style={styles.detailRow}>
						<AppTypography variant="caption" style={styles.detailLabel}>
							Visit Address:
						</AppTypography>
						<AppTypography variant="body" style={styles.detailVal} numberOfLines={2}>
							{location}
						</AppTypography>
					</View>

					<View style={styles.detailRow}>
						<AppTypography variant="caption" style={styles.detailLabel}>
							Date & Time:
						</AppTypography>
						<AppTypography variant="body" style={styles.detailVal}>
							{schedule.dateLabel}, {schedule.timeSlot}
						</AppTypography>
					</View>

					<View style={styles.divider} />

					<View style={styles.totalRow}>
						<AppTypography variant="body" style={styles.totalLabel}>
							Final Total Paid:
						</AppTypography>
						<AppTypography variant="h3" style={styles.totalVal}>
							₹794
						</AppTypography>
					</View>
				</View>

				{/* 4. Action Buttons */}
				<View style={styles.buttonWrapper}>
					<AppButton
						variant="primary"
						formAction
						style={styles.actionBtn}
						onPress={handleGoToBookings}
					>
						Go to My Bookings
					</AppButton>
					<AppButton
						variant="outline"
						formAction
						style={[styles.actionBtn, styles.secondaryBtn]}
						onPress={handleReturnHome}
					>
						Return to Home
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
	successCard: {
		backgroundColor: '#FFFFFF',
		borderRadius: 20,
		padding: 20,
		alignItems: 'center',
		marginBottom: 16,
		borderWidth: 1,
		borderColor: '#E8ECEC',
		elevation: 1,
	},
	checkCircle: {
		marginBottom: 8,
	},
	successTitle: {
		fontSize: 20,
		fontWeight: '700',
		color: '#191C1D',
		marginBottom: 2,
		textAlign: 'center',
	},
	bookingIdText: {
		fontSize: 12,
		fontWeight: '600',
		color: '#1F5F68',
		letterSpacing: 0.5,
		marginBottom: 12,
	},
	confirmMsgBox: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		backgroundColor: '#F0F9F9',
		borderRadius: 12,
		padding: 12,
		borderWidth: 1,
		borderColor: '#D4EFEF',
	},
	msgIcon: {
		marginRight: 8,
		marginTop: 2,
	},
	confirmMsgText: {
		flex: 1,
		fontSize: 12,
		color: '#1F5F68',
		lineHeight: 16,
	},
	assignmentCard: {
		backgroundColor: '#FFFFFF',
		borderRadius: 16,
		padding: 16,
		marginBottom: 16,
		borderWidth: 1,
		borderColor: '#E8ECEC',
		elevation: 1,
	},
	cardHeading: {
		fontSize: 16,
		fontWeight: '700',
		color: '#191C1D',
		marginBottom: 12,
	},
	card: {
		backgroundColor: '#FFFFFF',
		borderRadius: 16,
		padding: 16,
		marginBottom: 20,
		borderWidth: 1,
		borderColor: '#E8ECEC',
	},
	detailRow: {
		flexDirection: 'row',
		marginBottom: 8,
	},
	detailLabel: {
		width: 100,
		fontSize: 12,
		color: '#64748B',
		fontWeight: '600',
	},
	detailVal: {
		flex: 1,
		fontSize: 13,
		color: '#191C1D',
		fontWeight: '500',
	},
	divider: {
		height: 1,
		backgroundColor: '#E8ECEC',
		marginVertical: 10,
	},
	totalRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	totalLabel: {
		fontSize: 14,
		fontWeight: '600',
		color: '#526062',
	},
	totalVal: {
		fontSize: 18,
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
