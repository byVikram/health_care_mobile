// src/features/ancillary/staff/schedule/scheduleModel.ts
//
// View model of the provider Schedule (the "ancillary schedule" design): the visits a provider holds, from GET /provider/me/orders
// (already normalised by providerOrderView), turned into rows grouped by day, the 7-day strip, the "Earlier today" list and the
// Past visits history with its filters. Pure functions, no React.
import { APP_COLORS } from '../../../../config/theme'
import { DOW_LABELS, MONTH_SHORT, formatDateForApi, parseDateOnly } from '../../../../utils/date'
import { formatTimeSlot } from '../../../../utils/formatters'
import type { ProviderOrderView } from '../providerOrderView'

export type VisitKind = 'instant' | 'scheduled'
/** active = still to do (or under way); the rest are how a visit ended. */
export type VisitState = 'active' | 'done' | 'missed' | 'cancelled' | 'released'

export type ScheduleVisit = {
	key: string
	orderId: string
	/** The visit's own id (for the visit screens); null on the older flat order shape. */
	visitId: string | null
	kind: VisitKind
	/** YYYY-MM-DD. An instant visit has no slot: it counts as today. */
	date: string
	/** HH:MM, '' when there is no slot (instant). */
	startTime: string
	endTime: string
	state: VisitState
	status: string
	/** When she took it (ISO), from the backend's accepted_at. */
	acceptedAt: string | null
	/** Why it ended (the backend's end_reason): "released by you" is not "cancelled by the family". */
	endReason: string | null
	inProgress: boolean
	patientName: string
	area: string
	address: string
	care: string
	serviceCount: number
	/** 1-based position within the order, of `count`. */
	index: number
	count: number
}

const ACTIVE_STATUS =
	/^(SCHEDULED_CONFIRMED|ASSIGNED|NURSE_ASSIGNED|ACCEPTED|EN_ROUTE|ARRIVED|IN_PROGRESS|VERIFICATION_PENDING)$/

/** null = not this provider's work (still unassigned, expired, offered...): never listed. */
export const visitState = (status: string): VisitState | null => {
	const s = (status || '').toUpperCase()
	if (ACTIVE_STATUS.test(s)) return 'active'
	if (s === 'COMPLETED') return 'done'
	if (s === 'NO_SHOW') return 'missed'
	if (s === 'CANCELLED_BY_PROVIDER') return 'released'
	if (s === 'CANCELLED_BY_PATIENT' || s === 'CANCELLED') return 'cancelled'
	return null
}

/**
 * How a visit ended, by the backend's end_reason. It wins over the visit's status: a day a nurse gave back goes to SEARCHING (or to
 * another nurse's SCHEDULED_CONFIRMED), so its status no longer says "released" but her own record of it still does.
 */
const END_STATE: Record<string, VisitState> = {
	COMPLETED: 'done',
	PATIENT_NOT_AVAILABLE: 'missed',
	CANCELLED_BY_FAMILY: 'cancelled',
	CANCELLED: 'cancelled',
	RELEASED_BY_PROVIDER: 'released',
}

/** First part of a street address ("12 MG Road, Bangalore" -> "12 MG Road"). */
export const shortArea = (street?: string | null) => (street ?? '').split(',')[0].trim()

export const isoOf = (d: Date) => formatDateForApi(d)

export const todayIso = () => isoOf(new Date())

export const addDaysIso = (iso: string, days: number) => {
	const d = parseDateOnly(iso) ?? new Date()
	d.setDate(d.getDate() + days)
	return isoOf(d)
}

/** "Fri" */
export const dowOf = (iso: string) => {
	const d = parseDateOnly(iso)
	return d ? DOW_LABELS[d.getDay()] : ''
}

/** "Fri, 20 Nov" */
export const longDay = (iso: string) => {
	const d = parseDateOnly(iso)
	return d ? `${DOW_LABELS[d.getDay()]}, ${d.getDate()} ${MONTH_SHORT[d.getMonth()]}` : ''
}

/** "FRI 20 NOV" (section titles). */
export const upperDay = (iso: string) => {
	const d = parseDateOnly(iso)
	return d ? `${DOW_LABELS[d.getDay()]} ${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`.toUpperCase() : ''
}

export const monthLabel = (iso: string) => {
	const d = parseDateOnly(iso)
	return d ? d.toLocaleDateString([], { month: 'long', year: 'numeric' }) : ''
}

/** "Today, Fri 20 Nov" / "Sat, 21 Nov". */
export const dayTitle = (iso: string, today: string) =>
	iso === today ? `Today, ${longDay(iso).replace(',', '')}` : longDay(iso)

