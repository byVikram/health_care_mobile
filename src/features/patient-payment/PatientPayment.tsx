// src/features/patient-payment/PatientPayment.tsx
//
// "5 · Payment" (Step 2 of 2) of the patient consult-a-doctor flow: appointment
// ticket, bill details, "Pay with" method list and the booking CTA. There is no
// payment gateway yet -- online methods are UI-only; the CTA always books via
// createAppointment, then runs the pre-intake step and opens Appointment Confirmed.

import React, { useState } from 'react'
import {
	Alert,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	StatusBar,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import type { NavigationProp, RouteProp } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { secureStorage } from '../../utils/secureStorage'
import { buildS3Url } from '../../utils/s3Utils'
import { showComingSoon } from '../../utils/toast'
import { useAuth } from '../../context/AuthContext'
import { createAppointment, updatePreIntake } from '../doctor/doctorService'
import { APP_COLORS, TONES, formatInr } from '../../config/theme'
import PreIntakeModal, { type PreIntakeSeverity } from '../patient/components/PreIntakeModal'
import type { AppStackParamList } from '../../navigation/types'
import { ROUTES } from '../../navigation/routes'
import {
	AppAvatar,
	AppButton,
	AppDashedDivider,
	AppFooterBar,
	AppScreenHeader,
	AppSection,
	AppIcon,
} from '../../components/common'
import PaymentMethodList, { PAYMENT_METHOD_LABELS, type PaymentMethodId } from './components/PaymentMethodList'

type BookedAppointmentMode = 'clinic_visit' | 'video_call'

type BookedAppointmentStatus = 'pending' | string

type BookedAppointmentDoctor = {
	id: string
	name: string
}

type BookedAppointmentPatient = {
	id: string
	name: string
	avatar_s3_key: string | null
	gender: string
	age: number
}

type BookedAppointmentHospital = {
	id: string
	name: string
	address: string
}

type BookedAppointment = {
	id: string
	appointment_mode: BookedAppointmentMode
	appointment_date: string
	start_time: string
	end_time: string
	fees: number
	created_at: string
	status: BookedAppointmentStatus
	doctor: BookedAppointmentDoctor
	patient: BookedAppointmentPatient
	hospital: BookedAppointmentHospital
}

type BookAppointmentResponse = {
	success: boolean
	message: string
	data: BookedAppointment
}

const normalizeBookedAppointmentMode = (mode: unknown): BookedAppointmentMode =>
	mode === 'video_call' ? 'video_call' : 'clinic_visit'

const mapBookAppointmentResponse = (response: unknown): BookAppointmentResponse => {
	const raw = response as {
		success?: boolean
		message?: string
		data?: Partial<BookedAppointment>
	}
	const data = raw.data || {}

	return {
		success: raw.success === true,
		message: raw.message || '',
		data: {
			id: String(data.id || ''),
			appointment_mode: normalizeBookedAppointmentMode(data.appointment_mode),
			appointment_date: String(data.appointment_date || ''),
			start_time: String(data.start_time || ''),
			end_time: String(data.end_time || ''),
			fees: Number(data.fees || 0),
			created_at: String(data.created_at || ''),
			status: String(data.status || 'pending'),
			doctor: {
				id: String(data.doctor?.id || ''),
				name: String(data.doctor?.name || ''),
			},
			patient: {
				id: String(data.patient?.id || ''),
				name: String(data.patient?.name || ''),
				avatar_s3_key: data.patient?.avatar_s3_key || null,
				gender: String(data.patient?.gender || ''),
				age: Number(data.patient?.age || 0),
			},
			hospital: {
				id: String(data.hospital?.id || ''),
				name: String(data.hospital?.name || ''),
				address: String(data.hospital?.address || ''),
			},
		},
	}
}

const formatDistance = (distance?: string | number | null) => {
	if (distance == null || distance === '') return ''
	const text = String(distance).trim()
	return /km$/i.test(text) ? text : `${text} km`
}

/** True when a session token exists. Never logs or returns the token itself. */
const hasSessionToken = async () => {
	const patientToken = await AsyncStorage.getItem('patient_token')
	if (patientToken) return true
	const accessToken = await secureStorage.getItem('access_token')
	return Boolean(accessToken)
}

export default function BookingDetailsScreen() {
	const insets = useSafeAreaInsets()
	const navigation = useNavigation<NavigationProp<AppStackParamList>>()
	const route = useRoute<RouteProp<AppStackParamList, typeof ROUTES.STACK.PATIENT_PAYMENT>>()
	const { user } = useAuth()

	// Booking params (passed from the slot step via ConsentForm)
	const params = route.params
	const doctor = params?.doctor
	const hospitalId = params?.hospitalId || ''
	const hospitalName = params?.hospitalName || ''
	const appointmentDate = params?.appointmentDate || ''
	const appointmentDateDisplay = params?.appointmentDateDisplay || ''
	const startTime = params?.startTime || ''
	const startTimeDisplay = params?.startTimeDisplay || ''
	const appointmentMode = params?.appointmentMode || 'offline'
	const fee = params?.fee || 0
	const referralId = params?.referralId
	const consentVersionId = params?.consentVersionId
	const patientId = params?.patientId
	const isVideo = appointmentMode !== 'offline'
	const isPayLaterDisabled = isVideo

	const [method, setMethod] = useState<PaymentMethodId>('upi')
	const [isBooking, setIsBooking] = useState(false)
	const [bookedAppointment, setBookedAppointment] = useState<BookedAppointment | null>(null)
	const [symptomsOpen, setSymptomsOpen] = useState(false)
	const [symptoms, setSymptoms] = useState(params?.reasonForVisit ?? '')
	const [duration, setDuration] = useState('')
	const [severity, setSeverity] = useState<PreIntakeSeverity>('')

	const selectedHospital = doctor?.hospitals?.find((h) => h.hospital?.id === hospitalId || h.id === hospitalId)
	const bookingDoctorName = bookedAppointment?.doctor.name || doctor?.name || ''
	const bookingHospitalName =
		bookedAppointment?.hospital.name || hospitalName || selectedHospital?.hospital.name || ''
	const bookingHospitalAddress = bookedAppointment?.hospital.address || selectedHospital?.hospital.address || ''
	const bookingDate = appointmentDateDisplay || bookedAppointment?.appointment_date || appointmentDate
	const bookingTime = startTimeDisplay || bookedAppointment?.start_time || startTime
	const bookingFee = bookedAppointment?.fees || fee
	const feeText = formatInr(bookingFee) === '--' ? `₹${bookingFee}` : formatInr(bookingFee)
	const distanceText = formatDistance(selectedHospital?.hospital.distance)

	const patientDisplayName = params?.patientName || bookedAppointment?.patient.name || user?.name || 'You'
	const patientRelation = params?.patientRelation || (patientId ? '' : 'Self')

	const speciality = doctor?.specialities?.[0] || ''
	const experienceText = doctor?.details?.experience_years != null ? `${doctor.details.experience_years} yrs` : ''
	const ctaLabel = method === 'later' ? 'Confirm appointment' : `Pay ${feeText}`

	const handleConfirm = async () => {
		if (!doctor || !hospitalId || !appointmentDate || !startTime) {
			Alert.alert('Error', 'Missing booking information')
			return
		}

		setIsBooking(true)
		try {
			if (!(await hasSessionToken())) {
				Alert.alert('Error', 'Patient session expired. Please log in again.')
				return
			}

			const res = await createAppointment({
				doctor_id: doctor.id,
				hospital_id: hospitalId,
				appointment_mode: isVideo ? 'video_call' : 'clinic_visit',
				appointment_date: appointmentDate,
				start_time: startTime,
				referral_id: referralId,
				consent_version_id: consentVersionId,
				...(patientId ? { patient_id: patientId } : {}),
			})
			const bookingResponse = mapBookAppointmentResponse(res)

			if (bookingResponse.success) {
				setBookedAppointment(bookingResponse.data)
				// Pre-intake step first, then the full Appointment Confirmed screen
				// (see closeSymptomsForm below).
				setSymptomsOpen(true)
			} else {
				Alert.alert('Error', bookingResponse.message || 'Failed to book appointment')
			}
		} catch (error: any) {
			console.log('BOOKING ERROR =>', error?.response?.status, error?.response?.data)
			Alert.alert('Error', error?.response?.data?.message || 'An error occurred while booking. Please try again.')
		} finally {
			setIsBooking(false)
		}
	}

	const closeSymptomsForm = () => {
		setSymptomsOpen(false)
		if (!bookedAppointment) {
			navigation.navigate(ROUTES.STACK.DOCTOR_DETAIL, { id: doctor?.id ?? '' })
			return
		}

		navigation.navigate(ROUTES.STACK.APPOINTMENT_CONFIRMED, {
			appointmentId: bookedAppointment.id,
			doctorName: bookingDoctorName,
			doctorAvatar: doctor?.details?.avatar_s3_key ?? null,
			doctorSpecialty: doctor?.specialities?.[0],
			appointmentMode: bookedAppointment.appointment_mode,
			dateDisplay: bookingDate,
			timeDisplay: bookingTime,
			hospitalName: bookingHospitalName,
			hospitalAddress: bookingHospitalAddress,
			patientName: patientDisplayName,
			fee: bookingFee,
			paymentMethodLabel: PAYMENT_METHOD_LABELS[method],
		})
	}

	const handleSubmitSymptoms = async () => {
		try {
			if (!bookedAppointment) {
				Alert.alert('Error', 'No appointment found to submit symptoms for.')
				return
			}
			await updatePreIntake(bookedAppointment.id, { symptoms, duration, severity })
			closeSymptomsForm()
		} catch (error) {
			console.error('Failed to submit pre-intake symptoms', error)
			Alert.alert('Error', 'Failed to submit symptoms. Please try again.')
		}
	}

	// If params are missing (user directly opened this screen), show error
	if (!doctor) {
		return (
			<View style={[styles.container, styles.errorContainer, { paddingTop: insets.top }]}>
				<Text style={styles.errorText}>No booking information found</Text>
				<TouchableOpacity onPress={() => navigation.goBack()}>
					<Text style={styles.errorBack}>Go Back</Text>
				</TouchableOpacity>
			</View>
		)
	}

	const avatarUri = buildS3Url(doctor.details?.avatar_s3_key)

	return (
		<View style={styles.container}>
			<StatusBar barStyle="light-content" backgroundColor={APP_COLORS.primary} />

			<AppScreenHeader
				variant="bar"
				onBack={() => navigation.goBack()}
				backAccessibilityLabel="Back to booking"
				title={bookingDoctorName}
				subtitle={[speciality, experienceText, bookingFee ? feeText : ''].filter(Boolean).join(' · ')}
				badge="Step 2 of 2"
				leading={
					<AppAvatar
						uri={avatarUri}
						name={bookingDoctorName}
						size={36}
						borderWidth={2}
						borderColor="#FFFFFF"
						backgroundColor={TONES.lilac.bg}
						initialsColor={TONES.lilac.ink}
						fallbackIcon="account"
					/>
				}
			/>

			<KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
				<ScrollView
					style={styles.flex}
					contentContainerStyle={styles.scrollContent}
					showsVerticalScrollIndicator={false}
					keyboardShouldPersistTaps="handled"
				>
					{/* Appointment ticket */}
					<AppSection marginTop={0} gap={0}>
						<View style={styles.ticketCard}>
							<View style={styles.ticketTopRow}>
								<AppAvatar
									uri={avatarUri}
									name={bookingDoctorName}
									size={56}
									borderWidth={3}
									borderColor="#FFFFFF"
									backgroundColor={TONES.lilac.bg}
									initialsColor={TONES.lilac.ink}
									fallbackIcon="account"
								/>
								<View style={styles.flex}>
									<Text style={styles.ticketDoctorName} numberOfLines={1}>
										{bookingDoctorName}
									</Text>
									<Text style={styles.ticketDoctorSpec} numberOfLines={1}>
										{[speciality, experienceText].filter(Boolean).join(' · ')}
									</Text>
								</View>
								<TouchableOpacity
									onPress={() => navigation.goBack()}
									style={styles.changeBtn}
									accessibilityRole="link"
								>
									<Text style={styles.changeLink}>Change</Text>
								</TouchableOpacity>
							</View>

							<AppDashedDivider variant="ticket" color={APP_COLORS.mintAccent} cutoutColor={APP_COLORS.surface} />

							<View style={styles.ticketGrid}>
								<View style={styles.ticketGridCol}>
									<Text style={styles.ticketLabel}>WHEN</Text>
									<Text style={styles.ticketValueBig}>{bookingTime}</Text>
									<Text style={styles.ticketSub}>{bookingDate}</Text>
								</View>
								<View style={styles.ticketGridCol}>
									<Text style={styles.ticketLabel}>WHERE</Text>
									<Text style={styles.ticketValue} numberOfLines={1}>
										{isVideo ? 'Video consultation' : bookingHospitalName}
									</Text>
									<Text style={styles.ticketSub} numberOfLines={1}>
										{isVideo
											? 'Video call'
											: ['In-clinic', distanceText].filter(Boolean).join(' · ')}
									</Text>
								</View>

								<View style={styles.ticketPatientRow}>
									<AppAvatar
										name={patientDisplayName}
										size={24}
										backgroundColor="#FFFFFF"
										initialsColor={APP_COLORS.primary}
										initialsStyle={styles.ticketPatientInitials}
									/>
									<Text style={styles.ticketPatientText} numberOfLines={1}>
										For <Text style={styles.ticketPatientName}>{patientDisplayName}</Text>
										{patientRelation ? ` (${patientRelation})` : ''}
									</Text>
								</View>
							</View>
						</View>
					</AppSection>

					{/* Bill details */}
					<AppSection title="Bill details" marginTop={0} gap={12}>
						<View style={styles.billRows}>
							<View style={styles.billRow}>
								<Text style={styles.billText}>Consultation fee</Text>
								<Text style={styles.billText}>{feeText}</Text>
							</View>
							<View style={styles.billRow}>
								<Text style={styles.billText}>Booking fee</Text>
								<Text style={[styles.billText, styles.freeText]}>Free</Text>
							</View>
							<View style={styles.totalWrap}>
								<AppDashedDivider color={APP_COLORS.border} />
								<View style={[styles.billRow, styles.totalRow]}>
									<Text style={styles.totalLabel}>To pay</Text>
									<Text style={styles.totalValue}>{feeText}</Text>
								</View>
							</View>
						</View>
					</AppSection>

					{/* Pay with */}
					<AppSection title="Pay with" marginTop={0} gap={4} style={styles.paySection}>
						<PaymentMethodList
							value={method}
							onChange={setMethod}
							payAtClinicDisabled={isPayLaterDisabled}
						/>
					</AppSection>

					<View style={styles.encryptionRow}>
						<AppIcon name="shield" size={16} color={APP_COLORS.primary} />
						<Text style={styles.encryptionText}>Payments are encrypted. We never store your CVV.</Text>
					</View>
				</ScrollView>

				{/* Footer */}
				<AppFooterBar direction="column">
					<AppButton
						size="lg"
						onPress={handleConfirm}
						disabled={isBooking}
						loading={isBooking}
						icon={({ color }) => <AppIcon name="lock" size={18} color={color} />}
						accessibilityLabel={ctaLabel}
					>
						{ctaLabel}
					</AppButton>
					<Text style={styles.termsText}>
						By continuing you agree to the{' '}
						<Text style={styles.termsLink} onPress={() => showComingSoon()} accessibilityRole="link">
							booking terms
						</Text>
					</Text>
				</AppFooterBar>
			</KeyboardAvoidingView>

			<PreIntakeModal
				visible={symptomsOpen}
				symptoms={symptoms}
				duration={duration}
				severity={severity}
				onSymptomsChange={setSymptoms}
				onDurationChange={setDuration}
				onSeverityChange={setSeverity}
				onSkip={closeSymptomsForm}
				onSubmit={handleSubmitSymptoms}
			/>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: APP_COLORS.pageBg,
	},
	flex: {
		flex: 1,
	},

	scrollContent: {
		gap: 8,
		paddingBottom: 8,
	},

	// Appointment ticket
	ticketCard: {
		borderRadius: 16,
		backgroundColor: APP_COLORS.mint,
		overflow: 'hidden',
	},
	ticketTopRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		padding: 16,
	},
	ticketDoctorName: {
		fontSize: 17,
		lineHeight: 22,
		fontWeight: '800',
		color: APP_COLORS.ink,
	},
	ticketDoctorSpec: {
		fontSize: 13,
		lineHeight: 18,
		fontWeight: '600',
		color: TONES.lilac.ink,
	},
	changeBtn: {
		minHeight: 44,
		justifyContent: 'center',
	},
	changeLink: {
		fontSize: 14,
		fontWeight: '700',
		color: APP_COLORS.primary,
	},
	ticketGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		padding: 16,
		rowGap: 12,
		columnGap: 12,
	},
	ticketGridCol: {
		flexBasis: '40%',
		flexGrow: 1,
		minWidth: 0,
	},
	ticketLabel: {
		fontSize: 12,
		lineHeight: 16,
		fontWeight: '700',
		letterSpacing: 0.48,
		color: APP_COLORS.primary,
	},
	ticketValueBig: {
		fontSize: 20,
		lineHeight: 26,
		fontWeight: '800',
		color: APP_COLORS.ink,
	},
	ticketValue: {
		fontSize: 15,
		lineHeight: 22,
		fontWeight: '700',
		color: APP_COLORS.ink,
	},
	ticketSub: {
		fontSize: 13,
		lineHeight: 18,
		color: APP_COLORS.inkMuted,
	},
	ticketPatientRow: {
		width: '100%',
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	ticketPatientInitials: {
		fontSize: 10,
		fontWeight: '800',
	},
	ticketPatientText: {
		flex: 1,
		fontSize: 13,
		lineHeight: 18,
		color: APP_COLORS.ink,
	},
	ticketPatientName: {
		fontWeight: '700',
	},

	// Bill details
	billRows: {
		gap: 8,
	},
	billRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	billText: {
		fontSize: 14,
		lineHeight: 20,
		color: APP_COLORS.ink,
	},
	freeText: {
		color: APP_COLORS.success,
		fontWeight: '600',
	},
	totalWrap: {
		marginTop: 4,
	},
	totalRow: {
		paddingTop: 12,
	},
	totalLabel: {
		fontSize: 18,
		lineHeight: 26,
		fontWeight: '800',
		color: APP_COLORS.ink,
	},
	totalValue: {
		fontSize: 22,
		lineHeight: 26,
		fontWeight: '800',
		color: APP_COLORS.ink,
	},

	// Pay with
	paySection: {
		paddingBottom: 0,
	},
	encryptionRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 6,
		marginTop: 4,
		marginHorizontal: 16,
	},
	encryptionText: {
		fontSize: 12,
		lineHeight: 16,
		fontWeight: '500',
		color: APP_COLORS.inkMuted,
	},

	// Footer
	termsText: {
		textAlign: 'center',
		fontSize: 12,
		lineHeight: 16,
		color: APP_COLORS.inkMuted,
	},
	termsLink: {
		color: APP_COLORS.primary,
		textDecorationLine: 'underline',
	},

	errorContainer: {
		justifyContent: 'center',
		alignItems: 'center',
	},
	errorText: {
		fontSize: 18,
		color: APP_COLORS.danger,
		marginBottom: 16,
	},
	errorBack: {
		fontSize: 16,
		color: APP_COLORS.primary,
		textDecorationLine: 'underline',
	},
})
