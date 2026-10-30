// src/features/laboratory/labOrder.ts
//
// Turns the booking in progress into the order the success / order screens show (mock: nothing is sent
// anywhere -- the order endpoints are not built yet, so Review keeps the Pay button off).

import { cartItems, totalsOf, type LabBookingState, type LabOrder } from './labBookingStore'
import { timeLabel } from './labFormat'
import type { ApiOrder } from './labService'

export const itemSubLine = (item: ReturnType<typeof cartItems>[number]) =>
	item.kind === 'package'
		? `${item.tests ?? 0} tests · ${item.sample} · ${item.report}`
		: `${item.sample} · ${item.report}`

/** The order the success / order screens show: the server's booking plus the booking-in-progress details it does not echo. */
export function orderFromApi(api: ApiOrder, b?: LabBookingState): LabOrder {
	// From the booking in progress when there is one (it knows the fasting / sample details); else from the server's lines.
	const items = b
		? totalsOf(b).items.map((i) => ({ id: i.id, name: i.name, kind: i.kind, price: i.price, mrp: i.mrp, sub: itemSubLine(i), fasting: i.fasting }))
		: api.items.map((i, n) => ({
				id: String(n),
				name: i.name,
				kind: i.kind,
				price: Number(i.price ?? 0),
				mrp: Number(i.mrp ?? i.price ?? 0),
				sub: i.kind === 'package' ? 'Package' : 'Lab test',
				fasting: false,
			}))
	const total = Number(api.total_amount ?? 0)
	const mrp = items.reduce((n, i) => n + i.mrp, 0)
	const isHome = api.order_type === 'HOME_SAMPLE'
	// The server sends the appointment as Indian wall-clock time ('2026-10-20T07:30:00'): read the text, no time-zone maths.
	const stamp = api.appointment_at ?? ''
	const date = b?.slot?.date ?? stamp.slice(0, 10)
	const time = b?.slot ? timeLabel(b.slot.time) : stamp.length >= 16 ? timeLabel(stamp.slice(11, 16)) : ''
	return {
		id: `KH-${api.id.slice(0, 8).toUpperCase()}`,
		apiId: api.id,
		status: api.status,
		timeline: api.timeline,
		attentionReason: api.attention_reason,
		canCancel: api.can_cancel,
		canReschedule: api.can_reschedule,
		placedAt: api.created_at ?? new Date().toISOString(),
		where: isHome ? 'home' : 'lab',
		items: items.map(({ fasting: _fasting, ...line }) => line),
		visits: date ? [{ date, time }] : [],
		visitCount: 1,
		patientName: api.patient_name || b?.patientName || 'Myself',
		patientRelation: b?.patientRelation ?? '',
		addressTitle: isHome ? 'At home' : (api.lab_name ?? ''),
		addressSub: isHome ? (b?.addressLine ?? [api.address_line, api.city, api.pincode].filter(Boolean).join(', ')) : '',
		labName: api.lab_name ?? undefined,
		labLogoUrl: api.lab_logo_url ?? b?.lab?.logoUrl ?? null,
		labTatHours: api.lab_tat_hours ?? null,
		phleboName: api.phlebo_name,
		phleboNumber: api.phlebo_number,
		trackingLink: api.tracking_link,
		total,
		mrpTotal: mrp,
		method: 'later',
		methodLabel: 'Pay at collection',
		transactionId: '',
		fasting: items.some((i) => i.fasting),
		note: b?.note ?? api.notes ?? '',
	}
}

/** The same order after a cancel / reschedule / refresh: what the server changed (step, time, lab, phlebotomist, what is still allowed). */
export function applyApi(order: LabOrder, api: ApiOrder): LabOrder {
	const stamp = api.appointment_at ?? ''
	const visit = stamp.length >= 16 ? { date: stamp.slice(0, 10), time: timeLabel(stamp.slice(11, 16)) } : order.visits[0]
	return {
		...order,
		status: api.status,
		timeline: api.timeline,
		attentionReason: api.attention_reason,
		labName: api.lab_name ?? order.labName,
		labLogoUrl: api.lab_logo_url ?? order.labLogoUrl,
		canCancel: api.can_cancel,
		canReschedule: api.can_reschedule,
		phleboName: api.phlebo_name,
		phleboNumber: api.phlebo_number,
		trackingLink: api.tracking_link,
		visits: visit ? [visit] : order.visits,
	}
}
