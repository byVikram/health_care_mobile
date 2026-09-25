import React from 'react'
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { AppTypography } from '../../../../components/common'
import type { SlotGroup } from '../../doctorService'
import { DETAIL_PRIMARY } from './constants'
import type { AppointmentModeKey } from './types'

// Restyled, scoped to the Doctor Profile "Practises at" booking card only --
// matches the "Clinic & slot" HTML design's segmented toggle / date grid /
// grouped time slots. Deliberately NOT a change to the shared DateSlotPicker
// component (used by ~8 other screens); this is a separate, purpose-built
// picker so those screens are untouched.

const INK = '#12373E'
const INK_MUTED = '#5B6B6E'
const DIVIDER = '#D5E1E2'
const SURFACE_MUTED = '#F5F8F8'
const DISABLED_TEXT = '#A3B0B2'

const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DOW_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

function startOfDay(d: Date) {
	return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function isSameDay(a: Date, b: Date) {
	return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function nextSevenDays(): Date[] {
	const today = startOfDay(new Date())
	return Array.from({ length: 7 }, (_, i) => {
		const d = new Date(today)
		d.setDate(today.getDate() + i)
		return d
	})
}

interface DoctorSlotPickerProps {
	onAppointmentTypeChange: (type: AppointmentModeKey) => void
	offlineFee: number
	videoFee: number
	selectedDate: Date
	onDateChange: (date: Date) => void
	selectedTime: string | null
	onTimeChange: (time: string) => void
	availableSlots: SlotGroup[]
	slotsLoading: boolean
	selectedAppointmentType: AppointmentModeKey
	/** Real per-hospital open days (lowercase day names). Undefined = unknown -> never greyed out. */
	availableDays?: string[]
}

export function DoctorSlotPicker({
	onAppointmentTypeChange,
	offlineFee,
	videoFee,
	selectedDate,
	onDateChange,
	selectedTime,
	onTimeChange,
	availableSlots,
	slotsLoading,
	selectedAppointmentType,
	availableDays,
}: DoctorSlotPickerProps) {
	const days = nextSevenDays()

	return (
		<View style={styles.container}>
			{/* Consultation type segmented control */}
			<View style={styles.segmentGroup}>
				<TouchableOpacity
					style={[styles.segment, selectedAppointmentType === 'clinic' && styles.segmentActive]}
					onPress={(e) => {
						e.stopPropagation()
						onAppointmentTypeChange('clinic')
					}}
				>
					<MaterialCommunityIcons
						name="hospital-building"
						size={16}
						color={selectedAppointmentType === 'clinic' ? INK : INK_MUTED}
					/>
					<AppTypography
						style={[styles.segmentText, selectedAppointmentType === 'clinic' && styles.segmentTextActive]}
					>
						{offlineFee > 0 ? `In-clinic · ₹${offlineFee}` : 'In-clinic'}
					</AppTypography>
				</TouchableOpacity>
				<TouchableOpacity
					style={[styles.segment, selectedAppointmentType === 'video' && styles.segmentActive]}
					onPress={(e) => {
						e.stopPropagation()
						onAppointmentTypeChange('video')
					}}
				>
					<MaterialCommunityIcons
						name="video-outline"
						size={16}
						color={selectedAppointmentType === 'video' ? INK : INK_MUTED}
					/>
					<AppTypography
						style={[styles.segmentText, selectedAppointmentType === 'video' && styles.segmentTextActive]}
					>
						{videoFee > 0 ? `Video · ₹${videoFee}` : 'Video'}
					</AppTypography>
				</TouchableOpacity>
			</View>

			{/* Date grid -- next 7 days, greyed out only when we have a real
			    available_days field saying that day is closed. */}
			<AppTypography style={styles.label}>Date</AppTypography>
			<View style={styles.dateGrid}>
				{days.map((date) => {
					const isSelected = isSameDay(date, selectedDate)
					const dowKey = DOW_KEYS[date.getDay()]
					const isClosed =
						Array.isArray(availableDays) && availableDays.length > 0 && !availableDays.includes(dowKey)
					return (
						<TouchableOpacity
							key={date.toISOString()}
							disabled={isClosed}
							onPress={(e) => {
								e.stopPropagation()
								onDateChange(date)
								onTimeChange('')
							}}
							style={[
								styles.dateCell,
								isSelected && styles.dateCellSelected,
								isClosed && styles.dateCellClosed,
							]}
						>
							<AppTypography
								style={[
									styles.dateDow,
									isSelected && styles.dateTextSelected,
									isClosed && styles.dateTextClosed,
								]}
							>
								{date.getDate() === startOfDay(new Date()).getDate()
									? 'Today'
									: DOW_LABELS[date.getDay()]}
							</AppTypography>
							<AppTypography
								style={[
									styles.dateNum,
									isSelected && styles.dateTextSelected,
									isClosed && styles.dateTextClosed,
								]}
							>
								{date.getDate()}
							</AppTypography>
						</TouchableOpacity>
					)
				})}
			</View>

			{/* Time slots, grouped (Morning/Afternoon/Evening -- from the real
			    availability API's session labels) */}
			<AppTypography style={[styles.label, { marginTop: 16 }]}>Time</AppTypography>
			{slotsLoading ? (
				<ActivityIndicator color={DETAIL_PRIMARY} style={{ marginTop: 8 }} />
			) : availableSlots.length === 0 ? (
				<AppTypography style={styles.noSlotsText}>No slots available for this date.</AppTypography>
			) : (
				availableSlots.map((group, gIdx) => {
					const availableCount = group.slots.filter(
						(s) => s.status === 'AVAILABLE' || s.status === ('' as any)
					).length
					return (
						<View key={`${group.label}-${gIdx}`} style={{ marginBottom: 12 }}>
							<AppTypography style={styles.groupLabel}>
								{group.label} · {availableCount === 0 ? 'none left' : `${availableCount} available`}
							</AppTypography>
							<View style={styles.timeGrid}>
								{group.slots.map((slot, sIdx) => {
									const isBooked =
										slot.is_booked || slot.status === 'BOOKED' || slot.status === 'OCCUPIED'
									const isBlocked = slot.status === 'BLOCKED' || slot.status === 'UNAVAILABLE'
									const canSelect = !isBooked && !isBlocked
									const isSelected = selectedTime === slot.start_time
									return (
										<TouchableOpacity
											key={`${slot.start_time}-${sIdx}`}
											disabled={!canSelect}
											onPress={(e) => {
												e.stopPropagation()
												onTimeChange(slot.start_time)
											}}
											style={[
												styles.timeCell,
												isSelected && styles.timeCellSelected,
												!canSelect && styles.timeCellDisabled,
											]}
										>
											<AppTypography
												style={[
													styles.timeText,
													isSelected && styles.timeTextSelected,
													!canSelect && styles.timeTextDisabled,
													isBooked && styles.timeTextStrike,
												]}
											>
												{slot.start_time}
											</AppTypography>
										</TouchableOpacity>
									)
								})}
							</View>
						</View>
					)
				})
			)}
		</View>
	)
}

const styles = StyleSheet.create({
	container: { gap: 4 },
	segmentGroup: {
		flexDirection: 'row',
		gap: 4,
		padding: 4,
		borderRadius: 9999,
		backgroundColor: SURFACE_MUTED,
		borderWidth: 1,
		borderColor: DIVIDER,
	},
	segment: {
		flex: 1,
		height: 40,
		borderRadius: 9999,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 6,
	},
	segmentActive: {
		backgroundColor: '#FFFFFF',
		shadowColor: INK,
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.08,
		shadowRadius: 3,
		elevation: 1,
	},
	segmentText: {
		fontSize: 13,
		fontWeight: '600',
		color: INK_MUTED,
	},
	segmentTextActive: {
		color: INK,
	},
	label: {
		fontSize: 15,
		fontWeight: '700',
		color: INK,
		marginTop: 16,
		marginBottom: 8,
	},
	dateGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 4,
	},
	dateCell: {
		width: '13%',
		flexGrow: 1,
		height: 56,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#7A8B8E',
		backgroundColor: '#FFFFFF',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 2,
	},
	dateCellSelected: {
		backgroundColor: DETAIL_PRIMARY,
		borderColor: DETAIL_PRIMARY,
	},
	dateCellClosed: {
		borderColor: DIVIDER,
		backgroundColor: '#FFFFFF',
	},
	dateDow: {
		fontSize: 11,
		fontWeight: '600',
		color: INK,
	},
	dateNum: {
		fontSize: 18,
		fontWeight: '800',
		color: INK,
	},
	dateTextSelected: {
		color: '#FFFFFF',
	},
	dateTextClosed: {
		color: DISABLED_TEXT,
	},
	groupLabel: {
		fontSize: 13,
		fontWeight: '600',
		color: INK_MUTED,
		marginBottom: 8,
	},
	timeGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	timeCell: {
		width: '30%',
		flexGrow: 1,
		height: 44,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#7A8B8E',
		backgroundColor: '#FFFFFF',
		alignItems: 'center',
		justifyContent: 'center',
	},
	timeCellSelected: {
		backgroundColor: DETAIL_PRIMARY,
		borderColor: DETAIL_PRIMARY,
	},
	timeCellDisabled: {
		backgroundColor: SURFACE_MUTED,
		borderColor: SURFACE_MUTED,
	},
	timeText: {
		fontSize: 13,
		fontWeight: '600',
		color: INK,
	},
	timeTextSelected: {
		color: '#FFFFFF',
	},
	timeTextDisabled: {
		color: DISABLED_TEXT,
	},
	timeTextStrike: {
		textDecorationLine: 'line-through',
	},
	noSlotsText: {
		fontSize: 13,
		color: INK_MUTED,
	},
})
