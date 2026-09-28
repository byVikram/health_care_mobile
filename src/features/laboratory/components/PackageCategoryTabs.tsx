import React from 'react'
import {
	ScrollView,
	StyleSheet,
	TouchableOpacity,
	View,
	StyleProp,
	ViewStyle,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { AppTypography } from '../../../components/common/display/AppTypography'
import { PackageCategoryTabItem } from '../data/laboratoryMockData'

interface PackageCategoryTabsProps {
	categories: PackageCategoryTabItem[]
	activeId: string
	onSelectCategory: (id: string) => void
	style?: StyleProp<ViewStyle>
}

/**
 * Reusable category pill tabs matching the Nursing Care category pill design.
 */
export const PackageCategoryTabs: React.FC<PackageCategoryTabsProps> = ({
	categories,
	activeId,
	onSelectCategory,
	style,
}) => {
	return (
		<View style={[styles.container, style]}>
			<ScrollView
				horizontal
				showsHorizontalScrollIndicator={false}
				contentContainerStyle={styles.scrollContent}
			>
				{categories.map((cat) => {
					const isActive = activeId === cat.id
					return (
						<TouchableOpacity
							key={cat.id}
							style={[styles.categoryChip, isActive && styles.categoryChipActive]}
							onPress={() => onSelectCategory(cat.id)}
							activeOpacity={0.8}
							accessibilityRole="tab"
							accessibilityState={{ selected: isActive }}
							accessibilityLabel={`${cat.label} category`}
						>
							{cat.icon ? (
								<MaterialCommunityIcons
									name={cat.icon as any}
									size={15}
									color={isActive ? '#FFFFFF' : '#64748B'}
									style={styles.tabIcon}
								/>
							) : null}
							<AppTypography
								variant="caption"
								style={[styles.categoryChipText, isActive && styles.categoryChipTextActive]}
							>
								{cat.label}
							</AppTypography>
						</TouchableOpacity>
					)
				})}
			</ScrollView>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		marginHorizontal: -16,
		marginBottom: 12,
	},
	scrollContent: {
		paddingHorizontal: 16,
		gap: 8,
	},
	categoryChip: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 14,
		paddingVertical: 7,
		borderRadius: 20,
		backgroundColor: '#F1F5F9',
		borderWidth: 1,
		borderColor: '#E2E8F0',
		flexShrink: 0,
	},
	categoryChipActive: {
		backgroundColor: '#0C7C7C',
		borderColor: '#0C7C7C',
	},
	tabIcon: {
		marginRight: 5,
	},
	categoryChipText: {
		color: '#475569',
		fontWeight: '600',
		fontSize: 12.5,
	},
	categoryChipTextActive: {
		color: '#FFFFFF',
		fontWeight: '700',
	},
})

export default PackageCategoryTabs
