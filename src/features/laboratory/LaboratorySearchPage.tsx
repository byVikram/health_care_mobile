// src/features/Laboratory/screens/LaboratorySearchPage.tsx
import React, { useCallback, useEffect, useState } from 'react'
import {
	FlatList,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
	useWindowDimensions,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import Toast from 'react-native-toast-message'
import { AppBottomSheet, AppSkeleton } from '../../components/common'
import PaginationBar from '../../components/common/AppPagination'
import LaboratoryCard from '../laboratory/component/LaboratoryCard'
import LaboratoryFilters, { LaboratoryFilterState } from '../laboratory/component/LaboratoryFilters'
import { getLaboratories } from '../laboratory/laboratoryService'
import { LaboratoryItem } from '../laboratory/laboratory'
import { ROUTES } from '../../navigation/routes'

const PAGE_SIZE = 10
// ── Skeleton ──────────────────────────────────────────────────────────────────

const LabCardSkeleton = ({ horizontal }: { horizontal: boolean }) => (
	<View style={[skeletonStyles.card, horizontal && skeletonStyles.horizontalCard]}>
		<View style={[skeletonStyles.image, horizontal && skeletonStyles.horizontalImage]}>
			<AppSkeleton width="100%" height="100%" borderRadius={0} />
		</View>
		<View style={skeletonStyles.content}>
			<AppSkeleton width="70%" height={14} borderRadius={6} style={{ marginBottom: 8 }} />
			<AppSkeleton width="45%" height={12} borderRadius={6} style={{ marginBottom: 6 }} />
			<AppSkeleton width="55%" height={12} borderRadius={6} style={{ marginBottom: 6 }} />
			<AppSkeleton width="90%" height={12} borderRadius={6} style={{ marginBottom: 10 }} />
			<View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
				<AppSkeleton width={90} height={22} borderRadius={14} />
				<AppSkeleton width={90} height={22} borderRadius={14} />
			</View>
			<AppSkeleton width="100%" height={36} borderRadius={8} />
		</View>
	</View>
)

const skeletonStyles = StyleSheet.create({
	card: {
		backgroundColor: '#fff',
		borderRadius: 12,
		overflow: 'hidden',
		borderWidth: 1,
		borderColor: '#EAECF0',
		marginBottom: 12,
	},
	horizontalCard: { flexDirection: 'row', minHeight: 180 },
	image: { height: 140, backgroundColor: '#f0f4f8' },
	horizontalImage: { width: 120, height: 180 },
	content: { flex: 1, padding: 10 },
})

// ── Main screen ───────────────────────────────────────────────────────────────

export default function LaboratorySearchPage() {
	const navigation = useNavigation()
	const insets = useSafeAreaInsets()
	const { width, height } = useWindowDimensions()

	const isMobile = width < 600
	const isLandscape = width > height
	const numColumns = isMobile ? (isLandscape ? 3 : 1) : width >= 900 ? 4 : 3

	const HORIZONTAL_PADDING = 12
	const GAP = 12
	const itemWidth = (width - HORIZONTAL_PADDING * 2 - GAP * (numColumns - 1)) / numColumns

	const [searchQuery, setSearchQuery] = useState('')
	const [page, setPage] = useState(1)
	const [pageSize, setPageSize] = useState(PAGE_SIZE)
	const [filters, setFilters] = useState<LaboratoryFilterState>({
		city: '',
		homeCollection: false,
		is24x7: false,
		nablAccredited: false,
		emergencyTests: false,
	})
	const [allLabs, setAllLabs] = useState<LaboratoryItem[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [showFilters, setShowFilters] = useState(false)

	// ── Fetch ─────────────────────────────────────────────────────────────────

	const fetchLabs = useCallback(async () => {
		setLoading(true)
		setError(null)
		try {
			const result = await getLaboratories({}, { signal: new AbortController().signal })
			const raw = result as any
			const list: any[] = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : []
			const mapped: LaboratoryItem[] = list.map((item: any) => ({
				...item,
				owner_name: item.owner_name ?? '',
				image: item.avatar_s3_key ?? item.image,
			}))
			setAllLabs(mapped)
		} catch (err: any) {
			const msg = err?.message || 'Failed to load laboratories'
			setError(msg)
			Toast.show({ type: 'error', text1: 'Error', text2: msg })
		} finally {
			setLoading(false)
		}
	}, [])

	useEffect(() => {
		fetchLabs()
	}, [fetchLabs])

	useEffect(() => {
		setPage(1)
	}, [searchQuery, filters, pageSize])

	// ── Filter logic ──────────────────────────────────────────────────────────

	const filteredLabs = allLabs.filter((lab) => {
		const query = searchQuery.trim().toLowerCase()
		const matchesSearch =
			!query ||
			[lab.name, lab.owner_name, lab.address, lab.city]
				.filter(Boolean)
				.some((v) => v!.toLowerCase().includes(query))

		return (
			matchesSearch &&
			(!filters.city || lab.city === filters.city) &&
			(!filters.homeCollection || lab.home_collection_available) &&
			(!filters.is24x7 || lab.is_24_x_7) &&
			(!filters.nablAccredited || lab.is_nabl_accredited) &&
			(!filters.emergencyTests || lab.emergency_tests_available)
		)
	})

	const total = filteredLabs.length
	const visibleLabs = filteredLabs.slice((page - 1) * pageSize, page * pageSize)

	const hasActiveFilters =
		!!filters.city ||
		filters.homeCollection ||
		filters.is24x7 ||
		filters.nablAccredited ||
		filters.emergencyTests ||
		!!searchQuery

	const clearAllFilters = () => {
		setFilters({ city: '', homeCollection: false, is24x7: false, nablAccredited: false, emergencyTests: false })
		setSearchQuery('')
		setPage(1)
	}

	const handleFilterChange = (newFilters: LaboratoryFilterState) => {
		setFilters(newFilters)
		setPage(1)
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
			<Text style={styles.resultCount}>{total} Laboratories Found</Text>
		</View>
	)

	const renderEmpty = () => {
		if (loading) return null
		return (
			<View style={styles.emptyCard}>
				<MaterialCommunityIcons name="flask-outline" size={40} color="#b0bec5" />
				<Text style={styles.emptyTitle}>No laboratories found</Text>
				<Text style={styles.emptySubtitle}>Try adjusting your search or filters</Text>
			</View>
		)
	}

	// ── Skeleton grid ─────────────────────────────────────────────────────────

	const renderSkeletons = () => {
		const skeletonCount = pageSize
		const isHorizontal = isMobile && !isLandscape

		if (numColumns === 1) {
			return (
				<ScrollView
					contentContainerStyle={[styles.listContent, { alignItems: 'stretch' }]}
					showsVerticalScrollIndicator={false}
				>
					{Array.from({ length: skeletonCount }).map((_, i) => (
						<LabCardSkeleton key={i} horizontal={isHorizontal} />
					))}
				</ScrollView>
			)
		}

		// multi-column grid
		const rows: number[][] = []
		for (let i = 0; i < skeletonCount; i += numColumns) {
			rows.push(Array.from({ length: Math.min(numColumns, skeletonCount - i) }, (_, j) => i + j))
		}

		return (
			<ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
				{rows.map((row, ri) => (
					<View key={ri} style={[styles.skeletonRow, { gap: GAP }]}>
						{row.map((idx) => (
							<View key={idx} style={{ width: itemWidth }}>
								<LabCardSkeleton horizontal={false} />
							</View>
						))}
					</View>
				))}
			</ScrollView>
		)
	}

	// ── Render ────────────────────────────────────────────────────────────────

	return (
		<View style={styles.safe}>
			{/* Search Bar */}
			<View style={styles.searchRowMobile}>
				<View style={styles.searchFieldContainer}>
					<MaterialCommunityIcons name="magnify" size={20} color="#9aa0a6" style={styles.searchIcon} />
					<TextInput
						style={styles.searchInput}
						placeholder="Search by lab name, owner, city..."
						placeholderTextColor="#9AA0AC"
						value={searchQuery}
						onChangeText={setSearchQuery}
						returnKeyType="search"
					/>
					{searchQuery.length > 0 && (
						<TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearBtnWrapper}>
							<MaterialCommunityIcons name="close-circle" size={18} color="#9aa4af" />
						</TouchableOpacity>
					)}
				</View>
				<TouchableOpacity
					onPress={() => setShowFilters(true)}
					style={[styles.filterIconButton, hasActiveFilters && styles.filterIconButtonActive]}
				>
					<MaterialCommunityIcons name="tune" size={22} color="#1f5f68" />
				</TouchableOpacity>
			</View>

			{/* Content */}
			{loading ? (
				renderSkeletons()
			) : error ? (
				<View style={styles.centered}>
					<MaterialCommunityIcons name="alert-circle-outline" size={40} color="#C62828" />
					<Text style={styles.errorText}>{error}</Text>
					<TouchableOpacity style={styles.retryButton} onPress={fetchLabs}>
						<Text style={styles.retryText}>Retry</Text>
					</TouchableOpacity>
				</View>
			) : (
				<View style={{ flex: 1 }}>
					<FlatList
						key={numColumns}
						data={visibleLabs}
						keyExtractor={(item) => item.id}
						numColumns={numColumns}
						columnWrapperStyle={numColumns > 1 ? { gap: GAP } : undefined}
						renderItem={({ item }) => (
							<View style={[styles.cardWrapper, { width: numColumns === 1 ? '100%' : itemWidth }]}>
								<LaboratoryCard
									lab={item}
									layout={isMobile && !isLandscape ? 'horizontal' : 'vertical'}
									onPress={() => {}}
									onBookTest={() => {
										;(navigation as any).navigate(ROUTES.STACK.PLACE_LABORATORY_TEST, {
											labId: item.id,
											labName: item.name,
										})
									}}
								/>
							</View>
						)}
						ListHeaderComponent={renderHeader}
						ListEmptyComponent={renderEmpty}
						contentContainerStyle={[styles.listContent, numColumns === 1 && { alignItems: 'stretch' }]}
						showsVerticalScrollIndicator={false}
					/>

					{/* PaginationBar — same pattern as OrderListPage */}
					{total > 0 && (
						<View style={[styles.paginationWrap, { paddingBottom: Math.max(insets.bottom + 8, 16) }]}>
							<PaginationBar
								page={page}
								pageSize={pageSize}
								totalRows={total}
								pageSizeOptions={[12, 24, 48]}
								onPageChange={(nextPage) => setPage(nextPage)}
								onPageSizeChange={(nextSize) => {
									setPageSize(nextSize)
									setPage(1)
								}}
							/>
						</View>
					)}
				</View>
			)}

			{/* Filter Bottom Sheet */}
			<AppBottomSheet visible={showFilters} title="Filters" onClose={() => setShowFilters(false)}>
				<View style={styles.sheetContent}>
					<ScrollView showsVerticalScrollIndicator={false}>
						<LaboratoryFilters filters={filters} onChange={handleFilterChange} />
					</ScrollView>
					<TouchableOpacity style={styles.applyBtn} onPress={() => setShowFilters(false)}>
						<Text style={styles.applyBtnText}>Apply Filters</Text>
					</TouchableOpacity>
				</View>
			</AppBottomSheet>
		</View>
	)
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
	safe: { flex: 1, backgroundColor: '#F5F7FA' },
	cardWrapper: { marginBottom: 12 },
	skeletonRow: { flexDirection: 'row', marginBottom: 12 },
	searchRowMobile: {
		flexDirection: 'row',
		alignItems: 'center',
		marginHorizontal: 12,
		marginTop: 12,
		marginBottom: 8,
		gap: 8,
	},
	searchFieldContainer: {
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
	searchInput: { flex: 1, height: '100%', fontSize: 14, color: '#101828' },
	clearBtnWrapper: { padding: 4 },
	filterIconButton: {
		width: 48,
		height: 48,
		borderRadius: 12,
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
	filterIconButtonActive: { backgroundColor: '#eaf8f9', borderColor: '#1f5f68' },
	listContent: { paddingHorizontal: 12, paddingBottom: 8, width: '100%' },
	resultCount: { fontSize: 15, fontWeight: '700', color: '#101828', marginBottom: 12, marginTop: 4 },
	chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10, marginTop: 4 },
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
	clearChip: { backgroundColor: '#F2F4F7', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
	clearChipText: { fontSize: 13, color: '#344054', fontWeight: '600' },
	centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
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
		gap: 8,
	},
	emptyTitle: { fontSize: 16, fontWeight: '700', color: '#101828' },
	emptySubtitle: { fontSize: 13, color: '#667085' },
	paginationWrap: {
		paddingVertical: 10,
		borderTopWidth: 1,
		borderTopColor: '#EAECF0',
		backgroundColor: '#F5F7FA',
	},
	sheetContent: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 16 },
	applyBtn: {
		backgroundColor: '#2B6F71',
		borderRadius: 12,
		paddingVertical: 14,
		alignItems: 'center',
		marginTop: 16,
	},
	applyBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
})
