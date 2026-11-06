// Weekly hours model shared by the doctor and ancillary Availability screens.
//
// A day holds Morning / Afternoon / Evening sections, each with zero or more time ranges ("HH:MM", 24h).
// That is the shape both backends store (doctor: one DoctorAvailability row per range, grouped back into
// sections by start hour; ancillary: `schedules[].sections`), so the UI edits it directly.

export type SectionKey = 'morning' | 'afternoon' | 'evening'

export type TimeRange = { start: string; end: string }

export type DaySections = Record<SectionKey, TimeRange[]>

/** Keyed by JS day index: 0 = Sunday ... 6 = Saturday (same as both backends). */
export type WeekSections = Record<number, DaySections>

export const SECTION_KEYS: SectionKey[] = ['morning', 'afternoon', 'evening']

/** Each section's window in minutes from midnight; a range must sit fully inside its section. */
export const SECTION_META: Record<SectionKey, { label: string; from: number; to: number }> = {
	morning: { label: 'Morning', from: 6 * 60, to: 12 * 60 },
	afternoon: { label: 'Afternoon', from: 12 * 60, to: 17 * 60 },
	evening: { label: 'Evening', from: 17 * 60, to: 23 * 60 + 59 },
}

/** Default range when "Add time" is tapped in a section. */
export const SECTION_DEFAULT_RANGE: Record<SectionKey, TimeRange> = {
	morning: { start: '09:00', end: '12:00' },
	afternoon: { start: '14:00', end: '17:00' },
	evening: { start: '18:00', end: '21:00' },
}

/** Monday-first display order (JS day indexes). */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]
export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const DAY_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export const emptyDay = (): DaySections => ({ morning: [], afternoon: [], evening: [] })

export const emptyWeek = (): WeekSections =>
	Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map((d) => [d, emptyDay()])) as WeekSections

export const cloneWeek = (week: WeekSections): WeekSections => JSON.parse(JSON.stringify(week))

export const toMinutes = (hhmm: string): number => {
	const [h, m] = hhmm.split(':').map(Number)
	return (h || 0) * 60 + (m || 0)
}

export const toHHMM = (minutes: number): string =>
	`${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`

/** "09:00" -> "9 AM", "13:30" -> "1:30 PM", "23:59" -> "11:59 PM". */
export const formatTime = (hhmm: string): string => {
	const total = toMinutes(hhmm)
	const h = Math.floor(total / 60)
	const m = total % 60
	const h12 = h % 12 || 12
	return `${h12}${m ? `:${String(m).padStart(2, '0')}` : ''} ${h < 12 ? 'AM' : 'PM'}`
}

export const formatRange = (r: TimeRange) => `${formatTime(r.start)}–${formatTime(r.end)}`

/** Section a range belongs to, by its start time (how the doctor backend groups rows). */
export const sectionForStart = (hhmm: string): SectionKey => {
	const minutes = toMinutes(hhmm)
	if (minutes < SECTION_META.afternoon.from) return 'morning'
	if (minutes < SECTION_META.evening.from) return 'afternoon'
	return 'evening'
}

/**
 * 30-minute select options inside a section window (end options include the window end). For an end list pass the
 * range's `start`: only times after it are offered, so an end can never be picked at or before its own start.
 */
export const timeOptions = (section: SectionKey, kind: 'start' | 'end', start?: string) => {
	const { from, to } = SECTION_META[section]
	const out: { value: string; label: string }[] = []
	const earliestEnd = kind === 'end' && start ? toMinutes(start) : from
	for (let m = from; m <= to; m += 30) {
		if (kind === 'start' && m >= to) break
		if (kind === 'end' && (m === from || m <= earliestEnd)) continue
		out.push({ value: toHHMM(m), label: formatTime(toHHMM(m)) })
	}
	if (kind === 'end' && to % 30 !== 0 && to > earliestEnd)
		out.push({ value: toHHMM(to), label: formatTime(toHHMM(to)) })
	return out
}

