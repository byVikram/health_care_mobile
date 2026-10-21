// src/components/common/display/AppIconTile.tsx
//
// Rounded-square (or circular) tile holding an icon — the design's icon tiles on detail rows,
// payment methods, clinic cards, banners, practise cards. Colour it with a `tone` from TONES,
// or explicit `backgroundColor` / `iconColor`.

import React from 'react'
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { APP_COLORS, TONES, type ToneKey } from '../../../config/theme'

type IconName = keyof typeof MaterialCommunityIcons.glyphMap

export type AppIconTileProps = {
	/** MaterialCommunityIcons glyph. Ignored when `children` is given (e.g. a <AppIcon />). */
	icon?: IconName
	children?: React.ReactNode
	/** Soft tone pair from TONES. Defaults to 'mint' when no backgroundColor is given. */
	tone?: ToneKey
	/** Tile background (overrides tone.bg). */
	backgroundColor?: string
	/** Icon colour (overrides tone.ink). */
	iconColor?: string
	/** Tile edge length. Defaults to 40. */
	size?: number
	/** Corner radius. Defaults to 10; pass `circle` for a round tile. */
	radius?: number
	circle?: boolean
	/** Icon glyph size. Defaults to ~half the tile (40 -> 20, 36 -> 18, 44 -> 22). */
	iconSize?: number
	borderColor?: string
	style?: StyleProp<ViewStyle>
	accessibilityLabel?: string
}

export function AppIconTile({
	icon,
	children,
	tone,
	backgroundColor,
	iconColor,
	size = 40,
	radius = 10,
	circle = false,
	iconSize,
	borderColor,
	style,
	accessibilityLabel,
}: AppIconTileProps) {
	const pair = tone ? TONES[tone] : TONES.mint
	const bg = backgroundColor ?? pair.bg
	const ink = iconColor ?? (tone ? pair.ink : APP_COLORS.primary)
	return (
		<View
			style={[
				styles.tile,
				{
					width: size,
					height: size,
					borderRadius: circle ? size / 2 : radius,
					backgroundColor: bg,
				},
				borderColor ? { borderWidth: 1, borderColor } : null,
				style,
			]}
			accessible={accessibilityLabel ? true : undefined}
			accessibilityLabel={accessibilityLabel}
			importantForAccessibility={accessibilityLabel ? undefined : 'no-hide-descendants'}
		>
			{children ??
				(icon ? (
					<MaterialCommunityIcons name={icon} size={iconSize ?? Math.round(size / 2)} color={ink} />
				) : null)}
		</View>
	)
}

const styles = StyleSheet.create({
	tile: {
		alignItems: 'center',
		justifyContent: 'center',
	},
})

export default AppIconTile
