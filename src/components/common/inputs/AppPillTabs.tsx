// src/components/common/inputs/AppPillTabs.tsx
//
// Scrollable pill tabs with a count badge (design: Medical records "All 8 / Prescriptions 3 / Lab reports 3 / My uploads 2"):
// 34px pills, the selected one solid ink with a translucent-white count, the rest white with a hairline border and a
// grey count. Exposed as a tablist of tabs. For underline tabs see AppTabs; for a segmented toggle, AppSegmentedControl.

import React from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native'
import { APP_COLORS } from '../../../config/theme'

export interface AppPillTab<K extends string = string> {
	key: K
	label: string
	/** Shown in a small badge after the label. */
	count?: number
}

export interface AppPillTabsProps<K extends string = string> {
	tabs: readonly AppPillTab<K>[]
	value: K
	onChange: (key: K) => void
	/**
	 * Horizontal padding inside the scroller, so the row can run to the screen edges while its first pill lines up with
	 * the page: give the page's side padding here and the same negative margin in `style`.
	 */
	inset?: number
	/** Accessibility label for the tablist, e.g. "Record type". */
	accessibilityLabel?: string
	style?: StyleProp<ViewStyle>
}

export function AppPillTabs<K extends string = string>({
	tabs,
	value,
	onChange,
	inset = 0,
	accessibilityLabel,
	style,
}: AppPillTabsProps<K>) {
	return (
		<ScrollView
			horizontal
			showsHorizontalScrollIndicator={false}
			accessibilityRole="tablist"
			accessibilityLabel={accessibilityLabel}
			style={[styles.scroll, style]}
			contentContainerStyle={[styles.row, { paddingHorizontal: inset }]}
		>
			{tabs.map((tab) => {
				const on = tab.key === value
				return (
					<TouchableOpacity
						key={tab.key}
						onPress={() => onChange(tab.key)}
						activeOpacity={0.85}
						accessibilityRole="tab"
						accessibilityState={{ selected: on }}
						accessibilityLabel={tab.count != null ? `${tab.label}, ${tab.count}` : tab.label}
						style={[styles.pill, on ? styles.pillOn : styles.pillOff]}
					>
						<Text style={[styles.label, { color: on ? '#FFFFFF' : APP_COLORS.ink }]}>{tab.label}</Text>
						{tab.count != null && (
							<View style={[styles.count, on ? styles.countOn : styles.countOff]}>
								<Text style={[styles.countText, { color: on ? '#FFFFFF' : APP_COLORS.inkMuted }]}>
									{tab.count}
								</Text>
							</View>
						)}
					</TouchableOpacity>
				)
			})}
		</ScrollView>
	)
}

const styles = StyleSheet.create({
	scroll: { flexGrow: 0 },
	row: { flexDirection: 'row', gap: 6 },
	pill: {
		height: 34,
		paddingHorizontal: 12,
		borderRadius: 9999,
		borderWidth: 1,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	pillOn: { backgroundColor: APP_COLORS.ink, borderColor: APP_COLORS.ink },
	pillOff: { backgroundColor: APP_COLORS.surface, borderColor: APP_COLORS.divider },
	label: { fontSize: 13, lineHeight: 18, fontWeight: '700' },
	count: { minWidth: 18, paddingHorizontal: 5, borderRadius: 9999, alignItems: 'center' },
	countOn: { backgroundColor: '#FFFFFF26' },
	countOff: { backgroundColor: '#F0F4F4' },
	countText: { fontSize: 11, lineHeight: 18, fontWeight: '800' },
})

export default AppPillTabs
