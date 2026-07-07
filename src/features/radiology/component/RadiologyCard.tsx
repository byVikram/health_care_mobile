// RadiologyCard.tsx
import React from 'react'
import { View, Text, Image, TouchableOpacity, StyleSheet, ImageSourcePropType } from 'react-native'
import { RadiologyItem } from '../radiology'
import { formatPrice, getPricingModelLabel, getPricingModelColor } from '../RadiologyService'

import pharmacy2 from '../../../assets/Pharmacy/pharmacy2.png'
import pharmacy3 from '../../../assets/Pharmacy/pharmacy3.png'
import pharmacy4 from '../../../assets/Pharmacy/pharmacy4.png'

const radiologyImages: ImageSourcePropType[] = [pharmacy2, pharmacy3, pharmacy4]

const getRadiologyImage = (id: string | undefined): ImageSourcePropType => {
	const safeId = typeof id === 'string' && id.length > 0 ? id : 'default'

	let hash = 0
	for (let i = 0; i < safeId.length; i++) {
		hash = (hash << 5) - hash + safeId.charCodeAt(i)
		hash |= 0
	}

	return radiologyImages[Math.abs(hash) % radiologyImages.length]
}

// ... rest of the component remains the same
interface RadiologyCardProps {
	radiology: RadiologyItem
	layout?: 'horizontal' | 'vertical'
	onPress?: () => void
	onBook?: () => void
}

export default function RadiologyCard({ radiology, layout = 'vertical', onPress, onBook }: RadiologyCardProps) {
	const {
		id,
		name,
		address,
		city,
		state,

		pricing_model,
		price_details,
		is_available,
		rating,
		reviews,
	} = radiology

	const isHorizontal = layout === 'horizontal'
	const pricingColor = getPricingModelColor(pricing_model)

	return (
		<TouchableOpacity
			style={[styles.card, isHorizontal && styles.horizontalCard]}
			activeOpacity={0.9}
			onPress={onPress}
		>
			{/* IMAGE */}
			<View style={[styles.imageContainer, isHorizontal && styles.horizontalImageContainer]}>
				<Image source={getRadiologyImage(id)} style={styles.image} resizeMode="cover" />
				{!is_available && (
					<View style={styles.unavailableOverlay}>
						<Text style={styles.unavailableText}>Unavailable</Text>
					</View>
				)}
			</View>

			{/* CONTENT */}
			<View style={styles.content}>
				<Text style={styles.name} numberOfLines={1}>
					{name}
				</Text>

				{/* <Text style={styles.scanName}>{scan_name}</Text> */}

				<Text style={styles.subText}>
					📍 {city}, {state}
				</Text>

				<Text style={styles.subText} numberOfLines={1}>
					{address}
				</Text>

				{/* Rating */}
				{/* {rating && (
					<View style={styles.ratingContainer}>
						<Text style={styles.rating}>⭐ {rating.toFixed(1)}</Text>
						<Text style={styles.reviews}>({reviews} reviews)</Text>
					</View>
				)} */}

				{/* Pricing */}
				<View style={styles.priceContainer}>
					<Text style={[styles.priceLabel, { color: pricingColor }]}>
						{getPricingModelLabel(pricing_model)}
					</Text>
					<Text style={styles.price}>{formatPrice(radiology)}</Text>
				</View>

				{price_details && (
					<Text style={styles.priceDetails} numberOfLines={1}>
						{price_details}
					</Text>
				)}

				{/* Book Button */}
				<TouchableOpacity
					style={[styles.button, !is_available && styles.buttonDisabled]}
					onPress={onBook}
					disabled={!is_available}
				>
					<Text style={styles.buttonText}>{is_available ? 'Book Scan' : 'Unavailable'}</Text>
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
		position: 'relative',
	},
	horizontalImageContainer: {
		width: 120,
		height: 180,
	},
	image: {
		width: '100%',
		height: '100%',
	},
	unavailableOverlay: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: 'rgba(0,0,0,0.5)',
		justifyContent: 'center',
		alignItems: 'center',
	},
	unavailableText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: '700',
		textTransform: 'uppercase',
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
	scanName: {
		fontSize: 13,
		fontWeight: '600',
		color: '#2B6F71',
		marginTop: 2,
	},
	subText: {
		fontSize: 12,
		color: '#5b7282',
		marginTop: 2,
	},
	ratingContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 4,
		gap: 4,
	},
	rating: {
		fontSize: 12,
		fontWeight: '600',
		color: '#f5a623',
	},
	reviews: {
		fontSize: 11,
		color: '#667085',
	},
	priceContainer: {
		flexDirection: 'row',
		alignItems: 'baseline',
		marginTop: 4,
		gap: 8,
	},
	priceLabel: {
		fontSize: 11,
		fontWeight: '600',
	},
	price: {
		fontSize: 11,
		fontWeight: '600',
	},
	priceDetails: {
		fontSize: 11,
		color: '#667085',
		marginTop: 2,
	},
	button: {
		backgroundColor: '#2B6F71',
		borderRadius: 8,
		paddingVertical: 10,
		alignItems: 'center',
		marginTop: 8,
		marginBottom: 4,
	},
	buttonDisabled: {
		backgroundColor: '#D0D5DD',
	},
	buttonText: {
		color: '#fff',
		fontWeight: '700',
		fontSize: 12,
	},
})
