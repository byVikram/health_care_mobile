// src/features/laboratory/laboratoryService.ts
import ApiService from '../../services/apiService'
import { API_ENDPOINTS } from '../../constants/apiUrls'
import { formatDateForApi } from '../../utils/date'
import type {
	LaboratoryItem,
	LabTestType,
	LabBooking,
	LabBookingItem,
	PlaceLabOrderPayload,
	SubmitLabQuotePayload,
} from './laboratory'

// ─────────────────────────────────────────────
// Cache
// ─────────────────────────────────────────────

let labListCache: { data: LaboratoryItem[]; total: number } | null = null
let labListCacheTimestamp = 0
const CACHE_DURATION = 5 * 60 * 1000

// ─────────────────────────────────────────────
// Raw API shapes
// ─────────────────────────────────────────────

interface RawSearchItem {
	id: string
	name: string
	logo_s3_key: string | null
	address: string
	city: string
	state: string
	test_id: number
	test_name: string
	pricing_model: string
	base_price: number | null
	price_details: string
}

interface RawLaboratorySearchResponse {
	success: boolean
	message: string
	data: RawSearchItem[]
	meta: { total: number; page: number; limit: number; pages: number }
}

interface RawBookingItem {
	id: number
	laboratory_test: {
		id: number
		test_type: {
			id: number
			name: string
			description: string
		}
		pricing_model: string
		base_price: number | null
		price_details: string
		is_available: boolean
	}
	custom_test_name: string | null
	quoted_price: number | null
}

interface RawBooking {
	id: number
	public_id: string
	patient_id: number
	patient_name: string
	laboratory_name: string
	laboratory_public_id: string
	booking_date: string
	booking_time: string
	status: string
	payment_status: string
	prescription_verified: boolean
	verified_by_user_id: number | null
	verified_by_name: string | null
	verified_at: string | null
	total_price: number | null
	notes: string | null
	external_prescription_s3_key: string | null
	booking_items: RawBookingItem[]
	created_at: string
	patient: {
		id: string
		name: string
		phone: string
		age: number | null
		gender: string | null
	} | null
	clinic: { name: string; phone: string; address: string } | null
	laboratory: {
		id: string
		name: string
		phone: string
		address: string
	} | null
	patient_phone: string
	laboratory_phone: string
	doctor_phone: string | null
	collection_type?: string
	collection_address?: string
}

// ─────────────────────────────────────────────
// Mappers
// ─────────────────────────────────────────────

function mapRawBookingItem(raw: RawBookingItem): LabBookingItem {
	return {
		id: raw.id,
		test_name: raw.laboratory_test?.test_type?.name ?? '',
		custom_test_name: raw.custom_test_name ?? null,
		category: undefined,
		quoted_price: raw.quoted_price ?? null,
		base_price: raw.laboratory_test?.base_price ?? null,
		turnaround: undefined,
		result: null,
	}
}

function mapRawBooking(raw: RawBooking): LabBooking {
	return {
		public_id: raw.public_id,
		patient_name: raw.patient_name,
		patient_phone: raw.patient_phone,
		laboratory_name: raw.laboratory_name,
		laboratory_public_id: raw.laboratory_public_id,
		laboratory_phone: raw.laboratory_phone,
		booking_date: raw.booking_date,
		booking_time: raw.booking_time,
		collection_type: (raw.collection_type as 'walk_in' | 'home_collection') ?? 'walk_in',
		collection_address: raw.collection_address,
		status: raw.status,
		payment_status: raw.payment_status,
		total_price: raw.total_price,
		notes: raw.notes,
		created_at: raw.created_at,
		booking_items: (raw.booking_items ?? []).map(mapRawBookingItem),
		report: null,
		external_prescription_s3_key: raw.external_prescription_s3_key,
		verified_by_name: raw.verified_by_name ?? undefined,
		prescription_verified: raw.prescription_verified,
		patient: raw.patient
			? {
					name: raw.patient.name,
					age: raw.patient.age ?? undefined,
					gender: raw.patient.gender ?? undefined,
					phone: raw.patient.phone,
				}
			: undefined,
		laboratory: raw.laboratory ? { phone: raw.laboratory.phone } : undefined,
	}
}

// ─────────────────────────────────────────────
// 1. Search / list laboratories
// ─────────────────────────────────────────────

