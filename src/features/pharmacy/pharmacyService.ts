import ApiService from '../../services/apiService'
import { API_ENDPOINTS } from '../../constants/apiUrls'
export * from './pharmacy'

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






export const createPatientAddress = async (address: Omit<PatientAddress, 'id'>): Promise<any> => {
	const res = await ApiService.post(API_ENDPOINTS.PATIENT.ADDRESSES, address)
	return res.data
}
export const createPharmacyOrder = async (order: {
	pharmacy_public_id: string
	treatment_public_id?: string | null
	external_prescription_s3_key?: string | null
	delivery_type: string
	delivery_address_public_id?: string | null
	notes?: string | null
}) => {
	const res = await ApiService.post(API_ENDPOINTS.PHARMACY_ORDERS.CREATE, order)
	return res.data
}