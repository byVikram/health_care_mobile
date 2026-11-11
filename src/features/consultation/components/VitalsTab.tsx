import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
	ActivityIndicator,
	FlatList,
	RefreshControl,
	ScrollView,
	StyleSheet,
	TouchableOpacity,
	View,
	useWindowDimensions,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { AppTypography } from '../../../components/common'
import { VitalHistoryRow, VitalStat } from '../../../types/consultation'
import {
	getLatestVitals,
	getPatientReports,
	getVitalsHistory,
	mapLatestVitalsToStats,
	mapVitalToRow,
	recordVital,
	type ReportRecord,
} from '../VitalsService'
import AddVitalsModal from './AddVitalsModal'
import Toast from 'react-native-toast-message'
import { showStatusModal } from '../../../services/apiService'

interface TabColumn {
	key: string
	label: string
	refRange?: string
	showDot?: boolean
	showTime?: boolean
}

interface TabConfig {
	id: string
	label: string
	columns: TabColumn[]
	showDownload?: boolean
	rows: VitalHistoryRow[]
}

interface VitalsTabProps {
	patientId?: string
}

const TEAL = '#2b6f71'
const BMI_YELLOW = '#FF9D00'

const VITAL_STATS: VitalStat[] = [
	{ id: 'temp', label: 'Body Temperature', value: '98.6', unit: 'F', date: '17/04/25' },
	{ id: 'bp', label: 'Blood Pressure', value: '180/80', unit: 'mm/Hg', date: '17/04/25' },
	{ id: 'glucose', label: 'Blood Glucose Level', value: '85', unit: 'mg/dL', date: '17/04/2025' },
	{ id: 'weight', label: 'Weight', value: '45', unit: 'Kg', date: '17/04/2025' },
	{ id: 'heightBmi', label: 'Height', value: '165', unit: 'cm', date: '17/04/2025', bmiValue: '16.5', bmiCategory: 'Underweight' },
	{ id: 'spo2', label: 'Oxygen Saturation (spO2)', value: '79', unit: '%', date: '17/04/2025' },
]

const PERIOD_OPTIONS = [
	{ value: 'all', label: 'All' },
	{ value: 'today', label: 'Today' },
	{ value: 'yesterday', label: 'Yesterday' },
	{ value: '7days', label: 'Last 7 Days' },
	{ value: '30days', label: 'Last 30 Days' },
	{ value: '90days', label: 'Last 90 Days' },
	{ value: 'custom', label: 'Custom' },
]

const TAB_VITAL_TYPE: Record<string, string> = {
	bp: 'blood_pressure',
	glucose: 'glucose_level',
	weight: 'weight',
	others: 'others',
	ecg: 'ecg',
}

const PERIOD_DAYS: Record<string, number | undefined> = {
	all: undefined,
	today: 1,
	yesterday: 2,
	'7days': 7,
	'30days': 30,
	'90days': 90,
	custom: undefined,
}

