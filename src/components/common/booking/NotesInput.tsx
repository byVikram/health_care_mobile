import React from 'react'
import { StyleSheet, Text, TextInput, View } from 'react-native'
import { APP_COLORS } from '../../../config/theme'

interface NotesInputProps {
	value: string
	onChangeValue: (val: string) => void
	placeholder?: string
	/**
	 * 'default' keeps the existing multi-line notes box. 'field' is the KarolaHealth design single-line
	 * field (13/700 label above, 44h input, 1px APP_COLORS.border, radius 10, 15px ink text) — e.g.
	 * "Note for the nurse (optional)" on Review & pay.
	 */
	variant?: 'default' | 'field'
	/** Label shown above the input ('field' variant only). */
	label?: string
	maxLength?: number
}

export default function NotesInput({
	value,
	onChangeValue,
	placeholder = 'Add clinical notes, observations, or special instructions...',
	variant = 'default',
	label,
	maxLength,
}: NotesInputProps) {
	if (variant === 'field') {
		return (
			<View style={styles.fieldWrap}>
				{!!label && <Text style={styles.fieldLabel}>{label}</Text>}
				<TextInput
					style={styles.fieldInput}
					placeholder={placeholder}
					placeholderTextColor={APP_COLORS.inkMuted}
					value={value}
					onChangeText={onChangeValue}
					maxLength={maxLength}
					accessibilityLabel={label}
					returnKeyType="done"
				/>
			</View>
		)
	}

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
				maxLength={maxLength}
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
	fieldWrap: {
		width: '100%',
		gap: 6,
	},
	fieldLabel: {
		fontSize: 13,
		lineHeight: 18,
		fontWeight: '700',
		color: APP_COLORS.ink,
	},
	fieldInput: {
		height: 44,
		paddingHorizontal: 12,
		borderWidth: 1,
		borderColor: APP_COLORS.border,
		borderRadius: 10,
		fontSize: 15,
		color: APP_COLORS.ink,
		backgroundColor: APP_COLORS.surface,
	},
})
