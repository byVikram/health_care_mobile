// src/features/Pharmacy/screens/PharmacySearchPage.tsx
import React, { useCallback, useEffect, useState } from 'react'
import {
	ActivityIndicator,
	FlatList,
	Modal,
	Platform,
	SafeAreaView,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native'
import PharmacySearchCard from './component/PharmacyCard'
import PharmacyFilters, { PharmacyFilterState } from './component/PharmacyFilters'
import { PharmacyItem } from './pharmacy'
import { getPharmacies } from '../profile/pharmacy/pharmacyService' 
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import ArrowIcon from '../../assets/Settings/arrow.svg'	
import { useNavigation } from '@react-navigation/native'

const LIMIT = 12

export default function PharmacySearchPage() {
	const navigation = useNavigation()
	const [searchQuery, setSearchQuery] = useState('')
	const [page, setPage] = useState(1)
	const [filters, setFilters] = useState<PharmacyFilterState>({
		city: '',
		homeDelivery: false,
		is24x7: false,
		emergencyMeds: false,
	})
	const [allPharmacies, setAllPharmacies] = useState<PharmacyItem[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [showFilters, setShowFilters] = useState(false)
const insets = useSafeAreaInsets()
	// ── Fetch — same pattern as OrderDetailsScreen ────────────────────────────

	const fetchPharmacyList = useCallback(async () => {
		setLoading(true)
		setError(null)
		try {
			const result = await getPharmacies()
			console.log('[PharmacySearchPage] result:', JSON.stringify(result))

			// ApiService.get returns res.data which is the full API body:
			// { success, message, data: [...] }
			const raw = result as any
			const list: any[] = Array.isArray(raw)
				? raw // already the array
				: Array.isArray(raw?.data)
					? raw.data // { data: [] } ← normal shape
					: []

			console.log('[PharmacySearchPage] list length:', list.length)

			const mapped: PharmacyItem[] = list.map((item: any) => ({
				...item,
				owner_name: item.owner_name ?? '',
				image: item.avatar_s3_key ?? item.image,
			}))
			setAllPharmacies(mapped)
		} catch (err: any) {
			console.error('[PharmacySearchPage] error:', err)
			setError(err?.message || 'Failed to load pharmacies')
		} finally {
			setLoading(false)
		}
	}, [])

	useEffect(() => {
		fetchPharmacyList()
	}, [fetchPharmacyList])

	// Reset page on filter/search change
	useEffect(() => {
		setPage(1)
	}, [searchQuery, filters])

	// ── Filter logic ──────────────────────────────────────────────────────────

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
	const totalPages = Math.ceil(total / LIMIT)
	const visiblePharmacies = filteredPharmacies.slice((page - 1) * LIMIT, page * LIMIT)

	const hasActiveFilters =
		filters.city || filters.homeDelivery || filters.is24x7 || filters.emergencyMeds || searchQuery

	const clearAllFilters = () => {
		setFilters({ city: '', homeDelivery: false, is24x7: false, emergencyMeds: false })
		setSearchQuery('')
		setPage(1)
	}

	const handleFilterChange = (newFilters: PharmacyFilterState) => {
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
		if (totalPages <= 1) return null
		return (
			<View style={styles.pagination}>
				<TouchableOpacity
					style={[styles.pageBtn, page === 1 && styles.pageBtnDisabled]}
					onPress={() => setPage((p) => Math.max(1, p - 1))}
					disabled={page === 1}
				>
					<Text style={[styles.pageBtnText, page === 1 && styles.pageBtnTextDisabled]}>← Prev</Text>
				</TouchableOpacity>
				<Text style={styles.pageInfo}>
					{page} / {totalPages}
				</Text>
				<TouchableOpacity
					style={[styles.pageBtn, page === totalPages && styles.pageBtnDisabled]}
					onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
					disabled={page === totalPages}
				>
					<Text style={[styles.pageBtnText, page === totalPages && styles.pageBtnTextDisabled]}>Next →</Text>
				</TouchableOpacity>
			</View>
		)
	}

	// ── Render ────────────────────────────────────────────────────────────────

	return (
		<SafeAreaView style={styles.safe}>

	{/* HEADER (same as Settings page) */}
	<View style={[styles.headerWrapper, { paddingTop: insets.top + 16 }]}>
		<View style={styles.waveOne} />
		<View style={styles.waveTwo} />

		<View style={styles.headerContent}>
			<TouchableOpacity onPress={() => navigation.goBack()}>
				<ArrowIcon />
			</TouchableOpacity>

			<Text style={styles.headerTitle}>Pharmacies</Text>

			<View style={{ width: 22 }} />
		</View>
	</View>
			{/* Search Bar */}
			<View style={styles.searchBar}>
				<Text style={styles.searchIcon}>🔍</Text>
				<TextInput
					style={styles.searchInput}
					placeholder="Search by pharmacy name, owner, city..."
					placeholderTextColor="#9AA0AC"
					value={searchQuery}
					onChangeText={setSearchQuery}
					returnKeyType="search"
				/>
				{searchQuery.length > 0 && (
					<TouchableOpacity onPress={() => setSearchQuery('')}>
						<Text style={styles.clearBtn}>✕</Text>
					</TouchableOpacity>
				)}
				<TouchableOpacity onPress={() => setShowFilters(true)} style={styles.filterBtn}>
					<Text style={styles.filterBtnText}>⚙</Text>
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
					<TouchableOpacity style={styles.retryButton} onPress={fetchPharmacyList}>
						<Text style={styles.retryText}>Retry</Text>
					</TouchableOpacity>
				</View>
			) : (
				<FlatList
					data={visiblePharmacies}
					keyExtractor={(item) => item.id}
					renderItem={({ item }) => (
						<PharmacySearchCard
							pharmacy={item}
							onPress={() => {
								/* navigate to detail */
							}}
							onPlaceOrder={() => {
								/* navigate to order */
							}}
						/>
					)}
					ListHeaderComponent={renderHeader}
					ListEmptyComponent={renderEmpty}
					ListFooterComponent={renderFooter}
					contentContainerStyle={styles.listContent}
					showsVerticalScrollIndicator={false}
				/>
			)}

			{/* Filter Bottom Sheet Modal */}
			<Modal visible={showFilters} animationType="slide" transparent onRequestClose={() => setShowFilters(false)}>
				<View style={styles.modalOverlay}>
					<TouchableOpacity style={styles.modalBackdrop} onPress={() => setShowFilters(false)} />
					<View style={styles.modalSheet}>
						<View style={styles.sheetHandle} />
						<View style={styles.sheetHeader}>
							<Text style={styles.sheetTitle}>Filters</Text>
							<TouchableOpacity onPress={() => setShowFilters(false)}>
								<Text style={styles.sheetClose}>✕</Text>
							</TouchableOpacity>
						</View>
						<ScrollView showsVerticalScrollIndicator={false}>
							<PharmacyFilters filters={filters} onChange={handleFilterChange} />
						</ScrollView>
						<TouchableOpacity style={styles.applyBtn} onPress={() => setShowFilters(false)}>
							<Text style={styles.applyBtnText}>Apply Filters</Text>
						</TouchableOpacity>
					</View>
				</View>
			</Modal>
		</SafeAreaView>
	)
}

