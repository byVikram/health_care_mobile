import React from 'react'
import { StyleSheet, Text, TextInput, View } from 'react-native'

interface NotesInputProps {
	value: string
	onChangeValue: (val: string) => void
	placeholder?: string
}

export default function NotesInput({
	value,
	onChangeValue,
	placeholder = 'Add clinical notes, observations, or special instructions...',
}: NotesInputProps) {
	return (
		<View style={styles.card}>
			<Text style={styles.title}>Clinical Observation Notes</Text>
			<TextInput
				style={styles.input}
				multiline
				numberOfLines={4}
				placeholder={placeholder}
				placeholderTextColor="#94A3B8"
				value={value}
				onChangeText={onChangeValue}
				textAlignVertical="top"
			/>
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
		marginBottom: 12,
	},
	input: {
		minHeight: 100,
		backgroundColor: '#F8FAFC',
		borderWidth: 1,
		borderColor: '#E2E8F0',
		borderRadius: 12,
		padding: 12,
		fontSize: 14,
		color: '#1E293B',
		lineHeight: 20,
	},
})
