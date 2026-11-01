// src/components/common/inputs/AppOptionSheet.tsx
//
// The bottom sheet every profile picker opens (gender, blood group, allergies, occupation, ...), from the "Areas of
// expertise" design: title with a muted subtitle on the left and a filled "Done" button at the top right, an optional
// search field, then divided checkbox rows.
//
//   mode 'multi'  -- "3 selected · pick all that apply"; each tap ticks / unticks a row.
//   mode 'single' -- "Pick one"; tapping a row moves the tick to it.
//
// Choices apply as they are tapped (the sheet has no draft), so closing it any way keeps what was picked; Done is
// just the obvious way out.

import React, { useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions } from 'react-native'
import { APP_COLORS } from '../../../config/theme'
import { AppBottomSheet } from '../layout/AppBottomSheet'
import { AppCheckList } from './AppCheckList'
import AppSearchBar from './AppSearchBar'

export type AppOptionSheetOption = { label: string; value: string }

export type AppOptionSheetProps = {
	visible: boolean
	onClose: () => void
	title: string
	options: AppOptionSheetOption[]
	/** Values that are ticked. */
	selected: string[]
	mode: 'single' | 'multi'
	/** Called with the value that was tapped and whether it is now ticked. */
	onToggle: (value: string, checked: boolean) => void
	/** Show the search field. Defaults to lists longer than 8. */
	searchable?: boolean
	searchPlaceholder?: string
}

const SEARCH_THRESHOLD = 8
const LIST_HEIGHT_RATIO = 0.5

export function AppOptionSheet({
	visible,
	onClose,
	title,
	options,
	selected,
	mode,
	onToggle,
	searchable,
	searchPlaceholder,
}: AppOptionSheetProps) {
	const [query, setQuery] = useState('')
	const { height: windowHeight } = useWindowDimensions()
	const showSearch = searchable ?? options.length > SEARCH_THRESHOLD

	const items = useMemo(() => {
		const q = query.trim().toLowerCase()
		return options
			.filter((o) => !q || o.label.toLowerCase().includes(q))
			.map((o) => ({ key: o.value, label: o.label, checked: selected.includes(o.value) }))
	}, [options, query, selected])

	const close = () => {
		setQuery('')
		onClose()
	}

	const handleToggle = (value: string, checked: boolean) => {
		if (mode === 'single') {
			if (checked) onToggle(value, true)
			return
		}
		onToggle(value, checked)
	}

	return (
		<AppBottomSheet
			visible={visible}
			onClose={close}
			title={title}
			subtitle={mode === 'single' ? 'Pick one' : `${selected.length} selected · pick all that apply`}
			appearance="modern"
			showHeaderDivider={false}
			scrollEnabled={false}
			maxHeightRatio={0.88}
			showCloseButton={false}
			headerRight={
				<Pressable
					onPress={close}
					accessibilityRole="button"
					accessibilityLabel="Done"
					style={({ pressed }) => [styles.done, pressed && styles.donePressed]}
				>
					<Text style={styles.doneText}>Done</Text>
				</Pressable>
			}
		>
			{showSearch && (
				<AppSearchBar
					placeholder={searchPlaceholder ?? `Search ${title.toLowerCase()}`}
					hints={options.slice(0, 4).map((o) => o.label)}
					value={query}
					onChangeText={setQuery}
					showMicrophone={false}
					style={styles.search}
				/>
			)}
			{items.length ? (
				<ScrollView
					style={{ maxHeight: Math.round(windowHeight * LIST_HEIGHT_RATIO) }}
					keyboardShouldPersistTaps="handled"
					showsVerticalScrollIndicator={false}
				>
					<AppCheckList variant="square" divided items={items} onToggle={handleToggle} style={styles.list} />
				</ScrollView>
			) : (
				<Text style={styles.empty}>{options.length ? 'No match found.' : 'No options available'}</Text>
			)}
		</AppBottomSheet>
	)
}

export default AppOptionSheet

const styles = StyleSheet.create({
	done: {
		height: 36,
		paddingHorizontal: 18,
		borderRadius: 10,
		backgroundColor: APP_COLORS.primary,
		alignItems: 'center',
		justifyContent: 'center',
	},
	donePressed: {
		backgroundColor: APP_COLORS.primaryDark,
	},
	doneText: {
		fontSize: 14,
		lineHeight: 20,
		fontWeight: '800',
		color: APP_COLORS.surface,
	},
	search: {
		marginBottom: 8,
	},
	list: {
		paddingBottom: 8,
	},
	empty: {
		marginTop: 18,
		textAlign: 'center',
		fontSize: 14,
		color: APP_COLORS.inkMuted,
	},
})
