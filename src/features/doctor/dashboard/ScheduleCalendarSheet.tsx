// src/features/doctor/dashboard/ScheduleCalendarSheet.tsx
//
// "Choose a date" bottom sheet from the Doctor Dashboard design's Schedule -> All -> Upcoming view:
// a month grid (prev/next arrows) where days that already hold appointments carry a small dot, days
// up to and including today are disabled, and the footer offers "All dates" / "Show N appointments".
// Generic on purpose (selected / marked / min date are all props), so a future Pharmacy/Laboratory
// "pick a day" surface can reuse it as-is.

import React, { useMemo, useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { AppBottomSheet } from '../../../components/common'
import { APP_COLORS } from '../../../config/theme'
import { toApiDate } from '../scheduleUtils'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

type Props = {
	visible: boolean
	onClose: () => void
	/** ISO date currently filtered to, or null for "all dates". */
	selected: string | null
	onSelect: (iso: string) => void
	onClear: () => void
	/** ISO dates that have appointments (get the dot). */
	markedDates: Set<string>
	/** First selectable ISO date; everything before it is disabled. */
	minDate: string
	/** How many months (starting with the current one) the arrows can reach. */
	monthsAhead?: number
	applyLabel: string
}

export function ScheduleCalendarSheet({ visible, onClose, selected, onSelect, onClear, markedDates, minDate, monthsAhead = 3, applyLabel }: Props) {
	const [monthIdx, setMonthIdx] = useState(0)

	const month = useMemo(() => {
		const now = new Date()
		const first = new Date(now.getFullYear(), now.getMonth() + monthIdx, 1)
		const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
		return { year: first.getFullYear(), month: first.getMonth(), startDow: first.getDay(), daysInMonth }
	}, [monthIdx])

	const cells: (number | null)[] = [
		...Array.from({ length: month.startDow }, () => null),
		...Array.from({ length: month.daysInMonth }, (_, i) => i + 1),
	]

	return (
		<AppBottomSheet
			visible={visible}
			title="Choose a date"
			onClose={onClose}
			appearance="modern"
			footer={
				<View style={styles.footerRow}>
					<TouchableOpacity style={styles.secondaryBtn} onPress={onClear}>
						<Text style={styles.secondaryBtnText}>All dates</Text>
					</TouchableOpacity>
					<TouchableOpacity style={styles.primaryBtn} onPress={onClose}>
						<Text style={styles.primaryBtnText}>{applyLabel}</Text>
					</TouchableOpacity>
				</View>
			}
		>
			<View style={{ gap: 12 }}>
				<View style={styles.monthRow}>
					<TouchableOpacity
						style={styles.arrowBtn}
						disabled={monthIdx === 0}
						onPress={() => setMonthIdx((m) => Math.max(0, m - 1))}
						accessibilityLabel="Previous month"
					>
						<MaterialCommunityIcons name="chevron-left" size={20} color={monthIdx === 0 ? '#C9D6D7' : APP_COLORS.ink} />
					</TouchableOpacity>
					<Text style={styles.monthTitle}>
						{MONTHS[month.month]} {month.year}
					</Text>
					<TouchableOpacity
						style={styles.arrowBtn}
						disabled={monthIdx >= monthsAhead - 1}
						onPress={() => setMonthIdx((m) => Math.min(monthsAhead - 1, m + 1))}
						accessibilityLabel="Next month"
					>
						<MaterialCommunityIcons name="chevron-right" size={20} color={monthIdx >= monthsAhead - 1 ? '#C9D6D7' : APP_COLORS.ink} />
					</TouchableOpacity>
				</View>

				<View style={styles.grid}>
					{DOW.map((l, i) => (
						<Text key={`dow-${i}`} style={styles.dow}>
							{l}
						</Text>
					))}
				</View>

				<View style={styles.grid}>
					{cells.map((day, i) => {
						if (day === null) return <View key={`blank-${i}`} style={styles.cell} />
						const iso = toApiDate(new Date(month.year, month.month, day))
						const off = iso < minDate
						const on = selected === iso
						const marked = markedDates.has(iso)
						return (
							<View key={iso} style={styles.cell}>
								<TouchableOpacity
									disabled={off}
									onPress={() => onSelect(iso)}
									accessibilityState={{ selected: on, disabled: off }}
									accessibilityLabel={`${day} ${MONTHS[month.month]} ${month.year}${marked ? ', has appointments' : ''}${off ? ', unavailable' : ''}`}
									style={[styles.dayBtn, on && styles.dayBtnOn]}
								>
									<Text style={[styles.dayText, off && styles.dayTextOff, on && styles.dayTextOn, (on || marked) && { fontWeight: '800' }]}>{day}</Text>
									<View style={[styles.dot, { backgroundColor: marked ? (on ? '#FFFFFF' : APP_COLORS.primary) : 'transparent' }]} />
								</TouchableOpacity>
							</View>
						)
					})}
				</View>

				<View style={styles.legend}>
					<View style={[styles.dot, { backgroundColor: APP_COLORS.primary, width: 6, height: 6 }]} />
					<Text style={styles.legendText}>Has appointments</Text>
				</View>
			</View>
		</AppBottomSheet>
	)
}

const styles = StyleSheet.create({
	monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
	monthTitle: { fontSize: 15, lineHeight: 20, fontWeight: '800', color: APP_COLORS.ink },
	arrowBtn: {
		width: 40,
		height: 40,
		borderWidth: 1,
		borderColor: APP_COLORS.divider,
		borderRadius: 8,
		backgroundColor: '#FFFFFF',
		alignItems: 'center',
		justifyContent: 'center',
	},
	grid: { flexDirection: 'row', flexWrap: 'wrap' },
	dow: { width: `${100 / 7}%`, textAlign: 'center', fontSize: 12, lineHeight: 16, fontWeight: '700', color: APP_COLORS.inkMuted },
	cell: { width: `${100 / 7}%`, padding: 2 },
	dayBtn: { height: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center', gap: 2 },
	dayBtnOn: { backgroundColor: APP_COLORS.primary },
	dayText: { fontSize: 15, lineHeight: 18, fontWeight: '600', color: APP_COLORS.ink },
	dayTextOff: { color: '#B8C4C6' },
	dayTextOn: { color: '#FFFFFF' },
	dot: { width: 5, height: 5, borderRadius: 9999 },
	legend: { flexDirection: 'row', alignItems: 'center', gap: 6 },
	legendText: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
	footerRow: { flexDirection: 'row', gap: 8 },
	secondaryBtn: {
		height: 52,
		paddingHorizontal: 16,
		borderWidth: 1.5,
		borderColor: APP_COLORS.border,
		borderRadius: 8,
		backgroundColor: '#FFFFFF',
		alignItems: 'center',
		justifyContent: 'center',
	},
	secondaryBtnText: { fontSize: 14, fontWeight: '700', color: APP_COLORS.ink },
	primaryBtn: { flex: 1, height: 52, borderRadius: 8, backgroundColor: APP_COLORS.primary, alignItems: 'center', justifyContent: 'center' },
	primaryBtnText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
})

export default ScheduleCalendarSheet
