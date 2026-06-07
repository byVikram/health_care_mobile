import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
	ActivityIndicator,
	Animated,
	FlatList,
	Image,
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
import { useNavigation, useRoute } from '@react-navigation/native'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import Toast from 'react-native-toast-message'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { BlurView } from 'expo-blur'
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker'

import { AppSelect, AppSelectOption, AppTypography } from '../../components/common'
import PaginationBar from '../../components/common/AppPagination'
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
	delivery_type?: string
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

	if (typeof response === 'object' && 'data' in (response as object) && Array.isArray((response as any).data)) {
		return (response as any).data
	}

	if (Array.isArray(response)) {
		return response
	}

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
		const yesterday = new Date(today)
		yesterday.setDate(today.getDate() - 1)
		const yestStr = formatApiDate(yesterday)
		params.start_date = yestStr
		params.end_date = yestStr
		return
	}

	if (filter === 'tomorrow') {
		const tomorrow = new Date(today)
		tomorrow.setDate(today.getDate() + 1)
		const tomStr = formatApiDate(tomorrow)
		params.start_date = tomStr
		params.end_date = tomStr
		return
	}

	const days = filter === 'last_30_days' ? 30 : 7
	const startDate = new Date(today)
	startDate.setDate(today.getDate() - (days - 1))
	params.start_date = formatApiDate(startDate)
	params.end_date = endDate
}

// ─────────────────────────────────────────────
// OrderCard
// ─────────────────────────────────────────────

const OrderCard = React.memo(function OrderCard({ order, onPress }: { order: OrderItem; onPress: () => void }) {
	const statusStyle = STATUS_STYLES[order.status] ?? STATUS_STYLES.Pending
	const isHomeDelivery = order.raw?.delivery_type === 'home_delivery'

	return (
		<TouchableOpacity style={styles.orderCard} onPress={onPress} activeOpacity={0.85}>
			<View style={styles.cardMainContent}>
				{/* Top Row: Pharmacy/Clinic info & Status badge */}
				<View style={styles.cardHeader}>
					<View style={styles.pharmacyTitleContainer}>
						<MaterialCommunityIcons name="storefront-outline" size={18} color="#1f5f68" style={styles.pharmacyIcon} />
						<Text numberOfLines={1} style={styles.pharmacyName}>
							{order.doctor}
						</Text>
					</View>
					<View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
						<Text style={[styles.statusText, { color: statusStyle.text }]}>{order.status}</Text>
					</View>
				</View>

				{/* Patient Row */}
				<View style={styles.detailRow}>
					<MaterialCommunityIcons name="account-outline" size={15} color="#667085" style={styles.rowIcon} />
					<Text style={styles.detailText} numberOfLines={1}>
						Patient: <Text style={styles.boldText}>{order.name}</Text>
					</Text>
				</View>

				{/* Date & Time Row */}
				<View style={styles.detailRow}>
					<MaterialCommunityIcons name="calendar-clock-outline" size={15} color="#667085" style={styles.rowIcon} />
					<Text style={styles.detailText} numberOfLines={1}>
						{order.date} • {order.time}
					</Text>
				</View>

				{/* Footer Row: Delivery Mode & Total Bill */}
				<View style={styles.cardFooter}>
					<View style={[styles.deliveryBadge, isHomeDelivery ? styles.badgeHome : styles.badgePickup]}>
						<MaterialCommunityIcons
							name={isHomeDelivery ? "truck-delivery-outline" : "store-outline"}
							size={13}
							color={isHomeDelivery ? "#0D47A1" : "#1B5E20"}
						/>
						<Text style={[styles.deliveryBadgeText, { color: isHomeDelivery ? "#0D47A1" : "#1B5E20" }]}>
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
			</View>

			{/* Subtle right chevron */}
			<View style={styles.chevronContainer}>
				<MaterialCommunityIcons name="chevron-right" size={20} color="#98A2B3" />
			</View>
		</TouchableOpacity>
	)
})

// ─────────────────────────────────────────────
// Main screen
// ─────────────────────────────────────────────

