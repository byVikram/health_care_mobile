// src/features/ancillary/providerVisitService.ts
//
// API layer for the provider app's visit flow (ancillary-provider design): Today (stats, booking requests,
// next visit, schedule), and -- per visit -- details, on the way, start (start code), progress, family updates,
// complete (completion code) and issues. Every visit of a recurring order is started and completed with its
// own codes; completing a visit = the provider collected that visit's fee (pay after each visit).
import ApiService from '../../services/apiService'
import { API_ENDPOINTS } from '../../constants/apiUrls'
import type { AncillaryOrderStatus } from './ancillaryProviderBookingService'

type Envelope<T> = { success: boolean; message?: string; data: T }

/** What the provider records during a visit of this speciality. */
export type VisitRecordType = 'vitals' | 'pain_score' | 'family_updates' | null

export interface ProviderVisitSummary {
	visit_public_id: string
	request_public_id: string
	/** 1-based position within the order, of `visits_count`. */
	index: number
	visits_count: number
	date: string | null // "YYYY-MM-DD"
	start_time: string | null // "HH:MM"
	end_time: string | null
	status: AncillaryOrderStatus
	service_name: string
	patient: { name: string | null; relation: string | null; phone: string | null }
	address: { street_address: string; label: string | null; latitude: number | null; longitude: number | null }
	distance_km: number | null
	eta_minutes: number | null
}

export interface ProviderPendingRequest {
	request_public_id: string
	status: AncillaryOrderStatus
	expires_at: string | null
	service_name: string
	patient: { name: string | null; gender: string | null; age: number | null }
	address_label: string | null
	distance_km: number | null
	payment_method: string | null
	visits: { visit_public_id: string; date: string | null; start_time: string | null; end_time: string | null }[]
	totals: { per_visit: number; visits_count: number; total: number }
}

export interface ProviderToday {
	date: string
	provider: {
		provider_public_id: string
		name: string
		specialty: { key: string; label: string } | null
		visit_record_type: VisitRecordType
	}
	stats: { visits_total: number; visits_done: number; pending_requests: number }
	pending_requests: ProviderPendingRequest[]
	next_visit: ProviderVisitSummary | null
	schedule: ProviderVisitSummary[]
	upcoming: ProviderVisitSummary[]
}

/**
 * An open offer pushed on the dispatch WebSocket (NEW_CARE_REQUEST_OFFER): an instant request, or one visit of a provider-less
 * scheduled order (then visitPublicId + scheduledDate / StartTime / EndTime are set). Accept / reject are keyed
 * by the request id either way.
 */
export interface ProviderOffer {
	requestId: string
	visitPublicId: string | null
	serviceName: string
	patientName: string | null
	/** "INSTANT" / "SCHEDULED". */
	bookingType: string
	scheduledDate: string | null // "YYYY-MM-DD"
	scheduledStartTime: string | null // "HH:MM"
	scheduledEndTime: string | null
	distanceKm: number | null
	/** Patient's charge for the offered visit (collected after the visit). */
	totalAmount: number | null
	/** Patient tip (instant bookings), all the provider's. 0 when none. */
	tipAmount: number
	status: string
}

const toNum = (v: unknown): number | null => {
	const n = typeof v === 'number' ? v : typeof v === 'string' ? parseFloat(v.replace(/[^0-9.]/g, '')) : NaN
	return Number.isFinite(n) ? n : null
}

/** Maps a NEW_CARE_REQUEST_OFFER payload (dispatch WebSocket) to a ProviderOffer; null when it has no request id. */
export const toProviderOffer = (o: Record<string, any> | null | undefined): ProviderOffer | null => {
	if (!o) return null
	const requestId = String(o.requestId ?? o.id ?? o.publicBookingId ?? '')
	if (!requestId) return null
	return {
		requestId,
		visitPublicId: o.visitPublicId ? String(o.visitPublicId) : null,
		serviceName: String(o.serviceName ?? 'Care visit'),
		patientName: o.patientName ? String(o.patientName) : null,
		bookingType: String(o.bookingType ?? 'INSTANT').toUpperCase(),
		scheduledDate: o.scheduledDate ?? null,
		scheduledStartTime: o.scheduledStartTime ?? null,
		scheduledEndTime: o.scheduledEndTime ?? null,
		distanceKm: toNum(o.distanceKm),
		totalAmount: toNum(o.totalAmount),
		tipAmount: toNum(o.tipAmount) ?? 0,
		status: String(o.status ?? ''),
	}
}

