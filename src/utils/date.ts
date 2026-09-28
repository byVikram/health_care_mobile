// src/utils/date.ts
//
// Shared, generic date helpers (API formatting, day/month labels, day strips,
// relative labels). Feature files should import from here rather than keeping
// their own DOW / MONTHS arrays or startOfDay copies.

import { formatTimeSlot } from './formatters'

type DateInput = Date | string

const parseDateInput = (date: DateInput): Date => {
	if (date instanceof Date) return date

	const dateOnlyMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})$/)
	if (dateOnlyMatch) {
		const [, year, month, day] = dateOnlyMatch
		return new Date(Number(year), Number(month) - 1, Number(day))
	}

	return new Date(date)
}

export const formatDateForApi = (date: Date): string => {
	const yyyy = date.getFullYear()
	const mm = String(date.getMonth() + 1).padStart(2, '0')
	const dd = String(date.getDate()).padStart(2, '0')
	return `${yyyy}-${mm}-${dd}` // e.g. "2026-04-08"
}

export const formatDateStringForApi = (date: string): string | null => {
	if (!date) return null
	const [day, month, year] = date.split('-')
	return `${year}-${month}-${day}`
}

export const formatApiDateForDisplay = (date?: string): string => {
	if (!date) return ''
	const [year, month, day] = date.split('-')
	return `${day}-${month}-${year}`
}

export const formatShortDateDisplay = (date: DateInput): string =>
	parseDateInput(date).toLocaleDateString('en-IN', {
		day: '2-digit',
		month: 'short',
		year: 'numeric',
	})

export const formatGroupDateDisplay = (date: DateInput): string =>
	parseDateInput(date).toLocaleDateString('en-IN', {
		weekday: 'long',
		day: '2-digit',
		month: 'short',
		year: 'numeric',
	})

export const formatDateDisplay = (date: Date): string => {
	return date.toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	}) // e.g. "April 8, 2026"
}

export const formatTimeForApi = (timeLabel: string): string => {
	const trimmed = timeLabel.trim().toUpperCase()
	const match = trimmed.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/)

	if (!match) return timeLabel

	const [, hText, mText, suffix] = match
	let hour = Number.parseInt(hText, 10)

	if (suffix === 'PM' && hour !== 12) hour += 12
	if (suffix === 'AM' && hour === 12) hour = 0

	return `${String(hour).padStart(2, '0')}:${mText}`
}

// ── Day / month names ────────────────────────────────────────────────────────

export const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const DOW_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
export const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export const MONTH_LONG = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December',
]

// ── Day arithmetic ───────────────────────────────────────────────────────────

const DAY_MS = 86400000

export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())

export const isSameDay = (a: Date, b: Date) =>
	a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

/** Whole calendar days from `from` (default: now) to `d`; negative when `d` is in the past. */
export const dayDiff = (d: Date, from = new Date()) =>
	Math.round((startOfDay(d).getTime() - startOfDay(from).getTime()) / DAY_MS)

/** `count` consecutive days starting today (local midnight). */
export const nextDays = (count = 7): Date[] => {
	const today = startOfDay(new Date())
	return Array.from({ length: count }, (_, i) => {
		const d = new Date(today)
		d.setDate(today.getDate() + i)
		return d
	})
}

/** Alias of `nextDays(7)`, kept for existing importers. */
export const nextSevenDays = (): Date[] => nextDays(7)

/** Is the hospital closed on this weekday? Unknown available_days = never closed. */
export const isClosedDay = (d: Date, availableDays?: string[]) =>
	Array.isArray(availableDays) && availableDays.length > 0 && !availableDays.includes(DOW_KEYS[d.getDay()])

// ── Parsing ──────────────────────────────────────────────────────────────────

type ParseDateOnlyOptions = {
	/**
	 * true (default): an ISO timestamp is truncated to its 'YYYY-MM-DD' part and parsed as local midnight.
	 * false: only an exact 'YYYY-MM-DD' string is parsed as local midnight; anything else goes through `new Date()`.
	 */
	ignoreTime?: boolean
}

/** Parses 'YYYY-MM-DD' as a local date (no UTC shift); falls back to Date parsing. Null when unparseable. */
export const parseDateOnly = (value?: string | null, { ignoreTime = true }: ParseDateOnlyOptions = {}): Date | null => {
	if (!value) return null
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ignoreTime ? value.split('T')[0] : value)
	if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
	const parsed = new Date(value)
	return Number.isNaN(parsed.getTime()) ? null : parsed
}

