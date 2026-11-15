// features/appointment/statusReason.ts
//
// Why an appointment was cancelled or moved, in the words of the person who did it, for BOTH the patient and the doctor. The backend
// sends `status_reason` (what they wrote) and `status_reason_title` ("Cancelled by you", "Cancelled by the doctor", "Rescheduled by the
// patient"...) on every appointment, list rows and the detail: the title is already worded for whoever is asking, and only for the
// states a person explains (cancelled, rescheduled, reschedule_required; see health_care_backend/CLAUDE.md). This only pairs them.

import type { Appointment } from '../../types/appointment'

export type StatusReasonCopy = { title: string; reason: string }

/** The title and the reason of an appointment that was cancelled or moved, or null when it has none. */
export const statusReasonCopy = (
	appt: Pick<Appointment, 'status_reason' | 'status_reason_title'> | null | undefined
): StatusReasonCopy | null => {
	const reason = (appt?.status_reason ?? '').trim()
	const title = (appt?.status_reason_title ?? '').trim()
	return reason && title ? { title, reason } : null
}
