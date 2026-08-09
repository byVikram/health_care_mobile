import React from 'react'
import { View, StyleSheet, useWindowDimensions, TouchableOpacity } from 'react-native'
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons'
import { AppTypography, CommonCard } from '../../../components/common'

export interface RecommendationItem {
	id: string
	title: string
	description: string
	iconName: keyof typeof MaterialCommunityIcons.glyphMap
}

interface RecommendationCardProps {
	item: RecommendationItem
	onPress?: () => void
}

export const RecommendationCard: React.FC<RecommendationCardProps> = ({ item, onPress }) => {
	const { width } = useWindowDimensions()
	const isTablet = width >= 768

	const content = (
		<View style={styles.row}>
			<View style={[styles.iconBox, isTablet && styles.iconBoxTablet]}>
				<MaterialCommunityIcons name={item.iconName} size={isTablet ? 24 : 20} color="#1F5F68" />
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
					numberOfLines={2}
				>
					{item.description}
				</AppTypography>
			</View>
			<View style={styles.chevronBox}>
				<Ionicons name="chevron-forward" size={16} color="#B0BEC5" />
			</View>
		</View>
	)

	if (onPress) {
		return (
			<TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.wrapper}>
				<CommonCard style={[styles.card, styles.cardInteractive, isTablet && styles.cardTablet]}>
					{content}
				</CommonCard>
			</TouchableOpacity>
		)
	}

	return (
		<CommonCard style={[styles.card, isTablet && styles.cardTablet]}>
			{content}
		</CommonCard>
	)
}

const styles = StyleSheet.create({
	wrapper: {
		width: '100%',
	},
	card: {
		padding: 12,
		marginBottom: 10,
		backgroundColor: '#FFFFFF',
		borderRadius: 14,
		borderWidth: 1,
		borderColor: '#ECEFF1',
	},
	cardInteractive: {
		backgroundColor: '#FFFFFF',
	},
	cardTablet: {
		padding: 14,
		borderRadius: 16,
		marginBottom: 12,
	},
	row: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	iconBox: {
		width: 40,
		height: 40,
		borderRadius: 10,
		backgroundColor: '#E6F3F4',
		alignItems: 'center',
		justifyContent: 'center',
	},
	iconBoxTablet: {
		width: 48,
		height: 48,
		borderRadius: 12,
	},
	textColumn: {
		flex: 1,
		marginLeft: 12,
		marginRight: 8,
	},
	title: {
		fontSize: 13.5,
		fontWeight: '800',
		color: '#1A2E35',
	},
	titleTablet: {
		fontSize: 15,
	},
	description: {
		fontSize: 11,
		color: '#546E7A',
		marginTop: 2,
		lineHeight: 14,
	},
	descriptionTablet: {
		fontSize: 12,
		marginTop: 3,
	},
	chevronBox: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingLeft: 4,
	},
})
