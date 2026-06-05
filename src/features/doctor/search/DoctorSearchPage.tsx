import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
	View,
	StyleSheet,
	FlatList,
	RefreshControl,
	ActivityIndicator,
	useWindowDimensions,
	DimensionValue,
	Platform,
	TextInput,
	TouchableOpacity,
} from 'react-native'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { useRoute, useNavigation } from '@react-navigation/native'
import DoctorSearchCard from './components/DoctorSearchCard'
import { AppTypography, AppSkeleton } from '../../../components/common'
import { getDoctors } from '../doctorService'
import { DoctorSearchItem } from '../../../types/doctor-search'
import { doctorCardStyles } from './components/DoctorCard.styles'
import type { RouteProp } from '@react-navigation/native'
import type { AppStackParamList } from '../../../navigation/types'
import { ROUTES } from '../../../navigation/routes'

const PAGE_LIMIT = 5

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
	const { width } = useWindowDimensions()

	const isMobile = width < 600
	const numColumns = isMobile ? 1 : width >= 900 ? 4 : 3
	const mobileListPadding = width < 360 ? 12 : 20

	// Read initial search query from navigation params (passed from SearchPage)
	const initialQuery = route.params?.query || ''

	const [searchQuery, setSearchQuery] = useState(initialQuery)
	const [doctors, setDoctors] = useState<DoctorSearchItem[]>([])
	const [loading, setLoading] = useState(true)
	const [refreshing, setRefreshing] = useState(false)
	const [page, setPage] = useState(1)
	const [loadingMore, setLoadingMore] = useState(false)
	const [hasMore, setHasMore] = useState(true)
	const isFetchingPageRef = useRef(false)

	// Fetch the base doctor list. Search and speciality tabs are applied locally.
	const fetchDoctorsList = async (targetPage = 1, isRefresh = false, isLoadMore = false) => {
		if (isFetchingPageRef.current) return
		isFetchingPageRef.current = true

		if (isLoadMore) {
			setLoadingMore(true)
		} else if (!isRefresh) {
			setLoading(true)
		}
		try {
			// 🔁 ADJUST THIS MAPPING TO MATCH YOUR BACKEND
			// Option 1: if backend expects 'q' instead of 'search'
			// Option 2: if backend expects 'speciality' instead of 'speciality_id'
			const params = {
				page: targetPage,
				limit: PAGE_LIMIT,
			}

			console.log('📤 Sending params:', JSON.stringify(params, null, 2))

			const res = await getDoctors(params)  // getDoctors already uses these params
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
		fetchDoctorsList(1)
	}, [])

	const onRefresh = useCallback(() => {
		if (isFetchingPageRef.current) return
		setRefreshing(true)
		setPage(1)
		setDoctors([])
		setHasMore(true)
		fetchDoctorsList(1, true)
	}, [])

	const handleEndReached = useCallback(() => {
		if (isFetchingPageRef.current || loading || refreshing || loadingMore || !hasMore) return
		console.log('🔥 Loading next page:', page + 1)

		fetchDoctorsList(page + 1, false, true)
	}, [hasMore, loading, loadingMore, page, refreshing])

	const handleSearchSubmit = () => {
		// The visible list is controlled by speciality tabs only on this page.
	}

	// Speciality filtering is temporarily disabled while the speciality section is hidden.
	const displayedDoctors = doctors

	// Render item for FlatList
	const renderItem = useCallback(({ item }: { item: DoctorSearchItem }) => {
		const itemWidth: DimensionValue = `${100 / numColumns}%`
		return (
			<View style={[styles.cardListItem, isMobile && styles.cardListItemMobile, { width: itemWidth }]}>
				<DoctorSearchCard doctor={item} mobile={isMobile} />
			</View>
		)
	}, [isMobile, numColumns])

	// Skeleton placeholder list when loading
	const listData = loading && !refreshing ? Array(6).fill({}) : displayedDoctors
	const keyExtractor = (item: any, index: number) =>
		item.id ? String(item.id) : `skeleton-${index}`
	const renderFooter = () =>
		loadingMore ? (
			<View style={styles.footerLoader}>
				<ActivityIndicator size="small" color="#888" />
			</View>
		) : null

	return (
		<View style={styles.container}>
			{/* Search Bar - Pressable to open SearchPage */}
			<TouchableOpacity
				style={styles.searchBar}
				onPress={() => navigation.navigate(ROUTES.STACK.SEARCH)}
				activeOpacity={0.8}
			>
				<MaterialCommunityIcons name="magnify" size={20} color="#9aa0a6" style={styles.searchIcon} />
				<View style={styles.searchInputContainer}>
					<AppTypography style={searchQuery ? styles.searchQueryText : styles.searchPlaceholderText}>
						{searchQuery || "Search Doctors/Symptoms"}
					</AppTypography>
				</View>
				{searchQuery.length > 0 && (
					<TouchableOpacity
						onPress={(e) => {
							e.stopPropagation()
							setSearchQuery('')
							void fetchDoctorsList(1, true)
						}}
						style={styles.clearButton}
					>
						<MaterialCommunityIcons name="close" size={20} color="#9aa0a6" />
					</TouchableOpacity>
				)}
			</TouchableOpacity>

			{/* Specialities chips temporarily hidden.
			<View style={[styles.filterSection, isMobile && styles.filterSectionMobile]}>
				<AppTypography variant="h4" style={[styles.filterTitle, isMobile && styles.filterTitleMobile]}>
					Search by Specialities
				</AppTypography>
				<ScrollView
					horizontal
					showsHorizontalScrollIndicator={false}
					contentContainerStyle={[styles.filterScroll, isMobile && styles.filterScrollMobile]}
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
			</View> */}

			{/* Results or empty state */}
			{!loading && !refreshing && displayedDoctors.length === 0 ? (
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
						numColumns > 1
							? { paddingHorizontal: 12, justifyContent: 'space-between' }
							: undefined
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
		</View>
	)
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#f5f7fa' },
	filterSection: { paddingTop: 20, paddingBottom: 8 },
	filterSectionMobile: { paddingTop: 16, paddingBottom: 6 },
	filterTitle: { paddingHorizontal: 16, marginBottom: 14 },
	filterTitleMobile: { marginBottom: 12 },
	filterScroll: { paddingHorizontal: 16, gap: 14 },
	filterScrollMobile: { gap: 10 },
	chipWrapper: { alignItems: 'center', gap: 8, width: 72 },
	chipWrapperMobile: {
		width: 64,
		gap: 6,
	},
	chipIconBox: {
		width: 64,
		height: 64,
		borderRadius: 16,
		alignItems: 'center',
		justifyContent: 'center',
	},
	chipIconBoxMobile: {
		width: 56,
		height: 56,
		borderRadius: 14,
	},
	chipLabel: { fontSize: 11, textAlign: 'center' },
	chipLabelMobile: {
		fontSize: 10,
		lineHeight: 14,
	},
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
})
