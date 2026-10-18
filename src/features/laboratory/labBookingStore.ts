// src/features/laboratory/labBookingStore.ts
//
// Shared state for the Lab Tests Ordering flow (catalogue -> cart -> labs & time -> review -> payment ->
// success -> order). The screens are separate routes, so the booking in progress lives in a small module-level
// store (the same pattern as health-feed/savedReads.ts) instead of travelling through route params. In-memory
// only: it is reset when the flow finishes ("Back to home" / a new booking) and when the app restarts.
//
// The chosen lab, slot and prices depend on the cart, the address and home / in-clinic: changing any of them
// clears the lab + slot (see `set`), so Review never shows a pick the cart no longer matches.

import { useSyncExternalStore } from 'react'
import Toast from 'react-native-toast-message'
import { labItemById } from './labCatalogue'
import type { LabItem, LabPayMethod } from './labMock'
import { registerSessionCache } from '../../utils/sessionCache'
import { slotAt } from './labFormat'

export type LabWhere = 'home' | 'lab'

/** The API checks availability / slots / quotes for at most this many tests at once. */
export const MAX_LAB_ITEMS = 10

/** The lab picked on the "Choose a lab" screen, with what it quoted for the cart. */
export type LabPick = { id: number; name: string; logoUrl: string | null; distanceKm: number | null }

/** What the screens after payment show: a snapshot of the booking at the moment it was paid. */
export type LabOrder = {
	id: string
	/** The server's id for the order (absent on a demo snapshot): what cancel / reschedule use. */
	apiId?: string
	/** Our step: placed | scheduled | on_the_way | sample_collected | processing | report_ready | needs_attention | cancelled | cancel_requested | reschedule_requested */
	status?: string
	canCancel?: boolean
	canReschedule?: boolean
	placedAt: string
	where: LabWhere
	items: { id: string; name: string; kind: LabItem['kind']; price: number; mrp: number; sub: string }[]
	/** One entry: the collection / lab visit. `time` is a display label ("7:30 AM"). */
	visits: { date: string; time: string }[]
	visitCount: number
	patientName: string
	patientRelation: string
	/** Home: the collection address; clinic: the lab. */
	addressTitle: string
	addressSub: string
	labName?: string
	labLogoUrl?: string | null
	labTatHours?: number | null
	labId?: string
	total: number
	mrpTotal: number
	method: LabPayMethod
	methodLabel: string
	transactionId: string
	fasting: boolean
	note: string
}

export type LabBookingState = {
	/** Catalogue ids in the cart, in the order they were added. */
	cart: string[]
	where: LabWhere
	patientKey: string
	/** Display name / relation of the patient, kept for the payment, success and order screens. */
	patientName: string
	patientRelation: string
	/** The patient's saved address (public id) the availability / slots / quote are checked against. */
	addressId: string | null
	/** Tag ("Home") and one-line text of that address. */
	addressTag: string
	addressLine: string
	note: string
	/** Payment method picked on Review / Payment. */
	method: LabPayMethod
	/** Lab + slot ('YYYY-MM-DD', 'HH:MM') picked on the "Choose a lab" screen. */
	lab: LabPick | null
	slot: { date: string; time: string } | null
	/** Price and MRP per cart item at the picked lab, and what the cart totals there (the lab's own quote). */
	lineAmounts: Record<string, { price: number; mrp: number }>
	quoteTotal: number | null
	order: LabOrder | null
}

const initial = (): LabBookingState => ({
	cart: [],
	where: 'home',
	patientKey: 'self',
	patientName: '',
	patientRelation: 'Self',
	addressId: null,
	addressTag: '',
	addressLine: '',
	note: '',
	method: 'upi',
	lab: null,
	slot: null,
	lineAmounts: {},
	quoteTotal: null,
	order: null,
})

let state: LabBookingState = initial()
const listeners = new Set<() => void>()

const emit = () => listeners.forEach((l) => l())

const subscribe = (l: () => void) => {
	listeners.add(l)
	return () => {
		listeners.delete(l)
	}
}

const getState = () => state

const CLEARED_PICK = { lab: null, slot: null, lineAmounts: {}, quoteTotal: null } as const

export const labBooking = {
	get: getState,
	set(patch: Partial<LabBookingState>) {
		const invalidates =
			(patch.cart !== undefined && patch.cart !== state.cart) ||
			(patch.addressId !== undefined && patch.addressId !== state.addressId) ||
			(patch.where !== undefined && patch.where !== state.where)
		state = { ...state, ...(invalidates ? CLEARED_PICK : {}), ...patch }
		emit()
	},
	/** Back to an empty cart and no pick. */
	reset() {
		state = initial()
		emit()
	},
	/** New booking: clear everything except who the tests are for and where. */
	startOver() {
		const { patientKey, patientName, patientRelation, addressId, addressTag, addressLine } = state
		state = { ...initial(), patientKey, patientName, patientRelation, addressId, addressTag, addressLine }
		emit()
	},
	addItem(id: string) {
		if (state.cart.includes(id)) return
		if (state.cart.length >= MAX_LAB_ITEMS) {
			Toast.show({ type: 'info', text1: `You can book up to ${MAX_LAB_ITEMS} tests at a time` })
			return
		}
		labBooking.set({ cart: [...state.cart, id] })
	},
	removeItem(id: string) {
		labBooking.set({ cart: state.cart.filter((c) => c !== id) })
	},
	toggleItem(id: string) {
		if (state.cart.includes(id)) labBooking.removeItem(id)
		else labBooking.addItem(id)
	},
	/** Drop a slot that has gone by (the app can stay open for a long time). */
	dropExpired() {
		if (state.slot && slotAt(state.slot.date, state.slot.time).getTime() <= Date.now()) {
			labBooking.set({ slot: null })
		}
	},
}

// The booking holds the patient's name, address and paid order: clear it on logout like the other per-user caches.
registerSessionCache(() => labBooking.reset())

export function useLabBooking() {
	const snapshot = useSyncExternalStore(subscribe, getState, getState)
	return snapshot
}

// ---------------------------------------------------------------------------------------------------------
// Derived values (pure helpers over a snapshot)
// ---------------------------------------------------------------------------------------------------------

/** Cart items; once a lab is picked, each carries that lab's price and MRP instead of the catalogue's "from" price. */
export const cartItems = (s: LabBookingState): LabItem[] =>
	s.cart
		.map((id) => labItemById(id))
		.filter((i): i is LabItem => !!i)
		.map((i) => (s.lineAmounts[i.id] ? { ...i, ...s.lineAmounts[i.id] } : i))

/** The order is a single visit (home collection or lab). */
export const visitCountOf = () => 1

export const totalsOf = (s: LabBookingState) => {
	const items = cartItems(s)
	const total = s.quoteTotal ?? items.reduce((n, i) => n + i.price, 0)
	const mrp = items.reduce((n, i) => n + i.mrp, 0)
	// Only packages sell below MRP, so the saving is the packages' MRP minus their price.
	return { items, visits: 1, unitTotal: total, unitMrp: mrp, total, mrp, savings: Math.max(0, mrp - total) }
}

export const needsFasting = (s: LabBookingState) => cartItems(s).some((i) => i.fasting)
