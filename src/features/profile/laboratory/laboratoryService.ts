import ApiService from '../../../services/apiService'
import { API_ENDPOINTS } from '../../../constants/apiUrls'
import {
	LaboratoryProfileApiResponse,
	LaboratoryProfileData,
	LaboratoryProfileUpdatePayload,
} from '../../../types/laboratory-profile-api'

export const getLaboratoryProfile = async (): Promise<LaboratoryProfileApiResponse> => {
	const res = await ApiService.get<LaboratoryProfileApiResponse>(API_ENDPOINTS.LABORATORY_PROFILE.DETAILS)
	return res.data
}

export const updateLaboratoryProfile = async (
	payload: LaboratoryProfileUpdatePayload
): Promise<LaboratoryProfileApiResponse> => {
	console.log("Patch URL:",API_ENDPOINTS.LABORATORY_PROFILE.UPDATE)
	console.log("PATCH PAYLOAD:",payload)
	const res = await ApiService.patch<LaboratoryProfileApiResponse>(API_ENDPOINTS.LABORATORY_PROFILE.UPDATE, payload)

	try {
		const fresh = await getLaboratoryProfile()
		return fresh
	} catch (error) {
		console.error('[laboratoryService] GET after PATCH failed:', error)
	}

	return res.data
}

export const mergeLaboratoryProfileData = (
	current: LaboratoryProfileData | null,
	patch: Partial<LaboratoryProfileData>
): LaboratoryProfileData => ({
	...(current ?? {}),
	...patch,
	details: {
		...(current?.details ?? {}),
		...(patch.details ?? {}),
	},
})

export const buildLaboratoryProfileUpdatePayload = (
	profileData: LaboratoryProfileData | null,
	patch: LaboratoryProfileUpdatePayload = {}
): LaboratoryProfileUpdatePayload => {
	const details = profileData?.details

	return {
		name: details?.name || '',
		logo_s3_key: details?.logo_s3_key || '',
		license_number: details?.license_number || '',
		license_proof_s3_key: details?.license_proof_s3_key || '',
		gst_number: details?.gst_number || '',
		address: details?.address || '',
		city: details?.city || '',
		state: details?.state || '',
		pincode: details?.pincode || '',
		latitude:
			details?.latitude !== undefined && details.latitude !== null && !Number.isNaN(Number(details.latitude))
				? Number(details.latitude)
				: 0,
		longitude:
			details?.longitude !== undefined && details.longitude !== null && !Number.isNaN(Number(details.longitude))
				? Number(details.longitude)
				: 0,
		operating_hours: details?.operating_hours || {},
		open_days: Array.isArray(details?.open_days) ? details.open_days : [],
		payment_methods: Array.isArray(details?.payment_methods) ? details.payment_methods : [],
		owner_name: profileData?.owner_name || '',
		alternate_mobile: profileData?.alternate_mobile || '',
		whatsapp_number: profileData?.whatsapp_number || '',
		...patch,
	}
}

// ---------------------------------------------------------------------------
// Laboratory Tests Catalog
// ---------------------------------------------------------------------------

export interface MobileTestType {
	id: number
	name: string
	description: string | null
}

export interface MobileLaboratoryTest {
	id: number
	test_type: MobileTestType
	pricing_model: 'fixed' | 'starting_from' | 'quote_required'
	base_price: number | null
	price_details: string | null
	is_available: boolean
}

export interface MobileTestTypesResponse {
	success: boolean
	message: string
	data: MobileTestType[]
}

export interface MobileMyTestsResponse {
	success: boolean
	message: string
	data: MobileLaboratoryTest[]
}

export interface MobileTestSetupItem {
	test_type_id: number
	pricing_model: string
	base_price: number | null
	price_details: string | null
	is_available: boolean
}

export const getTestTypes = async (): Promise<MobileTestTypesResponse> => {
	const res = await ApiService.get<MobileTestTypesResponse>(API_ENDPOINTS.LABORATORY_PROFILE.TEST_TYPES)
	return res.data
}

export const getMyTests = async (): Promise<MobileMyTestsResponse> => {
	const res = await ApiService.get<MobileMyTestsResponse>(API_ENDPOINTS.LABORATORY_PROFILE.TESTS)
	return res.data
}

export const updateMyTests = async (payload: { tests: MobileTestSetupItem[] }): Promise<MobileMyTestsResponse> => {
	const res = await ApiService.patch<MobileMyTestsResponse>(API_ENDPOINTS.LABORATORY_PROFILE.TESTS, payload)
	return res.data
}
