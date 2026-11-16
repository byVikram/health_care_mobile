// src/features/doctor/dashboard/DoctorPastVisitPage.tsx
//
// A past visit that was not seen, from the "Doctor Dashboard NEW" design (the Past list opens it from a row's status):
//   noshow    "Missed appointment": a "Patient didn't arrive" note with the time it was marked, "Booking", and "What happened" (the
//             appointment's own history, one line per step)
//   cancelled "Cancelled appointment": who cancelled it and the reason they gave (the server words it for the doctor: "Cancelled by
//             you" / "Cancelled by the patient"), then "Booking" and "What happened"
//   other     "Appointment": one that was moved or is waiting for the patient to pick a new time (the reason is the one given when it
//             was moved, in the server's words for the doctor), then "Booking" and "What happened"
//   referred  "Referred visit": "Referred to Dr. ..." with where the referral stands, "Reason for visit" and "Why referred" (the note
//             the doctor wrote)
// A seen visit does not come here: its row opens the saved consultation (read-only), as before.
// Built from what the server has: the appointment (with its history) and, for a referral, the referral. Not drawn because nothing
// behind them exists: the reminder SMS / front-desk call steps, "Next step" (last visit, call patient, send rebook link), "Shared with
// Dr. ..." and "Advice given", the Patient file, Message and Reschedule buttons (a missed appointment cannot be moved).

