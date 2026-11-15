// src/features/ancillary/staff/today/todayView.ts
//
// Display helpers for the provider Today screen (schedule rows, next visit card, incoming offers).
import {
	combineDateTime,
	DOW_LABELS,
	MONTH_SHORT,
	parseDateOnly,
	relativeDayLabel,
	startsInLabel,
} from '../../../../utils/date'
import { formatKm, formatTimeSlot } from '../../../../utils/formatters'
import type { ProviderOffer, ProviderVisitSummary } from '../../providerVisitService'
import type { ProviderNoun, ProviderSpecialityCopy } from '../providerSpecialityCopy'

export const visitStart = (v: Pick<ProviderVisitSummary, 'date' | 'start_time'>) =>
	combineDateTime(v.date, v.start_time)

/** "Injection administration · visit 1 of 3" / "Knee rehab · session 2 of 5" (just the service for a one-visit order). */
export const visitTitle = (
	v: Pick<ProviderVisitSummary, 'service_name' | 'visits_count' | 'index'>,
	noun: ProviderNoun = 'visit'
) => (v.visits_count > 1 ? `${v.service_name} · ${noun} ${v.index} of ${v.visits_count}` : v.service_name)

/** A visit nobody took (UNASSIGNED) is not this provider's work: never listed on Today. */
export const isProviderWork = (status: string) => status !== 'UNASSIGNED'

/** First part of the street address ("12 MG Road, Bangalore" -> "12 MG Road"). */
export const shortAddress = (street?: string | null) => (street ?? '').split(',')[0].trim()

export const kmLabel = (km?: number | null) => (km == null ? null : `${formatKm(km)} km`)

/** "Vikram K. · 12 MG Road · 2.1 km" */
export const visitSubtitle = (v: ProviderVisitSummary) =>
	[v.patient.name, shortAddress(v.address.street_address), kmLabel(v.distance_km)].filter(Boolean).join(' · ')

/** "Vikram K. · 2.1 km · about 12 min" */
export const visitTravelLine = (v: ProviderVisitSummary) =>
	[v.patient.name, kmLabel(v.distance_km), v.eta_minutes != null ? `about ${v.eta_minutes} min` : null]
		.filter(Boolean)
		.join(' · ')

/** "7:00 PM · in 45 min" today, "Tomorrow · 9:00 AM" later; plain time once it has started. */
export const nextVisitWhen = (v: ProviderVisitSummary) => {
	const start = visitStart(v)
	const time = formatTimeSlot(v.start_time)
	if (!start) return time
	const day = relativeDayLabel(start)
	if (day !== 'Today') return `${day} · ${time}`
	const inLabel = startsInLabel(start)
	return inLabel ? `${time} · ${inLabel.replace(/^starts /, '')}` : time
}

/** Eyebrow of the next-visit card. */
export const nextVisitEyebrow = (v: ProviderVisitSummary, copy: ProviderSpecialityCopy) =>
	v.status === 'IN_PROGRESS' || v.status === 'ARRIVED'
		? copy.today.inProgressEyebrow
		: v.status === 'EN_ROUTE'
			? 'ON THE WAY'
			: copy.today.nextEyebrow

/** "Mon 29 Sep" */
export const shortDay = (date?: string | null) => {
	const d = parseDateOnly(date)
	return d ? `${DOW_LABELS[d.getDay()]} ${d.getDate()} ${MONTH_SHORT[d.getMonth()]}` : ''
}

/** "Anita P." -> "ANITA P." for the eyebrow. */
export const upperName = (name?: string | null) => (name ?? '').toUpperCase()

/** "incl. ₹30 tip" when the patient tipped, else null. */
export const tipLabel = (tip?: number | null) =>
	tip && tip > 0 ? `incl. ₹${Number.isInteger(tip) ? tip : tip.toFixed(2)} tip` : null

/** Offer is an instant request (patient waiting, 30 s to answer) rather than a scheduled visit. */
export const isInstantOffer = (o: ProviderOffer) => o.bookingType === 'INSTANT' && !o.visitPublicId

/** What the provider collects after the visit: the patient's charge plus any tip. */
export const offerCollect = (o: ProviderOffer) => (o.totalAmount ?? 0) + (o.tipAmount || 0)
