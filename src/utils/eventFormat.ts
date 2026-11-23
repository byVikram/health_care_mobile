// src/utils/eventFormat.ts
//
// Date / time wording for events. The API sends the clinic's wall-clock day (`YYYY-MM-DD`) and times (`HH:MM:SS`),
// so they are parsed by hand into a local Date instead of through `new Date('YYYY-MM-DD')` (which reads UTC and can
// show the wrong day).

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTHS_LONG = [
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
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/** Local Date for an event day plus an optional `HH:MM[:SS]` time; null when the day is not valid. */
export function parseEventDate(date?: string | null, time?: string | null): Date | null {
	const d = /^(\d{4})-(\d{2})-(\d{2})/.exec(date ?? '')
	if (!d) return null
	const t = /^(\d{1,2}):(\d{2})/.exec(time ?? '')
	const result = new Date(Number(d[1]), Number(d[2]) - 1, Number(d[3]), t ? Number(t[1]) : 0, t ? Number(t[2]) : 0)
	return Number.isNaN(result.getTime()) ? null : result
}

const clock = (d: Date) => {
	const h = d.getHours()
	return { text: `${h % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')}`, meridiem: h >= 12 ? 'PM' : 'AM' }
}

/** "9:00 AM – 1:00 PM"; "6:00 – 7:00 PM" when both ends share AM/PM. */
export function formatTimeRange(date: string, start: string, end: string): string {
	const s = parseEventDate(date, start)
	const e = parseEventDate(date, end)
	if (!s) return ''
	const a = clock(s)
	if (!e) return `${a.text} ${a.meridiem}`
	const b = clock(e)
	return a.meridiem === b.meridiem
		? `${a.text} – ${b.text} ${b.meridiem}`
		: `${a.text} ${a.meridiem} – ${b.text} ${b.meridiem}`
}

/** Pieces for the date tile and meta lines: { mon: 'NOV', day: '22', dow: 'Sat', short: 'Sat, 22 Nov' }. */
export function eventDateParts(date: string) {
	const d = parseEventDate(date)
	if (!d) return { mon: '', day: '', dow: '', short: '', long: '' }
	return {
		mon: MONTHS[d.getMonth()].toUpperCase(),
		day: String(d.getDate()),
		dow: DAYS[d.getDay()],
		short: `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`,
		long: `${DAYS_LONG[d.getDay()]}, ${d.getDate()} ${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`,
	}
}

export const isOnlineEvent = (e: { location_type?: string | null }) => e.location_type === 'online'