import React, { useEffect, useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import type { NavigationProp, RouteProp } from '@react-navigation/native'
import { AppAvatar, AppInfoBanner, AppSoftCard, AppTag } from '../../../components/common'
import { APP_COLORS, TONES } from '../../../config/theme'
import { ROUTES } from '../../../navigation/routes'
import type { AppStackParamList } from '../../../navigation/types'
import { getAppointmentById } from '../../../services/appointmentService'
import { getReferralDetail, type Referral, type ReferralStatus } from '../../referrals/referralService'
import { buildS3Url } from '../../../utils/s3Utils'
import {
	clinicDateIso,
	clinicTimeHm,
	dateLabelOf,
	formatTime12h,
	humanizeStatus,
	isVideoMode,
	MON_SHORT,
	statusLabelOf,
} from '../scheduleUtils'
import { DoctorScreenHeader } from './DoctorScreenHeader'
import type { Appointment, AppointmentHistoryEntry } from '../../../types/appointment'

/** An ISO timestamp from the server (UTC, with or without the Z) as a Date. */
const toDate = (iso: string) => new Date(/(Z|[+-]\d\d:?\d\d)$/.test(iso) ? iso : `${iso}Z`)

/** "5:15 PM" for a moment on the clinic's clock. */
const clockOf = (iso: string) => formatTime12h(clinicTimeHm(toDate(iso)))

/** "19 Sep" for a moment on the clinic's calendar. */
const dayOf = (iso: string) => {
	const [, m, d] = clinicDateIso(toDate(iso)).split('-').map(Number)
	return `${d} ${MON_SHORT[m - 1]}`
}

// What each history action reads as in "What happened" (an action not listed is skipped: `delayed` is an email-only update).
const STEP_LABELS: Record<string, string> = {
	created: 'booked',
	confirmed: 'confirmed',
	rescheduled: 'moved to a new time',
	reschedule_required: 'asked to choose a new time',
	not_arrived: 'marked not arrived',
	checked_in: 'checked in',
	no_show: 'marked no-show',
	cancelled: 'cancelled',
}

const ACTOR: Record<string, string> = { doctor: 'by the doctor', patient: 'by the patient', system: 'automatically' }

function stepLines(history: AppointmentHistoryEntry[], slotDay: string): string[] {
	return [...history]
		.filter((h) => STEP_LABELS[h.action])
		.sort((a, b) => toDate(a.created_at).getTime() - toDate(b.created_at).getTime())
		.map((h) => {
			const sameDay = clinicDateIso(toDate(h.created_at)) === slotDay
			const when = sameDay ? clockOf(h.created_at) : `${dayOf(h.created_at)}, ${clockOf(h.created_at)}`
			const who = ACTOR[h.actor_type] ? ` · ${ACTOR[h.actor_type]}` : ''
			return `${when} — ${STEP_LABELS[h.action]}${who}`
		})
}

/** Where a referral stands, in a few words. */
function referralStanding(referral: Referral): string {
	const booked = referral.referred_appointment
	const map: Record<ReferralStatus, string> = {
		pending: 'waiting for the patient to book',
		appointment_booked: booked
			? `accepted, appointment ${dateLabelOf(booked.appointment_date)}, ${formatTime12h(booked.start_time)}`
			: 'the patient has booked',
		completed: 'seen by the specialist',
		cancelled: 'cancelled',
	}
	return map[referral.status] ?? referral.status
}

function Section({ title, caption, children }: { title: string; caption?: string; children: React.ReactNode }) {
	return (
		<AppSoftCard padding={14} radius={14} style={{ gap: 10 }}>
			<View style={styles.sectionHead}>
				<Text style={styles.sectionTitle}>{title}</Text>
				{!!caption && <Text style={styles.sectionCaption}>{caption}</Text>}
			</View>
			{children}
		</AppSoftCard>
	)
}

export default function DoctorPastVisitPage() {
	const navigation = useNavigation<NavigationProp<AppStackParamList>>()
	const { params } = useRoute<RouteProp<AppStackParamList, typeof ROUTES.STACK.DOCTOR_PAST_VISIT>>()
	const referredView = params.kind === 'referred'
	const cancelledView = params.kind === 'cancelled'
	const otherView = params.kind === 'other'

	const [appt, setAppt] = useState<Appointment | null>(null)
	const [referral, setReferral] = useState<Referral | null>(null)
	const [loading, setLoading] = useState(true)
	const [failed, setFailed] = useState(false)

	useEffect(() => {
		let live = true
		setLoading(true)
		Promise.all([
			getAppointmentById(params.appointmentId),
			referredView && params.referralId ? getReferralDetail(params.referralId) : Promise.resolve(null),
		])
			.then(([a, r]) => {
				if (!live) return
				setAppt(a as Appointment)
				setReferral(r)
				setFailed(false)
			})
			.catch(() => live && setFailed(true))
			.finally(() => live && setLoading(false))
		return () => {
			live = false
		}
	}, [params.appointmentId, params.referralId, referredView])

	const patient = appt?.patient
	const reason = appt?.symptoms || appt?.pre_intake?.symptoms || appt?.reason || null
	const video = isVideoMode(appt?.appointment_mode)
	const subtitle = appt
		? [
				`${dateLabelOf(appt.appointment_date)} · ${formatTime12h(appt.start_time)}`,
				params.token,
				video ? 'Video' : 'In-clinic',
			]
				.filter(Boolean)
				.join(' · ')
		: undefined

	// The note under "Patient didn't arrive": when the no-show was marked, and how long after the slot.
	const marked = [...(appt?.history ?? [])].reverse().find((h) => h.action === 'no_show')
	const markedLine = (() => {
		// No no-show step in the history: the day ended with nobody checked in, and the list counts it as a no-show.
		if (!marked || !appt) return 'The patient was not checked in for this visit.'
		const slot = new Date(`${appt.appointment_date}T${(appt.start_time ?? '00:00').slice(0, 5)}:00`)
		const at = new Date(`${clinicDateIso(toDate(marked.created_at))}T${clinicTimeHm(toDate(marked.created_at))}:00`)
		const late = Math.round((at.getTime() - slot.getTime()) / 60000)
		return `Marked no-show at ${clockOf(marked.created_at)}${late > 0 ? ` · ${late} min after the slot` : ''}.`
	})()

	return (
		<View style={styles.screen}>
			<DoctorScreenHeader
				variant="simple"
				title={
					referredView
						? 'Referred visit'
						: cancelledView
							? 'Cancelled appointment'
							: otherView
								? 'Appointment'
								: 'Missed appointment'
				}
				subtitle={subtitle}
				onBack={() => navigation.goBack()}
				rightAccessory={
					referredView ? (
						<AppTag label="Referred" tone="lilac" shape="pill" />
					) : cancelledView ? (
						<AppTag label="Cancelled" tone="cancelled" shape="pill" />
					) : otherView ? (
						!!appt && <AppTag label={humanizeStatus(statusLabelOf(appt))} tone="sky" shape="pill" />
					) : (
						<AppTag label="No-show" tone="sand" shape="pill" />
					)
				}
			>
				{!!patient && (
					<View style={styles.patient}>
						<AppAvatar
							uri={buildS3Url(patient.avatar_s3_key)}
							name={patient.name}
							size={40}
							backgroundColor={APP_COLORS.mintAccent}
							initialsColor={APP_COLORS.ink}
						/>
						<View style={{ flex: 1, minWidth: 0 }}>
							<Text style={styles.patientName} numberOfLines={1}>
								{patient.name}
							</Text>
							<Text style={styles.patientMeta} numberOfLines={1}>
								{[patient.age ? `${patient.age} yrs` : null, patient.gender, reason]
									.filter(Boolean)
									.join(' · ')}
							</Text>
						</View>
					</View>
				)}
			</DoctorScreenHeader>

			{loading ? (
				<ActivityIndicator style={{ marginTop: 40 }} color={APP_COLORS.primary} />
			) : failed || !appt ? (
				<Text style={styles.error}>Couldn’t load this visit. Go back and try again.</Text>
			) : (
				<ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
					{!referredView && (
						<>
							{cancelledView || otherView ? (
								<AppInfoBanner
									tone={cancelledView ? 'danger' : 'info'}
									icon={null}
									title={
										appt.status_reason_title ||
										(cancelledView
											? 'Appointment cancelled'
											: statusLabelOf(appt).toLowerCase() === 'rescheduled'
												? 'Moved to a new time'
												: statusLabelOf(appt).toLowerCase() === 'reschedule_required'
													? 'Waiting for the patient to pick a new time'
													: ['confirmed', 'not_arrived'].includes(
																statusLabelOf(appt).toLowerCase()
														  )
														? 'The patient has not been marked as arrived'
														: humanizeStatus(statusLabelOf(appt)))
									}
									subtitle={appt.status_reason?.trim() || undefined}
								/>
							) : (
								<AppInfoBanner
									tone="warning"
									icon={null}
									title="Patient didn’t arrive"
									subtitle={markedLine}
								/>
							)}
							<Section title="Booking">
								<Text style={styles.text}>
									{reason ?? 'Appointment'}
									{appt.created_at ? ` · booked ${dayOf(appt.created_at)}` : ''}.
								</Text>
							</Section>
							{stepLines(appt.history ?? [], appt.appointment_date).length > 0 && (
								<Section title="What happened">
									<View style={{ gap: 8 }}>
										{stepLines(appt.history ?? [], appt.appointment_date).map((line, i) => (
											<Text key={i} style={styles.step}>
												• {line}
											</Text>
										))}
									</View>
								</Section>
							)}
						</>
					)}

					{referredView && (
						<>
							{referral ? (
								<AppInfoBanner
									tone="info"
									icon={null}
									title={`Referred to ${referral.referred_doctor?.name ?? 'another doctor'}`}
									subtitle={`${dayOf(referral.created_at)}, ${clockOf(referral.created_at)} · ${referralStanding(referral)}`}
									style={{ backgroundColor: TONES.lilac.bg }}
									titleStyle={{ color: TONES.lilac.ink }}
								/>
							) : (
								<Text style={styles.error}>The referral for this visit could not be found.</Text>
							)}
							{!!reason && (
								<Section title="Reason for visit" caption="Shared at booking">
									<Text style={styles.text}>“{reason}”</Text>
								</Section>
							)}
							{!!referral?.notes?.trim() && (
								<Section title="Why referred" caption="Your note">
									<Text style={styles.text}>{referral.notes}</Text>
								</Section>
							)}
						</>
					)}
				</ScrollView>
			)}
		</View>
	)
}

const styles = StyleSheet.create({
	screen: { flex: 1, backgroundColor: APP_COLORS.pageBg },
	body: { gap: 12, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 32 },
	patient: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		padding: 10,
		borderRadius: 14,
		backgroundColor: '#FFFFFF14',
	},
	patientName: { fontSize: 15, lineHeight: 20, fontWeight: '800', color: '#FFFFFF' },
	patientMeta: { fontSize: 12, lineHeight: 16, color: APP_COLORS.mint },
	sectionHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
	sectionTitle: { fontSize: 15, lineHeight: 20, fontWeight: '800', color: APP_COLORS.ink },
	sectionCaption: { fontSize: 11, lineHeight: 14, fontWeight: '700', color: APP_COLORS.inkMuted },
	text: { fontSize: 14, lineHeight: 21, color: APP_COLORS.ink },
	step: { fontSize: 13, lineHeight: 18, color: APP_COLORS.ink },
	error: { padding: 24, textAlign: 'center', fontSize: 14, lineHeight: 20, color: APP_COLORS.inkMuted },
})
