import React, { useEffect, useMemo, useState } from 'react'
import {
	ActivityIndicator,
	Alert,
	ScrollView,
	StyleSheet,
	TouchableOpacity,
	View,
	useWindowDimensions,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import {
	AppStickyFooter,
	AppInput,
	AppSelect,
	AppSelectOption,
	AppTypography,
	StatusModal,
} from '../../../../components/common'
import {
	fetchProviderProfile,
	fetchAncillarySubspecialtiesBackend,
	updateProviderProfileBackend,
	DEFAULT_PHYSIOTHERAPY_SUBSPECIALTIES,
} from '../../../ancillary/ancillaryService'
import {
	createProfessionalDetailsSchema,
	getFieldErrors,
} from '../../../../validation/profileSchemas'
import { normalizeSpecialtyKey, normalizeSpecialtyToLabel } from '../specialtyConfig'

type Option = AppSelectOption

type ProfessionalFormData = {
	qualification: string
	subspecialtyId: string
	experience: string
	nursingRegistrationNumber: string
	stateNursingCouncil: string
	registrationProof: string
	qualificationProof: string
	verificationStatus: string
	about: string
	geofenceRadius: string
}

const SPECIALTY_OPTIONS: Option[] = [
	{ label: 'Nursing Care', value: 'Nursing Care' },
	{ label: 'Physiotherapy', value: 'Physiotherapy' },
	{ label: 'Rehabilitation', value: 'Rehabilitation' },
	{ label: 'Elderly Care', value: 'Elderly Care' },
]

// Role-specific Professional Details terminology.
// NOTE: This only changes what is DISPLAYED (labels/placeholders). The
// underlying form field (nursingRegistrationNumber) and the backend
// payload key (license_number) are unchanged for every role -- see
// handleSave() below, which always sends license_number.
type SpecialtyFieldConfig = {
	registrationLabel: string
	registrationPlaceholder: string
	qualificationPlaceholder: string
	specializationPlaceholder: string
}

const DEFAULT_FIELD_CONFIG: SpecialtyFieldConfig = {
	registrationLabel: 'Professional Registration Number',
	registrationPlaceholder: 'e.g. Registration No.',
	qualificationPlaceholder: 'e.g. Relevant professional qualification',
	specializationPlaceholder: 'e.g. Relevant area of specialization/practice',
}

const NURSING_FIELD_CONFIG: SpecialtyFieldConfig = {
	registrationLabel: 'Nursing Registration Number',
	registrationPlaceholder: 'e.g. RN-12930',
	qualificationPlaceholder: 'e.g. B.Sc Nursing, GNM',
	specializationPlaceholder: 'e.g. Critical Care Nursing, Pediatric Nursing',
}

const PHYSIOTHERAPY_FIELD_CONFIG: SpecialtyFieldConfig = {
	registrationLabel: 'Physiotherapy Registration Number',
	registrationPlaceholder: 'e.g. Registration No.',
	qualificationPlaceholder: 'e.g. BPT, MPT',
	specializationPlaceholder: 'e.g. Orthopedic Physiotherapy, Sports Physiotherapy',
}

const REHAB_FIELD_CONFIG: SpecialtyFieldConfig = {
	registrationLabel: 'Rehabilitation Registration Number',
	registrationPlaceholder: 'e.g. RCI-45210',
	qualificationPlaceholder: 'e.g. BOT, MOT, DRT',
	specializationPlaceholder: 'e.g. Neurological Rehabilitation, Cardiopulmonary Rehabilitation',
}

const ELDER_CARE_FIELD_CONFIG: SpecialtyFieldConfig = {
	registrationLabel: 'Caregiver Registration Number',
	registrationPlaceholder: 'e.g. EC-1023',
	qualificationPlaceholder: 'e.g. Certified Caregiver, Diploma in Geriatric Care',
	specializationPlaceholder: 'e.g. Geriatric Care, Palliative Caregiving',
}

// Matches by keyword rather than exact label so this stays correct even if a
// specialty's backend label (e.g. "Rehab Care", "Elder Day Care") differs
// slightly from the dropdown's display label (e.g. "Rehabilitation",
// "Elderly Care") -- Physiotherapy-specific text only ever matches "physio".
function getFieldConfigForSpecialty(specialty: string): SpecialtyFieldConfig {
	const normalized = (specialty || '').toLowerCase()
	if (normalized.includes('physio')) return PHYSIOTHERAPY_FIELD_CONFIG
	if (normalized.includes('rehab')) return REHAB_FIELD_CONFIG
	if (normalized.includes('elder') || normalized.includes('geriatric')) return ELDER_CARE_FIELD_CONFIG
	if (normalized.includes('nurs')) return NURSING_FIELD_CONFIG
	return DEFAULT_FIELD_CONFIG
}

const EXPERIENCE_OPTIONS: Option[] = [
	{ label: 'Less than 1 year', value: '<1' },
	{ label: '1 - 3 years', value: '1-3' },
	{ label: '3 - 5 years', value: '3-5' },
	{ label: '5 - 10 years', value: '5-10' },
	{ label: '10+ years', value: '10+' },
]

const HOME_CARE_EXPERIENCE_OPTIONS: Option[] = [
	{ label: 'Less than 1 year', value: '<1' },
	{ label: '1 - 2 years', value: '1-2' },
	{ label: '3 - 5 years', value: '3-5' },
	{ label: '5+ years', value: '5+' },
]

function mapExperienceRangeToYears(rangeVal: string): number | undefined {
	if (!rangeVal) return undefined
	const normalized = rangeVal.trim()
	switch (normalized) {
		case '<1':
		case '0-1':
			return 0
		case '1-2':
			return 1
		case '1-3':
			return 2
		case '3-5':
			return 4
		case '5-10':
			return 7
		case '5+':
			return 5
		case '10+':
			return 10
		default: {
			const parsed = parseInt(normalized, 10)
			return isNaN(parsed) ? undefined : parsed
		}
	}
}

function mapYearsToExperienceRange(years: number | null | undefined, isHomeCareSpecialty = false): string {
	if (years === null || years === undefined || typeof years !== 'number') return ''
	if (isHomeCareSpecialty) {
		if (years < 1) return '<1'
		if (years <= 2) return '1-2'
		if (years <= 5) return '3-5'
		return '5+'
	} else {
		if (years < 1) return '<1'
		if (years <= 3) return '1-3'
		if (years <= 5) return '3-5'
		if (years <= 10) return '5-10'
		return '10+'
	}
}

const GEOFENCE_RADIUS_OPTIONS: Option[] = [
	{ label: '5 km', value: '5' },
	{ label: '10 km', value: '10' },
	{ label: '15 km', value: '15' },
	{ label: '20 km', value: '20' },
	{ label: '25 km', value: '25' },
	{ label: '30 km', value: '30' },
	{ label: '50 km', value: '50' },
]

const VERIFICATION_STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
	verified: { label: 'Verified', color: '#1e7e34', bg: 'rgba(30, 126, 52, 0.08)' },
	pending: { label: 'Pending Verification', color: '#9a6b00', bg: 'rgba(154, 107, 0, 0.08)' },
	rejected: { label: 'Verification Rejected', color: '#c0392b', bg: 'rgba(192, 57, 43, 0.08)' },
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
	editable = true,
	errorText,
}: {
	label: string
	value: string
	onChangeText: (value: string) => void
	placeholder: string
	keyboardType?: React.ComponentProps<typeof AppInput>['keyboardType']
	maxLength?: number
	required?: boolean
	editable?: boolean
	errorText?: string
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
				editable={editable}
				errorText={errorText}
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
	errorText,
}: {
	label: string
	value?: string
	placeholder: string
	options: Option[]
	onSelect: (value: string) => void
	required?: boolean
	errorText?: string
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
				errorText={errorText}
			/>
		</View>
	)
}

