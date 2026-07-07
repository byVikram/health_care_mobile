import React from 'react'
import { View, Text, Image, TouchableOpacity, StyleSheet, ImageSourcePropType } from 'react-native'

import { PharmacyItem } from '../pharmacy'

import pharmacy2 from '../../../assets/Pharmacy/pharmacy2.png'
import pharmacy3 from '../../../assets/Pharmacy/pharmacy3.png'
import pharmacy4 from '../../../assets/Pharmacy/pharmacy4.png'

const pharmacyImages: ImageSourcePropType[] = [pharmacy2, pharmacy3, pharmacy4]

const getPharmacyImage = (id: string): ImageSourcePropType => {
	let hash = 0

	for (let i = 0; i < id.length; i++) {
		hash = (hash << 5) - hash + id.charCodeAt(i)
		hash |= 0
	}

	return pharmacyImages[Math.abs(hash) % pharmacyImages.length]
}

interface Props {
	pharmacy: PharmacyItem
	layout?: 'horizontal' | 'vertical'
	onPress?: () => void
	onPlaceOrder?: () => void
}

export default function PharmacySearchCard({ pharmacy, layout = 'vertical', onPress, onPlaceOrder }: Props) {
	const {
		id,
		name,
		address,
		city,
		operating_hours,
		home_delivery_available,
		is_24_x_7,
		emergency_medicine_available,
	} = pharmacy

	const isHorizontal = layout === 'horizontal'

	return (
		<TouchableOpacity
			style={[styles.card, isHorizontal && styles.horizontalCard]}
			activeOpacity={0.9}
			onPress={onPress}
		>
			{/* IMAGE */}
			<View style={[styles.imageContainer, isHorizontal && styles.horizontalImageContainer]}>
				<Image source={getPharmacyImage(id)} style={styles.image} resizeMode="cover" />
			</View>

			{/* CONTENT */}
			<View style={styles.content}>
				<Text style={styles.name} numberOfLines={2}>
					{name}
				</Text>

				<Text style={styles.subText}>📍 {city}</Text>

				<Text style={styles.subText}>
					🕐 {is_24_x_7 ? 'Open 24×7' : `${operating_hours?.open ?? ''} - ${operating_hours?.close ?? ''}`}
				</Text>

				<Text style={styles.subText} numberOfLines={1}>
					{address}
				</Text>

				<View style={styles.chips}>
					{home_delivery_available && (
						<View style={[styles.chip, styles.deliveryChip]}>
							<Text style={styles.deliveryText}>Home Delivery</Text>
						</View>
					)}

					{emergency_medicine_available && (
						<View style={[styles.chip, styles.emergencyChip]}>
							<Text style={styles.emergencyText}>Emergency Meds</Text>
						</View>
					)}
				</View>

				<TouchableOpacity style={styles.button} onPress={onPlaceOrder}>
					<Text style={styles.buttonText}>Place Order</Text>
				</TouchableOpacity>
			</View>
		</TouchableOpacity>
	)
}

const styles = StyleSheet.create({
	card: {
		backgroundColor: '#fff',
		borderRadius: 12,
		overflow: 'hidden',
		borderWidth: 1,
		borderColor: '#EAECF0',
		marginBottom: 12,
	},

	horizontalCard: {
		flexDirection: 'row',
		minHeight: 180,
	},

	imageContainer: {
		height: 140,

		backgroundColor: '#f0f4f8',
	},

	horizontalImageContainer: {
		width: 120,
		height: 180, // match image height
	},

	image: {
		width: '100%',
		height: '100%',
	},

	content: {
		flex: 1,
		padding: 10,
		justifyContent: 'flex-start',
	},

	name: {
		fontSize: 14,
		fontWeight: '700',
		color: '#082b45',
	},

	subText: {
		fontSize: 12,
		color: '#5b7282',
		marginTop: 2,
	},

	/* CHIPS */
	chips: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 6,
		marginTop: 6,
	},

	chip: {
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 14,
	},

	deliveryChip: {
		backgroundColor: '#E8F5F5',
	},

	deliveryText: {
		color: '#2B6F71',
		fontSize: 10,
		fontWeight: '600',
	},

	emergencyChip: {
		backgroundColor: '#FFEBEE',
	},

	emergencyText: {
		color: '#C62828',
		fontSize: 10,
		fontWeight: '600',
	},

	/* BUTTON */
	button: {
		backgroundColor: '#2B6F71',
		borderRadius: 8,
		paddingVertical: 10,
		alignItems: 'center',
		marginTop: 8,
		marginBottom: 4,
	},

	buttonText: {
		color: '#fff',
		fontWeight: '700',
		fontSize: 12,
	},
})
