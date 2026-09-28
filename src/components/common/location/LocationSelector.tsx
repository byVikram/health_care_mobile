import React from 'react'
import { StyleSheet, TouchableOpacity, type StyleProp, type TextStyle } from 'react-native'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { AppTypography } from '../display/AppTypography'
import { useNavigation } from '@react-navigation/native'

import { ROUTES } from '../../../navigation/routes'
import { useAuth } from '../../../context/AuthContext'

interface LocationSelectorProps {
	location?: string
	color?: string
	/** Extra label style (e.g. the patient Home header's 13/600). */
	textStyle?: StyleProp<TextStyle>
	/** Pin / chevron glyph size. Defaults to 16. */
	iconSize?: number
}

export default function LocationSelector({ location, color = '#f2f4f4', textStyle, iconSize = 16 }: LocationSelectorProps) {
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
			<MaterialCommunityIcons name="map-marker-outline" size={iconSize} color={color} />
			<AppTypography variant="body" style={[styles.locationText, { color }, textStyle]} numberOfLines={1}>
				{displayLocation}
			</AppTypography>
			<MaterialCommunityIcons name="chevron-down" size={iconSize} color={color} />
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
