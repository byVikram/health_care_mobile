import React from 'react'
import { Image, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { ROUTES } from '../../navigation/routes'
import AppScreenHeader from '../../components/common/AppScreenHeader'
import { AppTypography } from '../../components/common/AppTypography'
import { AppButton } from '../../components/common/AppButton'
import NurseMapTracker from './components/NurseMapTracker'
import AppointmentTrackingTimeline, { TrackingStage } from './components/AppointmentTrackingTimeline'
import RatingStars from './components/RatingStars'

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

	const nurse = bookingData.provider || {
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

	const activeStageIndex = bookingData.activeStageIndex ?? 2
	const otp = String(bookingData.otp || '4291')

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

	return (
		<View style={styles.container}>
			<AppScreenHeader
				title="Track Appointment"
				rightElement={
					<TouchableOpacity style={styles.helpBtn} activeOpacity={0.8}>
						<Ionicons name="help-circle-outline" size={22} color="#ffffff" />
					</TouchableOpacity>
				}
			/>

			<ScrollView
				contentContainerStyle={[
					styles.scrollContent,
					isTablet && styles.scrollContentTablet,
					{ paddingBottom: insets.bottom + 140 },
				]}
				showsVerticalScrollIndicator={false}
			>
				{/* Nurse status banner */}
				<View style={styles.statusBanner}>
					<View style={styles.statusIconWrap}>
						<Ionicons name="car-outline" size={20} color="#296769" />
					</View>
					<View style={styles.statusTextCol}>
						<AppTypography variant="h4" style={styles.statusTitle}>
							Your nurse is on the way
						</AppTypography>
						<AppTypography variant="caption" style={styles.statusSubtitle}>
							{nurse.name} is arriving in {etaMinutes} minutes
						</AppTypography>
					</View>
				</View>

				{/* Map / tracking section */}
				<NurseMapTracker nurseAvatar={nurse.avatar} etaText={`Arriving in ${etaMinutes} mins`} />

				{/* Nurse info card */}
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
							<Ionicons name="call-outline" size={18} color="#055759" />
							<Text style={styles.nurseActionText}>Call Nurse</Text>
						</TouchableOpacity>
						<TouchableOpacity style={styles.nurseActionBtn} onPress={handleMessage} activeOpacity={0.8}>
							<Ionicons name="chatbubble-outline" size={18} color="#055759" />
							<Text style={styles.nurseActionText}>Message</Text>
						</TouchableOpacity>
					</View>
				</View>

				{/* Appointment details */}
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

				{/* Status tracking */}
				<View style={styles.card}>
					<AppTypography variant="h4" style={styles.cardTitle}>
						Status Tracking
					</AppTypography>
					<AppointmentTrackingTimeline stages={TRACKING_STAGES} activeIndex={activeStageIndex} />
				</View>

				{/* OTP section */}
				<View style={styles.otpCard}>
					<View style={styles.otpHeaderRow}>
						<Ionicons name="lock-closed-outline" size={16} color="#191c1d" />
						<Text style={styles.otpHeaderText}>Share OTP to start service</Text>
					</View>
					<Text style={styles.otpSubtext}>Provide this pin to the nurse once they arrive.</Text>
					<View style={styles.otpDigitsRow}>
						{otp.split('').map((digit: string, index: number) => (
							<View key={index} style={styles.otpDigitBox}>
								<Text style={styles.otpDigitText}>{digit}</Text>
							</View>
						))}
					</View>
				</View>
			</ScrollView>

			{/* Bottom actions */}
			<View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
				<AppButton variant="primary" formAction style={styles.bottomBtn} onPress={handleCallNurse}>
					Call Nurse
				</AppButton>
				<AppButton variant="outline" formAction style={[styles.bottomBtn, styles.bottomBtnOutline]} onPress={handleReschedule}>
					Reschedule
				</AppButton>
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f8fafa',
	},
	helpBtn: {
		width: 36,
		height: 36,
		borderRadius: 18,
		backgroundColor: 'rgba(255,255,255,0.15)',
		alignItems: 'center',
		justifyContent: 'center',
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
	},
	statusBanner: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#adebec',
		borderRadius: 16,
		padding: 14,
		marginBottom: 12,
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
	nurseCard: {
		backgroundColor: '#ffffff',
		borderRadius: 16,
		padding: 16,
		marginTop: -32,
		marginBottom: 12,
		borderWidth: 1,
		borderColor: '#e1e3e3',
		elevation: 3,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.08,
		shadowRadius: 10,
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
		gap: 10,
		marginTop: 16,
	},
	nurseActionBtn: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 6,
		backgroundColor: '#f2f4f4',
		borderRadius: 10,
		paddingVertical: 12,
	},
	nurseActionText: {
		fontSize: 13,
		fontWeight: '700',
		color: '#055759',
	},
	card: {
		backgroundColor: '#ffffff',
		borderRadius: 16,
		padding: 16,
		marginBottom: 12,
		borderWidth: 1,
		borderColor: '#e1e3e3',
	},
	cardTitle: {
		fontSize: 15,
		fontWeight: '700',
		color: '#191c1d',
		marginBottom: 12,
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
	otpCard: {
		backgroundColor: '#eceeee',
		borderRadius: 16,
		padding: 16,
		marginBottom: 12,
		borderWidth: 1,
		borderColor: '#e1e3e3',
		opacity: 0.85,
	},
	otpHeaderRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	otpHeaderText: {
		fontSize: 13,
		fontWeight: '700',
		color: '#191c1d',
	},
	otpSubtext: {
		fontSize: 11,
		color: '#3f4849',
		marginTop: 4,
		marginBottom: 14,
	},
	otpDigitsRow: {
		flexDirection: 'row',
		justifyContent: 'center',
		gap: 10,
	},
	otpDigitBox: {
		width: 48,
		height: 56,
		borderRadius: 12,
		backgroundColor: '#ffffff',
		borderWidth: 1,
		borderColor: '#bfc8c8',
		alignItems: 'center',
		justifyContent: 'center',
	},
	otpDigitText: {
		fontSize: 22,
		fontWeight: '700',
		color: '#191c1d',
	},
	bottomBar: {
		position: 'absolute',
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: '#ffffff',
		borderTopWidth: 1,
		borderTopColor: '#e1e3e3',
		paddingHorizontal: 16,
		paddingTop: 12,
		gap: 8,
	},
	bottomBtn: {
		width: '100%',
		alignSelf: 'stretch',
		marginTop: 0,
		borderRadius: 999,
	},
	bottomBtnOutline: {
		borderColor: '#2B6F71',
	},
})
