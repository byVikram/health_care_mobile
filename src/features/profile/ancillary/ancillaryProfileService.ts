// API calls for the redesigned ancillary (nursing / physio / home care / rehab) profile. Profile reads and
// writes reuse features/ancillary/ancillaryService.ts (fetchProviderProfile / updateProviderProfileBackend);
// this file adds the weekly-hours and date-override calls the Availability screen needs.

import ApiService from '../../../services/apiService'
import { API_ENDPOINTS } from '../../../constants/apiUrls'
import { appendFile, type PickedFile } from '../../../utils/pickedFile'
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
	/** Set for a qualification already saved, so saving again keeps it (and its certificate). */
	id?: number
	qualification: string
	institution: string
	year_of_passing?: string | null
	/** The certificate already stored, as a signed link ('' when none). */
	proof?: string
	/** Review state of the stored certificate: pending / approved / rejected / reupload. */
	status?: string | null
	/** A certificate picked on this device and not saved yet. */
	certificate?: PickedFile | null
}

/**
 * Professional details fields (PUT /ancillary/me/profile).
 *
 * Documents are files, never keys: with a picked licence proof or certificate this is a multipart request (`payload`
 * + `license_proof` / `degree_certificate_<ref>` / `identity_document_<type code>`) and the server stores the files and
 * links them; without one it is
 * the plain JSON update. A qualification that is still in the list keeps its stored certificate.
 */
export const saveProviderWork = async (patch: {
	license_number?: string
	experience_years?: number
	about?: string
	sub_specialty_id?: string
	qualifications?: ProviderQualification[]
	/** A newly picked licence / registration certificate. */
	licenceProof?: PickedFile | null
	/** Newly picked government IDs, by ID type code (e.g. `aadhaar`). One file per type; a type sent again replaces it. */
	identityDocuments?: Record<string, PickedFile>
}) => {
	const { qualifications, licenceProof, identityDocuments, ...rest } = patch

	// A qualification carrying a newly picked certificate gets a `ref`; its file travels as `degree_certificate_<ref>`.
	const certificateFiles: [string, PickedFile][] = []
	const items = qualifications?.map((q) => {
		const item: Record<string, unknown> = {
			...(q.id !== undefined ? { id: q.id } : {}),
			qualification: q.qualification,
			institution: q.institution,
			year_of_passing: q.year_of_passing ?? null,
		}
		if (q.certificate) {
			const ref = `q${certificateFiles.length}`
			certificateFiles.push([`degree_certificate_${ref}`, q.certificate])
			item.ref = ref
		}
		return item
	})
	const payload = { ...rest, ...(items ? { qualifications: items } : {}) }

	const identityFiles = Object.entries(identityDocuments ?? {})
	if (!licenceProof && certificateFiles.length === 0 && identityFiles.length === 0) {
		await ApiService.put(API_ENDPOINTS.ANCILLARY.PROFILE, payload)
		return
	}
	const form = new FormData()
	form.append('payload', JSON.stringify(payload))
	if (licenceProof) appendFile(form, 'license_proof', licenceProof)
	certificateFiles.forEach(([part, file]) => appendFile(form, part, file))
	identityFiles.forEach(([code, file]) => appendFile(form, `identity_document_${code}`, file))
	await ApiService.put(API_ENDPOINTS.ANCILLARY.PROFILE, form, { headers: { 'Content-Type': 'multipart/form-data' } })
}

/** Services the provider offers, by procedure public id (PUT /ancillary/me/capabilities). */
export const saveProviderCapabilities = async (procedureIds: string[]) => {
	await ApiService.put(API_ENDPOINTS.ANCILLARY.CAPABILITIES, { procedure_ids: procedureIds })
}

/** Travel radius for home visits, in km (PUT /ancillary/me/profile). */
export const saveProviderTravelRadius = async (km: number) => {
	await ApiService.put(API_ENDPOINTS.ANCILLARY.PROFILE, { geofence_radius_km: km })
}
