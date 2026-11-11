// RadiologySearchPage.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
	ActivityIndicator,
	Animated,
	FlatList,
	Modal,
	Platform,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
	useWindowDimensions,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation, NavigationProp, ParamListBase } from '@react-navigation/native'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { BlurView } from 'expo-blur'
import Toast from 'react-native-toast-message'

import RadiologyCard from './components/RadiologyCard'
import RadiologyFilter from './components/RadiologyFilter'
import { RadiologyItem, RadiologyFilters, DEFAULT_RADIOLOGY_FILTERS } from './radiology'
import { fetchRadiologyCatalog, applyRadiologyFilters, clearRadiologyCache } from './radiologyService'
import { AppBottomSheet, AppSelect, AppSelectOption, AppSkeleton, AppTypography } from '../../components/common'
import { ROUTES } from '../../navigation/routes'
import AppSearchBar from '../../components/common/inputs/AppSearchBar'

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const PAGE_SIZE = 10

// ─────────────────────────────────────────────
// Skeleton Loader
// ─────────────────────────────────────────────

const RadiologyCardSkeleton = ({ layout = 'vertical' }: { layout?: 'vertical' | 'horizontal' }) => (
	<View style={[styles.skeletonCard, layout === 'horizontal' && styles.skeletonCardHorizontal]}>
		<AppSkeleton
			width="100%"
			height={layout === 'vertical' ? 160 : 80}
			borderRadius={12}
			style={{ marginBottom: 12 }}
		/>
		<AppSkeleton width="70%" height={16} borderRadius={6} style={{ marginBottom: 8 }} />
		<AppSkeleton width="50%" height={14} borderRadius={6} style={{ marginBottom: 8 }} />
		<View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
			<AppSkeleton width={60} height={24} borderRadius={12} />
			<AppSkeleton width={80} height={32} borderRadius={8} />
		</View>
	</View>
)

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────