const DEFAULT_TAB_CONFIGS: TabConfig[] = [
	{
		id: 'bp',
		label: 'Blood Pressure',
		columns: [
			{ key: 'morning', label: 'Morning', refRange: '90/60 - 120/80 mmHg', showDot: true, showTime: true },
			{ key: 'evening', label: 'Evening', refRange: '90/60 - 120/80 mmHg', showDot: true, showTime: true },
		],
		rows: [
			{
				id: '1',
				date: '03/01/2025',
				cells: { morning: '135/85 mmHg', evening: '180/80 mmHg' },
				cellStatus: { morning: 'abnormal', evening: 'abnormal' },
			},
			{
				id: '2',
				date: '17/04/2025',
				cells: { morning: '88/58 mmHg', evening: '78/48 mm/Hg' },
				cellStatus: { morning: 'abnormal', evening: 'abnormal' },
			},
			{
				id: '3',
				date: '15/12/2024',
				cells: { morning: '120/80 mmHg', evening: '120/80 mmHg' },
				cellStatus: { morning: 'normal', evening: 'normal' },
			},
			{
				id: '4',
				date: '17/12/2024',
				cells: { morning: '72/110 mmHg', evening: '85/120 mmHg' },
				cellStatus: { morning: 'abnormal', evening: 'abnormal' },
			},
			{
				id: '5',
				date: '15/8/2024',
				cells: { morning: '120/80 mmHg', evening: '120/80 mmHg' },
				cellStatus: { morning: 'normal', evening: 'normal' },
			},
			{
				id: '6',
				date: '5/8/2024',
				cells: { morning: '120/80 mmHg', evening: '120/80 mmHg' },
				cellStatus: { morning: 'normal', evening: 'normal' },
			},
		],
	},
	{
		id: 'glucose',
		label: 'Glucose Level',
		columns: [
			{ key: 'fasting', label: 'Fasting Sugar', refRange: '70 - 99 mg/dL', showDot: true, showTime: true },
			{ key: 'random', label: 'Random Sugar', refRange: '< 140 mg/dL', showDot: true, showTime: true },
		],
		rows: [
			{
				id: '1',
				date: '17/04/2025 07:40 AM',
				cells: { fasting: '140 mg/dL', random: '85 mg/dL' },
				cellStatus: { fasting: 'abnormal', random: 'normal' },
			},
			{
				id: '2',
				date: '03/01/2025 07:40 AM',
				cells: { fasting: '240 mg/dL', random: '65 mg/dL' },
				cellStatus: { fasting: 'abnormal', random: 'normal' },
			},
			{
				id: '3',
				date: '15/12/2024 07:40 AM',
				cells: { fasting: '90 mg/dL', random: '144 mg/dL' },
				cellStatus: { fasting: 'normal', random: 'abnormal' },
			},
			{
				id: '4',
				date: '17/12/2024 07:40 AM',
				cells: { fasting: '80 mg/dL', random: '148 mg/dL' },
				cellStatus: { fasting: 'normal', random: 'abnormal' },
			},
			{
				id: '5',
				date: '17/04/2025 07:40 AM',
				cells: { fasting: '140 mg/dL', random: '100 mg/dL' },
				cellStatus: { fasting: 'abnormal', random: 'normal' },
			},
			{
				id: '6',
				date: '5/8/2024 07:40 AM',
				cells: { fasting: '160 mg/dL', random: '120 mg/dL' },
				cellStatus: { fasting: 'abnormal', random: 'normal' },
			},
		],
	},
	{
		id: 'weight',
		label: 'Weight',
		columns: [{ key: 'weight', label: 'Weight in Kg', refRange: 'Ideal range: 58-70 kg', showDot: true }],
		rows: [
			{ id: '1', date: '17/04/2025 08:00 AM', cells: { weight: '45 Kg' }, cellStatus: { weight: 'abnormal' } },
			{ id: '2', date: '17/04/2025 08:00 AM', cells: { weight: '44 Kg' }, cellStatus: { weight: 'abnormal' } },
			{ id: '3', date: '17/04/2025 08:00 AM', cells: { weight: '55 Kg' }, cellStatus: { weight: 'abnormal' } },
			{ id: '4', date: '17/04/2025 08:00 AM', cells: { weight: '64 Kg' }, cellStatus: { weight: 'normal' } },
			{ id: '5', date: '17/04/2025 08:00 AM', cells: { weight: '64 Kg' }, cellStatus: { weight: 'normal' } },
			{ id: '6', date: '17/04/2025 08:00 AM', cells: { weight: '64 Kg' }, cellStatus: { weight: 'normal' } },
			{ id: '7', date: '17/04/2025 08:00 AM', cells: { weight: '64 Kg' }, cellStatus: { weight: 'normal' } },
		],
	},
	{
		id: 'others',
		label: 'Others',
		columns: [
			{ key: 'waist', label: 'Waist' },
			{ key: 'hba1c', label: 'HbA1C' },
			{ key: 'ldl', label: 'LDL' },
			{ key: 'hdl', label: 'HDL' },
			{ key: 'tgl', label: 'TGL' },
			{ key: 'respRate', label: 'Respiration rate' },
			{ key: 'pulseRate', label: 'Pulse rate' },
			{ key: 'spo2', label: 'SpO2' },
			{ key: 'temp', label: 'Temperature' },
		],
		rows: [
			{
				id: '1',
				date: '15/12/2024 10:00AM',
				cells: {
					waist: '60 cms',
					hba1c: '9 %',
					ldl: '87 mg/dL',
					hdl: '87 mg/dL',
					tgl: '87 mg/dL',
					respRate: '79 bpm',
					pulseRate: '79 bpm',
					spo2: '79',
					temp: '98.6 F',
				},
			},
			{
				id: '2',
				date: '17/04/2025 10:00AM',
				cells: {
					waist: '60 cms',
					hba1c: '9 %',
					ldl: '87 mg/dL',
					hdl: '87 mg/dL',
					tgl: '87 mg/dL',
					respRate: '79 bpm',
					pulseRate: '79 bpm',
					spo2: '79',
					temp: '98.6 F',
				},
			},
			{
				id: '3',
				date: '17/12/2024 10:00AM',
				cells: {
					waist: '60 cms',
					hba1c: '9 %',
					ldl: '87 mg/dL',
					hdl: '87 mg/dL',
					tgl: '87 mg/dL',
					respRate: '79 bpm',
					pulseRate: '79 bpm',
					spo2: '79',
					temp: '98.6 F',
				},
			},
			{
				id: '4',
				date: '5/8/2024 10:00AM',
				cells: {
					waist: '60 cms',
					hba1c: '9 %',
					ldl: '87 mg/dL',
					hdl: '87 mg/dL',
					tgl: '87 mg/dL',
					respRate: '79 bpm',
					pulseRate: '79 bpm',
					spo2: '79',
					temp: '98.6 F',
				},
			},
		],
	},
	{
		id: 'ecg',
		label: 'ECG',
		showDownload: true,
		// ECG matches the web report-history view rather than raw vital readings.
		columns: [
			{ key: 'reportType', label: 'Report Type' },
			{ key: 'notes', label: 'Notes' },
		],
		rows: [
			{
				id: '1',
				date: '17/04/2025 10:00AM',
				cells: { reportType: 'ecg', notes: '-' },
				hasDownload: true,
			},
			{
				id: '2',
				date: '03/01/2025 10:00AM',
				cells: { reportType: 'ecg', notes: '-' },
				hasDownload: true,
			},
			{
				id: '3',
				date: '15/12/2024 10:00AM',
				cells: { reportType: 'ecg', notes: '-' },
				hasDownload: true,
			},
			{
				id: '4',
				date: '17/12/2024 10:00AM',
				cells: { reportType: 'ecg', notes: '-' },
				hasDownload: true,
			},
			{
				id: '5',
				date: '5/8/2024 10:00AM',
				cells: { reportType: 'ecg', notes: '-' },
				hasDownload: true,
			},
		],
	},
]