export default function OrderListPage() {
	const navigation = useNavigation<any>()
	const route = useRoute<any>()
	const insets = useSafeAreaInsets()
	const { width, height } = useWindowDimensions()
	const useInlineFilters = width >= 768

	const [orders, setOrders] = useState<OrderItem[]>([])
	const [loading, setLoading] = useState(false)
	const [refreshing, setRefreshing] = useState(false)

	// Pagination state
	const [page, setPage] = useState(1)
	const [pageSize, setPageSize] = useState(10)
	const [apiMeta, setApiMeta] = useState<{ total: number; page: number; limit: number; pages: number } | null>(null)

	// Filter state
	const [searchQuery, setSearchQuery] = useState('')
	const [debouncedSearch, setDebouncedSearch] = useState('')
	const [statusFilter, setStatusFilter] = useState(route.params?.status ?? 'all')

	// Sync status filter from navigation route params
	useEffect(() => {
		if (route.params?.status) {
			setStatusFilter(route.params.status)
		}
	}, [route.params?.status])

	const [dateFilter, setDateFilter] = useState('all')
	const [fromDateFilter, setFromDateFilter] = useState('')
	const [toDateFilter, setToDateFilter] = useState('')

	// Mobile filter sheet draft states
	const [draftStatusFilter, setDraftStatusFilter] = useState('all')
	const [draftDateFilter, setDraftDateFilter] = useState('all')
	const [draftFromDateFilter, setDraftFromDateFilter] = useState('')
	const [draftToDateFilter, setDraftToDateFilter] = useState('')

	const [filterModalVisible, setFilterModalVisible] = useState(false)
	const [activeDatePicker, setActiveDatePicker] = useState<'from' | 'to' | null>(null)

	const filterSheetAnim = useRef(new Animated.Value(0)).current
	const filterBackdropAnim = useRef(new Animated.Value(0)).current

	// Search Debounce Effect
	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedSearch(searchQuery)
		}, 300)
		return () => clearTimeout(timer)
	}, [searchQuery])

	// Reset page to 1 when filters or search change
	useEffect(() => {
		setPage(1)
	}, [debouncedSearch, statusFilter, dateFilter, fromDateFilter, toDateFilter, pageSize])

	// ── Fetch orders ───────────────────────────────────────────────

	const fetchOrders = useCallback(async (isRefresh = false) => {
		try {
			isRefresh ? setRefreshing(true) : setLoading(true)

			const params: Record<string, any> = {
				page,
				limit: pageSize,
			}

			if (statusFilter !== 'all') {
				params.status = statusFilter
			}

			if (debouncedSearch.trim().length > 0) {
				params.search = debouncedSearch.trim()
			}

			applyDateFilterParams(params, dateFilter, fromDateFilter, toDateFilter)

			const response = (await getPharmacyOrders(params)) as any
			const apiOrders = extractOrders(response)

			setOrders(apiOrders.map(mapOrderToItem))

			if (response && response.meta) {
				setApiMeta({
					total: response.meta.total ?? apiOrders.length,
					page: response.meta.page ?? page,
					limit: response.meta.limit ?? pageSize,
					pages: response.meta.pages ?? 1,
				})
			} else {
				setApiMeta(null)
			}
		} catch (error) {
			console.error('[OrderListPage] fetchOrders error:', error)
			Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to load pharmacy orders' })
		} finally {
			isRefresh ? setRefreshing(false) : setLoading(false)
		}
	}, [page, pageSize, statusFilter, debouncedSearch, dateFilter, fromDateFilter, toDateFilter])

	useEffect(() => {
		fetchOrders()
	}, [fetchOrders])

	// ── Navigate to order detail ───────────────────────────────────────

	const handleOrderPress = useCallback(
		(order: OrderItem) => {
			navigation.navigate('OrderDetails', { orderId: order.id, order: order.raw })
		},
		[navigation]
	)

	// ── Render rows ────────────────────────────────────────────

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

	// ── Mobile Modal Actions ───────────────────────────────────────────

	const openFilterModal = () => {
		setDraftStatusFilter(statusFilter)
		setDraftDateFilter(dateFilter)
		setDraftFromDateFilter(fromDateFilter)
		setDraftToDateFilter(toDateFilter)
		setFilterModalVisible(true)
		filterSheetAnim.setValue(0)
		filterBackdropAnim.setValue(0)
		Animated.parallel([
			Animated.timing(filterSheetAnim, {
				toValue: 1,
				duration: 260,
				useNativeDriver: true,
			}),
			Animated.timing(filterBackdropAnim, {
				toValue: 1,
				duration: 220,
				useNativeDriver: true,
			}),
		]).start()
	}

	const closeFilterModal = () => {
		setActiveDatePicker(null)
		Animated.parallel([
			Animated.timing(filterSheetAnim, {
				toValue: 0,
				duration: 220,
				useNativeDriver: true,
			}),
			Animated.timing(filterBackdropAnim, {
				toValue: 0,
				duration: 180,
				useNativeDriver: true,
			}),
		]).start(({ finished }) => {
			if (finished) setFilterModalVisible(false)
		})
	}

	const applyFilters = () => {
		if (draftDateFilter === 'custom' && draftFromDateFilter && draftToDateFilter) {
			const fromDate = new Date(draftFromDateFilter)
			const toDate = new Date(draftToDateFilter)
			if (fromDate > toDate) {
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

		const nextValue = formatApiDate(selectedDate)
		if (activeDatePicker === 'from') {
			setDraftFromDateFilter(nextValue)
		} else {
			setDraftToDateFilter(nextValue)
		}
		setDraftDateFilter('custom')
	}

	// ── Render Filter Components ───────────────────────────────────────

	const renderFilterChips = (
		options: AppSelectOption[],
		value: string,
		onChange: (nextValue: string) => void
	) => (
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
				{value ? value : label}
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
								? (draftFromDateFilter ? new Date(draftFromDateFilter) : new Date())
								: (draftToDateFilter ? new Date(draftToDateFilter) : new Date())
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
		const translateY = filterSheetAnim.interpolate({
			inputRange: [0, 1],
			outputRange: [420, 0],
		})
		const backdropOpacity = filterBackdropAnim.interpolate({
			inputRange: [0, 1],
			outputRange: [0, 1],
		})

		return (
			<Modal
				visible={filterModalVisible}
				transparent
				animationType="none"
				onRequestClose={closeFilterModal}
			>
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

	const searchInput = (
		<View style={[styles.searchBox, !useInlineFilters && styles.searchBoxMobile, useInlineFilters && styles.searchBoxWide]}>
			<MaterialCommunityIcons name="magnify" size={21} color="#9aa0a6" />
			<TextInput
				value={searchQuery}
				onChangeText={setSearchQuery}
				placeholder="Search Patient, Order ID..."
				placeholderTextColor="#9aa4af"
				style={styles.searchInput}
			/>
			{searchQuery.length > 0 && (
				<TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
					<MaterialCommunityIcons name="close-circle" size={18} color="#8b9aa2" />
				</TouchableOpacity>
			)}
		</View>
	)

	const mobileFilterButton = (
		<TouchableOpacity
			style={[
				styles.filterIconButton,
				(statusFilter !== 'all' || dateFilter !== 'all') && styles.filterIconButtonActive,
			]}
			onPress={openFilterModal}
			activeOpacity={0.84}
		>
			<MaterialCommunityIcons name="tune" size={23} color="#1f5f68" />
		</TouchableOpacity>
	)

	const renderInlineFilter = (label: string, child: React.ReactNode, style?: any) => (
		<View style={[styles.outlinedFilterWrap, style]}>
			<View pointerEvents="none" style={styles.outlinedFilterLabel}>
				<AppTypography style={styles.outlinedFilterLabelText}>{label}</AppTypography>
			</View>
			{child}
		</View>
	)

	const statusSelect = renderInlineFilter(
		'Status',
		<AppSelect
			options={STATUS_OPTIONS}
			value={statusFilter}
			onSelect={(value) => setStatusFilter(value)}
			placeholder="Status"
			size="small"
			style={styles.inlineSelectFill}
			customCardStyle={styles.inlineFilterSelect}
			borderColor="#c8ced6"
			maxDropdownHeight={220}
		/>,
		styles.compactFilterSelectWrap
	)

	const dateSelect = renderInlineFilter(
		'Date',
		<AppSelect
			options={DATE_OPTIONS}
			value={dateFilter}
			onSelect={(value) => setDateFilter(value)}
			placeholder="Date"
			size="small"
			style={styles.inlineSelectFill}
			customCardStyle={styles.inlineFilterSelect}
			borderColor="#c8ced6"
			maxDropdownHeight={220}
		/>,
		styles.compactFilterSelectWrap
	)

	// ── Render ─────────────────────────────────────────────────────────

	return (
		<View style={styles.safeArea}>
			<View style={styles.content}>
				<View style={styles.filtersSection}>
					{useInlineFilters ? (
						<View style={styles.filterRowWide}>
							{dateSelect}
							{statusSelect}
							{searchInput}
						</View>
					) : (
						<View style={styles.mobileSearchRow}>
							<View style={{ flex: 1 }}>{searchInput}</View>
							{mobileFilterButton}
						</View>
					)}
				</View>

				{loading && !refreshing ? (
					<View style={styles.centeredFull}>
						<ActivityIndicator size="large" color="#1f5f68" />
					</View>
				) : (
					<View style={{ flex: 1 }}>
						<FlatList
							data={orders}
							keyExtractor={(item) => item.id}
							renderItem={renderItem}
							contentContainerStyle={styles.listContent}
							showsVerticalScrollIndicator={false}
							keyboardShouldPersistTaps="always"
							onRefresh={() => fetchOrders(true)}
							refreshing={refreshing}
							ListEmptyComponent={
								<View style={styles.emptyState}>
									<MaterialCommunityIcons name="pill" size={40} color="#b0bec5" />
									<Text style={styles.emptyTitle}>No orders found</Text>
									<Text style={styles.emptyText}>Try adjusting the search or filter settings.</Text>
								</View>
							}
						/>
						{apiMeta && apiMeta.total > 0 ? (
							<View style={[styles.paginationWrap, !useInlineFilters && styles.mobilePaginationWrap, { paddingBottom: Math.max(insets.bottom + 8, 16) }]}>
								<PaginationBar
									page={page}
									pageSize={pageSize}
									totalRows={apiMeta.total}
									pageSizeOptions={[10, 20, 50]}
									onPageChange={(nextPage) => setPage(nextPage)}
									onPageSizeChange={(nextSize) => {
										setPageSize(nextSize)
										setPage(1)
									}}
								/>
							</View>
						) : null}
					</View>
				)}
			</View>
			{!useInlineFilters && renderFilterModal()}
		</View>
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
	pharmacyIcon: {
		marginRight: 6,
	},
	pharmacyName: {
		fontSize: 15,
		fontWeight: '700',
		color: '#1D2939',
	},
	statusBadge: {
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
	},
	statusText: {
		fontSize: 10,
		fontWeight: '700',
	},
	detailRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 8,
	},
	rowIcon: {
		marginRight: 8,
	},
	detailText: {
		fontSize: 13,
		color: '#475467',
	},
	boldText: {
		fontWeight: '600',
		color: '#344054',
	},
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
	badgeHome: {
		backgroundColor: '#E3F2FD',
	},
	badgePickup: {
		backgroundColor: '#E8F5E9',
	},
	deliveryBadgeText: {
		fontSize: 11,
		fontWeight: '600',
	},
	priceContainer: {
		alignItems: 'flex-end',
	},
	priceLabel: {
		fontSize: 10,
		color: '#667085',
		marginBottom: 1,
	},
	priceTag: {
		fontSize: 14,
		fontWeight: '700',
		color: '#101828',
	},
	chevronContainer: {
		width: 32,
		alignItems: 'center',
		justifyContent: 'center',
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
	filtersSection: {
		marginBottom: 10,
	},
	filterRowWide: {
		flexDirection: 'row',
		alignItems: 'center',
		flexWrap: 'nowrap',
		gap: 12,
		width: '100%',
	},
	filterGridMobile: {
		gap: 8,
	},
	mobileSearchRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	searchBox: {
		height: 48,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#e5eaef',
		backgroundColor: '#ffffff',
		paddingHorizontal: 16,
		flexDirection: 'row',
		alignItems: 'center',
		width: '100%',
	},
	searchBoxWide: {
		height: 50,
		flexGrow: 2.2,
		flexShrink: 1,
		flexBasis: 190,
		minWidth: 170,
		borderColor: '#d8dee6',
		borderRadius: 8,
	},
	searchBoxMobile: {
		height: 44,
		width: '100%',
		borderRadius: 8,
		paddingHorizontal: 12,
	},
	searchInput: {
		flex: 1,
		height: '100%',
		paddingHorizontal: 12,
		fontSize: 16,
		color: '#111827',
	},
	outlinedFilterWrap: {
		height: 56,
		justifyContent: 'center',
		position: 'relative',
		flexShrink: 1,
	},
	outlinedFilterLabel: {
		position: 'absolute',
		top: -1,
		left: 14,
		zIndex: 2,
		backgroundColor: '#f4f4f4',
		paddingHorizontal: 5,
	},
	outlinedFilterLabelText: {
		fontSize: 12,
		lineHeight: 16,
		color: '#46627d',
	},
	inlineSelectFill: {
		width: '100%',
		marginBottom: 0,
	},
	inlineFilterSelect: {
		height: 50,
		borderRadius: 8,
		backgroundColor: '#ffffff',
	},
	compactFilterSelectWrap: {
		flexGrow: 1,
		flexShrink: 1,
		flexBasis: 112,
		minWidth: 104,
	},
	filterIconButton: {
		width: 48,
		height: 44,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#e5eaef',
		backgroundColor: '#ffffff',
		alignItems: 'center',
		justifyContent: 'center',
		flexShrink: 0,
		padding: 0,
	},
	filterIconButtonActive: {
		backgroundColor: '#e9f8f7',
		borderColor: '#1f5f68',
	},
	filterModalRoot: {
		flex: 1,
		justifyContent: 'flex-end',
		alignItems: 'center',
	},
	filterBackdrop: {
		...StyleSheet.absoluteFillObject,
	},
	filterDim: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: 'rgba(15, 23, 42, 0.34)',
	},
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
	filterSheetTitle: {
		fontSize: 18,
		lineHeight: 24,
		fontWeight: '700',
		color: '#111827',
	},
	filterCloseButton: {
		width: 36,
		height: 36,
		borderRadius: 18,
		alignItems: 'center',
		justifyContent: 'center',
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
		color: '#64707d',
		textTransform: 'uppercase',
	},
	filterChipScroller: {
		marginHorizontal: -2,
	},
	filterChipRow: {
		flexDirection: 'row',
		flexWrap: 'nowrap',
		gap: 10,
		paddingHorizontal: 2,
		paddingVertical: 1,
	},
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
	filterChipActive: {
		backgroundColor: '#1f5f68',
	},
	filterChipText: {
		fontSize: 12,
		lineHeight: 16,
		fontWeight: '700',
		color: '#64707d',
	},
	filterChipTextActive: {
		color: '#ffffff',
	},
	dateRangeWrap: {
		gap: 10,
		marginTop: 10,
	},
	dateRangeRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
	},
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
	dateRangeText: {
		fontSize: 13,
		fontWeight: '600',
		color: '#111827',
		flex: 1,
	},
	dateRangePlaceholder: {
		color: '#94a3b8',
		fontWeight: '400',
	},
	dateRangeDivider: {
		width: 12,
		height: 1,
		backgroundColor: '#94a3b8',
	},
	datePickerWrap: {
		marginTop: 6,
		backgroundColor: '#ffffff',
		borderRadius: 8,
		padding: 4,
	},
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
	resetButtonText: {
		fontSize: 14,
		fontWeight: '700',
		color: '#64707d',
	},
	applyButton: {
		flex: 2,
		height: 48,
		borderRadius: 24,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#1f5f68',
	},
	applyButtonText: {
		fontSize: 14,
		fontWeight: '700',
		color: '#ffffff',
	},
	paginationWrap: {
		paddingVertical: 10,
		borderTopWidth: 1,
		borderTopColor: '#e5eaef',
		backgroundColor: 'transparent',
	},
	mobilePaginationWrap: {
		paddingVertical: 6,
	},
})
