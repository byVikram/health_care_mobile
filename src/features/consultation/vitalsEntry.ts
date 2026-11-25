// src/features/consultation/vitalsEntry.ts
//
// The readings a doctor takes during a consultation (the Notes tab's "Vitals" card and its "Record vitals" sheet): BP, pulse, SpO₂,
// temperature (°F), random blood sugar (RBS), weight and height (both taken at every visit). Which fields there are, how a typed reading is coloured by its normal range (the backend's bands), how the typed values become the records the backend keeps
// (POST /api/patients/vitals, one record per vital type), and how today's records come back as the card's summary.
// Pure functions only: nothing here touches React or the network (see useRecordVitals for that).

import { APP_COLORS } from '../../config/theme'
import { clinicDateIso, clinicTimeHm, formatTime12h } from '../doctor/scheduleUtils'
import type { VitalEntry, VitalRanges, VitalRecord } from './VitalsService'

export type VitalFieldId = 'sys' | 'dia' | 'pulse' | 'spo2' | 'temp' | 'sugar' | 'weight' | 'height'
export type VitalValues = Record<VitalFieldId, string>
/** normal / medium / high as the backend rates it ('unset': nothing to rate). */
export type VitalRating = 'unset' | 'normal' | 'medium' | 'high'
export type VitalRatings = Partial<Record<VitalFieldId, VitalRating>>
export type LatestVitals = Record<string, VitalRecord | null>

export type VitalField = {
	id: VitalFieldId
	label: string
	/** The short name used on the summary chips ("Temp 98.4°F"). */
	short: string
	unit: string
	placeholder: string
	/** Appended to the value on the chip when the unit is short enough to read inline. */
	chipUnit?: string
}

export const VITAL_FIELDS: VitalField[] = [
	{ id: 'sys', label: 'BP systolic', short: 'BP sys', unit: 'mmHg', placeholder: '120' },
	{ id: 'dia', label: 'BP diastolic', short: 'BP dia', unit: 'mmHg', placeholder: '80' },
	{ id: 'pulse', label: 'Pulse', short: 'Pulse', unit: 'bpm', placeholder: '72' },
	{ id: 'spo2', label: 'SpO₂', short: 'SpO₂', unit: '%', placeholder: '98', chipUnit: '%' },
	{ id: 'temp', label: 'Temperature', short: 'Temp', unit: '°F', placeholder: '98.6', chipUnit: '°F' },
	{ id: 'sugar', label: 'Sugar · RBS', short: 'RBS', unit: 'mg/dL', placeholder: '110', chipUnit: ' mg/dL' },
	{ id: 'weight', label: 'Weight', short: 'Weight', unit: 'kg', placeholder: '70', chipUnit: ' kg' },
	{ id: 'height', label: 'Height', short: 'Height', unit: 'cm', placeholder: '170', chipUnit: ' cm' },
]

export const EMPTY_VITALS: VitalValues = {
	sys: '',
	dia: '',
	pulse: '',
	spo2: '',
	temp: '',
	sugar: '',
	weight: '',
	height: '',
}

// How a reading rates (normal / medium / high) is decided by the BACKEND (patients/vitals.py, the one table of cut-offs): a saved
// reading comes back with its `rating`, and while a value is typed the bands from GET /api/patients/vitals/ranges colour the field
// (rateTyped). No cut-off lives in the app.
const RANGE_KEY: Partial<Record<VitalFieldId, string>> = {
	sys: 'systolic',
	dia: 'diastolic',
	pulse: 'pulse_rate',
	spo2: 'spo2',
	temp: 'temperature',
	sugar: 'random',
}

// What a typed value may be at all (a keying mistake, not a clinical range): outside it the reading is refused before saving, so a
// slipped key (980 for SpO₂, 39 for a temperature in °C) never becomes a record. The same ranges as the backend's (patients/vitals.py),
// which refuses what is outside them too.
const PLAUSIBLE: Record<VitalFieldId, { min: number; max: number }> = {
	sys: { min: 50, max: 260 },
	dia: { min: 30, max: 160 },
	pulse: { min: 20, max: 250 },
	spo2: { min: 50, max: 100 },
	temp: { min: 90, max: 110 },
	sugar: { min: 20, max: 800 },
	weight: { min: 2, max: 400 },
	height: { min: 30, max: 260 },
}

/**
 * How a typed reading rates by the backend's bands: 'unset' when it is empty or not a number, when the field is not rated (weight,
 * height), or when the bands are not known (not fetched, or the request failed: the field is simply not coloured).
 */
