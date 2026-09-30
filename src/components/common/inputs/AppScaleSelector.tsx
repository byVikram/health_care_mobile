// src/components/common/inputs/AppScaleSelector.tsx
//
// 0..10 score picker from the physio "Session in progress" design ("Pain after session"): a wrapping row
// of 32px rounded number buttons tinted by band -- low (0-3) successBg, mid (4-6) warningBg, high (7-10)
// dangerBg -- the selected one filled primary with white text; optional end labels ("No pain" / "Worst
// pain") underneath. Acts as a radio group.

import React from 'react'
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { APP_COLORS } from '../../../config/theme'

export type AppScaleSelectorProps = {
	value: number | null
	onChange: (value: number) => void
	min?: number
	max?: number
	/** Scores >= midFrom get the warning tint, >= highFrom the danger tint. */
	midFrom?: number
	highFrom?: number
	minLabel?: string
	maxLabel?: string
	disabled?: boolean
	/** Group label for accessibility, e.g. "Pain after session". */
	accessibilityLabel?: string
	style?: StyleProp<ViewStyle>
}

export function AppScaleSelector({
	value,
	onChange,
	min = 0,
	max = 10,
	midFrom = 4,
	highFrom = 7,
	minLabel,
	maxLabel,
	disabled = false,
	accessibilityLabel,
	style,
}: AppScaleSelectorProps) {
	const values = Array.from({ length: max - min + 1 }, (_, i) => min + i)
	return (
		<View style={[styles.root, style]}>
			<View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel}>
				{values.map((n) => {
					const on = value === n
					const bg = on
						? APP_COLORS.primary
						: n >= highFrom
							? APP_COLORS.dangerBg
							: n >= midFrom
								? APP_COLORS.warningBg
								: APP_COLORS.successBg
					return (
						<Pressable
							key={n}
							onPress={() => onChange(n)}
							disabled={disabled}
							accessibilityRole="radio"
							accessibilityState={{ selected: on, disabled }}
							accessibilityLabel={String(n)}
							style={({ pressed }) => [styles.cell, { backgroundColor: bg }, pressed && styles.pressed]}
						>
							<Text style={[styles.num, on && styles.numOn]}>{n}</Text>
						</Pressable>
					)
				})}
			</View>
			{minLabel || maxLabel ? (
				<View style={styles.labels}>
					<Text style={styles.endLabel}>{minLabel}</Text>
					<Text style={styles.endLabel}>{maxLabel}</Text>
				</View>
			) : null}
		</View>
	)
}

const styles = StyleSheet.create({
	root: {
		gap: 6,
	},
	row: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 6,
	},
	cell: {
		width: 32,
		height: 36,
		borderRadius: 8,
		alignItems: 'center',
		justifyContent: 'center',
	},
	pressed: {
		opacity: 0.8,
	},
	num: {
		fontSize: 14,
		lineHeight: 20,
		fontWeight: '800',
		color: APP_COLORS.ink,
	},
	numOn: {
		color: APP_COLORS.surface,
	},
	labels: {
		flexDirection: 'row',
		justifyContent: 'space-between',
	},
	endLabel: {
		fontSize: 12,
		lineHeight: 16,
		color: APP_COLORS.inkMuted,
	},
})

export default AppScaleSelector