const styles = StyleSheet.create({
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
	searchIcon: { fontSize: 16 },
	searchInput: { flex: 1, fontSize: 14, color: '#101828' },
	clearBtn: { fontSize: 16, color: '#9AA0AC', padding: 4 },
	filterBtn: {
		backgroundColor: '#E8F5F5',
		borderRadius: 8,
		paddingHorizontal: 10,
		paddingVertical: 6,
	},
	filterBtnText: { fontSize: 18, color: '#2B6F71' },
	listContent: { paddingHorizontal: 12, paddingBottom: 24 },
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
	pagination: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 16,
		gap: 16,
	},
	pageBtn: {
		backgroundColor: '#2B6F71',
		paddingHorizontal: 18,
		paddingVertical: 8,
		borderRadius: 8,
	},
	pageBtnDisabled: { backgroundColor: '#E0E0E0' },
	pageBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
	pageBtnTextDisabled: { color: '#999' },
	pageInfo: { fontSize: 14, color: '#344054', fontWeight: '600' },
	modalOverlay: { flex: 1, justifyContent: 'flex-end' },
	modalBackdrop: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: 'rgba(0,0,0,0.4)',
	},
	modalSheet: {
		backgroundColor: '#fff',
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		paddingHorizontal: 16,
		paddingBottom: Platform.OS === 'ios' ? 32 : 16,
		maxHeight: '85%',
	},
	sheetHandle: {
		width: 40,
		height: 4,
		backgroundColor: '#E0E0E0',
		borderRadius: 2,
		alignSelf: 'center',
		marginTop: 10,
		marginBottom: 14,
	},
	sheetHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 16,
	},
	sheetTitle: { fontSize: 17, fontWeight: '700', color: '#101828' },
	sheetClose: { fontSize: 20, color: '#667085', padding: 4 },
	applyBtn: {
		backgroundColor: '#2B6F71',
		borderRadius: 12,
		paddingVertical: 14,
		alignItems: 'center',
		marginTop: 16,
	},
	applyBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
})