export function rateTyped(ranges: VitalRanges | null | undefined, id: VitalFieldId, raw: string): VitalRating {
	const key = RANGE_KEY[id]
	const bands = key ? ranges?.[key]?.bands : undefined
	const n = parseFloat(raw)
	if (!bands?.length || Number.isNaN(n)) return 'unset'
	let rating: VitalRating = bands[0].rating
	for (const band of bands) {
		if (band.starts_at === null || n > band.starts_at || (band.inclusive && n === band.starts_at))
			rating = band.rating
	}
	return rating
}

/** Colours of a rating: the field's dot and border while typing, and the summary chip. */
export const RATING_TONES: Record<VitalRating, { dot: string; border: string; chipBg: string; chipInk: string }> = {
	high: { dot: APP_COLORS.danger, border: '#F3B7AE', chipBg: APP_COLORS.dangerBg, chipInk: APP_COLORS.danger },
	medium: { dot: '#E0A100', border: '#EBCB8B', chipBg: '#FBEFD5', chipInk: APP_COLORS.warning },
	normal: { dot: APP_COLORS.success, border: APP_COLORS.divider, chipBg: '#F0F4F4', chipInk: APP_COLORS.ink },
	unset: { dot: APP_COLORS.divider, border: APP_COLORS.divider, chipBg: '#F0F4F4', chipInk: APP_COLORS.ink },
}

/** The rating in a word, for a screen reader only (the colour alone says nothing to it; nothing shows it as text). */
export const RATING_LABELS: Record<VitalRating, string> = {
	high: 'high',
	medium: 'medium',
	normal: 'normal',
	unset: '',
}

const RATING_RANK: Record<VitalRating, number> = { high: 2, medium: 1, normal: 0, unset: -1 }

/** The backend's rating of a saved record ('unset' when it has none: weight, height, others). */
export const ratingOf = (record: VitalRecord | null | undefined): VitalRating => record?.rating ?? 'unset'

/** The worse of some ratings (a card that shows two readings). */
export const worstRating = (...ratings: VitalRating[]): VitalRating =>
	ratings.reduce<VitalRating>((worst, r) => (RATING_RANK[r] > RATING_RANK[worst] ? r : worst), 'unset')

const isFilled = (value: string): boolean => value.trim() !== ''

/** How many of the readings have a value ("3 of 8 added"). */
export function countFilled(values: VitalValues): number {
	return VITAL_FIELDS.filter((f) => isFilled(values[f.id])).length
}

export type VitalChip = { key: string; label: string; rating: VitalRating }

/** The summary chips of recorded readings, the most worrying first. Each takes the backend's rating of its saved record (BP is one chip). */
export function buildVitalChips(values: VitalValues, ratings: VitalRatings): VitalChip[] {
	const chips: VitalChip[] = []
	if (isFilled(values.sys) && isFilled(values.dia)) {
		const sys = ratings.sys ?? 'unset'
		const dia = ratings.dia ?? 'unset'
		chips.push({
			key: 'bp',
			label: `BP ${values.sys}/${values.dia}`,
			rating: RATING_RANK[sys] >= RATING_RANK[dia] ? sys : dia,
		})
	}
	for (const f of VITAL_FIELDS.slice(2)) {
		if (isFilled(values[f.id])) {
			chips.push({
				key: f.id,
				label: `${f.short} ${values[f.id]}${f.chipUnit ?? ''}`,
				rating: ratings[f.id] ?? 'unset',
			})
		}
	}
	return chips.sort((a, b) => RATING_RANK[b.rating] - RATING_RANK[a.rating])
}

/** "2 need attention" / "All normal" for the card's subtitle. */
export function flagSummary(chips: VitalChip[]): { text: string; flagged: boolean } {
	const flagged = chips.filter((c) => c.rating === 'medium' || c.rating === 'high').length
	return flagged ? { text: `${flagged} need attention`, flagged: true } : { text: 'All normal', flagged: false }
}

/** Keeps digits and one decimal point: the keyboard is numeric, but a paste can bring anything. */
export const toNumberText = (text: string): string => text.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1')

