// src/components/common/booking/AppRadioCard.tsx
//
// Selectable radio row / card from the KarolaHealth designs. Two looks:
//   variant 'card' (default) — doctor Clinic & slot "Choose a clinic": padding 14, radius 16, 2px border,
//       APP_COLORS.pageBg; selected = APP_COLORS.primary border on APP_COLORS.mint. The 44px icon tile turns
//       APP_COLORS.primary with a white icon when selected.
//   variant 'row' — "Where should the nurse come?" saved-address rows: min-height 72, APP_COLORS.divider bottom
//       border, no card chrome; 48px tile on APP_COLORS.pageBg, selected = APP_COLORS.mint tile with a 2px
//       APP_COLORS.primary ring.
//   variant 'option' — Schedule a visit "Single visit / Repeat visits": a plain choice card (no tile, no radio):
//       padding 12, radius 12, 2px border, white; selected = APP_COLORS.primary border on APP_COLORS.mint;
//       title 15/20 800 ink, subtitle 12/16 muted. Put two in a row with `style={{ flex: 1 }}`.
// Title 15/22 700 (card) or 16/22 700 (row) ink, subtitle 13/18 muted (2 lines), optional trailing node
// (e.g. an AppIconButton "Directions"), then an AppRadio. The whole row is one accessibilityRole="radio"
// pressable; the trailing node stays a separate touch target.

import React from 'react'
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { APP_COLORS, TONES, type ToneKey } from '../../../config/theme'
import { AppIconTile } from '../display/AppIconTile'
import { AppRadio } from '../inputs/AppRadio'

type IconName = keyof typeof MaterialCommunityIcons.glyphMap

export type AppRadioCardProps = {
	title: string
	subtitle?: string
	/** Subtitle line cap. Defaults to 2. */
	subtitleLines?: number
	selected: boolean
	onPress: () => void
	/** Leading AppIconTile glyph. Ignored when `leading` is given. */
	icon?: IconName
	/** Tile tone while unselected (card: defaults to 'mint'). */
	tone?: ToneKey
	/** Custom leading node (e.g. an AppAvatar) — replaces the icon tile. */
	leading?: React.ReactNode
	/** Node between the text and the radio (e.g. <AppIconButton icon="directions" … />). */
	trailing?: React.ReactNode
	variant?: 'card' | 'row' | 'option'
	/** Hides the bottom divider in 'row' variant (e.g. the last row). */
	last?: boolean
	disabled?: boolean
	accessibilityLabel?: string
	accessibilityHint?: string
	style?: StyleProp<ViewStyle>
}

export function AppRadioCard({
	title,
	subtitle,
	subtitleLines = 2,
	selected,
	onPress,
	icon,
	tone,
	leading,
	trailing,
	variant = 'card',
	last = false,
	disabled = false,
	accessibilityLabel,
	accessibilityHint,
	style,
}: AppRadioCardProps) {
	const isRow = variant === 'row'
	const pair = TONES[tone ?? 'mint']

	if (variant === 'option') {
		return (
			<Pressable
				onPress={onPress}
				disabled={disabled}
				accessibilityRole="radio"
				accessibilityState={{ checked: selected, disabled }}
				accessibilityLabel={accessibilityLabel ?? [title, subtitle].filter(Boolean).join('. ')}
				accessibilityHint={accessibilityHint}
				style={[styles.option, selected && styles.optionOn, disabled && styles.disabled, style]}
			>
				<Text style={styles.titleOption}>{title}</Text>
				{!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
			</Pressable>
		)
	}

	let lead: React.ReactNode = leading ?? null
	if (!leading && icon) {
		lead = isRow ? (
			<View style={[styles.ring, selected && styles.ringOn]}>
				<AppIconTile
					icon={icon}
					size={48}
					radius={12}
					iconSize={22}
					backgroundColor={selected ? APP_COLORS.mint : APP_COLORS.pageBg}
					iconColor={APP_COLORS.primary}
				/>
			</View>
		) : (
			<AppIconTile
				icon={icon}
				size={44}
				radius={12}
				iconSize={22}
				backgroundColor={selected ? APP_COLORS.primary : pair.bg}
				iconColor={selected ? APP_COLORS.surface : pair.ink}
			/>
		)
	}

	return (
		<View
			style={[
				styles.base,
				isRow ? styles.row : styles.card,
				isRow && last && styles.rowLast,
				!isRow && selected && styles.cardOn,
				disabled && styles.disabled,
				style,
			]}
		>
			<Pressable
				onPress={onPress}
				disabled={disabled}
				accessibilityRole="radio"
				accessibilityState={{ checked: selected, disabled }}
				accessibilityLabel={accessibilityLabel ?? [title, subtitle].filter(Boolean).join('. ')}
				accessibilityHint={accessibilityHint}
				style={({ pressed }) => [styles.press, pressed && styles.pressed]}
			>
				{lead}
				<View style={styles.text}>
					<Text style={isRow ? styles.titleRow : styles.titleCard} numberOfLines={1}>
						{title}
					</Text>
					{!!subtitle && (
						<Text style={styles.subtitle} numberOfLines={subtitleLines}>
							{subtitle}
						</Text>
					)}
				</View>
			</Pressable>
			{trailing}
			<Pressable
				onPress={onPress}
				disabled={disabled}
				hitSlop={11}
				importantForAccessibility="no-hide-descendants"
				accessibilityElementsHidden
			>
				<AppRadio checked={selected} />
			</Pressable>
		</View>
	)
}

const styles = StyleSheet.create({
	base: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	card: {
		padding: 14,
		borderRadius: 16,
		borderWidth: 2,
		borderColor: 'transparent',
		backgroundColor: APP_COLORS.pageBg,
	},
	cardOn: {
		borderColor: APP_COLORS.primary,
		backgroundColor: APP_COLORS.mint,
	},
	row: {
		minHeight: 72,
		borderBottomWidth: 1,
		borderBottomColor: APP_COLORS.divider,
	},
	option: {
		minWidth: 0,
		gap: 2,
		padding: 12,
		borderRadius: 12,
		borderWidth: 2,
		borderColor: APP_COLORS.divider,
		backgroundColor: APP_COLORS.surface,
	},
	optionOn: {
		borderColor: APP_COLORS.primary,
		backgroundColor: APP_COLORS.mint,
	},
	titleOption: {
		fontSize: 15,
		lineHeight: 20,
		fontWeight: '800',
		color: APP_COLORS.ink,
	},
	rowLast: {
		borderBottomWidth: 0,
	},
	disabled: {
		opacity: 0.55,
	},
	press: {
		flex: 1,
		minWidth: 0,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		alignSelf: 'stretch',
	},
	pressed: {
		opacity: 0.9,
	},
	ring: {
		padding: 2,
		borderRadius: 14,
		margin: -2,
	},
	ringOn: {
		backgroundColor: APP_COLORS.primary,
	},
	text: {
		flex: 1,
		minWidth: 0,
	},
	titleCard: {
		fontSize: 15,
		lineHeight: 22,
		fontWeight: '700',
		color: APP_COLORS.ink,
	},
	titleRow: {
		fontSize: 16,
		lineHeight: 22,
		fontWeight: '700',
		color: APP_COLORS.ink,
	},
	subtitle: {
		fontSize: 13,
		lineHeight: 18,
		color: APP_COLORS.inkMuted,
	},
})

export default AppRadioCard
