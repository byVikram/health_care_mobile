// src/components/common/display/AppInfoBanner.tsx
//
// Tone banner from the Appointment-details designs.
//   size 'compact' (default) — 12px padding, radius 12, 32px WHITE tile with a tone-coloured icon,
//                              14/20 800 tone-coloured title, 12/16 ink subtitle ("Payment pending").
//   size 'prominent'         — 16px padding, radius 14, 40px tone-FILLED tile with a white icon,
//                              optional 11/14 800 caps eyebrow, 17/22 800 ink title, 13/18 muted
//                              subtitle ("CANCELLED" banner).
// Optional action chip on the right (label + onPress), or under the text with actionPlacement="below" (full width, centred; a long title
// and subtitle then keep the whole banner width), or any custom `right` node.
// `onPress` makes the whole banner a button (`chevron` adds a trailing 20px chevron in the tone colour).

import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { APP_COLORS, TONES } from '../../../config/theme'
import { AppActionChip } from '../buttons/AppActionChip'

type IconName = keyof typeof MaterialCommunityIcons.glyphMap

export type AppInfoBannerTone = 'success' | 'warning' | 'danger' | 'info' | 'sky'

export const INFO_BANNER_TONES: Record<AppInfoBannerTone, { fg: string; bg: string }> = {
	success: { fg: APP_COLORS.success, bg: APP_COLORS.successBg },
	warning: { fg: APP_COLORS.warning, bg: APP_COLORS.warningBg },
	danger: { fg: APP_COLORS.danger, bg: APP_COLORS.dangerBg },
	info: { fg: APP_COLORS.primary, bg: APP_COLORS.mint },
	sky: { fg: TONES.sky.ink, bg: TONES.sky.bg },
}

const DEFAULT_ICON: Record<AppInfoBannerTone, IconName> = {
	success: 'check',
	warning: 'clock-outline',
	danger: 'close',
	info: 'information-outline',
	sky: 'video-outline',
}

export type AppInfoBannerAction = {
	label: string
	onPress: () => void
	icon?: IconName
	/** Filled (APP_COLORS.primary) chip. Defaults to true, as in the design's "Pay now" / "View". */
	filled?: boolean
}

export type AppInfoBannerProps = {
	tone?: AppInfoBannerTone
	title: string
	subtitle?: string
	/** Small caps line above the title (shown in 'prominent' size, tone-coloured). */
	eyebrow?: string
	/** Defaults per tone (check / clock / close / info / video). Pass null to hide the tile. */
	icon?: IconName | null
	size?: 'compact' | 'prominent'
	/** Tile edge length (32-44). Defaults to 32 compact / 40 prominent. */
	tileSize?: number
	action?: AppInfoBannerAction
	/** Where the action chip goes: on the right (default) or as a full-width button under the text. */
	actionPlacement?: 'right' | 'below'
	/** Custom right-hand node (overrides `action`). */
	right?: React.ReactNode
	/** Makes the whole banner pressable (accessibilityRole 'button'). */
	onPress?: () => void
	/** Trailing chevron-right when pressable. Defaults to false. */
	chevron?: boolean
	/** Accessibility label for the pressable banner. Defaults to title + subtitle. */
	accessibilityLabel?: string
	/** Title text override (applied after the size/tone styles). */
	titleStyle?: StyleProp<TextStyle>
	style?: StyleProp<ViewStyle>
}

