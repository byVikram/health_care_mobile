// src/components/common/inputs/AppQuantityStepper.tsx
//
// Small "− 1 +" stepper from the KarolaHealth cart designs (size 'sm' = 36px high, outlined in primary).
// `min` defaults to 0 so stepping down from 1 removes the line; `max` disables the plus (labs: 1 per test).

import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { APP_COLORS } from '../../../config/theme'

export type AppQuantityStepperProps = {
	value: number
	onChange: (next: number) => void
	min?: number
	max?: number
	/** Accessible name of the item, e.g. "Complete Blood Count". */
	itemLabel?: string
	style?: StyleProp<ViewStyle>
}

export function AppQuantityStepper({ value, onChange, min = 0, max = 99, itemLabel, style }: AppQuantityStepperProps) {
	const canDown = value > min
	const canUp = value < max
	const noun = itemLabel ? ` ${itemLabel}` : ''
	return (
		<View style={[styles.wrap, style]} accessibilityRole="adjustable" accessibilityValue={{ now: value, min, max }}>
			<TouchableOpacity
				style={styles.btn}
				disabled={!canDown}
				onPress={() => onChange(value - 1)}
				accessibilityRole="button"
				accessibilityLabel={`${value <= 1 && min === 0 ? 'Remove' : 'Decrease quantity of'}${noun}`}
			>
				<MaterialCommunityIcons
					name="minus"
					size={18}
					color={canDown ? APP_COLORS.primary : APP_COLORS.inkDisabled}
				/>
			</TouchableOpacity>
			<Text style={styles.value}>{value}</Text>
			<TouchableOpacity
				style={styles.btn}
				disabled={!canUp}
				onPress={() => onChange(value + 1)}
				accessibilityRole="button"
				accessibilityLabel={`Increase quantity of${noun}`}
			>
				<MaterialCommunityIcons
					name="plus"
					size={18}
					color={canUp ? APP_COLORS.primary : APP_COLORS.inkDisabled}
				/>
			</TouchableOpacity>
		</View>
	)
}

const styles = StyleSheet.create({
	wrap: {
		height: 36,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: APP_COLORS.primary,
		backgroundColor: APP_COLORS.surface,
		flexDirection: 'row',
		alignItems: 'center',
	},
	btn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
	value: {
		minWidth: 22,
		textAlign: 'center',
		fontSize: 15,
		lineHeight: 20,
		fontWeight: '700',
		color: APP_COLORS.ink,
	},
})
