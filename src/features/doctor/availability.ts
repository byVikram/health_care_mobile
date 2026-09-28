// Shared normalisation of the /api/doctors/availability response.
// Extracted verbatim from DoctorDetailPage so the Doctor profile ("next
// available") and the Clinic & slot step read slots the same way.
import type { SlotGroup } from './doctorService'

// Generic date / slot helpers now live in src/utils; re-exported here so
// existing importers (e.g. BookSlotPage) keep compiling unchanged.
export {
	DOW_KEYS,
	DOW_LABELS,
	MONTH_LONG,
	MONTH_SHORT,
	fullDayLabel,
	isClosedDay,
	isSameDay,
	nextSevenDays,
	relativeDayLabel,
	startOfDay,
} from '../../utils/date'
export { firstOpenSlot, isSlotBooked, isSlotSelectable } from '../../utils/slots'

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
