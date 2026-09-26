// src/features/appointment/components/patient-details/helpers.ts
//
// Pure helpers for the patient appointment-details screen (design 7 / 7a):
// status → variant mapping, date/time labels and the status-timeline builder.

import type { Appointment, AppointmentHistoryEntry } from '../../../../types/appointment'
import { formatTimeSlot } from '../../../../utils/formatters'

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

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export const parseDateOnly = (value?: string | null): Date | null => {
	if (!value) return null
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.split('T')[0])
	if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
	const parsed = new Date(value)
	return Number.isNaN(parsed.getTime()) ? null : parsed
}

export const combineDateTime = (date?: string | null, time?: string | null): Date | null => {
	const d = parseDateOnly(date)
	if (!d) return null
	const m = /^(\d{1,2}):(\d{2})/.exec(time ?? '')
	if (m) d.setHours(Number(m[1]), Number(m[2]), 0, 0)
	return d
}

export const toApiDate = (date: Date) =>
	`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())

export const dayDiff = (d: Date, from = new Date()) =>
	Math.round((startOfDay(d).getTime() - startOfDay(from).getTime()) / 86400000)

export const dowShort = (d: Date) => DOW[d.getDay()]
export const monthShort = (d: Date) => MONTHS[d.getMonth()]

/** "Thu 25 Sep" */
export const fullDay = (d: Date) => `${DOW[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`

/** "Today" / "Tomorrow" / "Sat 27 Sep" */
export const relativeDay = (d: Date) => {
	const diff = dayDiff(d)
	if (diff === 0) return 'Today'
	if (diff === 1) return 'Tomorrow'
	return fullDay(d)
}

export const formatClock = (d: Date) => {
	const h = d.getHours()
	return `${h % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

export const timeLabel = (t?: string | null) => (t ? formatTimeSlot(t) : '')

/** "Today, 5:30 PM" for a date + HH:mm:ss pair. */
export const slotLabel = (date?: string | null, time?: string | null) => {
	const d = parseDateOnly(date)
	if (!d) return '—'
	const t = timeLabel(time)
	return t ? `${relativeDay(d)}, ${t}` : relativeDay(d)
}

/** "Wed 24 Sep, 6:12 PM" / "Today, 10:05 AM" for an ISO timestamp. */
export const stampLabel = (iso?: string | null) => {
	if (!iso) return ''
	const d = new Date(iso)
	if (Number.isNaN(d.getTime())) return ''
	return `${relativeDay(d)}, ${formatClock(d)}`
}

export const startsInLabel = (target: Date | null): string | null => {
	if (!target) return null
	const ms = target.getTime() - Date.now()
	if (ms <= 0) return null
	const mins = Math.round(ms / 60000)
	if (mins < 60) return `starts in ${mins} min`
	const days = dayDiff(target)
	if (days >= 1) return `starts in ${days} ${days === 1 ? 'day' : 'days'}`
	const hrs = Math.floor(mins / 60)
	const rem = mins % 60
	return `starts in ${hrs} ${hrs === 1 ? 'hr' : 'hrs'}${rem ? ` ${rem} min` : ''}`
}

export const durationMinutes = (start?: string | null, end?: string | null) => {
	const s = /^(\d{1,2}):(\d{2})/.exec(start ?? '')
	const e = /^(\d{1,2}):(\d{2})/.exec(end ?? '')
	if (!s || !e) return null
	const diff = Number(e[1]) * 60 + Number(e[2]) - (Number(s[1]) * 60 + Number(s[2]))
	return diff > 0 ? diff : null
}

// ── Status timeline ──────────────────────────────────────────────────────────

export type TimelineState = 'done' | 'current' | 'future' | 'failed'

export type TimelineStep = { key: string; title: string; sub?: string; state: TimelineState }

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

export function buildTimeline({ appt, variant, isVideo, payment, isPast }: BuildTimelineArgs): TimelineStep[] {
	const history: AppointmentHistoryEntry[] = Array.isArray(appt.history) ? appt.history : []
	const steps: TimelineStep[] = []

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

	const future: TimelineStep[] = []
	if (payment === 'pending' && !hasPaymentStep) {
		future.push({ key: 'payment', title: 'Payment', sub: 'Pending', state: 'future' })
	}
	if (isVideo) {
		future.push({ key: 'call', title: 'Video call', sub: when, state: 'future' })
	} else {
		future.push({
			key: 'checkin',
			title: 'Check in at clinic',
			sub: checkInFrom ? `${relativeDay(checkInFrom)}, from ${formatClock(checkInFrom)}` : undefined,
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
				.map((s): TimelineStep =>
					s.key === 'rx' ? { ...s, sub: 'See your visit summary', state: 'current' } : { ...s, state: 'done' }
				),
		]
	}

	if (!isPast && future.length) future[0] = { ...future[0], state: 'current' }
	return [...steps, ...future]
}
