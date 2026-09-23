import React, { useMemo, useState } from 'react'
import {
	ScrollView,
	StyleSheet,
	View,
	useWindowDimensions,
} from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import {
	AppTypography,
	AppScreenHeader,
	AppCalendar,
	AppTimePicker,
	AppStickyFooter,
	StatusModal,
} from '../../../components/common'
import {
	CAREGIVER_TIME_SERVICES,
	CAREGIVER_INCLUDED_CAPABILITIES,
	CareTypeKey,
} from '../constants/caregiverServices'

function formatTimeTo12h(timeStr?: string): string {
	if (!timeStr) return ''
	const parts = timeStr.trim().split(':')
	if (parts.length < 2) return timeStr
	let h = parseInt(parts[0], 10)
	const m = parseInt(parts[1], 10)
	if (isNaN(h) || isNaN(m)) return timeStr
	const period = h >= 12 ? 'PM' : 'AM'
	h = h % 12 || 12
	const hh = String(h).padStart(2, '0')
	const mm = String(m).padStart(2, '0')
	return `${hh}:${mm} ${period}`
}

function calc24hEndTimeFormatted(startTimeStr?: string): string {
	if (!startTimeStr) return ''
	const formatted = formatTimeTo12h(startTimeStr)
	return formatted ? `${formatted} next day` : ''
}

function calcHourlyInfo(startTimeStr?: string, endTimeStr?: string) {
	if (!startTimeStr || !endTimeStr) {
		return { durationLabel: '', rangeLabel: '', isValid: false }
	}
	const sParts = startTimeStr.trim().split(':')
	const eParts = endTimeStr.trim().split(':')
	if (sParts.length < 2 || eParts.length < 2) {
		return { durationLabel: '', rangeLabel: '', isValid: false }
	}
	const sMin = parseInt(sParts[0], 10) * 60 + parseInt(sParts[1], 10)
	let eMin = parseInt(eParts[0], 10) * 60 + parseInt(eParts[1], 10)

	if (isNaN(sMin) || isNaN(eMin)) {
		return { durationLabel: '', rangeLabel: '', isValid: false }
	}

	if (eMin <= sMin) {
		eMin += 24 * 60
	}

	const diffMin = eMin - sMin
	const hrs = Math.floor(diffMin / 60)
	const mins = diffMin % 60

	let durationLabel = ''
	if (hrs > 0 && mins > 0) {
		durationLabel = `${hrs} hours ${mins} mins`
	} else if (hrs > 0) {
		durationLabel = `${hrs} hours`
	} else {
		durationLabel = `${mins} mins`
	}

	const sFormatted = formatTimeTo12h(startTimeStr)
	const eFormatted = formatTimeTo12h(endTimeStr)
	const rangeLabel = `${sFormatted} — ${eFormatted}`

	return { durationLabel, rangeLabel, isValid: diffMin > 0 }
}

