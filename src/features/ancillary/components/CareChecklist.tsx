import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { AppTypography } from '../../../components/common/display/AppTypography'

interface CareChecklistProps {
	items: string[]
	checkedState: Record<string, boolean>
	onToggleItem: (item: string) => void
}

export default function CareChecklist({ items, checkedState, onToggleItem }: CareChecklistProps) {
	return (
		<View style={styles.container}>
			{items.map((item) => {
				const isChecked = !!checkedState[item]

				return (
					<TouchableOpacity
						key={item}
						style={[styles.itemRow, isChecked && styles.itemRowChecked]}
						onPress={() => onToggleItem(item)}
						activeOpacity={0.7}
					>
						<View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
							{isChecked && <Ionicons name="checkmark" size={15} color="#FFFFFF" />}
						</View>
						<AppTypography variant="body" style={[styles.itemText, isChecked && styles.itemTextChecked]}>
							{item}
						</AppTypography>
					</TouchableOpacity>
				)
			})}
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		gap: 8,
	},
	itemRow: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#F8FAFC',
		borderRadius: 10,
		paddingHorizontal: 12,
		paddingVertical: 12,
		borderWidth: 1,
		borderColor: '#E2E8F0',
		gap: 12,
	},
	itemRowChecked: {
		backgroundColor: 'rgba(43, 111, 113, 0.08)',
		borderColor: '#2B6F71',
	},
	checkbox: {
		width: 22,
		height: 22,
		borderRadius: 6,
		borderWidth: 2,
		borderColor: '#94A3B8',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#FFFFFF',
	},
	checkboxChecked: {
		backgroundColor: '#2B6F71',
		borderColor: '#2B6F71',
	},
	itemText: {
		fontSize: 13.5,
		fontWeight: '600',
		color: '#1E293B',
		flex: 1,
	},
	itemTextChecked: {
		color: '#2B6F71',
		fontWeight: '700',
	},
})
