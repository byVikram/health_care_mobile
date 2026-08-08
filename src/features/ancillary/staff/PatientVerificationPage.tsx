import React, { useEffect, useState } from 'react'
import {
	ActivityIndicator,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation, useRoute } from '@react-navigation/native'
import { MOCK_NURSE_BOOKINGS, NurseBooking, getBookingState, saveBookingState } from '../ancillaryService'
import { ROUTES } from '../../../navigation/routes'
import OtpPinInput from '../components/OtpPinInput'
import ServiceTimeline from '../components/ServiceTimeline'

export default function PatientVerificationPage() {
	const navigation = useNavigation<any>()
	const route = useRoute<any>()
	const { bookingId } = route.params || {}

	const [booking, setBooking] = useState<NurseBooking | null>(null)
	const [loading, setLoading] = useState(true)
	const [pin, setPin] = useState('')
	const [error, setError] = useState('')
	const [verifying, setVerifying] = useState(false)

	useEffect(() => {
		const found = MOCK_NURSE_BOOKINGS.find((b) => b.id === bookingId)
		if (found) {
			setBooking(found)
		}
		setLoading(false)
	}, [bookingId])

	const handleVerify = async () => {
		if (!booking) return
		setError('')

		if (pin.length < 4) {
			setError('Please enter the complete 4-digit verification code.')
			return
		}

		setVerifying(true)
		// Simulating API validation
		setTimeout(async () => {
			if (pin === booking.otpCode) {
				// Initialize the active care session in progress
				const now = new Date().toISOString()
				const initialState = {
					status: 'in_progress' as const,
					startServiceTime: now,
					checklist: {
						'Patient assessment': false,
						'Equipment preparation': false,
						'Procedure completed': false,
						'Patient instructions provided': false,
					},
					notes: '',
					uploadedImages: [],
				}

				await saveBookingState(booking.id, initialState)
				setVerifying(false)

				// Navigate to service in progress
				navigation.replace(ROUTES.STACK.NURSE_SERVICE_IN_PROGRESS, { bookingId: booking.id })
			} else {
				setVerifying(false)
				setError('Invalid verification PIN. Please verify with the patient and try again.')
				setPin('')
			}
		}, 600)
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
		<KeyboardAvoidingView
			style={styles.keyboardView}
			behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
		>
			<ScrollView style={styles.container} contentContainerStyle={styles.content}>
				<ServiceTimeline currentStatus="verification_pending" />

				<View style={styles.header}>
					<View style={styles.iconCircle}>
						<Ionicons name="shield-checkmark" size={32} color="#2B6F71" />
					</View>
					<Text style={styles.title}>Patient Identity Verification</Text>
					<Text style={styles.desc}>
						Ask the patient <Text style={styles.bold}>{booking.patientName}</Text> for the 4-digit verification code sent to their mobile device to initiate service.
					</Text>
				</View>

				<View style={styles.inputContainer}>
					<OtpPinInput value={pin} onChangeValue={(val) => {
						setPin(val)
						if (error) setError('')
					}} />

					{error !== '' && (
						<View style={styles.errorAlert}>
							<Ionicons name="alert-circle" size={16} color="#EF4444" style={styles.errorIcon} />
							<Text style={styles.errorAlertText}>{error}</Text>
						</View>
					)}
				</View>

				<TouchableOpacity
					style={[styles.verifyBtn, verifying && styles.verifyBtnDisabled]}
					onPress={handleVerify}
					disabled={verifying}
					activeOpacity={0.85}
				>
					{verifying ? (
						<ActivityIndicator size="small" color="#FFFFFF" />
					) : (
						<>
							<Text style={styles.verifyBtnText}>Verify & Start Care</Text>
							<Ionicons name="play" size={18} color="#FFFFFF" style={styles.playIcon} />
						</>
					)}
				</TouchableOpacity>

				<TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()} disabled={verifying}>
					<Text style={styles.cancelBtnText}>Back to Booking</Text>
				</TouchableOpacity>
			</ScrollView>
		</KeyboardAvoidingView>
	)
}

const styles = StyleSheet.create({
	keyboardView: {
		flex: 1,
		backgroundColor: '#F8FAFC',
	},
	container: {
		flex: 1,
	},
	content: {
		padding: 16,
		paddingBottom: 40,
		justifyContent: 'center',
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
	header: {
		alignItems: 'center',
		marginVertical: 24,
	},
	iconCircle: {
		width: 68,
		height: 68,
		borderRadius: 34,
		backgroundColor: '#EAF6F6',
		justifyContent: 'center',
		alignItems: 'center',
		marginBottom: 16,
	},
	title: {
		fontSize: 18,
		fontWeight: '700',
		color: '#16324A',
		marginBottom: 8,
		textAlign: 'center',
	},
	desc: {
		fontSize: 13,
		color: '#587087',
		textAlign: 'center',
		lineHeight: 18,
		paddingHorizontal: 12,
	},
	bold: {
		fontWeight: '700',
		color: '#16324A',
	},
	inputContainer: {
		marginBottom: 32,
	},
	errorAlert: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: 12,
		paddingHorizontal: 16,
	},
	errorIcon: {
		marginRight: 6,
	},
	errorAlertText: {
		fontSize: 12,
		color: '#EF4444',
		fontWeight: '600',
		textAlign: 'center',
	},
	verifyBtn: {
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
	verifyBtnDisabled: {
		opacity: 0.8,
	},
	verifyBtnText: {
		fontSize: 16,
		fontWeight: '700',
		color: '#FFFFFF',
	},
	playIcon: {
		marginLeft: 8,
	},
	cancelBtn: {
		alignItems: 'center',
		marginTop: 16,
		paddingVertical: 12,
	},
	cancelBtnText: {
		fontSize: 14,
		fontWeight: '700',
		color: '#64748B',
	},
})
