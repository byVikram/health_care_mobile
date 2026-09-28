import React from 'react'
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { AppSelect } from '../inputs/AppSelect'
import { AppTypography } from '../display/AppTypography'

// ── Shared working-hours scheduling UI ─────────────────────────────────
// Originally built for the Doctor Profile → My Hospitals tab. Extracted
// here so other profile flows (e.g. Nurse/Ancillary Availability) can
// reuse the exact same day selector, time-slot editor, and slot-duration
// dropdown instead of duplicating them.

export type WorkingDayKey = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
export type AppointmentType = 'clinic' | 'video'
export type TimeSlot = { start: string; end: string }
export type SectionSlots = {
	morning: TimeSlot[]
	afternoon: TimeSlot[]
	evening: TimeSlot[]
}
export type WorkingHoursState = {
	sections: SectionSlots
	slotDuration: number
}

export const TEAL = '#0c7c7c'

export const WORKING_DAYS: { key: WorkingDayKey; label: string }[] = [
	{ key: 'sunday', label: 'Sun' },
	{ key: 'monday', label: 'Mon' },
	{ key: 'tuesday', label: 'Tue' },
	{ key: 'wednesday', label: 'Wed' },
	{ key: 'thursday', label: 'Thu' },
	{ key: 'friday', label: 'Fri' },
	{ key: 'saturday', label: 'Sat' },
]

export const SECTION_META = [
	{
		key: 'morning' as const,
		label: 'Morning',
		startHour: 8,
		endHour: 12,
	},
	{
		key: 'afternoon' as const,
		label: 'Afternoon',
		startHour: 12,
		endHour: 17,
	},
	{
		key: 'evening' as const,
		label: 'Evening',
		startHour: 17,
		endHour: 21,
	},
]

export const durationOptions = [10, 15, 20, 25, 30]

export const makeTimeOptions = (startHour: number, endHour: number, stepMins = 30) => {
	const options: { value: string; label: string }[] = []
	const totalStartMins = startHour * 60
	const totalEndMins = endHour * 60

	for (let mins = totalStartMins; mins < totalEndMins; mins += stepMins) {
		const hour = Math.floor(mins / 60)
		const minute = mins % 60
		const value = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
		const period = hour < 12 ? 'AM' : 'PM'
		const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
		options.push({ value, label: `${hour12}:${String(minute).padStart(2, '0')} ${period}` })
	}

	return options
}

export const snapToStep = (time: string, stepMins: number) => {
	const [hour, minute] = time.split(':').map(Number)
	const totalMins = hour * 60 + minute
	const snapped = Math.round(totalMins / stepMins) * stepMins
	const snappedHour = Math.floor(snapped / 60)
	const snappedMinute = snapped % 60

	return `${String(snappedHour).padStart(2, '0')}:${String(snappedMinute).padStart(2, '0')}`
}

export const createWorkingHoursState = (): WorkingHoursState => ({
	sections: {
		morning: [{ start: '08:00', end: '10:00' }],
		afternoon: [{ start: '12:00', end: '14:00' }],
		evening: [{ start: '17:00', end: '19:00' }],
	},
	slotDuration: 15,
})

export function DropdownSelect({
	label,
	value,
	options,
	onChange,
	compact = false,
	showFloatingLabel = true,
}: {
	label: string
	value: string | number
	options: { value: string | number; label: string }[]
	onChange: (value: string | number) => void
	compact?: boolean
	showFloatingLabel?: boolean
}) {
	const normalizedOptions = options.map((option) => ({
		value: String(option.value),
		label: option.label,
	}))

	return (
		<View style={[styles.dropdownGroup, compact && styles.dropdownGroupCompact]}>
			<AppSelect
				label={showFloatingLabel ? label : undefined}
				value={String(value)}
				options={normalizedOptions}
				onSelect={(selectedValue) => {
					const selectedOption = options.find((option) => String(option.value) === selectedValue)
					if (selectedOption) onChange(selectedOption.value)
				}}
				placeholder="Select"
				size="form"
				borderRadius={10}
				floatingLabel={showFloatingLabel}
				noMargin
			/>
		</View>
	)
}

