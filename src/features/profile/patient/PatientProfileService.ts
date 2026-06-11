import ApiService from '../../../services/apiService'
import { API_ENDPOINTS } from '../../../constants/apiUrls'

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
	emergencyContact: string
	location: string
	photoUrl: string

	// Medical
	allergies: string[]
	chronicConditions: string[]

	// Lifestyle
	smoking: string
	alcohol: string
	exerciseFrequency: string
	dietType: string
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
	emergencyContact: '',
	location: '',
	photoUrl: '',
	allergies: [],
	chronicConditions: [],
	smoking: '',
	alcohol: '',
	exerciseFrequency: '',
	dietType: '',
	sleepHours: '',
	occupation: '',
}

export interface PatientProfileResponse {
	success: boolean
	message: string
	data: any
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
		full_name: state.name,
		phone_number: state.contactNumber,
		email: state.email,
		gender: state.gender,
		// API expects DD/MM/YYYY format for Date of birth
		date_of_birth: state.dateOfBirth ? state.dateOfBirth.replace(/-/g, '/') : '',
		blood_group: state.bloodGroup,
		marital_status: state.maritalStatus,
		height_cm: state.height,
		weight_kg: state.weight,
		emergency_contact: state.emergencyContact,
		location: state.location,
		avatar: state.photoUrl,

		// Medical
		allergies: state.allergies,
		chronic_conditions: state.chronicConditions,

		// Lifestyle
		smoking_status: state.smoking,
		alcohol_consumption: state.alcohol,
		exercise_frequency: state.exerciseFrequency,
		diet_type: state.dietType,
		sleep_hours: state.sleepHours,
		occupation: state.occupation,
	}

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
			try {
				const parsed = JSON.parse(val)
				if (Array.isArray(parsed)) return parsed
			} catch {
				return [val]
			}
		}
		return []
	}

	// Format date from DD/MM/YYYY to DD-MM-YYYY for AppCalendar
	const formatDob = (dob?: string): string => {
		if (!dob) return ''
		return dob.replace(/\//g, '-')
	}

	return {
		name: personal?.name || '',
		contactNumber: personal?.contact_number || '',
		email: personal?.email || '',
		gender: personal?.gender || '',
		dateOfBirth: formatDob(personal?.date_of_birth),
		bloodGroup: personal?.blood_group || '',
		maritalStatus: personal?.marital_status || '',
		height: personal?.height || '',
		weight: personal?.weight || '',
		location: personal?.location || '',
		photoUrl: personal?.avatar || '',
		emergencyContact: personal?.emergency_contact?.number || '',

		allergies: parseArray(medical?.allergies),
		chronicConditions: parseArray(medical?.chronic_conditions),

		smoking: lifestyle?.smoking_status || '',
		alcohol: lifestyle?.alcohol_consumption || '',
		exerciseFrequency: lifestyle?.activity_level || '',
		dietType: lifestyle?.diet_type || '',
		sleepHours: lifestyle?.sleep_hours || '',
		occupation: lifestyle?.occupation || '',
	}
}
