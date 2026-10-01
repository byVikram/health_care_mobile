// src/components/common/inputs/AppChipGroup.tsx
//
// Wrapping group of toggle chips from the profile designs (allergies, conditions, languages, services):
// 36px chips, radius 10, 1.5px border — selected = APP_COLORS.primary fill + white text, unselected = white
// with APP_COLORS.divider border and ink text. Multi-select by default; `single` makes it a radio group
// (tapping the selected chip keeps it selected unless `allowDeselect`).

import React from 'react'
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { AppChip } from './AppChip'
import { APP_COLORS } from '../../../config/theme'

export type AppChipGroupOption = string | { value: string; label: string }

export type AppChipGroupProps = {
	options: readonly AppChipGroupOption[]
	values: readonly string[]
	onChange: (values: string[]) => void
	single?: boolean
	/** single only: tapping the selected chip clears the value. */
	allowDeselect?: boolean
	disabled?: boolean
	accessibilityLabel?: string
	style?: StyleProp<ViewStyle>
}

const toOption = (o: AppChipGroupOption) => (typeof o === 'string' ? { value: o, label: o } : o)

export function AppChipGroup({
	options,
	values,
	onChange,
	single = false,
	allowDeselect = false,
	disabled = false,
	accessibilityLabel,
	style,
}: AppChipGroupProps) {
	const toggle = (value: string) => {
		const on = values.includes(value)
		if (single) {
			if (on && !allowDeselect) return
			onChange(on ? [] : [value])
			return
		}
		onChange(on ? values.filter((v) => v !== value) : [...values, value])
	}

	return (
		<View
			style={[styles.group, style]}
			accessibilityRole={single ? 'radiogroup' : undefined}
			accessibilityLabel={accessibilityLabel}
		>
			{options.map(toOption).map((o) => {
				const on = values.includes(o.value)
				return (
					<AppChip
						key={o.value}
						label={o.label}
						selected={on}
						onPress={() => toggle(o.value)}
						variant="solid"
						shape="rounded"
						size="sm"
						radius={10}
						borderWidth={1.5}
						borderColor={APP_COLORS.divider}
						disabled={disabled}
						accessibilityRole={single ? 'radio' : 'button'}
						textStyle={styles.chipText}
					/>
				)
			})}
		</View>
	)
}

const styles = StyleSheet.create({
	group: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	chipText: {
		fontWeight: '700',
	},
})

export default AppChipGroup
