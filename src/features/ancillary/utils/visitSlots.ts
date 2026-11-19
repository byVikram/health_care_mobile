// src/features/ancillary/utils/visitSlots.ts
//
// The hourly slot grid (7 AM - 9 PM, in Morning / Afternoon / Evening groups) shared by "Schedule a visit" and
// "Reschedule visit", and the clock maths behind "today's slots must start at least an hour from now".

import type { SlotChipItem } from '../../../components/common'
import { clinicDateIso } from '../../doctor/scheduleUtils'
import { chipTimeLabel, timeLabel } from '../patient/ancillaryBookingCopy'

/** Slot hours, 7 AM - 9 PM (the last slot starts at 9 PM). */
const SLOT_GROUPS: { label: string; fromHour: number; toHour: number }[] = [
	{ label: 'Morning', fromHour: 7, toHour: 11 },
	{ label: 'Afternoon', fromHour: 12, toHour: 16 },
	{ label: 'Evening', fromHour: 17, toHour: 21 },
]

/** "HH:MM" for minutes since midnight (clamped to the end of the day). */
export const hhmm = (minutes: number) => {
	const m = Math.min(Math.max(minutes, 0), 23 * 60 + 59)
	return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

/** Minutes since midnight for "HH:MM". */
export const minutesOf = (value: string) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5))

/** Mumbai's UTC offset (IST, +05:30, no daylight saving): the zone the server checks visit times in, whatever the phone's zone is. */
const IST_OFFSET_MS = 330 * 60_000

/** Seconds since midnight in Mumbai at `now`. */
export const secondsNowIst = (now: Date) => {
	const t = new Date(now.getTime() + IST_OFFSET_MS)
	return t.getUTCHours() * 3600 + t.getUTCMinutes() * 60 + t.getUTCSeconds()
}

/** `count` days from today in MUMBAI, as local-midnight dates (it is the calendar day each names that counts). */
export const istDays = (count: number, now: Date = new Date()): Date[] => {
	const [y, m, d] = clinicDateIso(now).split('-').map(Number)
	return Array.from({ length: count }, (_, i) => new Date(y, m - 1, d + i))
}

/**
 * A slot is too soon when it starts less than `leadMinutes` (1 hour) after now, in Mumbai time to the second, the way the server
 * counts: at 11:45 the 12:00 and 12:30 slots are too soon and 1 PM is the first that can be picked.
 */
export const slotTooSoon = (startMinutes: number, nowSeconds: number, leadMinutes: number) =>
	startMinutes * 60 < nowSeconds + leadMinutes * 60

/**
 * The slot chips per group. `isFree(startMinutes)` says whether a slot can be picked; the ones that can't are
 * struck through and announced as "too soon".
 */
export const buildSlotGroups = (isFree: (startMinutes: number) => boolean) =>
	SLOT_GROUPS.map((g) => {
		const slots: SlotChipItem[] = []
		for (let h = g.fromHour; h <= g.toHour; h++) {
			const value = hhmm(h * 60)
			const free = isFree(h * 60)
			slots.push({
				value,
				label: chipTimeLabel(value),
				struck: !free,
				accessibilityLabel: `${timeLabel(value)}${free ? '' : ', too soon'}`,
			})
		}
		return { label: g.label, slots }
	})

/** Minutes since midnight of the day's last slot (9 PM). */
export const LAST_SLOT_MINUTES = SLOT_GROUPS[SLOT_GROUPS.length - 1].toHour * 60
