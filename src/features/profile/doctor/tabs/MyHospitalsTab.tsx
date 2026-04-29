import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
	ActivityIndicator,
	Alert,
	Modal,
	Pressable,
	ScrollView,
	StyleSheet,
	TextInput,
	TouchableOpacity,
	View,
	useWindowDimensions,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { AppTypography } from '../../../../components/common'
import {
	createHospital,
	deleteHospital,
	getDoctorProfile,
	mapDoctorProfileApi,
	updateHospital,
} from '../../../doctor/doctorService'
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
	location: string
	isPrimary: boolean
}

const EMPTY_FORM: HospitalFormData = {
	name: '',
	fullAddress: '',
	phone_number: '',
	video_consultation_fee: '',
	offline_consultation_fee: '',
}

const TEAL = '#0c7c7c'

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

const makeTimeOptions = (startHour: number, endHour: number) => {
	const options: { value: string; label: string }[] = []
	for (let hour = startHour; hour <= endHour; hour += 1) {
		for (const minute of ['00', '30']) {
			if (hour === endHour && minute === '30') break
			const value = `${String(hour).padStart(2, '0')}:${minute}`
			const period = hour < 12 ? 'AM' : 'PM'
			const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
			options.push({ value, label: `${hour12}:${minute} ${period}` })
		}
	}
	return options
}

const morningOptions = makeTimeOptions(8, 12)
const afternoonOptions = makeTimeOptions(12, 17)
const eveningOptions = makeTimeOptions(17, 21)
const durationOptions = [10, 15, 20, 25, 30]

const buildHospitalPayload = (hospital: HospitalItem, isPrimary = hospital.isPrimary) => ({
	name: hospital.name.trim(),
	phone_number: hospital.phone_number.trim(),
	full_address: hospital.fullAddress.trim(),
	location: hospital.fullAddress.trim(),
	is_primary: isPrimary,
	video_consultation_fee: hospital.video_consultation_fee.trim(),
	offline_consultation_fee: hospital.offline_consultation_fee.trim(),
})

function FieldLabel({ label }: { label: string }) {
	return (
		<AppTypography variant="caption" style={styles.fieldLabel}>
			{label}
		</AppTypography>
	)
}

function FormRow({
	children,
	stacked,
}: {
	children: React.ReactNode
	stacked: boolean
}) {
	return (
		<View style={[styles.formRow, stacked && styles.formRowStacked]}>
			{React.Children.map(children, (child, index) => (
				<View
					style={[
						styles.formCell,
						stacked
							? [styles.formCellStacked, index === 0 && styles.formCellStackedFirst]
							: index === 0
								? styles.formCellLeft
								: styles.formCellRight,
					]}
				>
					{child}
				</View>
			))}
		</View>
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
	keyboardType?: React.ComponentProps<typeof TextInput>['keyboardType']
}) {
	return (
		<View style={styles.fieldGroup}>
			<FieldLabel label={label} />
			<View style={[styles.inputShell, multiline && styles.inputShellMultiline]}>
				<TextInput
					value={value}
					onChangeText={onChangeText}
					placeholder={placeholder}
					placeholderTextColor="#9a9a9a"
					style={[styles.textInput, multiline && styles.textInputMultiline]}
					multiline={multiline}
					keyboardType={keyboardType}
					textAlignVertical={multiline ? 'top' : 'center'}
				/>
			</View>
		</View>
	)
}

