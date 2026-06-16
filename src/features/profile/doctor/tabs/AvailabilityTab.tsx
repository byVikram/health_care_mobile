import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
	useWindowDimensions,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

import { AppSelect, AppStickyFooter, StatusModal } from '../../../../components/common'
import DateSlotPicker from '../../../../components/common/DateSlotPicker'
import {
	createSlotOverrideBatch,
	getDoctorAvailability,
	getDoctorProfile,
	mapDoctorProfileApi,
	SlotGroup,
	SlotOverrideBatchPayload,
	SlotOverridePayload,
	TimeSlot,
	updateDoctorAvailability,
} from '../../../doctor/doctorService'
import { DoctorAvailability, DoctorHospital } from '../../../../types/doctor-profile'

interface AvailabilityTabProps {
	hospitals?: DoctorHospital[]
	availability?: DoctorAvailability
	onChange?: (availability: DoctorAvailability) => void
}

type UnselectedSlotsByDate = Record<string, string[]>
type AppointmentTypeKey = 'clinic' | 'video'
type AvailabilityAppointmentMode = 'clinic_visit' | 'video_call'

interface AvailabilityApiSlot {
	start_time?: string
	end_time?: string
	status?: TimeSlot['status']
	is_enabled?: boolean
	is_booked?: boolean
	can_toggle?: boolean
}

interface AvailabilityApiSession {
	label?: string
	range?: string
	period?: string
	slots?: AvailabilityApiSlot[]
}

interface AvailabilityApiModeGroup {
	appointment_mode?: string
	sessions?: AvailabilityApiSession[]
	label?: string
	range?: string
	period?: string
	slots?: AvailabilityApiSlot[]
}

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

const APPOINTMENT_MODE_BY_TYPE: Record<AppointmentTypeKey, AvailabilityAppointmentMode> = {
	clinic: 'clinic_visit',
	video: 'video_call',
}

const getModeKey = (mode?: string): AppointmentTypeKey => {
	if (mode === 'video_call' || mode === 'online' || mode === 'video') return 'video'
	return 'clinic'
}

const getAvailabilityHospitalId = (hospital: DoctorHospital) => String(hospital.hospital_id ?? hospital.id)

const getDayOfWeek = (date: Date) => date.getDay()

const coerceHospitalId = (id: string) => {
	const numericId = Number(id)
	return Number.isFinite(numericId) ? numericId : id
}

const normalizeTimeForUpdate = (time: string) => {
	if (!time) return time
	if (time.endsWith('Z')) return time
	if (/^\d{2}:\d{2}$/.test(time)) return `${time}:00.000Z`
	if (/^\d{2}:\d{2}:\d{2}$/.test(time)) return `${time}.000Z`
	return time
}

const getSlotDuration = (startTime: string, endTime: string) => {
	const [startHour, startMinute] = startTime.split(':').map(Number)
	const [endHour, endMinute] = endTime.split(':').map(Number)
	const startTotal = startHour * 60 + startMinute
	const endTotal = endHour * 60 + endMinute
	const duration = endTotal - startTotal

	return Number.isFinite(duration) && duration > 0 ? duration : 1
}

const normalizeProfileHospitals = (rawHospitals: DoctorHospital[]): DoctorHospital[] =>
	rawHospitals.map((hospital) => ({
		id: String(hospital.id),
		hospital_id: String(hospital.hospital_id ?? hospital.id),
		name: hospital.name ?? '',
		fullAddress: hospital.fullAddress ?? hospital.location ?? '',
		location: hospital.location ?? hospital.fullAddress ?? '',
		isPrimary: Boolean(hospital.isPrimary),
		phone_number: hospital.phone_number ?? '',
		video_consultation_fee: hospital.video_consultation_fee ?? '',
		offline_consultation_fee: hospital.offline_consultation_fee ?? '',
	}))

