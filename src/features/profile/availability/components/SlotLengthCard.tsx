// "Slot length at this clinic" card from the doctor availability design: a clock + title row, one equal-width
// pill per appointment length (selected = primary fill, white text) and, under a divider, the "Copy <Day>'s hours to
// all weekdays" button. The doctor's chosen length is what the clinic's bookable slots are cut from.

import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { APP_COLORS } from '../../../../config/theme'
import { formatUnit } from '../../config/ancillaryProfileConfig'

// the design's "primary soft strong" tint, used for the card's border and divider
const SOFT_STRONG = '#C9E0E0'

export type SlotLengthCardProps = {
	/** Slot lengths in minutes, e.g. [10, 15, 20, 30]. */
	options: number[]
	value: number | undefined
	onChange: (minutes: number) => void
	copyLabel: string
	onCopy: () => void
	/** The selected day has no hours: there is nothing to copy. */
	copyDisabled?: boolean
	title?: string
}

export function SlotLengthCard({
	options,
	value,
	onChange,
	copyLabel,
	onCopy,
	copyDisabled = false,
	title = 'Slot length at this clinic',
}: SlotLengthCardProps) {
	return (
		<View style={styles.card}>
			<View style={styles.head}>
				<MaterialCommunityIcons name="clock-outline" size={16} color={APP_COLORS.primary} />
				<Text style={styles.title} accessibilityRole="header">
					{title}
				</Text>
			</View>

			<View style={styles.pills} accessibilityRole="radiogroup" accessibilityLabel={title}>
				{options.map((minutes) => {
					const selected = minutes === value
					return (
						<TouchableOpacity
							key={minutes}
							style={[styles.pill, selected && styles.pillOn]}
							onPress={() => onChange(minutes)}
							activeOpacity={0.85}
							accessibilityRole="radio"
							accessibilityState={{ checked: selected }}
							accessibilityLabel={formatUnit(minutes)}
						>
							<Text style={[styles.pillText, selected && styles.pillTextOn]}>{formatUnit(minutes)}</Text>
						</TouchableOpacity>
					)
				})}
			</View>

			<View style={styles.divider} />

			<TouchableOpacity
				style={[styles.copy, copyDisabled && styles.copyDisabled]}
				onPress={onCopy}
				disabled={copyDisabled}
				activeOpacity={0.85}
				accessibilityRole="button"
				accessibilityState={{ disabled: copyDisabled }}
			>
				<MaterialCommunityIcons name="content-copy" size={16} color={APP_COLORS.primary} />
				<Text style={styles.copyText} numberOfLines={1}>
					{copyLabel}
				</Text>
			</TouchableOpacity>
		</View>
	)
}

const styles = StyleSheet.create({
	card: {
		padding: 12,
		gap: 12,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: SOFT_STRONG,
		backgroundColor: APP_COLORS.mint,
	},
	head: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	title: {
		fontSize: 14,
		lineHeight: 20,
		fontWeight: '800',
		color: APP_COLORS.ink,
	},
	pills: {
		flexDirection: 'row',
		gap: 8,
	},
	pill: {
		flex: 1,
		height: 40,
		borderRadius: 10,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: APP_COLORS.surface,
	},
	pillOn: {
		backgroundColor: APP_COLORS.primary,
	},
	pillText: {
		fontSize: 14,
		lineHeight: 20,
		fontWeight: '700',
		color: APP_COLORS.ink,
	},
	pillTextOn: {
		color: '#FFFFFF',
	},
	divider: {
		height: 1,
		backgroundColor: SOFT_STRONG,
	},
	copy: {
		height: 44,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
		paddingHorizontal: 12,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: APP_COLORS.primary,
		backgroundColor: APP_COLORS.surface,
	},
	copyDisabled: {
		opacity: 0.5,
	},
	copyText: {
		flexShrink: 1,
		fontSize: 14,
		lineHeight: 20,
		fontWeight: '700',
		color: APP_COLORS.ink,
	},
})

export default SlotLengthCard
