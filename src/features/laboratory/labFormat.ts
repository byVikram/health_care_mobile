// src/features/laboratory/labFormat.ts
//
// Small formatting helpers shared by the Lab Tests Ordering screens (₹ amounts, plurals and the
// "Thu 24 Sep" style date labels the design uses).

export const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`

export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTH_LONG = [
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

const pad = (n: number) => String(n).padStart(2, '0')

/** 'YYYY-MM-DD' for a local date. */
export const toIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

const fromIso = (iso: string) => {
	const [y, m, d] = iso.split('-').map(Number)
	return new Date(y, (m ?? 1) - 1, d ?? 1)
}

export const addDays = (d: Date, days: number) => {
	const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + days)
	return next
}

export const todayIso = () => toIso(new Date())

/** "24 Sep" */
export const shortDate = (iso: string) => {
	const d = fromIso(iso)
	return `${d.getDate()} ${MON[d.getMonth()]}`
}

/** "Thu 24 Sep" */
export const longDate = (iso: string) => {
	const d = fromIso(iso)
	return `${DOW[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`
}

/** "Thu, 24 Sep" (the Review / Payment / Success cards). */
export const commaDate = (iso: string) => {
	const d = fromIso(iso)
	return `${DOW[d.getDay()]}, ${d.getDate()} ${MON[d.getMonth()]}`
}

export const monthTitle = (year: number, month: number) => `${MONTH_LONG[month]} ${year}`

export const dowShort = (iso: string) => DOW[fromIso(iso).getDay()]
export const monShort = (iso: string) => MON[fromIso(iso).getMonth()]
export const dayNum = (iso: string) => fromIso(iso).getDate()

/** Start of a display label ("7:30 AM", "11 AM") on `iso` as a local Date. */
export function slotStart(iso: string, label: string): Date {
	const [y, m, d] = iso.split('-').map(Number)
	const match = label.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i)
	const period = (match?.[3] ?? label.match(/AM|PM/i)?.[0] ?? 'AM').toUpperCase()
	let hour = Number(match?.[1] ?? 8)
	const minute = Number(match?.[2] ?? 0)
	if (period === 'PM' && hour < 12) hour += 12
	if (period === 'AM' && hour === 12) hour = 0
	return new Date(y, (m ?? 1) - 1, d ?? 1, hour, minute)
}

/** A slot ('HH:MM', 24-hour, as the API sends it) on `iso` as a local Date. */
export function slotAt(iso: string, hhmm: string): Date {
	const [y, m, d] = iso.split('-').map(Number)
	const [h, min] = hhmm.split(':').map(Number)
	return new Date(y, (m ?? 1) - 1, d ?? 1, h ?? 0, min ?? 0)
}

/** "07:30" -> "7:30 AM", "14:00" -> "2:00 PM" */
export function timeLabel(hhmm: string): string {
	const [h, min] = hhmm.split(':').map(Number)
	const hour12 = h % 12 === 0 ? 12 : h % 12
	return `${hour12}:${pad(min ?? 0)} ${h >= 12 ? 'PM' : 'AM'}`
}
