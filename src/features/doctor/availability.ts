// Shared normalisation of the /api/doctors/availability response.
// Extracted verbatim from DoctorDetailPage so the Doctor profile ("next
// available") and the Clinic & slot step read slots the same way.
import type { SlotGroup, TimeSlot } from './doctorService'

export type AppointmentModeKey = 'clinic' | 'video'

type AvailabilityAppointmentMode = 'clinic_visit' | 'video_call' | 'offline' | 'online'

interface AvailabilityApiSlot {
	start_time: string
	end_time: string
	status?: 'AVAILABLE' | 'BOOKED' | 'UNAVAILABLE' | 'BLOCKED' | 'OCCUPIED' | ''
	is_enabled?: boolean
	is_booked?: boolean
	can_toggle?: boolean
}

interface AvailabilityApiSession {
	label?: string
	range?: string
	period?: string
	slots?: AvailabilityApiSlot[]
}

interface AvailabilityApiModeGroup {
	appointment_mode?: AvailabilityAppointmentMode
	sessions?: AvailabilityApiSession[]
	label?: string
	period?: string
	range?: string
	slots?: AvailabilityApiSlot[]
}

export const emptyAvailabilityByMode: Record<AppointmentModeKey, SlotGroup[]> = {
	clinic: [],
	video: [],
}

const getModeKey = (mode?: string): AppointmentModeKey => {
	if (mode === 'video_call' || mode === 'online' || mode === 'video') {
		return 'video'
	}
	return 'clinic'
}

const normalizeSlotStatus = (slot: AvailabilityApiSlot) => {
	if (slot.is_booked) return 'BOOKED'
	if (slot.is_enabled === false) return 'UNAVAILABLE'
	if (slot.status === 'OCCUPIED') return 'BOOKED'
	return slot.status || 'AVAILABLE'
}

export const normalizeAvailabilityByMode = (response: unknown): Record<AppointmentModeKey, SlotGroup[]> => {
	const rawData = Array.isArray(response)
		? response
		: Array.isArray((response as { data?: unknown })?.data)
			? (response as { data: AvailabilityApiModeGroup[] }).data
			: []

	const grouped: Record<AppointmentModeKey, SlotGroup[]> = {
		clinic: [],
		video: [],
	}

	rawData.forEach((item: AvailabilityApiModeGroup) => {
		const modeKey = getModeKey(item.appointment_mode)
		const sessions =
			Array.isArray(item.sessions) && item.sessions.length > 0
				? item.sessions
				: [{ label: item.label, range: item.range, period: item.period, slots: item.slots }]

		const normalizedSessions = sessions
			.map((session, sessionIndex): SlotGroup => {
				const range = session.range || session.period || ''
				const label = session.label || `Session ${sessionIndex + 1}`

				return {
					label: range ? `${label} (${range})` : label,
					period: range,
					slots: (session.slots || []).map((slot, slotIndex) => ({
						id: `${modeKey}-${label}-${slot.start_time}-${slotIndex}`,
						start_time: slot.start_time,
						end_time: slot.end_time,
						status: normalizeSlotStatus(slot),
						is_enabled: slot.is_enabled,
						can_toggle: slot.can_toggle,
					})),
				}
			})
			.filter((session) => session.slots.length > 0)

		grouped[modeKey] = [...grouped[modeKey], ...normalizedSessions]
	})

	return grouped
}

export const isSlotBooked = (slot: TimeSlot) =>
	!!slot.is_booked || slot.status === 'BOOKED' || slot.status === 'OCCUPIED'

export const isSlotSelectable = (slot: TimeSlot) =>
	!isSlotBooked(slot) && slot.status !== 'BLOCKED' && slot.status !== 'UNAVAILABLE'

/** First selectable slot across all groups, or null. */
export const firstOpenSlot = (groups: SlotGroup[]): TimeSlot | null => {
	for (const g of groups) {
		const s = g.slots.find(isSlotSelectable)
		if (s) return s
	}
	return null
}

// ---- Date helpers for the 7-day strip ----

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

export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())

export const isSameDay = (a: Date, b: Date) =>
	a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

export const nextSevenDays = (): Date[] => {
	const today = startOfDay(new Date())
	return Array.from({ length: 7 }, (_, i) => {
		const d = new Date(today)
		d.setDate(today.getDate() + i)
		return d
	})
}

/** "Today" / "Tomorrow" / "Fri 26 Sep" */
export const relativeDayLabel = (d: Date) => {
	const today = startOfDay(new Date())
	const diff = Math.round((startOfDay(d).getTime() - today.getTime()) / 86400000)
	if (diff === 0) return 'Today'
	if (diff === 1) return 'Tomorrow'
	return `${DOW_LABELS[d.getDay()]} ${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`
}

/** "Today, Thu 24 Sep" / "Fri 25 Sep" */
export const fullDayLabel = (d: Date) => {
	const base = `${DOW_LABELS[d.getDay()]} ${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`
	return isSameDay(d, new Date()) ? `Today, ${base}` : base
}

/** Is the hospital closed on this weekday? Unknown available_days = never closed. */
export const isClosedDay = (d: Date, availableDays?: string[]) =>
	Array.isArray(availableDays) && availableDays.length > 0 && !availableDays.includes(DOW_KEYS[d.getDay()])
