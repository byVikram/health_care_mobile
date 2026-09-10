import React from 'react'
import {
	View,
	StyleSheet,
	Image,
	TouchableOpacity,
	useWindowDimensions,
} from 'react-native'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { AppTypography } from '../../../components/common'
import { getAncillaryImageSource } from '../utils/ancillaryImageResolver'

export interface ServiceProcedureItem {
	id: string
	title: string
	description: string
	duration: string
	price: string
	image?: string
	image_url?: string | null
	imageUrl?: string | null
	categoryId?: string | null
	verified?: boolean
	premiumBadgeText?: string
	actionLabel?: 'Select' | 'Enquire'
	actionVariant?: 'primary' | 'secondary' | 'outline'
	/** Optional small badge rendered above the title, e.g. "Recommended for Knee Pain" */
	recommendedLabel?: string
	about_service?: string | null
	whats_included?: string[] | string | null
	aboutService?: string | null
	whatsIncluded?: string[] | string | null
}

interface AllServiceCardProps {
	item: ServiceProcedureItem
	cardWidth?: number | string
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
					{item.title}
				</AppTypography>

				{/* Rating Row (Medium 500 & Soft Regular 400) */}
				<View style={styles.ratingRow}>
					<Ionicons name="star" size={13} color="#F59E0B" />
					<AppTypography variant="caption" style={styles.ratingScore}>
						4.8
					</AppTypography>
					<AppTypography variant="caption" style={styles.ratingCount}>
						(120+ reviews)
					</AppTypography>
				</View>

				{/* Price & Duration */}
				<View style={styles.priceRow}>
					<AppTypography variant="h3" style={[styles.priceText, isCustomPrice && styles.customPriceText]}>
						{item.price}
					</AppTypography>
					<View style={styles.dotSeparator} />
					<AppTypography variant="caption" style={styles.durationText}>
						{item.duration || '30 - 45 mins'}
					</AppTypography>
				</View>

				{/* View Details Link */}
				<TouchableOpacity style={styles.viewDetailsBtn} onPress={handleCardClick} activeOpacity={0.7}>
					<AppTypography variant="caption" style={styles.viewDetailsText}>
						View details
					</AppTypography>
				</TouchableOpacity>
			</View>

			{/* Right Column: Image Box + Top RN Badge + Overlapping ADD Button */}
			<View style={styles.rightCol}>
				<View style={styles.imageBox}>
					<Image
						source={getAncillaryImageSource(item.image_url || item.imageUrl || item.image)}
						style={styles.image}
						resizeMode="cover"
					/>
				</View>

				{/* Overlapping ADD / ADDED Button */}
				<View style={styles.actionButtonWrapper}>
					{isAdded ? (
						<TouchableOpacity
							style={[styles.addBtn, styles.addedBtn]}
							onPress={handleDecrementClick}
							activeOpacity={0.85}
						>
							<Ionicons name="checkmark" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
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
		paddingVertical: 18,
		paddingHorizontal: 0,
		borderBottomWidth: 1,
		borderBottomColor: '#E0E7EF',
		backgroundColor: '#FFFFFF',
		alignItems: 'flex-start',
	},
	cardActive: {
		backgroundColor: 'rgba(43, 111, 113, 0.03)',
	},
	cardRecommended: {
		backgroundColor: 'rgba(12, 124, 124, 0.035)',
		borderRadius: 14,
		borderWidth: 1,
		borderColor: 'rgba(12, 124, 124, 0.18)',
		paddingHorizontal: 10,
		marginHorizontal: -10,
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
		paddingRight: 14,
		gap: 5,
	},
	title: {
		fontSize: 16,
		fontWeight: '700',
		color: '#181C1D',
		lineHeight: 22,
	},
	ratingRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	ratingScore: {
		fontSize: 13,
		fontWeight: '500',
		color: '#181C1D',
	},
	ratingCount: {
		fontSize: 13,
		fontWeight: '400',
		color: '#64748B',
		textDecorationLine: 'underline',
		textDecorationStyle: 'dotted',
	},
	priceRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		marginTop: 2,
	},
	priceText: {
		fontSize: 16,
		fontWeight: '700',
		color: '#181C1D',
	},
	customPriceText: {
		fontSize: 13,
		color: '#2B6F71',
	},
	dotSeparator: {
		width: 4,
		height: 4,
		borderRadius: 2,
		backgroundColor: '#CBD5E1',
	},
	durationText: {
		fontSize: 13,
		fontWeight: '400',
		color: '#64748B',
	},
	viewDetailsBtn: {
		marginTop: 4,
		alignSelf: 'flex-start',
	},
	viewDetailsText: {
		fontSize: 13,
		fontWeight: '600',
		color: '#2B6F71',
	},

	/* Right Column (110px aspect-[4/3] Image + Overlapping ADD Pill) */
	rightCol: {
		width: 110,
		alignItems: 'center',
		position: 'relative',
	},
	imageBox: {
		width: 110,
		height: 82,
		borderRadius: 12,
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
		marginTop: 10,
	},
	actionButtonWrapper: {
		marginTop: -14,
		zIndex: 20,
		shadowColor: '#000000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.08,
		shadowRadius: 4,
		elevation: 3,
	},
	addBtn: {
		backgroundColor: '#FFFFFF',
		borderWidth: 1,
		borderColor: '#BFC8C8',
		borderRadius: 8,
		paddingHorizontal: 22,
		paddingVertical: 6,
		alignItems: 'center',
		justifyContent: 'center',
		minWidth: 80,
	},
	addBtnText: {
		fontSize: 13.5,
		fontWeight: '700',
		color: '#2B6F71',
	},
	addedBtn: {
		backgroundColor: '#0C7C7C',
		borderColor: '#0C7C7C',
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
	},
	addedBtnText: {
		fontSize: 12.5,
		fontWeight: '700',
		color: '#FFFFFF',
		letterSpacing: 0.4,
	},
	enquireBtn: {
		paddingHorizontal: 14,
	},
	enquireBtnText: {
		fontSize: 12,
		color: '#64748B',
	},
	stepperBox: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#FFFFFF',
		borderWidth: 1,
		borderColor: '#2B6F71',
		borderRadius: 8,
		paddingHorizontal: 8,
		paddingVertical: 4,
		gap: 10,
		minWidth: 80,
		justifyContent: 'space-between',
	},
	stepperBtn: {
		padding: 2,
	},
	stepperQty: {
		fontSize: 13,
		fontWeight: '700',
		color: '#2B6F71',
	},
})