import React, { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Alert, KeyboardAvoidingView } from 'react-native'
import {
	ScrollView,
	StyleSheet,
	View,
	useWindowDimensions,
} from 'react-native'
import { safeJsonParse } from '../../../../utils/jsonUtils'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import {
	AppCalendar,
	AppInput,
	AppMultiSelect,
	AppPhotoPicker,
	type AppPhotoPickerUpload,
	AppSelect,
	AppSelectOption,
	AppTypography,
	AppStickyFooter,
	StatusModal,
} from '../../../../components/common'
import { useAuth } from '../../../../context/AuthContext'
import {
	fetchProviderProfileBackend,
	updateProviderProfileBackend,
} from '../../../ancillary/ancillaryService'
import {
	personalDetailsSchema,
	getFieldErrors,
} from '../../../../validation/profileSchemas'
import { NEW_PHYSIOTHERAPIST_IMAGE_URL } from '../specialtyConfig'

const GENDER_OPTIONS = ['Female', 'Male', 'Non-binary', 'Prefer not to say']
const LANGUAGE_OPTIONS = ['English', 'Hindi', 'Tamil', 'Telugu', 'Kannada', 'Malayalam', 'Marathi', 'Bengali']

const GENDER_SELECT_OPTIONS: AppSelectOption[] = GENDER_OPTIONS.map((option) => ({ label: option, value: option }))
const LANGUAGE_SELECT_OPTIONS: AppSelectOption[] = LANGUAGE_OPTIONS.map((option) => ({ label: option, value: option }))

const DEFAULT_PROFILE_IMAGE = require('../../../../assets/Banner/doctor.png')
const PHYSIOTHERAPY_PROFILE_IMAGE = require('../../../../assets/physiotherapy/physiotherapist.png')

type InputFieldProps = {
	label: string
	value: string
	onChangeText: (value: string) => void
	placeholder: string
	keyboardType?: React.ComponentProps<typeof AppInput>['keyboardType']
	autoCapitalize?: React.ComponentProps<typeof AppInput>['autoCapitalize']
	maxLength?: number
	rightIcon?: React.ComponentProps<typeof MaterialCommunityIcons>['name']
	rightIconColor?: string
	onFocus?: () => void
	onBlur?: () => void
	leftText?: string
	errorText?: string
	required?: boolean
	editable?: boolean
}

type SelectDropdownProps = {
	label: string
	value?: string
	placeholder: string
	options: AppSelectOption[]
	onSelect: (value: string) => void
	required?: boolean
	errorText?: string
}

type MultiSelectDropdownProps = {
	label: string
	values: string[]
	placeholder: string
	options: AppSelectOption[]
	onChange: (values: string[]) => void
	required?: boolean
	errorText?: string
}

