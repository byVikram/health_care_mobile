// src/features/ancillary/components/DayTimeTabs.tsx
//
// "Schedule a visit" -> Different times: one tab per picked day showing its time ("Today · 7 PM", a red "Pick time"
// until set). No shared equivalent (AppTabs is a single-line underline row), so it lives here.

import React from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { APP_COLORS } from '../../../config/theme'

export type DayTimeTab = {
	key: string
	/** "Today" / "Mon 26". */
	day: string
	/** The picked time ("7 PM") or null while it still needs one. */
	time: string | null
	accessibilityLabel?: string
}

export function DayTimeTabs({
	tabs,
	activeKey,
	onSelect,
}: {
	tabs: DayTimeTab[]
	activeKey: string
	onSelect: (key: string) => void
}) {
	return (
		<View style={styles.tabsWrap}>
			<Text style={styles.tabsHint}>Pick a day, then its time</Text>
			<ScrollView
				horizontal
				showsHorizontalScrollIndicator={false}
				style={styles.tabsScroll}
				contentContainerStyle={styles.tabsContent}
				accessibilityRole="tablist"
				accessibilityLabel="Visit days"
			>
				{tabs.map((t) => {
					const on = t.key === activeKey
					const has = t.time !== null
					return (
						<TouchableOpacity
							key={t.key}
							accessibilityRole="tab"
							accessibilityState={{ selected: on }}
							accessibilityLabel={t.accessibilityLabel ?? `${t.day}, ${has ? t.time : 'pick a time'}`}
							onPress={() => onSelect(t.key)}
							activeOpacity={0.85}
							style={[styles.tab, on && styles.tabOn]}
						>
							<Text style={styles.tabDay}>{t.day}</Text>
							<View style={styles.tabTimeRow}>
								{has && <MaterialCommunityIcons name="check" size={12} color={APP_COLORS.primary} />}
								<Text style={[styles.tabTime, { color: has ? APP_COLORS.primary : APP_COLORS.danger }]}>
									{has ? t.time : 'Pick time'}
								</Text>
							</View>
						</TouchableOpacity>
					)
				})}
			</ScrollView>
		</View>
	)
}

const styles = StyleSheet.create({
	tabsWrap: { gap: 6 },
	tabsHint: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
	// Bleeds to the section edges (the section pads 16) so the tabs scroll edge to edge.
	tabsScroll: { marginHorizontal: -16 },
	tabsContent: { paddingHorizontal: 16, gap: 6 },
	tab: {
		minWidth: 76,
		height: 50,
		paddingHorizontal: 10,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: APP_COLORS.divider,
		backgroundColor: APP_COLORS.surface,
		justifyContent: 'center',
		alignItems: 'flex-start',
		gap: 1,
	},
	tabOn: { borderWidth: 2, borderColor: APP_COLORS.primary, backgroundColor: APP_COLORS.mint },
	tabDay: { fontSize: 12, lineHeight: 16, fontWeight: '800', color: APP_COLORS.ink },
	tabTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
	tabTime: { fontSize: 12, lineHeight: 16, fontWeight: '700' },
})
