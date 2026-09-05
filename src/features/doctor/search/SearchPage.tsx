import React, { useState, useEffect } from 'react'
import {
	StyleSheet,
	View,
	ScrollView,
	TouchableOpacity,
	ActivityIndicator,
	Platform,
} from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import { useTheme } from 'react-native-paper'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { AppTypography, AppInput, AppButton } from '../../../components/common'
import { getSpecialities } from '../doctorService'
import { ROUTES } from '../../../navigation/routes'
import type { NavigationProp } from '@react-navigation/native'
import type { AppStackParamList } from '../../../navigation/types'

// ─── Icon map (extend as needed) ─────────────────────────────────────────────
const SPECIALITY_ICON_MAP: Record<string, string> = {
	all: 'format-list-bulleted',
	dentistry: 'tooth-outline',
	cardiology: 'heart-multiple-outline',
	orthopedic: 'bone',
	neurology: 'brain',
	kidney: 'kidney',
}

type Speciality = {
	id: string
	label: string
	icon: string
}

// ─── Speciality Chip ──────────────────────────────────────────────────────────
function SpecialityChip({ spec, onPress }: { spec: Speciality; onPress: () => void }) {
	const theme = useTheme()

	return (
		<TouchableOpacity style={styles.chipWrapper} onPress={onPress} activeOpacity={0.75}>
			<View style={styles.chipIconBox}>
				<MaterialCommunityIcons name={spec.icon} size={32} color={theme.colors.primary} />
			</View>
			<AppTypography variant="caption" style={styles.chipLabel} numberOfLines={2}>
				{spec.label}
			</AppTypography>
		</TouchableOpacity>
	)
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SearchPage() {
	const navigation = useNavigation<NavigationProp<AppStackParamList>>()
	const route = useRoute<any>()
	const mode = route.params?.mode
	const theme = useTheme()

	const [specialities, setSpecialities] = useState<Speciality[]>([])
	const [loadingSpecs, setLoadingSpecs] = useState(true)
	const [showAll, setShowAll] = useState(false)

	// ── Fetch specialities on mount ──────────────────────────────────────────
	useEffect(() => {
		const loadSpecialities = async () => {
			try {
				const res = await getSpecialities()
				if (res.success && res.data) {
					const specMap: Speciality[] = res.data.map((s) => {
						const label = s.label.toLowerCase().trim()
						const icon =
							SPECIALITY_ICON_MAP[label] ?? (label.includes('dent') ? 'tooth-outline' : 'medical-bag')
						return { id: s.id, label: s.label, icon }
					})
					setSpecialities([{ id: 'all', label: 'All', icon: 'format-list-bulleted' }, ...specMap])
				}
			} catch (error) {
				console.error('Error fetching specialities:', error)
			} finally {
				setLoadingSpecs(false)
			}
		}
		loadSpecialities()
	}, [])

	const handleSpecialityPress = (specId: string) => {
		if (specId !== 'all') {
			const selectedSpeciality = specialities.find((spec) => spec.id === specId)
			navigation.navigate(ROUTES.STACK.DOCTOR_SEARCH, {
				query: '',
				specialityId: specId,
				specialityName: selectedSpeciality?.label,
				mode,
			})
		} else {
			navigation.navigate(ROUTES.STACK.ALL_SPECIALITIES as any)
		}
	}

	return (
		<View style={styles.container}>
			{/* Search Bar - Fake input that navigates to DoctorSearch */}
			<View style={styles.searchRow}>
				<TouchableOpacity 
					style={styles.searchInputWrap}
					activeOpacity={0.8}
					onPress={() => navigation.navigate(ROUTES.STACK.DOCTOR_SEARCH as any)}
				>
					<AppInput
						isSearch
						showMicrophone
						value=""
						onChangeText={() => {}}
						placeholder="Search Symptoms / Specialities"
						placeholderTextColor="#98a1aa"
						containerStyle={styles.searchInputContainer}
						style={styles.searchInput}
						contentStyle={styles.searchInputContent}
						outlineStyle={styles.searchInputOutline}
						outlineColor="#2e7b7d"
						activeOutlineColor="#2e7b7d"
						textColor="#1b2d3c"
						editable={false}
						pointerEvents="none"
						noMargin
					/>
				</TouchableOpacity>
			</View>

			{/* ── Popular Specialities Grid ─────────────────────────────────────────── */}
			<ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
				<View style={styles.filterSection}>
					<AppTypography variant="subtitle" style={styles.filterTitle}>
						Most searched specialities
					</AppTypography>

					{loadingSpecs ? (
						<View style={styles.gridContainer}>
							{Array(8)
								.fill(null)
								.map((_, i) => (
									<View key={i} style={styles.chipSkeletonWrapper}>
										<View style={[styles.chipIconBox, { backgroundColor: '#e8eef2' }]} />
										<View style={styles.chipLabelSkeleton} />
									</View>
								))}
						</View>
					) : (
						<View style={styles.gridContainer}>
							{specialities
								.filter(s => s.id !== 'all')
								.slice(0, showAll ? undefined : 8)
								.map((spec) => (
									<SpecialityChip
										key={spec.id}
										spec={spec}
										onPress={() => handleSpecialityPress(spec.id)}
									/>
								))}
						</View>
					)}

					{!loadingSpecs && (
						<View style={styles.viewAllContainer}>
							<AppButton
								mode="contained"
								onPress={() => setShowAll(!showAll)}
								style={styles.viewAllButton}
								labelStyle={styles.viewAllButtonLabel}
							>
								{showAll ? 'Show Less' : 'View All Specialities'}
							</AppButton>
						</View>
					)}
				</View>
			</ScrollView>
		</View>
	)
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#ffffff' },

	// Search
	searchRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		paddingHorizontal: 16,
		paddingTop: 16,
		paddingBottom: 12,
		backgroundColor: '#ffffff',
	},
	searchInputWrap: {
		flex: 1,
	},
	searchInputContainer: {
		width: '100%',
	},
	searchInput: {
		backgroundColor: '#f3f4f6', // Light gray similar to mockup
	},
	searchInputContent: {
		height: 48,
		minHeight: 48,
		paddingVertical: 0,
		fontSize: 14,
	},
	searchInputOutline: {
		borderRadius: 24, // highly rounded for mockup
		borderWidth: 0,
	},

	// Grid layout
	scrollContent: { paddingBottom: 40 },
	filterSection: { paddingTop: 16 },
	filterTitle: { paddingHorizontal: 16, marginBottom: 20, fontSize: 16, fontWeight: '600', color: '#1f2937' },
	gridContainer: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		paddingHorizontal: 12,
		justifyContent: 'flex-start',
	},

	// Chip
	chipWrapper: { 
		alignItems: 'center', 
		width: '25%', 
		paddingHorizontal: 4,
		marginBottom: 24,
	},
	chipIconBox: {
		width: 64,
		height: 64,
		borderRadius: 32,
		backgroundColor: '#e8eff5',
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 8,
	},
	chipLabel: { fontSize: 12, textAlign: 'center', fontWeight: '500', color: '#374151', lineHeight: 16 },

	// Skeleton placeholders
	chipSkeletonWrapper: { alignItems: 'center', width: '25%', paddingHorizontal: 4, marginBottom: 24 },
	chipLabelSkeleton: {
		height: 10,
		width: 48,
		borderRadius: 4,
		backgroundColor: '#e8eef2',
	},

	// View All Button
	viewAllContainer: {
		paddingHorizontal: 16,
		marginTop: 8,
		marginBottom: 24,
	},
	viewAllButton: {
		borderRadius: 8,
		backgroundColor: '#1f5f68',
	},
	viewAllButtonLabel: {
		color: '#ffffff',
		fontWeight: '600',
	},
})
