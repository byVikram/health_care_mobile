import React from 'react'
import { View, StyleSheet, Image, TouchableOpacity, useWindowDimensions } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { AppTypography, CommonCard } from '../../../components/common'
import { AppButton } from '../../../components/common/AppButton'
import { AncillaryPackageListItem } from '../ancillaryService'
import { getAncillaryImageSource } from '../utils/ancillaryImageResolver'

interface PackageCardProps {
	item: AncillaryPackageListItem
	isSelected?: boolean
	onAdd: (item: AncillaryPackageListItem) => void
	onCardPress: (item: AncillaryPackageListItem) => void
}

export const PackageCard: React.FC<PackageCardProps> = ({ item, isSelected = false, onAdd, onCardPress }) => {
	const { width } = useWindowDimensions()
	const isTablet = width >= 768

	const handleCardPress = () => onCardPress(item)
	const handleAddPress = () => onAdd(item)

	const renderActionControl = () => {
		if (isSelected) {
			return (
				<TouchableOpacity
					style={[styles.selectBtn, styles.addedBtn, isTablet && styles.selectBtnTablet]}
					onPress={handleAddPress}
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
				onPress={handleAddPress}
			>
				ADD +
			</AppButton>
		)
	}

	return (
		<CommonCard style={[styles.card, isTablet && styles.cardTablet]} onPress={handleCardPress}>
			<Image
				source={getAncillaryImageSource(item.imageUrl)}
				style={[styles.image, isTablet && styles.imageTablet]}
				resizeMode="cover"
			/>
			<View style={[styles.content, isTablet && styles.contentTablet]}>
				<AppTypography variant="h4" style={[styles.title, isTablet && styles.titleTablet]} numberOfLines={1}>
					{item.label}
				</AppTypography>
				{!!item.description && (
					<AppTypography
						variant="caption"
						style={[styles.description, isTablet && styles.descriptionTablet]}
						numberOfLines={2}
					>
						{item.description}
					</AppTypography>
				)}

				<View style={styles.procedureCountRow}>
					<Ionicons name="layers-outline" size={13} color="#1F5F68" />
					<AppTypography variant="caption" style={styles.procedureCountText}>
						{item.procedureCount} {item.procedureCount === 1 ? 'Procedure' : 'Procedures'}
					</AppTypography>
				</View>

				<View style={styles.footerRow}>
					<AppTypography variant="body" style={[styles.price, isTablet && styles.priceTablet]}>
						{`₹${item.packagePrice}`}
					</AppTypography>
					{renderActionControl()}
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
		backgroundColor: '#F1F4F4',
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
		lineHeight: 16,
	},
	descriptionTablet: {
		fontSize: 14,
		lineHeight: 20,
	},
	procedureCountRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		marginTop: 8,
		marginBottom: 4,
	},
	procedureCountText: {
		fontSize: 11.5,
		fontWeight: '600',
		color: '#1F5F68',
	},
	footerRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginTop: 6,
	},
	price: {
		fontSize: 15,
		fontWeight: '700',
		color: '#1F5F68',
	},
	priceTablet: {
		fontSize: 18,
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
})
