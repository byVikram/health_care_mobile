import React, { useState } from 'react'
import { View, TouchableOpacity, StyleSheet } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { AppTypography } from './AppTypography'
import { AppSkeleton } from './AppSkeleton'
import { SlotGroup } from '../../features/doctor/doctorService'

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
	selectedTime: string | null
	onTimeChange: (time: string) => void
	availableSlots?: SlotGroup[]
	loading?: boolean
	timeSlotColumns?: number
	disablePast?: boolean
}

export default function DateSlotPicker(props: PickProps) {
	const {
		selectedDate,
		onDateChange,
		selectedTime,
		onTimeChange,
		availableSlots = [],
		loading = false,
		timeSlotColumns = 4,
		disablePast = true,
	} = props

	const today = new Date()
	const [weekStart, setWeekStart] = useState(() => {
		const d = new Date(selectedDate || today)
		d.setDate(d.getDate() - d.getDay()) // Start of current week (Sunday)
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

	return (
		<View style={styles.container}>
			{/* Date Header */}
			<View style={styles.dateHeader}>
				<AppTypography variant="h4" style={styles.sectionTitle}>
					Select Date
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
								isSelected && styles.dateBoxSelected,
								past && styles.dateBoxDisabled,
							]}
							onPress={() => !past && onDateChange(date)}
							activeOpacity={past ? 1 : 0.7}
						>
							<AppTypography
								variant="caption"
								style={[styles.dayName, isSelected && styles.textWhite, past && styles.textDisabled]}
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

			{/* Time Header */}
			<AppTypography variant="h4" style={[styles.sectionTitle, { marginTop: 16 }]}>
				Select Time
			</AppTypography>

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
									const isSelected = selectedTime === slot.start_time
									const isAvailable = slot.status === 'AVAILABLE' || slot.status === ('' as any) // fallback if blank

									return (
										<TouchableOpacity
											key={`${slot.start_time}-${idx}`}
											style={[
												styles.timeBox,
												{ width: `${100 / timeSlotColumns - 2}%` },
												isSelected && styles.timeBoxSelected,
												!isAvailable && styles.timeBoxDisabled,
											]}
											onPress={() => isAvailable && onTimeChange(slot.start_time)}
											activeOpacity={isAvailable ? 0.6 : 1}
											disabled={!isAvailable}
										>
											<AppTypography
												variant="caption"
												style={[
													styles.timeText,
													isSelected && styles.timeTextSelected,
													!isAvailable && styles.timeTextDisabled,
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
	},
	dateHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 12,
	},
	sectionTitle: {
		fontWeight: 'bold',
		color: '#233238',
		fontSize: 14,
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
		justifyContent: 'space-between',
		gap: 4,
	},
	dateBox: {
		flex: 1,
		height: 60,
		borderRadius: 10,
		backgroundColor: 'transparent',
		justifyContent: 'center',
		alignItems: 'center',
		borderWidth: 1,
		borderColor: 'rgba(51, 51, 51, 0.4)',
		maxWidth: 60,
	},
	dateBoxSelected: {
		backgroundColor: '#0c7c7c',
		borderColor: '#0c7c7c',
	},
	dateBoxDisabled: {
		opacity: 0.5,
	},
	dayName: {
		fontSize: 11,
		color: '#6f7680',
		marginBottom: 2,
	},
	dateNum: {
		fontWeight: 'bold',
		color: '#2c3136',
		fontSize: 15,
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
		marginTop: 12,
	},
	timeGroupContainer: {
		marginBottom: 16,
	},
	timeGroupLabel: {
		fontWeight: 'bold',
		color: '#62707a',
		marginBottom: 8,
		fontSize: 13,
	},
	slotsGridFlex: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	timeBox: {
		borderWidth: 1.5,
		borderColor: '#dde3e8',
		borderRadius: 8,
		paddingVertical: 6,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#fff',
	},
	timeBoxSelected: {
		borderColor: '#0c7c7c',
		backgroundColor: '#0c7c7c',
	},
	timeBoxDisabled: {
		backgroundColor: 'rgba(0,0,0,0.06)',
		borderColor: '#eee',
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
})