type DobPickerFieldProps = {
	label: string
	value: string
	onChange: (value: string) => void
	placeholder: string
	isMobile: boolean
	required?: boolean
	errorText?: string
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

function FieldLabel({ label, required = false }: { label: string; required?: boolean }) {
	return (
		<AppTypography variant="caption" style={styles.fieldLabel}>
			{label}
			{required ? <AppTypography variant="caption" style={styles.requiredMark}> *</AppTypography> : null}
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
	autoCapitalize = 'sentences',
	maxLength,
	rightIcon,
	rightIconColor = '#1f8a8f',
	onFocus,
	onBlur,
	leftText,
	errorText,
	required = false,
	editable = true,
}: InputFieldProps) {
	return (
		<View style={styles.fieldGroup}>
			<FieldLabel label={label} required={required} />
			<AppInput
				value={value}
				onChangeText={onChangeText}
				placeholder={placeholder}
				placeholderTextColor="#9a9a9a"
				keyboardType={keyboardType}
				autoCapitalize={autoCapitalize}
				maxLength={maxLength}
				onFocus={onFocus}
				onBlur={onBlur}
				editable={editable}
				errorText={errorText}
				fieldSize="compact"
				noMargin
				dense
				style={!editable ? styles.readOnlyInput : undefined}
				left={leftText ? <AppInput.Affix text={leftText} textStyle={styles.leftPrefixText} /> : undefined}
				right={rightIcon ? <AppInput.Icon icon={rightIcon} color={rightIconColor} /> : undefined}
			/>
		</View>
	)
}

function SelectDropdown({ label, value, placeholder, options, onSelect, required = false, errorText }: SelectDropdownProps) {
	return (
		<View style={styles.fieldGroup}>
			<FieldLabel label={label} required={required} />
			<AppSelect
				value={value}
				placeholder={placeholder}
				options={options}
				onSelect={onSelect}
				borderRadius={8}
				size="compact"
				noMargin
				style={styles.selectRightAligned}
				errorText={errorText}
			/>
		</View>
	)
}

function MultiSelectDropdown({ label, values, placeholder, options, onChange, required = false, errorText }: MultiSelectDropdownProps) {
	const selectedValues = useMemo(() => normalizeLanguageValues(values), [values])

	return (
		<View style={styles.fieldGroup}>
			<FieldLabel label={label} required={required} />
			<AppMultiSelect
				values={selectedValues}
				placeholder={placeholder}
				options={options}
				onChange={(nextValues) => onChange(normalizeLanguageValues(nextValues))}
				borderRadius={8}
				size="compact"
				noMargin
				errorText={errorText}
			/>
		</View>
	)
}

function DobPickerField({ label, value, onChange, placeholder, isMobile, required = false, errorText }: DobPickerFieldProps) {
	return (
		<View style={styles.fieldGroup}>
			<AppCalendar
				label={label}
				value={value}
				onChange={onChange}
				placeholder={placeholder}
				isMobile={isMobile}
				required={required}
				modalTitle="Select DOB"
			/>
			{errorText ? (
				<AppTypography variant="caption" style={styles.fieldErrorText}>
					{errorText}
				</AppTypography>
			) : null}
		</View>
	)
}

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
const isValidPhone = (value: string) => value.replace(/\D/g, '').length >= 10
const isValidProfileUrl = (value: string, allowedHosts: string[]) => {
	const trimmedValue = value.trim()
	if (!trimmedValue) return true

	try {
		const url = new URL(trimmedValue)
		const host = url.hostname.toLowerCase()
		const pathSegments = url.pathname.split('/').filter(Boolean)
		return (
			(url.protocol === 'https:' || url.protocol === 'http:') &&
			allowedHosts.includes(host) &&
			pathSegments.length === 1
		)
	} catch {
		return false
	}
}

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
	languages: string[]
	location: string
	
}

export const formatDobForDisplay = (value?: string): string => {
	if (!value) return ''
	const trimmed = value.trim()
	if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) return trimmed
	const match = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
	if (match) {
		const year = match[1]
		const month = match[2].padStart(2, '0')
		const day = match[3].padStart(2, '0')
		return `${day}-${month}-${year}`
	}
	return trimmed
}

export const formatDobForStorage = (value: string): string => {
	if (!value) return ''
	const trimmed = value.trim()
	if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed
	const match = trimmed.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/)
	if (match) {
		const day = match[1].padStart(2, '0')
		const month = match[2].padStart(2, '0')
		const year = match[3]
		return `${year}-${month}-${day}`
	}
	return trimmed
}

