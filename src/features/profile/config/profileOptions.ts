// Option lists for the redesigned profile screens. Values match what the older profile tabs saved (and
// what the web app shows), so existing records keep displaying correctly.

export type Option = { value: string; label: string }

const opts = (...values: string[]): Option[] => values.map((v) => ({ value: v, label: v }))

/** Keeps a saved value that isn't in the list (e.g. an older 'Non-binary') selectable. */
export const withCurrent = (options: Option[], current?: string | null): Option[] =>
	current && !options.some((o) => o.value === current) ? [...options, { value: current, label: current }] : options

export const GENDER_OPTIONS = opts('Female', 'Male', 'Other', 'Prefer not to say')

// ASCII '-' (not the design's '−') so values match records saved by the web app and the older screens.
export const BLOOD_GROUP_OPTIONS = [
	...opts('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'),
	{ value: "Don't know", label: "Don't know" },
]

export const MARITAL_STATUS_OPTIONS = opts('Single', 'Married', 'Divorced', 'Widowed', 'Prefer not to say')

/** Backend relation values (upper-case) with display labels. */
export const FAMILY_RELATION_OPTIONS: Option[] = [
	{ value: 'SPOUSE', label: 'Spouse' },
	{ value: 'FATHER', label: 'Father' },
	{ value: 'MOTHER', label: 'Mother' },
	{ value: 'SON', label: 'Son' },
	{ value: 'DAUGHTER', label: 'Daughter' },
	{ value: 'BROTHER', label: 'Brother' },
	{ value: 'SISTER', label: 'Sister' },
	{ value: 'GRANDPARENT', label: 'Grandparent' },
	{ value: 'OTHER', label: 'Other' },
]

/** Older records (and the booking sheet) use Child / Parent / Sibling. */
const LEGACY_RELATION_LABELS: Record<string, string> = {
	CHILD: 'Child',
	PARENT: 'Parent',
	SIBLING: 'Sibling',
	SELF: 'You',
}

export const relationLabel = (value?: string | null) => {
	const key = (value || '').toUpperCase()
	return (
		FAMILY_RELATION_OPTIONS.find((o) => o.value === key)?.label ??
		LEGACY_RELATION_LABELS[key] ??
		(value || 'Family')
	)
}

/** Booking-sheet relations (FAMILY_RELATIONS in AppFamilyMemberSheet) -> backend values. */
export const toBackendRelation = (label: string) => {
	const key = label.trim().toUpperCase()
	return [...FAMILY_RELATION_OPTIONS.map((o) => o.value), 'CHILD', 'PARENT', 'SIBLING'].includes(key) ? key : 'OTHER'
}

export const ALLERGY_OPTIONS = ['Penicillin', 'Sulfa drugs', 'Peanuts', 'Dust', 'Latex', 'Shellfish', 'Pollen']

export const CONDITION_OPTIONS = [
	'Diabetes',
	'High BP',
	'High cholesterol',
	'Asthma',
	'Thyroid',
	'Heart disease',
	'Arthritis',
]

export const FAMILY_HISTORY_OPTIONS = ['Diabetes', 'High BP', 'Heart disease', 'Cancer', 'Stroke', 'Asthma', 'Thyroid']

export const LANGUAGE_OPTIONS = ['English', 'Hindi', 'Kannada', 'Tamil', 'Telugu', 'Malayalam', 'Marathi', 'Bengali']

/**
 * Saved languages as the screen's option values. Older saves are lower case ("english", "hindi"): match them to the
 * list ignoring case so a language shows once, and drop repeats. A language outside the list is kept as it was saved.
 */
export const normalizeLanguages = (saved?: string[] | null): string[] => {
	const out: string[] = []
	for (const raw of saved ?? []) {
		const value = String(raw ?? '').trim()
		if (!value) continue
		const match = LANGUAGE_OPTIONS.find((o) => o.toLowerCase() === value.toLowerCase()) ?? value
		if (!out.some((x) => x.toLowerCase() === match.toLowerCase())) out.push(match)
	}
	return out
}

export const SMOKING_OPTIONS = opts('Never', 'Former smoker', 'Occasional', 'Regular')
export const ALCOHOL_OPTIONS = opts('Never', 'Occasionally', 'Socially', 'Regularly')
export const ACTIVITY_OPTIONS = opts('Sedentary', '1-2 days/week', '3-4 days/week', '5+ days/week')
export const FOOD_OPTIONS = opts('Omnivore', 'Vegetarian', 'Vegan', 'Keto', 'Gluten-free')
export const SLEEP_OPTIONS: Option[] = ['5', '6', '7', '8', '9'].map((h) => ({ value: h, label: `${h} hours` }))
export const OCCUPATION_OPTIONS = opts(
	'Student',
	'Doctor',
	'Engineer',
	'Teacher',
	'Nurse',
	'Business',
	'Farmer',
	'Homemaker',
	'Self-employed',
	'Retired',
	'Other'
)

/** "1990-01-15" -> age in years, or null. */
export const ageFromIso = (iso?: string | null): number | null => {
	if (!iso) return null
	const [y, m, d] = iso.split('-').map(Number)
	if (!y) return null
	const today = new Date()
	let age = today.getFullYear() - y
	if (today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d)) age -= 1
	return age >= 0 ? age : null
}

/** 10-digit Indian mobile, with or without +91 / spaces. */
export const isValidIndianMobile = (value: string) => /^(\+?91)?[6-9]\d{9}$/.test(value.replace(/[\s-]/g, ''))
