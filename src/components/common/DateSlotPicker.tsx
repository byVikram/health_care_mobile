import React, { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
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
		disablePast = true,
		multiSelect = false,
		dateLabel = 'Select Date',
		timeLabel = 'Select Time',
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
		a.getDate() === b.getDate() &&
		a.getMonth() === b.getMonth() &&
		a.getFullYear() === b.getFullYear()

	const isPast = (d: Date) => {
		if (!disablePast) return false
		const today0 = new Date(today.getFullYear(), today.getMonth(), today.getDate())
		const d0 = new Date(d.getFullYear(), d.getMonth(), d.getDate())
		return d0 < today0
	}

	const selectedTimes = Array.isArray(selectedTime)
		? selectedTime
		: selectedTime
		? [selectedTime]
		: []

	const handleTimePress = (time: string) => {
		if (!multiSelect) return onTimeChange(time)

		const next = selectedTimes.includes(time)
			? selectedTimes.filter(t => t !== time)
			: [...selectedTimes, time]

		onTimeChange(next)
	}

	return (
		<View style={styles.container}>

			{/* DATE HEADER */}
			<View style={styles.dateHeader}>
				<AppTypography variant="h4" style={styles.sectionTitle}>
					{dateLabel}
				</AppTypography>

				<View style={styles.monthNav}>
					<MaterialCommunityIcons name="chevron-left" size={22} color="#0c7c7c" />
					<Text style={styles.monthLabel}>{monthLabel}</Text>
					<MaterialCommunityIcons name="chevron-right" size={22} color="#0c7c7c" />
				</View>
			</View>

			{/* DATE STRIP */}
			<ScrollView horizontal showsHorizontalScrollIndicator={false}>
				<View style={styles.dateStrip}>
					{weekDates.map(date => {
						const isSelected = selectedDate ? isSameDay(date, selectedDate) : false
						const past = isPast(date)

						return (
							<TouchableOpacity
								key={date.toISOString()}
								style={[
									styles.dateBox,
									isSelected && styles.dateBoxSelected,
									past && styles.dateBoxDisabled,
								]}
								onPress={() => !past && onDateChange(date)}
							>
								<Text style={[styles.dayText, isSelected && styles.whiteText]}>
									{DAYS[date.getDay()]}
								</Text>
								<Text style={[styles.dateText, isSelected && styles.whiteText]}>
									{date.getDate()}
								</Text>
							</TouchableOpacity>
						)
					})}
				</View>
			</ScrollView>

			{/* TIME HEADER */}
			<View style={styles.timeHeader}>
				<AppTypography variant="h4">{timeLabel}</AppTypography>
			</View>

			{loading ? (
				<AppSkeleton height={100} />
			) : (
				<View style={styles.timeGridContainer}>

					{/* VISIT TYPE (IMPROVED UI ONLY) */}
					<View style={styles.toggleContainer}>
						<Text style={styles.toggleTitle}>Select Visit Type</Text>

						<View style={styles.toggleGroup}>
							<TouchableOpacity
								style={[styles.toggleOption, visitType === 'online' && styles.toggleSelected]}
								onPress={() => setVisitType('online')}
							>
								<Text style={visitType === 'online' && styles.toggleSelectedText}>
									Online
								</Text>
							</TouchableOpacity>

							<TouchableOpacity
								style={[styles.toggleOption, visitType === 'clinic' && styles.toggleSelected]}
								onPress={() => setVisitType('clinic')}
							>
								<Text style={visitType === 'clinic' && styles.toggleSelectedText}>
									Clinic
								</Text>
							</TouchableOpacity>
						</View>
					</View>

					{/* SLOT GROUPS (CLEAN UI) */}
					{availableSlots.map((group, idx) => (
						<View key={idx} style={styles.groupContainer}>
							<Text style={styles.groupLabel}>{group.label}</Text>

							<View style={styles.slotWrap}>
								{group.slots.map((slot, i) => {
									const isSelected = selectedTimes.includes(slot.start_time)

									return (
										<TouchableOpacity
											key={i}
											style={[
												styles.slot,
												isSelected && styles.slotSelected,
											]}
											onPress={() => handleTimePress(slot.start_time)}
										>
											<Text style={[styles.slotText, isSelected && styles.whiteText]}>
												{slot.start_time}
											</Text>
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

/* ========================= */
/*        STYLES ONLY        */
/* ========================= */

const styles = StyleSheet.create({

	container: {
		padding: 16,
	},

	dateHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 10,
	},

	sectionTitle: {
		fontWeight: 'bold',
	},

	monthNav: {
		flexDirection: 'row',
		alignItems: 'center',
	},

	monthLabel: {
		marginHorizontal: 8,
		fontWeight: '600',
	},

	dateStrip: {
		flexDirection: 'row',
		gap: 10,
		paddingBottom: 10,
	},

	dateBox: {
		width: 55,
		height: 65,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#ccc',
		justifyContent: 'center',
		alignItems: 'center',
	},

	dateBoxSelected: {
		backgroundColor: '#0c7c7c',
		borderColor: '#0c7c7c',
	},

	dateBoxDisabled: {
		opacity: 0.4,
	},

	dayText: {
		fontSize: 11,
		color: '#666',
	},

	dateText: {
		fontSize: 16,
		fontWeight: 'bold',
	},

	whiteText: {
		color: '#fff',
	},

	timeHeader: {
		marginTop: 20,
		marginBottom: 10,
	},

	/* VISIT TYPE CLEAN */
	toggleContainer: {
		marginBottom: 16,
		padding: 12,
	
		borderRadius: 12,
	},

	toggleTitle: {
		fontWeight: '700',
		marginBottom: 10,
	},

	toggleGroup: {
		flexDirection: 'row',
		backgroundColor: '#e6eaed',
		borderRadius: 25,
		padding: 4,
	},

	toggleOption: {
		flex: 1,
		paddingVertical: 10,
		alignItems: 'center',
		borderRadius: 25,
	},

	toggleSelected: {
		backgroundColor: '#0c7c7c',
	},

	toggleSelectedText: {
		color: '#fff',
		fontWeight: '600',
	},

	/* SLOT UI CLEAN */
	groupContainer: {
		marginTop: 18,
		padding: 12,
		backgroundColor: '#fff',
		borderRadius: 14,
		
		borderColor: '#eef2f5',
	},

	groupLabel: {
		fontWeight: '700',
		marginBottom: 12,
		color: '#2c3e50',
	},

	slotWrap: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 12,
	},

	slot: {
		minWidth: 80,
		paddingVertical: 10,
		paddingHorizontal: 14,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#ddd',
		backgroundColor: '#fff',
		alignItems: 'center',
	},

	slotSelected: {
		backgroundColor: '#0c7c7c',
		borderColor: '#0c7c7c',
	},

	slotText: {
		fontSize: 12,
		fontWeight: '500',
	},
})