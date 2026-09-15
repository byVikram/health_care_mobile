// src/features/radiology/RadiologyService.ts
import ApiService from '../../services/apiService'
import { API_ENDPOINTS } from '../../constants/apiUrls'
import {
	RadiologyItem,
	RadiologySearchItem,
	RadiologyFilters,
	ScanType,
	PricingModel,
	RadiologyScanOffering,
	RadiologyBookingPayload,
	RadiologyBookingItem,
	PatientShort,
	ClinicShort,
	RadiologyShort,
	RadiologyBooking,
	UpdateRadiologyBookingPayload,
	QuoteItemPayload,
	SubmitQuotePayload,
	RadiologyReportCreatePayload,
} from './radiology'

export type {
	RadiologyBookingPayload,
	RadiologyBookingItem,
	PatientShort,
	ClinicShort,
	RadiologyShort,
	RadiologyBooking,
	UpdateRadiologyBookingPayload,
	QuoteItemPayload,
	SubmitQuotePayload,
	RadiologyReportCreatePayload,
}

// Cache management
let scanTypesCache: ScanType[] | null = null
let radiologyCache: Map<string, { data: RadiologyItem[]; timestamp: number }> = new Map()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
const RAW_SEARCH_PAGE_SIZE = 100

interface RadiologySearchMeta {
	total?: number
	page?: number
	limit?: number
	pages?: number
}

export interface RadiologyCatalogParams {
	search?: string
	city?: string
	scan_type_id?: number
	pricing_model?: PricingModel | 'all'
	available_only?: boolean
	page?: number
	limit?: number
}

export interface RadiologyCatalogResult {
	data: RadiologyItem[]
	total: number
	page: number
	limit: number
}

function getCenterSummaryScan(scans: RadiologyScanOffering[]): RadiologyScanOffering {
	const pricedScans = scans.filter((scan) => scan.base_price !== null)
	const cheapestScan = pricedScans.sort((a, b) => (a.base_price ?? 0) - (b.base_price ?? 0))[0]
	return cheapestScan ?? scans[0]
}

function mapRawSearchItemsToCenters(rawItems: RadiologySearchItem[]): RadiologyItem[] {
	const centerMap = new Map<string, RadiologyItem>()

	for (const item of rawItems) {
		const scan: RadiologyScanOffering = {
			scan_id: item.scan_id,
			scan_name: item.scan_name,
			pricing_model: item.pricing_model,
			base_price: item.base_price,
			price_details: item.price_details,
			is_available: true,
		}
		const existing = centerMap.get(item.id)

		if (existing) {
			if (!existing.scans?.some((existingScan) => existingScan.scan_id === scan.scan_id)) {
				existing.scans = [...(existing.scans ?? []), scan]
				const summaryScan = getCenterSummaryScan(existing.scans)
				existing.scan_id = summaryScan.scan_id
				existing.scan_name = summaryScan.scan_name
				existing.pricing_model = summaryScan.pricing_model
				existing.base_price = summaryScan.base_price
				existing.price_details = summaryScan.price_details
				existing.is_available = existing.scans.some((scanItem) => scanItem.is_available)
			}
			continue
		}

		centerMap.set(item.id, {
			id: item.id,
			name: item.name,
			address: item.address,
			city: item.city,
			state: item.state,
			scan_id: scan.scan_id,
			scan_name: scan.scan_name,
			pricing_model: scan.pricing_model,
			base_price: scan.base_price,
			price_details: scan.price_details,
			is_available: true,
			scans: [scan],
			rating: Math.floor(Math.random() * 2) + 3.5,
			reviews: Math.floor(Math.random() * 100) + 10,
			phone: '+91 9876543210',
			email: 'info@radiology.com',
		})
	}

	return Array.from(centerMap.values())
}

