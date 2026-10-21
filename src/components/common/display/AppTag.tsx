// src/components/common/display/AppTag.tsx
//
// Non-pressable status pill / tag from the KarolaHealth designs.
//   size 'xs' — 10/14 800 CAPS, letter-spacing 0.4, padding 1x6, radius 4 (promo "UP TO 32% OFF" on APP_COLORS.offer)
//   size 'sm' — 12/16 700, padding 2x8, radius 6 (wallet balance, speciality tags)
//   size 'md' — 13/18 700, padding 2x8, radius 6 (doctor "Today, 5:30 PM" slot tag)
//   shape 'pill' — fully round, padding 4x10 ("Confirmed" pill on the booking-confirmed page)
// Colour: `tone` = a TONES key, a STATUS_TONES key (confirmed / pending / inProgress / ...), 'ink'
// (ink bg + white, "From ₹199"), 'offer' (APP_COLORS.offer + white) or 'neutral' (pageBg + ink);
// or explicit `bg` / `ink`.

import React from 'react'
import { StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { APP_COLORS, STATUS_TONES, TONES, type StatusToneKey, type ToneKey } from '../../../config/theme'

type IconName = keyof typeof MaterialCommunityIcons.glyphMap

export type AppTagTone = ToneKey | StatusToneKey | 'ink' | 'offer' | 'neutral'

export type AppTagProps = {
	label: string
	/** Defaults to 'mint'. */
	tone?: AppTagTone
	/** Background override. */
	bg?: string
	/** Text / icon / dot colour override. */
	ink?: string
	/** Leading 6px dot in the ink colour (or pass a colour). */
	dot?: boolean | string
	icon?: IconName
	size?: 'xs' | 'sm' | 'md'
	shape?: 'pill' | 'rounded'
	/** Uppercase the label. Defaults to true for 'xs', false otherwise. */
	uppercase?: boolean
	accessibilityLabel?: string
	style?: StyleProp<ViewStyle>
	textStyle?: StyleProp<TextStyle>
}

const SPECIAL_TONES: Record<'ink' | 'offer' | 'neutral', { bg: string; ink: string }> = {
	ink: { bg: APP_COLORS.ink, ink: '#FFFFFF' },
	offer: { bg: APP_COLORS.offer, ink: '#FFFFFF' },
	neutral: { bg: APP_COLORS.pageBg, ink: APP_COLORS.ink },
}

const resolveTone = (tone: AppTagTone) =>
	(TONES as Record<string, { bg: string; ink: string }>)[tone] ??
	(STATUS_TONES as Record<string, { bg: string; ink: string }>)[tone] ??
	SPECIAL_TONES[tone as keyof typeof SPECIAL_TONES] ??
	TONES.mint

export function AppTag({
	label,
	tone = 'mint',
	bg,
	ink,
	dot,
	icon,
	size = 'sm',
	shape = 'rounded',
	uppercase,
	accessibilityLabel,
	style,
	textStyle,
}: AppTagProps) {
	const pair = resolveTone(tone)
	const bgColor = bg ?? pair.bg
	const fg = ink ?? pair.ink
	const xs = size === 'xs'
	const pill = shape === 'pill'
	const caps = uppercase ?? xs
	const iconSize = xs ? 10 : size === 'md' ? 14 : 12

	return (
		<View
			style={[
				styles.base,
				xs ? styles.padXs : pill ? styles.padPill : styles.padSm,
				{ backgroundColor: bgColor, borderRadius: pill ? 9999 : xs ? 4 : 6 },
				style,
			]}
			accessible
			accessibilityRole="text"
			accessibilityLabel={accessibilityLabel ?? label}
		>
			{!!dot && <View style={[styles.dot, { backgroundColor: typeof dot === 'string' ? dot : fg }]} />}
			{!!icon && <MaterialCommunityIcons name={icon} size={iconSize} color={fg} />}
			<Text
				style={[xs ? styles.textXs : size === 'md' ? styles.textMd : styles.textSm, { color: fg }, textStyle]}
				numberOfLines={1}
			>
				{caps ? label.toUpperCase() : label}
			</Text>
		</View>
	)
}

const styles = StyleSheet.create({
	base: {
		alignSelf: 'flex-start',
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	padXs: {
		paddingHorizontal: 6,
		paddingVertical: 1,
	},
	padSm: {
		paddingHorizontal: 8,
		paddingVertical: 2,
	},
	padPill: {
		paddingHorizontal: 10,
		paddingVertical: 4,
	},
	dot: {
		width: 6,
		height: 6,
		borderRadius: 3,
	},
	textXs: {
		fontSize: 10,
		lineHeight: 14,
		fontWeight: '800',
		letterSpacing: 0.4,
	},
	textSm: {
		fontSize: 12,
		lineHeight: 16,
		fontWeight: '700',
	},
	textMd: {
		fontSize: 13,
		lineHeight: 18,
		fontWeight: '700',
	},
})

export default AppTag
