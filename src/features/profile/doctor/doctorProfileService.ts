// API calls for the redesigned doctor profile (hub, personal, professional, hospitals, achievements,
// availability). Kept separate from features/doctor/doctorService.ts, whose older profile helpers use
// field names the backend no longer accepts (e.g. achievements' `category` / `date_awarded`).

import ApiService from '../../../services/apiService'
import { API_ENDPOINTS } from '../../../constants/apiUrls'
import type { DoctorHospitalAvailability, DoctorOverrideRow } from '../availability/availabilityAdapters'

export type IdLabel = { id: string; label: string }

// ── Hub / details ──────────────────────────────────────────────────────────

export interface DoctorDetailsSummary {
	profile_completion: number
	personal_details?: {
		name?: string | null
		avatar_s3_key?: string | null
		location?: string | null
		languages?: string[] | null
		is_verified?: boolean | null
	} | null
	professional_details?: {
		experience_years?: number | null
		about?: string | null
		registration_number?: string | null
		specialities?: IdLabel[] | null
	} | null
	hospitals?: unknown[]
	additionalDetail?: { areas_of_expertise?: IdLabel[]; treatments?: IdLabel[] } | null
}

export const fetchDoctorDetails = async (): Promise<DoctorDetailsSummary> => {
	const res = await ApiService.get<{ data: DoctorDetailsSummary }>(API_ENDPOINTS.DOCTOR_PROFILE.DETAILS)
	return res.data.data
}

// ── Personal ───────────────────────────────────────────────────────────────

export interface DoctorPersonal {
	name: string | null
	is_verified?: boolean | null
	avatar_s3_key: string | null
	email: string | null
	contact_number?: string | null
	mobile_number?: string | null
	gender: string | null
	date_of_birth: string | null
	location: string | null
	languages: string[] | null
	social_media_handles: Record<string, string> | null
}

export const fetchDoctorPersonal = async (): Promise<DoctorPersonal> => {
	const res = await ApiService.get<{ data: DoctorPersonal }>(API_ENDPOINTS.DOCTOR_PROFILE.PERSONAL_DETAILS)
	return res.data.data
}

export type DoctorPersonalPatch = Partial<{
	name: string
	gender: string
	date_of_birth: string | null
	location: string
	languages: string[]
	email: string
	social_media_handles: { instagram?: string; facebook?: string; twitter?: string }
}>

export const saveDoctorPersonal = async (patch: DoctorPersonalPatch): Promise<DoctorPersonal> => {
	const res = await ApiService.patch<{ data: DoctorPersonal }>(API_ENDPOINTS.DOCTOR_PROFILE.PERSONAL_DETAILS, patch)
	return res.data.data
}

// ── Professional ───────────────────────────────────────────────────────────

export interface DoctorDegree {
	id?: number | string
	qualification?: string | null
	degree?: string | null
	specialization?: string | null
	institution?: string | null
	college?: string | null
	year_of_passing?: string | null
	qualification_proof_s3_key?: string | null
}

export interface DoctorProfessional {
	experience_years: number | null
	degrees: DoctorDegree[] | null
	registration_number: string | null
	registration_proof_s3_key: string | null
	about: string | null
	specialities?: IdLabel[] | null
}

export const fetchDoctorProfessional = async (): Promise<DoctorProfessional> => {
	const res = await ApiService.get<{ data: DoctorProfessional }>(API_ENDPOINTS.DOCTOR_PROFILE.PROFESSIONAL_DETAILS)
	return res.data.data
}

export type DoctorProfessionalPatch = Partial<{
	experience_years: number
	registration_number: string
	about: string
	degrees: { degree: string; college: string; year_of_passing: string; qualification_proof_s3_key?: string | null }[]
}>

export const saveDoctorProfessional = async (patch: DoctorProfessionalPatch): Promise<DoctorProfessional> => {
	const res = await ApiService.patch<{ data: DoctorProfessional }>(
		API_ENDPOINTS.DOCTOR_PROFILE.PROFESSIONAL_DETAILS,
		patch
	)
	return res.data.data
}

/** Areas of expertise / treatments are saved by public id. */
export const saveDoctorAdditional = async (patch: { areas_of_expertise?: string[]; treatments?: string[] }) => {
	await ApiService.patch(API_ENDPOINTS.DOCTOR_PROFILE.ADDITIONAL_DETAILS, patch)
}

const listOf = (payload: unknown): IdLabel[] => {
	const raw = (payload as { data?: unknown })?.data ?? payload
	return Array.isArray(raw)
		? raw.filter((r) => r?.id && r?.label).map((r) => ({ id: String(r.id), label: String(r.label) }))
		: []
}

export const fetchExpertiseOptions = async (): Promise<IdLabel[]> =>
	listOf((await ApiService.get(API_ENDPOINTS.AREA_OF_EXPERTISE.LIST)).data)

