import React from 'react'
import { View, StyleSheet, TouchableOpacity } from 'react-native'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { AppTypography } from './AppTypography'
import { useNavigation } from '@react-navigation/native'

interface LocationSelectorProps {
	location?: string
	color?: string
}

export default function LocationSelector({ location = 'Bangalore', color = '#f2f4f4' }: LocationSelectorProps) {
	const navigation = useNavigation<any>()

	return (
		<TouchableOpacity 
			style={styles.locationRow} 
			onPress={() => {
				// Navigate to home or location screen
			}} 
			activeOpacity={0.7}
		>
			<MaterialCommunityIcons name="map-marker-outline" size={16} color={color} />
			<AppTypography variant="body" style={[styles.locationText, { color }]}>
				{location}
			</AppTypography>
			<MaterialCommunityIcons name="chevron-down" size={16} color={color} />
		</TouchableOpacity>
	)
}

const styles = StyleSheet.create({
	locationRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	locationText: {
		fontWeight: '500',
	},
})