export async function getLaboratories(
	params: {
		search?: string
		city?: string
		test_type_id?: number
		page?: number
		limit?: number
	} = {},
	options?: { signal?: AbortSignal }
): Promise<{ data: LaboratoryItem[]; total: number; page: number; limit: number }> {
	const isUnfiltered =
		!params.search && !params.city && !params.test_type_id && (!params.page || params.page === 1)
	const requestedPage = params.page || 1
	const requestedLimit = params.limit || 12

	if (isUnfiltered && labListCache && Date.now() - labListCacheTimestamp < CACHE_DURATION) {
		return {
			data: labListCache.data.slice(0, requestedLimit),
			total: labListCache.total,
			page: 1,
			limit: requestedLimit,
		}
	}

	const apiLimit = 100
	const firstResponse = await ApiService.get<RawLaboratorySearchResponse>(API_ENDPOINTS.LABORATORY.SEARCH, {
		params: {
			search: params.search || undefined,
			city: params.city || undefined,
			test_type_id: params.test_type_id || undefined,
			page: 1,
			limit: apiLimit,
		},
		signal: options?.signal,
	})

	const firstMeta = firstResponse.data?.meta ?? { total: 0, page: 1, limit: apiLimit, pages: 0 }
	const rawItems: RawSearchItem[] = [...(firstResponse.data?.data ?? [])]

	for (let nextPage = 2; nextPage <= firstMeta.pages; nextPage += 1) {
		const response = await ApiService.get<RawLaboratorySearchResponse>(API_ENDPOINTS.LABORATORY.SEARCH, {
			params: {
				search: params.search || undefined,
				city: params.city || undefined,
				test_type_id: params.test_type_id || undefined,
				page: nextPage,
				limit: apiLimit,
			},
			signal: options?.signal,
		})
		rawItems.push(...(response.data?.data ?? []))
	}

	// Deduplicate by lab id — the search endpoint returns one row per test offering
	const labMap = new Map<string, LaboratoryItem>()
	for (const item of rawItems) {
		if (!labMap.has(item.id)) {
			labMap.set(item.id, {
				id: item.id,
				name: item.name,
				owner_name: '',
				avatar_s3_key: item.logo_s3_key ?? null,
				address: item.address ?? '',
				city: item.city ?? '',
				operating_hours: { open: '09:00', close: '18:00' },
				// The search endpoint does not return these flags; default false
				home_collection_available: false,
				is_24_x_7: false,
				is_nabl_accredited: false,
				emergency_tests_available: false,
			})
		}
	}

	const labs = Array.from(labMap.values())
	const total = labs.length
	const pagedLabs = labs.slice((requestedPage - 1) * requestedLimit, requestedPage * requestedLimit)

	if (isUnfiltered) {
		labListCache = { data: labs, total }
		labListCacheTimestamp = Date.now()
	}

	return { data: pagedLabs, total, page: requestedPage, limit: requestedLimit }
}

// ─────────────────────────────────────────────
// 2. Get test types for a specific laboratory
//    Uses GET /api/laboratory/tests?laboratory_id=<id>
// ─────────────────────────────────────────────

export async function getLabTestTypes(
	labId: string,
	options?: { signal?: AbortSignal }
): Promise<LabTestType[]> {
	const response = await ApiService.get<{
		success: boolean
		message: string
		data: Array<{
			id: number
			laboratory_id: number
			test_type_id: number
			base_price: number | null
			is_available: boolean
			pricing_model: string
			price_details: string
			test_type: {
				id: number
				name: string
				description: string
				is_active: boolean
			}
		}>
	}>(API_ENDPOINTS.LABORATORY.TESTS, {
		params: { laboratory_id: labId },
		signal: options?.signal,
	})

	const items = response.data?.data ?? []
	return items
		.filter((item) => item.is_available)
		.map((item) => ({
			id: String(item.id),
			test_type_id: String(item.test_type_id),
			name: item.test_type.name,
			category: 'General',
			turnaround: '24 hrs',
			base_price: item.base_price ?? 0,
			description: item.test_type.description,
			pricing_model: item.pricing_model,
			price_details: item.price_details,
		}))
}

// ─────────────────────────────────────────────
// 3. Get all global test types (for filter dropdowns)
// ─────────────────────────────────────────────

