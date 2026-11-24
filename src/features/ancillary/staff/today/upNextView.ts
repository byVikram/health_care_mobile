// src/features/ancillary/staff/today/upNextView.ts
//
// View model of the "Up next" cards on the provider Home (Ancillary Home design): one card per visit still to do (today's, then the
// coming days), each with a strip (INSTANT / SCHEDULED + when), the patient, the services, where, how far, tags, and Call / Open.
// Everything a card shows comes with the visit's row (GET /provider/me/today: booking type, accepted time, age and gender, services,
// care tags), so the Home screen no longer reads each visit's details for it.
import { APP_COLORS, TONES } from '../../../../config/theme'
import { durationMinutes } from '../../../../utils/date'
import type { ProviderVisitSummary } from '../../providerVisitService'
import type { ProviderNoun } from '../providerSpecialityCopy'
import { isProviderWork, kmLabel, nextVisitWhen, shortAddress } from './todayView'

/** A visit with nothing left to do (finished, cancelled, missed, never hers). */
const ENDED = /^(COMPLETED|CANCEL|NO_SHOW|EXPIRED|FAILED|UNASSIGNED)/

export const isUpNext = (v: Pick<ProviderVisitSummary, 'status'>) =>
	isProviderWork(v.status) && !ENDED.test((v.status || '').toUpperCase())

/** Today's visits first, then the coming days, finished ones left out. */
export const upNextVisits = (schedule: ProviderVisitSummary[], upcoming: ProviderVisitSummary[]) => {
	const seen = new Set<string>()
	return [...schedule, ...upcoming].filter((v) => {
		if (!isUpNext(v) || seen.has(v.visit_public_id)) return false
		seen.add(v.visit_public_id)
		return true
	})
}

/** What a card shows beyond the day's summary: age, gender and the patient's conditions (the row's own fields unless given). */
export type VisitExtra = {
	age: number | null
	gender: string | null
	conditions: string[]
}

export type UpNextCard = {
	id: string
	visit: ProviderVisitSummary
	instant: boolean
	strip: string
	stripBg: string
	stripInk: string
	/** The 2px accent border of the first card. */
	accent: string
	when: string
	name: string
	initials: string
	/** "34 yrs · Male" (the relation until the details are in). */
	who: string
	status: string
	/** "Wound dressing · 30 min" */
	service: string
	address: string
	/** "~8 min away" */
	live: string
	tags: { label: string; bg: string; ink: string }[]
	cta: string
	primary: boolean
}

const MAX_TAGS = 3

const initialsOf = (name?: string | null) =>
	(name ?? '')
		.split(/\s+/)
		.filter(Boolean)
		.map((w) => w[0])
		.join('')
		.slice(0, 2)
		.toUpperCase() || 'P'

const capitalise = (text: string) => text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()

/** " 11:40 AM" when the server says when she took the visit, else "". */
const acceptedAt = (iso?: string | null) => {
	const d = iso ? new Date(iso) : null
	return d && !Number.isNaN(d.getTime()) ? ` ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : ''
}

const statusLabel = (v: ProviderVisitSummary, instant: boolean) => {
	switch ((v.status || '').toUpperCase()) {
		case 'EN_ROUTE':
			return 'On the way'
		case 'ARRIVED':
			return 'Arrived'
		case 'IN_PROGRESS':
		case 'VERIFICATION_PENDING':
			return 'In progress'
		default:
			return instant ? 'Accepted' : 'Confirmed'
	}
}

const whoLine = (v: ProviderVisitSummary, extra?: VisitExtra) => {
	const fromDetails = [
		extra?.age != null ? `${extra.age} yrs` : null,
		extra?.gender ? capitalise(extra.gender) : null,
	].filter(Boolean)
	if (fromDetails.length) return fromDetails.join(' · ')
	return v.patient.relation ? capitalise(v.patient.relation) : ''
}

export const toUpNextCard = (
	v: ProviderVisitSummary,
	index: number,
	noun: ProviderNoun,
	extra?: VisitExtra
): UpNextCard => {
	// The row says how it was booked; an older backend does not, and an instant ("Book now") visit then has no slot: it is for right now.
	const instant = v.booking_type ? v.booking_type.toUpperCase() === 'INSTANT' : !v.start_time
	const tone = instant ? TONES.peach : TONES.mint
	const minutes =
		durationMinutes(v.start_time, v.end_time) || (v.services ?? []).reduce((n, svc) => n + (svc.minutes || 0), 0)
	const info: VisitExtra = extra ?? {
		age: v.patient.age ?? null,
		gender: v.patient.gender ?? null,
		conditions: v.care_tags ?? [],
	}
	// The patient's conditions as tags: the first in the sand pair, the next in red (the design's "Diabetic", "Left foot ulcer").
	const conditionTags = info.conditions
		.slice(0, MAX_TAGS - 1)
		.map((label, i) =>
			i === 0
				? { label, bg: TONES.sand.bg, ink: TONES.sand.ink }
				: { label, bg: APP_COLORS.dangerBg, ink: APP_COLORS.danger }
		)
	return {
		id: v.visit_public_id,
		visit: v,
		instant,
		strip: `${instant ? 'INSTANT' : 'SCHEDULED'} ${noun.toUpperCase()}`,
		stripBg: tone.bg,
		stripInk: tone.ink,
		accent: instant ? '#E8743F' : APP_COLORS.primary,
		when: instant ? `Now · accepted${acceptedAt(v.accepted_at)}` : nextVisitWhen(v),
		name: v.patient.name ?? 'Patient',
		initials: initialsOf(v.patient.name),
		who: whoLine(v, info),
		status: statusLabel(v, instant),
		service: `${v.service_name}${minutes ? ` · ${minutes} min` : ''}`,
		address: [shortAddress(v.address.street_address), kmLabel(v.distance_km)].filter(Boolean).join(' · '),
		live: v.eta_minutes != null ? `~${v.eta_minutes} min away` : '',
		tags: [
			v.visits_count > 1
				? { label: `Day ${v.index} of ${v.visits_count}`, bg: TONES.mint.bg, ink: TONES.mint.ink }
				: { label: `Single ${noun}`, bg: TONES.mint.bg, ink: TONES.mint.ink },
			...conditionTags,
		],
		cta: index === 0 ? `Open ${noun}` : 'View details',
		primary: index === 0,
	}
}
