import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
	ActivityIndicator,
	Alert,
	Animated,
	FlatList,
	Image,
	Modal,
	Platform,
	Pressable,
	RefreshControl,
	ScrollView,
	StyleSheet,
	TextInput,
	TouchableOpacity,
	View,
	useWindowDimensions,
} from 'react-native'
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker'
import { BlurView } from 'expo-blur'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { AppSelect, AppSelectOption, AppTable, AppTableColumn, AppTypography } from '../../components/common'
import ApiService from '../../services/apiService'
import { API_ENDPOINTS } from '../../constants/apiUrls'
import { useAuth } from '../../context/AuthContext'
import { AppointmentsResponse, Appointment } from '../../types/appointment'
import PaginationBar from '../../components/common/AppPagination'
import MobileAppointmentCard from './components/MobileAppointmentCard'

type AppointmentRow = Record<string, unknown> & {
	id: string
	patientId: string
	patientIds: string[]
	patientName: string
	patientAvatar: string
	doctorId: string
	doctorIds: string[]
	appointmentDate: string
	startTime: string
	endTime: string | null
	appointmentMode: string
	status: string
	doctorName: string
	doctorAvatar: string
	hospitalId: string
	hospitalIds: string[]
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



const PAGE_SIZE = 10
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]
const MOBILE_PAGE_SIZE_OPTIONS = [10, 20, 50]
const MODE_OPTIONS: AppSelectOption[] = [
	{ label: 'All', value: 'all' },
	{ label: 'Online', value: 'online' },
	{ label: 'Offline', value: 'offline' },
]
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

const getStatusLabel = (status: any) => {
	if (!status) return 'Pending'
	if (typeof status === 'string') return status
	return status.label || 'Pending'
}

const getInitial = (name: string) => name.trim().charAt(0).toUpperCase() || 'P'

const parseDateOnly = (value: string) => {
	if (!value) return null
	const dateOnly = value.split('T')[0]
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOnly)

	if (match) {
		const [, year, month, day] = match
		return new Date(Number(year), Number(month) - 1, Number(day))
	}

	const parsed = new Date(value)
	return Number.isNaN(parsed.getTime()) ? null : parsed
}

const formatDate = (value: string) => {
	if (!value) return '-'
	const parsed = parseDateOnly(value)
	if (!parsed) return value

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

const normalizeModeValue = (value: string) => {
	const normalized = value.replace(/[-\s]/g, '_').toLowerCase()
	if (['online', 'video', 'virtual', 'teleconsultation'].includes(normalized)) return 'online'
	if (['offline', 'clinic', 'in_person', 'inperson'].includes(normalized)) return 'offline'
	return normalized
}

const normalizeStatusValue = (value: string) => {
	const normalized = value.replace(/[-\s]/g, '_').toLowerCase()
	if (normalized.includes('confirm')) return 'confirmed'
	if (normalized.includes('cancel') || normalized.includes('reject')) return 'cancelled'
	if (normalized.includes('reschedule')) return 'rescheduled'
	if (normalized.includes('pending')) return 'pending'
	return normalized
}

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
		params.date_filter = filter
		return
	}

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

	if (filter === 'tomorrow') {
		const tomorrow = new Date(today)
		tomorrow.setDate(today.getDate() + 1)
		params.appointment_date = formatApiDate(tomorrow)
		params.date_filter = filter
		return
	}

	const days = filter === 'last_30_days' ? 30 : 7
	const startDate = new Date(today)
	startDate.setDate(today.getDate() - (days - 1))
	params.start_date = formatApiDate(startDate)
	params.end_date = endDate
	params.date_filter = filter
}

