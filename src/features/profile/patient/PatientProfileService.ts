import ApiService from '../../../services/apiService'
import { API_ENDPOINTS } from '../../../constants/apiUrls'
import { formatApiDateForDisplay, formatDateStringForApi } from '../../../utils/date'
import { safeJsonParse } from '../../../utils/jsonUtils'
import { buildS3Url } from '../../../utils/s3Utils'
import type { AppPhotoPickerUpload } from '../../../components/common/inputs/AppPhotoPicker'

export interface PatientProfileState {
	// Personal
	name: string
	contactNumber: string
	email: string
	gender: string
	dateOfBirth: string // stored as DD-MM-YYYY in UI
	bloodGroup: string
	maritalStatus: string
	height: string
	weight: string
	emergencyContactName: string
	emergencyContact: string
	location: string
	photoUrl: string // what the picker shows: a full URL from the server, or a local file uri after picking
	/** A newly picked photo, uploaded on Save (never sent as a value in the JSON profile body). */
	photoUpload: AppPhotoPickerUpload | null
	photoRemoved: boolean

	// Medical
	allergies: string[]
	chronicConditions: string[]
	currentMedications: string[]
	familyHistory: string

	// Lifestyle
	smoking: string
	alcohol: string
	exerciseFrequency: string
	foodPreference: string
	sleepHours: string
	occupation: string
}

export const INITIAL_PATIENT_STATE: PatientProfileState = {
	name: '',
	contactNumber: '',
	email: '',
	gender: '',
	dateOfBirth: '',
	bloodGroup: '',
	maritalStatus: '',
	height: '',
	weight: '',
	emergencyContactName: '',
	emergencyContact: '',
	location: '',
	photoUrl: '',
	photoUpload: null,
	photoRemoved: false,
	allergies: [],
	chronicConditions: [],
	currentMedications: [],
	familyHistory: '',
	smoking: '',
	alcohol: '',
	exerciseFrequency: '',
	foodPreference: '',
	sleepHours: '',
	occupation: '',
}

export interface PatientProfileResponse {
	success: boolean
	message: string
	data: any
}

// GET /api/patients/me -> basic profile
export const getPatientProfile = async (): Promise<PatientProfileResponse> => {
	const res = await ApiService.get<PatientProfileResponse>(API_ENDPOINTS.PATIENT.ME)
	return res.data
}

// GET /api/patients/me/details -> full profile
export const getPatientDetails = async (): Promise<PatientProfileResponse> => {
	const res = await ApiService.get<PatientProfileResponse>(API_ENDPOINTS.PATIENT.DETAILS)
	return res.data
}

// PATCH /api/patients/me/details -> update profile
export const updatePatientProfile = async (state: PatientProfileState): Promise<PatientProfileResponse> => {
	

	// Build API payload
	const payload = {
		name: state.name,
		phone_number: state.contactNumber,
		email: state.email,
		gender: state.gender,
		date_of_birth: formatDateStringForApi(state.dateOfBirth),
		blood_group: state.bloodGroup,
		marital_status: state.maritalStatus,
		height: Number(state.height) || 0,
		weight: Number(state.weight) || 0,
		emergency_contact_name: state.emergencyContactName,
		emergency_contact_number: state.emergencyContact,
		location: state.location,

		// Medical
		allergies: state.allergies,
		chronic_conditions: state.chronicConditions,
		current_medications: state.currentMedications,
		family_history: state.familyHistory,

		// Lifestyle
		smoking_status: state.smoking,
		alcohol_consumption: state.alcohol,
		activity_level: state.exerciseFrequency,
		food_preference: state.foodPreference,
		sleep_hours: Number(state.sleepHours),
		occupation: state.occupation,
	}

	console.log('PATCH PAYLOAD', payload)

	const res = await ApiService.patch<PatientProfileResponse>(API_ENDPOINTS.PATIENT.DETAILS, payload)
	return res.data
}

