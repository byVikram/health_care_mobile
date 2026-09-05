import React from 'react'
import { StyleSheet, TouchableOpacity, View } from 'react-native'
import { AppTypography } from '../../../components/common'

export interface PhysiotherapyCondition {
	id: string
	label: string
	emoji: string
	/** Lowercase keywords matched against a service's title/description to flag it as recommended */
	keywords: string[]
}

export const PHYSIOTHERAPY_CONDITIONS: PhysiotherapyCondition[] = [
	{ id: 'knee', label: 'Knee Pain', emoji: '🦵', keywords: ['knee'] },
	{ id: 'back', label: 'Back Pain', emoji: '🧍', keywords: ['back', 'spine', 'lumbar'] },
	{ id: 'neck', label: 'Neck Pain', emoji: '🧣', keywords: ['neck', 'cervical'] },
	{ id: 'shoulder', label: 'Shoulder Pain', emoji: '🦾', keywords: ['shoulder'] },
	{ id: 'hand', label: 'Hand Pain', emoji: '✋', keywords: ['hand', 'wrist'] },
	{ id: 'leg', label: 'Leg Pain', emoji: '🏃', keywords: ['leg'] },
	{ id: 'sports', label: 'Sports Injury', emoji: '⚽', keywords: ['sport', 'injury'] },
	{ id: 'stroke', label: 'Stroke Rehab', emoji: '🧠', keywords: ['stroke'] },
	{ id: 'postsurg', label: 'Post Surgery', emoji: '🩹', keywords: ['surgery', 'post-op', 'post op'] },
]

interface PhysiotherapyConditionsGridProps {
	activeConditionId: string | null
	onSelectCondition: (id: string) => void
}

/**
 * "Find Physiotherapy for" condition-discovery grid.
 * Physiotherapy-only presentational section for AncillaryServiceCatalogScreen --
 * rendered when serviceKey === 'physiotherapy'. Mirrors the styling conventions
 * already used by NursingQuickActionCards / AllServiceCard in this module.
 */
export const PhysiotherapyConditionsGrid: React.FC<PhysiotherapyConditionsGridProps> = ({
	activeConditionId,
	onSelectCondition,
}) => {
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
				<AppTypography variant="caption" style={styles.countLabel}>
					{PHYSIOTHERAPY_CONDITIONS.length} conditions
				</AppTypography>
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
							{isActive && <View style={styles.activeDot} />}
							<View style={[styles.iconCircle, isActive && styles.iconCircleActive]}>
								<AppTypography style={styles.emoji}>{condition.emoji}</AppTypography>
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
	countLabel: {
		fontSize: 12,
		fontWeight: '600',
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
	activeDot: {
		position: 'absolute',
		top: 6,
		right: 6,
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: '#0C7C7C',
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
	emoji: {
		fontSize: 18,
		lineHeight: 22,
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
