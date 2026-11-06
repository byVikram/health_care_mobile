// src/features/medical-records/medicalRecordsService.ts
//
// The patient's medical records on the backend (app/patients/records_service.py): the list of a person's records (what they
// uploaded plus the prescription of each visit, in one list), one record with a signed link to its file, the upload and the delete.
// The upload is ONE multipart request carrying the record and its file; the app sends no storage key and is never sent one.
//
// Every call here skips the app-wide error dialog (`skipGlobalError`): the screen shows the server's reason where the person
// is looking (inside the upload sheet, on the list) instead of a dialog on top of it.

import { isAxiosError } from 'axios'
import { API_ENDPOINTS } from '../../constants/apiUrls'
import ApiService from '../../services/apiService'
import { appendFile } from '../../utils/pickedFile'
import type { PrescriptionLink } from '../consultation/ConsultationService'
import type { MedicalRecord, RecordApi, RecordLink, UploadDraft } from './medicalRecordsTypes'
import { UPLOAD_KIND_TO_API } from './recordVisuals'

/** The server's largest page (`limit` on GET /api/patients/records). */
const RECORDS_PAGE_SIZE = 200
/** A safety stop for the paging loop: 10 pages is 2000 records. */
const RECORDS_MAX_PAGES = 10

/**
 * A person's records, newest first: their uploads and the prescription of each visit (their file carries no link: open a record
 * for those). Leave `patientPublicId` out for the signed-in patient (the server knows who is asking), pass a family member's id
 * for theirs. The server answers in pages, so this asks for the next one until a short page comes back.
 */
export const listRecords = async (patientPublicId?: string): Promise<RecordApi[]> => {
	const records: RecordApi[] = []
	for (let page = 0; page < RECORDS_MAX_PAGES; page++) {
		const res = await ApiService.get<{ data: RecordApi[] }>(API_ENDPOINTS.PATIENT.RECORDS, {
			params: { patient_public_id: patientPublicId, limit: RECORDS_PAGE_SIZE, offset: page * RECORDS_PAGE_SIZE },
			skipGlobalError: true,
		})
		const batch = res.data.data ?? []
		records.push(...batch)
		if (batch.length < RECORDS_PAGE_SIZE) break
	}
	return records
}

/** One record with a signed link (`file.url`, about 5 minutes) to its file. */
export const getRecord = async (recordId: string): Promise<RecordApi> => {
	const res = await ApiService.get<{ data: RecordApi }>(API_ENDPOINTS.PATIENT.RECORD_BY_ID(recordId), {
		skipGlobalError: true,
	})
	return res.data.data
}

/** Delete a record the patient uploaded (the server refuses one a doctor or a lab made, and anyone else's). */
export const deleteRecord = async (recordId: string): Promise<void> => {
	await ApiService.delete(API_ENDPOINTS.PATIENT.RECORD_BY_ID(recordId), { skipGlobalError: true })
}

/** The server no longer has this record (already deleted, here or on another phone): nothing is left to delete or open. */
export const isRecordGone = (error: unknown): boolean => isAxiosError(error) && error.response?.status === 404

/**
 * Upload a record. `patientPublicId` is a family member's id; leave it out for the signed-in patient (the server then uses the
 * caller), so "self" never depends on the app knowing its own patient id.
 */
export const createRecord = async (draft: UploadDraft, patientPublicId?: string): Promise<RecordApi> => {
	const form = new FormData()
	form.append('kind', UPLOAD_KIND_TO_API[draft.kind])
	form.append('record_date', draft.date)
	if (patientPublicId) form.append('patient_public_id', patientPublicId)
	appendFile(form, 'file', draft.file)

	const res = await ApiService.post<{ data: RecordApi }>(API_ENDPOINTS.PATIENT.RECORDS, form, {
		headers: { 'Content-Type': 'multipart/form-data' },
		skipGlobalError: true,
	})
	return res.data.data
}

/** A fresh signed link (about 5 minutes) to a visit's prescription image, or null when none has been submitted. */
export const getPrescriptionLink = async (appointmentPublicId: string): Promise<PrescriptionLink | null> => {
	try {
		const res = await ApiService.get<{ data: PrescriptionLink }>(
			API_ENDPOINTS.TREATMENTS.PRESCRIPTION(appointmentPublicId),
			{
				skipGlobalError: true,
			}
		)
		return res.data.data ?? null
	} catch (error) {
		if (isRecordGone(error)) return null
		throw error
	}
}

/** The record's file with a fresh signed link (a visit's prescription image, or the upload's file), or null when it has none. */
export async function recordFile(record: MedicalRecord): Promise<RecordLink | null> {
	if (record.appointmentId) {
		const link = await getPrescriptionLink(record.appointmentId)
		return link ? { contentType: null, url: link.prescription_url } : null
	}
	const { file } = await getRecord(record.id)
	return file?.url ? { contentType: file.content_type, url: file.url } : null
}

/** The server's reason for a failed call ("File is too large (max 20 MB for report)"), or a plain one for a network problem. */
export function recordsErrorMessage(error: unknown): string {
	if (isAxiosError(error)) {
		const data = error.response?.data as { message?: unknown; detail?: unknown } | undefined
		if (typeof data?.message === 'string' && data.message) return data.message
		if (typeof data?.detail === 'string' && data.detail) return data.detail
		if (!error.response) return 'Check your connection and try again.'
	}
	return 'Something went wrong. Please try again.'
}
