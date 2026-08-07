import React from 'react'
import {
	View,
	StyleSheet,
	Image,
	TouchableOpacity,
	useWindowDimensions,
} from 'react-native'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { AppTypography } from '../../../components/common/AppTypography'
import { AppButton } from '../../../components/common/AppButton'

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
			<TouchableOpacity
				style={[styles.cardTablet, cardWidth ? { width: cardWidth } : undefined, style]}
				onPress={handleCardClick}
				activeOpacity={0.9}
			>
				<Image source={{ uri: item.image }} style={styles.imageTablet} resizeMode="cover" />

				<View style={styles.contentColTablet}>
					<View style={styles.headerRowTablet}>
						<AppTypography variant="h3" style={styles.titleTablet} numberOfLines={2}>
							{item.title}
						</AppTypography>

						<View style={styles.badgeRowTablet}>
							{item.verified && (
								<View style={styles.verifiedBadgeTablet}>
									<Ionicons name="checkmark-circle" size={14} color="#1F5F68" />
									<AppTypography variant="caption" style={styles.verifiedTextTablet}>
										Verified
									</AppTypography>
								</View>
							)}

							{item.premiumBadgeText && (
								<View style={styles.premiumBadgeTablet}>
									<AppTypography variant="caption" style={styles.premiumTextTablet}>
										{item.premiumBadgeText}
									</AppTypography>
								</View>
							)}
						</View>
					</View>

					<AppTypography variant="caption" style={styles.descriptionTablet} numberOfLines={3}>
						{item.description}
					</AppTypography>

					<View style={styles.durationRowTablet}>
						<Ionicons name="time-outline" size={16} color="#64748B" />
						<AppTypography variant="caption" style={styles.durationTextTablet}>
							{item.duration}
						</AppTypography>
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
			</TouchableOpacity>
		)
	}

	// Mobile Layout (Compact, clean & balanced)
	return (
		<TouchableOpacity
			style={[styles.cardMobile, cardWidth ? { width: cardWidth } : undefined, style]}
			onPress={handleCardClick}
			activeOpacity={0.9}
		>
			<Image source={{ uri: item.image }} style={styles.imageMobile} resizeMode="cover" />

			<View style={styles.contentColMobile}>
				<View style={styles.headerRowMobile}>
					<AppTypography variant="h4" style={styles.titleMobile} numberOfLines={1}>
						{item.title}
					</AppTypography>

					{item.verified && (
						<View style={styles.verifiedBadgeMobile}>
							<Ionicons name="checkmark-circle" size={11} color="#1F5F68" />
							<AppTypography variant="caption" style={styles.verifiedTextMobile}>
								Verified
							</AppTypography>
						</View>
					)}

					{item.premiumBadgeText && (
						<View style={styles.premiumBadgeMobile}>
							<AppTypography variant="caption" style={styles.premiumTextMobile}>
								{item.premiumBadgeText}
							</AppTypography>
						</View>
					)}
				</View>

				<AppTypography variant="caption" style={styles.descriptionMobile} numberOfLines={2}>
					{item.description}
				</AppTypography>

				<View style={styles.durationRowMobile}>
					<Ionicons name="time-outline" size={13} color="#64748B" />
					<AppTypography variant="caption" style={styles.durationTextMobile}>
						{item.duration}
					</AppTypography>
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
		</TouchableOpacity>
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
		borderColor: '#E8ECEC',
		elevation: 2,
		shadowColor: '#000000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.06,
		shadowRadius: 6,
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
		fontSize: 17,
		fontWeight: '700',
		color: '#191C1D',
		flex: 1,
		marginRight: 12,
		lineHeight: 22,
	},
	badgeRowTablet: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	verifiedBadgeTablet: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#E6F3F4',
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 12,
		gap: 4,
	},
	verifiedTextTablet: {
		fontSize: 12,
		fontWeight: '600',
		color: '#1F5F68',
	},
	premiumBadgeTablet: {
		backgroundColor: '#CFF4F5',
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 12,
	},
	premiumTextTablet: {
		fontSize: 11,
		fontWeight: '700',
		color: '#0D474D',
		letterSpacing: 0.5,
	},
	descriptionTablet: {
		fontSize: 13,
		color: '#526062',
		lineHeight: 18,
		marginVertical: 4,
	},
	durationRowTablet: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		marginBottom: 8,
	},
	durationTextTablet: {
		fontSize: 12,
		color: '#64748B',
	},
	footerRowTablet: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginTop: 4,
	},
	priceTablet: {
		fontSize: 17,
		fontWeight: '700',
		color: '#1F5F68',
	},
	customPriceLabelTablet: {
		fontSize: 14,
		fontWeight: '600',
		color: '#526062',
	},
	actionBtnTablet: {
		minWidth: 84,
		borderRadius: 10,
	},
	actionBtnLabelTablet: {
		fontSize: 13,
		fontWeight: '600',
	},
	actionBtnContentTablet: {
		paddingHorizontal: 12,
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
		borderRadius: 14,
		padding: 10,
		marginBottom: 12,
		borderWidth: 1,
		borderColor: '#E8ECEC',
		elevation: 1,
		shadowColor: '#000000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.04,
		shadowRadius: 3,
	},
	imageMobile: {
		width: 76,
		height: 76,
		borderRadius: 10,
		backgroundColor: '#F1F5F9',
	},
	contentColMobile: {
		flex: 1,
		marginLeft: 10,
		justifyContent: 'space-between',
	},
	headerRowMobile: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	titleMobile: {
		fontSize: 14,
		fontWeight: '700',
		color: '#191C1D',
		flex: 1,
		marginRight: 6,
	},
	verifiedBadgeMobile: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#E6F3F4',
		paddingHorizontal: 5,
		paddingVertical: 2,
		borderRadius: 8,
		gap: 2,
	},
	verifiedTextMobile: {
		fontSize: 10,
		fontWeight: '600',
		color: '#1F5F68',
	},
	premiumBadgeMobile: {
		backgroundColor: '#CFF4F5',
		paddingHorizontal: 5,
		paddingVertical: 2,
		borderRadius: 8,
	},
	premiumTextMobile: {
		fontSize: 9,
		fontWeight: '700',
		color: '#0D474D',
		letterSpacing: 0.3,
	},
	descriptionMobile: {
		fontSize: 11,
		color: '#526062',
		lineHeight: 15,
		marginTop: 2,
	},
	durationRowMobile: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		marginTop: 2,
	},
	durationTextMobile: {
		fontSize: 10,
		color: '#64748B',
	},
	footerRowMobile: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginTop: 4,
	},
	priceMobile: {
		fontSize: 14,
		fontWeight: '700',
		color: '#1F5F68',
	},
	customPriceLabelMobile: {
		fontSize: 11,
		fontWeight: '600',
		color: '#526062',
	},
	actionBtnMobile: {
		minWidth: 70,
		borderRadius: 8,
	},
	actionBtnLabelMobile: {
		fontSize: 11,
		fontWeight: '600',
	},
	actionBtnContentMobile: {
		paddingHorizontal: 8,
		height: 28,
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