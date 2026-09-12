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
	fetchProviderProfileBackend,
	updateProviderProfileBackend,
} from '../../../ancillary/ancillaryService'

type Option = AppSelectOption

type ProfessionalFormData = {
	qualification: string
	currentDesignation: string
	experience: string
	nursingRegistrationNumber: string
	stateNursingCouncil: string
	registrationProof: string
	qualificationProof: string
	verificationStatus: string
	about: string
	geofenceRadius: string
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

function normalizeSpecialtyKey(key?: string | null): string {
	if (!key) return ''
	const lower = key.toLowerCase().trim()
	if (lower.includes('home')) return 'home-care'
	if (lower.includes('physio')) return 'physiotherapy'
	if (lower.includes('rehab')) return 'rehab-care'
	if (lower.includes('nurs')) return 'nursing-care'
	return lower
}

function normalizeSpecialtyToLabel(key?: string | null): string {
	const normalizedKey = normalizeSpecialtyKey(key)
	if (normalizedKey === 'home-care') return 'Home Care'
	if (normalizedKey === 'physiotherapy') return 'Physiotherapy'
	if (normalizedKey === 'rehab-care') return 'Rehabilitation'
	if (normalizedKey === 'nursing-care') return 'Nursing Care'
	return key || 'Healthcare Provider'
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
}: {
	label: string
	value: string
	onChangeText: (value: string) => void
	placeholder: string
	keyboardType?: React.ComponentProps<typeof AppInput>['keyboardType']
	maxLength?: number
	required?: boolean
	editable?: boolean
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
	onNextTab,
	specialtyKey: propSpecialtyKey,
	specialtyLabel: propSpecialtyLabel,
}: {
	onNextTab?: () => void
	specialtyKey?: string
	specialtyLabel?: string
} = {}) {
	const { width } = useWindowDimensions()

	const isTablet = width >= 768 && width < 1024
	const isMobile = width < 768
	const isLandscape = width > 900
	const useTwoColumns = width >= 768

	const [resolvedSpecialtyKey, setResolvedSpecialtyKey] = useState<string>(
		normalizeSpecialtyKey(propSpecialtyKey)
	)
	const [resolvedSpecialtyLabel, setResolvedSpecialtyLabel] = useState<string>(
		propSpecialtyLabel || normalizeSpecialtyToLabel(propSpecialtyKey)
	)

	const [formData, setFormData] = useState<ProfessionalFormData>({
		qualification: '',
		currentDesignation: '',
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

	// Synchronize when propSpecialtyKey changes
	useEffect(() => {
		if (propSpecialtyKey) {
			const key = normalizeSpecialtyKey(propSpecialtyKey)
			setResolvedSpecialtyKey(key)
			setResolvedSpecialtyLabel(propSpecialtyLabel || normalizeSpecialtyToLabel(key))
		}
	}, [propSpecialtyKey, propSpecialtyLabel])

	// Load stored details immediately from AsyncStorage and sync with backend in background
	useEffect(() => {
		let isMounted = true

		const loadDetails = async () => {
			try {
				const keys = [
					'user_specialty',
					'ancillary_qualification',
					'ancillary_qualification_proof',
					'ancillary_designation',
					'ancillary_experience',
					'ancillary_license',
					'ancillary_licensing_authority',
					'ancillary_registration_proof',
					'ancillary_verification_status',
					'ancillary_about',
					'ancillary_geofence_radius',
				]
				const pairs = await AsyncStorage.multiGet(keys)
				const map: Record<string, string> = {}
				pairs.forEach(([k, v]) => {
					if (v) map[k] = v
				})

				if (map['user_specialty'] && isMounted) {
					const key = normalizeSpecialtyKey(map['user_specialty'])
					if (key) {
						setResolvedSpecialtyKey(key)
						setResolvedSpecialtyLabel(normalizeSpecialtyToLabel(key))
					}
				}

				if (isMounted) {
					setFormData((prev) => ({
						...prev,
						qualification: map['ancillary_qualification'] || prev.qualification,
						currentDesignation: map['ancillary_designation'] || prev.currentDesignation,
						experience: map['ancillary_experience'] || prev.experience,
						nursingRegistrationNumber: map['ancillary_license'] || prev.nursingRegistrationNumber,
						stateNursingCouncil: map['ancillary_licensing_authority'] || prev.stateNursingCouncil,
						registrationProof: map['ancillary_registration_proof'] || prev.registrationProof,
						verificationStatus: map['ancillary_verification_status'] || prev.verificationStatus,
						about: map['ancillary_about'] || prev.about,
						geofenceRadius: map['ancillary_geofence_radius'] || prev.geofenceRadius,
					}))
				}

				// Sync with backend profile in background without blocking UI
				const backendProfile = await fetchProviderProfileBackend()
				if (backendProfile && isMounted) {
					const backendRadius = backendProfile?.geofence_radius ?? backendProfile?.geofence_radius_km
					const resolvedRadius =
						backendRadius != null
							? String(Math.round(backendRadius))
							: (map['ancillary_geofence_radius'] || '10')

					// Extract authoritative specialty from backend
					const spec = backendProfile.specialty_id || backendProfile.specialty?.id || backendProfile.specialty_name || backendProfile.specialty?.label
					const resolvedKey = normalizeSpecialtyKey(spec)
					if (resolvedKey) {
						setResolvedSpecialtyKey(resolvedKey)
						const label = backendProfile.specialty_name || backendProfile.specialty?.label || normalizeSpecialtyToLabel(resolvedKey)
						setResolvedSpecialtyLabel(label)
						await AsyncStorage.setItem('user_specialty', resolvedKey)
					}

					setFormData((prev) => ({
						...prev,
						qualification: typeof backendProfile.qualifications === 'string'
							? backendProfile.qualifications
							: prev.qualification,
						experience: backendProfile.experience_years || prev.experience,
						qualificationProof: backendProfile.qualification_proof_s3_key || map['ancillary_qualification_proof'] || prev.qualificationProof,
						registrationProof: backendProfile.license_proof_s3_key || prev.registrationProof,
						nursingRegistrationNumber: backendProfile.license_number || prev.nursingRegistrationNumber,
						geofenceRadius: resolvedRadius,
					}))

					if (backendRadius != null) {
						await AsyncStorage.setItem('ancillary_geofence_radius', String(Math.round(backendRadius)))
					}
				}
			} catch (e) {
				console.log('[ProfessionalDetailsTab] background load error:', e)
			}
		}

		loadDetails()

		return () => {
			isMounted = false
		}
	}, [])

	const handleUploadDocument = async () => {
		const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()

		if (!permission.granted) {
			Alert.alert('Permission needed', 'Please allow photo library access to upload document.')
			return
		}

		const result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ImagePicker.MediaTypeOptions.Images,
			allowsMultipleSelection: false,
			quality: 0.8,
		})

		if (result.canceled || !result.assets.length) return

		const asset = result.assets[0]
		const documentName = asset.fileName || asset.uri.split('/').pop() || 'Selected registration proof'
		updateFormData('registrationProof', documentName)
	}

	const handleUploadQualificationDocument = async () => {
		const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()

		if (!permission.granted) {
			Alert.alert('Permission needed', 'Please allow photo library access to upload qualification certificate.')
			return
		}

		const result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ImagePicker.MediaTypeOptions.Images,
			allowsMultipleSelection: false,
			quality: 0.8,
		})

		if (result.canceled || !result.assets.length) return

		const asset = result.assets[0]
		const documentName = asset.fileName || asset.uri.split('/').pop() || 'Qualification Certificate.jpg'
		updateFormData('qualificationProof', documentName)
	}

	const isHomeCare = resolvedSpecialtyKey === 'home-care'

	const handleSave = async () => {
		if (!isHomeCare && !formData.nursingRegistrationNumber.trim()) {
			Alert.alert('Validation', 'Registration Number is required.')
			return
		}

		try {
			setIsSaving(true)

			if (isHomeCare) {
				await AsyncStorage.multiSet([
					['ancillary_qualification', formData.qualification.trim()],
					['ancillary_qualification_proof', formData.qualificationProof],
					['ancillary_experience', formData.experience],
					['ancillary_geofence_radius', formData.geofenceRadius],
				])
			} else {
				await AsyncStorage.multiSet([
					['ancillary_qualification', formData.qualification.trim()],
					['ancillary_designation', formData.currentDesignation.trim()],
					['ancillary_experience', formData.experience],
					['ancillary_license', formData.nursingRegistrationNumber.trim()],
					['ancillary_licensing_authority', formData.stateNursingCouncil.trim()],
					['ancillary_registration_proof', formData.registrationProof],
					['ancillary_about', formData.about.trim()],
					['ancillary_geofence_radius', formData.geofenceRadius],
				])
			}

			// Persist geofence radius & credentials to backend database
			const numRadius = Number(formData.geofenceRadius)
			if (isHomeCare) {
				await updateProviderProfileBackend({
					qualifications: formData.qualification.trim(),
					qualification_proof_s3_key: formData.qualificationProof,
					experience_years: formData.experience,
					geofence_radius: Number.isFinite(numRadius) ? numRadius : 10,
				})
			} else {
				await updateProviderProfileBackend({
					license_number: formData.nursingRegistrationNumber.trim(),
					license_proof_s3_key: formData.registrationProof,
					qualifications: formData.qualification.trim(),
					experience_years: formData.experience,
					geofence_radius: Number.isFinite(numRadius) ? numRadius : 10,
				})
			}

			setStatusModal({
				visible: true,
				status: 'success',
				title: 'Success',
				description: 'Professional details saved successfully.',
				submitText: 'Okay',
			})
		} catch (error) {
			console.log('[ProfessionalDetailsTab] save error:', error)
			setStatusModal({
				visible: true,
				status: 'error',
				title: 'Error',
				description: 'Unable to save professional details right now.',
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
							{isHomeCare ? (
								<>
									<InputField
										label="Highest Qualification"
										value={formData.qualification}
										onChangeText={(val) => updateFormData('qualification', val)}
										placeholder="e.g. 10th, 12th, Caregiver Certificate, GNA"
									/>
									<UploadBox
										label="Qualification / Training Certificate"
										placeholder="Upload Qualification / Certificate"
										hint="Tap to choose certificate / proof document (JPG or PNG)"
										fileName={formData.qualificationProof}
										onUpload={handleUploadQualificationDocument}
									/>
									<SelectDropdown
										label="Caregiving Experience"
										value={formData.experience}
										placeholder="Select caregiving experience"
										options={HOME_CARE_EXPERIENCE_OPTIONS}
										onSelect={(val) => updateFormData('experience', val)}
										required
									/>
									<SelectDropdown
										label="Work Radius / Geofence Radius"
										value={formData.geofenceRadius}
										placeholder="Select work radius"
										options={GEOFENCE_RADIUS_OPTIONS}
										onSelect={(val) => updateFormData('geofenceRadius', val)}
										required
									/>
								</>
							) : (
								<>
									<FormRow stacked={!useTwoColumns} compact={isTablet}>
										<InputField
											label="Highest Qualification"
											value={formData.qualification}
											onChangeText={(val) => updateFormData('qualification', val)}
											placeholder="e.g. B.Sc Nursing, GNM"
										/>
										<InputField
											label="Current Designation"
											value={formData.currentDesignation}
											onChangeText={(val) => updateFormData('currentDesignation', val)}
											placeholder="e.g. Senior Staff Nurse"
										/>
									</FormRow>

									<FormRow stacked={!useTwoColumns} compact={isTablet}>
										<SelectDropdown
											label="Total Years of Experience"
											value={formData.experience}
											placeholder="Select experience range"
											options={EXPERIENCE_OPTIONS}
											onSelect={(val) => updateFormData('experience', val)}
											required
										/>
										<SelectDropdown
											label="Work Radius / Geofence Radius"
											value={formData.geofenceRadius}
											placeholder="Select work radius"
											options={GEOFENCE_RADIUS_OPTIONS}
											onSelect={(val) => updateFormData('geofenceRadius', val)}
											required
										/>
									</FormRow>

									<FormRow stacked={!useTwoColumns} compact={isTablet}>
										<InputField
											label="Registration Number"
											value={formData.nursingRegistrationNumber}
											onChangeText={(val) => updateFormData('nursingRegistrationNumber', val)}
											placeholder="e.g. RN-12930"
											required
										/>
									</FormRow>

									{/* Document Upload Component */}
									<UploadBox
										label="Registration Proof / Certification Document"
										fileName={formData.registrationProof}
										onUpload={handleUploadDocument}
									/>
								</>
							)}
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
})
