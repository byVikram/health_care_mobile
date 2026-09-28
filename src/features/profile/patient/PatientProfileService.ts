import ApiService from '../../../services/apiService'
import { API_ENDPOINTS } from '../../../constants/apiUrls'
import { formatApiDateForDisplay, formatDateStringForApi } from '../../../utils/date'
import { safeJsonParse } from '../../../utils/jsonUtils'

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
	photoUrl: string

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
		avatar: state.photoUrl,

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
		photoUrl: personal?.avatar || '',
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
	is_self: boolean
	age?: string | number
	gender?: string
	blood_group?: string
}

export const getFamilyMembers = async (): Promise<FamilyMember[]> => {
	const res = await ApiService.get<{ success: boolean; data: FamilyMember[] }>(
		API_ENDPOINTS.PATIENT.FAMILY_MEMBERS
	)
	return res.data?.data ?? []
}

