import React from 'react'
import { DimensionValue, StyleProp, ViewStyle } from 'react-native'
import { AllServiceCard, ServiceProcedureItem } from '../../ancillary/components/AllServiceCard'
import { DiagnosticTestItem } from '../data/laboratoryMockData'

const LAB_IMAGES = [
	require('../../../assets/Laboratory/lab1.jpg'),
	require('../../../assets/Laboratory/lab2.jpg'),
	require('../../../assets/Laboratory/lab3.jpg'),
]

interface DiagnosticTestCardProps {
	item: DiagnosticTestItem
	isAdded?: boolean
	onAddToCart?: (item: DiagnosticTestItem) => void
	onPress?: (item: DiagnosticTestItem) => void
	cardWidth?: DimensionValue
	style?: StyleProp<ViewStyle>
}

/**
 * Healthcare service card for individual diagnostic tests.
 * Directly reuses the Nursing Care AllServiceCard component for complete
 * visual, spacing, typography, and interaction consistency.
 */
export const DiagnosticTestCard: React.FC<DiagnosticTestCardProps> = ({
	item,
	isAdded = false,
	onAddToCart,
	onPress,
	cardWidth,
	style,
}) => {
	const discountPercent =
		item.originalPrice && item.originalPrice > item.price
			? Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100)
			: null

	// Deterministic image selection from existing laboratory assets
	const charSum = item.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
	const image = LAB_IMAGES[Math.abs(charSum) % LAB_IMAGES.length]

	const procedureItem: ServiceProcedureItem = {
		id: item.id,
		title: item.name,
		description: item.description,
		subtitle: item.alsoKnownAs || item.description,
		metadataLine: `${item.parameters} ${item.parameters === 1 ? 'parameter' : 'parameters'} · ${item.reportTime} report${
			item.fastingRequired ? ` · ${item.fastingRequired}` : ''
		}`,
		price: `₹${item.price}`,
		originalPrice: item.originalPrice && item.originalPrice > item.price ? `₹${item.originalPrice}` : undefined,
		discountText: discountPercent ? `${discountPercent}% off` : undefined,
		imageSource: image,
		recommendedLabel: item.category === 'popular' ? 'POPULAR' : undefined,
		hideRating: true,
	}

	return (
		<AllServiceCard
			item={procedureItem}
			quantity={isAdded ? 1 : 0}
			onSelectService={() => onAddToCart?.(item)}
			onCardPress={onPress ? () => onPress(item) : undefined}
			cardWidth={cardWidth}
			style={style}
		/>
	)
}

export default DiagnosticTestCard
