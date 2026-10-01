// Converts between the Availability screen's model (WeekSections / DateOverride) and the two backends.
//
// Doctor (per hospital, per mode):
//   weekly  GET /doctors/hospitals -> availability[day][clinic|video] = { sections, slotDuration }
//           PATCH /doctors/availability { hospital_id, availability } (same shape; replaces the hospital's hours)
//   dates   GET /doctors/availability/overrides -> one row per blocked range
//           A day off is a single 00:00–23:59 block; "different hours" is stored as blocks covering the rest
//           of the day, so the doctor backend's block-only overrides still produce exactly those hours.
// Ancillary:
//   weekly  GET/PUT /ancillary/provider/me/availability -> schedules[] { day_of_week, sections, slot_duration_mins }
//   dates   GET /ancillary/provider/me/availability/overrides -> rows { is_available, start_time?, end_time? }
//           A day off is one row with is_available=false and no times; different hours are available rows.

import {
	cloneWeek,
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

// ── Ancillary weekly hours ─────────────────────────────────────────────────

export type AncillaryScheduleRow = {
	day_of_week: number | string
	sections?: unknown
	slot_duration_mins?: number
	is_active?: boolean
}

const DAY_NAME_TO_INDEX: Record<string, number> = {
	SUNDAY: 0,
	MONDAY: 1,
	TUESDAY: 2,
	WEDNESDAY: 3,
	THURSDAY: 4,
	FRIDAY: 5,
	SATURDAY: 6,
}

export const ancillaryScheduleToWeek = (
	rows: AncillaryScheduleRow[]
): { week: WeekSections; slotDuration: number | null } => {
	const week = emptyWeek()
	let slotDuration: number | null = null
	for (const row of rows) {
		const day =
			typeof row.day_of_week === 'number'
				? row.day_of_week
				: DAY_NAME_TO_INDEX[String(row.day_of_week).toUpperCase()]
		if (day == null || row.is_active === false) continue
		week[day] = toDaySections(row.sections)
		if (row.slot_duration_mins) slotDuration = row.slot_duration_mins
	}
	return { week, slotDuration }
}

export const weekToAncillarySchedules = (week: WeekSections, slotDurationMins: number) =>
	[0, 1, 2, 3, 4, 5, 6].map((day) => ({
		day_of_week: day,
		sections: cloneWeek(week)[day],
		slot_duration_mins: slotDurationMins,
		is_active: true,
	}))

// ── Ancillary date overrides ───────────────────────────────────────────────

export type AncillaryOverrideRow = {
	override_id: number
	override_date: string
	is_available: boolean
	start_time?: string | null
	end_time?: string | null
	reason?: string | null
}

export const groupAncillaryOverrides = (rows: AncillaryOverrideRow[]): DateOverride[] => {
	const byDate = new Map<string, AncillaryOverrideRow[]>()
	for (const r of rows) byDate.set(r.override_date, [...(byDate.get(r.override_date) ?? []), r])
	return [...byDate.entries()]
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([date, list]) => {
			const off = list.some((r) => !r.is_available && !r.start_time)
			const ranges = list
				.filter((r) => r.is_available && r.start_time && r.end_time)
				.map((r) => ({ start: String(r.start_time).slice(0, 5), end: String(r.end_time).slice(0, 5) }))
				.sort((a, b) => toMinutes(a.start) - toMinutes(b.start))
			return {
				ids: list.map((r) => r.override_id),
				date,
				off: off || ranges.length === 0,
				ranges: off ? [] : ranges,
				note: list.find((r) => r.reason)?.reason ?? undefined,
			}
		})
}

export const ancillaryOverrideBodies = (override: Pick<DateOverride, 'date' | 'off' | 'ranges' | 'note'>) =>
	override.off
		? [{ override_date: override.date, is_available: false, reason: override.note || undefined }]
		: override.ranges.map((r) => ({
				override_date: override.date,
				is_available: true,
				start_time: r.start,
				end_time: r.end,
				reason: override.note || undefined,
			}))

/** Re-exported for screens that group ranges back into sections. */
export { sectionForStart }