// Helper to convert API response structure to local UI state
export const mapApiToLocalState = (apiData: any): PatientProfileState => {
	const { personal, medical, lifestyle } = apiData || {}

	// Parse arrays safely
	const parseArray = (val: any): string[] => {
		if (Array.isArray(val)) return val
		if (typeof val === 'string' && val) {
			const parsed = safeJsonParse<any>(val)
			if (Array.isArray(parsed)) return parsed
			return [val]
		}
		return []
	}


	const toStateString = (val: any): string => {
		if (val === null || val === undefined) return ''
		return String(val)
	}

	return {
		name: personal?.name || '',
		contactNumber: personal?.contact_number || '',
		email: personal?.email || '',
		gender: personal?.gender || '',
		dateOfBirth: formatApiDateForDisplay(personal?.date_of_birth),
		bloodGroup: personal?.blood_group || '',
		maritalStatus: personal?.marital_status || '',
		height: toStateString(personal?.height),
		weight: toStateString(personal?.weight),
		location: personal?.location || '',
		photoUrl: buildS3Url(personal?.avatar) || '',
		photoUpload: null,
		photoRemoved: false,
		emergencyContactName: personal?.emergency_contact?.name || '',
		emergencyContact: personal?.emergency_contact?.number || '',

		allergies: parseArray(medical?.allergies),
		chronicConditions: parseArray(medical?.chronic_conditions),
		currentMedications: parseArray(medical?.current_medications),
		familyHistory: medical?.family_history || '',

		smoking: lifestyle?.smoking_status || '',
		alcohol: lifestyle?.alcohol_consumption || '',
		exerciseFrequency: lifestyle?.activity_level || '',
		foodPreference: lifestyle?.food_preference || '',
		sleepHours: toStateString(lifestyle?.sleep_hours),
		occupation: lifestyle?.occupation || '',
	}
}

// ─────────────────────────────────────────────
// Shared Patient Address & Treatment History
// ─────────────────────────────────────────────

export interface PatientAddress {
	id: string
	label: string
	address_line: string
	city: string
	state: string
	pincode: string
	latitude?: number
	longitude?: number
	is_default: boolean
	// Structured parts (profile address form); address_line is built from them server-side.
	flat?: string | null
	area?: string | null
	landmark?: string | null
	contact_name?: string | null
	contact_phone?: string | null
}

export interface TreatmentRecord {
	id: string
	appointment_id: number
	vitals?: Record<string, any> | null
	notes?: string | null
	prescription_s3_key?: string | null
	follow_up_date?: string | null
	created_at: string
	doctor_name?: string
	hospital_name?: string
}

export const getPatientAddresses = async (): Promise<PatientAddress[]> => {
	const res = await ApiService.get<{ success: boolean; data: PatientAddress[] }>(
		API_ENDPOINTS.PATIENT.ADDRESSES
	)
	return res.data?.data ?? []
}

export const createPatientAddress = async (address: Omit<PatientAddress, 'id'>): Promise<any> => {
	const res = await ApiService.post(API_ENDPOINTS.PATIENT.ADDRESSES, address)
	return res.data
}

export const getPatientTreatmentHistory = async (userId: string): Promise<TreatmentRecord[]> => {
	const res = await ApiService.get<{ success: boolean; data: TreatmentRecord[] }>(
		API_ENDPOINTS.PATIENT.TREATMENT_HISTORY(userId)
	)
	return res.data?.data ?? []
}

export interface FamilyMember {
	id: string
	publicId?: string
	public_id?: string
	name: string
	relation: string
	relationship?: string
	avatar_s3_key?: string | null
	/** The member's own Karola ID. */
	patient_code?: string | null
	is_self: boolean
	age?: string | number
	gender?: string
	blood_group?: string
	date_of_birth?: string | null
	contact_number?: string | null
	chronic_conditions?: string[]
	/** Date of birth and gender filled in (members added from a booking sheet start incomplete). */
	is_complete?: boolean
}

export const getFamilyMembers = async (): Promise<FamilyMember[]> => {
	const res = await ApiService.get<{ success: boolean; data: FamilyMember[] }>(
		API_ENDPOINTS.PATIENT.FAMILY_MEMBERS
	)
	return res.data?.data ?? []
}

// ─────────────────────────────────────────────
// Profile redesign: details, family members, addresses
// ─────────────────────────────────────────────

export interface MedicationItem {
	name: string
	dose: string
	frequency: string
}

export interface EmergencyContactItem {
	name: string
	relation: string
	phone: string
	is_primary?: boolean
}

/** GET/PATCH /api/patients/me/details response (optionally for a family member). */
export interface PatientDetailsData {
	id?: string
	public_id?: string
	personal: {
		name: string
		contact_number: string
		email: string
		avatar: string
		gender: string
		date_of_birth: string
		blood_group: string
		marital_status: string
		height: number
		weight: number
		emergency_contact?: { name: string; number: string }
		emergency_contacts?: EmergencyContactItem[]
		location: string
		relation?: string
	}
	medical: {
		allergies: string[]
		chronic_conditions: string[]
		current_medications: string[]
		medications?: MedicationItem[]
		family_history: string
	}
	lifestyle: {
		smoking_status: string
		alcohol_consumption: string
		food_preference: string
		activity_level: string
		sleep_hours: number
		occupation: string
	}
}

