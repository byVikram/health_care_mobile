import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
	Alert,
	Modal,
	Pressable,
	ScrollView,
	StyleSheet,
	TouchableOpacity,
	View,
	useWindowDimensions,
} from 'react-native'
import Toast from 'react-native-toast-message'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { AppInput, AppSelect, AppStickyFooter, AppToggle, AppTypography } from '../../../../components/common'
import {
	createHospital,
	deleteHospital,
	getDoctorProfile,
	mapDoctorProfileApi,
	updateHospital,
} from '../../../doctor/doctorService'
import { getCoordsFromAddress } from '../../../../services/locationService'
import { DoctorHospital } from '../../../../types/doctor-profile'

type HospitalFormData = {
	name: string
	fullAddress: string
	phone_number: string
	video_consultation_fee: string
	offline_consultation_fee: string
}

type HospitalItem = HospitalFormData & {
	id: string
	hospital_id?: string
	location: string
	isPrimary: boolean
}

type AppointmentType = 'clinic' | 'video'
type WorkingDayKey = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
type TimeSlot = { start: string; end: string }
type SectionSlots = {
	morning: TimeSlot[]
	afternoon: TimeSlot[]
	evening: TimeSlot[]
}
type WorkingHoursState = {
	sections: SectionSlots
	slotDuration: number
}

const EMPTY_FORM: HospitalFormData = {
	name: '',
	fullAddress: '',
	phone_number: '',
	video_consultation_fee: '',
	offline_consultation_fee: '',
}

const TEAL = '#0c7c7c'

const WORKING_DAYS: { key: WorkingDayKey; label: string }[] = [
	{ key: 'sunday', label: 'Sun' },
	{ key: 'monday', label: 'Mon' },
	{ key: 'tuesday', label: 'Tue' },
	{ key: 'wednesday', label: 'Wed' },
	{ key: 'thursday', label: 'Thu' },
	{ key: 'friday', label: 'Fri' },
	{ key: 'saturday', label: 'Sat' },
]

const getSuccessMessage = (response: unknown, fallback = 'Hospital saved successfully') => {
	if (
		typeof response === 'object' &&
		response !== null &&
		'message' in response &&
		typeof response.message === 'string'
	) {
		return response.message
	}

	return fallback
}

