// src/features/laboratory/laboratory.ts

// ─────────────────────────────────────────────
// Enums / Unions
// ─────────────────────────────────────────────

export type CollectionType = 'walk_in' | 'home_collection'

// ─────────────────────────────────────────────
// Core entity types
// ─────────────────────────────────────────────

export interface LaboratoryItem {
	id: string
	name: string
	owner_name: string
	avatar_s3_key: string | null
	address: string
	city: string
	operating_hours: {
		open: string
		close: string
		[key: string]: string
	}
	home_collection_available: boolean
	is_24_x_7: boolean
	is_nabl_accredited: boolean
	emergency_tests_available: boolean
	image?: any
}

export interface LabTestType {
	id: string
	name: string
	category: string
	turnaround: string
	base_price: number
	description?: string
	pricing_model?: string
	price_details?: string
}

// ─────────────────────────────────────────────
// API response shapes
// ─────────────────────────────────────────────

export interface LaboratoryListResponse {
	success: boolean
	message: string
	data: LaboratoryItem[]
}

export interface LaboratoryDetailResponse {
	success: boolean
	message: string
	data: LaboratoryItem
}

export interface LabTestTypesResponse {
	success: boolean
	message: string
	data: LabTestType[]
}

// ─────────────────────────────────────────────
// Filter / UI state
// ─────────────────────────────────────────────

export interface LaboratoryFilters {
	search: string
	city: string
	homeCollection: boolean
	is24x7: boolean
	nablAccredited: boolean
	emergencyTests: boolean
}

export const DEFAULT_LABORATORY_FILTERS: LaboratoryFilters = {
	search: '',
	city: '',
	homeCollection: false,
	is24x7: false,
	nablAccredited: false,
	emergencyTests: false,
}

// ─────────────────────────────────────────────
// Booking types
// ─────────────────────────────────────────────

export interface LabBookingItem {
	id?: number
	test_name: string
	custom_test_name?: string | null
	category?: string
	quoted_price?: number | null
	base_price?: number | null
	turnaround?: string
	result?: string | null
}

export interface LabBooking {
	public_id: string
	patient_name: string
	patient_phone?: string
	laboratory_name: string
	laboratory_public_id?: string
	laboratory_phone?: string
	booking_date: string
	booking_time: string
	collection_type: CollectionType
	collection_address?: string
	status: string
	payment_status: string
	total_price: number | null
	notes?: string | null
	created_at: string
	booking_items: LabBookingItem[]
	report?: {
		report_pdf_s3_key?: string | null
		result_images_s3_keys?: string[]
	} | null
	external_prescription_s3_key?: string | null
	verified_by_name?: string
	prescription_verified?: boolean
	patient?: {
		name?: string
		age?: number
		gender?: string
		phone?: string
	}
	laboratory?: {
		phone?: string
	}
}

// ─────────────────────────────────────────────
// Payload types
// ─────────────────────────────────────────────

export interface PlaceLabOrderPayload {
	laboratory_public_id: string
	test_type_ids: string[]
	custom_tests: string
	collection_type: CollectionType
	collection_address_public_id: string | null
	notes: string | null
}

export interface SubmitLabQuotePayload {
	items: {
		booking_item_id: number | null
		test_name: string
		quoted_price: number
	}[]
	notes?: string | null
}