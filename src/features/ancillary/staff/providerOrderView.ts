// src/features/ancillary/staff/providerOrderView.ts
//
// View model for the provider's scheduled-orders queue (GET /api/ancillary/provider/me/orders).
// The contract (phase 4, §5/§6) returns the multi-visit order shape (visits[], expires_at, totals, patient,
// address, services). The backend may still return the older flat single-visit shape (patient_name,
// scheduled_date/start/end, street_address, total_amount, procedures: string[]), so both are normalised here.
import type { AppTagTone } from '../../../components/common'
import { combineDateTime, parseDateOnly, relativeDayLabel, fullDayLabel } from '../../../utils/date'
import { formatTimeSlot } from '../../../utils/formatters'
import {
	PAY_AFTER_VISIT,
	type AncillaryOrderStatus,
	type ProviderScheduledOrder,
} from '../ancillaryProviderBookingService'

/** Fields of the pre-phase-4 flat order shape the backend may still send. */
type LegacyOrderFields = {
	patient_name?: string | null
	scheduled_date?: string | null
	scheduled_start_time?: string | null
	scheduled_end_time?: string | null
	street_address?: string | null
	total_amount?: number | string | null
	procedures?: string[] | null
	reschedule_count?: number | null
	chief_complaint?: string | null
}

export type RawProviderOrder = Partial<ProviderScheduledOrder> & LegacyOrderFields

export type ProviderOrderVisitView = {
	key: string
	index: number
	date: string
	startTime: string
	endTime: string
	status: AncillaryOrderStatus
	title: string
	sub: string
	isToday: boolean
}

export type ProviderOrderView = {
	id: string
	status: AncillaryOrderStatus
	patientName: string
	patientRelation?: string | null
	services: string[]
	packageName?: string | null
	address: string
	note?: string | null
	visits: ProviderOrderVisitView[]
	perVisit: number | null
	total: number | null
	payAfterVisit: boolean
	expiresAt: Date | null
	rescheduleCount: number
}

export const PENDING_STATUSES: AncillaryOrderStatus[] = ['SCHEDULED_PENDING', 'OFFERED', 'PENDING_ACTION']

const toNumber = (v: unknown): number | null => {
	const n = Number(v)
	return v == null || v === '' || !Number.isFinite(n) ? null : n
}

const visitTitle = (date: string) => {
	const d = parseDateOnly(date)
	if (!d) return date || 'Date to be confirmed'
	const rel = relativeDayLabel(d)
	const full = fullDayLabel(d, { markToday: false })
	return rel === full ? full : `${rel}, ${full}`
}

const visitSub = (start: string, end: string) => {
	const s = formatTimeSlot(start)
	const e = formatTimeSlot(end)
	if (s && e) return `${s} – ${e}`
	return s || 'Time to be confirmed'
}

export const normalizeProviderOrder = (raw: RawProviderOrder): ProviderOrderView => {
	const status: AncillaryOrderStatus = raw.status || 'SCHEDULED_PENDING'
	const rawVisits =
		Array.isArray(raw.visits) && raw.visits.length > 0
			? raw.visits.map((v, i) => ({
					key: v.visit_public_id || `${i}`,
					index: v.index ?? i + 1,
					date: v.date,
					startTime: v.start_time,
					endTime: v.end_time,
					status: v.status || status,
				}))
			: raw.scheduled_date
				? [
						{
							key: 'primary',
							index: 1,
							date: raw.scheduled_date,
							startTime: raw.scheduled_start_time || '',
							endTime: raw.scheduled_end_time || '',
							status,
						},
					]
				: []

	const today = new Date()
	const visits: ProviderOrderVisitView[] = [...rawVisits]
		.sort((a, b) => a.index - b.index)
		.map((v) => {
			const d = parseDateOnly(v.date)
			return {
				...v,
				title: visitTitle(v.date),
				sub: visitSub(v.startTime, v.endTime),
				isToday:
					!!d &&
					d.getFullYear() === today.getFullYear() &&
					d.getMonth() === today.getMonth() &&
					d.getDate() === today.getDate(),
			}
		})

	const services =
		Array.isArray(raw.services) && raw.services.length > 0
			? raw.services.map((s) => s.name).filter(Boolean)
			: Array.isArray(raw.procedures)
				? raw.procedures.filter(Boolean)
				: []

	const total = toNumber(raw.totals?.total) ?? toNumber(raw.total_amount)
	const perVisit =
		toNumber(raw.totals?.per_visit) ?? (total != null && visits.length > 0 ? total / visits.length : null)

	const expires = raw.expires_at ? new Date(raw.expires_at) : null

	return {
		id: raw.request_public_id || '',
		status,
		patientName: raw.patient?.name || raw.patient_name || 'Patient',
		patientRelation: raw.patient?.relation,
		services,
		packageName: raw.package?.name,
		address: raw.address?.street_address || raw.street_address || '',
		note: raw.note ?? raw.chief_complaint,
		visits,
		perVisit,
		total,
		// Every home-care order is PAY_AFTER_VISIT (phase-4 rule); older rows have no payment_method.
		payAfterVisit: !raw.payment_method || raw.payment_method === PAY_AFTER_VISIT,
		expiresAt: expires && !Number.isNaN(expires.getTime()) ? expires : null,
		rescheduleCount: Number(raw.reschedule_count) || 0,
	}
}

