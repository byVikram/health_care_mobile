import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
	ActivityIndicator,
	Alert,
	Animated,
	FlatList,
	Image,
	Modal,
	Pressable,
	RefreshControl,
	ScrollView,
	StyleSheet,
	TextInput,
	TouchableOpacity,
	View,
	useWindowDimensions,
} from 'react-native'
import { BlurView } from 'expo-blur'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AppSelect, AppSelectOption, AppTable, AppTableColumn, AppTypography } from '../../components/common'
import ApiService from '../../services/apiService'
import { API_ENDPOINTS } from '../../constants/apiUrls'
import { useAuth } from '../../context/AuthContext'
import AppMobileAPT from './components/AppMobileAPT'

type AppointmentRow = Record<string, unknown> & {
	id: string
	patientName: string
	patientAvatar: string
	appointmentDate: string
	startTime: string
	endTime: string | null
	appointmentMode: string
	status: string
	doctorName: string
	doctorAvatar: string
	hospitalName: string | null
	hospitalAddress: string | null
}

type AppointmentMeta = {
	total: number
	page: number
	limit: number
	pages: number
}

type HospitalOption = AppSelectOption & {
	address?: string
}

type ApiDoctorHospital = {
	id?: string | number
	hospital_id?: string | number
	name?: string
	address?: string
	hospital?: {
		id?: string | number
		name?: string
		address?: string
	}
}

type ApiHospitalsResponse = {
	success?: boolean
	data?: ApiDoctorHospital[] | { hospitals?: ApiDoctorHospital[]; data?: ApiDoctorHospital[] }
	hospitals?: ApiDoctorHospital[]
}

type ApiAppointment = {
	id: string
	appointment_mode?: string
	appointment_date?: string
	appointment_time?: string
	start_time?: string
	end_time?: string | null
	status?: string | { label?: string }
	doctor?: { id?: string; name?: string; avatar_s3_key?: string | null }
	patient?: { id?: string; name?: string; avatar_s3_key?: string | null }
	hospital?: { id?: string; name?: string; address?: string } | null
}

type ApiAppointmentsResponse = {
	success?: boolean
	message?: string
	data?: ApiAppointment[] | { data?: ApiAppointment[]; appointments?: ApiAppointment[] }
	appointments?: ApiAppointment[]
	meta?: Partial<AppointmentMeta>
	total?: number
	page?: number
	limit?: number
	pages?: number
}

const PAGE_SIZE = 10
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]
const MODE_OPTIONS: AppSelectOption[] = [
	{ label: 'All', value: 'all' },
	{ label: 'Online', value: 'online' },
	{ label: 'Offline', value: 'offline' },
]
const DATE_OPTIONS: AppSelectOption[] = [
	{ label: 'All', value: 'all' },
	{ label: 'Today', value: 'today' },
	{ label: 'Yesterday', value: 'yesterday' },
	{ label: 'Last 7 Days', value: 'last_7_days' },
	{ label: 'Last 30 Days', value: 'last_30_days' },
]
const STATUS_OPTIONS: AppSelectOption[] = [
	{ label: 'All', value: 'all' },
	{ label: 'Pending', value: 'pending' },
	{ label: 'Confirmed', value: 'confirmed' },
	{ label: 'Cancelled', value: 'cancelled' },
	{ label: 'Rescheduled', value: 'rescheduled' },
]
const TEAL = '#0c7c7c'
const TEXT = '#111827'
const MUTED = '#64707d'
const BORDER = '#e5eaef'
const SURFACE = '#ffffff'
const BACKGROUND = '#f6f8fb'

const getStatusLabel = (status: ApiAppointment['status']) => {
	if (!status) return 'Pending'
	if (typeof status === 'string') return status
	return status.label || 'Pending'
}

const getInitial = (name: string) => name.trim().charAt(0).toUpperCase() || 'P'

const formatDate = (value: string) => {
	if (!value) return '-'
	const parsed = new Date(value)
	if (Number.isNaN(parsed.getTime())) return value

	return parsed.toLocaleDateString(undefined, {
		month: 'short',
		day: '2-digit',
		year: 'numeric',
	})
}

const formatMode = (value: string) => {
	if (!value) return '-'
	return value.replace(/_/g, ' ').toLowerCase()
}