export const dayRanges = (day: DaySections): TimeRange[] => SECTION_KEYS.flatMap((k) => day[k])

export const isDayOn = (day: DaySections) => dayRanges(day).length > 0

/** "9 AM–12 PM, 2–5 PM" or "Unavailable". */
export const daySummary = (day: DaySections): string => {
	const ranges = dayRanges(day)
	return ranges.length ? ranges.map(formatRange).join(', ') : 'Unavailable'
}

const overlaps = (a: TimeRange, b: TimeRange) =>
	toMinutes(a.start) < toMinutes(b.end) && toMinutes(b.start) < toMinutes(a.end)

/**
 * Error for one range, or null. `others` are ranges at other places on the same day (doctor clinics),
 * each with the place's short name, to catch the doctor being booked in two places at once.
 */
export const rangeError = (
	day: DaySections,
	section: SectionKey,
	index: number,
	others: { place: string; range: TimeRange }[] = []
): string | null => {
	const r = day[section][index]
	const start = toMinutes(r.start)
	const end = toMinutes(r.end)
	if (end <= start) return 'End time must be after start time'
	const { from, to, label } = SECTION_META[section]
	if (start < from || end > to) return `${label} hours are ${formatTime(toHHMM(from))}–${formatTime(toHHMM(to))}`
	if (day[section].some((o, j) => j !== index && overlaps(r, o))) return 'Overlaps another time on this day'
	const clash = others.find((o) => overlaps(r, o.range))
	if (clash) return `Clashes with ${clash.place} ${formatRange(clash.range)}`
	return null
}

export const weekHasErrors = (
	week: WeekSections,
	othersForDay: (day: number) => { place: string; range: TimeRange }[] = () => []
) =>
	[0, 1, 2, 3, 4, 5, 6].some((d) =>
		SECTION_KEYS.some((k) => week[d][k].some((_, i) => rangeError(week[d], k, i, othersForDay(d)) !== null))
	)

/** Normalise any `{ morning, afternoon, evening }`-ish object from an API into DaySections. */
export const toDaySections = (raw: unknown): DaySections => {
	const src = (raw ?? {}) as Partial<Record<SectionKey, { start?: string; end?: string }[]>>
	const pick = (k: SectionKey) =>
		(Array.isArray(src[k]) ? src[k]! : [])
			.filter((r) => r?.start && r?.end)
			.map((r) => ({ start: String(r.start).slice(0, 5), end: String(r.end).slice(0, 5) }))
	return { morning: pick('morning'), afternoon: pick('afternoon'), evening: pick('evening') }
}

// ── Date overrides ─────────────────────────────────────────────────────────

export type DateOverride = {
	/** Backend ids of the rows making up this date (one per range; one row for a day off). */
	ids: number[]
	/** YYYY-MM-DD */
	date: string
	/** true = unavailable / on leave all day. */
	off: boolean
	ranges: TimeRange[]
	note?: string
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export const parseIsoDate = (iso: string) => {
	const [y, m, d] = iso.split('-').map(Number)
	return new Date(y, (m || 1) - 1, d || 1)
}

export const toIsoDate = (date: Date) =>
	`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

export const overrideTitle = (o: DateOverride) => {
	const d = parseIsoDate(o.date)
	return `${DAY_SHORT[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}${o.note ? ` · ${o.note}` : ''}`
}

export const overrideMonth = (o: DateOverride) => MONTHS[parseIsoDate(o.date).getMonth()].toUpperCase()

export const overrideDayNumber = (o: DateOverride) => String(parseIsoDate(o.date).getDate())

/** The next `count` days starting today, for the override date picker. */
export const upcomingDates = (count = 21): Date[] => {
	const today = new Date()
	return Array.from({ length: count }, (_, i) => new Date(today.getFullYear(), today.getMonth(), today.getDate() + i))
}
