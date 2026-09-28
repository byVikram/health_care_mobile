// src/utils/slots.ts
//
// Generic time-slot helpers shared by the booking / reschedule flows. Typed
// structurally so they work on doctorService's TimeSlot or any slot-like shape.

type SlotLike = {
	status?: string | null
	is_booked?: boolean | null
}

type SlotGroupLike<S extends SlotLike> = {
	slots: S[]
}

export const isSlotBooked = (slot: SlotLike) =>
	!!slot.is_booked || slot.status === 'BOOKED' || slot.status === 'OCCUPIED'

export const isSlotSelectable = (slot: SlotLike) =>
	!isSlotBooked(slot) && slot.status !== 'BLOCKED' && slot.status !== 'UNAVAILABLE'

/** First selectable slot across all groups, or null. */
export const firstOpenSlot = <S extends SlotLike>(groups: SlotGroupLike<S>[]): S | null => {
	for (const g of groups) {
		const s = g.slots.find(isSlotSelectable)
		if (s) return s
	}
	return null
}

/** "Morning (9:00 AM - 12:00 PM)" -> "Morning": drops a trailing parenthesised range. */
export const cleanGroupLabel = (label: string) => label.replace(/\s*\(.*\)\s*$/, '')
