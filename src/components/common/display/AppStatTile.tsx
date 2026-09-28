// src/components/common/display/AppStatTile.tsx
//
// Tinted stat box from the doctor-profile design ("Experience 14 yrs", "Clinic visit ₹800", "Video call ₹600"):
// padding 12, radius 16, TONES[tone].bg, gap 2; label 12/16 600 in the tone ink, value 18/24 800 APP_COLORS.ink.
// AppStatRow lays tiles out in equal-width columns with an 8px gap.

import React from 'react'
import { StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native'
import { APP_COLORS, TONES, type ToneKey } from '../../../config/theme'

export type AppStatTileProps = {
	label: string
	value: string | number
	/** Defaults to 'mint'. */
	tone?: ToneKey
	/** Background override (tone.bg otherwise). */
	backgroundColor?: string
	/** Label colour override (tone.ink otherwise). */
	labelColor?: string
	accessibilityLabel?: string
	style?: StyleProp<ViewStyle>
	valueStyle?: StyleProp<TextStyle>
}

export function AppStatTile({
	label,
	value,
	tone = 'mint',
	backgroundColor,
	labelColor,
	accessibilityLabel,
	style,
	valueStyle,
}: AppStatTileProps) {
	const pair = TONES[tone]
	return (
		<View
			style={[styles.tile, { backgroundColor: backgroundColor ?? pair.bg }, style]}
			accessible
			accessibilityLabel={accessibilityLabel ?? `${label}: ${value}`}
		>
			<Text style={[styles.label, { color: labelColor ?? pair.ink }]} numberOfLines={1}>
				{label}
			</Text>
			<Text style={[styles.value, valueStyle]} numberOfLines={1}>
				{value}
			</Text>
		</View>
	)
}

export type AppStatRowProps = {
	children: React.ReactNode
	/** Gap between tiles. Defaults to 8. */
	gap?: number
	style?: StyleProp<ViewStyle>
}

/** Equal-width columns: each child is wrapped in a flex: 1 cell. */
export function AppStatRow({ children, gap = 8, style }: AppStatRowProps) {
	const items = React.Children.toArray(children)
	return (
		<View style={[styles.row, { gap }, style]}>
			{items.map((child, i) => (
				<View key={(child as React.ReactElement).key ?? i} style={styles.cell}>
					{child}
				</View>
			))}
		</View>
	)
}

const styles = StyleSheet.create({
	tile: {
		padding: 12,
		borderRadius: 16,
		gap: 2,
		flexGrow: 1,
	},
	label: {
		fontSize: 12,
		lineHeight: 16,
		fontWeight: '600',
	},
	value: {
		fontSize: 18,
		lineHeight: 24,
		fontWeight: '800',
		color: APP_COLORS.ink,
	},
	row: {
		flexDirection: 'row',
		alignItems: 'stretch',
	},
	cell: {
		flex: 1,
		minWidth: 0,
	},
})

export default AppStatTile
