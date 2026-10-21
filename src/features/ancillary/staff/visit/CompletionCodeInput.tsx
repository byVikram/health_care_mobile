// src/features/ancillary/staff/visit/CompletionCodeInput.tsx
//
// "4 · Complete visit" code boxes: four 56x64 boxes (radius 12, 2px border, 26/800 digit) driven by one invisible
// numeric input laid over them. Border: primary on the box being typed, ink once filled, divider while empty,
// danger after a wrong code.
import React, { useRef } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { APP_COLORS } from '../../../../config/theme'

type Props = {
	length?: number
	value: string
	onChange: (value: string) => void
	error?: boolean
	disabled?: boolean
	autoFocus?: boolean
	accessibilityLabel?: string
}

export function CompletionCodeInput({
	length = 4,
	value,
	onChange,
	error = false,
	disabled = false,
	autoFocus = false,
	accessibilityLabel = 'Completion code',
}: Props) {
	const ref = useRef<TextInput>(null)
	const [focused, setFocused] = React.useState(autoFocus)

	return (
		<Pressable
			onPress={() => ref.current?.focus()}
			disabled={disabled}
			style={[styles.row, disabled && styles.disabled]}
			accessibilityLabel={`${accessibilityLabel}, ${length} digits`}
		>
			{Array.from({ length }, (_, i) => {
				const active = focused && value.length === i
				const borderColor = error
					? APP_COLORS.danger
					: active
						? APP_COLORS.primary
						: value[i]
							? APP_COLORS.ink
							: APP_COLORS.divider
				return (
					<View
						key={i}
						style={[styles.box, { borderColor }, error && styles.boxError]}
						importantForAccessibility="no-hide-descendants"
					>
						<Text style={styles.digit}>{value[i] ?? ''}</Text>
					</View>
				)
			})}
			<TextInput
				ref={ref}
				value={value}
				onChangeText={(t) => onChange(t.replace(/\D/g, '').slice(0, length))}
				keyboardType="number-pad"
				maxLength={length}
				autoFocus={autoFocus}
				editable={!disabled}
				onFocus={() => setFocused(true)}
				onBlur={() => setFocused(false)}
				textContentType="oneTimeCode"
				autoComplete="sms-otp"
				caretHidden
				accessibilityLabel={accessibilityLabel}
				style={styles.hidden}
			/>
		</Pressable>
	)
}

const styles = StyleSheet.create({
	row: {
		flexDirection: 'row',
		justifyContent: 'center',
		gap: 10,
	},
	disabled: {
		opacity: 0.6,
	},
	box: {
		width: 56,
		height: 64,
		borderRadius: 12,
		borderWidth: 2,
		backgroundColor: APP_COLORS.surface,
		alignItems: 'center',
		justifyContent: 'center',
	},
	boxError: {
		backgroundColor: APP_COLORS.dangerBg,
	},
	digit: {
		fontSize: 26,
		lineHeight: 32,
		fontWeight: '800',
		color: APP_COLORS.ink,
	},
	hidden: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		opacity: 0,
		fontSize: 16,
	},
})

export default CompletionCodeInput