const normalizeSlotStatus = (slot: AvailabilityApiSlot): TimeSlot['status'] => {
	if (slot.is_booked || slot.status === 'OCCUPIED') return 'OCCUPIED'
	if (slot.is_enabled === false || slot.status === 'BLOCKED') return 'BLOCKED'
	return slot.status || 'AVAILABLE'
}

const normalizeAvailabilityGroups = (response: unknown, selectedAppointmentType: AppointmentTypeKey): SlotGroup[] => {
	const rawData = Array.isArray(response)
		? response
		: Array.isArray((response as { data?: unknown })?.data)
			? ((response as { data: AvailabilityApiModeGroup[] }).data)
			: []
	const selectedMode = APPOINTMENT_MODE_BY_TYPE[selectedAppointmentType]

	const matchingModeData = rawData.filter((item: AvailabilityApiModeGroup) => {
		if (!item?.appointment_mode) return selectedAppointmentType === 'clinic'
		return item.appointment_mode === selectedMode || getModeKey(item.appointment_mode) === selectedAppointmentType
	})

	return matchingModeData.flatMap((item: AvailabilityApiModeGroup) => {
		const sessions =
			Array.isArray(item.sessions) && item.sessions.length > 0
				? item.sessions
				: [{ label: item.label, range: item.range, period: item.period, slots: item.slots }]

		return sessions
			.map((session, sessionIndex): SlotGroup => {
				const period = session.period || session.range || ''
				const label = session.label || `Session ${sessionIndex + 1}`

				return {
					label: period ? `${label} (${period})` : label,
					period,
					range: period,
					slots: (session.slots ?? [])
						.filter((slot) => Boolean(slot.start_time && slot.end_time))
						.map((slot, slotIndex) => ({
							id: `${selectedAppointmentType}-${label}-${slot.start_time}-${slotIndex}`,
							start_time: slot.start_time as string,
							end_time: slot.end_time as string,
							status: normalizeSlotStatus(slot),
							is_enabled: slot.is_enabled,
							is_booked: slot.is_booked,
							can_toggle: slot.can_toggle,
						})),
				}
			})
			.filter((session) => session.slots.length > 0)
	})
}

