// src/features/radiology/OrderListRadiologyPage.tsx
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
import { useNavigation, useRoute } from '@react-navigation/native'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import Toast from 'react-native-toast-message'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { BlurView } from 'expo-blur'
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker'
import { AppSelect, AppSelectOption, AppSkeleton, AppTypography } from '../../components/common'

import { fetchRadiologyBookings, RadiologyBooking } from './RadiologyService'
import { useAuth } from '../../context/AuthContext'
import { getStatusStyle } from '../../constants/statusColors'
import { ROUTES } from '../../navigation/routes'
import { formatDateForApi, formatGroupDateDisplay, formatShortDateDisplay } from '../../utils/date'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type NormalizedStatus = 'Pending Quote' | 'Pending Payment' | 'Confirmed' | 'Completed' | 'Cancelled'

type BookingRow = {
	id: string // public_id, used as list key
	bookingRef: string // short readable reference
	group: string
	primaryName: string // patient_name (radiology viewer) or radiology_name (patient viewer)
	scanSummary: string
	date: string
	time: string
	status: NormalizedStatus
	totalAmount: number | null
	paymentStatus: string
	prescriptionVerified: boolean
	raw: RadiologyBooking
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

// Values match the backend `status` query param exactly.
const STATUS_OPTIONS: AppSelectOption[] = [
	{ label: 'All', value: 'all' },
	{ label: 'Pending Quote', value: 'pending_quote' },
	{ label: 'Pending Payment', value: 'pending_payment' },
	{ label: 'Confirmed', value: 'confirmed' },
	{ label: 'Completed', value: 'completed' },
	{ label: 'Cancelled', value: 'cancelled' },
]

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

const normalizeStatus = (status: string): NormalizedStatus => {
	switch (status?.toLowerCase()) {
		case 'pending_quote':
			return 'Pending Quote'
		case 'pending_payment':
			return 'Pending Payment'
		case 'confirmed':
			return 'Confirmed'
		case 'completed':
			return 'Completed'
		case 'cancelled':
		case 'rejected':
			return 'Cancelled'
		default:
			return 'Pending Quote'
	}
}

const buildScanSummary = (booking: RadiologyBooking): string => {
	const names = booking.booking_items
		.map((bi) => bi.custom_scan_name || bi.radiology_scan?.scan_type?.name)
		.filter(Boolean)
	return names.length > 0 ? names.join(', ') : 'Scan details unavailable'
}

const mapBookingToRow = (booking: RadiologyBooking, isRadiologyViewer: boolean): BookingRow => ({
	id: booking.public_id,
	bookingRef: booking.public_id.slice(0, 8).toUpperCase(),
	group: formatGroupDateDisplay(booking.created_at),
	primaryName: isRadiologyViewer ? booking.patient_name : booking.radiology_name,
	scanSummary: buildScanSummary(booking),
	date: formatShortDateDisplay(booking.booking_date),
	time: booking.booking_time,
	status: normalizeStatus(booking.status),
	totalAmount: booking.total_price,
	paymentStatus: booking.payment_status,
	prescriptionVerified: booking.prescription_verified,
	raw: booking,
})

// booking_date is already YYYY-MM-DD, so lexicographic string comparison works directly.
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
	isRadiologyViewer: boolean
}