export interface WorkingHoursSectionProps {
	// Pass '' or null to omit the built-in title entirely, e.g. when the
	// consuming screen renders its own section title + description above
	// the day selector (see Nurse Availability tab).
	title?: string | null
	selectedWorkingDay: WorkingDayKey
	onWorkingDayChange: (day: WorkingDayKey) => void
	// Appointment-type segmentation (Clinic Visit / Video Call) is doctor-specific.
	// Flows that don't need it (e.g. nurse availability) can omit these props
	// and pass showAppointmentType={false}.
	showAppointmentType?: boolean
	selectedAppointmentType?: AppointmentType
	onAppointmentTypeChange?: (type: AppointmentType) => void
	selectedWorkingHours: WorkingHoursState
	onAddSlot: (sectionKey: keyof SectionSlots) => void
	onRemoveSlot: (sectionKey: keyof SectionSlots, slotIndex: number) => void
	onUpdateSlotTime: (sectionKey: keyof SectionSlots, slotIndex: number, field: 'start' | 'end', value: string) => void
	// Slot Duration dropdown is optional — pass showSlotDuration={false} to hide it
	// entirely for flows (e.g. nurse availability) that don't need it.
	showSlotDuration?: boolean
	onSlotDurationChange?: (value: number) => void
	stacked: boolean
}

