import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

export interface BookingOptionCardProps {
	label: string
	iconName?: keyof typeof MaterialCommunityIcons.glyphMap
	icon?: React.ReactNode
	iconColor: string
	iconBgColor: string
	onPress: () => void
	width?: string | number
}

// Urban-Company-style tile: a soft tinted square icon "image" on top with the
// label centered underneath, arranged in a responsive grid by the parent.
export default function BookingOptionCard({
	label,
	iconName,
	icon,
	iconColor,
	iconBgColor,
	onPress,
	width = '48%',
}: BookingOptionCardProps) {
	return (
		<TouchableOpacity
			style={[styles.tile, { width } as any]}
			activeOpacity={0.75}
			onPress={onPress}
		>
			<View style={[styles.iconTile, { backgroundColor: iconBgColor }]}>
				{icon ?? (iconName ? <MaterialCommunityIcons name={iconName} size={30} color={iconColor} /> : null)}
			</View>
			<Text style={styles.label} numberOfLines={2}>
				{label}
			</Text>
		</TouchableOpacity>
	)
}

const styles = StyleSheet.create({
	tile: {
		alignItems: 'center',
	},
	iconTile: {
		width: 68,
		height: 68,
		borderRadius: 0,
		justifyContent: 'center',
		alignItems: 'center',
		marginBottom: 8,
	},
	label: {
		fontSize: 12.5,
		fontWeight: '700',
		color: '#26383d',
		textAlign: 'center',
		lineHeight: 16,
	},
})
