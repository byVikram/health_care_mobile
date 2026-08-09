import React from 'react'
import {
	View,
	StyleSheet,
	Image,
	TouchableOpacity,
	useWindowDimensions,
} from 'react-native'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { AppTypography, AppButton, CommonCard } from '../../../components/common'

export interface ServiceProcedureItem {
	id: string
	title: string
	description: string
	duration: string
	price: string
	image: string
	verified?: boolean
	premiumBadgeText?: string
	actionLabel?: 'Select' | 'Enquire'
	actionVariant?: 'primary' | 'secondary' | 'outline'
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
	const isTablet = width >= 768
	const isCustomPrice = item.price.toLowerCase().includes('custom') || item.actionLabel === 'Enquire'

	const handleCardClick = () => {
		if (onCardPress) {
			onCardPress(item)
		} else if (onSelectService) {
			onSelectService(item)
		}
	}

	const handleIncrementClick = () => {
		if (onIncrement) {
			onIncrement(item)
		} else if (onSelectService) {
			onSelectService(item)
		}
	}

	const handleDecrementClick = () => {
		if (onDecrement) {
			onDecrement(item)
		}
	}

	const renderActionControlsTablet = () => {
		if (quantity > 0) {
			return (
				<View style={styles.stepperContainerTablet}>
					<TouchableOpacity
						style={styles.stepperBtnTablet}
						onPress={handleDecrementClick}
						activeOpacity={0.7}
					>
						<MaterialCommunityIcons name="minus" size={16} color="#1F5F68" />
					</TouchableOpacity>
					<AppTypography variant="h4" style={styles.quantityTextTablet}>
						{quantity}
					</AppTypography>
					<TouchableOpacity
						style={styles.stepperBtnTablet}
						onPress={handleIncrementClick}
						activeOpacity={0.7}
					>
						<MaterialCommunityIcons name="plus" size={16} color="#1F5F68" />
					</TouchableOpacity>
				</View>
			)
		}

		return (
			<AppButton
				compact={true}
				variant={item.actionVariant || 'primary'}
				style={styles.actionBtnTablet}
				labelStyle={styles.actionBtnLabelTablet}
				contentStyle={styles.actionBtnContentTablet}
				onPress={handleIncrementClick}
			>
				{item.actionLabel || (isCustomPrice ? 'Enquire' : 'Select')}
			</AppButton>
		)
	}

	const renderActionControlsMobile = () => {
		if (quantity > 0) {
			return (
				<View style={styles.stepperContainerMobile}>
					<TouchableOpacity
						style={styles.stepperBtnMobile}
						onPress={handleDecrementClick}
						activeOpacity={0.7}
					>
						<MaterialCommunityIcons name="minus" size={14} color="#1F5F68" />
					</TouchableOpacity>
					<AppTypography variant="h4" style={styles.quantityTextMobile}>
						{quantity}
					</AppTypography>
					<TouchableOpacity
						style={styles.stepperBtnMobile}
						onPress={handleIncrementClick}
						activeOpacity={0.7}
					>
						<MaterialCommunityIcons name="plus" size={14} color="#1F5F68" />
					</TouchableOpacity>
				</View>
			)
		}

		return (
			<AppButton
				compact={true}
				variant={item.actionVariant || 'primary'}
				style={styles.actionBtnMobile}
				labelStyle={styles.actionBtnLabelMobile}
				contentStyle={styles.actionBtnContentMobile}
				onPress={handleIncrementClick}
			>
				{item.actionLabel || (isCustomPrice ? 'Enquire' : 'Select')}
			</AppButton>
		)
	}

	if (isTablet) {
		return (
			<CommonCard
				style={[styles.cardTablet, cardWidth ? { width: cardWidth } : undefined, style]}
				onPress={handleCardClick}
			>
				<Image source={{ uri: item.image }} style={styles.imageTablet} resizeMode="cover" />

				<View style={styles.contentColTablet}>
					<View style={styles.headerRowTablet}>
						<AppTypography variant="h3" style={styles.titleTablet} numberOfLines={2}>
							{item.title}
						</AppTypography>
					</View>

					<AppTypography variant="caption" style={styles.descriptionTablet} numberOfLines={3}>
						{item.description}
					</AppTypography>

					{/* Prominent View Details Badge */}
					<TouchableOpacity onPress={handleCardClick} activeOpacity={0.7} style={styles.viewDetailsHelperTablet}>
						<Ionicons name="information-circle-outline" size={14} color="#1F5F68" />
						<AppTypography variant="caption" style={styles.viewDetailsHelperText}>
							View Details
						</AppTypography>
					</TouchableOpacity>

					{/* Metadata Chips Row */}
					<View style={styles.metaBadgeRowTablet}>
						<View style={styles.durationChipTablet}>
							<Ionicons name="time-outline" size={13} color="#546E7A" />
							<AppTypography variant="caption" style={styles.durationTextTablet}>
								{item.duration}
							</AppTypography>
						</View>

						{item.verified && (
							<View style={styles.verifiedChipTablet}>
								<Ionicons name="checkmark-circle-outline" size={13} color="#1F5F68" />
								<AppTypography variant="caption" style={styles.verifiedTextTablet}>
									Verified
								</AppTypography>
							</View>
						)}

						{item.premiumBadgeText && (
							<View style={styles.premiumChipTablet}>
								<Ionicons name="star-outline" size={13} color="#D4AF37" />
								<AppTypography variant="caption" style={styles.premiumTextTablet}>
									{item.premiumBadgeText}
								</AppTypography>
							</View>
						)}
					</View>

					<View style={styles.footerRowTablet}>
						<AppTypography
							variant={isCustomPrice ? 'caption' : 'body'}
							style={isCustomPrice ? styles.customPriceLabelTablet : styles.priceTablet}
							numberOfLines={1}
						>
							{item.price}
						</AppTypography>
						{renderActionControlsTablet()}
					</View>
				</View>
			</CommonCard>
		)
	}