export async function getAllTestTypes(
	options?: { signal?: AbortSignal }
): Promise<Array<{ id: number; name: string; description: string }>> {
	const response = await ApiService.get<{
		success: boolean
		message: string
		data: Array<{ id: number; name: string; description: string }>
	}>(API_ENDPOINTS.LABORATORY.TEST_TYPES, { signal: options?.signal })

	return response.data?.data ?? []
}

// ─────────────────────────────────────────────
// 4. Place a lab order
// ─────────────────────────────────────────────

export async function placeLabOrder(
	payload: PlaceLabOrderPayload,
	options?: { signal?: AbortSignal }
): Promise<{ public_id: string }> {
	const testIds = payload.test_type_ids
		.map((id) => Number.parseInt(id, 10))
		.filter((id) => Number.isInteger(id) && id > 0)

	if (testIds.length === 0) {
		throw new Error('Please select at least one available test.')
	}

	const apiPayload = {
		laboratory_id: payload.laboratory_public_id,
		test_ids: testIds,
		booking_date: formatDateForApi(new Date()),
		booking_time: '10:00 AM',
		treatment_id: null,
		external_prescription_s3_key: null,
		notes: payload.notes ?? '',
	}

	try {
		const response = await ApiService.post<{
			success: boolean
			message: string
			data: { public_id: string }
		}>(API_ENDPOINTS.LABORATORY.BOOKINGS, apiPayload, { signal: options?.signal })

		if (!response.data?.data?.public_id) {
			throw new Error(response.data?.message || 'Booking creation failed: no public_id returned')
		}
		return { public_id: response.data.data.public_id }
	} catch (error: any) {
		throw new Error(
			error?.response?.data?.message ||
				error?.response?.data?.detail ||
				error?.message ||
				'Failed to create lab booking'
		)
	}
}

// ─────────────────────────────────────────────
// 5. Get all lab bookings
// ─────────────────────────────────────────────

export async function getLabBookings(
	status?: string,
	options?: { signal?: AbortSignal }
): Promise<LabBooking[]> {
	const url =
		status && status !== 'all'
			? `${API_ENDPOINTS.LABORATORY.BOOKINGS}?status=${encodeURIComponent(status)}`
			: API_ENDPOINTS.LABORATORY.BOOKINGS

	const response = await ApiService.get<{
		success: boolean
		data: RawBooking[]
	}>(url, { signal: options?.signal })

	return (response.data?.data ?? []).map(mapRawBooking)
}

// ─────────────────────────────────────────────
// 6. Get single booking detail
// ─────────────────────────────────────────────

export async function getLabBookingDetail(
	publicId: string,
	options?: { signal?: AbortSignal }
): Promise<LabBooking> {
	if (!publicId) throw new Error('Booking public ID is required')

	const response = await ApiService.get<{
		success: boolean
		data: RawBooking
	}>(API_ENDPOINTS.LABORATORY.BOOKING_DETAIL(publicId), { signal: options?.signal })

	if (!response.data?.data) throw new Error('Booking not found')
	return mapRawBooking(response.data.data)
}

// ─────────────────────────────────────────────
// 7. Submit quote (lab staff)
//    PATCH /api/laboratory/bookings/{id}/quote
// ─────────────────────────────────────────────

export async function submitLabBookingQuote(
	publicId: string,
	payload: SubmitLabQuotePayload,
	options?: { signal?: AbortSignal }
): Promise<void> {
	if (!publicId) throw new Error('Booking public ID is required')
	await ApiService.patch(
		`${API_ENDPOINTS.LABORATORY.BOOKING_DETAIL(publicId)}/quote`,
		payload,
		{ signal: options?.signal }
	)
}

// ─────────────────────────────────────────────
// 8. Confirm payment (patient)
//    POST /api/laboratory/bookings/{id}/pay
// ─────────────────────────────────────────────

export async function confirmLabPayment(
	publicId: string,
	options?: { signal?: AbortSignal }
): Promise<void> {
	if (!publicId) throw new Error('Booking public ID is required')
	await ApiService.post(
		`${API_ENDPOINTS.LABORATORY.BOOKING_DETAIL(publicId)}/pay`,
		{},
		{ signal: options?.signal }
	)
}

// ─────────────────────────────────────────────
// 9. Mark sample collected (lab staff)
// ─────────────────────────────────────────────

