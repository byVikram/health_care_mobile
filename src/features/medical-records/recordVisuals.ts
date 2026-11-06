// src/features/medical-records/recordVisuals.ts
//
// How each kind of record looks and the fixed choices of the upload sheet (design: Medical records). Colours come from the
// shared tones, so a record's tile matches the rest of the app.

import { MaterialCommunityIcons } from '@expo/vector-icons'
import { APP_COLORS, TONES } from '../../config/theme'
import type { RecordKind, RecordsTab, RecordType, UploadKind } from './medicalRecordsTypes'

type IconName = keyof typeof MaterialCommunityIcons.glyphMap
type Tone = { bg: string; ink: string }

export const RECORD_VISUALS: Record<RecordType, { kind: string; iconPath: string; tone: Tone }> = {
	rx: { kind: 'PRESCRIPTION', iconPath: 'M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h4', tone: TONES.lilac },
	lab: {
		kind: 'LAB REPORT',
		iconPath: 'M9 3h6M10 3v6L4.8 18.2A1.9 1.9 0 0 0 6.4 21h11.2a1.9 1.9 0 0 0 1.6-2.8L14 9V3M7.5 15h9',
		tone: TONES.sky,
	},
	up: {
		kind: 'UPLOADED',
		iconPath: 'M4 7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z',
		tone: TONES.sand,
	},
}

/** The upload arrow, for the header button and the "Upload health records" card. */
export const UPLOAD_ICON_PATH = 'M12 16V4M7 9l5-5 5 5M5 20h14'

export const RECORD_TABS: { key: RecordsTab; label: string }[] = [
	{ key: 'all', label: 'All' },
	{ key: 'rx', label: 'Prescriptions' },
	{ key: 'lab', label: 'Lab reports' },
	{ key: 'up', label: 'My uploads' },
]

/** The tags on a row: records made by Karolahealth are green, the patient's own uploads grey. */
export const SOURCE_TAGS = {
	karolahealth: { label: 'Karolahealth', bg: APP_COLORS.successBg, ink: APP_COLORS.success },
	upload: { label: 'Uploaded by you', bg: '#F0F4F4', ink: APP_COLORS.inkMuted },
} as const

/** An upload's caps line on a row. */
export const UPLOAD_KIND_LABELS: Record<RecordKind, string> = {
	prescription: 'PRESCRIPTION',
	lab_report: 'LAB REPORT',
}

/** What the sheet calls a kind -> what the server calls it. */
export const UPLOAD_KIND_TO_API: Record<UploadKind, RecordKind> = {
	Prescription: 'prescription',
	'Lab report': 'lab_report',
}

export const UPLOAD_KINDS: { value: UploadKind; icon: IconName; hint: string }[] = [
	{
		value: 'Prescription',
		icon: 'file-document-outline',
		hint: 'Shows under Prescriptions · medicines advised by a doctor',
	},
	{ value: 'Lab report', icon: 'flask-outline', hint: 'Shows under Lab reports · blood tests, scans and results' },
]

export const UPLOAD_KIND_PROMPT = 'Pick one so it’s filed in the right place'

export type UploadSourceId = 'camera' | 'gallery' | 'file'

export const UPLOAD_SOURCES: { id: UploadSourceId; label: string; hint: string; icon: IconName; tone: Tone }[] = [
	{
		id: 'camera',
		label: 'Take a photo',
		hint: 'Scan paper records with your camera',
		icon: 'camera-outline',
		tone: TONES.mint,
	},
	{
		id: 'gallery',
		label: 'Choose from gallery',
		hint: 'Photos already on your phone',
		icon: 'image-multiple-outline',
		tone: TONES.sky,
	},
	{
		id: 'file',
		label: 'Upload a PDF',
		hint: 'Reports emailed by labs or hospitals',
		icon: 'file-pdf-box',
		tone: { bg: APP_COLORS.dangerBg, ink: APP_COLORS.danger },
	},
]