function DropdownSelect({
	label,
	value,
	options,
	onChange,
	compact = false,
}: {
	label: string
	value: string | number
	options: { value: string | number; label: string }[]
	onChange: (value: string | number) => void
	compact?: boolean
}) {
	const [isOpen, setIsOpen] = useState(false)
	const selectedOption = options.find((option) => option.value === value)

	return (
		<View style={[styles.dropdownGroup, compact && styles.dropdownGroupCompact]}>
			<AppTypography variant="caption" style={styles.dropdownFloatingLabel}>
				{label}
			</AppTypography>
			<TouchableOpacity
				style={[styles.dropdownTrigger, compact && styles.dropdownTriggerCompact]}
				onPress={() => setIsOpen(true)}
				activeOpacity={0.85}
			>
				<AppTypography variant="body" style={[styles.dropdownValue, compact && styles.dropdownValueCompact]}>
					{selectedOption?.label ?? 'Select'}
				</AppTypography>
				<MaterialCommunityIcons name="menu-down" size={26} color="#7c7c7c" />
			</TouchableOpacity>

			<Modal visible={isOpen} transparent animationType="fade" onRequestClose={() => setIsOpen(false)}>
				<Pressable style={styles.dropdownOverlay} onPress={() => setIsOpen(false)}>
					<Pressable style={styles.dropdownMenu}>
						<AppTypography variant="caption" style={styles.dropdownTitle}>
							{label}
						</AppTypography>
						<ScrollView style={styles.dropdownList} showsVerticalScrollIndicator={false}>
							{options.map((option) => {
								const isSelected = option.value === value
								return (
									<TouchableOpacity
										key={String(option.value)}
										style={[styles.dropdownItem, isSelected && styles.dropdownItemActive]}
										onPress={() => {
											onChange(option.value)
											setIsOpen(false)
										}}
										activeOpacity={0.85}
									>
										<AppTypography
											variant="body"
											style={[styles.dropdownItemText, isSelected && styles.dropdownItemTextActive]}
										>
											{option.label}
										</AppTypography>
										{isSelected ? (
											<MaterialCommunityIcons name="check" size={18} color={TEAL} />
										) : null}
									</TouchableOpacity>
								)
							})}
						</ScrollView>
					</Pressable>
				</Pressable>
			</Modal>
		</View>
	)
}

function WorkingHoursRow({
	children,
	stacked,
}: {
	children: React.ReactNode
	stacked: boolean
}) {
	return (
		<View style={[styles.workingRow, stacked && styles.workingRowStacked]}>
			{React.Children.map(children, (child) => (
				<View style={[styles.workingCell, stacked && styles.workingCellStacked]}>{child}</View>
			))}
		</View>
	)
}

