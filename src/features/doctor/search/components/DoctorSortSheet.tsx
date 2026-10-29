// "Sort by" sheet of the Find a doctor screen: six options, each with a one-line description, a radio on the right.
// Choosing one applies it and closes the sheet.

import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { AppBottomSheet } from '../../../../components/common'
import { APP_COLORS } from '../../../../config/theme'
import { SORT_OPTIONS, type SortKey } from '../doctorFilters'

export type DoctorSortSheetProps = {
	visible: boolean
	value: SortKey
	onSelect: (value: SortKey) => void
	onClose: () => void
}

export function DoctorSortSheet({ visible, value, onSelect, onClose }: DoctorSortSheetProps) {
	return (
		<AppBottomSheet
			visible={visible}
			title="Sort by"
			onClose={onClose}
			appearance="modern"
			showHeaderDivider={false}
		>
			<View accessibilityRole="radiogroup" style={styles.list}>
				{SORT_OPTIONS.map((option, i) => {
					const on = option.value === value
					return (
						<TouchableOpacity
							key={option.value}
							style={[styles.row, i === SORT_OPTIONS.length - 1 && styles.rowLast]}
							onPress={() => onSelect(option.value)}
							activeOpacity={0.8}
							accessibilityRole="radio"
							accessibilityState={{ checked: on }}
							accessibilityLabel={`${option.label}. ${option.hint}`}
						>
							<View style={styles.text}>
								<Text style={[styles.label, on && styles.labelOn]}>{option.label}</Text>
								<Text style={styles.hint}>{option.hint}</Text>
							</View>
							<View style={[styles.radio, on && styles.radioOn]} />
						</TouchableOpacity>
					)
				})}
			</View>
		</AppBottomSheet>
	)
}

export default DoctorSortSheet

const styles = StyleSheet.create({
	list: {
		paddingBottom: 4,
	},
	row: {
		minHeight: 52,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#EEF2F2',
	},
	rowLast: {
		borderBottomWidth: 0,
	},
	text: {
		flex: 1,
		minWidth: 0,
	},
	label: {
		fontSize: 15,
		lineHeight: 22,
		fontWeight: '500',
		color: APP_COLORS.ink,
	},
	labelOn: {
		fontWeight: '800',
	},
	hint: {
		fontSize: 12,
		lineHeight: 16,
		color: APP_COLORS.inkMuted,
	},
	radio: {
		width: 20,
		height: 20,
		borderRadius: 10,
		borderWidth: 2,
		borderColor: '#9AA7A9',
		backgroundColor: APP_COLORS.surface,
	},
	radioOn: {
		borderWidth: 6,
		borderColor: APP_COLORS.primary,
	},
})
