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
	Text,
} from 'react-native'
import { useRoute, useNavigation } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import DoctorSearchCard from './components/DoctorSearchCard'
import {
	AppButton,
	AppInfoBanner,
	AppPathIcon,
	AppScreenHeader,
	AppSkeleton,
	AppTypography,
	AppSearchBar,
	LocationSelector,
} from '../../../components/common'
import { getDoctors, getSpecialities } from '../doctorService'
import { DoctorSearchItem } from '../../../types/doctor-search'
import type { RouteProp } from '@react-navigation/native'
import type { AppStackParamList } from '../../../navigation/types'
import { ROUTES } from '../../../navigation/routes'
import { useAuth } from '../../../context/AuthContext'
import { APP_COLORS } from '../../../config/theme'
import DoctorFilterSheet from './components/DoctorFilterSheet'
import DoctorSortSheet from './components/DoctorSortSheet'
import {
	NO_FILTERS,
	activeFilterCount,
	sortDoctors,
	toSearchParams,
	SORT_OPTIONS,
	type ConsultMode,
	type DoctorFilters,
	type SortKey,
} from './doctorFilters'

const PAGE_LIMIT = 5
const SEARCH_DEBOUNCE_MS = 300

// Icons of the toolbar (the design's 24x24 paths)
const FILTER_ICON = 'M4 6h16M7 12h10M10 18h4'
const SORT_ICON = 'M7 4v16M3 16l4 4 4-4M17 20V4M13 8l4-4 4 4'
const CHEVRON_DOWN_ICON = 'M6 9l6 6 6-6'

/** A route's consult-type hint ('all' | 'video' | 'clinic') as a filter. */
const modeFromRoute = (mode?: string): ConsultMode => (mode === 'video' || mode === 'clinic' ? mode : 'any')

