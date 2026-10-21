// src/features/patient-payment/AppointmentConfirmedPage.tsx
//
// "6 · Appointment confirmed" -- reached after a successful booking + pre-intake
// step in PatientPayment.tsx. Success hero with confetti, an overlapping ticket
// card, a "before your visit" timeline (video variant: "Get ready for the call"),
// the payment line and footer actions (home / Appointment Details). The layout is
// the shared AppBookingSuccess; this screen only supplies the appointment content.

import React from 'react'
import { StyleSheet } from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import type { NavigationProp, RouteProp } from '@react-navigation/native'
import { ROUTES } from '../../navigation/routes'
import type { AppStackParamList } from '../../navigation/types'
import { addToCalendar } from '../../utils/calendar'
import { combineDateTime } from '../../utils/date'
import { openDirections } from '../../utils/maps'
import { buildS3Url } from '../../utils/s3Utils'
import { showComingSoon } from '../../utils/toast'
import { TONES, formatInr } from '../../config/theme'
import { AppActionChip, AppAvatar, AppBookingSuccess, AppTag } from '../../components/common'
import { getPrepSteps, getPrepStepsTitle } from '../appointment/prepSteps'

/** "Today, Thu 24 Sep" -> "today"; "Tomorrow, …" -> "tomorrow"; otherwise "on {date}". */
const relativeDayPhrase = (dateDisplay: string) => {
	const lower = dateDisplay.trim().toLowerCase()
	if (lower.startsWith('today')) return 'today'
	if (lower.startsWith('tomorrow')) return 'tomorrow'
	return dateDisplay ? `on ${dateDisplay}` : ''
}

export default function AppointmentConfirmedPage() {
	const navigation = useNavigation<NavigationProp<AppStackParamList>>()
	const route = useRoute<RouteProp<AppStackParamList, typeof ROUTES.STACK.APPOINTMENT_CONFIRMED>>()
	const params = route.params

	const isVideo = params.appointmentMode === 'video_call'
	const isPayAtClinic = params.paymentMethodLabel === 'Pay at clinic'
	const feeText = formatInr(params.fee) === '--' ? `₹${params.fee}` : formatInr(params.fee)
	const avatarUri = buildS3Url(params.doctorAvatar)
	const doctorInitial = params.doctorName?.replace(/^Dr\.?\s*/i, '').charAt(0) || 'D'

	const dayPhrase = relativeDayPhrase(params.dateDisplay)
	const sentence = [
		'See you',
		dayPhrase,
		params.timeDisplay ? `at ${params.timeDisplay}` : '',
		isVideo ? 'for your video call' : params.hospitalName ? `at the ${params.hospitalName}` : '',
	]
		.filter(Boolean)
		.join(' ')

	return (
		<AppBookingSuccess
			badge={`${isPayAtClinic ? 'Pay at clinic' : 'Payment successful'} · ${feeText}`}
			title="You're all booked"
			subtitle={`${sentence}.`}
			ticket={{
				header: {
					leading: (
						<AppAvatar
							uri={avatarUri}
							name={doctorInitial}
							size={52}
							backgroundColor={TONES.lilac.bg}
							initialsColor={TONES.lilac.ink}
							initialsStyle={styles.avatarInitial}
						/>
					),
					title: params.doctorName,
					subtitle: [params.doctorSpecialty, isVideo ? 'Video call' : 'In-clinic'].filter(Boolean).join(' · '),
					trailing: (
						<AppTag
							label="Confirmed"
							tone="confirmed"
							shape="pill"
							style={styles.confirmedPill}
							textStyle={styles.pillTextHeavy}
						/>
					),
				},
				fields: [
					{ label: 'When', value: params.timeDisplay, sub: params.dateDisplay, emphasis: true },
					{
						label: 'Booking ID',
						value: params.appointmentId,
						sub: `For ${params.patientName}`,
						ellipsize: 'middle',
					},
					{
						label: 'Where',
						value: isVideo ? 'Video consultation' : params.hospitalName,
						sub: isVideo ? 'In the Karolahealth app' : params.hospitalAddress || undefined,
						full: true,
					},
				],
				actions: (
					<>
						<AppActionChip
							label="Add to calendar"
							icon="calendar-blank-outline"
							variant="tinted"
							tone="mint"
							style={styles.flex}
							onPress={() => {
								const start = combineDateTime(params.appointmentDate, params.startTime)
								if (!start) return showComingSoon()
								void addToCalendar({
									title: isVideo
										? `Video consultation with ${params.doctorName}`
										: `Appointment with ${params.doctorName}`,
									start,
									end: combineDateTime(params.appointmentDate, params.endTime),
									location: isVideo
										? 'Video consultation (KarolaHealth app)'
										: [params.hospitalName, params.hospitalAddress].filter(Boolean).join(', '),
									notes: `Booked on KarolaHealth. Patient: ${params.patientName}.`,
								})
							}}
						/>
						{!isVideo && (
							<AppActionChip
								label="Directions"
								icon="navigation-variant-outline"
								variant="tinted"
								tone="sky"
								style={styles.flex}
								onPress={() =>
									openDirections(
										params.hospitalLatitude,
										params.hospitalLongitude,
										params.hospitalAddress,
										params.hospitalName
									)
								}
							/>
						)}
					</>
				),
			}}
			stepsTitle={getPrepStepsTitle(isVideo)}
			steps={getPrepSteps(isVideo, 'confirmed')}
			// Real fee + selected method; no transaction id exists yet.
			paymentText={isPayAtClinic ? `${feeText} to pay at the clinic` : `${feeText} paid via ${params.paymentMethodLabel}`}
			onReceiptPress={() => showComingSoon()}
			secondary={{
				label: 'Back to home',
				onPress: () => navigation.navigate(ROUTES.MAIN.TABS, { screen: ROUTES.MAIN.HOME }),
			}}
			primary={{
				label: 'View appointment',
				onPress: () => navigation.navigate(ROUTES.STACK.APPOINTMENT_DETAILS, { appointmentId: params.appointmentId }),
			}}
		/>
	)
}

const styles = StyleSheet.create({
	flex: { flex: 1 },
	avatarInitial: { fontSize: 18, fontWeight: '700' },
	// Vertically centred in the ticket header row (AppTag defaults to alignSelf: 'flex-start')
	confirmedPill: { alignSelf: 'center' },
	pillTextHeavy: { fontWeight: '800' },
})

