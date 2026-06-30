// src/features/laboratory/LaboratorySearchPage.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
	Animated,
	FlatList,
	Modal,
	Platform,
	Pressable,
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
import { BlurView } from 'expo-blur'
import Toast from 'react-native-toast-message'

import { AppBottomSheet, AppSelect, AppSelectOption, AppSkeleton, AppTypography } from '../../components/common'
import PaginationBar from '../../components/common/AppPagination'
import LaboratoryCard from './component/LaboratoryCard'
import { getLaboratories, clearLaboratoryCache } from './laboratoryService'
import type { LaboratoryItem } from './laboratory'
import { ROUTES } from '../../navigation/routes'

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const PAGE_SIZE_OPTIONS = [12, 24, 48]

const CITY_OPTIONS: AppSelectOption[] = [
	{ label: 'All Cities', value: '' },
	{ label: 'Ahmedabad', value: 'Ahmedabad' },
	{ label: 'Bangalore', value: 'Bangalore' },
	{ label: 'Bengaluru', value: 'Bengaluru' },
	{ label: 'Chennai', value: 'Chennai' },
	{ label: 'Delhi', value: 'Delhi' },
	{ label: 'Hyderabad', value: 'Hyderabad' },
	{ label: 'Jaipur', value: 'Jaipur' },
	{ label: 'Kolkata', value: 'Kolkata' },
	{ label: 'Mumbai', value: 'Mumbai' },
	{ label: 'Pune', value: 'Pune' },
	{ label: 'Surat', value: 'Surat' },
]

// ─────────────────────────────────────────────
// Skeleton
// ─────────────────────────────────────────────

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

// ─────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────