/** Checks what was typed before saving: a message to show, or null when it can be saved. */
export function validateVitalValues(values: VitalValues): string | null {
	for (const f of VITAL_FIELDS) {
		const raw = values[f.id].trim()
		if (!raw) continue
		const n = Number(raw)
		if (!(Number.isFinite(n) && n > 0)) return `Enter a valid number for ${f.label}`
		const { min, max } = PLAUSIBLE[f.id]
		if (n < min || n > max) {
			// A temperature typed in °C is the likeliest slip: say so, with what it comes to in °F.
			if (f.id === 'temp' && n >= 30 && n <= 45)
				return `Temperature is in °F: ${n} °C is ${Math.round((n * 9) / 5 + 32)} °F`
			return `${f.label} should be between ${min} and ${max} ${f.unit}`
		}
	}
	if (isFilled(values.sys) !== isFilled(values.dia)) return 'Enter both BP values, or neither'
	if (isFilled(values.sys) && Number(values.sys) <= Number(values.dia))
		return 'Systolic must be higher than diastolic'
	return null
}

// One backend record per vital type (the contract of the backend's patients/vitals.py, the same as the web app sends): BP keeps its
// two numbers together, the others take one. Pulse has its own type; it used to go into an "others" record as `pulse_rate`.
const VITAL_GROUPS: {
	vitalType: string
	fields: VitalFieldId[]
	build: (n: (id: VitalFieldId) => number) => Record<string, number>
}[] = [
	{
		vitalType: 'blood_pressure',
		fields: ['sys', 'dia'],
		build: (n) => ({ systolic: n('sys'), diastolic: n('dia') }),
	},
	{ vitalType: 'pulse', fields: ['pulse'], build: (n) => ({ pulse_rate: n('pulse') }) },
	{ vitalType: 'spo2', fields: ['spo2'], build: (n) => ({ spo2: n('spo2') }) },
	{ vitalType: 'temperature', fields: ['temp'], build: (n) => ({ temperature: n('temp') }) },
	{ vitalType: 'glucose_level', fields: ['sugar'], build: (n) => ({ random: n('sugar') }) },
	{ vitalType: 'weight', fields: ['weight'], build: (n) => ({ weight: n('weight') }) },
	{ vitalType: 'height', fields: ['height'], build: (n) => ({ height: n('height') }) },
]

/**
 * The records to send: every complete group whose numbers differ from what is already recorded today (`saved`), so an edit,
 * or a retry after a partial failure, never sends the same reading twice.
 */
export function buildVitalEntries(values: VitalValues, saved: VitalValues): VitalEntry[] {
	return VITAL_GROUPS.flatMap((group) => {
		const complete = group.fields.every((id) => isFilled(values[id]))
		const changed = group.fields.some((id) => !isFilled(saved[id]) || Number(values[id]) !== Number(saved[id]))
		return complete && changed
			? [{ vitalType: group.vitalType, value: group.build((id) => Number(values[id])) }]
			: []
	})
}

// ── Reading the backend's records back ──────────────────────────────────────

const HAS_ZONE = /(Z|[+-]\d{2}:?\d{2})$/i

/** The backend sends the moment without a zone when the database column has none: that value is UTC, not the phone's local time. */
export function parseRecordedAt(value: string | null | undefined): Date | null {
	if (!value) return null
	const date = new Date(HAS_ZONE.test(value) ? value : `${value}Z`)
	return Number.isNaN(date.getTime()) ? null : date
}

const asText = (value: unknown): string => (value === null || value === undefined || value === '' ? '' : String(value))

/** How many days of readings to fetch to cover the clinic's day (a clinic day is up to 2 UTC dates). */
export const TODAYS_VITALS_LOOKBACK_DAYS = 2

// What each vital type's record holds, as the card's fields. A pulse saved before it had a type of its own is `pulse_rate` in an "others" record.
const FIELD_PICKERS: Record<string, (value: Record<string, unknown>) => Partial<VitalValues>> = {
	blood_pressure: (v) => ({ sys: asText(v.systolic), dia: asText(v.diastolic) }),
	pulse: (v) => ({ pulse: asText(v.pulse_rate ?? v.pulse ?? v.value) }),
	others: (v) => ({ pulse: asText(v.pulse_rate) }),
	spo2: (v) => ({ spo2: asText(v.spo2 ?? v.value) }),
	temperature: (v) => ({ temp: asText(v.temperature ?? v.value) }),
	glucose_level: (v) => ({ sugar: asText(v.random ?? v.post_meal ?? v.value) }),
	weight: (v) => ({ weight: asText(v.weight ?? v.value ?? v.kg) }),
	height: (v) => ({ height: asText(v.height ?? v.value ?? v.cm) }),
}

export type TodaysVitals = { values: VitalValues; recordedAt: Date | null; ratings: VitalRatings }

/**
 * The readings recorded TODAY on the clinic's clock, when the last of them was taken, and how each rates (the backend's `rating` of the
 * record it came from). Each field takes its own newest value among today's records, so a later record of the same type that lacks the
 * field (an "others" record with only HbA1c) does not hide it.
 */
