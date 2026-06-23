// src/features/radiology/RadiologyService.ts
import ApiService from '../../services/apiService'
import { API_ENDPOINTS } from '../../constants/apiUrls'
import { RadiologyItem, RadiologySearchItem, RadiologyFilters, ScanType, PricingModel } from './radiology'

export interface RadiologyBookingPayload {
	radiology_id: string
	scan_ids: number[]
	booking_date: string // YYYY-MM-DD
	booking_time: string
	treatment_id: string
	external_prescription_s3_key: string | null
	notes: string | null
}

export interface RadiologyBookingItem {
	id: number
	radiology_scan: {
		id: number
		scan_type: { id: number; name: string; description?: string }
		pricing_model: string
		base_price: number | null
		price_details?: string
		is_available: boolean
	}
	custom_scan_name?: string | null
	quoted_price?: number | null
}

export interface PatientShort {
	id: string
	name: string
	phone?: string | null
	age?: number | null
	gender?: string | null
}

export interface ClinicShort {
	name?: string | null
	phone?: string | null
	address?: string | null
}

export interface RadiologyShort {
	id: string
	name: string
	phone?: string | null
	address?: string | null
}

export interface RadiologyBooking {
	// Flat phone helpers (backward compat)
	doctor_phone: string
	radiology_phone: string
	patient_phone: string
	// Nested participant details
	patient?: PatientShort | null
	clinic?: ClinicShort | null
	radiology?: RadiologyShort | null
	id: number
	public_id: string
	patient_id: number
	patient_name: string
	radiology_name: string
	radiology_public_id: string
	booking_date: string
	booking_time: string
	status: string
	payment_status: string
	prescription_verified: boolean
	verified_by_user_id: number | null
	verified_by_name?: string | null
	verified_at: string | null
	total_price: number | null
	notes?: string | null
	external_prescription_s3_key?: string | null
	booking_items: RadiologyBookingItem[]
	report?: {
    report_pdf_s3_key?: string
    dicom_images_s3_keys?: string[]
    scan_images_s3_keys?: string[]
    summary_findings?: string
}

consultation?: {
	doctor_name?: string
	chief_complaint?: string
	clinical_history?: string
	notes?: string
	recommendation?: string
	follow_up?: string
}
	created_at: string
}

export interface UpdateRadiologyBookingPayload {
	status?: string
	total_price?: number
	prescription_verified?: boolean
	notes?: string
}

export interface QuoteItemPayload {
	booking_item_id?: number | null
	radiology_scan_id?: number | null
	custom_scan_name?: string | null
	quoted_price: number
}

export interface SubmitQuotePayload {
	items: QuoteItemPayload[]
	prescription_verified?: boolean
	notes?: string | null
}

export interface RadiologyReportCreatePayload {
	report_pdf_s3_key: string
	dicom_images_s3_keys?: string[]
	scan_images_s3_keys?: string[]
	summary_findings?: string
}

// Cache management
let scanTypesCache: ScanType[] | null = null
let radiologyCache: Map<string, RadiologyItem[]> = new Map()
let cacheTimestamp: number = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export async function fetchRadiologyCatalog(
	token?: string | null,
	options?: { signal?: AbortSignal }
): Promise<RadiologyItem[]> {
	const cacheKey = 'all'
	const cachedData = radiologyCache.get(cacheKey)
	if (cachedData && Date.now() - cacheTimestamp < CACHE_DURATION) {
		return cachedData
	}

	const scanTypes = await fetchScanTypes(token, options)

	const response = await ApiService.get<{ success: boolean; message?: string; data: RadiologySearchItem[] }>(
		API_ENDPOINTS.RADIOLOGY_PROFILE.SEARCH,
		{ signal: options?.signal }
	)
	const json = response.data

	const items: RadiologyItem[] = json.data.map((item: RadiologySearchItem) => {
		const scanType = scanTypes.find((st) => st.id === item.scan_id)
		return {
			id: item.radiology_id,
			name: item.name,
			address: item.address,
			city: item.city,
			state: item.state,
			scan_id: item.scan_id,
			scan_name: item.scan_name,
			pricing_model: item.pricing_model,
			base_price: item.base_price,
			price_details: item.price_details,
			is_available: true,
			rating: Math.floor(Math.random() * 2) + 3.5,
			reviews: Math.floor(Math.random() * 100) + 10,
			phone: '+91 9876543210',
			email: 'info@radiology.com',
		}
	})

	radiologyCache.set(cacheKey, items)
	cacheTimestamp = Date.now()

	return items
}

