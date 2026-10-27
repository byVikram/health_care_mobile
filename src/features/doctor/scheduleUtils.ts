// src/features/doctor/scheduleUtils.ts
//
// Shared helpers for the doctor Schedule/appointment-action surfaces (DoctorScheduleScreen and the
// other doctor screens that act on an appointment). Kept generic enough to reuse for any future
// "pick a date/time to reschedule" flow (Pharmacy/Laboratory order rescheduling, etc.).

import type { SlotGroup } from './doctorService'
import type { Appointment } from '../../types/appointment'

export const statusLabelOf = (apt: Appointment): string =>
	typeof apt.status === 'string' ? apt.status : (apt.status?.label ?? 'pending')

export const isPending = (apt: Appointment): boolean => statusLabelOf(apt).toLowerCase() === 'pending'
export const isCompletedAppt = (apt: Appointment): boolean => statusLabelOf(apt).toLowerCase() === 'completed'

/** The doctor marked this appointment a no-show (patient no-show policy). */
export const isNoShowAppt = (apt: Appointment): boolean => statusLabelOf(apt).toLowerCase() === 'no_show'

/** A reschedule the doctor still has to answer: status 'rescheduled' that the doctor did not make themselves
 * (a patient's request to move a booking; `rescheduled_by` comes from the appointments list). One the doctor
 * proposed is waiting on the patient, so it is not here. */
export const isRescheduleRequest = (apt: Appointment): boolean =>
	statusLabelOf(apt).toLowerCase() === 'rescheduled' && (apt.rescheduled_by ?? '').toLowerCase() !== 'doctor'

/** A doctor asked the patient to choose a new time (status 'reschedule_required'): the patient has to pick the slot,
 * then it comes back as a 'rescheduled' request for the doctor to confirm. Nothing for the doctor to do meanwhile. */
export const isRescheduleNeeded = (apt: Appointment): boolean => statusLabelOf(apt).toLowerCase() === 'reschedule_required'

/** What the Requests tab lists: a new pending request, or a patient's reschedule request. */
export const isRequestLike = (apt: Appointment): boolean => isPending(apt) || isRescheduleRequest(apt)

/**
 * "Accepted" = the doctor has already acted on this booking (confirmed it) -- also covers the two
 * states a confirmed appointment moves through on its own day (not_arrived via the daily cron,
 * checked_in once the doctor taps Check In), so a confirmed appointment doesn't silently disappear
 * from Today/Up-next the moment the not-arrived job or a check-in flips its status. Shared by
 * DoctorHomeScreen (Up next/Later today) and DoctorScheduleScreen (Today/Requests/Upcoming/Past) so
 * the categorization rule can't drift between the two screens: Requests = isPending only, regardless
 * of date; Today/Upcoming = isAccepted (never pending, even if dated today/this week); Past =
 * isCompletedAppt or isAccepted (never a pending request that just aged into the past).
 */
export const ACCEPTED_STATUSES = ['confirmed', 'not_arrived', 'checked_in']
export const isAccepted = (apt: Appointment): boolean => ACCEPTED_STATUSES.includes(statusLabelOf(apt).toLowerCase())

