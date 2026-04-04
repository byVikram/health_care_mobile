// src/types/doctor-search.ts

export interface DoctorSearchItem {
	id: string
	name: string
	is_verified: boolean
	avatar_s3_key: string | null
	location: string
	experience_years: number
	specialities: string[]
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
