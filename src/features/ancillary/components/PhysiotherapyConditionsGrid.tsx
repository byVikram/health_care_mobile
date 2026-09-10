import React from 'react'
import { StyleSheet, TouchableOpacity, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { AppTypography } from '../../../components/common'

export interface PhysiotherapyCondition {
	/** Matches lookup_ancillary_category.public_id for this condition under the Physiotherapy specialty (specialty_id = 2). */
	id: string
	label: string
	icon: keyof typeof MaterialCommunityIcons.glyphMap
}

/**
 * Sentinel id for the "All Services" chip. It does not correspond to a
 * lookup_ancillary_category row -- selecting it means "show every service
 * already fetched for this specialty", so the screen skips the categoryId
 * filter entirely instead of calling a different endpoint or parameter.
 */
export const PHYSIOTHERAPY_ALL_CONDITION_ID = 'phys-all'

/**
 * The 9 "Find Physiotherapy for" condition cards. These map 1:1 to the
 * lookup_ancillary_category rows seeded for the Physiotherapy specialty
 * (public_id values phys-knee, phys-back, ... phys-post-surgery). Selecting
 * a card filters the already-fetched services by that category's public_id
 * via the existing /api/ancillary/services?category_id= support -- no
 * service data is hardcoded here, only the condition labels/icons used to
 * drive the picker.
 */
export const PHYSIOTHERAPY_CONDITIONS: PhysiotherapyCondition[] = [
	{ id: 'phys-knee', label: 'Knee Pain', icon: 'bone' },
	{ id: 'phys-back', label: 'Back Pain', icon: 'human-male-height' },
	{ id: 'phys-neck', label: 'Neck Pain', icon: 'head-alert-outline' },
	{ id: 'phys-shoulder', label: 'Shoulder Pain', icon: 'arm-flex-outline' },
	{ id: 'phys-hand', label: 'Hand Pain', icon: 'hand-back-right-outline' },
	{ id: 'phys-leg', label: 'Leg Pain', icon: 'walk' },
	{ id: 'phys-sports-injury', label: 'Sports Injury', icon: 'dumbbell' },
	{ id: 'phys-stroke', label: 'Stroke Rehab', icon: 'brain' },
	{ id: 'phys-post-surgery', label: 'Post Surgery', icon: 'bandage' },
]

interface PhysiotherapyConditionsGridProps {
	activeConditionId: string | null
	onSelectCondition: (id: string) => void
}

/**
 * "Find Physiotherapy for" condition-discovery section.
 * Physiotherapy-only presentational section for AncillaryServiceCatalogScreen --
 * rendered when serviceKey === 'physiotherapy'. Mirrors the styling conventions
 * already used by NursingQuickActionCards / AllServiceCard in this module.
 *
 * A small, icon-less "All Services" chip sits at the top-right of the
 * heading row (where the condition count used to be) and selects
 * PHYSIOTHERAPY_ALL_CONDITION_ID, showing every fetched Physiotherapy
 * service unfiltered. Below it is the 9-condition grid, the patient-facing
 * service filter for Physiotherapy. The selected option -- chip or card --
 * is shown via the existing highlighted styling only (border + tint) -- no
 * selection dot.
 */
export const PhysiotherapyConditionsGrid: React.FC<PhysiotherapyConditionsGridProps> = ({
	activeConditionId,
	onSelectCondition,
}) => {
	const isAllActive = activeConditionId === PHYSIOTHERAPY_ALL_CONDITION_ID

	return (
		<View style={styles.container}>
			<View style={styles.headerRow}>
				<View style={styles.headerTextWrap}>
					<AppTypography variant="h4" style={styles.headerTitle}>
						Find Physiotherapy for
					</AppTypography>
					<AppTypography variant="caption" style={styles.headerSubtitle}>
						Select your affected area or goal
					</AppTypography>
				</View>

				<TouchableOpacity
					style={[styles.allServicesChip, isAllActive && styles.allServicesChipActive]}
					onPress={() => onSelectCondition(PHYSIOTHERAPY_ALL_CONDITION_ID)}
					activeOpacity={0.85}
				>
					<AppTypography
						variant="caption"
						style={[styles.allServicesChipText, isAllActive && styles.allServicesChipTextActive]}
					>
						All Services
					</AppTypography>
				</TouchableOpacity>
			</View>

			<View style={styles.grid}>
				{PHYSIOTHERAPY_CONDITIONS.map((condition) => {
					const isActive = activeConditionId === condition.id
					return (
						<TouchableOpacity
							key={condition.id}
							style={[styles.card, isActive && styles.cardActive]}
							onPress={() => onSelectCondition(condition.id)}
							activeOpacity={0.85}
						>
							<View style={[styles.iconCircle, isActive && styles.iconCircleActive]}>
								<MaterialCommunityIcons
									name={condition.icon}
									size={20}
									color={isActive ? '#0C7C7C' : '#475569'}
								/>
							</View>
							<AppTypography
								variant="caption"
								style={[styles.cardLabel, isActive && styles.cardLabelActive]}
								numberOfLines={2}
							>
								{condition.label}
							</AppTypography>
						</TouchableOpacity>
					)
				})}
			</View>
		</View>
	)
}

export default PhysiotherapyConditionsGrid

const styles = StyleSheet.create({
	container: {
		paddingHorizontal: 16,
		marginTop: 8,
		marginBottom: 4,
	},
	headerRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		justifyContent: 'space-between',
		marginBottom: 12,
	},
	headerTextWrap: {
		flex: 1,
		paddingRight: 8,
	},
	headerTitle: {
		fontSize: 17,
		fontWeight: '700',
		color: '#0F172A',
		lineHeight: 21,
	},
	headerSubtitle: {
		fontSize: 12,
		fontWeight: '500',
		color: '#64748B',
		marginTop: 2,
	},
	allServicesChip: {
		paddingHorizontal: 10,
		paddingVertical: 5,
		borderRadius: 14,
		borderWidth: 1,
		borderColor: 'rgba(226, 232, 240, 0.8)',
		backgroundColor: '#FFFFFF',
		marginTop: 1,
	},
	allServicesChipActive: {
		borderWidth: 1.5,
		borderColor: '#0C7C7C',
		backgroundColor: 'rgba(12, 124, 124, 0.06)',
	},
	allServicesChipText: {
		fontSize: 11,
		fontWeight: '600',
		color: '#475569',
	},
	allServicesChipTextActive: {
		fontWeight: '700',
		color: '#0C7C7C',
	},
	grid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 10,
	},
	card: {
		width: '31%',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 10,
		paddingHorizontal: 6,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: 'rgba(226, 232, 240, 0.8)',
		backgroundColor: '#FFFFFF',
		position: 'relative',
	},
	cardActive: {
		borderWidth: 2,
		borderColor: '#0C7C7C',
		backgroundColor: 'rgba(12, 124, 124, 0.06)',
	},
	iconCircle: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: '#F8FAFC',
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 4,
	},
	iconCircleActive: {
		backgroundColor: '#FFFFFF',
	},
	cardLabel: {
		fontSize: 12,
		fontWeight: '600',
		color: '#334155',
		textAlign: 'center',
		lineHeight: 15,
	},
	cardLabelActive: {
		fontWeight: '700',
		color: '#0C7C7C',
	},
})
