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
	TextInput,
} from 'react-native'
import { useRoute, useNavigation } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import DoctorSearchCard from './components/DoctorSearchCard'
import {
	AppBottomSheet,
	AppButton,
	AppChip,
	AppRadio,
	AppScreenHeader,
	AppSelect,
	AppSelectOption,
	AppSkeleton,
	AppTypography,
	AppIcon,
} from '../../../components/common'
import { useAuth } from '../../../context/AuthContext'
import { getDoctors, getSpecialities } from '../doctorService'
import { DoctorSearchItem } from '../../../types/doctor-search'
import type { RouteProp } from '@react-navigation/native'
import type { AppStackParamList } from '../../../navigation/types'
import { ROUTES } from '../../../navigation/routes'
import { APP_COLORS } from '../../../config/theme'

const PAGE_LIMIT = 5
const SEARCH_DEBOUNCE_MS = 300

const RATING_OPTIONS: AppSelectOption[] = [
	{ label: 'All Ratings', value: 'all' },
	{ label: '4.5+ Stars', value: '4.5' },
	{ label: '4.0+ Stars', value: '4.0' },
	{ label: '3.5+ Stars', value: '3.5' },
]

// The search API has no sort param, so every option is a client-side sort over
// the pages loaded so far, using real fields only (distance, offline fee, experience).
type SortKey = 'rel' | 'near' | 'fee' | 'exp'
const SORT_OPTIONS: { value: SortKey; label: string }[] = [
	{ value: 'rel', label: 'Sort: Relevance' },
	{ value: 'near', label: 'Nearest first' },
	{ value: 'fee', label: 'Fee: low to high' },
	{ value: 'exp', label: 'Most experienced' },
]

