// Converts between the Availability screen's model (WeekSections / DateOverride) and the doctor backend (ancillary providers keep
// no weekly hours; see TravelRadiusPage).
//
// Doctor (per hospital, per mode):
//   weekly  GET /doctors/hospitals -> availability[day][clinic|video] = { sections, slotDuration }
//           PATCH /doctors/availability { hospital_id, availability } (same shape; replaces the hospital's hours)
//   dates   GET /doctors/availability/overrides -> one row per blocked range
//           A day off is a single 00:00–23:59 block; "different hours" is stored as blocks covering the rest
//           of the day, so the doctor backend's block-only overrides still produce exactly those hours.

import {
	emptyWeek,
	sectionForStart,
	toDaySections,
	toHHMM,
	toMinutes,
	type DateOverride,
	type TimeRange,
	type WeekSections,
} from './availabilityUtils'

export type DoctorMode = 'clinic' | 'video'

const DAY_END = '23:59'

// ── Doctor weekly hours ────────────────────────────────────────────────────

export type DoctorHospitalAvailability = Record<
	string | number,
	Partial<Record<DoctorMode, { sections?: unknown; slotDuration?: number }>>
>

export const doctorAvailabilityToWeek = (
	availability: DoctorHospitalAvailability | null | undefined,
	mode: DoctorMode
): { week: WeekSections; slotDuration: number | null } => {
	const week = emptyWeek()
	let slotDuration: number | null = null
	for (let day = 0; day < 7; day++) {
		const entry = availability?.[day] ?? availability?.[String(day)]
		const modeEntry = entry?.[mode]
		if (!modeEntry) continue
		week[day] = toDaySections(modeEntry.sections)
		if (
			modeEntry.slotDuration &&
			(week[day].morning.length || week[day].afternoon.length || week[day].evening.length)
		) {
			slotDuration = modeEntry.slotDuration
		}
	}
	return { week, slotDuration }
}

export const weeksToDoctorAvailability = (
	weeks: Record<DoctorMode, WeekSections>,
	slotDurations: Record<DoctorMode, number>
) => {
	const out: Record<string, Record<DoctorMode, { sections: WeekSections[number]; slotDuration: number }>> = {}
	for (let day = 0; day < 7; day++) {
		out[String(day)] = {
			clinic: { sections: weeks.clinic[day], slotDuration: slotDurations.clinic },
			video: { sections: weeks.video[day], slotDuration: slotDurations.video },
		}
	}
	return out
}

// ── Doctor date overrides ──────────────────────────────────────────────────

export type DoctorOverrideRow = {
	id: number
	hospital_public_id?: string | null
	appointment_mode: string
	date: string
	start_time: string
	end_time: string
	is_blocked: boolean
	reason?: string | null
}

const apiMode = (mode: DoctorMode) => (mode === 'clinic' ? 'clinic_visit' : 'video_call')

/** Complement of `ranges` within the day (sorted, merged): what to block to leave only `ranges` open. */
export const blocksLeavingOpen = (ranges: TimeRange[]): TimeRange[] => {
	const sorted = [...ranges].sort((a, b) => toMinutes(a.start) - toMinutes(b.start))
	const blocks: TimeRange[] = []
	let cursor = 0
	for (const r of sorted) {
		const s = toMinutes(r.start)
		if (s > cursor) blocks.push({ start: toHHMM(cursor), end: r.start })
		cursor = Math.max(cursor, toMinutes(r.end))
	}
	if (cursor < toMinutes(DAY_END)) blocks.push({ start: toHHMM(cursor), end: DAY_END })
	return blocks
}

const openFromBlocks = (blocks: TimeRange[]): TimeRange[] => {
	const sorted = [...blocks].sort((a, b) => toMinutes(a.start) - toMinutes(b.start))
	const open: TimeRange[] = []
	let cursor = 0
	for (const b of sorted) {
		const s = toMinutes(b.start)
		if (s > cursor) open.push({ start: toHHMM(cursor), end: b.start })
		cursor = Math.max(cursor, toMinutes(b.end))
	}
	if (cursor < toMinutes(DAY_END)) open.push({ start: toHHMM(cursor), end: DAY_END })
	return open
}

export const groupDoctorOverrides = (
	rows: DoctorOverrideRow[],
	hospitalPublicId: string,
	mode: DoctorMode
): DateOverride[] => {
	const byDate = new Map<string, DoctorOverrideRow[]>()
	for (const r of rows) {
		if (!r.is_blocked || r.hospital_public_id !== hospitalPublicId || r.appointment_mode !== apiMode(mode)) continue
		byDate.set(r.date, [...(byDate.get(r.date) ?? []), r])
	}
	return [...byDate.entries()]
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([date, list]) => {
			const blocks = list.map((r) => ({ start: r.start_time.slice(0, 5), end: r.end_time.slice(0, 5) }))
			const open = openFromBlocks(blocks)
			return {
				ids: list.map((r) => r.id),
				date,
				off: open.length === 0,
				ranges: open,
				note: list.find((r) => r.reason)?.reason ?? undefined,
			}
		})
}

export const doctorOverridePayload = (
	hospitalPublicId: string,
	mode: DoctorMode,
	override: Pick<DateOverride, 'date' | 'off' | 'ranges'>
) => ({
	hospital_id: hospitalPublicId,
	appointment_mode: apiMode(mode),
	date: override.date,
	slots: (override.off ? [{ start: '00:00', end: DAY_END }] : blocksLeavingOpen(override.ranges)).map((b) => ({
		start_time: b.start,
		end_time: b.end,
		is_blocked: true,
	})),
})

/** Re-exported for screens that group ranges back into sections. */
export { sectionForStart }
