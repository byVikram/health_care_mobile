// src/features/ancillary/ancillaryProviderBookingService.ts
//
// API layer for the ancillary booking flow (all home-care types: nursing, home care, physio, rehab, medical
// equipment). Two ways to book, both PAY_AFTER_VISIT:
//   - Instant ("Book now"): POST /patient/requests (bookingType INSTANT) -> Finding a nurse (dispatch to
//     nearby providers, optional tip, first to accept wins).
//   - Later: POST /requests/scheduled with NO provider -- one order with up to 7 visits in a 14-day window; the
//     backend assigns a provider to each visit 1 hour before it starts (a visit nobody takes is UNASSIGNED).
//     Each visit can then be moved or cancelled on its own (rules come back on the order as `policy` and per visit
//     as can_reschedule / can_cancel).
import ApiService from '../../services/apiService'
import { API_ENDPOINTS } from '../../constants/apiUrls'

type Envelope<T> = { success: boolean; message?: string; data: T }

export const ANCILLARY_BOOKING_WINDOW_DAYS = 14
export const ANCILLARY_BOOKING_MAX_VISITS = 7
export const PAY_AFTER_VISIT = 'PAY_AFTER_VISIT'

// ---- Catalog detail fields (added to /services and /packages) ----

export interface AncillaryServiceDetails {
	mrp?: number | null
	duration_minutes?: number | null
	good_for?: string | null
	includes?: string[] | null
	prep_steps?: string[] | null
	is_featured?: boolean
	/** Packages only. */
	visits_count?: number | null
	validity_days?: number | null
}

// ---- Selection ----

export type ServiceSelection =
	{ procedureIds: string[]; packageId?: undefined } | { packageId: string; procedureIds?: undefined }

// ---- Order (create + status) ----

export interface VisitInput {
	date: string // "YYYY-MM-DD"
	start_time: string // "HH:MM"
	end_time: string
}

export interface VisitAddressInput {
	street_address: string
	latitude: number
	longitude: number
	label?: string
}

export interface CreateAncillaryOrderInput {
	selection: ServiceSelection
	visits: VisitInput[]
	/** Family member's public id; omit to book for the signed-in patient. */
	patient_public_id?: string
	address: VisitAddressInput
	note?: string
}

export type AncillaryOrderStatus =
	| 'SCHEDULED_PENDING'
	| 'SCHEDULED_CONFIRMED'
	| 'CANCELLED_BY_PROVIDER'
	| 'CANCELLED_BY_PATIENT'
	| 'CANCELLED'
	| 'EXPIRED'
	/** Visit only: no provider was available for it -- the patient reschedules or cancels. */
	| 'UNASSIGNED'
	/** The provider reached the address, waited, and the patient was not available (the patient is asked what happened). */
	| 'NO_SHOW'
	| (string & {})

export interface AncillaryOrderProvider {
	provider_public_id: string
	name: string
	avatar_url?: string | null
	experience_years?: number | null
	distance_km?: number | null
	phone?: string | null
}

export interface AncillaryOrderVisit {
	visit_public_id: string
	index: number
	date: string
	start_time: string
	end_time: string
	status: AncillaryOrderStatus
	payment_status?: string | null
	/** The provider assigned to this visit (may differ per visit); null/absent until assigned. */
	provider?: AncillaryOrderProvider | null
	/** The patient moved this visit to another day / time. */
	rescheduled?: boolean
	/** Server rules: free to move until its provider is assigned, free to cancel up to the cancel cutoff. */
	can_reschedule?: boolean
	can_cancel?: boolean
	/** Status endpoint only: the code the patient reads out at the door (until the visit starts) / when it is done. */
	start_code?: string | null
	completion_code?: string | null
	/** Status endpoint only: the provider is at the address, and (policy on) until when they will wait. */
	provider_arrived_at?: string | null
	waiting_until?: string | null
	/** The provider reported the patient as not available. */
	missed?: boolean
}

/** Minutes, from the server (order_service.VISIT_ASSIGN_LEAD_MINUTES / VISIT_CANCEL_CUTOFF_MINUTES). */
export interface AncillaryOrderPolicy {
	assign_lead_minutes: number
	cancel_cutoff_minutes: number
}

/** Used until the first response (or by an older backend that sends no `policy`). */
export const DEFAULT_ORDER_POLICY: AncillaryOrderPolicy = { assign_lead_minutes: 60, cancel_cutoff_minutes: 120 }

export interface AncillaryOrder {
	request_public_id: string
	status: AncillaryOrderStatus
	booking_type?: string
	expires_at?: string | null
	created_at?: string | null
	payment_method?: string | null
	provider?: AncillaryOrderProvider | null
	services: { id: string; name: string }[]
	package?: { id: string; name: string } | null
	/** Home-care speciality of the order, when the endpoint includes it (key = catalogue slug, e.g. 'nursing-care'). */
	specialty?: { key?: string | null; label?: string | null } | string | null
	patient?: { public_id: string; name: string; relation?: string | null } | null
	address?: { street_address: string; label?: string | null } | null
	note?: string | null
	visits: AncillaryOrderVisit[]
	policy?: AncillaryOrderPolicy
	/** False for the older chosen-provider orders: they are cancelled as a whole, visits are not edited one by one. */
	visit_edits?: boolean
	totals: { per_visit: number; visits_count: number; total: number }
}