export function todaysVitals(records: VitalRecord[], now: Date = new Date()): TodaysVitals {
	const today = clinicDateIso(now)
	const dated = records.flatMap((record) => {
		const at = parseRecordedAt(record.recorded_at)
		return at && clinicDateIso(at) === today ? [{ record, at }] : []
	})
	dated.sort((a, b) => b.at.getTime() - a.at.getTime())

	const values: VitalValues = { ...EMPTY_VITALS }
	const ratings: VitalRatings = {}
	const times: Date[] = []
	for (const { record, at } of dated) {
		const picked = FIELD_PICKERS[record.vital_type]?.(record.value ?? {}) ?? {}
		for (const [id, text] of Object.entries(picked) as [VitalFieldId, string][]) {
			if (text && !values[id]) {
				values[id] = text
				times.push(at)
				if (record.rating) ratings[id] = record.rating
			}
		}
	}

	const recordedAt = times.length ? new Date(Math.max(...times.map((t) => t.getTime()))) : null
	return { values, recordedAt, ratings }
}

/** The empty card's second line: "Last on 12 Jun · BP 128/84", or "No earlier readings". */
export function describeLastReading(latest: LatestVitals): string {
	const dates = ['blood_pressure', 'pulse', 'others', 'spo2', 'temperature', 'glucose_level', 'weight', 'height']
		.map((type) => parseRecordedAt(latest[type]?.recorded_at))
		.filter((d): d is Date => d !== null)
	if (!dates.length) return 'No earlier readings'

	const last = new Date(Math.max(...dates.map((d) => d.getTime())))
	const [year, month, dayOfMonth] = clinicDateIso(last).split('-').map(Number)
	const day = new Date(year, month - 1, dayOfMonth).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
	const bp = latest.blood_pressure?.value
	const bpText =
		bp && isFilled(asText(bp.systolic)) && isFilled(asText(bp.diastolic))
			? ` · BP ${bp.systolic}/${bp.diastolic}`
			: ''
	return `Last on ${day}${bpText}`
}

/** "5:24 PM" for a moment, on the clinic's clock (the same one the appointment times use). */
export const formatClock = (date: Date): string => formatTime12h(clinicTimeHm(date))

/**
 * The pulse to show from the latest records: the `pulse` record (what the app saves now), or, for a reading saved before pulse had a type
 * of its own, a blood-pressure record's `pulse` or an "others" record's `pulse_rate`. The one recorded most recently wins, so a new
 * reading is never hidden by an old one.
 */
export function latestPulse(
	bp: VitalRecord | null | undefined,
	others: VitalRecord | null | undefined,
	pulse?: VitalRecord | null
): unknown {
	const candidates = [
		{
			value: (pulse?.value as Record<string, unknown> | undefined)?.pulse_rate,
			at: parseRecordedAt(pulse?.recorded_at),
		},
		{ value: (bp?.value as Record<string, unknown> | undefined)?.pulse, at: parseRecordedAt(bp?.recorded_at) },
		{
			value: (others?.value as Record<string, unknown> | undefined)?.pulse_rate,
			at: parseRecordedAt(others?.recorded_at),
		},
	].filter((candidate) => isFilled(asText(candidate.value)))
	candidates.sort((a, b) => (b.at?.getTime() ?? 0) - (a.at?.getTime() ?? 0))
	return candidates[0]?.value
}

const toNumber = (value: unknown): number | null => {
	const n = parseFloat(String(value ?? '').replace(/[^\d.]/g, ''))
	return Number.isFinite(n) && n > 0 ? n : null
}

/**
 * The weight (kg) and height (cm) to show for the patient: today's reading, else the profile's, else the latest on record. Both are
 * taken at every visit, so a reading made today is the truth even when the profile says something older.
 */
export function bodyMetrics(
	today: VitalValues,
	profile: { weight?: string | null; height?: string | null },
	latest: LatestVitals
): { weightKg: number | null; heightCm: number | null } {
	const recorded = (type: string, ...keys: string[]) => {
		const value = (latest[type]?.value ?? {}) as Record<string, unknown>
		return toNumber(keys.map((key) => value[key]).find((v) => isFilled(asText(v))))
	}
	return {
		weightKg: toNumber(today.weight) ?? toNumber(profile.weight) ?? recorded('weight', 'weight', 'value', 'kg'),
		heightCm: toNumber(today.height) ?? toNumber(profile.height) ?? recorded('height', 'height', 'value', 'cm'),
	}
}
