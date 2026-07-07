import ApiService from '../../../services/apiService'
import { API_ENDPOINTS } from '../../../constants/apiUrls'
import {
	PharmacyProfileApiResponse,
	PharmacyProfileData,
	PharmacyProfileUpdatePayload,
} from '../../../types/pharmacy-profile-api'
import { PatientAddress, TreatmentRecord } from '../../pharmacy/pharmacyService'

export const getPharmacyProfile = async (): Promise<PharmacyProfileApiResponse> => {
	const res = await ApiService.get<PharmacyProfileApiResponse>(API_ENDPOINTS.PHARMACY.DETAILS)
	return res.data
}

export const updatePharmacyProfile = async (
	payload: PharmacyProfileUpdatePayload
): Promise<PharmacyProfileApiResponse> => {
	console.log('[pharmacyService] PATCH /api/pharmacies/me/details payload:', payload)
	const res = await ApiService.patch<PharmacyProfileApiResponse>(API_ENDPOINTS.PHARMACY.DETAILS, payload)
	console.log('[pharmacyService] PATCH /api/pharmacies/me/details response:', {
		status: res.status,
		data: res.data,
	})

	try {
		const fresh = await getPharmacyProfile()
		console.log('[pharmacyService] GET after PATCH /api/pharmacies/me/details:', {
			sent: payload,
			returned: pickUpdatedValues(payload, fresh.data),
			fullData: fresh.data,
		})
		return fresh
	} catch (error) {
		console.error('[pharmacyService] GET after PATCH failed:', error)
	}

	return res.data
}

export const mergePharmacyProfileData = (
	current: PharmacyProfileData | null,
	patch: Partial<PharmacyProfileData>
): PharmacyProfileData => ({
	...(current ?? {}),
	...(patch.personal ? { personal: { ...(current?.personal ?? {}), ...patch.personal } } : {}),
	...(patch.pharmacy ? { pharmacy: { ...(current?.pharmacy ?? {}), ...patch.pharmacy } } : {}),
	...(patch.services ? { services: { ...(current?.services ?? {}), ...patch.services } } : {}),
})

const pickUpdatedValues = (
	payload: PharmacyProfileUpdatePayload,
	data?: PharmacyProfileData
): Record<string, unknown> => {
	const returned: Record<string, unknown> = {}

	Object.keys(payload).forEach((key) => {
		if (key in (data?.personal ?? {})) {
			returned[key] = data?.personal?.[key as keyof NonNullable<PharmacyProfileData['personal']>]
			return
		}

		if (key in (data?.pharmacy ?? {})) {
			returned[key] = data?.pharmacy?.[key as keyof NonNullable<PharmacyProfileData['pharmacy']>]
			return
		}

		if (key in (data?.services ?? {})) {
			returned[key] = data?.services?.[key as keyof NonNullable<PharmacyProfileData['services']>]
		}
	})

	return returned
}

// ── NEW: public pharmacy list (GET /api/pharmacies) ───────────────────────────
export const getPharmacies = async (params: Record<string, any>, p0: { signal: AbortSignal }) => {
	// Mobile apiUrls uses PHARMACY.LIST (not PHARMACIES.LIST)
	const url = API_ENDPOINTS.PHARMACY_ORDERS.LIST_BY_PHARMACY ?? API_ENDPOINTS.PHARMACY_ORDERS?.LIST_BY_PHARMACY
	console.log('[getPharmacies] hitting URL:', url)
	const res = await ApiService.get(url)
	console.log('[getPharmacies] raw res.data:', JSON.stringify(res.data))
	return res.data
}

export const getPharmacyOrders = async (params?: {
	page?: number
	limit?: number
	status?: string
	search?: string
	start_date?: string
	end_date?: string
}) => {
	const res = await ApiService.get(API_ENDPOINTS.PHARMACY_ORDERS.LIST, { params })
	return res.data
}

export const getPharmacyOrderById = async (id: string) => {
	const res = await ApiService.get(API_ENDPOINTS.PHARMACY_ORDERS.GET_BY_ID(id))
	return res.data
}

export interface PharmacyOrderStatusUpdateResponse {
	success: boolean
	message: string
	data: {
		id: string
		status: string
		bill_amount: number | null
		rejection_reason: string | null
		updated_at: string
	}
}

export const updatePharmacyOrderStatus = async (
	id: string,
	payload: { status: string; bill_amount?: number | null; rejection_reason?: string | null }
): Promise<PharmacyOrderStatusUpdateResponse> => {
	const res = await ApiService.patch<PharmacyOrderStatusUpdateResponse>(
		API_ENDPOINTS.PHARMACY_ORDERS.UPDATE_STATUS(id),
		payload
	)
	return res.data
}

export const updatePharmacyOrderMedicines = async (id: string, medicines: any[]) => {
	const res = await ApiService.patch(API_ENDPOINTS.PHARMACY_ORDERS.UPDATE_MEDICINES(id), {
		medicines,
	})
	return res.data
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

// export const sendPharmacyOrderReminder = async (id: string) => {
// 	const res = await ApiService.post(API_ENDPOINTS.PHARMACY_ORDERS.SEND_REMINDER(id))
// 	return res.data
// }


