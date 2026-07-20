import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
	View,
	StyleSheet,
	FlatList,
	RefreshControl,
	ActivityIndicator,
	useWindowDimensions,
	DimensionValue,
	TouchableOpacity,
	ScrollView,
	Alert,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import * as Location from 'expo-location'
import { getCurrentLocation } from '../../../services/locationService'
import { useRoute, useNavigation } from '@react-navigation/native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'

import DoctorSearchCard from './components/DoctorSearchCard'
import { AppScreenHeader, AppTypography, AppSkeleton, AppSelect, AppSelectOption, AppBottomSheet, AppInput } from '../../../components/common'
import { getDoctors, getSpecialities } from '../doctorService'
import { DoctorSearchItem } from '../../../types/doctor-search'
import { doctorCardStyles } from './components/DoctorCard.styles'
import type { RouteProp } from '@react-navigation/native'
import type { AppStackParamList } from '../../../navigation/types'
import { ROUTES } from '../../../navigation/routes'

const PAGE_LIMIT = 5

const CONSULTATION_OPTIONS: AppSelectOption[] = [
	{ label: 'All Modes', value: 'all' },
	{ label: 'Video Call', value: 'video' },
	{ label: 'Clinic Visit', value: 'clinic' },
]

const RATING_OPTIONS: AppSelectOption[] = [
	{ label: 'All Ratings', value: 'all' },
	{ label: '4.5+ Stars', value: '4.5' },
	{ label: '4.0+ Stars', value: '4.0' },
	{ label: '3.5+ Stars', value: '3.5' },
]

