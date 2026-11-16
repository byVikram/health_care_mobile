// src/features/doctor/waitingRequests.ts
//
// "The requests waiting for the doctor": the ONE definition behind the Schedule tab's "N booking requests" banner and Booking requests
// page.
// A request is a new booking nobody has answered, or a reschedule the patient asked for (isRequestLike), on any date still to come,
// at the chosen clinic; one the doctor has already referred is answered ("the request closes as Referred") and is not waiting.

import type { Appointment } from '../../types/appointment'
import { getReferralsSent, type Referral } from '../referrals/referralService'
import { getAllAppointments } from './doctorService'
import { isRequestLike } from './scheduleUtils'

/** Oldest slot first. */
export const byDateTime = (a: Appointment, b: Appointment) =>
	(a.appointment_date + (a.start_time ?? '')).localeCompare(b.appointment_date + (b.start_time ?? ''))

/**
 * The doctor's referrals still standing, by the appointment they came from (the newest one for an appointment counts). null when they
 * could not be read: then nothing is treated as referred on a guess.
 */
export async function getReferralsByAppointment(): Promise<Record<string, Referral> | null> {
	try {
		const list = await getReferralsSent()
		const byAppointment: Record<string, Referral> = {}
		// Newest first from the server: the first one for an appointment is the one that counts.
		list.forEach((r) => {
			const id = r.appointment?.id
			if (id && r.is_active && r.status !== 'cancelled' && !byAppointment[id]) byAppointment[id] = r
		})
		return byAppointment
	} catch {
		return null
	}
}

/** The waiting requests among `rows`, oldest slot first, without the ones already referred. */
export const pickWaitingRequests = (rows: Appointment[], referred: Record<string, Referral> | null): Appointment[] =>
	rows
		.filter(isRequestLike)
		.filter((a) => !referred?.[a.id])
		.sort(byDateTime)

/** Reads the requests waiting for the doctor (at `hospitalId`, or every clinic when null) and the referrals it was checked against. */
export async function fetchWaitingRequests(
	hospitalId?: string | null
): Promise<{ requests: Appointment[]; referred: Record<string, Referral> | null }> {
	const [rows, referred] = await Promise.all([
		getAllAppointments({ variant: 'upcoming', ...(hospitalId ? { hospital_id: hospitalId } : {}) }),
		getReferralsByAppointment(),
	])
	return { requests: pickWaitingRequests(rows as Appointment[], referred), referred }
}
