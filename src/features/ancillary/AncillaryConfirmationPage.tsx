import React, { useEffect, useState } from 'react'
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
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { ROUTES } from '../../navigation/routes'
import AppScreenHeader from '../../components/common/AppScreenHeader'
import { AppTypography } from '../../components/common/AppTypography'
import { AppButton } from '../../components/common/AppButton'

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

	// Simulated backend auto-assignment loading state
	const [assigning, setAssigning] = useState(true)

	useEffect(() => {
		const timer = setTimeout(() => {
			setAssigning(false)
		}, 1500)
		return () => clearTimeout(timer)
	}, [])

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
							Your healthcare service has been successfully booked. A suitable nearby healthcare professional has been assigned and has received the appointment details.
						</AppTypography>
					</View>
				</View>

				{/* 2. Assigned Healthcare Professional Profile Section */}
				<View style={styles.assignmentCard}>
					<AppTypography variant="h3" style={styles.cardHeading}>
						Assigned Healthcare Professional
					</AppTypography>

					{assigning ? (
						<View style={styles.assigningBox}>
							<ActivityIndicator size="small" color="#1F5F68" style={styles.spinner} />
							<View style={styles.assigningTextCol}>
								<AppTypography variant="h4" style={styles.assigningTitle}>
									Assigning nearby healthcare professional...
								</AppTypography>
								<AppTypography variant="caption" style={styles.assigningDesc}>
									Automatic matching based on patient location, availability & eligibility
								</AppTypography>
							</View>
						</View>
					) : (
						<View style={styles.proProfileBox}>
							<View style={styles.proHeaderRow}>
								<Image
									source={{
										uri: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=300&q=80',
									}}
									style={styles.proAvatar}
									resizeMode="cover"
								/>
								<View style={styles.proInfoCol}>
									<View style={styles.proNameRow}>
										<AppTypography variant="h3" style={styles.proName}>
											Nurse Sarah Jenkins, RN
										</AppTypography>
										<View style={styles.verifiedTag}>
											<Ionicons name="checkmark-circle" size={12} color="#1F5F68" />
											<AppTypography variant="caption" style={styles.verifiedTagText}>
												Verified
											</AppTypography>
										</View>
									</View>

									<AppTypography variant="caption" style={styles.proProfession}>
										Certified Home Healthcare Nurse
									</AppTypography>

									<View style={styles.proMetaRow}>
										<View style={styles.metaItem}>
											<Ionicons name="star" size={13} color="#F59E0B" />
											<AppTypography variant="caption" style={styles.metaText}>
												4.9 (124 reviews)
											</AppTypography>
										</View>
										<AppTypography variant="caption" style={styles.metaDivider}>
											•
										</AppTypography>
										<AppTypography variant="caption" style={styles.metaText}>
											7 yrs experience
										</AppTypography>
									</View>

									<View style={styles.distanceBadge}>
										<Ionicons name="navigate-outline" size={12} color="#1F5F68" />
										<AppTypography variant="caption" style={styles.distanceText}>
											2.4 km away from visit location
										</AppTypography>
									</View>
								</View>
							</View>

							<View style={styles.arrivalBox}>
								<MaterialCommunityIcons name="clock-check-outline" size={20} color="#1F5F68" />
								<View style={styles.arrivalTextCol}>
									<AppTypography variant="caption" style={styles.arrivalTitle}>
										Scheduled Appointment Time
									</AppTypography>
									<AppTypography variant="h4" style={styles.arrivalVal}>
										{schedule.dateLabel || 'Today'} at {schedule.timeSlot || '09:00 AM'}
									</AppTypography>
								</View>
							</View>
						</View>
					)}
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
	assigningBox: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#F0F9F9',
		borderRadius: 12,
		padding: 16,
		borderWidth: 1,
		borderColor: '#D4EFEF',
	},
	spinner: {
		marginRight: 14,
	},
	assigningTextCol: {
		flex: 1,
	},
	assigningTitle: {
		fontSize: 14,
		fontWeight: '700',
		color: '#1F5F68',
	},
	assigningDesc: {
		fontSize: 11,
		color: '#475569',
		marginTop: 2,
	},
	proProfileBox: {
		backgroundColor: '#F8FAFC',
		borderRadius: 14,
		padding: 14,
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
	arrivalBox: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#F0F9F9',
		borderRadius: 10,
		padding: 10,
		marginTop: 12,
		gap: 8,
	},
	arrivalTextCol: {
		flex: 1,
	},
	arrivalTitle: {
		fontSize: 11,
		color: '#526062',
	},
	arrivalVal: {
		fontSize: 13,
		fontWeight: '700',
		color: '#1F5F68',
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