export default function CaregiverCareTypeOverviewScreen() {
	const navigation = useNavigation<any>()
	const route = useRoute<any>()
	const insets = useSafeAreaInsets()
	const { width } = useWindowDimensions()
	const isTablet = width >= 768

	const rawCareType = route.params?.careType as string
	let normalizedCareType: CareTypeKey = 'DAY_CARE'
	if (rawCareType === 'NIGHT_CARE') normalizedCareType = 'NIGHT_CARE'
	else if (rawCareType === 'FULL_DAY_CARE' || rawCareType === '24_HOUR_CARE') normalizedCareType = 'FULL_DAY_CARE'
	else if (rawCareType === 'HOURLY_CARE' || rawCareType === 'CUSTOM_CARE') normalizedCareType = 'HOURLY_CARE'
	else if (rawCareType === 'TRAVEL_ATTENDANT') normalizedCareType = 'TRAVEL_ATTENDANT'

	const metadata = CAREGIVER_TIME_SERVICES[normalizedCareType] || CAREGIVER_TIME_SERVICES.DAY_CARE

	const todayDateStr = useMemo(() => {
		const d = new Date()
		const dd = String(d.getDate()).padStart(2, '0')
		const mm = String(d.getMonth() + 1).padStart(2, '0')
		const yyyy = d.getFullYear()
		return `${dd}-${mm}-${yyyy}`
	}, [])

	const minDate = useMemo(() => new Date(), [])

	const [selectedDate, setSelectedDate] = useState<string>(todayDateStr)
	const [startTime, setStartTime] = useState<string>('')
	const [endTime, setEndTime] = useState<string>('')
	const [confirmModalVisible, setConfirmModalVisible] = useState<boolean>(false)

	const handleBack = () => {
		if (navigation.canGoBack()) {
			navigation.goBack()
		} else {
			navigation.navigate('MainTabs', { screen: 'Portal' })
		}
	}

	const calculated24hEnd = useMemo(() => {
		if (normalizedCareType !== 'FULL_DAY_CARE') return ''
		return calc24hEndTimeFormatted(startTime)
	}, [normalizedCareType, startTime])

	const hourlyInfo = useMemo(() => {
		if (normalizedCareType !== 'HOURLY_CARE') return { durationLabel: '', rangeLabel: '', isValid: false }
		return calcHourlyInfo(startTime, endTime)
	}, [normalizedCareType, startTime, endTime])

	const isFormValid = useMemo(() => {
		if (!selectedDate) return false
		if (normalizedCareType === 'DAY_CARE' || normalizedCareType === 'NIGHT_CARE' || normalizedCareType === 'TRAVEL_ATTENDANT') {
			return true
		}
		if (normalizedCareType === 'FULL_DAY_CARE') {
			return !!startTime
		}
		if (normalizedCareType === 'HOURLY_CARE') {
			return !!startTime && !!endTime && hourlyInfo.isValid
		}
		return false
	}, [selectedDate, normalizedCareType, startTime, endTime, hourlyInfo])

	const handleProceed = () => {
		if (!isFormValid) return
		setConfirmModalVisible(true)
	}

	let primaryDurationText = ''
	let hoursSubtext = ''
	let isHoursComplete = false

	if (normalizedCareType === 'DAY_CARE') {
		primaryDurationText = '9 hours'
		hoursSubtext = '09:00 AM — 06:00 PM (Fixed Daytime)'
		isHoursComplete = true
	} else if (normalizedCareType === 'NIGHT_CARE') {
		primaryDurationText = '12 hours'
		hoursSubtext = '08:00 PM ? 08:00 AM next day (Fixed Overnight)'
		isHoursComplete = true
	} else if (normalizedCareType === 'FULL_DAY_CARE') {
		primaryDurationText = '24 hours'
		if (startTime && calculated24hEnd) {
			hoursSubtext = `${formatTimeTo12h(startTime)} ? ${calculated24hEnd}`
			isHoursComplete = true
		} else {
			hoursSubtext = 'Select a start time to see when care ends.'
			isHoursComplete = false
		}
	} else if (normalizedCareType === 'HOURLY_CARE') {
		if (hourlyInfo.durationLabel && hourlyInfo.rangeLabel) {
			primaryDurationText = hourlyInfo.durationLabel
			hoursSubtext = hourlyInfo.rangeLabel
			isHoursComplete = true
		} else {
			primaryDurationText = 'Flexible Duration'
			hoursSubtext = 'Select your start and end time to see the total duration.'
			isHoursComplete = false
		}
	} else if (normalizedCareType === 'TRAVEL_ATTENDANT') {
		primaryDurationText = 'Transit Support'
		hoursSubtext = 'Full journey companion care during medical travel'
		isHoursComplete = true
	}

	return (
		<View style={styles.screen}>
			<AppScreenHeader
				title={metadata.title}
				onBack={handleBack}
			/>

			<ScrollView
				style={styles.scrollView}
				contentContainerStyle={[
					styles.scrollContent,
					{ paddingBottom: Math.max(insets.bottom, 20) + 100 },
					isTablet && styles.scrollContentTablet,
				]}
				showsVerticalScrollIndicator={false}
			>
				{/* 1. Care Hours & Duration Summary Section */}
				<View style={[styles.hoursBox, isHoursComplete ? styles.hoursBoxComplete : styles.hoursBoxPending]}>
					<View style={styles.hoursHeaderRow}>
						<View style={styles.hoursIconCircle}>
							<MaterialCommunityIcons
								name="clock-outline"
								size={22}
								color={isHoursComplete ? '#0D9488' : '#64748B'}
							/>
						</View>
						<View style={styles.hoursTitleCol}>
							<AppTypography variant="caption" style={styles.hoursLabelTitle}>
								CARE HOURS & DURATION
							</AppTypography>
							<AppTypography variant="h3" style={styles.hoursDurationVal}>
								{primaryDurationText}
							</AppTypography>
						</View>
					</View>

					<View style={styles.hoursDivider} />

					<View style={styles.hoursSubRow}>
						<MaterialCommunityIcons
							name={isHoursComplete ? 'calendar-check-outline' : 'information-outline'}
							size={16}
							color={isHoursComplete ? '#0F766E' : '#475569'}
							style={styles.hoursSubIcon}
						/>
						<AppTypography variant="caption" style={[styles.hoursSubText, isHoursComplete ? styles.hoursSubTextComplete : styles.hoursSubTextPending]}>
							{hoursSubtext}
						</AppTypography>
					</View>
				</View>

				{/* 2. Schedule Inputs Section */}
				<View style={styles.sectionCard}>
					<AppTypography variant="h4" style={styles.sectionTitle}>
						Schedule Details
					</AppTypography>

					<View style={styles.fieldContainer}>
						<AppCalendar
							label="Select Date"
							required
							value={selectedDate}
							onChange={setSelectedDate}
							minimumDate={minDate}
							placeholder="Choose care date"
						/>
					</View>

					{normalizedCareType === 'FULL_DAY_CARE' && (
						<View style={styles.fieldContainer}>
							<AppTimePicker
								label="Start Time"
								required
								value={startTime}
								onChange={setStartTime}
								placeholder="Select start time"
							/>
							{startTime ? (
								<View style={styles.calcEndBox}>
									<MaterialCommunityIcons name="clock-check-outline" size={16} color="#0D9488" />
									<AppTypography variant="caption" style={styles.calcEndText}>
										Care will end automatically at: {formatTimeTo12h(startTime)} next day
									</AppTypography>
								</View>
							) : null}
						</View>
					)}

					{normalizedCareType === 'HOURLY_CARE' && (
						<>
							<View style={styles.rowFields}>
								<View style={styles.halfField}>
									<AppTimePicker
										label="Start Time"
										required
										value={startTime}
										onChange={setStartTime}
										placeholder="Select start"
									/>
								</View>
								<View style={styles.halfField}>
									<AppTimePicker
										label="End Time"
										required
										value={endTime}
										onChange={setEndTime}
										placeholder="Select end"
									/>
								</View>
							</View>
							{startTime && endTime && hourlyInfo.isValid ? (
								<View style={styles.calcEndBox}>
									<MaterialCommunityIcons name="check-circle-outline" size={16} color="#0D9488" />
									<AppTypography variant="caption" style={styles.calcEndText}>
										Total Duration: {hourlyInfo.durationLabel} ({hourlyInfo.rangeLabel})
									</AppTypography>
								</View>
							) : null}
						</>
					)}
				</View>

				{/* 3. Read-Only "What's Included" Section */}
				<View style={[styles.sectionCard, styles.whatsIncludedSection]}>
					<AppTypography variant="h4" style={styles.sectionTitle}>
						What's Included
					</AppTypography>
					<AppTypography variant="caption" style={styles.sectionSubtext}>
						Standard caregiving capabilities included with this plan:
					</AppTypography>

					<View style={styles.capabilitiesGrid}>
						{CAREGIVER_INCLUDED_CAPABILITIES.map((cap) => (
							<View key={cap.id} style={styles.capabilityItem}>
								<View style={[styles.capabilityIconCircle, { backgroundColor: cap.bgColor }]}>
									<MaterialCommunityIcons name={cap.icon} size={20} color={cap.iconColor} />
								</View>
								<AppTypography variant="body" style={styles.capabilityLabel}>
									{cap.label}
								</AppTypography>
							</View>
						))}
					</View>
				</View>
			</ScrollView>

			<AppStickyFooter
				disabled={!isFormValid}
				onPress={handleProceed}
			>
				Confirm Care Schedule
			</AppStickyFooter>

			<StatusModal
				visible={confirmModalVisible}
				status="success"
				title="Caregiver Selection Configured"
				description={`Your ${metadata.title} request for ${selectedDate} has been configured in the prototype.`}
				submitText="Done"
				onSubmit={() => {
					setConfirmModalVisible(false)
					handleBack()
				}}
			/>
		</View>
	)
}