export default function LaboratorySearchPage() {
	const navigation = useNavigation<any>()
	const insets = useSafeAreaInsets()
	const { width, height } = useWindowDimensions()

	// Responsive layout
	const isMobile = width < 600
	const isLandscape = width > height
	const numColumns = isMobile ? (isLandscape ? 3 : 1) : width >= 900 ? 4 : 3

	const HORIZONTAL_PADDING = 12
	const GAP = 12
	const itemWidth = (width - HORIZONTAL_PADDING * 2 - GAP * (numColumns - 1)) / numColumns

	// ── State ───────────────────────────────────────────────────────────
	const [searchQuery, setSearchQuery] = useState('')
	const [debouncedSearch, setDebouncedSearch] = useState('')
	const [page, setPage] = useState(1)
	const [pageSize, setPageSize] = useState(12)
	const [cityFilter, setCityFilter] = useState('')

	const [serverLabs, setServerLabs] = useState<LaboratoryItem[]>([])
	const [totalRows, setTotalRows] = useState(0)
	const [loading, setLoading] = useState(true)
	const [refreshing, setRefreshing] = useState(false)
	const [error, setError] = useState<string | null>(null)

	// Filter modal
	const [filterModalVisible, setFilterModalVisible] = useState(false)
	const [draftCity, setDraftCity] = useState('')
	const filterSheetAnim = useRef(new Animated.Value(0)).current
	const filterBackdropAnim = useRef(new Animated.Value(0)).current

	// ── Debounce search ─────────────────────────────────────────────────
	useEffect(() => {
		const t = setTimeout(() => setDebouncedSearch(searchQuery), 400)
		return () => clearTimeout(t)
	}, [searchQuery])

	// ── Reset page on filter / search / pageSize change ─────────────────
	useEffect(() => {
		setPage(1)
	}, [debouncedSearch, cityFilter, pageSize])

	// ── Fetch laboratories (server-side search + pagination) ────────────
	const fetchLabs = useCallback(
		async (showLoading = true, currentPage = page) => {
			if (showLoading) setLoading(true)
			setError(null)
			try {
				const result = await getLaboratories({
					search: debouncedSearch || undefined,
					city: cityFilter || undefined,
					page: currentPage,
					limit: pageSize,
				})
				setServerLabs(result.data)
				setTotalRows(result.total)
			} catch (err: any) {
				const msg = err?.message || 'Failed to load laboratories'
				setError(msg)
				Toast.show({ type: 'error', text1: 'Error', text2: msg })
			} finally {
				if (showLoading) setLoading(false)
				setRefreshing(false)
			}
		},
		[debouncedSearch, cityFilter, pageSize, page]
	)

	// Fetch on search / filter / pageSize change (reset to page 1)
	useEffect(() => {
		fetchLabs(true, 1)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [debouncedSearch, cityFilter, pageSize])

	// Fetch on page change
	useEffect(() => {
		fetchLabs(true, page)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [page])

	const handleRefresh = async () => {
		setRefreshing(true)
		clearLaboratoryCache()
		await fetchLabs(false, 1)
		setPage(1)
	}

	// ── Filter modal helpers ────────────────────────────────────────────
	const hasActiveFilters = !!cityFilter || !!searchQuery

	const openFilterModal = () => {
		setDraftCity(cityFilter)
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

	const applyFilters = () => {
		setCityFilter(draftCity)
		setPage(1)
		closeFilterModal()
	}

	const resetFilters = () => {
		setDraftCity('')
		setCityFilter('')
		setSearchQuery('')
		setDebouncedSearch('')
		setPage(1)
	}

	// ── Render helpers ──────────────────────────────────────────────────
	const renderHeader = () => (
		<View style={styles.headerContainer}>
			{hasActiveFilters && (
				<View style={styles.chipRow}>
					{cityFilter ? (
						<View style={styles.activeChip}>
							<Text style={styles.activeChipText}>{cityFilter}</Text>
							<TouchableOpacity onPress={() => { setCityFilter(''); setPage(1) }}>
								<Text style={styles.activeChipRemove}> ✕</Text>
							</TouchableOpacity>
						</View>
					) : null}
					{searchQuery ? (
						<View style={styles.activeChip}>
							<Text style={styles.activeChipText}>"{searchQuery}"</Text>
							<TouchableOpacity onPress={() => { setSearchQuery(''); setDebouncedSearch('') }}>
								<Text style={styles.activeChipRemove}> ✕</Text>
							</TouchableOpacity>
						</View>
					) : null}
					<TouchableOpacity style={styles.clearChip} onPress={resetFilters}>
						<Text style={styles.clearChipText}>Clear all</Text>
					</TouchableOpacity>
				</View>
			)}
			<Text style={styles.resultCount}>{totalRows} Laboratories Found</Text>
		</View>
	)

	const renderEmpty = () => {
		if (loading) return null
		return (
			<View style={styles.emptyCard}>
				<MaterialCommunityIcons name="flask-outline" size={48} color="#D0D5DD" />
				<Text style={styles.emptyTitle}>No laboratories found</Text>
				<Text style={styles.emptySubtitle}>Try adjusting your search or filters</Text>
			</View>
		)
	}

	const renderSkeletons = () => {
		const isHorizontal = isMobile && !isLandscape
		if (numColumns === 1) {
			return (
				<ScrollView
					contentContainerStyle={[styles.listContent, { alignItems: 'stretch' }]}
					showsVerticalScrollIndicator={false}
				>
					{Array.from({ length: pageSize > 6 ? 6 : pageSize }).map((_, i) => (
						<LabCardSkeleton key={i} horizontal={isHorizontal} />
					))}
				</ScrollView>
			)
		}
		const rows: number[][] = []
		const count = pageSize > 6 ? 6 : pageSize
		for (let i = 0; i < count; i += numColumns) {
			rows.push(Array.from({ length: Math.min(numColumns, count - i) }, (_, j) => i + j))
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

	// ── Filter Modal ────────────────────────────────────────────────────
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
								maxHeight: Math.min(height * 0.78, 500),
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
							<View style={styles.filterGroup}>
								<AppTypography style={styles.filterGroupLabel}>City</AppTypography>
								<AppSelect
									placeholder="All Cities"
									value={draftCity}
									options={CITY_OPTIONS}
									onSelect={(value) => setDraftCity(value)}
									size="form"
									noMargin
									customCardStyle={styles.selectCard}
									borderColor="#EAECF0"
									maxDropdownHeight={240}
								/>
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
					</Animated.View>
				</View>
			</Modal>
		)
	}

	// ── Main Render ─────────────────────────────────────────────────────
	return (
		<View style={styles.safe}>
			{/* Search Bar */}
			<View style={styles.searchRowMobile}>
				<View style={styles.searchFieldContainer}>
					<MaterialCommunityIcons name="magnify" size={20} color="#9aa0a6" style={styles.searchIcon} />
					<TextInput
						style={styles.searchInput}
						placeholder="Search by lab name, city..."
						placeholderTextColor="#9AA0AC"
						value={searchQuery}
						onChangeText={(text) => {
							setSearchQuery(text)
							setPage(1)
						}}
						returnKeyType="search"
					/>
					{searchQuery.length > 0 && (
						<TouchableOpacity
							onPress={() => { setSearchQuery(''); setDebouncedSearch('') }}
							style={styles.clearBtnWrapper}
						>
							<MaterialCommunityIcons name="close-circle" size={18} color="#9aa4af" />
						</TouchableOpacity>
					)}
				</View>
				<TouchableOpacity
					onPress={openFilterModal}
					style={[styles.filterIconButton, hasActiveFilters && styles.filterIconButtonActive]}
				>
					<MaterialCommunityIcons name="tune" size={22} color="#1f5f68" />
				</TouchableOpacity>
			</View>

			{/* Content */}
			{loading && !refreshing ? (
				renderSkeletons()
			) : error ? (
				<View style={styles.centered}>
					<MaterialCommunityIcons name="alert-circle-outline" size={40} color="#C62828" />
					<Text style={styles.errorText}>{error}</Text>
					<TouchableOpacity style={styles.retryButton} onPress={() => fetchLabs(true, 1)}>
						<Text style={styles.retryText}>Retry</Text>
					</TouchableOpacity>
				</View>
			) : (
				<View style={{ flex: 1 }}>
					<FlatList
						key={numColumns}
						data={serverLabs}
						keyExtractor={(item) => item.id}
						numColumns={numColumns}
						columnWrapperStyle={numColumns > 1 ? { gap: GAP } : undefined}
						renderItem={({ item }) => (
							<View style={[styles.cardWrapper, { width: numColumns === 1 ? '100%' : itemWidth }]}>
								<LaboratoryCard
									lab={item}
									layout={isMobile && !isLandscape ? 'horizontal' : 'vertical'}
									onPress={() =>
										navigation.navigate(ROUTES.STACK.PLACE_LABORATORY_TEST, {
											labId: item.id,
											labName: item.name,
											labAddress: item.address,
											labCity: item.city,
											labAvatarKey: item.avatar_s3_key,
											labOperatingHours: item.operating_hours,
											labIs24x7: item.is_24_x_7,
										})
									}
									onBookTest={() =>
										navigation.navigate(ROUTES.STACK.PLACE_LABORATORY_TEST, {
											labId: item.id,
											labName: item.name,
											labAddress: item.address,
											labCity: item.city,
											labAvatarKey: item.avatar_s3_key,
											labOperatingHours: item.operating_hours,
											labIs24x7: item.is_24_x_7,
										})
									}
								/>
							</View>
						)}
						ListHeaderComponent={renderHeader}
						ListEmptyComponent={renderEmpty}
						contentContainerStyle={[styles.listContent, numColumns === 1 && { alignItems: 'stretch' }]}
						showsVerticalScrollIndicator={false}
						refreshing={refreshing}
						onRefresh={handleRefresh}
						keyboardShouldPersistTaps="always"
					/>

					{totalRows > 0 && (
						<View style={[styles.paginationWrap, { paddingBottom: Math.max(insets.bottom + 8, 16) }]}>
							<PaginationBar
								page={page}
								pageSize={pageSize}
								totalRows={totalRows}
								pageSizeOptions={PAGE_SIZE_OPTIONS}
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

			{renderFilterModal()}
		</View>
	)
}

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────

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
	headerContainer: { marginBottom: 12 },
	listContent: { paddingHorizontal: 12, paddingBottom: 8, width: '100%' },
	resultCount: { fontSize: 15, fontWeight: '700', color: '#101828', marginBottom: 4, marginTop: 4 },
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
	centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 24 },
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
	paginationWrap: {
		paddingVertical: 10,
		borderTopWidth: 1,
		borderTopColor: '#EAECF0',
		backgroundColor: '#F5F7FA',
	},
	// Filter modal
	filterModalRoot: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
	filterBackdrop: { ...StyleSheet.absoluteFillObject },
	filterDim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15, 23, 42, 0.34)' },
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
	filterSheetContent: { paddingHorizontal: 18, paddingTop: 4, paddingBottom: 20, gap: 20 },
	filterGroup: { gap: 10 },
	filterGroupLabel: {
		fontSize: 11,
		fontWeight: '800',
		color: '#64707d',
		textTransform: 'uppercase',
		letterSpacing: 0.5,
	},
	selectCard: { height: 50, borderRadius: 10, backgroundColor: '#ffffff' },
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
		backgroundColor: '#2B6F71',
	},
	applyButtonText: { fontSize: 14, fontWeight: '700', color: '#ffffff' },
})
