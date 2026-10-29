// src/features/ancillary/patient/ancillaryBookingCopy.ts
//
// Labels and small pure helpers shared by the ancillary booking screens (Schedule a visit -> Review & pay ->
// Booking details, and Book now -> Finding a nurse). Every ancillary type uses the same flow; only the
// provider noun changes ("nurse" is used for nursing only).

import type { AncillaryCartItem } from '../../../navigation/types'
import type { ServiceSelection } from '../ancillaryProviderBookingService'
import { formatTimeSlot } from '../../../utils/formatters'
import { DOW_LABELS, combineDateTime, formatClock, fullDayLabel, isSameDay, parseDateOnly } from '../../../utils/date'

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

/** "7:00 PM" for "19:00". */
export const timeLabel = (hhmm: string) => formatTimeSlot(hhmm)

/** Compact chip label: "7 PM" / "7:30 PM". */
export const chipTimeLabel = (hhmm: string) => timeLabel(hhmm).replace(':00', '')

/** "Today, Thu 25 Sep" / "Fri 26 Sep" for 'YYYY-MM-DD'. */
export const dayLabel = (iso: string) => {
	const d = parseDateOnly(iso)
	return d ? fullDayLabel(d) : iso
}

/** "7:00–7:45 PM" / "11:30 AM–12:15 PM" for a visit's "HH:MM" start and end (just the start when there is no end). */
export const rangeLabel = (start: string, end?: string | null) => {
	const from = timeLabel(start)
	if (!end) return from
	const to = timeLabel(end)
	return from.slice(-2) === to.slice(-2) ? `${from.slice(0, -3)}–${to}` : `${from}–${to}`
}

/** "1 hr" / "2 hrs" / "45 min". */
export const leadText = (minutes: number) => {
	if (minutes % 60 === 0) {
		const h = minutes / 60
		return `${h} hr${h === 1 ? '' : 's'}`
	}
	return `${minutes} min`
}

/** "6:00 PM today" / "6:00 PM, Fri": when a provider is assigned to the visit that starts at `start` on `date`. */
export const assignedAtLabel = (date: string, start: string, leadMinutes: number) => {
	const at = combineDateTime(date, start)
	if (!at) return ''
	at.setMinutes(at.getMinutes() - leadMinutes)
	return `${formatClock(at)}${isSameDay(at, new Date()) ? ' today' : `, ${DOW_LABELS[at.getDay()]}`}`
}
