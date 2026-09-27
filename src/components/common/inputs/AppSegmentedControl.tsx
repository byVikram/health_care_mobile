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
	accessibilityLabel?: string
}

export interface AppSegmentedControlProps<T extends string = string> {
	options: AppSegmentedOption<T>[]
	value: T
	onChange: (value: T) => void
	/** Accessibility label for the whole group. */
	accessibilityLabel?: string
	style?: StyleProp<ViewStyle>
}

export function AppSegmentedControl<T extends string = string>({
	options,
	value,
	onChange,
	accessibilityLabel,
	style,
}: AppSegmentedControlProps<T>) {
	return (
		<View style={[styles.group, style]} accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel}>
			{options.map((option) => {
				const on = option.value === value
				const disabled = !!option.disabled
				const color = on ? APP_COLORS.ink : APP_COLORS.inkMuted
				return (
					<TouchableOpacity
						key={option.value}
						accessibilityRole="radio"
						accessibilityState={{ checked: on, disabled }}
						accessibilityLabel={option.accessibilityLabel}
						disabled={disabled}
						onPress={() => onChange(option.value)}
						style={[styles.segment, on && styles.segmentOn, disabled && styles.segmentDisabled]}
					>
						{option.icon && <MaterialCommunityIcons name={option.icon} size={16} color={color} />}
						<AppTypography style={[styles.segmentText, { color }]}>{option.label}</AppTypography>
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
	segmentDisabled: { opacity: 0.5 },
	segmentText: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
})
