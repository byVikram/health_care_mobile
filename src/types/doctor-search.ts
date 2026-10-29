// src/types/doctor-search.ts

export interface DoctorSearchHospital {
	name: string
	address: string | null
	latitude: number | null
	longitude: number | null
	offline_consultation_fee: number | null
	video_consultation_fee: number | null
}

export interface DoctorSearchItem {
	id: string
	name: string
	is_verified: boolean
	avatar_s3_key: string | null
	location: string
	experience_years: number
	specialities: string[]
	qualifications: string[]
	hospital: DoctorSearchHospital | null
	distance: number | null
	gender?: string | null
	/** Still has a bookable slot today at the clinic shown. */
	available_today?: boolean
}

export interface DoctorSearchResponse {
	success: boolean
	message: string
	data: DoctorSearchItem[]
	total: number
	page: number
	limit: number
	pages: number
}
