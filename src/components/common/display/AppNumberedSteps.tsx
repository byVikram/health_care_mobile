// src/components/common/display/AppNumberedSteps.tsx
//
// Numbered instruction list ("Before your visit" / "Get ready for the call"): mint numbered circle
// (12/800 APP_COLORS.primary), 14/20 700 title, 13/18 muted body. Optional vertical connector between
// circles for timeline-like lists. The opt-in style props (titleStyle, bodyStyle, markerGap, textGap,
// numberWeight, connectorSpacing) let screens with a slightly different spec (e.g. Appointment confirmed:
// 15/22 600 title, 14/20 body, 12px marker gap) reuse it without changing the defaults.

import React from 'react'
import { StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native'
import { APP_COLORS } from '../../../config/theme'

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
	/** Number font weight. Defaults to '800'. */
	numberWeight?: TextStyle['fontWeight']
	/** Draw a 2px APP_COLORS.divider connector between circles. Defaults to false. */
	connector?: boolean
	/** Vertical margin around the connector line. Defaults to 2. */
	connectorSpacing?: number
	/** Gap between rows. Defaults to 10. */
	gap?: number
	/** Horizontal gap between the number circle and the text. Defaults to 10. */
	markerGap?: number
	/** Gap between a step's title and body. Defaults to 0. */
	textGap?: number
	/** Merged over the default 14/20 700 ink title. */
	titleStyle?: StyleProp<TextStyle>
	/** Merged over the default 13/18 muted body. */
	bodyStyle?: StyleProp<TextStyle>
	style?: StyleProp<ViewStyle>
}

export function AppNumberedSteps({
	steps,
	numberSize = 24,
	numberWeight,
	connector = false,
	connectorSpacing,
	gap = 10,
	markerGap,
	textGap,
	titleStyle,
	bodyStyle,
	style,
}: AppNumberedStepsProps) {
	return (
		<View style={[{ gap: connector ? 0 : gap }, style]} accessibilityRole="list">
			{steps.map((s, i) => {
				const isLast = i === steps.length - 1
				return (
					<View
						key={s.key ?? s.title}
						style={[styles.row, markerGap != null && { gap: markerGap }]}
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
								<Text
									style={[
										styles.numText,
										numberSize >= 28 && styles.numTextLg,
										numberWeight != null && { fontWeight: numberWeight },
									]}
								>
									{i + 1}
								</Text>
							</View>
							{connector && !isLast && (
								<View
									style={[
										styles.line,
										connectorSpacing != null && { marginVertical: connectorSpacing },
									]}
								/>
							)}
						</View>
						<View
							style={[
								styles.text,
								textGap != null && { gap: textGap },
								connector && !isLast && { paddingBottom: gap },
							]}
						>
							<Text style={[styles.title, titleStyle]}>{s.title}</Text>
							{!!s.body && <Text style={[styles.body, bodyStyle]}>{s.body}</Text>}
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
