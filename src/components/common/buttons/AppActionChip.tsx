// src/components/common/buttons/AppActionChip.tsx
//
// Small inline action button from the KarolaHealth designs ("Add to calendar", "Directions",
// "Show QR", "Pay now"): 36 high, radius 10, 13/700 label. Outline (white, APP_COLORS.border) by default;
// `filled` = APP_COLORS.primary background with white label. Used by AppDetailRow and AppInfoBanner.
//   size 'sm' (default) = 36 high, 13/700 | 'md' = 40 high, 14/700.
//   variant 'tinted' = the Confirmed page's grid actions: 44 high, radius 12, TONES[tone].bg (default mint)
//                      with APP_COLORS.ink 14/700 label + icon, centred, gap 6 (ignores `size`).

import React from 'react'
import {
	ActivityIndicator,
	StyleSheet,
	Text,
	TouchableOpacity,
	type StyleProp,
	type ViewStyle,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { APP_COLORS, TONES, type ToneKey } from '../../../config/theme'

type IconName = keyof typeof MaterialCommunityIcons.glyphMap

export type AppActionChipProps = {
	label: string
	onPress: () => void
	icon?: IconName
	/** Glyph after the label. */
	trailingIcon?: IconName
	/** Shorthand for `variant="filled"` (kept for existing callers). */
	filled?: boolean
	/** Defaults to 'filled' when `filled` is set, else 'outline'. */
	variant?: 'outline' | 'filled' | 'tinted'
	/** 'tinted' only: TONES key for the background. Defaults to 'mint'. */
	tone?: ToneKey
	size?: 'sm' | 'md'
	/** Replaces the leading icon with a spinner and blocks presses. */
	loading?: boolean
	disabled?: boolean
	accessibilityLabel?: string
	style?: StyleProp<ViewStyle>
}

export function AppActionChip({
	label,
	onPress,
	icon,
	trailingIcon,
	filled = false,
	variant,
	tone = 'mint',
	size = 'sm',
	loading = false,
	disabled = false,
	accessibilityLabel,
	style,
}: AppActionChipProps) {
	const kind = variant ?? (filled ? 'filled' : 'outline')
	const isFilled = kind === 'filled'
	const isTinted = kind === 'tinted'
	const fg = isFilled ? '#FFFFFF' : isTinted ? APP_COLORS.ink : APP_COLORS.primary
	const blocked = disabled || loading

	return (
		<TouchableOpacity
			onPress={onPress}
			disabled={blocked}
			activeOpacity={0.85}
			accessibilityRole="button"
			accessibilityState={{ disabled: blocked, busy: loading }}
			accessibilityLabel={accessibilityLabel ?? label}
			style={[
				styles.chip,
				!isTinted && size === 'md' && styles.chipMd,
				isFilled && styles.chipFilled,
				isTinted && [styles.chipTinted, { backgroundColor: TONES[tone].bg }],
				disabled && styles.disabled,
				style,
			]}
		>
			{loading ? (
				<ActivityIndicator size="small" color={fg} />
			) : (
				icon && <MaterialCommunityIcons name={icon} size={isTinted ? 18 : 16} color={fg} />
			)}
			<Text
				style={[styles.text, (isTinted || size === 'md') && styles.textMd, { color: fg }]}
				numberOfLines={1}
			>
				{label}
			</Text>
			{!!trailingIcon && <MaterialCommunityIcons name={trailingIcon} size={isTinted ? 18 : 16} color={fg} />}
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
	chipMd: {
		height: 40,
	},
	chipFilled: {
		backgroundColor: APP_COLORS.primary,
		borderColor: APP_COLORS.primary,
	},
	chipTinted: {
		height: 44,
		borderRadius: 12,
		borderWidth: 0,
		justifyContent: 'center',
		gap: 6,
	},
	disabled: {
		opacity: 0.5,
	},
	text: {
		fontSize: 13,
		fontWeight: '700',
		color: APP_COLORS.primary,
	},
	textMd: {
		fontSize: 14,
	},
})

export default AppActionChip