const formatApiDate = (date: Date) => {
	const year = date.getFullYear()
	const month = String(date.getMonth() + 1).padStart(2, '0')
	const day = String(date.getDate()).padStart(2, '0')
	return `${year}-${month}-${day}`
}

const applyDateFilterParams = (params: Record<string, unknown>, filter: string) => {
	if (filter === 'all') return

	const today = new Date()
	const endDate = formatApiDate(today)

	if (filter === 'today') {
		params.appointment_date = endDate
		params.date_filter = filter
		return
	}

	if (filter === 'yesterday') {
		const yesterday = new Date(today)
		yesterday.setDate(today.getDate() - 1)
		params.appointment_date = formatApiDate(yesterday)
		params.date_filter = filter
		return
	}

	const days = filter === 'last_30_days' ? 30 : 7
	const startDate = new Date(today)
	startDate.setDate(today.getDate() - (days - 1))
	params.from_date = formatApiDate(startDate)
	params.to_date = endDate
	params.date_filter = filter
}

const statusColors = (status: string) => {
	const normalized = status.toLowerCase()
	if (normalized.includes('confirm') || normalized.includes('complete')) {
		return { color: '#087f5b', backgroundColor: '#e8f7f1' }
	}
	if (normalized.includes('cancel') || normalized.includes('reject')) {
		return { color: '#b42318', backgroundColor: '#fff1f0' }
	}
	if (normalized.includes('pending')) {
		return { color: '#946200', backgroundColor: '#fff7df' }
	}
	return { color: TEAL, backgroundColor: '#edfafa' }
}

const normalizeRows = (appointments: ApiAppointment[]): AppointmentRow[] =>
	appointments.map((appt) => ({
		id: String(appt.id),
		patientName: appt.patient?.name || 'Unknown patient',
		patientAvatar: appt.patient?.avatar_s3_key || '',
		appointmentDate: appt.appointment_date || '',
		startTime: appt.start_time || appt.appointment_time || '',
		endTime: appt.end_time ?? null,
		appointmentMode: appt.appointment_mode || '',
		status: getStatusLabel(appt.status),
		doctorName: appt.doctor?.name || '',
		doctorAvatar: appt.doctor?.avatar_s3_key || '',
		hospitalName: appt.hospital?.name || null,
		hospitalAddress: appt.hospital?.address || null,
	}))

const normalizeHospitals = (response: ApiHospitalsResponse): HospitalOption[] => {
	const nestedData = typeof response.data === 'object' && !Array.isArray(response.data)
		? response.data.hospitals ?? response.data.data
		: undefined
	const rows = Array.isArray(response.data)
		? response.data
		: Array.isArray(nestedData)
			? nestedData
			: Array.isArray(response.hospitals)
				? response.hospitals
				: []

	return rows
		.map((item): HospitalOption | null => {
			const hospital = item.hospital ?? item
			const id = hospital.id ?? item.hospital_id ?? item.id
			const name = hospital.name ?? item.name

			if (!id || !name) return null

			return {
				value: String(id),
				label: name,
				address: hospital.address ?? item.address,
			}
		})
		.filter((item): item is HospitalOption => Boolean(item))
}

const unpackAppointments = (response: ApiAppointmentsResponse) => {
	const nestedData = typeof response.data === 'object' && !Array.isArray(response.data)
		? response.data.data ?? response.data.appointments
		: undefined
	const rows = Array.isArray(response.data)
		? response.data
		: Array.isArray(nestedData)
			? nestedData
			: Array.isArray(response.appointments)
				? response.appointments
				: []

	const metaSource = response.meta ?? {}
	const total = metaSource.total ?? response.total ?? rows.length
	const page = metaSource.page ?? response.page ?? 1
	const limit = metaSource.limit ?? response.limit ?? PAGE_SIZE
	const pages = metaSource.pages ?? response.pages ?? Math.max(1, Math.ceil(total / limit))

	return {
		rows: normalizeRows(rows),
		meta: { total, page, limit, pages },
	}
}

