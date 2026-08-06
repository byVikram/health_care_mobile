import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

interface CareChecklistProps {
	items: string[]
	checkedState: Record<string, boolean>
	onToggleItem: (item: string) => void
}

export default function CareChecklist({ items, checkedState, onToggleItem }: CareChecklistProps) {
	return (
		<View style={styles.card}>
			<Text style={styles.title}>Nursing Procedure Checklist</Text>
			<Text style={styles.subtitle}>Complete all procedures before submitting</Text>

			<View style={styles.list}>
				{items.map((item) => {
					const isChecked = !!checkedState[item]

					return (
						<TouchableOpacity
							key={item}
							style={[styles.itemRow, isChecked && styles.itemRowChecked]}
							onPress={() => onToggleItem(item)}
							activeOpacity={0.7}
						>
							<View
								style={[
									styles.checkbox,
									isChecked && styles.checkboxChecked,
								]}
							>
								{isChecked && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
							</View>
							<Text style={[styles.itemText, isChecked && styles.itemTextChecked]}>
								{item}
							</Text>
						</TouchableOpacity>
					)
				})}
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	card: {
		backgroundColor: '#FFFFFF',
		borderRadius: 16,
		padding: 16,
		borderWidth: 1,
		borderColor: '#E6EDF2',
		shadowColor: '#12373E',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.04,
		shadowRadius: 8,
		elevation: 2,
		marginBottom: 16,
	},
	title: {
		fontSize: 15,
		fontWeight: '700',
		color: '#16324A',
		marginBottom: 4,
	},
	subtitle: {
		fontSize: 12,
		color: '#587087',
		marginBottom: 16,
	},
	list: {
		gap: 10,
	},
	itemRow: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 12,
		paddingHorizontal: 12,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#E6EDF2',
		backgroundColor: '#F8FAFC',
	},
	itemRowChecked: {
		borderColor: '#E8F5E9',
		backgroundColor: '#F4FBF7',
	},
	checkbox: {
		width: 22,
		height: 22,
		borderRadius: 6,
		borderWidth: 2,
		borderColor: '#CBD5E1',
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 12,
		backgroundColor: '#FFFFFF',
	},
	checkboxChecked: {
		borderColor: '#10B981',
		backgroundColor: '#10B981',
	},
	itemText: {
		fontSize: 14,
		fontWeight: '600',
		color: '#334155',
		flex: 1,
	},
	itemTextChecked: {
		color: '#047857',
		textDecorationLine: 'line-through',
	},
})
