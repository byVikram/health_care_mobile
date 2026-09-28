// src/components/common/buttons/AppIconButton.tsx
//
// Icon-only square / circular button from the KarolaHealth designs.
//   variant 'outline' — white bg, 1px APP_COLORS.border, primary icon (clinic "Directions": 40, radius 10, 18 icon)
//   variant 'soft'    — APP_COLORS.mint bg, primary icon
//   variant 'ghost'   — transparent bg, white icon (header icons on the teal / ink bar; pass
//                       `backgroundColor="#FFFFFF1F"` for the home bell's 12% white tile: 44, radius 12, 22 icon)
//   variant 'filled'  — APP_COLORS.primary bg, white icon
// `badge`: `true` = 9px APP_COLORS.mintAccent dot with a 2px ink ring at right 10 / top 9 (bell "1 new"),
// number = count bubble. Buttons under 44 get a hitSlop so the touch target stays >= 44.

import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { APP_COLORS } from '../../../config/theme'

type IconName = keyof typeof MaterialCommunityIcons.glyphMap

export type AppIconButtonVariant = 'outline' | 'soft' | 'ghost' | 'filled'

export type AppIconButtonProps = {
	/** MaterialCommunityIcons glyph. Ignored when `children` is given. */
	icon?: IconName
	children?: React.ReactNode
	onPress?: () => void
	/** Required: icon-only buttons have no visible text. */
	accessibilityLabel: string
	accessibilityHint?: string
	/** Edge length. Defaults to 40. */
	size?: 36 | 40 | 44
	/** Corner radius. Defaults to 10; ignored when `circle`. */
	radius?: number
	circle?: boolean
	variant?: AppIconButtonVariant
	/** Icon colour override (defaults per variant). */
	iconColor?: string
	/** Glyph size override. Defaults to 18 (36/40) or 22 (44). */
	iconSize?: number
	/** Background override (e.g. '#FFFFFF1F' for a translucent tile on a dark header). */
	backgroundColor?: string
	disabled?: boolean
	/** `true` = dot, number > 0 = count bubble (99+ capped). 0 / false hides it. */
	badge?: number | boolean
	/** Ring colour around the badge (match the surface behind the button). Defaults to APP_COLORS.ink. */
	badgeRingColor?: string
	hitSlop?: number
	style?: StyleProp<ViewStyle>
	testID?: string
}

const VARIANT_STYLE: Record<AppIconButtonVariant, { bg: string; border?: string; icon: string }> = {
	outline: { bg: APP_COLORS.surface, border: APP_COLORS.border, icon: APP_COLORS.primary },
	soft: { bg: APP_COLORS.mint, icon: APP_COLORS.primary },
	ghost: { bg: 'transparent', icon: '#FFFFFF' },
	filled: { bg: APP_COLORS.primary, icon: '#FFFFFF' },
}

export function AppIconButton({
	icon,
	children,
	onPress,
	accessibilityLabel,
	accessibilityHint,
	size = 40,
	radius = 10,
	circle = false,
	variant = 'outline',
	iconColor,
	iconSize,
	backgroundColor,
	disabled = false,
	badge,
	badgeRingColor = APP_COLORS.ink,
	hitSlop,
	style,
	testID,
}: AppIconButtonProps) {
	const v = VARIANT_STYLE[variant]
	const glyphSize = iconSize ?? (size === 44 ? 22 : 18)
	const showDot = badge === true
	const count = typeof badge === 'number' && badge > 0 ? badge : 0
	const pad = hitSlop ?? (size < 44 ? Math.ceil((44 - size) / 2) : 0)

	return (
		<TouchableOpacity
			onPress={onPress}
			disabled={disabled || !onPress}
			activeOpacity={0.8}
			accessibilityRole="button"
			accessibilityLabel={accessibilityLabel}
			accessibilityHint={accessibilityHint}
			accessibilityState={{ disabled }}
			hitSlop={pad ? { top: pad, bottom: pad, left: pad, right: pad } : undefined}
			testID={testID}
			style={[
				styles.base,
				{
					width: size,
					height: size,
					borderRadius: circle ? size / 2 : radius,
					backgroundColor: backgroundColor ?? v.bg,
				},
				v.border ? { borderWidth: 1, borderColor: v.border } : null,
				disabled && styles.disabled,
				style,
			]}
		>
			{children ?? (icon ? <MaterialCommunityIcons name={icon} size={glyphSize} color={iconColor ?? v.icon} /> : null)}
			{showDot && (
				<View
					style={[styles.dot, { borderColor: badgeRingColor, right: size === 44 ? 10 : 7, top: size === 44 ? 9 : 6 }]}
					importantForAccessibility="no"
				/>
			)}
			{count > 0 && (
				<View style={[styles.count, { borderColor: badgeRingColor }]} importantForAccessibility="no">
					<Text style={styles.countText} numberOfLines={1}>
						{count > 99 ? '99+' : count}
					</Text>
				</View>
			)}
		</TouchableOpacity>
	)
}

const styles = StyleSheet.create({
	base: {
		alignItems: 'center',
		justifyContent: 'center',
	},
	disabled: {
		opacity: 0.5,
	},
	dot: {
		position: 'absolute',
		// CSS: 9px dot + 2px border (content-box) = 13px overall
		width: 13,
		height: 13,
		borderRadius: 6.5,
		borderWidth: 2,
		backgroundColor: APP_COLORS.mintAccent,
	},
	count: {
		position: 'absolute',
		top: -4,
		right: -4,
		minWidth: 18,
		height: 18,
		paddingHorizontal: 4,
		borderRadius: 9,
		borderWidth: 2,
		backgroundColor: APP_COLORS.danger,
		alignItems: 'center',
		justifyContent: 'center',
	},
	countText: {
		color: '#FFFFFF',
		fontSize: 10,
		lineHeight: 12,
		fontWeight: '800',
	},
})

export default AppIconButton
