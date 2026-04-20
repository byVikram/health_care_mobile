import React from 'react'
import { View, StyleSheet, Text } from 'react-native'

export default function MyHospitalsTab() {
	return (
		<View style={styles.container}>
			<Text>My Hospitals Placeholder</Text>
		</View>
	)
}

const styles = StyleSheet.create({
	container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
})