export default function RadiologySearchPage() {
	const navigation = useNavigation<NavigationProp<ParamListBase>>()
	const insets = useSafeAreaInsets()
	const { width, height } = useWindowDimensions()

	// Responsive layout
	const isMobile = width < 600
	const isLandscape = width > height
	const numColumns = isMobile ? (isLandscape ? 3 : 1) : width >= 900 ? 4 : 3

	const HORIZONTAL_PADDING = 12
	const GAP = 12
	const itemWidth = (width - HORIZONTAL_PADDING * 2 - GAP * (numColumns - 1)) / numColumns

	// ── State ─────────────────────────────────────────────────────────────────
	const [searchQuery, setSearchQuery] = useState('')
	const [debouncedSearch, setDebouncedSearch] = useState('')
	const [page, setPage] = useState(1)
	const [filters, setFilters] = useState<RadiologyFilters>(DEFAULT_RADIOLOGY_FILTERS)
	const [scans, setScans] = useState<RadiologyItem[]>([])
	const [totalRows, setTotalRows] = useState(0)
	const [loading, setLoading] = useState(true)
	const [loadingMore, setLoadingMore] = useState(false)
	const [hasMore, setHasMore] = useState(true)
	const [refreshing, setRefreshing] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [filterModalVisible, setFilterModalVisible] = useState(false)
	const requestInFlightRef = useRef(false)

	// ── Filter Sheet Animation ─────────────────────────────────────────────────
	const filterSheetAnim = useRef(new Animated.Value(0)).current
	const filterBackdropAnim = useRef(new Animated.Value(0)).current

	// ── Debounce Search ────────────────────────────────────────────────────────
	useEffect(() => {
		const t = setTimeout(() => setDebouncedSearch(searchQuery), 300)
		return () => clearTimeout(t)
	}, [searchQuery])

	// ── Fetch radiology centers (server-side pagination + infinite scroll) ─────
	const fetchScans = useCallback(
		async (mode: 'initial' | 'refresh' | 'loadMore', targetPage = 1) => {
			if (requestInFlightRef.current) return
			requestInFlightRef.current = true

			if (mode === 'loadMore') setLoadingMore(true)
			else setLoading(true)
			setError(null)

			try {
				const result = await fetchRadiologyCatalog({
					search: debouncedSearch || undefined,
					city: filters.city || undefined,
					scan_type_id: filters.scanType,
					pricing_model: filters.pricingModel,
					available_only: filters.availableOnly,
					page: targetPage,
					limit: PAGE_SIZE,
				})

				setScans((prev) => {
					if (mode !== 'loadMore') {
						setHasMore(result.data.length === PAGE_SIZE && result.data.length < result.total)
						return result.data
					}
					const existingIds = new Set(prev.map((s) => s.id))
					const merged = [...prev, ...result.data.filter((s) => !existingIds.has(s.id))]
					setHasMore(result.data.length === PAGE_SIZE && merged.length < result.total)
					return merged
				})

				setTotalRows(result.total)
				setPage(targetPage)
			} catch (err: any) {
				setError(err?.message || 'Failed to load radiology scans')
				Toast.show({
					type: 'error',
					text1: 'Error',
					text2: 'Failed to load radiology scans',
				})
			} finally {
				if (mode === 'loadMore') setLoadingMore(false)
				else {
					setLoading(false)
					setRefreshing(false)
				}
				requestInFlightRef.current = false
			}
		},
		[debouncedSearch, filters]
	)

	// Initial load
	useEffect(() => {
		void fetchScans('initial', 1)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	// Re-fetch from page 1 whenever search or filters change
	useEffect(() => {
		void fetchScans('initial', 1)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [debouncedSearch, filters])

	const handleLoadMore = useCallback(() => {
		if (loading || loadingMore || refreshing || !hasMore) return
		void fetchScans('loadMore', page + 1)
	}, [loading, loadingMore, refreshing, hasMore, page, fetchScans])

	const handleRefresh = useCallback(() => {
		setRefreshing(true)
		clearRadiologyCache()
		void fetchScans('refresh', 1)
	}, [fetchScans])

	// ── Client-side filter (applied over loaded pages) ─────────────────────────
	const filteredScans = useMemo(() => {
		const result = applyRadiologyFilters(scans, {
			...filters,
			search: debouncedSearch,
		})
		return Array.isArray(result) ? result : []
	}, [scans, filters, debouncedSearch])

	const total = totalRows

	// ── Filter helpers ─────────────────────────────────────────────────────────
	const hasActiveFilters =
		!!filters.city ||
		filters.pricingModel !== 'all' ||
		!!filters.availableOnly ||
		!!filters.scanType ||
		!!searchQuery

	const clearAllFilters = () => {
		setFilters(DEFAULT_RADIOLOGY_FILTERS)
		setSearchQuery('')
		setDebouncedSearch('')
	}

	const handleFilterChange = (newFilters: RadiologyFilters) => {
		setFilters(newFilters)
	}

	// ── Handle Book Navigation ─────────────────────────────────────────────────
	const handleBook = (item: RadiologyItem) => {
		navigation.navigate(ROUTES.STACK.PLACE_RADIOLOGY_ORDER, {
			radiologyId: item.id,
			centerName: item.name,
			centerAddress: item.address || item.city || '',
			centerCity: item.city,
			centerPhone: item.phone,
		})
	}

	// ── Filter Modal ───────────────────────────────────────────────────────────
	const openFilterModal = () => {
		setFilterModalVisible(true)
		filterSheetAnim.setValue(0)
		filterBackdropAnim.setValue(0)
		Animated.parallel([
			Animated.timing(filterSheetAnim, { toValue: 1, duration: 260, useNativeDriver: true }),
			Animated.timing(filterBackdropAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
		]).start()
	}

	const closeFilterModal = () => {
		Animated.parallel([
			Animated.timing(filterSheetAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
			Animated.timing(filterBackdropAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
		]).start(({ finished }) => {
			if (finished) setFilterModalVisible(false)
		})
	}

	// ── Render Helpers ─────────────────────────────────────────────────────────
	const renderHeader = () => (
		<View style={styles.headerContainer}>
			{hasActiveFilters ? (
				<View style={styles.chipRow}>
					{filters.city ? (
						<View style={styles.activeChip}>
							<Text style={styles.activeChipText}>{filters.city}</Text>
							<TouchableOpacity onPress={() => handleFilterChange({ ...filters, city: '' })}>
								<Text style={styles.activeChipRemove}> ✕</Text>
							</TouchableOpacity>
						</View>
					) : null}
					{filters.pricingModel !== 'all' ? (
						<View style={styles.activeChip}>
							<Text style={styles.activeChipText}>{filters.pricingModel}</Text>
							<TouchableOpacity onPress={() => handleFilterChange({ ...filters, pricingModel: 'all' })}>
								<Text style={styles.activeChipRemove}> ✕</Text>
							</TouchableOpacity>
						</View>
					) : null}
					{searchQuery ? (
						<View style={styles.activeChip}>
							<Text style={styles.activeChipText}>"{searchQuery}"</Text>
							<TouchableOpacity onPress={() => setSearchQuery('')}>
								<Text style={styles.activeChipRemove}> ✕</Text>
							</TouchableOpacity>
						</View>
					) : null}
					<TouchableOpacity style={styles.clearChip} onPress={clearAllFilters}>
						<Text style={styles.clearChipText}>Clear all</Text>
					</TouchableOpacity>
				</View>
			) : null}
			<Text style={styles.resultCount}>{total} Centers Found</Text>
		</View>
	)

	const renderEmpty = () => {
		if (loading) return null
		return (
			<View style={styles.emptyCard}>
				<MaterialCommunityIcons name="radiology-box" size={60} color="#D0D5DD" />
				<Text style={styles.emptyTitle}>No scans found</Text>
				<Text style={styles.emptySubtitle}>Try adjusting your search or filters</Text>
			</View>
		)
	}

	const renderItem = ({ item }: { item: RadiologyItem }) => (
		<View style={[styles.cardWrapper, { width: numColumns === 1 ? '100%' : itemWidth }]}>
			<RadiologyCard
				radiology={item}
				layout={isMobile && !isLandscape ? 'horizontal' : 'vertical'}
				onPress={() => handleBook(item)}
				onBook={() => handleBook(item)}
			/>
		</View>
	)

	// ── Filter Modal UI ────────────────────────────────────────────────────────
	const renderFilterModal = () => {
		const translateY = filterSheetAnim.interpolate({ inputRange: [0, 1], outputRange: [420, 0] })
		const backdropOpacity = filterBackdropAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] })

		return (
			<Modal visible={filterModalVisible} transparent animationType="none" onRequestClose={closeFilterModal}>
				<View style={styles.filterModalRoot}>
					<Animated.View style={[styles.filterBackdrop, { opacity: backdropOpacity }]}>
						<BlurView intensity={34} tint="dark" style={StyleSheet.absoluteFill} />
						<View style={styles.filterDim} />
						<Pressable style={StyleSheet.absoluteFill} onPress={closeFilterModal} />
					</Animated.View>

					<Animated.View
						style={[
							styles.filterSheet,
							{
								width: Math.min(width - 24, 520),
								maxHeight: Math.min(height * 0.78, 620),
								paddingBottom: Math.max(insets.bottom + 18, 26),
								transform: [{ translateY }],
							},
						]}
					>
						<View style={styles.filterSheetHandle} />
						<View style={styles.filterSheetHeader}>
							<AppTypography style={styles.filterSheetTitle}>Filters</AppTypography>
							<TouchableOpacity style={styles.filterCloseButton} onPress={closeFilterModal}>
								<MaterialCommunityIcons name="close" size={22} color="#64707d" />
							</TouchableOpacity>
						</View>

						<ScrollView
							style={styles.filterSheetScroll}
							contentContainerStyle={styles.filterSheetContent}
							showsVerticalScrollIndicator={false}
						>
							<RadiologyFilter filters={filters} onChange={handleFilterChange} resultCount={total} />
						</ScrollView>

						<View style={styles.filterSheetActions}>
							<TouchableOpacity style={styles.resetButton} onPress={clearAllFilters} activeOpacity={0.82}>
								<AppTypography style={styles.resetButtonText}>Reset</AppTypography>
							</TouchableOpacity>
							<TouchableOpacity
								style={styles.applyButton}
								onPress={closeFilterModal}
								activeOpacity={0.88}
							>
								<AppTypography style={styles.applyButtonText}>Apply Filters</AppTypography>
							</TouchableOpacity>
						</View>
					</Animated.View>
				</View>
			</Modal>
		)
	}

	// ── Main Render ────────────────────────────────────────────────────────────
	return (
		<View style={styles.container}>
			{/* Search Bar */}
			<View style={styles.searchRow}>
				<AppSearchBar context="radiologyCenters" value={searchQuery} onChangeText={setSearchQuery} style={styles.searchBar} />
				<TouchableOpacity
					onPress={openFilterModal}
					style={[styles.filterIconButton, hasActiveFilters ? styles.filterIconButtonActive : undefined]}
				>
					<MaterialCommunityIcons name="tune" size={22} color="#1f5f68" />
				</TouchableOpacity>
			</View>

			{/* Content */}
			{loading && !refreshing ? (
				<FlatList
					data={[1, 2, 3, 4, 5, 6]}
					keyExtractor={(item) => String(item)}
					numColumns={numColumns}
					columnWrapperStyle={numColumns > 1 ? { gap: GAP } : undefined}
					renderItem={() => (
						<View style={[styles.cardWrapper, { width: numColumns === 1 ? '100%' : itemWidth }]}>
							<RadiologyCardSkeleton layout={isMobile && !isLandscape ? 'horizontal' : 'vertical'} />
						</View>
					)}
					contentContainerStyle={[styles.listContent, numColumns === 1 && { alignItems: 'stretch' }]}
					showsVerticalScrollIndicator={false}
				/>
			) : error ? (
				<View style={styles.centered}>
					<MaterialCommunityIcons name="alert-circle" size={48} color="#C62828" />
					<Text style={styles.errorText}>{error}</Text>
					<TouchableOpacity style={styles.retryButton} onPress={() => fetchScans('initial', 1)}>
						<Text style={styles.retryText}>Retry</Text>
					</TouchableOpacity>
				</View>
			) : (
				<View style={{ flex: 1 }}>
					<FlatList
						key={numColumns}
						data={filteredScans}
						keyExtractor={(item) => item.id}
						numColumns={numColumns}
						columnWrapperStyle={numColumns > 1 ? { gap: GAP } : undefined}
						renderItem={renderItem}
						ListHeaderComponent={renderHeader}
						ListEmptyComponent={renderEmpty}
						contentContainerStyle={[styles.listContent, numColumns === 1 && { alignItems: 'stretch' }]}
						showsVerticalScrollIndicator={false}
						refreshing={refreshing}
						onRefresh={handleRefresh}
						keyboardShouldPersistTaps="always"
						onEndReached={handleLoadMore}
						onEndReachedThreshold={0.4}
						ListFooterComponent={
							loadingMore ? (
								<View style={styles.loadMoreFooter}>
									<ActivityIndicator size="small" color="#1f5f68" />
								</View>
							) : null
						}
					/>
				</View>
			)}

			{/* Filter Modal */}
			{renderFilterModal()}
		</View>
	)
}

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#F5F7FA',
	},
	searchRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginHorizontal: 12,
		marginTop: 12,
		marginBottom: 8,
		gap: 8,
	},
	searchBar: { flex: 1 },
	filterIconButton: {
		width: 48,
		height: 48,
		borderRadius: 24,
		borderWidth: 1,
		borderColor: '#EAECF0',
		backgroundColor: '#ffffff',
		alignItems: 'center',
		justifyContent: 'center',
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
	headerContainer: {
		marginBottom: 12,
	},
	listContent: {
		paddingHorizontal: 12,
		paddingBottom: 8,
		width: '100%',
	},
	cardWrapper: {
		marginBottom: 12,
	},
	resultCount: {
		fontSize: 15,
		fontWeight: '700',
		color: '#101828',
		marginBottom: 4,
		marginTop: 4,
	},
	chipRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
		marginBottom: 10,
		marginTop: 4,
	},
	activeChip: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#E8F5F5',
		borderRadius: 20,
		paddingHorizontal: 10,
		paddingVertical: 4,
	},
	activeChipText: { fontSize: 13, color: '#2B6F71', fontWeight: '600' },
	activeChipRemove: { fontSize: 12, color: '#2B6F71' },
	clearChip: {
		backgroundColor: '#F2F4F7',
		borderRadius: 20,
		paddingHorizontal: 10,
		paddingVertical: 4,
	},
	clearChipText: { fontSize: 13, color: '#344054', fontWeight: '600' },
	centered: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		gap: 12,
		paddingHorizontal: 24,
	},
	errorText: { color: '#C62828', fontSize: 15, textAlign: 'center' },
	retryButton: {
		marginTop: 8,
		backgroundColor: '#2B6F71',
		paddingHorizontal: 24,
		paddingVertical: 10,
		borderRadius: 8,
	},
	retryText: { color: '#fff', fontWeight: '600', fontSize: 14 },
	emptyCard: {
		backgroundColor: '#fff',
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#EAECF0',
		padding: 40,
		alignItems: 'center',
		marginTop: 8,
		gap: 12,
	},
	emptyTitle: { fontSize: 16, fontWeight: '700', color: '#101828' },
	emptySubtitle: { fontSize: 13, color: '#667085', textAlign: 'center' },
	loadMoreFooter: {
		paddingVertical: 16,
		alignItems: 'center',
	},
	skeletonCard: {
		backgroundColor: '#ffffff',
		borderRadius: 12,
		padding: 12,
		borderWidth: 1,
		borderColor: '#EAECF0',
	},
	skeletonCardHorizontal: {
		flexDirection: 'row',
		gap: 12,
	},
	filterModalRoot: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
	filterBackdrop: { ...StyleSheet.absoluteFill },
	filterDim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(15, 23, 42, 0.34)' },
	filterSheet: {
		backgroundColor: '#ffffff',
		borderTopLeftRadius: 24,
		borderTopRightRadius: 24,
		paddingTop: 8,
		overflow: 'hidden',
		shadowColor: '#000000',
		shadowOffset: { width: 0, height: -10 },
		shadowOpacity: 0.14,
		shadowRadius: 24,
		elevation: 18,
	},
	filterSheetHandle: {
		width: 44,
		height: 4,
		borderRadius: 999,
		backgroundColor: '#d7dee6',
		alignSelf: 'center',
		marginBottom: 10,
	},
	filterSheetHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 18,
		paddingBottom: 12,
	},
	filterSheetTitle: { fontSize: 18, lineHeight: 24, fontWeight: '700', color: '#111827' },
	filterCloseButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
	filterSheetScroll: { flexGrow: 0 },
	filterSheetContent: { paddingHorizontal: 18, paddingTop: 4, paddingBottom: 20, gap: 22 },
	filterSheetActions: {
		flexDirection: 'row',
		paddingHorizontal: 18,
		paddingTop: 12,
		gap: 12,
		borderTopWidth: 1,
		borderTopColor: '#e5eaef',
	},
	resetButton: {
		flex: 1,
		height: 48,
		borderRadius: 24,
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: 1,
		borderColor: '#e5eaef',
		backgroundColor: '#ffffff',
	},
	resetButtonText: { fontSize: 14, fontWeight: '700', color: '#64707d' },
	applyButton: {
		flex: 2,
		height: 48,
		borderRadius: 24,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#1f5f68',
	},
	applyButtonText: { fontSize: 14, fontWeight: '700', color: '#ffffff' },
})
