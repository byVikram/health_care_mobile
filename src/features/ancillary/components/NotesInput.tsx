import React from 'react'
import { StyleSheet, TextInput, View } from 'react-native'

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
		<View style={styles.container}>
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
	container: {
		width: '100%',
	},
	input: {
		minHeight: 96,
		backgroundColor: '#F8FAFC',
		borderWidth: 1,
		borderColor: '#E2E8F0',
		borderRadius: 12,
		padding: 12,
		fontSize: 13.5,
		color: '#0F172A',
		lineHeight: 19,
	},
})