export async function fetchScanTypes(token?: string | null, options?: { signal?: AbortSignal }): Promise<ScanType[]> {
	const cachedScanTypes = scanTypesCache
	if (cachedScanTypes !== null) {
		return cachedScanTypes
	}

	const response = await ApiService.get<{ success: boolean; message?: string; data: ScanType[] }>(
		API_ENDPOINTS.RADIOLOGY_PROFILE.SCAN_TYPES,
		{ signal: options?.signal }
	)
	const json = response.data

	const scanTypes = json.data
	scanTypesCache = scanTypes
	return scanTypes
}

export async function fetchRadiologyScans(
	radiologyId: string,
	token?: string | null,
	options?: { signal?: AbortSignal }
): Promise<any[]> {
	const response = await ApiService.get<{ success: boolean; message?: string; data: any[] }>(
		`${API_ENDPOINTS.RADIOLOGY_PROFILE.SCANS}?radiology_id=${radiologyId}`,
		{ signal: options?.signal }
	)
	return response.data.data || []
}

export async function fetchRadiologyBookings(
	token?: string | null,
	status?: string,
	options?: { signal?: AbortSignal }
): Promise<RadiologyBooking[]> {
	const url = status
		? `${API_ENDPOINTS.RADIOLOGY_PROFILE.BOOKINGS}?status=${encodeURIComponent(status)}`
		: API_ENDPOINTS.RADIOLOGY_PROFILE.BOOKINGS

	const response = await ApiService.get<{ success: boolean; message?: string; data: RadiologyBooking[] }>(url, {
		signal: options?.signal,
	})
	return response.data.data || []
}

export async function fetchRadiologyBookingDetail(
	token?: string | null,
	publicId?: string,
	options?: { signal?: AbortSignal }
): Promise<RadiologyBooking> {
	if (!publicId) {
		throw new Error('Booking public ID is required')
	}

	const url = API_ENDPOINTS.RADIOLOGY_PROFILE.BOOKING_DETAIL(publicId)
	const response = await ApiService.get<{ success: boolean; message?: string; data: RadiologyBooking }>(url, {
		signal: options?.signal,
	})
	return response.data.data
}

export async function updateRadiologyBookingStatus(
	token?: string | null,
	publicId?: string,
	payload?: UpdateRadiologyBookingPayload,
	options?: { signal?: AbortSignal }
): Promise<any> {
	if (!publicId) {
		throw new Error('Booking public ID is required')
	}

	const url = API_ENDPOINTS.RADIOLOGY_PROFILE.BOOKING_DETAIL(publicId)
	const response = await ApiService.patch<{ success: boolean; message?: string }>(url, payload)
	return response.data
}

export async function submitRadiologyBookingQuote(
	token?: string | null,
	publicId?: string,
	payload?: SubmitQuotePayload,
	options?: { signal?: AbortSignal }
): Promise<any> {
	if (!publicId) {
		throw new Error('Booking public ID is required')
	}

	const url = API_ENDPOINTS.RADIOLOGY_PROFILE.SUBMIT_QUOTE(publicId)
	const response = await ApiService.patch<{ success: boolean; message?: string }>(url, payload)
	return response.data
}

export async function verifyRadiologyPrescription(
	token?: string | null,
	publicId?: string,
	options?: { signal?: AbortSignal }
): Promise<any> {
	if (!publicId) {
		throw new Error('Booking public ID is required')
	}

	const url = API_ENDPOINTS.RADIOLOGY_PROFILE.VERIFY_PRESCRIPTION(publicId)
	const response = await ApiService.patch<{ success: boolean; message?: string }>(url, {})
	return response.data
}

