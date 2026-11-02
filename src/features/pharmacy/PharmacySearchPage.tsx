// src/features/Pharmacy/screens/PharmacySearchPage.tsx
import React, { useCallback, useEffect, useState } from 'react'
import {
	ActivityIndicator,
	FlatList,
	RefreshControl,
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
	useWindowDimensions,
} from 'react-native'
import PharmacySearchCard from './components/PharmacyCard'
import PharmacyFilters, { PharmacyFilterState } from './components/PharmacyFilters'
import { PharmacyItem } from './pharmacy'
import { getPharmacies } from '../profile/pharmacy/pharmacyService'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { ROUTES } from '../../navigation/routes'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { AppBottomSheet } from '../../components/common'
import AppSearchBar from '../../components/common/inputs/AppSearchBar'

const LIMIT = 10

export default function PharmacySearchPage() {
	const navigation = useNavigation()

	const { width, height } = useWindowDimensions()

	const isMobile = width < 600
	const isLandscape = width > height
	const numColumns = isMobile ? (isLandscape ? 3 : 1) : width >= 900 ? 4 : 3

	const HORIZONTAL_PADDING = 12
	const GAP = 12

	const itemWidth = (width - HORIZONTAL_PADDING * 2 - GAP * (numColumns - 1)) / numColumns

	const [searchQuery, setSearchQuery] = useState('')
	const [filters, setFilters] = useState<PharmacyFilterState>({
		city: '',
		homeDelivery: false,
		is24x7: false,
		emergencyMeds: false,
	})
	const [allPharmacies, setAllPharmacies] = useState<PharmacyItem[]>([])
	const [page, setPage] = useState(1)
	const [hasMore, setHasMore] = useState(true)
	const [loading, setLoading] = useState(true)
	const [loadingMore, setLoadingMore] = useState(false)
	const [refreshing, setRefreshing] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [showFilters, setShowFilters] = useState(false)
	const insets = useSafeAreaInsets()

	// ── Fetch a single page from the server and either replace or append ──────
	const fetchPharmacyPage = useCallback(
		async (pageToFetch: number, mode: 'initial' | 'refresh' | 'loadMore') => {
			const controller = new AbortController()
			try {
				if (mode === 'loadMore') setLoadingMore(true)
				else {
					setLoading(mode === 'initial')
					setError(null)
				}

				const result = await getPharmacies(
					{ page: pageToFetch, limit: LIMIT },
					{ signal: controller.signal }
				)

				const raw = result as any
				const list: any[] = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : []
				const apiMeta = raw?.meta as { total?: number; page?: number; limit?: number; pages?: number } | undefined

				const mapped: PharmacyItem[] = list.map((item: any) => ({
					...item,
					owner_name: item.owner_name ?? '',
					image: item.avatar_s3_key ?? item.image,
				}))

				setAllPharmacies((prev) => {
					if (mode !== 'loadMore') return mapped
					const existingIds = new Set(prev.map((p) => p.id))
					return [...prev, ...mapped.filter((p) => !existingIds.has(p.id))]
				})

				// Determine if there's another page to fetch. Prefer server meta when
				// available; otherwise fall back to "got a full page" heuristic.
				const more = apiMeta?.pages != null ? pageToFetch < apiMeta.pages : mapped.length === LIMIT
				setHasMore(more)
				setPage(pageToFetch)
			} catch (err: any) {
				if (mode !== 'loadMore') setError(err?.message || 'Failed to load pharmacies')
			} finally {
				if (mode === 'loadMore') setLoadingMore(false)
				else {
					setLoading(false)
					setRefreshing(false)
				}
			}
		},
		[]
	)

	useEffect(() => {
		void fetchPharmacyPage(1, 'initial')
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	const handleLoadMore = useCallback(() => {
		if (loading || loadingMore || refreshing || !hasMore) return
		void fetchPharmacyPage(page + 1, 'loadMore')
	}, [loading, loadingMore, refreshing, hasMore, page, fetchPharmacyPage])

	const onRefresh = useCallback(() => {
		setRefreshing(true)
		void fetchPharmacyPage(1, 'refresh')
	}, [fetchPharmacyPage])

	// ── Filter logic (operates over whatever has been loaded so far) ──────────

	const filteredPharmacies = allPharmacies.filter((pharmacy) => {
		const query = searchQuery.trim().toLowerCase()
		const matchesSearch =
			!query ||
			[pharmacy.name, pharmacy.owner_name, pharmacy.address, pharmacy.city]
				.filter(Boolean)
				.some((value) => value!.toLowerCase().includes(query))

		const matchesCity = !filters.city || pharmacy.city === filters.city
		const matchesHomeDelivery = !filters.homeDelivery || pharmacy.home_delivery_available
		const matches24x7 = !filters.is24x7 || pharmacy.is_24_x_7
		const matchesEmergency = !filters.emergencyMeds || pharmacy.emergency_medicine_available

		return matchesSearch && matchesCity && matchesHomeDelivery && matches24x7 && matchesEmergency
	})

	const total = filteredPharmacies.length

	const hasActiveFilters =
		filters.city || filters.homeDelivery || filters.is24x7 || filters.emergencyMeds || searchQuery

	const clearAllFilters = () => {
		setFilters({ city: '', homeDelivery: false, is24x7: false, emergencyMeds: false })
		setSearchQuery('')
	}

	const handleFilterChange = (newFilters: PharmacyFilterState) => {
		setFilters(newFilters)
	}

	// ── Render helpers ────────────────────────────────────────────────────────

	const renderHeader = () => (
		<View>
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
					<TouchableOpacity style={styles.clearChip} onPress={clearAllFilters}>
						<Text style={styles.clearChipText}>Clear all filters</Text>
					</TouchableOpacity>
				</View>
			) : null}
			<Text style={styles.resultCount}>{total} Pharmacies Found</Text>
		</View>
	)

	const renderEmpty = () => {
		if (loading) return null
		return (
			<View style={styles.emptyCard}>
				<Text style={styles.emptyTitle}>No pharmacies found</Text>
				<Text style={styles.emptySubtitle}>Try adjusting your search or filters</Text>
			</View>
		)
	}

	const renderFooter = () => {
		if (!loadingMore) return null
		return (
			<View style={styles.loadMoreFooter}>
				<ActivityIndicator size="small" color="#2B6F71" />
			</View>
		)
	}

	// ── Render ────────────────────────────────────────────────────────────────

	return (
		<View style={styles.safe}>
			{/* Search Bar */}
			<View style={styles.searchRowMobile}>
				<AppSearchBar context="pharmacies" value={searchQuery} onChangeText={setSearchQuery} style={styles.searchBar} />
				<TouchableOpacity
					onPress={() => setShowFilters(true)}
					style={[styles.filterIconButton, hasActiveFilters && styles.filterIconButtonActive]}
				>
					<MaterialCommunityIcons name="tune" size={22} color="#1f5f68" />
				</TouchableOpacity>
			</View>

			{/* Content */}
			{loading ? (
				<View style={styles.centered}>
					<ActivityIndicator size="large" color="#2B6F71" />
					<Text style={styles.loadingText}>Loading pharmacies…</Text>
				</View>
			) : error ? (
				<View style={styles.centered}>
					<Text style={styles.errorText}>{error}</Text>
					<TouchableOpacity style={styles.retryButton} onPress={() => fetchPharmacyPage(1, 'initial')}>
						<Text style={styles.retryText}>Retry</Text>
					</TouchableOpacity>
				</View>
			) : (
				<FlatList
					key={numColumns}
					data={filteredPharmacies}
					keyExtractor={(item) => item.id}
					numColumns={numColumns}
					columnWrapperStyle={numColumns > 1 ? { gap: GAP } : undefined}
					renderItem={({ item }) => (
						<View style={[styles.cardWrapper, { width: numColumns === 1 ? '100%' : itemWidth }]}>
							<PharmacySearchCard
								pharmacy={item}
								layout={isMobile && !isLandscape ? 'horizontal' : 'vertical'}
								onPress={() => {}}
								onPlaceOrder={() => {
									;(navigation as any).navigate(ROUTES.STACK.PLACE_PHARMACY_ORDER, {
										pharmacyId: item.id,
										pharmacyName: item.name,
										pharmacyAddress: item.address,
										pharmacyCity: item.city,
										pharmacyAvatarKey: item.avatar_s3_key,
										pharmacyOperatingHours: item.operating_hours,
										pharmacyIs24x7: item.is_24_x_7,
									})
								}}
							/>
						</View>
					)}
					ListHeaderComponent={renderHeader}
					ListEmptyComponent={renderEmpty}
					ListFooterComponent={renderFooter}
					contentContainerStyle={[styles.listContent, numColumns === 1 && { alignItems: 'stretch' }]}
					showsVerticalScrollIndicator={false}
					refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
					onEndReached={handleLoadMore}
					onEndReachedThreshold={0.4}
				/>
			)}

			{/* Filter Bottom Sheet */}
			<AppBottomSheet visible={showFilters} title="Filters" onClose={() => setShowFilters(false)}>
				<View style={styles.sheetContent}>
					<ScrollView showsVerticalScrollIndicator={false}>
						<PharmacyFilters filters={filters} onChange={handleFilterChange} />
					</ScrollView>
					<TouchableOpacity style={styles.applyBtn} onPress={() => setShowFilters(false)}>
						<Text style={styles.applyBtnText}>Apply Filters</Text>
					</TouchableOpacity>
				</View>
			</AppBottomSheet>
		</View>
	)
}

