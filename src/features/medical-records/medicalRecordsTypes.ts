// src/features/medical-records/medicalRecordsTypes.ts
//
// What the patient's "Medical records" screen works with. A record belongs to one person (the signed-in patient or a family
// member) and is a prescription or a lab report. The patient uploads these from the app (`type` 'up'); records a doctor or a lab
// put there have `type` 'rx' / 'lab'. The API types mirror the backend (app/patients/schema.py: RecordOut).

import type { PickedFile } from '../../utils/pickedFile'

/** 'up' uploaded by the patient; 'rx' / 'lab' made by a doctor or a lab. */
export type RecordType = 'rx' | 'lab' | 'up'

export type RecordsTab = 'all' | RecordType

/** What a record is: it decides which tab it is filed under (an uploaded prescription is under Prescriptions too). */
export type RecordKind = 'prescription' | 'lab_report'

/** What the patient picks in the upload sheet. */
export type UploadKind = 'Prescription' | 'Lab report'

export interface MedicalRecord {
	id: string
	/** `key` of the person (useFamilyMembers) the record belongs to. */
	memberKey: string
	type: RecordType
	kind: RecordKind
	/** What the record is called: its kind ("Lab report"), or "Prescription · Dr. Farah Siddiqui" for a visit's. */
	title: string
	/** "PDF" or "Photo" for an upload, the clinic for a visit's prescription. */
	subtitle?: string
	/** YYYY-MM-DD, the date on the record. */
	date: string
	/** A prescription from a visit: the appointment's public id, which is how its image is fetched. Uploads have none. */
	appointmentId?: string
}

/** What the upload sheet collects. */
export interface UploadDraft {
	memberKey: string
	kind: UploadKind
	/** YYYY-MM-DD. */
	date: string
	/** A record is one PDF or one photo. */
	file: PickedFile
}

// ── What the backend sends ──────────────────────────────────────────────────

export interface RecordFileApi {
	content_type: string | null
	/** A signed link (about 5 minutes); only on GET /api/patients/records/{id}. */
	url: string | null
}

export interface RecordApi {
	id: string
	patient_id: string
	kind: RecordKind
	title: string
	provider: string | null
	record_date: string
	/** The patient's own upload, one a doctor or lab added, or the prescription of a visit (the doctor's submitted notes). */
	source: 'patient' | 'provider' | 'visit'
	/** A visit's prescription: the appointment's public id (its image is read with the treatments API). */
	appointment_id?: string | null
	/** The record's one file; none for a visit's prescription (its image is read with the treatments API). */
	file: RecordFileApi | null
	created_at: string
}

/** One page of an opened record. */
export interface RecordLink {
	contentType: string | null
	url: string
}
