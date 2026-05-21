import React, { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, useWindowDimensions } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { AppTypography } from './AppTypography'
import { AppSkeleton } from './AppSkeleton'
import { SlotGroup } from '../../features/doctor/doctorService'

// import { View, , TouchableOpacity, StyleSheet } from "react-native";

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
function getWeekDates(start: Date) {
	return Array.from({ length: 7 }, (_, i) => {
		const d = new Date(start)
		d.setDate(start.getDate() + i)
		return d
	})
}

export type PickProps = {
	selectedDate: Date | null
	onDateChange: (date: Date) => void
	selectedTime: string | string[] | null
	onTimeChange: (time: any) => void
	availableSlots?: SlotGroup[]
	loading?: boolean
	timeSlotColumns?: number
	disablePast?: boolean
	multiSelect?: boolean
	dateLabel?: string
	timeLabel?: string
	disableBookedSlots?: boolean
	onSelectAll?: () => void
	onUnselectAll?: () => void
	showTimeSlots?: boolean
	hideNavigation?: boolean
	use12HourTime?: boolean
	showSlotStatusLabels?: boolean
	selectedAppointmentType?: 'clinic' | 'video' | string
	onAppointmentTypeChange?: (type: 'clinic' | 'video') => void
}

export default function DateSlotPicker(props: PickProps) {
	const { width } = useWindowDimensions()
	const isTablet = width >= 768
	const [visitType, setVisitType] = useState<'clinic' | 'video'>('clinic')

	const {
		selectedDate,
		onDateChange,
		selectedTime,
		onTimeChange,
		availableSlots = [],
		loading = false,
		timeSlotColumns = 4,
		disablePast = true,
		multiSelect = false,
		dateLabel = 'Select Date',
		timeLabel = 'Select Time',
		disableBookedSlots = true,
		onSelectAll,
		onUnselectAll,
		showTimeSlots = true,
		hideNavigation = false,
		use12HourTime = false,
		showSlotStatusLabels = true,
		selectedAppointmentType,
		onAppointmentTypeChange,
	} = props

	const today = new Date()
	const [weekStart, setWeekStart] = useState(() => {
		const d = new Date(selectedDate || today)
		d.setDate(d.getDate() - d.getDay())
		return d
	})
	const weekDates = getWeekDates(weekStart)
	const monthLabel = `${MONTHS[weekDates[0].getMonth()]} ${weekDates[0].getFullYear()}`

	const isSameDay = (a: Date, b: Date) =>
		a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()

	const isPast = (d: Date) => {
		if (!disablePast) return false
		const today0 = new Date(today.getFullYear(), today.getMonth(), today.getDate())
		const d0 = new Date(d.getFullYear(), d.getMonth(), d.getDate())
		return d0 < today0
	}

	const handlePrevWeek = () => {
		const d = new Date(weekStart)
		d.setDate(d.getDate() - 7)
		setWeekStart(d)
	}

	const handleNextWeek = () => {
		const d = new Date(weekStart)
		d.setDate(d.getDate() + 7)
		setWeekStart(d)
	}

	const selectedTimes = Array.isArray(selectedTime) ? selectedTime : selectedTime ? [selectedTime] : []
	const resolvedVisitType =
		selectedAppointmentType === 'video' ? 'video' : selectedAppointmentType === 'clinic' ? 'clinic' : visitType
	const dateBoxWidth = isTablet ? 62 : 50
	const slotBasis = `${100 / timeSlotColumns - (isTablet ? 1.8 : 2.8)}%` as `${number}%`

	const handleVisitTypeChange = (type: 'clinic' | 'video') => {
		setVisitType(type)
		onAppointmentTypeChange?.(type)
	}

	const handleTimePress = (time: string) => {
		if (!multiSelect) {
			onTimeChange(time)
			return
		}

		const next = selectedTimes.includes(time)
			? selectedTimes.filter((selected) => selected !== time)
			: [...selectedTimes, time]
		onTimeChange(next)
	}

	const formatTimeLabel = (time: string) => {
		if (!use12HourTime) return time

		const [hourText, minuteText] = time.split(':')
		const hour = Number(hourText)
		const minute = Number(minuteText)

		if (!Number.isFinite(hour) || !Number.isFinite(minute)) return time

		const period = hour >= 12 ? 'PM' : 'AM'
		const hour12 = hour % 12 || 12

		return `${hour12}:${String(minute).padStart(2, '0')} ${period}`
	}

	return (
		<View style={[styles.container, isTablet && styles.containerTablet]}>
			{/* Date Header */}
			<View style={styles.dateHeader}>
				<AppTypography variant="h4" style={styles.sectionTitle}>
					{dateLabel}
				</AppTypography>
				{hideNavigation ? null : (
					<View style={styles.monthNav}>
						<TouchableOpacity onPress={handlePrevWeek} style={styles.chevron}>
							<MaterialCommunityIcons name="chevron-left" size={20} color="#0c7c7c" />
						</TouchableOpacity>
						<AppTypography variant="body" style={styles.monthLabel}>
							{monthLabel}
						</AppTypography>
						<TouchableOpacity onPress={handleNextWeek} style={styles.chevron}>
							<MaterialCommunityIcons name="chevron-right" size={20} color="#0c7c7c" />
						</TouchableOpacity>
					</View>
				)}
			</View>

			{/* Date Strip */}
			<ScrollView
				horizontal
				showsHorizontalScrollIndicator={false}
				contentContainerStyle={styles.dateStripContent}
			>
				<View style={styles.dateStrip}>
					{weekDates.map((date) => {
						const isSelected = selectedDate ? isSameDay(date, selectedDate) : false
						const past = isPast(date)
						const isSat = date.getDay() === 6

						return (
							<TouchableOpacity
								key={date.toISOString()}
								style={[
									styles.dateBox,
									{ width: dateBoxWidth },
									styles.dateBoxSpacingRight,
									isSelected && styles.dateBoxSelected,
									past && styles.dateBoxDisabled,
								]}
								onPress={() => !past && onDateChange(date)}
								activeOpacity={past ? 1 : 0.7}
							>
								<AppTypography
									variant="caption"
									style={[
										styles.dayName,
										isSelected && styles.textWhite,
										past && styles.textDisabled,
									]}
								>
									{DAYS[date.getDay()]}
								</AppTypography>
								<AppTypography
									variant="body"
									style={[
										styles.dateNum,
										isSelected && styles.textWhite,
										past && styles.textDisabled,
										!past && !isSelected && isSat && styles.textRed,
									]}
								>
									{date.getDate()}
								</AppTypography>
							</TouchableOpacity>
						)
					})}
				</View>
			</ScrollView>

			{showTimeSlots ? (
				<>
					{/* Time Header */}
					<View style={styles.toggleContainer}>
						<Text style={styles.toggleTitle}>Type of Appointment</Text>

						<View style={[styles.toggleGroup, isTablet && styles.toggleGroupTablet]}>
							<TouchableOpacity
								style={[
									styles.toggleOption,
									resolvedVisitType === 'clinic' && styles.toggleSelectedOption,
								]}
								onPress={() => handleVisitTypeChange('clinic')}
							>
								<Text
									style={[
										styles.toggleText,
										resolvedVisitType === 'clinic' && styles.toggleSelectedText,
									]}
								>
									Clinic
								</Text>
							</TouchableOpacity>

							<TouchableOpacity
								style={[
									styles.toggleOption,
									resolvedVisitType === 'video' && styles.toggleSelectedOption,
								]}
								onPress={() => handleVisitTypeChange('video')}
							>
								<Text
									style={[
										styles.toggleText,
										resolvedVisitType === 'video' && styles.toggleSelectedText,
									]}
								>
									Video
								</Text>
							</TouchableOpacity>
						</View>
					</View>

					<View style={styles.timeHeader}>
						<AppTypography variant="h4" style={styles.timeSectionTitle}>
							{timeLabel}
						</AppTypography>
						{multiSelect && (onSelectAll || onUnselectAll) ? (
							<View style={styles.bulkActions}>
								{onSelectAll ? (
									<TouchableOpacity style={styles.bulkButton} onPress={onSelectAll}>
										<AppTypography variant="caption" style={styles.bulkButtonText}>
											Select All
										</AppTypography>
									</TouchableOpacity>
								) : null}
								{onUnselectAll ? (
									<TouchableOpacity style={styles.bulkButton} onPress={onUnselectAll}>
										<AppTypography variant="caption" style={styles.bulkButtonText}>
											Unselect All
										</AppTypography>
									</TouchableOpacity>
								) : null}
							</View>
						) : null}
					</View>

					{loading ? (
						<AppSkeleton height={100} style={{ marginTop: 8 }} />
					) : availableSlots.length === 0 ? (
						<AppTypography variant="caption" style={styles.greyText}>
							No slots available for this date.
						</AppTypography>
					) : (
						<View style={styles.timeGridContainer}>
							{availableSlots.map((group, groupIdx) => (
								<View key={`group-${groupIdx}`} style={styles.timeGroupContainer}>
									<AppTypography variant="subtitle" style={styles.timeGroupLabel}>
										{group.label}
									</AppTypography>
									<View style={styles.slotsGridFlex}>
										{group.slots.map((slot, idx) => {
											const isSelected = selectedTimes.includes(slot.start_time)
											const isAvailable =
												slot.status === 'AVAILABLE' || slot.status === ('' as any)
											const isBlocked = slot.status === 'BLOCKED'
											const isBooked =
												slot.is_booked ||
												slot.status === 'BOOKED' ||
												slot.status === 'OCCUPIED' ||
												slot.status === 'UNAVAILABLE'
											const canSelect =
												slot.can_toggle !== false &&
												!slot.is_booked &&
												(isAvailable || isBlocked || !disableBookedSlots || !isBooked)
											const statusLabel =
												slot.status === 'OCCUPIED' || slot.is_booked
													? 'Occupied'
													: slot.status === 'UNAVAILABLE'
														? 'Unavailable'
														: isBlocked
															? 'Blocked'
															: ''

											return (
												<TouchableOpacity
													key={`${slot.start_time}-${idx}`}
													style={[
														styles.timeBox,
														{ flexBasis: slotBasis },
														isSelected && styles.timeBoxSelected,
														!isSelected && isBlocked && styles.timeBoxBlocked,
														!isSelected && isBooked && styles.timeBoxBooked,
														!canSelect && styles.timeBoxDisabled,
														!showSlotStatusLabels && styles.timeBoxSingleLine,
													]}
													onPress={() => canSelect && handleTimePress(slot.start_time)}
													activeOpacity={canSelect ? 0.6 : 1}
													disabled={!canSelect}
												>
													<AppTypography
														variant="caption"
														style={[
															styles.timeText,
															isSelected && styles.timeTextSelected,
															!isSelected && isBlocked && styles.timeTextBlocked,
															!canSelect && styles.timeTextDisabled,
														]}
													>
														{formatTimeLabel(slot.start_time)}
													</AppTypography>
													{showSlotStatusLabels && statusLabel ? (
														<AppTypography
															variant="caption"
															style={[
																styles.slotStatusText,
																isSelected && styles.timeTextSelected,
																!isSelected && isBlocked && styles.timeTextBlocked,
																!isSelected && isBooked && styles.timeTextBooked,
																!canSelect && styles.timeTextDisabled,
															]}
														>
															{statusLabel}
														</AppTypography>
													) : null}
												</TouchableOpacity>
											)
										})}
									</View>
								</View>
							))}
						</View>
					)}
				</>
			) : null}
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		paddingTop: 10,
		paddingBottom: 8,
		paddingHorizontal: 16,
	},
	containerTablet: {
		paddingHorizontal: 20,
	},
	dateHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 12,
	},
	sectionTitle: {
		fontWeight: '700',
		color: '#233238',
		fontSize: 15,
	},
	timeSectionTitle: {
		fontWeight: '700',
		color: '#233238',
		fontSize: 15,
		flexShrink: 1,
	},
	timeHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		gap: 10,
		marginTop: 22,
		marginBottom: 12,
	},
	bulkActions: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		flexWrap: 'wrap',
		justifyContent: 'flex-end',
		flexShrink: 1,
	},
	bulkButton: {
		borderWidth: 1,
		borderColor: '#0c7c7c',
		borderRadius: 8,
		paddingHorizontal: 12,
		paddingVertical: 7,
		backgroundColor: '#fff',
	},
	bulkButtonText: {
		color: '#0c7c7c',
		fontSize: 12,
		fontWeight: '600',
	},
	monthNav: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	monthLabel: {
		color: '#333',
		fontWeight: 'bold',
		marginHorizontal: 8,
		fontSize: 14,
	},
	chevron: {
		padding: 4,
	},
	dateStrip: {
		flexDirection: 'row',
		justifyContent: 'flex-start',
	},
	dateStripContent: {
		paddingHorizontal: 0,
		paddingBottom: 2,
	},
	dateBox: {
		borderRadius: 10,
		paddingVertical: 10,
		paddingHorizontal: 6,
		minHeight: 56,
		backgroundColor: 'transparent',
		justifyContent: 'center',
		alignItems: 'center',
		borderWidth: 1,
		borderColor: 'rgba(51, 51, 51, 0.4)',
	},
	dateBoxSpacingRight: {
		marginRight: 10,
	},
	dateBoxSelected: {
		backgroundColor: '#0c7c7c',
		borderColor: '#0c7c7c',
		paddingVertical: 12,
	},
	dateBoxDisabled: {
		opacity: 0.5,
	},
	dayName: {
		fontSize: 11,
		color: '#6f7680',
		marginBottom: 4,
	},
	dateNum: {
		fontWeight: 'bold',
		color: '#2c3136',
		fontSize: 16,
	},
	textWhite: {
		color: '#fff',
	},
	textDisabled: {
		color: '#999',
	},
	textRed: {
		color: '#e53935',
	},
	greyText: {
		color: '#73818a',
		marginTop: 4,
		fontSize: 13,
	},
	timeGridContainer: {
		marginTop: 0,
	},
	timeGroupContainer: {
		marginTop: 18,
	},
	timeGroupLabel: {
		fontWeight: '700',
		color: '#62707a',
		marginBottom: 12,
		fontSize: 13,
	},
	slotsGridFlex: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'flex-start',
		gap: 10,
	},
	timeBox: {
		borderWidth: 1.5,
		borderColor: '#dde3e8',
		borderRadius: 8,
		paddingVertical: 10,
		paddingHorizontal: 10,
		marginBottom: 10,
		minHeight: 40,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#fff',
	},
	timeBoxSingleLine: {
		height: 44,
		paddingVertical: 0,
	},
	timeBoxSpacingRight: {
		marginRight: 10,
	},
	timeBoxSelected: {
		borderColor: '#0c7c7c',
		backgroundColor: '#0c7c7c',
	},
	timeBoxDisabled: {
		backgroundColor: 'rgba(0,0,0,0.06)',
		borderColor: '#eee',
	},
	timeBoxBooked: {
		backgroundColor: '#fff3f0',
		borderColor: '#f0c7bd',
	},
	timeBoxBlocked: {
		backgroundColor: '#f1f4f5',
		borderColor: '#cfd8dc',
	},
	timeText: {
		fontSize: 13,
		fontWeight: '600',
		color: '#42525d',
	},
	timeTextSelected: {
		color: '#fff',
		fontWeight: '600',
	},
	timeTextDisabled: {
		color: '#aaa',
	},
	timeTextBlocked: {
		color: '#7b8790',
	},
	timeTextBooked: {
		color: '#b15a43',
	},
	slotStatusText: {
		marginTop: 2,
		fontSize: 10,
		fontWeight: '600',
	},

	// Toggle
	toggleContainer: {
		marginTop: 22,
	},

	toggleTitle: {
		fontSize: 15,
		fontWeight: '700',
		color: '#233238',
		marginBottom: 12,
	},

	toggleGroup: {
		flexDirection: 'row',
		backgroundColor: '#eef3f4',
		borderRadius: 24,
		padding: 4,
		alignSelf: 'stretch',
	},

	toggleGroupTablet: {
		alignSelf: 'flex-start',
		width: '56%',
	},

	toggleOption: {
		flex: 1,
		paddingVertical: 10,
		paddingHorizontal: 14,
		borderRadius: 20,
		alignItems: 'center',
	},

	toggleSelectedOption: {
		backgroundColor: '#0c7c7c',
	},

	toggleText: {
		color: '#333',
		fontSize: 13,
		fontWeight: '600',
	},

	toggleSelectedText: {
		color: '#fff',
	},
})
