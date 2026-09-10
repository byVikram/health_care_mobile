import React, { useCallback, useMemo, useState } from 'react'
import { StyleSheet, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { AppSelect, AppTypography } from '../../../components/common'

export interface RecurringVisitSchedule {
	/** ISO date keys, e.g. '2026-08-14' */
	dates: string[]
	sameTimeForAll: boolean
	sharedTime: string
	/** Per-date override times, keyed by ISO date. Only used when sameTimeForAll is false. */
	perDateTimes: Record<string, string>
}

const pad2 = (value: number) => String(value).padStart(2, '0')

// ── TEMPORARY MOCK DATA -- NOT A REAL BUSINESS RULE ────────────────────
// There is currently no backend availability API, configured appointment
// duration, or slot interval for *ancillary recurring visits* anywhere in
// the project:
//   - `ancillaryService.ts` / `API_ENDPOINTS.ANCILLARY` expose no
//     slots/availability endpoint.
//   - The only "working hours" concept in the codebase (`WorkingHoursSection`,
//     `SECTION_META`, `createWorkingHoursState` in
//     `src/components/common/WorkingHoursSection.tsx`) belongs to a
//     different feature entirely: an individual nurse/doctor's own
//     optional profile settings, saved locally per-provider. It is never
//     read by the patient-facing booking flow, isn't tied to any specific
//     service or date, and a nurse isn't even assigned until after a
//     recurring visit is booked -- so it is intentionally NOT reused here;
//     doing so would fabricate a link between one provider's personal
//     settings and every patient's booking options.
// The constants below are therefore an arbitrary, clearly-labeled UI
// placeholder ONLY, picked purely to make the time-slot picker usable
// during development. They do not represent real clinic hours, nurse
// availability, or any approved business rule.
// TODO(backend): once an ancillary/recurring-visit availability endpoint
// exists, delete `MOCK_TIME_SLOT_OPTIONS` and have callers pass real slots
// (optionally per-date) via the `availableTimeSlots` prop instead.
const MOCK_SLOT_WINDOW = { startHour: 8, endHour: 18, stepMinutes: 30 } as const

/** Formats one generated slot as a zero-padded 12-hour label, e.g. '09:00 AM'. */
function formatTimeSlotLabel(totalMinutes: number): string {
	const hour24 = Math.floor(totalMinutes / 60)
	const minute = totalMinutes % 60
	const period = hour24 >= 12 ? 'PM' : 'AM'
	const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12
	return `${pad2(hour12)}:${pad2(minute)} ${period}`
}

function generateMockTimeSlots({ startHour, endHour, stepMinutes }: typeof MOCK_SLOT_WINDOW): string[] {
	const slots: string[] = []
	for (let minutes = startHour * 60; minutes <= endHour * 60; minutes += stepMinutes) {
		slots.push(formatTimeSlotLabel(minutes))
	}
	return slots
}

/**
 * Placeholder/mock time-slot list used only when a caller doesn't supply
 * `availableTimeSlots`. See the block comment above -- this is temporary UI
 * data, not sourced from any real availability rule, and must be replaced
 * once ancillary recurring-visit availability exists on the backend.
 */
export const MOCK_TIME_SLOT_OPTIONS: string[] = generateMockTimeSlots(MOCK_SLOT_WINDOW)

export const createDefaultRecurringSchedule = (): RecurringVisitSchedule => ({
	dates: [],
	sameTimeForAll: true,
	sharedTime: '09:00 AM',
	perDateTimes: {},
})

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WEEKDAY_SHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const WEEKDAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const toDateKey = (date: Date) => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`

/** Turns a flat list of time-slot strings into AppSelect's {label, value} shape. */
const toSelectOptions = (slots: string[]) => slots.map((slot) => ({ label: slot, value: slot }))

interface CalendarCell {
	key: string
	day: number | null
	dateKey?: string
}

function buildCalendarCells(visibleMonth: Date): CalendarCell[] {
	const year = visibleMonth.getFullYear()
	const month = visibleMonth.getMonth()
	const firstWeekday = new Date(year, month, 1).getDay()
	const daysInMonth = new Date(year, month + 1, 0).getDate()

	const cells: CalendarCell[] = []
	for (let i = 0; i < firstWeekday; i++) {
		cells.push({ key: `pad-start-${i}`, day: null })
	}
	for (let day = 1; day <= daysInMonth; day++) {
		const date = new Date(year, month, day)
		cells.push({ key: `day-${day}`, day, dateKey: toDateKey(date) })
	}
	while (cells.length % 7 !== 0) {
		cells.push({ key: `pad-end-${cells.length}`, day: null })
	}
	return cells
}

function formatSelectedDateLabel(dateKey: string) {
	const [year, month, day] = dateKey.split('-').map(Number)
	const date = new Date(year, month - 1, day)
	return `${WEEKDAY_ABBR[date.getDay()]}, ${MONTH_NAMES[month - 1]} ${day}`
}

/**
 * Source of bookable time slots -- the single source of truth this
 * component renders from. Pass a plain array when availability is the same
 * for every date, or a function of the ISO date key (e.g. '2026-08-14')
 * when availability should vary by date, once a real backend availability
 * API is wired in for ancillary recurring visits.
 */
export type AvailableTimeSlotsSource = string[] | ((dateKey: string) => string[])

export interface RecurringVisitCalendarProps {
	schedule: RecurringVisitSchedule
	onChange: (next: RecurringVisitSchedule) => void
	/**
	 * Available time slots to offer for booking. Defaults to
	 * `MOCK_TIME_SLOT_OPTIONS` -- temporary placeholder UI data, not a real
	 * availability rule (see the comment above that constant). Pass real
	 * slots from a backend availability response here (a flat list, or a
	 * `(dateKey) => string[]` lookup for date-specific availability) as
	 * soon as that endpoint exists; no other change to this component
	 * should be required.
	 */
	availableTimeSlots?: AvailableTimeSlotsSource
}

export default function RecurringVisitCalendar({
	schedule,
	onChange,
	availableTimeSlots = MOCK_TIME_SLOT_OPTIONS,
}: RecurringVisitCalendarProps) {
	const [visibleMonth, setVisibleMonth] = useState<Date>(() => {
		const now = new Date()
		return new Date(now.getFullYear(), now.getMonth(), 1)
	})

	const calendarCells = useMemo(() => buildCalendarCells(visibleMonth), [visibleMonth])
	const sortedDates = useMemo(() => [...schedule.dates].sort(), [schedule.dates])

	// Single availability source shared by both the "same time for all
	// dates" selector and the per-date selector below, so the two never
	// drift out of sync.
	const resolveSlotsForDate = useCallback(
		(dateKey: string): string[] =>
			typeof availableTimeSlots === 'function' ? availableTimeSlots(dateKey) : availableTimeSlots,
		[availableTimeSlots]
	)

	// The shared selector isn't bound to one specific date, so it resolves
	// against the earliest selected date (falling back to today) when
	// availability is date-dependent.
	const sharedSlots = useMemo(
		() => resolveSlotsForDate(sortedDates[0] ?? toDateKey(new Date())),
		[resolveSlotsForDate, sortedDates]
	)
	const sharedSlotOptions = useMemo(() => toSelectOptions(sharedSlots), [sharedSlots])

	const goToPreviousMonth = () => {
		setVisibleMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
	}

	const goToNextMonth = () => {
		setVisibleMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
	}

	const toggleDate = (dateKey: string) => {
		const isSelected = schedule.dates.includes(dateKey)
		const nextDates = isSelected ? schedule.dates.filter((d) => d !== dateKey) : [...schedule.dates, dateKey]
		const nextPerDateTimes = { ...schedule.perDateTimes }
		if (isSelected) {
			delete nextPerDateTimes[dateKey]
		} else if (!nextPerDateTimes[dateKey]) {
			nextPerDateTimes[dateKey] = schedule.sharedTime
		}
		onChange({ ...schedule, dates: nextDates, perDateTimes: nextPerDateTimes })
	}

	const setSharedTime = (time: string) => {
		const nextPerDateTimes = schedule.sameTimeForAll
			? schedule.dates.reduce<Record<string, string>>((acc, d) => ({ ...acc, [d]: time }), {})
			: schedule.perDateTimes
		onChange({ ...schedule, sharedTime: time, perDateTimes: nextPerDateTimes })
	}

	const setSameTimeForAll = (value: boolean) => {
		const nextPerDateTimes = value
			? schedule.dates.reduce<Record<string, string>>((acc, d) => ({ ...acc, [d]: schedule.sharedTime }), {})
			: schedule.perDateTimes
		onChange({ ...schedule, sameTimeForAll: value, perDateTimes: nextPerDateTimes })
	}

	const setDateTime = (dateKey: string, time: string) => {
		onChange({ ...schedule, perDateTimes: { ...schedule.perDateTimes, [dateKey]: time } })
	}

	const dateCount = schedule.dates.length

	return (
		<View style={styles.container}>
			{/* CALENDAR CARD */}
			<View style={styles.card}>
				<View style={styles.calendarHeaderRow}>
					<View style={{ flex: 1 }}>
						<AppTypography variant="caption" style={styles.cardLabel}>
							SELECT VISIT DATES
						</AppTypography>
						<AppTypography variant="caption" style={styles.dateCountText}>
							{dateCount === 0
								? 'No dates selected yet'
								: `${dateCount} ${dateCount === 1 ? 'date' : 'dates'} selected in ${MONTH_NAMES[visibleMonth.getMonth()]}`}
						</AppTypography>
					</View>
					<View style={styles.monthNavRow}>
						<TouchableOpacity onPress={goToPreviousMonth} style={styles.monthNavBtn} hitSlop={8}>
							<Ionicons name="chevron-back" size={16} color="#546E7A" />
						</TouchableOpacity>
						<AppTypography variant="caption" style={styles.monthLabel}>
							{MONTH_NAMES[visibleMonth.getMonth()]} {visibleMonth.getFullYear()}
						</AppTypography>
						<TouchableOpacity onPress={goToNextMonth} style={styles.monthNavBtn} hitSlop={8}>
							<Ionicons name="chevron-forward" size={16} color="#546E7A" />
						</TouchableOpacity>
					</View>
				</View>

				<View style={styles.weekdayRow}>
					{WEEKDAY_SHORT.map((label, i) => (
						<AppTypography key={`${label}-${i}`} variant="caption" style={styles.weekdayLabel}>
							{label}
						</AppTypography>
					))}
				</View>

				<View style={styles.calendarGrid}>
					{calendarCells.map((cell) => {
						if (cell.day == null || !cell.dateKey) {
							return <View key={cell.key} style={styles.dayCell} />
						}
						const isSelected = schedule.dates.includes(cell.dateKey)
						return (
							<TouchableOpacity
								key={cell.key}
								style={[styles.dayCell, styles.dayCellTouchable, isSelected && styles.dayCellSelected]}
								onPress={() => toggleDate(cell.dateKey as string)}
								activeOpacity={0.7}
							>
								<AppTypography
									variant="caption"
									style={[styles.dayCellText, isSelected && styles.dayCellTextSelected]}
								>
									{cell.day}
								</AppTypography>
							</TouchableOpacity>
						)
					})}
				</View>
			</View>

			{/* TIME CARD */}
			<View style={styles.card}>
				<View style={styles.sameTimeRow}>
					<TouchableOpacity
						style={styles.checkboxRow}
						onPress={() => setSameTimeForAll(!schedule.sameTimeForAll)}
						activeOpacity={0.7}
					>
						<View style={[styles.checkbox, schedule.sameTimeForAll && styles.checkboxChecked]}>
							{schedule.sameTimeForAll ? <Ionicons name="checkmark" size={12} color="#FFFFFF" /> : null}
						</View>
						<AppTypography variant="caption" style={styles.sameTimeLabel}>
							Apply same time to all dates
						</AppTypography>
					</TouchableOpacity>
					<View style={[styles.slotBadge, !schedule.sameTimeForAll && styles.slotBadgeCustom]}>
						<AppTypography
							variant="caption"
							style={[styles.slotBadgeText, !schedule.sameTimeForAll && styles.slotBadgeTextCustom]}
						>
							{schedule.sameTimeForAll ? 'Shared Slot' : 'Custom per date'}
						</AppTypography>
					</View>
				</View>

				{schedule.sameTimeForAll ? (
					<>
						<AppTypography variant="caption" style={styles.fieldLabel}>
							Preferred Time Slot
						</AppTypography>
						<AppSelect
							options={sharedSlotOptions}
							value={schedule.sharedTime}
							onSelect={setSharedTime}
							size="compact"
							borderRadius={10}
							borderColor="#E2E8F0"
							noMargin
							maxDropdownHeight={240}
						/>
					</>
				) : null}

				{dateCount > 0 ? (
					<View style={styles.selectedDatesSection}>
						<AppTypography variant="caption" style={styles.fieldLabel}>
							Selected Dates &amp; Slots
						</AppTypography>
						<View style={styles.selectedDatesList}>
							{sortedDates.map((dateKey) => {
								const time = schedule.sameTimeForAll
									? schedule.sharedTime
									: schedule.perDateTimes[dateKey] || schedule.sharedTime
								return (
									<View key={dateKey} style={styles.selectedDateRow}>
										<AppTypography
											variant="caption"
											style={styles.selectedDateText}
											numberOfLines={1}
										>
											{formatSelectedDateLabel(dateKey)}
										</AppTypography>
										{schedule.sameTimeForAll ? (
											<View style={styles.dateTimeTag}>
												<AppTypography variant="caption" style={styles.dateTimeTagText}>
													{time}
												</AppTypography>
											</View>
										) : (
											<AppSelect
												options={toSelectOptions(resolveSlotsForDate(dateKey))}
												value={time}
												onSelect={(t) => setDateTime(dateKey, t)}
												size="small"
												borderRadius={8}
												borderColor="#E2E8F0"
												noMargin
												style={styles.perDateSelect}
												maxDropdownHeight={220}
											/>
										)}
									</View>
								)
							})}
						</View>
					</View>
				) : null}

				<View style={styles.summaryBar}>
					<AppTypography variant="caption" style={styles.summaryText}>
						{dateCount === 0
							? 'No visit dates selected yet'
							: `Total: ${dateCount} session${dateCount > 1 ? 's' : ''} scheduled${
									schedule.sameTimeForAll ? ` (${schedule.sharedTime})` : ' (Individual Times)'
							  }`}
					</AppTypography>
				</View>
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		gap: 12,
	},
	card: {
		backgroundColor: '#F8FAFC',
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#E2E8F0',
		padding: 12,
		gap: 10,
	},
	cardLabel: {
		fontSize: 10.5,
		fontWeight: '800',
		color: '#334155',
		letterSpacing: 0.6,
	},
	calendarHeaderRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		justifyContent: 'space-between',
	},
	dateCountText: {
		fontSize: 11,
		fontWeight: '600',
		color: '#2B6F71',
		marginTop: 2,
	},
	monthNavRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	monthNavBtn: {
		width: 22,
		height: 22,
		borderRadius: 11,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#FFFFFF',
		borderWidth: 1,
		borderColor: '#E2E8F0',
	},
	monthLabel: {
		fontSize: 12,
		fontWeight: '700',
		color: '#0F172A',
	},
	weekdayRow: {
		flexDirection: 'row',
	},
	weekdayLabel: {
		flex: 1,
		textAlign: 'center',
		fontSize: 10,
		fontWeight: '700',
		color: '#94A3B8',
	},
	calendarGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
	},
	dayCell: {
		width: `${100 / 7}%`,
		aspectRatio: 1.3,
		alignItems: 'center',
		justifyContent: 'center',
	},
	dayCellTouchable: {
		borderRadius: 999,
	},
	dayCellSelected: {
		backgroundColor: '#2B6F71',
	},
	dayCellText: {
		fontSize: 12.5,
		fontWeight: '600',
		color: '#334155',
	},
	dayCellTextSelected: {
		color: '#FFFFFF',
		fontWeight: '800',
	},
	sameTimeRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingBottom: 10,
		borderBottomWidth: 1,
		borderBottomColor: '#E2E8F0',
	},
	checkboxRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		flexShrink: 1,
	},
	checkbox: {
		width: 16,
		height: 16,
		borderRadius: 4,
		borderWidth: 1.5,
		borderColor: '#94A3B8',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#FFFFFF',
	},
	checkboxChecked: {
		backgroundColor: '#2B6F71',
		borderColor: '#2B6F71',
	},
	sameTimeLabel: {
		fontSize: 12,
		fontWeight: '600',
		color: '#1E293B',
		flexShrink: 1,
	},
	slotBadge: {
		backgroundColor: '#E6F4F4',
		paddingHorizontal: 8,
		paddingVertical: 3,
		borderRadius: 999,
		borderWidth: 1,
		borderColor: '#CCFBF1',
	},
	slotBadgeCustom: {
		backgroundColor: '#FEF3C7',
		borderColor: '#FDE68A',
	},
	slotBadgeText: {
		fontSize: 10,
		fontWeight: '700',
		color: '#2B6F71',
	},
	slotBadgeTextCustom: {
		color: '#92400E',
	},
	fieldLabel: {
		fontSize: 10.5,
		fontWeight: '800',
		color: '#475569',
		letterSpacing: 0.5,
	},
	selectedDatesSection: {
		gap: 8,
	},
	selectedDatesList: {
		gap: 6,
	},
	selectedDateRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		backgroundColor: '#FFFFFF',
		borderWidth: 1,
		borderColor: '#E2E8F0',
		borderRadius: 10,
		paddingHorizontal: 10,
		paddingVertical: 8,
		gap: 8,
	},
	selectedDateText: {
		fontSize: 11.5,
		fontWeight: '600',
		color: '#334155',
		flexShrink: 1,
	},
	dateTimeTag: {
		backgroundColor: '#F1F5F9',
		paddingHorizontal: 8,
		paddingVertical: 3,
		borderRadius: 6,
	},
	dateTimeTagText: {
		fontSize: 10.5,
		fontWeight: '700',
		color: '#0F172A',
	},
	perDateSelect: {
		width: 132,
	},
	summaryBar: {
		backgroundColor: '#F0FDFA',
		borderWidth: 1,
		borderColor: '#CCFBF1',
		borderRadius: 10,
		paddingHorizontal: 10,
		paddingVertical: 8,
	},
	summaryText: {
		fontSize: 11,
		fontWeight: '700',
		color: '#0F766E',
	},
})
