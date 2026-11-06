// src/features/medical-records/medicalRecordsView.ts
//
// Pure helpers behind the Medical records screen: the tab counts, the search, the grouping by month, what a row says, and how
// the backend's records and the picked file are described. No React and no network, so the screen is only layout.

import type { AppRecordGroup, AppRecordRowData } from '../../components/common'
import { MONTH_LONG, formatFullDate, parseDateOnly } from '../../utils/date'
import type { PickedFile } from '../../utils/pickedFile'
import type { MedicalRecord, RecordApi, RecordKind, RecordsTab, RecordType } from './medicalRecordsTypes'
import { RECORD_VISUALS, SOURCE_TAGS, UPLOAD_KIND_LABELS } from './recordVisuals'

/** Newest first; records of the same day keep the order they came in. */
const byDateDesc = (a: MedicalRecord, b: MedicalRecord): number => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)

/**
 * The tabs: "Prescriptions" and "Lab reports" hold every record of that kind, the patient's own uploads included (the upload
 * sheet says "Shows under Prescriptions"); "My uploads" holds the patient's own uploads of both kinds.
 */
export function tabCounts(records: MedicalRecord[]): Record<RecordsTab, number> {
	return {
		all: records.length,
		rx: records.filter((record) => record.kind === 'prescription').length,
		lab: records.filter((record) => record.kind === 'lab_report').length,
		up: records.filter((record) => record.type === 'up').length,
	}
}

/** The kind each kind tab holds. */
const TAB_KIND: Record<Exclude<RecordsTab, 'all' | 'up'>, RecordKind> = {
	rx: 'prescription',
	lab: 'lab_report',
}

/** The tab type a kind of record made by someone else has. */
const KIND_TYPE: Record<RecordKind, RecordType> = { prescription: 'rx', lab_report: 'lab' }

const inTab = (record: MedicalRecord, tab: RecordsTab): boolean => {
	if (tab === 'all') return true
	if (tab === 'up') return record.type === 'up'
	return record.kind === TAB_KIND[tab]
}

/** The records of one tab that match a search of the title and the subtitle (case-insensitive). */
export function filterRecords(records: MedicalRecord[], tab: RecordsTab, query: string): MedicalRecord[] {
	const needle = query.trim().toLowerCase()
	return records
		.filter((record) => inTab(record, tab))
		.filter((record) => !needle || `${record.title} ${record.subtitle ?? ''}`.toLowerCase().includes(needle))
		.sort(byDateDesc)
}

/** "SEPTEMBER 2026" for a YYYY-MM-DD date. */
export function monthHeading(isoDate: string): string {
	const date = parseDateOnly(isoDate)
	return date ? `${MONTH_LONG[date.getMonth()].toUpperCase()} ${date.getFullYear()}` : ''
}

/** "5 Sep 2026" for a YYYY-MM-DD date. */
export function recordDateLabel(isoDate: string): string {
	const date = parseDateOnly(isoDate)
	return date ? formatFullDate(date) : isoDate
}

export function recordRow(
	record: MedicalRecord,
	onOpen: (record: MedicalRecord) => void,
	onDelete?: (record: MedicalRecord) => void
): AppRecordRowData {
	const visual = RECORD_VISUALS[record.type]
	return {
		key: record.id,
		// An upload says what the patient filed it as; a record made by a doctor or a lab uses its type's caption.
		kind: record.type === 'up' ? UPLOAD_KIND_LABELS[record.kind] : visual.kind,
		title: record.title,
		subtitle: record.subtitle,
		date: recordDateLabel(record.date),
		iconPath: visual.iconPath,
		tone: visual.tone,
		tag: record.type === 'up' ? SOURCE_TAGS.upload : SOURCE_TAGS.karolahealth,
		onPress: () => onOpen(record),
		// Only what the patient uploaded themselves can be removed: a record from a doctor or a lab is part of their history.
		onDelete: onDelete && record.type === 'up' ? () => onDelete(record) : undefined,
	}
}

/** Records (already filtered and newest first) under one heading per month. */
export function groupByMonth(
	records: MedicalRecord[],
	onOpen: (record: MedicalRecord) => void,
	onDelete?: (record: MedicalRecord) => void
): AppRecordGroup[] {
	const groups: AppRecordGroup[] = []
	for (const record of records) {
		const label = monthHeading(record.date)
		const last = groups[groups.length - 1]
		const row = recordRow(record, onOpen, onDelete)
		if (last && last.label === label) last.rows.push(row)
		else groups.push({ key: label || record.date, label, rows: [row] })
	}
	return groups
}

export const emptyMessage = (query: string): string =>
	query.trim()
		? `Nothing matches “${query.trim()}”.`
		: 'Records from Karolahealth visits and tests show up here automatically. You can also upload your own.'

// ── Files ───────────────────────────────────────────────────────────────────

export const isPdfFile = (file: PickedFile): boolean => file.type.includes('pdf') || /\.pdf$/i.test(file.name)

/** The 2-4 letters on a file's thumbnail: "PDF", "JPG", "PNG". */
export function fileBadge(file: PickedFile): string {
	if (isPdfFile(file)) return 'PDF'
	const extension = file.name.split('.').pop()?.toUpperCase() ?? ''
	return extension && extension.length <= 4 ? extension : 'IMG'
}

const fileLabel = (isPdf: boolean) => (isPdf ? 'PDF' : 'Photo')

/** The picked file, as the details step shows it: "PDF" or "Photo". */
export const describeFile = (file: PickedFile): string => fileLabel(isPdfFile(file))

/** A saved record's file, the same way (nothing for a record with no file). */
export const describeRecordFile = (contentType: string | null | undefined): string | undefined =>
	contentType ? fileLabel(contentType === 'application/pdf') : undefined

// ── From the backend ────────────────────────────────────────────────────────

/**
 * The backend's record as the screen shows it. `memberKey` is the person whose list it came from. A record is named by its kind; a
 * visit's prescription (`source` 'visit') has the doctor in its title and the clinic as `provider`, shown as its subtitle.
 */
export function recordFromApi(api: RecordApi, memberKey: string): MedicalRecord {
	const visit = api.source === 'visit'
	return {
		id: api.id,
		memberKey,
		type: api.source === 'patient' ? 'up' : KIND_TYPE[api.kind],
		kind: api.kind,
		title: api.title,
		subtitle: visit ? (api.provider ?? undefined) : describeRecordFile(api.file?.content_type),
		date: api.record_date,
		appointmentId: api.appointment_id ?? undefined,
	}
}
