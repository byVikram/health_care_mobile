export type PharmacyOperatingHours = {
	open?: string
	close?: string
}

export type PharmacyPersonalDetails = {
	owner_name?: string
	mobile_number?: string
	alternate_mobile?: string
	whatsapp_number?: string
	email?: string
	avatar_s3_key?: string | null
	avatar?: unknown
}

export type PharmacyDetails = {
	name?: string
	logo_s3_key?: string | null
	drug_license_number?: string
	drug_license_s3_key?: string | null
	gst_number?: string
	gst_certificate_s3_key?: string | null
	address?: string
	city?: string
	state?: string
	pincode?: string
	landmark?: string | null
	latitude?: number | string | null
	longitude?: number | string | null
	logo?: unknown
}

export type PharmacyServicesDetails = {
	operating_hours?: PharmacyOperatingHours
	open_days?: string[]
	payment_methods?: string[]
	home_delivery_available?: boolean
	delivery_radius_km?: number | string
	estimated_delivery_time_mins?: number | string
	min_order_amount?: number | string
	is_24_x_7?: boolean
	emergency_medicine_available?: boolean
}

export type PharmacyProfileData = {
	personal?: PharmacyPersonalDetails
	pharmacy?: PharmacyDetails
	services?: PharmacyServicesDetails
}

export type PharmacyProfileApiResponse = {
	success?: boolean
	message?: string
	data?: PharmacyProfileData
}

export type PharmacyProfileUpdatePayload = Partial<{
	owner_name: string
	alternate_mobile: string
	whatsapp_number: string
	avatar: unknown
	avatar_s3_key: string | null
	name: string
	logo: unknown
	logo_s3_key: string | null
	drug_license_number: string
	gst_number: string
	address: string
	city: string
	state: string
	pincode: string
	landmark: string
	latitude: number | null
	longitude: number | null
	operating_hours: PharmacyOperatingHours
	open_days: string[]
	payment_methods: string[]
	home_delivery_available: boolean
	delivery_radius_km: number
	estimated_delivery_time_mins: number
	min_order_amount: number
	is_24_x_7: boolean
	emergency_medicine_available: boolean
}>