export default function PersonalDetailsTab({
	isActive,
	onNextTab,
	specialtyKey,
}: {
	isActive?: boolean
	onNextTab?: () => void
	specialtyKey?: string
}) {
	const { user, updateUser, ancillarySpecialty } = useAuth()
	const { width } = useWindowDimensions()
	const currentSpecialty = specialtyKey || ancillarySpecialty

	const isTablet = width >= 768 && width < 1024
	const isMobile = width < 768
	const useTwoColumns = width >= 768

	const [formData, setFormData] = useState<PersonalDetailsFormData>({
		name: user?.name || '',
		email: user?.email || '',
		mobile: '',
		gender: '',
		dob: '',
		languages: [],
		location: '',
	})

	const [focusedField, setFocusedField] = useState('')
	const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
	const [isLoadingProfile, setIsLoadingProfile] = useState(false)
	const [isSaving, setIsSaving] = useState(false)
	const [statusModal, setStatusModal] = useState<{
		visible: boolean
		status: 'success' | 'error'
		title: string
		description: string
		submitText?: string
	} | null>(null)
	const [profilePhotoUri, setProfilePhotoUri] = useState(user?.avatar || '')
	const [profilePhotoUpload, setProfilePhotoUpload] = useState<AppPhotoPickerUpload | null>(null)
	const [isProfilePhotoRemoved, setIsProfilePhotoRemoved] = useState(false)

	const updateFormData = <K extends keyof PersonalDetailsFormData>(key: K, value: PersonalDetailsFormData[K]) => {
		setFormData((prev) => ({
			...prev,
			[key]: value,
		}))
	}

	const handleFieldChange = <K extends keyof PersonalDetailsFormData>(
		field: K,
		value: PersonalDetailsFormData[K]
	) => {
		if (field === 'dob') {
			console.log('[DOB] Current state:', formData.dob)
			console.log('[DOB] New DOB:', value)
		}
		updateFormData(field, value)
		if (fieldErrors[field as string]) {
			setFieldErrors((prev) => {
				const next = { ...prev }
				delete next[field as string]
				return next
			})
		}
	}


	// Backend database (users.contact_number / users.email / ancillary_providers.avatar_s3_key /
	// ancillary_providers.name / ancillary_providers.date_of_birth / ancillary_providers.gender /
	// ancillary_providers.location / ancillary_providers.languages via GET /api/ancillary/me/profile)
	// is the single source of truth for name, email, mobile number (contact_number), DOB, gender, location, languages, and avatar.
	useEffect(() => {
		const loadAncillaryProfile = async () => {
			if (isActive === false) return
			try {
				setIsLoadingProfile(true)

				// 1. Fetch authoritative profile from backend
				const backendProfile = await fetchProviderProfileBackend()
				console.log(
					'[Ancillary Profile] GET PROFILE RESPONSE:',
					JSON.stringify(backendProfile, null, 2)
				)

				if (!backendProfile) {
					console.warn('[PersonalDetailsTab] fetchProviderProfileBackend returned null, retaining existing form data')
					return
				}

				const rawMobile = backendProfile?.contact_number || backendProfile?.mobile_number || ''
				const backendMobile = rawMobile.replace(/\D/g, '').slice(-10)
				const backendEmail = backendProfile?.email || user?.email || ''
				const backendName = backendProfile?.name || user?.name || ''
				const backendDob = backendProfile?.date_of_birth || ''
				const backendGender = backendProfile?.gender || ''
				const backendLocation = backendProfile?.location || ''
				const backendLanguages = backendProfile?.languages || []
				const defaultAvatar = (currentSpecialty === 'physiotherapy' ? NEW_PHYSIOTHERAPIST_IMAGE_URL : '')
				const backendAvatar = backendProfile?.avatar_s3_key || defaultAvatar || ''

				setProfilePhotoUri(backendAvatar)
				setProfilePhotoUpload(null)
				setIsProfilePhotoRemoved(false)
				setFormData({
					name: backendName,
					email: backendEmail,
					mobile: backendMobile,
					gender: normalizeGenderValue(backendGender),
					dob: formatDobForDisplay(backendDob),
					languages: normalizeLanguageValues(backendLanguages),
					location: backendLocation,
				})

				// Sync AuthContext user session so navigation/sidebar reflect real backend avatar & name
				if (backendAvatar && backendAvatar !== user?.avatar) {
					await updateUser({ avatar: backendAvatar, name: backendName || user?.name })
				}
			} catch (error) {
				console.error('[PersonalDetailsTab] failed to load ancillary personal details:', error)
			} finally {
				setIsLoadingProfile(false)
			}
		}

		loadAncillaryProfile()
	}, [isActive])

	const handleSave = async () => {
		// Complete form validation using shared Zod schema and getFieldErrors pattern
		const errors = getFieldErrors(personalDetailsSchema, formData)
		setFieldErrors(errors)

		if (Object.keys(errors).length > 0) {
			return
		}

		const trimmedName = formData.name.trim()
		const trimmedEmail = formData.email.trim()
		const trimmedLocation = formData.location.trim()
		const formattedDob = formatDobForStorage(formData.dob.trim())
		const normalizedMobile = formData.mobile.replace(/\D/g, '')
		const normalizedGender = normalizeGenderValue(formData.gender)
		const normalizedLanguages = normalizeLanguageValues(formData.languages)

		try {
			setIsSaving(true)

			const photoToSave = isProfilePhotoRemoved
				? ''
				: (profilePhotoUpload?.uri ?? profilePhotoUri ?? (currentSpecialty === 'physiotherapy' ? NEW_PHYSIOTHERAPIST_IMAGE_URL : '') ?? '')

			// Persist to backend database (authoritative source of truth).
			// Explicit mapping:
			// - formData.name -> payload.name -> backend AncillaryProvider.name
			// - formData.email -> payload.email -> backend users.email
			// - formData.mobile -> payload.mobile_number -> backend users.contact_number
			// - formData.dob -> payload.date_of_birth -> backend AncillaryProvider.date_of_birth
			// - formData.gender -> payload.gender -> backend AncillaryProvider.gender
			// - formData.location -> payload.location -> backend AncillaryProvider.location
			// - formData.languages -> payload.languages -> backend AncillaryProvider.languages
			// - photoToSave -> payload.avatar_s3_key -> backend AncillaryProvider.avatar_s3_key
			const payload = {
				name: trimmedName,
				email: trimmedEmail,
				mobile_number: normalizedMobile,
				date_of_birth: formattedDob,
				gender: normalizedGender,
				location: trimmedLocation,
				languages: normalizedLanguages,
				avatar_s3_key: photoToSave,
			}

			console.log(
				'[Ancillary Profile] FINAL UPDATE PAYLOAD:',
				JSON.stringify(payload, null, 2)
			)
			const backendSaveRes = await updateProviderProfileBackend(payload)
			console.log(
				'[Ancillary Profile] UPDATE RESPONSE:',
				JSON.stringify(backendSaveRes, null, 2)
			)

			// Re-fetch backend profile to confirm and strictly populate UI from backend response
			const updatedProfile = await fetchProviderProfileBackend()
			console.log('[PersonalDetails] Refetched profile:', updatedProfile)

			const authoritativeName = updatedProfile?.name || ''
			const authoritativeEmail = updatedProfile?.email || ''
			const rawAuthMobile = updatedProfile?.contact_number || updatedProfile?.mobile_number || ''
			const authoritativeMobile = rawAuthMobile.replace(/\D/g, '').slice(-10)
			const authoritativeDob = updatedProfile?.date_of_birth || ''
			const authoritativeGender = updatedProfile?.gender || ''
			const authoritativeLocation = updatedProfile?.location || ''
			const authoritativeLanguages = updatedProfile?.languages || []
			const authoritativeAvatar = updatedProfile?.avatar_s3_key || ''

			// Sync AuthContext user session so navigation/sidebar reflect updated backend values
			await updateUser({
				name: authoritativeName,
				email: authoritativeEmail || user?.email,
				avatar: authoritativeAvatar || undefined,
			})

			setFormData({
				name: authoritativeName,
				email: authoritativeEmail,
				mobile: authoritativeMobile,
				location: authoritativeLocation,
				gender: normalizeGenderValue(authoritativeGender),
				dob: formatDobForDisplay(authoritativeDob),
				languages: normalizeLanguageValues(authoritativeLanguages),
			})

			setStatusModal({
				visible: true,
				status: 'success',
				title: 'Success',
				description: 'Personal details saved successfully.',
				submitText: 'Okay',
			})
		} catch (err: any) {
			console.error('[PROFILE SAVE] error:', err)
			console.error('[PROFILE SAVE] status:', err?.response?.status)
			console.error('[PROFILE SAVE] response:', err?.response?.data)
			console.error('[PROFILE SAVE] request:', err?.config?.data)
			console.error('[PROFILE SAVE] URL:', err?.config?.url)
			console.error('[Ancillary Profile] Backend update failed:', err)
			console.error('[Ancillary Profile] Status:', err?.response?.status)
			console.error('[Ancillary Profile] Response:', err?.response?.data)
			console.error('[Ancillary Profile] Request:', err?.config?.data)
			setStatusModal({
				visible: true,
				status: 'error',
				title: 'Error',
				description: err?.response?.data?.message || err?.response?.data?.detail || err?.message || 'Unable to save personal details right now.',
				submitText: 'Okay',
			})
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

	const sectionPadding = isMobile ? 16 : isTablet ? 32 : 48
	const rowSpacing = isMobile ? 16 : isTablet ? 18 : 20

	if (isLoadingProfile) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size="small" color="#0c7c7c" />
			</View>
		)
	}

	return (
		<View style={{ flex: 1 }}>
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
				<KeyboardAvoidingView style={[styles.contentShell, { maxWidth: contentWidth }]}>
					<AppPhotoPicker
						imageUri={profilePhotoUri}
						fallbackSource={currentSpecialty === 'physiotherapy' ? PHYSIOTHERAPY_PROFILE_IMAGE : DEFAULT_PROFILE_IMAGE}
						fileNamePrefix="ancillary-profile"
						onChange={({ uri, upload, removed }) => {
							setProfilePhotoUri(uri)
							setProfilePhotoUpload(upload)
							setIsProfilePhotoRemoved(removed)
						}}
					/>

					<View style={{ marginBottom: rowSpacing }}>
						<InputField
							label="Full name"
							value={formData.name}
							onChangeText={(value) => handleFieldChange('name', value)}
							placeholder="Enter full name"
							autoCapitalize="words"
							onFocus={() => setFocusedField('fullName')}
							onBlur={() => setFocusedField('')}
							errorText={fieldErrors.name}
							required
						/>
					</View>

					<View style={{ marginBottom: rowSpacing }}>
						<InputField
							label="Location / Residential Address"
							value={formData.location}
							onChangeText={(value) => handleFieldChange('location', value)}
							placeholder="Enter location or residential address"
							autoCapitalize="words"
							onFocus={() => setFocusedField('location')}
							onBlur={() => setFocusedField('')}
							errorText={fieldErrors.location}
							required
						/>
					</View>

					<View style={{ marginBottom: rowSpacing }}>
						<FormRow stacked={!useTwoColumns} compact={isTablet}>
							<InputField
								label="Mobile Number"
								value={formData.mobile}
								onChangeText={(value) => handleFieldChange('mobile', value.replace(/\D/g, ''))}
								placeholder="Enter mobile number"
								keyboardType="phone-pad"
								leftText="+91"
								rightIcon={isValidPhone(formData.mobile) ? 'check-circle' : undefined}
								rightIconColor="#24a148"
								onFocus={() => setFocusedField('mobileNumber')}
								onBlur={() => setFocusedField('')}
								errorText={fieldErrors.mobile}
								required
							/>
							<InputField
								label="Email ID"
								value={formData.email}
								onChangeText={(value) => handleFieldChange('email', value)}
								placeholder="Enter email"
								keyboardType="email-address"
								autoCapitalize="none"
								rightIcon={isValidEmail(formData.email) ? 'check-circle' : undefined}
								rightIconColor="#24a148"
								onFocus={() => setFocusedField('email')}
								onBlur={() => setFocusedField('')}
								errorText={fieldErrors.email}
								required
							/>
						</FormRow>
					</View>

					<View style={{ marginBottom: rowSpacing }}>
						<FormRow stacked={!useTwoColumns} compact={isTablet}>
							<SelectDropdown
								label="Gender"
								value={formData.gender}
								placeholder="Select your gender"
								options={GENDER_SELECT_OPTIONS}
								onSelect={(value) => handleFieldChange('gender', value)}
								errorText={fieldErrors.gender}
								required
							/>
							<DobPickerField
								label="DOB"
								value={formData.dob}
								onChange={(value) => handleFieldChange('dob', value)}
								placeholder="DD-MM-YYYY"
								isMobile={isMobile}
								errorText={fieldErrors.dob}
								required
							/>
						</FormRow>
					</View>

					<View style={{ marginBottom: rowSpacing }}>
						<MultiSelectDropdown
							label="Languages Known"
							values={formData.languages}
							placeholder="Select languages"
							options={LANGUAGE_SELECT_OPTIONS}
							onChange={(values) => handleFieldChange('languages', values)}
							errorText={fieldErrors.languages}
						/>
					</View>
				</KeyboardAvoidingView>
			</ScrollView>

			<AppStickyFooter onPress={handleSave} disabled={isSaving} loading={isSaving}>
				Save
			</AppStickyFooter>

			{statusModal && (
				<StatusModal
					visible={statusModal.visible}
					status={statusModal.status}
					title={statusModal.title}
					description={statusModal.description}
					submitText={statusModal.submitText}
					onSubmit={() => {
						const isSuccess = statusModal.status === 'success'
						setStatusModal(null)
						if (isSuccess && onNextTab) {
							onNextTab()
						}
					}}
					onCancel={() => setStatusModal(null)}
				/>
			)}
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
		width: '100%',
	},
	contentShell: {
		width: '100%',
		alignSelf: 'center',
	},
	sectionTitle: {
		color: '#343434',
		fontSize: 18,
		lineHeight: 24,
		fontWeight: '700',
		marginBottom: 16,
	},
	socialSection: {
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
	selectRightAligned: {
		alignSelf: 'flex-end',
	},
	fieldLabel: {
		marginBottom: 8,
		fontSize: 14,
		lineHeight: 20,
		color: '#8f8f8f',
		fontWeight: '500',
	},
	requiredMark: {
		color: '#d84545',
		fontSize: 12,
		lineHeight: 14,
		fontWeight: '700',
		textAlignVertical: 'top',
	},
	leftPrefixText: {
		color: '#303030',
		fontSize: 14,
	},
	readOnlyInput: {
		backgroundColor: '#f2f4f4',
		color: '#62707a',
	},
	fieldErrorText: {
		color: '#d84545',
		fontSize: 12,
		marginTop: 4,
		marginLeft: 4,
	},
})