function WorkingHoursSection({
	morningStart,
	morningEnd,
	afternoonStart,
	afternoonEnd,
	eveningStart,
	eveningEnd,
	slotDuration,
	onMorningStartChange,
	onMorningEndChange,
	onAfternoonStartChange,
	onAfternoonEndChange,
	onEveningStartChange,
	onEveningEndChange,
	onSlotDurationChange,
	stacked,
}: {
	morningStart: string
	morningEnd: string
	afternoonStart: string
	afternoonEnd: string
	eveningStart: string
	eveningEnd: string
	slotDuration: number
	onMorningStartChange: (value: string) => void
	onMorningEndChange: (value: string) => void
	onAfternoonStartChange: (value: string) => void
	onAfternoonEndChange: (value: string) => void
	onEveningStartChange: (value: string) => void
	onEveningEndChange: (value: string) => void
	onSlotDurationChange: (value: number) => void
	stacked: boolean
}) {
	return (
		<View style={styles.workingHours}>
			<AppTypography variant="body" style={styles.workingTitle}>
				Working Hours
			</AppTypography>

			<View style={styles.shiftBlock}>
				<AppTypography variant="caption" style={styles.shiftTitle}>
					Morning
				</AppTypography>
				<WorkingHoursRow stacked={stacked}>
					<DropdownSelect
						label="Start Time"
						value={morningStart}
						options={morningOptions}
						onChange={(value) => onMorningStartChange(String(value))}
						compact
					/>
					<DropdownSelect
						label="End Time"
						value={morningEnd}
						options={morningOptions}
						onChange={(value) => onMorningEndChange(String(value))}
						compact
					/>
				</WorkingHoursRow>
			</View>

			<View style={styles.shiftBlock}>
				<AppTypography variant="caption" style={styles.shiftTitle}>
					Afternoon
				</AppTypography>
				<WorkingHoursRow stacked={stacked}>
					<DropdownSelect
						label="Start Time"
						value={afternoonStart}
						options={afternoonOptions}
						onChange={(value) => onAfternoonStartChange(String(value))}
						compact
					/>
					<DropdownSelect
						label="End Time"
						value={afternoonEnd}
						options={afternoonOptions}
						onChange={(value) => onAfternoonEndChange(String(value))}
						compact
					/>
				</WorkingHoursRow>
			</View>

			<View style={styles.shiftBlock}>
				<AppTypography variant="caption" style={styles.shiftTitle}>
					Evening
				</AppTypography>
				<WorkingHoursRow stacked={stacked}>
					<DropdownSelect
						label="Start Time"
						value={eveningStart}
						options={eveningOptions}
						onChange={(value) => onEveningStartChange(String(value))}
						compact
					/>
					<DropdownSelect
						label="End Time"
						value={eveningEnd}
						options={eveningOptions}
						onChange={(value) => onEveningEndChange(String(value))}
						compact
					/>
				</WorkingHoursRow>
			</View>

			<View style={styles.slotDurationBlock}>
				<AppTypography variant="caption" style={styles.shiftTitle}>
					Slot Duration
				</AppTypography>
				<View style={styles.slotDurationField}>
					<DropdownSelect
						label="Duration"
						value={slotDuration}
						options={durationOptions.map((duration) => ({ value: duration, label: `${duration} mins` }))}
						onChange={(value) => onSlotDurationChange(Number(value))}
						compact
					/>
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

	const [showForm, setShowForm] = useState(false)
	const [form, setForm] = useState<HospitalFormData>(EMPTY_FORM)
	const [hospitals, setHospitals] = useState<HospitalItem[]>([])
	const [editingId, setEditingId] = useState<string | null>(null)
	const [menuVisibleId, setMenuVisibleId] = useState<string | null>(null)
	const [isLoading, setIsLoading] = useState(false)
	const [isSaving, setIsSaving] = useState(false)
	const [isSavingAddress, setIsSavingAddress] = useState(false)
	const [morningStart, setMorningStart] = useState('08:00')
	const [morningEnd, setMorningEnd] = useState('12:00')
	const [afternoonStart, setAfternoonStart] = useState('12:00')
	const [afternoonEnd, setAfternoonEnd] = useState('17:00')
	const [eveningStart, setEveningStart] = useState('17:00')
	const [eveningEnd, setEveningEnd] = useState('21:00')
	const [slotDuration, setSlotDuration] = useState(15)
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
			Alert.alert(
				'Error',
				(error as any)?.response?.data?.message || (error as any)?.message || 'Unable to load hospitals right now.'
			)
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
		if (width >= 1280) return 980
		if (width >= 1024) return 920
		if (width >= 768) return 820
		return 640
	}, [width])

	const sectionPadding = isMobile ? 16 : isTablet ? 20 : 24
	const cardDirection = isMobile ? 'column' : 'row'
	const actionStacked = isMobile || (isTablet && !isLandscape)

	const resetForm = () => {
		setForm(EMPTY_FORM)
		setEditingId(null)
		setShowForm(false)
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
			await updateHospital(id, buildHospitalPayload(selectedHospital, true))
			await loadHospitals()
		} catch (error) {
			console.log('[MyHospitalsTab] set primary error:', error)
			updateHospitalsState(previousHospitals)
			Alert.alert('Error', 'Unable to update primary hospital right now.')
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
						Alert.alert('Error', 'Unable to delete hospital right now.')
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
			Alert.alert('Validation', 'Hospital name is required.')
			return
		}

		if (!trimmedAddress) {
			Alert.alert('Validation', 'Full address is required.')
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

					const response = await updateHospital(editingId, buildHospitalPayload(updatedHospital))
					Alert.alert('Success', getSuccessMessage(response, 'Hospital updated successfully'))
					await loadHospitals()
				} else {
					const response = await createHospital({
						name: trimmedName,
						phone_number: trimmedPhone,
						full_address: trimmedAddress,
						is_primary: hospitals.length === 0,
						video_consultation_fee: trimmedVideoFee,
						offline_consultation_fee: trimmedOfflineFee,
					})

					Alert.alert('Success', getSuccessMessage(response))
					await loadHospitals()
				}

				resetForm()
			} catch (error) {
				console.log('[MyHospitalsTab] save address error:', error)
				Alert.alert(
					'Error',
					(error as any)?.response?.data?.message || (error as any)?.message || 'Failed to save hospital'
				)
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
					updateHospital(hospital.id, buildHospitalPayload(hospital, hospital.isPrimary || (!hasPrimary && index === 0)))
				)
			)
			await loadHospitals()
			Alert.alert('Success', 'Hospitals saved successfully.')
		} catch (error) {
			console.log('[MyHospitalsTab] save error:', error)
			Alert.alert('Error', 'Unable to save hospitals right now.')
		} finally {
			setIsSaving(false)
		}
	}

	if (isLoading) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size="small" color="#0c7c7c" />
			</View>
		)
	}

	if (showForm) {
		return (
			<ScrollView
				style={styles.container}
				contentContainerStyle={[styles.contentContainer, { paddingHorizontal: sectionPadding, paddingVertical: sectionPadding }]}
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

						<FormRow stacked={!useTwoColumns}>
							<InputField
								label="Phone number"
								value={form.phone_number}
								onChangeText={(value) => setForm((prev) => ({ ...prev, phone_number: value }))}
								placeholder="e.g. +91 98765 43210"
								keyboardType="phone-pad"
							/>
							<InputField
								label="Video consultation fee"
								value={form.video_consultation_fee}
								onChangeText={(value) =>
									setForm((prev) => ({ ...prev, video_consultation_fee: value.replace(/[^\d.]/g, '') }))
								}
								placeholder="e.g. 500"
								keyboardType="numeric"
							/>
						</FormRow>

						<FormRow stacked={!useTwoColumns}>
							<InputField
								label="Offline consultation fee"
								value={form.offline_consultation_fee}
								onChangeText={(value) =>
									setForm((prev) => ({ ...prev, offline_consultation_fee: value.replace(/[^\d.]/g, '') }))
								}
								placeholder="e.g. 300"
								keyboardType="numeric"
							/>
							<View />
						</FormRow>

						<InputField
							label="Enter Full address"
							value={form.fullAddress}
							onChangeText={(value) => setForm((prev) => ({ ...prev, fullAddress: value }))}
							placeholder="Enter complete address"
							multiline
						/>

						<WorkingHoursSection
							morningStart={morningStart}
							morningEnd={morningEnd}
							afternoonStart={afternoonStart}
							afternoonEnd={afternoonEnd}
							eveningStart={eveningStart}
							eveningEnd={eveningEnd}
							slotDuration={slotDuration}
							onMorningStartChange={setMorningStart}
							onMorningEndChange={setMorningEnd}
							onAfternoonStartChange={setAfternoonStart}
							onAfternoonEndChange={setAfternoonEnd}
							onEveningStartChange={setEveningStart}
							onEveningEndChange={setEveningEnd}
							onSlotDurationChange={setSlotDuration}
							stacked={false}
						/>
					</View>

					<View style={styles.formActions}>
						<TouchableOpacity
							style={[styles.primaryButton, isSavingAddress && styles.primaryButtonDisabled]}
							onPress={handleSaveAddress}
							activeOpacity={0.85}
							disabled={isSavingAddress}
						>
							{isSavingAddress ? (
								<ActivityIndicator size="small" color="#ffffff" />
							) : (
								<AppTypography variant="body" style={styles.primaryButtonText}>
									Save Address
								</AppTypography>
							)}
						</TouchableOpacity>
					</View>
				</View>
			</ScrollView>
		)
	}

	return (
		<Pressable style={styles.container} onPress={() => setMenuVisibleId(null)}>
			<ScrollView
				contentContainerStyle={[styles.contentContainer, { paddingHorizontal: sectionPadding, paddingVertical: sectionPadding }]}
				showsVerticalScrollIndicator={false}
			>
				<View style={[styles.contentShell, { maxWidth: contentWidth }]}>
					<View style={[styles.header, actionStacked && styles.headerStacked]}>
						<AppTypography variant="h3" style={styles.title}>
							My Hospital
						</AppTypography>
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
												<MaterialCommunityIcons name="home-outline" size={18} color="#0c7c7c" style={styles.cardIcon} />
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
													{hospital.video_consultation_fee || hospital.offline_consultation_fee ? (
														<AppTypography variant="caption" style={styles.metaText}>
															Video: {hospital.video_consultation_fee || '-'} | Offline: {hospital.offline_consultation_fee || '-'}
														</AppTypography>
													) : null}
												</View>
											</View>
										</View>

										<View style={[styles.actionGroup, actionStacked && styles.actionGroupStacked]}>
											<TouchableOpacity
												style={[styles.primaryToggle, hospital.isPrimary && styles.primaryToggleActive, actionStacked && styles.primaryToggleStacked]}
												onPress={() => handleSetPrimary(hospital.id)}
												activeOpacity={0.85}
											>
												<AppTypography variant="caption" style={styles.primaryText}>
													Set as Primary
												</AppTypography>
												<View style={[styles.radioOuter, hospital.isPrimary && styles.radioOuterActive]}>
													{hospital.isPrimary ? <View style={styles.radioInner} /> : null}
												</View>
											</TouchableOpacity>

											<View style={styles.menuWrapper}>
												<TouchableOpacity
													style={[styles.menuButton, actionStacked && styles.menuButtonStacked]}
													onPress={() => setMenuVisibleId((prev) => (prev === hospital.id ? null : hospital.id))}
													activeOpacity={0.85}
												>
													<MaterialCommunityIcons name="dots-horizontal" size={20} color="#62707a" />
												</TouchableOpacity>

												<Modal
													visible={menuVisibleId === hospital.id}
													transparent
													animationType="fade"
													onRequestClose={() => setMenuVisibleId(null)}
												>
													<Pressable style={styles.modalOverlay} onPress={() => setMenuVisibleId(null)}>
														<View style={[styles.menuCard, isMobile && styles.menuCardMobile]}>
															<TouchableOpacity style={styles.menuItem} onPress={() => handleEdit(hospital)}>
																<AppTypography variant="body" style={styles.menuItemText}>
																	Edit
																</AppTypography>
															</TouchableOpacity>
															<TouchableOpacity style={styles.menuItem} onPress={() => confirmDelete(hospital.id)}>
																<AppTypography variant="body" style={styles.menuItemDelete}>
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

					<TouchableOpacity
						style={[styles.primaryButton, styles.saveContinueButton, isSaving && styles.primaryButtonDisabled]}
						onPress={handleSave}
						disabled={isSaving}
						activeOpacity={0.85}
					>
						{isSaving ? (
							<ActivityIndicator size="small" color="#ffffff" />
						) : (
							<AppTypography variant="body" style={styles.primaryButtonText}>
								Save / Continue
							</AppTypography>
						)}
					</TouchableOpacity>
				</View>
			</ScrollView>
		</Pressable>
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
	title: {
		color: '#1f2b33',
		fontSize: 22,
		fontWeight: '700',
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
		borderWidth: 1,
		borderColor: '#d7e2e5',
		borderRadius: 10,
		borderLeftWidth: 4,
		borderLeftColor: '#d7e2e5',
		padding: 14,
		backgroundColor: '#ffffff',
	},
	cardMainPrimary: {
		borderColor: '#0c7c7c',
		borderLeftColor: '#0c7c7c',
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
	formRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		marginHorizontal: -10,
	},
	formRowStacked: {
		flexDirection: 'column',
		marginHorizontal: 0,
	},
	formCell: {
		flex: 1,
		minWidth: 0,
	},
	formCellLeft: {
		paddingHorizontal: 10,
	},
	formCellRight: {
		paddingHorizontal: 10,
	},
	formCellStacked: {
		width: '100%',
		marginTop: 16,
	},
	formCellStackedFirst: {
		marginTop: 0,
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
	inputShell: {
		minHeight: 48,
		borderWidth: 1,
		borderColor: '#a7d3db',
		borderRadius: 10,
		paddingHorizontal: 14,
		backgroundColor: '#ffffff',
	},
	inputShellMultiline: {
		minHeight: 96,
		paddingVertical: 12,
	},
	textInput: {
		minHeight: 48,
		fontSize: 14,
		lineHeight: 20,
		color: '#2f2f2f',
		paddingVertical: 12,
	},
	textInputMultiline: {
		minHeight: 72,
		paddingVertical: 0,
	},
	workingHours: {
		width: '100%',
		maxWidth: 520,
		marginTop: 4,
		paddingTop: 2,
		alignSelf: 'flex-start',
	},
	workingTitle: {
		color: '#001b3d',
		fontSize: 18,
		fontWeight: '700',
		marginBottom: 20,
	},
	shiftBlock: {
		marginBottom: 22,
	},
	shiftTitle: {
		color: '#496a80',
		fontSize: 16,
		fontWeight: '400',
		marginBottom: 20,
	},
	workingRow: {
		flexDirection: 'row',
		gap: 24,
	},
	workingRowStacked: {
		flexDirection: 'column',
		gap: 16,
	},
	workingCell: {
		flex: 1,
		minWidth: 0,
	},
	workingCellStacked: {
		width: '100%',
	},
	slotDurationBlock: {
		marginTop: 2,
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
	dropdownFloatingLabel: {
		position: 'absolute',
		top: -11,
		left: 17,
		zIndex: 2,
		paddingHorizontal: 7,
		backgroundColor: '#ffffff',
		color: '#496a80',
		fontSize: 14,
		fontWeight: '400',
		lineHeight: 18,
	},
	dropdownTrigger: {
		minHeight: 48,
		borderRadius: 14,
		borderWidth: 1,
		borderColor: '#c4c4c4',
		backgroundColor: '#ffffff',
		paddingHorizontal: 20,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	dropdownTriggerCompact: {
		minHeight: 52,
	},
	dropdownValue: {
		color: '#182b3d',
		fontSize: 18,
		fontWeight: '400',
	},
	dropdownValueCompact: {
		color: '#24384a',
		fontSize: 14,
		fontWeight: '400',
	},
	dropdownOverlay: {
		flex: 1,
		backgroundColor: 'rgba(18, 28, 33, 0.18)',
		alignItems: 'center',
		justifyContent: 'center',
		padding: 20,
	},
	dropdownMenu: {
		width: '100%',
		maxWidth: 360,
		maxHeight: '70%',
		borderRadius: 14,
		backgroundColor: '#ffffff',
		paddingVertical: 10,
		shadowColor: '#000000',
		shadowOpacity: 0.14,
		shadowRadius: 14,
		shadowOffset: { width: 0, height: 8 },
		elevation: 10,
	},
	dropdownTitle: {
		color: '#66757f',
		fontSize: 13,
		fontWeight: '700',
		paddingHorizontal: 16,
		paddingBottom: 8,
	},
	dropdownList: {
		maxHeight: 320,
	},
	dropdownItem: {
		minHeight: 46,
		paddingHorizontal: 16,
		paddingVertical: 12,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	dropdownItemActive: {
		backgroundColor: 'rgba(12,124,124,0.06)',
	},
	dropdownItemText: {
		color: '#2f2f2f',
		fontSize: 14,
		fontWeight: '600',
	},
	dropdownItemTextActive: {
		color: TEAL,
	},
	formActions: {
		alignItems: 'flex-end',
		marginTop: 28,
	},
	primaryButton: {
		minWidth: 160,
		paddingHorizontal: 20,
		paddingVertical: 12,
		borderRadius: 10,
		backgroundColor: '#0c7c7c',
		alignItems: 'center',
		justifyContent: 'center',
	},
	primaryButtonDisabled: {
		opacity: 0.7,
	},
	primaryButtonText: {
		color: '#ffffff',
		fontWeight: '600',
	},
	saveContinueButton: {
		marginTop: 28,
		alignSelf: 'flex-start',
	},
})