function UploadBox({
	label,
	fileName,
	onUpload,
	required = false,
	placeholder = 'Upload Registration Proof / Document',
	hint = 'Tap to choose image / proof document (JPG or PNG)',
}: {
	label: string
	fileName?: string
	onUpload: () => void
	required?: boolean
	placeholder?: string
	hint?: string
}) {
	return (
		<View style={styles.fieldGroup}>
			<FieldLabel label={label} required={required} />
			<TouchableOpacity style={styles.uploadBox} activeOpacity={0.85} onPress={onUpload}>
				<View style={styles.uploadIconWrap}>
					<MaterialCommunityIcons name="file-upload-outline" size={26} color="#0c7c7c" />
				</View>
				<View style={styles.uploadTextContainer}>
					<AppTypography variant="body" style={styles.uploadTitle}>
						{fileName ? 'Document Selected' : placeholder}
					</AppTypography>
					<AppTypography variant="caption" style={styles.uploadHint} numberOfLines={1}>
						{fileName || hint}
					</AppTypography>
				</View>
			</TouchableOpacity>
		</View>
	)
}

export default function ProfessionalDetailsTab({
	isActive,
	onNextTab,
	specialtyKey: propSpecialtyKey,
	specialtyLabel: propSpecialtyLabel,
	onSubspecialtyChange,
}: {
	isActive?: boolean
	onNextTab?: () => void
	specialtyKey?: string
	specialtyLabel?: string
	onSubspecialtyChange?: (id: string) => void
} = {}) {
	const { width } = useWindowDimensions()

	const isTablet = width >= 768 && width < 1024
	const isMobile = width < 768
	const isLandscape = width > 900
	const useTwoColumns = width >= 768

	const [resolvedSpecialtyKey, setResolvedSpecialtyKey] = useState<string>(
		normalizeSpecialtyKey(propSpecialtyKey) || 'physiotherapy'
	)
	const [resolvedSpecialtyLabel, setResolvedSpecialtyLabel] = useState<string>(
		propSpecialtyLabel || normalizeSpecialtyToLabel(propSpecialtyKey) || 'Physiotherapy'
	)

	const [formData, setFormData] = useState<ProfessionalFormData>({
		qualification: '',
		subspecialtyId: '',
		experience: '',
		nursingRegistrationNumber: '',
		stateNursingCouncil: '',
		registrationProof: '',
		qualificationProof: '',
		verificationStatus: 'pending',
		about: '',
		geofenceRadius: '10',
	})

	const [isSaving, setIsSaving] = useState(false)
	const [isLoadingProfile, setIsLoadingProfile] = useState(false)
	const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
	const [subspecialtyOptions, setSubspecialtyOptions] = useState<Option[]>(() => {
		const key = normalizeSpecialtyKey(propSpecialtyKey) || 'physiotherapy'
		if (key.toLowerCase().includes('physio')) {
			return DEFAULT_PHYSIOTHERAPY_SUBSPECIALTIES.map((s) => ({ label: s.label, value: s.id }))
		}
		return []
	})
	const [statusModal, setStatusModal] = useState<{
		visible: boolean
		status: 'success' | 'error'
		title: string
		description: string
		submitText?: string
	} | null>(null)

	const updateFormData = <K extends keyof ProfessionalFormData>(key: K, value: ProfessionalFormData[K]) => {
		setFormData((prev) => ({ ...prev, [key]: value }))
	}

	const handleFieldChange = <K extends keyof ProfessionalFormData>(
		key: K,
		value: ProfessionalFormData[K]
	) => {
		updateFormData(key, value)
		if (fieldErrors[key as string]) {
			setFieldErrors((prev) => {
				const next = { ...prev }
				delete next[key as string]
				return next
			})
		}
	}

	// Role-specific labels/placeholders derived from the currently selected
	// specialty. Re-derived whenever the specialty changes (either from the
	// initial load below, or the Primary Specialty dropdown in this screen).
	const fieldConfig = useMemo(() => getFieldConfigForSpecialty(resolvedSpecialtyLabel), [resolvedSpecialtyLabel])

function extractQualificationString(val: any): string {
	if (!val) return ''
	if (typeof val === 'string') {
		const trimmed = val.trim()
		if (trimmed.includes('[object Object]')) {
			return ''
		}
		return trimmed
	}
	if (Array.isArray(val)) {
		if (val.length === 0) return ''
		const labels = val
			.map((item: any) => {
				if (typeof item === 'string') {
					const t = item.trim()
					return t.includes('[object Object]') ? '' : t
				}
				if (typeof item === 'object' && item !== null) {
					return (item.qualification || item.label || item.name || '').trim()
				}
				return ''
			})
			.filter(Boolean)
		return labels[labels.length - 1] || ''
	}
	if (typeof val === 'object' && val !== null) {
		return (val.qualification || val.label || val.name || '').trim()
	}
	return String(val)
}

function resolveQualificationFromProfile(profile: any): string {
	if (!profile) return ''
	if (typeof profile.qualifications === 'string' && profile.qualifications.trim()) {
		const q = profile.qualifications.trim()
		if (!q.includes('[object Object]')) {
			return q
		}
	}
	if (Array.isArray(profile.qualifications_list) && profile.qualifications_list.length > 0) {
		const extracted = extractQualificationString(profile.qualifications_list)
		if (extracted) return extracted
	}
	if (Array.isArray(profile.qualifications) && profile.qualifications.length > 0) {
		const extracted = extractQualificationString(profile.qualifications)
		if (extracted) return extracted
	}
	return ''
}

	useEffect(() => {
		if (propSpecialtyKey) {
			const key = normalizeSpecialtyKey(propSpecialtyKey)
			setResolvedSpecialtyKey(key)
			setResolvedSpecialtyLabel(propSpecialtyLabel || normalizeSpecialtyToLabel(key))
		}
	}, [propSpecialtyKey, propSpecialtyLabel])

	// Fetch subspecialties (lookup_ancillary_sub_specialties) for the resolved specialty,
	// same pattern CapabilitiesTab uses for categories/services -- backend filters by the
	// normalized specialty key (its public_id), e.g. 'physiotherapy'.
	useEffect(() => {
		const targetKey = resolvedSpecialtyKey || 'physiotherapy'
		let isMounted = true

		const loadSubspecialties = async () => {
			const items = await fetchAncillarySubspecialtiesBackend(targetKey)
			if (isMounted && items && items.length > 0) {
				setSubspecialtyOptions(items.map((item: any) => ({ label: item.label, value: item.id || item.public_id || '' })))
			}
		}

		loadSubspecialties()

		return () => {
			isMounted = false
		}
	}, [resolvedSpecialtyKey])

	// Authoritative profile loading: Backend database is the source of truth for:
	// - specialty_id (LookupAncillarySpecialty.public_id, e.g. 'physiotherapy')
	// - sub_specialty_id (LookupAncillarySubspecialty.public_id, e.g. 'phys-sub-orthopedic')
	// - qualifications / qualifications_list
	// - experience_years (numeric integer)
	// - license_number
	// - license_proof_s3_key
	// - qualification_proof_s3_key
	// - geofence_radius_km
	// - verification_status
	// Only genuinely local-only fields (stateNursingCouncil, about)
	// are read from AsyncStorage without using them as fallbacks for backend fields.
	useEffect(() => {
		let isMounted = true

		const loadDetails = async () => {
			if (isActive === false) return
			try {
				setIsLoadingProfile(true)

				// 1. Fetch authoritative profile from backend
				const backendProfile = await fetchProviderProfile()
				console.log(
					'[ProfessionalDetailsTab] GET PROFILE RESPONSE:',
					JSON.stringify(backendProfile, null, 2)
				)

				if (!backendProfile) {
					console.warn('[ProfessionalDetailsTab] backendProfile is null, retaining current state')
					return
				}

				// Authoritative specialty from single canonical field: backendProfile.specialty_id
				const spec = backendProfile?.specialty_id
				const resolvedKey = normalizeSpecialtyKey(spec)
				if (resolvedKey && isMounted) {
					setResolvedSpecialtyKey(resolvedKey)
					const label = backendProfile?.specialty?.label || normalizeSpecialtyToLabel(resolvedKey)
					setResolvedSpecialtyLabel(label)
					// Intentionally not awaited: the sub-specialty list must not delay the rest of the profile load.
					const loadSubspecialties = async () => {
						try {
							const items: any = await fetchAncillarySubspecialtiesBackend(resolvedKey)
							if (isMounted && items && items.length > 0) {
								setSubspecialtyOptions(items.map((item: any) => ({ label: item.label, value: item.id || item.public_id || '' })))
							}
						} catch {
							// Options stay empty; the picker simply has nothing to show.
						}
					}
					void loadSubspecialties()
				}

				// Authoritative sub-specialty from single canonical field: backendProfile.sub_specialty_id
				const backendSubspecialtyId = backendProfile?.sub_specialty_id || ''

				// Authoritative qualifications from canonical backend fields
				const resolvedQual = resolveQualificationFromProfile(backendProfile)

				// Authoritative experience from canonical backend field experience_years
				const resolvedExp = mapYearsToExperienceRange(
					backendProfile?.experience_years,
					(resolvedKey || resolvedSpecialtyKey) === 'home-care'
				)

				// Authoritative geofence radius from canonical backend field geofence_radius_km
				const backendRadius = backendProfile?.geofence_radius_km
				const resolvedRadius = backendRadius != null ? String(Math.round(backendRadius)) : '10'

				// Authoritative qualification proof from canonical backend field qualification_proof_s3_key
				const resolvedQualProof = backendProfile?.qualification_proof_s3_key || ''

				// 2. Read ONLY genuinely local-only fields from AsyncStorage
				const localPairs = await AsyncStorage.multiGet([
					'ancillary_licensing_authority',
				])
				const localMap: Record<string, string> = {}
				localPairs.forEach(([k, v]) => {
					if (v) localMap[k] = v
				})

				if (isMounted) {
					setFormData({
						qualification: resolvedQual,
						subspecialtyId: backendSubspecialtyId,
						experience: resolvedExp,
						nursingRegistrationNumber: backendProfile?.license_number || '',
						stateNursingCouncil: localMap['ancillary_licensing_authority'] || '',
						registrationProof: backendProfile?.license_proof_s3_key || '',
						qualificationProof: resolvedQualProof,
						verificationStatus: backendProfile?.verification_status || 'pending',
						about: backendProfile?.about || '',
						geofenceRadius: resolvedRadius,
					})
				}
			} catch (e) {
				console.log('[ProfessionalDetailsTab] load error:', e)
			} finally {
				if (isMounted) {
					setIsLoadingProfile(false)
				}
			}
		}

		loadDetails()

		return () => {
			isMounted = false
		}
	}, [isActive])

	const handleUploadDocument = async () => {
		const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()

		if (!permission.granted) {
			Alert.alert('Permission needed', 'Please allow photo library access to upload document.')
			return
		}

		const result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ['images'],
			allowsMultipleSelection: false,
			quality: 0.8,
		})

		if (result.canceled || !result.assets.length) return

		const asset = result.assets[0]
		const documentName = asset.fileName || asset.uri.split('/').pop() || 'Selected registration proof'
		handleFieldChange('registrationProof', documentName)
	}

	const handleUploadQualificationDocument = async () => {
		const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()

		if (!permission.granted) {
			Alert.alert('Permission needed', 'Please allow photo library access to upload qualification certificate.')
			return
		}

		const result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ['images'],
			allowsMultipleSelection: false,
			quality: 0.8,
		})

		if (result.canceled || !result.assets.length) return

		const asset = result.assets[0]
		const documentName = asset.fileName || asset.uri.split('/').pop() || 'Qualification Certificate.jpg'
		handleFieldChange('qualificationProof', documentName)
	}

	const isHomeCare = resolvedSpecialtyKey === 'home-care'

	const handleSave = async () => {
		// Complete form validation using shared Zod schema and getFieldErrors pattern
		const schema = createProfessionalDetailsSchema(isHomeCare)
		const errors = getFieldErrors(schema, formData)
		setFieldErrors(errors)

		if (Object.keys(errors).length > 0) {
			return
		}

		try {
			setIsSaving(true)

			const numRadius = Number(formData.geofenceRadius)
			const radiusToSave = Number.isFinite(numRadius) ? numRadius : 10
			const yearsOfExp = mapExperienceRangeToYears(formData.experience)

			// Explicit mapping:
			// - formData.geofenceRadius -> payload.geofence_radius_km -> backend AncillaryProvider.geofence_radius_km
			// - formData.subspecialtyId -> payload.sub_specialty_id -> backend AncillaryProvider.sub_specialty_id
			// - formData.experience -> payload.experience_years -> backend AncillaryProvider.experience_years
			// - formData.nursingRegistrationNumber -> payload.license_number -> backend AncillaryProvider.license_number
			// - formData.registrationProof -> payload.license_proof_s3_key -> backend AncillaryProvider.license_proof_s3_key
			// - formData.qualification -> payload.qualifications -> backend AncillaryProvider.qualifications
			// - formData.qualificationProof -> payload.qualification_proof_s3_key -> backend Degree.proof_s3_key
			// - formData.about -> payload.about -> backend AncillaryProvider.about
			const payload = isHomeCare
				? {
					qualifications: formData.qualification.trim(),
					qualification_proof_s3_key: formData.qualificationProof,
					geofence_radius: radiusToSave,
					geofence_radius_km: radiusToSave,
					sub_specialty_id: formData.subspecialtyId,
					experience_years: yearsOfExp,
					about: formData.about.trim(),
				}
				: {
					license_number: formData.nursingRegistrationNumber.trim(),
					license_proof_s3_key: formData.registrationProof,
					qualifications: formData.qualification.trim(),
					qualification_proof_s3_key: formData.qualificationProof,
					geofence_radius: radiusToSave,
					geofence_radius_km: radiusToSave,
					sub_specialty_id: formData.subspecialtyId,
					experience_years: yearsOfExp,
					about: formData.about.trim(),
				}

			const backendSaveRes = await updateProviderProfileBackend(payload)

			// Re-fetch backend profile to confirm and strictly populate UI from backend response
			// Do NOT fall back to old form state if the backend response does not contain a value.
			const updatedProfile = await fetchProviderProfile()

			const authoritativeQual = resolveQualificationFromProfile(updatedProfile)
			const authoritativeSubId = updatedProfile?.sub_specialty_id || ''
			const authoritativeExp = mapYearsToExperienceRange(updatedProfile?.experience_years, isHomeCare)
			const authoritativeLicense = updatedProfile?.license_number || ''
			const authoritativeLicenseProof = updatedProfile?.license_proof_s3_key || ''
			const authoritativeRadius = updatedProfile?.geofence_radius_km != null
				? String(Math.round(updatedProfile.geofence_radius_km))
				: '10'
			const authoritativeVerification = updatedProfile?.verification_status || 'pending'
			const authoritativeAbout = updatedProfile?.about || ''

			// Only genuinely local-only fields (stateNursingCouncil)
			// are persisted to AsyncStorage. Backend-owned fields (including experience_years, about)
			// are NEVER written to AsyncStorage.
			await AsyncStorage.multiSet([
				['ancillary_licensing_authority', formData.stateNursingCouncil.trim()],
			])

			setFormData((prev) => ({
				...prev,
				qualification: authoritativeQual,
				subspecialtyId: authoritativeSubId,
				experience: authoritativeExp,
				nursingRegistrationNumber: authoritativeLicense,
				registrationProof: authoritativeLicenseProof,
				geofenceRadius: authoritativeRadius,
				verificationStatus: authoritativeVerification,
				about: authoritativeAbout,
			}))

			setStatusModal({
				visible: true,
				status: 'success',
				title: 'Success',
				description: 'Professional details saved successfully.',
				submitText: 'Okay',
			})
		} catch (error: any) {
			console.error('[PROFILE SAVE] error:', error)
			console.error('[PROFILE SAVE] status:', error?.response?.status)
			console.error('[PROFILE SAVE] URL:', error?.config?.url)
			setStatusModal({
				visible: true,
				status: 'error',
				title: 'Error',
				description: error?.response?.data?.message || error?.response?.data?.detail || error?.message || 'Unable to save professional details right now.',
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

	const sectionPadding = isMobile ? 16 : isTablet ? 20 : 24
	const rowSpacing = isMobile ? 18 : isLandscape ? 22 : 20
	const statusMeta = VERIFICATION_STATUS_META[formData.verificationStatus] || VERIFICATION_STATUS_META.pending

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
				<View style={[styles.contentShell, { maxWidth: contentWidth }]}>
					{/* Verification status badge - for clinical specialties */}
					{!isHomeCare && (
						<View style={[styles.statusBadge, { backgroundColor: statusMeta.bg }]}>
							<MaterialCommunityIcons
								name={formData.verificationStatus === 'verified' ? 'check-decagram' : 'clock-outline'}
								size={16}
								color={statusMeta.color}
							/>
							<AppTypography variant="caption" style={[styles.statusText, { color: statusMeta.color }]}>
								{statusMeta.label}
							</AppTypography>
						</View>
					)}

					{/* Specialty / Clinical Practice Display (Read-Only) */}
					<View style={{ marginBottom: rowSpacing }}>
						<SectionTitle>Specialty / Practice Area</SectionTitle>
						<View style={styles.specialtyDisplayCard}>
							<View style={styles.specialtyIconWrap}>
								<MaterialCommunityIcons
									name={isHomeCare ? 'home-heart' : 'medical-bag'}
									size={22}
									color="#0c7c7c"
								/>
							</View>
							<View style={{ flex: 1 }}>
								<AppTypography variant="subtitle" style={styles.specialtyDisplayTitle}>
									{resolvedSpecialtyLabel || (isHomeCare ? 'Home Care' : 'Clinical Practice')}
								</AppTypography>
								<AppTypography variant="caption" style={styles.specialtyDisplaySubtitle}>
									{isHomeCare
										? 'General Caregiver / Home Attendant'
										: 'Registered Healthcare Provider'}
								</AppTypography>
							</View>
						</View>
					</View>

					{/* Professional Information */}
					<View style={{ marginBottom: rowSpacing }}>
						<SectionTitle>Professional Information</SectionTitle>
						<View style={{ gap: 18 }}>
							<FormRow stacked={!useTwoColumns} compact={isTablet}>
								<InputField
									label="Highest Qualification"
									value={formData.qualification}
									onChangeText={(val) => handleFieldChange('qualification', val)}
									placeholder={fieldConfig.qualificationPlaceholder}
									errorText={fieldErrors.qualification}
									required
								/>
							<SelectDropdown
									label="Specialization"
									value={formData.subspecialtyId}
									placeholder={subspecialtyOptions.length ? 'Select specialization' : 'No specializations available'}
									options={subspecialtyOptions}
									onSelect={(val) => {
										handleFieldChange('subspecialtyId', val)
										onSubspecialtyChange?.(val)
									}}
									errorText={fieldErrors.subspecialtyId}
									required
								/>
							</FormRow>

							<FormRow stacked={!useTwoColumns} compact={isTablet}>
								<SelectDropdown
									label="Total Years of Experience"
									value={formData.experience}
									placeholder="Select experience range"
									options={isHomeCare ? HOME_CARE_EXPERIENCE_OPTIONS : EXPERIENCE_OPTIONS}
									onSelect={(val) => handleFieldChange('experience', val)}
									errorText={fieldErrors.experience}
									required
								/>
								<SelectDropdown
									label="Work Radius / Geofence Radius"
									value={formData.geofenceRadius}
									placeholder="Select work radius"
									options={GEOFENCE_RADIUS_OPTIONS}
									onSelect={(val) => handleFieldChange('geofenceRadius', val)}
									errorText={fieldErrors.geofenceRadius}
									required
								/>
							</FormRow>

							<FormRow stacked={!useTwoColumns} compact={isTablet}>
								<InputField
									// NOTE: field name kept as nursingRegistrationNumber and mapped to
									// the license_number API field on save regardless of specialty --
									// only the label/placeholder shown to the user change per role.
									label={fieldConfig.registrationLabel}
									value={formData.nursingRegistrationNumber}
									onChangeText={(val) => handleFieldChange('nursingRegistrationNumber', val)}
									placeholder={fieldConfig.registrationPlaceholder}
									errorText={fieldErrors.nursingRegistrationNumber}
									required={!isHomeCare}
								/>
							</FormRow>

							{/* Document Upload Component */}
							<UploadBox
								label="Registration Proof / Certification Document"
								fileName={formData.registrationProof}
								onUpload={handleUploadDocument}
							/>
						</View>
					</View>

					<View style={styles.sectionDivider} />
				</View>
			</ScrollView>

			<AppStickyFooter onPress={handleSave} disabled={isSaving} buttonStyle={styles.saveButton}>
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
	statusBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		alignSelf: 'flex-start',
		gap: 6,
		paddingVertical: 6,
		paddingHorizontal: 12,
		borderRadius: 20,
		marginBottom: 16,
	},
	statusText: {
		fontWeight: '700',
		fontSize: 12,
	},
	specialtyDisplayCard: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#F0F9F9',
		borderRadius: 12,
		paddingHorizontal: 16,
		paddingVertical: 14,
		gap: 12,
		borderWidth: 1,
		borderColor: '#D4ECEC',
	},
	specialtyIconWrap: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: 'rgba(12, 124, 124, 0.12)',
		alignItems: 'center',
		justifyContent: 'center',
	},
	specialtyDisplayTitle: {
		fontSize: 15,
		fontWeight: '700',
		color: '#0A5C5C',
	},
	specialtyDisplaySubtitle: {
		fontSize: 12,
		color: '#527B7B',
		marginTop: 2,
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
	saveButton: {
		alignSelf: 'stretch',
		marginTop: 0,
		width: '100%',
	},
	uploadBox: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#f6fafb',
		borderWidth: 1.5,
		borderColor: '#cce6e6',
		borderStyle: 'dashed',
		borderRadius: 10,
		paddingHorizontal: 16,
		paddingVertical: 14,
		gap: 12,
	},
	uploadIconWrap: {
		width: 44,
		height: 44,
		borderRadius: 22,
		backgroundColor: 'rgba(12, 124, 124, 0.08)',
		alignItems: 'center',
		justifyContent: 'center',
	},
	uploadTextContainer: {
		flex: 1,
	},
	uploadTitle: {
		fontSize: 14,
		fontWeight: '600',
		color: '#1a2226',
	},
	uploadHint: {
		fontSize: 12,
		color: '#62707a',
		marginTop: 2,
	},
	loadingContainer: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#ffffff',
	},
})
