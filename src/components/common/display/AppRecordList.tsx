// src/components/common/display/AppRecordList.tsx
//
// Record list from the Medical records design: rows grouped under a small caps heading (a month), each group one white
// bordered card. A row is a 42px tone icon tile, a tone-coloured kind line ("PRESCRIPTION"), a one-line title and subtitle,
// then the date with up to two small tags ("Uploaded by you", "3 out of range"), and, when the row can be deleted, a small bin on the
// right. Display only: what a row says and what a tap does come in as data, so the same list can show prescriptions, lab results,
// documents or bills.

import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { APP_COLORS } from '../../../config/theme'
import { AppIconTile } from './AppIconTile'
import { AppPathIcon } from './AppIcon'
import { AppTag } from './AppTag'

export type AppRecordTag = { label: string; bg: string; ink: string }

export type AppRecordRowData = {
	key: string
	/** Caps line above the title ("PRESCRIPTION"), in the tone's ink colour; none when the title already says it. */
	kind?: string
	title: string
	subtitle?: string
	/** Already formatted ("5 Sep 2026"). */
	date: string
	/** 24x24 stroke path drawn inside the tile. */
	iconPath: string
	tone: { bg: string; ink: string }
	tag?: AppRecordTag
	meta?: AppRecordTag
	onPress?: () => void
	/** Shows a bin at the end of the row (a record the person may remove). */
	onDelete?: () => void
}

export type AppRecordGroup = { key: string; label: string; rows: AppRecordRowData[] }

export type AppRecordListProps = { groups: AppRecordGroup[] }

export function AppRecordList({ groups }: AppRecordListProps) {
	return (
		<>
			{groups.map((group) => (
				<View key={group.key} style={styles.group}>
					<Text style={styles.groupLabel}>{group.label}</Text>
					<View style={styles.card}>
						{group.rows.map((row, index) => (
							<View key={row.key} style={[styles.row, index < group.rows.length - 1 && styles.rowRule]}>
								<TouchableOpacity
									onPress={row.onPress}
									disabled={!row.onPress}
									activeOpacity={0.8}
									accessibilityRole="button"
									accessibilityLabel={[row.kind, row.title, row.date].filter(Boolean).join(', ')}
									style={styles.main}
								>
									<AppIconTile backgroundColor={row.tone.bg} size={42} radius={12} iconSize={20}>
										<AppPathIcon d={row.iconPath} size={20} strokeWidth={2} color={row.tone.ink} />
									</AppIconTile>
									<View style={styles.text}>
										{!!row.kind && (
											<Text style={[styles.kind, { color: row.tone.ink }]}>{row.kind}</Text>
										)}
										<Text style={styles.title} numberOfLines={1}>
											{row.title}
										</Text>
										{!!row.subtitle && (
											<Text style={styles.subtitle} numberOfLines={1}>
												{row.subtitle}
											</Text>
										)}
										<View style={styles.tags}>
											<Text style={styles.date}>{row.date}</Text>
											{!!row.tag && (
												<AppTag
													size="xs"
													uppercase={false}
													label={row.tag.label}
													bg={row.tag.bg}
													ink={row.tag.ink}
												/>
											)}
											{!!row.meta && (
												<AppTag
													size="xs"
													uppercase={false}
													label={row.meta.label}
													bg={row.meta.bg}
													ink={row.meta.ink}
												/>
											)}
										</View>
									</View>
								</TouchableOpacity>
								{!!row.onDelete && (
									<TouchableOpacity
										onPress={row.onDelete}
										hitSlop={8}
										accessibilityRole="button"
										accessibilityLabel={`Delete ${row.title}`}
										style={styles.delete}
									>
										<AppPathIcon
											d="M4 7h16 M10 11v6 M14 11v6 M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12 M9 7V4h6v3"
											size={18}
											strokeWidth={2}
											color={APP_COLORS.danger}
										/>
									</TouchableOpacity>
								)}
							</View>
						))}
					</View>
				</View>
			))}
		</>
	)
}

const styles = StyleSheet.create({
	group: { gap: 6 },
	groupLabel: { fontSize: 11, lineHeight: 16, fontWeight: '800', letterSpacing: 0.7, color: APP_COLORS.inkMuted },
	card: {
		borderRadius: 14,
		backgroundColor: APP_COLORS.surface,
		borderWidth: 1,
		borderColor: APP_COLORS.divider,
		overflow: 'hidden',
	},
	row: { flexDirection: 'row', alignItems: 'center' },
	main: {
		flex: 1,
		minWidth: 0,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		paddingVertical: 12,
		paddingHorizontal: 14,
	},
	delete: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
	rowRule: { borderBottomWidth: 1, borderBottomColor: '#EEF2F3' },
	text: { flex: 1, minWidth: 0, gap: 1 },
	kind: { fontSize: 10, lineHeight: 13, fontWeight: '800', letterSpacing: 0.5 },
	title: { fontSize: 14, lineHeight: 19, fontWeight: '800', color: APP_COLORS.ink },
	subtitle: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
	tags: { marginTop: 3, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
	date: { fontSize: 11, lineHeight: 14, fontWeight: '700', color: '#7A8B8E' },
})

export default AppRecordList