// ─── Doctor Card Skeleton ─────────────────────────────────────────────────
function DoctorCardSkeleton({ mobile = false }: { mobile?: boolean }) {
	return (
		<View style={[doctorCardStyles.card, mobile && doctorCardStyles.mobileCard]}>
			<View style={[doctorCardStyles.imageContainer, mobile && doctorCardStyles.mobileImageContainer]}>
				<AppSkeleton height="100%" width="100%" />
			</View>
			<View style={[doctorCardStyles.content, mobile && doctorCardStyles.mobileContent]}>
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
	const navigation = useNavigation<any>()
	const route = useRoute<RouteProp<AppStackParamList, typeof ROUTES.STACK.DOCTOR_SEARCH>>()
	console.log('Route params:', route.params)
	const { width } = useWindowDimensions()

	const isMobile = width < 600
	const numColumns = isMobile ? 1 : width >= 900 ? 4 : 3
	const mobileListPadding = width < 360 ? 12 : 20

	// Initial route params
	const initialQuery = route.params?.query || ''
	const initialMode = route.params?.mode || 'all'
	const initialSpecialityId = route.params?.specialityId ? String(route.params.specialityId) : 'all'
	const initialNearby = route.params?.nearby || false
	console.log('Route params:', route.params)

	const [searchQuery, setSearchQuery] = useState(initialQuery)
	const [doctors, setDoctors] = useState<DoctorSearchItem[]>([])
	const [loading, setLoading] = useState(true)
	const [refreshing, setRefreshing] = useState(false)
	const [page, setPage] = useState(1)
	const [loadingMore, setLoadingMore] = useState(false)
	const [hasMore, setHasMore] = useState(true)
	const isFetchingPageRef = useRef(false)

	// Filter states
	const [specialityFilter, setSpecialityFilter] = useState(initialSpecialityId)
	const [consultationTypeFilter, setConsultationTypeFilter] = useState<string>(initialMode)
	const [minRatingFilter, setMinRatingFilter] = useState('all')
	const [nearbyFilter, setNearbyFilter] = useState(initialNearby)
	const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null)
	const [specialities, setSpecialities] = useState<AppSelectOption[]>([
		{ label: 'All Specialities', value: 'all' },
		...(route.params?.specialityId && route.params?.specialityName
			? [{ label: route.params.specialityName, value: String(route.params.specialityId) }]
			: []),
	])
	const [specialitiesLoading, setSpecialitiesLoading] = useState(false)

	// Modal draft states
	const [draftSpecialityFilter, setDraftSpecialityFilter] = useState(initialSpecialityId)
	const [draftConsultationType, setDraftConsultationType] = useState<string>(initialMode)
	const [draftMinRating, setDraftMinRating] = useState('all')

	const [showFilters, setShowFilters] = useState(false)

	// Load specialities on mount
	useEffect(() => {
		const loadSpecialities = async () => {
			try {
				setSpecialitiesLoading(true)
				const res = await getSpecialities()
				if (res.success && res.data) {
					const mapped = res.data.map((s) => ({
						label: s.label,
						value: String(s.id),
					}))
					setSpecialities([{ label: 'All Specialities', value: 'all' }, ...mapped])

					if (route.params?.specialityId) {
						const found = res.data.find((s) => String(s.id) === String(route.params?.specialityId))
						if (found) {
							const val = String(found.id)
							setSpecialityFilter(val)
							setDraftSpecialityFilter(val)
						}
					}
				}
			} catch (error) {
				console.error('Error fetching specialities:', error)
			} finally {
				setSpecialitiesLoading(false)
			}
		}
		loadSpecialities()
	}, [route.params?.specialityId])

	// Load location if nearby is requested
	useEffect(() => {
		const initLocation = async () => {
			if (!nearbyFilter || userLocation) return
			try {
				const isEnabled = await Location.hasServicesEnabledAsync()
				if (!isEnabled) {
					Alert.alert(
						'Location Services Disabled',
						'Please enable location services on your device to find nearby doctors.'
					)
				}
				const coords = await getCurrentLocation()
				setUserLocation(coords)
			} catch (error) {
				console.warn('Geolocation failed or denied, using default coordinates.', error)
				setUserLocation({ latitude: 12.9716, longitude: 77.5946 })
			}
		}
		initLocation()
	}, [nearbyFilter])

	// Fetch doctor list
	const fetchDoctorsList = async (targetPage = 1, isRefresh = false, isLoadMore = false) => {
		if (isFetchingPageRef.current) return
		isFetchingPageRef.current = true

		if (isLoadMore) {
			setLoadingMore(true)
		} else if (!isRefresh) {
			setLoading(true)
		}
		try {
			const params: Record<string, any> = {
				page: targetPage,
				limit: PAGE_LIMIT,
			}

			if (searchQuery.trim().length > 0) {
				params.search = searchQuery.trim()
			}

			if (specialityFilter !== 'all') {
				params.speciality_id = specialityFilter
			}

			if (consultationTypeFilter !== 'all') {
				params.consultation_type = consultationTypeFilter
			}

			if (minRatingFilter !== 'all') {
				params.min_rating = Number(minRatingFilter)
			}

			if (nearbyFilter) {
				if (!userLocation) {
					isFetchingPageRef.current = false
					return
				}
				params.latitude = userLocation.latitude
				params.longitude = userLocation.longitude
				params.nearby = true
				params.radius = 10.0
			}

			console.log('📤 Sending params:', JSON.stringify(params, null, 2))

			const res = await getDoctors(params)
			console.log('📥 API response:', JSON.stringify(res, null, 2))

			if (res.success && res.data) {
				const newData = res.data
				setDoctors((prev) => (targetPage === 1 ? newData : [...prev, ...newData]))
				setPage(targetPage)
				setHasMore(newData.length >= PAGE_LIMIT)
			} else {
				if (targetPage === 1) setDoctors([])
				setHasMore(false)
			}
		} catch (error) {
			console.error('Error fetching doctors:', error)
			if (targetPage === 1) setDoctors([])
		} finally {
			setLoading(false)
			setRefreshing(false)
			setLoadingMore(false)
			isFetchingPageRef.current = false
		}
	}

	useEffect(() => {
		if (nearbyFilter && !userLocation) {
			setLoading(true)
			return
		}
		fetchDoctorsList(1)
	}, [searchQuery, specialityFilter, consultationTypeFilter, minRatingFilter, nearbyFilter, userLocation])

	const onRefresh = useCallback(() => {
		if (isFetchingPageRef.current) return
		setRefreshing(true)
		setPage(1)
		setDoctors([])
		setHasMore(true)
		fetchDoctorsList(1, true)
	}, [searchQuery, specialityFilter, consultationTypeFilter, minRatingFilter, nearbyFilter, userLocation])

	const handleEndReached = useCallback(() => {
		if (isFetchingPageRef.current || loading || refreshing || loadingMore || !hasMore) return
		console.log('🔥 Loading next page:', page + 1)
		fetchDoctorsList(page + 1, false, true)
	}, [
		hasMore,
		loading,
		loadingMore,
		page,
		refreshing,
		searchQuery,
		specialityFilter,
		consultationTypeFilter,
		minRatingFilter,
		nearbyFilter,
		userLocation,
	])

	// Modal handlers
	const openFilterModal = () => {
		setDraftSpecialityFilter(specialityFilter)
		setDraftConsultationType(consultationTypeFilter)
		setDraftMinRating(minRatingFilter)
		setShowFilters(true)
	}

	const closeFilterModal = () => {
		setShowFilters(false)
	}

	const applyFilters = () => {
		setSpecialityFilter(draftSpecialityFilter)
		setConsultationTypeFilter(draftConsultationType)
		setMinRatingFilter(draftMinRating)
		closeFilterModal()
	}

	const resetFilters = () => {
		setDraftSpecialityFilter('all')
		setDraftConsultationType('all')
		setDraftMinRating('all')
		setSpecialityFilter('all')
		setConsultationTypeFilter('all')
		setMinRatingFilter('all')
	}

	// Render item for FlatList
	const renderItem = useCallback(
		({ item }: { item: DoctorSearchItem }) => {
			const itemWidth: DimensionValue = `${100 / numColumns}%`
			return (
				<View style={[styles.cardListItem, isMobile && styles.cardListItemMobile, { width: itemWidth }]}>
					<DoctorSearchCard doctor={item} mobile={isMobile} />
				</View>
			)
		},
		[isMobile, numColumns]
	)

	const renderFilterChips = (options: AppSelectOption[], value: string, onChange: (nextValue: string) => void) => (
		<ScrollView
			horizontal
			showsHorizontalScrollIndicator={false}
			style={styles.filterChipScroller}
			contentContainerStyle={styles.filterChipRow}
			keyboardShouldPersistTaps="handled"
		>
			{options.map((option) => {
				const selected = option.value === value

				return (
					<TouchableOpacity
						key={option.value}
						style={[styles.filterChip, selected && styles.filterChipActive]}
						onPress={() => onChange(option.value)}
						activeOpacity={0.82}
					>
						<AppTypography style={[styles.filterChipText, selected && styles.filterChipTextActive]}>
							{option.label}
						</AppTypography>
					</TouchableOpacity>
				)
			})}
		</ScrollView>
	)

	// Skeleton placeholder list when loading
	const listData = loading && !refreshing ? Array(6).fill({}) : doctors
	const keyExtractor = (item: any, index: number) => (item.id ? String(item.id) : `skeleton-${index}`)

	const renderFooter = () =>
		loadingMore ? (
			<View style={styles.footerLoader}>
				<ActivityIndicator size="small" color="#888" />
			</View>
		) : null

	const renderFilterContent = () => {
		return (
			<View style={[styles.filterSheetContentWrapper, { maxWidth: Math.min(width, 520) }]}>
				<ScrollView
					style={styles.filterSheetScroll}
					contentContainerStyle={styles.filterSheetContent}
					showsVerticalScrollIndicator={false}
				>
					<View style={styles.filterGroup}>
						<AppTypography style={styles.filterGroupLabel}>Speciality</AppTypography>
						<AppSelect
							options={specialities}
							value={draftSpecialityFilter}
							onSelect={(value) => {
								setDraftSpecialityFilter(value)
							}}
							placeholder={specialitiesLoading ? 'Loading specialities...' : 'Select Speciality'}
							size="medium"
							borderRadius={10}
							customCardStyle={[styles.inlineFilterSelect, styles.mobileHospitalSelectCard]}
							borderColor="#EAECF0"
							maxDropdownHeight={240}
							style={styles.inlineSelectFill}
						/>
					</View>

					<View style={styles.filterGroup}>
						<AppTypography style={styles.filterGroupLabel}>Consultation Mode</AppTypography>
						{renderFilterChips(CONSULTATION_OPTIONS, draftConsultationType, setDraftConsultationType)}
					</View>

					<View style={styles.filterGroup}>
						<AppTypography style={styles.filterGroupLabel}>Minimum Rating</AppTypography>
						{renderFilterChips(RATING_OPTIONS, draftMinRating, setDraftMinRating)}
					</View>
				</ScrollView>

				<View style={styles.filterSheetActions}>
					<TouchableOpacity style={styles.resetButton} onPress={resetFilters} activeOpacity={0.82}>
						<AppTypography style={styles.resetButtonText}>Reset</AppTypography>
					</TouchableOpacity>
					<TouchableOpacity style={styles.applyButton} onPress={applyFilters} activeOpacity={0.88}>
						<AppTypography style={styles.applyButtonText}>Apply Filters</AppTypography>
					</TouchableOpacity>
				</View>
			</View>
		)
	}

	const renderFilterModal = () => {
		return (
			<AppBottomSheet visible={showFilters} title="Filters" onClose={closeFilterModal}>
				{renderFilterContent()}
			</AppBottomSheet>
		)
	}

	const hasActiveFilters = specialityFilter !== 'all' || consultationTypeFilter !== 'all' || minRatingFilter !== 'all'

	return (
		<View style={styles.container}>
			{/* Search Bar Row */}
			<View style={styles.mobileSearchRow}>
				<AppInput
					isSearch
					showMicrophone
					value={searchQuery}
					onChangeText={setSearchQuery}
					placeholder="Search Doctors/Symptoms"
					noMargin
					borderRadius={10}
					style={styles.searchBar}
					containerStyle={{ flex: 1 }}
				/>
				<TouchableOpacity
					onPress={openFilterModal}
					style={[styles.filterIconButton, hasActiveFilters && styles.filterIconButtonActive]}
				>
					<MaterialCommunityIcons name="tune" size={22} color="#1f5f68" />
				</TouchableOpacity>
			</View>

			{/* Results or empty state */}
			{!loading && !refreshing && doctors.length === 0 ? (
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
					key={isMobile ? 'mobile-list' : `grid-${numColumns}`}
					data={listData}
					keyExtractor={keyExtractor}
					numColumns={numColumns}
					columnWrapperStyle={
						numColumns > 1 ? { paddingHorizontal: 12, justifyContent: 'space-between' } : undefined
					}
					renderItem={({ item }) =>
						loading && !refreshing && !item.id ? (
							<View
								style={[
									styles.cardListItem,
									isMobile && styles.cardListItemMobile,
									{ width: `${100 / numColumns}%` },
								]}
							>
								<DoctorCardSkeleton mobile={isMobile} />
							</View>
						) : (
							renderItem({ item: item as DoctorSearchItem })
						)
					}
					contentContainerStyle={[
						styles.resultsList,
						isMobile && styles.resultsListMobile,
						isMobile && { paddingHorizontal: mobileListPadding },
					]}
					refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
					onEndReached={handleEndReached}
					onEndReachedThreshold={0.6}
					ListFooterComponent={renderFooter}
					removeClippedSubviews={true}
					maxToRenderPerBatch={6}
					initialNumToRender={6}
				/>
			)}
			{renderFilterModal()}
		</View>
	)
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#f5f7fa' },
	resultsList: { paddingBottom: 24 },
	resultsListMobile: {
		paddingTop: 20,
	},
	cardListItem: {
		padding: 4,
	},
	cardListItemMobile: {
		paddingHorizontal: 0,
		paddingVertical: 0,
	},
	emptyContainer: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
		paddingTop: 80,
	},
	emptyText: { fontWeight: '600', color: '#888' },
	emptySubtext: { color: '#aaa', textAlign: 'center', paddingHorizontal: 40 },
	footerLoader: {
		paddingVertical: 16,
		alignItems: 'center',
		justifyContent: 'center',
	},
	mobileSearchRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginHorizontal: 16,
		marginTop: 12,
		marginBottom: 8,
		gap: 8,
	},
	searchBar: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#fff',
		borderRadius: 12,
		paddingHorizontal: 12,
		height: 48,
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
	searchInputContainer: {
		flex: 1,
		justifyContent: 'center',
	},
	searchPlaceholderText: {
		fontSize: 14,
		color: '#9AA0AC',
	},
	searchQueryText: {
		fontSize: 14,
		color: '#101828',
	},
	clearButton: {
		padding: 4,
	},
	filterIconButton: {
		width: 48,
		height: 48,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#EAECF0',
		backgroundColor: '#ffffff',
		alignItems: 'center',
		justifyContent: 'center',
		padding: 0,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.05,
		shadowRadius: 4,
		elevation: 1,
	},
	filterIconButtonActive: {
		backgroundColor: '#eaf8f9',
		borderColor: '#1f5f68',
	},
	filterSheetContentWrapper: {
		width: '100%',
		alignSelf: 'center',
	},
	filterSheetScroll: {
		flexGrow: 0,
	},
	filterSheetContent: {
		paddingHorizontal: 18,
		paddingTop: 4,
		paddingBottom: 20,
		gap: 22,
	},
	filterGroup: {
		gap: 10,
	},
	filterGroupLabel: {
		fontSize: 11,
		lineHeight: 14,
		fontWeight: '800',
		color: '#64707d',
		textTransform: 'uppercase',
	},
	filterChipScroller: {
		marginHorizontal: -2,
	},
	filterChipRow: {
		flexDirection: 'row',
		flexWrap: 'nowrap',
		gap: 10,
		paddingHorizontal: 2,
		paddingVertical: 1,
	},
	filterChip: {
		minHeight: 38,
		minWidth: 74,
		borderRadius: 19,
		paddingHorizontal: 18,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#f2f6fb',
		flexShrink: 0,
	},
	filterChipActive: {
		backgroundColor: '#1f5f68',
	},
	filterChipText: {
		fontSize: 12,
		lineHeight: 16,
		fontWeight: '700',
		color: '#64707d',
	},
	filterChipTextActive: {
		color: '#ffffff',
	},
	filterSheetActions: {
		flexDirection: 'row',
		paddingHorizontal: 18,
		paddingTop: 12,
		gap: 12,
		borderTopWidth: 1,
		borderTopColor: '#EAECF0',
	},
	resetButton: {
		flex: 1,
		height: 48,
		borderRadius: 24,
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: 1,
		borderColor: '#EAECF0',
		backgroundColor: '#ffffff',
	},
	resetButtonText: {
		fontSize: 14,
		fontWeight: '700',
		color: '#64707d',
	},
	applyButton: {
		flex: 2,
		height: 48,
		borderRadius: 24,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#1f5f68',
	},
	applyButtonText: {
		fontSize: 14,
		fontWeight: '700',
		color: '#ffffff',
	},
	inlineSelectFill: {
		width: '100%',
		marginBottom: 0,
	},
	inlineFilterSelect: {
		height: 50,
		borderRadius: 8,
		backgroundColor: '#ffffff',
	},
	mobileHospitalSelectCard: {
		height: 42,
		borderRadius: 8,
	},
})