const makeTimeOptions = (startHour: number, endHour: number, stepMins = 30) => {
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

const snapToStep = (time: string, stepMins: number) => {
	const [hour, minute] = time.split(':').map(Number)
	const totalMins = hour * 60 + minute
	const snapped = Math.round(totalMins / stepMins) * stepMins
	const snappedHour = Math.floor(snapped / 60)
	const snappedMinute = snapped % 60

	return `${String(snappedHour).padStart(2, '0')}:${String(snappedMinute).padStart(2, '0')}`
}

const durationOptions = [10, 15, 20, 25, 30]
const followUpOptions = [
	{ value: 0, label: 'No Follow-up' },
	{ value: 3, label: '3 Days' },
	{ value: 5, label: '5 Days' },
	{ value: 7, label: '7 Days' },
	{ value: 10, label: '10 Days' },
	{ value: 15, label: '15 Days' },
]
const rescheduleCutoffOptions = [
	{ value: 1, label: '1 Hour Before' },
	{ value: 2, label: '2 Hours Before' },
	{ value: 3, label: '3 Hours Before' },
	{ value: 4, label: '4 Hours Before' },
	{ value: 6, label: '6 Hours Before' },
	{ value: 12, label: '12 Hours Before' },
	{ value: 24, label: '1 Day Before' },
]
const SECTION_META = [
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
const createWorkingHoursState = (): WorkingHoursState => ({
	sections: {
		morning: [{ start: '08:00', end: '10:00' }],
		afternoon: [{ start: '12:00', end: '14:00' }],
		evening: [{ start: '17:00', end: '19:00' }],
	},
	slotDuration: 15,
})

const createWorkingHoursByType = (): Record<AppointmentType, WorkingHoursState> => ({
	clinic: createWorkingHoursState(),
	video: createWorkingHoursState(),
})

const createWeeklyWorkingHours = (): Record<WorkingDayKey, Record<AppointmentType, WorkingHoursState>> => ({
	monday: createWorkingHoursByType(),
	tuesday: createWorkingHoursByType(),
	wednesday: createWorkingHoursByType(),
	thursday: createWorkingHoursByType(),
	friday: createWorkingHoursByType(),
	saturday: createWorkingHoursByType(),
	sunday: createWorkingHoursByType(),
})

const coerceHospitalId = (id: string | undefined) => {
	const numericId = Number(id)
	return Number.isFinite(numericId) ? numericId : (id ?? '')
}

const buildHospitalUpdatePayload = (
	hospital: HospitalItem,
	isPrimary = hospital.isPrimary,
	weeklyWorkingHours = createWeeklyWorkingHours()
) => ({
	hospital_id: coerceHospitalId(hospital.hospital_id ?? hospital.id),
	is_primary: isPrimary,
	video_consultation_fee: hospital.video_consultation_fee.trim(),
	offline_consultation_fee: hospital.offline_consultation_fee.trim(),
	available_days: WORKING_DAYS.map((day) => day.key),
	working_hours: JSON.stringify(weeklyWorkingHours),
})

function FieldLabel({ label }: { label: string }) {
	return (
		<AppTypography variant="caption" style={styles.fieldLabel}>
			{label}
		</AppTypography>
	)
}

function InputField({
	label,
	value,
	onChangeText,
	placeholder,
	multiline = false,
	keyboardType = 'default',
}: {
	label: string
	value: string
	onChangeText: (value: string) => void
	placeholder: string
	multiline?: boolean
	keyboardType?: React.ComponentProps<typeof AppInput>['keyboardType']
}) {
	return (
		<View style={styles.fieldGroup}>
			<FieldLabel label={label} />
			<AppInput
				value={value}
				onChangeText={onChangeText}
				placeholder={placeholder}
				placeholderTextColor="#9a9a9a"
				style={multiline && styles.multilineInput}
				contentStyle={multiline && styles.multilineInputContent}
				multiline={multiline}
				keyboardType={keyboardType}
				textAlignVertical={multiline ? 'top' : 'center'}
				fieldSize="form"
				noMargin
				dense
			/>
		</View>
	)
}

function DropdownSelect({
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

function WorkingHoursSection({
	selectedWorkingDay,
	onWorkingDayChange,
	selectedAppointmentType,
	onAppointmentTypeChange,
	selectedWorkingHours,
	onAddSlot,
	onRemoveSlot,
	onUpdateSlotTime,
	onSlotDurationChange,
	stacked,
}: {
	selectedWorkingDay: WorkingDayKey
	onWorkingDayChange: (day: WorkingDayKey) => void
	selectedAppointmentType: AppointmentType
	onAppointmentTypeChange: (type: AppointmentType) => void
	selectedWorkingHours: WorkingHoursState
	onAddSlot: (sectionKey: keyof SectionSlots) => void
	onRemoveSlot: (sectionKey: keyof SectionSlots, slotIndex: number) => void
	onUpdateSlotTime: (sectionKey: keyof SectionSlots, slotIndex: number, field: 'start' | 'end', value: string) => void
	onSlotDurationChange: (value: number) => void
	stacked: boolean
}) {
	return (
		<View style={styles.workingHours}>
			<AppTypography variant="body" style={styles.workingTitle}>
				Working Hours
			</AppTypography>

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

			<View key={selectedAppointmentType}>
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
			</View>
		</View>
	)
}

const getHospitalAddressText = (hospital: HospitalItem) => {
	const fullAddress = hospital.fullAddress.trim()
	const location = hospital.location.trim()

	if (fullAddress && location && fullAddress !== location) {
		return `${fullAddress} ${location}`.trim()
	}

	return fullAddress || location
}

const normalizeHospitals = (rawHospitals: ReturnType<typeof mapDoctorProfileApi>['hospitals']): HospitalItem[] =>
	rawHospitals.map((hospital, index) => ({
		id: hospital.id || `${Date.now()}-${index}`,
		hospital_id: hospital.hospital_id,
		name: hospital.name ?? '',
		fullAddress: hospital.fullAddress ?? hospital.location ?? '',
		location: hospital.location ?? hospital.fullAddress ?? '',
		isPrimary: Boolean(hospital.isPrimary),
		phone_number: hospital.phone_number ?? '',
		video_consultation_fee: hospital.video_consultation_fee ?? '',
		offline_consultation_fee: hospital.offline_consultation_fee ?? '',
	}))

const toDoctorHospital = (hospital: HospitalItem): DoctorHospital => ({
	id: String(hospital.id),
	hospital_id: hospital.hospital_id ? String(hospital.hospital_id) : undefined,
	name: hospital.name ?? '',
	fullAddress: hospital.fullAddress ?? hospital.location ?? '',
	location: hospital.location ?? hospital.fullAddress ?? '',
	isPrimary: Boolean(hospital.isPrimary),
	phone_number: hospital.phone_number ?? '',
	video_consultation_fee: hospital.video_consultation_fee ?? '',
	offline_consultation_fee: hospital.offline_consultation_fee ?? '',
})

interface MyHospitalsTabProps {
	hospitals?: DoctorHospital[]
	onHospitalsChange?: (hospitals: DoctorHospital[]) => void
}

export default function MyHospitalsTab({ hospitals: externalHospitals, onHospitalsChange }: MyHospitalsTabProps) {
	const { width, height } = useWindowDimensions()
	const isTablet = width >= 768
	const isLandscape = width > height
	const isMobile = width < 768
	const useTwoColumns = width >= 768
	const useWideHospitalRows = isLandscape && width >= 1024

	const [showForm, setShowForm] = useState(false)
	const [form, setForm] = useState<HospitalFormData>(EMPTY_FORM)
	const [hospitals, setHospitals] = useState<HospitalItem[]>([])
	const [editingId, setEditingId] = useState<string | null>(null)
	const [menuVisibleId, setMenuVisibleId] = useState<string | null>(null)
	const [isLoading, setIsLoading] = useState(false)
	const [isSaving, setIsSaving] = useState(false)
	const [isSavingAddress, setIsSavingAddress] = useState(false)
	const [selectedWorkingDay, setSelectedWorkingDay] = useState<WorkingDayKey>('monday')
	const [selectedAppointmentType, setSelectedAppointmentType] = useState<AppointmentType>('clinic')
	const [weeklyWorkingHours, setWeeklyWorkingHours] = useState(createWeeklyWorkingHours)
	const [followUpDays, setFollowUpDays] = useState(7)
	const [rescheduleCutoff, setRescheduleCutoff] = useState(2)
	const [allowPayLater, setAllowPayLater] = useState(false)
	const hospitalsRef = useRef<HospitalItem[]>([])
	const hasLoadedHospitalsRef = useRef(false)

	const updateHospitalsState = (nextHospitals: HospitalItem[] | ((prev: HospitalItem[]) => HospitalItem[])) => {
		const resolvedHospitals =
			typeof nextHospitals === 'function' ? nextHospitals(hospitalsRef.current) : nextHospitals
		hospitalsRef.current = resolvedHospitals
		setHospitals(resolvedHospitals)
		onHospitalsChange?.(resolvedHospitals.map(toDoctorHospital))
	}

	useEffect(() => {
		hospitalsRef.current = hospitals
	}, [hospitals])

	const loadHospitals = async (showLoader = false) => {
		try {
			if (showLoader) setIsLoading(true)
			const response = await getDoctorProfile()

			if (!response?.success || !response.data) {
				console.log('[MyHospitalsTab] doctor profile API returned no hospital data:', {
					success: response?.success,
					message: response?.message,
				})
				return
			}

			const profile = mapDoctorProfileApi(response.data)
			const normalizedHospitals = normalizeHospitals(profile.hospitals)
			hasLoadedHospitalsRef.current = true
			updateHospitalsState(normalizedHospitals)
		} catch (error) {
			console.log('[MyHospitalsTab] failed to load hospitals:', error)
			Toast.show({
				type: 'error',
				text1:
					(error as any)?.response?.data?.message ||
					(error as any)?.message ||
					'Unable to load hospitals right now.',
			})
		} finally {
			if (showLoader) setIsLoading(false)
		}
	}

	useEffect(() => {
		loadHospitals(true)
	}, [])

	useEffect(() => {
		if (!externalHospitals) return

		const normalized = normalizeHospitals(externalHospitals)
		if (normalized.length > 0 || !hasLoadedHospitalsRef.current) {
			hospitalsRef.current = normalized
			setHospitals(normalized)
		}
	}, [externalHospitals])

	const contentWidth = useMemo(() => {
		if (width >= 1280) return 760
		if (width >= 1024) return 680
		if (isTablet) return 600
		return 640
	}, [width, isTablet])

	const sectionPadding = isMobile ? 16 : isTablet ? 24 : 28
	const cardDirection = useWideHospitalRows ? 'row' : 'column'
	const actionStacked = !useWideHospitalRows
	const selectedWorkingHours = weeklyWorkingHours[selectedWorkingDay][selectedAppointmentType]

	const resetForm = () => {
		setForm(EMPTY_FORM)
		setEditingId(null)
		setShowForm(false)
	}

	const addSlot = (sectionKey: keyof SectionSlots) => {
		setWeeklyWorkingHours((prev) => {
			const current = prev[selectedWorkingDay][selectedAppointmentType]
			const slots = current.sections[sectionKey]
			if (slots.length >= 3) return prev

			const previousEnd = slots[slots.length - 1].end
			const [endHour, endMinute] = previousEnd.split(':').map(Number)
			const newEndMins = endHour * 60 + endMinute + current.slotDuration
			const section = SECTION_META.find((item) => item.key === sectionKey)!
			const clampedMins = Math.min(newEndMins, section.endHour * 60)
			const newEnd = `${String(Math.floor(clampedMins / 60)).padStart(2, '0')}:${String(clampedMins % 60).padStart(2, '0')}`

			return {
				...prev,
				[selectedWorkingDay]: {
					...prev[selectedWorkingDay],
					[selectedAppointmentType]: {
						...current,
						sections: {
							...current.sections,
							[sectionKey]: [...slots, { start: previousEnd, end: newEnd }],
						},
					},
				},
			}
		})
	}

	const removeSlot = (sectionKey: keyof SectionSlots, slotIndex: number) => {
		setWeeklyWorkingHours((prev) => {
			const current = prev[selectedWorkingDay][selectedAppointmentType]
			if (slotIndex === 0) return prev

			return {
				...prev,
				[selectedWorkingDay]: {
					...prev[selectedWorkingDay],
					[selectedAppointmentType]: {
						...current,
						sections: {
							...current.sections,
							[sectionKey]: current.sections[sectionKey].filter((_, index) => index !== slotIndex),
						},
					},
				},
			}
		})
	}

	const updateSlotTime = (
		sectionKey: keyof SectionSlots,
		slotIndex: number,
		field: 'start' | 'end',
		value: string
	) => {
		setWeeklyWorkingHours((prev) => {
			const current = prev[selectedWorkingDay][selectedAppointmentType]

			return {
				...prev,
				[selectedWorkingDay]: {
					...prev[selectedWorkingDay],
					[selectedAppointmentType]: {
						...current,
						sections: {
							...current.sections,
							[sectionKey]: current.sections[sectionKey].map((slot, index) =>
								index === slotIndex ? { ...slot, [field]: value } : slot
							),
						},
					},
				},
			}
		})
	}

	const updateSlotDuration = (value: number) => {
		setWeeklyWorkingHours((prev) => {
			const current = prev[selectedWorkingDay][selectedAppointmentType]
			const snappedSections = Object.fromEntries(
				Object.entries(current.sections).map(([sectionKey, slots]) => [
					sectionKey,
					(slots as TimeSlot[]).map((slot) => ({
						start: snapToStep(slot.start, value),
						end: snapToStep(slot.end, value),
					})),
				])
			) as SectionSlots

			return {
				...prev,
				[selectedWorkingDay]: {
					...prev[selectedWorkingDay],
					[selectedAppointmentType]: {
						sections: snappedSections,
						slotDuration: value,
					},
				},
			}
		})
	}

	const handleSetPrimary = async (id: string) => {
		const selectedHospital = hospitalsRef.current.find((hospital) => hospital.id === id)
		if (!selectedHospital || selectedHospital.isPrimary) {
			setMenuVisibleId(null)
			return
		}

		const previousHospitals = hospitalsRef.current
		updateHospitalsState((prev) => prev.map((hospital) => ({ ...hospital, isPrimary: hospital.id === id })))

		try {
			await updateHospital(id, buildHospitalUpdatePayload(selectedHospital, true, weeklyWorkingHours))
			await loadHospitals()
		} catch (error) {
			console.log('[MyHospitalsTab] set primary error:', error)
			updateHospitalsState(previousHospitals)
			Toast.show({ type: 'error', text1: 'Unable to update primary hospital right now.' })
		} finally {
			setMenuVisibleId(null)
		}
	}

	const handleEdit = (hospital: HospitalItem) => {
		setForm({
			name: hospital.name,
			fullAddress: hospital.fullAddress,
			phone_number: hospital.phone_number,
			video_consultation_fee: hospital.video_consultation_fee,
			offline_consultation_fee: hospital.offline_consultation_fee,
		})
		setEditingId(hospital.id)
		setMenuVisibleId(null)
		setShowForm(true)
	}

	const confirmDelete = (id: string) => {
		Alert.alert('Delete hospital', 'Are you sure you want to delete this hospital?', [
			{ text: 'Cancel', style: 'cancel' },
			{
				text: 'Delete',
				style: 'destructive',
				onPress: async () => {
					try {
						await deleteHospital(id)
						await loadHospitals()
						setMenuVisibleId(null)
					} catch (error) {
						console.log('[MyHospitalsTab] delete hospital error:', error)
						Toast.show({ type: 'error', text1: 'Unable to delete hospital right now.' })
					}
				},
			},
		])
	}

	const handleSaveAddress = () => {
		const trimmedName = form.name.trim()
		const trimmedAddress = form.fullAddress.trim()
		const trimmedPhone = form.phone_number.trim()
		const trimmedVideoFee = form.video_consultation_fee.trim()
		const trimmedOfflineFee = form.offline_consultation_fee.trim()

		if (!trimmedName) {
			Toast.show({ type: 'error', text1: 'Hospital name is required.' })
			return
		}

		if (!trimmedAddress) {
			Toast.show({ type: 'error', text1: 'Full address is required.' })
			return
		}

		const saveAddress = async () => {
			try {
				setIsSavingAddress(true)

				if (editingId) {
					const existingHospital = hospitalsRef.current.find((hospital) => hospital.id === editingId)
					if (!existingHospital) {
						throw new Error('Hospital not found')
					}

					const updatedHospital: HospitalItem = {
						...existingHospital,
						name: trimmedName,
						fullAddress: trimmedAddress,
						location: trimmedAddress,
						phone_number: trimmedPhone,
						video_consultation_fee: trimmedVideoFee,
						offline_consultation_fee: trimmedOfflineFee,
					}

					const response = await updateHospital(
						editingId,
						buildHospitalUpdatePayload(updatedHospital, updatedHospital.isPrimary, weeklyWorkingHours)
					)
					Toast.show({ type: 'success', text1: getSuccessMessage(response, 'Hospital updated successfully') })
					await loadHospitals()
				} else {
					// Pin the clinic on the map from the typed address, so patients' Directions buttons
					// navigate to it. Best effort: without a match the clinic is still saved (address search).
					const coords = await getCoordsFromAddress(trimmedAddress)
					const response = await createHospital({
						name: trimmedName,
						phone_number: trimmedPhone,
						full_address: trimmedAddress,
						...(coords ?? {}),
						is_primary: hospitals.length === 0,
						video_consultation_fee: trimmedVideoFee,
						offline_consultation_fee: trimmedOfflineFee,
					})

					Toast.show({ type: 'success', text1: getSuccessMessage(response) })
			await loadHospitals()
		}
			} catch (error) {
				console.log('[MyHospitalsTab] save address error:', error)
				Toast.show({ type: 'error', text1: (error as any)?.response?.data?.message || (error as any)?.message || 'Failed to save hospital' })
			} finally {
				setIsSavingAddress(false)
			}
		}

		void saveAddress()
	}

	const handleSave = async () => {
		try {
			setIsSaving(true)
			const hasPrimary = hospitals.some((hospital) => hospital.isPrimary)
			await Promise.all(
				hospitals.map((hospital, index) =>
					updateHospital(
						hospital.id,
						buildHospitalUpdatePayload(
							hospital,
							hospital.isPrimary || (!hasPrimary && index === 0),
							weeklyWorkingHours
						)
					)
				)
			)
			await loadHospitals()
		Toast.show({ type: 'success', text1: 'Hospitals saved successfully.' })
	} catch (error) {
		console.log('[MyHospitalsTab] save error:', error)
		Toast.show({ type: 'error', text1: 'Unable to save hospitals right now.' })
	} finally {
		setIsSaving(false)
	}
}

if (editingId) {
	return (
		<View style={{ flex: 1 }}>
			<ScrollView
				style={styles.container}
				contentContainerStyle={[
					styles.contentContainer,
					{
						paddingHorizontal: sectionPadding,
						paddingTop: sectionPadding,
						paddingBottom: 16,
					},
				]}
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
			>
				<View style={[styles.contentShell, { maxWidth: contentWidth }]}>
					<View style={styles.formHeader}>
						<TouchableOpacity onPress={resetForm} style={styles.backButton} activeOpacity={0.8}>
							<MaterialCommunityIcons name="chevron-left" size={20} color="#5f6b73" />
						</TouchableOpacity>
						<AppTypography variant="h4" style={styles.formTitle}>
							{editingId ? 'Edit Hospital Details' : 'Add new Hospital Details'}
				</AppTypography>
			</View>

			<View style={styles.formBody}>
				<InputField
								label="Enter hospital name"
								value={form.name}
								onChangeText={(value) => setForm((prev) => ({ ...prev, name: value }))}
								placeholder="e.g. Arogya Clinic"
							/>

							<InputField
								label="Phone number"
								value={form.phone_number}
								onChangeText={(value) => setForm((prev) => ({ ...prev, phone_number: value }))}
								placeholder="e.g. +91 98765 43210"
								keyboardType="phone-pad"
							/>

							<InputField
								label="Enter Full address"
								value={form.fullAddress}
								onChangeText={(value) => setForm((prev) => ({ ...prev, fullAddress: value }))}
								placeholder="Enter complete address"
								multiline
							/>

							<InputField
								label="Video consultation fee"
								value={form.video_consultation_fee}
								onChangeText={(value) =>
									setForm((prev) => ({
										...prev,
										video_consultation_fee: value.replace(/[^\d.]/g, ''),
									}))
								}
								placeholder="e.g. 500"
								keyboardType="numeric"
							/>

							<InputField
								label="Offline consultation fee"
								value={form.offline_consultation_fee}
								onChangeText={(value) =>
									setForm((prev) => ({
										...prev,
										offline_consultation_fee: value.replace(/[^\d.]/g, ''),
									}))
								}
								placeholder="e.g. 300"
								keyboardType="numeric"
							/>

							<WorkingHoursSection
								selectedWorkingDay={selectedWorkingDay}
								onWorkingDayChange={setSelectedWorkingDay}
								selectedAppointmentType={selectedAppointmentType}
								onAppointmentTypeChange={setSelectedAppointmentType}
								selectedWorkingHours={selectedWorkingHours}
								onAddSlot={addSlot}
								onRemoveSlot={removeSlot}
								onUpdateSlotTime={updateSlotTime}
								onSlotDurationChange={updateSlotDuration}
								stacked={!useTwoColumns}
							/>

							<View style={styles.appointmentRules}>
								<AppTypography
									variant="body"
									style={[styles.workingTitle, styles.appointmentRulesTitle]}
								>
									Appointment Rules
								</AppTypography>

								<View style={styles.ruleBlock}>
									<AppTypography variant="caption" style={styles.shiftTitle}>
										Free Follow-up Validity
									</AppTypography>
									<View style={styles.ruleField}>
										<DropdownSelect
											label="Free Follow-up Validity"
											value={followUpDays}
											options={followUpOptions}
											onChange={(value) => setFollowUpDays(Number(value))}
											compact
											showFloatingLabel={false}
										/>
									</View>
								</View>

								<View style={styles.ruleBlock}>
									<AppTypography variant="caption" style={styles.shiftTitle}>
										Reschedule Allowed Until
									</AppTypography>
									<View style={styles.ruleField}>
										<DropdownSelect
											label="Reschedule Allowed Until"
											value={rescheduleCutoff}
											options={rescheduleCutoffOptions}
											onChange={(value) => setRescheduleCutoff(Number(value))}
											compact
											showFloatingLabel={false}
										/>
									</View>
								</View>

								<View style={styles.ruleBlock}>
									<AppTypography variant="caption" style={styles.shiftTitle}>
										Allow Pay Later
									</AppTypography>

									<AppToggle
										value={allowPayLater}
										onValueChange={setAllowPayLater}
										showStatusText={false}
										accessibilityLabel="Allow Pay Later"
										style={styles.payLaterControl}
									/>
								</View>
							</View>
						</View>
					</View>
				</ScrollView>
				<AppStickyFooter
					onPress={handleSaveAddress}
					loading={isSavingAddress}
					disabled={isSavingAddress}
					buttonStyle={styles.saveButton}
				>
					Save Details
				</AppStickyFooter>
			</View>
		)
	}

	return (
		<View style={{ flex: 1 }}>
			<Pressable style={styles.container} onPress={() => setMenuVisibleId(null)}>
				<ScrollView
					style={styles.container}
					contentContainerStyle={[
						styles.contentContainer,
						{
							paddingHorizontal: sectionPadding,
							paddingTop: sectionPadding,
							paddingBottom: 100,
						},
					]}
					keyboardShouldPersistTaps="handled"
					showsVerticalScrollIndicator={false}
				>
					<View style={[styles.contentShell, { maxWidth: contentWidth }]}>
						<View style={[styles.header, actionStacked && styles.headerStacked]}>
							<TouchableOpacity
								style={[styles.addButton, actionStacked && styles.addButtonStacked]}
								onPress={() => setShowForm(true)}
								activeOpacity={0.85}
							>
								<MaterialCommunityIcons name="plus" size={18} color="#ffffff" />
								<AppTypography variant="body" style={styles.addButtonText}>
									Add new hospital
								</AppTypography>
							</TouchableOpacity>
						</View>

						{hospitals.length === 0 ? (
							<View style={styles.emptyState}>
								<MaterialCommunityIcons name="home-outline" size={48} color="rgba(56,72,80,0.28)" />
								<AppTypography variant="body" style={styles.emptyText}>
									No hospitals added yet
								</AppTypography>
							</View>
						) : (
							<View style={styles.listSection}>
								{hospitals.map((hospital, index) => (
									<View key={hospital.id} style={styles.hospitalBlock}>
										<AppTypography variant="caption" style={styles.addressTitle}>
											Address {index + 1}
										</AppTypography>

										<View style={[styles.cardRow, { flexDirection: cardDirection }]}>
											<View
												style={[
													styles.cardMain,
													hospital.isPrimary && styles.cardMainPrimary,
													cardDirection === 'column' && styles.cardMainStacked,
												]}
											>
												<View style={styles.cardMainInner}>
													<MaterialCommunityIcons
														name="home-outline"
														size={18}
														color="#0c7c7c"
														style={styles.cardIcon}
													/>
													<View style={styles.cardCopy}>
														<AppTypography variant="body" style={styles.hospitalName}>
															{hospital.name}
														</AppTypography>
														<AppTypography variant="caption" style={styles.addressText}>
															{getHospitalAddressText(hospital)}
														</AppTypography>
														{hospital.phone_number ? (
															<AppTypography variant="caption" style={styles.metaText}>
																Phone: {hospital.phone_number}
															</AppTypography>
														) : null}
														{hospital.video_consultation_fee ||
														hospital.offline_consultation_fee ? (
															<AppTypography variant="caption" style={styles.metaText}>
																Video: {hospital.video_consultation_fee || '-'} |
																Offline: {hospital.offline_consultation_fee || '-'}
															</AppTypography>
														) : null}
													</View>
												</View>
											</View>

											<View
												style={[styles.actionGroup, actionStacked && styles.actionGroupStacked]}
											>
												<TouchableOpacity
													style={[
														styles.primaryToggle,
														hospital.isPrimary && styles.primaryToggleActive,
														actionStacked && styles.primaryToggleStacked,
													]}
													onPress={() => handleSetPrimary(hospital.id)}
													activeOpacity={0.85}
												>
													<AppTypography variant="caption" style={styles.primaryText}>
														Set as Primary
													</AppTypography>
													<View
														style={[
															styles.radioOuter,
															hospital.isPrimary && styles.radioOuterActive,
														]}
													>
														{hospital.isPrimary ? <View style={styles.radioInner} /> : null}
													</View>
												</TouchableOpacity>

												<View style={styles.menuWrapper}>
													<TouchableOpacity
														style={[
															styles.menuButton,
															actionStacked && styles.menuButtonStacked,
														]}
														onPress={() =>
															setMenuVisibleId((prev) =>
																prev === hospital.id ? null : hospital.id
															)
														}
														activeOpacity={0.85}
													>
														<MaterialCommunityIcons
															name="dots-horizontal"
															size={20}
															color="#62707a"
														/>
													</TouchableOpacity>

													<Modal
														visible={menuVisibleId === hospital.id}
														transparent
														animationType="fade"
														onRequestClose={() => setMenuVisibleId(null)}
													>
														<Pressable
															style={styles.modalOverlay}
															onPress={() => setMenuVisibleId(null)}
														>
															<View
																style={[
																	styles.menuCard,
																	isMobile && styles.menuCardMobile,
																]}
															>
																<TouchableOpacity
																	style={styles.menuItem}
																	onPress={() => handleEdit(hospital)}
																>
																	<AppTypography
																		variant="body"
																		style={styles.menuItemText}
																	>
																		Edit
																	</AppTypography>
																</TouchableOpacity>
																<TouchableOpacity
																	style={styles.menuItem}
																	onPress={() => confirmDelete(hospital.id)}
																>
																	<AppTypography
																		variant="body"
																		style={styles.menuItemDelete}
																	>
																		Delete
																	</AppTypography>
																</TouchableOpacity>
															</View>
														</Pressable>
													</Modal>
												</View>
											</View>
										</View>
									</View>
								))}
							</View>
						)}
					</View>
				</ScrollView>
			</Pressable>
			<AppStickyFooter
				onPress={handleSave}
				loading={isSaving}
				disabled={isSaving}
				buttonStyle={styles.saveButton}
			>
				Save
			</AppStickyFooter>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#ffffff',
	},
	loadingContainer: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#ffffff',
	},
	contentContainer: {
		flexGrow: 1,
		alignItems: 'center',
	},
	contentShell: {
		width: '100%',
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 24,
		gap: 14,
	},
	headerStacked: {
		flexDirection: 'column',
		alignItems: 'stretch',
	},

	addButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#0c7c7c',
		paddingHorizontal: 16,
		paddingVertical: 11,
		borderRadius: 10,
	},
	addButtonStacked: {
		width: '100%',
	},
	addButtonText: {
		color: '#ffffff',
		fontWeight: '600',
		marginLeft: 6,
	},
	emptyState: {
		minHeight: 220,
		borderWidth: 1,
		borderColor: '#e3eaed',
		borderRadius: 16,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#fafcfc',
		paddingHorizontal: 20,
	},
	emptyText: {
		marginTop: 12,
		color: '#74828b',
	},
	listSection: {
		gap: 18,
	},
	hospitalBlock: {
		width: '100%',
	},
	addressTitle: {
		color: '#0c7c7c',
		fontWeight: '600',
		fontSize: 13,
		marginBottom: 8,
	},
	cardRow: {
		gap: 10,
	},
	cardMain: {
		flex: 1,
		minWidth: 0,
		borderWidth: 1,
		borderColor: '#d7e2e5',
		borderRadius: 10,
		borderLeftWidth: 4,
		borderLeftColor: '#d7e2e5',
		padding: 14,
		backgroundColor: '#ffffff',
	},
	cardMainPrimary: {
		borderColor: '#0c3c3c',
		borderLeftColor: '#194545',
	},
	cardMainStacked: {
		width: '100%',
	},
	cardMainInner: {
		flexDirection: 'row',
		alignItems: 'flex-start',
	},
	cardIcon: {
		marginTop: 2,
		marginRight: 10,
	},
	cardCopy: {
		flex: 1,
	},
	hospitalName: {
		color: '#1f2b33',
		fontWeight: '600',
		marginBottom: 4,
	},
	addressText: {
		color: '#66757f',
		fontSize: 12,
		lineHeight: 18,
	},
	metaText: {
		color: '#66757f',
		fontSize: 12,
		lineHeight: 18,
		marginTop: 4,
	},
	actionGroup: {
		flexDirection: 'row',
		alignItems: 'stretch',
		gap: 10,
		flexShrink: 0,
	},
	actionGroupStacked: {
		width: '100%',
	},
	primaryToggle: {
		minWidth: 148,
		borderWidth: 1,
		borderColor: '#d7e2e5',
		borderRadius: 10,
		paddingHorizontal: 14,
		paddingVertical: 12,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#ffffff',
	},
	primaryToggleStacked: {
		flex: 1,
	},
	primaryToggleActive: {
		borderColor: '#0c7c7c',
		backgroundColor: 'rgba(12,124,124,0.03)',
	},
	primaryText: {
		color: '#0c7c7c',
		fontWeight: '500',
		fontSize: 13,
		marginRight: 8,
	},
	radioOuter: {
		width: 18,
		height: 18,
		borderRadius: 9,
		borderWidth: 2,
		borderColor: '#0c7c7c',
		alignItems: 'center',
		justifyContent: 'center',
	},
	radioOuterActive: {
		borderColor: '#0c7c7c',
	},
	radioInner: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: '#0c7c7c',
	},
	menuWrapper: {
		position: 'relative',
		flexShrink: 0,
	},
	menuButton: {
		width: 46,
		borderWidth: 1,
		borderColor: '#d7e2e5',
		borderRadius: 10,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#ffffff',
	},
	menuButtonStacked: {
		height: 46,
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(18, 28, 33, 0.18)',
		justifyContent: 'center',
		alignItems: 'center',
		padding: 20,
	},
	menuCard: {
		width: 180,
		backgroundColor: '#ffffff',
		borderRadius: 12,
		paddingVertical: 8,
		shadowColor: '#000000',
		shadowOpacity: 0.1,
		shadowRadius: 10,
		shadowOffset: { width: 0, height: 4 },
		elevation: 8,
	},
	menuCardMobile: {
		width: '100%',
		maxWidth: 240,
	},
	menuItem: {
		paddingHorizontal: 16,
		paddingVertical: 12,
	},
	menuItemText: {
		color: '#1f2b33',
	},
	menuItemDelete: {
		color: '#d14141',
	},
	formHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 24,
	},
	backButton: {
		width: 34,
		height: 34,
		borderRadius: 17,
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 8,
	},
	formTitle: {
		color: '#1f2b33',
		fontWeight: '700',
		fontSize: 16,
	},
	formBody: {
		gap: 18,
	},
	fieldGroup: {
		width: '100%',
	},
	fieldLabel: {
		marginBottom: 8,
		color: '#7b8790',
		fontWeight: '500',
		fontSize: 14,
		lineHeight: 20,
	},
	multilineInput: {
		minHeight: 96,
	},
	multilineInputContent: {
		minHeight: 96,
		paddingTop: 12,
		paddingBottom: 12,
	},
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
	appointmentRules: {
		marginTop: 14,
		gap: 14,
	},
	appointmentRulesTitle: {
		marginBottom: 0,
	},
	ruleBlock: {
		width: '100%',
	},
	ruleField: {
		width: 225,
		maxWidth: '100%',
	},
	payLaterControl: {
		width: 225,
		maxWidth: '100%',
		minHeight: 32,
		justifyContent: 'center',
	},
	formActions: {
		alignItems: 'stretch',
	},
	saveButton: {
		alignSelf: 'stretch',
		marginTop: 0,
		width: '100%',
	},
})
