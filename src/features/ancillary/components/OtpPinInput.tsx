import React, { useRef, useState } from 'react'
import { StyleSheet, TextInput, View } from 'react-native'

interface OtpPinInputProps {
	length?: number
	value: string
	onChangeValue: (val: string) => void
}

export default function OtpPinInput({ length = 4, value, onChangeValue }: OtpPinInputProps) {
	const inputs = useRef<TextInput[]>([])
	const [focusedIndex, setFocusedIndex] = useState(0)

	const handleChangeText = (text: string, index: number) => {
		const pinArray = value.split('')
		pinArray[index] = text.slice(-1) // take last character

		const newPin = pinArray.join('')
		onChangeValue(newPin)

		if (text && index < length - 1) {
			inputs.current[index + 1]?.focus()
		}
	}

	const handleKeyPress = (e: any, index: number) => {
		if (e.nativeEvent.key === 'Backspace') {
			if (!value[index] && index > 0) {
				const pinArray = value.split('')
				pinArray[index - 1] = ''
				onChangeValue(pinArray.join(''))
				inputs.current[index - 1]?.focus()
			}
		}
	}

	const digits = value.padEnd(length, ' ').split('').slice(0, length)

	return (
		<View style={styles.container}>
			{digits.map((digit, index) => (
				<TextInput
					key={index}
					ref={(ref) => {
						if (ref) inputs.current[index] = ref
					}}
					style={[
						styles.input,
						focusedIndex === index && styles.inputFocused,
						digit !== ' ' && styles.inputFilled,
					]}
					keyboardType="numeric"
					maxLength={1}
					value={digit === ' ' ? '' : digit}
					onChangeText={(text) => handleChangeText(text, index)}
					onKeyPress={(e) => handleKeyPress(e, index)}
					onFocus={() => setFocusedIndex(index)}
					onBlur={() => setFocusedIndex(-1)}
					selectTextOnFocus
				/>
			))}
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		gap: 14,
		marginVertical: 16,
		maxWidth: 280,
		alignSelf: 'center',
		width: '100%',
	},
	input: {
		flex: 1,
		height: 56,
		borderRadius: 12,
		borderWidth: 2,
		borderColor: '#E6EDF2',
		backgroundColor: '#F8FAFC',
		textAlign: 'center',
		fontSize: 22,
		fontWeight: '700',
		color: '#16324A',
	},
	inputFocused: {
		borderColor: '#2B6F71',
		backgroundColor: '#FFFFFF',
		shadowColor: '#2B6F71',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 2,
	},
	inputFilled: {
		borderColor: '#2B6F71',
		backgroundColor: '#FFFFFF',
	},
})
