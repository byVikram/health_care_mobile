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
import { MOCK_NURSE_BOOKINGS, NurseBooking, NurseBookingState, getBookingState, clearBookingState } from '../ancillaryService'
import { ROUTES } from '../../../navigation/routes'
import OtpPinInput from '../components/OtpPinInput'
import ServiceTimeline from '../components/ServiceTimeline'
import StatusModal from '../../../components/common/StatusModal'

export default function CompleteServicePage() {
	const navigation = useNavigation<any>()
	const route = useRoute<any>()
	const { bookingId, elapsedSeconds } = route.params || {}

	const [booking, setBooking] = useState<NurseBooking | null>(null)
	const [sessionState, setSessionState] = useState<NurseBookingState | null>(null)
	const [loading, setLoading] = useState(true)

	// Verification complete PIN
	const [pin, setPin] = useState('')
	const [error, setError] = useState('')
	const [submitting, setSubmitting] = useState(false)

	// StatusModal completion popup
	const [successModalVisible, setSuccessModalVisible] = useState(false)

	useEffect(() => {
		const loadData = async () => {
			const found = MOCK_NURSE_BOOKINGS.find((b) => b.id === bookingId)
			if (found) {
				setBooking(found)
				const state = await getBookingState(found.id)
				if (state) setSessionState(state)
			}
			setLoading(false)
		}
		void loadData()
	}, [bookingId])

	const formatDuration = (totalSeconds: number) => {
		const hrs = Math.floor(totalSeconds / 3600)
		const mins = Math.floor((totalSeconds % 3600) / 60)
		const secs = totalSeconds % 60

		const parts: string[] = []
		if (hrs > 0) parts.push(`${hrs} hr${hrs > 1 ? 's' : ''}`)
		if (mins > 0) parts.push(`${mins} min${mins > 1 ? 's' : ''}`)
		if (secs > 0 || parts.length === 0) parts.push(`${secs} sec${secs > 1 ? 's' : ''}`)

		return parts.join(' ')
	}

	const handleConfirmCompletion = async () => {
		if (!booking) return
		setError('')

		if (pin.length < 4) {
			setError('Please enter the complete 4-digit verification code.')
			return
		}

		setSubmitting(true)
		setTimeout(async () => {
			if (pin === booking.completePin) {
				// Mark booking as completed in mock memory status
				const foundIndex = MOCK_NURSE_BOOKINGS.findIndex((b) => b.id === bookingId)
				if (foundIndex !== -1) {
					MOCK_NURSE_BOOKINGS[foundIndex].status = 'completed'
				}

				// Clear AsyncStorage cached state for this booking session
				await clearBookingState(booking.id)
				setSubmitting(false)
				setSuccessModalVisible(true)
			} else {
				setSubmitting(false)
				setError('Invalid completion PIN. Please check code with the patient and try again.')
				setPin('')
			}
		}, 800)
	}

	const handleSuccessModalSubmit = () => {
		setSuccessModalVisible(false)
		// Reset routing back to the dashboard/appointments list
		navigation.reset({
			index: 0,
			routes: [{ name: ROUTES.MAIN.TABS }],
		})
	}

	if (loading) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size="large" color="#2B6F71" />
			</View>
		)
	}

	if (!booking || !sessionState) {
		return (
			<View style={styles.errorContainer}>
				<Text style={styles.errorText}>Booking session details not found.</Text>
			</View>
		)
	}

	const completedProcedures = Object.keys(sessionState.checklist).filter(
		(key) => !!sessionState.checklist[key]
	)

	return (
		<KeyboardAvoidingView
			style={styles.keyboardView}
			behavior={Platform.OS === 'ios' ? 'padding' : undefined}
		>
			<ScrollView style={styles.container} contentContainerStyle={styles.content}>
				<ServiceTimeline currentStatus="completed" />

				<View style={styles.summaryCard}>
					<View style={styles.cardHeader}>
						<Ionicons name="ribbon-outline" size={24} color="#10B981" />
						<Text style={styles.cardTitle}>Visit Summary</Text>
					</View>

					<View style={styles.summaryRow}>
						<Text style={styles.summaryLabel}>Patient</Text>
						<Text style={styles.summaryVal}>{booking.patientName}</Text>
					</View>
					<View style={styles.summaryRow}>
						<Text style={styles.summaryLabel}>Total Duration</Text>
						<Text style={styles.summaryVal}>{formatDuration(elapsedSeconds || 0)}</Text>
					</View>

					<Text style={styles.proceduresHeader}>Completed Procedures</Text>
					<View style={styles.proceduresList}>
						{completedProcedures.map((item, index) => (
							<View key={index} style={styles.procedureItem}>
								<Ionicons name="checkmark-circle" size={16} color="#10B981" style={styles.checkIcon} />
								<Text style={styles.procedureText}>{item}</Text>
							</View>
						))}
					</View>
				</View>

				{/* Patient complete validation form */}
				<View style={styles.pinSection}>
					<View style={styles.iconCircle}>
						<Ionicons name="keypad" size={28} color="#2B6F71" />
					</View>
					<Text style={styles.pinTitle}>Patient Completion PIN</Text>
					<Text style={styles.pinDesc}>
						Ask the patient to input their 4-digit verification code to confirm the service visit has been completed successfully.
					</Text>

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
					style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
					onPress={handleConfirmCompletion}
					disabled={submitting}
					activeOpacity={0.85}
				>
					{submitting ? (
						<ActivityIndicator size="small" color="#FFFFFF" />
					) : (
						<>
							<Text style={styles.submitBtnText}>Complete Visit</Text>
							<Ionicons name="checkmark-done" size={20} color="#FFFFFF" style={styles.arrowIcon} />
						</>
					)}
				</TouchableOpacity>

				<TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} disabled={submitting}>
					<Text style={styles.backBtnText}>Resume Care Screen</Text>
				</TouchableOpacity>

				{/* Complete Modal Success trigger */}
				<StatusModal
					visible={successModalVisible}
					status="success"
					title="Appointment Completed"
					description="You have successfully verified and completed the clinical service visit. Details have been logged in the patient medical history chart."
					submitText="Back to Visits"
					onSubmit={handleSuccessModalSubmit}
				/>
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
	summaryCard: {
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
		marginBottom: 20,
	},
	cardHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 16,
		paddingBottom: 10,
		borderBottomWidth: 1,
		borderBottomColor: '#F1F5F9',
	},
	cardTitle: {
		fontSize: 15,
		fontWeight: '700',
		color: '#16324A',
		marginLeft: 8,
	},
	summaryRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingVertical: 6,
	},
	summaryLabel: {
		fontSize: 13,
		color: '#64748B',
		fontWeight: '500',
	},
	summaryVal: {
		fontSize: 13,
		color: '#1E293B',
		fontWeight: '700',
	},
	proceduresHeader: {
		fontSize: 13,
		fontWeight: '700',
		color: '#16324A',
		marginTop: 16,
		marginBottom: 8,
	},
	proceduresList: {
		gap: 6,
	},
	procedureItem: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	checkIcon: {
		marginRight: 6,
	},
	procedureText: {
		fontSize: 13,
		color: '#475569',
		fontWeight: '500',
	},
	pinSection: {
		alignItems: 'center',
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
	iconCircle: {
		width: 56,
		height: 56,
		borderRadius: 28,
		backgroundColor: '#EAF6F6',
		justifyContent: 'center',
		alignItems: 'center',
		marginBottom: 12,
	},
	pinTitle: {
		fontSize: 15,
		fontWeight: '700',
		color: '#16324A',
		marginBottom: 6,
		textAlign: 'center',
	},
	pinDesc: {
		fontSize: 12,
		color: '#64748B',
		textAlign: 'center',
		lineHeight: 16,
		marginBottom: 10,
		paddingHorizontal: 8,
	},
	errorAlert: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: 8,
	},
	errorIcon: {
		marginRight: 4,
	},
	errorAlertText: {
		fontSize: 12,
		color: '#EF4444',
		fontWeight: '600',
	},
	submitBtn: {
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
	submitBtnDisabled: {
		opacity: 0.8,
	},
	submitBtnText: {
		fontSize: 16,
		fontWeight: '700',
		color: '#FFFFFF',
	},
	arrowIcon: {
		marginLeft: 8,
	},
	backBtn: {
		alignItems: 'center',
		marginTop: 16,
		paddingVertical: 12,
	},
	backBtnText: {
		fontSize: 14,
		fontWeight: '700',
		color: '#64748B',
	},
})
