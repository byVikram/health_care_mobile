import React from 'react'
import { StyleSheet, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { AppTypography, CommonCard } from '../../../components/common'

interface QuickActionCardProps {
	icon: keyof typeof MaterialCommunityIcons.glyphMap
	title: string
	subtitle: string
}

const QuickActionCard: React.FC<QuickActionCardProps> = ({ icon, title, subtitle }) => (
	<CommonCard style={styles.card}>
		<View style={styles.iconCircle}>
			<MaterialCommunityIcons name={icon} size={18} color="#FFFFFF" />
		</View>
		<View style={styles.textWrap}>
			<AppTypography variant="caption" style={styles.title} numberOfLines={2}>
				{title}
			</AppTypography>
			<AppTypography variant="caption" style={styles.subtitle} numberOfLines={1}>
				{subtitle}
			</AppTypography>
		</View>
	</CommonCard>
)

/**
 * UI-only quick-action banner card for the Nursing Care catalog screen.
 * No press handlers, navigation, or API calls are wired up -- purely presentational
 * per the Nursing Care design reference. Rendered only when serviceKey === 'nursing-care'.
 */
export const NursingQuickActionCards: React.FC = () => {
	return (
		<View style={styles.container}>
			<QuickActionCard
				icon="ambulance"
				title="Emergency Nurse Booking"
				subtitle="Priority · 24/7"
			/>
		</View>
	)
}

export default NursingQuickActionCards

const styles = StyleSheet.create({
	container: {
		flexDirection: 'row',
		paddingHorizontal: 16,
		paddingTop: 0,
		paddingBottom: 6,
		gap: 10,
	},
	card: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#FFFFFF',
		borderRadius: 14,
		borderWidth: 1,
		borderColor: '#E8ECEC',
		paddingHorizontal: 12,
		paddingVertical: 12,
		marginBottom: 0,
	},
	iconCircle: {
		width: 37,
		height: 37,
		borderRadius: 17,
		backgroundColor: '#0C7C7C',
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 10,
	},
	textWrap: {
		flex: 1,
	},
	title: {
		fontSize: 14,
		fontWeight: '700',
		color: '#191C1D',
		lineHeight: 18,
	},
	subtitle: {
		fontSize: 13,
		color: '#526062',
		marginTop: 2,
	},
})
