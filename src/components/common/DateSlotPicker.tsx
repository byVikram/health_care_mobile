import React, { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
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
}

export default function DateSlotPicker(props: PickProps) {
	const [visitType, setVisitType] = useState('online')

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

	return (
		<View style={styles.container}>
			{/* Date Header */}
			<View style={styles.dateHeader}>
				<AppTypography variant="h4" style={styles.sectionTitle}>
					{dateLabel}
				</AppTypography>
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

			{/* Time Header */}
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
					{/* Toggle */}
					<View style={styles.toggleContainer}>
						<Text style={styles.toggleTitle}>Select Visit Type</Text>

						<View style={styles.toggleGroup}>
							<TouchableOpacity
								style={[styles.toggleOption, visitType === 'online' && styles.toggleSelectedOption]}
								onPress={() => setVisitType('online')}
							>
								<Text style={[styles.toggleText, visitType === 'online' && styles.toggleSelectedText]}>
									Online Visit
								</Text>
							</TouchableOpacity>

							<TouchableOpacity
								style={[styles.toggleOption, visitType === 'clinic' && styles.toggleSelectedOption]}
								onPress={() => setVisitType('clinic')}
							>
								<Text style={[styles.toggleText, visitType === 'clinic' && styles.toggleSelectedText]}>
									Clinic Visit
								</Text>
							</TouchableOpacity>
						</View>
					</View>
					{/* Toggle */}
					{availableSlots.map((group, groupIdx) => (
						<View key={`group-${groupIdx}`} style={styles.timeGroupContainer}>
							<AppTypography variant="subtitle" style={styles.timeGroupLabel}>
								{group.label}
							</AppTypography>
							<View style={styles.slotsGridFlex}>
								{group.slots.map((slot, idx) => {
									const isSelected = selectedTimes.includes(slot.start_time)
									const isAvailable = slot.status === 'AVAILABLE' || slot.status === ('' as any)
									const isBlocked = slot.status === 'BLOCKED'
									const isBooked = slot.status === 'BOOKED' || slot.status === 'UNAVAILABLE'
									const canSelect =
										slot.can_toggle !== false &&
										(isAvailable || isBlocked || !disableBookedSlots || !isBooked)
									const isEndOfRow = (idx + 1) % timeSlotColumns === 0

									return (
										<TouchableOpacity
											key={`${slot.start_time}-${idx}`}
											style={[
												styles.timeBox,
												{ flexBasis: `${100 / timeSlotColumns - 3}%` },
												!isEndOfRow && styles.timeBoxSpacingRight,
												isSelected && styles.timeBoxSelected,
												!isSelected && isBlocked && styles.timeBoxBlocked,
												!canSelect && styles.timeBoxDisabled,
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
												{slot.start_time}
											</AppTypography>
										</TouchableOpacity>
									)
								})}
							</View>
						</View>
					))}
				</View>
			)}
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		paddingVertical: 8,
		paddingHorizontal: 16,
	},
	dateHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 10,
	},
	sectionTitle: {
		fontWeight: 'bold',
		color: '#233238',
		fontSize: 14,
	},
	timeSectionTitle: {
		fontWeight: 'bold',
		color: '#233238',
		fontSize: 14,
		flexShrink: 1,
	},
	timeHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		gap: 10,
		marginTop: 18,
		marginBottom: 10,
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
		paddingHorizontal: 10,
		paddingVertical: 6,
		backgroundColor: '#fff',
	},
	bulkButtonText: {
		color: '#0c7c7c',
		fontSize: 11,
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
	},
	dateBox: {
		width: 50,
		height: 55,
		borderRadius: 10,
		paddingVertical: 10,
		paddingHorizontal: 6,
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
		marginTop: 8,
		fontSize: 13,
	},
	timeGridContainer: {
		marginTop: 0,
	},
	timeGroupContainer: {
		marginTop: 18,
	},
	timeGroupLabel: {
		fontWeight: 'bold',
		color: '#62707a',
		marginBottom: 10,
		fontSize: 13,
	},
	slotsGridFlex: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'flex-start',
	},
	timeBox: {
		borderWidth: 1.5,
		borderColor: '#dde3e8',
		borderRadius: 8,
		paddingVertical: 8,
		paddingHorizontal: 16,
		marginBottom: 10,
		minWidth: 70,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#fff',
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
	timeBoxBlocked: {
		backgroundColor: '#f1f4f5',
		borderColor: '#cfd8dc',
	},
	timeText: {
		fontSize: 12,
		fontWeight: '500',
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

	// Toggle
	toggleContainer: {
		padding: 16,
	},

	toggleTitle: {
		fontSize: 16,
		fontWeight: '600',
		marginBottom: 12,
	},

	toggleGroup: {
		flexDirection: 'row',
		backgroundColor: '#eee',
		borderRadius: 25,
		padding: 4,
		maxWidth: 400,
		margin: 'auto',
	},

	toggleOption: {
		flex: 1,
		paddingVertical: 10,
		borderRadius: 25,
		alignItems: 'center',
	},

	toggleSelectedOption: {
		backgroundColor: '#0c7c7c',
	},

	toggleText: {
		color: '#333',
		fontWeight: '500',
	},

	toggleSelectedText: {
		color: '#fff',
	},
})
