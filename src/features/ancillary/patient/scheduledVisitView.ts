// src/features/ancillary/patient/scheduledVisitView.ts
//
// What a visit of a scheduled order looks like on Booking details / View visit: its state, the chip and the
// "who comes" line. Pure functions over the order, so both screens (and the sheets) tell the same story.

import { APP_COLORS, TONES } from '../../../config/theme'
import {
	DEFAULT_ORDER_POLICY,
	isVisitUnassigned,
	type AncillaryOrder,
	type AncillaryOrderStatus,
	type AncillaryOrderVisit,
} from '../ancillaryProviderBookingService'
import { assignedAtLabel, capitalize, dayLabel, leadText, providerNoun } from './ancillaryBookingCopy'

export const isCancelledStatus = (s?: AncillaryOrderStatus | null) => !!s && /CANCEL|EXPIRED/.test(s)
const isDoneStatus = (s?: AncillaryOrderStatus | null) => !!s && /COMPLETED/.test(s)
const isLiveStatus = (s?: AncillaryOrderStatus | null) => !!s && /EN_ROUTE|ARRIVED|IN_PROGRESS|VERIFICATION/.test(s)

/** Nothing more will happen to this visit: cancelled, expired, completed or nobody was available. */
const isClosedVisit = (v: AncillaryOrderVisit) =>
	isCancelledStatus(v.status) || isDoneStatus(v.status) || isVisitUnassigned(v.status)

/** Still on the books: not cancelled, not done, not without a provider. */
export const isOpenVisit = (v: AncillaryOrderVisit) => !isClosedVisit(v)

/** The next visit still to come (the first open one that is not already under way). */
export const nextVisitId = (visits: AncillaryOrderVisit[]) =>
	visits.find((v) => isOpenVisit(v) && !isLiveStatus(v.status))?.visit_public_id ?? null

const slugOf = (label: string) =>
	label
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')

/** The order's speciality as catalogue key + label, when the status endpoint includes it. */
export const specialtyOf = (order: AncillaryOrder | null): { key: string; label: string } | null => {
	const s = order?.specialty
	if (!s) return null
	if (typeof s === 'string') return s.trim() ? { key: slugOf(s), label: s.trim() } : null
	const label = s.label?.trim() || ''
	const key = s.key?.trim() || (label ? slugOf(label) : '')
	return key ? { key, label: label || key } : null
}

/** "nurse" / "physiotherapist" ... for the order. */
export const orderNoun = (order: AncillaryOrder | null) => providerNoun(specialtyOf(order)?.key ?? '')

export const orderPolicy = (order: AncillaryOrder | null) => order?.policy ?? DEFAULT_ORDER_POLICY

export type VisitChip = { label: string; bg: string; fg: string }

/** The pill on a visit card: Cancelled > no provider > Completed > In progress > Rescheduled > Next visit > Booked. */
export const visitChip = (v: AncillaryOrderVisit, isNext: boolean, noun: string): VisitChip => {
	if (isCancelledStatus(v.status)) return { label: 'Cancelled', bg: APP_COLORS.dangerBg, fg: APP_COLORS.danger }
	if (isVisitUnassigned(v.status)) return { label: `No ${noun} yet`, bg: APP_COLORS.dangerBg, fg: APP_COLORS.danger }
	if (isDoneStatus(v.status)) return { label: 'Completed', bg: APP_COLORS.successBg, fg: APP_COLORS.success }
	if (isLiveStatus(v.status)) return { label: 'In progress', bg: TONES.sky.bg, fg: TONES.sky.ink }
	if (v.rescheduled) return { label: 'Rescheduled', bg: TONES.sky.bg, fg: TONES.sky.ink }
	if (isNext) return { label: 'Next visit', bg: APP_COLORS.mint, fg: APP_COLORS.primary }
	return { label: 'Booked', bg: APP_COLORS.pageBg, fg: APP_COLORS.inkMuted }
}

/** The line under the time: who comes, or when they will be assigned. */
export const assignLine = (v: AncillaryOrderVisit, noun: string, leadMinutes: number) => {
	if (isCancelledStatus(v.status)) return `No ${noun} will be assigned`
	if (isVisitUnassigned(v.status)) return `No ${noun} available`
	const who = v.provider?.name
	if (who) return `${who} · ${noun}`
	if (isDoneStatus(v.status)) return 'Visit completed'
	if (v.status === 'SEARCHING') return `Finding your ${noun}…`
	return `${capitalize(noun)} assigned at ${assignedAtLabel(v.date, v.start_time, leadMinutes)}`
}

/** "Visit 2 · Tue 26 Sep" for the cancel sheet rows. */
export const visitTitle = (v: AncillaryOrderVisit, index: number) =>
	`Visit ${v.index ?? index + 1} · ${dayLabel(v.date)}`

/** Why a visit can't be cancelled (or moved) from the app any more. */
export const lockedReason = (status: string, hasProvider: boolean, noun: string, cancelCutoffMinutes: number) => {
	if (status === 'UNASSIGNED') return `No ${noun} was available for this visit`
	if (hasProvider || /ASSIGNED|ACCEPTED|EN_ROUTE|ARRIVED|IN_PROGRESS/.test(status))
		return `${capitalize(noun)} already assigned`
	if (status === 'SEARCHING') return `Finding your ${noun} now`
	return `Too close to start · cancel up to ${leadText(cancelCutoffMinutes)} before`
}
