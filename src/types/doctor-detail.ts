// src/types/doctor-detail.ts

export interface DoctorDetailHospital {
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
		latitude: number | null
		longitude: number | null
	}
}

export interface DoctorAvailability {
	hospital_id: string
	day_of_week: number
	slot_time: string
	is_active: boolean
	status?: 'AVAILABLE' | 'OCCUPIED' | 'BLOCKED'
	is_booked?: boolean
	is_enabled?: boolean
	can_toggle?: boolean
}

export interface DoctorDetailDegree {
	id?: string | number
	degree: string
	specialization?: string
	college: string
	year_of_passing: string
}

export interface DoctorAchievementItem {
	id: string
	title: string
	achievement_type: string | null
	organization: string | null
	achievement_date: string | null
	description: string | null
	document_s3_key: string | null
}

export interface DoctorDetailData {
	id: string
	name: string
	is_verified: boolean
	details: {
		avatar_s3_key: string | null
		location: string
		experience_years: number
		languages: string[]
		degree: string
		college: string
		year_of_passing: string
		about: string
		registration_number: string
		degrees?: DoctorDetailDegree[]
	}
	additionalDetail?: {
		areas_of_expertise?: { id: string; label: string }[]
		treatments?: { id: string; label: string }[]
	}
	specialities: string[]
	achievements?: DoctorAchievementItem[]
	hospitals: DoctorDetailHospital[]
	availability: DoctorAvailability[]
}

export interface DoctorDetailResponse {
	success: boolean
	message: string
	data: DoctorDetailData
}

export interface AppointmentType {
	id: 'clinic' | 'video'
	label: string
	description: string
	price: number
	duration: number
}
