// src/components/common/display/AppScheduleTimeline.tsx
//
// Day-schedule timeline from the provider "Today" design: a right-aligned 64px time column, a 12px dot
// (ringed in white + its colour) joined to the next row by a 2px divider line, then a 14/20 800 title with
// a status tag on the right and a 12/16 muted subtitle. Finished rows are dimmed (opacity 0.7).
//   dot 'done'     -> APP_COLORS.success
//   dot 'current'  -> APP_COLORS.primary
//   dot 'upcoming' -> APP_COLORS.divider
// Rows with onPress are buttons.

import React from 'react'
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { APP_COLORS } from '../../../config/theme'
import { AppTag, type AppTagProps } from './AppTag'

export type AppScheduleTimelineDot = 'done' | 'current' | 'upcoming'

export type AppScheduleTimelineItem = {
	key: string
	/** Left column, e.g. "9:00 AM" / "Today" / "Sat 27 Sep". */
	time: string
	title: string
	subtitle?: string
	status?: Pick<AppTagProps, 'label' | 'tone'>
	dot?: AppScheduleTimelineDot
	/** Dim the row (finished visits). */
	dimmed?: boolean
	onPress?: () => void
	accessibilityLabel?: string
}

export type AppScheduleTimelineProps = {
	items: AppScheduleTimelineItem[]
	style?: StyleProp<ViewStyle>
}

const DOT_COLORS: Record<AppScheduleTimelineDot, string> = {
	done: APP_COLORS.success,
	current: APP_COLORS.primary,
	upcoming: APP_COLORS.divider,
}

export function AppScheduleTimeline({ items, style }: AppScheduleTimelineProps) {
	return (
		<View style={style}>
			{items.map((item, i) => {
				const last = i === items.length - 1
				const color = DOT_COLORS[item.dot ?? 'upcoming']
				const content = (
					<>
						<Text style={styles.time} numberOfLines={2}>
							{item.time}
						</Text>
						<View style={styles.rail}>
							<View style={[styles.dotRing, { borderColor: color }]}>
								<View style={[styles.dot, { backgroundColor: color }]} />
							</View>
							{!last ? <View style={styles.line} /> : null}
						</View>
						<View style={[styles.body, !last && styles.bodySpaced, item.dimmed && styles.dimmed]}>
							<View style={styles.titleRow}>
								<Text style={styles.title} numberOfLines={2}>
									{item.title}
								</Text>
								{item.status ? (
									<AppTag label={item.status.label} tone={item.status.tone} size="sm" />
								) : null}
							</View>
							{item.subtitle ? (
								<Text style={styles.subtitle} numberOfLines={1}>
									{item.subtitle}
								</Text>
							) : null}
						</View>
					</>
				)
				const a11y =
					item.accessibilityLabel ??
					[item.time, item.title, item.status?.label, item.subtitle].filter(Boolean).join(', ')
				return item.onPress ? (
					<Pressable
						key={item.key}
						onPress={item.onPress}
						style={({ pressed }) => [styles.row, pressed && styles.pressed]}
						accessibilityRole="button"
						accessibilityLabel={a11y}
					>
						{content}
					</Pressable>
				) : (
					<View key={item.key} style={styles.row} accessible accessibilityLabel={a11y}>
						{content}
					</View>
				)
			})}
		</View>
	)
}

const styles = StyleSheet.create({
	row: {
		flexDirection: 'row',
		gap: 12,
	},
	pressed: {
		opacity: 0.85,
	},
	time: {
		width: 64,
		paddingTop: 2,
		fontSize: 12,
		lineHeight: 16,
		fontWeight: '700',
		color: APP_COLORS.inkMuted,
		textAlign: 'right',
	},
	rail: {
		alignItems: 'center',
	},
	// 12px dot inside a 1px coloured ring with a 3px white gap (design box-shadow 0 0 0 3px #FFF, 0 0 0 4px colour).
	dotRing: {
		width: 20,
		height: 20,
		marginTop: -1,
		borderRadius: 10,
		borderWidth: 1,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: APP_COLORS.surface,
	},
	dot: {
		width: 12,
		height: 12,
		borderRadius: 6,
	},
	line: {
		flex: 1,
		width: 2,
		marginVertical: 4,
		backgroundColor: APP_COLORS.divider,
	},
	body: {
		flex: 1,
		minWidth: 0,
		gap: 2,
	},
	bodySpaced: {
		paddingBottom: 14,
	},
	dimmed: {
		opacity: 0.7,
	},
	titleRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 8,
	},
	title: {
		flex: 1,
		fontSize: 14,
		lineHeight: 20,
		fontWeight: '800',
		color: APP_COLORS.ink,
	},
	subtitle: {
		fontSize: 12,
		lineHeight: 16,
		color: APP_COLORS.inkMuted,
	},
})

export default AppScheduleTimeline
