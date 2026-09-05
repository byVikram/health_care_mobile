import React from 'react'
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native'
import { TextInput as PaperTextInput, Text, useTheme } from 'react-native-paper'

interface AppInputProps extends React.ComponentProps<typeof PaperTextInput> {
	errorText?: string
	containerStyle?: StyleProp<ViewStyle>
	fieldSize?: 'default' | 'compact' | 'form'
	noMargin?: boolean
	borderRadius?: number
	isSearch?: boolean
	showMicrophone?: boolean
	onMicrophonePress?: () => void
}

type AppInputComponent = React.FC<AppInputProps> & {
	Icon: typeof PaperTextInput.Icon
	Affix: typeof PaperTextInput.Affix
}

const FIELD_HEIGHTS = {
	compact: 42,
	form: 48,
}
const FIELD_RADII = {
	compact: 8,
	form: 10,
}

export const AppInput: AppInputComponent = ({
	errorText,
	style,
	contentStyle,
	outlineStyle,
	outlineColor,
	activeOutlineColor,
	textColor,
	containerStyle,
	fieldSize = 'default',
	noMargin = false,
	borderRadius,
	multiline,
	isSearch,
	showMicrophone,
	onMicrophonePress,
	...props
}: AppInputProps) => {
	const theme = useTheme()
	const fieldHeight = fieldSize === 'default' ? undefined : FIELD_HEIGHTS[fieldSize]
	const fieldRadius = fieldSize === 'default' ? undefined : borderRadius ?? FIELD_RADII[fieldSize]

	const leftIcon = isSearch && !props.left ? <PaperTextInput.Icon icon="magnify" size={24} color="#26727a" /> : props.left
	const rightIcon = isSearch && showMicrophone && !props.right ? <PaperTextInput.Icon icon="microphone-outline" size={24} color="#26727a" onPress={onMicrophonePress} /> : props.right

	return (
		<View style={[styles.container, noMargin && styles.containerNoMargin, containerStyle]}>
			<PaperTextInput
				mode="outlined"
				style={[
					styles.input,
					fieldHeight !== undefined && !multiline ? { height: fieldHeight, minHeight: fieldHeight } : undefined,
					fieldHeight !== undefined && multiline ? { minHeight: fieldHeight } : undefined,
					style,
				]}
				contentStyle={[
					fieldHeight !== undefined && !multiline ? { height: fieldHeight, minHeight: fieldHeight, paddingVertical: 0 } : undefined,
					fieldHeight !== undefined && multiline ? { minHeight: fieldHeight } : undefined,
					fieldSize !== 'default' && styles.content,
					contentStyle,
				]}
				outlineStyle={[fieldRadius !== undefined ? { borderRadius: fieldRadius } : undefined, outlineStyle]}
				error={!!errorText}
				outlineColor={outlineColor ?? (fieldSize !== 'default' ? '#a7d3db' : undefined)}
				activeOutlineColor={activeOutlineColor ?? (fieldSize !== 'default' ? '#1f8a8f' : undefined)}
				textColor={textColor ?? (fieldSize !== 'default' ? '#2f2f2f' : undefined)}
				multiline={multiline}
				left={leftIcon}
				right={rightIcon}
				{...props}
			/>
			{errorText ? <Text style={[styles.errorText, { color: theme.colors.error }]}>{errorText}</Text> : null}
		</View>
	)
}

AppInput.Icon = PaperTextInput.Icon
AppInput.Affix = PaperTextInput.Affix

const styles = StyleSheet.create({
	container: {
		marginBottom: 16,
		width: '100%',
	},
	containerNoMargin: {
		marginBottom: 0,
	},
	input: {
		backgroundColor: '#fff',
	},
	content: {
		fontSize: 14,
		lineHeight: 20,
	},
	errorText: {
		fontSize: 12,
		marginTop: 4,
		marginLeft: 4,
	},
})
