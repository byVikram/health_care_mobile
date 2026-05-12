import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
	ActivityIndicator,
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
	useWindowDimensions,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import Toast from 'react-native-toast-message'

import { AppSelect } from '../../../../components/common'
import DateSlotPicker from '../../../../components/common/DateSlotPicker'
import {
	createSlotOverrideBatch,
	getDoctorAvailability,
	SlotGroup,
	SlotOverrideBatchPayload,
	SlotOverridePayload,
	TimeSlot,
} from '../../../doctor/doctorService'
import { DoctorAvailability, DoctorHospital } from '../../../../types/doctor-profile'

interface AvailabilityTabProps {
	hospitals?: DoctorHospital[]
	availability?: DoctorAvailability
	onChange?: (availability: DoctorAvailability) => void
}

type UnselectedSlotsByDate = Record<string, string[]>

const EMPTY_AVAILABILITY: DoctorAvailability = {
	monday: [],
	tuesday: [],
	wednesday: [],
	thursday: [],
	friday: [],
	saturday: [],
	sunday: [],
}

const STORAGE_KEY = 'doctorBlockedSlots'
const TEAL = '#0c7c7c'

export default function AvailabilityTab({ hospitals, availability, onChange }: AvailabilityTabProps) {
	const { width } = useWindowDimensions()
	const isTablet = width >= 768
	const timeSlotColumns = width >= 900 ? 5 : width >= 768 ? 4 : 3

	const [localAvailability, setLocalAvailability] = useState<DoctorAvailability>(availability ?? EMPTY_AVAILABILITY)
	const resolvedHospitals = hospitals ?? []
	const resolvedAvailability = availability ?? localAvailability

	const [selectedHospitalId, setSelectedHospitalId] = useState('')
	const [selectedDate, setSelectedDate] = useState<Date>(new Date())
	const [availableSlotGroups, setAvailableSlotGroups] = useState<SlotGroup[]>([])
	const [slotsLoading, setSlotsLoading] = useState(false)
	const [unselectedSlotsByDate, setUnselectedSlotsByDate] = useState<UnselectedSlotsByDate>({})
	const [pendingOverrides, setPendingOverrides] = useState<SlotOverridePayload[]>([])
	const [saveLoading, setSaveLoading] = useState(false)
	const [pendingSaveToast, setPendingSaveToast] = useState<string | null>(null)
	const [selectedAppointmentType, setSelectedAppointmentType] = useState<'clinic' | 'video'>('clinic')
	const [toggleRefreshing, setToggleRefreshing] = useState(false)

	const formatDateForApi = (date: Date) => {
		const year = date.getFullYear()
		const month = String(date.getMonth() + 1).padStart(2, '0')
		const day = String(date.getDate()).padStart(2, '0')
		return `${year}-${month}-${day}`
	}

	const getDayKey = (date: Date): keyof DoctorAvailability => {
		switch (date.getDay()) {
			case 0:
				return 'sunday'
			case 1:
				return 'monday'
			case 2:
				return 'tuesday'
			case 3:
				return 'wednesday'
			case 4:
				return 'thursday'
			case 5:
				return 'friday'
			default:
				return 'saturday'
		}
	}

	const updateAvailability = (next: DoctorAvailability) => {
		if (onChange) {
			onChange(next)
			return
		}
		setLocalAvailability(next)
	}

	useEffect(() => {
		if (availability) setLocalAvailability(availability)
	}, [availability])

	useEffect(() => {
		const preferredHospitalId = resolvedHospitals.find((hospital) => hospital.isPrimary)?.id ?? resolvedHospitals[0]?.id ?? ''
		setSelectedHospitalId((current) => {
			if (current && resolvedHospitals.some((hospital) => hospital.id === current)) return current
			return preferredHospitalId
		})
	}, [resolvedHospitals])

	useEffect(() => {
		const loadBlockedSlots = async () => {
			try {
				const stored = await AsyncStorage.getItem(STORAGE_KEY)
				if (stored) setUnselectedSlotsByDate(JSON.parse(stored))
			} catch (error) {
				console.log('[AvailabilityTab] failed to load stored blocked slots:', error)
			}
		}

		loadBlockedSlots()
	}, [])

	const fetchAvailability = useCallback(async () => {
		if (!selectedHospitalId || !selectedDate) return
		try {
			setSlotsLoading(true)
			const res = await getDoctorAvailability({
				hospital_id: selectedHospitalId,
				date: formatDateForApi(selectedDate),
			})

			let processedData: SlotGroup[] = []
			if (Array.isArray(res)) {
				processedData = res as SlotGroup[]
			} else if (res && Array.isArray(res.data)) {
				processedData = res.data as SlotGroup[]
			}

			setAvailableSlotGroups(processedData)
			setPendingOverrides([])
		} catch (error) {
			console.log('[AvailabilityTab] failed to fetch availability:', error)
			setAvailableSlotGroups([])
		} finally {
			setSlotsLoading(false)
		}
	}, [selectedHospitalId, selectedDate])

	useEffect(() => {
		fetchAvailability()
	}, [fetchAvailability])

	const dayKey = getDayKey(selectedDate)
	const selectedDateKey = formatDateForApi(selectedDate)

	const allSelectableSlots = useMemo(
		() =>
			Array.from(
				new Set(
					availableSlotGroups.flatMap((group) =>
						(group.slots ?? [])
							.filter((slot: TimeSlot) => Boolean(slot.start_time) && slot.can_toggle !== false)
							.map((slot: TimeSlot) => slot.start_time)
					)
				)
			),
		[availableSlotGroups]
	)

	const apiBlockedSlots = useMemo(
		() =>
			Array.from(
				new Set(
					availableSlotGroups.flatMap((group) =>
						(group.slots ?? [])
							.filter(
								(slot: TimeSlot) =>
									Boolean(slot.start_time) && slot.can_toggle !== false && slot.status === 'BLOCKED'
							)
							.map((slot: TimeSlot) => slot.start_time)
					)
				)
			),
		[availableSlotGroups]
	)

	const todayUnselected: string[] = unselectedSlotsByDate[selectedDateKey] ?? apiBlockedSlots
	const selectedSlots: string[] = allSelectableSlots.filter((slot) => !todayUnselected.includes(slot))

	const slotGroupsForPicker: SlotGroup[] = availableSlotGroups.map((group) => ({
		...group,
		slots: group.slots.map((slot) => {
			if (slot.can_toggle === false) return slot
			if (todayUnselected.includes(slot.start_time)) {
				return { ...slot, status: 'BLOCKED', is_enabled: true }
			}
			if (slot.status === 'BLOCKED') {
				return { ...slot, status: 'AVAILABLE', is_enabled: true }
			}
			return slot
		}),
	}))

	const getSlotEndTime = (startTime: string): string => {
		for (const group of availableSlotGroups) {
			const match = group.slots.find((slot) => slot.start_time === startTime)
			if (match) return match.end_time
		}
		return startTime
	}

	const stageSlotSelection = async (slots: string[]) => {
		const newlyBlocked = selectedSlots.filter((slot) => !slots.includes(slot))
		const newlyUnblocked = todayUnselected.filter((slot) => slots.includes(slot))
		const updatedUnselected = [...todayUnselected.filter((slot) => !newlyUnblocked.includes(slot)), ...newlyBlocked]
		const updated: UnselectedSlotsByDate = { ...unselectedSlotsByDate, [selectedDateKey]: updatedUnselected }

		setUnselectedSlotsByDate(updated)
		await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
		updateAvailability({ ...resolvedAvailability, [dayKey]: slots })

		const changedOverrides: SlotOverridePayload[] = [
			...newlyBlocked.map((slot) => ({
				hospital_id: selectedHospitalId,
				date: formatDateForApi(selectedDate),
				start_time: slot,
				end_time: getSlotEndTime(slot),
				is_blocked: true,
			})),
			...newlyUnblocked.map((slot) => ({
				hospital_id: selectedHospitalId,
				date: formatDateForApi(selectedDate),
				start_time: slot,
				end_time: getSlotEndTime(slot),
				is_blocked: false,
			})),
		]

		const initialBlockedSlots = new Set(apiBlockedSlots)
		setPendingOverrides((prev) => {
			const filtered = prev.filter(
				(pending) =>
					!changedOverrides.some(
						(changed) =>
							changed.hospital_id === pending.hospital_id &&
							changed.date === pending.date &&
							changed.start_time === pending.start_time &&
							changed.end_time === pending.end_time
					)
			)
			const effectiveOverrides = changedOverrides.filter(
				(override) => initialBlockedSlots.has(override.start_time) !== override.is_blocked
			)
			return [...filtered, ...effectiveOverrides]
		})
	}

	const handleTimeChange = (slots: string | string[]) => {
		setPendingSaveToast(null)
		stageSlotSelection(Array.isArray(slots) ? slots : [slots])
	}

	const handleSaveAvailability = async () => {
		if (pendingOverrides.length === 0) {
			setPendingSaveToast(null)
			return
		}

		setSaveLoading(true)
		try {
			let backendMessage = ''
			const overridesByHospitalAndDate = pendingOverrides.reduce<Record<string, SlotOverrideBatchPayload>>(
				(acc, override) => {
					const groupKey = `${override.hospital_id ?? ''}__${override.date}`
					if (!acc[groupKey]) {
						acc[groupKey] = {
							hospital_id: override.hospital_id ?? null,
							date: override.date,
							slots: [],
						}
					}
					acc[groupKey].slots.push({
						start_time: override.start_time,
						end_time: override.end_time,
						is_blocked: override.is_blocked,
					})
					return acc
				},
				{}
			)

			for (const payload of Object.values(overridesByHospitalAndDate)) {
				const response = await createSlotOverrideBatch(payload)
				if (response?.message) backendMessage = response.message
			}

			setPendingOverrides([])
			Toast.show({ type: 'success', text1: backendMessage || pendingSaveToast || 'Saved successfully' })
			await fetchAvailability()
			setPendingSaveToast(null)
		} catch (error) {
			console.error('[AvailabilityTab] save availability error:', error)
			Toast.show({ type: 'error', text1: 'Unable to save availability', text2: 'Please try again.' })
		} finally {
			setSaveLoading(false)
		}
	}

	return (
		<ScrollView
			style={styles.screen}
			contentContainerStyle={styles.screenContent}
			keyboardShouldPersistTaps="handled"
			showsVerticalScrollIndicator={false}
		>
			<View style={[styles.card, isTablet && styles.cardTablet]}>
				<Text style={styles.title}>Availability</Text>

				<View style={styles.fieldGroup}>
					<Text style={styles.sectionLabel}>Choose Hospital</Text>
					{resolvedHospitals.length === 0 ? (
						<Text style={styles.emptyText}>No hospitals added. Please add a hospital first.</Text>
					) : (
						<AppSelect
							value={selectedHospitalId}
							onSelect={(value) => {
								setSelectedHospitalId(value)
								setPendingOverrides([])
							}}
							options={resolvedHospitals.map((hospital) => ({ value: hospital.id, label: hospital.name }))}
							size="small"
							borderRadius={10}
							customCardStyle={styles.selectCard}
						/>
					)}
				</View>

				<View style={[styles.todayRow, isTablet && styles.todayRowTablet]}>
					<TouchableOpacity style={styles.todayButton} onPress={() => setSelectedDate(new Date())}>
						<Text style={styles.todayButtonText}>Today</Text>
					</TouchableOpacity>
				</View>

				<DateSlotPicker
					multiSelect
					selectedDate={selectedDate}
					onDateChange={setSelectedDate}
					selectedTime={selectedSlots}
					onTimeChange={handleTimeChange}
					dateLabel="Select follow up date"
					hideNavigation
					timeSlotColumns={timeSlotColumns}
					disableBookedSlots={false}
					availableSlots={slotGroupsForPicker.length > 0 ? slotGroupsForPicker : undefined}
					loading={slotsLoading || toggleRefreshing}
					onSelectAll={() => {
						stageSlotSelection(allSelectableSlots)
						setPendingSaveToast('Selected All Successfully')
					}}
					onUnselectAll={() => {
						stageSlotSelection([])
						setPendingSaveToast('Unselected All Successfully')
					}}
					selectedAppointmentType={selectedAppointmentType}
					onAppointmentTypeChange={(type) => {
						setToggleRefreshing(true)
						setSelectedAppointmentType(type)
						setTimeout(() => setToggleRefreshing(false), 300)
					}}
				/>

				<View style={[styles.actions, isTablet && styles.actionsTablet]}>
					<TouchableOpacity
						style={[styles.actionButton, styles.cancelButton]}
						onPress={() => {
							updateAvailability({ ...resolvedAvailability, [dayKey]: [] })
							setPendingOverrides([])
							setPendingSaveToast(null)
						}}
					>
						<Text style={styles.cancelButtonText}>Cancel</Text>
					</TouchableOpacity>
					<TouchableOpacity
						style={[styles.actionButton, styles.saveButton, saveLoading && styles.disabledButton]}
						onPress={handleSaveAvailability}
						disabled={saveLoading}
					>
						{saveLoading ? (
							<ActivityIndicator color="#fff" />
						) : (
							<Text style={styles.saveButtonText}>Save Availability</Text>
						)}
					</TouchableOpacity>
				</View>
			</View>
		</ScrollView>
	)
}

