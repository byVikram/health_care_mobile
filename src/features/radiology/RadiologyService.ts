// src/features/radiology/RadiologyService.ts
import { API_ENDPOINTS } from '../../constants/apiUrls'
import {
	RadiologyItem,
	RadiologySearchItem,
	RadiologySearchResponse,
	RadiologyFilters,
	ScanType,
	PricingModel,
} from './radiology'

class RadiologyServiceError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'RadiologyServiceError'
	}
}

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

export interface RadiologyBooking {
	doctor_phone: string
	radiology_phone: string
	patient_phone: string
	id: number
	public_id: string
	patient_id: number
	patient_name: string
	radiology_name: string
	radiology_public_id: string
	booking_date: string // YYYY-MM-DD
	booking_time: string
	status: string
	payment_status: string
	prescription_verified: boolean
	verified_by_user_id: number | null
	verified_at: string | null
	total_price: number | null
	notes?: string | null
	external_prescription_s3_key?: string | null
	booking_items: RadiologyBookingItem[]
	created_at: string
}
// Cache management
let scanTypesCache: ScanType[] | null = null
let radiologyCache: Map<string, RadiologyItem[]> = new Map()
let cacheTimestamp: number = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

const authHeaders = (token?: string | null) => ({
	Accept: 'application/json',
	...(token ? { Authorization: `Bearer ${token}` } : {}),
})

const extractDetail = (json: any, fallback: string) => {
	if (!json) return fallback
	if (typeof json.detail === 'string') return json.detail
	if (json.message) return json.message
	return fallback
}

export async function fetchRadiologyCatalog(
	token?: string | null,
	options?: { signal?: AbortSignal }
): Promise<RadiologyItem[]> {
	try {
		const cacheKey = 'all'
		const cachedData = radiologyCache.get(cacheKey)
		if (cachedData && Date.now() - cacheTimestamp < CACHE_DURATION) {
			return cachedData
		}

		const scanTypes = await fetchScanTypes(token, options)

		const response = await fetch(API_ENDPOINTS.RADIOLOGY_PROFILE.SEARCH, {
			headers: authHeaders(token),
			signal: options?.signal,
		})

		const json: RadiologySearchResponse | any = await response.json().catch(() => null)

		if (!response.ok) {
			throw new RadiologyServiceError(extractDetail(json, `Failed to fetch scan catalog (${response.status})`))
		}

		if (!json.success) {
			throw new RadiologyServiceError(json.message || 'Scan catalog request failed')
		}

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
	} catch (error) {
		if (error instanceof RadiologyServiceError) throw error
		throw new RadiologyServiceError(error instanceof Error ? error.message : 'Failed to load scan catalog')
	}
}

export async function fetchScanTypes(token?: string | null, options?: { signal?: AbortSignal }): Promise<ScanType[]> {
	const cachedScanTypes = scanTypesCache
	if (cachedScanTypes !== null) {
		return cachedScanTypes
	}

	try {
		const response = await fetch(API_ENDPOINTS.RADIOLOGY_PROFILE.SCAN_TYPES, {
			headers: authHeaders(token),
			signal: options?.signal,
		})

		const json: { success: boolean; message?: string; data: ScanType[] } | any = await response
			.json()
			.catch(() => null)

		if (!response.ok) {
			throw new RadiologyServiceError(extractDetail(json, `Failed to fetch scan types (${response.status})`))
		}

		if (!json.success || !Array.isArray(json.data)) {
			throw new RadiologyServiceError(json.message || 'Failed to fetch scan types')
		}

		const scanTypes = json.data
		scanTypesCache = scanTypes
		return scanTypes
	} catch (error) {
		if (error instanceof RadiologyServiceError) throw error
		throw new RadiologyServiceError(error instanceof Error ? error.message : 'Failed to load scan types')
	}
}

export async function fetchRadiologyScans(
	radiologyId: string,
	token?: string | null,
	options?: { signal?: AbortSignal }
): Promise<any[]> {
	try {
		const response = await fetch(`${API_ENDPOINTS.RADIOLOGY_PROFILE.SCANS}?radiology_id=${radiologyId}`, {
			headers: authHeaders(token),
			signal: options?.signal,
		})

		const json = await response.json().catch(() => null)

		if (!response.ok) {
			throw new RadiologyServiceError(extractDetail(json, `Failed to fetch scans (${response.status})`))
		}

		if (!json.success) {
			throw new RadiologyServiceError(json.message || 'Failed to fetch available scans')
		}

		return json.data || []
	} catch (error) {
		if (error instanceof RadiologyServiceError) throw error
		throw new RadiologyServiceError(error instanceof Error ? error.message : 'Failed to load available scans')
	}
}

