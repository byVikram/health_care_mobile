// src/features/ancillary/staff/today/todayView.ts
//
// Display helpers for the provider Today screen (schedule rows, next visit card, booking request sheet).
import type { AppTagTone } from '../../../../components/common'
import {
	combineDateTime,
	DOW_LABELS,
	MONTH_SHORT,
	parseDateOnly,
	relativeDayLabel,
	startsInLabel,
} from '../../../../utils/date'
import { capitaliseWords, formatKm, formatTimeSlot } from '../../../../utils/formatters'
import type { ProviderPendingRequest, ProviderVisitSummary } from '../../providerVisitService'

export const visitStart = (v: Pick<ProviderVisitSummary, 'date' | 'start_time'>) =>
	combineDateTime(v.date, v.start_time)

/** "Injection administration · visit 1 of 3" (just the service for a one-visit order). */
export const visitTitle = (v: ProviderVisitSummary) =>
	v.visits_count > 1 ? `${v.service_name} · visit ${v.index} of ${v.visits_count}` : v.service_name

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

export const isFinishedVisit = (status: string) =>
	status === 'COMPLETED' || status.startsWith('CANCELLED') || status === 'EXPIRED'
export const isActiveVisit = (status: string) =>
	status === 'IN_PROGRESS' || status === 'EN_ROUTE' || status === 'ARRIVED'

/** Schedule tag: Done / In progress / On the way / Next / Upcoming. */
export const scheduleStatus = (v: ProviderVisitSummary, isNext: boolean): { label: string; tone: AppTagTone } => {
	switch (v.status) {
		case 'COMPLETED':
			return { label: 'Done', tone: 'completed' }
		case 'IN_PROGRESS':
		case 'ARRIVED':
			return { label: 'In progress', tone: 'inProgress' }
		case 'EN_ROUTE':
			return { label: 'On the way', tone: 'onTheWay' }
		default:
			return isNext ? { label: 'Next', tone: 'upcoming' } : { label: 'Upcoming', tone: 'done' }
	}
}

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
export const nextVisitEyebrow = (v: ProviderVisitSummary) =>
	v.status === 'IN_PROGRESS' || v.status === 'ARRIVED'
		? 'VISIT IN PROGRESS'
		: v.status === 'EN_ROUTE'
			? 'ON THE WAY'
			: 'NEXT VISIT'

/** "Mon 29 Sep" */
export const shortDay = (date?: string | null) => {
	const d = parseDateOnly(date)
	return d ? `${DOW_LABELS[d.getDay()]} ${d.getDate()} ${MONTH_SHORT[d.getMonth()]}` : ''
}

/** "Reply in 28 min" pieces: minutes left, or m:ss in the last minute. Null once expired. */
export const replyInLabel = (expiresAt: string | null, nowMs: number): string | null => {
	if (!expiresAt) return null
	const ms = new Date(expiresAt).getTime() - nowMs
	if (!Number.isFinite(ms) || ms <= 0) return null
	if (ms < 60_000) return `0:${String(Math.floor(ms / 1000)).padStart(2, '0')}`
	return `${Math.ceil(ms / 60_000)} min`
}

/** "Female · 70 yrs" (only the parts we know). */
export const patientBrief = (p: ProviderPendingRequest['patient']) =>
	[p.gender ? capitaliseWords(p.gender) : null, p.age != null ? `${p.age} yrs` : null].filter(Boolean).join(' · ')

/** "Anita P." -> "ANITA P." for the eyebrow. */
export const upperName = (name?: string | null) => (name ?? '').toUpperCase()

export const visitsWord = (n: number) => `${n} ${n === 1 ? 'visit' : 'visits'}`
