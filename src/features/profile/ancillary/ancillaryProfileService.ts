// API calls for the redesigned ancillary (nursing / physio / home care / rehab) profile. Profile reads and
// writes reuse features/ancillary/ancillaryService.ts (fetchProviderProfile / updateProviderProfileBackend);
// this file adds the weekly-hours and date-override calls the Availability screen needs.

import ApiService from '../../../services/apiService'
import { API_ENDPOINTS } from '../../../constants/apiUrls'
import type { AncillaryOverrideRow, AncillaryScheduleRow } from '../availability/availabilityAdapters'

export const fetchProviderSchedule = async (): Promise<AncillaryScheduleRow[]> => {
	const res = await ApiService.get<{ data: AncillaryScheduleRow[] }>(API_ENDPOINTS.ANCILLARY.PROVIDER_AVAILABILITY)
	const data = res.data?.data
	return Array.isArray(data) ? data : []
}

export const saveProviderSchedule = async (schedules: unknown[]) => {
	await ApiService.put(API_ENDPOINTS.ANCILLARY.PROVIDER_AVAILABILITY, { schedules })
}

export const fetchProviderOverrides = async (): Promise<AncillaryOverrideRow[]> => {
	const res = await ApiService.get<{ data: AncillaryOverrideRow[] }>(API_ENDPOINTS.ANCILLARY.PROVIDER_OVERRIDES)
	return res.data?.data ?? []
}

export const createProviderOverride = async (body: Record<string, unknown>) => {
	await ApiService.post(API_ENDPOINTS.ANCILLARY.PROVIDER_OVERRIDES, body)
}

export const deleteProviderOverride = async (id: number) => {
	await ApiService.delete(API_ENDPOINTS.ANCILLARY.PROVIDER_OVERRIDE_BY_ID(id))
}

export interface ProviderQualification {
	qualification: string
	institution: string
	year_of_passing?: string | null
	proof_s3_key?: string | null
}

/** Work & documents fields (PUT /ancillary/me/profile). */
export const saveProviderWork = async (patch: {
	license_number?: string
	experience_years?: number
	about?: string
	sub_specialty_id?: string
	qualifications?: ProviderQualification[]
}) => {
	await ApiService.put(API_ENDPOINTS.ANCILLARY.PROFILE, patch)
}

/** Services the provider offers, by procedure public id (PUT /ancillary/me/capabilities). */
export const saveProviderCapabilities = async (procedureIds: string[]) => {
	await ApiService.put(API_ENDPOINTS.ANCILLARY.CAPABILITIES, { procedure_ids: procedureIds })
}

/** Travel radius for home visits, in km (PUT /ancillary/me/profile). */
export const saveProviderTravelRadius = async (km: number) => {
	await ApiService.put(API_ENDPOINTS.ANCILLARY.PROFILE, { geofence_radius_km: km })
}
