// src/features/bookings/bookingListUtils.ts
//
// Pure helpers for the Bookings tab: section grouping (upcoming by day bucket, past by month), the card's
// "when" line, and the BookingItem -> AppBookingCard mappings (kind, status tone, where icon).

import type { MaterialCommunityIcons } from '@expo/vector-icons'
import type { AppIconName, BookingKind } from '../../components/common'
import type { StatusToneKey } from '../../config/theme'
import type {
	BookingCategory,
	BookingItem,
	BookingTone,
	BookingWhereType,
	BookingsWhen,
} from '../../services/bookingsService'
import { MONTH_LONG, combineDateTime, dayDiff, formatClock, relativeDayLabel } from '../../utils/date'

type IconName = keyof typeof MaterialCommunityIcons.glyphMap

export const CATEGORY_KIND: Record<BookingCategory, BookingKind> = {
	doctor: 'doctor',
	ancillary: 'ancillary',
	lab: 'lab',
	pharmacy: 'medicine',
}

/** Contract tone -> STATUS_TONES key (ok green, wait amber, move sky, done neutral -- as in the design). */
export const STATUS_TAG_TONE: Record<BookingTone, StatusToneKey> = {
	ok: 'confirmed',
	wait: 'pending',
	move: 'onTheWay',
	done: 'done',
}

export const whereIconProps = (type?: BookingWhereType | null): { whereIcon?: AppIconName; whereGlyph?: IconName } => {
	switch (type) {
		case 'video':
			return { whereIcon: 'video' }
		case 'home':
			return { whereGlyph: 'home-outline' }
		case 'delivery':
			return { whereGlyph: 'truck-delivery-outline' }
		case 'report':
			return { whereGlyph: 'file-document-outline' }
		default:
			return { whereIcon: 'pin' }
	}
}

/**
 * starts_at as a local Date. A naive ISO ("2026-09-26T07:00:00", clinic-local) or a date-only value is read as
 * local time; a value with a zone ("…Z" / "+05:30") goes through Date.
 */
export const parseStartsAt = (value?: string | null): { date: Date; hasTime: boolean } | null => {
	if (!value) return null
	const rest = value.slice(10)
	if (/(z|[+-]\d{2}:?\d{2})$/i.test(rest)) {
		const d = new Date(value)
		return Number.isNaN(d.getTime()) ? null : { date: d, hasTime: true }
	}
	const [datePart, timePart] = value.split(/[T ]/)
	const d = combineDateTime(datePart, timePart)
	return d ? { date: d, hasTime: !!timePart } : null
}

/** Server label first ("Fri 26 Sep, 7–9 AM"), else "Today, 5:30 PM" / "Sat 27 Sep, 8:30 PM" from starts_at. */
export const whenLabel = (item: BookingItem): string | undefined => {
	if (item.time_label) return item.time_label
	const start = parseStartsAt(item.starts_at)
	if (!start) return undefined
	const day = relativeDayLabel(start.date)
	return start.hasTime ? `${day}, ${formatClock(start.date)}` : day
}

export const patientLabel = (item: BookingItem): string | undefined => {
	const p = item.patient
	if (!p?.name) return undefined
	const rel = p.relation?.trim()
	return rel && rel.toLowerCase() !== 'self' ? `For ${p.name} (${rel})` : `For ${p.name}`
}

export type BookingSection = { title: string; data: BookingItem[] }

const UPCOMING_ORDER = ['TODAY', 'TOMORROW', 'LATER THIS WEEK', 'LATER', 'IN PROGRESS']

const upcomingBucket = (item: BookingItem, now: Date) => {
	const start = parseStartsAt(item.starts_at)
	if (!start) return 'IN PROGRESS'
	const diff = dayDiff(start.date, now)
	if (diff < 0) return 'IN PROGRESS'
	if (diff === 0) return 'TODAY'
	if (diff === 1) return 'TOMORROW'
	if (diff <= 6) return 'LATER THIS WEEK'
	return 'LATER'
}

const pastBucket = (item: BookingItem) => {
	const start = parseStartsAt(item.starts_at)
	if (!start) return 'EARLIER'
	return `${MONTH_LONG[start.date.getMonth()].toUpperCase()} ${start.date.getFullYear()}`
}

/**
 * Upcoming: TODAY / TOMORROW / LATER THIS WEEK (next 2-6 days) / LATER, and IN PROGRESS for items without a
 * time. Past: one section per month ("SEPTEMBER 2026"), newest first as the server sorts them; EARLIER last.
 */
export function groupBookings(items: BookingItem[], when: BookingsWhen, now = new Date()): BookingSection[] {
	const map = new Map<string, BookingItem[]>()
	for (const item of items) {
		const title = when === 'upcoming' ? upcomingBucket(item, now) : pastBucket(item)
		const list = map.get(title)
		if (list) list.push(item)
		else map.set(title, [item])
	}
	const keys = [...map.keys()]
	const titles =
		when === 'upcoming'
			? UPCOMING_ORDER.filter((t) => map.has(t))
			: [...keys.filter((t) => t !== 'EARLIER'), ...keys.filter((t) => t === 'EARLIER')]
	return titles.map((title) => ({ title, data: map.get(title) ?? [] }))
}