	// Mobile Layout
	return (
		<CommonCard
			style={[styles.cardMobile, cardWidth ? { width: cardWidth } : undefined, style]}
			onPress={handleCardClick}
		>
			<Image source={{ uri: item.image }} style={styles.imageMobile} resizeMode="cover" />

			<View style={styles.contentColMobile}>
				<View style={styles.headerRowMobile}>
					<AppTypography variant="h4" style={styles.titleMobile} numberOfLines={1}>
						{item.title}
					</AppTypography>
				</View>

				<AppTypography variant="caption" style={styles.descriptionMobile} numberOfLines={2}>
					{item.description}
				</AppTypography>

				{/* Prominent View Details Badge */}
				<TouchableOpacity onPress={handleCardClick} activeOpacity={0.7} style={styles.viewDetailsHelperMobile}>
					<Ionicons name="information-circle-outline" size={13} color="#1F5F68" />
					<AppTypography variant="caption" style={styles.viewDetailsHelperText}>
						View Details
					</AppTypography>
				</TouchableOpacity>

				{/* Metadata Chips Row */}
				<View style={styles.metaBadgeRowMobile}>
					<View style={styles.durationChipMobile}>
						<Ionicons name="time-outline" size={11} color="#607D8B" />
						<AppTypography variant="caption" style={styles.durationTextMobile}>
							{item.duration}
						</AppTypography>
					</View>

					{item.verified && (
						<View style={styles.verifiedChipMobile}>
							<Ionicons name="checkmark-circle-outline" size={11} color="#1F5F68" />
							<AppTypography variant="caption" style={styles.verifiedTextMobile}>
								Verified
							</AppTypography>
						</View>
					)}

					{item.premiumBadgeText && (
						<View style={styles.premiumChipMobile}>
							<AppTypography variant="caption" style={styles.premiumTextMobile}>
								{item.premiumBadgeText}
							</AppTypography>
						</View>
					)}
				</View>

				<View style={styles.footerRowMobile}>
					<AppTypography
						variant={isCustomPrice ? 'caption' : 'body'}
						style={isCustomPrice ? styles.customPriceLabelMobile : styles.priceMobile}
						numberOfLines={1}
					>
						{item.price}
					</AppTypography>
					{renderActionControlsMobile()}
				</View>
			</View>
		</CommonCard>
	)
}

