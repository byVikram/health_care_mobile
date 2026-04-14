// src/features/profile/patientProfileService.ts

import ApiService from '../../services/apiService'
import { API_ENDPOINTS } from '../../constants/apiUrls'
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
export const patchPatientDetails = async (
  localData: Record<string, string>
): Promise<PatchPatientProfileResponse> => {
  const payload = buildApiPayload(localData)
  const res = await ApiService.patch<PatchPatientProfileResponse>(
    API_ENDPOINTS.PATIENT.DETAILS,
    payload
  )
  return res.data
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: API response  →  local state Record<string,string>
// Use to pre-fill HealthProfileScreen after a GET
// ─────────────────────────────────────────────────────────────────────────────
export const mapApiDataToLocalState = (
  apiData: PatientProfileData
): Record<string, string> => ({
  // Personal
  ...(apiData.full_name         && { name:              apiData.full_name }),
  ...(apiData.phone_number      && { contactNumber:      apiData.phone_number }),
  ...(apiData.email             && { email:              apiData.email }),
  ...(apiData.gender            && { gender:             apiData.gender }),
  ...(apiData.date_of_birth     && { dateOfBirth:        apiData.date_of_birth }),
  ...(apiData.blood_group       && { bloodGroup:         apiData.blood_group }),
  ...(apiData.marital_status    && { maritalStatus:      apiData.marital_status }),
  ...(apiData.height_cm         && { height:             apiData.height_cm }),
  ...(apiData.weight_kg         && { weight:             apiData.weight_kg }),
  ...(apiData.emergency_contact && { emergencyContact:   apiData.emergency_contact }),
  ...(apiData.location          && { location:           apiData.location }),
  ...(apiData.profile_image     && { photoUrl:           apiData.profile_image }),

  // Medical — arrays stored as JSON string for multi-select fields
  ...(apiData.allergies?.length           && { allergies:          JSON.stringify(apiData.allergies) }),
  ...(apiData.current_medications?.length && { currentMedications: JSON.stringify(apiData.current_medications) }),
  ...(apiData.chronic_conditions?.length  && { chronicConditions:  JSON.stringify(apiData.chronic_conditions) }),
  ...(apiData.past_surgeries?.length      && { pastSurgeries:      JSON.stringify(apiData.past_surgeries) }),
  ...(apiData.family_history?.length      && { familyHistory:      JSON.stringify(apiData.family_history) }),
  ...(apiData.disabilities?.length        && { disabilities:       JSON.stringify(apiData.disabilities) }),

  // Lifestyle
  ...(apiData.smoking_status     && { smoking:           apiData.smoking_status }),
  ...(apiData.alcohol_consumption&& { alcohol:           apiData.alcohol_consumption }),
  ...(apiData.exercise_frequency && { exerciseFrequency: apiData.exercise_frequency }),
  ...(apiData.diet_type          && { dietType:          apiData.diet_type }),
  ...(apiData.sleep_hours        && { sleepHours:        apiData.sleep_hours }),
  ...(apiData.occupation         && { occupation:        apiData.occupation }),
})