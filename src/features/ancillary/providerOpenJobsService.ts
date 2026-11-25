// src/features/ancillary/providerOpenJobsService.ts
//
// The provider Schedule's "open jobs" API layer (the "ancillary schedule" design: S2 to S8, S13 to S15):
//   GET  /provider/me/open-jobs                   bookings listed days ahead ("Open near you") and what is already out ("Needed now")
//   POST /provider/me/open-jobs/{id}/accept       take all or only some days of a booking (an instant request: take it)
//   POST /provider/me/open-jobs/{id}/hide         "Not for me": stop showing a job to this nurse
//   POST /provider/me/visits/{visitId}/release    give back one day, or that day and every later one she holds
// Backend rules: docs/home-care.md ("The provider's Schedule") in the backend repo. A refusal carries a code in `detail.code`
// (ALREADY_TAKEN, DAY_NOT_OPEN, NURSE_BUSY, ...) and a sentence in `detail.message` for the nurse; these calls do not raise the
// app-wide error dialog, the screen shows the message itself.
import ApiService from '../../services/apiService'
import { API_ENDPOINTS } from '../../constants/apiUrls'

type Envelope<T> = { success: boolean; message?: string; data: T }

/** A day of an open job: the date, when it starts and, when it clashes with something the nurse already holds, what with. */
export type OpenJobDay = {
	/** YYYY-MM-DD */
	date: string
	/** HH:MM */
	startTime: string
	/** e.g. "Clashes with Meena J. · 9:30–10:30 AM"; null when she is free. */
	clash: string | null
}

export type OpenJobService = { name: string; minutes: number }

/** A job no nurse has taken yet (a booking of one or more days, or an instant request that is still searching). */
export type OpenJob = {
	/** The request's public id (the accept / hide routes are keyed by it). */
	id: string
	kind: 'instant' | 'scheduled'
	/** First name and the last initial: "Asha R.". */
	patientName: string
	/** "58 M" / "29 F" */
	ageGender: string
	/** The neighbourhood: never the door, street or phone. */
	area: string
	distanceKm: number | null
	services: OpenJobService[]
	minutesPerVisit: number
	days: OpenJobDay[]
	note: string | null
	/** "Booked by Arun R." */
	bookedBy: string | null
	/** "Posted 2 h ago" */
	postedAgo: string | null
	/** What "respond by" means is the team's call (PB-11): the backend sends null until then. */
	respondBy: string | null
	/** Instant only: how long the patient has waited ("6 min"). */
	waiting: string | null
	/** The nurse's payout for one visit (provider_service.provider_payout). */
	feePerVisit?: number | null
}

export type OpenJobs = {
	/** "Needed now": instant requests and unfilled visits nobody has taken. */
	needed: OpenJob[]
	/** "Open near you": scheduled bookings nearby that still need a nurse. */
	nearby: OpenJob[]
}

export type AcceptedOpenJob = { acceptedDates: string[]; openDates: string[] }

export type ReleaseScope = 'DAY' | 'REMAINING'

/** The codes the open-jobs routes refuse with. */
export type OpenJobErrorCode =
	| 'ALREADY_TAKEN'
	| 'DAY_NOT_OPEN'
	| 'NURSE_BUSY'
	| 'RELEASE_NOT_SUPPORTED'
	| 'VISIT_NOT_RELEASABLE'
	| 'OFFER_EXPIRED'
	| (string & {})

/** The `detail.code` of a refused call, or null. */
export const apiErrorCode = (e: unknown): OpenJobErrorCode | null => {
	const code = (e as { response?: { data?: { detail?: { code?: unknown } } } })?.response?.data?.detail?.code
	return typeof code === 'string' ? code : null
}

/** The job is gone or the list is out of date: the screen should re-read it (someone else took it, or a day is no longer open). */
export const isStaleJobError = (e: unknown) => {
	const code = apiErrorCode(e)
	return code === 'ALREADY_TAKEN' || code === 'DAY_NOT_OPEN'
}

const NO_OPEN_JOBS: OpenJobs = { needed: [], nearby: [] }

/** GET /provider/me/open-jobs. It is re-read often, so a failure is not an error dialog (the caller keeps what it had). */
export const getOpenJobs = async (): Promise<OpenJobs> => {
	const res = await ApiService.get<Envelope<Partial<OpenJobs>>>(API_ENDPOINTS.ANCILLARY.PROVIDER_OPEN_JOBS, {
		skipGlobalError: true,
	})
	const data = res.data?.data
	return {
		needed: Array.isArray(data?.needed) ? data.needed : NO_OPEN_JOBS.needed,
		nearby: Array.isArray(data?.nearby) ? data.nearby : NO_OPEN_JOBS.nearby,
	}
}

/** Take the chosen days of a booking (the others stay open for other nurses). 409 ALREADY_TAKEN / DAY_NOT_OPEN / NURSE_BUSY. */
export const acceptOpenJob = async (jobId: string, dates: string[]): Promise<AcceptedOpenJob> => {
	const res = await ApiService.post<Envelope<Partial<AcceptedOpenJob>>>(
		API_ENDPOINTS.ANCILLARY.PROVIDER_OPEN_JOB_ACCEPT(jobId),
		{ dates },
		{ skipGlobalError: true }
	)
	return { acceptedDates: res.data?.data?.acceptedDates ?? dates, openDates: res.data?.data?.openDates ?? [] }
}

/** "Not for me": the job stays open for everybody else; she is not shown it again. */
export const hideOpenJob = async (jobId: string, reason: string): Promise<void> => {
	await ApiService.post(API_ENDPOINTS.ANCILLARY.PROVIDER_OPEN_JOB_HIDE(jobId), { reason }, { skipGlobalError: true })
}

/**
 * Give back ONE day (`DAY`) or that day and every later one she holds (`REMAINING`). The visit goes back out to the other nurses, never
 * to her. 409 RELEASE_NOT_SUPPORTED for an older order that was never sent out day by day (the caller then gives the whole order back
 * with providerVisitService.releaseOrder), 409 VISIT_NOT_RELEASABLE when it is not hers or has already started.
 */
export const releaseVisitDay = async (
	visitId: string,
	scope: ReleaseScope,
	reason: string,
	note?: string
): Promise<void> => {
	const body: Record<string, unknown> = { scope, reason }
	if (note?.trim()) body.note = note.trim()
	await ApiService.post(API_ENDPOINTS.ANCILLARY.PROVIDER_VISIT_RELEASE(visitId), body, { skipGlobalError: true })
}
