// src/features/laboratory/labOrder.ts
//
// Turns the booking in progress into the order the success / order screens show (mock: nothing is sent
// anywhere -- there is no lab booking API for this flow yet).

import { cartItems, timeIdFor, totalsOf, visitCountOf, type LabBookingState, type LabOrder } from './labBookingStore'
import { collectionTimeLabel, labCenterById, PAY_METHOD_LABELS } from './labMock'

const pad = (n: number) => String(n).padStart(2, '0')

const fiveDigits = () => String(Math.floor(10000 + Math.random() * 90000))

export const itemSubLine = (item: ReturnType<typeof cartItems>[number]) =>
	item.kind === 'package'
		? `${item.tests} tests · ${item.sample} · ${item.report}`
		: `${item.sample} · ${item.report}`

export function placeLabOrder(b: LabBookingState): LabOrder {
	const { items, total, mrp } = totalsOf(b)
	const isHome = b.where === 'home'
	const lab = labCenterById(b.clinic?.labId)
	const now = new Date()
	const placedAt = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`

	return {
		id: `KH-${fiveDigits()}`,
		placedAt,
		where: b.where,
		items: items.map((i) => ({
			id: i.id,
			name: i.name,
			kind: i.kind,
			price: i.price,
			mrp: i.mrp,
			sub: itemSubLine(i),
		})),
		visits: isHome
			? b.dates.map((d) => ({ date: d, time: collectionTimeLabel(timeIdFor(b, d)) }))
			: b.clinic
				? [{ date: b.clinic.date, time: b.clinic.time }]
				: [],
		visitCount: visitCountOf(b),
		patientName: b.patientName || 'Myself',
		patientRelation: b.patientRelation,
		addressTitle: isHome ? 'At home' : (lab?.name ?? ''),
		addressSub: isHome ? b.addressLine : (lab?.address ?? ''),
		labName: lab?.name,
		labId: lab?.id,
		total,
		mrpTotal: mrp,
		method: b.method,
		methodLabel: PAY_METHOD_LABELS[b.method],
		transactionId: `TXN${Date.now().toString().slice(-9)}`,
		fasting: items.some((i) => i.fasting),
		note: b.note,
	}
}

/** "7–9 AM" -> "7 and 9 AM" for the "between … " sentence. */
export const windowPhrase = (label: string) => label.replace('–', ' and ')