export async function fetchRadiologyCatalog(
	params: RadiologyCatalogParams = {},
	options?: { signal?: AbortSignal }
): Promise<RadiologyCatalogResult> {
	const requestedPage = params.page || 1
	const requestedLimit = params.limit || 10
	const cacheKey = JSON.stringify({
		search: params.search || '',
		city: params.city || '',
		scan_type_id: params.scan_type_id || '',
		pricing_model: params.pricing_model || 'all',
		available_only: Boolean(params.available_only),
	})
	const cachedData = radiologyCache.get(cacheKey)
	if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
		const start = (requestedPage - 1) * requestedLimit
		return {
			data: cachedData.data.slice(start, start + requestedLimit),
			total: cachedData.data.length,
			page: requestedPage,
			limit: requestedLimit,
		}
	}

	const baseParams = {
		search: params.search || undefined,
		city: params.city || undefined,
		scan_type_id: params.scan_type_id || undefined,
		pricing_model:
			params.pricing_model && params.pricing_model !== 'all' ? params.pricing_model : undefined,
		available_only: params.available_only || undefined,
	}

	const fetchRawPage = (page: number) =>
		ApiService.get<{
			success: boolean
			message?: string
			data: RadiologySearchItem[]
			meta?: RadiologySearchMeta
		}>(API_ENDPOINTS.RADIOLOGY_PROFILE.SEARCH, {
			params: {
				...baseParams,
				page,
				limit: RAW_SEARCH_PAGE_SIZE,
			},
			signal: options?.signal,
		})

	const firstResponse = await fetchRawPage(1)
	const firstData = firstResponse.data?.data ?? []
	const firstMeta = firstResponse.data?.meta
	const totalRawRows = firstMeta?.total ?? firstData.length
	const rawLimit = firstMeta?.limit || RAW_SEARCH_PAGE_SIZE
	const totalRawPages = firstMeta?.pages || Math.ceil(totalRawRows / rawLimit) || 1
	const remainingResponses =
		totalRawPages > 1
			? await Promise.all(Array.from({ length: totalRawPages - 1 }, (_, index) => fetchRawPage(index + 2)))
			: []

	const rawItems = [
		...firstData,
		...remainingResponses.flatMap((response) => response.data?.data ?? []),
	]
	const centers = mapRawSearchItemsToCenters(rawItems)
	const start = (requestedPage - 1) * requestedLimit
	const pagedCenters = centers.slice(start, start + requestedLimit)

	const result: RadiologyCatalogResult = {
		data: pagedCenters,
		total: centers.length,
		page: requestedPage,
		limit: requestedLimit,
	}

	radiologyCache.set(cacheKey, {
		data: centers,
		timestamp: Date.now(),
	})

	return result
}

export async function fetchScanTypes( options?: { signal?: AbortSignal }): Promise<ScanType[]> {
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
	
	options?: { signal?: AbortSignal }
): Promise<any[]> {
	const response = await ApiService.get<{ success: boolean; message?: string; data: any[] }>(
		`${API_ENDPOINTS.RADIOLOGY_PROFILE.SCANS}?radiology_id=${radiologyId}`,
		{ signal: options?.signal }
	)
	return response.data.data || []
}

export async function fetchRadiologyBookings(
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
		const scans = item.scans ?? []
		const matchingScans =
			scans.length === 0
				? [item]
				: scans.filter((scan) => {
						const matchesSearch =
							query.length === 0 ||
							scan.scan_name.toLowerCase().includes(query) ||
							item.name.toLowerCase().includes(query) ||
							item.address.toLowerCase().includes(query) ||
							item.city.toLowerCase().includes(query)
						const matchesPricing =
							filters.pricingModel === 'all' || scan.pricing_model === filters.pricingModel
						const matchesAvailability = !filters.availableOnly || scan.is_available
						const matchesScanType = !filters.scanType || scan.scan_id === filters.scanType

						return matchesSearch && matchesPricing && matchesAvailability && matchesScanType
					})
		const matchesSearch =
			query.length === 0 ||
			item.name.toLowerCase().includes(query) ||
			item.scan_name.toLowerCase().includes(query) ||
			scans.some((scan) => scan.scan_name.toLowerCase().includes(query)) ||
			item.address.toLowerCase().includes(query) ||
			item.city.toLowerCase().includes(query)

		const matchesCity = !filters.city || item.city === filters.city
		const matchesScanFilters = matchingScans.length > 0

		return matchesSearch && matchesCity && matchesScanFilters
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
}
