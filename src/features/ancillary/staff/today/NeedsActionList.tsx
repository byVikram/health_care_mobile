// src/features/ancillary/staff/today/NeedsActionList.tsx
//
// "Needs your action" of the provider Home (Ancillary Home design): one card of rows, each a tinted 40px tile, a title with a
// line under it (red when urgent), a count pill and a chevron. A row exists only when there is something to do; with none, the
// card says so ("You're all caught up") instead of leaving the section out.
import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { AppPathIcon } from '../../../../components/common'
import { APP_COLORS, TONES } from '../../../../config/theme'
import { PATHS } from '../schedule/scheduleTheme'

export type ActionRow = {
	key: string
	title: string
	sub: string
	count: number
	/** MaterialCommunity-free SVG path of the tile's icon. */
	icon: string
	tone: 'amber' | 'teal'
	/** Red line and an orange count pill. */
	urgent?: boolean
	onPress: () => void
}

const TILE = { amber: TONES.sand, teal: TONES.mint } as const

export function NeedsActionList({ rows }: { rows: ActionRow[] }) {
	return (
		<View style={styles.section}>
			<Text style={styles.title} accessibilityRole="header">
				Needs your action
			</Text>
			<View style={styles.card}>
				{rows.length === 0 ? (
					<View style={styles.empty}>
						<View style={[styles.tile, { backgroundColor: APP_COLORS.successBg }]}>
							<AppPathIcon d={PATHS.check} size={20} strokeWidth={2.6} color={APP_COLORS.success} />
						</View>
						<View style={styles.text}>
							<Text style={styles.rowTitle}>You’re all caught up</Text>
							<Text style={styles.rowSub}>Nothing needs your action right now.</Text>
						</View>
					</View>
				) : null}
				{rows.map((r, i) => (
					<TouchableOpacity
						key={r.key}
						onPress={r.onPress}
						activeOpacity={0.7}
						accessibilityRole="button"
						accessibilityLabel={`${r.title}, ${r.count}`}
						style={[styles.row, i < rows.length - 1 && styles.rule]}
					>
						<View style={[styles.tile, { backgroundColor: TILE[r.tone].bg }]}>
							<AppPathIcon d={r.icon} size={20} strokeWidth={2.2} color={TILE[r.tone].ink} />
						</View>
						<View style={styles.text}>
							<Text style={styles.rowTitle}>{r.title}</Text>
							<Text
								style={[styles.rowSub, r.urgent && { color: APP_COLORS.danger, fontWeight: '700' }]}
								numberOfLines={1}
							>
								{r.sub}
							</Text>
						</View>
						<View style={[styles.count, { backgroundColor: r.urgent ? APP_COLORS.offer : APP_COLORS.ink }]}>
							<Text style={styles.countText}>{r.count}</Text>
						</View>
						<AppPathIcon d={PATHS.chevronRight} size={16} strokeWidth={2.4} color={APP_COLORS.inkMuted} />
					</TouchableOpacity>
				))}
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	section: { gap: 10, paddingHorizontal: 16 },
	title: { fontSize: 16, lineHeight: 22, fontWeight: '800', color: APP_COLORS.ink },
	card: {
		borderRadius: 14,
		borderWidth: 1,
		borderColor: APP_COLORS.divider,
		backgroundColor: APP_COLORS.surface,
		overflow: 'hidden',
	},
	row: {
		minHeight: 64,
		paddingVertical: 10,
		paddingHorizontal: 12,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		backgroundColor: APP_COLORS.surface,
	},
	rule: { borderBottomWidth: 1, borderBottomColor: APP_COLORS.divider },
	empty: {
		minHeight: 64,
		paddingVertical: 10,
		paddingHorizontal: 12,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	tile: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
	text: { flex: 1, minWidth: 0 },
	rowTitle: { fontSize: 15, lineHeight: 20, fontWeight: '800', color: APP_COLORS.ink },
	rowSub: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
	count: {
		minWidth: 28,
		height: 28,
		paddingHorizontal: 8,
		borderRadius: 14,
		alignItems: 'center',
		justifyContent: 'center',
	},
	countText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
})
