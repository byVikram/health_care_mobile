import React from 'react'
import {
	View,
	StyleSheet,
	Image,
	TouchableOpacity,
	useWindowDimensions,
	DimensionValue,
} from 'react-native'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { AppTypography } from '../../../components/common'
import { getAncillaryImageSource } from '../utils/ancillaryImageResolver'

export interface ServiceProcedureItem {
	id: string
	title: string
	description: string
	duration?: string
	price: string
	originalPrice?: string
	discountText?: string
	subtitle?: string
	metadataLine?: string
	image?: any
	image_url?: string | null
	imageUrl?: string | null
	imageSource?: any
	categoryId?: string | null
	verified?: boolean
	premiumBadgeText?: string
	actionLabel?: 'Select' | 'Enquire' | string
	actionVariant?: 'primary' | 'secondary' | 'outline'
	recommendedLabel?: string
	rating?: number
	reviewCount?: string
	hideRating?: boolean
	about_service?: string | null
	whats_included?: string[] | string | null
	aboutService?: string | null
	whatsIncluded?: string[] | string | null
}

interface AllServiceCardProps {
	item: ServiceProcedureItem
	cardWidth?: DimensionValue
	style?: any
	quantity?: number
	onIncrement?: (item: ServiceProcedureItem) => void
	onDecrement?: (item: ServiceProcedureItem) => void
	onCardPress?: (item: ServiceProcedureItem) => void
	onSelectService?: (item: ServiceProcedureItem) => void
}

