import React, { useEffect, useState } from 'react'
import {
	ActivityIndicator,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	StyleSheet,
	View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation, useRoute } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { MOCK_NURSE_BOOKINGS, NurseBooking, NurseBookingState, getBookingState, clearBookingState } from '../ancillaryService'
import { ROUTES } from '../../../navigation/routes'
import OtpPinInput from '../components/OtpPinInput'
import ServiceTimeline from '../components/ServiceTimeline'
import StatusModal from '../../../components/common/StatusModal'
import AppScreenHeader from '../../../components/common/AppScreenHeader'
import { AppTypography } from '../../../components/common/AppTypography'
import { AppButton } from '../../../components/common/AppButton'

import ApiService from '../../../services/apiService'
import { API_ENDPOINTS } from '../../../constants/apiUrls'

export default function CompleteServicePage() {
	const navigation = useNavigation<any>()
	const route = useRoute<any>()
	const insets = useSafeAreaInsets()
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
			let apiPatientData: any = null
			try {
				if (bookingId) {
					const res = await ApiService.get<any>(API_ENDPOINTS.ANCILLARY.REQUEST_STATUS(bookingId))
					apiPatientData = res.data?.data || res.data
				}
			} catch (e) {
				console.log('[CompleteServicePage] Live status notice')
			}

			const found = MOCK_NURSE_BOOKINGS.find((b) => b.id === bookingId)
			const pName = apiPatientData?.patientName || apiPatientData?.patient_name || apiPatientData?.patientUser?.name || apiPatientData?.patient?.name || (found ? found.patientName : 'Eleanor Vance')
			const pAge = apiPatientData?.patientAge || apiPatientData?.patient_age || apiPatientData?.age || (found ? found.patientAge : 68)
			const pGender = apiPatientData?.patientGender || apiPatientData?.patient_gender || apiPatientData?.gender || (found ? found.patientGender : 'Female')
			const pPhone = apiPatientData?.patientPhone || apiPatientData?.patient_phone || apiPatientData?.phone || (found ? found.patientPhone : '+91 98765 43210')
			const pAvatar = apiPatientData?.patientAvatar || apiPatientData?.patient_avatar || apiPatientData?.patient?.avatar || (found ? found.patientAvatar : undefined)
			const sName = apiPatientData?.serviceName || apiPatientData?.service_name || apiPatientData?.procedure?.label || (found ? found.serviceName : 'Wound Dressing & Sterile Care')
			const sDesc = apiPatientData?.procedureDetails || apiPatientData?.procedure_details || apiPatientData?.serviceDescription || (found ? found.serviceDescription : 'Sterile dressing, cleansing & vitals monitoring')

			const activeBooking: NurseBooking = {
				id: apiPatientData?.requestId || apiPatientData?.id || bookingId || 'BK-LIVE-101',
				patientName: pName,
				patientAge: pAge,
				patientGender: pGender,
				patientPhone: pPhone,
				patientAvatar: pAvatar,
				serviceName: sName,
				serviceDescription: sDesc,
				appointmentDate: apiPatientData?.appointmentDate || (found ? found.appointmentDate : 'Today'),
				appointmentTime: apiPatientData?.appointmentTime || (found ? found.appointmentTime : 'Completed'),
				patientAddress: apiPatientData?.streetAddress || apiPatientData?.street_address || apiPatientData?.patientAddress || (found ? found.patientAddress : '42 Healthcare Avenue, Flat 3B, Sector 18, New Delhi'),
				status: 'in_progress',
				otpCode: apiPatientData?.verificationOtp || apiPatientData?.otp || '4829',
				completePin: apiPatientData?.completionPin || apiPatientData?.pin || '9182',
			}

			setBooking(activeBooking)
			const state = await getBookingState(activeBooking.id)
			setSessionState(state || {
				status: 'in_progress',
				startServiceTime: new Date().toISOString(),
				checklist: {},
				notes: '',
				uploadedImages: [],
			})
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
			<View style={styles.errorContainer}>
				<AppTypography variant="body" style={styles.errorText}>
					No active service session found.
				</AppTypography>
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
				</View>
			</ScrollView>

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
	completeBtn: {
		backgroundColor: '#2B6F71',
		borderRadius: 12,
	},
})
