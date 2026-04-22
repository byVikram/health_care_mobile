import React from 'react'
import { StyleSheet, View } from 'react-native'
import { TextInput as PaperTextInput, Text, useTheme } from 'react-native-paper'

interface AppInputProps extends React.ComponentProps<typeof PaperTextInput> {
	errorText?: string
}

type AppInputComponent = React.FC<AppInputProps> & {
	Icon: typeof PaperTextInput.Icon
}

export const AppInput: AppInputComponent = ({ errorText, style, ...props }: AppInputProps) => {
	const theme = useTheme()

	return (
		<View style={styles.container}>
			<PaperTextInput mode="outlined" style={[styles.input, style]} error={!!errorText} {...props} />
			{errorText ? <Text style={[styles.errorText, { color: theme.colors.error }]}>{errorText}</Text> : null}
		</View>
	)
}

AppInput.Icon = PaperTextInput.Icon

const styles = StyleSheet.create({
	container: {
		marginBottom: 16,
		width: '100%',
	},
	input: {
		backgroundColor: '#fff',
	},
	errorText: {
		fontSize: 12,
		marginTop: 4,
		marginLeft: 4,
	},
})
