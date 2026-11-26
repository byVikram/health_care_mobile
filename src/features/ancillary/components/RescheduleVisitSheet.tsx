// src/features/ancillary/components/RescheduleVisitSheet.tsx
//
// "Reschedule visit N" (design: Later · 3 · Booking details), built on the shared AppRescheduleSheet like the
// appointment reschedule: the current slot, a 14-day DateStrip (days that already have another visit of this booking
// are greyed with a dot), the hourly slots, a note that only this visit moves and a "Move to <day>, <time>" button
// that stays grey until something new is picked. The caller runs the reschedule (`onConfirm` gets date + "HH:MM" and returns how it
// went: the shared sheet shows the spinner, the inline error and the "Visit rescheduled" toast; `onDone` runs once it went through).

import React, { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { APP_COLORS } from '../../../config/theme'
import {
	AppRescheduleGroup,
	AppRescheduleSheet,
	DateStrip,
	SlotChipGrid,
	type AppRescheduleResult,
} from '../../../components/common'
import { formatDateForApi, fullDayLabel, monthRangeLabel, parseDateOnly } from '../../../utils/date'
import { ANCILLARY_BOOKING_WINDOW_DAYS } from '../ancillaryProviderBookingService'
import { leadText, timeLabel } from '../patient/ancillaryBookingCopy'
import { useNow } from '../hooks/useNow'
import { LAST_SLOT_MINUTES, buildSlotGroups, istDays, minutesOf, secondsNowIst, slotTooSoon } from '../utils/visitSlots'

export type RescheduleVisitSheetProps = {
	visible: boolean
	/** "Reschedule visit 2". */
	title: string
	/** The slot the visit has now. */
	currentDate: string
	currentTime: string
	/** Days (YYYY-MM-DD) taken by the booking's other visits. */
	takenDates: string[]
	/** The provider is assigned this long before a visit, so a new slot must be further than that from now. */
	leadMinutes: number
	/** "nurse" / "physiotherapist" ... for the note. */
	noun: string
	onClose: () => void
	/** Moves the visit and returns how it went. */
	onConfirm: (date: string, startTime: string) => Promise<AppRescheduleResult>
	/** The visit was moved (the toast is up). */
	onDone: () => void
}

export function RescheduleVisitSheet({
	visible,
	title,
	currentDate,
	currentTime,
	takenDates,
	leadMinutes,
	noun,
	onClose,
	onConfirm,
	onDone,
}: RescheduleVisitSheetProps) {
	// Mumbai's clock (not the phone's), re-read every 15 seconds.
	const nowSec = secondsNowIst(useNow(15_000))
	const days = istDays(ANCILLARY_BOOKING_WINDOW_DAYS)
	const todayIso = formatDateForApi(days[0])
	const [date, setDate] = useState<string>(currentDate)
	const [time, setTime] = useState<string | null>(currentTime)

	useEffect(() => {
		if (!visible) return
		setDate(currentDate)
		setTime(currentTime)
		// Only on open: the order refreshes while the page polls and must not reset what the patient picked.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [visible])

	/** A new start must be at least the assignment lead (1 hour) from now, on Mumbai's clock: the server's rule. */
	const slotOk = (iso: string, startMinutes: number) =>
		!(iso === todayIso && slotTooSoon(startMinutes, nowSec, leadMinutes))
	const dayOff = (iso: string) => takenDates.includes(iso) || !slotOk(iso, LAST_SLOT_MINUTES)

	const timeOk = time !== null && slotOk(date, minutesOf(time))
	const same = date === currentDate && time === currentTime
	const ready = timeOk && !same
	const pickedDay = parseDateOnly(date)

	const confirmLabel = ready
		? `Move to ${date === todayIso || !pickedDay ? 'today' : fullDayLabel(pickedDay, { markToday: false })}, ${timeLabel(time as string)}`
		: same
			? 'Pick a new day or time'
			: 'Pick a time'

	return (
		<AppRescheduleSheet
			visible={visible}
			title={title}
			currentLabel={`${fullDayLabel(parseDateOnly(currentDate) ?? new Date())}, ${timeLabel(currentTime)}`}
			monthLabel={monthRangeLabel(days)}
			dateSection={
				<>
					<DateStrip
						variant="grid"
						density="compact"
						columns={7}
						dayCount={ANCILLARY_BOOKING_WINDOW_DAYS}
						startIso={todayIso}
						selectedDate={pickedDay ?? undefined}
						isDateDisabled={(d) => dayOff(formatDateForApi(d))}
						markedDates={takenDates}
						onSelectDate={(d) => {
							const iso = formatDateForApi(d)
							setDate(iso)
							if (time !== null && !slotOk(iso, minutesOf(time))) setTime(null)
						}}
					/>
					<View style={styles.legend}>
						<View style={styles.legendDot} />
						<Text style={styles.legendText}>Your other visits</Text>
					</View>
				</>
			}
			note={`Only this visit moves — your other visits stay as booked. Free to change until its ${noun} is assigned, ${leadText(leadMinutes)} before.`}
			confirmLabel={confirmLabel}
			confirmDisabled={!ready}
			onConfirm={async () =>
				ready ? onConfirm(date, time as string) : { ok: false, error: 'Pick a new time first.' }
			}
			successTitle="Visit rescheduled"
			onDone={onDone}
			onClose={onClose}
		>
			{buildSlotGroups((m) => slotOk(date, m)).map((g) => (
				<AppRescheduleGroup key={g.label} label={g.label}>
					<SlotChipGrid
						columns={4}
						density="tight"
						slots={g.slots}
						selectedValue={timeOk ? time : null}
						onSelectValue={setTime}
					/>
				</AppRescheduleGroup>
			))}
		</AppRescheduleSheet>
	)
}

const styles = StyleSheet.create({
	legend: { flexDirection: 'row', alignItems: 'center', gap: 6 },
	legendDot: { width: 6, height: 6, borderRadius: 9999, backgroundColor: APP_COLORS.inkDisabled },
	legendText: { fontSize: 11, lineHeight: 14, color: APP_COLORS.inkMuted },
})
