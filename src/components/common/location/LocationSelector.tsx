import React from 'react'
import { View, StyleSheet, TouchableOpacity } from 'react-native'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { AppTypography } from '../display/AppTypography'
import { useNavigation } from '@react-navigation/native'

import { ROUTES } from '../../../navigation/routes'
import { useAuth } from '../../../context/AuthContext'

interface LocationSelectorProps {
	location?: string
	color?: string
}

export default function LocationSelector({ location, color = '#f2f4f4' }: LocationSelectorProps) {
	const navigation = useNavigation<any>()
	const { currentLocation } = useAuth()

	const displayLocation = currentLocation?.address || location || 'Select Location'

	return (
		<TouchableOpacity 
			style={styles.locationRow} 
			onPress={() => {
				navigation.navigate(ROUTES.STACK.LOCATION_SELECT)
			}} 
			activeOpacity={0.7}
		>
			<MaterialCommunityIcons name="map-marker-outline" size={16} color={color} />
			<AppTypography variant="body" style={[styles.locationText, { color }]} numberOfLines={1}>
				{displayLocation}
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
		maxWidth: 200,
	},
})