const styles = StyleSheet.create({
	// Tablet Layout Styles
	cardTablet: {
		flexDirection: 'row',
		backgroundColor: '#FFFFFF',
		borderRadius: 16,
		padding: 16,
		marginBottom: 16,
		borderWidth: 1,
		borderColor: '#ECEFF1',
		elevation: 1,
		shadowColor: '#000000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.03,
		shadowRadius: 4,
	},
	imageTablet: {
		width: 120,
		height: 120,
		borderRadius: 12,
		backgroundColor: '#F1F5F9',
	},
	contentColTablet: {
		flex: 1,
		marginLeft: 16,
		justifyContent: 'space-between',
	},
	headerRowTablet: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		justifyContent: 'space-between',
	},
	titleTablet: {
		fontSize: 16,
		fontWeight: '800',
		color: '#1A2E35',
		flex: 1,
		marginRight: 12,
		lineHeight: 22,
	},
	viewDetailsHelperTablet: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		alignSelf: 'flex-start',
		marginTop: 6,
	},
	metaBadgeRowTablet: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		marginVertical: 4,
	},
	durationChipTablet: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#F1F5F9',
		paddingHorizontal: 8,
		paddingVertical: 3,
		borderRadius: 8,
		gap: 4,
	},
	durationTextTablet: {
		fontSize: 11,
		fontWeight: '600',
		color: '#546E7A',
	},
	verifiedChipTablet: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#E6F3F4',
		paddingHorizontal: 8,
		paddingVertical: 3,
		borderRadius: 8,
		gap: 4,
	},
	verifiedTextTablet: {
		fontSize: 11,
		fontWeight: '700',
		color: '#1F5F68',
	},
	premiumChipTablet: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#FFF8E1',
		paddingHorizontal: 8,
		paddingVertical: 3,
		borderRadius: 8,
		gap: 4,
	},
	premiumTextTablet: {
		fontSize: 10.5,
		fontWeight: '700',
		color: '#B7791F',
	},
	descriptionTablet: {
		fontSize: 13,
		color: '#546E7A',
		lineHeight: 18,
		marginVertical: 4,
	},
	footerRowTablet: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginTop: 6,
	},
	priceTablet: {
		fontSize: 16,
		fontWeight: '800',
		color: '#1F5F68',
	},
	customPriceLabelTablet: {
		fontSize: 13,
		fontWeight: '700',
		color: '#78909C',
	},
	actionBtnTablet: {
		minWidth: 90,
		borderRadius: 10,
		paddingVertical: 0,
		backgroundColor: '#1F5F68',
	},
	actionBtnLabelTablet: {
		fontSize: 13,
		fontWeight: '700',
		color: '#FFFFFF',
		marginVertical: 0,
		paddingVertical: 0,
	},
	actionBtnContentTablet: {
		paddingHorizontal: 16,
		height: 36,
	},
	stepperContainerTablet: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#F0F9F9',
		borderRadius: 10,
		borderWidth: 1,
		borderColor: '#1F5F68',
		paddingHorizontal: 6,
		paddingVertical: 2,
		gap: 8,
	},
	stepperBtnTablet: {
		padding: 4,
	},
	quantityTextTablet: {
		fontSize: 14,
		fontWeight: '700',
		color: '#1F5F68',
		minWidth: 16,
		textAlign: 'center',
	},

	// Mobile Layout Styles
	cardMobile: {
		flexDirection: 'row',
		backgroundColor: '#FFFFFF',
		borderRadius: 16,
		padding: 12,
		marginBottom: 12,
		borderWidth: 1,
		borderColor: '#ECEFF1',
		elevation: 1,
		shadowColor: '#000000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.02,
		shadowRadius: 3,
	},
	imageMobile: {
		width: 84,
		height: 84,
		borderRadius: 12,
		backgroundColor: '#F1F5F9',
		alignSelf: 'center',
	},
	contentColMobile: {
		flex: 1,
		marginLeft: 12,
		justifyContent: 'space-between',
	},
	headerRowMobile: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	titleMobile: {
		fontSize: 14.5,
		fontWeight: '800',
		color: '#1A2E35',
		flex: 1,
		marginRight: 6,
	},
	viewDetailsHelperMobile: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		alignSelf: 'flex-start',
		marginTop: 6,
	},
	viewDetailsHelperText: {
		fontSize: 10.5,
		fontWeight: '700',
		color: '#1F5F68',
		textDecorationLine: 'underline',
	},
	metaBadgeRowMobile: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		marginTop: 6,
		marginBottom: 2,
	},
	durationChipMobile: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#F1F5F9',
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 6,
		gap: 2,
	},
	durationTextMobile: {
		fontSize: 10,
		fontWeight: '600',
		color: '#546E7A',
	},
	verifiedChipMobile: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#E6F3F4',
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 6,
		gap: 2,
	},
	verifiedTextMobile: {
		fontSize: 10,
		fontWeight: '700',
		color: '#1F5F68',
	},
	premiumChipMobile: {
		backgroundColor: '#FFF8E1',
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 6,
	},
	premiumTextMobile: {
		fontSize: 9.5,
		fontWeight: '700',
		color: '#B7791F',
	},
	descriptionMobile: {
		fontSize: 11.5,
		color: '#546E7A',
		lineHeight: 15.5,
		marginTop: 2,
	},
	footerRowMobile: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginTop: 8,
	},
	priceMobile: {
		fontSize: 14.5,
		fontWeight: '800',
		color: '#1F5F68',
	},
	customPriceLabelMobile: {
		fontSize: 11.5,
		fontWeight: '700',
		color: '#78909C',
	},
	actionBtnMobile: {
		minWidth: 72,
		borderRadius: 8,
		paddingVertical: 0,
		backgroundColor: '#1F5F68',
	},
	actionBtnLabelMobile: {
		fontSize: 11.5,
		fontWeight: '700',
		color: '#FFFFFF',
		marginVertical: 0,
		paddingVertical: 0,
	},
	actionBtnContentMobile: {
		paddingHorizontal: 12,
		height: 32,
	},
	stepperContainerMobile: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#F0F9F9',
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#1F5F68',
		paddingHorizontal: 4,
		paddingVertical: 1,
		gap: 6,
	},
	stepperBtnMobile: {
		padding: 2,
	},
	quantityTextMobile: {
		fontSize: 12,
		fontWeight: '700',
		color: '#1F5F68',
		minWidth: 14,
		textAlign: 'center',
	},
})