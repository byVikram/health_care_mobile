// src/features/notification/components/NotificationRow.tsx
//
// One row of the Notifications list ("Notifications" design): a 44px round category tile, title /
// two-line body / "Category · time" meta (with an URGENT chip for critical alerts), and an unread dot.
// Unread rows get a soft tint and a heavier title; critical unread rows a red tint and red dot.

import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { AppPathIcon } from '../../../components/common'
import { APP_COLORS } from '../../../config/theme'
import { CRITICAL_ICON, CRITICAL_TONE, NOTIFICATION_TONES, type NotificationCategory } from '../notificationCategories'

type Props = {
	category: NotificationCategory
	title: string
	body: string
	/** e.g. "6:00 PM" or "22 Sep" -- shown after the category name. */
	time: string
	unread: boolean
	critical: boolean
	/** Hairline under the row (every row but the last in its group). */
	divider: boolean
	onPress: () => void
}

export function NotificationRow({ category, title, body, time, unread, critical, divider, onPress }: Props) {
	const tone = critical ? CRITICAL_TONE : NOTIFICATION_TONES[category.tone]
	const rowBg = critical && unread ? '#FFF6F5' : unread ? '#F2F8F8' : '#FFFFFF'

	return (
		<TouchableOpacity
			activeOpacity={0.7}
			onPress={onPress}
			accessibilityRole="button"
			accessibilityLabel={`${unread ? 'Unread. ' : ''}${critical ? 'Urgent. ' : ''}${title}. ${time}`}
			style={[styles.row, { backgroundColor: rowBg }]}
		>
			<View style={[styles.tile, { backgroundColor: tone.bg }]}>
				<AppPathIcon d={critical ? CRITICAL_ICON : category.icon} size={20} strokeWidth={2} color={tone.ink} />
			</View>
			<View style={[styles.content, divider && styles.divider]}>
				<View style={styles.textCol}>
					<Text style={[styles.title, { fontWeight: unread ? '800' : '600' }]}>{title}</Text>
					<Text style={[styles.body, { color: unread ? '#3D4F52' : APP_COLORS.inkMuted }]} numberOfLines={2}>
						{body}
					</Text>
					<View style={styles.metaRow}>
						{critical && (
							<View style={styles.urgentChip}>
								<Text style={styles.urgentText}>URGENT</Text>
							</View>
						)}
						<Text style={styles.meta}>
							{category.label} · {time}
						</Text>
					</View>
				</View>
				{unread && <View style={[styles.dot, { backgroundColor: critical ? '#B42318' : APP_COLORS.primary }]} />}
			</View>
		</TouchableOpacity>
	)
}

const styles = StyleSheet.create({
	row: { flexDirection: 'row', gap: 12, paddingHorizontal: 16 },
	tile: { width: 44, height: 44, marginTop: 14, borderRadius: 9999, alignItems: 'center', justifyContent: 'center' },
	content: { flex: 1, minWidth: 0, paddingVertical: 14, flexDirection: 'row', gap: 10 },
	divider: { borderBottomWidth: 1, borderBottomColor: '#E8EEEF' },
	textCol: { flex: 1, minWidth: 0, gap: 3 },
	title: { fontSize: 15, lineHeight: 21, color: APP_COLORS.ink },
	body: { fontSize: 13, lineHeight: 19 },
	metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
	urgentChip: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, backgroundColor: '#B42318' },
	urgentText: { fontSize: 10, lineHeight: 14, fontWeight: '800', letterSpacing: 0.4, color: '#FFFFFF' },
	meta: { fontSize: 12, lineHeight: 16, color: '#7A8B8E' },
	dot: { width: 10, height: 10, marginTop: 6, borderRadius: 9999 },
})

export default NotificationRow
