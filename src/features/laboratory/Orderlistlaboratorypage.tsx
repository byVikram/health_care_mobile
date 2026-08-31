// src/features/laboratory/OrderListLaboratoryPage.tsx
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
import { useAuth } from '../../context/AuthContext'
import { ROUTES } from '../../navigation/routes'
import { getLabBookings } from './laboratoryService'
import { getStatusStyle } from '../../constants/statusColors'
import type { LabBooking } from './laboratory'
import { formatDateForApi, formatGroupDateDisplay, formatShortDateDisplay } from '../../utils/date'
import BookingsSearchBar from '../bookings/components/BookingsSearchBar'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

// Matches actual API status values
export type LabBookingStatus =
	| 'Pending Quote'
	| 'Pending Payment'
	| 'Confirmed'
	| 'Sample Collected'
	| 'Report Ready'
	| 'Completed'
	| 'Cancelled'

type BookingRow = {
	id: string
	bookingRef: string
	group: string
	primaryName: string
	testSummary: string
	date: string
	time: string
	status: LabBookingStatus
	collectionType: 'walk_in' | 'home_collection'
	totalAmount: number | null
	paymentStatus: string
	raw: LabBooking
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

// Values match the backend `status` query param exactly
const STATUS_OPTIONS: AppSelectOption[] = [
	{ label: 'All', value: 'all' },
	{ label: 'Pending Quote', value: 'pending_quote' },
	{ label: 'Pending Payment', value: 'pending_payment' },
	{ label: 'Confirmed', value: 'confirmed' },
	{ label: 'Sample Collected', value: 'sample_collected' },
	{ label: 'Report Ready', value: 'report_ready' },
	{ label: 'Completed', value: 'completed' },
	{ label: 'Cancelled', value: 'cancelled' },
]

// ─────────────────────────────────────────────
// Skeleton
// ─────────────────────────────────────────────

const BookingCardSkeleton = () => (
	<View style={styles.orderCard}>
		<View style={styles.cardMainContent}>
			<AppSkeleton width={160} height={18} borderRadius={6} style={{ marginBottom: 14 }} />
			<AppSkeleton width={120} height={14} borderRadius={6} style={{ marginBottom: 10 }} />
			<AppSkeleton width={'100%'} height={40} borderRadius={8} style={{ marginBottom: 12 }} />
			<View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
				<AppSkeleton width={90} height={24} borderRadius={12} />
				<AppSkeleton width={80} height={18} borderRadius={6} />
			</View>
		</View>
	</View>
)

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

const normalizeStatus = (status: string): LabBookingStatus => {
	switch (status?.toLowerCase()) {
		case 'pending_quote':
			return 'Pending Quote'
		case 'pending_payment':
			return 'Pending Payment'
		case 'confirmed':
			return 'Confirmed'
		case 'sample_collected':
			return 'Sample Collected'
		case 'report_ready':
			return 'Report Ready'
		case 'completed':
			return 'Completed'
		case 'cancelled':
		case 'rejected':
			return 'Cancelled'
		default:
			return 'Pending Quote'
	}
}

const buildTestSummary = (booking: LabBooking): string => {
	const names = booking.booking_items
		.map((item) => item.custom_test_name || item.test_name)
		.filter(Boolean)
	return names.length > 0 ? names.join(', ') : 'Test details unavailable'
}

const mapBookingToRow = (booking: LabBooking, isLabViewer: boolean): BookingRow => ({
	id: booking.public_id,
	bookingRef: booking.public_id.slice(0, 8).toUpperCase(),
	group: formatGroupDateDisplay(booking.created_at),
	primaryName: isLabViewer ? booking.patient_name : booking.laboratory_name,
	testSummary: buildTestSummary(booking),
	date: formatShortDateDisplay(booking.booking_date),
	time: booking.booking_time,
	status: normalizeStatus(booking.status),
	collectionType: booking.collection_type,
	totalAmount: booking.total_price,
	paymentStatus: booking.payment_status,
	raw: booking,
})

const matchesDateFilter = (bookingDate: string, filter: string, from?: string, to?: string): boolean => {
	if (filter === 'all') return true
	const today = formatDateForApi(new Date())

	if (filter === 'today') return bookingDate === today
	if (filter === 'yesterday') {
		const d = new Date()
		d.setDate(d.getDate() - 1)
		return bookingDate === formatDateForApi(d)
	}
	if (filter === 'tomorrow') {
		const d = new Date()
		d.setDate(d.getDate() + 1)
		return bookingDate === formatDateForApi(d)
	}
	if (filter === 'last_7_days' || filter === 'last_30_days') {
		const days = filter === 'last_30_days' ? 30 : 7
		const start = new Date()
		start.setDate(start.getDate() - (days - 1))
		return bookingDate >= formatDateForApi(start) && bookingDate <= today
	}
	if (filter === 'custom') {
		if (from && bookingDate < from) return false
		if (to && bookingDate > to) return false
		return true
	}
	return true
}

// ─────────────────────────────────────────────
// BookingCard
// ─────────────────────────────────────────────

interface BookingCardProps {
	booking: BookingRow
	onPress: () => void
	isLabViewer: boolean
}

const BookingCard = React.memo(function BookingCard({ booking, onPress, isLabViewer }: BookingCardProps) {
	const statusStyle = getStatusStyle(booking.status)

	return (
		<TouchableOpacity style={styles.orderCard} onPress={onPress} activeOpacity={0.85}>
			<View style={styles.cardMainContent}>
				<View style={styles.cardHeader}>
					<View style={styles.titleContainer}>
						<MaterialCommunityIcons
							name={isLabViewer ? 'account-outline' : 'flask-outline'}
							size={18}
							color="#2B6F71"
							style={styles.titleIcon}
						/>
						<Text numberOfLines={1} style={styles.primaryName}>
							{booking.primaryName}
						</Text>
					</View>
					<View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
						<Text style={[styles.statusText, { color: statusStyle.text }]}>{booking.status}</Text>
					</View>
				</View>

				<View style={styles.detailRow}>
					<MaterialCommunityIcons
						name="calendar-clock-outline"
						size={15}
						color="#667085"
						style={styles.rowIcon}
					/>
					<Text style={styles.detailText} numberOfLines={1}>
						{booking.date} • {booking.time}
					</Text>
				</View>

				<View style={styles.detailRow}>
					<MaterialCommunityIcons name="flask-outline" size={15} color="#667085" style={styles.rowIcon} />
					<Text style={styles.detailText} numberOfLines={2}>
						{booking.testSummary}
					</Text>
				</View>

				<View style={styles.detailRow}>
					<MaterialCommunityIcons
						name={booking.collectionType === 'home_collection' ? 'home-map-marker' : 'walk'}
						size={15}
						color="#667085"
						style={styles.rowIcon}
					/>
					<Text style={styles.detailText}>
						{booking.collectionType === 'home_collection' ? 'Home Collection' : 'Walk-in'}
					</Text>
				</View>

				<View style={styles.cardFooter}>
					<View
						style={[
							styles.paymentBadge,
							booking.paymentStatus === 'paid' ? styles.badgePaid : styles.badgePending,
						]}
					>
						<MaterialCommunityIcons
							name={booking.paymentStatus === 'paid' ? 'check-circle-outline' : 'clock-outline'}
							size={13}
							color={booking.paymentStatus === 'paid' ? '#1B5E20' : '#9A6700'}
						/>
						<Text
							style={[
								styles.paymentBadgeText,
								{ color: booking.paymentStatus === 'paid' ? '#1B5E20' : '#9A6700' },
							]}
						>
							{booking.paymentStatus === 'paid' ? 'Paid' : 'Payment Pending'}
						</Text>
					</View>

					<View style={styles.priceContainer}>
						<Text style={styles.priceLabel}>Total</Text>
						<Text style={styles.priceTag}>
							{booking.totalAmount != null
								? `₹${booking.totalAmount.toFixed(2)}`
								: 'Awaiting Quote'}
						</Text>
					</View>
				</View>

				<Text style={styles.refText} numberOfLines={1}>
					Ref: {booking.bookingRef}
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

interface OrderListLaboratoryPageProps {
	embedded?: boolean
	searchQuery?: string
	statusFilter?: string
	dateFilter?: string
	fromDateFilter?: string
	toDateFilter?: string
}

export default function OrderListLaboratoryPage({
	embedded = false,
	searchQuery: propSearchQuery,
	statusFilter: propStatusFilter,
	dateFilter: propDateFilter,
	fromDateFilter: propFromDateFilter,
	toDateFilter: propToDateFilter,
}: OrderListLaboratoryPageProps = {}) {
	const navigation = useNavigation<any>()
	const route = useRoute<any>()
	const insets = useSafeAreaInsets()
	const { width, height } = useWindowDimensions()
	const isTablet = width >= 768

	const { role, accessToken } = useAuth()
	const isLabViewer = role === 'laboratory'

	const [allBookings, setAllBookings] = useState<LabBooking[]>([])
	const [loading, setLoading] = useState(false)
	const [refreshing, setRefreshing] = useState(false)

	const PAGE_SIZE = 10
	const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

	const [searchQuery, setSearchQuery] = useState(propSearchQuery ?? '')
	const [debouncedSearch, setDebouncedSearch] = useState(propSearchQuery ?? '')
	const [statusFilter, setStatusFilter] = useState(propStatusFilter ?? route.params?.status ?? 'all')
	const [dateFilter, setDateFilter] = useState(propDateFilter ?? 'all')
	const [fromDateFilter, setFromDateFilter] = useState(propFromDateFilter ?? '')
	const [toDateFilter, setToDateFilter] = useState(propToDateFilter ?? '')

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
		if (propSearchQuery !== undefined) {
			setSearchQuery(propSearchQuery)
			setDebouncedSearch(propSearchQuery)
		}
		if (propStatusFilter !== undefined) setStatusFilter(propStatusFilter)
		if (propDateFilter !== undefined) setDateFilter(propDateFilter)
		if (propFromDateFilter !== undefined) setFromDateFilter(propFromDateFilter)
		if (propToDateFilter !== undefined) setToDateFilter(propToDateFilter)
		setVisibleCount(PAGE_SIZE)
	}, [embedded, propSearchQuery, propStatusFilter, propDateFilter, propFromDateFilter, propToDateFilter])

	useEffect(() => {
		if (!embedded && route.params?.status) setStatusFilter(route.params.status)
	}, [embedded, route.params?.status])

	// Debounce search input; reset page in the same timeout so page 1 is
	// always active by the time the new debouncedSearch reaches filteredRows.
	useEffect(() => {
		const t = setTimeout(() => {
			setDebouncedSearch(searchQuery)
			setVisibleCount(PAGE_SIZE)
		}, 300)
		return () => clearTimeout(t)
	}, [searchQuery])

	// ── Fetch ──────────────────────────────────────────────────────────

	const fetchBookings = useCallback(
		async (isRefresh = false) => {
			try {
				isRefresh ? setRefreshing(true) : setLoading(true)
				const status = statusFilter !== 'all' ? statusFilter : undefined
				const data = await getLabBookings(status)
				setAllBookings(data)
			} catch (error: any) {
				Toast.show({
					type: 'error',
					text1: 'Error',
					text2: error?.message || 'Failed to load bookings',
				})
			} finally {
				isRefresh ? setRefreshing(false) : setLoading(false)
			}
		},
		[statusFilter, accessToken]
	)

	useEffect(() => {
		fetchBookings()
	}, [fetchBookings])

	// ── Derived rows ──────────────────────────────────────────────────

	const filteredRows = useMemo(() => {
		const q = debouncedSearch.trim().toLowerCase()
		return allBookings
			.map((b) => mapBookingToRow(b, isLabViewer))
			.filter((row) => {
				const matchesSearch =
					q.length === 0 ||
					row.primaryName.toLowerCase().includes(q) ||
					row.bookingRef.toLowerCase().includes(q) ||
					row.testSummary.toLowerCase().includes(q)
				const matchesDate = matchesDateFilter(
					row.raw.booking_date,
					dateFilter,
					fromDateFilter,
					toDateFilter
				)
				return matchesSearch && matchesDate
			})
	}, [allBookings, isLabViewer, debouncedSearch, dateFilter, fromDateFilter, toDateFilter])

	const total = filteredRows.length
	const pagedRows = useMemo(
		() => filteredRows.slice(0, visibleCount),
		[filteredRows, visibleCount]
	)

	const handleLoadMore = useCallback(() => {
		setVisibleCount((prev) => (prev >= total ? prev : Math.min(prev + PAGE_SIZE, total)))
	}, [total])

	// ── Navigate ───────────────────────────────────────────────────────

	const handleBookingPress = useCallback(
		(row: BookingRow) => {
			navigation.navigate(ROUTES.STACK.LABORATORY_ORDER_DETAILS, {
				publicId: row.id,
				booking: row.raw,
			})
		},
		[navigation]
	)

	// ── Render item ────────────────────────────────────────────────────

	const renderItem = useCallback(
		({ item, index }: { item: BookingRow; index: number }) => {
			const previous = pagedRows[index - 1]
			const showGroup = !previous || previous.group !== item.group
			return (
				<View>
					{showGroup && <Text style={styles.groupTitle}>{item.group}</Text>}
					<BookingCard
						booking={item}
						onPress={() => handleBookingPress(item)}
						isLabViewer={isLabViewer}
					/>
					<View style={{ height: 12 }} />
				</View>
			)
		},
		[pagedRows, handleBookingPress, isLabViewer]
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
				Toast.show({
					type: 'error',
					text1: 'Invalid Range',
					text2: 'From Date cannot be later than To Date.',
				})
				return
			}
		}
		// Reset visible count synchronously so the new filter set always starts
		// from the first page in the same render.
		setVisibleCount(PAGE_SIZE)
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
		// Reset visible count synchronously alongside filter state
		setVisibleCount(PAGE_SIZE)
		setStatusFilter('all')
		setDateFilter('all')
		setFromDateFilter('')
		setToDateFilter('')
	}

	const handleDateRangeChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
		if (Platform.OS === 'android') setActiveDatePicker(null)
		if (event.type === 'dismissed' || !selectedDate || !activeDatePicker) return
		const val = formatDateForApi(selectedDate)
		activeDatePicker === 'from' ? setDraftFromDateFilter(val) : setDraftToDateFilter(val)
		setDraftDateFilter('custom')
	}

	// ── Filter chip row ────────────────────────────────────────────────

	const renderFilterChips = (
		options: AppSelectOption[],
		value: string,
		onChange: (v: string) => void
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
						<AppTypography
							style={[styles.filterChipText, selected && styles.filterChipTextActive]}
						>
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
			<AppTypography
				style={[styles.dateRangeText, !value && styles.dateRangePlaceholder]}
				numberOfLines={1}
			>
				{value || label}
			</AppTypography>
			<MaterialCommunityIcons name="calendar-month-outline" size={20} color="#2B6F71" />
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
						display={
							Platform.OS === 'ios'
								? 'inline'
								: Platform.OS === 'android'
									? 'calendar'
									: 'default'
						}
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
								<AppTypography style={styles.filterGroupLabel}>Booking Status</AppTypography>
								{renderFilterChips(STATUS_OPTIONS, draftStatusFilter, setDraftStatusFilter)}
							</View>
						</ScrollView>

						<View style={styles.filterSheetActions}>
							<TouchableOpacity
								style={styles.resetButton}
								onPress={resetFilters}
								activeOpacity={0.82}
							>
								<AppTypography style={styles.resetButtonText}>Reset</AppTypography>
							</TouchableOpacity>
							<TouchableOpacity
								style={styles.applyButton}
								onPress={applyFilters}
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

	// ── Render ─────────────────────────────────────────────────────────

	return (
		<View style={styles.safeArea}>
			<View style={styles.content}>
				{!embedded && (
					<BookingsSearchBar
						value={searchQuery}
						onChangeText={setSearchQuery}
						placeholder={isLabViewer ? 'Search Patient, Reference...' : 'Search Lab, Test, Reference...'}
						onFilterPress={openFilterModal}
						filterActive={statusFilter !== 'all' || dateFilter !== 'all'}
						accessibilityLabel="Filter lab orders"
					/>
				)}

				{loading && !refreshing ? (
					<ScrollView
						contentContainerStyle={styles.listContent}
						showsVerticalScrollIndicator={false}
					>
						{[1, 2, 3, 4, 5].map((item) => (
							<BookingCardSkeleton key={item} />
						))}
					</ScrollView>
				) : (
					<View style={{ flex: 1 }}>
						<FlatList
							data={pagedRows}
							keyExtractor={(item) => item.id}
							renderItem={renderItem}
							contentContainerStyle={[styles.listContent, { paddingBottom: Math.max(insets.bottom + 16, 30) }]}
							showsVerticalScrollIndicator={false}
							keyboardShouldPersistTaps="always"
							onRefresh={() => fetchBookings(true)}
							refreshing={refreshing}
							onEndReached={handleLoadMore}
							onEndReachedThreshold={0.4}
							ListEmptyComponent={
								<View style={styles.emptyState}>
									<MaterialCommunityIcons name="flask-outline" size={40} color="#b0bec5" />
									<Text style={styles.emptyTitle}>No bookings found</Text>
									<Text style={styles.emptyText}>
										Try adjusting the search or filter settings.
									</Text>
								</View>
							}
							ListFooterComponent={
								visibleCount < total ? (
									<View style={styles.loadMoreFooter}>
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
	listContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 30 },
	groupTitle: { color: '#9aa1a5', fontSize: 12, fontWeight: '500', marginBottom: 8, marginTop: 4 },
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
	cardMainContent: { flex: 1, paddingVertical: 14, paddingLeft: 16, paddingRight: 4 },
	cardHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 12,
	},
	titleContainer: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
	titleIcon: { marginRight: 6 },
	primaryName: { fontSize: 15, fontWeight: '700', color: '#1D2939' },
	statusBadge: {
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
	},
	statusText: { fontSize: 10, fontWeight: '700' },
	detailRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
	rowIcon: { marginRight: 8, marginTop: 1 },
	detailText: { fontSize: 13, color: '#475467', flex: 1 },
	cardFooter: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginTop: 8,
		paddingTop: 10,
		borderTopWidth: 1,
		borderTopColor: '#F2F4F7',
	},
	paymentBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 6,
		gap: 4,
	},
	badgePaid: { backgroundColor: '#E8F5E9' },
	badgePending: { backgroundColor: '#FFF6E5' },
	paymentBadgeText: { fontSize: 11, fontWeight: '600' },
	priceContainer: { alignItems: 'flex-end' },
	priceLabel: { fontSize: 10, color: '#667085', marginBottom: 1 },
	priceTag: { fontSize: 14, fontWeight: '700', color: '#101828' },
	chevronContainer: { width: 32, alignItems: 'center', justifyContent: 'center' },
	refText: { fontSize: 12, color: '#667085', marginTop: 8, marginLeft: 2 },
	emptyState: { alignItems: 'center', paddingVertical: 40, gap: 8 },
	emptyTitle: { color: '#536167', fontSize: 16, fontWeight: '700' },
	emptyText: { color: '#8b969b', fontSize: 12, textAlign: 'center' },
	filterRowWide: {
		flexDirection: 'row',
		alignItems: 'center',
		flexWrap: 'nowrap',
		gap: 12,
		width: '100%',
	},
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
	filterCloseButton: {
		width: 36,
		height: 36,
		borderRadius: 18,
		alignItems: 'center',
		justifyContent: 'center',
	},
	filterSheetScroll: { flexGrow: 0 },
	filterSheetContent: { paddingHorizontal: 18, paddingTop: 4, paddingBottom: 20, gap: 22 },
	filterGroup: { gap: 10 },
	filterGroupLabel: {
		fontSize: 11,
		lineHeight: 14,
		fontWeight: '800',
		color: '#64707d',
		textTransform: 'uppercase',
	},
	filterChipScroller: { marginHorizontal: -2 },
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
	filterChipActive: { backgroundColor: '#2B6F71' },
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
		backgroundColor: '#2B6F71',
	},
	applyButtonText: { fontSize: 14, fontWeight: '700', color: '#ffffff' },
	loadMoreFooter: {
		paddingVertical: 6,
		opacity: 0.6,
	},
})
