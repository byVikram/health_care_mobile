// src/features/laboratory/LabScheduleSheet.tsx
//
// "Collection schedule" bottom sheet from the Lab Tests Ordering cart design: One visit / Repeat visits
// switch, a two-month calendar (tomorrow onwards), removable date chips for repeat visits, and the time -
// one slot for every visit, or a slot per visit behind "Same time for all". Reads and writes the shared
// booking store; the footer shows the summary and confirms.

import React, { useMemo, useState } from 'react'
import { StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import {
	AppBottomSheet,
	AppButton,
	AppPathIcon,
	AppSegmentedControl,
	SlotChipGrid,
	type SlotChipItem,
} from '../../components/common'
import { APP_COLORS } from '../../config/theme'
import { labBooking, needsFasting, timeIdFor, totalsOf, useLabBooking, type LabScheduleMode } from './labBookingStore'
import { addDays, inr, longDate, monthTitle, shortDate, toIso, todayIso } from './labFormat'
import { COLLECTION_TIMES, LAB_ICONS, MAX_REPEAT_VISITS, collectionTimeLabel } from './labMock'

const MONTHS_SHOWN = 2
const DOW_MON_FIRST = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

const TIME_ITEMS: SlotChipItem[] = COLLECTION_TIMES.map((t) => ({ value: t.id, label: t.label }))

type Props = {
	visible: boolean
	onClose: () => void
}

export function LabScheduleSheet({ visible, onClose }: Props) {
	const booking = useLabBooking()
	const [monthIdx, setMonthIdx] = useState(0)
	const [openVisit, setOpenVisit] = useState<string | null>(null)

	const { mode, dates } = { mode: booking.scheduleMode, dates: booking.dates }
	const isMulti = mode === 'multi'
	const today = todayIso()
	const tomorrow = toIso(addDays(new Date(), 1))
	const fasting = needsFasting(booking)
	const { unitTotal } = totalsOf(booking)

	const month = useMemo(() => {
		const now = new Date()
		const first = new Date(now.getFullYear(), now.getMonth() + monthIdx, 1)
		return {
			year: first.getFullYear(),
			month: first.getMonth(),
			lead: (first.getDay() + 6) % 7,
			days: new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate(),
		}
	}, [monthIdx])

	const cells: (number | null)[] = [
		...Array.from({ length: month.lead }, () => null),
		...Array.from({ length: month.days }, (_, i) => i + 1),
	]

	const canVary = isMulti && dates.length > 1
	const varied = canVary && !booking.sameTime
	const distinct = new Set(dates.map((d) => timeIdFor(booking, d))).size
	const timeText =
		varied && distinct > 1
			? 'different times'
			: collectionTimeLabel(varied ? timeIdFor(booking, dates[0]) : booking.time)
	const dateList = dates.map(shortDate)
	const scheduleSummary =
		dates.length === 0
			? 'Select a date to continue'
			: dates.length === 1
				? `${longDate(dates[0])}, ${collectionTimeLabel(timeIdFor(booking, dates[0]))}`
				: `${dates.length} visits · ${varied && distinct > 1 ? 'times set per visit' : `at ${timeText}`} · ${inr(unitTotal * dates.length)} in total`
	const confirmLabel = dates.length > 1 ? `Confirm ${dates.length} visits` : 'Confirm slot'
	const modeHint = isMulti
		? `Tap the dates you need, up to ${MAX_REPEAT_VISITS} visits. We come at the same time on each date.`
		: 'Pick one date for your home collection.'

	const atFirst = monthIdx === 0
	const atLast = monthIdx === MONTHS_SHOWN - 1

	return (
		<AppBottomSheet
			visible={visible}
			title="Collection schedule"
			subtitle="A phlebotomist visits you at home"
			onClose={onClose}
			appearance="modern"
			showHeaderDivider={false}
			maxHeightRatio={0.94}
			footer={
				<View style={styles.footer}>
					<Text style={styles.summary}>{scheduleSummary}</Text>
					<AppButton size="lg" disabled={dates.length === 0} onPress={onClose}>
						{confirmLabel}
					</AppButton>
				</View>
			}
		>
			<View style={styles.body}>
				<AppSegmentedControl<LabScheduleMode>
					accessibilityLabel="Visit type"
					options={[
						{ value: 'single', label: 'One visit' },
						{ value: 'multi', label: 'Repeat visits' },
					]}
					value={mode}
					onChange={(v) => labBooking.setScheduleMode(v)}
				/>
				<Text style={styles.hint}>{modeHint}</Text>

				<View style={styles.calendar}>
					<View style={styles.monthRow}>
						<TouchableOpacity
							style={styles.arrow}
							disabled={atFirst}
							onPress={() => setMonthIdx((m) => Math.max(0, m - 1))}
							accessibilityLabel="Previous month"
						>
							<AppPathIcon
								d={LAB_ICONS.chevronLeft}
								size={20}
								strokeWidth={2.2}
								color={atFirst ? '#A3B0B2' : APP_COLORS.ink}
							/>
						</TouchableOpacity>
						<Text style={styles.monthTitle} accessibilityLiveRegion="polite">
							{monthTitle(month.year, month.month)}
						</Text>
						<TouchableOpacity
							style={styles.arrow}
							disabled={atLast}
							onPress={() => setMonthIdx((m) => Math.min(MONTHS_SHOWN - 1, m + 1))}
							accessibilityLabel="Next month"
						>
							<AppPathIcon
								d={LAB_ICONS.chevronRight}
								size={20}
								strokeWidth={2.2}
								color={atLast ? '#A3B0B2' : APP_COLORS.ink}
							/>
						</TouchableOpacity>
					</View>
					<View
						style={styles.grid}
						accessibilityElementsHidden
						importantForAccessibility="no-hide-descendants"
					>
						{DOW_MON_FIRST.map((l, i) => (
							<Text key={`dow-${i}`} style={styles.dow}>
								{l}
							</Text>
						))}
					</View>
					<View style={styles.grid}>
						{cells.map((day, i) => {
							if (day === null) return <View key={`blank-${i}`} style={styles.cell} />
							const iso = toIso(new Date(month.year, month.month, day))
							const past = iso <= today
							const on = dates.includes(iso)
							const full = isMulti && !on && dates.length >= MAX_REPEAT_VISITS
							return (
								<View key={iso} style={styles.cell}>
									<TouchableOpacity
										disabled={past}
										onPress={() => labBooking.pickDate(iso)}
										accessibilityState={{ selected: on, disabled: past }}
										accessibilityLabel={`${longDate(iso)}${past ? ', unavailable' : on ? ', selected' : ''}`}
										style={[
											styles.day,
											{
												backgroundColor: on ? APP_COLORS.primary : 'transparent',
												borderColor: on
													? APP_COLORS.primary
													: iso === tomorrow
														? APP_COLORS.border
														: 'transparent',
											},
										]}
									>
										<Text
											style={[
												styles.dayText,
												{
													color: on
														? '#FFFFFF'
														: past || full
															? APP_COLORS.inkDisabled
															: APP_COLORS.ink,
													fontWeight: on ? '700' : '500',
												},
											]}
										>
											{day}
										</Text>
									</TouchableOpacity>
								</View>
							)
						})}
					</View>
				</View>

				{isMulti && dates.length > 0 && (
					<View style={styles.chipsBlock}>
						<Text
							style={styles.chipsCount}
						>{`${dates.length} of ${MAX_REPEAT_VISITS} visits selected`}</Text>
						<View style={styles.chips}>
							{dateList.map((label, i) => (
								<TouchableOpacity
									key={dates[i]}
									style={styles.chip}
									onPress={() => labBooking.pickDate(dates[i])}
									accessibilityRole="button"
									accessibilityLabel={`Remove ${longDate(dates[i])}`}
								>
									<Text style={styles.chipText}>{label}</Text>
									<MaterialCommunityIcons name="close" size={14} color={APP_COLORS.ink} />
								</TouchableOpacity>
							))}
						</View>
					</View>
				)}

				<View style={styles.timeBlock}>
					<View style={styles.timeHead}>
						<Text style={styles.timeTitle}>Time</Text>
						{canVary && (
							<View style={styles.sameRow}>
								<Text style={styles.sameLabel}>Same time for all</Text>
								<Switch
									value={!varied}
									onValueChange={(v) => labBooking.setSameTime(v)}
									trackColor={{ false: APP_COLORS.border, true: APP_COLORS.primary }}
									thumbColor="#FFFFFF"
									accessibilityLabel="Same time for all visits"
								/>
							</View>
						)}
					</View>

					{!varied ? (
						<SlotChipGrid
							slots={TIME_ITEMS}
							selectedValue={booking.time}
							onSelectValue={(id) => labBooking.set({ time: id })}
							columns={3}
						/>
					) : (
						<View>
							{dates.map((iso, n) => {
								const current = timeIdFor(booking, iso)
								const open = openVisit === iso
								return (
									<View key={iso} style={[styles.visitRow, n > 0 && styles.visitRowRule]}>
										<View style={styles.visitHead}>
											<View style={styles.flex}>
												<Text style={styles.visitEyebrow}>{`VISIT ${n + 1}`}</Text>
												<Text style={styles.visitDate}>{longDate(iso)}</Text>
											</View>
											<TouchableOpacity
												style={styles.select}
												onPress={() => setOpenVisit(open ? null : iso)}
												accessibilityRole="button"
												accessibilityLabel={`Time for visit ${n + 1}, ${collectionTimeLabel(current)}`}
											>
												<Text style={styles.selectText} numberOfLines={1}>
													{collectionTimeLabel(current)}
												</Text>
												<AppPathIcon
													d={LAB_ICONS.chevronDown}
													size={16}
													strokeWidth={2.4}
													color={APP_COLORS.inkMuted}
												/>
											</TouchableOpacity>
										</View>
										{open && (
											<SlotChipGrid
												slots={TIME_ITEMS}
												selectedValue={current}
												onSelectValue={(id) => {
													labBooking.setVisitTime(iso, id)
													setOpenVisit(null)
												}}
												columns={3}
												style={styles.visitGrid}
											/>
										)}
									</View>
								)
							})}
						</View>
					)}

					{fasting && <Text style={styles.fasting}>Fasting is needed · pick a morning slot</Text>}
				</View>
			</View>
		</AppBottomSheet>
	)
}

const CELL = `${100 / 7}%` as const

const styles = StyleSheet.create({
	flex: { flex: 1, minWidth: 0 },
	body: { gap: 16 },
	hint: { marginTop: -4, fontSize: 13, lineHeight: 18, color: APP_COLORS.inkMuted },
	calendar: { gap: 8 },
	monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
	monthTitle: { fontSize: 16, lineHeight: 24, fontWeight: '600', color: APP_COLORS.ink },
	arrow: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
	grid: { flexDirection: 'row', flexWrap: 'wrap' },
	dow: {
		width: CELL,
		textAlign: 'center',
		fontSize: 12,
		lineHeight: 16,
		fontWeight: '600',
		color: APP_COLORS.inkMuted,
	},
	cell: { width: CELL, alignItems: 'center', paddingVertical: 2 },
	day: {
		width: 44,
		height: 44,
		borderRadius: 22,
		borderWidth: 1,
		alignItems: 'center',
		justifyContent: 'center',
	},
	dayText: { fontSize: 15, lineHeight: 20 },
	chipsBlock: { gap: 8 },
	chipsCount: { fontSize: 13, lineHeight: 18, fontWeight: '600', color: APP_COLORS.ink },
	chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
	chip: {
		height: 32,
		paddingLeft: 12,
		paddingRight: 8,
		borderRadius: 9999,
		backgroundColor: APP_COLORS.mint,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	chipText: { fontSize: 13, fontWeight: '600', color: APP_COLORS.ink },
	timeBlock: { gap: 8 },
	timeHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
	timeTitle: { fontSize: 16, lineHeight: 24, fontWeight: '600', color: APP_COLORS.ink },
	sameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
	sameLabel: { fontSize: 13, lineHeight: 18, fontWeight: '600', color: APP_COLORS.ink },
	visitRow: { minHeight: 56, justifyContent: 'center', paddingVertical: 6 },
	visitRowRule: { borderTopWidth: 1, borderTopColor: APP_COLORS.divider },
	visitHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
	visitEyebrow: { fontSize: 12, lineHeight: 16, fontWeight: '600', letterSpacing: 0.24, color: APP_COLORS.inkMuted },
	visitDate: { fontSize: 15, lineHeight: 22, fontWeight: '600', color: APP_COLORS.ink },
	select: {
		width: 148,
		height: 44,
		paddingHorizontal: 12,
		borderWidth: 1,
		borderColor: APP_COLORS.border,
		borderRadius: 8,
		backgroundColor: '#FFFFFF',
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 6,
	},
	selectText: { flex: 1, fontSize: 14, fontWeight: '600', color: APP_COLORS.ink },
	visitGrid: { marginTop: 8 },
	fasting: { fontSize: 12, lineHeight: 16, fontWeight: '500', color: APP_COLORS.warning },
	footer: { gap: 8 },
	summary: { fontSize: 13, lineHeight: 18, color: APP_COLORS.inkMuted },
})
