import React from 'react'
import { StyleSheet, View, StyleProp, ViewStyle } from 'react-native'
import { AppTypography } from '../../../components/common'

interface CaregiverSectionHeaderProps {
	title: string
	supportingText: string
	style?: StyleProp<ViewStyle>
}

export const CaregiverSectionHeader: React.FC<CaregiverSectionHeaderProps> = ({
	title,
	supportingText,
	style,
}) => {
	return (
		<View style={[styles.container, style]}>
			<AppTypography variant="h4" style={styles.title}>
				{title}
			</AppTypography>
			<AppTypography variant="caption" style={styles.supportingText}>
				{supportingText}
			</AppTypography>
		</View>
	)
}

export default CaregiverSectionHeader

const styles = StyleSheet.create({
	container: {
		marginBottom: 12,
	},
	title: {
		fontSize: 17,
		fontWeight: '700',
		color: '#0F172A',
		lineHeight: 22,
	},
	supportingText: {
		fontSize: 13,
		fontWeight: '500',
		color: '#64748B',
		marginTop: 2,
		lineHeight: 18,
	},
})
