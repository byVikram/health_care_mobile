import React from 'react'
import { StyleSheet, TouchableOpacity } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { AppTypography } from '../../../components/common/AppTypography'

interface SectionSeeAllLinkProps {
	label?: string
	onPress: () => void
}

/**
 * Noticeable "See All" chip affordance styled like the Nursing Care header chips.
 */
export const SectionSeeAllLink: React.FC<SectionSeeAllLinkProps> = ({ label = 'See All', onPress }) => {
	return (
		<TouchableOpacity
			onPress={onPress}
			activeOpacity={0.7}
			hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
			style={styles.container}
			accessibilityRole="button"
			accessibilityLabel={label}
		>
			<AppTypography variant="caption" style={styles.linkText}>
				{label}
			</AppTypography>
			<MaterialCommunityIcons name="arrow-right" size={14} color="#0C7C7C" />
		</TouchableOpacity>
	)
}

const styles = StyleSheet.create({
	container: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 3,
		paddingVertical: 2,
	},
	linkText: {
		fontSize: 13,
		fontWeight: '600',
		color: '#0C7C7C',
	},
})

export default SectionSeeAllLink