// ─── Toolbar chip ─────────────────────────────────────────────────────────
// 36 high, radius 8, 1.5px border; on = mint fill + primary border and text.
type ToolbarChipProps = {
	label: string
	on?: boolean
	onPress: () => void
	leading?: React.ReactNode
	trailing?: React.ReactNode
	accessibilityLabel?: string
	pressed?: boolean
}
function ToolbarChip({ label, on = false, onPress, leading, trailing, accessibilityLabel, pressed }: ToolbarChipProps) {
	return (
		<TouchableOpacity
			onPress={onPress}
			activeOpacity={0.85}
			accessibilityRole="button"
			accessibilityLabel={accessibilityLabel ?? label}
			accessibilityState={pressed === undefined ? undefined : { selected: pressed }}
			style={[styles.chip, on && styles.chipOn]}
		>
			{leading}
			<Text style={[styles.chipText, on && styles.chipTextOn]} numberOfLines={1}>
				{label}
			</Text>
			{trailing}
		</TouchableOpacity>
	)
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
	// Sent so the server measures distances from the patient; without a usable location it falls back to its default.
	const latitude = Number.isFinite(currentLocation?.latitude) ? currentLocation?.latitude : undefined
	const longitude = Number.isFinite(currentLocation?.longitude) ? currentLocation?.longitude : undefined
	const hasLocation = latitude !== undefined && longitude !== undefined
	const { width } = useWindowDimensions()
	const insets = useSafeAreaInsets()

	const isMobile = width < 600
	const numColumns = isMobile ? 1 : width >= 900 ? 4 : 3

	// Initial route params
	const initialQuery = route.params?.query || ''
	const initialMode = route.params?.mode || 'all'
	const initialSpecialityId = route.params?.specialityId ? String(route.params.specialityId) : 'all'
	// Opened from Care AI: its filters (speciality text, mode, sort) are pre-applied and a banner leads back.
	const fromAi = route.params?.fromAi === true

	const [searchInput, setSearchInput] = useState(initialQuery)
	const [searchQuery, setSearchQuery] = useState(initialQuery)
	const [doctors, setDoctors] = useState<DoctorSearchItem[]>([])
	const [loading, setLoading] = useState(true)
	const [refreshing, setRefreshing] = useState(false)
	const [page, setPage] = useState(1)
	const [loadingMore, setLoadingMore] = useState(false)
	const [hasMore, setHasMore] = useState(true)
	const isFetchingPageRef = useRef(false)

	// Filters and sort (see doctorFilters.ts). The speciality comes from the screen the user arrived from.
	const [specialityFilter, setSpecialityFilter] = useState(initialSpecialityId)
	const [specialityName, setSpecialityName] = useState(route.params?.specialityName || '')
	const [filters, setFilters] = useState<DoctorFilters>({ ...NO_FILTERS, mode: modeFromRoute(initialMode) })
	// Until the patient (or the route) picks a sort, the list opens nearest first when there is a location. The location
	// can arrive after the first render, so the default is worked out each time instead of stored.
	const [sortChoice, setSortChoice] = useState<SortKey | null>(route.params?.sort ?? null)
	const sortBy: SortKey = sortChoice ?? (hasLocation ? 'near' : 'rel')
	const [showSort, setShowSort] = useState(false)
	const [showFilters, setShowFilters] = useState(false)
	// "Nearest first" is ordered by the server, before paging, so it holds across every page; it needs the location.
	const nearestFirst = sortBy === 'near' && hasLocation
	const filterCount = activeFilterCount(filters)
	// One value to watch in effects instead of the whole object
	const filtersKey = JSON.stringify(filters)

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
			if (route.params?.specialityName) setSpecialityName(route.params.specialityName)
		}
		if (route.params?.query !== undefined) {
			setSearchInput(route.params.query)
			setSearchQuery(route.params.query)
		}
		if (route.params?.mode) {
			setFilters((f) => ({ ...f, mode: modeFromRoute(route.params?.mode) }))
		}
	}, [route.params?.specialityId, route.params?.specialityName, route.params?.query, route.params?.mode])

	// The title names the speciality: resolve it from the list when the route only carried an id.
	useEffect(() => {
		if (!route.params?.specialityId || route.params?.specialityName) return
		let active = true
		const loadSpecialityName = async () => {
			try {
				const res = await getSpecialities()
				const found = res.success && res.data?.find((s) => String(s.id) === String(route.params?.specialityId))
				if (active && found) setSpecialityName(found.label)
			} catch (error) {
				console.error('Error fetching specialities:', error)
			}
		}
		void loadSpecialityName()
		return () => {
			active = false
		}
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

			Object.assign(params, toSearchParams(filters))

			if (hasLocation) {
				params.latitude = latitude
				params.longitude = longitude
				if (nearestFirst) params.sort = 'nearest'
			}

			const res = await getDoctors(params)

			if (res.success && res.data) {
				const newData = res.data
				setDoctors((prev) => (targetPage === 1 ? newData : [...prev, ...newData]))
				setPage(targetPage)
				setHasMore(newData.length >= PAGE_LIMIT)
			} else {
				if (targetPage === 1) {
					setDoctors([])
				}
				setHasMore(false)
			}
		} catch (error) {
			console.error('Error fetching doctors:', error)
			if (targetPage === 1) {
				setDoctors([])
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
	}, [searchQuery, specialityFilter, filtersKey, latitude, longitude, nearestFirst])

	const onRefresh = useCallback(() => {
		if (isFetchingPageRef.current) return
		setRefreshing(true)
		setPage(1)
		setDoctors([])
		setHasMore(true)
		fetchDoctorsList(1, true)
	}, [searchQuery, specialityFilter, filtersKey, latitude, longitude, nearestFirst])

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
		filtersKey,
		latitude,
		longitude,
		nearestFirst,
	])

	// The filters narrow the list on the server; the order is applied here, to the doctors loaded so far.
	const sortedDoctors = useMemo(() => sortDoctors(doctors, sortBy, filters.mode), [doctors, sortBy, filters.mode])

	// Empty-state "Clear filters" (design: resets the search text and every filter; keeps the sort and the speciality).
	const clearAll = () => {
		setFilters(NO_FILTERS)
		setSearchInput('')
		setSearchQuery('')
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

	// Design: the label does not repeat the count; the speciality names the screen.
	const resultLabel =
		isInitialLoading || sortedDoctors.length === 0 ? '' : hasLocation ? 'Doctors near you' : 'Doctors'
	const pageTitle = specialityName ? `${specialityName} doctors` : 'Find a doctor'
	const sortLabel = SORT_OPTIONS.find((o) => o.value === sortBy)?.label ?? 'Relevance'

	const handleBack = () => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate(ROUTES.MAIN.SEARCH))

	return (
		<View style={styles.container}>
			{/* HEADER */}
			<AppScreenHeader
				variant="bar"
				solid
				titleNode={
					<View>
						<AppTypography style={styles.headerTitle} numberOfLines={1} accessibilityRole="header">
							{pageTitle}
						</AppTypography>
						<View style={styles.headerLocation}>
							<LocationSelector
								color={APP_COLORS.mint}
								iconSize={14}
								textStyle={styles.headerLocationText}
							/>
						</View>
					</View>
				}
				onBack={handleBack}
				backAccessibilityLabel="Back to specialities"
				style={styles.header}
			>
				<AppSearchBar
					context={specialityFilter === 'all' ? 'doctors' : undefined}
					placeholder={specialityFilter === 'all' ? undefined : 'Search by doctor name'}
					hints={specialityFilter === 'all' ? undefined : ['doctor name', 'clinic', 'hospital']}
					tone="onDark"
					value={searchInput}
					onChangeText={setSearchInput}
					onSubmit={() => setSearchQuery(searchInput)}
					style={styles.searchBar}
				/>
			</AppScreenHeader>

			{/* FILTER / SORT BAR: Filters (with a count), Sort, then one-tap toggles that mirror the sheet. */}
			<View style={styles.filterBarWrap}>
				<ScrollView
					horizontal
					showsHorizontalScrollIndicator={false}
					contentContainerStyle={styles.filterBarContent}
					keyboardShouldPersistTaps="handled"
					accessibilityRole="toolbar"
				>
					<ToolbarChip
						label="Filters"
						on={filterCount > 0}
						onPress={() => setShowFilters(true)}
						accessibilityLabel={filterCount ? `Filters, ${filterCount} selected` : 'Filters'}
						leading={
							<AppPathIcon
								d={FILTER_ICON}
								size={16}
								strokeWidth={2.2}
								color={filterCount > 0 ? APP_COLORS.primary : APP_COLORS.ink}
							/>
						}
						trailing={
							filterCount > 0 ? (
								<View style={styles.countBadge}>
									<Text style={styles.countBadgeText}>{filterCount}</Text>
								</View>
							) : undefined
						}
					/>
					<ToolbarChip
						label={sortLabel}
						on={sortBy !== 'rel'}
						onPress={() => setShowSort(true)}
						accessibilityLabel={`Sort doctors, ${sortLabel}`}
						leading={
							<AppPathIcon
								d={SORT_ICON}
								size={16}
								strokeWidth={2.2}
								color={sortBy !== 'rel' ? APP_COLORS.primary : APP_COLORS.ink}
							/>
						}
						trailing={
							<AppPathIcon d={CHEVRON_DOWN_ICON} size={14} strokeWidth={2.4} color={APP_COLORS.ink} />
						}
					/>
					<View style={styles.chipDivider} />
					<ToolbarChip
						label="Available today"
						on={filters.avail === 'today'}
						pressed={filters.avail === 'today'}
						onPress={() => setFilters((f) => ({ ...f, avail: f.avail === 'today' ? 'any' : 'today' }))}
					/>
					<ToolbarChip
						label="Video consult"
						on={filters.mode === 'video'}
						pressed={filters.mode === 'video'}
						onPress={() => setFilters((f) => ({ ...f, mode: f.mode === 'video' ? 'any' : 'video' }))}
					/>
				</ScrollView>
			</View>

			<FlatList
				key={isMobile ? 'mobile-list' : `grid-${numColumns}`}
				style={styles.list}
				data={listData}
				keyExtractor={keyExtractor}
				numColumns={numColumns}
				columnWrapperStyle={numColumns > 1 ? { paddingHorizontal: 12, gap: 8 } : undefined}
				ListHeaderComponent={
					<>
						{fromAi ? (
							<AppInfoBanner
								icon="creation"
								title="Filters set by Care AI."
								subtitle="Change them anytime."
								action={{ label: 'Back to chat', filled: false, onPress: handleBack }}
								style={styles.aiBanner}
							/>
						) : null}
						<AppTypography style={styles.resultLabel}>{resultLabel}</AppTypography>
					</>
				}
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

			<DoctorFilterSheet
				visible={showFilters}
				filters={filters}
				onChange={setFilters}
				onClearAll={() => setFilters(NO_FILTERS)}
				onClose={() => setShowFilters(false)}
			/>

			<DoctorSortSheet
				visible={showSort}
				value={sortBy}
				onSelect={(value) => {
					setSortChoice(value)
					setShowSort(false)
				}}
				onClose={() => setShowSort(false)}
			/>
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
		color: APP_COLORS.surface,
	},
	headerLocation: {
		marginTop: -2,
		alignItems: 'flex-start',
	},
	headerLocationText: {
		fontSize: 12,
		fontWeight: '500',
	},
	searchBar: {
		marginTop: 4,
	},

	// Filter/sort bar
	filterBarWrap: {
		backgroundColor: APP_COLORS.surface,
		borderBottomWidth: 1,
		borderBottomColor: APP_COLORS.divider,
	},
	filterBarContent: {
		alignItems: 'center',
		gap: 8,
		paddingHorizontal: 16,
		paddingVertical: 12,
	},
	// design: 36 high, radius 8, 1.5px border, 13/700; on = #F0F7F7 fill with a primary border and text
	chip: {
		height: 36,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		paddingHorizontal: 12,
		borderRadius: 8,
		borderWidth: 1.5,
		borderColor: APP_COLORS.divider,
		backgroundColor: APP_COLORS.surface,
	},
	chipOn: {
		borderColor: APP_COLORS.primary,
		backgroundColor: '#F0F7F7',
	},
	chipText: {
		fontSize: 13,
		lineHeight: 18,
		fontWeight: '700',
		color: APP_COLORS.ink,
	},
	chipTextOn: {
		color: APP_COLORS.primary,
	},
	chipDivider: {
		width: 1,
		height: 22,
		backgroundColor: APP_COLORS.divider,
	},
	countBadge: {
		minWidth: 18,
		height: 18,
		paddingHorizontal: 5,
		borderRadius: 9,
		backgroundColor: APP_COLORS.primary,
		alignItems: 'center',
		justifyContent: 'center',
	},
	countBadgeText: {
		fontSize: 11,
		fontWeight: '800',
		color: '#FFFFFF',
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
	aiBanner: { marginHorizontal: 16, marginTop: 12 },
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
})
