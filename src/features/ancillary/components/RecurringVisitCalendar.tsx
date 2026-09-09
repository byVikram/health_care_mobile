import React, { useMemo, useState } from 'react'
import { StyleSheet, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { AppTypography } from '../../../components/common'

export interface RecurringVisitSchedule {
	/** ISO date keys, e.g. '2026-08-14' */
	dates: string[]
	sameTimeForAll: boolean
	sharedTime: string
	/** Per-date override times, keyed by ISO date. Only used when sameTimeForAll is false. */
	perDateTimes: Record<string, string>
}

export const TIME_SLOT_OPTIONS = ['09:00 AM', '02:00 PM', '05:00 PM']

export const createDefaultRecurringSchedule = (): RecurringVisitSchedule => ({
	dates: [],
	sameTimeForAll: true,
	sharedTime: TIME_SLOT_OPTIONS[0],
	perDateTimes: {},
})

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WEEKDAY_SHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const WEEKDAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const pad2 = (value: number) => String(value).padStart(2, '0')
const toDateKey = (date: Date) => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`

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

export interface RecurringVisitCalendarProps {
	schedule: RecurringVisitSchedule
	onChange: (next: RecurringVisitSchedule) => void
}

export default function RecurringVisitCalendar({ schedule, onChange }: RecurringVisitCalendarProps) {
	const [visibleMonth, setVisibleMonth] = useState<Date>(() => {
		const now = new Date()
		return new Date(now.getFullYear(), now.getMonth(), 1)
	})

	const calendarCells = useMemo(() => buildCalendarCells(visibleMonth), [visibleMonth])
	const sortedDates = useMemo(() => [...schedule.dates].sort(), [schedule.dates])

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

				<AppTypography variant="caption" style={styles.fieldLabel}>
					Preferred Time Slot
				</AppTypography>
				<View style={styles.timeSlotRow}>
					{TIME_SLOT_OPTIONS.map((time) => {
						const isActive = schedule.sharedTime === time
						return (
							<TouchableOpacity
								key={time}
								style={[styles.timeSlotBtn, isActive && styles.timeSlotBtnActive]}
								onPress={() => setSharedTime(time)}
								activeOpacity={0.85}
							>
								<AppTypography
									variant="caption"
									style={[styles.timeSlotBtnText, isActive && styles.timeSlotBtnTextActive]}
								>
									{time}
								</AppTypography>
							</TouchableOpacity>
						)
					})}
				</View>

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
										<AppTypography variant="caption" style={styles.selectedDateText}>
											{formatSelectedDateLabel(dateKey)}
										</AppTypography>
										{schedule.sameTimeForAll ? (
											<View style={styles.dateTimeTag}>
												<AppTypography variant="caption" style={styles.dateTimeTagText}>
													{time}
												</AppTypography>
											</View>
										) : (
											<View style={styles.perDateTimeOptions}>
												{TIME_SLOT_OPTIONS.map((t) => {
													const active = time === t
													return (
														<TouchableOpacity
															key={t}
															style={[styles.perDateTimeChip, active && styles.perDateTimeChipActive]}
															onPress={() => setDateTime(dateKey, t)}
															activeOpacity={0.8}
														>
															<AppTypography
																variant="caption"
																style={[
																	styles.perDateTimeChipText,
																	active && styles.perDateTimeChipTextActive,
																]}
															>
																{t}
															</AppTypography>
														</TouchableOpacity>
													)
												})}
											</View>
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
	timeSlotRow: {
		flexDirection: 'row',
		gap: 8,
	},
	timeSlotBtn: {
		flex: 1,
		paddingVertical: 8,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: '#E2E8F0',
		backgroundColor: '#FFFFFF',
		alignItems: 'center',
	},
	timeSlotBtnActive: {
		backgroundColor: '#2B6F71',
		borderColor: '#2B6F71',
	},
	timeSlotBtnText: {
		fontSize: 11,
		fontWeight: '600',
		color: '#475569',
	},
	timeSlotBtnTextActive: {
		color: '#FFFFFF',
		fontWeight: '700',
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
	perDateTimeOptions: {
		flexDirection: 'row',
		gap: 4,
		flexShrink: 1,
		flexWrap: 'wrap',
		justifyContent: 'flex-end',
	},
	perDateTimeChip: {
		paddingHorizontal: 6,
		paddingVertical: 3,
		borderRadius: 6,
		borderWidth: 1,
		borderColor: '#E2E8F0',
		backgroundColor: '#F8FAFC',
	},
	perDateTimeChipActive: {
		backgroundColor: '#2B6F71',
		borderColor: '#2B6F71',
	},
	perDateTimeChipText: {
		fontSize: 9.5,
		fontWeight: '600',
		color: '#64748B',
	},
	perDateTimeChipTextActive: {
		color: '#FFFFFF',
		fontWeight: '700',
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