const styles = StyleSheet.create({
	screen: {
		flex: 1,
		backgroundColor: '#F8FAFC',
	},
	scrollView: {
		flex: 1,
	},
	scrollContent: {
		paddingHorizontal: 16,
		paddingTop: 12,
	},
	scrollContentTablet: {
		maxWidth: 800,
		alignSelf: 'center',
		width: '100%',
	},
	hoursBox: {
		borderRadius: 14,
		padding: 16,
		marginVertical: 12,
		borderWidth: 1,
	},
	hoursBoxPending: {
		backgroundColor: '#F8FAFC',
		borderColor: '#CBD5E1',
	},
	hoursBoxComplete: {
		backgroundColor: '#F0FDFA',
		borderColor: '#99F6E4',
	},
	hoursHeaderRow: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	hoursIconCircle: {
		width: 42,
		height: 42,
		borderRadius: 21,
		backgroundColor: '#E6F4F4',
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 12,
	},
	hoursTitleCol: {
		flex: 1,
	},
	hoursLabelTitle: {
		fontSize: 11,
		fontWeight: '700',
		color: '#64748B',
		letterSpacing: 0.6,
		textTransform: 'uppercase',
	},
	hoursDurationVal: {
		fontSize: 18,
		fontWeight: '800',
		color: '#0F172A',
		marginTop: 2,
	},
	hoursDivider: {
		height: 1,
		backgroundColor: '#E2E8F0',
		marginVertical: 12,
	},
	hoursSubRow: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	hoursSubIcon: {
		marginRight: 6,
	},
	hoursSubText: {
		fontSize: 13,
		lineHeight: 18,
		flex: 1,
	},
	hoursSubTextPending: {
		color: '#475569',
		fontWeight: '400',
	},
	hoursSubTextComplete: {
		color: '#0F766E',
		fontWeight: '600',
	},
	sectionCard: {
		backgroundColor: '#FFFFFF',
		borderRadius: 16,
		padding: 18,
		marginBottom: 16,
		borderWidth: 1,
		borderColor: '#E2E8F0',
	},
	sectionTitle: {
		fontSize: 16,
		fontWeight: '700',
		color: '#0F172A',
		marginBottom: 4,
	},
	sectionSubtext: {
		fontSize: 13,
		color: '#64748B',
		marginBottom: 14,
	},
	fieldContainer: {
		marginTop: 12,
	},
	rowFields: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginTop: 12,
		gap: 12,
	},
	halfField: {
		flex: 1,
	},
	calcEndBox: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#F0FDFA',
		paddingHorizontal: 12,
		paddingVertical: 10,
		borderRadius: 10,
		marginTop: 10,
		borderWidth: 1,
		borderColor: '#CCFBF1',
	},
	calcEndText: {
		marginLeft: 8,
		color: '#0F766E',
		fontWeight: '600',
		fontSize: 13,
		flex: 1,
	},
	whatsIncludedSection: {
		marginTop: 4,
	},
	capabilitiesGrid: {
		gap: 12,
		marginTop: 8,
	},
	capabilityItem: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 6,
	},
	capabilityIconCircle: {
		width: 36,
		height: 36,
		borderRadius: 18,
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 12,
	},
	capabilityLabel: {
		fontSize: 14,
		fontWeight: '500',
		color: '#334155',
		flex: 1,
	},
})