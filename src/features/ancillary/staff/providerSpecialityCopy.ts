// src/features/ancillary/staff/providerSpecialityCopy.ts
//
// Per-speciality wording and defaults for the provider screens (Today + request sheet, visit details, start
// code, in progress, complete). The screens are shared by every ancillary speciality; only the copy differs
// ("visit" / "session" / "shift", checklist fallbacks, what is recorded). Real data wins: the checklist and
// "Bring with you" list come from the booked service (visit.tasks / visit.supplies) and the record type from
// the backend (visit.service.record_type); the values here are used only when the backend sends nothing.
import type React from 'react'
import type { MaterialCommunityIcons } from '@expo/vector-icons'
import type { VisitRecordType } from '../providerVisitService'

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name']

export type ProviderNoun = 'visit' | 'session' | 'shift'

export type RecordedField = {
	key: string
	label: string
	placeholder: string
	keyboard: 'numbers-and-punctuation' | 'number-pad' | 'decimal-pad'
}

export type ProviderSpecialityCopy = {
	/** Normalised speciality group (not the backend key). */
	id: 'nursing' | 'physiotherapy' | 'attendant' | 'rehab' | 'equipment' | 'default'
	noun: ProviderNoun
	/** MaterialCommunityIcons name for the service tile. */
	icon: IconName
	today: {
		/** "Visits today" */
		statLabel: string
		/** "NEXT VISIT" */
		nextEyebrow: string
		inProgressEyebrow: string
	}
	detailsTitle: string
	startTitle: string
	startButton: string
	startHint: string
	inProgressTitle: string
	completeTitle: string
	completeButton: string
	completedTitle: string
	/** "It's shown in their app on the booking. This confirms the visit happened." */
	completionHint: string
	completedNote: string
	tasksTitle: string
	notesPlaceholder: string
	/** Checklist used when the booked service supplies no steps. */
	defaultTasks: string[]
	/** "Bring with you" used when the booked service supplies no list. */
	defaultSupplies: string[]
	recorded: {
		/** Fallback when the backend sends no record type. */
		type: VisitRecordType
		title: string
		/** vitals */
		fields: RecordedField[]
		/** pain_score */
		painLabel: string
		homePlanButton: boolean
		/** family_updates */
		quickUpdates: string[]
	}
}

const VITALS: RecordedField[] = [
	{ key: 'bp', label: 'BP (mmHg)', placeholder: '120/80', keyboard: 'numbers-and-punctuation' },
	{ key: 'pulse', label: 'Pulse (bpm)', placeholder: '72', keyboard: 'number-pad' },
	{ key: 'temp_f', label: 'Temp (°F)', placeholder: '98.6', keyboard: 'decimal-pad' },
	{ key: 'spo2', label: 'SpO2 (%)', placeholder: '98', keyboard: 'number-pad' },
]

const FAMILY_UPDATES = [
	'Had breakfast',
	'Medicines given',
	'BP normal',
	'Went for a walk',
	'Resting well',
	'Needs attention',
]

const NO_RECORD = {
	type: null as VisitRecordType,
	title: '',
	fields: [] as RecordedField[],
	painLabel: 'Pain after session',
	homePlanButton: false,
	quickUpdates: FAMILY_UPDATES,
}

const visitWords = (noun: ProviderNoun) => {
	const Noun = noun.charAt(0).toUpperCase() + noun.slice(1)
	return {
		detailsTitle: `${Noun} details`,
		startTitle: 'Enter start code',
		startButton: `Start ${noun}`,
		startHint: `starts the ${noun} timer`,
		inProgressTitle: `${Noun} in progress`,
		completeTitle: `Complete ${noun}`,
		completeButton: 'Submit & finish',
		completedTitle: `${Noun} completed`,
		completionHint: `This confirms the ${noun} happened.`,
		completedNote: 'Notes are shared with the patient.',
	}
}

const base: ProviderSpecialityCopy = {
	id: 'default',
	noun: 'visit',
	icon: 'home-heart',
	today: {
		statLabel: 'Visits today',
		nextEyebrow: 'NEXT VISIT',
		inProgressEyebrow: 'VISIT IN PROGRESS',
	},
	...visitWords('visit'),
	tasksTitle: 'Steps',
	notesPlaceholder: 'Anything the patient or doctor should know?',
	defaultTasks: [],
	defaultSupplies: [],
	recorded: NO_RECORD,
}

const NURSING: ProviderSpecialityCopy = {
	...base,
	id: 'nursing',
	icon: 'medical-bag',
	completedNote: 'Notes are shared with the patient and their doctor.',
	tasksTitle: 'Procedure steps',
	defaultTasks: [
		'Verify patient ID and prescription',
		'Check vitals before the procedure',
		'Prepare and carry out the procedure',
		'Watch for any reaction for 15 minutes',
		'Dispose of sharps and waste safely',
	],
	defaultSupplies: [
		'Syringes and needles',
		'Alcohol swabs',
		'Disposable gloves',
		'Sharps disposal box',
		'BP monitor and thermometer',
	],
	recorded: { ...NO_RECORD, type: 'vitals', title: 'Vitals', fields: VITALS },
}

