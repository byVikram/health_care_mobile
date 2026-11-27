// src/features/appointment/components/patient-details/availabilitySlots.ts
//
// Turns the doctor availability answer (getDoctorAvailability: groups per visit mode, each with sessions and slots, or already
// grouped) into the slot groups the reschedule sheet shows for one visit mode. Pure: nothing here touches React or the network.

import type { SlotGroup, TimeSlot } from '../../../doctor/doctorService'

export type RescheduleAppointmentMode = 'clinic' | 'video'

type AvailabilityApiSlot = {
	start_time?: string
	end_time?: string
	status?: TimeSlot['status'] | string
	is_enabled?: boolean
	is_booked?: boolean
	can_toggle?: boolean
}

type AvailabilityApiSession = {
	label?: string
	range?: string
	period?: string
	slots?: AvailabilityApiSlot[]
}

type AvailabilityApiModeGroup = {
	appointment_mode?: string
	sessions?: AvailabilityApiSession[]
	label?: string
	range?: string
	period?: string
	slots?: AvailabilityApiSlot[]
}

const getRescheduleModeKey = (appointmentType: RescheduleAppointmentMode) =>
	appointmentType === 'video' ? 'video_call' : 'clinic_visit'

const getSlotStatus = (slot: AvailabilityApiSlot): TimeSlot['status'] => {
	const status = typeof slot.status === 'string' ? slot.status.toUpperCase() : ''

	if (slot.is_booked || status === 'OCCUPIED') return 'OCCUPIED'
	if (slot.is_enabled === false || status === 'UNAVAILABLE') return 'UNAVAILABLE'
	if (status === 'BLOCKED') return 'BLOCKED'
	if (status === 'BOOKED') return 'BOOKED'
	return 'AVAILABLE'
}

export const normalizeAvailabilitySlots = (
	response: SlotGroup[] | { data?: AvailabilityApiModeGroup[] } | null | undefined,
	appointmentType: RescheduleAppointmentMode
): SlotGroup[] => {
	const rawData = (
		Array.isArray(response) ? response : Array.isArray(response?.data) ? response.data : []
	) as AvailabilityApiModeGroup[]
	const modeKey = getRescheduleModeKey(appointmentType)

	return rawData
		.filter((item) => !item.appointment_mode || item.appointment_mode.toLowerCase() === modeKey)
		.flatMap((item, itemIndex) => {
			const sessions =
				Array.isArray(item.sessions) && item.sessions.length > 0
					? item.sessions
					: [{ label: item.label, range: item.range, period: item.period, slots: item.slots }]

			return sessions
				.map((session, sessionIndex): SlotGroup => {
					const label = session.label || `Session ${sessionIndex + 1}`

					return {
						label,
						range: session.range,
						period: session.period || session.range,
						slots: (session.slots ?? [])
							.filter((slot) => Boolean(slot.start_time && slot.end_time))
							.map(
								(slot, slotIndex): TimeSlot => ({
									id: `${modeKey}-${itemIndex}-${label}-${slot.start_time}-${slotIndex}`,
									start_time: slot.start_time as string,
									end_time: slot.end_time as string,
									status: getSlotStatus(slot),
									is_enabled: slot.is_enabled,
									is_booked: slot.is_booked,
									can_toggle: slot.is_enabled === false ? false : slot.can_toggle,
								})
							),
					}
				})
				.filter((session) => session.slots.length > 0)
		})
}