export function AppInfoBanner({
	tone = 'info',
	title,
	subtitle,
	eyebrow,
	icon,
	size = 'compact',
	tileSize,
	action,
	actionPlacement = 'right',
	right,
	onPress,
	chevron = false,
	accessibilityLabel,
	titleStyle,
	style,
}: AppInfoBannerProps) {
	const { fg, bg } = INFO_BANNER_TONES[tone]
	const prominent = size === 'prominent'
	const tile = tileSize ?? (prominent ? 40 : 32)
	const glyph = icon === undefined ? DEFAULT_ICON[tone] : icon
	const bannerStyle = [
		styles.banner,
		prominent ? styles.bannerProminent : styles.bannerCompact,
		{ backgroundColor: bg },
		style,
	]

	const actionChip = action ? (
		<AppActionChip
			label={action.label}
			onPress={action.onPress}
			icon={action.icon}
			filled={action.filled ?? true}
			size={actionPlacement === 'below' ? 'md' : undefined}
			style={actionPlacement === 'below' ? styles.chipBelow : undefined}
		/>
	) : null
	const actionBelow = !right && actionPlacement === 'below' && actionChip

	const content = (
		<>
			{glyph && (
				<View
					style={[
						styles.tile,
						{
							width: tile,
							height: tile,
							borderRadius: prominent ? 12 : 10,
							backgroundColor: prominent ? fg : '#FFFFFF',
						},
					]}
				>
					<MaterialCommunityIcons
						name={glyph}
						size={prominent ? Math.round(tile * 0.55) : Math.round(tile * 0.56)}
						color={prominent ? '#FFFFFF' : fg}
					/>
				</View>
			)}
			<View style={[styles.text, prominent && styles.textProminent]}>
				{!!eyebrow && <Text style={[styles.eyebrow, { color: fg }]}>{eyebrow.toUpperCase()}</Text>}
				<Text style={[prominent ? styles.titleProminent : [styles.titleCompact, { color: fg }], titleStyle]}>
					{title}
				</Text>
				{!!subtitle && <Text style={prominent ? styles.subProminent : styles.subCompact}>{subtitle}</Text>}
				{actionBelow ? <View style={styles.actionBelow}>{actionChip}</View> : null}
			</View>
			{right ?? (actionBelow ? null : actionChip)}
			{!!onPress && chevron && <MaterialCommunityIcons name="chevron-right" size={20} color={fg} />}
		</>
	)

	if (onPress) {
		return (
			<TouchableOpacity
				onPress={onPress}
				activeOpacity={0.85}
				accessibilityRole="button"
				accessibilityLabel={accessibilityLabel ?? [title, subtitle].filter(Boolean).join('. ')}
				style={bannerStyle}
			>
				{content}
			</TouchableOpacity>
		)
	}

	return (
		<View
			style={bannerStyle}
			accessibilityRole={tone === 'danger' || tone === 'warning' ? 'alert' : undefined}
			accessibilityLabel={accessibilityLabel}
		>
			{content}
		</View>
	)
}

const styles = StyleSheet.create({
	banner: {
		flexDirection: 'row',
	},
	bannerCompact: {
		alignItems: 'center',
		gap: 10,
		padding: 12,
		borderRadius: 12,
	},
	bannerProminent: {
		alignItems: 'flex-start',
		gap: 12,
		padding: 16,
		borderRadius: 14,
	},
	tile: {
		alignItems: 'center',
		justifyContent: 'center',
	},
	text: {
		flex: 1,
		minWidth: 0,
	},
	textProminent: {
		gap: 2,
	},
	actionBelow: {
		marginTop: 10,
	},
	chipBelow: {
		justifyContent: 'center',
	},
	eyebrow: {
		fontSize: 11,
		lineHeight: 14,
		fontWeight: '800',
		letterSpacing: 0.66,
	},
	titleCompact: {
		fontSize: 14,
		lineHeight: 20,
		fontWeight: '800',
	},
	titleProminent: {
		fontSize: 17,
		lineHeight: 22,
		fontWeight: '800',
		color: APP_COLORS.ink,
	},
	subCompact: {
		fontSize: 12,
		lineHeight: 16,
		color: APP_COLORS.ink,
	},
	subProminent: {
		fontSize: 13,
		lineHeight: 18,
		color: APP_COLORS.inkMuted,
	},
})

export default AppInfoBanner