const styles = StyleSheet.create({
	cardWrapper: {
		marginBottom: 12,
	},
	headerWrapper: {
		backgroundColor: '#1f5f68',
		paddingBottom: 20,
		paddingHorizontal: 16,
		overflow: 'hidden',
	},

	headerContent: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},

	headerTitle: {
		color: '#fff',
		fontSize: 20,
		fontWeight: '600',
	},

	waveOne: {
		position: 'absolute',
		width: 420,
		height: 240,
		borderRadius: 120,
		backgroundColor: 'rgba(255,255,255,0.06)',
		left: -140,
		top: -70,
		transform: [{ rotate: '-4deg' }],
	},

	waveTwo: {
		position: 'absolute',
		width: 430,
		height: 240,
		borderRadius: 120,
		backgroundColor: 'rgba(255,255,255,0.05)',
		left: -95,
		top: -22,
		transform: [{ rotate: '-4deg' }],
	},
	safe: {
		flex: 1,
		backgroundColor: '#F5F7FA',
	},
	searchRowMobile: {
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
	listContent: {
		paddingHorizontal: 12,
		paddingBottom: 24,
		width: '100%',
	},
	resultCount: {
		fontSize: 15,
		fontWeight: '700',
		color: '#101828',
		marginBottom: 12,
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
	},
	loadingText: { color: '#667085', fontSize: 14, marginTop: 8 },
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
	},
	emptyTitle: { fontSize: 16, fontWeight: '700', color: '#101828', marginBottom: 6 },
	emptySubtitle: { fontSize: 13, color: '#667085' },
	loadMoreFooter: {
		paddingVertical: 16,
		alignItems: 'center',
	},
	sheetContent: {
		paddingHorizontal: 16,
		paddingTop: 20,
		paddingBottom: 16,
	},
	applyBtn: {
		backgroundColor: '#2B6F71',
		borderRadius: 12,
		paddingVertical: 14,
		alignItems: 'center',
		marginTop: 16,
	},
	applyBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
})
