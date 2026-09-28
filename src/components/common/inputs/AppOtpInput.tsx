// src/components/common/inputs/AppOtpInput.tsx
//
// Segmented OTP / PIN entry (one box per digit) used by the staff start-visit and completion
// flows. Typing advances focus, Backspace on an empty box clears and returns to the previous one.
// Styled with the KarolaHealth tokens: pageBg boxes with a divider border, primary when focused
// or filled, danger when `error` is set.

import React, { useRef, useState } from 'react'
import {
	NativeSyntheticEvent,
	StyleProp,
	StyleSheet,
	TextInput,
	TextInputKeyPressEventData,
	View,
	ViewStyle,
} from 'react-native'
import { APP_COLORS } from '../../../config/theme'

export interface AppOtpInputProps {
	/** Number of digit boxes (default 4). */
	length?: number
	value: string
	onChange: (value: string) => void
	/** Called once every box is filled, with the full code. */
	onComplete?: (value: string) => void
	/** Mask the digits (PIN entry). */
	secure?: boolean
	/** Focus the first box on mount. */
	autoFocus?: boolean
	/** Show the danger border (e.g. after a wrong code). */
	error?: boolean
	disabled?: boolean
	/** Accessibility label prefix for each box, e.g. "Start code" gives "Start code digit 1 of 4". */
	accessibilityLabel?: string
	style?: StyleProp<ViewStyle>
}

export function AppOtpInput({
	length = 4,
	value,
	onChange,
	onComplete,
	secure = false,
	autoFocus = false,
	error = false,
	disabled = false,
	accessibilityLabel = 'Code',
	style,
}: AppOtpInputProps) {
	const inputs = useRef<TextInput[]>([])
	const [focusedIndex, setFocusedIndex] = useState(autoFocus ? 0 : -1)

	const handleChangeText = (text: string, index: number) => {
		const pinArray = value.split('')
		pinArray[index] = text.slice(-1) // take last character

		const newPin = pinArray.join('')
		onChange(newPin)

		if (text && index < length - 1) {
			inputs.current[index + 1]?.focus()
		}
		if (text && newPin.length === length) {
			onComplete?.(newPin)
		}
	}

	const handleKeyPress = (e: NativeSyntheticEvent<TextInputKeyPressEventData>, index: number) => {
		if (e.nativeEvent.key === 'Backspace') {
			if (!value[index] && index > 0) {
				const pinArray = value.split('')
				pinArray[index - 1] = ''
				onChange(pinArray.join(''))
				inputs.current[index - 1]?.focus()
			}
		}
	}

	const digits = value.padEnd(length, ' ').split('').slice(0, length)

	return (
		<View style={[styles.container, style]}>
			{digits.map((digit, index) => {
				const filled = digit !== ' '
				return (
					<TextInput
						key={index}
						ref={(ref) => {
							if (ref) inputs.current[index] = ref
						}}
						style={[
							styles.input,
							filled && styles.inputFilled,
							focusedIndex === index && styles.inputFocused,
							error && styles.inputError,
							disabled && styles.inputDisabled,
						]}
						keyboardType="number-pad"
						maxLength={1}
						value={filled ? digit : ''}
						onChangeText={(text) => handleChangeText(text, index)}
						onKeyPress={(e) => handleKeyPress(e, index)}
						onFocus={() => setFocusedIndex(index)}
						onBlur={() => setFocusedIndex(-1)}
						selectTextOnFocus
						secureTextEntry={secure}
						autoFocus={autoFocus && index === 0}
						editable={!disabled}
						textContentType={index === 0 ? 'oneTimeCode' : 'none'}
						autoComplete={index === 0 ? 'sms-otp' : 'off'}
						selectionColor={APP_COLORS.primary}
						accessibilityLabel={`${accessibilityLabel} digit ${index + 1} of ${length}`}
						accessibilityState={{ disabled }}
					/>
				)
			})}
		</View>
	)
}

export default AppOtpInput

const styles = StyleSheet.create({
	container: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		gap: 12,
		marginVertical: 16,
		maxWidth: 280,
		alignSelf: 'center',
		width: '100%',
	},
	input: {
		flex: 1,
		height: 56,
		borderRadius: 12,
		borderWidth: 1.5,
		borderColor: APP_COLORS.divider,
		backgroundColor: APP_COLORS.pageBg,
		textAlign: 'center',
		fontSize: 22,
		lineHeight: 28,
		fontWeight: '800',
		color: APP_COLORS.ink,
	},
	inputFilled: {
		borderColor: APP_COLORS.primary,
		backgroundColor: APP_COLORS.surface,
	},
	inputFocused: {
		borderWidth: 2,
		borderColor: APP_COLORS.primary,
		backgroundColor: APP_COLORS.surface,
	},
	inputError: {
		borderColor: APP_COLORS.danger,
		backgroundColor: APP_COLORS.dangerBg,
	},
	inputDisabled: {
		opacity: 0.5,
	},
})
