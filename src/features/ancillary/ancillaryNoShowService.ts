// src/features/ancillary/ancillaryNoShowService.ts
//
// The patient's side of the home-care no-show policy: a visit the provider reported as a no-show (the patient was not
// available at the address) is answered once, with a reason from a fixed list; and booking of every home-care service is
// paused after repeated valid no-shows. The doctor policy's twin is services/appointmentService.ts (getNoShow ...).
import ApiService from '../../services/apiService'
import { API_ENDPOINTS } from '../../constants/apiUrls'
import type { BookingRestriction, NoShowInfo } from '../../services/appointmentService'

/** The same shape as a doctor appointment's no-show, keyed by the visit. */
export type VisitNoShowInfo = Omit<NoShowInfo, 'appointment_id'> & { visit_id: string }

/**
 * What happened to a visit the provider reported as a no-show. 404 = it was not reported, 403 = not the patient's / family's.
 * The calling screen renders its own error text, so the global error dialog is suppressed.
 */
export async function getVisitNoShow(visitId: string): Promise<VisitNoShowInfo> {
	const res = await ApiService.get<{ data: VisitNoShowInfo }>(
		API_ENDPOINTS.ANCILLARY.PATIENT_VISIT_NO_SHOW(visitId),
		{
			skipGlobalError: true,
		}
	)
	return res.data.data
}

/** The patient's one, final reply (reason = one of `reasons[].value`). 409 when already answered or too late. */
export async function replyToVisitNoShow(visitId: string, reason: string): Promise<VisitNoShowInfo> {
	const res = await ApiService.post<{ data: VisitNoShowInfo }>(
		API_ENDPOINTS.ANCILLARY.PATIENT_VISIT_NO_SHOW_REPLY(visitId),
		{ reason },
		{ skipGlobalError: true }
	)
	return res.data.data
}

/** Whether booking of any home-care service is paused for the signed-in patient (repeated valid no-shows). */
export async function getAncillaryBookingRestriction(): Promise<BookingRestriction> {
	const res = await ApiService.get<{ data: BookingRestriction }>(
		API_ENDPOINTS.ANCILLARY.PATIENT_BOOKING_RESTRICTION,
		{
			skipGlobalError: true,
		}
	)
	return res.data.data
}
