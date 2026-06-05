import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
	ActivityIndicator,
	FlatList,
	Image,
	SafeAreaView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import Toast from 'react-native-toast-message'

import AppHeader from '../../components/common/AppHeader'
import Card from '../../components/common/CommonCard'
import { getPharmacyOrders } from '../profile/pharmacy/pharmacyService'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface PharmacyOrder {
	id: string
	treatment_id: string
	status: string
	created_at: string
	bill_amount: number
	patient: {
		id: string
		name: string
		avatar_s3_key?: string
	}
	pharmacy: {
		id: string
		name: string
		city?: string
	}
}

type NormalizedStatus = 'Pending' | 'Collected' | 'Rejected' | 'Packed'

type OrderItem = {
	id: string
	group: string
	name: string
	orderId: string
	doctor: string
	clinic: string
	date: string
	time: string
	status: NormalizedStatus
	avatar: string | null
	billAmount: number
	raw: PharmacyOrder
}

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const STATUS_STYLES: Record<NormalizedStatus, { bg: string; text: string }> = {
	Pending: { bg: '#FFF1D9', text: '#F0A018' },
	Collected: { bg: '#DFF5E4', text: '#43A047' },
	Rejected: { bg: '#FFE3E7', text: '#E74B5B' },
	Packed: { bg: '#DEE9FF', text: '#3F7EE8' },
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

const formatDate = (dateString: string) =>
	new Date(dateString).toLocaleDateString('en-IN', {
		day: '2-digit',
		month: 'short',
		year: 'numeric',
	})

const formatTime = (dateString: string) =>
	new Date(dateString).toLocaleTimeString('en-IN', {
		hour: '2-digit',
		minute: '2-digit',
	})

const formatGroupDate = (dateString: string) =>
	new Date(dateString).toLocaleDateString('en-IN', {
		weekday: 'long',
		day: '2-digit',
		month: 'short',
		year: 'numeric',
	})

const normalizeStatus = (status: string): NormalizedStatus => {
	switch (status?.toLowerCase()) {
		case 'collected':
			return 'Collected'
		case 'rejected':
			return 'Rejected'
		case 'packed':
			return 'Packed'
		default:
			return 'Pending'
	}
}

/**
 * Safely extracts the PharmacyOrder array from whatever shape the API returns.
 *
 * The service does:  return res.data
 *
 * Depending on the backend response envelope, res.data may be:
 *   1. { data: PharmacyOrder[] }   ← most common (matches the web OrderList.tsx)
 *   2. PharmacyOrder[]             ← raw array
 *   3. { orders: PharmacyOrder[] } ← alternative key
 */
const extractOrders = (response: unknown): PharmacyOrder[] => {
	if (!response) return []

	// Case 1: { data: [...] }
	if (typeof response === 'object' && 'data' in (response as object) && Array.isArray((response as any).data)) {
		return (response as any).data
	}

	// Case 2: raw array
	if (Array.isArray(response)) {
		return response
	}

	// Case 3: { orders: [...] }
	if (typeof response === 'object' && 'orders' in (response as object) && Array.isArray((response as any).orders)) {
		return (response as any).orders
	}

	console.warn('[OrderListPage] Unexpected API response shape:', response)
	return []
}

const mapOrderToItem = (item: PharmacyOrder): OrderItem => ({
	id: item.id,
	group: formatGroupDate(item.created_at),
	name: item.patient?.name || 'Unknown Patient',
	orderId: item.treatment_id || item.id.slice(0, 8),
	doctor: item.pharmacy?.name || 'Care & Cure',
	clinic: item.pharmacy?.city || '',
	date: formatDate(item.created_at),
	time: formatTime(item.created_at),
	status: normalizeStatus(item.status),
	avatar: item.patient?.avatar_s3_key || null,
	billAmount: item.bill_amount || 0,
	raw: item,
})

// ─────────────────────────────────────────────
// OrderCard
// ─────────────────────────────────────────────

const OrderCard = React.memo(function OrderCard({ order, onPress }: { order: OrderItem; onPress: () => void }) {
	const statusStyle = STATUS_STYLES[order.status] ?? STATUS_STYLES.Pending

	return (
		<Card style={styles.orderCard} onPress={onPress}>
			<View style={styles.avatarBox}>
				{order.avatar ? (
					<Image source={{ uri: order.avatar }} style={styles.avatar} />
				) : (
					<MaterialCommunityIcons name="account" size={34} color="#ffffff" />
				)}
			</View>

			<View style={styles.orderInfo}>
				<View style={styles.nameRow}>
					<Text numberOfLines={1} style={styles.patientName}>
						{order.name}
					</Text>
					{/* <Text style={styles.orderId}>({order.orderId})</Text> */}
				</View>

				<Text numberOfLines={1} style={styles.doctorText}>
					By {order.doctor}
					{order.clinic ? ` - ${order.clinic}` : ''}
				</Text>

				<View style={styles.metaRow}>
					<MaterialCommunityIcons name="calendar-blank-outline" size={10} color="#8b969b" />
					<Text style={styles.metaText}>{order.date}</Text>
					<MaterialCommunityIcons name="clock-time-three-outline" size={10} color="#8b969b" />
					<Text style={styles.metaText}>{order.time}</Text>
				</View>
			</View>

			<View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
				<Text style={[styles.statusText, { color: statusStyle.text }]}>{order.status}</Text>
			</View>

			<MaterialCommunityIcons name="chevron-right" size={24} color="#2E7C86" />
		</Card>
	)
})

// ─────────────────────────────────────────────
// ListHeader
// ─────────────────────────────────────────────

type ListHeaderProps = {
	searchQuery: string
	onSearchChange: (v: string) => void
	selectedDate: string
	onDatePress: () => void
	totalCount: number
	isSearching: boolean
	searchResults: OrderItem[]
	searchLoading: boolean
	onOrderPress: (order: OrderItem) => void
}

const ListHeader = React.memo(function ListHeader({
	searchQuery,
	onSearchChange,
	selectedDate,
	onDatePress,
	totalCount,
	isSearching,
	searchResults,
	searchLoading,
	onOrderPress,
}: ListHeaderProps) {
	return (
		<View>
			{/* Search bar */}
			{/* <View style={styles.searchBar}>
				<MaterialCommunityIcons name="magnify" size={20} color="#7d8b94" />
				<TextInput
					value={searchQuery}
					onChangeText={onSearchChange}
					placeholder="Search by patient name or order ID"
					placeholderTextColor="#8b9aa2"
					style={styles.searchInput}
					autoCorrect={false}
					returnKeyType="search"
				/>
				{searchQuery.length > 0 && (
					<TouchableOpacity onPress={() => onSearchChange('')} activeOpacity={0.7}>
						<MaterialCommunityIcons name="close-circle" size={18} color="#8b9aa2" />
					</TouchableOpacity>
				)}
			</View> */}

			{/* Inline search results */}
			{isSearching && (
				<View style={styles.searchResultsSection}>
					<Text style={styles.sectionLabel}>SEARCH RESULTS</Text>

					{searchLoading ? (
						<View style={styles.centeredBlock}>
							<ActivityIndicator size="small" color="#2E7C86" />
						</View>
					) : searchResults.length === 0 ? (
						<View style={styles.emptyState}>
							<Text style={styles.emptyTitle}>No orders found</Text>
							<Text style={styles.emptyText}>Try a different patient name or order ID.</Text>
						</View>
					) : (
						searchResults.map((order) => (
							<View key={order.id} style={{ marginBottom: 12 }}>
								<OrderCard order={order} onPress={() => onOrderPress(order)} />
							</View>
						))
					)}
				</View>
			)}

			{/* Date filter + section title (non-search mode) */}
			{!isSearching && (
				<>
					<View style={styles.listTopRow}>
						<Text style={styles.pageTitle}>Medicine orders</Text>
						<View style={styles.countBadge}>
							<Text style={styles.countBadgeText}>{totalCount}</Text>
						</View>
					</View>

					<Text style={styles.label}>Select date:</Text>
					<TouchableOpacity style={styles.dateSelect} onPress={onDatePress} activeOpacity={0.8}>
						<Text style={styles.dateText}>{selectedDate}</Text>
						<View style={styles.dateDivider} />
						<MaterialCommunityIcons name="chevron-down" size={20} color="#6d7f86" />
					</TouchableOpacity>
				</>
			)}
		</View>
	)
})

// ─────────────────────────────────────────────
// Main screen
// ─────────────────────────────────────────────

export default function OrderListPage() {
	const navigation = useNavigation<any>()

	const [orders, setOrders] = useState<OrderItem[]>([])
	const [loading, setLoading] = useState(false)
	const [refreshing, setRefreshing] = useState(false)

	const [searchQuery, setSearchQuery] = useState('')
	const [searchResults, setSearchResults] = useState<OrderItem[]>([])
	const [searchLoading, setSearchLoading] = useState(false)
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	const [selectedDate, setSelectedDate] = useState('Date')

	const trimmedSearch = searchQuery.trim()
	const isSearching = trimmedSearch.length >= 2

	// ── Fetch all orders ───────────────────────────────────────────────

	const fetchOrders = useCallback(async (isRefresh = false) => {
		try {
			isRefresh ? setRefreshing(true) : setLoading(true)

			const response = await getPharmacyOrders({ page: 1, limit: 100 })

			// Log raw response so you can confirm shape during development
			console.log('[OrderListPage] raw response:', JSON.stringify(response).slice(0, 300))

			const apiOrders = extractOrders(response)

			console.log(`[OrderListPage] extracted ${apiOrders.length} orders`)

			setOrders(apiOrders.map(mapOrderToItem))
		} catch (error) {
			console.error('[OrderListPage] fetchOrders error:', error)
			Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to load pharmacy orders' })
		} finally {
			isRefresh ? setRefreshing(false) : setLoading(false)
		}
	}, [])

	useEffect(() => {
		fetchOrders()
	}, [fetchOrders])

	// ── Debounced client-side search ───────────────────────────────────

	useEffect(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current)

		if (!isSearching) {
			setSearchResults([])
			setSearchLoading(false)
			return
		}

		setSearchLoading(true)

		debounceRef.current = setTimeout(() => {
			const query = trimmedSearch.toLowerCase()

			const results = orders.filter(
				(order) =>
					order.name?.toLowerCase().includes(query) ||
					order.orderId?.toLowerCase().includes(query) ||
					order.doctor?.toLowerCase().includes(query)
			)

			setSearchResults(results)
			setSearchLoading(false)
		}, 300)

		return () => {
			if (debounceRef.current) clearTimeout(debounceRef.current)
		}
	}, [isSearching, trimmedSearch, orders])

	// ── Navigate to order detail ───────────────────────────────────────

	const handleOrderPress = useCallback(
		(order: OrderItem) => {
			navigation.navigate('OrderDetails', { orderId: order.id, order: order.raw })
		},
		[navigation]
	)

	// ── Render grouped rows ────────────────────────────────────────────

	const renderItem = useCallback(
		({ item, index }: { item: OrderItem; index: number }) => {
			const previous = orders[index - 1]
			const showGroup = !previous || previous.group !== item.group

			return (
				<View>
					{showGroup && <Text style={styles.groupTitle}>{item.group}</Text>}
					<OrderCard order={item} onPress={() => handleOrderPress(item)} />
					<View style={{ height: 12 }} />
				</View>
			)
		},
		[orders, handleOrderPress]
	)

	const listHeader = useMemo(
		() => (
			<ListHeader
				searchQuery={searchQuery}
				onSearchChange={setSearchQuery}
				selectedDate={selectedDate}
				onDatePress={() => {
					/* TODO: wire date picker */
				}}
				totalCount={orders.length}
				isSearching={isSearching}
				searchResults={searchResults}
				searchLoading={searchLoading}
				onOrderPress={handleOrderPress}
			/>
		),
		[searchQuery, selectedDate, orders.length, isSearching, searchResults, searchLoading, handleOrderPress]
	)

	// ── Render ─────────────────────────────────────────────────────────

	return (
		<SafeAreaView style={styles.safeArea}>
			<AppHeader variant="search" location="KR Market" onAvatarPress={() => navigation.goBack()} />

			<View style={styles.content}>
				{loading ? (
					<View style={styles.centeredFull}>
						<ActivityIndicator size="large" color="#2E7C86" />
					</View>
				) : (
					<FlatList
						data={isSearching ? [] : orders}
						keyExtractor={(item) => item.id}
						renderItem={renderItem}
						ListHeaderComponent={listHeader}
						contentContainerStyle={styles.listContent}
						showsVerticalScrollIndicator={false}
						keyboardShouldPersistTaps="always"
						onRefresh={() => fetchOrders(true)}
						refreshing={refreshing}
						ListEmptyComponent={
							!isSearching ? (
								<View style={styles.emptyState}>
									<MaterialCommunityIcons name="pill" size={40} color="#b0bec5" />
									<Text style={styles.emptyTitle}>No orders yet</Text>
									<Text style={styles.emptyText}>Pull down to refresh.</Text>
								</View>
							) : null
						}
					/>
				)}
			</View>
		</SafeAreaView>
	)
}

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: '#f4f4f4',
	},
	content: {
		flex: 1,
		paddingHorizontal: 16,
		paddingTop: 16,
	},
	centeredFull: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
	},
	centeredBlock: {
		paddingVertical: 20,
		alignItems: 'center',
		justifyContent: 'center',
	},
	// Search bar
	searchBar: {
		minHeight: 46,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#d9e6eb',
		backgroundColor: '#ffffff',
		paddingHorizontal: 14,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		marginBottom: 16,
		shadowColor: '#12343b',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 8,
		elevation: 2,
	},
	searchInput: {
		flex: 1,
		minHeight: 46,
		color: '#22343d',
		fontSize: 14,
	},
	// Search results section
	searchResultsSection: {
		paddingBottom: 8,
	},
	sectionLabel: {
		color: '#4e6670',
		fontSize: 11,
		fontWeight: '700',
		letterSpacing: 0.5,
		marginBottom: 10,
	},
	// List header — non-search mode
	listTopRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 12,
	},
	pageTitle: {
		color: '#24292b',
		fontSize: 16,
		fontWeight: '600',
	},
	countBadge: {
		minWidth: 24,
		height: 22,
		borderRadius: 11,
		paddingHorizontal: 7,
		backgroundColor: '#dcecee',
		alignItems: 'center',
		justifyContent: 'center',
		marginLeft: 8,
	},
	countBadgeText: {
		color: '#245f67',
		fontSize: 12,
		fontWeight: '700',
	},
	label: {
		color: '#7d868a',
		fontSize: 12,
		marginBottom: 6,
	},
	dateSelect: {
		height: 38,
		borderWidth: 1,
		borderColor: '#2E9CAA',
		borderRadius: 6,
		backgroundColor: '#ffffff',
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 20,
	},
	dateText: {
		flex: 1,
		color: '#236772',
		fontSize: 13,
		paddingHorizontal: 12,
	},
	dateDivider: {
		width: 1,
		height: '100%',
		backgroundColor: '#d8e2e5',
	},
	// FlatList
	listContent: {
		paddingBottom: 30,
	},
	groupTitle: {
		color: '#9aa1a5',
		fontSize: 12,
		fontWeight: '500',
		marginBottom: 8,
		marginTop: 4,
	},
	// Order card
	orderCard: {
		paddingHorizontal: 12,
		paddingVertical: 12,
		flexDirection: 'row',
		alignItems: 'center',
	},
	avatarBox: {
		width: 50,
		height: 50,
		borderRadius: 8,
		backgroundColor: '#dfe4e6',
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 12,
		overflow: 'hidden',
	},
	avatar: {
		width: '100%',
		height: '100%',
	},
	orderInfo: {
		flex: 1,
		minWidth: 0,
	},
	nameRow: {
		flexDirection: 'row',
		alignItems: 'baseline',
		marginBottom: 2,
	},
	patientName: {
		color: '#22292c',
		fontSize: 14,
		fontWeight: '700',
		maxWidth: 100,
	},
	orderId: {
		color: '#2E7C86',
		fontSize: 9,
		fontWeight: '600',
		marginLeft: 4,
	},
	doctorText: {
		color: '#68777d',
		fontSize: 8,
		marginBottom: 4,
	},
	metaRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	metaText: {
		color: '#8b969b',
		fontSize: 8,
		marginRight: 6,
	},
	statusBadge: {
		width: 70,
		height: 26,
		borderRadius: 4,
		alignItems: 'center',
		justifyContent: 'center',
		marginLeft: 8,
	},
	statusText: {
		fontSize: 10,
		fontWeight: '600',
	},
	// Empty state
	emptyState: {
		alignItems: 'center',
		paddingVertical: 40,
		gap: 8,
	},
	emptyTitle: {
		color: '#536167',
		fontSize: 16,
		fontWeight: '700',
	},
	emptyText: {
		color: '#8b969b',
		fontSize: 12,
		textAlign: 'center',
	},
})
