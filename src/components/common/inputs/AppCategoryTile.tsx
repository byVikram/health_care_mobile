// src/components/common/inputs/AppCategoryTile.tsx
//
// Selectable category tile from the "My bookings" design (All / Doctor / Home care / Lab / Pharmacy row):
//   tile: column, gap 4, padding 8 2 6, radius 12, 2px border (APP_COLORS.divider; active = tone ink),
//         white background (active = tone bg). Meant to sit in an equal-width row (flex 1).
//   34px round icon (tone bg + tone-ink glyph; active = tone-ink fill + white glyph), optional count badge
//   (APP_COLORS.ink pill, 10/16 800 white, top-right), label 11/14 700 ink.
// Pass an SVG path (`iconPath`, 24x24 grid, 2 stroke) or a MaterialCommunityIcons glyph (`icon`).

import React from 'react'
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { APP_COLORS, TONES, type ToneKey } from '../../../config/theme'
import { AppPathIcon } from '../display/AppIcon'

type IconName = keyof typeof MaterialCommunityIcons.glyphMap

export type AppCategoryTileProps = {
	label: string
	/** SVG path(s) on a 24x24 grid. Takes precedence over `icon`. */
	iconPath?: string | string[]
	icon?: IconName
	/** Defaults to 'mint'. */
	tone?: ToneKey
	active?: boolean
	/** Badge count; hidden when null / undefined / 0. */
	count?: number | null
	onPress: () => void
	accessibilityLabel?: string
	style?: StyleProp<ViewStyle>
}

export function AppCategoryTile({
	label,
	iconPath,
	icon,
	tone = 'mint',
	active = false,
	count,
	onPress,
	accessibilityLabel,
	style,
}: AppCategoryTileProps) {
	const pair = TONES[tone]
	const glyph = active ? APP_COLORS.surface : pair.ink
	const showCount = typeof count === 'number' && count > 0
	return (
		<Pressable
			onPress={onPress}
			accessibilityRole="button"
			accessibilityState={{ selected: active }}
			accessibilityLabel={
				accessibilityLabel ?? (showCount ? `${label}, ${count} ${count === 1 ? 'booking' : 'bookings'}` : label)
			}
			style={({ pressed }) => [
				styles.tile,
				{
					borderColor: active ? pair.ink : APP_COLORS.divider,
					backgroundColor: active ? pair.bg : APP_COLORS.surface,
				},
				pressed && styles.pressed,
				style,
			]}
		>
			<View style={[styles.circle, { backgroundColor: active ? pair.ink : pair.bg }]}>
				{iconPath ? (
					<AppPathIcon d={iconPath} size={18} strokeWidth={2} color={glyph} />
				) : icon ? (
					<MaterialCommunityIcons name={icon} size={18} color={glyph} />
				) : null}
				{showCount && (
					<View style={styles.badge}>
						<Text style={styles.badgeText} numberOfLines={1}>
							{count! > 99 ? '99+' : String(count)}
						</Text>
					</View>
				)}
			</View>
			<Text style={styles.label} numberOfLines={1}>
				{label}
			</Text>
		</Pressable>
	)
}

const styles = StyleSheet.create({
	tile: {
		flex: 1,
		minWidth: 0,
		alignItems: 'center',
		gap: 4,
		paddingTop: 8,
		paddingBottom: 6,
		paddingHorizontal: 2,
		borderRadius: 12,
		borderWidth: 2,
	},
	pressed: {
		opacity: 0.9,
	},
	circle: {
		width: 34,
		height: 34,
		borderRadius: 17,
		alignItems: 'center',
		justifyContent: 'center',
	},
	badge: {
		position: 'absolute',
		right: -6,
		top: -4,
		minWidth: 16,
		height: 16,
		paddingHorizontal: 4,
		borderRadius: 9999,
		backgroundColor: APP_COLORS.ink,
		alignItems: 'center',
		justifyContent: 'center',
	},
	badgeText: {
		fontSize: 10,
		lineHeight: 16,
		fontWeight: '800',
		color: APP_COLORS.surface,
		textAlign: 'center',
	},
	label: {
		fontSize: 11,
		lineHeight: 14,
		fontWeight: '700',
		color: APP_COLORS.ink,
	},
})

export default AppCategoryTile
