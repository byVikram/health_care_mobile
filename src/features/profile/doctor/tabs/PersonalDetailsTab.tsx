import React, { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Alert } from 'react-native'
import {
	FlatList,
	Modal,
	Platform,
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
import { useAuth } from '../../../../context/AuthContext'
import { getDoctorProfile, mapDoctorProfileApi } from '../../../doctor/doctorService'
import { doctorService } from '../../../consultation/ConsultationService'

const GENDER_OPTIONS = ['Female', 'Male', 'Non-binary', 'Prefer not to say']
const LANGUAGE_OPTIONS = ['English', 'Hindi', 'Tamil', 'Telugu', 'Kannada', 'Malayalam', 'Marathi', 'Bengali']

type InputFieldProps = {
	label: string
	value: string
	onChangeText: (value: string) => void
	placeholder: string
	keyboardType?: React.ComponentProps<typeof TextInput>['keyboardType']
	autoCapitalize?: React.ComponentProps<typeof TextInput>['autoCapitalize']
	maxLength?: number
	rightIcon?: React.ComponentProps<typeof MaterialCommunityIcons>['name']
	rightIconColor?: string
	onFocus?: () => void
	onBlur?: () => void
	leftText?: string
}

type SelectDropdownProps = {
	label: string
	value?: string
	placeholder: string
	options: string[]
	onSelect: (value: string) => void
	isMobile: boolean
}

type MultiSelectDropdownProps = {
	label: string
	values: string[]
	placeholder: string
	options: string[]
	onChange: (values: string[]) => void
	isMobile: boolean
}

function FormRow({
	children,
	stacked,
	compact,
}: {
	children: React.ReactNode
	stacked: boolean
	compact: boolean
}) {
	return (
		<View style={[styles.formRow, stacked && styles.formRowStacked, compact && styles.formRowCompact]}>
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
	keyboardType = 'default',
	autoCapitalize = 'sentences',
	maxLength,
	rightIcon,
	rightIconColor = '#1f8a8f',
	onFocus,
	onBlur,
	leftText,
}: InputFieldProps) {
	return (
		<View style={styles.fieldGroup}>
			<FieldLabel label={label} />
			<View style={styles.inputShell}>
				{leftText ? (
					<View style={styles.leftPrefix}>
						<AppTypography variant="body" style={styles.leftPrefixText}>
							{leftText}
						</AppTypography>
					</View>
				) : null}
				<TextInput
					value={value}
					onChangeText={onChangeText}
					placeholder={placeholder}
					placeholderTextColor="#9a9a9a"
					style={styles.textInput}
					keyboardType={keyboardType}
					autoCapitalize={autoCapitalize}
					maxLength={maxLength}
					onFocus={onFocus}
					onBlur={onBlur}
				/>
				{rightIcon ? <MaterialCommunityIcons name={rightIcon} size={20} color={rightIconColor} /> : null}
			</View>
		</View>
	)
}

function SelectDropdown({ label, value, placeholder, options, onSelect, isMobile }: SelectDropdownProps) {
	const [visible, setVisible] = useState(false)

	return (
		<View style={styles.fieldGroup}>
			<FieldLabel label={label} />
			<>
				<Pressable style={styles.inputShell} onPress={() => setVisible(true)}>
					<AppTypography variant="body" style={[styles.selectText, !value && styles.placeholderText]}>
						{value || placeholder}
					</AppTypography>
					<MaterialCommunityIcons name="chevron-down" size={20} color="#2c7b80" />
				</Pressable>
				<Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
					<Pressable style={styles.modalOverlay} onPress={() => setVisible(false)}>
						<Pressable style={[styles.modalCard, isMobile && styles.modalCardMobile]} onPress={(event) => event.stopPropagation()}>
							<View style={styles.modalHeader}>
								<AppTypography variant="h4" style={styles.modalTitle}>
									{label}
								</AppTypography>
								<TouchableOpacity onPress={() => setVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
									<MaterialCommunityIcons name="close" size={22} color="#45636d" />
								</TouchableOpacity>
							</View>
							<FlatList
								data={options}
								keyExtractor={(item) => item}
								renderItem={({ item }) => {
									const isSelected = item === value
									return (
										<TouchableOpacity
											style={[styles.optionRow, isSelected && styles.optionRowSelected]}
											onPress={() => {
												onSelect(item)
												setVisible(false)
											}}
										>
											<AppTypography variant="body" style={[styles.optionText, isSelected && styles.optionTextSelected]}>
												{item}
											</AppTypography>
											{isSelected ? <MaterialCommunityIcons name="check-circle" size={20} color="#24a148" /> : null}
										</TouchableOpacity>
									)
								}}
							/>
						</Pressable>
					</Pressable>
				</Modal>
			</>
		</View>
	)
}

function MultiSelectDropdown({ label, values, placeholder, options, onChange, isMobile }: MultiSelectDropdownProps) {
	const [visible, setVisible] = useState(false)
	const selectedValues = useMemo(() => normalizeLanguageValues(values), [values])
	const selectedValueSet = useMemo(() => new Set(selectedValues), [selectedValues])
	const displayValue = selectedValues.join(', ')

	const toggleValue = (item: string) => {
		if (selectedValueSet.has(item)) {
			onChange(selectedValues.filter((value) => value !== item))
			return
		}

		onChange([...selectedValues, item])
	}

	return (
		<View style={styles.fieldGroup}>
			<FieldLabel label={label} />
			<>
				<Pressable style={styles.inputShell} onPress={() => setVisible(true)}>
					<AppTypography variant="body" style={[styles.selectText, !displayValue && styles.placeholderText]} numberOfLines={1}>
						{displayValue || placeholder}
					</AppTypography>
					<MaterialCommunityIcons name="chevron-down" size={20} color="#2c7b80" />
				</Pressable>
				<Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
					<Pressable style={styles.modalOverlay} onPress={() => setVisible(false)}>
						<Pressable style={[styles.modalCard, isMobile && styles.modalCardMobile]} onPress={(event) => event.stopPropagation()}>
							<View style={styles.modalHeader}>
								<AppTypography variant="h4" style={styles.modalTitle}>
									{label}
								</AppTypography>
								<TouchableOpacity onPress={() => setVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
									<MaterialCommunityIcons name="close" size={22} color="#45636d" />
								</TouchableOpacity>
							</View>
							<FlatList
								data={options}
								keyExtractor={(item) => item}
								renderItem={({ item }) => {
									const isSelected = selectedValueSet.has(item)
									return (
										<TouchableOpacity
											style={[styles.optionRow, isSelected && styles.optionRowSelected]}
											onPress={() => toggleValue(item)}
										>
											<AppTypography variant="body" style={[styles.optionText, isSelected && styles.optionTextSelected]}>
												{item}
											</AppTypography>
											<MaterialCommunityIcons
												name={isSelected ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'}
												size={20}
												color={isSelected ? '#24a148' : '#9ca3af'}
											/>
										</TouchableOpacity>
									)
								}}
							/>
							<View style={styles.modalActions}>
								<TouchableOpacity style={styles.doneButton} onPress={() => setVisible(false)}>
									<AppTypography variant="body" style={styles.doneButtonText}>
										Done
									</AppTypography>
								</TouchableOpacity>
							</View>
						</Pressable>
					</Pressable>
				</Modal>
			</>
		</View>
	)
}

const formatDateInput = (rawValue: string) => {
	const digits = rawValue.replace(/\D/g, '').slice(0, 8)

	if (digits.length <= 2) return digits
	if (digits.length <= 4) return `${digits.slice(0, 2)}-${digits.slice(2)}`
	return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`
}

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
const isValidPhone = (value: string) => value.replace(/\D/g, '').length >= 10
const matchOptionValue = (value: string, options: string[]) => {
	const normalizedValue = value.trim().toLowerCase()
	return options.find((option) => option.toLowerCase() === normalizedValue) ?? value.trim()
}

const normalizeGenderValue = (value?: string) => (value ? matchOptionValue(value, GENDER_OPTIONS) : '')
const normalizeLanguageValues = (value?: string[] | string | null) => {
	const languages = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : []
	return Array.from(new Set(languages.map((language) => matchOptionValue(language, LANGUAGE_OPTIONS)).filter(Boolean)))
}

type PersonalDetailsFormData = {
	name: string
	email: string
	mobile: string
	gender: string
	dob: string
	experience: string
	registrationNumber: string
	languages: string[]
	location: string
}

const formatDobForDisplay = (value?: string) => {
	if (!value) return ''
	if (/^\d{2}-\d{2}-\d{4}$/.test(value)) return value
	const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
	return match ? `${match[3]}-${match[2]}-${match[1]}` : value
}

const formatDobForApi = (value: string) => {
	const match = value.match(/^(\d{2})-(\d{2})-(\d{4})$/)
	return match ? `${match[3]}-${match[2]}-${match[1]}` : value
}

export default function PersonalDetailsTab() {
	const { user, updateUser } = useAuth()
	const { width } = useWindowDimensions()

	const isTablet = width >= 768 && width < 1024
	const isMobile = width < 768
	const useTwoColumns = width >= 768

	const [formData, setFormData] = useState<PersonalDetailsFormData>({
		name: user?.name || '',
		email: user?.email || '',
		mobile: '',
		gender: '',
		dob: '',
		experience: '',
		registrationNumber: '',
		languages: [],
		location: '',
	})
	const [focusedField, setFocusedField] = useState('')
	const [isLoadingProfile, setIsLoadingProfile] = useState(false)
	const [isSaving, setIsSaving] = useState(false)

	const updateFormData = <K extends keyof PersonalDetailsFormData>(key: K, value: PersonalDetailsFormData[K]) => {
		setFormData((prev) => ({
			...prev,
			[key]: value,
		}))
	}

	useEffect(() => {
		const loadDoctorProfile = async () => {
			try {
				setIsLoadingProfile(true)
				const response = await getDoctorProfile()

				if (!response?.success || !response.data) return

				const profile = mapDoctorProfileApi(response.data)
				setFormData({
					name: profile.personal.name || user?.name || '',
					email: profile.personal.email || user?.email || '',
					mobile: response.data.personal_details?.contact_number || '',
					gender: normalizeGenderValue(profile.personal.gender),
					dob: formatDobForDisplay(profile.personal.dateOfBirth),
					experience: profile.personal.experience || '',
					registrationNumber: profile.professional.registrationNumber || '',
					languages: normalizeLanguageValues(profile.personal.languages),
					location: profile.personal.location || '',
				})
			} catch (error) {
				console.error('[PersonalDetailsTab] failed to load doctor profile:', error)
			} finally {
				setIsLoadingProfile(false)
			}
		}

		loadDoctorProfile()
	}, [])

	const handleSave = async () => {
		debugger
		console.log('Saving personal details with formData:', formData)
		const trimmedName = formData.name.trim()
		const trimmedEmail = formData.email.trim()
		const trimmedLocation = formData.location.trim()
		const formattedDob = formatDobForApi(formData.dob.trim())
		const experienceYears = formData.experience ? Number(formData.experience) : 0
		const normalizedMobile = formData.mobile.replace(/\D/g, '')
		const normalizedGender = normalizeGenderValue(formData.gender)
		const normalizedLanguages = normalizeLanguageValues(formData.languages)
		const trimmedRegistrationNumber = formData.registrationNumber.trim()

		if (!trimmedName) {
			Alert.alert('Validation', 'Full name is required.')
			return
		}

		if (trimmedEmail && !isValidEmail(trimmedEmail)) {
			Alert.alert('Validation', 'Please enter a valid email address.')
			return
		}

		if (normalizedMobile && !isValidPhone(normalizedMobile)) {
			Alert.alert('Validation', 'Please enter a valid mobile number.')
			return
		}

		if (formData.dob.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(formattedDob)) {
			Alert.alert('Validation', 'Please enter DOB in DD-MM-YYYY format.')
			return
		}

		try {
			setIsSaving(true)

			const payload = {
				name: trimmedName,
				email: trimmedEmail,
				location: trimmedLocation,
				gender: normalizedGender,
				languages: normalizedLanguages,
				contact_number: normalizedMobile,
				date_of_birth: formattedDob,
				experience_years: Number.isFinite(experienceYears) ? experienceYears : 0,
				registration_number: trimmedRegistrationNumber,
			}

			await doctorService.updateDoctorProfile(payload)
			await updateUser({
				name: trimmedName,
				email: trimmedEmail || user?.email,
			})
			setFormData((prev) => ({
				...prev,
				name: trimmedName,
				email: trimmedEmail,
				location: trimmedLocation,
				mobile: normalizedMobile,
				gender: normalizedGender,
				dob: formData.dob.trim(),
				languages: normalizedLanguages,
				experience: String(Number.isFinite(experienceYears) ? experienceYears : 0),
				registrationNumber: trimmedRegistrationNumber,
			}))
			Alert.alert('Success', 'Personal details saved successfully/.')
		} catch (err) {
			console.error('[PersonalDetailsTab] save error:', err)
			Alert.alert('Error', 'Unable to save personal details right now.')
		} finally {
			setIsSaving(false)
		}
	}

	const contentWidth = useMemo(() => {
		if (width >= 1280) return 980
		if (width >= 1024) return 920
		if (isTablet) return 820
		return 640
	}, [isTablet, width])

	const sectionPadding = isMobile ? 16 : isTablet ? 20 : 24
	const rowSpacing = isMobile ? 16 : isTablet ? 18 : 20
	const titleBottom = isMobile ? 18 : 22

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
					paddingBottom: 0,
				},
			]}
			keyboardShouldPersistTaps="handled"
			showsVerticalScrollIndicator={false}
		>	
			
			<View style={[styles.contentShell, { maxWidth: contentWidth }]}>
				<AppTypography variant="h3" style={[styles.title, { marginBottom: titleBottom }]}>
					Personal Details
				</AppTypography>

				<View style={{ marginBottom: rowSpacing }}>
					<InputField
						label="Full name"
						value={formData.name}
						onChangeText={(value) => updateFormData('name', value)}
						placeholder="Enter full name"
						autoCapitalize="words"
						rightIcon="pencil-outline"
						onFocus={() => setFocusedField('fullName')}
						onBlur={() => setFocusedField('')}
					/>
				</View>

				<View style={{ marginBottom: rowSpacing }}>
					<InputField
						label="Registration Number"
						value={formData.registrationNumber}
						onChangeText={(value) => updateFormData('registrationNumber', value)}
						placeholder="Enter registration number"
						autoCapitalize="characters"
						rightIcon={focusedField === 'registrationNumber' ? 'pencil-outline' : undefined}
						onFocus={() => setFocusedField('registrationNumber')}
						onBlur={() => setFocusedField('')}
					/>
				</View>

				<View style={{ marginBottom: rowSpacing }}>
					<InputField
						label="Location"
						value={formData.location}
						onChangeText={(value) => updateFormData('location', value)}
						placeholder="Enter location"
						autoCapitalize="words"
						rightIcon="pencil-outline"
						onFocus={() => setFocusedField('location')}
						onBlur={() => setFocusedField('')}
					/>
				</View>

				<View style={{ marginBottom: rowSpacing }}>
					<FormRow stacked={!useTwoColumns} compact={isTablet}>
						<InputField
							label="Mobile Number"
							value={formData.mobile}
							onChangeText={(value) => updateFormData('mobile', value.replace(/\D/g, ''))}
							placeholder="Enter mobile number"
							keyboardType="phone-pad"
							leftText="+91"
							rightIcon={isValidPhone(formData.mobile) ? 'check-circle' : undefined}
							rightIconColor="#24a148"
							onFocus={() => setFocusedField('mobileNumber')}
							onBlur={() => setFocusedField('')}
						/>
						<InputField
							label="Email ID"
							value={formData.email}
							onChangeText={(value) => updateFormData('email', value)}
							placeholder="Enter email"
							keyboardType="email-address"
							autoCapitalize="none"
							rightIcon={isValidEmail(formData.email) ? 'check-circle' : undefined}
							rightIconColor="#24a148"
							onFocus={() => setFocusedField('email')}
							onBlur={() => setFocusedField('')}
						/>
					</FormRow>
				</View>

				<View style={{ marginBottom: rowSpacing }}>
					<FormRow stacked={!useTwoColumns} compact={isTablet}>
						<SelectDropdown
							label="Gender"
							value={formData.gender}
							placeholder="Select your gender"
							options={GENDER_OPTIONS}
							onSelect={(value) => updateFormData('gender', value)}
							isMobile={isMobile}
						/>
						<InputField
							label="DOB"
							value={formData.dob}
							onChangeText={(value) => updateFormData('dob', formatDateInput(value))}
							placeholder="DD-MM-YYYY"
							keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'numeric'}
							maxLength={10}
							rightIcon="pencil-outline"
							onFocus={() => setFocusedField('dob')}
							onBlur={() => setFocusedField('')}
						/>
					</FormRow>
				</View>

				<View style={{ marginBottom: rowSpacing }}>
					<InputField
						label="Total year of experience"
						value={formData.experience}
						onChangeText={(value) => updateFormData('experience', value.replace(/[^\d.]/g, ''))}
						placeholder="Enter years of experience"
						keyboardType="numeric"
						rightIcon={focusedField === 'experience' ? 'pencil-outline' : undefined}
						onFocus={() => setFocusedField('experience')}
						onBlur={() => setFocusedField('')}
					/>
				</View>

				<View style={{ marginBottom: rowSpacing }}>
					<MultiSelectDropdown
						label="Languages Known"
						values={formData.languages}
						placeholder="Select languages"
						options={LANGUAGE_OPTIONS}
						onChange={(values) => updateFormData('languages', values)}
						isMobile={isMobile}
					/>
				</View>

				<TouchableOpacity
					style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
					onPress={handleSave}
					disabled={isSaving}
					activeOpacity={0.85}
				>
					{isSaving ? (
						<ActivityIndicator size="small" color="#ffffff" />
					) : (
						<AppTypography variant="body" style={styles.saveButtonText}>
							Save / Continue
						</AppTypography>
					)}
				</TouchableOpacity>
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
	title: {
		color: '#343434',
		fontSize: 22,
		fontWeight: '600',
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
	inputShell: {
		minHeight: 42,
		borderWidth: 1,
		borderColor: '#a7d3db',
		borderRadius: 8,
		paddingHorizontal: 14,
		backgroundColor: '#ffffff',
		flexDirection: 'row',
		alignItems: 'center',
	},
	leftPrefix: {
		marginRight: 4,
	},
	leftPrefixText: {
		color: '#303030',
		fontSize: 14,
	},
	textInput: {
		flex: 1,
		paddingVertical: Platform.OS === 'web' ? 12 : 10,
		paddingHorizontal: 0,
		fontSize: 14,
		lineHeight: 20,
		color: '#2f2f2f',
	},
	selectText: {
		flex: 1,
		fontSize: 14,
		lineHeight: 20,
		color: '#2f2f2f',
	},
	placeholderText: {
		color: '#9a9a9a',
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(18, 28, 33, 0.28)',
		justifyContent: 'center',
		paddingHorizontal: 20,
	},
	modalCard: {
		width: '100%',
		maxWidth: 420,
		alignSelf: 'center',
		backgroundColor: '#ffffff',
		borderRadius: 16,
		paddingVertical: 8,
		maxHeight: '70%',
	},
	modalCardMobile: {
		maxWidth: '100%',
	},
	modalHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 18,
		paddingTop: 10,
		paddingBottom: 8,
	},
	modalTitle: {
		color: '#343434',
	},
	optionRow: {
		minHeight: 48,
		paddingHorizontal: 18,
		paddingVertical: 12,
		borderTopWidth: 1,
		borderTopColor: '#eef4f5',
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	optionRowSelected: {
		backgroundColor: '#f5fbfb',
	},
	optionText: {
		color: '#2f2f2f',
	},
	optionTextSelected: {
		color: '#1d6d71',
		fontWeight: '600',
	},
	modalActions: {
		paddingHorizontal: 18,
		paddingVertical: 12,
		borderTopWidth: 1,
		borderTopColor: '#eef4f5',
		alignItems: 'flex-end',
	},
	doneButton: {
		minWidth: 96,
		borderRadius: 8,
		backgroundColor: '#0c7c7c',
		paddingHorizontal: 16,
		paddingVertical: 10,
		alignItems: 'center',
	},
	doneButtonText: {
		color: '#ffffff',
		fontWeight: '600',
	},
	saveButton: {
		marginTop: 24,
		alignSelf: 'flex-start',
		minWidth: 160,
		paddingHorizontal: 20,
		paddingVertical: 12,
		borderRadius: 10,
		backgroundColor: '#0c7c7c',
		alignItems: 'center',
		justifyContent: 'center',
	},
	saveButtonDisabled: {
		opacity: 0.7,
	},
	saveButtonText: {
		color: '#ffffff',
		fontWeight: '600',
	},
})
