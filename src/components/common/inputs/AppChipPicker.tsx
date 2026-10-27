// src/components/common/inputs/AppChipPicker.tsx
//
// Multi-select from the doctor "Professional & documents" design (areas of expertise, treatments & procedures).
// The chosen values show as removable mint chips (first `maxVisible`, then a "+N more" chip) followed by a dashed
// "Add" chip. Add / "+N more" open a searchable bottom sheet of checkbox rows with a Done button.

import React, { useMemo, useState } from 'react'
import {
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	View,
	useWindowDimensions,
	type StyleProp,
	type ViewStyle,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { APP_COLORS } from '../../../config/theme'
import { AppBottomSheet } from '../layout/AppBottomSheet'
import { AppButton } from '../buttons/AppButton'
import { AppChip } from './AppChip'
import { AppCheckList } from './AppCheckList'
import type { AppSelectOption } from './AppSelect'

export type AppChipPickerProps = {
	label: string
	options: AppSelectOption[]
	values: string[]
	onChange: (values: string[]) => void
	/** Sheet title. Defaults to `label`. */
	sheetTitle?: string
	searchPlaceholder?: string
	/** Chips shown before the rest collapse into "+N more". Defaults to 6. */
	maxVisible?: number
	style?: StyleProp<ViewStyle>
}

const DEFAULT_MAX_VISIBLE = 6
const LIST_HEIGHT_RATIO = 0.5

export function AppChipPicker({
	label,
	options,
	values,
	onChange,
	sheetTitle,
	searchPlaceholder = 'Search',
	maxVisible = DEFAULT_MAX_VISIBLE,
	style,
}: AppChipPickerProps) {
	const [open, setOpen] = useState(false)
	const [query, setQuery] = useState('')
	const { height: windowHeight } = useWindowDimensions()

	const selected = useMemo(() => Array.from(new Set(values)), [values])
	const labels = useMemo(() => new Map(options.map((o) => [o.value, o.label])), [options])
	const shown = selected.slice(0, maxVisible)
	const hiddenCount = selected.length - shown.length

	const items = useMemo(() => {
		const q = query.trim().toLowerCase()
		return options
			.filter((o) => !q || o.label.toLowerCase().includes(q))
			.map((o) => ({ key: o.value, label: o.label, checked: selected.includes(o.value) }))
	}, [options, query, selected])

	const openSheet = () => setOpen(true)
	const closeSheet = () => {
		setOpen(false)
		setQuery('')
	}
	const toggle = (key: string, checked: boolean) =>
		onChange(checked ? [...selected, key] : selected.filter((v) => v !== key))

	return (
		<View style={[styles.wrap, style]}>
			<View style={styles.head}>
				<Text style={styles.label}>{label}</Text>
				<Text style={styles.count}>{selected.length ? `${selected.length} added` : 'None yet'}</Text>
			</View>

			<View style={styles.chips} accessibilityRole="list" accessibilityLabel={label}>
				{shown.map((value) => {
					const text = labels.get(value) ?? value
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
									onPress={() => onChange(selected.filter((v) => v !== value))}
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

			<AppBottomSheet
				visible={open}
				onClose={closeSheet}
				title={sheetTitle ?? label}
				subtitle={`${selected.length} selected · pick all that apply`}
				appearance="modern"
				showHeaderDivider={false}
				scrollEnabled={false}
				maxHeightRatio={0.88}
				footer={
					<AppButton variant="primary" size="lg" onPress={closeSheet}>
						Done
					</AppButton>
				}
			>
				<View style={[styles.sheetBody, { height: Math.round(windowHeight * LIST_HEIGHT_RATIO) }]}>
					<View style={styles.search}>
						<MaterialCommunityIcons name="magnify" size={18} color={APP_COLORS.inkMuted} />
						<TextInput
							value={query}
							onChangeText={setQuery}
							placeholder={searchPlaceholder}
							placeholderTextColor={APP_COLORS.inkMuted}
							style={styles.searchInput}
							autoCorrect={false}
							returnKeyType="search"
							accessibilityLabel={searchPlaceholder}
						/>
					</View>
					{items.length ? (
						<ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
							<AppCheckList variant="square" items={items} onToggle={toggle} style={styles.checkList} />
						</ScrollView>
					) : (
						<Text style={styles.empty}>No match found.</Text>
					)}
				</View>
			</AppBottomSheet>
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
	sheetBody: {
		flexShrink: 1,
		gap: 8,
	},
	search: {
		height: 44,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		paddingHorizontal: 12,
		borderWidth: 1,
		borderColor: APP_COLORS.border,
		borderRadius: 10,
	},
	searchInput: {
		flex: 1,
		padding: 0,
		fontSize: 16,
		color: APP_COLORS.ink,
	},
	checkList: {
		paddingBottom: 8,
	},
	empty: {
		marginTop: 18,
		textAlign: 'center',
		fontSize: 14,
		color: APP_COLORS.inkMuted,
	},
})