/** Local Date for a 'YYYY-MM-DD' date + 'HH:mm[:ss]' time pair (time optional). */
export const combineDateTime = (date?: string | null, time?: string | null): Date | null => {
	const d = parseDateOnly(date)
	if (!d) return null
	const m = /^(\d{1,2}):(\d{2})/.exec(time ?? '')
	if (m) d.setHours(Number(m[1]), Number(m[2]), 0, 0)
	return d
}

// ── Labels ───────────────────────────────────────────────────────────────────

type FullDayLabelOptions = {
	/** Prefix today's date with "Today, " (default true). */
	markToday?: boolean
}

/** "Today, Thu 24 Sep" / "Fri 25 Sep" (or always "Thu 24 Sep" with `markToday: false`). */
export const fullDayLabel = (d: Date, { markToday = true }: FullDayLabelOptions = {}) => {
	const base = `${DOW_LABELS[d.getDay()]} ${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`
	return markToday && isSameDay(d, new Date()) ? `Today, ${base}` : base
}

/** "Today" / "Tomorrow" / "Fri 26 Sep" */
export const relativeDayLabel = (d: Date) => {
	const diff = dayDiff(d)
	if (diff === 0) return 'Today'
	if (diff === 1) return 'Tomorrow'
	return fullDayLabel(d, { markToday: false })
}

/** "5 Dec 2026" */
export const formatFullDate = (date: Date) => `${date.getDate()} ${MONTH_SHORT[date.getMonth()]} ${date.getFullYear()}`

/** "September 2026" when every day is in one month, else "Sep – Oct 2026". */
export const monthRangeLabel = (days: Date[]) => {
	const first = days[0]
	const last = days[days.length - 1]
	const a = MONTH_SHORT[first.getMonth()]
	const b = MONTH_SHORT[last.getMonth()]
	if (a === b) return `${first.toLocaleString('en-US', { month: 'long' })} ${first.getFullYear()}`
	return `${a} – ${b} ${last.getFullYear()}`
}

/** "5:30 PM" for a Date. */
export const formatClock = (d: Date) => {
	const h = d.getHours()
	return `${h % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

/** "Today, 5:30 PM" for a date + HH:mm:ss pair. */
export const slotLabel = (date?: string | null, time?: string | null) => {
	const d = parseDateOnly(date)
	if (!d) return '—'
	const t = formatTimeSlot(time)
	return t ? `${relativeDayLabel(d)}, ${t}` : relativeDayLabel(d)
}

/** "Wed 24 Sep, 6:12 PM" / "Today, 10:05 AM" for an ISO timestamp. */
export const stampLabel = (iso?: string | null) => {
	if (!iso) return ''
	const d = new Date(iso)
	if (Number.isNaN(d.getTime())) return ''
	return `${relativeDayLabel(d)}, ${formatClock(d)}`
}

/** "starts in 25 min" / "starts in 2 hrs 10 min" / "starts in 3 days"; null once started. */
export const startsInLabel = (target: Date | null): string | null => {
	if (!target) return null
	const ms = target.getTime() - Date.now()
	if (ms <= 0) return null
	const mins = Math.round(ms / 60000)
	if (mins < 60) return `starts in ${mins} min`
	const days = dayDiff(target)
	if (days >= 1) return `starts in ${days} ${days === 1 ? 'day' : 'days'}`
	const hrs = Math.floor(mins / 60)
	const rem = mins % 60
	return `starts in ${hrs} ${hrs === 1 ? 'hr' : 'hrs'}${rem ? ` ${rem} min` : ''}`
}

/** Minutes between two 'HH:mm[:ss]' times; null when unparseable or not positive. */
export const durationMinutes = (start?: string | null, end?: string | null) => {
	const s = /^(\d{1,2}):(\d{2})/.exec(start ?? '')
	const e = /^(\d{1,2}):(\d{2})/.exec(end ?? '')
	if (!s || !e) return null
	const diff = Number(e[1]) * 60 + Number(e[2]) - (Number(s[1]) * 60 + Number(s[2]))
	return diff > 0 ? diff : null
}

/** "3 months" / "2 weeks" / "5 days" between two dates; null when `from` is missing or not before `to`. */
export const formatInterval = (from: Date | null, to: Date): string | null => {
	if (!from) return null
	const days = Math.round((to.getTime() - from.getTime()) / DAY_MS)
	if (days <= 0) return null
	if (days < 14) return `${days} day${days === 1 ? '' : 's'}`
	if (days < 60) {
		const w = Math.round(days / 7)
		return `${w} week${w === 1 ? '' : 's'}`
	}
	const mo = Math.round(days / 30)
	return `${mo} month${mo === 1 ? '' : 's'}`
}
