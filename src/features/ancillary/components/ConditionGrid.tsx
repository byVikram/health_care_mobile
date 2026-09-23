import React from 'react'
import { StyleSheet, TouchableOpacity, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { AppTypography } from '../../../components/common'

export interface ConditionGridItem {
	/** Category id this card filters by -- e.g. a lookup_ancillary_category.public_id for Physiotherapy, or an API category id for any other specialty reusing this grid. */
	id: string
	label: string
	icon: keyof typeof MaterialCommunityIcons.glyphMap
}

interface ConditionGridProps {
	activeConditionId: string | null
	onSelectCondition: (id: string) => void
	/**
	 * The cards to render. Each ancillary specialty dashboard (Physiotherapy,
	 * Nursing, Rehab Care, Medical Equipment, Elder Day Care, ...) builds and
	 * passes its own category list from AncillaryServiceCatalogScreen.tsx --
	 * this component has no specialty-specific data of its own.
	 */
	conditions: ConditionGridItem[]
	/**
	 * Heading shown above the grid, e.g. "Physiotherapy For?" or "Nursing Care
	 * For?". Omit `title` to hide the heading row (and its "All Services"
	 * chip) entirely -- for callers that fold "All Services" into the grid
	 * itself as a regular card instead of a separate chip.
	 */
	title?: string
	subtitle?: string
	/** Sentinel id for the "All Services" chip. Only relevant while `title` (and therefore the chip) is rendered. */
	allChipId?: string
	/** Card width as a flexbox percentage, e.g. '31%' (3 per row) or '48%' (2 per row). */
	cardWidthPercent?: `${number}%`
}

/**
 * Reusable specialty-filter card grid, shared across the ancillary services
 * dashboards (Physiotherapy, Nursing Care & Procedures, and any future
 * specialty screen). One grid, one set of styles -- each caller supplies its
 * own `conditions`, heading copy, and "All Services" sentinel id rather than
 * a new component being created per specialty. All specialty-specific data
 * (condition/category lists, titles, sentinel ids) lives in
 * AncillaryServiceCatalogScreen.tsx, not here.
 *
 * The selected option -- chip or card -- is shown via the existing
 * highlighted styling only (border + tint), no selection dot.
 */
export const ConditionGrid: React.FC<ConditionGridProps> = ({
	activeConditionId,
	onSelectCondition,
	conditions,
	title,
	subtitle,
	allChipId,
	cardWidthPercent = '31%',
}) => {
	const isAllActive = activeConditionId === allChipId

	return (
		<View style={styles.container}>
			{title ? (
				<View style={styles.headerRow}>
					<View style={styles.headerTextWrap}>
						<AppTypography variant="h4" style={styles.headerTitle}>
							{title}
						</AppTypography>
						{subtitle ? (
							<AppTypography variant="caption" style={styles.headerSubtitle}>
								{subtitle}
							</AppTypography>
						) : null}
					</View>

					<TouchableOpacity
						style={[styles.allServicesChip, isAllActive && styles.allServicesChipActive]}
						onPress={() => onSelectCondition(allChipId as string)}
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
			) : null}

			<View style={styles.grid}>
				{conditions.map((condition) => {
					const isActive = activeConditionId === condition.id
					return (
						<TouchableOpacity
							key={condition.id}
							style={[styles.card, { width: cardWidthPercent }, isActive && styles.cardActive]}
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

export default ConditionGrid

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
