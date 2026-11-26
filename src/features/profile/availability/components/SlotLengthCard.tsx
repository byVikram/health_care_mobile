// "Slot length at this clinic" card from the doctor availability design: a clock + title row, one equal-width
// pill per appointment length (selected = primary fill, white text) and, under a divider, the "Copy <Day>'s hours to
// all weekdays" button. The doctor's chosen length is what the clinic's bookable slots are cut from.

import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { APP_COLORS, CARD_SHADOW } from '../../../../config/theme'
import AppToggle from '../../../../components/common/inputs/AppToggle'
import { formatUnit } from '../../config/ancillaryProfileConfig'

export type SlotLengthCardProps = {
	/** Slot lengths in minutes, e.g. [10, 15, 20, 30]. */
	options: number[]
	value: number | undefined
	onChange: (minutes: number) => void
	/** One set of hours for Monday to Friday. */
	sameHours: boolean
	onSameHoursChange: (on: boolean) => void
	title?: string
	subtitle?: string
}

export function SlotLengthCard({
	options,
	value,
	onChange,
	sameHours,
	onSameHoursChange,
	title = 'Slot length',
	subtitle = 'How long each booking lasts at this clinic',
}: SlotLengthCardProps) {
	return (
		<View style={styles.card}>
			<Text style={styles.title} accessibilityRole="header">
				{title}
			</Text>
			<Text style={styles.subtitle}>{subtitle}</Text>

			<View style={styles.track} accessibilityRole="radiogroup" accessibilityLabel={title}>
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

			<View style={styles.copyRow}>
				<View style={styles.copyInfo}>
					<Text style={styles.copyTitle}>Same hours Mon–Fri</Text>
					<Text style={styles.subtitle}>One set of hours for Monday to Friday</Text>
				</View>
				<AppToggle
					value={sameHours}
					onValueChange={onSameHoursChange}
					accessibilityLabel="Same hours Monday to Friday"
				/>
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	card: {
		padding: 16,
		gap: 4,
		borderRadius: 20,
		borderWidth: 1,
		borderColor: APP_COLORS.divider,
		backgroundColor: APP_COLORS.surface,
		...CARD_SHADOW,
	},
	title: {
		fontSize: 17,
		lineHeight: 24,
		fontWeight: '800',
		color: APP_COLORS.ink,
	},
	subtitle: {
		fontSize: 13,
		lineHeight: 18,
		color: APP_COLORS.inkMuted,
	},
	track: {
		flexDirection: 'row',
		marginTop: 12,
		padding: 4,
		borderRadius: 999,
		borderWidth: 1,
		borderColor: APP_COLORS.divider,
		backgroundColor: APP_COLORS.pageBg,
	},
	pill: {
		flex: 1,
		height: 44,
		borderRadius: 999,
		alignItems: 'center',
		justifyContent: 'center',
	},
	pillOn: {
		backgroundColor: APP_COLORS.surface,
		shadowColor: APP_COLORS.shadow,
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.12,
		shadowRadius: 6,
		elevation: 2,
	},
	pillText: {
		fontSize: 14,
		lineHeight: 20,
		fontWeight: '700',
		color: APP_COLORS.inkMuted,
	},
	pillTextOn: {
		color: APP_COLORS.ink,
	},
	divider: {
		height: 1,
		marginVertical: 12,
		backgroundColor: APP_COLORS.divider,
	},
	copyRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	copyInfo: {
		flex: 1,
	},
	copyTitle: {
		fontSize: 15,
		lineHeight: 22,
		fontWeight: '800',
		color: APP_COLORS.ink,
	},
})

export default SlotLengthCard
