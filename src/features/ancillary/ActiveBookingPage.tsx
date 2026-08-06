import React, { useEffect, useState } from 'react'
import {
	ActivityIndicator,
	Alert,
	Linking,
	Platform,
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation, useRoute } from '@react-navigation/native'
import { MOCK_NURSE_BOOKINGS, NurseBooking, getBookingState } from './ancillaryService'
import { ROUTES } from '../../navigation/routes'
import PatientInformationCard from './components/PatientInformationCard'
import AppointmentSummary from './components/AppointmentSummary'
import ServiceTimeline from './components/ServiceTimeline'

export default function ActiveBookingPage() {
	const navigation = useNavigation<any>()
	const route = useRoute<any>()
	const { bookingId } = route.params || {}

	const [booking, setBooking] = useState<NurseBooking | null>(null)
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		const loadData = async () => {
			const found = MOCK_NURSE_BOOKINGS.find((b) => b.id === bookingId)
			if (found) {
				const state = await getBookingState(found.id)
				setBooking({
					...found,
					status: state ? state.status : found.status,
				})
			}
			setLoading(false)
		}
		void loadData()
	}, [bookingId])

	const handleNavigateOnMap = () => {
		if (!booking) return
		const query = encodeURIComponent(booking.patientAddress)
		const url = Platform.select({
			ios: `maps:0,0?q=${query}`,
			android: `geo:0,0?q=${query}`,
			default: `https://www.google.com/maps/search/?api=1&query=${query}`,
		})

		Linking.openURL(url).catch(() => {
			Alert.alert('Error', 'Unable to open maps application.')
		})
	}

	const handleStartService = () => {
		if (!booking) return
		navigation.navigate(ROUTES.STACK.NURSE_PATIENT_VERIFICATION, { bookingId: booking.id })
	}

	if (loading) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size="large" color="#2B6F71" />
			</View>
		)
	}

	if (!booking) {
		return (
			<View style={styles.errorContainer}>
				<Text style={styles.errorText}>Booking details not found.</Text>
			</View>
		)
	}

	return (
		<ScrollView style={styles.container} contentContainerStyle={styles.content}>
			{/* Service Step Timeline */}
			<ServiceTimeline currentStatus={booking.status} />

			{/* Patient Profile Details */}
			<Text style={styles.sectionHeader}>Patient Information</Text>
			<PatientInformationCard
				name={booking.patientName}
				age={booking.patientAge}
				gender={booking.patientGender}
				phone={booking.patientPhone}
				avatarUrl={booking.patientAvatar}
				onCallPress={() => {
					Linking.openURL(`tel:${booking.patientPhone}`).catch(() => {
						Alert.alert('Error', 'Unable to place call.')
					})
				}}
			/>

			{/* Service & Time Summary */}
			<Text style={styles.sectionHeader}>Service Details</Text>
			<AppointmentSummary
				serviceName={booking.serviceName}
				serviceDescription={booking.serviceDescription}
				appointmentDate={booking.appointmentDate}
				appointmentTime={booking.appointmentTime}
			/>

			{/* Address Card & Map Navigation */}
			<Text style={styles.sectionHeader}>Patient Address</Text>
			<View style={styles.addressCard}>
				<View style={styles.addressHeader}>
					<Ionicons name="location-sharp" size={20} color="#2B6F71" />
					<Text style={styles.addressLabel}>Home Address</Text>
				</View>
				<Text style={styles.addressText}>{booking.patientAddress}</Text>

				<TouchableOpacity style={styles.navigateBtn} onPress={handleNavigateOnMap} activeOpacity={0.8}>
					<Ionicons name="navigate-circle-outline" size={20} color="#2B6F71" style={styles.navigateIcon} />
					<Text style={styles.navigateBtnText}>Open in Google/Apple Maps</Text>
				</TouchableOpacity>
			</View>

			{/* CTA Action button */}
			{booking.status === 'assigned' && (
				<TouchableOpacity style={styles.startBtn} onPress={handleStartService} activeOpacity={0.85}>
					<Text style={styles.startBtnText}>Start Service Visit</Text>
					<Ionicons name="arrow-forward" size={20} color="#FFFFFF" style={styles.arrowIcon} />
				</TouchableOpacity>
			)}
		</ScrollView>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#F8FAFC',
	},
	content: {
		padding: 16,
		paddingBottom: 40,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#F8FAFC',
	},
	errorContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#F8FAFC',
		padding: 24,
	},
	errorText: {
		fontSize: 15,
		color: '#EF4444',
		fontWeight: '600',
		textAlign: 'center',
	},
	sectionHeader: {
		fontSize: 14,
		fontWeight: '800',
		color: '#64748B',
		textTransform: 'uppercase',
		letterSpacing: 0.8,
		marginBottom: 8,
		marginTop: 6,
	},
	addressCard: {
		backgroundColor: '#FFFFFF',
		borderRadius: 16,
		padding: 16,
		borderWidth: 1,
		borderColor: '#E6EDF2',
		shadowColor: '#12373E',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.04,
		shadowRadius: 8,
		elevation: 2,
		marginBottom: 24,
	},
	addressHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 8,
	},
	addressLabel: {
		fontSize: 14,
		fontWeight: '700',
		color: '#16324A',
		marginLeft: 6,
	},
	addressText: {
		fontSize: 13,
		color: '#587087',
		lineHeight: 18,
		marginBottom: 16,
	},
	navigateBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#F0F9F9',
		borderRadius: 12,
		paddingVertical: 12,
		borderWidth: 1,
		borderColor: '#C7E7E8',
	},
	navigateIcon: {
		marginRight: 6,
	},
	navigateBtnText: {
		fontSize: 13,
		fontWeight: '700',
		color: '#2B6F71',
	},
	startBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#2B6F71',
		borderRadius: 14,
		paddingVertical: 16,
		shadowColor: '#2B6F71',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.2,
		shadowRadius: 8,
		elevation: 4,
	},
	startBtnText: {
		fontSize: 16,
		fontWeight: '700',
		color: '#FFFFFF',
	},
	arrowIcon: {
		marginLeft: 8,
	},
})
