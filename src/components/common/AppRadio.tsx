// src/components/common/AppRadio.tsx
//
// KarolaHealth radio indicator: 22px circle, 2px APP_COLORS.border ring; checked = APP_COLORS.primary ring + 12px dot.
// Purely visual by default — put accessibilityRole="radio" + accessibilityState on the pressable
// row that contains it. Pass `onPress` to make the radio itself pressable.

import React from 'react'
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { APP_COLORS } from '../../config/theme'

export type AppRadioProps = {
	checked: boolean
	/** Makes the radio itself pressable (44x44 hit area); otherwise it is decorative. */
	onPress?: () => void
	disabled?: boolean
	/** Outer diameter. Defaults to 22 (dot scales to 12/22 of it). */
	size?: number
	color?: string
	accessibilityLabel?: string
	style?: StyleProp<ViewStyle>
}

export function AppRadio({
	checked,
	onPress,
	disabled = false,
	size = 22,
	color = APP_COLORS.primary,
	accessibilityLabel,
	style,
}: AppRadioProps) {
	const dot = Math.round((size * 12) / 22)
	const circle = (
		<View
			style={[
				styles.outer,
				{ width: size, height: size, borderRadius: size / 2 },
				checked && { borderColor: color },
				disabled && styles.disabled,
				!onPress && style,
			]}
		>
			{checked && <View style={{ width: dot, height: dot, borderRadius: dot / 2, backgroundColor: color }} />}
		</View>
	)

	if (!onPress) return circle

	return (
		<Pressable
			onPress={onPress}
			disabled={disabled}
			hitSlop={Math.max(0, (44 - size) / 2)}
			accessibilityRole="radio"
			accessibilityState={{ checked, disabled }}
			accessibilityLabel={accessibilityLabel}
			style={style}
		>
			{circle}
		</Pressable>
	)
}

const styles = StyleSheet.create({
	outer: {
		borderWidth: 2,
		borderColor: APP_COLORS.border,
		backgroundColor: APP_COLORS.surface,
		alignItems: 'center',
		justifyContent: 'center',
	},
	disabled: {
		opacity: 0.45,
	},
})

export default AppRadio