export async function markLabSampleCollected(
	publicId: string,
	options?: { signal?: AbortSignal }
): Promise<void> {
	if (!publicId) throw new Error('Booking public ID is required')
	await ApiService.patch(
		`${API_ENDPOINTS.LABORATORY.BOOKING_DETAIL(publicId)}/sample-collected`,
		{},
		{ signal: options?.signal }
	)
}

// ─────────────────────────────────────────────
// 10. Mark report ready (lab staff)
// ─────────────────────────────────────────────

export async function markLabReportReady(
	publicId: string,
	options?: { signal?: AbortSignal }
): Promise<void> {
	if (!publicId) throw new Error('Booking public ID is required')
	await ApiService.patch(
		`${API_ENDPOINTS.LABORATORY.BOOKING_DETAIL(publicId)}/report-ready`,
		{},
		{ signal: options?.signal }
	)
}

// ─────────────────────────────────────────────
// 11. Mark booking completed
// ─────────────────────────────────────────────

export async function markLabBookingCompleted(
	publicId: string,
	options?: { signal?: AbortSignal }
): Promise<void> {
	if (!publicId) throw new Error('Booking public ID is required')
	await ApiService.patch(
		`${API_ENDPOINTS.LABORATORY.BOOKING_DETAIL(publicId)}/completed`,
		{},
		{ signal: options?.signal }
	)
}

// ─────────────────────────────────────────────
// 12. Cancel booking
// ─────────────────────────────────────────────

export async function cancelLabBooking(
	publicId: string,
	reason?: string,
	options?: { signal?: AbortSignal }
): Promise<void> {
	if (!publicId) throw new Error('Booking public ID is required')
	await ApiService.post(
		`${API_ENDPOINTS.LABORATORY.BOOKING_DETAIL(publicId)}/cancel`,
		{ reason: reason ?? null },
		{ signal: options?.signal }
	)
}

// ─────────────────────────────────────────────
// 13. Upload lab report (lab staff)
// ─────────────────────────────────────────────

export async function uploadLabReport(
	publicId: string,
	payload: { report_pdf_s3_key?: string; result_images_s3_keys?: string[] },
	options?: { signal?: AbortSignal }
): Promise<void> {
	if (!publicId) throw new Error('Booking public ID is required')
	await ApiService.post(
		API_ENDPOINTS.LABORATORY.UPLOAD_REPORT(publicId),
		payload,
		{ signal: options?.signal }
	)
}

// ─────────────────────────────────────────────
// 14. Verify prescription (lab staff)
// ─────────────────────────────────────────────

export async function verifyLabPrescription(
	publicId: string,
	options?: { signal?: AbortSignal }
): Promise<void> {
	if (!publicId) throw new Error('Booking public ID is required')
	await ApiService.patch(
		API_ENDPOINTS.LABORATORY.VERIFY_PRESCRIPTION(publicId),
		{},
		{ signal: options?.signal }
	)
}

// ─────────────────────────────────────────────
// 15. Client-side filter (boolean flags only)
//     Search and city are handled server-side
// ─────────────────────────────────────────────

export function applyLaboratoryFilters(
	items: LaboratoryItem[],
	filters: {
		search: string
		city: string
		homeCollection: boolean
		is24x7: boolean
		nablAccredited: boolean
		emergencyTests: boolean
	}
): LaboratoryItem[] {
	const query = filters.search.trim().toLowerCase()
	return items.filter((lab) => {
		const matchesSearch =
			query.length === 0 ||
			lab.name.toLowerCase().includes(query) ||
			lab.owner_name.toLowerCase().includes(query) ||
			lab.address.toLowerCase().includes(query) ||
			lab.city.toLowerCase().includes(query)

		const matchesCity = !filters.city || lab.city === filters.city
		const matchesHomeCollection = !filters.homeCollection || lab.home_collection_available
		const matches24x7 = !filters.is24x7 || lab.is_24_x_7
		const matchesNabl = !filters.nablAccredited || lab.is_nabl_accredited
		const matchesEmergency = !filters.emergencyTests || lab.emergency_tests_available

		return (
			matchesSearch &&
			matchesCity &&
			matchesHomeCollection &&
			matches24x7 &&
			matchesNabl &&
			matchesEmergency
		)
	})
}

// ─────────────────────────────────────────────
// 16. Cache invalidation
// ─────────────────────────────────────────────

export function clearLaboratoryCache(): void {
	labListCache = null
	labListCacheTimestamp = 0
}
