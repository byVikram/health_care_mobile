import React from 'react'
import { StyleSheet, View, StyleProp, ViewStyle } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { AppTypography } from '../../../components/common'

export interface CareTypeHeaderProps {
	icon: keyof typeof MaterialCommunityIcons.glyphMap
	subtitle: string
	description: string
	badgeText?: string
	containerStyle?: StyleProp<ViewStyle>
}

/**
 * Reusable CareTypeHeader Component
 * Clean, lightweight service introduction section without heavy card wrapping.
 */
export const CareTypeHeader: React.FC<CareTypeHeaderProps> = ({
	icon,
	subtitle,
	description,
	containerStyle,
}) => {
	return (
		<View style={[styles.introContainer, containerStyle]}>
			<View style={styles.iconCircle}>
				<MaterialCommunityIcons name={icon} size={22} color="#0D9488" />
			</View>
			<View style={styles.textContainer}>
				<AppTypography variant="h4" color="#0F172A" style={styles.titleText}>
					{subtitle}
				</AppTypography>
				<AppTypography variant="caption" color="#546E7A" style={styles.descriptionText}>
					{description}
				</AppTypography>
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	introContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 10,
		paddingHorizontal: 2,
		marginBottom: 18,
		width: '100%',
	},
	iconCircle: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: '#E6F4F4',
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 12,
	},
	textContainer: {
		flex: 1,
		justifyContent: 'center',
	},
	titleText: {
		marginBottom: 2,
	},
	descriptionText: {
		lineHeight: 18,
	},
})

export default CareTypeHeader
