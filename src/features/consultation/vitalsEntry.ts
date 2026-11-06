// src/features/consultation/vitalsEntry.ts
//
// The six readings a doctor takes during a consultation (the Notes tab's "Vitals" card and its "Record vitals" sheet): which
// fields there are, how a reading is rated against its normal range, how the typed values become the records the backend keeps
// (POST /api/patients/vitals, one record per vital type), and how today's records come back as the card's summary.
// Pure functions only: nothing here touches React or the network (see useRecordVitals for that).

import { APP_COLORS } from '../../config/theme'
import { clinicDateIso, clinicTimeHm, formatTime12h } from '../doctor/scheduleUtils'
import type { VitalEntry, VitalRecord } from './VitalsService'

export type VitalFieldId = 'sys' | 'dia' | 'pulse' | 'spo2' | 'temp' | 'sugar'
export type VitalValues = Record<VitalFieldId, string>
export type VitalRating = 'unset' | 'normal' | 'watch' | 'high'
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
	{ id: 'sugar', label: 'Sugar · random', short: 'Sugar', unit: 'mg/dL', placeholder: '110' },
]

export const EMPTY_VITALS: VitalValues = { sys: '', dia: '', pulse: '', spo2: '', temp: '', sugar: '' }

// "Above target" / "High" / "Low" thresholds for the vitals cards (the Overview tab and the Notes tab's summary). Named and
// centralized here (rather than inline magic numbers) so a future per-condition or per-patient override doesn't need to go
// hunting through JSX -- these are plain adult resting reference ranges, not tied to any specific diagnosis.
export const VITAL_THRESHOLDS = {
	bpSystolicHigh: 130,
	bpDiastolicHigh: 80,
	glucoseHighMgDl: 140,
	spo2LowPercent: 95,
}

// Where a reading stops being "borderline" and is clearly outside the range (the thresholds above are where borderline starts).
// The `...Low` ones are the low end: a clearly low reading is as much a flag as a high one (adult resting reference values).
const CLEARLY_OUT = {
	bpSystolic: 140,
	bpSystolicLow: 90,
	bpDiastolic: 90,
	bpDiastolicLow: 60,
	pulseHigh: 100,
	pulseLow: 60,
	pulseVeryLow: 40,
	spo2: 92,
	tempHighF: 100.4,
	tempBorderlineF: 99.5,
	tempLowF: 95,
	glucoseMgDl: 200,
	glucoseLowMgDl: 70,
}

// What a typed value may be at all (a keying mistake, not a clinical range): outside it the reading is refused before saving, so a
// slipped key (980 for SpO₂, 39 for a temperature in °C) never becomes a record.
const PLAUSIBLE: Record<VitalFieldId, { min: number; max: number }> = {
	sys: { min: 50, max: 260 },
	dia: { min: 30, max: 160 },
	pulse: { min: 20, max: 250 },
	spo2: { min: 50, max: 100 },
	temp: { min: 90, max: 110 },
	sugar: { min: 20, max: 800 },
}

/** How far a typed reading is from normal: 'unset' (empty / not a number), 'normal', 'watch' (borderline) or 'high' (outside). */
export function rateVital(id: VitalFieldId, raw: string): VitalRating {
	const n = parseFloat(raw)
	if (Number.isNaN(n)) return 'unset'
	switch (id) {
		case 'sys':
			if (n < CLEARLY_OUT.bpSystolicLow) return 'high'
			return n >= CLEARLY_OUT.bpSystolic ? 'high' : n >= VITAL_THRESHOLDS.bpSystolicHigh ? 'watch' : 'normal'
		case 'dia':
			if (n < CLEARLY_OUT.bpDiastolicLow) return 'high'
			return n >= CLEARLY_OUT.bpDiastolic ? 'high' : n >= VITAL_THRESHOLDS.bpDiastolicHigh ? 'watch' : 'normal'
		case 'pulse':
			if (n > CLEARLY_OUT.pulseHigh || n < CLEARLY_OUT.pulseVeryLow) return 'high'
			return n < CLEARLY_OUT.pulseLow ? 'watch' : 'normal'
		case 'spo2':
			return n < CLEARLY_OUT.spo2 ? 'high' : n < VITAL_THRESHOLDS.spo2LowPercent ? 'watch' : 'normal'
		case 'temp':
			if (n < CLEARLY_OUT.tempLowF) return 'high'
			return n >= CLEARLY_OUT.tempHighF ? 'high' : n > CLEARLY_OUT.tempBorderlineF ? 'watch' : 'normal'
		case 'sugar':
			if (n < CLEARLY_OUT.glucoseLowMgDl) return 'high'
			return n >= CLEARLY_OUT.glucoseMgDl ? 'high' : n >= VITAL_THRESHOLDS.glucoseHighMgDl ? 'watch' : 'normal'
	}
}

/** Colours of a rating: the field's dot and border while typing, and the summary chip. */
export const RATING_TONES: Record<VitalRating, { dot: string; border: string; chipBg: string; chipInk: string }> = {
	high: { dot: APP_COLORS.danger, border: '#F3B7AE', chipBg: APP_COLORS.dangerBg, chipInk: APP_COLORS.danger },
	watch: { dot: '#E0A100', border: '#EBCB8B', chipBg: '#FBEFD5', chipInk: APP_COLORS.warning },
	normal: { dot: APP_COLORS.success, border: APP_COLORS.divider, chipBg: '#F0F4F4', chipInk: APP_COLORS.ink },
	unset: { dot: APP_COLORS.divider, border: APP_COLORS.divider, chipBg: '#F0F4F4', chipInk: APP_COLORS.ink },
}