export const isPendingOrder = (order: ProviderOrderView) => PENDING_STATUSES.includes(order.status)

/** Pending but past `expires_at` -- the backend expires it lazily on the next read. */
export const isLocallyExpired = (order: ProviderOrderView, nowMs: number) =>
	isPendingOrder(order) && !!order.expiresAt && order.expiresAt.getTime() <= nowMs

export const isOrderExpired = (order: ProviderOrderView, nowMs: number) =>
	order.status === 'EXPIRED' || isLocallyExpired(order, nowMs)

/** Accept / Decline only while pending and not expired. */
export const isOrderActionable = (order: ProviderOrderView, nowMs: number) =>
	isPendingOrder(order) && !isLocallyExpired(order, nowMs)

/** "12:05" (mm:ss) -- or "1:02:05" past an hour -- until `target`; null once reached. */
export const countdownLabel = (target: Date | null, nowMs: number): string | null => {
	if (!target) return null
	const total = Math.floor((target.getTime() - nowMs) / 1000)
	if (total <= 0) return null
	const h = Math.floor(total / 3600)
	const m = Math.floor((total % 3600) / 60)
	const s = total % 60
	const mm = h > 0 ? String(m).padStart(2, '0') : String(m)
	return `${h > 0 ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}`
}

/** Label + AppTag tone (STATUS_TONES key) for an order or visit status. */
export const orderStatusMeta = (status: AncillaryOrderStatus, expired = false): { label: string; tone: AppTagTone } => {
	if (expired) return { label: 'Expired', tone: 'done' }
	switch ((status || '').toUpperCase()) {
		case 'SCHEDULED_PENDING':
		case 'OFFERED':
		case 'PENDING_ACTION':
			return { label: 'Awaiting you', tone: 'pending' }
		case 'RESCHEDULE_PROPOSED':
			return { label: 'New time proposed', tone: 'scheduled' }
		case 'SCHEDULED_CONFIRMED':
		case 'ASSIGNED':
		case 'NURSE_ASSIGNED':
			return { label: 'Confirmed', tone: 'confirmed' }
		case 'EN_ROUTE':
			return { label: 'On the way', tone: 'onTheWay' }
		case 'ARRIVED':
		case 'VERIFICATION_PENDING':
		case 'IN_PROGRESS':
			return { label: 'In progress', tone: 'inProgress' }
		case 'COMPLETED':
			return { label: 'Completed', tone: 'completed' }
		case 'EXPIRED':
			return { label: 'Expired', tone: 'done' }
		case 'CANCELLED_BY_PROVIDER':
			return { label: 'Declined', tone: 'cancelled' }
		case 'CANCELLED_BY_PATIENT':
			return { label: 'Cancelled by patient', tone: 'cancelled' }
		case 'CANCELLED':
			return { label: 'Cancelled', tone: 'cancelled' }
		default:
			return { label: status ? status.replace(/_/g, ' ').toLowerCase() : 'Unknown', tone: 'neutral' }
	}
}

/** Start of the first visit, for sorting. */
export const firstVisitStart = (order: ProviderOrderView) => {
	const v = order.visits[0]
	return v ? (combineDateTime(v.date, v.startTime)?.getTime() ?? Number.MAX_SAFE_INTEGER) : Number.MAX_SAFE_INTEGER
}
