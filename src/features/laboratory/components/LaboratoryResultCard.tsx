import React from 'react'
import { StyleSheet, TouchableOpacity, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { AppTypography } from '../../../components/common/display/AppTypography'
import type { LaboratoryItem } from '../../laboratory_duplicated/laboratory'

interface LaboratoryResultCardProps {
	lab: LaboratoryItem
	onSelect: (lab: LaboratoryItem) => void
	selected?: boolean
}

/**
 * Clean laboratory row following Nursing Care's selection list pattern.
 * Displays only actual fields from LaboratoryItem:
 * - Lab name
 * - Address / Location
 * - Availability (Open 24x7 or operating hours if present)
 * - Selection state
 */
export const LaboratoryResultCard: React.FC<LaboratoryResultCardProps> = ({ lab, onSelect, selected = false }) => {
	const addressLine = [lab.address, lab.city].filter(Boolean).join(', ')

	const availabilityText = lab.is_24_x_7
		? 'Open 24x7'
		: lab.operating_hours?.open && lab.operating_hours?.close
			? `${lab.operating_hours.open} – ${lab.operating_hours.close}`
			: ''

	return (
		<TouchableOpacity
			style={[styles.row, selected && styles.rowSelected]}
			onPress={() => onSelect(lab)}
			activeOpacity={0.7}
			accessibilityRole="radio"
			accessibilityState={{ checked: selected }}
			accessibilityLabel={`${lab.name}${selected ? ', selected' : ''}`}
		>
			<View style={[styles.iconBox, selected && styles.iconBoxSelected]}>
				<MaterialCommunityIcons
					name="hospital-building"
					size={22}
					color={selected ? '#FFFFFF' : '#0C7C7C'}
				/>
			</View>

			<View style={styles.infoCol}>
				<AppTypography variant="h3" style={styles.title} numberOfLines={2}>
					{lab.name}
				</AppTypography>
				{addressLine ? (
					<AppTypography variant="caption" style={styles.subtitleText} numberOfLines={2}>
						{addressLine}
					</AppTypography>
				) : null}
				{availabilityText ? (
					<AppTypography variant="caption" style={styles.metaLineText} numberOfLines={1}>
						{availabilityText}
					</AppTypography>
				) : null}
			</View>

			<View style={styles.selectionIndicator}>
				{selected ? (
					<MaterialCommunityIcons name="check-circle" size={22} color="#0C7C7C" />
				) : (
					<View style={styles.radioEmpty} />
				)}
			</View>
		</TouchableOpacity>
	)
}

const styles = StyleSheet.create({
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 14,
		paddingHorizontal: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#E2E8F0',
		backgroundColor: '#FFFFFF',
		borderRadius: 12,
		marginBottom: 6,
	},
	rowSelected: {
		backgroundColor: '#F0FDFA',
		borderColor: '#0C7C7C',
		borderWidth: 1,
		borderBottomWidth: 1,
		borderBottomColor: '#0C7C7C',
	},
	iconBox: {
		width: 44,
		height: 44,
		borderRadius: 12,
		backgroundColor: '#E6F4F4',
		alignItems: 'center',
		justifyContent: 'center',
		flexShrink: 0,
	},
	iconBoxSelected: {
		backgroundColor: '#0C7C7C',
	},
	infoCol: {
		flex: 1,
		marginLeft: 14,
		marginRight: 12,
		gap: 2,
	},
	title: {
		fontSize: 15,
		fontWeight: '700',
		color: '#181C1D',
		lineHeight: 20,
	},
	subtitleText: {
		fontSize: 12,
		color: '#64748B',
		lineHeight: 16,
	},
	metaLineText: {
		fontSize: 11.5,
		fontWeight: '600',
		color: '#0C7C7C',
		lineHeight: 16,
		marginTop: 2,
	},
	selectionIndicator: {
		width: 22,
		height: 22,
		alignItems: 'center',
		justifyContent: 'center',
		flexShrink: 0,
	},
	radioEmpty: {
		width: 20,
		height: 20,
		borderRadius: 10,
		borderWidth: 1.5,
		borderColor: '#CBD5E1',
	},
})

export default LaboratoryResultCard
