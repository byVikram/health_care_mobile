// "Filters" sheet of the Find a doctor screen, variant A of the Doctor Consultation design: full-height, the
// categories in a rail on the left (with a count badge when something in them is on) and the chosen category's
// options on the right. Options apply as they are tapped (the list behind updates); "Apply filters" closes the sheet
// and "Clear all" resets every category.

import React, { useEffect, useRef, useState } from 'react'
import {
	Animated,
	Easing,
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	useWindowDimensions,
	View,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { AppBottomSheet, AppButton } from '../../../../components/common'
import { APP_COLORS } from '../../../../config/theme'
import {
	FILTER_GROUPS,
	groupCount,
	selectedValues,
	withOption,
	type DoctorFilters,
	type FilterGroup,
	type FilterGroupKey,
} from '../doctorFilters'

const RAIL_ROW_HEIGHT = 56
const RAIL_WIDTH = 132
const SHEET_PAD = 16 // AppBottomSheet's side padding, which the two panes bleed through

export type DoctorFilterSheetProps = {
	visible: boolean
	filters: DoctorFilters
	onChange: (next: DoctorFilters) => void
	onClearAll: () => void
	onClose: () => void
}

function Mark({ multi, on }: { multi: boolean; on: boolean }) {
	if (multi) {
		return (
			<View style={[styles.mark, styles.markBox, on && styles.markBoxOn]}>
				{on ? <MaterialCommunityIcons name="check" size={14} color="#FFFFFF" /> : null}
			</View>
		)
	}
	return <View style={[styles.mark, styles.markRadio, on && styles.markRadioOn]} />
}

export function DoctorFilterSheet({ visible, filters, onChange, onClearAll, onClose }: DoctorFilterSheetProps) {
	const { height: windowHeight } = useWindowDimensions()
	const [active, setActive] = useState<FilterGroupKey>(FILTER_GROUPS[0].key)
	const activeIndex = Math.max(
		0,
		FILTER_GROUPS.findIndex((g) => g.key === active)
	)
	const group: FilterGroup = FILTER_GROUPS[activeIndex]

	// The highlight slides to the chosen category; the options fade in from the right.
	const railY = useRef(new Animated.Value(activeIndex * RAIL_ROW_HEIGHT)).current
	const paneIn = useRef(new Animated.Value(1)).current
	useEffect(() => {
		Animated.timing(railY, {
			toValue: activeIndex * RAIL_ROW_HEIGHT,
			duration: 300,
			easing: Easing.bezier(0.2, 0.8, 0.2, 1),
			useNativeDriver: true,
		}).start()
		paneIn.setValue(0)
		Animated.timing(paneIn, {
			toValue: 1,
			duration: 240,
			easing: Easing.bezier(0.2, 0.8, 0.2, 1),
			useNativeDriver: true,
		}).start()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [activeIndex])

	// the sheet is about 64% of the screen: handle + header + footer take ~150, the two panes the rest (5 rail rows fit)
	const bodyHeight = Math.round(Math.min(windowHeight * 0.64, 560) - 150)
	const chosen = selectedValues(filters, group.key)

	return (
		<AppBottomSheet
			visible={visible}
			title="Filters"
			onClose={onClose}
			appearance="modern"
			showHeaderDivider={false}
			scrollEnabled={false}
			maxHeightRatio={0.7}
			headerRight={
				<TouchableOpacity
					onPress={onClearAll}
					style={styles.clearBtn}
					activeOpacity={0.8}
					accessibilityRole="button"
					accessibilityLabel="Clear all filters"
				>
					<Text style={styles.clearText}>Clear all</Text>
				</TouchableOpacity>
			}
			footer={
				<AppButton variant="primary" size="lg" onPress={onClose}>
					Apply filters
				</AppButton>
			}
		>
			<View style={[styles.body, { height: bodyHeight }]}>
				<View style={styles.rail} accessibilityRole="tablist">
					<Animated.View
						pointerEvents="none"
						style={[styles.railHighlight, { transform: [{ translateY: railY }] }]}
					>
						<View style={styles.railBar} />
					</Animated.View>
					<ScrollView showsVerticalScrollIndicator={false}>
						{FILTER_GROUPS.map((g) => {
							const on = g.key === active
							const count = groupCount(filters, g.key)
							return (
								<TouchableOpacity
									key={g.key}
									style={styles.railRow}
									onPress={() => setActive(g.key)}
									activeOpacity={0.8}
									accessibilityRole="tab"
									accessibilityState={{ selected: on }}
									accessibilityLabel={count ? `${g.label}, ${count} selected` : g.label}
								>
									<Text style={[styles.railLabel, on && styles.railLabelOn]} numberOfLines={1}>
										{g.label}
									</Text>
									{count > 0 ? (
										<View style={styles.badge}>
											<Text style={styles.badgeText}>{count}</Text>
										</View>
									) : null}
								</TouchableOpacity>
							)
						})}
					</ScrollView>
				</View>

				<Animated.View
					style={[
						styles.pane,
						{
							opacity: paneIn,
							transform: [
								{ translateX: paneIn.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) },
							],
						},
					]}
				>
					<ScrollView contentContainerStyle={styles.paneContent} showsVerticalScrollIndicator={false}>
						<Text style={styles.paneTitle} accessibilityRole="header">
							{group.title}
						</Text>
						{!!group.hint && <Text style={styles.paneHint}>{group.hint}</Text>}
						<View accessibilityRole={group.multi ? undefined : 'radiogroup'}>
							{group.options.map((option) => {
								const on = chosen.includes(option.value)
								return (
									<TouchableOpacity
										key={option.value}
										style={styles.option}
										onPress={() => onChange(withOption(filters, group.key, option.value))}
										activeOpacity={0.8}
										accessibilityRole={group.multi ? 'checkbox' : 'radio'}
										accessibilityState={{ checked: on }}
									>
										<Mark multi={group.multi} on={on} />
										<Text style={[styles.optionLabel, on && styles.optionLabelOn]}>
											{option.label}
										</Text>
									</TouchableOpacity>
								)
							})}
						</View>
					</ScrollView>
				</Animated.View>
			</View>
		</AppBottomSheet>
	)
}

export default DoctorFilterSheet

const styles = StyleSheet.create({
	clearBtn: {
		height: 40,
		paddingHorizontal: 10,
		alignItems: 'center',
		justifyContent: 'center',
	},
	clearText: {
		fontSize: 14,
		fontWeight: '800',
		color: APP_COLORS.primary,
	},
	body: {
		flexDirection: 'row',
		marginHorizontal: -SHEET_PAD,
		borderTopWidth: 1,
		borderTopColor: '#E3EAEB',
	},
	rail: {
		width: RAIL_WIDTH,
		backgroundColor: APP_COLORS.pageBg,
	},
	railHighlight: {
		position: 'absolute',
		left: 0,
		right: 0,
		top: 0,
		height: RAIL_ROW_HEIGHT,
		backgroundColor: APP_COLORS.surface,
	},
	railBar: {
		position: 'absolute',
		left: 0,
		top: 0,
		bottom: 0,
		width: 3,
		backgroundColor: APP_COLORS.primary,
	},
	railRow: {
		height: RAIL_ROW_HEIGHT,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 6,
		paddingLeft: 14,
		paddingRight: 10,
		paddingVertical: 8,
		borderBottomWidth: 1,
		borderBottomColor: '#E8EEEF',
	},
	railLabel: {
		flexShrink: 1,
		fontSize: 14,
		fontWeight: '600',
		color: APP_COLORS.inkMuted,
	},
	railLabelOn: {
		fontWeight: '800',
		color: APP_COLORS.ink,
	},
	badge: {
		minWidth: 18,
		height: 18,
		paddingHorizontal: 5,
		borderRadius: 9,
		backgroundColor: APP_COLORS.primary,
		alignItems: 'center',
		justifyContent: 'center',
	},
	badgeText: {
		fontSize: 11,
		fontWeight: '800',
		color: '#FFFFFF',
	},
	pane: {
		flex: 1,
		minWidth: 0,
	},
	paneContent: {
		paddingHorizontal: SHEET_PAD,
		paddingTop: 4,
		paddingBottom: 16,
	},
	paneTitle: {
		marginTop: 14,
		marginBottom: 2,
		fontSize: 16,
		lineHeight: 22,
		fontWeight: '800',
		color: APP_COLORS.ink,
	},
	paneHint: {
		marginBottom: 6,
		fontSize: 12,
		lineHeight: 16,
		color: APP_COLORS.inkMuted,
	},
	option: {
		minHeight: 50,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#EEF2F2',
	},
	optionLabel: {
		flex: 1,
		fontSize: 15,
		fontWeight: '500',
		color: APP_COLORS.ink,
	},
	optionLabelOn: {
		fontWeight: '700',
	},
	mark: {
		width: 20,
		height: 20,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: APP_COLORS.surface,
		borderColor: '#9AA7A9',
		borderWidth: 2,
	},
	markRadio: {
		borderRadius: 10,
	},
	markRadioOn: {
		borderWidth: 6,
		borderColor: APP_COLORS.primary,
	},
	markBox: {
		borderRadius: 6,
	},
	markBoxOn: {
		backgroundColor: APP_COLORS.primary,
		borderColor: APP_COLORS.primary,
	},
})