export const timeParts = (startTime: string): { time: string; ampm: string } => {
	if (!startTime) return { time: 'Now', ampm: 'instant' }
	const [time = '', ampm = ''] = formatTimeSlot(startTime).split(' ')
	return { time, ampm }
}

const minutesOf = (hhmm: string) => {
	const m = /^(\d{1,2}):(\d{2})/.exec(hhmm ?? '')
	return m ? Number(m[1]) * 60 + Number(m[2]) : -1
}

const byTime = (a: ScheduleVisit, b: ScheduleVisit) => minutesOf(a.startTime) - minutesOf(b.startTime)

const careLabel = (order: ProviderOrderView) => {
	const names = order.services
	if (names.length === 0) return order.packageName || 'Care visit'
	return names.length > 1 ? `${names[0]} + ${names.length - 1} more` : names[0]
}

export const toScheduleVisits = (orders: ProviderOrderView[], today: string): ScheduleVisit[] => {
	const out: ScheduleVisit[] = []
	for (const order of orders) {
		const kind: VisitKind = order.bookingType === 'INSTANT' ? 'instant' : 'scheduled'
		for (const v of order.visits) {
			const state = (v.endReason ? END_STATE[v.endReason] : undefined) ?? visitState(v.status)
			if (!state) continue
			// An instant visit has no slot: it is today while it is open, and the day she took it once it has ended.
			const took = v.acceptedAt ? new Date(v.acceptedAt) : null
			const endedOn = state !== 'active' && took && !Number.isNaN(took.getTime()) ? isoOf(took) : today
			out.push({
				key: `${order.id}:${v.key}`,
				orderId: order.id,
				visitId: v.visitPublicId ?? null,
				kind,
				date: v.date || endedOn,
				startTime: v.startTime || '',
				endTime: v.endTime || '',
				state,
				status: (v.status || '').toUpperCase(),
				acceptedAt: v.acceptedAt ?? null,
				endReason: v.endReason ?? null,
				inProgress: (v.status || '').toUpperCase() === 'IN_PROGRESS',
				patientName: order.patientName,
				area: shortArea(order.address),
				address: order.address,
				care: careLabel(order),
				serviceCount: Math.max(order.services.length, 1),
				index: v.index,
				count: order.visits.length,
			})
		}
	}
	return out
}

/** The 7 days of the strip, today first. */
export const stripDays = (today: string, count = 7) => Array.from({ length: count }, (_, i) => addDaysIso(today, i))

/** Visits still to do on a day. */
export const activeOn = (visits: ScheduleVisit[], iso: string) =>
	visits.filter((v) => v.date === iso && v.state === 'active')

export type DaySection = { title: string; rows: ScheduleVisit[] }

export type DayView = {
	/** "UP NEXT · 3" / "TUE 24 NOV · 2 VISITS" */
	section: DaySection | null
	/** Finished earlier today (today only). */
	done: ScheduleVisit[]
	toGo: number
	counts: Record<'all' | VisitKind, number>
}

/** What the day shows under the strip: the open rows, the finished ones and the filter counts. */
export const buildDayView = (
	visits: ScheduleVisit[],
	iso: string,
	today: string,
	filter: 'all' | VisitKind
): DayView => {
	const onDay = visits.filter((v) => v.date === iso)
	// Active ones, plus the visits that ended today without being done (released / cancelled / missed) so the row says what happened.
	const open = onDay.filter((v) => v.state !== 'done')
	const counts = {
		all: open.filter((v) => v.state === 'active').length,
		instant: open.filter((v) => v.state === 'active' && v.kind === 'instant').length,
		scheduled: open.filter((v) => v.state === 'active' && v.kind === 'scheduled').length,
	}
	const rows = open.filter((v) => filter === 'all' || v.kind === filter).sort(byTime)
	const n = rows.length
	const title = iso === today ? `UP NEXT · ${n}` : `${upperDay(iso)} · ${n} ${n === 1 ? 'VISIT' : 'VISITS'}`
	return {
		section: n > 0 ? { title, rows } : null,
		done: iso === today && filter === 'all' ? onDay.filter((v) => v.state === 'done').sort(byTime) : [],
		toGo: counts.all,
		counts,
	}
}

// ---- Past visits ----

export type PastRangeKey = 'last7' | 'last30' | 'last90' | 'all' | 'month' | 'custom'
export type PastStatusKey = 'all' | 'done' | 'missed' | 'cancelled' | 'released'
export type PastTypeKey = 'all' | VisitKind

export const PAST_RANGES: { id: PastRangeKey; label: string }[] = [
	{ id: 'last7', label: 'Last 7 days' },
	{ id: 'last30', label: 'Last 30 days' },
	{ id: 'last90', label: 'Last 3 months' },
	{ id: 'all', label: 'All time' },
	{ id: 'month', label: 'This month' },
	{ id: 'custom', label: 'Custom dates' },
]

