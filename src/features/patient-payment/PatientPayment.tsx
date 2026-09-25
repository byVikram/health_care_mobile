import React, { useState } from 'react'
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	ScrollView,
	SafeAreaView,
	StatusBar,
	Image,
	Alert,
	ActivityIndicator,
} from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import type { NavigationProp, RouteProp } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { secureStorage } from '../../utils/secureStorage'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import PhonePeSvg from '../../assets/Payment/phonepe.svg'
import GooglePaySvg from '../../assets/Payment/googlepay.svg'
import PaytmSvg from '../../assets/Payment/paytm.svg'
import AmazonPaySvg from '../../assets/Payment/amazonpay.svg'
import CreditCardSvg from '../../assets/Payment/creditcard.svg'
import WhatsappSvg from '../../assets/Payment/whatsapp.svg'
import AppPayment from '../../components/common/AppPayment'
import { useAuth } from '../../context/AuthContext'
import { createAppointment, updatePreIntake } from '../doctor/doctorService'
import PreIntakeModal, { type PreIntakeSeverity } from '../patient/components/PreIntakeModal'
import type { AppStackParamList } from '../../navigation/types'
import { ROUTES } from '../../navigation/routes'

// Design tokens matching the "Payment" HTML design (same teal family as
// Screens 1-3; #2B6F71 already matches this app's existing DETAIL_PRIMARY).
const PRIMARY = '#2B6F71'
const PRIMARY_DARK = '#276668'
const INK = '#12373E'
const INK_MUTED = '#5B6B6E'
const DIVIDER = '#D5E1E2'
const TICKET_TINT = '#E3EFEF'
const SPEC_TONE = '#6A4BB5'

type PaymentIconProps = {
	SvgComponent: any
	bordered?: boolean
}

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

const PaymentIcon = ({ SvgComponent, bordered = false }: PaymentIconProps) => (
	<View style={[styles.iconWrapper, bordered && styles.iconBordered]}>
		<SvgComponent width={24} height={24} />
	</View>
)

const doctorImagePlaceholder = require('../../assets/Banner/doctor.png')

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

const formatAppointmentMode = (mode: string) => (mode === 'video_call' ? 'Video Call' : 'Clinic Visit')

const formatTimeRange = (start?: string, end?: string) => {
	if (start && end) return `${start} - ${end}`
	return start || ''
}

const paymentMethods = [
	{ id: 'phonepe', name: 'Phone Pe', Svg: PhonePeSvg, bordered: false },
	{ id: 'gpay', name: 'Google Pay', Svg: GooglePaySvg, bordered: false },
	{ id: 'paytm', name: 'Paytm', Svg: PaytmSvg, bordered: false },
	{ id: 'amazon', name: 'Amazon Pay', Svg: AmazonPaySvg, bordered: false },
	{ id: 'card', name: 'Credit Card', Svg: CreditCardSvg, bordered: false },
]

const getPatientToken = async () => {
	const accessToken = await secureStorage.getItem('access_token')
	const patientToken = await AsyncStorage.getItem('patient_token')
	const storedRole = await AsyncStorage.getItem('role')
	const storedUser = await AsyncStorage.getItem('user')

	const source = patientToken ? 'patient_token' : accessToken ? 'access_token' : null
	const token = patientToken || accessToken || null

	console.log('[PatientPayment] token values', {
		patient_token: patientToken,
		access_token: accessToken,
		role: storedRole,
		user: storedUser,
		selectedSource: source,
		selectedToken: token,
	})

	return { source, token, storedRole, storedUser }
}

const decodeBase64Url = (value: string) => {
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='
	const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
	const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=')
	let output = ''

	for (let block = 0, charCode = 0, idx = 0, map = chars; padded.charAt(idx | 0);) {
		const currentChar = padded.charAt(idx++)
		const currentValue = map.indexOf(currentChar)
		if (currentValue < 0) continue
		charCode = block % 4 ? charCode * 64 + currentValue : currentValue
		if (block++ % 4) {
			output += String.fromCharCode(255 & (charCode >> ((-2 * block) & 6)))
		}
	}

	return decodeURIComponent(
		output
			.split('')
			.map((char) => `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`)
			.join('')
	)
}

