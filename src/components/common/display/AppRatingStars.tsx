// src/components/common/display/AppRatingStars.tsx
//
// Star rating from the KarolaHealth designs. Two looks:
// - 'inline'  : compact display row (list cards, review summaries), supports half stars.
// - 'buttons' : 44x44 bordered star buttons (design 7b "How was your visit?").
// Interactive (a radiogroup of radios) whenever `onChange` is passed; display-only (an image
// with a "4.5 out of 5 stars" label) otherwise.

import React from 'react'
import { StyleProp, StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { AppTypography } from './AppTypography'
import { APP_COLORS } from '../../../config/theme'

type StarIcon = 'star' | 'star-half-full' | 'star-outline'

export interface AppRatingStarsProps {
	/** Current rating (0..count). Fractions round to the nearest half when `allowHalf`, else to whole stars. */
	value: number
	/** Makes the stars tappable; called with the tapped star (1..count). */
	onChange?: (value: number) => void
	/** Star glyph size. Defaults to 14 for 'inline', 22 for 'buttons'. */
	size?: number
	variant?: 'inline' | 'buttons'
	/** Render half stars in display mode (default true). Ignored while interactive. */
	allowHalf?: boolean
	count?: number
	color?: string
	/** Show the numeric value (e.g. "4.5") after the stars. */
	showValue?: boolean
	/** Review count shown after the stars, e.g. "(128)". */
	reviews?: number
	disabled?: boolean
	/** Accessibility label for the group (interactive) or prefix for the summary (display). */
	accessibilityLabel?: string
	style?: StyleProp<ViewStyle>
}

export function AppRatingStars({
	value,
	onChange,
	size,
	variant = 'inline',
	allowHalf = true,
	count = 5,
	color = APP_COLORS.star,
	showValue = false,
	reviews,
	disabled = false,
	accessibilityLabel,
	style,
}: AppRatingStarsProps) {
	const interactive = !!onChange
	const safe = Number.isFinite(value) ? Math.max(0, Math.min(count, value)) : 0
	const shown = interactive || !allowHalf ? Math.round(safe) : Math.round(safe * 2) / 2
	const iconSize = size ?? (variant === 'buttons' ? 22 : 14)
	const positions = Array.from({ length: count }, (_, i) => i + 1)

	const iconFor = (position: number): StarIcon => {
		if (shown >= position) return 'star'
		if (shown + 0.5 === position) return 'star-half-full'
		return 'star-outline'
	}

	const summary = `${shown} out of ${count} stars${reviews != null ? `, ${reviews} reviews` : ''}`

	const label =
		showValue || reviews != null ? (
			<AppTypography style={[styles.label, { fontSize: Math.max(12, iconSize - 2) }]}>
				{showValue ? (Number.isInteger(safe) ? safe.toFixed(0) : safe.toFixed(1)) : null}
				{showValue && reviews != null ? ' ' : null}
				{reviews != null ? `(${reviews})` : null}
			</AppTypography>
		) : null

	if (!interactive) {
		return (
			<View
				style={[styles.row, variant === 'buttons' ? styles.gapButtons : styles.gapInline, style]}
				accessible
				accessibilityRole="image"
				accessibilityLabel={accessibilityLabel ? `${accessibilityLabel}: ${summary}` : summary}
			>
				{positions.map((position) =>
					variant === 'buttons' ? (
						<View key={position} style={styles.starBtn}>
							<MaterialCommunityIcons name={iconFor(position)} size={iconSize} color={color} />
						</View>
					) : (
						<MaterialCommunityIcons key={position} name={iconFor(position)} size={iconSize} color={color} />
					)
				)}
				{label}
			</View>
		)
	}

	return (
		<View
			style={[styles.row, variant === 'buttons' ? styles.gapButtons : styles.gapInline, style]}
			accessibilityRole="radiogroup"
			accessibilityLabel={accessibilityLabel ?? 'Rating'}
		>
			{positions.map((position) => (
				<TouchableOpacity
					key={position}
					style={variant === 'buttons' ? styles.starBtn : styles.inlineHit}
					disabled={disabled}
					onPress={() => onChange?.(position)}
					accessibilityRole="radio"
					accessibilityLabel={`${position} star${position > 1 ? 's' : ''}`}
					accessibilityState={{ checked: position === shown, disabled }}
					hitSlop={variant === 'inline' ? { top: 8, bottom: 8, left: 2, right: 2 } : undefined}
				>
					<MaterialCommunityIcons name={iconFor(position)} size={iconSize} color={color} />
				</TouchableOpacity>
			))}
			{label}
		</View>
	)
}

export default AppRatingStars

const styles = StyleSheet.create({
	row: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	gapInline: { gap: 2 },
	gapButtons: { gap: 8 },
	inlineHit: {
		alignItems: 'center',
		justifyContent: 'center',
	},
	starBtn: {
		width: 44,
		height: 44,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: APP_COLORS.divider,
		backgroundColor: APP_COLORS.surface,
		alignItems: 'center',
		justifyContent: 'center',
	},
	label: {
		marginLeft: 4,
		fontWeight: '600',
		color: APP_COLORS.inkMuted,
	},
})