const styles = StyleSheet.create({
	screen: {
		flex: 1,
		backgroundColor: '#f8fafc',
	},
	screenContent: {
		flexGrow: 1,
		padding: 0,
	},
	card: {
		width: '100%',
		maxWidth: 980,
		alignSelf: 'center',
		backgroundColor: '#fff',
		padding: 18,
	},
	cardTablet: {
		paddingHorizontal: 24,
		paddingVertical: 22,
	},
	title: {
		fontSize: 22,
		fontWeight: '700',
		color: '#233238',
		marginBottom: 22,
	},
	fieldGroup: {
		marginBottom: 14,
	},
	sectionLabel: {
		fontSize: 14,
		fontWeight: '600',
		color: '#62707a',
		marginBottom: 8,
	},
	selectCard: {
		borderRadius: 10,
	},
	todayRow: {
		alignItems: 'flex-end',
		marginTop: 4,
		marginBottom: -30,
		zIndex: 1,
	},
	todayRowTablet: {
		marginBottom: -34,
	},
	todayButton: {
		borderRadius: 10,
		borderWidth: 1,
		borderColor: TEAL,
		paddingHorizontal: 14,
		paddingVertical: 7,
		backgroundColor: '#fff',
	},
	todayButtonText: {
		color: TEAL,
		fontSize: 13,
		fontWeight: '600',
	},
	emptyText: {
		color: '#9aa5ad',
		fontSize: 12,
		marginBottom: 18,
	},
	actions: {
		flexDirection: 'column',
		gap: 12,
		marginTop: 34,
	},
	actionsTablet: {
		flexDirection: 'row',
		gap: 16,
	},
	actionButton: {
		flex: 1,
		minHeight: 46,
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 16,
	},
	cancelButton: {
		borderWidth: 1,
		borderColor: '#d1dbe0',
		backgroundColor: '#fff',
	},
	cancelButtonText: {
		color: '#52636d',
		fontSize: 14,
		fontWeight: '700',
	},
	saveButton: {
		backgroundColor: TEAL,
	},
	saveButtonText: {
		color: '#fff',
		fontSize: 14,
		fontWeight: '700',
	},
	disabledButton: {
		opacity: 0.7,
	},
})
