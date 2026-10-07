// src/features/laboratory/labBookingStore.ts
//
// Shared state for the Lab Tests Ordering flow (catalogue -> cart -> review -> payment -> success -> order).
// The screens are separate routes, so the booking in progress lives in a small module-level store (the same
// pattern as health-feed/savedReads.ts) instead of travelling through route params. In-memory only: it is
// reset when the flow finishes ("Back to home" / a new booking) and when the app restarts.

import { useSyncExternalStore } from 'react'
import { DEFAULT_COLLECTION_TIME, MAX_REPEAT_VISITS, labItemById, type LabItem, type LabPayMethod } from './labMock'
import { registerSessionCache } from '../../utils/sessionCache'
import { addDays, slotStart, toIso, todayIso } from './labFormat'

export type LabWhere = 'home' | 'lab'
export type LabScheduleMode = 'single' | 'multi'

type LabClinicPick = { labId: string; date: string; time: string }

/** What the screens after payment show: a snapshot of the booking at the moment it was paid. */
export type LabOrder = {
	id: string
	placedAt: string
	where: LabWhere
	items: { id: string; name: string; kind: LabItem['kind']; price: number; mrp: number; sub: string }[]
	/** One entry per home visit (a single entry for in-clinic). */
	visits: { date: string; time: string }[]
	visitCount: number
	patientName: string
	patientRelation: string
	/** Home: the collection address; clinic: the lab address. */
	addressTitle: string
	addressSub: string
	labName?: string
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
	/** Item ids in the cart, in the order they were added. */
	cart: string[]
	where: LabWhere
	scheduleMode: LabScheduleMode
	/** Selected home-collection dates ('YYYY-MM-DD'), sorted. */
	dates: string[]
	/** Collection time id (see COLLECTION_TIMES). */
	time: string
	sameTime: boolean
	visitTime: Record<string, string>
	patientKey: string
	/** Display name / relation of the patient, kept for the payment, success and order screens. */
	patientName: string
	patientRelation: string
	/** Collection address (home visits): tag "Home" and the one-line address. */
	addressTag: string
	addressLine: string
	note: string
	/** Payment method picked on Review / Payment. */
	method: LabPayMethod
	clinic: LabClinicPick | null
	order: LabOrder | null
}

const tomorrow = () => toIso(addDays(new Date(), 1))

const initial = (): LabBookingState => ({
	cart: [],
	where: 'home',
	scheduleMode: 'single',
	dates: [tomorrow()],
	time: DEFAULT_COLLECTION_TIME,
	sameTime: true,
	visitTime: {},
	patientKey: 'self',
	patientName: '',
	patientRelation: 'Self',
	addressTag: '',
	addressLine: '',
	note: '',
	method: 'upi',
	clinic: null,
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

export const labBooking = {
	get: getState,
	set(patch: Partial<LabBookingState>) {
		state = { ...state, ...patch }
		emit()
	},
	/** Back to an empty cart and a fresh schedule. */
	reset() {
		state = initial()
		emit()
	},
	/** New booking: clear everything except who the tests are for. */
	startOver() {
		state = { ...initial(), patientKey: state.patientKey }
		emit()
	},
	addItem(id: string) {
		if (state.cart.includes(id)) return
		labBooking.set({ cart: [...state.cart, id] })
	},
	removeItem(id: string) {
		labBooking.set({ cart: state.cart.filter((c) => c !== id) })
	},
	toggleItem(id: string) {
		if (state.cart.includes(id)) labBooking.removeItem(id)
		else labBooking.addItem(id)
	},
	/** One visit replaces the selection; repeat visits add/remove the tapped date (max MAX_REPEAT_VISITS). */
	pickDate(iso: string) {
		if (state.scheduleMode === 'single') {
			labBooking.set({ dates: [iso] })
			return
		}
		const has = state.dates.includes(iso)
		if (!has && state.dates.length >= MAX_REPEAT_VISITS) return
		const next = has ? state.dates.filter((d) => d !== iso) : [...state.dates, iso]
		labBooking.set({ dates: next.sort() })
	},
	setScheduleMode(mode: LabScheduleMode) {
		const dates = mode === 'single' && state.dates.length > 1 ? [state.dates[0]] : state.dates
		labBooking.set({ scheduleMode: mode, dates })
	},
	setSameTime(same: boolean) {
		if (same) {
			labBooking.set({ sameTime: true })
			return
		}
		const visitTime: Record<string, string> = {}
		state.dates.forEach((d) => {
			visitTime[d] = state.visitTime[d] ?? state.time
		})
		labBooking.set({ sameTime: false, visitTime })
	},
	/** Drop a schedule that has gone by (the app can stay open across midnight): past dates, a past clinic slot. */
	dropExpired() {
		const today = todayIso()
		const dates = state.dates.filter((d) => d > today)
		const clinic =
			state.clinic && slotStart(state.clinic.date, state.clinic.time).getTime() > Date.now() ? state.clinic : null
		if (dates.length === state.dates.length && clinic === state.clinic) return
		labBooking.set({ dates: dates.length ? dates : [tomorrow()], clinic })
	},
	setVisitTime(iso: string, timeId: string) {
		labBooking.set({ visitTime: { ...state.visitTime, [iso]: timeId } })
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

export const cartItems = (s: LabBookingState): LabItem[] =>
	s.cart.map((id) => labItemById(id)).filter((i): i is LabItem => !!i)

/** How many visits the order covers: one per selected date at home, one at the lab. */
export const visitCountOf = (s: LabBookingState) => (s.where === 'home' ? Math.max(s.dates.length, 1) : 1)

export const totalsOf = (s: LabBookingState) => {
	const items = cartItems(s)
	const visits = visitCountOf(s)
	const total = items.reduce((n, i) => n + i.price, 0)
	const mrp = items.reduce((n, i) => n + i.mrp, 0)
	return {
		items,
		visits,
		unitTotal: total,
		unitMrp: mrp,
		total: total * visits,
		mrp: mrp * visits,
		savings: (mrp - total) * visits,
	}
}

export const needsFasting = (s: LabBookingState) => cartItems(s).some((i) => i.fasting)

/** The time id used for a given visit date. */
export const timeIdFor = (s: LabBookingState, iso: string) => (!s.sameTime && s.visitTime[iso]) || s.time
