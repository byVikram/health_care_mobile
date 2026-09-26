// src/components/common/AppStatusTimeline.tsx
//
// Vertical status stepper (Appointment details "Status"): done = green check + green connector,
// current = teal ring on mint, upcoming = grey ring, failed = red cross.

import React from 'react'
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { APP_COLORS } from '../../config/theme'

/** 'future' is accepted as an alias of 'upcoming' (the local StatusTimeline's name). */
export type AppTimelineState = 'done' | 'current' | 'upcoming' | 'future' | 'failed'

export type AppTimelineStep = {
	key: string
	title: string
	sub?: string
	state: AppTimelineState
}

export type AppStatusTimelineProps = {
	steps: AppTimelineStep[]
	style?: StyleProp<ViewStyle>
}

const STATE_LABEL: Record<AppTimelineState, string> = {
	done: 'completed',
	current: 'in progress',
	upcoming: 'upcoming',
	future: 'upcoming',
	failed: 'failed',
}

export function AppStatusTimeline({ steps, style }: AppStatusTimelineProps) {
	return (
		<View style={style} accessibilityRole="list">
			{steps.map((step, i) => {
				const isLast = i === steps.length - 1
				const isDone = step.state === 'done'
				const upcoming = step.state === 'upcoming' || step.state === 'future'
				const lineColor = isDone ? APP_COLORS.success : APP_COLORS.divider
				return (
					<View
						key={step.key}
						style={styles.row}
						accessible
						accessibilityLabel={[step.title, step.sub, STATE_LABEL[step.state]].filter(Boolean).join(', ')}
					>
						<View style={styles.rail}>
							{step.state === 'done' && (
								<View style={[styles.dot, styles.dotDone]}>
									<MaterialCommunityIcons name="check" size={14} color="#FFFFFF" />
								</View>
							)}
							{step.state === 'failed' && (
								<View style={[styles.dot, styles.dotFailed]}>
									<MaterialCommunityIcons name="close" size={14} color="#FFFFFF" />
								</View>
							)}
							{step.state === 'current' && <View style={[styles.dot, styles.dotCurrent]} />}
							{upcoming && <View style={[styles.dot, styles.dotUpcoming]} />}
							{!isLast && <View style={[styles.line, { backgroundColor: lineColor }]} />}
						</View>
						<View style={[styles.text, isLast && styles.textLast]}>
							<Text
								style={[
									styles.title,
									upcoming && styles.titleMuted,
									step.state === 'failed' && styles.titleFailed,
								]}
							>
								{step.title}
							</Text>
							{!!step.sub && <Text style={styles.sub}>{step.sub}</Text>}
						</View>
					</View>
				)
			})}
		</View>
	)
}

const styles = StyleSheet.create({
	row: { flexDirection: 'row', gap: 12 },
	rail: { alignItems: 'center' },
	dot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
	dotDone: { backgroundColor: APP_COLORS.success },
	dotFailed: { backgroundColor: APP_COLORS.danger },
	dotCurrent: { borderWidth: 3, borderColor: APP_COLORS.primary, backgroundColor: APP_COLORS.mint },
	dotUpcoming: { borderWidth: 2, borderColor: APP_COLORS.divider, backgroundColor: APP_COLORS.surface },
	line: { flexGrow: 1, width: 2, minHeight: 14, marginVertical: 2 },
	text: { flex: 1, paddingTop: 2, paddingBottom: 12 },
	textLast: { paddingBottom: 0 },
	title: { fontSize: 14, lineHeight: 20, fontWeight: '700', color: APP_COLORS.ink },
	titleMuted: { color: APP_COLORS.inkMuted },
	titleFailed: { color: APP_COLORS.danger },
	sub: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
})

export default AppStatusTimeline
