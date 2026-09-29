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

export interface ProviderVisitDetail extends Omit<ProviderVisitSummary, 'patient'> {
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
