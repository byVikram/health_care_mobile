import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
	ScrollView,
	StyleSheet,
	TouchableOpacity,
	View,
	useWindowDimensions,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Ionicons } from '@expo/vector-icons'
import Toast from 'react-native-toast-message'

import { AppSelect, AppStickyFooter, StatusModal } from '../../../../components/common'
import { AppTypography } from '../../../../components/common/display/AppTypography'
import DateSlotPicker from '../../../../components/common/inputs/DateSlotPicker'
import {
	getDoctorAvailability,
	getDoctorProfile,
	mapDoctorProfileApi,
	SlotGroup,
	SlotOverridePayload,
	TimeSlot,
	updateDoctorAvailability,
} from '../../../doctor/doctorService'
import { DoctorAvailability, DoctorHospital } from '../../../../types/doctor-profile'
import { formatDateForApi } from '../../../../utils/date'

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
const TEAL = '#0C7C7C'

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
	const clean = time.replace(/Z$/, '').split('T').pop() || time
	if (/^\d{2}:\d{2}$/.test(clean)) return `${clean}:00`
	if (/^\d{2}:\d{2}:\d{2}/.test(clean)) return clean.substring(0, 8)
	return clean
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
	if (slot.is_enabled === false || slot.status === 'BLOCKED') return 'BLOCKED'
	if (slot.is_booked || slot.status === 'OCCUPIED' || slot.status === 'BOOKED') return 'OCCUPIED'
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
						.map((slot, slotIndex) => {
							const normalizedStatus = normalizeSlotStatus(slot)
							return {
								id: `${selectedAppointmentType}-${label}-${slot.start_time}-${slotIndex}`,
								start_time: slot.start_time as string,
								end_time: slot.end_time as string,
								status: normalizedStatus,
								is_enabled: normalizedStatus === 'BLOCKED' ? false : slot.is_enabled,
								is_booked: normalizedStatus === 'BLOCKED' ? false : slot.is_booked,
								can_toggle: slot.can_toggle,
							}
						}),
				}
			})
			.filter((session) => session.slots.length > 0)
	})
}

