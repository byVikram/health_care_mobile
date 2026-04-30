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
import { AppSelect, AppTypography } from '../../../components/common'
import { VitalHistoryRow, VitalStat } from '../../../types/consultation'
import { vitalsService } from '../VitalsService'
import AddVitalsModal from './AddVitalsModal'

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

const VITAL_STATS: VitalStat[] = [
	{ id: 'temp', label: 'Body Temperature', value: '98.6', unit: 'F', date: '17/04/25' },
	{ id: 'bp', label: 'Blood Pressure', value: '180/80', unit: 'mm/Hg', date: '17/04/25' },
	{ id: 'glucose', label: 'Blood Glucose Level', value: '85', unit: 'mg/dL', date: '17/04/2025' },
	{ id: 'weight', label: 'Weight', value: '45', unit: 'Kg', date: '17/04/2025' },
	{ id: 'spo2', label: 'Oxygen Saturation (spO2)', value: '79', unit: '%', date: '17/04/2025' },
]

const PERIOD_OPTIONS = [
	{ value: '7days', label: 'Last 7 Days' },
	{ value: '30days', label: 'Last 30 Days' },
	{ value: '3months', label: 'Last 3 Months' },
	{ value: '1year', label: 'Last 1 Year' },
]

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
		columns: [
			{ key: 'heartRate', label: 'Heart Rate' },
			{ key: 'prInterval', label: 'PR Interval' },
			{ key: 'pDuration', label: 'P Duration' },
			{ key: 'qrsDuration', label: 'QRS Duration' },
			{ key: 'tDuration', label: 'T Duration' },
			{ key: 'qtQtc', label: 'QT/QTc' },
			{ key: 'pqrsAxis', label: 'P/QRS/T axis' },
			{ key: 'rvSv', label: 'R(v5) / S(v1)' },
		],
		rows: [
			{
				id: '1',
				date: '17/04/2025 10:00AM',
				cells: {
					heartRate: '120 bpm',
					prInterval: '60 ms',
					pDuration: '87 ms',
					qrsDuration: '84 ms',
					tDuration: '9 ms',
					qtQtc: '70 ms',
					pqrsAxis: '77 dgv',
					rvSv: '91 mv',
				},
			},
			{
				id: '2',
				date: '03/01/2025 10:00AM',
				cells: {
					heartRate: '120 bpm',
					prInterval: '60 ms',
					pDuration: '87 ms',
					qrsDuration: '84 ms',
					tDuration: '9 ms',
					qtQtc: '70 ms',
					pqrsAxis: '77 dgv',
					rvSv: '91 mv',
				},
			},
			{
				id: '3',
				date: '15/12/2024 10:00AM',
				cells: {
					heartRate: '120 bpm',
					prInterval: '60 ms',
					pDuration: '87 ms',
					qrsDuration: '84 ms',
					tDuration: '9 ms',
					qtQtc: '70 ms',
					pqrsAxis: '77 dgv',
					rvSv: '91 mv',
				},
			},
			{
				id: '4',
				date: '17/12/2024 10:00AM',
				cells: {
					heartRate: '120 bpm',
					prInterval: '60 ms',
					pDuration: '87 ms',
					qrsDuration: '84 ms',
					tDuration: '9 ms',
					qtQtc: '70 ms',
					pqrsAxis: '77 dgv',
					rvSv: '91 mv',
				},
			},
			{
				id: '5',
				date: '5/8/2024 10:00AM',
				cells: {
					heartRate: '120 bpm',
					prInterval: '60 ms',
					pDuration: '87 ms',
					qrsDuration: '84 ms',
					tDuration: '9 ms',
					qtQtc: '70 ms',
					pqrsAxis: '77 dgv',
					rvSv: '91 mv',
				},
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

const normalizeHistoryWithDefaults = (apiHistory: Record<string, VitalHistoryRow[]>) =>
	DEFAULT_TAB_CONFIGS.map((tab) => ({
		...tab,
		rows: apiHistory[tab.id]?.length ? apiHistory[tab.id] : tab.rows,
	}))

function VitalStatCard({ stat, width }: { stat: VitalStat; width: number }) {
	const icon = VITAL_ICONS[stat.id] ?? { name: 'chart-line', color: TEAL }

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
}: {
	row: VitalHistoryRow
	columns: TabColumn[]
	showDownload?: boolean
	dateWidth: number
	columnWidth: number
	actionWidth: number
}) {
	return (
		<View style={styles.historyRow}>
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
				<TouchableOpacity style={styles.iconButton} activeOpacity={0.8}>
					<MaterialCommunityIcons name="pencil-outline" size={16} color="#7a878e" />
				</TouchableOpacity>
				{showDownload || row.hasDownload ? (
					<TouchableOpacity style={styles.iconButton} activeOpacity={0.8}>
						<MaterialCommunityIcons name="download-outline" size={16} color="#7a878e" />
					</TouchableOpacity>
				) : null}
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
		const dateWidth = isTablet ? 136 : 116
		const actionWidth = activeTab.showDownload ? 72 : 48
		const baseColumnWidth = isTablet ? 132 : 116
		const fillColumnWidth = (tableAvailableWidth - dateWidth - actionWidth) / Math.max(activeTab.columns.length, 1)
		const columnWidth = Math.max(baseColumnWidth, fillColumnWidth)

		return {
			actionWidth,
			columnWidth,
			dateWidth,
			tableWidth: dateWidth + actionWidth + columnWidth * activeTab.columns.length,
		}
	}, [activeTab.columns.length, activeTab.showDownload, isTablet, width])

	const loadVitals = useCallback(
		async (showLoader = true) => {
			if (!patientId) {
				setErrorMessage('')
				return
			}

			try {
				if (showLoader) setLoading(true)
				const payload = await vitalsService.getPatientVitals(patientId, period)

				if (payload.stats.length > 0) setStats(payload.stats)
				setTabConfigs(normalizeHistoryWithDefaults(payload.history))
				setErrorMessage('')
			} catch (error: any) {
				console.log('[VitalsTab] failed to load vitals:', error)
				setErrorMessage(error?.response?.data?.message || error?.message || 'Unable to load vitals right now.')
			} finally {
				setLoading(false)
				setRefreshing(false)
			}
		},
		[patientId, period]
	)

	useEffect(() => {
		void loadVitals(true)
	}, [loadVitals])

	const handleRefresh = () => {
		setRefreshing(true)
		void loadVitals(false)
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

				<View style={[styles.filterRow, isTablet && styles.filterRowTablet]}>
					<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabSlider}>
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

					<View style={styles.periodSelectWrap}>
						<AppSelect
							value={period}
							options={PERIOD_OPTIONS}
							onSelect={(value) => setPeriod(String(value))}
							placeholder="Select period"
							size="small"
							style={styles.periodSelectContainer}
							customCardStyle={styles.periodSelect}
						/>
					</View>
				</View>
			</View>

			<ScrollView
				style={styles.tableScroller}
				horizontal
				showsHorizontalScrollIndicator={activeTab.columns.length > 2}
				contentContainerStyle={styles.tableScrollerContent}
			>
				<View style={[styles.tableContent, { width: tableMetrics.tableWidth }]}>
					<View style={styles.tableHeader}>
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
						refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={TEAL} />}
						renderItem={({ item }) => (
							<HistoryRow
								row={item}
								columns={activeTab.columns}
								showDownload={activeTab.showDownload}
								dateWidth={tableMetrics.dateWidth}
								columnWidth={tableMetrics.columnWidth}
								actionWidth={tableMetrics.actionWidth}
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
				onSave={(data) => {
					console.log('[VitalsTab] new vitals submitted:', data)
					// TODO: call API to persist the new vitals entry
				}}
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
	statIconWrap: {
		width: 28,
		alignItems: 'flex-start',
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
		borderTopLeftRadius: 10,
		borderTopRightRadius: 10,
		backgroundColor: '#ffffff',
		borderWidth: 1,
		borderColor: '#edf1f2',
		overflow: 'hidden',
	},
	historyHeader: {
		paddingHorizontal: 16,
		paddingTop: 12,
		paddingBottom: 6,
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
		paddingHorizontal: 16,
		paddingBottom: 10,
		gap: 10,
	},
	filterRowTablet: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	tabSlider: {
		alignItems: 'center',
		paddingRight: 8,
	},
	tabItemWrap: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	tabPill: {
		borderRadius: 7,
		paddingHorizontal: 12,
		paddingVertical: 7,
	},
	tabPillActive: {
		backgroundColor: TEAL,
	},
	tabText: {
		color: '#69777f',
		fontSize: 12,
		fontWeight: '500',
	},
	tabTextActive: {
		color: '#ffffff',
		fontWeight: '700',
	},
	tabSeparator: {
		color: '#c1c9cd',
		marginHorizontal: 4,
	},
	periodSelectWrap: {
		width: 150,
		maxWidth: '100%',
	},
	periodSelectContainer: {
		marginBottom: 0,
	},
	periodSelect: {
		minHeight: 36,
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
		paddingHorizontal: 12,
		paddingVertical: 9,
		gap: 4,
	},
	columnHeaderCell: {
		justifyContent: 'center',
		paddingHorizontal: 10,
		paddingVertical: 9,
		borderLeftWidth: 1,
		borderLeftColor: '#edf1f2',
	},
	tableHeaderText: {
		color: '#33444d',
		fontSize: 12,
		fontWeight: '700',
	},
	tableScroller: {
		flex: 1,
		marginHorizontal: 16,
		borderLeftWidth: 1,
		borderRightWidth: 1,
		borderColor: '#edf1f2',
		backgroundColor: '#ffffff',
	},
	tableScrollerContent: {
		flexGrow: 1,
	},
	tableContent: {
		flex: 1,
		backgroundColor: '#ffffff',
	},
	historyList: {
		flex: 1,
		backgroundColor: '#ffffff',
	},
	historyListContent: {
		paddingBottom: 84,
	},
	historyRow: {
		flexDirection: 'row',
		alignItems: 'stretch',
		minHeight: 42,
		borderBottomWidth: 1,
		borderColor: '#edf1f2',
	},
	historyDateCell: {
		justifyContent: 'center',
		paddingHorizontal: 12,
		paddingVertical: 9,
	},
	historyValueCell: {
		justifyContent: 'center',
		paddingHorizontal: 10,
		paddingVertical: 9,
		borderLeftWidth: 1,
		borderLeftColor: '#edf1f2',
	},
	rowDate: {
		color: '#667780',
		fontSize: 11,
		lineHeight: 15,
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
		gap: 3,
		paddingHorizontal: 6,
		borderLeftWidth: 1,
		borderLeftColor: '#edf1f2',
	},
	iconButton: {
		width: 24,
		height: 24,
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#f6f8f8',
	},
	cellValue: {
		color: '#263238',
		fontSize: 12,
		fontWeight: '600',
		lineHeight: 16,
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