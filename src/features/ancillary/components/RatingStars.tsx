import React from 'react'
import { StyleSheet, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

interface RatingStarsProps {
	rating: number
	size?: number
	color?: string
}

export default function RatingStars({ rating, size = 14, color = '#F59E0B' }: RatingStarsProps) {
	const rounded = Math.round(rating * 2) / 2

	const icons = [1, 2, 3, 4, 5].map((position) => {
		if (rounded >= position) return 'star'
		if (rounded + 0.5 === position) return 'star-half'
		return 'star-outline'
	})

	return (
		<View style={styles.row}>
			{icons.map((iconName, idx) => (
				<Ionicons
					key={idx}
					name={iconName as any}
					size={size}
					color={color}
					style={idx > 0 ? styles.spacing : undefined}
				/>
			))}
		</View>
	)
}

const styles = StyleSheet.create({
	row: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	spacing: {
		marginLeft: 2,
	},
})