/** Ascending numeric compare that keeps missing values at the end. */
function compareNullableAsc(a: number | null | undefined, b: number | null | undefined) {
	const aMissing = a == null
	const bMissing = b == null
	if (aMissing || bMissing) return aMissing === bMissing ? 0 : aMissing ? 1 : -1
	return a - b
}

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
	const insets = useSafeAreaInsets()

	const isMobile = width < 600
	const numColumns = isMobile ? 1 : width >= 900 ? 4 : 3

	// Initial route params
	const initialQuery = route.params?.query || ''
	const initialMode = route.params?.mode || 'all'
	const initialSpecialityId = route.params?.specialityId ? String(route.params.specialityId) : 'all'

	const [searchInput, setSearchInput] = useState(initialQuery)
	const [searchQuery, setSearchQuery] = useState(initialQuery)
	const [doctors, setDoctors] = useState<DoctorSearchItem[]>([])
	const [total, setTotal] = useState<number | null>(null)
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
	const [sortBy, setSortBy] = useState<SortKey>('rel')
	const [showSort, setShowSort] = useState(false)
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

	// Debounce typing so every keystroke doesn't fire a search request.
	useEffect(() => {
		if (searchInput === searchQuery) return
		const t = setTimeout(() => setSearchQuery(searchInput), SEARCH_DEBOUNCE_MS)
		return () => clearTimeout(t)
	}, [searchInput, searchQuery])

	// Sync route.params with filter states on route param changes
	useEffect(() => {
		if (route.params?.specialityId) {
			const specId = String(route.params.specialityId)
			setSpecialityFilter(specId)
			setDraftSpecialityFilter(specId)
			if (route.params?.specialityName) setSpecialityName(route.params.specialityName)
		}
		if (route.params?.query !== undefined) {
			setSearchInput(route.params.query)
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
				setTotal(typeof res.total === 'number' ? res.total : null)
				setPage(targetPage)
				setHasMore(newData.length >= PAGE_LIMIT)
			} else {
				if (targetPage === 1) {
					setDoctors([])
					setTotal(0)
				}
				setHasMore(false)
			}
		} catch (error) {
			console.error('Error fetching doctors:', error)
			if (targetPage === 1) {
				setDoctors([])
				setTotal(0)
			}
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

	// Client-side sort over the already-fetched pages (the API has no sort param).
	const sortedDoctors = useMemo(() => {
		if (sortBy === 'near') return [...doctors].sort((a, b) => compareNullableAsc(a.distance, b.distance))
		if (sortBy === 'fee')
			return [...doctors].sort((a, b) =>
				compareNullableAsc(a.hospital?.offline_consultation_fee, b.hospital?.offline_consultation_fee)
			)
		if (sortBy === 'exp') return [...doctors].sort((a, b) => (b.experience_years || 0) - (a.experience_years || 0))
		return doctors
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

	// Empty-state "Clear filters" (design: resets speciality, query and every toggle; keeps sort).
	const clearAll = () => {
		resetFilters()
		setSearchInput('')
		setSearchQuery('')
		setConsultationTypeFilter('all')
		setAvailableTodayOn(false)
		setFemaleDoctorOn(false)
	}

	// Render item for FlatList
	const renderItem = useCallback(
		({ item }: { item: DoctorSearchItem }) => {
			const itemWidth: DimensionValue = `${100 / numColumns}%`
			return (
				<View style={{ width: itemWidth }}>
					<DoctorSearchCard doctor={item} />
				</View>
			)
		},
		[isMobile, numColumns]
	)

	// Skeleton placeholder list when loading
	const isInitialLoading = loading && !refreshing
	const listData = isInitialLoading ? Array(6).fill({}) : sortedDoctors
	const keyExtractor = (item: any, index: number) => (item.id ? String(item.id) : `skeleton-${index}`)

	const renderFooter = () =>
		loadingMore ? (
			<View style={styles.footerLoader}>
				<ActivityIndicator size="small" color={APP_COLORS.primary} />
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
							borderColor={APP_COLORS.divider}
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
									<AppChip
										key={option.value}
										label={option.label}
										selected={selected}
										onPress={() => setDraftMinRating(option.value)}
										style={[styles.filterChip, selected && styles.filterChipActive]}
										textStyle={[styles.filterChipText, selected && styles.filterChipTextActive]}
									/>
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

	const resultCount = total ?? sortedDoctors.length
	const resultLabel = isInitialLoading ? '' : `${resultCount} ${resultCount === 1 ? 'doctor' : 'doctors'} near you`
	const sortLabel = SORT_OPTIONS.find((o) => o.value === sortBy)?.label ?? 'Sort: Relevance'

	const handleBack = () => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate(ROUTES.MAIN.SEARCH))

	return (
		<View style={styles.container}>
			{/* HEADER */}
			<AppScreenHeader
				variant="bar"
				title="Find a doctor"
				subtitle={`In-clinic or video consultation${currentLocation?.address ? ` · ${currentLocation.address}` : ''}`}
				titleStyle={styles.headerTitle}
				onBack={handleBack}
				backAccessibilityLabel="Back to specialities"
				style={styles.header}
			>
				<View style={styles.searchBox}>
					<AppIcon name="search" size={20} color={APP_COLORS.inkMuted} />
					<TextInput
						value={searchInput}
						onChangeText={setSearchInput}
						onSubmitEditing={() => setSearchQuery(searchInput)}
						placeholder="Doctor, speciality or symptom"
						placeholderTextColor={APP_COLORS.inkMuted}
						style={styles.searchInput}
						returnKeyType="search"
						autoCorrect={false}
						clearButtonMode="while-editing"
						accessibilityLabel="Search doctors"
					/>
				</View>
			</AppScreenHeader>

			{/* FILTER / SORT BAR — wraps onto a second line like the design. */}
			<View style={styles.filterBarWrap}>
				<View style={styles.filterBarContent}>
					<AppChip
						label={specialityName || 'All specialities'}
						selected
						onPress={openFilterModal}
						variant="soft"
						shape="rounded"
						size="sm"
						leading={<AppIcon name="steth" size={16} color={APP_COLORS.primary} />}
						trailing={<AppIcon name="chevronRight" size={16} color={APP_COLORS.ink} strokeWidth={2.2} />}
						style={styles.specialityChip}
						textStyle={styles.specialityChipText}
					/>

					<AppChip
						label={sortLabel}
						onPress={() => setShowSort(true)}
						shape="rounded"
						size="sm"
						trailing={<AppIcon name="chevronDown" size={16} color={APP_COLORS.ink} strokeWidth={2.2} />}
						accessibilityLabel={`Sort doctors, ${sortLabel}`}
						style={styles.sortPill}
					/>

					<AppChip
						label="Available today"
						selected={availableTodayOn}
						onPress={() => setAvailableTodayOn((v) => !v)}
						variant="soft"
						shape="rounded"
						size="sm"
						checkmark
					/>
					<AppChip
						label="Video consult"
						selected={consultationTypeFilter === 'video'}
						onPress={() => setConsultationTypeFilter((prev) => (prev === 'video' ? 'all' : 'video'))}
						variant="soft"
						shape="rounded"
						size="sm"
						checkmark
					/>
					<AppChip
						label="Female doctor"
						selected={femaleDoctorOn}
						onPress={() => setFemaleDoctorOn((v) => !v)}
						variant="soft"
						shape="rounded"
						size="sm"
						checkmark
					/>
				</View>
			</View>

			<FlatList
				key={isMobile ? 'mobile-list' : `grid-${numColumns}`}
				style={styles.list}
				data={listData}
				keyExtractor={keyExtractor}
				numColumns={numColumns}
				columnWrapperStyle={numColumns > 1 ? { paddingHorizontal: 12, gap: 8 } : undefined}
				ListHeaderComponent={<AppTypography style={styles.resultLabel}>{resultLabel}</AppTypography>}
				ItemSeparatorComponent={() => <View style={styles.separator} />}
				renderItem={({ item }) =>
					isInitialLoading && !item.id ? (
						<View style={{ width: `${100 / numColumns}%` }}>
							<DoctorCardSkeleton />
						</View>
					) : (
						renderItem({ item: item as DoctorSearchItem })
					)
				}
				ListEmptyComponent={
					isInitialLoading ? null : (
						<View style={styles.emptyContainer}>
							<AppTypography style={styles.emptyTitle}>No doctors match</AppTypography>
							<AppTypography style={styles.emptySubtext}>
								Try another search or remove a filter.
							</AppTypography>
							<AppButton
								size="md"
								variant="outline"
								onPress={clearAll}
								style={styles.clearButton}
								labelStyle={styles.clearButtonLabel}
							>
								Clear filters
							</AppButton>
						</View>
					)
				}
				contentContainerStyle={[styles.resultsList, { paddingBottom: 8 + insets.bottom }]}
				keyboardShouldPersistTaps="handled"
				refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
				onEndReached={handleEndReached}
				onEndReachedThreshold={0.6}
				ListFooterComponent={renderFooter}
				removeClippedSubviews={true}
				maxToRenderPerBatch={6}
				initialNumToRender={6}
			/>

			<AppBottomSheet visible={showFilters} title="Filters" onClose={closeFilterModal}>
				{renderFilterContent()}
			</AppBottomSheet>

			<AppBottomSheet visible={showSort} title="Sort by" onClose={() => setShowSort(false)} appearance="modern">
				<View style={styles.sortSheetList}>
					{SORT_OPTIONS.map((option) => {
						const selected = option.value === sortBy
						return (
							<TouchableOpacity
								key={option.value}
								style={styles.sortRow}
								onPress={() => {
									setSortBy(option.value)
									setShowSort(false)
								}}
								activeOpacity={0.82}
								accessibilityRole="radio"
								accessibilityState={{ selected }}
							>
								<AppTypography style={[styles.sortRowText, selected && styles.sortRowTextActive]}>
									{option.value === 'rel' ? 'Relevance' : option.label}
								</AppTypography>
								<AppRadio checked={selected} />
							</TouchableOpacity>
						)
					})}
				</View>
			</AppBottomSheet>
		</View>
	)
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: APP_COLORS.pageBg },

	// Header (design: #2B6F71, padding 4 16 16, gap 8). The 'bar' header is a 64px row + 12px children
	// padding, so +4 bottom and +4 above the search box restore the design's 56px row / 8 gap / 16 bottom.
	header: {
		paddingBottom: 4,
	},
	// 'bar' drops the title to 16/20 700 when a subtitle is shown; this screen keeps 18/26 600.
	headerTitle: {
		fontSize: 18,
		lineHeight: 26,
		fontWeight: '600',
	},
	searchBox: {
		marginTop: 4,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		height: 48,
		paddingHorizontal: 12,
		backgroundColor: APP_COLORS.surface,
		borderRadius: 8,
	},
	searchInput: {
		flex: 1,
		minWidth: 0,
		height: 44,
		paddingVertical: 0,
		fontSize: 16,
		color: APP_COLORS.ink,
	},

	// Filter/sort bar
	filterBarWrap: {
		backgroundColor: APP_COLORS.surface,
		borderBottomWidth: 1,
		borderBottomColor: APP_COLORS.divider,
		paddingVertical: 12,
	},
	filterBarContent: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		alignItems: 'center',
		gap: 8,
		paddingHorizontal: 16,
	},
	// Speciality entry chip: AppChip soft/selected (mint + primary border) with the design's 4px gap,
	// 10px right padding and 200px cap (the label truncates)
	specialityChip: {
		paddingRight: 10,
		gap: 4,
		maxWidth: 200,
	},
	specialityChipText: {
		flexShrink: 1,
	},
	// Sort pill: 12 + label + 4 + 16px chevron + 10 = the design's 30px right padding around the chevron
	sortPill: {
		paddingRight: 10,
		gap: 4,
	},

	// Results
	list: { flex: 1, backgroundColor: APP_COLORS.pageBg },
	resultLabel: {
		paddingHorizontal: 16,
		paddingTop: 12,
		paddingBottom: 8,
		fontSize: 13,
		lineHeight: 18,
		fontWeight: '600',
		color: APP_COLORS.inkMuted,
	},
	resultsList: { flexGrow: 1 },
	separator: { height: 8 },
	emptyContainer: {
		paddingVertical: 40,
		paddingHorizontal: 24,
		alignItems: 'center',
		gap: 8,
	},
	emptyTitle: {
		fontSize: 18,
		lineHeight: 26,
		fontWeight: '600',
		color: APP_COLORS.ink,
		textAlign: 'center',
	},
	emptySubtext: {
		fontSize: 14,
		lineHeight: 20,
		color: APP_COLORS.inkMuted,
		textAlign: 'center',
	},
	// AppButton md outline is r12 / 1.5px border / 700; the empty-state design is r8 / 1px / 600.
	clearButton: {
		marginTop: 4,
		borderWidth: 1,
		borderRadius: 8,
		backgroundColor: APP_COLORS.surface,
	},
	clearButtonLabel: {
		fontWeight: '600',
		marginHorizontal: 16,
	},
	footerLoader: {
		paddingVertical: 16,
		alignItems: 'center',
		justifyContent: 'center',
	},

	skeletonCard: {
		backgroundColor: APP_COLORS.surface,
		padding: 16,
	},
	skeletonTopRow: {
		flexDirection: 'row',
		gap: 12,
	},

	// Sort sheet
	sortSheetList: {
		paddingHorizontal: 18,
		paddingBottom: 12,
	},
	sortRow: {
		minHeight: 52,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		borderBottomWidth: 1,
		borderBottomColor: APP_COLORS.divider,
	},
	sortRowText: {
		fontSize: 15,
		lineHeight: 22,
		fontWeight: '500',
		color: APP_COLORS.ink,
	},
	sortRowTextActive: {
		fontWeight: '700',
	},

	// Filter sheet
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
		color: APP_COLORS.inkMuted,
		textTransform: 'uppercase',
	},
	filterChipRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 10,
	},
	// Rating chips: AppChip (solid pill) restyled to the sheet's borderless 38px grey chips.
	filterChip: {
		height: 38,
		minWidth: 74,
		borderWidth: 0,
		paddingHorizontal: 18,
		backgroundColor: APP_COLORS.pageBg,
		flexShrink: 0,
	},
	filterChipActive: {
		backgroundColor: APP_COLORS.primary,
	},
	filterChipText: {
		fontSize: 12,
		lineHeight: 16,
		fontWeight: '700',
		color: APP_COLORS.inkMuted,
	},
	filterChipTextActive: {
		color: APP_COLORS.surface,
	},
	filterSheetActions: {
		flexDirection: 'row',
		paddingHorizontal: 18,
		paddingTop: 12,
		gap: 12,
		borderTopWidth: 1,
		borderTopColor: APP_COLORS.divider,
	},
	resetButton: {
		flex: 1,
		height: 48,
		borderRadius: 24,
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: 1,
		borderColor: APP_COLORS.divider,
		backgroundColor: APP_COLORS.surface,
	},
	resetButtonText: {
		fontSize: 14,
		fontWeight: '700',
		color: APP_COLORS.inkMuted,
	},
	applyButton: {
		flex: 2,
		height: 48,
		borderRadius: 24,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: APP_COLORS.primary,
	},
	applyButtonText: {
		fontSize: 14,
		fontWeight: '700',
		color: APP_COLORS.surface,
	},
	inlineSelectFill: {
		width: '100%',
		marginBottom: 0,
	},
	inlineFilterSelect: {
		height: 50,
		borderRadius: 8,
		backgroundColor: APP_COLORS.surface,
	},
})