const BookingCard = React.memo(function BookingCard({ booking, onPress, isRadiologyViewer }: BookingCardProps) {
	const statusStyle = getStatusStyle(booking.status)
	const showVerificationFlag =
		!booking.prescriptionVerified && booking.status !== 'Completed' && booking.status !== 'Cancelled'

	return (
		<TouchableOpacity style={styles.orderCard} onPress={onPress} activeOpacity={0.85}>
			<View style={styles.cardMainContent}>
				{showVerificationFlag ? (
					<View style={styles.reasonBadge}>
						<MaterialCommunityIcons name="file-clock-outline" size={13} color="#D9711B" />
						<Text style={styles.reasonText} numberOfLines={1}>
							diagnosis pending verification
						</Text>
					</View>
				) : null}

				<View style={styles.cardHeader}>
					<View style={styles.pharmacyTitleContainer}>
						<MaterialCommunityIcons
							name={isRadiologyViewer ? 'account-outline' : 'radiology-box-outline'}
							size={18}
							color="#2B6F71"
							style={styles.pharmacyIcon}
						/>
						<Text numberOfLines={1} style={styles.pharmacyName}>
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
					<MaterialCommunityIcons name="radiology-box-outline" size={15} color="#667085" style={styles.rowIcon} />
					<Text style={styles.detailText} numberOfLines={2}>
						{booking.scanSummary}
					</Text>
				</View>

				<View style={styles.cardFooter}>
					<View
						style={[
							styles.deliveryBadge,
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
								styles.detailText,
								{ color: booking.paymentStatus === 'paid' ? '#1B5E20' : '#9A6700', fontSize: 11, fontWeight: '600' },
							]}
						>
							{booking.paymentStatus === 'paid' ? 'Paid' : 'Payment Pending'}
						</Text>
					</View>

					<View style={{ alignItems: 'flex-end' }}>
						<Text style={{ fontSize: 10, color: '#667085', marginBottom: 1 }}>Total</Text>
						<Text style={{ fontSize: 14, fontWeight: '700', color: '#101828' }}>
							{booking.totalAmount != null ? `₹${booking.totalAmount.toFixed(2)}` : 'Awaiting Quote'}
						</Text>
					</View>
				</View>

				<Text style={{ fontSize: 12, color: '#667085', marginTop: 8, marginLeft: 2 }} numberOfLines={1}>
					Ref: {booking.bookingRef}
				</Text>
			</View>

			<View style={{ width: 32, alignItems: 'center', justifyContent: 'center' }}>
				<MaterialCommunityIcons name="chevron-right" size={20} color="#98A2B3" />
			</View>
		</TouchableOpacity>
	)
})

// ─────────────────────────────────────────────
// Main screen
// ─────────────────────────────────────────────

export default function OrderListRadiologyPage() {
	const navigation = useNavigation<any>()
	const route = useRoute<any>()
	const insets = useSafeAreaInsets()
	const { width, height } = useWindowDimensions()
	const isTablet = width >= 768

	const { role, accessToken } = useAuth()
	const isRadiologyViewer = role === 'radiology'

	const scanTypeId: string | undefined = route.params?.scanTypeId

	const [allBookings, setAllBookings] = useState<RadiologyBooking[]>([])
	const [loading, setLoading] = useState(false)
	const [refreshing, setRefreshing] = useState(false)

	const PAGE_SIZE = 10
	const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

	// Filters
	const [searchQuery, setSearchQuery] = useState('')
	const [debouncedSearch, setDebouncedSearch] = useState('')
	const [statusFilter, setStatusFilter] = useState(route.params?.status ?? 'all')
	const [dateFilter, setDateFilter] = useState('all')
	const [fromDateFilter, setFromDateFilter] = useState('')
	const [toDateFilter, setToDateFilter] = useState('')

	// Draft (mobile filter sheet)
	const [draftStatusFilter, setDraftStatusFilter] = useState('all')
	const [draftDateFilter, setDraftDateFilter] = useState('all')
	const [draftFromDateFilter, setDraftFromDateFilter] = useState('')
	const [draftToDateFilter, setDraftToDateFilter] = useState('')

	const [filterModalVisible, setFilterModalVisible] = useState(false)
	const [activeDatePicker, setActiveDatePicker] = useState<'from' | 'to' | null>(null)

	const filterSheetAnim = useRef(new Animated.Value(0)).current
	const filterBackdropAnim = useRef(new Animated.Value(0)).current

	useEffect(() => {
		if (route.params?.status) setStatusFilter(route.params.status)
	}, [route.params?.status])

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
				const data = await fetchRadiologyBookings(status)
				setAllBookings(data)
			} catch (error: any) {
				console.error('[OrderListRadiologyPage] fetchBookings error:', error?.message || error)
				Toast.show({ type: 'error', text1: 'Error', text2: error?.message || 'Failed to load bookings' })
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
			.filter((booking) => {
				if (!scanTypeId) return true
				return booking.booking_items.some((item) => String(item.radiology_scan?.scan_type?.id) === String(scanTypeId))
			})
			.map((b) => mapBookingToRow(b, isRadiologyViewer))
			.filter((row) => {
				const matchesSearch =
					q.length === 0 ||
					row.primaryName.toLowerCase().includes(q) ||
					row.bookingRef.toLowerCase().includes(q) ||
					row.scanSummary.toLowerCase().includes(q)
				const matchesDate = matchesDateFilter(row.raw.booking_date, dateFilter, fromDateFilter, toDateFilter)
				return matchesSearch && matchesDate
			})
	}, [allBookings, isRadiologyViewer, debouncedSearch, dateFilter, fromDateFilter, toDateFilter, scanTypeId])

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
			navigation.navigate(ROUTES.STACK.RADIOLOGY_ORDER_DETAIL, {
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
						isRadiologyViewer={isRadiologyViewer}
					/>
					<View style={{ height: 12 }} />
				</View>
			)
		},
		[pagedRows, handleBookingPress, isRadiologyViewer]
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
		const val = formatDateForApi(selectedDate)
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
								<AppTypography style={styles.filterGroupLabel}>Booking Status</AppTypography>
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

	// ── Search box & filter controls ───────────────────────────────────

	const searchInput = (
		<View style={[styles.searchBox, !isTablet && styles.searchBoxMobile, isTablet && styles.searchBoxWide]}>
			<MaterialCommunityIcons name="magnify" size={21} color="#9aa0a6" />
			<TextInput
				value={searchQuery}
				onChangeText={setSearchQuery}
				placeholder={isRadiologyViewer ? 'Search Patient, Reference...' : 'Search Center, Scan, Reference...'}
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
			<View style={[styles.content, isTablet && styles.contentTablet]}>
				<View style={styles.filtersSection}>
					{isTablet ? (
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
					<ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
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
									<MaterialCommunityIcons name="radiology-box-outline" size={40} color="#b0bec5" />
									<Text style={styles.emptyTitle}>No bookings found</Text>
									<Text style={styles.emptyText}>Try adjusting the search or filter settings.</Text>
								</View>
							}
							ListFooterComponent={
								visibleCount < total ? (
									<View style={{ paddingVertical: 6, opacity: 0.6 }}>
										<AppSkeleton width={'100%'} height={90} borderRadius={16} />
									</View>
								) : null
							}
						/>
					</View>
				)}
			</View>
			{!isTablet && renderFilterModal()}
		</View>
	)
}

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────

