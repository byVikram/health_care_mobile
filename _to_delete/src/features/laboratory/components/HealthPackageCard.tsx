import React from 'react'
import { StyleProp, ViewStyle } from 'react-native'
import { AllServiceCard, ServiceProcedureItem } from '../../ancillary/components/AllServiceCard'
import { HealthPackageItem } from '../data/laboratoryMockData'

interface HealthPackageCardProps {
	item: HealthPackageItem
	/** Whether this package is currently in the patient's selection / cart. */
	isSelected?: boolean
	onAddToCart?: (item: HealthPackageItem) => void
	/** Opens the package details view (tapping the card triggers this). */
	onViewDetails?: (item: HealthPackageItem) => void
	style?: StyleProp<ViewStyle>
}

/**
 * Healthcare service card for comprehensive health checkup packages.
 * Directly reuses the Nursing Care AllServiceCard component for consistent
 * hierarchy, image treatment, metadata placement, and Add/Added interactions.
 */
export const HealthPackageCard: React.FC<HealthPackageCardProps> = ({
	item,
	isSelected = false,
	onAddToCart,
	onViewDetails,
	style,
}) => {
	const procedureItem: ServiceProcedureItem = {
		id: item.id,
		title: item.name,
		description: item.includesSummary,
		subtitle: item.includesSummary ? `Includes: ${item.includesSummary}` : undefined,
		metadataLine: `Includes ${item.testCount} tests · For Age: ${item.ageRange} · ${item.reportTime} report`,
		price: `₹${item.price}`,
		originalPrice: item.originalPrice && item.originalPrice > item.price ? `₹${item.originalPrice}` : undefined,
		discountText: item.discountPercent ? `${item.discountPercent}% OFF` : undefined,
		imageSource: item.image,
		recommendedLabel: item.popularTag || undefined,
		hideRating: true,
	}

	return (
		<AllServiceCard
			item={procedureItem}
			quantity={isSelected ? 1 : 0}
			onSelectService={() => onAddToCart?.(item)}
			onCardPress={onViewDetails ? () => onViewDetails(item) : undefined}
			style={style}
		/>
	)
}

export default HealthPackageCard