export const PAST_STATUSES: { id: PastStatusKey; label: string }[] = [
	{ id: 'all', label: 'All' },
	{ id: 'done', label: 'Completed' },
	{ id: 'missed', label: 'Patient not home' },
	{ id: 'cancelled', label: 'Cancelled' },
	{ id: 'released', label: 'Released' },
]

export const PAST_TYPES: { id: PastTypeKey; label: string }[] = [
	{ id: 'all', label: 'All' },
	{ id: 'instant', label: 'Instant' },
	{ id: 'scheduled', label: 'Scheduled' },
]

/** The pill of a past visit: label + colours (the design's PSTAT). */
export const PAST_STATE_PILL: Record<Exclude<VisitState, 'active'>, { label: string; bg: string; ink: string }> = {
	done: { label: 'Completed', bg: APP_COLORS.mint, ink: APP_COLORS.primary },
	missed: { label: 'Patient not home', bg: APP_COLORS.warningBg, ink: APP_COLORS.warning },
	cancelled: { label: 'Cancelled by family', bg: APP_COLORS.neutralBg, ink: APP_COLORS.inkMuted },
	released: { label: 'Released by you', bg: APP_COLORS.neutralBg, ink: APP_COLORS.inkMuted },
}

export type PastFilters = {
	range: PastRangeKey
	status: PastStatusKey
	type: PastTypeKey
	/** Custom range, YYYY-MM-DD (read only when range is 'custom'). */
	from: string
	to: string
	needle: string
}

export const DEFAULT_PAST_FILTERS: PastFilters = {
	range: 'last30',
	status: 'all',
	type: 'all',
	from: '',
	to: '',
	needle: '',
}

/** How many of range / status / type differ from the defaults (the badge on "Filters"). */
export const pastFilterCount = (f: PastFilters) =>
	(f.range !== DEFAULT_PAST_FILTERS.range ? 1 : 0) + (f.status !== 'all' ? 1 : 0) + (f.type !== 'all' ? 1 : 0)

/** The dates a Past filter covers (before today); the Past list asks the server for exactly these. */
export const resolveRange = (f: PastFilters, today: string): { from: string; to: string } => {
	const yesterday = addDaysIso(today, -1)
	switch (f.range) {
		case 'last7':
			return { from: addDaysIso(today, -7), to: yesterday }
		case 'last30':
			return { from: addDaysIso(today, -30), to: yesterday }
		case 'last90':
			return { from: addDaysIso(today, -90), to: yesterday }
		case 'month':
			return { from: `${today.slice(0, 8)}01`, to: yesterday }
		case 'custom':
			return { from: f.from || '0000-01-01', to: f.to || yesterday }
		default:
			return { from: '0000-01-01', to: yesterday }
	}
}

export type PastDay = { iso: string; title: string; meta: string; rows: ScheduleVisit[] }

/** Past days (before today), newest first, after the filters; `meta` is "2 of 3 done" or "2 visits" under a status filter. */
export const buildPast = (
	visits: ScheduleVisit[],
	f: PastFilters,
	today: string
): { days: PastDay[]; total: number } => {
	const { from, to } = resolveRange(f, today)
	const needle = f.needle.trim().toLowerCase()
	const past = visits.filter((v) => v.date < today && v.date >= from && v.date <= to && v.state !== 'active')
	const byDay = new Map<string, ScheduleVisit[]>()
	for (const v of past) byDay.set(v.date, [...(byDay.get(v.date) ?? []), v])
	const days: PastDay[] = []
	let total = 0
	for (const iso of [...byDay.keys()].sort().reverse()) {
		const all = byDay.get(iso) ?? []
		const rows = all
			.filter((v) => f.status === 'all' || v.state === f.status)
			.filter((v) => f.type === 'all' || v.kind === f.type)
			.filter((v) => !needle || v.patientName.toLowerCase().includes(needle))
			.sort(byTime)
		if (rows.length === 0) continue
		total += rows.length
		const done = all.filter((v) => v.state === 'done').length
		days.push({
			iso,
			title: `${iso === addDaysIso(today, -1) ? 'YESTERDAY · ' : ''}${upperDay(iso)}`,
			meta:
				f.status === 'all'
					? `${done} of ${all.length} done`
					: `${rows.length} ${rows.length === 1 ? 'visit' : 'visits'}`,
			rows,
		})
	}
	return { days, total }
}

/** "Instant · Wound dressing · Koramangala" under a past visit's name. */
export const pastSubline = (v: ScheduleVisit) =>
	[v.kind === 'instant' ? 'Instant' : null, v.care, v.area || null].filter(Boolean).join(' · ')
