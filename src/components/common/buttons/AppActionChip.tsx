// src/components/common/buttons/AppActionChip.tsx
//
// Small inline action button from the KarolaHealth designs ("Add to calendar", "Directions",
// "Show QR", "Pay now"): 36 high, radius 10, 13/700 label. Outline (white, APP_COLORS.border) by default;
// `filled` = APP_COLORS.primary background with white label. Used by AppDetailRow and AppInfoBanner.

import React from 'react'
import { StyleSheet, Text, TouchableOpacity, type StyleProp, type ViewStyle } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { APP_COLORS } from '../../../config/theme'

type IconName = keyof typeof MaterialCommunityIcons.glyphMap

export type AppActionChipProps = {
	label: string
	onPress: () => void
	icon?: IconName
	filled?: boolean
	disabled?: boolean
	accessibilityLabel?: string
	style?: StyleProp<ViewStyle>
}

export function AppActionChip({
	label,
	onPress,
	icon,
	filled = false,
	disabled = false,
	accessibilityLabel,
	style,
}: AppActionChipProps) {
	return (
		<TouchableOpacity
			onPress={onPress}
			disabled={disabled}
			activeOpacity={0.85}
			accessibilityRole="button"
			accessibilityState={{ disabled }}
			accessibilityLabel={accessibilityLabel ?? label}
			style={[styles.chip, filled && styles.chipFilled, disabled && styles.disabled, style]}
		>
			{icon && <MaterialCommunityIcons name={icon} size={16} color={filled ? '#FFFFFF' : APP_COLORS.primary} />}
			<Text style={[styles.text, filled && styles.textFilled]} numberOfLines={1}>
				{label}
			</Text>
		</TouchableOpacity>
	)
}

const styles = StyleSheet.create({
	chip: {
		height: 36,
		paddingHorizontal: 12,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: APP_COLORS.border,
		backgroundColor: APP_COLORS.surface,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	chipFilled: {
		backgroundColor: APP_COLORS.primary,
		borderColor: APP_COLORS.primary,
	},
	disabled: {
		opacity: 0.5,
	},
	text: {
		fontSize: 13,
		fontWeight: '700',
		color: APP_COLORS.primary,
	},
	textFilled: {
		color: '#FFFFFF',
	},
})

export default AppActionChip
