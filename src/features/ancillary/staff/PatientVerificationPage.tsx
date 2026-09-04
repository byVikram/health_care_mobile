import React, { useEffect, useState } from 'react'
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useNavigation, useRoute } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { MOCK_NURSE_BOOKINGS, NurseBooking, saveBookingState, verifyPatientOtp } from '../ancillaryService'
import { ROUTES } from '../../../navigation/routes'
import OtpPinInput from '../components/OtpPinInput'
import ServiceTimeline from '../components/ServiceTimeline'
import AppScreenHeader from '../../../components/common/AppScreenHeader'
import CancelVisitModal from '../components/CancelVisitModal'
import { AppTypography } from '../../../components/common/AppTypography'
import { AppButton } from '../../../components/common/AppButton'
import ApiService from '../../../services/apiService'
import { API_ENDPOINTS } from '../../../constants/apiUrls'

export default function PatientVerificationPage() {
	const navigation = useNavigation<any>()
	const route = useRoute<any>()
	const insets = useSafeAreaInsets()
	const { bookingId } = route.params || {}

	const [booking, setBooking] = useState<NurseBooking | null>(null)
	const [loading, setLoading] = useState(true)
	const [pin, setPin] = useState('')
	const [error, setError] = useState('')
	const [verifying, setVerifying] = useState(false)
	const [cancelModalVisible, setCancelModalVisible] = useState(false)

	const loadData = async () => {
		setLoading(true)
		try {
			if (bookingId) {
				const res = await ApiService.get<any>(API_ENDPOINTS.ANCILLARY.REQUEST_STATUS(bookingId))
				const apiData = res.data?.data || res.data
				if (apiData) {
					const pName =
						apiData.patientName ||
						apiData.patient_name ||
						apiData.patientUser?.name ||
						apiData.patient?.name
					if (
						pName &&
						typeof pName === 'string' &&
						pName.trim() !== '' &&
						![
							'Eleanor Vance',
							'Patient Account Holder',
							'John Doe',
							'Patient Recipient',
							'Patient',
						].includes(pName.trim())
					) {
						setBooking({
							id: apiData.requestId || apiData.id || bookingId,
							patientName: pName,
							patientAge: apiData.patientAge || apiData.patient_age || apiData.age || 0,
							patientGender:
								apiData.patientGender || apiData.patient_gender || apiData.gender || 'Not Specified',
							patientPhone: apiData.patientPhone || apiData.patient_phone || apiData.phone || '',
							patientAvatar:
								apiData.patientAvatar || apiData.patient_avatar || apiData.patient?.avatar || undefined,
							serviceName:
								apiData.serviceName ||
								apiData.service_name ||
								apiData.procedure?.label ||
								'General Nursing Care',
							serviceDescription:
								apiData.procedureDetails ||
								apiData.procedure_details ||
								apiData.serviceDescription ||
								'Doorstep clinical care',
							appointmentDate: apiData.appointmentDate || 'Today',
							appointmentTime: apiData.appointmentTime || 'Immediate Dispatch',
							patientAddress:
								apiData.streetAddress ||
								apiData.street_address ||
								apiData.patientAddress ||
								'Address on file',
							status: apiData.status || 'verification_pending',
							otpCode: apiData.verificationOtp || apiData.otp || '',
							completePin: apiData.completionPin || apiData.pin || '',
						})
						setLoading(false)
						return
					}
				}
			}
		} catch (e) {
			console.log('[PatientVerificationPage] Error fetching status', e)
		}

		setBooking(null)
		setLoading(false)
	}

	useEffect(() => {
		void loadData()
	}, [bookingId])

	const handleVerify = async () => {
		if (!booking) return
		setError('')

		if (pin.length < 4) {
			setError('Please enter the complete 4-digit verification code.')
			return
		}

		setVerifying(true)
		try {
			const res = await verifyPatientOtp(booking.id, pin)
			// Trust only the backend's verification result -- never a locally
			// held/mock OTP value, or entering the code becomes optional.
			if (res.success) {
				const now = new Date().toISOString()
				const initialState = {
					status: 'in_progress' as const,
					startServiceTime: now,
					checklist: {
						'Patient assessment & vitals check': true,
						'Sterile kit preparation': true,
						'Aseptic procedure execution': false,
						'Post-procedure care guidance': false,
					},
					notes: res.clinicalDetails?.clinicalNotes || '',
					uploadedImages: [],
				}

				await saveBookingState(booking.id, initialState)
				setVerifying(false)
				navigation.replace(ROUTES.STACK.NURSE_SERVICE_IN_PROGRESS, { bookingId: booking.id })
			} else {
				setVerifying(false)
				setError(res.message || 'Invalid verification code. Please check with the patient.')
			}
		} catch (err: any) {
			setVerifying(false)
			setError('Failed to verify OTP. Please try again.')
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
				<AppTypography variant="body" style={styles.errorText}>
					Booking details not found.
				</AppTypography>
			</View>
		)
	}

	return (
		<KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
			<AppScreenHeader title="Verify Patient OTP" />

			<ScrollView
				contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
				showsVerticalScrollIndicator={false}
			>
				{/* 1. TIMELINE BLOCK */}
				<View style={styles.sectionBlock}>
					<ServiceTimeline currentStatus="verification_pending" />
				</View>

				{/* 8px GREY SECTION DIVIDER BAR */}
				<View style={styles.sectionDividerBar} />

				{/* 2. VERIFICATION INSTRUCTIONS BLOCK (CARD-FREE) */}
				<View style={styles.sectionBlock}>
					<View style={styles.instructionRow}>
						<View style={styles.iconCircle}>
							<Ionicons name="shield-checkmark" size={24} color="#2B6F71" />
						</View>
						<View style={styles.instructionCol}>
							<AppTypography variant="h3" style={styles.sectionHeading}>
								Patient Identity Verification
							</AppTypography>
							<AppTypography variant="caption" style={styles.descText}>
								Ask patient{' '}
								<AppTypography variant="caption" style={styles.boldText}>
									{booking.patientName}
								</AppTypography>{' '}
								for the 4-digit verification OTP to start the care procedure.
							</AppTypography>
						</View>
					</View>

					{/* 4-DIGIT OTP INPUT */}
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
					<AppButton variant="primary" onPress={handleVerify} loading={verifying} style={styles.verifyBtn}>
						Verify & Start Care Procedure
					</AppButton>
					<AppButton variant="outline" onPress={() => setCancelModalVisible(true)} style={styles.cancelBtn}>
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
		backgroundColor: '#E6F4F4',
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
	verifyBtn: {
		backgroundColor: '#2B6F71',
		borderRadius: 12,
	},
})
