// src/components/common/AppNumberedSteps.tsx
//
// Numbered instruction list ("Before your visit" / "Get ready for the call"): mint numbered circle
// (12/800 APP_COLORS.primary), 14/20 700 title, 13/18 muted body. Optional vertical connector between
// circles for timeline-like lists.

import React from 'react'
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { APP_COLORS } from '../../config/theme'

export type AppNumberedStep = {
	title: string
	body?: string
	/** Stable key; defaults to the title. */
	key?: string
}

export type AppNumberedStepsProps = {
	steps: AppNumberedStep[]
	/** Circle diameter (design uses 24-28). Defaults to 24. */
	numberSize?: number
	/** Draw a 2px APP_COLORS.divider connector between circles. Defaults to false. */
	connector?: boolean
	/** Gap between rows. Defaults to 10. */
	gap?: number
	style?: StyleProp<ViewStyle>
}

export function AppNumberedSteps({
	steps,
	numberSize = 24,
	connector = false,
	gap = 10,
	style,
}: AppNumberedStepsProps) {
	return (
		<View style={[{ gap: connector ? 0 : gap }, style]} accessibilityRole="list">
			{steps.map((s, i) => {
				const isLast = i === steps.length - 1
				return (
					<View
						key={s.key ?? s.title}
						style={styles.row}
						accessible
						accessibilityLabel={`Step ${i + 1}: ${s.title}${s.body ? `. ${s.body}` : ''}`}
					>
						<View style={styles.rail}>
							<View
								style={[
									styles.num,
									{ width: numberSize, height: numberSize, borderRadius: numberSize / 2 },
								]}
							>
								<Text style={[styles.numText, numberSize >= 28 && styles.numTextLg]}>{i + 1}</Text>
							</View>
							{connector && !isLast && <View style={styles.line} />}
						</View>
						<View style={[styles.text, connector && !isLast && { paddingBottom: gap }]}>
							<Text style={styles.title}>{s.title}</Text>
							{!!s.body && <Text style={styles.body}>{s.body}</Text>}
						</View>
					</View>
				)
			})}
		</View>
	)
}

const styles = StyleSheet.create({
	row: { flexDirection: 'row', alignItems: 'stretch', gap: 10 },
	rail: { alignItems: 'center' },
	num: { backgroundColor: APP_COLORS.mint, alignItems: 'center', justifyContent: 'center' },
	numText: { fontSize: 12, fontWeight: '800', color: APP_COLORS.primary },
	numTextLg: { fontSize: 13 },
	line: { flexGrow: 1, width: 2, minHeight: 8, marginVertical: 2, backgroundColor: APP_COLORS.divider },
	text: { flex: 1, minWidth: 0 },
	title: { fontSize: 14, lineHeight: 20, fontWeight: '700', color: APP_COLORS.ink },
	body: { fontSize: 13, lineHeight: 18, color: APP_COLORS.inkMuted },
})

export default AppNumberedSteps