const getDateRangeForFilter = (filter: string, customFromDate?: string, customToDate?: string) => {
	if (filter === 'all') return null

	if (filter === 'custom') {
		const start = customFromDate ? parseDateOnly(customFromDate) : null
		const end = customToDate ? parseDateOnly(customToDate) : null
		if (start) start.setHours(0, 0, 0, 0)
		if (end) end.setHours(0, 0, 0, 0)
		if (!start && !end) return null
		return {
			start: start ?? new Date(0),
			end: end ?? new Date(8640000000000000),
		}
	}

	const today = new Date()
	today.setHours(0, 0, 0, 0)

	if (filter === 'today') {
		return { start: today, end: today }
	}

	if (filter === 'yesterday') {
		const yesterday = new Date(today)
		yesterday.setDate(today.getDate() - 1)
		return { start: yesterday, end: yesterday }
	}

	if (filter === 'tomorrow') {
		const tomorrow = new Date(today)
		tomorrow.setDate(today.getDate() + 1)
		return { start: tomorrow, end: tomorrow }
	}

	const days = filter === 'last_30_days' ? 30 : 7
	const start = new Date(today)
	start.setDate(today.getDate() - (days - 1))
	return { start, end: today }
}

const isDateInFilter = (value: string, filter: string, customFromDate?: string, customToDate?: string) => {
	const range = getDateRangeForFilter(filter, customFromDate, customToDate)
	if (!range) return true
	if (!value) return false

	const parsed = parseDateOnly(value)
	if (!parsed) return false
	parsed.setHours(0, 0, 0, 0)

	return parsed >= range.start && parsed <= range.end
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

const mapStatusToId = (status: string): number | undefined => {
	switch (status.toLowerCase()) {
		case 'pending': return 1
		case 'confirmed': return 2
		case 'cancelled': return 3
		case 'completed': return 4
		case 'no_show': return 5
		default: return undefined
	}
}

const compactParams = (params: Record<string, unknown>) =>
	Object.fromEntries(
		Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
	)

const maskToken = (token: string | null) =>
	token ? `${token.slice(0, 12)}...${token.slice(-6)}` : null

const normalizeRows = (appointments: Appointment[]): AppointmentRow[] =>
	appointments.map((appt, index) => {
		const patientId = String(appt.patient?.id ?? '')
		const doctorId = String(appt.doctor?.id ?? '')
		const hospitalId = String(appt.hospital?.id ?? '')

		return {
			id: appt.id || `appointment-${index}`,
			patientId,
			patientIds: [patientId],
			patientName: appt.patient?.name || 'Unknown patient',
			patientAvatar: appt.patient?.avatar_s3_key || '',
			doctorId,
			doctorIds: [doctorId],
			appointmentDate: appt.appointment_date || '',
			startTime: appt.appointment_time || '',
			endTime: null,
			appointmentMode: appt.appointment_mode || '',
			status: getStatusLabel(appt.status),
			doctorName: appt.doctor?.name || 'Unknown doctor',
			doctorAvatar: (appt.doctor as any)?.avatar_s3_key || '',
			hospitalName: appt.hospital?.name || null,
			hospitalAddress: appt.hospital?.address || null,
			hospitalId,
			hospitalIds: [hospitalId],
		}
	})

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

const unpackAppointments = (response: AppointmentsResponse) => {
	const rows = response.data || []
	const meta = response.meta || response || {}
	const total = meta.total ?? rows.length
	const page = meta.page ?? 1
	const limit = meta.limit ?? PAGE_SIZE
	const pages = meta.pages ?? Math.max(1, Math.ceil(total / limit))

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

export default function AppointmentList() {
	const navigation = useNavigation<any>()
	const insets = useSafeAreaInsets()
	const { role, user, isLoading: authLoading } = useAuth()
	const { width, height } = useWindowDimensions()
	const isTablet = width >= 768
	const isLandscape = width > height
	const useTable = isTablet || isLandscape
	const useInlineFilters = isTablet
	const contentWidth = useMemo(() => {
		if (width >= 1180) return 1120
		if (width >= 900) return width - 56
		return width
	}, [width])

	const [search, setSearch] = useState('')
	const [page, setPage] = useState(1)
	const [pageSize, setPageSize] = useState(PAGE_SIZE)
	const [allRows, setAllRows] = useState<AppointmentRow[]>([])
	const [apiMeta, setApiMeta] = useState<AppointmentMeta | null>(null)
	const [loading, setLoading] = useState(false)
	const [refreshing, setRefreshing] = useState(false)
	const [modeFilter, setModeFilter] = useState('all')
	const [dateFilter, setDateFilter] = useState('all')
	const [statusFilter, setStatusFilter] = useState('all')
	const [fromDateFilter, setFromDateFilter] = useState('')
	const [toDateFilter, setToDateFilter] = useState('')
	const [draftModeFilter, setDraftModeFilter] = useState('all')
	const [draftDateFilter, setDraftDateFilter] = useState('all')
	const [draftStatusFilter, setDraftStatusFilter] = useState('all')
	const [draftFromDateFilter, setDraftFromDateFilter] = useState('')
	const [draftToDateFilter, setDraftToDateFilter] = useState('')
	const [activeDatePicker, setActiveDatePicker] = useState<'from' | 'to' | null>(null)
	const [filterModalVisible, setFilterModalVisible] = useState(false)
	const [hospitals, setHospitals] = useState<HospitalOption[]>([{ label: 'All', value: 'all' }])
	const [selectedHospitalValue, setSelectedHospitalValue] = useState('all')
	const [hospitalsLoading, setHospitalsLoading] = useState(false)
	const [statusOptions, setStatusOptions] = useState<AppSelectOption[]>([{ label: 'All', value: 'all' }])
	const [statusesLoading, setStatusesLoading] = useState(false)
	const filterSheetAnim = useRef(new Animated.Value(0)).current
	const filterBackdropAnim = useRef(new Animated.Value(0)).current
	const skipNextFilterFetchRef = useRef(false)

	const isPatientView = role === 'patient'


	const columns = useMemo<AppTableColumn<AppointmentRow>[]>(() => [
		{
			id: isPatientView ? 'doctorName' : 'patientName',
			label: isPatientView ? 'Doctor name' : 'Patient name',
			sortable: true,
			width: 220,
			format: (_value, row) => isPatientView ? (
				<PersonCell
					row={{
						...row,
						patientName: row.doctorName || 'Unknown doctor',
						patientAvatar: row.doctorAvatar,
					}}
				/>
			) : <PersonCell row={row} />,
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
	], [isPatientView])

	const goBack = () => {
		if (navigation.canGoBack()) {
			navigation.goBack()
			return
		}
		navigation.navigate('MainTabs', { screen: 'Portal' })
	}

	const fetchAppointments = useCallback(async (
		showLoader = true,
		overrides?: Partial<{
			page: number
			pageSize: number
			dateFilter: string
			fromDateFilter: string
			toDateFilter: string
			search: string
			hospital_id: string
			status_id: string
		}>
	) => {
		if (role !== 'doctor' && role !== 'patient') return

		const requestUrl = API_ENDPOINTS.APPOINTMENTS.GET
		const effectivePage = overrides?.page ?? page
		const effectivePageSize = overrides?.pageSize ?? pageSize
		const effectiveDateFilter = overrides?.dateFilter ?? dateFilter
		const effectiveFromDateFilter = overrides?.fromDateFilter ?? fromDateFilter
		const effectiveToDateFilter = overrides?.toDateFilter ?? toDateFilter

		const queryParams = compactParams({
			page: effectivePage,
			limit: effectivePageSize,
			search: (overrides && 'search' in overrides ? overrides.search || '' : search).trim() || undefined,
			hospital_id: (overrides && 'hospital_id' in overrides ? overrides.hospital_id : (selectedHospitalValue !== 'all' ? selectedHospitalValue : undefined)),
			status_id: (overrides && 'status_id' in overrides ? overrides.status_id : (statusFilter !== 'all' ? statusFilter : undefined)),
		})
		applyDateFilterParams(queryParams, effectiveDateFilter, effectiveFromDateFilter, effectiveToDateFilter)

		try {
			if (showLoader) setLoading(true)
			const token = await AsyncStorage.getItem('access_token')
			console.log('[AppointmentList][debug] appointments fetch request:', {
				url: requestUrl,
				method: 'GET',
				queryParams,
				requestPayload: null,
				authToken: maskToken(token),
			})

			const hasQueryParams = Object.keys(queryParams).length > 0
			const res = await ApiService.get<AppointmentsResponse>(
				requestUrl,
				hasQueryParams ? { params: queryParams } : undefined
			)
			console.log('[AppointmentList][debug] appointments fetch response:', {
				status: res.status,
				url: requestUrl,
				queryParams,
				dataPreview: Array.isArray(res.data?.data)
					? { dataLength: res.data.data.length, firstRow: res.data.data[0] ?? null }
					: res.data,
			})
			const next = unpackAppointments(res.data)
			setApiMeta(next.meta)
			console.log('[AppointmentList][debug] mapped appointment IDs:', {
				mappedRowsLength: next.rows.length,
				sampleMappedRows: next.rows.slice(0, 5).map((row) => ({
					id: row.id,
					patientId: row.patientId,
					patientIds: row.patientIds,
					doctorId: row.doctorId,
					doctorIds: row.doctorIds,
					hospitalId: row.hospitalId,
					hospitalIds: row.hospitalIds,
					patientName: row.patientName,
					doctorName: row.doctorName,
				})),
			})
			setAllRows(next.rows)
		} catch (error) {
			const err = error as any
			console.log('[AppointmentList][debug] appointments fetch error:', {
				url: requestUrl,
				method: 'GET',
				queryParams,
				requestPayload: null,
				status: err?.response?.status,
				responseData: err?.response?.data,
				message: err?.message,
			})

			console.log('[AppointmentList] fetch appointments error:', error)
			Alert.alert(
				'Error',
				(error as any)?.response?.data?.message || (error as any)?.message || 'Unable to load appointments right now.'
			)
		} finally {
			setLoading(false)
			setRefreshing(false)
		}
	}, [dateFilter, fromDateFilter, page, pageSize, role, toDateFilter, search, selectedHospitalValue, statusFilter])

	const  fetchHospitals = useCallback(async () => {
		if (role !== 'doctor') return

		try {
			setHospitalsLoading(true)
			const res = await ApiService.get<ApiHospitalsResponse>(API_ENDPOINTS.DOCTORS.HOSPITALS)
			const nextHospitals = normalizeHospitals(res.data)
			setHospitals([{ label: 'All', value: 'all' }, ...nextHospitals])
			setSelectedHospitalValue((current) => {
				if (current && (current === 'all' || nextHospitals.some((hospital) => hospital.value === current))) return current
				return 'all'
			})
		} catch (error) {
			console.log('[AppointmentList] fetch hospitals error:', error)
			Alert.alert(
				'Error',
				(error as any)?.response?.data?.message || (error as any)?.message || 'Unable to load hospitals right now.'
			)
		} finally {
			setHospitalsLoading(false)
		}
	}, [role])

	const fetchStatuses = useCallback(async () => {
		try {
			setStatusesLoading(true)
			const res = await ApiService.get<{ success: boolean; data: { id: string; label: string }[] }>(
				API_ENDPOINTS.APPOINTMENTS.STATUSES
			)
			if (res.data?.success && Array.isArray(res.data.data)) {
				const apiOptions = res.data.data.map((item) => ({
					label: item.label.charAt(0).toUpperCase() + item.label.slice(1),
					value: item.id,
				}))
				setStatusOptions([{ label: 'All', value: 'all' }, ...apiOptions])
			}
		} catch (error) {
			console.log('[AppointmentList] fetch statuses error:', error)
			Alert.alert(
				'Error',
				(error as any)?.response?.data?.message || (error as any)?.message || 'Unable to load statuses right now.'
			)
		} finally {
			setStatusesLoading(false)
		}
	}, [])

	useEffect(() => {
		if (skipNextFilterFetchRef.current) {
			skipNextFilterFetchRef.current = false
			return
		}

		const timer = setTimeout(() => {
			void fetchAppointments(true)
		}, 300)

		return () => clearTimeout(timer)
	}, [fetchAppointments])

	useEffect(() => {
		void fetchHospitals()
	}, [fetchHospitals])

	useEffect(() => {
		void fetchStatuses()
	}, [fetchStatuses])

	useEffect(() => {
		if (useTable || MOBILE_PAGE_SIZE_OPTIONS.includes(pageSize)) return

		setPageSize(MOBILE_PAGE_SIZE_OPTIONS[0])
		setPage(1)
	}, [pageSize, useTable])

	useEffect(() => {
		if (role !== 'patient') return

		const derivedHospitals = Array.from(
			new Map(
				allRows
					.filter((row) => row.hospitalId && row.hospitalName)
					.map((row) => [row.hospitalId, { value: row.hospitalId, label: row.hospitalName || 'Hospital' }])
			).values()
		)
		setHospitals([{ label: 'All', value: 'all' }, ...derivedHospitals])
		setSelectedHospitalValue((current) => {
			if (current === 'all' || derivedHospitals.some((hospital) => hospital.value === current)) return current
			return 'all'
		})
	}, [role, allRows])

	const filteredRows = useMemo(() => {
		return allRows.filter((row) => {
			if (modeFilter !== 'all' && normalizeModeValue(row.appointmentMode) !== modeFilter) return false
			return true
		})
	}, [allRows, modeFilter])

	useEffect(() => {
		setPage(1)
	}, [dateFilter, fromDateFilter, modeFilter, search, selectedHospitalValue, statusFilter, toDateFilter])

	const meta = useMemo<AppointmentMeta>(() => {
		if (apiMeta) {
			const total = apiMeta.total
			const limit = pageSize || apiMeta.limit || PAGE_SIZE
			const pages = apiMeta.pages || Math.max(1, Math.ceil(total / Math.max(1, limit)))
			const boundedPage = Math.min(Math.max(1, page), pages)

			return {
				total,
				page: boundedPage,
				limit,
				pages,
			}
		}

		const total = filteredRows.length
		const pages = Math.max(1, Math.ceil(total / Math.max(1, pageSize)))
		const boundedPage = Math.min(Math.max(1, page), pages)

		return {
			total,
			page: boundedPage,
			limit: pageSize,
			pages,
		}
	}, [apiMeta, filteredRows.length, page, pageSize])

	const rows = useMemo(() => {
		return filteredRows
	}, [filteredRows])

	useEffect(() => {
		if (meta.page !== page) setPage(meta.page)
	}, [meta.page, page])

	const handlePageChange = (nextPage: number) => {
		const boundedPage = Math.min(Math.max(1, nextPage), meta.pages)
		setPage(boundedPage)
	}

	const handlePageSizeChange = (nextPageSize: number) => {
		setPageSize(nextPageSize)
		setPage(1)
	}

	const onRefresh = () => {
		setRefreshing(true)
		void fetchAppointments(false)
	}

	const openFilterModal = () => {
		setDraftModeFilter(modeFilter)
		setDraftDateFilter(dateFilter)
		setDraftStatusFilter(statusFilter)
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
			const fromDate = parseDateOnly(draftFromDateFilter)
			const toDate = parseDateOnly(draftToDateFilter)
			if (fromDate && toDate && fromDate > toDate) {
				Alert.alert('Invalid date range', 'From Date cannot be later than To Date.')
				return
			}
		}

		const nextFromDateFilter = draftDateFilter === 'custom' ? draftFromDateFilter : ''
		const nextToDateFilter = draftDateFilter === 'custom' ? draftToDateFilter : ''

		skipNextFilterFetchRef.current = true
		setModeFilter(draftModeFilter)
		setDateFilter(draftDateFilter)
		setStatusFilter(draftStatusFilter)
		setFromDateFilter(nextFromDateFilter)
		setToDateFilter(nextToDateFilter)
		setPage(1)
		void fetchAppointments(true, {
			page: 1,
			pageSize,
			dateFilter: draftDateFilter,
			fromDateFilter: nextFromDateFilter,
			toDateFilter: nextToDateFilter,
		})
		closeFilterModal()
	}

	const resetFilters = () => {
		setDraftModeFilter('all')
		setDraftDateFilter('all')
		setDraftStatusFilter('all')
		setDraftFromDateFilter('')
		setDraftToDateFilter('')
		setActiveDatePicker(null)
		setModeFilter('all')
		setDateFilter('all')
		setStatusFilter('all')
		setFromDateFilter('')
		setToDateFilter('')
		setSelectedHospitalValue('all')
		setSearch('')
		setPage(1)
	}

	if (authLoading) {
		return (
			<View style={[styles.loadingWrap, styles.authLoadingScreen, { paddingTop: insets.top + 20 }]}>
				<ActivityIndicator size="small" color={TEAL} />
			</View>
		)
	}

	if (role !== 'doctor' && role !== 'patient') {
		return (
			<View style={[styles.gatedScreen, { paddingTop: insets.top + 20 }]}>
				<MaterialCommunityIcons name="lock-outline" size={38} color={MUTED} />
				<AppTypography style={styles.gatedTitle}>Appointment access unavailable</AppTypography>
				<AppTypography style={styles.gatedText}>
					Appointments list is available only from doctor or patient accounts.
				</AppTypography>
				<TouchableOpacity style={styles.gatedButton} onPress={goBack}>
					<AppTypography style={styles.gatedButtonText}>Go back</AppTypography>
				</TouchableOpacity>
			</View>
		)
	}

	const hasActiveFilters = modeFilter !== 'all' || dateFilter !== 'all' || statusFilter !== 'all' || Boolean(fromDateFilter || toDateFilter)

	const renderInlineFilter = (label: string, child: React.ReactNode, style?: any) => (
		<View style={[styles.outlinedFilterWrap, !useInlineFilters && styles.outlinedFilterWrapMobile, style]}>
			<View
				pointerEvents="none"
				style={[styles.outlinedFilterLabel, !useInlineFilters && styles.outlinedFilterLabelMobile]}
			>
				<AppTypography style={styles.outlinedFilterLabelText}>{label}</AppTypography>
			</View>
			{child}
		</View>
	)

	const hospitalSelect = renderInlineFilter(
		'Hospital',
		<AppSelect
			options={hospitals}
			value={selectedHospitalValue}
			onSelect={(value) => {
				setSelectedHospitalValue(value)
				setPage(1)
			}}
			placeholder={hospitalsLoading ? 'Loading hospitals...' : 'Select hospital'}
			size={useInlineFilters ? 'small' : 'medium'}
			borderRadius={useInlineFilters ? 8 : 10}
			customCardStyle={[styles.inlineFilterSelect, !useInlineFilters && styles.mobileHospitalSelectCard]}
			borderColor={useInlineFilters ? '#c8ced6' : BORDER}
			maxDropdownHeight={240}
			style={styles.inlineSelectFill}
		/>,
		useInlineFilters ? styles.hospitalSelectWide : styles.mobileHospitalSelect
	)

	const modeSelect = renderInlineFilter(
		'Mode',
		<AppSelect
			options={MODE_OPTIONS}
			value={modeFilter}
			onSelect={(value) => {
				setModeFilter(value)
				setPage(1)
			}}
			placeholder="Mode"
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
			onSelect={(value) => {
				setDateFilter(value)
				setPage(1)
			}}
			placeholder="Date"
			size="small"
			style={styles.inlineSelectFill}
			customCardStyle={styles.inlineFilterSelect}
			borderColor="#c8ced6"
			maxDropdownHeight={220}
		/>,
		styles.compactFilterSelectWrap
	)

	const statusSelect = renderInlineFilter(
		'Status',
		<AppSelect
			options={statusOptions}
			value={statusFilter}
			onSelect={(value) => {
				setStatusFilter(value)
				setPage(1)
			}}
			placeholder="Status"
			size="small"
			style={styles.inlineSelectFill}
			customCardStyle={styles.inlineFilterSelect}
			borderColor="#c8ced6"
			maxDropdownHeight={220}
		/>,
		styles.compactFilterSelectWrap
	)

	const searchInput = (
		<View style={[styles.searchBox, !useInlineFilters && styles.searchBoxMobile, useInlineFilters && styles.searchBoxWide]}>
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
			<MaterialCommunityIcons name="tune" size={23} color={TEAL} />
		</TouchableOpacity>
	)

	const pickerDate = activeDatePicker === 'from'
		? parseDateOnly(draftFromDateFilter) ?? new Date()
		: parseDateOnly(draftToDateFilter) ?? parseDateOnly(draftFromDateFilter) ?? new Date()

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
				{value ? formatDate(value) : label}
			</AppTypography>
			<MaterialCommunityIcons name="calendar-month-outline" size={20} color={TEAL} />
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
						value={pickerDate}
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
								{renderFilterChips(DATE_OPTIONS, draftDateFilter, (value) => {
									setDraftDateFilter(value)
									if (value !== 'custom') setActiveDatePicker(null)
								})}
								{renderDateRangePicker()}
							</View>

							<View style={styles.filterGroup}>
								<AppTypography style={styles.filterGroupLabel}>Consultation Mode</AppTypography>
								{renderFilterChips(MODE_OPTIONS, draftModeFilter, setDraftModeFilter)}
							</View>

							<View style={styles.filterGroup}>
								<AppTypography style={styles.filterGroupLabel}>Appointment Status</AppTypography>
								{renderFilterChips(statusOptions, draftStatusFilter, setDraftStatusFilter)}
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

				<View style={styles.filtersSection}>
					{useInlineFilters ? (
						<View style={styles.filterRowWide}>
							{hospitalSelect}
							{modeSelect}
							{dateSelect}
							{statusSelect}
							{searchInput}
						</View>
					) : (
						<View style={styles.filterGridMobile}>
							{searchInput}
							<View style={styles.mobileSearchRow}>
								{hospitalSelect}
								{mobileFilterButton}
							</View>
						</View>
					)}
				</View>

				{loading && !useTable ? (
					<View style={styles.loadingWrap}>
						<ActivityIndicator size="small" color={TEAL} />
					</View>
				) : useTable ? (
					<>
						<AppTable<AppointmentRow>
							columns={columns}
							data={rows}
							totalRows={meta.total}
							loading={loading || refreshing}
							defaultPage={page}
							defaultPageSize={pageSize}
							pageSizeOptions={PAGE_SIZE_OPTIONS}
							defaultSortBy={isPatientView ? 'doctorName' : 'patientName'}
							defaultSortDirection="asc"
							emptyMessage="No appointments found"
							rowPadding="10px 14px"
							onRefresh={onRefresh}
							showPagination={false}
						/>
						{rows.length > 0 ? (
							<View style={styles.paginationWrap}>
								<PaginationBar
									page={meta.page}
									pageSize={pageSize}
									totalRows={meta.total}
									pageSizeOptions={PAGE_SIZE_OPTIONS}
									onPageChange={handlePageChange}
									onPageSizeChange={handlePageSizeChange}
								/>
							</View>
						) : null}
					</>
				) : (
					<FlatList
						data={rows}
						keyExtractor={(item) => item.id}
						renderItem={({ item }) => (
							<MobileAppointmentCard row={item} />
						)}
						style={styles.mobileList}
						contentContainerStyle={rows.length === 0 ? styles.emptyListContent : styles.listContent}
						showsVerticalScrollIndicator={false}
						ListEmptyComponent={<EmptyState />}
						refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
					/>
				)}

				{!useTable && rows.length > 0 ? (
					<View style={[styles.paginationWrap, styles.mobilePaginationWrap, { paddingBottom: Math.max(insets.bottom + 8, 16) }]}>
						<PaginationBar
							page={meta.page}
							pageSize={pageSize}
							totalRows={meta.total}
							pageSizeOptions={MOBILE_PAGE_SIZE_OPTIONS}
							onPageChange={handlePageChange}
							onPageSizeChange={handlePageSizeChange}
						/>
					</View>
				) : null}

				{!useInlineFilters && renderFilterModal()}
		</>
	)

	if (useTable) {
		return (
			<View style={styles.screen}>
				<ScrollView
					style={styles.tablePageScroll}
					contentContainerStyle={[
						styles.tablePageContent,
						{ paddingTop: 12, maxWidth: contentWidth },
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
			<View style={[styles.container, { paddingTop: 12, maxWidth: contentWidth }]}>
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
		overflow: 'hidden',
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
	filtersSection: {
		marginBottom: 10,
	},
	filterScrollContent: {
		paddingBottom: 6,
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
		borderColor: BORDER,
		backgroundColor: SURFACE,
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
	outlinedFilterWrap: {
		height: 56,
		justifyContent: 'center',
		position: 'relative',
		flexShrink: 1,
	},
	outlinedFilterWrapMobile: {
		height: 44,
	},
	outlinedFilterLabel: {
		position: 'absolute',
		top: -1,
		left: 14,
		zIndex: 2,
		backgroundColor: BACKGROUND,
		paddingHorizontal: 5,
	},
	outlinedFilterLabelMobile: {
		top: -2,
		left: 13,
		paddingHorizontal: 4,
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
		backgroundColor: SURFACE,
	},
	mobileHospitalSelectCard: {
		height: 42,
		borderRadius: 8,
	},
	hospitalSelectWide: {
		flexGrow: 1.1,
		flexShrink: 1,
		flexBasis: 150,
		minWidth: 136,
	},
	mobileHospitalSelect: {
		flex: 1,
		width: 'auto',
		minWidth: 0,
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
		backgroundColor: SURFACE,
		alignItems: 'center',
		justifyContent: 'center',
		flexShrink: 0,
		padding: 0,
	},
	filterIconButtonActive: {
		backgroundColor: '#e9f8f7',
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
		borderColor: '#d8dee6',
		backgroundColor: '#f8fafc',
		paddingHorizontal: 14,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 8,
	},
	dateRangeText: {
		flex: 1,
		minWidth: 0,
		fontSize: 12,
		lineHeight: 16,
		fontWeight: '600',
		color: TEXT,
	},
	dateRangePlaceholder: {
		color: MUTED,
	},
	dateRangeDivider: {
		width: 12,
		height: 1,
		borderRadius: 1,
		backgroundColor: '#aab3bb',
		flexShrink: 0,
	},
	datePickerWrap: {
		borderRadius: 10,
		borderWidth: 1,
		borderColor: BORDER,
		backgroundColor: SURFACE,
		overflow: 'hidden',
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
		paddingBottom: 8,
	},
	mobileList: {
		flex: 1,
	},
	paginationWrap: {
		width: '100%',
		marginTop: 8,
	},
	mobilePaginationWrap: {
		paddingTop: 4,
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
	authLoadingScreen: {
		backgroundColor: BACKGROUND,
	},
})
