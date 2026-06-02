import ApiService from '../../../services/apiService'
import { API_ENDPOINTS } from '../../../constants/apiUrls'
import {
	PharmacyProfileApiResponse,
	PharmacyProfileData,
	PharmacyProfileUpdatePayload,
} from '../../../types/pharmacy-profile-api'

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