// The design keeps the "Visit ..." screen titles for physiotherapy and only says "session" in the lists.
const PHYSIO: ProviderSpecialityCopy = {
	...base,
	id: 'physiotherapy',
	noun: 'session',
	icon: 'run',
	today: { ...base.today, statLabel: 'Sessions today' },
	completedNote: 'Notes are shared with the patient and their doctor.',
	tasksTitle: 'Today’s exercises',
	defaultTasks: [
		'Warm-up and gentle mobility',
		'Strengthening exercises',
		'Range-of-motion exercises',
		'Cool-down and stretches',
		'Ice or heat if advised',
	],
	defaultSupplies: ['Resistance band', 'Goniometer', 'Ice pack', 'Exercise mat'],
	recorded: { ...NO_RECORD, type: 'pain_score', title: 'Progress', homePlanButton: true },
}

const ATTENDANT: ProviderSpecialityCopy = {
	...base,
	id: 'attendant',
	noun: 'shift',
	icon: 'account-heart',
	today: {
		statLabel: 'Shifts today',
		nextEyebrow: 'CURRENT SHIFT',
		inProgressEyebrow: 'SHIFT IN PROGRESS',
	},
	...visitWords('shift'),
	completedNote: 'Notes are shared with the patient’s family.',
	tasksTitle: 'Care plan',
	notesPlaceholder: 'How was the shift? Anything the family should know?',
	defaultTasks: [
		'Give medicines on time',
		'Help with meals',
		'Help with walking and mobility',
		'Check BP and sugar',
		'Update the family',
	],
	defaultSupplies: ['Care plan and medicine chart', 'BP monitor', 'Glucometer strips', 'Hand sanitiser and gloves'],
	recorded: { ...NO_RECORD, type: 'family_updates', title: 'Update the family' },
}

// No provider design beyond Today for rehab: session wording, same structure as the attendant list.
const REHAB: ProviderSpecialityCopy = {
	...base,
	id: 'rehab',
	noun: 'session',
	icon: 'wheelchair-accessibility',
	today: {
		statLabel: 'Sessions today',
		nextEyebrow: 'NEXT SESSION',
		inProgressEyebrow: 'SESSION IN PROGRESS',
	},
	...visitWords('session'),
	completedNote: 'Notes are shared with the patient and their doctor.',
	tasksTitle: 'Today’s exercises',
	defaultTasks: [
		'Warm-up and mobility exercises',
		'Strengthening exercises',
		'Balance and walking practice',
		'Cool-down and stretches',
		'Review the home exercise plan',
	],
	defaultSupplies: ['Resistance bands', 'Exercise mat', 'Goniometer'],
	recorded: { ...NO_RECORD, type: 'pain_score', title: 'Progress', homePlanButton: true },
}

// No provider design: delivery / set-up wording on the generic visit screens.
const EQUIPMENT: ProviderSpecialityCopy = {
	...base,
	id: 'equipment',
	icon: 'wheelchair',
	tasksTitle: 'Set-up steps',
	defaultTasks: [
		'Check the equipment and accessories',
		'Set it up at the patient’s home',
		'Show the patient and family how to use it',
		'Confirm it works properly',
	],
}

const BY_KEY: Record<string, ProviderSpecialityCopy> = {
	'nursing-care': NURSING,
	nursing: NURSING,
	physiotherapy: PHYSIO,
	physio: PHYSIO,
	'home-care': ATTENDANT,
	'home-care-time': ATTENDANT,
	'caregiver-services': ATTENDANT,
	'elder-day-care': ATTENDANT,
	attendant: ATTENDANT,
	'rehab-care': REHAB,
	rehabilitation: REHAB,
	rehab: REHAB,
	'medical-equipment': EQUIPMENT,
}

export type SpecialityRef = { key?: string | null; label?: string | null } | string | null | undefined

/** Copy for a speciality (catalogue key, e.g. "nursing-care", or {key,label}); a safe default for anything else. */
export const getProviderSpecialityCopy = (specialty: SpecialityRef): ProviderSpecialityCopy => {
	const key = (typeof specialty === 'string' ? specialty : (specialty?.key ?? '')).trim().toLowerCase()
	if (BY_KEY[key]) return BY_KEY[key]
	const text = `${key} ${typeof specialty === 'object' && specialty ? (specialty.label ?? '') : ''}`.toLowerCase()
	if (/nurs/.test(text)) return NURSING
	if (/physio/.test(text)) return PHYSIO
	if (/rehab/.test(text)) return REHAB
	if (/attendant|caregiver|care giver|home.?care|elder/.test(text)) return ATTENDANT
	if (/equipment/.test(text)) return EQUIPMENT
	return base
}

/** "3 visits" / "1 session" / "2 shifts" */
export const countNoun = (n: number, noun: ProviderNoun) => `${n} ${noun}${n === 1 ? '' : 's'}`
