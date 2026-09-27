import React from 'react'
import { View, StyleSheet, Image, TouchableOpacity, useWindowDimensions } from 'react-native'
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons'
import { AppTypography, CommonCard } from '../../../components/common'
import { AppButton } from '../../../components/common/buttons/AppButton'
import { ServiceProcedureItem } from '../../../components/common'

export interface PopularService {
	id: string
	title: string
	description: string
	price: string
	image: string
	about_service?: string | null
	whats_included?: string[] | string | null
	aboutService?: string | null
	whatsIncluded?: string[] | string | null
}

interface PopularServiceCardProps {
	item: PopularService
	quantity?: number
	onIncrement?: (item: ServiceProcedureItem) => void
	onDecrement?: (item: ServiceProcedureItem) => void
	onCardPress?: (item: ServiceProcedureItem) => void
	onSelectService?: (item: ServiceProcedureItem) => void
}

export const PopularServiceCard: React.FC<PopularServiceCardProps> = ({
	item,
	quantity = 0,
	onIncrement,
	onDecrement,
	onCardPress,
	onSelectService,
}) => {
	const { width } = useWindowDimensions()
	const isTablet = width >= 768

	const toProcedureItem = (): ServiceProcedureItem => ({
		id: item.id,
		title: item.title,
		description: item.description,
		duration: '45 mins',
		price: item.price,
		image: item.image,
		about_service: item.about_service ?? item.aboutService ?? null,
		whats_included: item.whats_included ?? item.whatsIncluded ?? null,
	})

	const handleCardClick = () => {
		const procItem = toProcedureItem()
		if (onCardPress) {
			onCardPress(procItem)
		} else if (onSelectService) {
			onSelectService(procItem)
		}
	}

	const handleIncrementClick = () => {
		const procItem = toProcedureItem()
		if (onIncrement) {
			onIncrement(procItem)
		} else if (onSelectService) {
			onSelectService(procItem)
		}
	}

	const handleDecrementClick = () => {
		const procItem = toProcedureItem()
		if (onDecrement) {
			onDecrement(procItem)
		}
	}

	const renderActionControls = () => {
		if (quantity > 0) {
			return (
				<TouchableOpacity
					style={[styles.selectBtn, styles.addedBtn, isTablet && styles.selectBtnTablet]}
					onPress={handleDecrementClick}
					activeOpacity={0.85}
				>
					<Ionicons name="checkmark" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
					<AppTypography variant="caption" style={styles.addedBtnText}>
						ADDED
					</AppTypography>
				</TouchableOpacity>
			)
		}

		return (
			<AppButton
				variant="secondary"
				style={[styles.selectBtn, isTablet && styles.selectBtnTablet]}
				labelStyle={[styles.selectBtnLabel, isTablet && styles.selectBtnLabelTablet]}
				onPress={handleIncrementClick}
			>
				Select
			</AppButton>
		)
	}

	return (
		<CommonCard
			style={[styles.card, isTablet && styles.cardTablet]}
			onPress={handleCardClick}
		>
			<Image source={{ uri: item.image }} style={[styles.image, isTablet && styles.imageTablet]} resizeMode="cover" />
			<View style={[styles.content, isTablet && styles.contentTablet]}>
				<AppTypography
					variant="h4"
					style={[styles.title, isTablet && styles.titleTablet]}
					numberOfLines={1}
				>
					{item.title || (item as any).label || (item as any).name || ''}
				</AppTypography>
				<AppTypography
					variant="caption"
					style={[styles.description, isTablet && styles.descriptionTablet]}
					numberOfLines={2}
				>
					{item.description}
				</AppTypography>

				{/* Prominent View Details Helper */}
				<TouchableOpacity onPress={handleCardClick} activeOpacity={0.7} style={styles.viewDetailsHelper}>
					<Ionicons name="information-circle-outline" size={13} color="#1F5F68" />
					<AppTypography variant="caption" style={styles.viewDetailsHelperText}>
						View Details
					</AppTypography>
				</TouchableOpacity>

				<View style={styles.footerRow}>
					<AppTypography
						variant="body"
						style={[styles.price, isTablet && styles.priceTablet]}
					>
						From {item.price}
					</AppTypography>
					{renderActionControls()}
				</View>
			</View>
		</CommonCard>
	)
}

const styles = StyleSheet.create({
	card: {
		width: 210,
		backgroundColor: '#FFFFFF',
		borderRadius: 14,
		marginRight: 14,
		borderWidth: 1,
		borderColor: '#E8ECEC',
		overflow: 'hidden',
		elevation: 1,
		shadowColor: '#000000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.05,
		shadowRadius: 3,
		padding: 0,
	},
	cardTablet: {
		width: 280,
		marginRight: 18,
		borderRadius: 18,
		padding: 0,
	},
	image: {
		width: '100%',
		height: 110,
	},
	imageTablet: {
		height: 150,
	},
	content: {
		padding: 12,
	},
	contentTablet: {
		padding: 16,
	},
	title: {
		fontSize: 15,
		fontWeight: '600',
		color: '#191C1D',
		lineHeight: 20,
	},
	titleTablet: {
		fontSize: 18,
		lineHeight: 24,
	},
	description: {
		fontSize: 12,
		color: '#526062',
		marginTop: 4,
		marginBottom: 6,
		lineHeight: 16,
	},
	descriptionTablet: {
		fontSize: 14,
		lineHeight: 20,
		marginBottom: 8,
	},
	viewDetailsHelper: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		alignSelf: 'flex-start',
		marginBottom: 10,
	},
	viewDetailsHelperText: {
		fontSize: 10.5,
		fontWeight: '700',
		color: '#1F5F68',
		textDecorationLine: 'underline',
	},
	footerRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	price: {
		fontSize: 13,
		fontWeight: '700',
		color: '#1F5F68',
	},
	priceTablet: {
		fontSize: 16,
	},
	selectBtn: {
		backgroundColor: '#E6F3F4',
		borderRadius: 14,
		paddingVertical: 0,
		minWidth: 64,
		height: 32,
		justifyContent: 'center',
	},
	selectBtnTablet: {
		borderRadius: 18,
		minWidth: 84,
		height: 40,
	},
	selectBtnLabel: {
		color: '#1F5F68',
		fontSize: 12,
		fontWeight: '600',
		marginVertical: 0,
	},
	selectBtnLabelTablet: {
		fontSize: 14,
	},
	addedBtn: {
		backgroundColor: '#0C7C7C',
		borderColor: '#0C7C7C',
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
	},
	addedBtnText: {
		fontSize: 12,
		fontWeight: '700',
		color: '#FFFFFF',
		letterSpacing: 0.4,
	},
	stepperContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#F0F9F9',
		borderRadius: 10,
		borderWidth: 1,
		borderColor: '#1F5F68',
		paddingHorizontal: 4,
		paddingVertical: 2,
		gap: 6,
	},
	stepperContainerTablet: {
		borderRadius: 12,
		paddingHorizontal: 6,
		paddingVertical: 4,
		gap: 8,
	},
	stepperBtn: {
		padding: 2,
	},
	quantityText: {
		fontSize: 12,
		fontWeight: '700',
		color: '#1F5F68',
		minWidth: 14,
		textAlign: 'center',
	},
	quantityTextTablet: {
		fontSize: 14,
		minWidth: 18,
	},
})