const decodeJwtPayload = (token: string) => {
	try {
		const payload = token.split('.')[1]
		return payload ? JSON.parse(decodeBase64Url(payload)) : null
	} catch (error) {
		console.log('[PatientPayment] Failed to decode JWT payload', error)
		return null
	}
}

const getTokenDiagnostics = (token: string) => {
	const payload = decodeJwtPayload(token)
	const exp = typeof payload?.exp === 'number' ? payload.exp : null
	const expiresAt = exp ? new Date(exp * 1000).toISOString() : null
	const nowSeconds = Math.floor(Date.now() / 1000)
	const role = payload?.role || payload?.user?.role || payload?.user_role || payload?.account_type || null

	return {
		payload,
		exp,
		expiresAt,
		now: new Date().toISOString(),
		isExpired: exp ? exp <= nowSeconds : null,
		role,
		isPatientRole: typeof role === 'string' ? role.toLowerCase() === 'patient' : null,
	}
}

export default function BookingDetailsScreen() {
	const insets = useSafeAreaInsets()
	const navigation = useNavigation<NavigationProp<AppStackParamList>>()
	const route = useRoute<RouteProp<AppStackParamList, typeof ROUTES.STACK.PATIENT_PAYMENT>>()
	const { user } = useAuth()

	// Get booking params (passed from DoctorDetailPage)
	const params = route.params
	const doctor = params?.doctor
	const hospitalId = params?.hospitalId || ''
	const hospitalName = params?.hospitalName || ''
	const appointmentDate = params?.appointmentDate || ''
	const appointmentDateDisplay = params?.appointmentDateDisplay || ''
	const startTime = params?.startTime || ''
	const startTimeDisplay = params?.startTimeDisplay || ''
	const appointmentMode = params?.appointmentMode || 'offline'
	const consultationTypeLabel = params?.consultationTypeLabel || 'Clinic Visit'
	const fee = params?.fee || 0
	const referralId = params?.referralId
	const consentVersionId = params?.consentVersionId
	const isPayLaterDisabled = appointmentMode !== 'offline'

	const [paymentType, setPaymentType] = useState<'now' | 'later'>('now')
	const [selectedMethod, setSelectedMethod] = useState('phonepe')
	const [whatsappNotify, setWhatsappNotify] = useState(false)
	const [isBooking, setIsBooking] = useState(false)
	const [bookedAppointment, setBookedAppointment] = useState<BookedAppointment | null>(null)
	const [symptomsOpen, setSymptomsOpen] = useState(false)
	const [symptoms, setSymptoms] = useState('')
	const [duration, setDuration] = useState('')
	const [severity, setSeverity] = useState<PreIntakeSeverity>('')

	const bookingDoctorName = bookedAppointment?.doctor.name || doctor?.name || ''
	const bookingHospitalName = bookedAppointment?.hospital.name || hospitalName || ''
	const bookingHospitalAddress = bookedAppointment?.hospital.address || ''
	const bookingDate = bookedAppointment?.appointment_date || appointmentDateDisplay || appointmentDate
	const bookingTime = bookedAppointment
		? formatTimeRange(bookedAppointment.start_time, bookedAppointment.end_time)
		: startTimeDisplay
	const bookingType = bookedAppointment
		? formatAppointmentMode(bookedAppointment.appointment_mode)
		: consultationTypeLabel
	const bookingFee = bookedAppointment?.fees ?? fee
	const bookingStatus = bookedAppointment?.status || ''
	const totalPayable = bookingFee // assuming no extra tax/fee

	// Presentation-only derived values (real data, nothing fabricated).
	const patientDisplayName = bookedAppointment?.patient.name || user?.name || 'You'
	const patientInitials =
		patientDisplayName
			.split(/\s+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((part) => part[0]?.toUpperCase())
			.join('') || 'ME'
	const doctorExperienceText =
		doctor?.details?.experience_years != null ? `${doctor.details.experience_years} yrs` : ''
	const ctaLabel = paymentType === 'later' ? `Confirm ${bookingType}` : `Pay ₹${totalPayable}`

	const handleConfirm = async () => {
		if (!doctor || !hospitalId || !appointmentDate || !startTime) {
			Alert.alert('Error', 'Missing booking information')
			return
		}

		setIsBooking(true)
		try {
			const patientTokenInfo = await getPatientToken()
			const patientToken = patientTokenInfo.token

			if (!patientToken) {
				Alert.alert('Error', 'Patient session expired. Please log in again.')
				return
			}

			const authorizationHeader = `Bearer ${patientToken}`
			console.log('[PatientPayment] token diagnostics', {
				source: patientTokenInfo.source,
				token: patientToken,
				authorizationHeader,
				diagnostics: getTokenDiagnostics(patientToken),
				asyncStorageRole: patientTokenInfo.storedRole,
				asyncStorageUser: patientTokenInfo.storedUser,
				asyncStorageRoleIsPatient: patientTokenInfo.storedRole?.toLowerCase() === 'patient',
			})

			console.log('BOOKING PAYLOAD =>', {
				doctor_id: doctor.id,
				hospital_id: hospitalId,
				appointment_mode: appointmentMode === 'offline' ? 'clinic_visit' : 'video_call',
				appointment_date: appointmentDate,
				start_time: startTime,
			})

			console.log('[PatientPayment] Authorization header before API call', {
				Authorization: authorizationHeader,
				webComparison:
					'React web booking expected header is the same shape: Authorization: Bearer <localStorage access_token>.',
			})

			const res = await createAppointment({
				doctor_id: doctor.id,
				hospital_id: hospitalId,
				appointment_mode: appointmentMode === 'offline' ? 'clinic_visit' : 'video_call',
				appointment_date: appointmentDate,
				start_time: startTime,
				referral_id: referralId,
				consent_version_id: consentVersionId,
			})
			console.log('[PatientPayment] booking API response', res)
			const bookingResponse = mapBookAppointmentResponse(res)

			if (bookingResponse.success) {
				const appointment = bookingResponse.data
				setBookedAppointment(appointment)
				// Skip the old "just a popup" success modal -- go straight into the
				// real pre-intake step, then on to the full Appointment Confirmed
				// screen (see closeSymptomsForm below).
				setSymptomsOpen(true)
			} else {
				Alert.alert('Error', bookingResponse.message || 'Failed to book appointment')
			}
		} catch (error: any) {
			console.log('BOOKING ERROR =>', error?.response?.status, error?.response?.data)

			console.log('[PatientPayment] booking API error details', {
				message: error?.message,
				responseStatus: error?.response?.status,
				responseData: error?.response?.data,
				requestHeaders: error?.config?.headers || error?.response?.config?.headers,
			})

			console.error(error)

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

		const selectedMethodLabel =
			paymentType === 'later'
				? 'Pay at clinic'
				: paymentMethods.find((m) => m.id === selectedMethod)?.name || 'Online payment'

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
			paymentMethodLabel: selectedMethodLabel,
		})
	}

	const handleSubmitSymptoms = async () => {
		console.log('Submit clicked')
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
			<SafeAreaView style={styles.container}>
				<View style={styles.errorContainer}>
					<Text style={styles.errorText}>No booking information found</Text>
					<TouchableOpacity onPress={() => navigation.goBack()}>
						<Text style={styles.errorBack}>Go Back</Text>
					</TouchableOpacity>
				</View>
			</SafeAreaView>
		)
	}

	const avatarUrl = doctor.details?.avatar_s3_key || doctorImagePlaceholder

	return (
		<SafeAreaView style={styles.container}>
			<StatusBar barStyle="light-content" backgroundColor={PRIMARY} />

			{/* Header */}
			<View style={[styles.headerWrapper, { paddingTop: insets.top + 8 }]}>
				<TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBackBtn}>
					<MaterialCommunityIcons name="chevron-left" size={26} color="#FFFFFF" />
				</TouchableOpacity>

				<Image source={{ uri: avatarUrl }} style={styles.headerAvatar} defaultSource={doctorImagePlaceholder} />

				<View style={styles.headerTextCol}>
					<Text style={styles.headerDoctorName} numberOfLines={1}>
						{bookingDoctorName}
					</Text>
					<Text style={styles.headerDoctorMeta} numberOfLines={1}>
						{[doctor.specialities?.[0], doctorExperienceText, fee ? `₹${fee}` : '']
							.filter(Boolean)
							.join(' · ')}
					</Text>
				</View>

				<View style={styles.stepBadge}>
					<Text style={styles.stepBadgeText}>Step 2 of 2</Text>
				</View>
			</View>

			<ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 }}>
				{/* Appointment ticket card */}
				<View style={styles.section}>
					<View style={styles.ticketCard}>
						<View style={styles.ticketTopRow}>
							<Image
								source={{ uri: avatarUrl }}
								style={styles.ticketAvatar}
								resizeMode="cover"
								defaultSource={doctorImagePlaceholder}
							/>
							<View style={{ flex: 1 }}>
								<Text style={styles.ticketDoctorName} numberOfLines={1}>
									{bookingDoctorName}
								</Text>
								<Text style={styles.ticketDoctorSpec} numberOfLines={1}>
									{[doctor.specialities?.[0], doctorExperienceText].filter(Boolean).join(' · ')}
								</Text>
							</View>
							<TouchableOpacity onPress={() => navigation.goBack()}>
								<Text style={styles.changeLink}>Change</Text>
							</TouchableOpacity>
						</View>

						<View style={styles.ticketDivider} />

						<View style={styles.ticketGrid}>
							<View style={styles.ticketGridCol}>
								<Text style={styles.ticketLabel}>WHEN</Text>
								<Text style={styles.ticketValueBig}>{bookingTime}</Text>
								<Text style={styles.ticketSub}>{bookingDate}</Text>
							</View>
							<View style={styles.ticketGridCol}>
								<Text style={styles.ticketLabel}>WHERE</Text>
								<Text style={styles.ticketValue} numberOfLines={1}>
									{bookingHospitalName}
								</Text>
								<Text style={styles.ticketSub} numberOfLines={1}>
									{bookingType}
									{bookingHospitalAddress ? ` · ${bookingHospitalAddress}` : ''}
								</Text>
							</View>

							<View style={styles.ticketPatientRow}>
								<View style={styles.ticketPatientAvatar}>
									<Text style={styles.ticketPatientInitials}>{patientInitials}</Text>
								</View>
								<Text style={styles.ticketPatientText}>
									For <Text style={styles.ticketPatientName}>{patientDisplayName}</Text> (Self)
								</Text>
							</View>

							{bookedAppointment ? (
								<View style={styles.ticketPatientRow}>
									<MaterialCommunityIcons name="check-circle" size={16} color="#1E7A4E" />
									<Text style={styles.ticketPatientText}>
										{bookingStatus} ·{' '}
										<Text style={styles.ticketPatientName}>{bookedAppointment.id}</Text>
									</Text>
								</View>
							) : null}
						</View>
					</View>
				</View>

				{/* Bill details */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Bill details</Text>

					<View style={styles.billRow}>
						<Text style={styles.billText}>Consultation fee</Text>
						<Text style={styles.billText}>₹{bookingFee}</Text>
					</View>

					<View style={styles.billRow}>
						<Text style={styles.billText}>Service Fee &amp; Tax</Text>
						<View style={{ flexDirection: 'row', alignItems: 'center' }}>
							<Text style={styles.strikeText}>₹30 </Text>
							<View style={styles.freeBadge}>
								<Text style={styles.freeText}>FREE</Text>
							</View>
						</View>
					</View>

					<View style={styles.billDividerDashed} />

					<View style={styles.billRow}>
						<Text style={styles.totalLabel}>To pay</Text>
						<Text style={styles.totalValue}>₹{totalPayable}</Text>
					</View>
				</View>

				{/* Pay with */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Pay with</Text>

					<View style={styles.payListCard}>
						{paymentMethods.map((item) => (
							<View key={item.id} style={styles.payRowWrap}>
								<TouchableOpacity
									style={styles.payRow}
									onPress={() => {
										setPaymentType('now')
										setSelectedMethod(item.id)
									}}
									activeOpacity={0.8}
								>
									<View style={styles.payIconBox}>
										<PaymentIcon SvgComponent={item.Svg} bordered={item.bordered} />
									</View>
									<View style={{ flex: 1 }}>
										<Text style={styles.payTitle}>{item.name}</Text>
									</View>
									<View style={styles.radioOuter}>
										{paymentType === 'now' && selectedMethod === item.id && (
											<View style={styles.radioInner} />
										)}
									</View>
								</TouchableOpacity>
							</View>
						))}

						<View style={[styles.payRowWrap, isPayLaterDisabled && styles.paymentRowDisabled]}>
							<TouchableOpacity
								style={styles.payRow}
								onPress={() => {
									if (isPayLaterDisabled) return
									setPaymentType('later')
									setSelectedMethod('')
								}}
								disabled={isPayLaterDisabled}
								activeOpacity={0.8}
							>
								<View style={styles.payIconBox}>
									<MaterialCommunityIcons name="home-city-outline" size={20} color={PRIMARY} />
								</View>
								<View style={{ flex: 1 }}>
									<Text style={[styles.payTitle, isPayLaterDisabled && styles.paymentTextDisabled]}>
										Pay at clinic
									</Text>
									<Text style={styles.paySubtitle}>Cash, card or UPI at the front desk</Text>
								</View>
								<View style={[styles.radioOuter, isPayLaterDisabled && styles.radioOuterDisabled]}>
									{paymentType === 'later' && <View style={styles.radioInner} />}
								</View>
							</TouchableOpacity>
						</View>
					</View>

					{paymentType === 'now' && <AppPayment />}

					{/* WhatsApp Notification */}
					<View style={styles.whatsappBox}>
						<TouchableOpacity style={styles.whatsappRow} onPress={() => setWhatsappNotify(!whatsappNotify)}>
							<View style={styles.paymentLeft}>
								<WhatsappSvg width={24} height={24} />
								<Text style={styles.paymentText}>Get notifications on WhatsApp</Text>
							</View>

							<View style={[styles.checkbox, whatsappNotify && styles.checkboxChecked]}>
								{whatsappNotify && <Text style={styles.checkmark}>✓</Text>}
							</View>
						</TouchableOpacity>

						<Text style={styles.subText}>Updates related to your appointment</Text>

						<View style={styles.innerDivider} />

						<Text style={styles.legalText}>• Updates will be sent to +91 7892500634</Text>
						<Text style={styles.legalText}>• By booking, you agree to Terms & Conditions</Text>
						<Text style={styles.legalText}>• You can pre-pay by selecting an online option</Text>
					</View>
				</View>

				<View style={styles.encryptionRow}>
					<MaterialCommunityIcons name="shield-check-outline" size={16} color={PRIMARY} />
					<Text style={styles.encryptionText}>Payments are encrypted. We never store your CVV.</Text>
				</View>
			</ScrollView>

			{/* Bottom Bar */}
			<View style={styles.bottomBar}>
				<TouchableOpacity
					style={styles.confirmBtn}
					onPress={handleConfirm}
					disabled={isBooking}
					activeOpacity={0.88}
				>
					{isBooking ? (
						<ActivityIndicator color="#fff" />
					) : (
						<>
							<MaterialCommunityIcons name="lock-outline" size={18} color="#fff" />
							<Text style={styles.confirmText}>{ctaLabel}</Text>
						</>
					)}
				</TouchableOpacity>
				<Text style={styles.termsText}>By continuing you agree to the booking terms</Text>
			</View>

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
		</SafeAreaView>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#F5F8F8',
	},

	// Header
	headerWrapper: {
		backgroundColor: PRIMARY,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		paddingHorizontal: 16,
		paddingBottom: 14,
	},
	headerBackBtn: {
		width: 40,
		height: 40,
		marginLeft: -8,
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: 9999,
	},
	headerAvatar: {
		width: 36,
		height: 36,
		borderRadius: 9999,
		backgroundColor: '#ECE6FA',
		borderWidth: 2,
		borderColor: '#FFFFFF',
	},
	headerTextCol: {
		flex: 1,
		minWidth: 0,
	},
	headerDoctorName: {
		color: '#fff',
		fontSize: 16,
		lineHeight: 20,
		fontWeight: '700',
	},
	headerDoctorMeta: {
		color: '#E3EFEF',
		fontSize: 12,
		lineHeight: 16,
		fontWeight: '500',
	},
	stepBadge: {
		flexShrink: 0,
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 8,
		backgroundColor: PRIMARY_DARK,
	},
	stepBadgeText: {
		color: '#fff',
		fontSize: 12,
		fontWeight: '700',
	},

	section: {
		backgroundColor: '#fff',
		padding: 16,
		marginTop: 8,
	},
	card: {
		backgroundColor: '#fff',
		padding: 16,
		marginTop: 8,
	},

	// Appointment ticket card
	ticketCard: {
		borderRadius: 16,
		backgroundColor: TICKET_TINT,
		overflow: 'hidden',
	},
	ticketTopRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		padding: 16,
	},
	ticketAvatar: {
		width: 56,
		height: 56,
		borderRadius: 9999,
		backgroundColor: '#ECE6FA',
		borderWidth: 3,
		borderColor: '#FFFFFF',
	},
	ticketDoctorName: {
		fontSize: 17,
		lineHeight: 22,
		fontWeight: '800',
		color: INK,
	},
	ticketDoctorSpec: {
		fontSize: 13,
		lineHeight: 18,
		fontWeight: '600',
		color: SPEC_TONE,
	},
	changeLink: {
		fontSize: 14,
		fontWeight: '700',
		color: PRIMARY,
	},
	ticketDivider: {
		height: 0,
		borderTopWidth: 2,
		borderTopColor: '#9FD3D1',
		borderStyle: 'dashed',
		marginHorizontal: 20,
	},
	ticketGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		padding: 16,
		gap: 12,
	},
	ticketGridCol: {
		width: '46%',
		flexGrow: 1,
		gap: 2,
	},
	ticketLabel: {
		fontSize: 12,
		lineHeight: 16,
		fontWeight: '700',
		letterSpacing: 0.48,
		color: PRIMARY,
	},
	ticketValueBig: {
		fontSize: 20,
		lineHeight: 26,
		fontWeight: '800',
		color: INK,
	},
	ticketValue: {
		fontSize: 15,
		lineHeight: 22,
		fontWeight: '700',
		color: INK,
	},
	ticketSub: {
		fontSize: 13,
		lineHeight: 18,
		color: INK_MUTED,
	},
	ticketPatientRow: {
		width: '100%',
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	ticketPatientAvatar: {
		width: 24,
		height: 24,
		borderRadius: 9999,
		backgroundColor: '#FFFFFF',
		alignItems: 'center',
		justifyContent: 'center',
	},
	ticketPatientInitials: {
		fontSize: 10,
		fontWeight: '800',
		color: PRIMARY,
	},
	ticketPatientText: {
		fontSize: 13,
		lineHeight: 18,
		color: INK,
	},
	ticketPatientName: {
		fontWeight: '700',
	},

	sectionTitle: {
		fontSize: 18,
		lineHeight: 26,
		fontWeight: '700',
		color: INK,
		marginBottom: 4,
	},
	billRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginTop: 8,
	},
	billText: {
		fontSize: 14,
		lineHeight: 20,
		color: INK,
	},
	strikeText: {
		fontSize: 12,
		color: '#aaa',
		textDecorationLine: 'line-through',
	},
	freeBadge: {
		backgroundColor: '#E8F5E9',
		borderRadius: 4,
		paddingHorizontal: 6,
		paddingVertical: 2,
	},
	freeText: {
		fontSize: 12,
		color: '#2E7D32',
		fontWeight: '700',
	},
	billDividerDashed: {
		borderTopWidth: 1,
		borderTopColor: '#7A8B8E',
		borderStyle: 'dashed',
		marginTop: 8,
		paddingTop: 4,
	},
	totalLabel: {
		fontSize: 18,
		lineHeight: 26,
		fontWeight: '800',
		color: INK,
	},
	totalValue: {
		fontSize: 22,
		fontWeight: '800',
		color: INK,
	},

	// Pay with
	payListCard: {
		borderRadius: 12,
		backgroundColor: '#fff',
		borderWidth: 1,
		borderColor: DIVIDER,
		overflow: 'hidden',
	},
	payRowWrap: {
		borderBottomWidth: 1,
		borderBottomColor: DIVIDER,
	},
	payRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		minHeight: 64,
		paddingHorizontal: 12,
	},
	payIconBox: {
		width: 40,
		height: 40,
		borderRadius: 8,
		backgroundColor: TICKET_TINT,
		alignItems: 'center',
		justifyContent: 'center',
	},
	payTitle: {
		fontSize: 16,
		lineHeight: 24,
		fontWeight: '600',
		color: INK,
	},
	paySubtitle: {
		fontSize: 13,
		lineHeight: 18,
		color: INK_MUTED,
	},
	paymentRowDisabled: {
		opacity: 0.45,
	},
	paymentLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	paymentText: {
		fontSize: 15,
		color: '#333',
	},
	paymentTextDisabled: {
		color: '#8b949e',
	},
	iconWrapper: {
		width: 28,
		height: 28,
		justifyContent: 'center',
		alignItems: 'center',
	},
	iconBordered: {
		borderWidth: 1,
		borderColor: '#eee',
		borderRadius: 8,
	},
	radioOuter: {
		width: 22,
		height: 22,
		borderRadius: 11,
		borderWidth: 2,
		borderColor: PRIMARY,
		justifyContent: 'center',
		alignItems: 'center',
	},
	radioOuterDisabled: {
		borderColor: '#9aa5ad',
	},
	radioInner: {
		width: 11,
		height: 11,
		borderRadius: 6,
		backgroundColor: PRIMARY,
	},
	encryptionRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 6,
		marginTop: 12,
		paddingHorizontal: 16,
	},
	encryptionText: {
		fontSize: 12,
		fontWeight: '500',
		color: INK_MUTED,
	},
	whatsappBox: {
		borderWidth: 1,
		borderColor: '#D8D8D8',
		borderRadius: 12,
		padding: 12,
		marginTop: 14,
	},
	whatsappRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	checkbox: {
		width: 24,
		height: 24,
		borderRadius: 6,
		borderWidth: 1.5,
		borderColor: '#2B7A78',
	},
	checkboxChecked: {
		backgroundColor: '#2B7A78',
		alignItems: 'center',
		justifyContent: 'center',
	},
	checkmark: {
		color: '#fff',
		fontWeight: '700',
	},
	subText: {
		fontSize: 12,
		color: '#888',
		marginTop: 6,
	},
	innerDivider: {
		borderTopWidth: 1,
		borderTopColor: '#eee',
		marginVertical: 10,
	},
	legalText: {
		fontSize: 11.5,
		color: '#999',
		lineHeight: 18,
		marginBottom: 4,
	},
	bottomBar: {
		position: 'absolute',
		bottom: 0,
		left: 0,
		right: 0,
		backgroundColor: '#fff',
		paddingHorizontal: 16,
		paddingVertical: 12,
		gap: 8,
		borderTopWidth: 1,
		borderTopColor: DIVIDER,
	},
	confirmBtn: {
		height: 52,
		backgroundColor: PRIMARY,
		borderRadius: 12,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
	},
	confirmText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: '600',
	},
	termsText: {
		textAlign: 'center',
		fontSize: 12,
		lineHeight: 16,
		color: INK_MUTED,
	},
	errorContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	errorText: {
		fontSize: 18,
		color: 'red',
		marginBottom: 16,
	},
	errorBack: {
		fontSize: 16,
		color: '#2B7A78',
		textDecorationLine: 'underline',
	},
})