export async function fetchRadiologyBookings(
	token?: string | null,
	status?: string,
	options?: { signal?: AbortSignal }
): Promise<RadiologyBooking[]> {
	try {
		const url = status
			? `${API_ENDPOINTS.RADIOLOGY_PROFILE.BOOKINGS}?status=${encodeURIComponent(status)}`
			: API_ENDPOINTS.RADIOLOGY_PROFILE.BOOKINGS

		const response = await fetch(url, {
			headers: authHeaders(token),
			signal: options?.signal,
		})

		const json = await response.json().catch(() => null)

		if (!response.ok) {
			throw new RadiologyServiceError(extractDetail(json, `Failed to fetch bookings (${response.status})`))
		}

		if (!json.success) {
			throw new RadiologyServiceError(json.message || 'Failed to fetch bookings')
		}

		return json.data || []
	} catch (error) {
		if (error instanceof RadiologyServiceError) throw error
		throw new RadiologyServiceError(error instanceof Error ? error.message : 'Failed to load bookings')
	}
}

// ─── Fetch a single booking by public_id ────────────────────────────────────

export async function fetchRadiologyBookingDetail(
	token?: string | null,
	publicId?: string,
	options?: { signal?: AbortSignal }
): Promise<RadiologyBooking> {
	if (!publicId) {
		throw new RadiologyServiceError('Booking public ID is required')
	}

	try {
		const url = API_ENDPOINTS.RADIOLOGY_PROFILE.BOOKING_DETAIL(publicId)
		const response = await fetch(url, {
			headers: authHeaders(token),
			signal: options?.signal,
		})

		const json = await response.json().catch(() => null)

		if (!response.ok) {
			throw new RadiologyServiceError(extractDetail(json, `Failed to fetch booking (${response.status})`))
		}

		if (!json.success) {
			throw new RadiologyServiceError(json.message || 'Failed to fetch booking details')
		}

		return json.data
	} catch (error) {
		if (error instanceof RadiologyServiceError) throw error
		throw new RadiologyServiceError(error instanceof Error ? error.message : 'Failed to load booking details')
	}
}

// ─── Update booking status / fee ─────────────────────────────────────────────

export interface UpdateRadiologyBookingPayload {
	status?: string
	total_price?: number
	prescription_verified?: boolean
	notes?: string
}

export async function updateRadiologyBookingStatus(
	token?: string | null,
	publicId?: string,
	payload?: UpdateRadiologyBookingPayload,
	options?: { signal?: AbortSignal }
): Promise<any> {
	if (!publicId) {
		throw new RadiologyServiceError('Booking public ID is required')
	}

	try {
		const url = API_ENDPOINTS.RADIOLOGY_PROFILE.BOOKING_DETAIL(publicId)
		const response = await fetch(url, {
			method: 'PATCH', // or PUT if your API uses that
			headers: {
				...authHeaders(token),
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(payload),
			signal: options?.signal,
		})

		const json = await response.json().catch(() => null)

		if (!response.ok) {
			throw new RadiologyServiceError(extractDetail(json, `Failed to update booking (${response.status})`))
		}

		if (!json.success) {
			throw new RadiologyServiceError(json.message || 'Failed to update booking')
		}

		return json
	} catch (error) {
		if (error instanceof RadiologyServiceError) throw error
		throw new RadiologyServiceError(error instanceof Error ? error.message : 'Failed to update booking')
	}
}

// ─── Filters and helpers ──────────────────────────────────────────────────────

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
	try {
		const response = await fetch(API_ENDPOINTS.RADIOLOGY_PROFILE.BOOKINGS, {
			method: 'POST',
			headers: {
				...authHeaders(token),
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(bookingData),
			signal: options?.signal,
		})

		const json = await response.json().catch(() => null)

		if (!response.ok) {
			throw new RadiologyServiceError(extractDetail(json, `Failed to create booking (${response.status})`))
		}

		return json
	} catch (error) {
		if (error instanceof RadiologyServiceError) throw error
		throw new RadiologyServiceError(error instanceof Error ? error.message : 'Failed to create booking')
	}
}

export function clearRadiologyCache() {
	scanTypesCache = null
	radiologyCache.clear()
	cacheTimestamp = 0
}

export const RadiologyService = {
	fetchRadiologyCatalog,
	fetchScanTypes,
	fetchRadiologyScans,
	fetchRadiologyBookings,
	fetchRadiologyBookingDetail,
	updateRadiologyBookingStatus, // <-- new
	applyRadiologyFilters,
	formatPrice,
	getPricingModelLabel,
	getPricingModelColor,
	createRadiologyBooking,
	clearCache: clearRadiologyCache,
}

export default RadiologyService