function todayIsoLocal() {
	const d = new Date()
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * The status label to actually DISPLAY (and to gate the Check In action on) for a same-day
 * confirmed appointment: "not_arrived", not "confirmed" -- even though the real DB row may still
 * literally say 'confirmed'. The real not_arrived flip only happens via the backend's daily
 * process-not-arrived job, which needs an external scheduler configured (AWS EventBridge / cron)
 * to ever run -- on a day it hasn't run yet (or was never wired up), this keeps the UI honest about
 * "this patient hasn't checked in" without waiting on that ops dependency. The backend's
 * check_in_appointment endpoint accepts a same-day 'confirmed' status for exactly this reason, so
 * a Check In tap driven by this effective label always succeeds. Anything else (a different date,
 * a different status) passes through unchanged.
 */
export const effectiveStatusLabel = (apt: Appointment): string => {
	const label = statusLabelOf(apt).toLowerCase()
	if (label === 'confirmed' && apt.appointment_date === todayIsoLocal()) return 'not_arrived'
	return label
}

/** Status TEXT for display -- the backend label is snake_case ("not_arrived", "checked_in"); the
 * design shows a plain human phrase ("Not arrived", "Checked in"), never the raw label. */
export function humanizeStatus(label: string): string {
	const l = label.toLowerCase()
	const KNOWN: Record<string, string> = {
		not_arrived: 'Not arrived',
		checked_in: 'Checked in',
		confirmed: 'Confirmed',
		completed: 'Completed',
		pending: 'Pending',
		cancelled: 'Cancelled',
		rescheduled: 'Rescheduled',
		reschedule_required: 'Reschedule needed',
		no_show: 'No-show',
	}
	if (KNOWN[l]) return KNOWN[l]
	return l.charAt(0).toUpperCase() + l.slice(1).replace(/_/g, ' ')
}

/** Row status-chip tone for the real backend labels (including the not_arrived/checked_in pair) --
 * shared by DoctorHomeScreen (Up next/Later today) and DoctorScheduleScreen (Today/Past) so the
 * chip color for a given label can't drift between the two screens the way the display text once
 * did (see humanizeStatus above). Callers pass effectiveStatusLabel(apt), not the raw label. */
export function rowStatusTone(label: string): 'confirmed' | 'pending' | 'cancelled' | 'completed' | 'onTheWay' | 'sand' {
	const l = label.toLowerCase()
	if (l === 'no_show') return 'sand'
	if (l === 'checked_in') return 'confirmed'
	if (l === 'not_arrived') return 'onTheWay'
	if (l === 'completed' || l === 'confirmed' || l === 'cancelled' || l === 'pending') return l
	return 'confirmed'
}

// Patient no-show policy: a doctor may mark a no-show only from 60 minutes after the appointment's start until 5 days
// after it. The server enforces the same rule (and answers 400 with the reason), these are the numbers it uses.
export const NO_SHOW_MIN_MINUTES_AFTER_START = 60
export const NO_SHOW_MARK_WINDOW_DAYS = 5

/** The only states the server lets a doctor mark a no-show from (a checked-in patient did show up). */
export const NO_SHOW_SOURCE_STATUSES = ['confirmed', 'not_arrived']

/** The clinic's UTC offset: appointment dates and times are clinic wall-clock time (IST, UTC+05:30, no daylight saving) -- the
 * zone the server applies the no-show rule in -- whatever time zone the device is set to. */
const CLINIC_UTC_OFFSET_MINUTES = 330

/** The clinic's current date (YYYY-MM-DD) and time (HH:MM:SS), in Mumbai time whatever the phone's time zone is set to: what
 * appointment_date and start_time are compared with. (Shifted by the clinic's offset, the UTC fields read as clinic wall-clock time.) */
const clinicClock = (): string => new Date(Date.now() + CLINIC_UTC_OFFSET_MINUTES * 60_000).toISOString()
export const clinicTodayIso = (): string => clinicClock().slice(0, 10)
export const clinicNowHms = (): string => clinicClock().slice(11, 19)

/** Appointment start as an absolute time (ms since the epoch), read in the clinic's time zone. */
function appointmentStartMs(apt: Appointment): number | null {
	const [y, mo, d] = (apt.appointment_date ?? '').split('-').map(Number)
	const [h, mi] = (apt.start_time ?? '').split(':').map(Number)
	if (!y || !mo || !d || Number.isNaN(h) || Number.isNaN(mi)) return null
	return Date.UTC(y, mo - 1, d, h, mi, 0, 0) - CLINIC_UTC_OFFSET_MINUTES * 60_000
}

export type NoShowWindow = {
	/** The "Mark as no-show" control is enabled. */
	canMark: boolean
	/** Short reason shown under the disabled control; empty while it is enabled. */
	hint: string
	/** The 5 days are over: nothing can be marked any more. */
	expired: boolean
}

/** Whether the doctor may mark this appointment a no-show right now (the clock vs the appointment's start in clinic time). */
export function noShowWindow(apt: Appointment, now: Date = new Date()): NoShowWindow {
	const start = appointmentStartMs(apt)
	if (start === null) return { canMark: false, hint: 'Can be marked 1 hour after the start', expired: false }
	const earliest = start + NO_SHOW_MIN_MINUTES_AFTER_START * 60_000
	const latest = start + NO_SHOW_MARK_WINDOW_DAYS * 24 * 60 * 60_000
	if (now.getTime() < earliest) return { canMark: false, hint: 'Can be marked 1 hour after the start', expired: false }
	if (now.getTime() > latest) return { canMark: false, hint: 'No-show can only be marked within 5 days', expired: true }
	return { canMark: true, hint: '', expired: false }
}

export const formatTime12h = (t?: string | null): string => {
	if (!t) return '--'
	const [h, m] = t.split(':').map(Number)
	const suffix = h >= 12 ? 'PM' : 'AM'
	const hour = h > 12 ? h - 12 : h === 0 ? 12 : h
	return `${hour}:${String(m).padStart(2, '0')} ${suffix}`
}

export const isVideoMode = (mode?: string | null): boolean => mode === 'video_call' || mode === 'video call'

export const toApiDate = (date: Date) => {
	const year = date.getFullYear()
	const month = String(date.getMonth() + 1).padStart(2, '0')
	const day = String(date.getDate()).padStart(2, '0')
	return `${year}-${month}-${day}`
}

export const getRescheduleModeKey = (appointmentType: 'clinic' | 'video') =>
	appointmentType === 'video' ? 'video_call' : 'clinic_visit'

const getSlotStatus = (slot: any) => {
	const status = typeof slot.status === 'string' ? slot.status.toUpperCase() : ''

	if (slot.is_booked || status === 'OCCUPIED') return 'OCCUPIED'
	if (slot.is_enabled === false || status === 'UNAVAILABLE') return 'UNAVAILABLE'
	if (status === 'BLOCKED') return 'BLOCKED'
	if (status === 'BOOKED') return 'BOOKED'
	return 'AVAILABLE'
}

export const normalizeAvailabilitySlots = (response: any, appointmentType: 'clinic' | 'video'): SlotGroup[] => {
	const rawData = Array.isArray(response) ? response : Array.isArray(response?.data) ? response.data : []
	const modeKey = getRescheduleModeKey(appointmentType)

	return rawData
		.filter((item: any) => !item.appointment_mode || item.appointment_mode.toLowerCase() === modeKey)
		.flatMap((item: any, itemIndex: number) => {
			const sessions =
				Array.isArray(item.sessions) && item.sessions.length > 0
					? item.sessions
					: [{ label: item.label, range: item.range, period: item.period, slots: item.slots }]

			return sessions
				.map((session: any, sessionIndex: number): SlotGroup => {
					const label = session.label || `Session ${sessionIndex + 1}`
					return {
						label,
						range: session.range,
						period: session.period || session.range,
						slots: (session.slots ?? [])
							.filter((slot: any) => Boolean(slot.start_time && slot.end_time))
							.map((slot: any, slotIndex: number) => ({
								id: `${modeKey}-${itemIndex}-${label}-${slot.start_time}-${slotIndex}`,
								start_time: slot.start_time as string,
								end_time: slot.end_time as string,
								status: getSlotStatus(slot),
								is_enabled: slot.is_enabled,
								is_booked: slot.is_booked,
								can_toggle: slot.is_enabled === false ? false : slot.can_toggle,
							})),
					}
				})
				.filter((session: any) => session.slots.length > 0)
		})
}