export const createAncillaryOrder = async (input: CreateAncillaryOrderInput): Promise<AncillaryOrder> => {
	// No provider_public_id: the backend assigns one per visit.
	const body: Record<string, unknown> = {
		visits: input.visits,
		address: input.address,
		payment_method: PAY_AFTER_VISIT,
	}
	if (input.selection.packageId) body.package_id = input.selection.packageId
	else body.procedure_ids = input.selection.procedureIds
	if (input.patient_public_id) body.patient_public_id = input.patient_public_id
	if (input.note?.trim()) body.note = input.note.trim()
	const res = await ApiService.post<Envelope<AncillaryOrder>>(API_ENDPOINTS.ANCILLARY.REQUESTS_SCHEDULED, body)
	return res.data.data
}

export const getAncillaryOrder = async (requestPublicId: string): Promise<AncillaryOrder> => {
	const res = await ApiService.get<Envelope<AncillaryOrder & { address_detail?: AncillaryOrder['address'] }>>(
		API_ENDPOINTS.ANCILLARY.REQUEST_STATUS(requestPublicId)
	)
	const data = res.data.data
	// The status endpoint keeps its legacy `address` as a plain string (the provider app's active-visit screen
	// reads it), so the structured address comes back as `address_detail` there.
	const legacy = data.address as unknown
	if (typeof legacy === 'string' || legacy == null) {
		data.address = data.address_detail ?? (typeof legacy === 'string' ? { street_address: legacy } : null)
	}
	return data
}

export const cancelAncillaryOrder = async (requestPublicId: string, reason?: string): Promise<void> => {
	await ApiService.post(API_ENDPOINTS.ANCILLARY.CANCEL_PATIENT(requestPublicId), reason ? { reason } : {})
}

/**
 * Cancel the chosen visits of a scheduled order, all or none (409 CANCEL_WINDOW_CLOSED / VISIT_NOT_CANCELLABLE when
 * one can't be). skipGlobalError: the screen shows the server's message itself.
 */
export const cancelAncillaryVisits = async (
	requestPublicId: string,
	visitPublicIds: string[],
	reason?: string
): Promise<void> => {
	await ApiService.post(
		API_ENDPOINTS.ANCILLARY.CANCEL_VISITS(requestPublicId),
		{ visit_public_ids: visitPublicIds, ...(reason ? { reason } : {}) },
		{ skipGlobalError: true }
	)
}

/** Move ONE visit to another day / start time (it keeps its length). 409 once its provider is assigned. */
export const rescheduleAncillaryVisit = async (
	requestPublicId: string,
	visitPublicId: string,
	date: string,
	startTime: string
): Promise<void> => {
	await ApiService.post(
		API_ENDPOINTS.ANCILLARY.RESCHEDULE_VISIT(requestPublicId, visitPublicId),
		{ date, start_time: startTime },
		{ skipGlobalError: true }
	)
}

export const isVisitUnassigned = (status?: AncillaryOrderStatus | null) => status === 'UNASSIGNED'

// ---- Instant ("Book now") ----

export interface CreateInstantRequestInput {
	selection: ServiceSelection
	/** Family member's public id; omit to book for the signed-in patient. */
	patient_public_id?: string
	address: VisitAddressInput
	note?: string
}

export const createInstantRequest = async (input: CreateInstantRequestInput): Promise<string> => {
	const body: Record<string, unknown> = {
		bookingType: 'INSTANT',
		paymentMethod: PAY_AFTER_VISIT,
		address: {
			streetAddress: input.address.street_address,
			latitude: input.address.latitude,
			longitude: input.address.longitude,
			label: input.address.label,
		},
	}
	if (input.selection.packageId) body.packageId = input.selection.packageId
	else body.serviceTypeIds = input.selection.procedureIds
	if (input.patient_public_id) body.patientPublicId = input.patient_public_id
	if (input.note?.trim()) body.careInstructions = input.note.trim().slice(0, 500)
	const res = await ApiService.post<Envelope<{ requestId?: string; publicBookingId?: string }>>(
		API_ENDPOINTS.ANCILLARY.REQUESTS,
		body
	)
	return String(res.data.data.requestId ?? res.data.data.publicBookingId ?? '')
}

/** Tip to get matched faster. amount 0 removes the tip; allowed 1..500, only before a provider accepts. */
export const setAncillaryRequestTip = async (requestPublicId: string, amount: number): Promise<void> => {
	await ApiService.put(API_ENDPOINTS.ANCILLARY.TIP(requestPublicId), { amount })
}

// ---- Provider side (scheduled orders) ----

export interface ProviderScheduledOrder extends AncillaryOrder {
	patient_name?: string | null
}

export const getProviderScheduledOrders = async (statusFilter = 'ALL'): Promise<ProviderScheduledOrder[]> => {
	const res = await ApiService.getWithParams<Envelope<ProviderScheduledOrder[]>>(
		API_ENDPOINTS.ANCILLARY.PROVIDER_SCHEDULED_ORDERS,
		{ status_filter: statusFilter }
	)
	return res.data?.data ?? []
}

export const acceptScheduledOrder = async (requestPublicId: string): Promise<void> => {
	await ApiService.post(API_ENDPOINTS.ANCILLARY.ACCEPT_SCHEDULED(requestPublicId), {})
}

export const declineScheduledOrder = async (requestPublicId: string, reason?: string): Promise<void> => {
	await ApiService.post(API_ENDPOINTS.ANCILLARY.DECLINE_SCHEDULED(requestPublicId), reason ? { reason } : {})
}
