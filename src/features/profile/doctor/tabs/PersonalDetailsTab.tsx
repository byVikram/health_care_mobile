import React, { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Alert } from 'react-native'
import {
	ScrollView,
	StyleSheet,
	View,
	useWindowDimensions,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import {
	AppButton,
	AppCalendar,
	AppInput,
	AppMultiSelect,
	AppPhotoPicker,
	type AppPhotoPickerUpload,
	AppSelect,
	AppSelectOption,
	AppTypography,
} from '../../../../components/common'
import { useAuth } from '../../../../context/AuthContext'
import { getDoctorProfile, mapDoctorProfileApi } from '../../../doctor/doctorService'
import { doctorService } from '../../../consultation/ConsultationService'

const GENDER_OPTIONS = ['Female', 'Male', 'Non-binary', 'Prefer not to say']
const LANGUAGE_OPTIONS = ['English', 'Hindi', 'Tamil', 'Telugu', 'Kannada', 'Malayalam', 'Marathi', 'Bengali']
const GENDER_SELECT_OPTIONS: AppSelectOption[] = GENDER_OPTIONS.map((option) => ({ label: option, value: option }))
const LANGUAGE_SELECT_OPTIONS: AppSelectOption[] = LANGUAGE_OPTIONS.map((option) => ({ label: option, value: option }))
const DEFAULT_PROFILE_IMAGE = require('../../../../assets/Banner/doctor.png')

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
}

type SelectDropdownProps = {
	label: string
	value?: string
	placeholder: string
	options: AppSelectOption[]
	onSelect: (value: string) => void
	required?: boolean
}

type MultiSelectDropdownProps = {
	label: string
	values: string[]
	placeholder: string
	options: AppSelectOption[]
	onChange: (values: string[]) => void
	required?: boolean
}

type DobPickerFieldProps = {
	label: string
	value: string
	onChange: (value: string) => void
	placeholder: string
	isMobile: boolean
	required?: boolean
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
				errorText={errorText}
				fieldSize="compact"
				noMargin
				dense
				left={leftText ? <AppInput.Affix text={leftText} textStyle={styles.leftPrefixText} /> : undefined}
				right={rightIcon ? <AppInput.Icon icon={rightIcon} color={rightIconColor} /> : undefined}
			/>
		</View>
	)
}

function SelectDropdown({ label, value, placeholder, options, onSelect, required = false }: SelectDropdownProps) {
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
			/>
		</View>
	)
}

function MultiSelectDropdown({ label, values, placeholder, options, onChange, required = false }: MultiSelectDropdownProps) {
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
			/>
		</View>
	)
}

