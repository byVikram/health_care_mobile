import React, { useEffect, useMemo, useState } from 'react'
import {
	ActivityIndicator,
	Alert,
	Platform,
	ScrollView,
	StyleSheet,
	TouchableOpacity,
	View,
	useWindowDimensions,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { AppButton, AppInput, AppSelect, AppSelectOption, AppTypography } from '../../../../components/common'
import { useAuth } from '../../../../context/AuthContext'
import { getDoctorProfile, getSpecialities, mapDoctorProfileApi } from '../../../doctor/doctorService'
import { doctorService } from '../../../consultation/ConsultationService'

const DEGREE_OPTIONS = [
	{ value: 'mbbs', label: 'MBBS' },
	{ value: 'md', label: 'MD' },
	{ value: 'ms', label: 'MS' },
	{ value: 'bds', label: 'BDS' },
	{ value: 'mds', label: 'MDS' },
	{ value: 'bams', label: 'BAMS' },
	{ value: 'bhms', label: 'BHMS' },
	{ value: 'bpt', label: 'BPT' },
	{ value: 'dnb', label: 'DNB' },
]

const COLLEGE_OPTIONS = [
	{ value: 'kms', label: 'Karnataka Medical Science (KMS)' },
	{ value: 'aiims', label: 'AIIMS' },
	{ value: 'afmc', label: 'Armed Forces Medical College' },
	{ value: 'jipmer', label: 'JIPMER' },
	{ value: 'mmc', label: 'Madras Medical College' },
	{ value: 'other', label: 'Other' },
]

type Option = AppSelectOption

type InputFieldProps = {
	label: string
	value: string
	onChangeText: (value: string) => void
	placeholder: string
	keyboardType?: React.ComponentProps<typeof AppInput>['keyboardType']
	maxLength?: number
	required?: boolean
}

type SelectDropdownProps = {
	label: string
	value?: string
	placeholder: string
	options: Option[]
	onSelect: (value: string) => void
	required?: boolean
}

type UploadBoxProps = {
	label: string
	required?: boolean
	description?: string
	fileName?: string
	onUpload: () => void
	stacked: boolean
}

type ProfessionalFormData = {
	specialization_id: string
	specialization_label: string
	degree: string
	college: string
	yearOfPassing: string
	qualificationProof: string
	registrationNumber: string
	registrationProof: string
	about: string
}

const normalizeOptionValue = (value: string, options: Option[]) => {
	if (!value) return ''
	const normalized = value.trim().toLowerCase()
	const match = options.find((option) => option.value.toLowerCase() === normalized || option.label.toLowerCase() === normalized)
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
			{required ? <AppTypography variant="caption" style={styles.requiredMark}>*</AppTypography> : null}
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
}: InputFieldProps) {
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

function SelectDropdown({ label, value, placeholder, options, onSelect, required = false }: SelectDropdownProps) {
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

function UploadBox({ label, required, description, fileName, onUpload, stacked }: UploadBoxProps) {
	return (
		<View style={[styles.uploadSection, stacked && styles.uploadSectionStacked]}>
			<View style={styles.uploadCopy}>
				{label ? <FieldLabel label={label} required={required} /> : null}
				{description ? (
					<AppTypography variant="caption" style={styles.uploadDescription}>
						{description}
					</AppTypography>
				) : null}
				{fileName ? (
					<AppTypography variant="caption" style={styles.uploadFileName}>
						Selected: {fileName}
					</AppTypography>
				) : null}
			</View>
			<TouchableOpacity
				style={[styles.uploadTile, stacked && styles.uploadTileStacked, !label && styles.uploadTileCompact]}
				onPress={onUpload}
				activeOpacity={0.85}
			>
				<MaterialCommunityIcons name="cloud-upload-outline" size={26} color="#0c7c7c" />
				<AppTypography variant="caption" style={styles.uploadTileText}>
					Upload
				</AppTypography>
			</TouchableOpacity>
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
		degree: '',
		college: '',
		yearOfPassing: '',
		qualificationProof: '',
		registrationNumber: '',
		registrationProof: '',
		about: '',
	})
	const [specialities, setSpecialities] = useState<Option[]>([])
	const [isLoadingProfile, setIsLoadingProfile] = useState(false)
	const [isLoadingSpecialities, setIsLoadingSpecialities] = useState(false)
	const [isSaving, setIsSaving] = useState(false)

	const updateFormData = <K extends keyof ProfessionalFormData>(key: K, value: ProfessionalFormData[K]) => {
		setFormData((prev) => ({
			...prev,
			[key]: value,
		}))
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
					degree: normalizeOptionValue(profile.professional.degree || '', DEGREE_OPTIONS),
					college: normalizeOptionValue(profile.professional.college || '', COLLEGE_OPTIONS),
					yearOfPassing: profile.professional.yearOfPassing || '',
					qualificationProof: profile.professional.qualificationProof || '',
					registrationNumber: profile.professional.registrationNumber || '',
					registrationProof: profile.professional.registrationProof || '',
					about: profile.professional.about || '',
				})
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
				degree: normalizeOptionValue(profile.professional.degree || '', DEGREE_OPTIONS),
				college: normalizeOptionValue(profile.professional.college || '', COLLEGE_OPTIONS),
				yearOfPassing: profile.professional.yearOfPassing || '',
				qualificationProof: profile.professional.qualificationProof || '',
				registrationNumber: profile.professional.registrationNumber || '',
				registrationProof: profile.professional.registrationProof || '',
				about: profile.professional.about || '',
			})

			await updateUser({
				name: profile.personal.name || user?.name || '',
				email: profile.personal.email || user?.email || '',
				avatar: profile.personal.avatar || user?.avatar,
			})
		} catch (error) {
			console.log('[ProfessionalDetailsTab] failed to sync saved profile:', error)
		}
	}

	const handleUpload = async (field: 'qualificationProof' | 'registrationProof') => {
		const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()

		if (!permission.granted) {
			Alert.alert('Permission needed', 'Please allow photo library access to upload your proof.')
			return
		}

		const result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ImagePicker.MediaTypeOptions.Images,
			allowsMultipleSelection: false,
			quality: 0.8,
		})

		if (result.canceled || !result.assets.length) {
			return
		}

		const asset = result.assets[0]
		const fileLabel = asset.fileName || asset.uri.split('/').pop() || 'Selected file'
		updateFormData(field, fileLabel)
	}

	const handleSpecialitySelect = (value: string) => {
		const selected = specialities.find((item) => item.value === value)
		setFormData((prev) => ({
			...prev,
			specialization_id: value,
			specialization_label: selected?.label || '',
		}))
	}

	const handleSave = async () => {
		const payload = {
			speciality_id: formData.specialization_id,
			specialization_id: formData.specialization_id,
			specialization: formData.specialization_id,
			degree: formData.degree.trim(),
			college: formData.college.trim(),
			year_of_passing: formData.yearOfPassing.trim(),
			qualification_proof_s3_key: formData.qualificationProof.trim(),
			registration_number: formData.registrationNumber.trim(),
			registration_proof_s3_key: formData.registrationProof.trim(),
			about: formData.about.trim(),
		}

		if (!payload.speciality_id) {
			Alert.alert('Validation', 'Please select your specialization.')
			return
		}

		if (!payload.degree) {
			Alert.alert('Validation', 'Please select your degree.')
			return
		}

		if (!payload.college) {
			Alert.alert('Validation', 'Please select your college or university.')
			return
		}

		if (payload.year_of_passing && !/^\d{4}$/.test(payload.year_of_passing)) {
			Alert.alert('Validation', 'Please enter a valid 4-digit year of passing.')
			return
		}

		try {
			setIsSaving(true)

			await doctorService.updateDoctorProfile(payload)
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
		if (width >= 1280) return 980
		if (width >= 1024) return 920
		if (isTablet) return 820
		return 640
	}, [isTablet, width])

	const sectionPadding = isMobile ? 16 : isTablet ? 20 : 24
	const rowSpacing = isMobile ? 18 : isLandscape ? 22 : 20
	const titleBottom = isMobile ? 18 : 22
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

				<View style={{ marginTop: isMobile ? 20 : 24, marginBottom: rowSpacing }}>
					<SectionTitle>Educational Qualification and Proof</SectionTitle>
					<View style={{ gap: 18 }}>
						<SelectDropdown
							label="Select Degree"
							value={formData.degree}
							placeholder="Select your degree"
							options={DEGREE_OPTIONS}
							onSelect={(value) => updateFormData('degree', value)}
							required
						/>

						<FormRow stacked={!useTwoColumns} compact={isTablet}>
							<SelectDropdown
								label="Select College/University"
								value={formData.college}
								placeholder="Select college or university"
								options={COLLEGE_OPTIONS}
								onSelect={(value) => updateFormData('college', value)}
								required
							/>
							<InputField
								label="Select Year"
								value={formData.yearOfPassing}
								onChangeText={(value) => updateFormData('yearOfPassing', value.replace(/\D/g, '').slice(0, 4))}
								placeholder="Enter year of passing"
								keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'numeric'}
								maxLength={4}
								required
							/>
						</FormRow>

						<UploadBox
							label="Upload image or PDF of Qualification proofs"
							required
							description="Non allied practitioners should submit council registration proof with mentioned degree name. Allied practitioners should submit mark sheets / passing certificates from UGC approved university."
							fileName={formData.qualificationProof}
							onUpload={() => handleUpload('qualificationProof')}
							stacked={isMobile}
						/>
					</View>
				</View>

				<View style={styles.sectionDivider} />

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

						<FormRow stacked={!useTwoColumns} compact={isTablet} alignBottom>
							<InputField
								label="Registration Number"
								value={formData.registrationNumber}
								onChangeText={(value) => updateFormData('registrationNumber', value)}
								placeholder="Enter registration number"
								required
							/>
							<UploadBox
								label=""
								required
								fileName={formData.registrationProof}
								onUpload={() => handleUpload('registrationProof')}
								stacked={isMobile}
							/>
						</FormRow>

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
	uploadSection: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		columnGap: 16,
	},
	uploadSectionStacked: {
		flexDirection: 'column',
		alignItems: 'stretch',
		rowGap: 14,
	},
	uploadCopy: {
		flex: 1,
		minWidth: 0,
	},
	uploadDescription: {
		color: '#6e6e6e',
		fontSize: 12,
		lineHeight: 19,
	},
	uploadFileName: {
		marginTop: 6,
		color: '#1f8a8f',
		fontSize: 12,
		lineHeight: 18,
		fontWeight: '600',
	},
	uploadTile: {
		width: 84,
		height: 84,
		borderWidth: 1.5,
		borderStyle: 'dashed',
		borderColor: '#c8d8db',
		borderRadius: 10,
		backgroundColor: 'rgba(43,111,113,0.03)',
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 8,
	},
	uploadTileCompact: {
		alignSelf: 'flex-start',
	},
	uploadTileStacked: {
		width: '100%',
		height: 90,
	},
	uploadTileText: {
		marginTop: 4,
		color: '#0c7c7c',
		fontSize: 12,
		lineHeight: 16,
		fontWeight: '600',
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
