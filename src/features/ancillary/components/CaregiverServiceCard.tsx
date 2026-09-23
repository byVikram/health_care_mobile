import React from 'react'
import {
	StyleSheet,
	TouchableOpacity,
	View,
	useWindowDimensions,
	StyleProp,
	ViewStyle,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { AppTypography } from '../../../components/common'

export interface CaregiverServiceCardProps {
	title: string
	description: string
	iconName: keyof typeof MaterialCommunityIcons.glyphMap
	onPress: () => void
	variant?: 'grid' | 'fullWidth'
	style?: StyleProp<ViewStyle>
}

/**
 * Healthcare service option card for the Caregiver & Attendant module.
 * Visual design language strictly follows the established Physiotherapy
 * and Ancillary service card conventions:
 *  - Crisp #E2E8F0 borders
 *  - Subtle circular icon treatment (#F1F5F9 / #F0FDFA)
 *  - High-contrast typography (#0F172A heading, #64748B subtitle)
 *  - Clean touch targets with standard elevation and press feedback
 */
export const CaregiverServiceCard: React.FC<CaregiverServiceCardProps> = ({
	title,
	description,
	iconName,
	onPress,
	variant = 'grid',
	style,
}) => {
	const { width } = useWindowDimensions()
	const isTablet = width >= 768

	if (variant === 'fullWidth') {
		return (
			<TouchableOpacity
				style={[styles.fullWidthCard, isTablet && styles.cardTablet, style]}
				onPress={onPress}
				activeOpacity={0.8}
				accessibilityRole="button"
				accessibilityLabel={`${title}, ${description}`}
			>
				<View style={styles.iconCircleFull}>
					<MaterialCommunityIcons name={iconName} size={24} color="#1F5F68" />
				</View>

				<View style={styles.textWrapFull}>
					<AppTypography variant="body" style={styles.titleFull}>
						{title}
					</AppTypography>
					<AppTypography variant="caption" style={styles.descFull} numberOfLines={2}>
						{description}
					</AppTypography>
				</View>

				<MaterialCommunityIcons name="chevron-right" size={24} color="#94A3B8" />
			</TouchableOpacity>
		)
	}

	return (
		<TouchableOpacity
			style={[styles.gridCard, style]}
			onPress={onPress}
			activeOpacity={0.8}
			accessibilityRole="button"
			accessibilityLabel={`${title}, ${description}`}
		>
			<View style={styles.iconCircleGrid}>
				<MaterialCommunityIcons name={iconName} size={22} color="#1F5F68" />
			</View>

			<View style={styles.textWrapGrid}>
				<AppTypography variant="body" style={styles.titleGrid} numberOfLines={1}>
					{title}
				</AppTypography>
				<AppTypography variant="caption" style={styles.descGrid} numberOfLines={2}>
					{description}
				</AppTypography>
			</View>
		</TouchableOpacity>
	)
}

export default CaregiverServiceCard

const styles = StyleSheet.create({
	// 2-Column Grid Card (Time-Based Care)
	gridCard: {
		width: '48.2%',
		backgroundColor: '#FFFFFF',
		borderRadius: 14,
		borderWidth: 1,
		borderColor: 'rgba(226, 232, 240, 0.9)',
		padding: 14,
		marginBottom: 12,
		justifyContent: 'flex-start',
		minHeight: 124,
		shadowColor: '#0F172A',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.04,
		shadowRadius: 2,
		elevation: 1,
	},
	iconCircleGrid: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: '#F0FDFA',
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 10,
	},
	textWrapGrid: {
		flex: 1,
		justifyContent: 'flex-start',
	},
	titleGrid: {
		fontSize: 15,
		fontWeight: '700',
		color: '#0F172A',
		lineHeight: 19,
		marginBottom: 3,
	},
	descGrid: {
		fontSize: 12,
		fontWeight: '400',
		color: '#64748B',
		lineHeight: 16,
	},

	// Full-Width Gateway Card (Individual Services)
	fullWidthCard: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#FFFFFF',
		borderRadius: 14,
		borderWidth: 1,
		borderColor: 'rgba(226, 232, 240, 0.9)',
		paddingHorizontal: 16,
		paddingVertical: 14,
		shadowColor: '#0F172A',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.04,
		shadowRadius: 2,
		elevation: 1,
	},
	cardTablet: {
		maxWidth: 800,
		alignSelf: 'center',
		width: '100%',
	},
	iconCircleFull: {
		width: 44,
		height: 44,
		borderRadius: 22,
		backgroundColor: '#F0FDFA',
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 14,
	},
	textWrapFull: {
		flex: 1,
		paddingRight: 8,
	},
	titleFull: {
		fontSize: 15,
		fontWeight: '700',
		color: '#0F172A',
		lineHeight: 19,
	},
	descFull: {
		fontSize: 12.5,
		fontWeight: '400',
		color: '#64748B',
		marginTop: 2,
		lineHeight: 17,
	},
})