export const AllServiceCard: React.FC<AllServiceCardProps> = ({
	item,
	cardWidth,
	style,
	quantity = 0,
	onIncrement,
	onDecrement,
	onCardPress,
	onSelectService,
}) => {
	const { width } = useWindowDimensions()
	const isCustomPrice = item.price.toLowerCase().includes('custom') || item.actionLabel === 'Enquire'
	const isAdded = quantity > 0
	const isRecommended = !!item.recommendedLabel

	const handleCardClick = () => {
		if (onCardPress) {
			onCardPress(item)
		} else if (onSelectService) {
			onSelectService(item)
		}
	}

	const handleIncrementClick = (e: any) => {
		e?.stopPropagation?.()
		if (onIncrement) {
			onIncrement(item)
		} else if (onSelectService) {
			onSelectService(item)
		}
	}

	const handleDecrementClick = (e: any) => {
		e?.stopPropagation?.()
		if (onDecrement) {
			onDecrement(item)
		}
	}

	const imageSource =
		item.imageSource ||
		(typeof item.image === 'number' || (item.image && typeof item.image === 'object' && ('uri' in item.image || 'default' in item.image))
			? item.image
			: getAncillaryImageSource(item.image_url || item.imageUrl || item.image))

	return (
		<TouchableOpacity
			style={[
				styles.cardContainer,
				isAdded && styles.cardActive,
				isRecommended && styles.cardRecommended,
				cardWidth ? { width: cardWidth } : null,
				style,
			]}
			onPress={handleCardClick}
			activeOpacity={0.9}
		>
			{/* Left Column: Procedure Details */}
			<View style={styles.leftCol}>
				{/* Recommended Badge (optional) */}
				{isRecommended && (
					<View style={styles.recommendedBadge}>
						<AppTypography variant="caption" style={styles.recommendedBadgeText} numberOfLines={1}>
							{item.recommendedLabel}
						</AppTypography>
					</View>
				)}

				{/* Title (Bold Heading) */}
				<AppTypography variant="h3" style={styles.title} numberOfLines={2}>
					{item.title || (item as any).label || (item as any).name || ''}
				</AppTypography>

				{/* Subtitle / Also Known As (optional) */}
				{item.subtitle ? (
					<AppTypography variant="caption" style={styles.subtitleText} numberOfLines={2}>
						{item.subtitle}
					</AppTypography>
				) : null}

				{/* Metadata Line or Rating Row */}
				{item.metadataLine ? (
					<View style={styles.metaRow}>
						<AppTypography variant="caption" style={styles.metaLineText} numberOfLines={2}>
							{item.metadataLine}
						</AppTypography>
					</View>
				) : !item.hideRating ? (
					<View style={styles.ratingRow}>
						<Ionicons name="star" size={13} color="#F59E0B" />
						<AppTypography variant="caption" style={styles.ratingScore}>
							{item.rating ? item.rating.toFixed(1) : '4.8'}
						</AppTypography>
						<AppTypography variant="caption" style={styles.ratingCount}>
							{item.reviewCount || '(120+ reviews)'}
						</AppTypography>
					</View>
				) : null}

				{/* Price, Original Price, Discount, and Duration */}
				<View style={styles.priceRow}>
					<AppTypography variant="h3" style={[styles.priceText, isCustomPrice && styles.customPriceText]}>
						{item.price}
					</AppTypography>
					{item.originalPrice ? (
						<AppTypography variant="caption" style={styles.originalPriceText}>
							{item.originalPrice}
						</AppTypography>
					) : null}
					{item.discountText ? (
						<View style={styles.discountBadge}>
							<AppTypography variant="caption" style={styles.discountBadgeText}>
								{item.discountText}
							</AppTypography>
						</View>
					) : null}
					{item.duration ? (
						<>
							<View style={styles.dotSeparator} />
							<AppTypography variant="caption" style={styles.durationText}>
								{item.duration}
							</AppTypography>
						</>
					) : null}
				</View>

				{/* View Details Link */}
				<TouchableOpacity style={styles.viewDetailsBtn} onPress={handleCardClick} activeOpacity={0.7}>
					<AppTypography variant="caption" style={styles.viewDetailsText}>
						View details
					</AppTypography>
				</TouchableOpacity>
			</View>

			{/* Right Column: Image Box + Overlapping ADD Button */}
			<View style={styles.rightCol}>
				<View style={styles.imageBox}>
					{imageSource ? (
						<Image source={imageSource} style={styles.image} resizeMode="cover" />
					) : (
						<View style={styles.fallbackWrap}>
							<MaterialCommunityIcons name="flask-outline" size={28} color="#0C7C7C" />
						</View>
					)}
				</View>

				{/* Overlapping ADD / ADDED Button */}
				<View style={styles.actionButtonWrapper}>
					{isAdded ? (
						<TouchableOpacity
							style={[styles.addBtn, styles.addedBtn]}
							onPress={handleDecrementClick}
							activeOpacity={0.85}
						>
							<Ionicons name="checkmark" size={13} color="#FFFFFF" style={{ marginRight: 3 }} />
							<AppTypography variant="caption" style={styles.addedBtnText}>
								ADDED
							</AppTypography>
						</TouchableOpacity>
					) : (
						<TouchableOpacity
							style={[styles.addBtn, isCustomPrice && styles.enquireBtn]}
							onPress={handleIncrementClick}
							activeOpacity={0.85}
						>
							<AppTypography
								variant="caption"
								style={[styles.addBtnText, isCustomPrice && styles.enquireBtnText]}
							>
								{item.actionLabel || (isCustomPrice ? 'Enquire' : 'ADD +')}
							</AppTypography>
						</TouchableOpacity>
					)}
				</View>
			</View>
		</TouchableOpacity>
	)
}

