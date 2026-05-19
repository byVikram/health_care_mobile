// src/types/doctor-profile.ts

export interface DoctorProfilePersonal {
	name: string
	contactNumber: string
	contactVerified: boolean
	email: string
	emailVerified: boolean
	gender: string
	dateOfBirth: string
	location: string
	avatar: string
	experience: string
	languages: string[]
}

export interface DoctorProfileProfessional {
	specialization_id: string
	specialization_label: string
	degree: string
	college: string
	yearOfPassing: string
	qualificationProof: string
	registrationNumber: string
	registrationProof: string
	about: string
}

export interface DoctorHospital {
	id: string
	hospital_id?: string
	name: string
	location: string
	fullAddress: string
	isPrimary: boolean
	phone_number?: string
	video_consultation_fee?: string
	offline_consultation_fee?: string
}

export interface DoctorAvailability {
	monday: string[]
	tuesday: string[]
	wednesday: string[]
	thursday: string[]
	friday: string[]
	saturday: string[]
	sunday: string[]
}

export interface DoctorProfile {
	id: string
	specialization: string
	personal: DoctorProfilePersonal
	professional: DoctorProfileProfessional
	hospitals: DoctorHospital[]
	availability: DoctorAvailability
}
