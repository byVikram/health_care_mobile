// src/components/common/inputs/AppFormField.tsx
//
// Labelled form field from the profile designs: 13/18 700 ink label (red " *" when required,
// muted " (optional)" when optional), a 48px input (1px APP_COLORS.border, radius 10, 16px ink text),
// optional helper line and a 12/16 danger error line. Pass `children` to wrap another control (AppSelect,
// AppCalendar, a chip group...) with the same label / error chrome instead of the built-in TextInput.
// `action` renders a small text link on the label row (e.g. "Change number").

import React from 'react'
import {
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
	type KeyboardTypeOptions,
	type StyleProp,
	type TextInputProps,
	type ViewStyle,
} from 'react-native'
import { APP_COLORS } from '../../../config/theme'

export type AppFormFieldProps = {
	label: string
	required?: boolean
	optional?: boolean
	value?: string
	onChangeText?: (value: string) => void
	placeholder?: string
	keyboardType?: KeyboardTypeOptions
	maxLength?: number
	multiline?: boolean
	/** Read-only input (greyed background); still selectable. */
	editable?: boolean
	autoCapitalize?: TextInputProps['autoCapitalize']
	/** Muted line under the input. */
	helper?: string
	errorText?: string
	/** Small primary text link on the label row. */
	action?: { label: string; onPress: () => void }
	/** Replaces the built-in TextInput (label / helper / error are still rendered). */
	children?: React.ReactNode
	style?: StyleProp<ViewStyle>
	inputProps?: Omit<TextInputProps, 'value' | 'onChangeText' | 'style'>
}

export function AppFormField({
	label,
	required = false,
	optional = false,
	value,
	onChangeText,
	placeholder,
	keyboardType,
	maxLength,
	multiline = false,
	editable = true,
	autoCapitalize,
	helper,
	errorText,
	action,
	children,
	style,
	inputProps,
}: AppFormFieldProps) {
	return (
		<View style={[styles.field, style]}>
			<View style={styles.labelRow}>
				<Text style={styles.label}>
					{label}
					{required ? <Text style={styles.required}> *</Text> : null}
					{optional ? <Text style={styles.optional}> (optional)</Text> : null}
				</Text>
				{action ? (
					<TouchableOpacity onPress={action.onPress} accessibilityRole="button" hitSlop={8}>
						<Text style={styles.action}>{action.label}</Text>
					</TouchableOpacity>
				) : null}
			</View>
			{children ?? (
				<TextInput
					style={[
						styles.input,
						multiline && styles.inputMultiline,
						!editable && styles.inputReadOnly,
						!!errorText && styles.inputError,
					]}
					value={value}
					onChangeText={onChangeText}
					placeholder={placeholder}
					placeholderTextColor={APP_COLORS.inkMuted}
					keyboardType={keyboardType}
					maxLength={maxLength}
					multiline={multiline}
					textAlignVertical={multiline ? 'top' : 'center'}
					editable={editable}
					autoCapitalize={autoCapitalize}
					accessibilityLabel={label}
					{...inputProps}
				/>
			)}
			{!!helper && !errorText && <Text style={styles.helper}>{helper}</Text>}
			{!!errorText && <Text style={styles.error}>{errorText}</Text>}
		</View>
	)
}

/** Standard look for AppSelect inside an AppFormField (48px, radius 10, APP_COLORS.border). */
export const FORM_SELECT_PROPS = {
	size: 'form' as const,
	borderRadius: 10,
	borderColor: APP_COLORS.border,
	noMargin: true,
}

const styles = StyleSheet.create({
	field: {
		gap: 6,
	},
	labelRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 8,
	},
	label: {
		flexShrink: 1,
		fontSize: 13,
		lineHeight: 18,
		fontWeight: '700',
		color: APP_COLORS.ink,
	},
	required: {
		color: APP_COLORS.danger,
	},
	optional: {
		fontWeight: '400',
		color: APP_COLORS.inkMuted,
	},
	action: {
		fontSize: 13,
		lineHeight: 18,
		fontWeight: '700',
		color: APP_COLORS.primary,
	},
	input: {
		height: 48,
		paddingHorizontal: 12,
		borderWidth: 1,
		borderColor: APP_COLORS.border,
		borderRadius: 10,
		fontSize: 16,
		color: APP_COLORS.ink,
		backgroundColor: APP_COLORS.surface,
	},
	inputMultiline: {
		height: undefined,
		minHeight: 96,
		paddingTop: 12,
		paddingBottom: 12,
	},
	inputReadOnly: {
		backgroundColor: APP_COLORS.pageBg,
		color: APP_COLORS.inkMuted,
	},
	inputError: {
		borderColor: APP_COLORS.danger,
	},
	helper: {
		fontSize: 12,
		lineHeight: 16,
		color: APP_COLORS.inkMuted,
	},
	error: {
		fontSize: 12,
		lineHeight: 16,
		fontWeight: '600',
		color: APP_COLORS.danger,
	},
})

export default AppFormField
