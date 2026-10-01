// One section of the profile hub: white block with a 12/16 800 caps title ("ABOUT YOU", "APP") and
// 60px rows (40px tone tile, 15/20 700 title, 12/16 muted one-line subtitle, optional badge, chevron),
// each separated by a divider -- rendered from a profileHubConfig section.

import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { AppIconTile, AppTag } from '../../../../components/common'
import { APP_COLORS } from '../../../../config/theme'
import type { HubData, HubRow } from '../../config/profileHubConfig'

export type ProfileHubSectionProps = {
	title: string
	rows: HubRow[]
	data: HubData
	onPressRow: (row: HubRow) => void
}

export function ProfileHubSection({ title, rows, data, onPressRow }: ProfileHubSectionProps) {
	const visibleRows = rows.filter((r) => !r.visible || r.visible(data))
	if (!visibleRows.length) return null
	return (
		<View style={styles.section}>
			<Text style={styles.title} accessibilityRole="header">
				{title}
			</Text>
			{visibleRows.map((row, index) => {
				const subtitle = typeof row.subtitle === 'function' ? row.subtitle(data) : row.subtitle
				const badge = row.badge?.(data) ?? null
				return (
					<TouchableOpacity
						key={row.key}
						style={[styles.row, index < visibleRows.length - 1 && styles.rowDivider]}
						onPress={() => onPressRow(row)}
						activeOpacity={0.75}
						accessibilityRole="button"
						accessibilityLabel={[row.title, subtitle, badge?.label].filter(Boolean).join(', ')}
					>
						<AppIconTile icon={row.icon} tone={row.tone} size={40} />
						<View style={styles.text}>
							<Text style={styles.rowTitle} numberOfLines={1}>
								{row.title}
							</Text>
							<Text style={styles.rowSubtitle} numberOfLines={1}>
								{subtitle}
							</Text>
						</View>
						{badge ? <AppTag label={badge.label} tone={badge.tone} size="sm" shape="rounded" /> : null}
						<MaterialCommunityIcons name="chevron-right" size={22} color={APP_COLORS.border} />
					</TouchableOpacity>
				)
			})}
		</View>
	)
}

const styles = StyleSheet.create({
	section: {
		backgroundColor: APP_COLORS.surface,
		paddingTop: 6,
		paddingHorizontal: 16,
		paddingBottom: 4,
	},
	title: {
		marginTop: 8,
		marginBottom: 2,
		fontSize: 12,
		lineHeight: 16,
		fontWeight: '800',
		letterSpacing: 0.7,
		color: APP_COLORS.inkMuted,
	},
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		minHeight: 60,
		paddingVertical: 6,
	},
	rowDivider: {
		borderBottomWidth: 1,
		borderBottomColor: APP_COLORS.divider,
	},
	text: {
		flex: 1,
		minWidth: 0,
	},
	rowTitle: {
		fontSize: 15,
		lineHeight: 20,
		fontWeight: '700',
		color: APP_COLORS.ink,
	},
	rowSubtitle: {
		fontSize: 12,
		lineHeight: 16,
		color: APP_COLORS.inkMuted,
	},
})

export default ProfileHubSection
