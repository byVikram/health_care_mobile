import React, { useState, useEffect } from 'react'
import {
	StyleSheet,
	View,
	Text,
	ScrollView,
	TouchableOpacity,
	ActivityIndicator,
	Platform,
	TextInput,
} from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import { useTheme } from 'react-native-paper'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { AppTypography } from '../../../components/common'
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
function SpecialityChip({ spec, selected, onPress }: { spec: Speciality; selected: boolean; onPress: () => void }) {
	const theme = useTheme()

	return (
		<TouchableOpacity style={styles.chipWrapper} onPress={onPress} activeOpacity={0.75}>
			<View
				style={[
					styles.chipIconBox,
					selected ? { backgroundColor: theme.colors.primary } : { backgroundColor: '#e8eef2' },
				]}
			>
				<MaterialCommunityIcons
					name={spec.icon}
					size={28}
					color={selected ? '#ffffff' : theme.colors.primary}
				/>
			</View>
			<AppTypography
				variant="caption"
				style={[styles.chipLabel, { color: selected ? theme.colors.primary : '#888' }]}
			>
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
	const [searchQuery, setSearchQuery] = useState('')
	const [activeSpec, setActiveSpec] = useState('all')
	const [specialities, setSpecialities] = useState<Speciality[]>([
		{ id: 'all', label: 'All', icon: 'format-list-bulleted' },
	])
	const [loadingSpecs, setLoadingSpecs] = useState(true)

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

	// ── Navigate to results ──────────────────────────────────────────────────
	// Called when user presses Search keyboard key
	const handleSearchSubmit = () => {
		const trimmed = searchQuery.trim()
		const selectedSpeciality = specialities.find((spec) => spec.id === activeSpec)

		navigation.navigate(ROUTES.STACK.DOCTOR_SEARCH, {
			query: trimmed,
			specialityId: activeSpec !== 'all' ? activeSpec : undefined,
			specialityName: activeSpec !== 'all' ? selectedSpeciality?.label : undefined,
			mode,
		})
	}

	// Called when user taps a speciality chip
	const handleSpecialityPress = (specId: string) => {
		setActiveSpec(specId)

		if (specId !== 'all') {
			const selectedSpeciality = specialities.find((spec) => spec.id === specId)

			navigation.navigate(ROUTES.STACK.DOCTOR_SEARCH, {
				query: searchQuery.trim() || '',
				specialityId: specId,
				specialityName: selectedSpeciality?.label,
				mode,
			})
		}
	}

	return (
		<View style={styles.container}>
			{/* Search Bar - Editable TextInput */}
			<View style={styles.searchBar}>
				<MaterialCommunityIcons name="magnify" size={20} color="#9aa0a6" style={styles.searchIcon} />
				<TextInput
					style={styles.searchInput}
					placeholder="Search Doctors/Symptoms"
					placeholderTextColor="#9AA0AC"
					value={searchQuery}
					onChangeText={setSearchQuery}
					onSubmitEditing={handleSearchSubmit}
					returnKeyType="search"
					autoFocus={true}
				/>
				{searchQuery.length > 0 && (
					<TouchableOpacity onPress={() => setSearchQuery('')}>
						<MaterialCommunityIcons name="close" size={20} color="#9aa0a6" />
					</TouchableOpacity>
				)}
			</View>

			{/* ── Specialities section ─────────────────────────────────────────── */}
			<View style={styles.filterSection}>
				<AppTypography variant="h4" style={styles.filterTitle}>
					Search by Specialities
				</AppTypography>

				{loadingSpecs ? (
					// Skeleton row while API loads
					<View style={styles.loadingRow}>
						{Array(5)
							.fill(null)
							.map((_, i) => (
								<View key={i} style={styles.chipSkeletonWrapper}>
									<View style={[styles.chipIconBox, { backgroundColor: '#e8eef2' }]} />
									<View style={styles.chipLabelSkeleton} />
								</View>
							))}
					</View>
				) : (
					<ScrollView
						horizontal
						showsHorizontalScrollIndicator={false}
						contentContainerStyle={styles.filterScroll}
					>
						{specialities.map((spec) => (
							<SpecialityChip
								key={spec.id}
								spec={spec}
								selected={activeSpec === spec.id}
								onPress={() => handleSpecialityPress(spec.id)}
							/>
						))}
					</ScrollView>
				)}
			</View>

			{/* ── Empty-state hint ─────────────────────────────────────────────── */}
			<View style={styles.hintContainer}>
				<MaterialCommunityIcons name="magnify" size={48} color="#d1d5db" />
				<Text style={styles.hintTitle}>Find a doctor</Text>
				<Text style={styles.hintText}>
					Type a doctor name, symptom, or speciality and press Search — or tap a speciality chip above to
					browse instantly.
				</Text>
			</View>
		</View>
	)
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#f5f7fa' },

	// Speciality filter
	filterSection: { paddingTop: 20, paddingBottom: 8 },
	filterTitle: { paddingHorizontal: 16, marginBottom: 14 },
	filterScroll: { paddingHorizontal: 16, gap: 14 },

	// Chip
	chipWrapper: { alignItems: 'center', gap: 8, width: 72 },
	chipIconBox: {
		width: 64,
		height: 64,
		borderRadius: 16,
		alignItems: 'center',
		justifyContent: 'center',
	},
	chipLabel: { fontSize: 11, textAlign: 'center' },

	// Skeleton placeholders
	loadingRow: {
		flexDirection: 'row',
		paddingHorizontal: 16,
		gap: 14,
	},
	chipSkeletonWrapper: { alignItems: 'center', gap: 8, width: 72 },
	chipLabelSkeleton: {
		height: 10,
		width: 48,
		borderRadius: 4,
		backgroundColor: '#e8eef2',
	},

	// Hint
	hintContainer: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 32,
		gap: 10,
	},
	hintTitle: {
		fontSize: 17,
		fontWeight: '600',
		color: '#6b7280',
	},
	hintText: {
		fontSize: 14,
		color: '#9ca3af',
		textAlign: 'center',
		lineHeight: 22,
	},
	searchBar: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#fff',
		margin: 12,
		marginBottom: 8,
		borderRadius: 12,
		paddingHorizontal: 12,
		paddingVertical: Platform.OS === 'ios' ? 10 : 4,
		borderWidth: 1,
		borderColor: '#EAECF0',
		gap: 8,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.05,
		shadowRadius: 4,
		elevation: 1,
	},
	searchIcon: { marginRight: 4 },
	searchInput: { flex: 1, fontSize: 14, color: '#101828' },
})
