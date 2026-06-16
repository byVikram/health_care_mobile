// src/features/profile/radiology/radiologyService.ts

import ApiService from '../../../services/apiService'
import { API_ENDPOINTS } from '../../../constants/apiUrls'
import {
	RadiologyProfileApiResponse,
	RadiologyProfileData,
	RadiologyProfileUpdatePayload,
} from '../../../types/radiology-profile-api'

export const getRadiologyProfile = async (): Promise<RadiologyProfileApiResponse> => {
	const res = await ApiService.get<RadiologyProfileApiResponse>(API_ENDPOINTS.RADIOLOGY_PROFILE.DETAILS)
	return res.data
}

export const updateRadiologyProfile = async (
	payload: RadiologyProfileUpdatePayload
): Promise<RadiologyProfileApiResponse> => {
	const res = await ApiService.patch<RadiologyProfileApiResponse>(API_ENDPOINTS.RADIOLOGY_PROFILE.UPDATE, payload)

	try {
		const fresh = await getRadiologyProfile()
		return fresh
	} catch (error) {
		console.error('[radiologyService] GET after PATCH failed:', error)
	}

	return res.data
}

export interface MobileScanType {
	id: number
	name: string
	description: string | null
}

export interface MobileRadiologyScan {
	id: number
	scan_type: MobileScanType
	pricing_model: 'fixed' | 'starting_from' | 'quote_required'
	base_price: number | null
	price_details: string | null
	is_available: boolean
}

export interface MobileScanTypesResponse {
	success: boolean
	message: string
	data: MobileScanType[]
}

export interface MobileMyScansResponse {
	success: boolean
	message: string
	data: MobileRadiologyScan[]
}

export interface MobileScanSetupItem {
	scan_type_id: number
	pricing_model: string
	base_price: number | null
	price_details: string | null
	is_available: boolean
}

export const getScanTypes = async (): Promise<MobileScanTypesResponse> => {
	const res = await ApiService.get<MobileScanTypesResponse>(API_ENDPOINTS.RADIOLOGY_PROFILE.SCAN_TYPES)
	return res.data
}

export const getMyScans = async (): Promise<MobileMyScansResponse> => {
	const res = await ApiService.get<MobileMyScansResponse>(API_ENDPOINTS.RADIOLOGY_PROFILE.SCANS)
	return res.data
}

export const updateMyScans = async (payload: { scans: MobileScanSetupItem[] }): Promise<MobileMyScansResponse> => {
	const res = await ApiService.patch<MobileMyScansResponse>(API_ENDPOINTS.RADIOLOGY_PROFILE.SCANS, payload)
	return res.data
}

export const mergeRadiologyProfileData = (
	current: RadiologyProfileData | null,
	patch: Partial<RadiologyProfileData>
): RadiologyProfileData => ({
	...(current ?? {}),
	...patch,
	details: {
		...(current?.details ?? {}),
		...(patch.details ?? {}),
	},
})
