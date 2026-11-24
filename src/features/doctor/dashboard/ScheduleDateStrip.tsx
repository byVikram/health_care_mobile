// src/features/doctor/dashboard/ScheduleDateStrip.tsx
//
// Schedule -> "Date", from the "Doctor Dashboard NEW" design: a horizontal strip that starts with a "Past" chip (the history of
// visits), a hairline, then one chip per day from today on (weekday, date number; "Today" on today; a small dot under a day that
// already holds appointments). The picked chip is filled with the primary colour.

import React, { useEffect, useRef } from 'react'
import { ScrollViewInstance, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { AppPathIcon } from '../../../components/common'
import { APP_COLORS } from '../../../config/theme'

export const PAST_KEY = 'past'
const HISTORY = 'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2'
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const CHIP_W = 56
const PAST_W = 60
const GAP = 6

type Props = {
	/** The days after (and including) today, as YYYY-MM-DD, in order. */
	days: string[]
	todayIso: string
	/** PAST_KEY or a YYYY-MM-DD. */
	selected: string
	/** Days that hold at least one appointment (get a dot). */
	marked: Set<string>
	onSelect: (value: string) => void
}

export function ScheduleDateStrip({ days, todayIso, selected, marked, onSelect }: Props) {
	const scroller = useRef<ScrollViewInstance>(null)

	// A day picked elsewhere (the calendar, the Today button) is brought into view.
	useEffect(() => {
		const i = days.indexOf(selected)
		const x = selected === PAST_KEY || i < 0 ? 0 : PAST_W + 12 + i * (CHIP_W + GAP) - 80
		scroller.current?.scrollTo({ x: Math.max(0, x), animated: true })
	}, [selected, days])

	return (
		<ScrollView
			ref={scroller}
			horizontal
			showsHorizontalScrollIndicator={false}
			contentContainerStyle={styles.strip}
			accessibilityRole="tablist"
			accessibilityLabel="Pick a day"
		>
			<TouchableOpacity
				accessibilityRole="tab"
				accessibilityState={{ selected: selected === PAST_KEY }}
				accessibilityLabel="Past appointments"
				activeOpacity={0.8}
				onPress={() => onSelect(PAST_KEY)}
				style={[styles.chip, { width: PAST_W }, selected === PAST_KEY && styles.chipOn]}
			>
				<AppPathIcon
					d={HISTORY}
					size={18}
					strokeWidth={2.2}
					color={selected === PAST_KEY ? '#FFFFFF' : APP_COLORS.ink}
				/>
				<Text style={[styles.pastText, selected === PAST_KEY && styles.textOn]}>Past</Text>
			</TouchableOpacity>
			<View style={styles.rule} />
			{days.map((iso) => {
				const on = iso === selected
				const d = new Date(`${iso}T00:00:00`)
				return (
					<TouchableOpacity
						key={iso}
						accessibilityRole="tab"
						accessibilityState={{ selected: on }}
						activeOpacity={0.8}
						onPress={() => onSelect(iso)}
						style={[styles.chip, { width: CHIP_W }, on && styles.chipOn]}
					>
						<Text style={[styles.dow, on && styles.textOn]}>
							{iso === todayIso ? 'Today' : DOW[d.getDay()]}
						</Text>
						<Text style={[styles.dayNum, on && styles.textOn]}>{d.getDate()}</Text>
						{marked.has(iso) && <View style={[styles.dot, on && { backgroundColor: '#FFFFFF' }]} />}
					</TouchableOpacity>
				)
			})}
		</ScrollView>
	)
}

const styles = StyleSheet.create({
	strip: { flexDirection: 'row', alignItems: 'center', gap: GAP, paddingHorizontal: 16, paddingVertical: 4 },
	chip: {
		height: 56,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: APP_COLORS.border,
		backgroundColor: '#FFFFFF',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 1,
	},
	chipOn: { backgroundColor: APP_COLORS.primary, borderColor: APP_COLORS.primary },
	rule: { width: 1, height: 40, marginHorizontal: 2, backgroundColor: APP_COLORS.divider },
	pastText: { fontSize: 12, lineHeight: 14, fontWeight: '800', color: APP_COLORS.ink },
	dow: { fontSize: 12, lineHeight: 14, fontWeight: '700', color: APP_COLORS.inkMuted },
	dayNum: { fontSize: 20, lineHeight: 24, fontWeight: '800', color: APP_COLORS.ink },
	textOn: { color: '#FFFFFF' },
	dot: {
		position: 'absolute',
		top: 5,
		right: 6,
		width: 6,
		height: 6,
		borderRadius: 9999,
		backgroundColor: APP_COLORS.offer,
	},
})

export default ScheduleDateStrip
