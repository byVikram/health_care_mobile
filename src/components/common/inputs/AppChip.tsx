// src/components/common/inputs/AppChip.tsx
//
// Selectable chip from the KarolaHealth designs.
//   variant 'solid' — selected = APP_COLORS.primary bg + white text (relationship chips, profile tabs).
//   variant 'soft'  — selected = APP_COLORS.mint bg + APP_COLORS.primary border, ink text (search filter toggles).
//   shape  'pill' (fully round) | 'rounded' (radius 8, override with `radius`).
//   size   'sm' = 36 high, 12px padding, 13/18 text | 'md' = 40 high, 16px padding, 14/20 text.

import React from 'react'
import {
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
	type AccessibilityRole,
	type StyleProp,
	type TextStyle,
	type ViewStyle,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { APP_COLORS } from '../../../config/theme'

type IconName = keyof typeof MaterialCommunityIcons.glyphMap

export type AppChipProps = {
	label: string
	selected?: boolean
	onPress?: () => void
	variant?: 'solid' | 'soft'
	shape?: 'pill' | 'rounded'
	size?: 'sm' | 'md'
	/** Corner radius override (e.g. 10 for the doctor-profile tabs). */
	radius?: number
	/** Leading MaterialCommunityIcons glyph. */
	icon?: IconName
	/** Leading 6px dot; `true` uses the current text colour, or pass a colour. */
	dot?: boolean | string
	/** Prefix "✓ " while selected (design search toggles). */
	checkmark?: boolean
	disabled?: boolean
	/** Unselected border colour. Defaults to APP_COLORS.border. */
	borderColor?: string
	/** Defaults to 'button' (with selected state); use 'radio' inside a radiogroup. */
	accessibilityRole?: AccessibilityRole
	accessibilityLabel?: string
	style?: StyleProp<ViewStyle>
	textStyle?: StyleProp<TextStyle>
}

export function AppChip({
	label,
	selected = false,
	onPress,
	variant = 'solid',
	shape = 'pill',
	size = 'md',
	radius,
	icon,
	dot,
	checkmark = false,
	disabled = false,
	borderColor,
	accessibilityRole = 'button',
	accessibilityLabel,
	style,
	textStyle,
}: AppChipProps) {
	const solidOn = selected && variant === 'solid'
	const softOn = selected && variant === 'soft'
	const textColor = solidOn ? '#FFFFFF' : APP_COLORS.ink
	const iconColor = solidOn ? '#FFFFFF' : APP_COLORS.primary
	const borderRadius = radius ?? (shape === 'pill' ? 9999 : 8)
	const isRadio = accessibilityRole === 'radio'

	return (
		<TouchableOpacity
			onPress={onPress}
			disabled={disabled || !onPress}
			activeOpacity={0.82}
			accessibilityRole={accessibilityRole}
			accessibilityState={isRadio ? { checked: selected, disabled } : { selected, disabled }}
			accessibilityLabel={accessibilityLabel}
			style={[
				styles.base,
				size === 'sm' ? styles.sm : styles.md,
				{ borderRadius },
				borderColor ? { borderColor } : null,
				solidOn && styles.solidOn,
				softOn && styles.softOn,
				disabled && styles.disabled,
				style,
			]}
		>
			{!!dot && <View style={[styles.dot, { backgroundColor: typeof dot === 'string' ? dot : textColor }]} />}
			{!!icon && <MaterialCommunityIcons name={icon} size={size === 'sm' ? 14 : 16} color={iconColor} />}
			<Text
				style={[size === 'sm' ? styles.textSm : styles.textMd, { color: textColor }, textStyle]}
				numberOfLines={1}
			>
				{checkmark && selected ? '✓ ' : ''}
				{label}
			</Text>
		</TouchableOpacity>
	)
}

const styles = StyleSheet.create({
	base: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 6,
		borderWidth: 1,
		borderColor: APP_COLORS.border,
		backgroundColor: APP_COLORS.surface,
	},
	sm: {
		height: 36,
		paddingHorizontal: 12,
	},
	md: {
		height: 40,
		paddingHorizontal: 16,
	},
	solidOn: {
		backgroundColor: APP_COLORS.primary,
		borderColor: APP_COLORS.primary,
	},
	softOn: {
		backgroundColor: APP_COLORS.mint,
		borderColor: APP_COLORS.primary,
	},
	disabled: {
		opacity: 0.5,
	},
	dot: {
		width: 6,
		height: 6,
		borderRadius: 3,
	},
	textSm: {
		fontSize: 13,
		lineHeight: 18,
		fontWeight: '600',
	},
	textMd: {
		fontSize: 14,
		lineHeight: 20,
		fontWeight: '600',
	},
})

export default AppChip
