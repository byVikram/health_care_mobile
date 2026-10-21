// src/components/common/layout/AppNavRow.tsx
//
// Tappable navigation row from the KarolaHealth drawer / list designs ("Appointments", "My wallet ₹[balance]",
// "Help centre", "See all doctors"): min-height 46, gap 12, 34px leading tile (radius 10, APP_COLORS.pageBg bg,
// primary icon), 15/20 600 ink title, optional 12/16 inkMuted subtitle, optional right value, trailing 20px
// APP_COLORS.inkDisabled chevron. tone 'danger' = danger title + icon (e.g. "Log out"), no tile bg.

import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { AppIconTile, type AppIconTileProps } from '../display/AppIconTile'
import { APP_COLORS } from '../../../config/theme'

type IconName = keyof typeof MaterialCommunityIcons.glyphMap

export type AppNavRowProps = {
	title: string
	subtitle?: string
	onPress?: () => void
	/** Leading icon: an MCI glyph (34px pageBg tile), AppIconTile props, or any node. */
	leading?: IconName | AppIconTileProps | React.ReactNode
	/** Right-hand value: a string renders as 14/20 600 inkMuted text; pass a node (e.g. <AppTag />) otherwise. */
	value?: React.ReactNode
	/** Count bubble (number) or small dot (true) before the chevron. */
	badge?: number | boolean
	/** Trailing chevron. Defaults to true; pass false or a custom node to replace it. */
	trailing?: boolean | React.ReactNode
	/** Bottom hairline in APP_COLORS.divider. */
	divider?: boolean
	tone?: 'default' | 'danger'
	disabled?: boolean
	/** Min row height. Defaults to 46. */
	minHeight?: number
	accessibilityLabel?: string
	accessibilityHint?: string
	style?: StyleProp<ViewStyle>
	titleStyle?: StyleProp<TextStyle>
}

const isIconName = (v: unknown): v is IconName => typeof v === 'string'
const isTileProps = (v: unknown): v is AppIconTileProps =>
	!!v && typeof v === 'object' && !React.isValidElement(v) && !Array.isArray(v)

export function AppNavRow({
	title,
	subtitle,
	onPress,
	leading,
	value,
	badge,
	trailing = true,
	divider = false,
	tone = 'default',
	disabled = false,
	minHeight = 46,
	accessibilityLabel,
	accessibilityHint,
	style,
	titleStyle,
}: AppNavRowProps) {
	const danger = tone === 'danger'
	const ink = danger ? APP_COLORS.danger : APP_COLORS.ink
	const tileIcon = danger ? APP_COLORS.danger : APP_COLORS.primary
	const tileBg = danger ? 'transparent' : APP_COLORS.pageBg

	let leadingNode: React.ReactNode = null
	if (isIconName(leading)) {
		leadingNode = <AppIconTile icon={leading} size={34} backgroundColor={tileBg} iconColor={tileIcon} />
	} else if (isTileProps(leading)) {
		// A `tone` in the tile props wins over the default pageBg / primary colours.
		const defaults = leading.tone ? {} : { backgroundColor: tileBg, iconColor: tileIcon }
		leadingNode = <AppIconTile size={34} {...defaults} {...leading} />
	} else if (leading != null) {
		leadingNode = leading as React.ReactNode
	}

	const count = typeof badge === 'number' && badge > 0 ? badge : 0
	const a11yValue = typeof value === 'string' || typeof value === 'number' ? String(value) : undefined

	return (
		<TouchableOpacity
			onPress={onPress}
			disabled={disabled || !onPress}
			activeOpacity={0.75}
			accessibilityRole={onPress ? 'button' : undefined}
			accessibilityLabel={accessibilityLabel ?? [title, subtitle, a11yValue].filter(Boolean).join(', ')}
			accessibilityHint={accessibilityHint}
			accessibilityState={{ disabled }}
			style={[styles.row, { minHeight }, divider && styles.divider, disabled && styles.disabled, style]}
		>
			{leadingNode}
			<View style={styles.textCol}>
				<Text style={[styles.title, { color: ink }, titleStyle]} numberOfLines={1}>
					{title}
				</Text>
				{!!subtitle && (
					<Text style={styles.subtitle} numberOfLines={2}>
						{subtitle}
					</Text>
				)}
			</View>
			{typeof value === 'string' || typeof value === 'number' ? (
				<Text style={styles.value} numberOfLines={1}>
					{value}
				</Text>
			) : (
				value
			)}
			{badge === true && <View style={styles.dot} />}
			{count > 0 && (
				<View style={styles.count}>
					<Text style={styles.countText}>{count > 99 ? '99+' : count}</Text>
				</View>
			)}
			{trailing === true ? (
				<MaterialCommunityIcons name="chevron-right" size={20} color={APP_COLORS.inkDisabled} />
			) : trailing === false ? null : (
				trailing
			)}
		</TouchableOpacity>
	)
}

const styles = StyleSheet.create({
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	divider: {
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: APP_COLORS.divider,
	},
	disabled: {
		opacity: 0.5,
	},
	textCol: {
		flex: 1,
		minWidth: 0,
	},
	title: {
		fontSize: 15,
		lineHeight: 20,
		fontWeight: '600',
	},
	subtitle: {
		fontSize: 12,
		lineHeight: 16,
		color: APP_COLORS.inkMuted,
	},
	value: {
		flexShrink: 0,
		fontSize: 14,
		lineHeight: 20,
		fontWeight: '600',
		color: APP_COLORS.inkMuted,
	},
	dot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: APP_COLORS.danger,
	},
	count: {
		minWidth: 20,
		height: 20,
		paddingHorizontal: 6,
		borderRadius: 10,
		backgroundColor: APP_COLORS.danger,
		alignItems: 'center',
		justifyContent: 'center',
	},
	countText: {
		color: '#FFFFFF',
		fontSize: 11,
		lineHeight: 14,
		fontWeight: '800',
	},
})

export default AppNavRow
