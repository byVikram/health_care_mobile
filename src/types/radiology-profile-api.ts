// src/types/radiology-profile-api.ts

export type RadiologyOperatingHours = Record<string, string>

export type RadiologyDetails = {
	id?: number
	name?: string
	logo_s3_key?: string | null
	license_number?: string
	license_proof_s3_key?: string | null
	gst_number?: string | null
	address?: string
	city?: string
	state?: string
	pincode?: string
	latitude?: number | null
	longitude?: number | null
	operating_hours?: RadiologyOperatingHours
	open_days?: number[]
	payment_methods?: string[]
	logo?: unknown
}

export type RadiologyProfileData = {
	id?: number
	public_id?: string
	owner_name?: string
	alternate_mobile?: string | null
	whatsapp_number?: string | null
	avatar_s3_key?: string | null
	email?: string
	contact_number?: string | null
	is_verified?: boolean
	details?: RadiologyDetails | null
}

export type RadiologyProfileApiResponse = {
	success?: boolean
	message?: string
	data?: RadiologyProfileData
}

export type RadiologyProfileUpdatePayload = Partial<{
	owner_name: string
	alternate_mobile: string | null
	whatsapp_number: string | null
	logo_s3_key: string | null
	name: string
	license_number: string
	license_proof_s3_key: string
	gst_number: string | null
	address: string
	city: string
	state: string
	pincode: string
	latitude: number | null
	longitude: number | null
	operating_hours: RadiologyOperatingHours
	open_days: number[]
	payment_methods: string[]
	avatar: unknown
	logo: unknown
}>
