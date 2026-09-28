// radiology.ts
export type PricingModel = 'quote_required' | 'starting_from' | 'fixed'

export interface ScanType {
	id: number
	name: string
	description: string
}

export interface RadiologyScanOffering {
	scan_id: number
	scan_name: string
	pricing_model: PricingModel
	base_price: number | null
	price_details: string
	is_available: boolean
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
	scans?: RadiologyScanOffering[]
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

// ─────────────────────────────────────────────
// Booking types
// (moved here from RadiologyService.ts so all radiology types live in
// one place, mirroring the laboratory module's laboratory.ts/laboratoryService.ts split)
// ─────────────────────────────────────────────

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
