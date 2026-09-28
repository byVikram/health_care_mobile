// src/components/common/display/AppProgressBar.tsx
//
// Rounded progress bar from the drawer's "Profile 72% complete" row: 5px high, fully rounded,
// white track (on the mint profile card) with an APP_COLORS.primary fill. Optional label on the right
// (12/16 700 ink, e.g. "72%").

import React from 'react'
import { StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native'
import { APP_COLORS } from '../../../config/theme'

export type AppProgressBarProps = {
	/** 0-100 (clamped). */
	value: number
	/** Bar height. Defaults to 5. */
	height?: number
	/** Track colour. Defaults to APP_COLORS.surface (white). */
	trackColor?: string
	/** Fill colour. Defaults to APP_COLORS.primary. */
	fillColor?: string
	/** Text shown to the right of the bar (e.g. "72%"). */
	label?: string
	/** Accessibility label, e.g. "Profile 72% complete". Defaults to `${value}%`. */
	accessibilityLabel?: string
	style?: StyleProp<ViewStyle>
	labelStyle?: StyleProp<TextStyle>
}

export function AppProgressBar({
	value,
	height = 5,
	trackColor = APP_COLORS.surface,
	fillColor = APP_COLORS.primary,
	label,
	accessibilityLabel,
	style,
	labelStyle,
}: AppProgressBarProps) {
	const pct = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0))
	const radius = height / 2
	return (
		<View
			style={[styles.row, style]}
			accessible
			accessibilityRole="progressbar"
			accessibilityLabel={accessibilityLabel ?? `${Math.round(pct)}%`}
			accessibilityValue={{ min: 0, max: 100, now: Math.round(pct) }}
		>
			<View style={[styles.track, { height, borderRadius: radius, backgroundColor: trackColor }]}>
				<View style={{ width: `${pct}%`, height: '100%', borderRadius: radius, backgroundColor: fillColor }} />
			</View>
			{!!label && <Text style={[styles.label, labelStyle]}>{label}</Text>}
		</View>
	)
}

const styles = StyleSheet.create({
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	track: {
		flex: 1,
		overflow: 'hidden',
	},
	label: {
		flexShrink: 0,
		fontSize: 12,
		lineHeight: 16,
		fontWeight: '700',
		color: APP_COLORS.ink,
	},
})

export default AppProgressBar
