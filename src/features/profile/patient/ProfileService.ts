// src/features/profile/patientProfileService.ts

import ApiService from '../../../services/apiService'
import { API_ENDPOINTS } from '../../../constants/apiUrls'
import { buildApiPayload } from './profileFieldsConfig'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface PatientProfileData {
	// Personal
	full_name?: string
	phone_number?: string
	email?: string
	gender?: string
	date_of_birth?: string
	blood_group?: string
	marital_status?: string
	height_cm?: string
	weight_kg?: string
	emergency_contact?: string
	location?: string
	profile_image?: string

	// Medical (arrays from API)
	allergies?: string[]
	current_medications?: string[]
	chronic_conditions?: string[]
	past_surgeries?: string[]
	family_history?: string[]
	disabilities?: string[]

	// Lifestyle
	smoking_status?: string
	alcohol_consumption?: string
	exercise_frequency?: string
	diet_type?: string
	sleep_hours?: string
	occupation?: string
}

export interface PatientProfileResponse {
	success: boolean
	message: string
	data: PatientProfileData
}

export interface PatchPatientProfileResponse {
	success: boolean
	message: string
	data: PatientProfileData
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/patients/me  →  basic info (name, photo, etc.)
// ─────────────────────────────────────────────────────────────────────────────
export const getPatientMe = async (): Promise<PatientProfileResponse> => {
	const res = await ApiService.get<PatientProfileResponse>(API_ENDPOINTS.PATIENT.ME)
	return res.data
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/patients/me/details  →  full profile
// ─────────────────────────────────────────────────────────────────────────────
export const getPatientDetails = async (): Promise<PatientProfileResponse> => {
	const res = await ApiService.get<PatientProfileResponse>(API_ENDPOINTS.PATIENT.DETAILS)
	return res.data
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/patients/me/details  →  update profile
// Accepts local state Record<string,string> — converts via buildApiPayload()
// ─────────────────────────────────────────────────────────────────────────────
export const patchPatientDetails = async (localData: Record<string, string>): Promise<PatchPatientProfileResponse> => {
	const payload = buildApiPayload(localData)
	const res = await ApiService.patch<PatchPatientProfileResponse>(API_ENDPOINTS.PATIENT.DETAILS, payload)
	return res.data
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: API response  →  local state Record<string,string>
// Use to pre-fill PatientProfileLayout after a GET
// ─────────────────────────────────────────────────────────────────────────────
export const mapApiDataToLocalState = (apiData: any): Record<string, string> => {
	const { personal, medical, lifestyle } = apiData

	return {
		// Personal
		...(personal?.name && { name: personal.name }),
		...(personal?.contact_number && { contactNumber: personal.contact_number }),
		...(personal?.email && { email: personal.email }),
		...(personal?.gender && { gender: personal.gender }),
		...(personal?.date_of_birth && { dateOfBirth: personal.date_of_birth }),
		...(personal?.blood_group && { bloodGroup: personal.blood_group }),
		...(personal?.marital_status && { maritalStatus: personal.marital_status }),
		...(personal?.height && { height: personal.height }),
		...(personal?.weight && { weight: personal.weight }),
		...(personal?.location && { location: personal.location }),
		...(personal?.avatar && { photoUrl: personal.avatar }),

		// Emergency contact (nested object)
		...(personal?.emergency_contact?.number && {
			emergencyContact: personal.emergency_contact.number,
		}),

		// Medical (NOTE: your API gives strings, not arrays)
		...(medical?.allergies && { allergies: medical.allergies }),
		...(medical?.current_medications && { currentMedications: medical.current_medications }),
		...(medical?.chronic_conditions && { chronicConditions: medical.chronic_conditions }),
		...(medical?.past_surgeries && { pastSurgeries: medical.past_surgeries }),
		...(medical?.family_history && { familyHistory: medical.family_history }),

		// Lifestyle
		...(lifestyle?.smoking_status && { smoking: lifestyle.smoking_status }),
		...(lifestyle?.alcohol_consumption && { alcohol: lifestyle.alcohol_consumption }),
		...(lifestyle?.activity_level && { exerciseFrequency: lifestyle.activity_level }),
		...(lifestyle?.diet_type && { dietType: lifestyle.diet_type }),
		...(lifestyle?.sleep_hours && { sleepHours: lifestyle.sleep_hours }),
	}
}
