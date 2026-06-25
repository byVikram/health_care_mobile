export type LaboratoryOperatingHours = Record<string, string>

export type LaboratoryDetails = {
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
	latitude?: number | string | null
	longitude?: number | string | null
	operating_hours?: LaboratoryOperatingHours
	open_days?: number[]
	payment_methods?: string[]
	logo?: unknown
}

export type LaboratoryProfileData = {
	id?: number
	public_id?: string
	owner_name?: string
	alternate_mobile?: string | null
	whatsapp_number?: string | null
	avatar_s3_key?: string | null
	email?: string
	contact_number?: string | null
	is_verified?: boolean
	details?: LaboratoryDetails | null
}

export type LaboratoryProfileApiResponse = {
	success?: boolean
	message?: string
	data?: LaboratoryProfileData
}

export type LaboratoryProfileUpdatePayload = Partial<{
	owner_name: string
	alternate_mobile: string | null
	whatsapp_number: string | null
	avatar: unknown
	avatar_s3_key: string | null
	name: string
	logo: unknown
	logo_s3_key: string | null
	license_number: string
	license_proof: unknown
	license_proof_s3_key: string | null
	gst_number: string | null
	address: string
	city: string
	state: string
	pincode: string
	latitude: number | null
	longitude: number | null
	operating_hours: LaboratoryOperatingHours
	open_days: number[]
	payment_methods: string[]
}>
