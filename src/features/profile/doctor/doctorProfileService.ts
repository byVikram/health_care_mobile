// API calls for the redesigned doctor profile (hub, personal, professional, hospitals, achievements,
// availability). Kept separate from features/doctor/doctorService.ts, whose older profile helpers use
// field names the backend no longer accepts (e.g. achievements' `category` / `date_awarded`).

import ApiService from '../../../services/apiService'
import { API_ENDPOINTS } from '../../../constants/apiUrls'
import { appendFile, type PickedFile } from '../../../utils/pickedFile'
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
	/** Where the uploaded certificate is stored. `qualification_proof_s3_key` is the same value, older name. */
	degree_certificate?: string | null
	qualification_proof_s3_key?: string | null
}

export interface IdentityDocumentType {
	code: string
	label: string
}

export interface IdentityDocument {
	/** The ID type's code, e.g. `aadhaar`. */
	type: string
	label: string
	url: string | null
}

export interface DoctorProfessional {
	experience_years: number | null
	degrees: DoctorDegree[] | null
	registration_number: string | null
	/** The uploaded registration proof. `registration_proof_s3_key` is the same value, older name. */
	registration_proof?: string | null
	registration_proof_s3_key: string | null
	/** Government IDs uploaded so far: the type code and label, and a short-lived link to the file. */
	identity_documents?: IdentityDocument[] | null
	/** The ID types the doctor can choose from when uploading (PAN, Aadhaar, ...). */
	identity_document_types?: IdentityDocumentType[] | null
	about: string | null
	specialities?: IdLabel[] | null
}

export const fetchDoctorProfessional = async (): Promise<DoctorProfessional> => {
	const res = await ApiService.get<{ data: DoctorProfessional }>(API_ENDPOINTS.DOCTOR_PROFILE.PROFESSIONAL_DETAILS)
	return res.data.data
}

/** A degree to add. `certificate` is a file picked on this device. */
export type DegreeToAdd = { degree: string; college: string; year_of_passing: string; certificate?: PickedFile | null }

/** A change to a saved degree: its `id` plus ONLY the fields that changed (and a newly picked certificate). */
export type DegreeToUpdate = {
	id: number
	degree?: string
	college?: string
	year_of_passing?: string
	certificate?: PickedFile | null
}

export type DoctorProfessionalPatch = Partial<{
	experience_years: number
	registration_number: string
	about: string
	/** Only what changed: degrees to add, saved degrees to update (changed fields only), ids to remove. */
	degreeChanges: { add?: DegreeToAdd[]; update?: DegreeToUpdate[]; remove?: number[] }
	/** A newly picked registration proof. */
	registrationProof: PickedFile | null
	/** Newly picked government IDs, by ID type code (e.g. `aadhaar`). One file per type; a type sent again replaces it. */
	identityDocuments: Record<string, PickedFile>
}>

/**
 * A real PATCH: pass only what the doctor changed and only that is sent. Every field left out is untouched on the
 * server, including the degrees that are not listed in `degreeChanges`.
 *
 * One call whether or not files are attached. Without files it is the plain JSON update; with files it is
 * multipart (`payload` + `degree_certificate_<ref>` / `registration_proof` / `identity_document_<type code>` / ...), so the details and the files are
 * saved together. The app never sends a storage key: the server stores the files and links them.
 */
export const saveDoctorProfessional = async (patch: DoctorProfessionalPatch): Promise<DoctorProfessional> => {
	const { degreeChanges, registrationProof, identityDocuments, ...rest } = patch

	// A degree carrying a newly picked certificate gets a `ref`; its file travels as `degree_certificate_<ref>`.
	const certificateFiles: [string, PickedFile][] = []
	const withRef = <T extends { certificate?: PickedFile | null }>(item: T) => {
		const { certificate, ...fields } = item
		if (!certificate) return fields
		const ref = `d${certificateFiles.length}`
		certificateFiles.push([`degree_certificate_${ref}`, certificate])
		return { ...fields, ref }
	}

	const add = degreeChanges?.add?.map(withRef) ?? []
	const update = degreeChanges?.update?.map(withRef) ?? []
	const remove = degreeChanges?.remove ?? []
	const hasDegreeChanges = add.length > 0 || update.length > 0 || remove.length > 0
	const payload = {
		...rest,
		...(hasDegreeChanges
			? {
					degree_changes: {
						...(add.length ? { add } : {}),
						...(update.length ? { update } : {}),
						...(remove.length ? { remove } : {}),
					},
				}
			: {}),
	}
	const identityFiles = Object.entries(identityDocuments ?? {})
	const hasFiles = certificateFiles.length > 0 || !!registrationProof || identityFiles.length > 0

	if (!hasFiles) {
		const res = await ApiService.patch<{ data: DoctorProfessional }>(
			API_ENDPOINTS.DOCTOR_PROFILE.PROFESSIONAL_DETAILS,
			payload
		)
		return res.data.data
	}

	const form = new FormData()
	form.append('payload', JSON.stringify(payload))
	certificateFiles.forEach(([part, file]) => appendFile(form, part, file))
	if (registrationProof) appendFile(form, 'registration_proof', registrationProof)
	identityFiles.forEach(([code, file]) => appendFile(form, `identity_document_${code}`, file))
	const res = await ApiService.patch<{ data: DoctorProfessional }>(
		API_ENDPOINTS.DOCTOR_PROFILE.PROFESSIONAL_DETAILS,
		form,
		{ headers: { 'Content-Type': 'multipart/form-data' } }
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
	/** Where the supporting document is stored ('' / null when there is none). */
	document_s3_key?: string | null
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

/**
 * Plain JSON without a document; one multipart request (`payload` + `document`) with one. The app never sends
 * a storage key: the server stores the file and links it.
 */
const achievementRequest = (input: DoctorAchievementInput, document?: PickedFile | null) => {
	if (!document) return { body: input as unknown, config: undefined }
	const form = new FormData()
	form.append('payload', JSON.stringify(input))
	appendFile(form, 'document', document)
	return { body: form as unknown, config: { headers: { 'Content-Type': 'multipart/form-data' } } }
}

export const createDoctorAchievement = async (input: DoctorAchievementInput, document?: PickedFile | null) => {
	const { body, config } = achievementRequest(input, document)
	await ApiService.post(API_ENDPOINTS.DOCTOR_PROFILE.ACHIEVEMENTS, body, config)
}

export const updateDoctorAchievement = async (id: string, input: DoctorAchievementInput, document?: PickedFile | null) => {
	const { body, config } = achievementRequest(input, document)
	await ApiService.put(API_ENDPOINTS.DOCTOR_PROFILE.ACHIEVEMENT_BY_ID(id), body, config)
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
