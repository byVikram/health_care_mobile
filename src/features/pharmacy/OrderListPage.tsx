import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
	Animated,
	FlatList,
	Image,
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
import { useNavigation, useRoute } from '@react-navigation/native'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import Toast from 'react-native-toast-message'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { BlurView } from 'expo-blur'
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker'
import { AppSelectOption, AppSkeleton, AppTypography } from '../../components/common'

import { getPharmacyOrders } from '../profile/pharmacy/pharmacyService'
import { useAuth } from '../../context/AuthContext'
import { getStatusStyle } from '../../constants/statusColors'
import BookingsSearchBar from '../bookings/components/BookingsSearchBar'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface PharmacyOrder {
	id: string
	treatment_id: string
	status: string
	created_at: string
	bill_amount: number
	delivery_type?: string
	rejection_reason?: any
	delivery_address?: {
		address_line?: string
		city?: string
	}
	patient: {
		id: string
		name: string
		avatar_s3_key?: string
	}
	pharmacy: {
		id: string
		name: string
		city?: string
		address?: string
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

const DATE_OPTIONS: AppSelectOption[] = [
	{ label: 'All', value: 'all' },
	{ label: 'Yesterday', value: 'yesterday' },
	{ label: 'Today', value: 'today' },
	{ label: 'Tomorrow', value: 'tomorrow' },
	{ label: 'Last 7 Days', value: 'last_7_days' },
	{ label: 'Last 30 Days', value: 'last_30_days' },
	{ label: 'Custom', value: 'custom' },
]

const STATUS_OPTIONS: AppSelectOption[] = [
	{ label: 'All', value: 'all' },
	{ label: 'Pending', value: 'pending' },
	{ label: 'Packed', value: 'packed' },
	{ label: 'Collected', value: 'collected' },
	{ label: 'Rejected', value: 'rejected' },
]

const OrderCardSkeleton = () => (
	<View style={styles.orderCard}>
		<View style={styles.cardMainContent}>
			<AppSkeleton width={160} height={18} borderRadius={6} style={{ marginBottom: 14 }} />

			<AppSkeleton width={120} height={14} borderRadius={6} style={{ marginBottom: 10 }} />

			<AppSkeleton width={'100%'} height={40} borderRadius={8} style={{ marginBottom: 12 }} />

			<View
				style={{
					flexDirection: 'row',
					justifyContent: 'space-between',
				}}
			>
				<AppSkeleton width={90} height={24} borderRadius={12} />

				<AppSkeleton width={80} height={18} borderRadius={6} />
			</View>
		</View>
	</View>
)
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

const extractOrders = (response: unknown): PharmacyOrder[] => {
	if (!response) return []
	if (typeof response === 'object' && 'data' in (response as object) && Array.isArray((response as any).data))
		return (response as any).data
	if (Array.isArray(response)) return response
	if (typeof response === 'object' && 'orders' in (response as object) && Array.isArray((response as any).orders))
		return (response as any).orders
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

const formatApiDate = (date: Date) => {
	const year = date.getFullYear()
	const month = String(date.getMonth() + 1).padStart(2, '0')
	const day = String(date.getDate()).padStart(2, '0')
	return `${year}-${month}-${day}`
}

const applyDateFilterParams = (
	params: Record<string, unknown>,
	filter: string,
	customFromDate?: string,
	customToDate?: string
) => {
	if (filter === 'all') return
	if (filter === 'custom') {
		if (customFromDate) params.start_date = customFromDate
		if (customToDate) params.end_date = customToDate
		return
	}
	const today = new Date()
	const endDate = formatApiDate(today)
	if (filter === 'today') {
		params.start_date = endDate
		params.end_date = endDate
		return
	}
	if (filter === 'yesterday') {
		const d = new Date(today)
		d.setDate(today.getDate() - 1)
		const s = formatApiDate(d)
		params.start_date = s
		params.end_date = s
		return
	}
	if (filter === 'tomorrow') {
		const d = new Date(today)
		d.setDate(today.getDate() + 1)
		const s = formatApiDate(d)
		params.start_date = s
		params.end_date = s
		return
	}
	const days = filter === 'last_30_days' ? 30 : 7
	const start = new Date(today)
	start.setDate(today.getDate() - (days - 1))
	params.start_date = formatApiDate(start)
	params.end_date = endDate
}

// ─────────────────────────────────────────────
// OrderCard
// ─────────────────────────────────────────────

interface OrderCardProps {
	order: OrderItem
	onPress: () => void
	isPatient: boolean // true  → hide patient name row  (viewer IS the patient)
	isPharmacy: boolean // true  → hide pharmacy name, show Order # instead
}

const OrderCard = React.memo(function OrderCard({ order, onPress, isPatient, isPharmacy }: OrderCardProps) {
	const statusStyle = getStatusStyle(order.status)

	// Fixed: case-insensitive check for home delivery
	const isHomeDelivery = order.raw?.delivery_type?.toUpperCase() === 'HOME_DELIVERY'

	// Additional info: resolved address based on delivery type
	const address = isHomeDelivery
		? `${order.raw?.delivery_address?.address_line || ''}, ${order.raw?.delivery_address?.city || ''}`
		: `${order.raw?.pharmacy?.address || ''}, ${order.raw?.pharmacy?.city || ''}`

	// Additional info: rejection reason
	const rejectionReason = order.raw?.rejection_reason

	return (
		<TouchableOpacity style={styles.orderCard} onPress={onPress} activeOpacity={0.85}>
			<View style={styles.cardMainContent}>
				{/* ── Additional: Rejection reason badge ── */}
				{order.status === 'Rejected' && rejectionReason ? (
					<View style={styles.reasonBadge}>
						<MaterialCommunityIcons name="alert-circle-outline" size={13} color="#D94B4B" />
						<Text style={styles.reasonText} numberOfLines={1}>
							Reason: {rejectionReason}
						</Text>
					</View>
				) : null}

				{/* ── Header row: Pharmacy name OR Order ID (pharmacy role) ── */}
				<View style={styles.cardHeader}>
					<View style={styles.pharmacyTitleContainer}>
						<MaterialCommunityIcons
							name={isPharmacy ? 'account-outline' : 'storefront-outline'}
							size={18}
							color="#1f5f68"
							style={styles.pharmacyIcon}
						/>

						<Text numberOfLines={1} style={styles.pharmacyName}>
							{isPharmacy ? order.name : order.doctor}
						</Text>
					</View>

					<View
						style={[
							styles.statusBadge,
							{
								backgroundColor: statusStyle.bg,
							},
						]}
					>
						<Text
							style={[
								styles.statusText,
								{
									color: statusStyle.text,
								},
							]}
						>
							{order.status}
						</Text>
					</View>
				</View>

				{/* ── Date & Time ── */}
				<View style={styles.detailRow}>
					<MaterialCommunityIcons
						name="calendar-clock-outline"
						size={15}
						color="#667085"
						style={styles.rowIcon}
					/>
					<Text style={styles.detailText} numberOfLines={1}>
						{order.date} • {order.time}
					</Text>
				</View>

				{/* ── Footer: delivery badge + bill ── */}
				<View style={styles.cardFooter}>
					<View style={[styles.deliveryBadge, isHomeDelivery ? styles.badgeHome : styles.badgePickup]}>
						<MaterialCommunityIcons
							name={isHomeDelivery ? 'truck-delivery-outline' : 'store-outline'}
							size={13}
							color={isHomeDelivery ? '#0D47A1' : '#1B5E20'}
						/>
						<Text style={[styles.deliveryBadgeText, { color: isHomeDelivery ? '#0D47A1' : '#1B5E20' }]}>
							{isHomeDelivery ? 'Home Delivery' : 'Store Pickup'}
						</Text>
					</View>

					<View style={styles.priceContainer}>
						<Text style={styles.priceLabel}>Total Bill</Text>
						<Text style={styles.priceTag}>
							{order.billAmount > 0 ? `₹${order.billAmount.toFixed(2)}` : 'Pending'}
						</Text>
					</View>
				</View>

				{/* ── Additional: Address ── */}
				<Text style={styles.addressText} numberOfLines={2}>
					{address}
				</Text>
			</View>

			<View style={styles.chevronContainer}>
				<MaterialCommunityIcons name="chevron-right" size={20} color="#98A2B3" />
			</View>
		</TouchableOpacity>
	)
})

// ─────────────────────────────────────────────
// Main screen
// ─────────────────────────────────────────────

interface OrderListPageProps {
	embedded?: boolean
	searchQuery?: string
	statusFilter?: string
	dateFilter?: string
	fromDateFilter?: string
	toDateFilter?: string
}

export default function OrderListPage({
	embedded = false,
	searchQuery: propSearchQuery,
	statusFilter: propStatusFilter,
	dateFilter: propDateFilter,
	fromDateFilter: propFromDateFilter,
	toDateFilter: propToDateFilter,
}: OrderListPageProps = {}) {
	const navigation = useNavigation<any>()
	const route = useRoute<any>()
	const insets = useSafeAreaInsets()
	const { width, height } = useWindowDimensions()
	const isTablet = width >= 768

	// ── Role — exactly the same as OrderDetailsScreen ─────────────────
	const { role } = useAuth()
	const isPatient = role === 'patient'
	const isPharmacy = role === 'pharmacy'
	// ──────────────────────────────────────────────────────────────────

	const [orders, setOrders] = useState<OrderItem[]>([])
	const [loading, setLoading] = useState(false)
	const [refreshing, setRefreshing] = useState(false)

	const PAGE_SIZE = 10
	const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

	// Filters
	const [searchQuery, setSearchQuery] = useState(propSearchQuery ?? '')
	const [debouncedSearch, setDebouncedSearch] = useState(propSearchQuery ?? '')
	const [statusFilter, setStatusFilter] = useState(propStatusFilter ?? route.params?.status ?? 'all')
	const [dateFilter, setDateFilter] = useState(propDateFilter ?? 'all')
	const [fromDateFilter, setFromDateFilter] = useState(propFromDateFilter ?? '')
	const [toDateFilter, setToDateFilter] = useState(propToDateFilter ?? '')

	// Draft (mobile filter sheet)
	const [draftStatusFilter, setDraftStatusFilter] = useState('all')
	const [draftDateFilter, setDraftDateFilter] = useState('all')
	const [draftFromDateFilter, setDraftFromDateFilter] = useState('')
	const [draftToDateFilter, setDraftToDateFilter] = useState('')

	const [filterModalVisible, setFilterModalVisible] = useState(false)
	const [activeDatePicker, setActiveDatePicker] = useState<'from' | 'to' | null>(null)

	const filterSheetAnim = useRef(new Animated.Value(0)).current
	const filterBackdropAnim = useRef(new Animated.Value(0)).current

	// Sync controlled props when embedded
	useEffect(() => {
		if (!embedded) return
		if (propSearchQuery !== undefined) setSearchQuery(propSearchQuery)
		if (propStatusFilter !== undefined) setStatusFilter(propStatusFilter)
		if (propDateFilter !== undefined) setDateFilter(propDateFilter)
		if (propFromDateFilter !== undefined) setFromDateFilter(propFromDateFilter)
		if (propToDateFilter !== undefined) setToDateFilter(propToDateFilter)
		setVisibleCount(PAGE_SIZE)
	}, [embedded, propSearchQuery, propStatusFilter, propDateFilter, propFromDateFilter, propToDateFilter])

	// Sync route param status
	useEffect(() => {
		if (!embedded && route.params?.status) setStatusFilter(route.params.status)
	}, [embedded, route.params?.status])

	// Debounce search
	useEffect(() => {
		const t = setTimeout(() => {
			setDebouncedSearch(searchQuery)
			setVisibleCount(PAGE_SIZE)
		}, 300)
		return () => clearTimeout(t)
	}, [searchQuery])

	// ── Fetch ──────────────────────────────────────────────────────────

	const fetchOrders = useCallback(
		async (isRefresh = false) => {
			try {
				isRefresh ? setRefreshing(true) : setLoading(true)
				const params: Record<string, any> = { limit: 50 }
				if (statusFilter !== 'all') params.status = statusFilter
				if (debouncedSearch.trim().length > 0) params.search = debouncedSearch.trim()
				applyDateFilterParams(params, dateFilter, fromDateFilter, toDateFilter)

				const response = (await getPharmacyOrders(params)) as any
				const apiOrders = extractOrders(response)
				setOrders(apiOrders.map(mapOrderToItem))
			} catch (error) {
				console.error('[OrderListPage] fetchOrders error:', error)
				Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to load pharmacy orders' })
			} finally {
				isRefresh ? setRefreshing(false) : setLoading(false)
			}
		},
		[statusFilter, debouncedSearch, dateFilter, fromDateFilter, toDateFilter]
	)

	useEffect(() => {
		fetchOrders()
	}, [fetchOrders])

	const pagedOrders = useMemo(
		() => orders.slice(0, visibleCount),
		[orders, visibleCount]
	)

	const handleLoadMore = useCallback(() => {
		setVisibleCount((prev) => (prev >= orders.length ? prev : Math.min(prev + PAGE_SIZE, orders.length)))
	}, [orders.length])

	// ── Navigate ───────────────────────────────────────────────────────

	const handleOrderPress = useCallback(
		(order: OrderItem) => {
			navigation.navigate('OrderDetails', { orderId: order.id, order: order.raw })
		},
		[navigation]
	)

	// ── Render item ────────────────────────────────────────────────────

	const renderItem = useCallback(
		({ item, index }: { item: OrderItem; index: number }) => {
			const previous = orders[index - 1]
			const showGroup = !previous || previous.group !== item.group
			return (
				<View>
					{showGroup && <Text style={styles.groupTitle}>{item.group}</Text>}
					<OrderCard
						order={item}
						onPress={() => handleOrderPress(item)}
						isPatient={isPatient}
						isPharmacy={isPharmacy}
					/>
					<View style={{ height: 12 }} />
				</View>
			)
		},
		[orders, handleOrderPress, isPatient, isPharmacy]
	)

	// ── Filter modal ───────────────────────────────────────────────────

	const openFilterModal = () => {
		setDraftStatusFilter(statusFilter)
		setDraftDateFilter(dateFilter)
		setDraftFromDateFilter(fromDateFilter)
		setDraftToDateFilter(toDateFilter)
		setFilterModalVisible(true)
		filterSheetAnim.setValue(0)
		filterBackdropAnim.setValue(0)
		Animated.parallel([
			Animated.timing(filterSheetAnim, { toValue: 1, duration: 260, useNativeDriver: true }),
			Animated.timing(filterBackdropAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
		]).start()
	}

	const closeFilterModal = () => {
		setActiveDatePicker(null)
		Animated.parallel([
			Animated.timing(filterSheetAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
			Animated.timing(filterBackdropAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
		]).start(({ finished }) => {
			if (finished) setFilterModalVisible(false)
		})
	}

	const applyFilters = () => {
		if (draftDateFilter === 'custom' && draftFromDateFilter && draftToDateFilter) {
			if (new Date(draftFromDateFilter) > new Date(draftToDateFilter)) {
				Toast.show({ type: 'error', text1: 'Invalid Range', text2: 'From Date cannot be later than To Date.' })
				return
			}
		}
		setStatusFilter(draftStatusFilter)
		setDateFilter(draftDateFilter)
		setFromDateFilter(draftDateFilter === 'custom' ? draftFromDateFilter : '')
		setToDateFilter(draftDateFilter === 'custom' ? draftToDateFilter : '')
		closeFilterModal()
	}

	const resetFilters = () => {
		setDraftStatusFilter('all')
		setDraftDateFilter('all')
		setDraftFromDateFilter('')
		setDraftToDateFilter('')
		setActiveDatePicker(null)
		setStatusFilter('all')
		setDateFilter('all')
		setFromDateFilter('')
		setToDateFilter('')
	}

	const handleDateRangeChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
		if (Platform.OS === 'android') setActiveDatePicker(null)
		if (event.type === 'dismissed' || !selectedDate || !activeDatePicker) return
		const val = formatApiDate(selectedDate)
		activeDatePicker === 'from' ? setDraftFromDateFilter(val) : setDraftToDateFilter(val)
		setDraftDateFilter('custom')
	}

	// ── Filter UI helpers ──────────────────────────────────────────────

	const renderFilterChips = (options: AppSelectOption[], value: string, onChange: (v: string) => void) => (
		<ScrollView
			horizontal
			showsHorizontalScrollIndicator={false}
			style={styles.filterChipScroller}
			contentContainerStyle={styles.filterChipRow}
			keyboardShouldPersistTaps="handled"
		>
			{options.map((option) => {
				const selected = option.value === value
				return (
					<TouchableOpacity
						key={option.value}
						style={[styles.filterChip, selected && styles.filterChipActive]}
						onPress={() => onChange(option.value)}
						activeOpacity={0.82}
					>
						<AppTypography style={[styles.filterChipText, selected && styles.filterChipTextActive]}>
							{option.label}
						</AppTypography>
					</TouchableOpacity>
				)
			})}
		</ScrollView>
	)

	const renderDateField = (label: string, value: string, picker: 'from' | 'to') => (
		<TouchableOpacity
			style={styles.dateRangeField}
			onPress={() => setActiveDatePicker(picker)}
			activeOpacity={0.82}
		>
			<AppTypography style={[styles.dateRangeText, !value && styles.dateRangePlaceholder]} numberOfLines={1}>
				{value || label}
			</AppTypography>
			<MaterialCommunityIcons name="calendar-month-outline" size={20} color="#1f5f68" />
		</TouchableOpacity>
	)

	const renderDateRangePicker = () => (
		<View style={styles.dateRangeWrap}>
			<AppTypography style={styles.filterGroupLabel}>Date Range</AppTypography>
			<View style={styles.dateRangeRow}>
				{renderDateField('From Date', draftFromDateFilter, 'from')}
				<View style={styles.dateRangeDivider} />
				{renderDateField('To Date', draftToDateFilter, 'to')}
			</View>
			{activeDatePicker ? (
				<View style={styles.datePickerWrap}>
					<DateTimePicker
						value={
							activeDatePicker === 'from'
								? draftFromDateFilter
									? new Date(draftFromDateFilter)
									: new Date()
								: draftToDateFilter
									? new Date(draftToDateFilter)
									: new Date()
						}
						mode="date"
						display={Platform.OS === 'ios' ? 'inline' : Platform.OS === 'android' ? 'calendar' : 'default'}
						onChange={handleDateRangeChange}
					/>
				</View>
			) : null}
		</View>
	)

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
							<View style={styles.filterGroup}>
								<AppTypography style={styles.filterGroupLabel}>Date Selection</AppTypography>
								{renderFilterChips(DATE_OPTIONS, draftDateFilter, (value) => {
									setDraftDateFilter(value)
									if (value !== 'custom') setActiveDatePicker(null)
								})}
								{renderDateRangePicker()}
							</View>
							<View style={styles.filterGroup}>
								<AppTypography style={styles.filterGroupLabel}>Order Status</AppTypography>
								{renderFilterChips(STATUS_OPTIONS, draftStatusFilter, setDraftStatusFilter)}
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

	// ── Render ─────────────────────────────────────────────────────────

	return (
		<View style={styles.safeArea}>
			<View style={styles.content}>
				{!embedded && (
					<BookingsSearchBar
						value={searchQuery}
						onChangeText={setSearchQuery}
						placeholder={isPatient ? 'Search by order ID' : 'Search by patient name or order ID'}
						onFilterPress={openFilterModal}
						filterActive={statusFilter !== 'all' || dateFilter !== 'all'}
						accessibilityLabel="Filter medicine orders"
					/>
				)}

				{loading && !refreshing ? (
					<ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
						{[1, 2, 3, 4, 5].map((item) => (
							<OrderCardSkeleton key={item} />
						))}
					</ScrollView>
				) : (
					<View style={{ flex: 1 }}>
						<FlatList
							data={pagedOrders}
							keyExtractor={(item) => item.id}
							renderItem={renderItem}
							contentContainerStyle={[styles.listContent, { paddingBottom: Math.max(insets.bottom + 16, 30) }]}
							showsVerticalScrollIndicator={false}
							keyboardShouldPersistTaps="always"
							onRefresh={() => fetchOrders(true)}
							refreshing={refreshing}
							onEndReached={handleLoadMore}
							onEndReachedThreshold={0.4}
							ListEmptyComponent={
								<View style={styles.emptyState}>
									<MaterialCommunityIcons name="pill" size={40} color="#b0bec5" />
									<Text style={styles.emptyTitle}>No orders found</Text>
									<Text style={styles.emptyText}>Try adjusting the search or filter settings.</Text>
								</View>
							}
							ListFooterComponent={
								visibleCount < orders.length ? (
									<View style={{ paddingVertical: 6, opacity: 0.6 }}>
										<AppSkeleton width={'100%'} height={90} borderRadius={16} />
									</View>
								) : null
							}
						/>
					</View>
				)}
			</View>
			{renderFilterModal()}
		</View>
	)
}

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────

const styles = StyleSheet.create({
	safeArea: { flex: 1, backgroundColor: '#F8FAFA' },
	content: { flex: 1 },
	contentTablet: { paddingHorizontal: 24, paddingTop: 20 },
	centeredFull: { flex: 1, alignItems: 'center', justifyContent: 'center' },
	listContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 30 },
	groupTitle: {
		color: '#9aa1a5',
		fontSize: 12,
		fontWeight: '500',
		marginBottom: 8,
		marginTop: 4,
	},
	// Order card
	orderCard: {
		backgroundColor: '#ffffff',
		borderRadius: 16,
		flexDirection: 'row',
		alignItems: 'stretch',
		borderWidth: 1,
		borderColor: '#F2F4F7',
		shadowColor: '#101828',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.03,
		shadowRadius: 10,
		elevation: 2,
		marginBottom: 14,
	},
	cardMainContent: {
		flex: 1,
		paddingVertical: 14,
		paddingLeft: 16,
		paddingRight: 4,
	},
	cardHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 12,
	},
	pharmacyTitleContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
		marginRight: 8,
	},
	pharmacyIcon: { marginRight: 6 },
	pharmacyName: { fontSize: 15, fontWeight: '700', color: '#1D2939' },
	statusBadge: {
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
	},
	statusText: { fontSize: 10, fontWeight: '700' },
	detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
	rowIcon: { marginRight: 8 },
	detailText: { fontSize: 13, color: '#475467' },
	boldText: { fontWeight: '900', color: '#344054' },
	cardFooter: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginTop: 8,
		paddingTop: 10,
		borderTopWidth: 1,
		borderTopColor: '#F2F4F7',
	},
	deliveryBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 6,
		gap: 4,
	},
	badgeHome: { backgroundColor: '#E3F2FD' },
	badgePickup: { backgroundColor: '#E8F5E9' },
	deliveryBadgeText: { fontSize: 11, fontWeight: '600' },
	priceContainer: { alignItems: 'flex-end' },
	priceLabel: { fontSize: 10, color: '#667085', marginBottom: 1 },
	priceTag: { fontSize: 14, fontWeight: '700', color: '#101828' },
	chevronContainer: { width: 32, alignItems: 'center', justifyContent: 'center' },
	// Empty state
	emptyState: { alignItems: 'center', paddingVertical: 40, gap: 8 },
	emptyTitle: { color: '#536167', fontSize: 16, fontWeight: '700' },
	emptyText: { color: '#8b969b', fontSize: 12, textAlign: 'center' },
	// Filter section
	filterRowWide: { flexDirection: 'row', alignItems: 'center', flexWrap: 'nowrap', gap: 12, width: '100%' },
	filterGridMobile: { gap: 8 },
	outlinedFilterWrap: { height: 56, justifyContent: 'center', position: 'relative', flexShrink: 1 },
	outlinedFilterLabel: {
		position: 'absolute',
		top: -1,
		left: 14,
		zIndex: 2,
		backgroundColor: '#f4f4f4',
		paddingHorizontal: 5,
	},
	outlinedFilterLabelText: { fontSize: 12, lineHeight: 16, color: '#46627d' },
	inlineSelectFill: { width: '100%', marginBottom: 0 },
	inlineFilterSelect: { height: 50, borderRadius: 8, backgroundColor: '#ffffff' },
	compactFilterSelectWrap: { flexGrow: 1, flexShrink: 1, flexBasis: 112, minWidth: 104 },
	// Filter modal
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
	filterGroup: { gap: 10 },
	filterGroupLabel: { fontSize: 11, lineHeight: 14, fontWeight: '800', color: '#64707d', textTransform: 'uppercase' },
	filterChipScroller: { marginHorizontal: -2 },
	filterChipRow: { flexDirection: 'row', flexWrap: 'nowrap', gap: 10, paddingHorizontal: 2, paddingVertical: 1 },
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
	filterChipActive: { backgroundColor: '#1f5f68' },
	filterChipText: { fontSize: 12, lineHeight: 16, fontWeight: '700', color: '#64707d' },
	filterChipTextActive: { color: '#ffffff' },
	dateRangeWrap: { gap: 10, marginTop: 10 },
	dateRangeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
	dateRangeField: {
		flex: 1,
		minWidth: 0,
		height: 52,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#e5eaef',
		backgroundColor: '#ffffff',
		paddingHorizontal: 14,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	dateRangeText: { fontSize: 13, fontWeight: '600', color: '#111827', flex: 1 },
	dateRangePlaceholder: { color: '#94a3b8', fontWeight: '400' },
	dateRangeDivider: { width: 12, height: 1, backgroundColor: '#94a3b8' },
	datePickerWrap: { marginTop: 6, backgroundColor: '#ffffff', borderRadius: 8, padding: 4 },
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
	paginationWrap: {
		paddingVertical: 10,
		borderTopWidth: 1,
		borderTopColor: '#e5eaef',
		backgroundColor: 'transparent',
	},
	mobilePaginationWrap: { paddingVertical: 6 },
	// Additional: rejection reason badge
	reasonBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#FFE8E8',
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 8,
		marginBottom: 8,
		alignSelf: 'flex-start',
	},
	reasonText: {
		fontSize: 11,
		color: '#D94B4B',
		marginLeft: 4,
	},
	// Additional: address text
	addressText: {
		fontSize: 12,
		color: '#667085',
		marginTop: 8,
		marginLeft: 2,
	},
})