function PersonCell({ row, compact }: { row: AppointmentRow; compact?: boolean }) {
	return (
		<View style={[styles.personCell, compact && styles.personCellCompact]}>
			{row.patientAvatar ? (
				<Image source={{ uri: row.patientAvatar }} style={styles.avatar} />
			) : (
				<View style={styles.avatarFallback}>
					<AppTypography style={styles.avatarText}>{getInitial(row.patientName)}</AppTypography>
				</View>
			)}

			<View style={styles.personTextWrap}>
				<AppTypography style={styles.personName} numberOfLines={1}>
					{row.patientName}
				</AppTypography>
			</View>
		</View>
	)
}

function StatusPill({ status }: { status: string }) {
	const colors = statusColors(status)
	return (
		<View style={[styles.statusPill, colors]}>
			<AppTypography style={[styles.statusText, { color: colors.color }]} numberOfLines={1}>
				{status}
			</AppTypography>
		</View>
	)
}

export default function AllAppointmentList() {
	const navigation = useNavigation<any>()
	const insets = useSafeAreaInsets()
	const { role, selectedHospital, selectedHospitalId } = useAuth()
	const { width, height } = useWindowDimensions()
	const isTablet = width >= 768
	const isLandscape = width > height
	const useTable = isTablet || isLandscape
	const filtersInline = width >= 720
	const contentWidth = useMemo(() => {
		if (width >= 1180) return 1120
		if (width >= 900) return width - 56
		return width
	}, [width])

	const [search, setSearch] = useState('')
	const [page, setPage] = useState(1)
	const [pageSize, setPageSize] = useState(PAGE_SIZE)
	const [rows, setRows] = useState<AppointmentRow[]>([])
	const [meta, setMeta] = useState<AppointmentMeta>({ total: 0, page: 1, limit: PAGE_SIZE, pages: 0 })
	const [loading, setLoading] = useState(false)
	const [refreshing, setRefreshing] = useState(false)
	const [modeFilter, setModeFilter] = useState('all')
	const [dateFilter, setDateFilter] = useState('all')
	const [statusFilter, setStatusFilter] = useState('all')
	const [draftModeFilter, setDraftModeFilter] = useState('all')
	const [draftDateFilter, setDraftDateFilter] = useState('all')
	const [draftStatusFilter, setDraftStatusFilter] = useState('all')
	const [filterModalVisible, setFilterModalVisible] = useState(false)
	const [hospitals, setHospitals] = useState<HospitalOption[]>([])
	const [selectedHospitalValue, setSelectedHospitalValue] = useState(selectedHospitalId || '')
	const [hospitalsLoading, setHospitalsLoading] = useState(false)
	const filterSheetAnim = useRef(new Animated.Value(0)).current
	const filterBackdropAnim = useRef(new Animated.Value(0)).current

	const selectedHospitalOption = useMemo(
		() => hospitals.find((hospital) => hospital.value === selectedHospitalValue),
		[hospitals, selectedHospitalValue]
	)
	const selectedHospitalName = selectedHospitalOption?.label || selectedHospital || 'selected hospital'
	const pageSizeOptions = useMemo(
		() => PAGE_SIZE_OPTIONS.map((option) => ({ label: String(option), value: String(option) })),
		[]
	)

	const columns = useMemo<AppTableColumn<AppointmentRow>[]>(() => [
		{
			id: 'patientName',
			label: 'Patient name',
			sortable: true,
			width: 220,
			format: (_value, row) => <PersonCell row={row} />,
		},
		{
			id: 'appointmentDate',
			label: 'Date and time',
			width: 170,
			format: (_value, row) => (
				<View>
					<AppTypography style={styles.tablePrimary}>{formatDate(row.appointmentDate)}</AppTypography>
					<View style={styles.timeRow}>
						<MaterialCommunityIcons name="clock-outline" size={12} color={MUTED} />
						<AppTypography style={styles.tableSecondary}>
							{row.startTime || '-'}{row.endTime ? ` - ${row.endTime}` : ''}
						</AppTypography>
					</View>
				</View>
			),
		},
		{
			id: 'appointmentMode',
			label: 'Mode',
			width: 120,
			format: (_value, row) => (
				<AppTypography style={[styles.tablePrimary, styles.capitalize]}>
					{formatMode(row.appointmentMode)}
				</AppTypography>
			),
		},
		{
			id: 'hospitalName',
			label: 'Hospital',
			width: 190,
			format: (_value, row) => (
				<AppTypography style={styles.tablePrimary} numberOfLines={2}>
					{row.hospitalName ?? '-'}
				</AppTypography>
			),
		},
		{
			id: 'status',
			label: 'Status',
			width: 130,
			format: (_value, row) => <StatusPill status={row.status} />,
		},
	], [])

	const goBack = () => {
		if (navigation.canGoBack()) {
			navigation.goBack()
			return
		}
		navigation.navigate('MainTabs', { screen: 'Portal' })
	}

	const fetchAppointments = useCallback(async (showLoader = true) => {
		if (role !== 'doctor') return

		try {
			if (showLoader) setLoading(true)
			const params: Record<string, unknown> = {
				page,
				limit: pageSize,
			}
			if (search.trim()) params.search = search.trim()
			if (selectedHospitalValue) params.hospital_id = selectedHospitalValue
			if (modeFilter !== 'all') params.appointment_mode = modeFilter
			if (statusFilter !== 'all') params.status = statusFilter
			applyDateFilterParams(params, dateFilter)

			const res = await ApiService.getWithParams<ApiAppointmentsResponse>(
				API_ENDPOINTS.APPOINTMENTS.GET,
				params
			)
			const next = unpackAppointments(res.data)
			setRows(next.rows)
			setMeta(next.meta)
		} catch (error) {
			console.log('[AllAppointmentList] fetch appointments error:', error)
			Alert.alert(
				'Error',
				(error as any)?.response?.data?.message || (error as any)?.message || 'Unable to load appointments right now.'
			)
		} finally {
			setLoading(false)
			setRefreshing(false)
		}
	}, [dateFilter, modeFilter, page, pageSize, role, search, selectedHospitalValue, statusFilter])

	const fetchHospitals = useCallback(async () => {
		if (role !== 'doctor') return

		try {
			setHospitalsLoading(true)
			const res = await ApiService.get<ApiHospitalsResponse>(API_ENDPOINTS.DOCTORS.HOSPITALS)
			const nextHospitals = normalizeHospitals(res.data)
			setHospitals(nextHospitals)
			setSelectedHospitalValue((current) => {
				if (current && nextHospitals.some((hospital) => hospital.value === current)) return current
				if (selectedHospitalId && nextHospitals.some((hospital) => hospital.value === selectedHospitalId)) {
					return selectedHospitalId
				}
				return nextHospitals[0]?.value || ''
			})
		} catch (error) {
			console.log('[AllAppointmentList] fetch hospitals error:', error)
			Alert.alert(
				'Error',
				(error as any)?.response?.data?.message || (error as any)?.message || 'Unable to load hospitals right now.'
			)
		} finally {
			setHospitalsLoading(false)
		}
	}, [role, selectedHospitalId])

	useEffect(() => {
		const timer = setTimeout(() => {
			void fetchAppointments(true)
		}, 300)

		return () => clearTimeout(timer)
	}, [fetchAppointments])

	useEffect(() => {
		void fetchHospitals()
	}, [fetchHospitals])

	const onRefresh = () => {
		setRefreshing(true)
		void fetchAppointments(false)
	}

	const openFilterModal = () => {
		setDraftModeFilter(modeFilter)
		setDraftDateFilter(dateFilter)
		setDraftStatusFilter(statusFilter)
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
		setModeFilter(draftModeFilter)
		setDateFilter(draftDateFilter)
		setStatusFilter(draftStatusFilter)
		setPage(1)
		closeFilterModal()
	}

	const resetFilters = () => {
		setDraftModeFilter('all')
		setDraftDateFilter('all')
		setDraftStatusFilter('all')
		setModeFilter('all')
		setDateFilter('all')
		setStatusFilter('all')
		setPage(1)
	}

	const renderPagination = () => {
		if (rows.length === 0) return null

		return (
			<View style={styles.pagination}>
				<View style={styles.paginationSummary}>
					<AppTypography style={styles.paginationText}>
						Page {meta.page} of {Math.max(meta.pages, 1)}
					</AppTypography>
					<AppTypography style={styles.paginationSubText}>
						{meta.total} total - {pageSize} per page
					</AppTypography>
				</View>

				<View style={styles.paginationActions}>
					<AppSelect
						options={pageSizeOptions}
						value={String(pageSize)}
						onSelect={(value) => {
							setPageSize(Number(value))
							setPage(1)
						}}
						placeholder="Count"
						size="small"
						style={styles.bottomCountSelectWrap}
						customCardStyle={styles.bottomCountSelect}
						borderColor={BORDER}
						maxDropdownHeight={190}
						dropdownPosition="top"
						bottomOffset={12}
					/>

					<TouchableOpacity
						style={[styles.pageButton, page <= 1 && styles.pageButtonDisabled]}
						disabled={page <= 1}
						onPress={() => setPage((current) => Math.max(1, current - 1))}
					>
						<MaterialCommunityIcons name="chevron-left" size={20} color={page <= 1 ? '#aab3bb' : TEAL} />
					</TouchableOpacity>
					<TouchableOpacity
						style={[styles.pageButton, page >= meta.pages && styles.pageButtonDisabled]}
						disabled={page >= meta.pages}
						onPress={() => setPage((current) => Math.min(meta.pages, current + 1))}
					>
						<MaterialCommunityIcons name="chevron-right" size={20} color={page >= meta.pages ? '#aab3bb' : TEAL} />
					</TouchableOpacity>
				</View>
			</View>
		)
	}

	if (role !== 'doctor') {
		return (
			<View style={[styles.gatedScreen, { paddingTop: insets.top + 20 }]}>
				<MaterialCommunityIcons name="lock-outline" size={38} color={MUTED} />
				<AppTypography style={styles.gatedTitle}>Doctor access only</AppTypography>
				<AppTypography style={styles.gatedText}>
					Appointments list is available only from the doctor portal.
				</AppTypography>
				<TouchableOpacity style={styles.gatedButton} onPress={goBack}>
					<AppTypography style={styles.gatedButtonText}>Go back</AppTypography>
				</TouchableOpacity>
			</View>
		)
	}

	const hasActiveFilters = modeFilter !== 'all' || dateFilter !== 'all' || statusFilter !== 'all'

	const filterControls = (
		<>
			<AppSelect
				label="Hospital"
				options={hospitals}
				value={selectedHospitalValue}
				onSelect={(value) => {
					setSelectedHospitalValue(value)
					setPage(1)
				}}
				placeholder={hospitalsLoading ? 'Loading hospitals...' : 'Select hospital'}
				size="small"
				style={[styles.filterSelectWrap, filtersInline && styles.hospitalSelectWide]}
				customCardStyle={styles.filterSelect}
				borderColor={BORDER}
				maxDropdownHeight={240}
			/>
		</>
	)

	const searchInput = (
		<View style={[styles.searchBox, !filtersInline && styles.searchBoxMobile, filtersInline && styles.searchBoxWide]}>
			<MaterialCommunityIcons name="magnify" size={21} color="#9aa0a6" />
			<TextInput
				value={search}
				onChangeText={(value) => {
					setSearch(value)
					setPage(1)
				}}
				placeholder="Search Patient ID, Name..."
				placeholderTextColor="#9aa4af"
				style={styles.searchInput}
			/>
			<MaterialCommunityIcons name="microphone-outline" size={21} color="#9aa0a6" />
		</View>
	)

	const mobileFilterButton = (
		<TouchableOpacity
			style={[
				styles.filterIconButton,
				hasActiveFilters && styles.filterIconButtonActive,
			]}
			onPress={openFilterModal}
			activeOpacity={0.84}
		>
			<MaterialCommunityIcons name="filter-variant" size={24} color={hasActiveFilters ? '#ffffff' : TEAL} />
		</TouchableOpacity>
	)

	const renderFilterChips = (
		options: AppSelectOption[],
		value: string,
		onChange: (nextValue: string) => void
	) => (
		<View style={styles.filterChipRow}>
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
								<MaterialCommunityIcons name="close" size={22} color={MUTED} />
							</TouchableOpacity>
						</View>

						<ScrollView
							style={styles.filterSheetScroll}
							contentContainerStyle={styles.filterSheetContent}
							showsVerticalScrollIndicator={false}
						>
							<View style={styles.filterGroup}>
								<AppTypography style={styles.filterGroupLabel}>Date Selection</AppTypography>
								{renderFilterChips(DATE_OPTIONS, draftDateFilter, setDraftDateFilter)}
							</View>

							<View style={styles.filterGroup}>
								<AppTypography style={styles.filterGroupLabel}>Consultation Mode</AppTypography>
								{renderFilterChips(MODE_OPTIONS, draftModeFilter, setDraftModeFilter)}
							</View>

							<View style={styles.filterGroup}>
								<AppTypography style={styles.filterGroupLabel}>Appointment Status</AppTypography>
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

	const content = (
		<>
				<View style={styles.header}>
					<TouchableOpacity style={styles.backButton} onPress={goBack} activeOpacity={0.8}>
						<MaterialCommunityIcons name="chevron-left" size={28} color={TEAL} />
					</TouchableOpacity>
					<View style={styles.headerText}>
						<AppTypography style={styles.title}>Appointments</AppTypography>
					</View>
				</View>

				<View style={styles.filtersSection}>
					{filtersInline ? (
						<ScrollView
							horizontal
							showsHorizontalScrollIndicator={false}
							keyboardShouldPersistTaps="handled"
							contentContainerStyle={styles.filterScrollContent}
						>
							<View style={styles.filterRowWide}>
								{filterControls}
								{searchInput}
							</View>
						</ScrollView>
					) : (
						<View style={styles.filterGridMobile}>
							{filterControls}
							<View style={styles.mobileSearchRow}>
								{searchInput}
								{mobileFilterButton}
							</View>
						</View>
					)}

					<AppTypography style={styles.subtitle}>
						Showing all patients listed under{' '}
						<AppTypography style={styles.subtitleStrong}>{selectedHospitalName}</AppTypography>
					</AppTypography>
				</View>

				{loading && !useTable ? (
					<View style={styles.loadingWrap}>
						<ActivityIndicator size="small" color={TEAL} />
					</View>
				) : useTable ? (
					<AppTable<AppointmentRow>
						columns={columns}
						data={rows}
						totalRows={meta.total}
						loading={loading || refreshing}
						defaultPage={meta.page}
						defaultPageSize={meta.limit}
						pageSizeOptions={PAGE_SIZE_OPTIONS}
						defaultSortBy="patientName"
						defaultSortDirection="asc"
						emptyMessage="No appointments found"
						rowPadding="10px 14px"
						onRefresh={onRefresh}
						showPagination={false}
						onPageChange={(nextPage, nextPageSize) => {
							setPage(nextPage)
							setPageSize(nextPageSize)
						}}
					/>
				) : (
					<FlatList
						data={rows}
						keyExtractor={(item) => item.id}
						renderItem={({ item }) => <AppMobileAPT row={item} />}
						contentContainerStyle={rows.length === 0 ? styles.emptyListContent : styles.listContent}
						showsVerticalScrollIndicator={false}
						ListEmptyComponent={<EmptyState />}
						refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
					/>
				)}

				{renderPagination()}
				{renderFilterModal()}
		</>
	)

	if (useTable) {
		return (
			<View style={styles.screen}>
				<ScrollView
					style={styles.tablePageScroll}
					contentContainerStyle={[
						styles.tablePageContent,
						{ paddingTop: insets.top + 12, maxWidth: contentWidth },
					]}
					showsVerticalScrollIndicator={false}
					keyboardShouldPersistTaps="handled"
					refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
				>
					{content}
				</ScrollView>
			</View>
		)
	}

	return (
		<View style={styles.screen}>
			<View style={[styles.container, { paddingTop: insets.top + 12, maxWidth: contentWidth }]}>
				{content}
			</View>
		</View>
	)
}

function EmptyState() {
	return (
		<View style={styles.emptyState}>
			<MaterialCommunityIcons name="calendar-blank-outline" size={42} color="#b7c0c8" />
			<AppTypography style={styles.emptyTitle}>No appointments found</AppTypography>
			<AppTypography style={styles.emptyText}>
				Try adjusting the search or check back after new bookings arrive.
			</AppTypography>
		</View>
	)
}

const styles = StyleSheet.create({
	screen: {
		flex: 1,
		backgroundColor: BACKGROUND,
	},
	container: {
		flex: 1,
		width: '100%',
		alignSelf: 'center',
		paddingHorizontal: 16,
	},
	tablePageScroll: {
		flex: 1,
	},
	tablePageContent: {
		width: '100%',
		alignSelf: 'center',
		paddingHorizontal: 16,
		paddingBottom: 28,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		marginBottom: 16,
	},
	backButton: {
		width: 42,
		height: 42,
		borderRadius: 21,
		backgroundColor: SURFACE,
		borderWidth: 1,
		borderColor: BORDER,
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 12,
	},
	headerText: {
		flex: 1,
		minWidth: 0,
	},
	title: {
		fontSize: 24,
		lineHeight: 30,
		fontWeight: '700',
		color: TEXT,
	},
	subtitle: {
		fontSize: 13,
		lineHeight: 19,
		color: MUTED,
		marginTop: 4,
	},
	subtitleStrong: {
		fontSize: 13,
		lineHeight: 19,
		fontWeight: '700',
		color: TEXT,
	},
	filtersSection: {
		marginBottom: 14,
	},
	filterScrollContent: {
		paddingBottom: 6,
	},
	filterRowWide: {
		flexDirection: 'row',
		alignItems: 'flex-end',
		gap: 20,
		minWidth: '100%',
	},
	filterGridMobile: {
		gap: 10,
	},
	mobileSearchRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
	},
	searchBox: {
		height: 48,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: BORDER,
		backgroundColor: SURFACE,
		paddingHorizontal: 16,
		flexDirection: 'row',
		alignItems: 'center',
		width: '100%',
	},
	searchBoxWide: {
		width: 596,
		maxWidth: 596,
	},
	searchBoxMobile: {
		flex: 1,
		width: 'auto',
	},
	searchInput: {
		flex: 1,
		height: '100%',
		paddingHorizontal: 12,
		fontSize: 16,
		color: TEXT,
	},
	filterSelectWrap: {
		width: '100%',
		marginBottom: 0,
	},
	filterSelect: {
		height: 48,
		borderRadius: 8,
	},
	hospitalSelectWide: {
		width: 290,
	},
	filterIconButton: {
		width: 48,
		height: 48,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: BORDER,
		backgroundColor: SURFACE,
		alignItems: 'center',
		justifyContent: 'center',
		flexShrink: 0,
	},
	filterIconButtonActive: {
		backgroundColor: TEAL,
		borderColor: TEAL,
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
		backgroundColor: SURFACE,
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
		color: TEXT,
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
		color: MUTED,
		textTransform: 'uppercase',
	},
	filterChipRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 10,
	},
	filterChip: {
		minHeight: 38,
		minWidth: 74,
		borderRadius: 19,
		paddingHorizontal: 18,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#f2f6fb',
	},
	filterChipActive: {
		backgroundColor: TEAL,
	},
	filterChipText: {
		fontSize: 12,
		lineHeight: 16,
		fontWeight: '700',
		color: MUTED,
	},
	filterChipTextActive: {
		color: '#ffffff',
	},
	filterSheetActions: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		borderTopWidth: 1,
		borderTopColor: BORDER,
		paddingHorizontal: 18,
		paddingTop: 14,
	},
	resetButton: {
		height: 50,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#aab3bb',
		paddingHorizontal: 20,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: SURFACE,
	},
	resetButtonText: {
		fontSize: 14,
		lineHeight: 18,
		fontWeight: '700',
		color: MUTED,
	},
	applyButton: {
		flex: 1,
		height: 50,
		borderRadius: 8,
		backgroundColor: TEAL,
		alignItems: 'center',
		justifyContent: 'center',
		shadowColor: TEAL,
		shadowOffset: { width: 0, height: 8 },
		shadowOpacity: 0.18,
		shadowRadius: 14,
		elevation: 4,
	},
	applyButtonText: {
		fontSize: 14,
		lineHeight: 18,
		fontWeight: '700',
		color: '#ffffff',
	},
	compactSelectWide: {
		width: 290,
	},
	loadingWrap: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 56,
	},
	tableScroll: {
		flex: 1,
	},
	tableCard: {
		minWidth: 860,
		width: '100%',
		backgroundColor: 'transparent',
	},
	tableRow: {
		minHeight: 64,
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: SURFACE,
		borderBottomWidth: 1,
		borderBottomColor: BORDER,
		paddingHorizontal: 14,
	},
	tableHeader: {
		minHeight: 46,
		borderTopLeftRadius: 12,
		borderTopRightRadius: 12,
		backgroundColor: '#f9fbfc',
	},
	tableHeaderText: {
		fontSize: 12,
		lineHeight: 16,
		fontWeight: '700',
		color: MUTED,
		textTransform: 'uppercase',
	},
	colPatient: {
		width: 220,
	},
	colDate: {
		width: 170,
	},
	colMode: {
		width: 120,
	},
	colHospital: {
		width: 190,
	},
	colStatus: {
		width: 130,
		alignItems: 'flex-start',
	},
	personCell: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 4,
	},
	personCellCompact: {
		flex: 1,
		minWidth: 0,
	},
	avatar: {
		width: 36,
		height: 36,
		borderRadius: 18,
		backgroundColor: '#d9eeee',
		marginRight: 12,
	},
	avatarFallback: {
		width: 36,
		height: 36,
		borderRadius: 18,
		backgroundColor: TEAL,
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 12,
	},
	avatarText: {
		fontSize: 14,
		lineHeight: 18,
		fontWeight: '700',
		color: '#ffffff',
	},
	personTextWrap: {
		flex: 1,
		minWidth: 0,
	},
	personName: {
		fontSize: 13,
		lineHeight: 18,
		fontWeight: '700',
		color: TEXT,
	},
	tablePrimary: {
		fontSize: 13,
		lineHeight: 18,
		fontWeight: '600',
		color: TEXT,
	},
	tableSecondary: {
		fontSize: 11,
		lineHeight: 15,
		color: MUTED,
		marginLeft: 4,
	},
	timeRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 3,
	},
	statusPill: {
		borderRadius: 999,
		paddingHorizontal: 10,
		paddingVertical: 5,
		alignSelf: 'flex-start',
		maxWidth: '100%',
	},
	statusText: {
		fontSize: 12,
		lineHeight: 14,
		fontWeight: '700',
		textTransform: 'capitalize',
	},
	capitalize: {
		textTransform: 'capitalize',
	},
	listContent: {
		paddingBottom: 12,
	},
	emptyListContent: {
		flexGrow: 1,
		justifyContent: 'center',
	},
	emptyState: {
		alignItems: 'center',
		justifyContent: 'center',
		padding: 32,
		backgroundColor: SURFACE,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: BORDER,
		borderStyle: 'dashed',
	},
	emptyTitle: {
		fontSize: 16,
		lineHeight: 22,
		fontWeight: '700',
		color: TEXT,
		marginTop: 12,
	},
	emptyText: {
		fontSize: 13,
		lineHeight: 19,
		color: MUTED,
		textAlign: 'center',
		marginTop: 4,
		maxWidth: 300,
	},
	pagination: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: 12,
		gap: 12,
	},
	paginationSummary: {
		flex: 1,
		minWidth: 0,
	},
	paginationText: {
		fontSize: 12,
		lineHeight: 17,
		color: MUTED,
	},
	paginationSubText: {
		fontSize: 11,
		lineHeight: 15,
		color: MUTED,
		marginTop: 2,
	},
	paginationActions: {
		flexDirection: 'row',
		alignItems: 'center',
		flexShrink: 0,
		gap: 8,
	},
	bottomCountSelectWrap: {
		width: 104,
		marginBottom: 0,
	},
	bottomCountSelect: {
		height: 36,
		borderRadius: 18,
	},
	pageButton: {
		width: 36,
		height: 36,
		borderRadius: 18,
		borderWidth: 1,
		borderColor: BORDER,
		backgroundColor: SURFACE,
		alignItems: 'center',
		justifyContent: 'center',
	},
	pageButtonDisabled: {
		backgroundColor: '#f3f5f7',
	},
	gatedScreen: {
		flex: 1,
		backgroundColor: BACKGROUND,
		alignItems: 'center',
		justifyContent: 'center',
		padding: 24,
	},
	gatedTitle: {
		fontSize: 18,
		lineHeight: 24,
		fontWeight: '700',
		color: TEXT,
		marginTop: 12,
	},
	gatedText: {
		fontSize: 13,
		lineHeight: 19,
		color: MUTED,
		textAlign: 'center',
		marginTop: 6,
	},
	gatedButton: {
		marginTop: 18,
		height: 42,
		borderRadius: 21,
		backgroundColor: TEAL,
		paddingHorizontal: 20,
		alignItems: 'center',
		justifyContent: 'center',
	},
	gatedButtonText: {
		fontSize: 14,
		lineHeight: 18,
		fontWeight: '700',
		color: '#ffffff',
	},
})