export default function AvailabilityTab({ hospitals, availability, onChange }: AvailabilityTabProps) {
	const { width } = useWindowDimensions()
	const isTablet = width >= 768
	const contentWidth = useMemo(() => {
		if (width >= 1280) return 760
		if (width >= 1024) return 680
		if (isTablet) return 600
		return 640
	}, [isTablet, width])
	const timeSlotColumns = width >= 900 ? 5 : width >= 768 ? 4 : 3

	const [localAvailability, setLocalAvailability] = useState<DoctorAvailability>(availability ?? EMPTY_AVAILABILITY)
	const [apiHospitals, setApiHospitals] = useState<DoctorHospital[]>([])
	const [hospitalsLoading, setHospitalsLoading] = useState(false)
	const resolvedHospitals = useMemo(
		() => (hospitals?.length ? normalizeProfileHospitals(hospitals) : apiHospitals),
		[hospitals, apiHospitals]
	)
	const resolvedAvailability = availability ?? localAvailability

	const [selectedHospitalId, setSelectedHospitalId] = useState('')
	const [selectedDate, setSelectedDate] = useState<Date>(new Date())
	const [availableSlotGroups, setAvailableSlotGroups] = useState<SlotGroup[]>([])
	const [slotsLoading, setSlotsLoading] = useState(false)
	const [unselectedSlotsByDate, setUnselectedSlotsByDate] = useState<UnselectedSlotsByDate>({})
	const [pendingOverrides, setPendingOverrides] = useState<SlotOverridePayload[]>([])
	const [saveLoading, setSaveLoading] = useState(false)
	const [statusModal, setStatusModal] = useState<{
		visible: boolean
		status: 'success' | 'error'
		title: string
		description: string
		submitText?: string
	} | null>(null)
	const [selectedAppointmentType, setSelectedAppointmentType] = useState<AppointmentTypeKey>('clinic')
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
		const preferredHospital = resolvedHospitals.find((hospital) => hospital.isPrimary) ?? resolvedHospitals[0]
		const preferredHospitalId = preferredHospital ? getAvailabilityHospitalId(preferredHospital) : ''
		setSelectedHospitalId((current) => {
			if (current && resolvedHospitals.some((hospital) => getAvailabilityHospitalId(hospital) === current)) {
				return current
			}
			return preferredHospitalId
		})
	}, [resolvedHospitals])

	useEffect(() => {
		if (hospitals?.length) return

		let active = true

		const fetchHospitals = async () => {
			try {
				setHospitalsLoading(true)
				const response = await getDoctorProfile()
				if (!active) return

				if (response?.success && response.data) {
					const profile = mapDoctorProfileApi(response.data)
					setApiHospitals(normalizeProfileHospitals(profile.hospitals))
				} else {
					setApiHospitals([])
				}
			} catch (error) {
				console.log('[AvailabilityTab] failed to fetch profile hospitals:', error)
				if (active) setApiHospitals([])
			} finally {
				if (active) setHospitalsLoading(false)
			}
		}

		fetchHospitals()

		return () => {
			active = false
		}
	}, [hospitals])

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

			setAvailableSlotGroups(normalizeAvailabilityGroups(res, selectedAppointmentType))
			setPendingOverrides([])
		} catch (error) {
			console.log('[AvailabilityTab] failed to fetch availability:', error)
			setAvailableSlotGroups([])
		} finally {
			setSlotsLoading(false)
		}
	}, [selectedHospitalId, selectedDate, selectedAppointmentType])

	useEffect(() => {
		fetchAvailability()
	}, [fetchAvailability])

	const dayKey = getDayKey(selectedDate)
	const selectedDateKey = formatDateForApi(selectedDate)
	const selectedStorageKey = `${selectedHospitalId || 'no-hospital'}:${selectedDateKey}:${selectedAppointmentType}`

	const allSelectableSlots = useMemo(
		() =>
			Array.from(
				new Set(
					availableSlotGroups.flatMap((group) =>
						(group.slots ?? [])
							.filter(
								(slot: TimeSlot) =>
									Boolean(slot.start_time) &&
									slot.can_toggle !== false &&
									!slot.is_booked &&
									slot.status !== 'OCCUPIED' &&
									slot.status !== 'BOOKED' &&
									slot.status !== 'UNAVAILABLE'
							)
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
									Boolean(slot.start_time) &&
									slot.can_toggle !== false &&
									(slot.status === 'BLOCKED' || slot.is_enabled === false)
							)
							.map((slot: TimeSlot) => slot.start_time)
					)
				)
			),
		[availableSlotGroups]
	)

	const todayUnselected: string[] = unselectedSlotsByDate[selectedStorageKey] ?? apiBlockedSlots
	const selectedSlots: string[] = allSelectableSlots.filter((slot) => !todayUnselected.includes(slot))

	const slotGroupsForPicker: SlotGroup[] = availableSlotGroups.map((group) => ({
		...group,
		slots: group.slots.map((slot) => {
			if (slot.can_toggle === false) return slot
			if (todayUnselected.includes(slot.start_time)) {
				return { ...slot, status: 'BLOCKED', is_enabled: false, is_booked: false }
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
		const updated: UnselectedSlotsByDate = { ...unselectedSlotsByDate, [selectedStorageKey]: updatedUnselected }

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
		stageSlotSelection(Array.isArray(slots) ? slots : [slots])
	}

	const handleSaveAvailability = async () => {
		if (!selectedHospitalId) {
			return
		}

		setSaveLoading(true)
		try {
			let backendMessage = ''
			const selectedUpdatePayload = {
				hospital_id: coerceHospitalId(selectedHospitalId),
				day_of_week: getDayOfWeek(selectedDate),
				appointment_mode: APPOINTMENT_MODE_BY_TYPE[selectedAppointmentType],
				slots: selectedSlots.map((startTime) => {
					const endTime = getSlotEndTime(startTime)

					return {
						start_time: normalizeTimeForUpdate(startTime),
						end_time: normalizeTimeForUpdate(endTime),
						slot_duration: getSlotDuration(startTime, endTime),
						buffer_time: 0,
					}
				}),
				is_active: selectedSlots.length > 0,
			}

			const availabilityResponse = await updateDoctorAvailability(selectedUpdatePayload)
			if ((availabilityResponse as { message?: string })?.message) {
				backendMessage = (availabilityResponse as { message: string }).message
			}

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
			setStatusModal({
				visible: true,
				status: 'success',
				title: 'Success',
				description: backendMessage || 'Saved successfully',
				submitText: 'Okay',
			})
			await fetchAvailability()
		} catch (error) {
			console.error('[AvailabilityTab] save availability error:', error)
			setStatusModal({
				visible: true,
				status: 'error',
				title: 'Error',
				description: 'Unable to save availability. Please try again.',
				submitText: 'Okay',
			})
		} finally {
			setSaveLoading(false)
		}
	}

	return (
		<View style={{ flex: 1 }}>
			<ScrollView
				style={styles.screen}
				contentContainerStyle={styles.screenContent}
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
			>
				<View style={[styles.card, isTablet && styles.cardTablet, { maxWidth: contentWidth },]}>
					<View style={styles.fieldGroup}>
						<Text style={styles.sectionLabel}>Choose Hospital</Text>
						{resolvedHospitals.length === 0 ? (
							<Text style={styles.emptyText}>
								{hospitalsLoading ? 'Loading hospitals...' : 'No hospitals added. Please add a hospital first.'}
							</Text>
						) : (
							<AppSelect
								value={selectedHospitalId}
								onSelect={(value) => {
									setSelectedHospitalId(value)
									setPendingOverrides([])
								}}
								options={resolvedHospitals.map((hospital) => ({
									value: getAvailabilityHospitalId(hospital),
									label: hospital.name,
								}))}
								size="small"
								borderRadius={10}
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
						use12HourTime
						showAvailabilityMode
						availableSlots={slotGroupsForPicker.length > 0 ? slotGroupsForPicker : undefined}
						loading={slotsLoading || toggleRefreshing}
						onSelectAll={() => {
							stageSlotSelection(allSelectableSlots)
						}}
						onUnselectAll={() => {
							stageSlotSelection([])
						}}
						selectedAppointmentType={selectedAppointmentType}
						onAppointmentTypeChange={(type) => {
							setToggleRefreshing(true)
							setSelectedAppointmentType(type)
							setTimeout(() => setToggleRefreshing(false), 300)
						}}
					/>

				</View>
			</ScrollView>
			<AppStickyFooter
				centered
				contentStyle={styles.footerContent}
				contentMaxWidth={contentWidth}
				buttonStyle={styles.footerSaveButton}
				onPress={handleSaveAvailability}
				loading={saveLoading}
				disabled={saveLoading}
			>
				Save Availability
			</AppStickyFooter>
			{statusModal && (
				<StatusModal
					visible={statusModal.visible}
					status={statusModal.status}
					title={statusModal.title}
					description={statusModal.description}
					submitText={statusModal.submitText}
					onSubmit={() => setStatusModal(null)}
					onCancel={() => setStatusModal(null)}
				/>
			)}
		</View>	
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
		paddingBottom: 100,
	},
	card: {
		width: '100%',
		alignSelf: 'center',
		backgroundColor: '#fff',
		padding: 18,
	},
	cardTablet: {
		paddingHorizontal: 24,
		paddingVertical: 22,
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
		borderColor: '#215d60',
		paddingHorizontal: 14,
		paddingVertical: 7,
		backgroundColor: '#fff',
	},
	todayButtonText: {
		color: '#215d60',
		fontSize: 13,
		fontWeight: '600',
	},
	emptyText: {
		color: '#9aa5ad',
		fontSize: 12,
		marginBottom: 18,
	},
	footerContent: {
		width: '100%',
	},
	footerSaveButton: {
		backgroundColor: '#215d60',
	},
})