const styles = StyleSheet.create({
	cardContainer: {
		flexDirection: 'row',
		paddingVertical: 14,
		paddingHorizontal: 0,
		borderBottomWidth: 1,
		borderBottomColor: '#E2E8F0',
		backgroundColor: '#FFFFFF',
		alignItems: 'flex-start',
	},
	cardActive: {
		backgroundColor: 'rgba(43, 111, 113, 0.03)',
	},
	cardRecommended: {
		backgroundColor: 'rgba(12, 124, 124, 0.035)',
		borderRadius: 12,
		borderWidth: 1,
		borderColor: 'rgba(12, 124, 124, 0.18)',
		paddingHorizontal: 8,
		marginHorizontal: -8,
		marginVertical: 4,
	},
	recommendedBadge: {
		alignSelf: 'flex-start',
		backgroundColor: 'rgba(12, 124, 124, 0.12)',
		borderRadius: 4,
		paddingHorizontal: 6,
		paddingVertical: 2,
		marginBottom: 4,
	},
	recommendedBadgeText: {
		fontSize: 10,
		fontWeight: '700',
		color: '#0C5F60',
		textTransform: 'uppercase',
		letterSpacing: 0.2,
	},
	leftCol: {
		flex: 1,
		paddingRight: 12,
		gap: 4,
	},
	title: {
		fontSize: 15,
		fontWeight: '700',
		color: '#181C1D',
		lineHeight: 20,
	},
	subtitleText: {
		fontSize: 12,
		color: '#64748B',
		lineHeight: 16,
	},
	metaRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 1,
	},
	metaLineText: {
		fontSize: 11.5,
		fontWeight: '500',
		color: '#64748B',
		lineHeight: 16,
	},
	ratingRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	ratingScore: {
		fontSize: 12.5,
		fontWeight: '500',
		color: '#181C1D',
	},
	ratingCount: {
		fontSize: 12,
		fontWeight: '400',
		color: '#64748B',
		textDecorationLine: 'underline',
		textDecorationStyle: 'dotted',
	},
	priceRow: {
		flexDirection: 'row',
		alignItems: 'center',
		flexWrap: 'wrap',
		gap: 6,
		marginTop: 2,
	},
	priceText: {
		fontSize: 15,
		fontWeight: '700',
		color: '#181C1D',
	},
	customPriceText: {
		fontSize: 13,
		color: '#2B6F71',
	},
	originalPriceText: {
		fontSize: 12,
		color: '#94A3B8',
		textDecorationLine: 'line-through',
	},
	discountBadge: {
		backgroundColor: 'rgba(12, 124, 124, 0.08)',
		paddingHorizontal: 5,
		paddingVertical: 1.5,
		borderRadius: 4,
	},
	discountBadgeText: {
		fontSize: 10.5,
		fontWeight: '700',
		color: '#0C7C7C',
	},
	dotSeparator: {
		width: 3,
		height: 3,
		borderRadius: 1.5,
		backgroundColor: '#CBD5E1',
	},
	durationText: {
		fontSize: 12,
		fontWeight: '400',
		color: '#64748B',
	},
	viewDetailsBtn: {
		marginTop: 3,
		alignSelf: 'flex-start',
	},
	viewDetailsText: {
		fontSize: 12.5,
		fontWeight: '600',
		color: '#0C7C7C',
	},

	/* Right Column (96px aspect-[4/3] Image + Overlapping ADD Pill) */
	rightCol: {
		width: 96,
		alignItems: 'center',
		position: 'relative',
	},
	imageBox: {
		width: 96,
		height: 72,
		borderRadius: 10,
		overflow: 'hidden',
		backgroundColor: '#F1F4F4',
		position: 'relative',
	},
	image: {
		width: '100%',
		height: '100%',
	},
	fallbackWrap: {
		width: '100%',
		height: '100%',
		justifyContent: 'center',
		alignItems: 'center',
	},
	actionButtonWrapper: {
		marginTop: -12,
		zIndex: 20,
		shadowColor: '#000000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.1,
		shadowRadius: 3,
		elevation: 3,
	},
	addBtn: {
		backgroundColor: '#FFFFFF',
		borderWidth: 1.5,
		borderColor: '#0C7C7C',
		borderRadius: 6,
		paddingHorizontal: 14,
		paddingVertical: 4.5,
		alignItems: 'center',
		justifyContent: 'center',
		minWidth: 70,
	},
	addBtnText: {
		fontSize: 12,
		fontWeight: '700',
		color: '#0C7C7C',
		letterSpacing: 0.2,
	},
	addedBtn: {
		backgroundColor: '#0C7C7C',
		borderColor: '#0C7C7C',
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
	},
	addedBtnText: {
		fontSize: 11.5,
		fontWeight: '700',
		color: '#FFFFFF',
		letterSpacing: 0.3,
	},
	enquireBtn: {
		paddingHorizontal: 12,
	},
	enquireBtnText: {
		fontSize: 11.5,
		color: '#64748B',
	},
	stepperBox: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#FFFFFF',
		borderWidth: 1,
		borderColor: '#0C7C7C',
		borderRadius: 6,
		paddingHorizontal: 8,
		paddingVertical: 3,
		gap: 8,
		minWidth: 70,
		justifyContent: 'space-between',
	},
	stepperBtn: {
		padding: 2,
	},
	stepperQty: {
		fontSize: 12,
		fontWeight: '700',
		color: '#0C7C7C',
	},
})