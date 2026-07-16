// src/types/doctor-profile-api.ts
// Matches the /api/doctors/details API response shape

export interface DoctorProfileApiSpeciality {
	id: string
	label: string
}

export interface DoctorProfileApiHospital {
	id: string
	is_primary: boolean
	video_consultation_fee: string
	offline_consultation_fee: string
	available_days: string[]
	working_hours: string
	hospital: {
		id: string
		name: string
		address: string
		contact_number: string
		distance: string
		latitude: number
		longitude: number
	}
}

export interface DoctorProfileApiAvailability {
	day_of_week: number
	slot_time: string
	is_active: boolean
	hospital_id: string
	hospital_name: string
}

export interface DoctorProfileApiAchievement {
	id: string | number
	title?: string | null
	category?: string | null
	description?: string | null
	organization?: string | null
	issuing_organization?: string | null
	hospital?: string | null
	date?: string | null
	date_awarded?: string | null
	awarded_on?: string | null
	image?: string | null
	image_url?: string | null
	document_url?: string | null
	verification_document_s3_key?: string | null
	is_public?: boolean | null
	isPublic?: boolean | null
}

export interface DoctorDegreeApi {
	id?: number
	degree: string
	specialization?: string | null
	college: string
	year_of_passing: string
	qualification_proof_s3_key?: string | null
}

export interface DoctorProfileApiData {
	personal_details: {
		name: string
		email: string
		contact_number: string
		is_verified: boolean
		avatar_s3_key: string | null
		gender: string
		date_of_birth: string
		location: string
		languages: string[]
	}
	professional_details: {
		experience_years: number
		degree: string
		college: string
		year_of_passing: string
		qualification_proof_s3_key: string | null
		degrees?: DoctorDegreeApi[]
		registration_number: string
		registration_proof_s3_key: string | null
		about: string
		instagram_url?: string | null
		facebook_url?: string | null
		instagram?: string | null
		facebook?: string | null
		twitter_url?: string | null
		twitter?: string | null
		specialities: DoctorProfileApiSpeciality[]
	}
	hospitals: DoctorProfileApiHospital[]
	availability: DoctorProfileApiAvailability[]
	achievements?: DoctorProfileApiAchievement[]
	additionalDetail?: {
		areas_of_expertise: Array<{ id: string; label: string }>
		treatments: Array<{ id: string; label: string }>
	}
}

export interface DoctorProfileApiResponse {
	success: boolean
	message: string
	data: DoctorProfileApiData
}