/** Any subset of the PATCH /me/details fields (snake_case, as the backend expects). */
export type PatientDetailsPatch = Partial<{
	name: string
	email: string
	gender: string
	date_of_birth: string | null
	blood_group: string
	marital_status: string
	height: number
	weight: number
	location: string
	allergies: string[]
	chronic_conditions: string[]
	medications: MedicationItem[]
	family_history: string
	emergency_contacts: EmergencyContactItem[]
	smoking_status: string
	alcohol_consumption: string
	food_preference: string
	activity_level: string
	sleep_hours: number
	occupation: string
}>

const withPatientId = (url: string, patientId?: string) =>
	patientId ? `${url}?patient_id=${encodeURIComponent(patientId)}` : url

export const fetchPatientDetails = async (patientId?: string): Promise<PatientDetailsData> => {
	const res = await ApiService.get<{ data: PatientDetailsData }>(withPatientId(API_ENDPOINTS.PATIENT.DETAILS, patientId))
	return res.data.data
}

export const savePatientDetails = async (patch: PatientDetailsPatch, patientId?: string): Promise<PatientDetailsData> => {
	const res = await ApiService.patch<{ data: PatientDetailsData }>(
		withPatientId(API_ENDPOINTS.PATIENT.DETAILS, patientId),
		patch
	)
	return res.data.data
}

export interface PatientSummary {
	public_id: string
	display_id: string
	name: string
	avatar_url?: string | null
	age?: number | null
	gender?: string | null
	profile_completion: number
	family_count: number
}

export const fetchPatientSummary = async (): Promise<PatientSummary> => {
	const res = await ApiService.get<{ data: PatientSummary }>(API_ENDPOINTS.PATIENT.SUMMARY)
	return res.data.data
}

export interface FamilyMemberInput {
	name: string
	/** Upper-case relation, e.g. 'SPOUSE', 'FATHER' (see FAMILY_RELATION_OPTIONS). */
	relation: string
	gender?: string
	/** YYYY-MM-DD */
	date_of_birth?: string | null
	contact_number?: string | null
}

export const getFamilyMember = async (memberId: string): Promise<FamilyMember> => {
	const res = await ApiService.get<{ data: FamilyMember }>(API_ENDPOINTS.PATIENT.FAMILY_MEMBER_BY_ID(memberId))
	return res.data.data
}

export const createFamilyMember = async (input: FamilyMemberInput): Promise<FamilyMember> => {
	const res = await ApiService.post<{ data: FamilyMember }>(API_ENDPOINTS.PATIENT.FAMILY_MEMBERS, input)
	return res.data.data
}

/** Basic info (relation, contact_number) plus any PATCH /me/details field. */
export const updateFamilyMember = async (
	memberId: string,
	patch: PatientDetailsPatch & { relation?: string; contact_number?: string | null }
): Promise<PatientDetailsData> => {
	const res = await ApiService.patch<{ data: PatientDetailsData }>(API_ENDPOINTS.PATIENT.FAMILY_MEMBER_BY_ID(memberId), patch)
	return res.data.data
}

/** Soft delete on the backend -- past bookings for the member are kept. */
export const removeFamilyMember = async (memberId: string): Promise<void> => {
	await ApiService.delete(API_ENDPOINTS.PATIENT.FAMILY_MEMBER_BY_ID(memberId))
}

export interface PatientAddressInput {
	label: string
	flat: string
	area: string
	landmark?: string
	city: string
	pincode: string
	contact_name?: string
	contact_phone?: string
	latitude?: number
	longitude?: number
	is_default?: boolean
}

export const addPatientAddress = async (input: PatientAddressInput): Promise<PatientAddress> => {
	const res = await ApiService.post<{ data: PatientAddress }>(API_ENDPOINTS.PATIENT.ADDRESSES, input)
	return res.data.data
}

export const updatePatientAddress = async (addressId: string, patch: Partial<PatientAddressInput>): Promise<PatientAddress> => {
	const res = await ApiService.patch<{ data: PatientAddress }>(API_ENDPOINTS.PATIENT.ADDRESS_BY_ID(addressId), patch)
	return res.data.data
}

/** Soft delete; if it was the default, the backend makes the oldest remaining address the default. */
export const deletePatientAddress = async (addressId: string): Promise<void> => {
	await ApiService.delete(API_ENDPOINTS.PATIENT.ADDRESS_BY_ID(addressId))
}
