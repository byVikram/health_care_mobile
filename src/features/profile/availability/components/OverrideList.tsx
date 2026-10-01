// Date overrides list: month / day badge, "Fri 3 Oct · Conference", "Unavailable all day" or
// "Only 6 PM–8 PM", edit / remove buttons; empty state when there are none.

import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { APP_COLORS } from '../../../../config/theme'
import { formatRange, overrideDayNumber, overrideMonth, overrideTitle, type DateOverride } from '../availabilityUtils'

export type OverrideListProps = {
	overrides: DateOverride[]
	offLabel: string
	onEdit: (o: DateOverride) => void
	onRemove: (o: DateOverride) => void
}

export function OverrideList({ overrides, offLabel, onEdit, onRemove }: OverrideListProps) {
	if (!overrides.length) {
		return (
			<View style={styles.empty}>
				<MaterialCommunityIcons name="calendar-check-outline" size={28} color={APP_COLORS.primary} />
				<Text style={styles.emptyTitle}>No date overrides</Text>
				<Text style={styles.emptyText}>Your weekly hours apply on every date.</Text>
			</View>
		)
	}
	return (
		<View>
			{overrides.map((o, i) => {
				const title = overrideTitle(o)
				return (
					<View key={o.date} style={[styles.row, i < overrides.length - 1 && styles.divider]}>
						<View style={[styles.badge, o.off && styles.badgeOff]}>
							<Text style={[styles.month, o.off && styles.badgeTextOff]}>{overrideMonth(o)}</Text>
							<Text style={[styles.dayNum, o.off && styles.badgeTextOff]}>{overrideDayNumber(o)}</Text>
						</View>
						<View style={styles.text}>
							<Text style={styles.title} numberOfLines={1}>
								{title}
							</Text>
							<Text style={styles.sub} numberOfLines={2}>
								{o.off ? offLabel : `Only ${o.ranges.map(formatRange).join(', ')}`}
							</Text>
						</View>
						<TouchableOpacity
							style={styles.iconBtn}
							onPress={() => onEdit(o)}
							accessibilityRole="button"
							accessibilityLabel={`Edit ${title}`}
						>
							<MaterialCommunityIcons name="pencil-outline" size={20} color={APP_COLORS.primary} />
						</TouchableOpacity>
						<TouchableOpacity
							style={styles.iconBtn}
							onPress={() => onRemove(o)}
							accessibilityRole="button"
							accessibilityLabel={`Remove ${title}`}
						>
							<MaterialCommunityIcons name="trash-can-outline" size={20} color={APP_COLORS.danger} />
						</TouchableOpacity>
					</View>
				)
			})}
		</View>
	)
}

const styles = StyleSheet.create({
	empty: {
		alignItems: 'center',
		gap: 4,
		paddingVertical: 20,
	},
	emptyTitle: {
		fontSize: 15,
		lineHeight: 20,
		fontWeight: '800',
		color: APP_COLORS.ink,
	},
	emptyText: {
		fontSize: 13,
		lineHeight: 18,
		color: APP_COLORS.inkMuted,
	},
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		paddingVertical: 10,
	},
	divider: {
		borderBottomWidth: 1,
		borderBottomColor: APP_COLORS.divider,
	},
	badge: {
		width: 48,
		height: 52,
		borderRadius: 10,
		backgroundColor: APP_COLORS.mint,
		alignItems: 'center',
		justifyContent: 'center',
	},
	badgeOff: {
		backgroundColor: APP_COLORS.dangerBg,
	},
	month: {
		fontSize: 10,
		lineHeight: 14,
		fontWeight: '800',
		color: APP_COLORS.primary,
	},
	dayNum: {
		fontSize: 18,
		lineHeight: 22,
		fontWeight: '800',
		color: APP_COLORS.primary,
	},
	badgeTextOff: {
		color: APP_COLORS.danger,
	},
	text: {
		flex: 1,
		minWidth: 0,
	},
	title: {
		fontSize: 15,
		lineHeight: 20,
		fontWeight: '700',
		color: APP_COLORS.ink,
	},
	sub: {
		fontSize: 12,
		lineHeight: 16,
		color: APP_COLORS.inkMuted,
	},
	iconBtn: {
		width: 40,
		height: 40,
		borderWidth: 1,
		borderColor: APP_COLORS.divider,
		borderRadius: 10,
		alignItems: 'center',
		justifyContent: 'center',
	},
})

export default OverrideList
