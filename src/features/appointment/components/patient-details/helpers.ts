// src/features/appointment/components/patient-details/helpers.ts
//
// Pure helpers for the patient appointment-details screen (design 7 / 7a):
// status → variant mapping and the status-timeline builder (generic date/time
// labels live in utils/date).

import type { Appointment, AppointmentHistoryEntry } from '../../../../types/appointment'
import type { AppTimelineStep } from '../../../../components/common'
import {
	combineDateTime,
	formatClock,
	fullDayLabel,
	relativeDayLabel,
	slotLabel,
	stampLabel,
} from '../../../../utils/date'

// Backend `GET /api/appointments/:id` returns a few keys the shared
// Appointment type doesn't declare (doctor.degree / doctor.speciality) and
// may later return payment/contact fields -- read them defensively.
export type PatientAppointment = Appointment & {
	doctor: Appointment['doctor'] & {
		degree?: string | null
		speciality?: string | null
		qualifications?: string | null
	}
	hospital:
		| (NonNullable<Appointment['hospital']> & {
				contact_number?: string | null
				phone?: string | null
		  })
		| null
	payment_status?: string | null
	is_paid?: boolean | null
	payment_method?: string | null
	transaction_id?: string | null
	payment?: { status?: string | null; method?: string | null; transaction_id?: string | null } | null
}

export type AppointmentVariant = 'upcoming' | 'pending' | 'cancelled' | 'completed' | 'rescheduled'

export const getRawStatus = (appt: Appointment | null): string => {
	if (!appt) return ''
	const s = appt.status
	if (typeof s === 'string') return s
	return s?.label ?? ''
}

export const getVariant = (rawStatus: string): AppointmentVariant => {
	const s = rawStatus
		.trim()
		.toLowerCase()
		.replace(/[\s-]+/g, '_')
	if (s === 'cancelled' || s === 'canceled' || s === 'rejected') return 'cancelled'
	if (s === 'completed' || s === 'done') return 'completed'
	if (s === 'pending' || s === 'payment_pending') return 'pending'
	if (s === 'rescheduled' || s === 'reschedule_required') return 'rescheduled'
	return 'upcoming'
}

export const isVideoMode = (mode?: string | null) => {
	const m = (mode || '').replace(/[-\s]/g, '_').toLowerCase()
	return ['online', 'video', 'virtual', 'teleconsultation', 'video_call', 'video_consultation'].includes(m)
}

export type PaymentState = 'paid' | 'pending' | 'unknown'

/** Only reports "paid" when the payload actually says so -- never invented. */
export const getPaymentState = (appt: PatientAppointment, variant: AppointmentVariant): PaymentState => {
	const explicit = (appt.payment_status ?? appt.payment?.status ?? '').toString().toLowerCase()
	if (appt.is_paid === true || ['paid', 'success', 'successful', 'completed', 'captured'].includes(explicit))
		return 'paid'
	if (appt.is_paid === false || ['pending', 'unpaid', 'failed', 'created'].includes(explicit)) return 'pending'
	if (variant === 'pending') return 'pending'
	return 'unknown'
}

// ── Dates ────────────────────────────────────────────────────────────────────
// Generic date/time labels live in utils/date; re-exported here so existing
// importers of './helpers' keep compiling.

export {
	combineDateTime,
	dayDiff,
	durationMinutes,
	parseDateOnly,
	slotLabel,
	startsInLabel,
} from '../../../../utils/date'

/** "Thu 25 Sep" (never prefixed with "Today, "). */
export const fullDay = (d: Date) => fullDayLabel(d, { markToday: false })

// ── Status timeline ──────────────────────────────────────────────────────────

const HISTORY_TITLES: Record<string, string> = {
	booked: 'Booked',
	created: 'Booked',
	confirmed: 'Confirmed',
	rescheduled: 'Rescheduled',
	cancelled: 'Cancelled',
	canceled: 'Cancelled',
	completed: 'Consultation',
	pending: 'Payment pending',
	paid: 'Payment received',
	payment_received: 'Payment received',
}

const historyTitle = (action: string) => {
	const a = action
		.trim()
		.toLowerCase()
		.replace(/[\s-]+/g, '_')
	if (HISTORY_TITLES[a]) return HISTORY_TITLES[a]
	const words = a.replace(/_/g, ' ')
	return words.charAt(0).toUpperCase() + words.slice(1)
}

type BuildTimelineArgs = {
	appt: PatientAppointment
	variant: AppointmentVariant
	isVideo: boolean
	payment: PaymentState
	isPast: boolean
}

export function buildTimeline({ appt, variant, isVideo, payment, isPast }: BuildTimelineArgs): AppTimelineStep[] {
	const history: AppointmentHistoryEntry[] = Array.isArray(appt.history) ? appt.history : []
	const steps: AppTimelineStep[] = []

	if (history.length) {
		history.forEach((h, i) => {
			const a = (h.action || '').toLowerCase()
			steps.push({
				key: `h-${i}`,
				title: historyTitle(h.action || ''),
				sub: stampLabel(h.created_at) || undefined,
				state: a === 'cancelled' || a === 'canceled' ? 'failed' : 'done',
			})
		})
	} else {
		steps.push({ key: 'booked', title: 'Booked', sub: stampLabel(appt.created_at) || undefined, state: 'done' })
		if (variant === 'cancelled') steps.push({ key: 'cancelled', title: 'Cancelled', state: 'failed' })
	}

	if (variant === 'cancelled') return steps

	const when = slotLabel(appt.appointment_date, appt.start_time)
	const start = combineDateTime(appt.appointment_date, appt.start_time)
	const checkInFrom = start ? new Date(start.getTime() - 10 * 60000) : null
	const hasPaymentStep = steps.some((s) => /payment/i.test(s.title))

	const future: AppTimelineStep[] = []
	if (payment === 'pending' && !hasPaymentStep) {
		future.push({ key: 'payment', title: 'Payment', sub: 'Pending', state: 'future' })
	}
	if (isVideo) {
		future.push({ key: 'call', title: 'Video call', sub: when, state: 'future' })
	} else {
		future.push({
			key: 'checkin',
			title: 'Check in at clinic',
			sub: checkInFrom ? `${relativeDayLabel(checkInFrom)}, from ${formatClock(checkInFrom)}` : undefined,
			state: 'future',
		})
		future.push({ key: 'consult', title: 'Consultation', sub: when, state: 'future' })
	}
	future.push({
		key: 'rx',
		title: 'Prescription & notes',
		sub: isVideo ? 'Added after the call' : 'Added after the visit',
		state: 'future',
	})

	if (variant === 'completed') {
		// Everything up to the consultation is done; notes are the live step.
		const doneFuture = future.filter((s) => s.key !== 'checkin' && s.key !== 'payment')
		const alreadyHasConsult = steps.some((s) => s.title === 'Consultation')
		return [
			...steps,
			...doneFuture
				.filter((s) => !(alreadyHasConsult && (s.key === 'consult' || s.key === 'call')))
				.map((s): AppTimelineStep =>
					s.key === 'rx' ? { ...s, sub: 'See your visit summary', state: 'current' } : { ...s, state: 'done' }
				),
		]
	}

	if (!isPast && future.length) future[0] = { ...future[0], state: 'current' }
	return [...steps, ...future]
}
