import React from 'react'
import { View, StyleSheet, useWindowDimensions } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { AppTypography } from '../../../components/common/AppTypography'

export interface RecommendationItem {
	id: string
	title: string
	description: string
	iconName: keyof typeof MaterialCommunityIcons.glyphMap
}

interface RecommendationCardProps {
	item: RecommendationItem
}

export const RecommendationCard: React.FC<RecommendationCardProps> = ({ item }) => {
	const { width } = useWindowDimensions()
	const isTablet = width >= 768

	return (
		<View style={[styles.card, isTablet && styles.cardTablet]}>
			<View style={[styles.iconBox, isTablet && styles.iconBoxTablet]}>
				<MaterialCommunityIcons name={item.iconName} size={isTablet ? 26 : 22} color="#1F5F68" />
			</View>
			<View style={styles.textColumn}>
				<AppTypography
					variant="h4"
					style={[styles.title, isTablet && styles.titleTablet]}
					numberOfLines={1}
				>
					{item.title}
				</AppTypography>
				<AppTypography
					variant="caption"
					style={[styles.description, isTablet && styles.descriptionTablet]}
					numberOfLines={1}
				>
					{item.description}
				</AppTypography>
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	card: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#FFFFFF',
		borderRadius: 12,
		padding: 12,
		marginBottom: 10,
		borderWidth: 1,
		borderColor: '#E8ECEC',
	},
	cardTablet: {
		padding: 16,
		borderRadius: 16,
		marginBottom: 14,
	},
	iconBox: {
		width: 44,
		height: 44,
		borderRadius: 10,
		backgroundColor: '#E6F3F4',
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 12,
	},
	iconBoxTablet: {
		width: 54,
		height: 54,
		borderRadius: 14,
		marginRight: 16,
	},
	textColumn: {
		flex: 1,
	},
	title: {
		fontSize: 14,
		fontWeight: '600',
		color: '#191C1D',
		lineHeight: 18,
	},
	titleTablet: {
		fontSize: 17,
		lineHeight: 22,
	},
	description: {
		fontSize: 12,
		color: '#526062',
		marginTop: 2,
		lineHeight: 16,
	},
	descriptionTablet: {
		fontSize: 14,
		lineHeight: 18,
		marginTop: 4,
	},
})