/** The rating in words, for a screen reader (the colour alone says nothing to it). */
export const RATING_LABELS: Record<VitalRating, string> = {
	high: 'outside the normal range',
	watch: 'borderline',
	normal: 'normal',
	unset: '',
}

const RATING_RANK: Record<VitalRating, number> = { high: 2, watch: 1, normal: 0, unset: -1 }

const isFilled = (value: string): boolean => value.trim() !== ''

/** How many of the six readings have a value ("3 of 6 added"). */
export function countFilled(values: VitalValues): number {
	return VITAL_FIELDS.filter((f) => isFilled(values[f.id])).length
}

export type VitalChip = { key: string; label: string; rating: VitalRating }

/** The summary chips of recorded readings, the most worrying first. BP is one chip, rated by the worse of its two numbers. */
export function buildVitalChips(values: VitalValues): VitalChip[] {
	const chips: VitalChip[] = []
	if (isFilled(values.sys) && isFilled(values.dia)) {
		const sys = rateVital('sys', values.sys)
		const dia = rateVital('dia', values.dia)
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
				rating: rateVital(f.id, values[f.id]),
			})
		}
	}
	return chips.sort((a, b) => RATING_RANK[b.rating] - RATING_RANK[a.rating])
}

/** "2 need attention" / "All normal" for the card's subtitle. */
export function flagSummary(chips: VitalChip[]): { text: string; flagged: boolean } {
	const flagged = chips.filter((c) => c.rating === 'watch' || c.rating === 'high').length
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

// One backend record per vital type: BP keeps its two numbers together, the others take one. Pulse has no vital type of its own,
// it goes into the "others" record as `pulse_rate` (the same place the web app and the Vitals tab put it).
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
	{ vitalType: 'others', fields: ['pulse'], build: (n) => ({ pulse_rate: n('pulse') }) },
	{ vitalType: 'spo2', fields: ['spo2'], build: (n) => ({ spo2: n('spo2') }) },
	{ vitalType: 'temperature', fields: ['temp'], build: (n) => ({ temperature: n('temp') }) },
	{ vitalType: 'glucose_level', fields: ['sugar'], build: (n) => ({ random: n('sugar') }) },
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

// What each vital type's record holds, as the card's fields. Pulse has no type of its own: it is `pulse_rate` in an "others" record.
const FIELD_PICKERS: Record<string, (value: Record<string, unknown>) => Partial<VitalValues>> = {
	blood_pressure: (v) => ({ sys: asText(v.systolic), dia: asText(v.diastolic) }),
	others: (v) => ({ pulse: asText(v.pulse_rate) }),
	spo2: (v) => ({ spo2: asText(v.spo2 ?? v.value) }),
	temperature: (v) => ({ temp: asText(v.temperature ?? v.value) }),
	glucose_level: (v) => ({ sugar: asText(v.random ?? v.value) }),
}

export type TodaysVitals = { values: VitalValues; recordedAt: Date | null }

/**
 * The six readings recorded TODAY on the clinic's clock, and when the last of them was taken. Each field takes its own newest value
 * among today's records, so a later record of the same type that lacks the field (an "others" record with only HbA1c) does not hide it.
 */
export function todaysVitals(records: VitalRecord[], now: Date = new Date()): TodaysVitals {
	const today = clinicDateIso(now)
	const dated = records.flatMap((record) => {
		const at = parseRecordedAt(record.recorded_at)
		return at && clinicDateIso(at) === today ? [{ record, at }] : []
	})
	dated.sort((a, b) => b.at.getTime() - a.at.getTime())

	const values: VitalValues = { ...EMPTY_VITALS }
	const times: Date[] = []
	for (const { record, at } of dated) {
		const picked = FIELD_PICKERS[record.vital_type]?.(record.value ?? {}) ?? {}
		for (const [id, text] of Object.entries(picked) as [VitalFieldId, string][]) {
			if (text && !values[id]) {
				values[id] = text
				times.push(at)
			}
		}
	}

	const recordedAt = times.length ? new Date(Math.max(...times.map((t) => t.getTime()))) : null
	return { values, recordedAt }
}

/** The empty card's second line: "Last on 12 Jun · BP 128/84", or "No earlier readings". */
export function describeLastReading(latest: LatestVitals): string {
	const dates = ['blood_pressure', 'others', 'spo2', 'temperature', 'glucose_level']
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
 * The pulse to show from the latest records. It lives in a blood-pressure record (`pulse`, the older convention) or in an "others"
 * record (`pulse_rate`, what the app saves): the one recorded most recently wins, so a new reading is never hidden by an old one.
 */
export function latestPulse(bp: VitalRecord | null | undefined, others: VitalRecord | null | undefined): unknown {
	const candidates = [
		{ value: (bp?.value as Record<string, unknown> | undefined)?.pulse, at: parseRecordedAt(bp?.recorded_at) },
		{
			value: (others?.value as Record<string, unknown> | undefined)?.pulse_rate,
			at: parseRecordedAt(others?.recorded_at),
		},
	].filter((candidate) => isFilled(asText(candidate.value)))
	candidates.sort((a, b) => (b.at?.getTime() ?? 0) - (a.at?.getTime() ?? 0))
	return candidates[0]?.value
}
