import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
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
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useRoute, useNavigation } from '@react-navigation/native'

import DoctorSearchCard from './components/DoctorSearchCard'
import {
	AppTypography,
	AppSkeleton,
	AppSelect,
	AppSelectOption,
	AppBottomSheet,
	AppInput,
	AppScreenHeader,
} from '../../../components/common'
import { useAuth } from '../../../context/AuthContext'
import { getDoctors, getSpecialities } from '../doctorService'
import { DoctorSearchItem } from '../../../types/doctor-search'
import type { RouteProp } from '@react-navigation/native'
import type { AppStackParamList } from '../../../navigation/types'
import { ROUTES } from '../../../navigation/routes'

const PAGE_LIMIT = 5

const INK = '#12373E'
const INK_MUTED = '#5B6B6E'
const DIVIDER = '#D5E1E2'
const PAGE_BG = '#F5F8F8'
const HEADER_BG = '#2B6F71'

const RATING_OPTIONS: AppSelectOption[] = [
	{ label: 'All Ratings', value: 'all' },
	{ label: '4.5+ Stars', value: '4.5' },
	{ label: '4.0+ Stars', value: '4.0' },
	{ label: '3.5+ Stars', value: '3.5' },
]

type SortKey = 'relevance' | 'experience'
const SORT_OPTIONS: AppSelectOption[] = [
	{ label: 'Sort: Relevance', value: 'relevance' },
	{ label: 'Most experienced', value: 'experience' },
]

// ─── Doctor Card Skeleton ─────────────────────────────────────────────────
function DoctorCardSkeleton() {
	return (
		<View style={styles.skeletonCard}>
			<View style={styles.skeletonTopRow}>
				<AppSkeleton height={76} width={76} borderRadius={20} />
				<View style={{ flex: 1, gap: 6 }}>
					<AppSkeleton height={14} width="70%" />
					<AppSkeleton height={18} width={90} borderRadius={9999} />
					<AppSkeleton height={10} width="50%" />
					<AppSkeleton height={10} width="60%" />
				</View>
			</View>
			<AppSkeleton height={40} width="100%" borderRadius={12} style={{ marginTop: 14 }} />
		</View>
	)
}

