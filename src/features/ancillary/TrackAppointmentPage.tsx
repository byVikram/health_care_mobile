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
	const isTravelling = activeStageIndex >= 1 && activeStageIndex <= 3

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

	const renderStatusBanner = () => (
		<View style={styles.statusBanner}>
			<View style={styles.statusIconWrap}>
				<Ionicons name="car-outline" size={20} color="#296769" />
			</View>
			<View style={styles.statusTextCol}>
				<AppTypography variant="h4" style={styles.statusTitle}>
					{activeStageIndex === 2 ? 'Your nurse is on the way' : TRACKING_STAGES[activeStageIndex]?.label || 'Service In Progress'}
				</AppTypography>
				<AppTypography variant="caption" style={styles.statusSubtitle}>
					{nurse.name} is arriving in {etaMinutes} minutes
				</AppTypography>
			</View>
		</View>
	)

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
							{renderOtpCard()}
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
						{renderOtpCard()}
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
		</View>
	)
}

const styles = StyleSheet.create({
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
