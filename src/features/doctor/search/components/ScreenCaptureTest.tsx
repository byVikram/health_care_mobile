import React, { useEffect } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import * as ScreenCapture from 'expo-screen-capture'

export default function ScreenCaptureTest() {
	useEffect(() => {
		const enableProtection = async () => {
			await ScreenCapture.preventScreenCaptureAsync()
		}

		enableProtection()

		return () => {
			ScreenCapture.allowScreenCaptureAsync()
		}
	}, [])

	return (
		<View style={styles.container}>
			<Text style={styles.title}>Screenshot Protected Screen</Text>

			<Text style={styles.subtitle}>Try taking a screenshot or recording the screen.</Text>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 20,
	},
	title: {
		fontSize: 24,
		fontWeight: 'bold',
	},
	subtitle: {
		marginTop: 20,
		fontSize: 16,
		textAlign: 'center',
	},
})
