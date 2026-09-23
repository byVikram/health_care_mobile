import React from 'react'
import { View, Text, Image, TouchableOpacity, StyleSheet, ImageSourcePropType } from 'react-native'
import { LaboratoryItem } from '../laboratory'

// Replace with your actual lab images
import lab1 from '../../../assets/Laboratory/lab1.jpg'
import lab2 from '../../../assets/Laboratory/lab2.jpg'
import lab3 from '../../../assets/Laboratory/lab3.jpg'

const labImages: ImageSourcePropType[] = [lab1, lab2, lab3]

const getLabImage = (id: string): ImageSourcePropType => {
	let hash = 0
	for (let i = 0; i < id.length; i++) {
		hash = (hash << 5) - hash + id.charCodeAt(i)
		hash |= 0
	}
	return labImages[Math.abs(hash) % labImages.length]
}

interface Props {
	lab: LaboratoryItem
	layout?: 'horizontal' | 'vertical'
	onPress?: () => void
	onBookTest?: () => void
}

export default function LaboratoryCard({ lab, layout = 'vertical', onPress, onBookTest }: Props) {
	const {
		id,
		name,
		address,
		city,
		operating_hours,
		home_collection_available,
		is_24_x_7,
		is_nabl_accredited,
		emergency_tests_available,
	} = lab

	const isHorizontal = layout === 'horizontal'

	return (
		<TouchableOpacity
			style={[styles.card, isHorizontal && styles.horizontalCard]}
			activeOpacity={0.9}
			onPress={onPress}
		>
			{/* IMAGE */}
			<View style={[styles.imageContainer, isHorizontal && styles.horizontalImageContainer]}>
				<Image source={getLabImage(id)} style={styles.image} resizeMode="cover" />
				{is_nabl_accredited && (
					<View style={styles.nablBadge}>
						<Text style={styles.nablBadgeText}>NABL</Text>
					</View>
				)}
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
					{home_collection_available && (
						<View style={[styles.chip, styles.collectionChip]}>
							<Text style={styles.collectionText}>Home Collection</Text>
						</View>
					)}
					{emergency_tests_available && (
						<View style={[styles.chip, styles.emergencyChip]}>
							<Text style={styles.emergencyText}>Emergency Tests</Text>
						</View>
					)}
				</View>

				<TouchableOpacity style={styles.button} onPress={onBookTest}>
					<Text style={styles.buttonText}>Book Test</Text>
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
		height: 180,
	},
	image: {
		width: '100%',
		height: '100%',
	},
	nablBadge: {
		position: 'absolute',
		top: 8,
		left: 8,
		backgroundColor: '#1B5E20',
		borderRadius: 6,
		paddingHorizontal: 6,
		paddingVertical: 2,
	},
	nablBadgeText: {
		color: '#fff',
		fontSize: 9,
		fontWeight: '700',
		letterSpacing: 0.5,
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
	collectionChip: {
		backgroundColor: '#E8F5F5',
	},
	collectionText: {
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
