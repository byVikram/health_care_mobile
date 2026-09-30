// src/components/common/inputs/AppSegmentedControl.tsx
//
// Pill segmented control from the KarolaHealth designs (e.g. In-clinic / Video on Book a slot):
// APP_COLORS.pageBg track with a 1px divider border, the active segment raised on white.
// Exposed to screen readers as a radiogroup of radios.

import React from 'react'
import { StyleProp, StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { AppTypography } from '../display/AppTypography'
import { APP_COLORS } from '../../../config/theme'

type IconName = keyof typeof MaterialCommunityIcons.glyphMap

export interface AppSegmentedOption<T extends string = string> {
	value: T
	label: string
	/** Leading MaterialCommunityIcons glyph. */
	icon?: IconName
	disabled?: boolean
	/** Small trailing count badge (e.g. pending-requests count on a "Requests" tab). Hidden when 0/undefined. */
	count?: number
	/** 'warn' = the offer/urgent orange badge (something needs attention); 'default' = plain ink badge. */
	countTone?: 'default' | 'warn'
	accessibilityLabel?: string
}

export interface AppSegmentedControlProps<T extends string = string> {
	options: AppSegmentedOption<T>[]
	value: T
	onChange: (value: T) => void
	/**
	 * 'pill' (default) — fully round track/segments, as on Book a slot's In-clinic/Video toggle.
	 * 'rounded' — 12px track / 9px segment radius, as on the doctor dashboard's sticky view/tab
	 * switchers (Today/Past, Overview/History/Reports/Notes) — a squarer, denser look for tab-like
	 * (as opposed to toggle-like) segmented bars.
	 */
	shape?: 'pill' | 'rounded'
	/** Renders as a proper tablist (view/content switcher) instead of a radiogroup (toggle). Defaults to false. */
	tabs?: boolean
	/** Accessibility label for the whole group. */
	accessibilityLabel?: string
	style?: StyleProp<ViewStyle>
}

export function AppSegmentedControl<T extends string = string>({
	options,
	value,
	onChange,
	shape = 'pill',
	tabs = false,
	accessibilityLabel,
	style,
}: AppSegmentedControlProps<T>) {
	const rounded = shape === 'rounded'
	return (
		<View
			style={[styles.group, rounded && styles.groupRounded, style]}
			accessibilityRole={tabs ? 'tablist' : 'radiogroup'}
			accessibilityLabel={accessibilityLabel}
		>
			{options.map((option) => {
				const on = option.value === value
				const disabled = !!option.disabled
				const color = on ? APP_COLORS.ink : APP_COLORS.inkMuted
				return (
					<TouchableOpacity
						key={option.value}
						accessibilityRole={tabs ? 'tab' : 'radio'}
						accessibilityState={tabs ? { selected: on, disabled } : { checked: on, disabled }}
						accessibilityLabel={option.accessibilityLabel}
						disabled={disabled}
						onPress={() => onChange(option.value)}
						style={[
							styles.segment,
							rounded && styles.segmentRounded,
							on && styles.segmentOn,
							on && rounded && styles.segmentOnRounded,
							disabled && styles.segmentDisabled,
						]}
					>
						{option.icon && <MaterialCommunityIcons name={option.icon} size={16} color={color} />}
						<AppTypography style={[styles.segmentText, { color }]} numberOfLines={1}>
							{option.label}
						</AppTypography>
						{!!option.count && (
							<View style={[styles.countBadge, { backgroundColor: option.countTone === 'warn' ? APP_COLORS.offer : APP_COLORS.primary }]}>
								<AppTypography style={styles.countText}>{option.count}</AppTypography>
							</View>
						)}
					</TouchableOpacity>
				)
			})}
		</View>
	)
}

export default AppSegmentedControl

const styles = StyleSheet.create({
	group: {
		flexDirection: 'row',
		gap: 4,
		padding: 4,
		borderRadius: 9999,
		backgroundColor: APP_COLORS.pageBg,
		borderWidth: 1,
		borderColor: APP_COLORS.divider,
	},
	segment: {
		flex: 1,
		height: 40,
		borderRadius: 9999,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 6,
	},
	segmentOn: {
		backgroundColor: '#fff',
		shadowColor: APP_COLORS.shadow,
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.1,
		shadowRadius: 3,
		elevation: 1,
	},
	groupRounded: {
		borderRadius: 12,
	},
	segmentRounded: {
		borderRadius: 9,
	},
	segmentOnRounded: {
		borderRadius: 9,
	},
	segmentDisabled: { opacity: 0.5 },
	segmentText: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
	countBadge: {
		minWidth: 18,
		height: 18,
		paddingHorizontal: 5,
		borderRadius: 9999,
		alignItems: 'center',
		justifyContent: 'center',
	},
	countText: { fontSize: 11, lineHeight: 14, fontWeight: '800', color: '#FFFFFF' },
})