const styles = StyleSheet.create({
	safeArea: { flex: 1, backgroundColor: '#f4f4f4' },
	content: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
	contentTablet: { paddingHorizontal: 24, paddingTop: 20 },
	listContent: { paddingBottom: 30 },
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
	cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
	pharmacyTitleContainer: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
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
	badgePaid: { backgroundColor: '#E8F5E9' },
	badgePending: { backgroundColor: '#FFF6E5' },
	deliveryBadgeText: { fontSize: 11, fontWeight: '600' },
	priceContainer: { alignItems: 'flex-end' },
	priceLabel: { fontSize: 10, color: '#667085', marginBottom: 1 },
	priceTag: { fontSize: 14, fontWeight: '700', color: '#101828' },
	chevronContainer: { width: 32, alignItems: 'center', justifyContent: 'center' },
	emptyState: { alignItems: 'center', paddingVertical: 40, gap: 8 },
	emptyTitle: { color: '#536167', fontSize: 16, fontWeight: '700' },
	emptyText: { color: '#8b969b', fontSize: 12, textAlign: 'center' },
	filtersSection: { marginBottom: 10 },
	filterRowWide: { flexDirection: 'row', alignItems: 'center', flexWrap: 'nowrap', gap: 12, width: '100%' },
	mobileSearchRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
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
	searchBoxMobile: { height: 44, width: '100%', borderRadius: 8, paddingHorizontal: 12 },
	searchInput: { flex: 1, height: '100%', paddingHorizontal: 12, fontSize: 16, color: '#111827' },
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
	filterIconButtonActive: { backgroundColor: '#e9f8f7', borderColor: '#1f5f68' },
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
	reasonBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#FFF1E0',
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 8,
		marginBottom: 8,
		alignSelf: 'flex-start',
	},
	reasonText: { fontSize: 11, color: '#D9711B', marginLeft: 4 },
	addressText: { fontSize: 12, color: '#667085', marginTop: 8, marginLeft: 2 },
})
