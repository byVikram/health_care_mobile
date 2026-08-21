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
import { MOCK_NURSE_BOOKINGS, NurseBooking, getBookingState, updateNurseStatusBackend } from '../ancillaryService'
import { ROUTES } from '../../../navigation/routes'
import PatientInformationCard from '../components/PatientInformationCard'
import AppointmentSummary from '../components/AppointmentSummary'
import ServiceTimeline from '../components/ServiceTimeline'

import ApiService from '../../../services/apiService'
import { API_ENDPOINTS } from '../../../constants/apiUrls'

export default function ActiveBookingPage() {
	const navigation = useNavigation<any>()
	const route = useRoute<any>()
	const { bookingId } = route.params || {}

	const [booking, setBooking] = useState<NurseBooking | null>(null)
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		const loadData = async () => {
			try {
				if (bookingId) {
					const res = await ApiService.get<any>(API_ENDPOINTS.ANCILLARY.REQUEST_STATUS(bookingId))
					const apiData = res.data?.data || res.data
					if (apiData) {
						setBooking({
							id: apiData.requestId || bookingId,
							patientName: apiData.assignedProvider?.name ? `Patient (${apiData.assignedProvider.name})` : 'Patient Eleanor V.',
							patientAge: 68,
							patientGender: 'Female',
							patientPhone: '+91 98765 43210',
							serviceName: apiData.serviceName || 'In-Home Nursing Care Procedure',
							serviceDescription: apiData.procedureDetails || 'Aseptic Dressing & Vitals Check',
							appointmentDate: 'Today',
							appointmentTime: 'Immediate Dispatch',
							patientAddress: apiData.streetAddress || '42 Healthcare Avenue, Flat 3B, Sector 18, New Delhi',
							status: apiData.status || 'assigned',
							otpCode: apiData.verificationOtp || '4829',
							completePin: apiData.completionPin || '9182',
						})
						setLoading(false)
						return
					}
				}
			} catch (e) {
				console.log('[ActiveBookingPage] Fetching live status from backend, applying fallback')
			}

			const found = MOCK_NURSE_BOOKINGS.find((b) => b.id === bookingId)
			if (found) {
				const state = await getBookingState(found.id)
				setBooking({
					...found,
					status: state ? state.status : found.status,
				})
			} else {
				const state = bookingId ? await getBookingState(bookingId) : null
				setBooking({
					id: bookingId || 'BK-LIVE-101',
					patientName: 'Patient Eleanor V.',
					patientAge: 68,
					patientGender: 'Female',
					patientPhone: '+91 98765 43210',
					serviceName: 'In-Home Nursing Care Procedure',
					serviceDescription: 'Aseptic Dressing & Vitals Check',
					appointmentDate: 'Today',
					appointmentTime: 'Immediate Dispatch',
					patientAddress: '42 Healthcare Avenue, Flat 3B, Sector 18, New Delhi',
					status: state ? state.status : 'assigned',
					otpCode: '4829',
					completePin: '9182',
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

	const handleStartTraveling = async () => {
		if (!booking) return
		try {
			await updateNurseStatusBackend(booking.id, 'EN_ROUTE', 12)
			setBooking((prev) => (prev ? { ...prev, status: 'EN_ROUTE' } : null))
			Alert.alert('Status Updated', 'You are now marked as En-Route. Patient has been notified of your estimated arrival in 12 mins.')
		} catch (e) {
			console.log('Error updating travel status')
		}
	}

	const handleArrived = async () => {
		if (!booking) return
		try {
			await updateNurseStatusBackend(booking.id, 'ARRIVED', 0)
			setBooking((prev) => (prev ? { ...prev, status: 'ARRIVED' } : null))
			navigation.navigate(ROUTES.STACK.NURSE_PATIENT_VERIFICATION, { bookingId: booking.id })
		} catch (e) {
			navigation.navigate(ROUTES.STACK.NURSE_PATIENT_VERIFICATION, { bookingId: booking.id })
		}
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
			<Text style={styles.sectionHeader}>Patient Address & GPS Navigation</Text>
			<View style={styles.addressCard}>
				<View style={styles.addressHeader}>
					<Ionicons name="location-sharp" size={20} color="#2B6F71" />
					<Text style={styles.addressLabel}>Home Address</Text>
				</View>
				<Text style={styles.addressText}>{booking.patientAddress}</Text>

				<TouchableOpacity style={styles.navigateBtn} onPress={handleNavigateOnMap} activeOpacity={0.8}>
					<Ionicons name="navigate-circle" size={22} color="#FFFFFF" style={styles.navigateIcon} />
					<Text style={styles.navigateBtnText}>Open Turn-by-Turn Map Navigation</Text>
				</TouchableOpacity>
			</View>

			{/* Action Status Controls for Nurse */}
			<View style={styles.actionButtonGroup}>
				{booking.status === 'assigned' && (
					<TouchableOpacity style={[styles.startBtn, { backgroundColor: '#0284C7' }]} onPress={handleStartTraveling} activeOpacity={0.85}>
						<Ionicons name="car-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
						<Text style={styles.startBtnText}>Start Traveling (Notify Patient ETA ~12m)</Text>
					</TouchableOpacity>
				)}

				<TouchableOpacity style={styles.startBtn} onPress={handleArrived} activeOpacity={0.85}>
					<Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
					<Text style={styles.startBtnText}>I Have Arrived at Doorstep (Verify OTP)</Text>
					<Ionicons name="arrow-forward" size={20} color="#FFFFFF" style={styles.arrowIcon} />
				</TouchableOpacity>
			</View>
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
		backgroundColor: '#0C7C7C',
		borderRadius: 12,
		paddingVertical: 12,
		paddingHorizontal: 16,
		borderWidth: 1,
		borderColor: '#0A6B6B',
	},
	navigateIcon: {
		marginRight: 8,
	},
	navigateBtnText: {
		fontSize: 13.5,
		fontWeight: '700',
		color: '#FFFFFF',
	},
	actionButtonGroup: {
		gap: 12,
		marginTop: 8,
	},
	startBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#0C7C7C',
		borderRadius: 14,
		paddingVertical: 15,
		paddingHorizontal: 20,
		shadowColor: '#0C7C7C',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.25,
		shadowRadius: 10,
		elevation: 4,
	},
	startBtnText: {
		fontSize: 15,
		fontWeight: '700',
		color: '#FFFFFF',
	},
	arrowIcon: {
		marginLeft: 8,
	},
})