const VITAL_ICONS: Record<string, { name: React.ComponentProps<typeof MaterialCommunityIcons>['name']; color: string }> = {
	temp: { name: 'thermometer', color: '#e53935' },
	bp: { name: 'heart-pulse', color: '#e53935' },
	glucose: { name: 'water-outline', color: '#e53935' },
	weight: { name: 'weight-kilogram', color: '#5c6bc0' },
	spo2: { name: 'weather-windy', color: '#29b6f6' },
}

const withHeightBmiCard = (stats: VitalStat[]) => {
	const heightBmiCard = VITAL_STATS.find((stat) => stat.id === 'heightBmi')
	if (!heightBmiCard || stats.some((stat) => stat.id === 'heightBmi')) return stats
	return [...stats, heightBmiCard]
}

const updateTabRows = (tabs: TabConfig[], tabId: string, rows: VitalHistoryRow[]) =>
	tabs.map((tab) => (tab.id === tabId ? { ...tab, rows } : tab))

const mapReportToRow = (report: ReportRecord, index: number): VitalHistoryRow => ({
	id: String(report.id ?? index),
	date: report.report_date ? new Date(report.report_date).toLocaleDateString('en-GB') : '',
	cells: {
		reportType: report.report_type ?? '-',
		notes: report.notes ?? '-',
	},
	hasDownload: Boolean(report.file_s3_key),
})

function VitalStatCard({ stat, width }: { stat: VitalStat; width: number }) {
	const icon = VITAL_ICONS[stat.id] ?? { name: 'chart-line', color: TEAL }

	if (stat.id === 'heightBmi') {
		return (
			<View style={[styles.statCard, styles.heightBmiCard, { width }]}>
				<View style={[styles.statIconWrap, styles.heightBmiIconWrap]}>
					<MaterialCommunityIcons name="human-male-height" size={22} color={TEAL} />
				</View>
				<View style={styles.heightBmiContent}>
					<View style={styles.heightBmiMetric}>
						<View style={styles.statValueRow}>
							<AppTypography variant="body" style={styles.statValue}>
								{stat.value}
							</AppTypography>
							<AppTypography variant="caption" style={styles.statUnit}>
								{stat.unit}
							</AppTypography>
						</View>
						<AppTypography variant="caption" style={styles.statLabel} numberOfLines={1}>
							Height
						</AppTypography>
					</View>
					<View style={styles.heightBmiDivider} />
					<View style={[styles.heightBmiMetric, styles.bmiMetric]}>
						<AppTypography variant="body" style={[styles.statValue, styles.bmiValue]}>
							{stat.bmiValue ?? '-'}
						</AppTypography>
						<AppTypography variant="caption" style={styles.statLabel}>
							BMI
						</AppTypography>
						<AppTypography variant="caption" style={styles.bmiCategory}>
							{stat.bmiCategory ?? '-'}
						</AppTypography>
					</View>
				</View>
				<AppTypography variant="caption" style={[styles.statDate, styles.heightBmiDate]}>
					{stat.date}
				</AppTypography>
			</View>
		)
	}

	return (
		<View style={[styles.statCard, { width }]}>
			<View style={styles.statIconWrap}>
				<MaterialCommunityIcons name={icon.name} size={22} color={icon.color} />
			</View>
			<View style={styles.statCopy}>
				<View style={styles.statValueRow}>
					<AppTypography variant="body" style={styles.statValue}>
						{stat.value}
					</AppTypography>
					<AppTypography variant="caption" style={styles.statUnit}>
						{stat.unit}
					</AppTypography>
				</View>
				<AppTypography variant="caption" style={styles.statLabel} numberOfLines={2}>
					{stat.label}
				</AppTypography>
			</View>
			<AppTypography variant="caption" style={styles.statDate}>
				{stat.date}
			</AppTypography>
		</View>
	)
}

