import React, { useState, useEffect, useCallback } from 'react'
import {
	View,
	StyleSheet,
	ScrollView,
	FlatList,
	RefreshControl,
	TouchableOpacity,
	useWindowDimensions,
	DimensionValue,
} from 'react-native'
import { useTheme } from 'react-native-paper'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { useRoute } from '@react-navigation/native'
import DoctorSearchCard from './components/DoctorSearchCard'
import { AppTypography, AppSkeleton } from '../../../components/common'
import { getDoctors, getSpecialities } from '../doctorService'
import { DoctorSearchItem } from '../../../types/doctor-search'
import AppHeader from '../../../components/common/AppHeader'
import { doctorCardStyles } from './components/DoctorCard.styles'

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

// ─── Speciality Chip ──────────────────────────────────────────────────────
function SpecialityChip({ spec, selected, onPress }: {
	spec: Speciality
	selected: boolean
	onPress: () => void
}) {
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

// ─── Doctor Card Skeleton ─────────────────────────────────────────────────
function DoctorCardSkeleton() {
	return (
		<View style={doctorCardStyles.card}>
			<View style={doctorCardStyles.imageContainer}>
				<AppSkeleton height="100%" width="100%" />
			</View>
			<View style={doctorCardStyles.content}>
				<AppSkeleton height={12} width="80%" style={{ marginBottom: 4 }} />
				<AppSkeleton height={10} width="60%" style={{ marginBottom: 6 }} />
				<AppSkeleton height={10} width="70%" style={{ marginBottom: 8 }} />
				<View style={doctorCardStyles.infoRow}>
					<View style={doctorCardStyles.infoLeft}>
						<AppSkeleton height={10} width={10} borderRadius={2} />
						<AppSkeleton height={10} width={30} style={{ marginLeft: 4 }} />
					</View>
					<View style={doctorCardStyles.infoRight}>
						<AppSkeleton height={10} width={20} />
						<AppSkeleton height={10} width={10} style={{ marginLeft: 4 }} />
					</View>
				</View>
				<View style={[doctorCardStyles.infoRow, { marginBottom: 8 }]}>
					<View style={doctorCardStyles.infoLeft}>
						<AppSkeleton height={10} width={10} borderRadius={2} />
						<AppSkeleton height={10} width={50} style={{ marginLeft: 4 }} />
					</View>
					<View style={doctorCardStyles.infoRight}>
						<AppSkeleton height={10} width={25} />
					</View>
				</View>
				<AppSkeleton height={28} borderRadius={8} />
			</View>
		</View>
	)
}

// ─── Main Component ───────────────────────────────────────────────────────
export default function DoctorSearchPage() {
	const route = useRoute<any>()
	const theme = useTheme()
	const { width } = useWindowDimensions()

	const numColumns = width >= 900 ? 4 : width >= 600 ? 3 : 2

	// Read initial search query from navigation params (passed from SearchPage)
	const initialQuery = route.params?.query || ''

	const [searchQuery, setSearchQuery] = useState(initialQuery)
	const [activeSpec, setActiveSpec] = useState('all')
	const [doctors, setDoctors] = useState<DoctorSearchItem[]>([])
	const [specialities, setSpecialities] = useState<Speciality[]>([
		{ id: 'all', label: 'All', icon: 'format-list-bulleted' },
	])
	const [loading, setLoading] = useState(true)
	const [refreshing, setRefreshing] = useState(false)

	// Fetch specialities on mount
	useEffect(() => {
		const loadSpecialities = async () => {
			try {
				const res = await getSpecialities()
				if (res.success && res.data) {
					const specMap: Speciality[] = res.data.map((s) => {
						const label = s.label.toLowerCase().trim()
						let icon = SPECIALITY_ICON_MAP[label] ?? (label.includes('dent') ? 'tooth-outline' : 'medical-bag')
						return { id: s.id, label: s.label, icon }
					})
					setSpecialities([{ id: 'all', label: 'All', icon: 'format-list-bulleted' }, ...specMap])
				}
			} catch (error) {
				console.error('Error fetching specialities:', error)
			}
		}
		loadSpecialities()
	}, [])

	// Fetch doctors with correct parameter mapping
	const fetchDoctorsList = async (isRefresh = false) => {
		if (!isRefresh) setLoading(true)
		try {
			// 🔁 ADJUST THIS MAPPING TO MATCH YOUR BACKEND
			// Option 1: if backend expects 'q' instead of 'search'
			// Option 2: if backend expects 'speciality' instead of 'speciality_id'
			const params: any = {
				limit: 50,
			}
			// Example: map search to 'q' (uncomment if needed)
			if (searchQuery.trim()) {
				params.q = searchQuery.trim()   // <-- change 'q' to whatever backend uses
				// params.search = searchQuery.trim() // use this if backend uses 'search'
			}
			if (activeSpec !== 'all') {
				params.speciality = activeSpec    // <-- change to 'speciality_id' if needed
				// params.speciality_id = activeSpec
			}

			console.log('📤 Sending params:', JSON.stringify(params, null, 2))

			const res = await getDoctors(params)  // getDoctors already uses these params
			console.log('📥 API response:', JSON.stringify(res, null, 2))

			if (res.success && res.data) {
				setDoctors(res.data)
			} else {
				setDoctors([])
			}
		} catch (error) {
			console.error('Error fetching doctors:', error)
			setDoctors([])
		} finally {
			setLoading(false)
			setRefreshing(false)
		}
	}

	// Debounced search (500ms)
	useEffect(() => {
		const timer = setTimeout(() => {
			fetchDoctorsList()
		}, 500)
		return () => clearTimeout(timer)
	}, [searchQuery, activeSpec])

	const onRefresh = useCallback(() => {
		setRefreshing(true)
		fetchDoctorsList(true)
	}, [searchQuery, activeSpec])

	// Immediate search when user presses Enter on keyboard
	const handleSearchSubmit = () => {
		fetchDoctorsList()
	}

	// Render item for FlatList
	const renderItem = useCallback(({ item }: { item: DoctorSearchItem }) => {
		const itemWidth: DimensionValue = `${100 / numColumns}%`
		return (
			<View style={{ width: itemWidth, padding: 4 }}>
				<DoctorSearchCard doctor={item} />
			</View>
		)
	}, [numColumns])

	// Skeleton placeholder list when loading
	const listData = loading && !refreshing ? Array(6).fill({}) : doctors
	const keyExtractor = (item: any, index: number) =>
		item.id ? String(item.id) : `skeleton-${index}`

	return (
		<View style={styles.container}>
			{/* Editable header search bar */}
			<AppHeader
				variant="search"
				location="KR Market"
				onAvatarPress={() => {}}
				isSearchEditable={true}
				searchValue={searchQuery}
				onSearchChange={setSearchQuery}
				onSearchSubmit={handleSearchSubmit}
			/>

			{/* Specialities chips */}
			<View style={styles.filterSection}>
				<AppTypography variant="h4" style={styles.filterTitle}>
					Search by Specialities
				</AppTypography>
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
							onPress={() => setActiveSpec(spec.id)}
						/>
					))}
				</ScrollView>
			</View>

			{/* Results or empty state */}
			{!loading && doctors.length === 0 ? (
				<View style={styles.emptyContainer}>
					<MaterialCommunityIcons name="magnify-close" size={48} color="#ccc" />
					<AppTypography variant="body" style={styles.emptyText}>
						No doctors found
					</AppTypography>
					<AppTypography variant="caption" style={styles.emptySubtext}>
						Try a different name, symptom, or speciality
					</AppTypography>
				</View>
			) : (
				<FlatList
					key={numColumns}
					data={listData}
					keyExtractor={keyExtractor}
					numColumns={numColumns}
					columnWrapperStyle={
						numColumns > 1
							? { paddingHorizontal: 12, justifyContent: 'space-between' }
							: undefined
					}
					renderItem={({ item }) =>
						loading && !refreshing && !item.id ? (
							<View style={{ width: `${100 / numColumns}%`, padding: 4 }}>
								<DoctorCardSkeleton />
							</View>
						) : (
							renderItem({ item: item as DoctorSearchItem })
						)
					}
					contentContainerStyle={{ paddingBottom: 24 }}
					refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
					removeClippedSubviews={true}
					maxToRenderPerBatch={6}
					initialNumToRender={6}
				/>
			)}
		</View>
	)
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#f5f7fa' },
	filterSection: { paddingTop: 20, paddingBottom: 8 },
	filterTitle: { paddingHorizontal: 16, marginBottom: 14 },
	filterScroll: { paddingHorizontal: 16, gap: 14 },
	chipWrapper: { alignItems: 'center', gap: 8, width: 72 },
	chipIconBox: {
		width: 64,
		height: 64,
		borderRadius: 16,
		alignItems: 'center',
		justifyContent: 'center',
	},
	chipLabel: { fontSize: 11, textAlign: 'center' },
	emptyContainer: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
		paddingTop: 80,
	},
	emptyText: { fontWeight: '600', color: '#888' },
	emptySubtext: { color: '#aaa', textAlign: 'center', paddingHorizontal: 40 },
})