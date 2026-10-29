// src/features/doctor/search/doctorFilters.ts
//
// What the Find a doctor screen can filter and sort by (the "Filters" and "Sort by" sheets of the Doctor Consultation
// design): the filter model, its categories and options, how many are active, and how they become search parameters.
// The server narrows the list (GET /api/doctors); only sorting happens on the doctors already loaded.

import type { DoctorSearchItem } from '../../../types/doctor-search'

// ─── Sorting ──────────────────────────────────────────────────────────────

export type SortKey = 'rel' | 'soon' | 'near' | 'fee' | 'feeD' | 'exp'

export const SORT_OPTIONS: { value: SortKey; label: string; hint: string }[] = [
	{ value: 'rel', label: 'Relevance', hint: 'Best match for your search' },
	{ value: 'soon', label: 'Earliest available', hint: 'Doctors with the soonest slot first' },
	{ value: 'near', label: 'Nearest first', hint: 'Closest clinic to you' },
	{ value: 'fee', label: 'Fee: low to high', hint: 'Lowest consultation fee first' },
	{ value: 'feeD', label: 'Fee: high to low', hint: 'Highest consultation fee first' },
	{ value: 'exp', label: 'Most experienced', hint: 'Most years of practice first' },
]

// ─── Filters ──────────────────────────────────────────────────────────────

export type ConsultMode = 'any' | 'clinic' | 'video'

export type DoctorFilters = {
	avail: 'any' | 'today'
	mode: ConsultMode
	gender: 'any' | 'f' | 'm'
	/** Keys of FEE_BANDS; a doctor matches any chosen band. */
	fees: string[]
	/** Minimum years of experience; 0 = any. */
	exp: number
}

export const NO_FILTERS: DoctorFilters = { avail: 'any', mode: 'any', gender: 'any', fees: [], exp: 0 }

export type FilterGroupKey = keyof DoctorFilters

/** `range` is what the search API takes: 'low-high', or 'low-' with no upper limit, in rupees. */
export const FEE_BANDS: { key: string; label: string; range: string }[] = [
	{ key: 'f1', label: 'Under ₹500', range: '0-499' },
	{ key: 'f2', label: '₹500 – ₹800', range: '500-800' },
	{ key: 'f3', label: '₹800 – ₹1,000', range: '801-1000' },
	{ key: 'f4', label: 'Above ₹1,000', range: '1001-' },
]

export const EXP_OPTIONS: { value: number; label: string }[] = [
	{ value: 0, label: 'Any' },
	{ value: 5, label: '5+ years' },
	{ value: 10, label: '10+ years' },
	{ value: 15, label: '15+ years' },
]

export type FilterOption = { value: string; label: string }

export type FilterGroup = {
	key: FilterGroupKey
	/** Left rail label. */
	label: string
	/** Heading over the options. */
	title: string
	hint: string
	/** Several options can be on (checkboxes) instead of one (radio). */
	multi: boolean
	options: FilterOption[]
}

export const FILTER_GROUPS: FilterGroup[] = [
	{
		key: 'avail',
		label: 'Availability',
		title: 'Availability',
		hint: 'When you want to see the doctor',
		multi: false,
		options: [
			{ value: 'any', label: 'Any day' },
			{ value: 'today', label: 'Available today' },
		],
	},
	{
		key: 'mode',
		label: 'Consult type',
		title: 'Consultation type',
		hint: 'Visit the clinic or consult over video',
		multi: false,
		options: [
			{ value: 'any', label: 'Any' },
			{ value: 'clinic', label: 'In-clinic' },
			{ value: 'video', label: 'Video consult' },
		],
	},
	{
		key: 'gender',
		label: 'Gender',
		title: 'Doctor’s gender',
		hint: '',
		multi: false,
		options: [
			{ value: 'any', label: 'Any' },
			{ value: 'f', label: 'Female' },
			{ value: 'm', label: 'Male' },
		],
	},
	{
		key: 'fees',
		label: 'Fees',
		title: 'Consultation fee',
		hint: 'Pick one or more',
		multi: true,
		options: FEE_BANDS.map((f) => ({ value: f.key, label: f.label })),
	},
	{
		key: 'exp',
		label: 'Experience',
		title: 'Experience',
		hint: 'Years of practice',
		multi: false,
		options: EXP_OPTIONS.map((e) => ({ value: String(e.value), label: e.label })),
	},
]

