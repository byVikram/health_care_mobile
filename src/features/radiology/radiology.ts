// radiology.ts
export type PricingModel = 'quote_required' | 'starting_from' | 'fixed'

export interface ScanType {
	id: number
	name: string
	description: string
}

export interface RadiologyItem {
	id: string // radiology_id from API
	name: string
	address: string
	city: string
	state: string
	scan_id: number
	scan_name: string
	pricing_model: PricingModel
	base_price: number | null
	price_details: string
	is_available: boolean
	// Additional fields for display
	rating?: number
	reviews?: number
	distance?: string
	phone?: string
	email?: string
}

export interface RadiologySearchResponse {
	success: boolean
	message: string
	data: RadiologySearchItem[]
}

export interface RadiologySearchItem {
	id: string
	name: string
	address: string
	city: string
	state: string
	scan_id: number
	scan_name: string
	pricing_model: PricingModel
	base_price: number | null
	price_details: string
}

export interface RadiologyFilters {
	search: string
	city: string
	pricingModel: PricingModel | 'all'
	availableOnly: boolean
	sortBy: 'name_asc' | 'name_desc' | 'price_asc' | 'price_desc'
	scanType?: number
}

export const DEFAULT_RADIOLOGY_FILTERS: RadiologyFilters = {
	search: '',
	city: '',
	pricingModel: 'all',
	availableOnly: false,
	sortBy: 'name_asc',
}

export interface RadiologyBookingRequest {
	radiology_id: string
	scan_id: number
	patient_id: string
	preferred_date: string
	preferred_time: string
	notes?: string
	prescription_image?: string
}
