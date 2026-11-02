// src/components/common/inputs/AppChipPicker.tsx
//
// Multi-select from the doctor "Professional & documents" design (areas of expertise, treatments & procedures).
// The chosen values show as removable mint chips (first `maxVisible`, then a "+N more" chip) followed by a dashed
// "Add" chip. Add / "+N more" open the shared searchable option sheet (checkbox rows, Done at the top right).

import React, { useMemo, useState } from 'react'
import {
	Pressable,
	StyleSheet,
	Text,
	View,
	type StyleProp,
	type ViewStyle,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { APP_COLORS } from '../../../config/theme'
import { AppChip } from './AppChip'
import { AppOptionSheet } from './AppOptionSheet'
import type { AppSelectOption } from './AppSelect'

export type AppChipPickerProps = {
	label: string
	options: AppSelectOption[]
	values: string[]
	onChange: (values: string[]) => void
	/** Sheet title. Defaults to `label`. */
	sheetTitle?: string
	/** Shows a red * after the label. */
	required?: boolean
	/** Validation message, shown in red under the chips. */
	errorText?: string
	searchPlaceholder?: string
	/** Chips shown before the rest collapse into "+N more". Defaults to 6. */
	maxVisible?: number
	style?: StyleProp<ViewStyle>
}

const DEFAULT_MAX_VISIBLE = 6

// "english" and "English" are one language: entries that match ignoring case are treated as the same choice.
const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()

export function AppChipPicker({
	label,
	options,
	values,
	onChange,
	sheetTitle,
	required = false,
	errorText,
	searchPlaceholder = 'Search options',
	maxVisible = DEFAULT_MAX_VISIBLE,
	style,
}: AppChipPickerProps) {
	const [open, setOpen] = useState(false)

	const selected = useMemo(() => values.filter((v, i) => values.findIndex((x) => same(x, v)) === i), [values])
	const labels = useMemo(() => new Map(options.map((o) => [o.value.toLowerCase(), o.label])), [options])
	/** The choices without `value`, whichever way it was capitalised when it was saved. */
	const without = (value: string) => selected.filter((v) => !same(v, value))
	const shown = selected.slice(0, maxVisible)
	const hiddenCount = selected.length - shown.length

	const openSheet = () => setOpen(true)
	const toggle = (key: string, checked: boolean) => onChange(checked ? [...selected, key] : without(key))

	return (
		<View style={[styles.wrap, style]}>
			<View style={styles.head}>
				<Text style={styles.label}>
					{label}
					{required ? <Text style={styles.required}> *</Text> : null}
				</Text>
				<Text style={styles.count}>{selected.length ? `${selected.length} added` : 'None yet'}</Text>
			</View>

			<View style={styles.chips} accessibilityRole="list" accessibilityLabel={label}>
				{shown.map((value) => {
					const text = labels.get(value.toLowerCase()) ?? value
					return (
						<AppChip
							key={value}
							label={text}
							selected
							variant="soft"
							size="sm"
							style={styles.chip}
							textStyle={styles.chipText}
							trailing={
								<Pressable
									onPress={() => onChange(without(value))}
									hitSlop={6}
									style={styles.chipClose}
									accessibilityRole="button"
									accessibilityLabel={`Remove ${text}`}
								>
									<MaterialCommunityIcons name="close" size={14} color={APP_COLORS.primary} />
								</Pressable>
							}
						/>
					)
				})}
				{hiddenCount > 0 ? (
					<AppChip
						label={`+${hiddenCount} more`}
						size="sm"
						onPress={openSheet}
						style={styles.moreChip}
						textStyle={styles.chipText}
						accessibilityLabel={`Show all ${selected.length} selected`}
					/>
				) : null}
				<AppChip
					label="Add"
					icon="plus"
					size="sm"
					onPress={openSheet}
					borderColor={APP_COLORS.mintAccent}
					borderWidth={1.5}
					style={styles.addChip}
					textStyle={styles.addText}
					accessibilityLabel={`Add ${label.toLowerCase()}`}
				/>
			</View>

			{!!errorText && (
				<Text style={styles.error} accessibilityRole="alert">
					{errorText}
				</Text>
			)}

			<AppOptionSheet
				visible={open}
				onClose={() => setOpen(false)}
				title={sheetTitle ?? label}
				options={options}
				// saved values may differ in case from the option values ("english" vs "English")
				selected={selected.map((v) => options.find((opt) => same(opt.value, v))?.value ?? v)}
				mode="multi"
				onToggle={toggle}
				searchable
				searchPlaceholder={searchPlaceholder}
			/>
		</View>
	)
}

export default AppChipPicker

const styles = StyleSheet.create({
	wrap: {
		width: '100%',
		gap: 8,
	},
	head: {
		flexDirection: 'row',
		alignItems: 'baseline',
		justifyContent: 'space-between',
	},
	label: {
		fontSize: 13,
		lineHeight: 18,
		fontWeight: '700',
		color: APP_COLORS.ink,
	},
	required: {
		color: APP_COLORS.danger,
	},
	error: {
		fontSize: 12,
		lineHeight: 16,
		color: APP_COLORS.danger,
	},
	count: {
		fontSize: 12,
		lineHeight: 16,
		color: APP_COLORS.inkMuted,
	},
	chips: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	chip: {
		height: 34,
		paddingRight: 4,
		borderWidth: 0,
	},
	chipText: {
		fontWeight: '700',
	},
	chipClose: {
		width: 28,
		height: 28,
		borderRadius: 14,
		alignItems: 'center',
		justifyContent: 'center',
	},
	moreChip: {
		height: 34,
		borderWidth: 0,
		backgroundColor: APP_COLORS.pageBg,
	},
	addChip: {
		height: 34,
		borderStyle: 'dashed',
	},
	addText: {
		color: APP_COLORS.primary,
		fontWeight: '800',
	},
})