/** How many options of a category are on (a category counts 1 however many of its options are chosen, except fees). */
export function groupCount(f: DoctorFilters, key: FilterGroupKey): number {
	if (key === 'fees') return f.fees.length
	if (key === 'exp') return f.exp ? 1 : 0
	return f[key] !== 'any' ? 1 : 0
}

export const activeFilterCount = (f: DoctorFilters) => FILTER_GROUPS.reduce((n, g) => n + groupCount(f, g.key), 0)

/** The value(s) of a category as option values, for ticking the right rows. */
export function selectedValues(f: DoctorFilters, key: FilterGroupKey): string[] {
	if (key === 'fees') return f.fees
	return [String(f[key])]
}

/** Returns the filters with one option of one category toggled (multi) or chosen (single). */
export function withOption(f: DoctorFilters, key: FilterGroupKey, value: string): DoctorFilters {
	if (key === 'fees') {
		return { ...f, fees: f.fees.includes(value) ? f.fees.filter((x) => x !== value) : [...f.fees, value] }
	}
	if (key === 'exp') return { ...f, exp: Number(value) }
	return { ...f, [key]: value } as DoctorFilters
}

/** The category with its choice cleared back to "any". */
export function clearedGroup(f: DoctorFilters, key: FilterGroupKey): DoctorFilters {
	return { ...f, [key]: NO_FILTERS[key] }
}

/** Search API parameters for the active filters (only the ones that narrow the list). */
export function toSearchParams(f: DoctorFilters): Record<string, string | number | boolean> {
	const params: Record<string, string | number | boolean> = {}
	if (f.avail === 'today') params.available_today = true
	if (f.mode === 'clinic') params.appointment_mode = 'clinic_visit'
	if (f.mode === 'video') params.appointment_mode = 'video_call'
	if (f.gender === 'f') params.gender = 'female'
	if (f.gender === 'm') params.gender = 'male'
	if (f.exp) params.min_experience = f.exp
	if (f.fees.length) {
		params.fee_range = FEE_BANDS.filter((b) => f.fees.includes(b.key))
			.map((b) => b.range)
			.join(',')
	}
	return params
}

// ─── Sorting the loaded doctors ───────────────────────────────────────────

/** Ascending numeric compare that keeps missing values at the end. */
function compareNullableAsc(a: number | null | undefined, b: number | null | undefined) {
	const aMissing = a == null
	const bMissing = b == null
	if (aMissing || bMissing) return aMissing === bMissing ? 0 : aMissing ? 1 : -1
	return a - b
}

/** The fee the card shows: the video fee when video is asked for, else the clinic fee (or the video fee). */
export function shownFee(d: DoctorSearchItem, mode: ConsultMode): number | null {
	const h = d.hospital
	if (!h) return null
	if (mode === 'video') return h.video_consultation_fee ?? null
	return h.offline_consultation_fee ?? h.video_consultation_fee ?? null
}

/** The doctors in the chosen order. The list from the server is already "relevance"; the rest sort what is loaded. */
export function sortDoctors(doctors: DoctorSearchItem[], sort: SortKey, mode: ConsultMode): DoctorSearchItem[] {
	switch (sort) {
		case 'soon':
			return [...doctors].sort((a, b) => Number(!!b.available_today) - Number(!!a.available_today))
		case 'near':
			return [...doctors].sort((a, b) => compareNullableAsc(a.distance, b.distance))
		case 'fee':
			return [...doctors].sort((a, b) => compareNullableAsc(shownFee(a, mode), shownFee(b, mode)))
		case 'feeD':
			return [...doctors].sort((a, b) => {
				const x = shownFee(a, mode)
				const y = shownFee(b, mode)
				if (x == null || y == null) return x == null && y == null ? 0 : x == null ? 1 : -1 // no fee: last
				return y - x
			})
		case 'exp':
			return [...doctors].sort((a, b) => (b.experience_years || 0) - (a.experience_years || 0))
		default:
			return doctors
	}
}