export async function confirmRadiologyPayment(
	token?: string | null,
	publicId?: string,
	options?: { signal?: AbortSignal }
): Promise<any> {
	if (!publicId) {
		throw new Error('Booking public ID is required')
	}

	const url = `${API_ENDPOINTS.RADIOLOGY_PROFILE.BOOKINGS}/${publicId}/pay`
	const response = await ApiService.post<{ success: boolean; message?: string }>(url, {})
	return response.data
}

export async function uploadRadiologyReport(
	token?: string | null,
	publicId?: string,
	payload?: RadiologyReportCreatePayload,
	options?: { signal?: AbortSignal }
): Promise<any> {
	if (!publicId) {
		throw new Error('Booking public ID is required')
	}

	const url = API_ENDPOINTS.RADIOLOGY_PROFILE.UPLOAD_REPORT(publicId)
	const response = await ApiService.post<{ success: boolean; message?: string }>(url, payload)
	return response.data
}

export function applyRadiologyFilters(items: RadiologyItem[], filters: RadiologyFilters): RadiologyItem[] {
	const query = filters.search.trim().toLowerCase()

	let result = items.filter((item) => {
		const matchesSearch =
			query.length === 0 ||
			item.name.toLowerCase().includes(query) ||
			item.scan_name.toLowerCase().includes(query) ||
			item.address.toLowerCase().includes(query) ||
			item.city.toLowerCase().includes(query)

		const matchesCity = !filters.city || item.city === filters.city
		const matchesPricing = filters.pricingModel === 'all' || item.pricing_model === filters.pricingModel
		const matchesAvailability = !filters.availableOnly || item.is_available
		const matchesScanType = !filters.scanType || item.scan_id === filters.scanType

		return matchesSearch && matchesCity && matchesPricing && matchesAvailability && matchesScanType
	})

	result = [...result].sort((a, b) => {
		switch (filters.sortBy) {
			case 'name_asc':
				return a.name.localeCompare(b.name)
			case 'name_desc':
				return b.name.localeCompare(a.name)
			case 'price_asc':
				return priceSortValue(a) - priceSortValue(b)
			case 'price_desc':
				return priceSortValue(b) - priceSortValue(a)
			default:
				return 0
		}
	})

	return result
}

function priceSortValue(item: RadiologyItem): number {
	return item.base_price ?? Number.POSITIVE_INFINITY
}

export function formatPrice(item: RadiologyItem): string {
	if (item.pricing_model === 'quote_required' || item.base_price === null) {
		return 'Quote on request'
	}
	const formatted = new Intl.NumberFormat('en-IN', {
		style: 'currency',
		currency: 'INR',
		maximumFractionDigits: 0,
	}).format(item.base_price)

	return item.pricing_model === 'starting_from' ? `From ${formatted}` : formatted
}

export function getPricingModelLabel(model: PricingModel): string {
	switch (model) {
		case 'fixed':
			return 'Fixed Price'
		case 'starting_from':
			return 'Starting From'
		case 'quote_required':
			return 'Quote Required'
		default:
			return model
	}
}

export function getPricingModelColor(model: PricingModel): string {
	switch (model) {
		case 'fixed':
			return '#027a48'
		case 'starting_from':
			return '#1570ef'
		case 'quote_required':
			return '#b42318'
		default:
			return '#667085'
	}
}

export async function createRadiologyBooking(
	bookingData: RadiologyBookingPayload,
	token?: string | null,
	options?: { signal?: AbortSignal }
): Promise<any> {
	const response = await ApiService.post<{ success: boolean; message?: string }>(
		API_ENDPOINTS.RADIOLOGY_PROFILE.BOOKINGS,
		bookingData,
		{ signal: options?.signal }
	)
	return response.data
}

export function clearRadiologyCache() {
	scanTypesCache = null
	radiologyCache.clear()
	cacheTimestamp = 0
}
export { ScanType }

