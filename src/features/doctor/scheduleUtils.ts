// src/features/doctor/scheduleUtils.ts
//
// Shared helpers for the doctor Schedule/appointment-action surfaces (DoctorScheduleScreen and,
// previously, DoctorAppointments.tsx — this file is the single home for them now so neither screen
// duplicates the other's slot-normalization logic). Kept generic enough to reuse for any future
// "pick a date/time to reschedule" flow (Pharmacy/Laboratory order rescheduling, etc.).

import type { SlotGroup } from './doctorService'
import type { Appointment } from '../../types/appointment'

export const statusLabelOf = (apt: Appointment): string =>
	typeof apt.status === 'string' ? apt.status : (apt.status?.label ?? 'pending')

export const isPending = (apt: Appointment): boolean => statusLabelOf(apt).toLowerCase() === 'pending'
export const isCompletedAppt = (apt: Appointment): boolean => statusLabelOf(apt).toLowerCase() === 'completed'

/** A reschedule the doctor still has to answer: status 'rescheduled' that the doctor did not make themselves
 * (a patient's request to move a booking; `rescheduled_by` comes from the appointments list). One the doctor
 * proposed is waiting on the patient, so it is not here. */
export const isRescheduleRequest = (apt: Appointment): boolean =>
	statusLabelOf(apt).toLowerCase() === 'rescheduled' && (apt.rescheduled_by ?? '').toLowerCase() !== 'doctor'

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
	}
	if (KNOWN[l]) return KNOWN[l]
	return l.charAt(0).toUpperCase() + l.slice(1).replace(/_/g, ' ')
}

/** Row status-chip tone for the real backend labels (including the not_arrived/checked_in pair) --
 * shared by DoctorHomeScreen (Up next/Later today) and DoctorScheduleScreen (Today/Past) so the
 * chip color for a given label can't drift between the two screens the way the display text once
 * did (see humanizeStatus above). Callers pass effectiveStatusLabel(apt), not the raw label. */
export function rowStatusTone(label: string): 'confirmed' | 'pending' | 'cancelled' | 'completed' | 'onTheWay' {
	const l = label.toLowerCase()
	if (l === 'checked_in') return 'confirmed'
	if (l === 'not_arrived') return 'onTheWay'
	if (l === 'completed' || l === 'confirmed' || l === 'cancelled' || l === 'pending') return l
	return 'confirmed'
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
