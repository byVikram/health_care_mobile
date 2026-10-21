// Monday-first strip of day chips: short day name + a tiny summary ("2 slots" / "Off"). Selected =
// primary fill; days with hours = mint; days off = white with a divider border.

import React from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native'
import { APP_COLORS } from '../../../../config/theme'
import { DAY_FULL, DAY_SHORT, WEEK_ORDER, dayRanges, daySummary, type WeekSections } from '../availabilityUtils'

export type DayStripProps = {
	week: WeekSections
	selected: number
	onSelect: (day: number) => void
}

export function DayStrip({ week, selected, onSelect }: DayStripProps) {
	return (
		<ScrollView
			horizontal
			showsHorizontalScrollIndicator={false}
			contentContainerStyle={styles.strip}
			accessibilityRole="tablist"
		>
			{WEEK_ORDER.map((d) => {
				const count = dayRanges(week[d]).length
				const on = count > 0
				const sel = d === selected
				return (
					<TouchableOpacity
						key={d}
						onPress={() => onSelect(d)}
						style={[styles.day, on && styles.dayOn, sel && styles.daySel]}
						accessibilityRole="tab"
						accessibilityState={{ selected: sel }}
						accessibilityLabel={`${DAY_FULL[d]}, ${daySummary(week[d])}`}
					>
						<Text style={[styles.dayName, sel && styles.textSel, !on && !sel && styles.textOff]}>
							{DAY_SHORT[d]}
						</Text>
						<Text style={[styles.mini, sel && styles.textSel, !on && !sel && styles.textOff]}>
							{on ? `${count} slot${count > 1 ? 's' : ''}` : 'Off'}
						</Text>
					</TouchableOpacity>
				)
			})}
		</ScrollView>
	)
}

const styles = StyleSheet.create({
	strip: {
		gap: 6,
		paddingVertical: 2,
	},
	day: {
		width: 56,
		height: 56,
		borderRadius: 12,
		borderWidth: 1.5,
		borderColor: APP_COLORS.divider,
		backgroundColor: APP_COLORS.surface,
		alignItems: 'center',
		justifyContent: 'center',
	},
	dayOn: {
		backgroundColor: APP_COLORS.mint,
		borderColor: APP_COLORS.mintAccent,
	},
	daySel: {
		backgroundColor: APP_COLORS.primary,
		borderColor: APP_COLORS.primary,
	},
	dayName: {
		fontSize: 14,
		lineHeight: 18,
		fontWeight: '800',
		color: APP_COLORS.ink,
	},
	mini: {
		fontSize: 10,
		lineHeight: 14,
		fontWeight: '600',
		color: APP_COLORS.ink,
	},
	textSel: {
		color: '#FFFFFF',
	},
	textOff: {
		color: APP_COLORS.border,
	},
})

export default DayStrip