export function WorkingHoursSection({
	title = 'Working Hours',
	selectedWorkingDay,
	onWorkingDayChange,
	showAppointmentType = true,
	selectedAppointmentType,
	onAppointmentTypeChange,
	selectedWorkingHours,
	onAddSlot,
	onRemoveSlot,
	onUpdateSlotTime,
	showSlotDuration = true,
	onSlotDurationChange,
	stacked,
}: WorkingHoursSectionProps) {
	return (
		<View style={styles.workingHours}>
			{title ? (
				<AppTypography variant="body" style={styles.workingTitle}>
					{title}
				</AppTypography>
			) : null}

			<ScrollView
				horizontal
				nestedScrollEnabled
				directionalLockEnabled
				showsHorizontalScrollIndicator={false}
				style={styles.daysScroll}
				contentContainerStyle={[styles.daysWrap, styles.daysWrapScrollable, stacked && styles.daysWrapCompact]}
				onMoveShouldSetResponderCapture={() => true}
			>
				{WORKING_DAYS.map((day) => {
					const isSelected = selectedWorkingDay === day.key
					return (
						<TouchableOpacity
							key={day.key}
							style={[
								styles.dayChip,
								stacked && styles.dayChipCompact,
								isSelected && styles.dayChipActive,
							]}
							onPress={() => onWorkingDayChange(day.key)}
							activeOpacity={0.85}
						>
							<AppTypography
								variant="body"
								style={[
									styles.dayChipText,
									stacked && styles.dayChipTextCompact,
									isSelected && styles.dayChipTextActive,
								]}
							>
								{day.label}
							</AppTypography>
						</TouchableOpacity>
					)
				})}
			</ScrollView>

			{showAppointmentType && selectedAppointmentType && onAppointmentTypeChange ? (
				<View style={styles.appointmentTypeBlock}>
					<AppTypography variant="caption" style={styles.appointmentTypeLabel}>
						Type of Appointment
					</AppTypography>
					<View style={styles.segmentedControl}>
						<TouchableOpacity
							style={[
								styles.segmentedOption,
								selectedAppointmentType === 'clinic' && styles.segmentedOptionActive,
							]}
							onPress={() => onAppointmentTypeChange('clinic')}
							activeOpacity={0.85}
						>
							<AppTypography
								variant="caption"
								style={[
									styles.segmentedText,
									selectedAppointmentType === 'clinic' && styles.segmentedTextActive,
								]}
							>
								Clinic Visit
							</AppTypography>
						</TouchableOpacity>
						<TouchableOpacity
							style={[
								styles.segmentedOption,
								selectedAppointmentType === 'video' && styles.segmentedOptionActive,
							]}
							onPress={() => onAppointmentTypeChange('video')}
							activeOpacity={0.85}
						>
							<AppTypography
								variant="caption"
								style={[
									styles.segmentedText,
									selectedAppointmentType === 'video' && styles.segmentedTextActive,
								]}
							>
								Video Call
							</AppTypography>
						</TouchableOpacity>
					</View>
				</View>
			) : null}

			<View key={selectedAppointmentType ?? 'default'}>
				{SECTION_META.map((section) => {
					const slots = selectedWorkingHours.sections[section.key]
					const canAdd = slots.length < 3
					const isLastSection = section.key === SECTION_META[SECTION_META.length - 1].key

					return (
						<View key={section.key} style={[styles.shiftBlock, isLastSection && styles.shiftBlockLast]}>
							<AppTypography variant="caption" style={styles.shiftTitle}>
								{section.label}
							</AppTypography>

							<View style={styles.slotsWrap}>
								{slots.map((slot, slotIndex) => {
									const stepMins = selectedWorkingHours.slotDuration
									const allOptions = makeTimeOptions(section.startHour, section.endHour, stepMins)
									const startOptions =
										slotIndex === 0
											? allOptions
											: allOptions.filter((option) => option.value >= slots[slotIndex - 1].end)
									const endOptions = allOptions.filter((option) => option.value > slot.start)
									const showAdd = slotIndex === slots.length - 1 && canAdd

									return (
										<View
											key={`${section.key}-${slotIndex}`}
											style={[
												styles.slotEditor,
												slotIndex < slots.length - 1 && styles.slotEditorSpaced,
												stacked && styles.slotEditorStacked,
											]}
										>
											<View style={[styles.slotSelects, stacked && styles.slotSelectsStacked]}>
												<View style={styles.slotSelectCell}>
													<DropdownSelect
														label="Start Time"
														value={slot.start}
														options={startOptions}
														onChange={(value) =>
															onUpdateSlotTime(
																section.key,
																slotIndex,
																'start',
																String(value)
															)
														}
														compact
													/>
												</View>
												<View style={styles.slotSelectCell}>
													<DropdownSelect
														label="End Time"
														value={slot.end}
														options={endOptions}
														onChange={(value) =>
															onUpdateSlotTime(
																section.key,
																slotIndex,
																'end',
																String(value)
															)
														}
														compact
													/>
												</View>
											</View>

											<View style={styles.slotActions}>
												{showAdd ? (
													<TouchableOpacity
														style={styles.addSlotButton}
														onPress={() => onAddSlot(section.key)}
														activeOpacity={0.8}
													>
														<MaterialCommunityIcons
															name="plus"
															size={21}
															color={TEAL}
															style={styles.slotActionIcon}
														/>
													</TouchableOpacity>
												) : null}

												{slotIndex > 0 ? (
													<TouchableOpacity
														style={styles.iconAction}
														onPress={() => onRemoveSlot(section.key, slotIndex)}
														activeOpacity={0.8}
													>
														<MaterialCommunityIcons
															name="close"
															size={21}
															color="#62707a"
															style={styles.slotActionIcon}
														/>
													</TouchableOpacity>
												) : null}
											</View>
										</View>
									)
								})}
							</View>
						</View>
					)
				})}

				{showSlotDuration && onSlotDurationChange ? (
					<View style={styles.slotDurationBlock}>
						<AppTypography variant="caption" style={styles.shiftTitle}>
							Slot Duration
						</AppTypography>
						<View style={styles.slotDurationField}>
							<DropdownSelect
								label="Duration"
								value={selectedWorkingHours.slotDuration}
								options={durationOptions.map((duration) => ({
									value: duration,
									label: `${duration} mins`,
								}))}
								onChange={(value) => onSlotDurationChange(Number(value))}
								compact
							/>
						</View>
					</View>
				) : null}
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	workingHours: {
		width: '100%',
		maxWidth: '100%',
		marginTop: 4,
		paddingTop: 2,
		alignSelf: 'flex-start',
	},
	workingTitle: {
		color: '#1f2b33',
		fontSize: 16,
		lineHeight: 22,
		fontWeight: '700',
		marginBottom: 16,
	},
	shiftBlock: {
		marginBottom: 20,
	},
	shiftBlockLast: {
		marginBottom: 14,
	},
	shiftTitle: {
		color: '#7b8790',
		fontSize: 14,
		lineHeight: 20,
		fontWeight: '500',
		marginBottom: 16,
	},
	daysWrap: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'space-between',
		columnGap: 8,
		rowGap: 10,
		marginBottom: 24,
	},
	daysWrapScrollable: {
		flexWrap: 'nowrap',
		justifyContent: 'flex-start',
		paddingHorizontal: 2,
	},
	daysScroll: {
		marginHorizontal: -2,
		marginBottom: 18,
	},
	daysWrapCompact: {
		flexWrap: 'nowrap',
		justifyContent: 'flex-start',
		columnGap: 8,
		rowGap: 0,
		marginBottom: 0,
		paddingHorizontal: 2,
	},
	dayChip: {
		width: 96,
		height: 78,
		borderRadius: 14,
		borderWidth: 1,
		borderColor: '#d8d8d8',
		backgroundColor: '#ffffff',
		alignItems: 'center',
		justifyContent: 'center',
	},
	dayChipCompact: {
		width: 50,
		height: 46,
		borderRadius: 10,
	},
	dayChipActive: {
		borderColor: TEAL,
		backgroundColor: TEAL,
	},
	dayChipText: {
		color: '#5f6b76',
		fontSize: 14,
		lineHeight: 20,
		fontWeight: '600',
	},
	dayChipTextCompact: {
		fontSize: 12,
		lineHeight: 16,
		fontWeight: '600',
	},
	dayChipTextActive: {
		color: '#ffffff',
		fontWeight: '700',
	},
	appointmentTypeBlock: {
		marginBottom: 18,
	},
	appointmentTypeLabel: {
		color: '#7b8790',
		fontSize: 14,
		lineHeight: 20,
		fontWeight: '500',
		marginBottom: 10,
	},
	segmentedControl: {
		alignSelf: 'flex-start',
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: TEAL,
		borderRadius: 999,
		padding: 3,
		gap: 3,
	},
	segmentedOption: {
		borderRadius: 999,
		paddingHorizontal: 18,
		paddingVertical: 7,
	},
	segmentedOptionActive: {
		backgroundColor: '#ffffff',
	},
	segmentedText: {
		color: '#ffffff',
		fontSize: 14,
		lineHeight: 18,
		fontWeight: '600',
	},
	segmentedTextActive: {
		color: '#111111',
	},
	slotsWrap: {
		flexDirection: 'column',
		alignItems: 'flex-start',
		width: '100%',
	},
	slotEditor: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		width: 342,
		maxWidth: '100%',
		marginBottom: 0,
		overflow: 'visible',
		flexWrap: 'nowrap',
	},
	slotEditorSpaced: {
		marginBottom: 25,
	},
	slotEditorStacked: {
		width: '100%',
		alignItems: 'flex-start',
		flexWrap: 'wrap',
	},
	slotSelects: {
		flexDirection: 'row',
		gap: 8,
		flex: 1,
		minWidth: 0,
		flexShrink: 1,
	},
	slotSelectsStacked: {
		width: '100%',
		maxWidth: '100%',
		marginBottom: 0,
	},
	slotSelectCell: {
		flex: 1,
		minWidth: 0,
	},
	slotActions: {
		width: 72,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'flex-start',
		gap: 8,
		flexShrink: 0,
	},
	iconAction: {
		width: 32,
		height: 48,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: '#a7d3db',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#ffffff',
		flexShrink: 0,
	},
	addSlotButton: {
		width: 32,
		height: 48,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: '#a7d3db',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#ffffff',
		flexShrink: 0,
		zIndex: 2,
		elevation: 2,
	},
	slotActionIcon: {
		textAlign: 'center',
		textAlignVertical: 'center',
	},
	slotDurationBlock: {
		marginTop: 0,
		marginBottom: 0,
	},
	slotDurationField: {
		width: 225,
		maxWidth: '100%',
	},
	dropdownGroup: {
		width: '100%',
		position: 'relative',
	},
	dropdownGroupCompact: {
		paddingTop: 0,
	},
})

export default WorkingHoursSection