function DobPickerField({ label, value, onChange, placeholder, isMobile, required = false }: DobPickerFieldProps) {
	return (
		<AppCalendar
			label={label}
			value={value}
			onChange={onChange}
			placeholder={placeholder}
			isMobile={isMobile}
			required={required}
			modalTitle="Select DOB"
		/>
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
const isValidInstagramUrl = (value: string) => isValidProfileUrl(value, ['instagram.com', 'www.instagram.com'])
const isValidFacebookUrl = (value: string) => isValidProfileUrl(value, ['facebook.com', 'www.facebook.com'])
const isValidTwitterUrl = (value: string) => isValidProfileUrl(value, ['twitter.com', 'www.twitter.com', 'x.com', 'www.x.com'])
const matchOptionValue = (value: string, options: string[]) => {
	const normalizedValue = value.trim().toLowerCase()
	return options.find((option) => option.toLowerCase() === normalizedValue) ?? value.trim()
}

const normalizeGenderValue = (value?: string) => (value ? matchOptionValue(value, GENDER_OPTIONS) : '')
const normalizeLanguageValues = (value?: string[] | string | null) => {
	const languages = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : []
	return Array.from(new Set(languages.map((language) => matchOptionValue(language, LANGUAGE_OPTIONS)).filter(Boolean)))
}

const validateSocialUrl = (field: keyof SocialErrors, value: string) => {
	const trimmedValue = value.trim()
	if (!trimmedValue) return ''

	if (field === 'instagram' && !isValidInstagramUrl(trimmedValue)) {
		return 'Enter a valid Instagram profile URL.'
	}

	if (field === 'facebook' && !isValidFacebookUrl(trimmedValue)) {
		return 'Enter a valid Facebook profile URL.'
	}

	if (field === 'twitter' && !isValidTwitterUrl(trimmedValue)) {
		return 'Enter a valid Twitter profile URL.'
	}

	return ''
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
	instagram: string
	facebook: string
	twitter: string
}

type SocialErrors = {
	instagram?: string
	facebook?: string
	twitter?: string
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
		instagram: '',
		facebook: '',
		twitter: '',
	})
	const [focusedField, setFocusedField] = useState('')
	const [socialErrors, setSocialErrors] = useState<SocialErrors>({})
	const [isLoadingProfile, setIsLoadingProfile] = useState(false)
	const [isSaving, setIsSaving] = useState(false)
	const [profilePhotoUri, setProfilePhotoUri] = useState(user?.avatar || '')
	const [profilePhotoUpload, setProfilePhotoUpload] = useState<AppPhotoPickerUpload | null>(null)
	const [isProfilePhotoRemoved, setIsProfilePhotoRemoved] = useState(false)

	const updateFormData = <K extends keyof PersonalDetailsFormData>(key: K, value: PersonalDetailsFormData[K]) => {
		setFormData((prev) => ({
			...prev,
			[key]: value,
		}))
	}

	const updateSocialField = (field: keyof SocialErrors, value: string) => {
		updateFormData(field, value)
		if (socialErrors[field]) {
			setSocialErrors((prev) => ({
				...prev,
				[field]: undefined,
			}))
		}
	}

	const handleSocialBlur = (field: keyof SocialErrors) => {
		const trimmedValue = formData[field].trim()
		updateFormData(field, trimmedValue)
		setSocialErrors((prev) => ({
			...prev,
			[field]: validateSocialUrl(field, trimmedValue) || undefined,
		}))
	}

	useEffect(() => {
		const loadDoctorProfile = async () => {
			try {
				setIsLoadingProfile(true)
				const response = await getDoctorProfile()

				if (!response?.success || !response.data) return

				const profile = mapDoctorProfileApi(response.data)
				setProfilePhotoUri(profile.personal.avatar || '')
				setProfilePhotoUpload(null)
				setIsProfilePhotoRemoved(false)
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
					instagram:
						response.data.professional_details?.instagram_url ||
						response.data.professional_details?.instagram ||
						'',
					facebook:
						response.data.professional_details?.facebook_url ||
						response.data.professional_details?.facebook ||
						'',
					twitter:
						response.data.professional_details?.twitter_url ||
						response.data.professional_details?.twitter ||
						'',
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
		const trimmedInstagram = formData.instagram.trim()
		const trimmedFacebook = formData.facebook.trim()
		const trimmedTwitter = formData.twitter.trim()
		const nextSocialErrors: SocialErrors = {}

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

		if (trimmedInstagram && !isValidInstagramUrl(trimmedInstagram)) {
			nextSocialErrors.instagram = 'Enter a valid Instagram profile URL.'
		}

		if (trimmedFacebook && !isValidFacebookUrl(trimmedFacebook)) {
			nextSocialErrors.facebook = 'Enter a valid Facebook profile URL.'
		}

		if (trimmedTwitter && !isValidTwitterUrl(trimmedTwitter)) {
			nextSocialErrors.twitter = 'Enter a valid Twitter profile URL.'
		}

		setSocialErrors(nextSocialErrors)
		if (Object.keys(nextSocialErrors).length > 0) {
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
				instagram_url: trimmedInstagram,
				facebook_url: trimmedFacebook,
				twitter_url: trimmedTwitter,
				...(profilePhotoUpload ? { avatar: profilePhotoUpload } : {}),
				...(isProfilePhotoRemoved ? { avatar: null, avatar_s3_key: null } : {}),
			}

			await doctorService.updateDoctorProfile(payload)
			await updateUser({
				name: trimmedName,
				email: trimmedEmail || user?.email,
				avatar: isProfilePhotoRemoved ? undefined : profilePhotoUri || user?.avatar,
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
				instagram: trimmedInstagram,
				facebook: trimmedFacebook,
				twitter: trimmedTwitter,
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
					paddingBottom: rowSpacing,
				},
			]}
			keyboardShouldPersistTaps="handled"
			showsVerticalScrollIndicator={false}
		>	
			
			<View style={[styles.contentShell, { maxWidth: contentWidth }]}>

				<AppPhotoPicker
					imageUri={profilePhotoUri}
					fallbackSource={DEFAULT_PROFILE_IMAGE}
					fileNamePrefix="doctor-profile"
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
						onChangeText={(value) => updateFormData('name', value)}
						placeholder="Enter full name"
						autoCapitalize="words"
						onFocus={() => setFocusedField('fullName')}
						onBlur={() => setFocusedField('')}
						required
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
						required
					/>
				</View>

				<View style={{ marginBottom: rowSpacing }}>
					<InputField
						label="Location"
						value={formData.location}
						onChangeText={(value) => updateFormData('location', value)}
						placeholder="Enter location"
						autoCapitalize="words"
						onFocus={() => setFocusedField('location')}
						onBlur={() => setFocusedField('')}
						required
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
							required
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
							onSelect={(value) => updateFormData('gender', value)}
							required
						/>
						<DobPickerField
							label="DOB"
							value={formData.dob}
							onChange={(value) => updateFormData('dob', value)}
							placeholder="DD-MM-YYYY"
							isMobile={isMobile}
							required
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
						required
					/>
				</View>

				<View style={{ marginBottom: rowSpacing }}>
					<MultiSelectDropdown
						label="Languages Known"
						values={formData.languages}
						placeholder="Select languages"
						options={LANGUAGE_SELECT_OPTIONS}
						onChange={(values) => updateFormData('languages', values)}
						required
					/>
				</View>

				<View style={[styles.socialSection, { marginBottom: rowSpacing }]}>
					<AppTypography variant="h4" style={styles.sectionTitle}>
						Social Media
					</AppTypography>
					<FormRow stacked={!useTwoColumns} compact={isTablet}>
						<InputField
							label="Instagram"
							value={formData.instagram}
							onChangeText={(value) => updateSocialField('instagram', value)}
							placeholder="https://instagram.com/username"
							keyboardType="url"
							autoCapitalize="none"
							rightIcon="instagram"
							errorText={socialErrors.instagram}
							onFocus={() => setFocusedField('instagram')}
							onBlur={() => {
								setFocusedField('')
								handleSocialBlur('instagram')
							}}
						/>
						<InputField
							label="Facebook"
							value={formData.facebook}
							onChangeText={(value) => updateSocialField('facebook', value)}
							placeholder="https://www.facebook.com/profile"
							keyboardType="url"
							autoCapitalize="none"
							rightIcon="facebook"
							errorText={socialErrors.facebook}
							onFocus={() => setFocusedField('facebook')}
							onBlur={() => {
								setFocusedField('')
								handleSocialBlur('facebook')
							}}
						/>
						<InputField
							label="Twitter"
							value={formData.twitter}
							onChangeText={(value) => updateSocialField('twitter', value)}
							placeholder="https://twitter.com/username"
							keyboardType="url"
							autoCapitalize="none"
							rightIcon="twitter"
							errorText={socialErrors.twitter}
							onFocus={() => setFocusedField('twitter')}
							onBlur={() => {
								setFocusedField('')
								handleSocialBlur('twitter')
							}}
						/>
					</FormRow>
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
	saveButton: {
		alignSelf: 'stretch',
		marginTop: 0,
		width: '100%',
		minWidth: 160,
	},
})