function HistoryRow({
	row,
	columns,
	showDownload,
	dateWidth,
	columnWidth,
	actionWidth,
	rowWidth,
}: {
	row: VitalHistoryRow
	columns: TabColumn[]
	showDownload?: boolean
	dateWidth: number
	columnWidth: number
	actionWidth: number
	rowWidth: number
}) {
	return (
		<View style={[styles.historyRow, { width: rowWidth }]}>
			<View style={[styles.historyDateCell, { width: dateWidth }]}>
				<AppTypography variant="caption" style={styles.rowDate} numberOfLines={2}>
					{row.date || '-'}
				</AppTypography>
			</View>

			{columns.map((column) => (
				<View key={column.key} style={[styles.historyValueCell, { width: columnWidth }]}>
					<View style={styles.valueContent}>
						<AppTypography variant="body" style={styles.cellValue} numberOfLines={2}>
							{row.cells[column.key] ?? '-'}
						</AppTypography>
						{column.showDot && row.cellStatus?.[column.key] ? (
							<View
								style={[
									styles.statusDot,
									row.cellStatus[column.key] === 'normal' ? styles.statusDotNormal : styles.statusDotAbnormal,
								]}
							/>
						) : null}
					</View>
				</View>
			))}

			<View style={[styles.rowActions, { width: actionWidth }]}>
				{showDownload ? (
					<>
						<TouchableOpacity style={styles.iconButton} activeOpacity={0.8}>
							<MaterialCommunityIcons name="eye-outline" size={16} color="#7a878e" />
						</TouchableOpacity>
						<TouchableOpacity style={styles.iconButton} activeOpacity={0.8} disabled={!row.hasDownload}>
							<MaterialCommunityIcons
								name="download-outline"
								size={16}
								color={row.hasDownload ? '#7a878e' : '#c6cdd1'}
							/>
						</TouchableOpacity>
						<TouchableOpacity style={styles.iconButton} activeOpacity={0.8}>
							<MaterialCommunityIcons name="auto-fix" size={16} color="#7a878e" />
						</TouchableOpacity>
					</>
				) : (
					<TouchableOpacity style={styles.iconButton} activeOpacity={0.8}>
						<MaterialCommunityIcons name="pencil-outline" size={16} color="#7a878e" />
					</TouchableOpacity>
				)}
			</View>
		</View>
	)
}