export const fetchTreatmentOptions = async (): Promise<IdLabel[]> =>
	listOf((await ApiService.get(API_ENDPOINTS.TREATMENTS_OFFERING.LIST)).data)

// ── Hospitals ──────────────────────────────────────────────────────────────

export interface DoctorHospitalRules {
	free_followup_validity_days: number | null
	reschedule_allowed_until_hours: number | null
	allow_pay_later: boolean | null
}

export interface DoctorHospitalLink {
	/** Doctor-hospital link id. */
	id: string
	is_primary: boolean | null
	available_days: string[] | null
	hospital: {
		/** Hospital public id -- what availability / overrides are keyed by. */
		id: string
		name: string | null
		address: string | null
		contact_number: string | null
		video_consultation_fee: string | number | null
		offline_consultation_fee: string | number | null
	} | null
	availability: DoctorHospitalAvailability | null
	appointment_rules: DoctorHospitalRules | null
}

export const fetchDoctorHospitals = async (): Promise<DoctorHospitalLink[]> => {
	const res = await ApiService.get<{ data: DoctorHospitalLink[] }>(API_ENDPOINTS.DOCTOR_PROFILE.HOSPITALS)
	return res.data.data ?? []
}

export interface DoctorHospitalInput {
	name: string
	full_address?: string
	phone_number?: string
	offline_consultation_fee?: number | null
	video_consultation_fee?: number | null
	available_days?: string[]
	is_primary?: boolean
}

export const createDoctorHospital = async (input: DoctorHospitalInput) => {
	await ApiService.post(API_ENDPOINTS.DOCTOR_PROFILE.HOSPITALS, input)
}

export const updateDoctorHospital = async (
	hospitalId: string,
	patch: Partial<DoctorHospitalInput> & Partial<DoctorHospitalRules>
) => {
	await ApiService.patch(API_ENDPOINTS.DOCTOR_PROFILE.HOSPITAL_BY_ID(hospitalId), patch)
}

/** Soft delete on the backend; the hospital's weekly hours stop producing slots. */
export const deleteDoctorHospital = async (hospitalId: string) => {
	await ApiService.delete(API_ENDPOINTS.DOCTOR_PROFILE.HOSPITAL_BY_ID(hospitalId))
}

// ── Achievements ───────────────────────────────────────────────────────────

export const ACHIEVEMENT_TYPES = [
	'Award',
	'Certification',
	'Research',
	'Publication',
	'Conference',
	'Recognition',
] as const
export type AchievementType = (typeof ACHIEVEMENT_TYPES)[number]

export interface DoctorAchievement {
	id: string
	title: string
	achievement_type: AchievementType
	organization: string | null
	/** YYYY-MM-DD */
	achievement_date: string | null
	description: string | null
	is_public: boolean
}

export type DoctorAchievementInput = {
	title: string
	achievement_type: AchievementType
	organization?: string | null
	achievement_date?: string | null
	description?: string | null
	is_public?: boolean
}

export const fetchDoctorAchievements = async (): Promise<DoctorAchievement[]> => {
	const res = await ApiService.get<{ data: DoctorAchievement[] }>(API_ENDPOINTS.DOCTOR_PROFILE.ACHIEVEMENTS)
	return res.data.data ?? []
}

export const createDoctorAchievement = async (input: DoctorAchievementInput) => {
	await ApiService.post(API_ENDPOINTS.DOCTOR_PROFILE.ACHIEVEMENTS, input)
}

export const updateDoctorAchievement = async (id: string, input: DoctorAchievementInput) => {
	await ApiService.put(API_ENDPOINTS.DOCTOR_PROFILE.ACHIEVEMENT_BY_ID(id), input)
}

/** Soft delete on the backend. */
export const deleteDoctorAchievement = async (id: string) => {
	await ApiService.delete(API_ENDPOINTS.DOCTOR_PROFILE.ACHIEVEMENT_BY_ID(id))
}

// ── Availability ───────────────────────────────────────────────────────────

/** Replaces all weekly hours (both modes) at one hospital. */
export const saveDoctorWeeklyHours = async (hospitalPublicId: string, availability: Record<string, unknown>) => {
	await ApiService.patch(API_ENDPOINTS.DOCTORS.AVAILABILITY, { hospital_id: hospitalPublicId, availability })
}

export const fetchDoctorOverrides = async (): Promise<DoctorOverrideRow[]> => {
	const res = await ApiService.get<{ data: DoctorOverrideRow[] }>(API_ENDPOINTS.DOCTORS.OVERRIDES)
	return res.data.data ?? []
}

export const createDoctorOverride = async (payload: Record<string, unknown>) => {
	await ApiService.post(API_ENDPOINTS.DOCTORS.OVERRIDES, payload)
}

export const deleteDoctorOverride = async (id: number) => {
	await ApiService.delete(API_ENDPOINTS.DOCTORS.OVERRIDE_BY_ID(id))
}