// ─── Main Component ───────────────────────────────────────────────────────
export default function DoctorSearchPage() {
	const navigation = useNavigation<any>()
	const route = useRoute<RouteProp<AppStackParamList, typeof ROUTES.STACK.DOCTOR_SEARCH>>()
	const { currentLocation } = useAuth()
	const { width } = useWindowDimensions()

	const isMobile = width < 600
	const numColumns = isMobile ? 1 : width >= 900 ? 4 : 3

	// Initial route params
	const initialQuery = route.params?.query || ''
	const initialMode = route.params?.mode || 'all'
	const initialSpecialityId = route.params?.specialityId ? String(route.params.specialityId) : 'all'

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
	const [specialityName, setSpecialityName] = useState(route.params?.specialityName || '')
	const [consultationTypeFilter, setConsultationTypeFilter] = useState<string>(initialMode)
	const [minRatingFilter, setMinRatingFilter] = useState('all')
	const [sortBy, setSortBy] = useState<SortKey>('relevance')
	// "Available today" / "Female doctor" have no backing field on DoctorSearchItem
	// yet (no `is_available_today` / `gender` from the API) -- kept as inert UI
	// toggles matching the design, not wired to any real filter, so they never
	// silently drop results based on data we don't actually have.
	const [availableTodayOn, setAvailableTodayOn] = useState(false)
	const [femaleDoctorOn, setFemaleDoctorOn] = useState(false)

	const [specialities, setSpecialities] = useState<AppSelectOption[]>([
		{ label: 'All Specialities', value: 'all' },
		...(route.params?.specialityId && route.params?.specialityName
			? [{ label: route.params.specialityName, value: String(route.params.specialityId) }]
			: []),
	])
	const [specialitiesLoading, setSpecialitiesLoading] = useState(false)

	// Modal draft states
	const [draftSpecialityFilter, setDraftSpecialityFilter] = useState(initialSpecialityId)
	const [draftMinRating, setDraftMinRating] = useState('all')

	const [showFilters, setShowFilters] = useState(false)

	// Sync route.params with filter states on route param changes
	useEffect(() => {
		if (route.params?.specialityId) {
			const specId = String(route.params.specialityId)
			setSpecialityFilter(specId)
			setDraftSpecialityFilter(specId)
			if (route.params?.specialityName) setSpecialityName(route.params.specialityName)
		}
		if (route.params?.query !== undefined) {
			setSearchQuery(route.params.query)
		}
		if (route.params?.mode) {
			setConsultationTypeFilter(route.params.mode)
		}
	}, [route.params?.specialityId, route.params?.specialityName, route.params?.query, route.params?.mode])

	// Load specialities on mount or when specialityId changes
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
						const found = res.data.find(
							(s) =>
								String(s.id) === String(route.params?.specialityId) ||
								(route.params?.specialityName &&
									s.label.toLowerCase().trim() === route.params.specialityName.toLowerCase().trim())
						)
						if (found) {
							setSpecialityFilter(String(found.id))
							setDraftSpecialityFilter(String(found.id))
							setSpecialityName(found.label)
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
	}, [route.params?.specialityId, route.params?.specialityName])

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

			const res = await getDoctors(params)

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
		fetchDoctorsList(1)
	}, [searchQuery, specialityFilter, consultationTypeFilter, minRatingFilter])

	const onRefresh = useCallback(() => {
		if (isFetchingPageRef.current) return
		setRefreshing(true)
		setPage(1)
		setDoctors([])
		setHasMore(true)
		fetchDoctorsList(1, true)
	}, [searchQuery, specialityFilter, consultationTypeFilter, minRatingFilter])

	const handleEndReached = useCallback(() => {
		if (isFetchingPageRef.current || loading || refreshing || loadingMore || !hasMore) return
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
	])

	// Client-side sort over the already-fetched page -- "experience" is the
	// only sort key backed by a real field (`experience_years`); "nearest"/
	// "fee" from the design have no real distance/fee data to sort by, so
	// they're intentionally not offered here.
	const sortedDoctors = useMemo(() => {
		if (sortBy !== 'experience') return doctors
		return [...doctors].sort((a, b) => (b.experience_years || 0) - (a.experience_years || 0))
	}, [doctors, sortBy])

	// Modal handlers
	const openFilterModal = () => {
		setDraftSpecialityFilter(specialityFilter)
		setDraftMinRating(minRatingFilter)
		setShowFilters(true)
	}

	const closeFilterModal = () => {
		setShowFilters(false)
	}

	const applyFilters = () => {
		setSpecialityFilter(draftSpecialityFilter)
		const found = specialities.find((s) => s.value === draftSpecialityFilter)
		setSpecialityName(found && found.value !== 'all' ? found.label : '')
		setMinRatingFilter(draftMinRating)
		closeFilterModal()
	}

	const resetFilters = () => {
		setDraftSpecialityFilter('all')
		setDraftMinRating('all')
		setSpecialityFilter('all')
		setSpecialityName('')
		setMinRatingFilter('all')
	}

	// Render item for FlatList
	const renderItem = useCallback(
		({ item }: { item: DoctorSearchItem }) => {
			const itemWidth: DimensionValue = `${100 / numColumns}%`
			return (
				<View style={[styles.cardListItem, { width: itemWidth }]}>
					<DoctorSearchCard doctor={item} />
				</View>
			)
		},
		[isMobile, numColumns]
	)

	// Skeleton placeholder list when loading
	const listData = loading && !refreshing ? Array(6).fill({}) : sortedDoctors
	const keyExtractor = (item: any, index: number) => (item.id ? String(item.id) : `skeleton-${index}`)

	const renderFooter = () =>
		loadingMore ? (
			<View style={styles.footerLoader}>
				<ActivityIndicator size="small" color={HEADER_BG} />
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
							onSelect={(value) => setDraftSpecialityFilter(value)}
							placeholder={specialitiesLoading ? 'Loading specialities...' : 'Select Speciality'}
							size="medium"
							borderRadius={10}
							customCardStyle={styles.inlineFilterSelect}
							borderColor="#EAECF0"
							maxDropdownHeight={240}
							style={styles.inlineSelectFill}
						/>
					</View>

					<View style={styles.filterGroup}>
						<AppTypography style={styles.filterGroupLabel}>Minimum Rating</AppTypography>
						<View style={styles.filterChipRow}>
							{RATING_OPTIONS.map((option) => {
								const selected = option.value === draftMinRating
								return (
									<TouchableOpacity
										key={option.value}
										style={[styles.filterChip, selected && styles.filterChipActive]}
										onPress={() => setDraftMinRating(option.value)}
										activeOpacity={0.82}
									>
										<AppTypography
											style={[styles.filterChipText, selected && styles.filterChipTextActive]}
										>
											{option.label}
										</AppTypography>
									</TouchableOpacity>
								)
							})}
						</View>
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

	const resultLabel =
		loading && !refreshing
			? ''
			: `${sortedDoctors.length} ${sortedDoctors.length === 1 ? 'doctor' : 'doctors'} near you`

	return (
		<View style={styles.container}>
			{/* HEADER — common structure/back/styling comes from AppScreenHeader;
			    this screen only supplies its own title, colour and content. */}
			<AppScreenHeader
				title="Find a doctor"
				backgroundColor={HEADER_BG}
				onBack={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate(ROUTES.MAIN.SEARCH))}
			>
				<View style={{ gap: 8 }}>
					<AppTypography style={styles.headerSubtitle} numberOfLines={1}>
						In-clinic or video consultation{currentLocation?.address ? ` · ${currentLocation.address}` : ''}
					</AppTypography>
					<View style={styles.searchBarWrap}>
						<AppInput
							isSearch
							value={searchQuery}
							onChangeText={setSearchQuery}
							placeholder="Doctor, speciality or symptom"
							noMargin
							borderRadius={8}
							style={styles.searchBar}
							containerStyle={{ flex: 1 }}
						/>
					</View>
				</View>
			</AppScreenHeader>

			{/* INLINE FILTER / SORT BAR — wraps to a new line instead of scrolling
			    horizontally, matching the shared HTML design. */}
			<View style={styles.filterBarWrap}>
				<View style={styles.filterBarContent}>
					<TouchableOpacity style={styles.specialityChip} onPress={openFilterModal} activeOpacity={0.82}>
						<MaterialCommunityIcons name="stethoscope" size={16} color={HEADER_BG} />
						<AppTypography style={styles.specialityChipText} numberOfLines={1}>
							{specialityName || 'All specialities'}
						</AppTypography>
						<MaterialCommunityIcons name="chevron-down" size={16} color={INK} />
					</TouchableOpacity>

					<AppSelect
						options={SORT_OPTIONS}
						value={sortBy}
						onSelect={(value) => setSortBy(value as SortKey)}
						size="small"
						borderRadius={8}
						customCardStyle={styles.sortSelect}
						borderColor="#7A8B8E"
						style={styles.sortSelectWrap}
					/>

					<TouchableOpacity
						style={[styles.toggleChip, consultationTypeFilter === 'video' && styles.toggleChipActive]}
						onPress={() => setConsultationTypeFilter((prev) => (prev === 'video' ? 'all' : 'video'))}
						activeOpacity={0.82}
					>
						<AppTypography
							style={[
								styles.toggleChipText,
								consultationTypeFilter === 'video' && styles.toggleChipTextActive,
							]}
						>
							Video consult
						</AppTypography>
					</TouchableOpacity>

					<TouchableOpacity
						style={[styles.toggleChip, availableTodayOn && styles.toggleChipActive]}
						onPress={() => setAvailableTodayOn((v) => !v)}
						activeOpacity={0.82}
					>
						<AppTypography style={[styles.toggleChipText, availableTodayOn && styles.toggleChipTextActive]}>
							Available today
						</AppTypography>
					</TouchableOpacity>

					<TouchableOpacity
						style={[styles.toggleChip, femaleDoctorOn && styles.toggleChipActive]}
						onPress={() => setFemaleDoctorOn((v) => !v)}
						activeOpacity={0.82}
					>
						<AppTypography style={[styles.toggleChipText, femaleDoctorOn && styles.toggleChipTextActive]}>
							Female doctor
						</AppTypography>
					</TouchableOpacity>
				</View>
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
					ListHeaderComponent={
						resultLabel ? <AppTypography style={styles.resultLabel}>{resultLabel}</AppTypography> : null
					}
					renderItem={({ item }) =>
						loading && !refreshing && !item.id ? (
							<View style={[styles.cardListItem, { width: `${100 / numColumns}%` }]}>
								<DoctorCardSkeleton />
							</View>
						) : (
							renderItem({ item: item as DoctorSearchItem })
						)
					}
					contentContainerStyle={[styles.resultsList, isMobile && { paddingHorizontal: 0 }]}
					refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
					onEndReached={handleEndReached}
					onEndReachedThreshold={0.6}
					ListFooterComponent={renderFooter}
					removeClippedSubviews={true}
					maxToRenderPerBatch={6}
					initialNumToRender={6}
				/>
			)}
			<AppBottomSheet visible={showFilters} title="Filters" onClose={closeFilterModal}>
				{renderFilterContent()}
			</AppBottomSheet>
		</View>
	)
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: PAGE_BG },

	headerSubtitle: {
		fontSize: 12,
		lineHeight: 16,
		fontWeight: '500',
		letterSpacing: 0.24,
		color: '#E3EFEF',
	},
	searchBarWrap: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	searchBar: {
		backgroundColor: '#FFFFFF',
		height: 48,
	},

	// Inline filter/sort bar
	filterBarWrap: {
		backgroundColor: '#FFFFFF',
		borderBottomWidth: 1,
		borderBottomColor: DIVIDER,
		paddingVertical: 12,
	},
	filterBarContent: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		alignItems: 'center',
		gap: 8,
		paddingHorizontal: 16,
	},
	specialityChip: {
		flexShrink: 0,
		height: 36,
		paddingLeft: 12,
		paddingRight: 10,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: HEADER_BG,
		backgroundColor: '#E3EFEF',
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		maxWidth: 180,
	},
	specialityChipText: {
		fontSize: 13,
		fontWeight: '600',
		color: INK,
		flexShrink: 1,
	},
	sortSelectWrap: {
		flexShrink: 0,
		marginBottom: 0,
		width: 168,
	},
	sortSelect: {
		height: 36,
		borderRadius: 8,
		backgroundColor: '#FFFFFF',
	},
	toggleChip: {
		flexShrink: 0,
		height: 36,
		paddingHorizontal: 12,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#7A8B8E',
		backgroundColor: '#FFFFFF',
		alignItems: 'center',
		justifyContent: 'center',
	},
	toggleChipActive: {
		backgroundColor: '#E3EFEF',
		borderColor: HEADER_BG,
	},
	toggleChipText: {
		fontSize: 13,
		fontWeight: '600',
		color: INK,
	},
	toggleChipTextActive: {
		color: INK,
	},

	resultLabel: {
		paddingHorizontal: 16,
		paddingTop: 12,
		paddingBottom: 4,
		fontSize: 13,
		lineHeight: 18,
		fontWeight: '600',
		color: INK_MUTED,
	},
	resultsList: { paddingBottom: 24 },
	cardListItem: {
		borderBottomWidth: 1,
		borderBottomColor: '#EEF2F2',
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

	skeletonCard: {
		backgroundColor: '#FFFFFF',
		padding: 16,
	},
	skeletonTopRow: {
		flexDirection: 'row',
		gap: 12,
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
	filterChipRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 10,
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
		backgroundColor: HEADER_BG,
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
		backgroundColor: HEADER_BG,
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
})
