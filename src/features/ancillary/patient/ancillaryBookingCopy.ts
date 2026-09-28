// src/features/ancillary/patient/ancillaryBookingCopy.ts
//
// Labels and small pure helpers shared by the ancillary booking screens (Book visit -> Review & pay ->
// Request sent). Every home-care type uses the same flow; only the provider noun changes ("nurse" is
// used for nursing only).

import type { AncillaryCartItem } from '../../../navigation/types'
import type { ProviderSlot, ServiceSelection } from '../ancillaryProviderBookingService'
import { formatTimeSlot } from '../../../utils/formatters'
import { fullDayLabel, parseDateOnly } from '../../../utils/date'

const NOUNS: Record<string, string> = {
	'nursing-care': 'nurse',
	nursing: 'nurse',
	physiotherapy: 'physiotherapist',
	'rehab-care': 'therapist',
	rehabilitation: 'therapist',
	'home-care': 'caregiver',
	'home-care-time': 'caregiver',
	'caregiver-services': 'caregiver',
	'elder-day-care': 'caregiver',
}

/** "nurse" (nursing only), "physiotherapist", "caregiver" … or the neutral "provider". */
export const providerNoun = (serviceKey: string) => NOUNS[serviceKey] ?? 'provider'

export const capitalize = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

export const firstName = (name?: string | null) => (name || '').trim().split(/\s+/)[0] || ''

export const inr = (amount: number) => `₹${Math.round(Number(amount) || 0).toLocaleString('en-IN')}`

/** Backend rule: either one package, or one or more procedures. */
export const selectionFromItems = (items: AncillaryCartItem[]): ServiceSelection => {
	const pkg = items.find((i) => i.kind === 'package')
	if (pkg) return { packageId: pkg.id }
	return { procedureIds: items.map((i) => i.id) }
}

/** "Injection administration" / "Injection, Dressing" / "Injection + 2 more". */
export const itemsSummary = (items: { name: string }[]) => {
	if (items.length === 0) return ''
	if (items.length <= 2) return items.map((i) => i.name).join(', ')
	return `${items[0].name} + ${items.length - 1} more`
}

export const itemsFee = (items: AncillaryCartItem[]) => items.reduce((sum, i) => sum + (Number(i.price) || 0), 0)

/** "45 mins" from the items' durations; '' when unknown. */
export const itemsDurationLabel = (items: AncillaryCartItem[]) => {
	const total = items.reduce((sum, i) => sum + (Number(i.durationMinutes) || 0), 0)
	return total > 0 ? `${total} mins` : ''
}

export const slotKey = (s: ProviderSlot) => `${s.start_time}-${s.end_time}`

export const parseSlotKey = (key: string): ProviderSlot => {
	const [start_time, end_time] = key.split('-')
	return { start_time, end_time }
}

/** "7:00 PM" for "19:00". */
export const timeLabel = (hhmm: string) => formatTimeSlot(hhmm)

/** Compact chip label: "7 PM" / "7:30 PM". */
export const chipTimeLabel = (hhmm: string) => timeLabel(hhmm).replace(':00', '')

/** "Today, Thu 25 Sep" / "Fri 26 Sep" for 'YYYY-MM-DD'. */
export const dayLabel = (iso: string) => {
	const d = parseDateOnly(iso)
	return d ? fullDayLabel(d) : iso
}

export const experienceLabel = (years?: number | null) => (years != null && years > 0 ? `${years} yrs` : '')

export const distanceLabel = (km?: number | null) =>
	km != null && Number.isFinite(Number(km)) ? `${Number(km).toFixed(1)} km` : ''
