// src/features/ancillary/ancillaryProviderBookingService.ts
//
// API layer for the redesigned ancillary provider booking flow (all home-care types: nursing, home care, physio,
// rehab, medical equipment). Contract = phase-4 notes. Rules: providers are matched by speciality only,
// one order can hold up to 7 visits (same provider) within a 14-day window, payment is PAY_AFTER_VISIT, and
// an unconfirmed order expires 30 minutes after it's sent.
import ApiService from '../../services/apiService'
import { API_ENDPOINTS } from '../../constants/apiUrls'

type Envelope<T> = { success: boolean; message?: string; data: T }

export const ANCILLARY_BOOKING_WINDOW_DAYS = 14
export const ANCILLARY_BOOKING_MAX_VISITS = 7
export const ANCILLARY_BOOKING_CONFIRM_MINUTES = 30
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

// ---- Provider availability across days ----

export interface ProviderSlot {
	start_time: string // "HH:MM"
	end_time: string
}

export interface ProviderAvailability {
	provider_public_id: string
	name: string
	specialty?: string | null
	avatar_url?: string | null
	gender?: string | null
	experience_years?: number | null
	languages: string[]
	about?: string | null
	distance_km?: number | null
	fee_per_visit: number
	working_hours_label?: string | null
	dates: { date: string; slots: ProviderSlot[] }[]
	available_on_all_dates: boolean
	free_dates: string[]
}

export type ServiceSelection = { procedureIds: string[]; packageId?: undefined } | { packageId: string; procedureIds?: undefined }

export const getProvidersAvailability = async (params: {
	dates: string[]
	selection: ServiceSelection
	latitude: number
	longitude: number
}): Promise<ProviderAvailability[]> => {
	const query: Record<string, unknown> = {
		dates: params.dates.join(','),
		latitude: params.latitude,
		longitude: params.longitude,
	}
	if (params.selection.packageId) query.package_id = params.selection.packageId
	else query.procedure_ids = params.selection.procedureIds
	const res = await ApiService.getWithParams<Envelope<ProviderAvailability[]>>(
		API_ENDPOINTS.ANCILLARY.PROVIDERS_AVAILABILITY,
		query
	)
	return res.data?.data ?? []
}

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
	provider_public_id: string
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
	| (string & {})

export interface AncillaryOrderVisit {
	visit_public_id: string
	index: number
	date: string
	start_time: string
	end_time: string
	status: AncillaryOrderStatus
	payment_status?: string | null
}

export interface AncillaryOrder {
	request_public_id: string
	status: AncillaryOrderStatus
	booking_type?: string
	expires_at?: string | null
	created_at?: string | null
	payment_method?: string | null
	provider?: {
		provider_public_id: string
		name: string
		avatar_url?: string | null
		experience_years?: number | null
		distance_km?: number | null
		phone?: string | null
	} | null
	services: { id: string; name: string }[]
	package?: { id: string; name: string } | null
	/** Home-care speciality of the order, when the endpoint includes it (key = catalogue slug, e.g. 'nursing-care'). */
	specialty?: { key?: string | null; label?: string | null } | string | null
	patient?: { public_id: string; name: string; relation?: string | null } | null
	address?: { street_address: string; label?: string | null } | null
	note?: string | null
	visits: AncillaryOrderVisit[]
	totals: { per_visit: number; visits_count: number; total: number }
}

export const createAncillaryOrder = async (input: CreateAncillaryOrderInput): Promise<AncillaryOrder> => {
	const body: Record<string, unknown> = {
		provider_public_id: input.provider_public_id,
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

/** Order ended without being confirmed -- the patient picks another provider. */
export const isOrderUnconfirmedEnd = (status: AncillaryOrderStatus) =>
	status === 'EXPIRED' || status === 'CANCELLED_BY_PROVIDER'

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