// ---- Availability (online / offline) ----
// The dispatch socket only delivers offers to a provider who is verified AND online AND has a location, so going
// online always sends the current position. These throw on failure (the ancillaryService variants swallow errors).

export const getProviderOnlineStatus = async (): Promise<boolean> => {
	const res = await ApiService.get<Envelope<{ isOnline?: boolean }>>(API_ENDPOINTS.ANCILLARY.PROVIDER_STATUS)
	return !!res.data?.data?.isOnline
}

export const setProviderOnline = async (isOnline: boolean, latitude?: number, longitude?: number): Promise<void> => {
	const body: Record<string, unknown> = { isOnline }
	if (latitude != null && longitude != null) {
		body.latitude = latitude
		body.longitude = longitude
	}
	await ApiService.post(API_ENDPOINTS.ANCILLARY.PROVIDER_STATUS, body)
}

/** Cheap location ping while online (keeps the geofence match fresh). */
export const pingProviderLocation = async (latitude: number, longitude: number, heading = 0): Promise<void> => {
	await ApiService.post(API_ENDPOINTS.ANCILLARY.PROVIDER_LOCATION, { latitude, longitude, heading })
}

/**
 * Today's earnings for the stat tile: GET /provider/dashboard-metrics returns `todayEarnings` as a formatted
 * string ("₹120.00"; the provider's cut of orders completed today). null when unavailable.
 */
export const getTodayEarnings = async (): Promise<number | null> => {
	const res = await ApiService.get<Envelope<{ todayEarnings?: string | number }>>(
		API_ENDPOINTS.ANCILLARY.PROVIDER_DASHBOARD_METRICS
	)
	return toNum(res.data?.data?.todayEarnings)
}

/** Declines an open offer so it is re-routed to other providers. */
export const rejectOffer = async (requestId: string, reason?: string): Promise<void> => {
	await ApiService.post(API_ENDPOINTS.ANCILLARY.REJECT_PROVIDER(requestId), reason ? { reason } : {})
}

export const getProviderToday = async (date?: string): Promise<ProviderToday> => {
	const res = await ApiService.getWithParams<Envelope<ProviderToday>>(
		API_ENDPOINTS.ANCILLARY.PROVIDER_TODAY,
		date ? { date } : {}
	)
	return res.data.data
}

// ---- Visit details / actions ----

export interface ProviderVisitTask {
	label: string
	done: boolean
}

/** Recorded values by record type (vitals: bp/pulse/temp_f/spo2; pain_score: pain_score/measurement). */
export type ProviderVisitRecord = Record<string, string | number | boolean>

export interface ProviderVisitUpdate {
	id: string
	items: string[]
	message: string
	created_at: string | null
}

/**
 * Arrival and the waiting period (backend visit_service.arrival_block). The wait starts only when the provider taps
 * "I have arrived"; `near_address` is a hint from the last location ping to offer that button (null without a ping).
 */
export interface ProviderVisitArrival {
	can_mark_arrived: boolean
	near_address: boolean | null
	distance_to_address_m: number | null
	max_distance_m: number
	arrived_at: string | null
	/** False while the no-show policy is off: the visit screen then behaves as before. */
	no_show_enabled: boolean
	wait_minutes: number
	/** ISO time from which the patient may be reported; null until arrival. */
	wait_ends_at: string | null
	minutes_left: number | null
	can_report_no_show: boolean
	reported_no_show: boolean
}

export interface ProviderVisitDetail extends Omit<ProviderVisitSummary, 'patient'> {
	/** Absent from an older backend. */
	arrival?: ProviderVisitArrival
	en_route_at: string | null
	started_at: string | null
	completed_at: string | null
	share_location: boolean
	service: {
		name: string
		specialty: { key: string; label: string } | null
		record_type: VisitRecordType
		measurement_label: string | null
	}
	patient: {
		public_id: string | null
		name: string | null
		relation: string | null
		gender: string | null
		age: number | null
		avatar_url: string | null
		phone: string | null
		/** The family account holder, when the patient is a family member. */
		family_contact_name: string | null
	}
	care: {
		instructions: string | null
		allergies: string[]
		conditions: string[]
		medications: string[]
		last_session: {
			visit_public_id: string
			date: string | null
			record: ProviderVisitRecord
			notes: string | null
		} | null
	}
	tasks: ProviderVisitTask[]
	supplies: string[]
	record: ProviderVisitRecord
	notes: string | null
	photo_keys: string[]
	updates: ProviderVisitUpdate[]
	payment: { method: string | null; amount: number; status: string | null; collected_at: string | null }
	up_next: ProviderVisitSummary | null
}

