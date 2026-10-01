// src/components/common/inputs/AppTabs.tsx
//
// Underline tab row from the KarolaHealth designs (Home "Health reads": Articles / Blogs /
// Podcasts): equal-width tabs over a 1px divider, the active one in primary 700 with a 3px
// rounded underline, the rest inkMuted 600. `scrollable` switches to content-width tabs in a
// horizontal ScrollView for longer sets. Exposed as a tablist of tabs.

import React from 'react'
import { ScrollView, StyleProp, StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { AppTypography } from '../display/AppTypography'
import { APP_COLORS } from '../../../config/theme'

export interface AppTabItem<K extends string = string> {
	key: K
	label: string
	/** Optional MaterialCommunityIcons glyph shown before the label, in the tab's active/inactive colour. */
	icon?: keyof typeof MaterialCommunityIcons.glyphMap
	/** Optional count shown as a small pill after the label. */
	count?: number
	disabled?: boolean
}

export interface AppTabsProps<K extends string = string> {
	tabs: readonly AppTabItem<K>[]
	value: K
	onChange: (key: K) => void
	/** Content-width tabs in a horizontal scroller instead of equal-width columns. */
	scrollable?: boolean
	/** Accessibility label for the tablist, e.g. "Content type". */
	accessibilityLabel?: string
	style?: StyleProp<ViewStyle>
}

export function AppTabs<K extends string = string>({
	tabs,
	value,
	onChange,
	scrollable = false,
	accessibilityLabel,
	style,
}: AppTabsProps<K>) {
	const items = tabs.map((tab) => {
		const on = tab.key === value
		const disabled = !!tab.disabled
		const color = on ? APP_COLORS.primary : APP_COLORS.inkMuted
		return (
			<TouchableOpacity
				key={tab.key}
				style={[
					styles.tab,
					scrollable ? styles.tabScrollable : styles.tabFixed,
					disabled && styles.tabDisabled,
				]}
				disabled={disabled}
				onPress={() => onChange(tab.key)}
				accessibilityRole="tab"
				accessibilityState={{ selected: on, disabled }}
				accessibilityLabel={tab.count != null ? `${tab.label}, ${tab.count}` : tab.label}
			>
				<View style={styles.labelRow}>
					{tab.icon ? <MaterialCommunityIcons name={tab.icon} size={17} color={color} /> : null}
					<AppTypography
						style={[styles.label, on ? styles.labelOn : styles.labelOff, { color }]}
						numberOfLines={1}
					>
						{tab.label}
					</AppTypography>
					{tab.count != null ? (
						<View style={[styles.count, on ? styles.countOn : styles.countOff]}>
							<AppTypography style={[styles.countText, { color }]}>{tab.count}</AppTypography>
						</View>
					) : null}
				</View>
				<View style={[styles.underline, on && styles.underlineOn]} />
			</TouchableOpacity>
		)
	})

	if (scrollable) {
		return (
			<View style={[styles.bar, style]}>
				<ScrollView
					horizontal
					showsHorizontalScrollIndicator={false}
					accessibilityRole="tablist"
					accessibilityLabel={accessibilityLabel}
				>
					{items}
				</ScrollView>
			</View>
		)
	}

	return (
		<View
			style={[styles.bar, styles.row, style]}
			accessibilityRole="tablist"
			accessibilityLabel={accessibilityLabel}
		>
			{items}
		</View>
	)
}

export default AppTabs

const styles = StyleSheet.create({
	bar: {
		borderBottomWidth: 1,
		borderBottomColor: APP_COLORS.divider,
	},
	row: {
		flexDirection: 'row',
	},
	tab: {
		height: 44,
		alignItems: 'center',
		justifyContent: 'center',
	},
	tabFixed: {
		flex: 1,
		minWidth: 0,
		paddingHorizontal: 4,
	},
	tabScrollable: {
		paddingHorizontal: 14,
	},
	tabDisabled: {
		opacity: 0.5,
	},
	labelRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	label: {
		fontSize: 14,
		lineHeight: 20,
	},
	labelOn: { fontWeight: '700' },
	labelOff: { fontWeight: '600' },
	count: {
		minWidth: 20,
		height: 18,
		paddingHorizontal: 6,
		borderRadius: 9999,
		alignItems: 'center',
		justifyContent: 'center',
	},
	countOn: { backgroundColor: APP_COLORS.mint },
	countOff: { backgroundColor: APP_COLORS.pageBg },
	countText: {
		fontSize: 11,
		lineHeight: 14,
		fontWeight: '700',
	},
	underline: {
		position: 'absolute',
		left: 14,
		right: 14,
		bottom: -1,
		height: 3,
		borderTopLeftRadius: 3,
		borderTopRightRadius: 3,
		backgroundColor: 'transparent',
	},
	underlineOn: {
		backgroundColor: APP_COLORS.primary,
	},
})
