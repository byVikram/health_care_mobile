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
import { MaterialCommunityIcons } from '@expo/vector-icons'

import DateSlotPicker from '../../../../components/common/DateSlotPicker'
import {
	createSlotOverrideBatch,
	getDoctorAvailability,
	SlotGroup,
	SlotOverrideBatchPayload,
	SlotOverridePayload,
	TimeSlot,
} from '../../../../features/doctor/doctorService'
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
	const isLandscapeTablet = width >= 900
	const timeSlotColumns = isLandscapeTablet ? 5 : isTablet ? 4 : 3

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
		if (availability) {
			setLocalAvailability(availability)
		}
	}, [availability])

	useEffect(() => {
		const preferredHospitalId = resolvedHospitals.find((h) => h.isPrimary)?.id ?? resolvedHospitals[0]?.id ?? ''
		setSelectedHospitalId((current) => current || preferredHospitalId)
	}, [resolvedHospitals])

	useEffect(() => {
		const loadBlockedSlots = async () => {
			const stored = await AsyncStorage.getItem(STORAGE_KEY)
			if (stored) {
				setUnselectedSlotsByDate(JSON.parse(stored))
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
		} catch (err) {
			console.log(err)
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
		console.log('pendingOverrides:', pendingOverrides)
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

			const batchPayloads = Object.values(overridesByHospitalAndDate)
			for (const payload of batchPayloads) {
				const response = await createSlotOverrideBatch(payload)
				console.log('API response:', response)
				if (response?.message) {
					backendMessage = response.message
				}
			}

			setPendingOverrides([])
			Toast.show({
				type: 'success',
				text1: backendMessage || pendingSaveToast || 'Saved successfully',
			})
			await fetchAvailability()
			setPendingSaveToast(null)
		} catch (err) {
			console.error('Save availability error:', err)
			Toast.show({
				type: 'error',
				text1: 'Unable to save availability',
				text2: 'Please try again.',
			})
		} finally {
			setSaveLoading(false)
		}
	}

	return (
		<ScrollView style={styles.screen} contentContainerStyle={styles.screenContent}>
			<View style={styles.card}>
				<View style={styles.headerRow}>
					<Text style={styles.title}>Availability</Text>
					<TouchableOpacity style={styles.todayButton} onPress={() => setSelectedDate(new Date())}>
						<Text style={styles.todayButtonText}>Today</Text>
					</TouchableOpacity>
				</View>

				<Text style={styles.sectionLabel}>Choose Hospital</Text>
				<View style={styles.hospitalList}>
					{resolvedHospitals.length === 0 ? (
						<Text style={styles.emptyText}>No hospitals added. Please add a hospital first.</Text>
					) : (
						resolvedHospitals.map((hospital, index) => {
							const isSelected = selectedHospitalId === hospital.id
							return (
								<TouchableOpacity
									key={hospital.id}
									style={[styles.hospitalItem, isSelected && styles.hospitalItemSelected]}
									onPress={() => setSelectedHospitalId(hospital.id)}
									activeOpacity={0.8}
								>
									<View style={[styles.hospitalIndex, isSelected && styles.hospitalIndexSelected]}>
										<Text
											style={[
												styles.hospitalIndexText,
												isSelected && styles.hospitalIndexTextSelected,
											]}
										>
											{index + 1}
										</Text>
									</View>
									<View style={styles.hospitalContent}>
										<Text style={styles.hospitalName}>{hospital.name}</Text>
										<Text style={styles.hospitalAddress}>{hospital.fullAddress}</Text>
									</View>
									<MaterialCommunityIcons
										name={isSelected ? 'radiobox-marked' : 'radiobox-blank'}
										size={22}
										color={isSelected ? TEAL : '#b7c0c7'}
									/>
								</TouchableOpacity>
							)
						})
					)}
				</View>

				<DateSlotPicker
					multiSelect
					selectedDate={selectedDate}
					onDateChange={setSelectedDate}
					selectedTime={selectedSlots}
					onTimeChange={handleTimeChange}
					dateLabel="Select date"
					timeLabel="Select time"
					timeSlotColumns={timeSlotColumns}
					disableBookedSlots={false}
					availableSlots={slotGroupsForPicker.length > 0 ? slotGroupsForPicker : undefined}
					loading={slotsLoading}
					onSelectAll={() => {
						stageSlotSelection(allSelectableSlots)
						setPendingSaveToast('Selected All Successfully')
					}}
					onUnselectAll={() => {
						stageSlotSelection([])
						setPendingSaveToast('Unselected All Successfully')
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
		padding: 0,
		// paddingBottom: 32,
	},
	loadingContainer: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#f8fafc',
	},
	card: {
		width: '100%',
		maxWidth: 980,
		alignSelf: 'center',
		backgroundColor: '#fff',
		// borderRadius: 14,
		padding: 18,
		// borderWidth: 1,
		// borderColor: '#edf1f3',
	},
	headerRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		gap: 12,
		marginBottom: 22,
	},
	title: {
		fontSize: 22,
		fontWeight: '700',
		color: '#233238',
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
	sectionLabel: {
		fontSize: 13,
		fontWeight: '600',
		color: '#62707a',
		marginBottom: 10,
	},
	hospitalList: {
		gap: 10,
		marginBottom: 18,
	},
	hospitalItem: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		borderWidth: 1,
		borderColor: '#dde4e8',
		borderRadius: 12,
		paddingHorizontal: 14,
		paddingVertical: 12,
		backgroundColor: '#fff',
	},
	hospitalItemSelected: {
		borderColor: TEAL,
		backgroundColor: 'rgba(12, 124, 124, 0.04)',
	},
	hospitalIndex: {
		width: 28,
		height: 28,
		borderRadius: 14,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: 'rgba(12, 124, 124, 0.1)',
	},
	hospitalIndexSelected: {
		backgroundColor: TEAL,
	},
	hospitalIndexText: {
		fontSize: 12,
		fontWeight: '700',
		color: TEAL,
	},
	hospitalIndexTextSelected: {
		color: '#fff',
	},
	hospitalContent: {
		flex: 1,
		minWidth: 0,
	},
	hospitalName: {
		fontSize: 14,
		fontWeight: '700',
		color: '#233238',
		marginBottom: 3,
	},
	hospitalAddress: {
		fontSize: 12,
		color: '#62707a',
		lineHeight: 17,
	},
	emptyText: {
		color: '#9aa5ad',
		fontSize: 13,
	},
	actions: {
		flexDirection: 'column',
		gap: 12,
		marginTop: 24,
	},
	actionsTablet: {
		flexDirection: 'row',
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
