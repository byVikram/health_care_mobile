import React, { useEffect, useState } from 'react'
import {
	ActivityIndicator,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	StyleSheet,
	View,
} from 'react-native'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useNavigation, useRoute } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { MOCK_NURSE_BOOKINGS, NurseBooking, NurseBookingState, getBookingState, clearBookingState } from '../ancillaryService'
import { ROUTES } from '../../../navigation/routes'
import OtpPinInput from '../components/OtpPinInput'
import ServiceTimeline from '../components/ServiceTimeline'
import StatusModal from '../../../components/common/StatusModal'
import CancelVisitModal from '../components/CancelVisitModal'
import AppScreenHeader from '../../../components/common/AppScreenHeader'
import { AppTypography } from '../../../components/common/AppTypography'
import { AppButton } from '../../../components/common/AppButton'

import ApiService from '../../../services/apiService'
import { API_ENDPOINTS } from '../../../constants/apiUrls'

export default function CompleteServicePage() {
	const navigation = useNavigation<any>()
	const route = useRoute<any>()
	const insets = useSafeAreaInsets()
	const { bookingId, initialBooking, elapsedSeconds } = route.params || {}

	const [booking, setBooking] = useState<NurseBooking | null>(() => {
		if (
			initialBooking &&
			initialBooking.patientName &&
			typeof initialBooking.patientName === 'string' &&
			initialBooking.patientName.trim() !== '' &&
			!['Eleanor Vance', 'Patient Account Holder', 'John Doe', 'Patient Recipient', 'Patient'].includes(initialBooking.patientName.trim())
		) {
			return initialBooking
		}
		return null
	})
	const [sessionState, setSessionState] = useState<NurseBookingState | null>(null)
	const [loading, setLoading] = useState(true)

	// Verification complete PIN
	const [pin, setPin] = useState('')
	const [error, setError] = useState('')
	const [submitting, setSubmitting] = useState(false)

	// StatusModal completion popup
	const [successModalVisible, setSuccessModalVisible] = useState(false)
	const [cancelModalVisible, setCancelModalVisible] = useState(false)

	const loadData = async () => {
		if (!booking) setLoading(true)
		let apiPatientData: any = null
		try {
			if (bookingId) {
				const res = await ApiService.get<any>(API_ENDPOINTS.ANCILLARY.REQUEST_STATUS(bookingId))
				apiPatientData = res.data?.data || res.data
			}
		} catch (e) {
			console.log('[CompleteServicePage] Live status notice', e)
		}

		const pName =
			apiPatientData?.patientFullName ||
			apiPatientData?.patientName ||
			apiPatientData?.patient_name ||
			apiPatientData?.patientUser?.name ||
			apiPatientData?.patient?.name ||
			initialBooking?.patientName

		if (pName && typeof pName === 'string' && pName.trim() !== '' && !['Eleanor Vance', 'Patient Account Holder', 'John Doe', 'Patient Recipient', 'Patient'].includes(pName.trim())) {
			const activeBooking: NurseBooking = {
				id: apiPatientData?.requestId || apiPatientData?.id || initialBooking?.id || bookingId,
				patientName: pName,
				patientAge: apiPatientData?.patientAge || apiPatientData?.patient_age || apiPatientData?.age || initialBooking?.patientAge || 0,
				patientGender: apiPatientData?.patientGender || apiPatientData?.patient_gender || apiPatientData?.gender || initialBooking?.patientGender || 'Not Specified',
				patientPhone: apiPatientData?.patientPhone || apiPatientData?.patient_phone || apiPatientData?.phone || initialBooking?.patientPhone || '',
				patientAvatar: apiPatientData?.patientAvatar || apiPatientData?.patient_avatar || apiPatientData?.patient?.avatar || initialBooking?.patientAvatar || undefined,
				serviceName: apiPatientData?.serviceName || apiPatientData?.service_name || apiPatientData?.procedure?.label || initialBooking?.serviceName || 'General Nursing Care',
				serviceDescription: apiPatientData?.procedureDetails || apiPatientData?.procedure_details || apiPatientData?.serviceDescription || initialBooking?.serviceDescription || 'Doorstep clinical care',
				appointmentDate: apiPatientData?.appointmentDate || initialBooking?.appointmentDate || 'Today',
				appointmentTime: apiPatientData?.appointmentTime || initialBooking?.appointmentTime || 'Completed',
				patientAddress: apiPatientData?.streetAddress || apiPatientData?.street_address || apiPatientData?.patientAddress || initialBooking?.patientAddress || 'Address on file',
				status: 'in_progress',
				otpCode: apiPatientData?.verificationOtp || apiPatientData?.otp || initialBooking?.otpCode || '',
				completePin: apiPatientData?.completionPin || apiPatientData?.pin || initialBooking?.completePin || '',
			}

			setBooking(activeBooking)
			const state = await getBookingState(activeBooking.id)
			const now = new Date().toISOString()
			setSessionState(state || {
				status: 'in_progress',
				startServiceTime: now,
				checklist: {},
				notes: '',
				uploadedImages: [],
			})
			setLoading(false)
			return
		}

		if (!initialBooking || !initialBooking.patientName) {
			setBooking(null)
			setSessionState(null)
		}
		setLoading(false)
	}

	useEffect(() => {
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
		try {
			await ApiService.post(API_ENDPOINTS.ANCILLARY.COMPLETE_SERVICE(booking.id), { pin })
			const foundIndex = MOCK_NURSE_BOOKINGS.findIndex((b) => b.id === bookingId)
			if (foundIndex !== -1) {
				MOCK_NURSE_BOOKINGS[foundIndex].status = 'completed'
			}
			await clearBookingState(booking.id)
			setSubmitting(false)
			setSuccessModalVisible(true)
		} catch (err: any) {
			// Never mark the visit complete locally on a caught error -- a wrong
			// PIN must actually fail, or completion verification is pointless.
			setSubmitting(false)
			const backendMessage = err?.response?.data?.detail?.message
			setError(backendMessage || 'Invalid completion PIN. Please check code with the patient and try again.')
			setPin('')
		}
	}

	const handleSuccessModalSubmit = () => {
		setSuccessModalVisible(false)
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
			<View style={styles.container}>
				<AppScreenHeader title="Complete Care Visit" />
				<View style={styles.errorContainer}>
					<MaterialCommunityIcons name="account-alert-outline" size={54} color="#D9534F" style={{ marginBottom: 14 }} />
					<AppTypography variant="h3" style={{ color: '#1B2A32', fontWeight: '700', marginBottom: 8, textAlign: 'center' }}>
						Unable to Load Patient Information
					</AppTypography>
					<AppTypography variant="body" style={styles.errorText}>
						We couldn't retrieve the patient details for this booking. Please try again.
					</AppTypography>
					<View style={{ flexDirection: 'row', gap: 12, marginTop: 24, width: '100%', justifyContent: 'center' }}>
						<AppButton variant="primary" onPress={() => loadData()} style={{ minWidth: 120 }}>Try Again</AppButton>
						<AppButton variant="outline" onPress={() => navigation.goBack()} style={{ minWidth: 120 }}>Go Back</AppButton>
					</View>
				</View>
			</View>
		)
	}

	return (
		<KeyboardAvoidingView
			style={styles.container}
			behavior={Platform.OS === 'ios' ? 'padding' : undefined}
		>
			<AppScreenHeader title="Complete Care Visit" />

			<ScrollView
				contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
				showsVerticalScrollIndicator={false}
			>
				{/* 1. TIMELINE & SUMMARY BLOCK */}
				<View style={styles.sectionBlock}>
					<ServiceTimeline currentStatus="completed" />

					<View style={styles.summaryBar}>
						<View style={styles.summaryCol}>
							<AppTypography variant="caption" style={styles.summaryLabel}>
								TOTAL VISIT DURATION
							</AppTypography>
							<AppTypography variant="h3" style={styles.summaryValue}>
								{formatDuration(elapsedSeconds || 1800)}
							</AppTypography>
						</View>
					</View>
				</View>

				{/* 8px GREY SECTION DIVIDER BAR */}
				<View style={styles.sectionDividerBar} />

				{/* 2. COMPLETION PIN INSTRUCTIONS BLOCK (CARD-FREE) */}
				<View style={styles.sectionBlock}>
					<View style={styles.instructionRow}>
						<View style={styles.iconCircle}>
							<Ionicons name="checkmark-circle" size={24} color="#059669" />
						</View>
						<View style={styles.instructionCol}>
							<AppTypography variant="h3" style={styles.sectionHeading}>
								Enter Completion PIN
							</AppTypography>
							<AppTypography variant="caption" style={styles.descText}>
								Ask patient <AppTypography variant="caption" style={styles.boldText}>{booking.patientName}</AppTypography> for the 4-digit completion PIN to finalize visit records.
							</AppTypography>
						</View>
					</View>

					{/* 4-DIGIT PIN INPUT */}
					<View style={styles.inputBox}>
						<OtpPinInput
							value={pin}
							onChangeValue={(val) => {
								setPin(val)
								if (error) setError('')
							}}
						/>

						{error !== '' && (
							<View style={styles.errorAlert}>
								<Ionicons name="alert-circle" size={16} color="#EF4444" />
								<AppTypography variant="caption" style={styles.errorAlertText}>
									{error}
								</AppTypography>
							</View>
						)}
					</View>
				</View>

				{/* 8px GREY SECTION DIVIDER BAR */}
				<View style={styles.sectionDividerBar} />

				{/* 3. ACTION BUTTON BLOCK */}
				<View style={styles.sectionBlock}>
					<AppButton
						variant="primary"
						onPress={handleConfirmCompletion}
						loading={submitting}
						style={styles.completeBtn}
					>
						Finalize & Submit Care Record
					</AppButton>

					<AppButton
						variant="outline"
						onPress={() => setCancelModalVisible(true)}
						style={styles.cancelBtn}
					>
						Cancel Visit
					</AppButton>
				</View>
			</ScrollView>

						{booking && (
				<CancelVisitModal
					visible={cancelModalVisible}
					bookingId={booking.id}
					patientName={booking.patientName}
					onClose={() => setCancelModalVisible(false)}
					onCancelled={() => {
						setCancelModalVisible(false)
						navigation.reset({
							index: 0,
							routes: [{ name: ROUTES.MAIN.TABS }],
						})
					}}
				/>
			)}
			{/* SUCCESS POPUP MODAL */}
			<StatusModal
				visible={successModalVisible}
				status="success"
				title="Care Visit Completed!"
				description={`Healthcare procedure for ${booking.patientName} has been successfully completed and recorded.`}
				submitText="Return to Dashboard"
				onSubmit={handleSuccessModalSubmit}
			/>
		</KeyboardAvoidingView>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#FFFFFF',
	},
	scrollContent: {
		paddingHorizontal: 0,
		paddingTop: 12,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#FFFFFF',
	},
	errorContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#FFFFFF',
		padding: 24,
	},
	errorText: {
		fontSize: 15,
		color: '#EF4444',
		fontWeight: '600',
	},

	/* SECTION BLOCK & DIVIDERS */
	sectionBlock: {
		backgroundColor: '#FFFFFF',
		paddingHorizontal: 16,
		paddingVertical: 16,
		gap: 14,
	},
	sectionDividerBar: {
		height: 8,
		backgroundColor: '#F4F6F9',
		borderTopWidth: 1,
		borderBottomWidth: 1,
		borderColor: '#E2E8F0',
	},
	sectionHeading: {
		fontSize: 16.5,
		fontWeight: '700',
		color: '#0F172A',
		letterSpacing: -0.2,
	},

	/* SUMMARY BAR */
	summaryBar: {
		backgroundColor: '#F8FAFC',
		padding: 14,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#E2E8F0',
	},
	summaryCol: {
		gap: 2,
	},
	summaryLabel: {
		fontSize: 10.5,
		fontWeight: '800',
		color: '#64748B',
		letterSpacing: 0.5,
	},
	summaryValue: {
		fontSize: 18,
		fontWeight: '800',
		color: '#0F172A',
	},

	/* INSTRUCTIONS */
	instructionRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		gap: 12,
	},
	iconCircle: {
		width: 44,
		height: 44,
		borderRadius: 22,
		backgroundColor: 'rgba(5, 150, 105, 0.12)',
		alignItems: 'center',
		justifyContent: 'center',
	},
	instructionCol: {
		flex: 1,
		gap: 4,
	},
	descText: {
		fontSize: 13,
		color: '#64748B',
		lineHeight: 18,
	},
	boldText: {
		fontWeight: '700',
		color: '#0F172A',
	},

	/* OTP INPUT */
	inputBox: {
		alignItems: 'center',
		marginTop: 8,
		gap: 12,
	},
	errorAlert: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#FEF2F2',
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 8,
		gap: 6,
	},
	errorAlertText: {
		fontSize: 12,
		color: '#EF4444',
		fontWeight: '600',
	},

	/* ACTION BUTTON */
	cancelBtn: {
		borderColor: '#EF4444',
		borderRadius: 12,
		marginTop: 10,
	},
	completeBtn: {
		backgroundColor: '#2B6F71',
		borderRadius: 12,
	},
})