export type VisitIssueReason =
	'CANT_MAKE_IT' | 'RUNNING_LATE' | 'PATIENT_NOT_AVAILABLE' | 'ADDRESS_NOT_FOUND' | 'SAFETY_CONCERN' | 'OTHER'

export interface VisitProgressInput {
	tasks?: ProviderVisitTask[]
	/** Merged key by key; send null to clear a key. */
	record?: Record<string, string | number | boolean | null>
	notes?: string
	photo_keys?: string[]
	share_location?: boolean
}

export const getProviderVisit = async (visitId: string): Promise<ProviderVisitDetail> => {
	const res = await ApiService.get<Envelope<ProviderVisitDetail>>(API_ENDPOINTS.ANCILLARY.PROVIDER_VISIT(visitId))
	return res.data.data
}

/** Heading to the visit: the patient is notified (and sees live location when shared). */
export const markVisitOnTheWay = async (visitId: string, shareLocation: boolean): Promise<ProviderVisitDetail> => {
	const res = await ApiService.post<Envelope<ProviderVisitDetail>>(
		API_ENDPOINTS.ANCILLARY.PROVIDER_VISIT_ON_THE_WAY(visitId),
		{ share_location: shareLocation }
	)
	return res.data.data
}

/** "I have arrived": sends the phone's location (the server checks it is near the address) and starts the wait. */
export const markVisitArrived = async (
	visitId: string,
	latitude: number,
	longitude: number
): Promise<ProviderVisitDetail> => {
	const res = await ApiService.post<Envelope<ProviderVisitDetail>>(
		API_ENDPOINTS.ANCILLARY.PROVIDER_VISIT_ARRIVED(visitId),
		{ latitude, longitude }
	)
	return res.data.data
}

/** The patient was not available after the wait: the visit is closed as a no-show and the patient is asked what happened. */
export const reportPatientNotAvailable = async (visitId: string): Promise<ProviderVisitDetail> => {
	const res = await ApiService.post<Envelope<ProviderVisitDetail>>(
		API_ENDPOINTS.ANCILLARY.PROVIDER_VISIT_NO_SHOW(visitId),
		{}
	)
	return res.data.data
}

/** Starts the visit with the patient's start code for THIS visit. */
export const startVisit = async (visitId: string, code: string): Promise<ProviderVisitDetail> => {
	const res = await ApiService.post<Envelope<ProviderVisitDetail>>(
		API_ENDPOINTS.ANCILLARY.PROVIDER_VISIT_START(visitId),
		{
			code,
		}
	)
	return res.data.data
}

export const updateVisitProgress = async (visitId: string, input: VisitProgressInput): Promise<ProviderVisitDetail> => {
	const res = await ApiService.patch<Envelope<ProviderVisitDetail>>(
		API_ENDPOINTS.ANCILLARY.PROVIDER_VISIT_PROGRESS(visitId),
		input
	)
	return res.data.data
}

export const sendVisitUpdate = async (
	visitId: string,
	items: string[],
	message?: string
): Promise<ProviderVisitUpdate> => {
	const body: Record<string, unknown> = { items }
	if (message?.trim()) body.message = message.trim()
	const res = await ApiService.post<Envelope<ProviderVisitUpdate>>(
		API_ENDPOINTS.ANCILLARY.PROVIDER_VISIT_UPDATES(visitId),
		body
	)
	return res.data.data
}

/** Completes the visit with the patient's completion code for THIS visit (fee collected). */
export const completeVisit = async (visitId: string, code: string): Promise<ProviderVisitDetail> => {
	const res = await ApiService.post<Envelope<ProviderVisitDetail>>(
		API_ENDPOINTS.ANCILLARY.PROVIDER_VISIT_COMPLETE(visitId),
		{ code }
	)
	return res.data.data
}

export const reportVisitIssue = async (visitId: string, reason: VisitIssueReason, details?: string): Promise<void> => {
	const body: Record<string, unknown> = { reason }
	if (details?.trim()) body.details = details.trim()
	await ApiService.post(API_ENDPOINTS.ANCILLARY.PROVIDER_VISIT_ISSUES(visitId), body)
}
