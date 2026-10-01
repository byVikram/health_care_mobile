// Per-specialty labels and options for the ancillary profile screens (nursing, physiotherapy, home care,
// rehab). The four specialties share one set of screens; everything that differs lives here.

import { normalizeSpecialtyKey } from '../ancillary/specialtyConfig'

export type AncillaryProfileKey = 'nursing-care' | 'physiotherapy' | 'home-care' | 'rehab-care'

export interface AncillaryProfileConfig {
	key: AncillaryProfileKey
	/** Role line on the hub, e.g. "Staff nurse". */
	roleTitle: string
	registrationLabel: string
	/** Home-care attendants may not have a licence number. */
	registrationRequired: boolean
	licenceDocLabel: string
	servicesLabel: string
	/** Availability: "Visit length" / "Shift lengths I take". */
	unitLabel: string
	/** Slot lengths in minutes. */
	unitOptions: number[]
	defaultUnit: number
	/** "How far I travel" radius options (km). */
	travelOptions: number[]
	/** Documents on Work & documents (police verification is optional for everyone). */
	documents: { key: 'licence' | 'id' | 'pan' | 'police'; label: string; description?: string; optional?: boolean }[]
}

const COMMON_DOCS = (licenceLabel: string): AncillaryProfileConfig['documents'] => [
	{ key: 'licence', label: licenceLabel },
	{ key: 'id', label: 'Government photo ID', description: 'Aadhaar, passport, voter ID or driving licence' },
	{ key: 'pan', label: 'PAN card', description: 'Needed for payouts and TDS' },
	{ key: 'police', label: 'Police verification certificate', optional: true },
]

export const ANCILLARY_PROFILE_CONFIG: Record<AncillaryProfileKey, AncillaryProfileConfig> = {
	'nursing-care': {
		key: 'nursing-care',
		roleTitle: 'Nurse',
		registrationLabel: 'Nursing registration number',
		registrationRequired: true,
		licenceDocLabel: 'Nursing council registration certificate',
		servicesLabel: 'Services you offer',
		unitLabel: 'Visit length',
		unitOptions: [30, 45, 60],
		defaultUnit: 45,
		travelOptions: [3, 5, 8, 10],
		documents: COMMON_DOCS('Nursing council registration certificate'),
	},
	physiotherapy: {
		key: 'physiotherapy',
		roleTitle: 'Physiotherapist',
		registrationLabel: 'Registration number',
		registrationRequired: true,
		licenceDocLabel: 'Physiotherapy registration certificate',
		servicesLabel: 'Services you offer',
		unitLabel: 'Session length',
		unitOptions: [30, 45, 60],
		defaultUnit: 45,
		travelOptions: [3, 5, 8, 10],
		documents: COMMON_DOCS('Physiotherapy registration certificate'),
	},
	'home-care': {
		key: 'home-care',
		roleTitle: 'Home care attendant',
		registrationLabel: 'Home care licence number',
		registrationRequired: false,
		licenceDocLabel: 'Home care training certificate',
		servicesLabel: 'Care you provide',
		unitLabel: 'Shift lengths I take',
		unitOptions: [240, 480, 720],
		defaultUnit: 480,
		travelOptions: [3, 5, 8, 10],
		documents: COMMON_DOCS('Home care training certificate'),
	},
	'rehab-care': {
		key: 'rehab-care',
		roleTitle: 'Rehab therapist',
		registrationLabel: 'Rehabilitation registration number',
		registrationRequired: true,
		licenceDocLabel: 'RCI registration certificate',
		servicesLabel: 'Services you offer',
		unitLabel: 'Session length',
		unitOptions: [45, 60, 90],
		defaultUnit: 60,
		travelOptions: [3, 5, 8, 10],
		documents: COMMON_DOCS('RCI registration certificate'),
	},
}

/** Config for a specialty id / label from the backend or AuthContext; nursing when unknown. */
export const ancillaryConfigFor = (specialty?: string | null): AncillaryProfileConfig => {
	const key = normalizeSpecialtyKey(specialty) as AncillaryProfileKey
	return ANCILLARY_PROFILE_CONFIG[key] ?? ANCILLARY_PROFILE_CONFIG['nursing-care']
}

/** 45 -> "45 min", 480 -> "8 hrs". */
export const formatUnit = (minutes: number) =>
	minutes >= 120 && minutes % 60 === 0 ? `${minutes / 60} hrs` : `${minutes} min`
