// src/components/common/inputs/AppMetricInput.tsx
//
// Small labelled reading field from the provider "Vitals" design: 12/16 700 muted label ("BP (mmHg)")
// over a 44px input (1px border, radius 10, 16px ink text). Numeric keyboard by default.

import React from 'react'
import {
	StyleSheet,
	Text,
	TextInput,
	View,
	type KeyboardTypeOptions,
	type StyleProp,
	type ViewStyle,
} from 'react-native'
import { APP_COLORS } from '../../../config/theme'

export type AppMetricInputProps = {
	label: string
	value: string
	onChangeText: (text: string) => void
	placeholder?: string
	keyboardType?: KeyboardTypeOptions
	maxLength?: number
	editable?: boolean
	onBlur?: () => void
	style?: StyleProp<ViewStyle>
}

export function AppMetricInput({
	label,
	value,
	onChangeText,
	placeholder,
	keyboardType = 'decimal-pad',
	maxLength = 12,
	editable = true,
	onBlur,
	style,
}: AppMetricInputProps) {
	return (
		<View style={[styles.root, style]}>
			<Text style={styles.label}>{label}</Text>
			<TextInput
				value={value}
				onChangeText={onChangeText}
				onBlur={onBlur}
				placeholder={placeholder}
				placeholderTextColor={APP_COLORS.inkMuted}
				keyboardType={keyboardType}
				maxLength={maxLength}
				editable={editable}
				accessibilityLabel={label}
				style={[styles.input, !editable && styles.inputDisabled]}
			/>
		</View>
	)
}

const styles = StyleSheet.create({
	root: {
		gap: 4,
		minWidth: 0,
	},
	label: {
		fontSize: 12,
		lineHeight: 16,
		fontWeight: '700',
		color: APP_COLORS.inkMuted,
	},
	input: {
		height: 44,
		paddingHorizontal: 10,
		borderWidth: 1,
		borderColor: APP_COLORS.border,
		borderRadius: 10,
		fontSize: 16,
		color: APP_COLORS.ink,
		backgroundColor: APP_COLORS.surface,
	},
	inputDisabled: {
		backgroundColor: APP_COLORS.pageBg,
	},
})

export default AppMetricInput
