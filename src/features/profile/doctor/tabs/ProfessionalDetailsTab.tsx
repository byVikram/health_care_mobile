import React, { useEffect, useMemo, useState } from 'react'
import {
	ActivityIndicator,
	Alert,
	ScrollView,
	StyleSheet,
	TextInput,
	TouchableOpacity,
	View,
	useWindowDimensions,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { AppButton, AppInput, AppSelect, AppSelectOption, AppTypography } from '../../../../components/common'
import { useAuth } from '../../../../context/AuthContext'
import {
	getDoctorProfile,
	getSpecialities,
	mapDoctorProfileApi,
	updateDoctorProfessionalDetails,
} from '../../../doctor/doctorService'

const EXPERTISE_SUGGESTIONS = [
	'Echocardiography',
	'Heart Failure',
	'Interventional Cardiology',
	'Pediatrics',
	'Cardiac Imaging',
	'Electrophysiology',
	'Preventive Cardiology',
	'Vascular Medicine',
]

type Option = AppSelectOption

type ProfessionalFormData = {
	specialization_id: string
	specialization_label: string
	currentDesignation: string
	areasOfExpertise: string[]
	treatments: string
	registrationNumber: string
	registrationProof: string
	about: string
}

const normalizeOptionValue = (value: string, options: Option[]) => {
	if (!value) return ''
	const normalized = value.trim().toLowerCase()
	const match = options.find(
		(option) => option.value.toLowerCase() === normalized || option.label.toLowerCase() === normalized
	)
	return match?.value || value
}

function FormRow({
	children,
	stacked,
	compact,
	alignBottom = false,
}: {
	children: React.ReactNode
	stacked: boolean
	compact: boolean
	alignBottom?: boolean
}) {
	return (
		<View
			style={[
				styles.formRow,
				stacked && styles.formRowStacked,
				compact && styles.formRowCompact,
				alignBottom && !stacked && styles.formRowAlignBottom,
			]}
		>
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

function FieldLabel({ label, required = false }: { label: string; required?: boolean }) {
	return (
		<AppTypography variant="caption" style={styles.fieldLabel}>
			{label}
			{required ? (
				<AppTypography variant="caption" style={styles.requiredMark}>
					*
				</AppTypography>
			) : null}
		</AppTypography>
	)
}

function SectionTitle({ children }: { children: React.ReactNode }) {
	return (
		<AppTypography variant="h4" style={styles.sectionTitle}>
			{children}
		</AppTypography>
	)
}

function InputField({
	label,
	value,
	onChangeText,
	placeholder,
	keyboardType = 'default',
	maxLength,
	required = false,
}: {
	label: string
	value: string
	onChangeText: (value: string) => void
	placeholder: string
	keyboardType?: React.ComponentProps<typeof AppInput>['keyboardType']
	maxLength?: number
	required?: boolean
}) {
	const isAboutField = label === 'About / Bio'

	return (
		<View style={styles.fieldGroup}>
			{label ? <FieldLabel label={label} required={required} /> : null}
			<AppInput
				value={value}
				onChangeText={onChangeText}
				placeholder={placeholder}
				placeholderTextColor="#9a9a9a"
				style={isAboutField && styles.aboutInput}
				contentStyle={isAboutField && styles.aboutInputContent}
				keyboardType={keyboardType}
				maxLength={maxLength}
				multiline={isAboutField}
				textAlignVertical={isAboutField ? 'top' : 'center'}
				fieldSize="form"
				noMargin
				dense
			/>
		</View>
	)
}

function SelectDropdown({
	label,
	value,
	placeholder,
	options,
	onSelect,
	required = false,
}: {
	label: string
	value?: string
	placeholder: string
	options: Option[]
	onSelect: (value: string) => void
	required?: boolean
}) {
	return (
		<View style={styles.fieldGroup}>
			{label ? <FieldLabel label={label} required={required} /> : null}
			<AppSelect
				value={value}
				placeholder={placeholder}
				options={options}
				onSelect={onSelect}
				borderRadius={10}
				size="form"
				noMargin
			/>
		</View>
	)
}

function ChipInput({
	label,
	chips,
	onAdd,
	onRemove,
	placeholder,
	required = false,
}: {
	label: string
	chips: string[]
	onAdd: (value: string) => void
	onRemove: (index: number) => void
	placeholder: string
	required?: boolean
}) {
	const [inputValue, setInputValue] = useState('')

	const handleAdd = () => {
		const trimmed = inputValue.trim()
		if (!trimmed) return
		if (chips.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
			setInputValue('')
			return
		}
		onAdd(trimmed)
		setInputValue('')
	}

	const handleKeyPress = (e: any) => {
		if (e.nativeEvent.key === 'Enter' || e.nativeEvent.key === ',') {
			handleAdd()
		}
	}

	return (
		<View style={styles.fieldGroup}>
			{label ? <FieldLabel label={label} required={required} /> : null}

			{/* Selected chips */}
			{chips.length > 0 && (
				<View style={styles.chipsContainer}>
					{chips.map((chip, index) => (
						<View key={`${chip}-${index}`} style={styles.chip}>
							<AppTypography variant="caption" style={styles.chipText}>
								{chip}
							</AppTypography>
							<TouchableOpacity
								onPress={() => onRemove(index)}
								style={styles.chipRemove}
								hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
							>
								<MaterialCommunityIcons name="close" size={13} color="#1f8a8f" />
							</TouchableOpacity>
						</View>
					))}
				</View>
			)}

			{/* Input row */}
			<View style={styles.chipInputRow}>
				<TextInput
					value={inputValue}
					onChangeText={setInputValue}
					placeholder={placeholder}
					placeholderTextColor="#9a9a9a"
					style={styles.chipTextInput}
					onSubmitEditing={handleAdd}
					onKeyPress={handleKeyPress}
					returnKeyType="done"
					blurOnSubmit={false}
				/>
				<TouchableOpacity style={styles.chipAddButton} onPress={handleAdd} activeOpacity={0.8}>
					<MaterialCommunityIcons name="plus" size={18} color="#0c7c7c" />
				</TouchableOpacity>
			</View>

			{/* Suggestions */}
			<View style={styles.suggestionsRow}>
				{EXPERTISE_SUGGESTIONS.filter((s) => !chips.some((c) => c.toLowerCase() === s.toLowerCase())).map(
					(suggestion) => (
						<TouchableOpacity
							key={suggestion}
							style={styles.suggestionChip}
							onPress={() => onAdd(suggestion)}
							activeOpacity={0.75}
						>
							<AppTypography variant="caption" style={styles.suggestionChipText}>
								+ {suggestion}
							</AppTypography>
						</TouchableOpacity>
					)
				)}
			</View>
		</View>
	)
}

function MultilineField({
	label,
	value,
	onChangeText,
	placeholder,
	helperText,
	required = false,
}: {
	label: string
	value: string
	onChangeText: (value: string) => void
	placeholder: string
	helperText?: string
	required?: boolean
}) {
	return (
		<View style={styles.fieldGroup}>
			{label ? <FieldLabel label={label} required={required} /> : null}
			<AppInput
				value={value}
				onChangeText={onChangeText}
				placeholder={placeholder}
				placeholderTextColor="#9a9a9a"
				style={styles.multilineInput}
				contentStyle={styles.multilineInputContent}
				multiline
				textAlignVertical="top"
				fieldSize="form"
				noMargin
				dense
			/>
			{helperText ? (
				<AppTypography variant="caption" style={styles.helperText}>
					{helperText}
				</AppTypography>
			) : null}
		</View>
	)
}

export default function ProfessionalDetailsTab() {
	const { user, updateUser } = useAuth()
	const { width } = useWindowDimensions()

	const isTablet = width >= 768 && width < 1024
	const isMobile = width < 768
	const isLandscape = width > 900
	const useTwoColumns = width >= 768

	const [formData, setFormData] = useState<ProfessionalFormData>({
		specialization_id: '',
		specialization_label: '',
		currentDesignation: '',
		areasOfExpertise: [],
		treatments: '',
		registrationNumber: '',
		registrationProof: '',
		about: '',
	})
	const [experienceYears, setExperienceYears] = useState<string>('')
	const [specialities, setSpecialities] = useState<Option[]>([])
	const [isLoadingProfile, setIsLoadingProfile] = useState(false)
	const [isLoadingSpecialities, setIsLoadingSpecialities] = useState(false)
	const [isSaving, setIsSaving] = useState(false)

	const updateFormData = <K extends keyof ProfessionalFormData>(key: K, value: ProfessionalFormData[K]) => {
		setFormData((prev) => ({ ...prev, [key]: value }))
	}

	useEffect(() => {
		const fetchSpecialities = async () => {
			try {
				setIsLoadingSpecialities(true)
				const res = await getSpecialities()
				const formatted = (res.data ?? []).map((item: { id: string; label: string }) => ({
					value: item.id,
					label: item.label,
				}))
				setSpecialities(formatted)
			} catch (error) {
				console.log('[ProfessionalDetailsTab] failed to fetch specialities:', error)
			} finally {
				setIsLoadingSpecialities(false)
			}
		}

		const loadDoctorProfile = async () => {
			try {
				setIsLoadingProfile(true)
				const response = await getDoctorProfile()

				if (!response?.success || !response.data) return

				const profile = mapDoctorProfileApi(response.data)
				setFormData({
					specialization_id: profile.professional.specialization_id || '',
					specialization_label: profile.professional.specialization_label || '',
					currentDesignation: profile.professional.currentDesignation || '',
					areasOfExpertise: profile.professional.areasOfExpertise || [],
					treatments: profile.professional.treatments || '',
					registrationNumber: profile.professional.registrationNumber || '',
					registrationProof: profile.professional.registrationProof || '',
					about: profile.professional.about || '',
				})
				setExperienceYears(String(response.data.professional_details?.experience_years ?? ''))
			} catch (error) {
				console.log('[ProfessionalDetailsTab] failed to load profile:', error)
			} finally {
				setIsLoadingProfile(false)
			}
		}

		fetchSpecialities()
		loadDoctorProfile()
	}, [])

	const syncProfileAfterSave = async () => {
		try {
			const response = await getDoctorProfile()

			if (!response?.success || !response.data) return

			const profile = mapDoctorProfileApi(response.data)
			setFormData({
				specialization_id: profile.professional.specialization_id || '',
				specialization_label: profile.professional.specialization_label || '',
				currentDesignation: profile.professional.currentDesignation || '',
				areasOfExpertise: profile.professional.areasOfExpertise || [],
				treatments: profile.professional.treatments || '',
				registrationNumber: profile.professional.registrationNumber || '',
				registrationProof: profile.professional.registrationProof || '',
				about: profile.professional.about || '',
			})
			setExperienceYears(String(response.data.professional_details?.experience_years ?? ''))

			await updateUser({
				name: profile.personal.name || user?.name || '',
				email: profile.personal.email || user?.email || '',
				avatar: profile.personal.avatar || user?.avatar,
			})
		} catch (error) {
			console.log('[ProfessionalDetailsTab] failed to sync saved profile:', error)
		}
	}

	const handleSpecialitySelect = (value: string) => {
		const selected = specialities.find((item) => item.value === value)
		setFormData((prev) => ({
			...prev,
			specialization_id: value,
			specialization_label: selected?.label || '',
		}))
	}

	const handleAddExpertise = (value: string) => {
		updateFormData('areasOfExpertise', [...formData.areasOfExpertise, value])
	}

	const handleRemoveExpertise = (index: number) => {
		updateFormData(
			'areasOfExpertise',
			formData.areasOfExpertise.filter((_, i) => i !== index)
		)
	}

	const handleSave = async () => {
		const parsedExperience = parseInt(experienceYears, 10)

		if (!formData.specialization_id) {
			Alert.alert('Validation', 'Please select your specialization.')
			return
		}

		if (experienceYears !== '' && (isNaN(parsedExperience) || parsedExperience < 0)) {
			Alert.alert('Validation', 'Please enter a valid number for years of experience.')
			return
		}

		const payload = {
			experience_years: experienceYears !== '' && !isNaN(parsedExperience) ? parsedExperience : 0,
			current_designation: formData.currentDesignation.trim(),
			areas_of_expertise: formData.areasOfExpertise,
			treatments: formData.treatments.trim(),
			registration_number: formData.registrationNumber.trim(),
			registration_proof_s3_key: formData.registrationProof.trim() || null,
			about: formData.about.trim(),
		}

		try {
			setIsSaving(true)
			await updateDoctorProfessionalDetails(payload)
			await syncProfileAfterSave()
			Alert.alert('Success', 'Professional details saved successfully.')
		} catch (error) {
			console.log('[ProfessionalDetailsTab] save error:', error)
			Alert.alert('Error', 'Unable to save professional details right now.')
		} finally {
			setIsSaving(false)
		}
	}

	const contentWidth = useMemo(() => {
		if (width >= 1280) return 760
		if (width >= 1024) return 680
		if (isTablet) return 600
		return 640
	}, [isTablet, width])

	const sectionPadding = isMobile ? 16 : isTablet ? 20 : 24
	const rowSpacing = isMobile ? 18 : isLandscape ? 22 : 20
	const selectedLabel = formData.specialization_label

	if (isLoadingProfile) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size="small" color="#0c7c7c" />
			</View>
		)
	}

	return (
		<ScrollView
			style={styles.container}
			contentContainerStyle={[
				styles.contentContainer,
				{
					paddingHorizontal: sectionPadding,
					paddingTop: sectionPadding,
					paddingBottom: rowSpacing,
				},
			]}
			keyboardShouldPersistTaps="handled"
			showsVerticalScrollIndicator={false}
		>
			<View style={[styles.contentShell, { maxWidth: contentWidth }]}>
				{/* Specialization */}
				<View style={{ marginBottom: rowSpacing }}>
					<SectionTitle>Select Specialization</SectionTitle>
					{isLoadingSpecialities ? (
						<View style={styles.inlineLoader}>
							<ActivityIndicator size="small" color="#0c7c7c" />
						</View>
					) : (
						<SelectDropdown
							label=""
							value={formData.specialization_id}
							placeholder="Select your specialization"
							options={specialities}
							onSelect={handleSpecialitySelect}
						/>
					)}
				</View>

				<View style={styles.sectionDivider} />

				{/* Professional Info */}
				<View style={{ marginTop: isMobile ? 20 : 24, marginBottom: rowSpacing }}>
					<SectionTitle>Professional Information</SectionTitle>
					<View style={{ gap: 18 }}>
						<FormRow stacked={!useTwoColumns} compact={isTablet}>
							<InputField
								label="Current Designation"
								value={formData.currentDesignation}
								onChangeText={(value) => updateFormData('currentDesignation', value)}
								placeholder="e.g. Senior Consultant"
							/>
							<InputField
								label="Years of Experience"
								value={experienceYears}
								onChangeText={(value) => setExperienceYears(value.replace(/\D/g, '').slice(0, 3))}
								placeholder="0"
								keyboardType="numeric"
								maxLength={3}
							/>
						</FormRow>

						<ChipInput
							label="Areas of Expertise"
							chips={formData.areasOfExpertise}
							onAdd={handleAddExpertise}
							onRemove={handleRemoveExpertise}
							placeholder="Add expertise..."
						/>

						<MultilineField
							label="Treatments & Procedures"
							value={formData.treatments}
							onChangeText={(value) => updateFormData('treatments', value)}
							placeholder="List the medical procedures you perform regularly..."
							helperText="Separate items with commas for better readability."
						/>
					</View>
				</View>

				<View style={styles.sectionDivider} />

				{/* Registration Details */}
				<View style={{ marginTop: isMobile ? 20 : 24, marginBottom: rowSpacing }}>
					<SectionTitle>Registration Details and Proofs</SectionTitle>
					<View style={{ gap: 18 }}>
						{selectedLabel ? (
							<View style={styles.noticeCard}>
								<AppTypography variant="caption" style={styles.noticeText}>
									We are asking you for registration details because you have selected{' '}
									<AppTypography variant="caption" style={styles.noticeTextStrong}>
										{selectedLabel}
									</AppTypography>{' '}
									as a speciality
								</AppTypography>
							</View>
						) : null}

						<InputField
							label="Registration Number"
							value={formData.registrationNumber}
							onChangeText={(value) => updateFormData('registrationNumber', value)}
							placeholder="Enter registration number"
							required
						/>

						<InputField
							label="About / Bio"
							value={formData.about}
							onChangeText={(value) => updateFormData('about', value)}
							placeholder="Write a short bio about yourself"
						/>
					</View>
				</View>

				<AppButton
					variant="primary"
					formAction
					style={styles.saveButton}
					onPress={handleSave}
					loading={isSaving}
					disabled={isSaving}
				>
					Save
				</AppButton>
			</View>
		</ScrollView>
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
	sectionTitle: {
		color: '#343434',
		fontSize: 18,
		lineHeight: 24,
		fontWeight: '700',
		marginBottom: 16,
	},
	sectionDivider: {
		height: 1,
		backgroundColor: '#e9eef0',
		width: '100%',
	},
	formRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		marginHorizontal: -10,
	},
	formRowCompact: {
		marginHorizontal: -8,
	},
	formRowStacked: {
		flexDirection: 'column',
		marginHorizontal: 0,
	},
	formRowAlignBottom: {
		alignItems: 'flex-end',
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
		fontSize: 14,
		lineHeight: 20,
		color: '#8f8f8f',
		fontWeight: '500',
	},
	requiredMark: {
		color: '#ef5d5d',
		fontSize: 14,
		lineHeight: 20,
		fontWeight: '600',
	},
	aboutInput: {
		minHeight: 120,
		height: 120,
	},
	aboutInputContent: {
		minHeight: 100,
		height: 100,
		paddingTop: 12,
		paddingBottom: 12,
	},
	// Chip input
	chipsContainer: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
		marginBottom: 10,
	},
	chip: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: 'rgba(43,111,113,0.08)',
		borderWidth: 1,
		borderColor: 'rgba(43,111,113,0.25)',
		borderRadius: 20,
		paddingHorizontal: 12,
		paddingVertical: 5,
		gap: 5,
	},
	chipText: {
		color: '#1f6e71',
		fontSize: 13,
		lineHeight: 18,
		fontWeight: '500',
	},
	chipRemove: {
		marginLeft: 2,
	},
	chipInputRow: {
		flexDirection: 'row',
		alignItems: 'center',
		borderWidth: 1,
		borderColor: '#d4dfe1',
		borderRadius: 10,
		backgroundColor: '#fafcfc',
		overflow: 'hidden',
	},
	chipTextInput: {
		flex: 1,
		height: 46,
		paddingHorizontal: 14,
		fontSize: 14,
		color: '#343434',
	},
	chipAddButton: {
		width: 44,
		height: 46,
		alignItems: 'center',
		justifyContent: 'center',
		borderLeftWidth: 1,
		borderLeftColor: '#e9eef0',
	},
	suggestionsRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 7,
		marginTop: 10,
	},
	suggestionChip: {
		borderWidth: 1,
		borderColor: '#c8d8db',
		borderRadius: 20,
		borderStyle: 'dashed',
		paddingHorizontal: 11,
		paddingVertical: 4,
	},
	suggestionChipText: {
		color: '#6e8e90',
		fontSize: 12,
		lineHeight: 18,
	},
	// Multiline field
	multilineInput: {
		minHeight: 110,
		height: 110,
	},
	multilineInputContent: {
		minHeight: 90,
		height: 90,
		paddingTop: 12,
		paddingBottom: 12,
	},
	helperText: {
		marginTop: 6,
		color: '#9a9a9a',
		fontSize: 12,
		lineHeight: 17,
	},
	noticeCard: {
		backgroundColor: 'rgba(43,111,113,0.07)',
		borderWidth: 1,
		borderColor: 'rgba(43,111,113,0.2)',
		borderRadius: 8,
		paddingHorizontal: 14,
		paddingVertical: 12,
	},
	noticeText: {
		color: '#215d60',
		fontSize: 12.5,
		lineHeight: 18,
	},
	noticeTextStrong: {
		color: '#215d60',
		fontSize: 12.5,
		lineHeight: 18,
		fontWeight: '700',
	},
	inlineLoader: {
		minHeight: 56,
		alignItems: 'center',
		justifyContent: 'center',
	},
	saveButton: {
		alignSelf: 'stretch',
		marginTop: 0,
		width: '100%',
	},
})