export default function VitalsTab({ patientId }: VitalsTabProps) {
	const { width, height } = useWindowDimensions()
	const isTablet = width >= 768
	const isLandscape = width > height
	const [activeTabId, setActiveTabId] = useState('bp')
	const [period, setPeriod] = useState('30days')
	const [stats, setStats] = useState<VitalStat[]>(VITAL_STATS)
	const [tabConfigs, setTabConfigs] = useState<TabConfig[]>(DEFAULT_TAB_CONFIGS)
	const [loading, setLoading] = useState(false)
	const [refreshing, setRefreshing] = useState(false)
	const [errorMessage, setErrorMessage] = useState('')
	const [addVitalsVisible, setAddVitalsVisible] = useState(false)

	const activeTab = useMemo(
		() => tabConfigs.find((tab) => tab.id === activeTabId) ?? tabConfigs[0],
		[activeTabId, tabConfigs]
	)

	const statCardWidth = useMemo(() => {
		const horizontalPadding = 32
		const gap = 10
		const columns = isTablet && isLandscape ? 3 : 2
		return (width - horizontalPadding - gap * (columns - 1)) / columns
	}, [isLandscape, isTablet, width])

	const tableMetrics = useMemo(() => {
		const tableAvailableWidth = Math.max(width - 32, 320)
		const dateWidth = isTablet ? 150 : 124
		const actionWidth = activeTab.showDownload ? (isTablet ? 116 : 104) : isTablet ? 56 : 48
		const baseColumnWidth =
			activeTab.id === 'ecg'
				? isTablet
					? 220
					: 172
				: activeTab.id === 'others'
					? isTablet
						? 148
						: 126
					: isTablet
						? 150
						: 126
		const fillColumnWidth = (tableAvailableWidth - dateWidth - actionWidth) / Math.max(activeTab.columns.length, 1)
		const columnWidth = Math.max(baseColumnWidth, fillColumnWidth)
		const contentWidth = dateWidth + actionWidth + columnWidth * activeTab.columns.length

		return {
			actionWidth,
			columnWidth,
			dateWidth,
			tableWidth: Math.max(tableAvailableWidth + 1, contentWidth),
		}
	}, [activeTab.columns.length, activeTab.id, activeTab.showDownload, isTablet, width])

	const fetchLatestVitals = useCallback(async () => {
		if (!patientId) return

		try {
			setLoading(true)
			const data = await getLatestVitals(patientId)
			const nextStats = mapLatestVitalsToStats(data)
			if (nextStats.length > 0) setStats(withHeightBmiCard(nextStats))
			setErrorMessage('')
		} catch (error: any) {
			console.log('[VitalsTab] failed to load latest vitals:', error)
			setErrorMessage(error?.response?.data?.message || error?.message || 'Unable to load vitals right now.')
		} finally {
			setLoading(false)
			setRefreshing(false)
		}
	}, [patientId])

	const fetchHistory = useCallback(async () => {
		if (!patientId || activeTabId === 'ecg') return

		try {
			setLoading(true)
			const vitalType = TAB_VITAL_TYPE[activeTabId]
			const days = PERIOD_DAYS[period]
			const data = await getVitalsHistory(patientId, {
				vital_type: vitalType,
				...(days !== undefined ? { days } : {}),
			})
			const rows = data.map((vital, index) => mapVitalToRow(vital, activeTabId, index))

			setTabConfigs((prev) => updateTabRows(prev, activeTabId, rows))
			setErrorMessage('')
		} catch (error: any) {
			console.log('[VitalsTab] failed to load vitals history:', error)
			setErrorMessage(error?.response?.data?.message || error?.message || 'Unable to load vitals history right now.')
		} finally {
			setLoading(false)
			setRefreshing(false)
		}
	}, [activeTabId, patientId, period])

	const fetchReports = useCallback(async () => {
		if (!patientId || activeTabId !== 'ecg') return

		try {
			setLoading(true)
			const data = await getPatientReports(patientId)
			setTabConfigs((prev) => updateTabRows(prev, 'ecg', data.map(mapReportToRow)))
			setErrorMessage('')
		} catch (error: any) {
			console.log('[VitalsTab] failed to load ECG reports:', error)
			setErrorMessage(error?.response?.data?.message || error?.message || 'Unable to load ECG reports right now.')
		} finally {
			setLoading(false)
			setRefreshing(false)
		}
	}, [activeTabId, patientId])

	useEffect(() => {
		void fetchLatestVitals()
	}, [fetchLatestVitals])

	useEffect(() => {
		void fetchHistory()
	}, [fetchHistory])

	useEffect(() => {
		void fetchReports()
	}, [fetchReports])

	const handleRefresh = () => {
		setRefreshing(true)
		void fetchLatestVitals()
		if (activeTabId === 'ecg') {
			void fetchReports()
		} else {
			void fetchHistory()
		}
	}

	const handleSaveVitals = async (formData: any) => {
		if (!patientId) return
		try {
			setLoading(true)
			const promises: Promise<any>[] = []

			// 1. Blood Pressure
			if (formData.bloodPressure) {
				const bpParts = formData.bloodPressure.split('/')
				const systolic = parseFloat(bpParts[0])
				const diastolic = parseFloat(bpParts[1] || '80')
				if (!isNaN(systolic)) {
					promises.push(
						recordVital(patientId, 'blood_pressure', {
							systolic,
							diastolic,
						})
					)
				}
			}

			// 2. Glucose Level
			const glucoseValue: Record<string, number> = {}
			if (formData.fastingSugar) {
				const fasting = parseFloat(formData.fastingSugar)
				if (!isNaN(fasting)) glucoseValue.fasting = fasting
			}
			if (formData.randomSugar) {
				const random = parseFloat(formData.randomSugar)
				if (!isNaN(random)) glucoseValue.random = random
			}
			if (Object.keys(glucoseValue).length > 0) {
				promises.push(recordVital(patientId, 'glucose_level', glucoseValue))
			}

			// 3. Weight
			if (formData.weight) {
				const w = parseFloat(formData.weight)
				if (!isNaN(w)) {
					promises.push(recordVital(patientId, 'weight', { weight: w }))
				}
			}

			// 4. SpO2
			if (formData.spo2) {
				const o2 = parseFloat(formData.spo2)
				if (!isNaN(o2)) {
					promises.push(recordVital(patientId, 'spo2', { spo2: o2 }))
				}
			}

			// 5. Temperature
			if (formData.temperature) {
				const temp = parseFloat(formData.temperature)
				if (!isNaN(temp)) {
					promises.push(recordVital(patientId, 'temperature', { temperature: temp }))
				}
			}

			// 6. Others
			const othersValue: Record<string, any> = {}
			const fields = ['waist', 'ldl', 'hba1c', 'hdl', 'tgl', 'pulseRate', 'respirationRate']
			fields.forEach((f) => {
				if (formData[f]) {
					othersValue[f === 'pulseRate' ? 'pulse_rate' : f === 'respirationRate' ? 'respiration_rate' : f] = formData[f]
				}
			})
			if (Object.keys(othersValue).length > 0) {
				promises.push(recordVital(patientId, 'others', othersValue))
			}

			if (promises.length > 0) {
				await Promise.all(promises)
				Toast.show({ type: 'success', text1: 'Patient vitals recorded successfully' })
				handleRefresh()
			}
		} catch (error: any) {
			showStatusModal({
				status: 'error',
				title: "Couldn't save the vitals",
				description: error?.message || 'Failed to save patient vitals.',
				submitText: 'OK',
			})
		} finally {
			setLoading(false)
		}
	}

	return (
		<View style={styles.container}>
			{/* Vital stat cards — flex wrap grid */}
			<View style={styles.statGrid}>
				{stats.map((stat) => (
					<VitalStatCard key={stat.id} stat={stat} width={statCardWidth} />
				))}
			</View>

			<View style={styles.historyCard}>
				<View style={styles.historyHeader}>
					<AppTypography variant="h4" style={styles.historyTitle}>
						Vitals History
					</AppTypography>
					{loading ? <ActivityIndicator size="small" color={TEAL} /> : null}
				</View>

				{errorMessage ? (
					<View style={styles.errorBanner}>
						<MaterialCommunityIcons name="alert-circle-outline" size={16} color="#b85c00" />
						<AppTypography variant="caption" style={styles.errorText}>
							{errorMessage}
						</AppTypography>
					</View>
				) : null}

				<View style={styles.filterRow}>
					<ScrollView
						horizontal={true}
						showsHorizontalScrollIndicator={false}
						bounces
						alwaysBounceHorizontal
						decelerationRate="fast"
						nestedScrollEnabled
						keyboardShouldPersistTaps="handled"
						style={styles.tabScroll}
						contentContainerStyle={styles.tabSlider}
					>
						{tabConfigs.map((tab, index) => {
							const isActive = activeTabId === tab.id
							return (
								<View key={tab.id} style={styles.tabItemWrap}>
									<TouchableOpacity
										activeOpacity={0.82}
										style={[styles.tabPill, isActive && styles.tabPillActive]}
										onPress={() => setActiveTabId(tab.id)}
									>
										<AppTypography
											variant="caption"
											style={[styles.tabText, isActive && styles.tabTextActive]}
											numberOfLines={1}
										>
											{tab.label}
										</AppTypography>
									</TouchableOpacity>
									{index < tabConfigs.length - 1 ? <AppTypography style={styles.tabSeparator}>|</AppTypography> : null}
								</View>
							)
						})}
					</ScrollView>

					<View style={styles.periodFilterRow}>
						<ScrollView
							horizontal={true}
							showsHorizontalScrollIndicator={false}
							bounces
							alwaysBounceHorizontal
							decelerationRate="fast"
							nestedScrollEnabled
							keyboardShouldPersistTaps="handled"
							style={styles.periodChipScroll}
							contentContainerStyle={styles.periodChipScroller}
						>
							{PERIOD_OPTIONS.map((option) => {
								const isSelected = period === option.value
								return (
									<TouchableOpacity
										key={option.value}
										activeOpacity={0.82}
										style={[styles.periodChip, isSelected && styles.periodChipActive]}
										onPress={() => setPeriod(option.value)}
									>
										<AppTypography
											variant="caption"
											style={[styles.periodChipText, isSelected && styles.periodChipTextActive]}
											numberOfLines={1}
										>
											{option.label}
										</AppTypography>
									</TouchableOpacity>
								)
							})}
						</ScrollView>
					</View>
				</View>

				<ScrollView
					style={styles.tableScroller}
					horizontal={true}
					showsHorizontalScrollIndicator
					bounces
					alwaysBounceHorizontal
					decelerationRate="fast"
					nestedScrollEnabled
					keyboardShouldPersistTaps="handled"
					contentContainerStyle={[styles.tableScrollerContent, { width: tableMetrics.tableWidth }]}
				>
					<View style={[styles.tableContent, { width: tableMetrics.tableWidth }]}>
						<View style={[styles.tableHeader, { width: tableMetrics.tableWidth }]}>
							<View style={[styles.dateHeader, { width: tableMetrics.dateWidth }]}>
								<AppTypography variant="caption" style={styles.tableHeaderText}>
									Date
								</AppTypography>
								<MaterialCommunityIcons name="arrow-up" size={13} color="#33444d" />
							</View>
							{activeTab.columns.map((column) => (
								<View key={column.key} style={[styles.columnHeaderCell, { width: tableMetrics.columnWidth }]}>
									<AppTypography variant="caption" style={styles.tableHeaderText} numberOfLines={2}>
										{column.label}
									</AppTypography>
								</View>
							))}
							<View style={{ width: tableMetrics.actionWidth }} />
						</View>

						<FlatList
							data={activeTab.rows}
							keyExtractor={(item) => item.id}
							style={styles.historyList}
							contentContainerStyle={styles.historyListContent}
							showsVerticalScrollIndicator={false}
							scrollEnabled={false}
							refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={TEAL} />}
							renderItem={({ item }) => (
								<HistoryRow
									row={item}
									columns={activeTab.columns}
									showDownload={activeTab.showDownload}
									dateWidth={tableMetrics.dateWidth}
									columnWidth={tableMetrics.columnWidth}
									actionWidth={tableMetrics.actionWidth}
									rowWidth={tableMetrics.tableWidth}
								/>
							)}
							ListEmptyComponent={
								<View style={styles.emptyState}>
									<AppTypography variant="body" style={styles.emptyText}>
										No data available
									</AppTypography>
								</View>
							}
						/>
					</View>
				</ScrollView>
			</View>

			{/* FAB — opens Add Vitals modal */}
			<TouchableOpacity
				style={styles.fab}
				activeOpacity={0.86}
				onPress={() => setAddVitalsVisible(true)}
			>
				<MaterialCommunityIcons name="plus" size={26} color="#ffffff" />
			</TouchableOpacity>

			<AddVitalsModal
				visible={addVitalsVisible}
				onClose={() => setAddVitalsVisible(false)}
				onSave={handleSaveVitals}
			/>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		position: 'relative',
	},
	statGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		paddingHorizontal: 16,
		paddingTop: 6,
		paddingBottom: 12,
		gap: 10,
	},
	statCard: {
		minHeight: 64,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#edf1f2',
		backgroundColor: '#ffffff',
		padding: 9,
		flexDirection: 'row',
		alignItems: 'center',
		shadowColor: '#000000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.06,
		shadowRadius: 8,
		elevation: 2,
	},
	heightBmiCard: {
		alignItems: 'stretch',
		justifyContent: 'space-between',
		position: 'relative',
	},
	heightBmiContent: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		paddingRight: 4,
	},
	heightBmiMetric: {
		flex: 1,
		minWidth: 0,
		alignItems: 'center',
		justifyContent: 'center',
	},
	heightBmiDivider: {
		width: 1,
		alignSelf: 'stretch',
		backgroundColor: '#edf1f2',
		marginHorizontal: 4,
	},
	bmiMetric: {
		flex: 1.25,
		justifyContent: 'center',
		paddingTop: 3,
	},
	bmiValue: {
		color: BMI_YELLOW,
		marginTop: 13,
		lineHeight: 16,

	},
	bmiCategory: {
		color: BMI_YELLOW,
		fontSize: 9,
		fontWeight: '500',
		lineHeight: 12,
		marginTop: 1,
		textAlign: 'center',
	},
	heightBmiDate: {
		position: 'absolute',
		top: 9,
		right: 9,
		marginLeft: 0,
	},
	statIconWrap: {
		width: 28,
		alignItems: 'flex-start',
	},
	heightBmiIconWrap: {
		justifyContent: 'center',
	},
	statCopy: {
		flex: 1,
		minWidth: 0,
	},
	statValueRow: {
		flexDirection: 'row',
		alignItems: 'baseline',
		gap: 4,
	},
	statValue: {
		color: '#263238',
		fontSize: 14,
		fontWeight: '700',
		lineHeight: 18,
	},
	statUnit: {
		color: '#71808a',
		fontSize: 10,
	},
	statLabel: {
		color: '#71808a',
		fontSize: 10,
		lineHeight: 13,
		marginTop: 2,
	},
	statDate: {
		alignSelf: 'flex-start',
		color: '#a4adb3',
		fontSize: 9,
		marginLeft: 6,
	},
	historyCard: {
		marginHorizontal: 16,
		height: 360,
		borderRadius: 10,
		backgroundColor: '#ffffff',
		borderWidth: 1,
		borderColor: '#edf1f2',
		overflow: 'hidden',
	},
	historyHeader: {
		paddingHorizontal: 12,
		paddingTop: 8,
		paddingBottom: 3,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	historyTitle: {
		color: '#25323a',
		fontSize: 16,
		fontWeight: '700',
	},
	errorBanner: {
		marginHorizontal: 16,
		marginBottom: 10,
		borderRadius: 8,
		backgroundColor: '#fff8ef',
		paddingHorizontal: 10,
		paddingVertical: 8,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 7,
	},
	errorText: {
		flex: 1,
		color: '#8a4a00',
		fontSize: 11,
	},
	filterRow: {
		paddingHorizontal: 10,
		paddingBottom: 5,
		gap: 6,
	},
	tabScroll: {
		width: '100%',
		flexGrow: 0,
		flexShrink: 0,
	},
	tabSlider: {
		alignItems: 'center',
		flexDirection: 'row',
		flexWrap: 'nowrap',
		paddingRight: 12,
	},
	tabItemWrap: {
		flexDirection: 'row',
		alignItems: 'center',
		flexShrink: 0,
	},
	tabPill: {
		borderRadius: 6,
		paddingHorizontal: 9,
		paddingVertical: 4,
		flexShrink: 0,
	},
	tabPillActive: {
		backgroundColor: TEAL,
	},
	tabText: {
		color: '#69777f',
		fontSize: 11,
		fontWeight: '500',
	},
	tabTextActive: {
		color: '#ffffff',
		fontWeight: '700',
	},
	tabSeparator: {
		color: '#c1c9cd',
		marginHorizontal: 2,
	},
	periodFilterRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 8,
		marginTop: 5,
		width: '100%',
		minHeight: 32,
	},
	periodChipScroll: {
		width: '100%',
		flexGrow: 0,
		flexShrink: 0,
	},
	periodChipScroller: {
		alignItems: 'center',
		flexDirection: 'row',
		flexWrap: 'nowrap',
		gap: 8,
		paddingRight: 16,
	},
	periodChip: {
		minHeight: 28,
		borderRadius: 999,
		borderWidth: 1,
		borderColor: '#EAECF0',
		backgroundColor: '#F3F4F6',
		paddingHorizontal: 12,
		paddingVertical: 5,
		alignItems: 'center',
		justifyContent: 'center',
		flexShrink: 0,
	},
	periodChipActive: {
		backgroundColor: TEAL,
		borderColor: TEAL,
	},
	periodChipText: {
		color: '#69777f',
		fontSize: 11,
		fontWeight: '500',
	},
	periodChipTextActive: {
		color: '#ffffff',
		fontWeight: '700',
	},
	tableHeader: {
		backgroundColor: 'rgba(43,111,113,0.06)',
		borderColor: '#edf1f2',
		flexDirection: 'row',
		alignItems: 'stretch',
		borderTopWidth: 1,
		borderBottomWidth: 1,
	},
	dateHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 8,
		paddingVertical: 5,
		gap: 4,
	},
	columnHeaderCell: {
		justifyContent: 'center',
		paddingHorizontal: 8,
		paddingVertical: 5,
		borderLeftWidth: 1,
		borderLeftColor: '#edf1f2',
	},
	tableHeaderText: {
		color: '#33444d',
		fontSize: 11,
		fontWeight: '700',
	},
	tableScroller: {
		flex: 1,
		backgroundColor: '#ffffff',
		width: '100%',
	},
	tableScrollerContent: {
		paddingRight: 1,
	},
	tableContent: {
		backgroundColor: '#ffffff',
	},
	historyList: {
		flex: 1,
		backgroundColor: '#ffffff',
	},
	historyListContent: {
		paddingBottom: 0,
	},
	historyRow: {
		flexDirection: 'row',
		alignItems: 'stretch',
		minHeight: 34,
		borderBottomWidth: 1,
		borderColor: '#edf1f2',
	},
	historyDateCell: {
		justifyContent: 'center',
		paddingHorizontal: 8,
		paddingVertical: 4,
	},
	historyValueCell: {
		justifyContent: 'center',
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderLeftWidth: 1,
		borderLeftColor: '#edf1f2',
	},
	rowDate: {
		color: '#667780',
		fontSize: 10,
		lineHeight: 13,
	},
	valueContent: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 5,
	},
	rowActions: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 2,
		paddingHorizontal: 4,
		borderLeftWidth: 1,
		borderLeftColor: '#edf1f2',
	},
	iconButton: {
		width: 22,
		height: 22,
		borderRadius: 11,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#f6f8f8',
	},
	cellValue: {
		color: '#263238',
		fontSize: 11,
		fontWeight: '600',
		lineHeight: 14,
		flexShrink: 1,
	},
	statusDot: {
		width: 6,
		height: 6,
		borderRadius: 3,
	},
	statusDotNormal: {
		backgroundColor: '#2e7d32',
	},
	statusDotAbnormal: {
		backgroundColor: '#d32f2f',
	},
	emptyState: {
		marginTop: 0,
		padding: 24,
		alignItems: 'center',
	},
	emptyText: {
		color: '#8a969d',
		fontSize: 13,
	},
	fab: {
		position: 'absolute',
		right: 18,
		bottom: 18,
		width: 52,
		height: 52,
		borderRadius: 26,
		backgroundColor: TEAL,
		alignItems: 'center',
		justifyContent: 'center',
		shadowColor: '#2b6f71',
		shadowOffset: { width: 0, height: 5 },
		shadowOpacity: 0.32,
		shadowRadius: 10,
		elevation: 8,
	},
})