export default function AvailabilityTab({ hospitals, availability, onChange }: AvailabilityTabProps) {
	const { width } = useWindowDimensions()
	const isTablet = width >= 768

	const timeSlotColumns = width >= 1024 ? 5 : width >= 768 ? 4 : 3

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
	const [saveConfirmModal, setSaveConfirmModal] = useState<{
		visible: boolean
		count: number
	} | null>(null)
	const [selectedAppointmentType, setSelectedAppointmentType] = useState<AppointmentTypeKey>('clinic')
	const [toggleRefreshing, setToggleRefreshing] = useState(false)

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

	const bookedSlotTimes = useMemo(
		() =>
			Array.from(
				new Set(
					availableSlotGroups.flatMap((group) =>
						(group.slots ?? [])
							.filter(
								(slot: TimeSlot) =>
									Boolean(slot.start_time) &&
									slot.status !== 'BLOCKED' &&
									slot.is_enabled !== false &&
									(slot.is_booked || slot.status === 'OCCUPIED' || slot.status === 'BOOKED')
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
			if (todayUnselected.includes(slot.start_time)) {
				return { ...slot, status: 'BLOCKED', is_enabled: false, is_booked: false }
			}
			
			// Check if the slot was explicitly unblocked in this session
			const pending = pendingOverrides.find(
				(o) =>
					o.start_time === slot.start_time &&
					o.date === selectedDateKey &&
					(o.hospital_id === selectedHospitalId || !o.hospital_id)
			)
			if (pending && pending.is_blocked === false) {
				return { ...slot, status: 'AVAILABLE', is_enabled: true, is_booked: false }
			}

			if (slot.can_toggle === false) return slot
			if (slot.is_booked || slot.status === 'OCCUPIED' || slot.status === 'BOOKED') {
				return slot
			}
			return { ...slot, status: 'AVAILABLE', is_enabled: true, is_booked: false }
		}),
	}))

	const getSlotEndTime = (startTime: string): string => {
		for (const group of availableSlotGroups) {
			const match = group.slots.find((slot) => slot.start_time === startTime)
			if (match && match.end_time) return match.end_time
		}
		try {
			const [hours, minutes] = startTime.split(':').map(Number)
			const date = new Date(1970, 0, 1, hours, minutes)
			date.setMinutes(date.getMinutes() + 30) // Default 30 min duration
			const endHours = String(date.getHours()).padStart(2, '0')
			const endMinutes = String(date.getMinutes()).padStart(2, '0')
			return `${endHours}:${endMinutes}:00`
		} catch (e) {
			return startTime
		}
	}

	const commitSlotSelection = async (newlyBlocked: string[], newlyUnblocked: string[], slots: string[]) => {
		const updatedUnselected = [...todayUnselected.filter((slot) => !newlyUnblocked.includes(slot)), ...newlyBlocked]
		const updated: UnselectedSlotsByDate = { ...unselectedSlotsByDate, [selectedStorageKey]: updatedUnselected }

		setUnselectedSlotsByDate(updated)
		await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated))

		setPendingOverrides((current) => {
			const filtered = current.filter(
				(o) =>
					!(
						(newlyBlocked.includes(o.start_time) || newlyUnblocked.includes(o.start_time)) &&
						o.date === selectedDateKey &&
						o.hospital_id === selectedHospitalId
					)
			)

			const nextBlocked: SlotOverridePayload[] = newlyBlocked.map((start_time) => ({
				hospital_id: selectedHospitalId,
				date: selectedDateKey,
				start_time: normalizeTimeForUpdate(start_time),
				end_time: normalizeTimeForUpdate(getSlotEndTime(start_time)),
				is_blocked: true,
				mode: APPOINTMENT_MODE_BY_TYPE[selectedAppointmentType],
			}))

			const nextUnblocked: SlotOverridePayload[] = newlyUnblocked.map((start_time) => ({
				hospital_id: selectedHospitalId,
				date: selectedDateKey,
				start_time: normalizeTimeForUpdate(start_time),
				end_time: normalizeTimeForUpdate(getSlotEndTime(start_time)),
				is_blocked: false,
				mode: APPOINTMENT_MODE_BY_TYPE[selectedAppointmentType],
			}))

			return [...filtered, ...nextBlocked, ...nextUnblocked]
		})
	}

	const handleTimeChange = async (nextSelected: string[]) => {
		const newlyUnblocked = nextSelected.filter((slot) => todayUnselected.includes(slot))
		const newlyBlocked = allSelectableSlots.filter(
			(slot) => !nextSelected.includes(slot) && !todayUnselected.includes(slot)
		)

		await commitSlotSelection(newlyBlocked, newlyUnblocked, nextSelected)
	}

	const handleClearSelection = async () => {
		await commitSlotSelection(allSelectableSlots, [], [])
	}

	const executeSaveAvailability = async () => {
		if (!selectedHospitalId) return

		try {
			setSaveLoading(true)

			const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const
			const activeDayOfWeek = getDayOfWeek(selectedDate)
			const activeDayName = days[activeDayOfWeek]

			const validAvailableSlots = availableSlotGroups
				.flatMap((group) => group.slots ?? [])
				.filter(
					(s) =>
						s.status !== 'BLOCKED' &&
						s.status !== 'UNAVAILABLE' &&
						s.is_enabled !== false &&
						!todayUnselected.includes(s.start_time)
				)

			const mergedSlots = validAvailableSlots.map((s) => {
				const start_time = normalizeTimeForUpdate(s.start_time)
				const end_time = normalizeTimeForUpdate(s.end_time || getSlotEndTime(s.start_time))
				return {
					hospital_id: coerceHospitalId(selectedHospitalId),
					day_of_week: activeDayOfWeek,
					start_time,
					end_time,
					duration_minutes: getSlotDuration(start_time, end_time),
				}
			})

			const updatedAvailability: DoctorAvailability = {
				...resolvedAvailability,
				[activeDayName]: mergedSlots,
			}

			const payload = {
				availability: Object.entries(updatedAvailability).flatMap(([day, slots]) =>
					(slots ?? []).map((slot: any) => {
						const normalizedStart = normalizeTimeForUpdate(slot.start_time)
						const normalizedEnd = normalizeTimeForUpdate(slot.end_time)
						return {
							hospital_id: coerceHospitalId(slot.hospital_id ? String(slot.hospital_id) : selectedHospitalId),
							day_of_week: slot.day_of_week ?? days.indexOf(day as any),
							start_time: normalizedStart,
							end_time: normalizedEnd,
							duration_minutes:
								slot.duration_minutes ?? getSlotDuration(normalizedStart, normalizedEnd),
						}
					})
				),
			}

			await updateDoctorAvailability(payload as any)
			updateAvailability(updatedAvailability)

			Toast.show({ type: 'success', text1: 'Your availability schedule has been updated successfully.' })

			await fetchAvailability()
		} catch (error: any) {
			console.error('[AvailabilityTab] save availability error:', error)
			Toast.show({ type: 'error', text1: 'Unable to save availability. Please try again.' })
		} finally {
			setSaveLoading(false)
		}
	}

	const handleSaveAvailability = () => {
		if (!selectedHospitalId) return

		const newlyBlockedBookedCount = pendingOverrides.filter(
			(o) => o.is_blocked && bookedSlotTimes.includes(o.start_time)
		).length

		if (newlyBlockedBookedCount > 0) {
			setSaveConfirmModal({
				visible: true,
				count: newlyBlockedBookedCount,
			})
			return
		}

		executeSaveAvailability()
	}

	return (
		<View style={styles.container}>
			<ScrollView
				style={styles.screen}
				contentContainerStyle={styles.screenContent}
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
				nestedScrollEnabled
				directionalLockEnabled
			>
				<View style={[styles.mainCard, isTablet && styles.mainCardTablet]}>
					{/* Header Row: Title + Hospital Selector + Today Button */}
					<View style={[styles.headerCard, isTablet && styles.headerCardTablet]}>
						<View style={styles.headerTitleCol}>
							<View style={styles.titleWithIconRow}>
								<View style={styles.iconBox}>
									<Ionicons name="calendar" size={18} color="#0C7C7C" />
								</View>
								<View style={{ flex: 1 }}>
									<AppTypography variant="h3" style={styles.mainTitle}>
										Schedule & Availability
									</AppTypography>
									<AppTypography variant="caption" style={styles.subTitle}>
										Manage consultation sessions, hospital locations, and time slots
									</AppTypography>
								</View>
							</View>
						</View>

						{/* Hospital Selector Block */}
						<View style={styles.hospitalSelectBlock}>
							<AppTypography variant="caption" style={styles.fieldLabel}>
								PRACTICE / HOSPITAL LOCATION
							</AppTypography>
							{resolvedHospitals.length === 0 ? (
								<AppTypography variant="caption" style={styles.emptyText}>
									{hospitalsLoading ? 'Loading locations...' : 'No locations configured.'}
								</AppTypography>
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
					</View>

					{/* Date & Time Slot Picker Container */}
					<View style={styles.pickerWrapper}>
						<View style={styles.todayQuickActionRow}>
							<TouchableOpacity
								style={styles.todayJumpButton}
								onPress={() => setSelectedDate(new Date())}
								activeOpacity={0.75}
							>
								<Ionicons name="today-outline" size={14} color="#0C7C7C" />
								<AppTypography variant="caption" style={styles.todayJumpText}>
									Jump to Today
								</AppTypography>
							</TouchableOpacity>
						</View>

						<DateSlotPicker
							multiSelect
							selectedDate={selectedDate}
							onDateChange={setSelectedDate}
							selectedTime={selectedSlots}
							onTimeChange={handleTimeChange}
							dateLabel="Select Schedule Date"
							timeLabel="Available Time Sessions"
							hideNavigation={false}
							timeSlotColumns={timeSlotColumns}
							disableBookedSlots={false}
							use12HourTime
							showAvailabilityMode
							availableSlots={slotGroupsForPicker.length > 0 ? slotGroupsForPicker : undefined}
							loading={slotsLoading || toggleRefreshing}
							onSelectAll={() => {
								const allToggleableSlots = availableSlotGroups.flatMap((group) =>
									(group.slots ?? []).filter((s) => Boolean(s.start_time)).map((s) => s.start_time)
								)
								commitSlotSelection([], todayUnselected, allToggleableSlots)
							}}
							onUnselectAll={() => {
								const allToggleableSlots = Array.from(
									new Set(
										availableSlotGroups.flatMap((group) =>
											(group.slots ?? [])
												.filter((s) => {
													if (!s.start_time) return false
													if (s.status === 'UNAVAILABLE' || s.is_enabled === false) return false
													return true
												})
												.map((s) => s.start_time)
										)
									)
								)
								const newlyBlocked = allToggleableSlots.filter((slot) => !todayUnselected.includes(slot))
								commitSlotSelection(newlyBlocked, [], [])
							}}
							onClearSelection={handleClearSelection}
							selectedAppointmentType={selectedAppointmentType}
							onAppointmentTypeChange={(type) => {
								setToggleRefreshing(true)
								setSelectedAppointmentType(type)
								setTimeout(() => setToggleRefreshing(false), 300)
							}}
						/>
					</View>
				</View>
			</ScrollView>

			{/* Sticky Save Action Footer */}
			<AppStickyFooter
				centered
				contentStyle={styles.footerContent}
				buttonStyle={styles.footerSaveButton}
				onPress={handleSaveAvailability}
				loading={saveLoading}
				disabled={saveLoading}
			>
				Save Availability Schedule
			</AppStickyFooter>

			{saveConfirmModal && (
				<StatusModal
					visible={saveConfirmModal.visible}
					status="error"
					title="Confirm Blocking Booked Slots"
					description={`${saveConfirmModal.count} patient(s) have booked appointments in the selected slot(s). If you proceed, these appointments will be blocked and the affected patients will need to reschedule at their convenience. Are you sure you want to continue?`}
					submitText="Confirm"
					cancelText="Cancel"
					onSubmit={() => {
						setSaveConfirmModal(null)
						executeSaveAvailability()
					}}
					onCancel={() => setSaveConfirmModal(null)}
				/>
			)}
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#F8FAFC',
	},
	screen: {
		flex: 1,
		backgroundColor: '#F8FAFC',
	},
	screenContent: {
		flexGrow: 1,
		paddingHorizontal: 12,
		paddingTop: 10,
		paddingBottom: 110,
	},

	/* Main Container Card */
	mainCard: {
		width: '100%',
		maxWidth: 860,
		alignSelf: 'center',
		backgroundColor: '#FFFFFF',
		borderRadius: 16,
		padding: 14,
		borderColor: '#E2E8F0',
		borderWidth: 1,
		shadowColor: '#0F172A',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.03,
		shadowRadius: 3,
		elevation: 1,
		gap: 12,
	},
	mainCardTablet: {
		padding: 20,
		gap: 16,
	},

	/* Header Card */
	headerCard: {
		backgroundColor: '#F8FAFC',
		borderColor: '#E2E8F0',
		borderWidth: 1,
		borderRadius: 12,
		padding: 12,
		gap: 10,
	},
	headerCardTablet: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		padding: 16,
		gap: 16,
	},
	headerTitleCol: {
		flex: 1,
	},
	titleWithIconRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
	},
	iconBox: {
		width: 36,
		height: 36,
		borderRadius: 10,
		backgroundColor: '#E6F4F4',
		alignItems: 'center',
		justifyContent: 'center',
	},
	mainTitle: {
		fontSize: 16,
		fontWeight: '700',
		color: '#0F172A',
	},
	subTitle: {
		fontSize: 11.5,
		color: '#64748B',
		marginTop: 1,
	},

	/* Hospital Select Block */
	hospitalSelectBlock: {
		width: '100%',
		gap: 4,
	},
	fieldLabel: {
		fontSize: 10,
		fontWeight: '800',
		color: '#64748B',
		letterSpacing: 0.5,
		textTransform: 'uppercase',
	},
	emptyText: {
		color: '#94A3B8',
		fontSize: 12,
		marginVertical: 4,
	},

	/* Date & Slot Picker Wrapper */
	pickerWrapper: {
		width: '100%',
	},
	todayQuickActionRow: {
		flexDirection: 'row',
		justifyContent: 'flex-end',
		marginBottom: 6,
	},
	todayJumpButton: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		backgroundColor: '#E6F4F4',
		borderColor: '#BCE3E3',
		borderWidth: 1,
		borderRadius: 8,
		paddingHorizontal: 10,
		paddingVertical: 5,
	},
	todayJumpText: {
		fontSize: 11.5,
		fontWeight: '700',
		color: '#0C7C7C',
	},

	/* Sticky Footer Button */
	footerContent: {
		width: '100%',
		maxWidth: 860,
		alignSelf: 'center',
	},
	footerSaveButton: {
		backgroundColor: '#0C7C7C',
		borderRadius: 12,
		height: 46,
	},
})
