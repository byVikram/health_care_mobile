import ApiService from '../../services/apiService'
import { API_ENDPOINTS } from '../../constants/apiUrls'

export interface PatientAddress {
	id: string
	label: string
	address_line: string
	city: string
	state: string
	pincode: string
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

export const getPatientTreatmentHistory = async (userId: string): Promise<TreatmentRecord[]> => {
	const res = await ApiService.get<{ success: boolean; data: TreatmentRecord[] }>(
		API_ENDPOINTS.PATIENT.TREATMENT_HISTORY(userId)
	)
	return res.data?.data ?? []
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
