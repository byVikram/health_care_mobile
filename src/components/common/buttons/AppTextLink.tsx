// src/components/common/buttons/AppTextLink.tsx
//
// Inline text link from the KarolaHealth designs ("View all ›", "Manage ›", "View profile ›"):
// 14/20 700 (md) or 13/18 700 (sm) primary text, trailing chevron with a 2px gap. The touch target is
// padded to at least 44 high via hitSlop so the visual size stays compact.

import React from 'react'
import { StyleSheet, Text, TouchableOpacity, type StyleProp, type TextStyle, type ViewStyle } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { APP_COLORS } from '../../../config/theme'

type IconName = keyof typeof MaterialCommunityIcons.glyphMap

export type AppTextLinkTone = 'primary' | 'danger' | 'muted'

export type AppTextLinkProps = {
	label: string
	onPress: () => void
	/** Glyph after the label. Defaults to 'chevron-right'; 'none' hides it. */
	trailingIcon?: IconName | 'none'
	leadingIcon?: IconName
	tone?: AppTextLinkTone
	/** 'sm' = 13/18, 'md' = 14/20 (default). */
	size?: 'sm' | 'md'
	weight?: TextStyle['fontWeight']
	disabled?: boolean
	accessibilityLabel?: string
	accessibilityHint?: string
	style?: StyleProp<ViewStyle>
	textStyle?: StyleProp<TextStyle>
}

const TONE_COLOR: Record<AppTextLinkTone, string> = {
	primary: APP_COLORS.primary,
	danger: APP_COLORS.danger,
	muted: APP_COLORS.inkMuted,
}

export function AppTextLink({
	label,
	onPress,
	trailingIcon = 'chevron-right',
	leadingIcon,
	tone = 'primary',
	size = 'md',
	weight = '700',
	disabled = false,
	accessibilityLabel,
	accessibilityHint,
	style,
	textStyle,
}: AppTextLinkProps) {
	const color = TONE_COLOR[tone]
	const sm = size === 'sm'
	const lineHeight = sm ? 18 : 20
	const iconSize = sm ? 16 : 18
	const slop = Math.ceil((44 - lineHeight) / 2)

	return (
		<TouchableOpacity
			onPress={onPress}
			disabled={disabled}
			activeOpacity={0.7}
			accessibilityRole="link"
			accessibilityLabel={accessibilityLabel ?? label}
			accessibilityHint={accessibilityHint}
			accessibilityState={{ disabled }}
			hitSlop={{ top: slop, bottom: slop, left: 8, right: 8 }}
			style={[styles.row, disabled && styles.disabled, style]}
		>
			{!!leadingIcon && <MaterialCommunityIcons name={leadingIcon} size={iconSize} color={color} />}
			<Text
				style={[{ fontSize: sm ? 13 : 14, lineHeight, fontWeight: weight, color }, textStyle]}
				numberOfLines={1}
			>
				{label}
			</Text>
			{trailingIcon !== 'none' && <MaterialCommunityIcons name={trailingIcon} size={iconSize} color={color} />}
		</TouchableOpacity>
	)
}

const styles = StyleSheet.create({
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 2,
		flexShrink: 0,
	},
	disabled: {
		opacity: 0.5,
	},
})

export default AppTextLink
