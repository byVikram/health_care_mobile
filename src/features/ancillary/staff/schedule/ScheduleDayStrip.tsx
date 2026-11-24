// src/features/ancillary/staff/schedule/ScheduleDayStrip.tsx
//
// Schedule -> "Date" of the ancillary schedule design: a strip with a "Past" chip, a hairline, then today and the six days after it
// (weekday, date number). The picked chip is filled with the primary colour; a small orange dot at the corner of a day means
// open jobs near the provider on that day.
import React, { useEffect, useRef } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { AppPathIcon } from '../../../../components/common'
import { APP_COLORS } from '../../../../config/theme'
import { parseDateOnly } from '../../../../utils/date'
import { dowOf } from './scheduleModel'
import { PATHS, SCH } from './scheduleTheme'

export const PAST_KEY = 'past'

const CHIP_W = 52
const PAST_W = 60
const GAP = 6

type Props = {
	/** The days of the strip as YYYY-MM-DD, today first. */
	days: string[]
	todayIso: string
	/** PAST_KEY or a YYYY-MM-DD. */
	selected: string
	/** How many visits are still to do on a day (greys the day out when 0). */
	countOf: (iso: string) => number
	/** Days with open jobs nearby (get the orange dot). */
	hasOpen: (iso: string) => boolean
	onSelect: (value: string) => void
}

export function ScheduleDayStrip({ days, todayIso, selected, countOf, hasOpen, onSelect }: Props) {
	const scroller = useRef<ScrollView>(null)

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
				accessibilityLabel="Past visits"
				activeOpacity={0.8}
				onPress={() => onSelect(PAST_KEY)}
				style={[styles.chip, { width: PAST_W }, selected === PAST_KEY && styles.chipOn]}
			>
				<AppPathIcon
					d={PATHS.history}
					size={18}
					strokeWidth={2.2}
					color={selected === PAST_KEY ? '#FFFFFF' : APP_COLORS.ink}
				/>
				<Text style={[styles.pastText, selected === PAST_KEY && styles.textOn]}>Past</Text>
			</TouchableOpacity>
			<View style={styles.rule} />
			{days.map((iso) => {
				const on = iso === selected
				const n = countOf(iso)
				const open = hasOpen(iso)
				const off = n === 0 && !open
				const d = parseDateOnly(iso)
				return (
					<TouchableOpacity
						key={iso}
						accessibilityRole="tab"
						accessibilityState={{ selected: on }}
						accessibilityLabel={`${iso === todayIso ? 'Today' : dowOf(iso)} ${d?.getDate() ?? ''}, ${n} ${n === 1 ? 'visit' : 'visits'}${open ? ', open jobs nearby' : ''}`}
						activeOpacity={0.8}
						onPress={() => onSelect(iso)}
						style={[styles.chip, { width: CHIP_W }, off && !on && styles.chipOff, on && styles.chipOn]}
					>
						<Text style={[styles.dow, on && styles.dowOn, off && !on && styles.textOff]}>{dowOf(iso)}</Text>
						<Text style={[styles.num, on && styles.textOn, off && !on && styles.textOff]}>
							{d?.getDate()}
						</Text>
						{open && !on && <View style={styles.openDot} />}
					</TouchableOpacity>
				)
			})}
		</ScrollView>
	)
}

const styles = StyleSheet.create({
	strip: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: GAP,
		paddingHorizontal: 16,
		paddingTop: 4,
		paddingBottom: 6,
	},
	chip: {
		height: 56,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: APP_COLORS.border,
		backgroundColor: APP_COLORS.surface,
		alignItems: 'center',
		justifyContent: 'center',
		gap: 2,
	},
	chipOff: { borderColor: APP_COLORS.divider },
	chipOn: { backgroundColor: APP_COLORS.primary, borderColor: APP_COLORS.primary },
	pastText: { fontSize: 12, lineHeight: 14, fontWeight: '800', color: APP_COLORS.ink },
	dow: { fontSize: 11, lineHeight: 14, fontWeight: '600', color: APP_COLORS.inkMuted },
	dowOn: { color: '#CDE7E6' },
	num: { fontSize: 18, lineHeight: 24, fontWeight: '800', color: APP_COLORS.ink },
	textOn: { color: '#FFFFFF' },
	textOff: { color: APP_COLORS.inkDisabled },
	rule: {
		width: 1,
		alignSelf: 'stretch',
		marginVertical: 8,
		marginHorizontal: 2,
		backgroundColor: APP_COLORS.divider,
	},
	openDot: {
		position: 'absolute',
		top: -3,
		right: -3,
		width: 10,
		height: 10,
		borderRadius: 5,
		backgroundColor: SCH.accent,
		borderWidth: 2,
		borderColor: APP_COLORS.pageBg,
	},
})
