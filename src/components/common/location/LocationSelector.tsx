import React, { useState } from 'react'
import { StyleSheet, TouchableOpacity, type StyleProp, type TextStyle } from 'react-native'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { AppTypography } from '../display/AppTypography'
import { useAuth } from '../../../context/AuthContext'
import { LocationSheet } from './LocationSheet'

interface LocationSelectorProps {
	location?: string
	color?: string
	/** Extra label style (e.g. the patient Home header's 13/600). */
	textStyle?: StyleProp<TextStyle>
	/** Pin / chevron glyph size. Defaults to 16. */
	iconSize?: number
}

export default function LocationSelector({
	location,
	color = '#f2f4f4',
	textStyle,
	iconSize = 16,
}: LocationSelectorProps) {
	const { currentLocation } = useAuth()
	const [open, setOpen] = useState(false)

	const displayLocation = currentLocation?.address || location || 'Select Location'

	return (
		<>
			<TouchableOpacity
				style={styles.locationRow}
				onPress={() => setOpen(true)}
				activeOpacity={0.7}
				accessibilityRole="button"
				accessibilityLabel={`Your location: ${displayLocation}. Change`}
			>
				<MaterialCommunityIcons name="map-marker-outline" size={iconSize} color={color} />
				<AppTypography variant="body" style={[styles.locationText, { color }, textStyle]} numberOfLines={1}>
					{displayLocation}
				</AppTypography>
				<MaterialCommunityIcons name="chevron-down" size={iconSize} color={color} />
			</TouchableOpacity>
			<LocationSheet visible={open} onClose={() => setOpen(false)} />
		</>
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
