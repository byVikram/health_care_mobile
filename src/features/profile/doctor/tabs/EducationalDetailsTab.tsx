import React, { useMemo, useState, useEffect } from 'react'
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View, useWindowDimensions, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { AppBottomSheet, AppButton, AppInput, AppSelect, AppSelectOption, AppStickyFooter, AppTypography } from '../../../../components/common'
import {
	type DoctorEducationalQualificationsUpdatePayload,
	updateDoctorEducationalQualifications,
	getDoctorProfile,
	mapDoctorProfileApi,
} from '../../../doctor/doctorService'

const QUALIFICATION_TYPE_OPTIONS: AppSelectOption[] = [
	{ value: 'Degree', label: 'Degree' },
	{ value: 'Fellowship', label: 'Fellowship' },
	{ value: 'Diploma', label: 'Diploma' },
	{ value: 'Certification', label: 'Certification' },
	{ value: 'Other', label: 'Other' },
]

const DEGREE_OPTIONS: AppSelectOption[] = [
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

const COLLEGE_OPTIONS: AppSelectOption[] = [
	{ value: 'kms', label: 'Karnataka Medical Science (KMS)' },
	{ value: 'aiims', label: 'AIIMS' },
	{ value: 'afmc', label: 'Armed Forces Medical College' },
	{ value: 'jipmer', label: 'JIPMER' },
	{ value: 'mmc', label: 'Madras Medical College' },
	{ value: 'other', label: 'Other' },
]

const YEAR_OPTIONS: AppSelectOption[] = Array.from({ length: 55 }, (_, index) => {
	const year = String(new Date().getFullYear() - index)
	return { value: year, label: year }
})

type QualificationFormData = {
	type: string
	name: string
	specialization?: string
	institute: string
	customInstitute: string
	yearOfCompletion: string
	certificate: string
}

type Qualification = QualificationFormData & {
	id: string
}

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
	options: AppSelectOption[]
	onSelect: (value: string) => void
	required?: boolean
}

type UploadBoxProps = {
	fileName?: string
	onUpload: () => void
}

const EMPTY_FORM: QualificationFormData = {
	type: '',
	name: '',
	specialization: '',
	institute: '',
	customInstitute: '',
	yearOfCompletion: '',
	certificate: '',
}

const getOptionLabel = (options: AppSelectOption[], value: string) =>
	options.find((option) => option.value === value)?.label || value

const getInstituteLabel = (qualification: QualificationFormData) =>
	qualification.institute === 'other'
		? qualification.customInstitute
		: getOptionLabel(COLLEGE_OPTIONS, qualification.institute)



function FieldLabel({ label, required = false }: { label: string; required?: boolean }) {
	return (
		<AppTypography variant="caption" style={styles.fieldLabel}>
			{label}
			{required ? (
				<AppTypography variant="caption" style={styles.requiredMark}>
					{' '}
					*
				</AppTypography>
			) : null}
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
	return (
		<View style={styles.fieldGroup}>
			<FieldLabel label={label} required={required} />
			<AppInput
				value={value}
				onChangeText={onChangeText}
				placeholder={placeholder}
				placeholderTextColor="#9a9a9a"
				keyboardType={keyboardType}
				maxLength={maxLength}
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
			<FieldLabel label={label} required={required} />
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

function UploadBox({ fileName, onUpload }: UploadBoxProps) {
	return (
		<View style={styles.fieldGroup}>
			<FieldLabel label="Upload Certificate" required />
			<TouchableOpacity style={styles.uploadBox} activeOpacity={0.85} onPress={onUpload}>
				<View style={styles.uploadIconWrap}>
					<MaterialCommunityIcons name="file-upload-outline" size={24} color="#0c7c7c" />
				</View>
				<AppTypography variant="body" style={styles.uploadTitle}>
					{fileName ? 'Certificate Selected' : 'Upload Certificate'}
				</AppTypography>
				<AppTypography variant="caption" style={styles.uploadHint} numberOfLines={1}>
					{fileName || 'JPG or PNG proof'}
				</AppTypography>
			</TouchableOpacity>
		</View>
	)
}

function QualificationCard({
	qualification,
	onEdit,
	onDelete,
}: {
	qualification: Qualification
	onEdit: () => void
	onDelete: () => void
}) {
	const qualificationName = getOptionLabel(DEGREE_OPTIONS, qualification.name)
	const instituteName = getInstituteLabel(qualification)

	return (
		<View style={styles.qualificationCard}>
			<View style={styles.cardDragHandle}>
				<MaterialCommunityIcons name="drag-vertical" size={18} color="#a5adb4" />
			</View>

			<View style={styles.cardIcon}>
				<MaterialCommunityIcons name="school-outline" size={20} color="#0c7c7c" />
			</View>

			<View style={styles.cardContent}>
				<AppTypography variant="body" style={styles.cardTitle} numberOfLines={1}>
					{qualificationName}{qualification.specialization ? ` (${qualification.specialization})` : ''}
				</AppTypography>
				<AppTypography variant="caption" style={styles.cardSubtitle} numberOfLines={1}>
					{instituteName || qualification.type}
				</AppTypography>
				<AppTypography variant="caption" style={styles.cardMeta}>
					{qualification.type} - {qualification.yearOfCompletion}
				</AppTypography>
			</View>

			<View style={styles.cardActions}>
				<TouchableOpacity style={styles.iconButton} onPress={onEdit} activeOpacity={0.75}>
					<MaterialCommunityIcons name="pencil-outline" size={18} color="#0c7c7c" />
				</TouchableOpacity>
				<TouchableOpacity style={styles.iconButton} onPress={onDelete} activeOpacity={0.75}>
					<MaterialCommunityIcons name="delete-outline" size={18} color="#ef5d5d" />
				</TouchableOpacity>
			</View>
		</View>
	)
}

export default function EducationalDetailsTab() {
	const { width } = useWindowDimensions()
	const isMobile = width < 768
	const isTablet = width >= 768 && width < 1024
	const useTwoColumns = width >= 768

	const [formData, setFormData] = useState<QualificationFormData>(EMPTY_FORM)
	const [qualifications, setQualifications] = useState<Qualification[]>([])
	const [editingId, setEditingId] = useState<string | null>(null)
	const [isSaving, setIsSaving] = useState(false)
	const [isLoadingProfile, setIsLoadingProfile] = useState(false)
	const [sheetVisible, setSheetVisible] = useState(false)

	useEffect(() => {
		const loadDoctorProfile = async () => {
			try {
				setIsLoadingProfile(true)
				const response = await getDoctorProfile()

				if (!response?.success || !response.data) return

				const profile = mapDoctorProfileApi(response.data)
				const degrees = profile.professional.degrees || []

				const mapped = degrees.map((d, index) => {
					const degValue = d.degree.toLowerCase()
					const isKnownDegree = DEGREE_OPTIONS.some((opt) => opt.value === degValue)

					let type = 'Degree'
					if (!isKnownDegree) {
						if (degValue.includes('fellowship')) type = 'Fellowship'
						else if (degValue.includes('diploma')) type = 'Diploma'
						else if (degValue.includes('certification')) type = 'Certification'
						else type = 'Other'
					}

					const isKnownCollege = COLLEGE_OPTIONS.some((opt) => opt.value === d.college)
					const institute = isKnownCollege ? d.college : 'other'
					const customInstitute = isKnownCollege ? '' : d.college

					return {
						id: d.id ? String(d.id) : `deg-${index}`,
						type,
						name: isKnownDegree ? degValue : d.degree,
						specialization: d.specialization || '',
						institute,
						customInstitute,
						yearOfCompletion: d.yearOfPassing,
						certificate: d.qualificationProof || '',
					}
				})
				setQualifications(mapped)
			} catch (error) {
				console.log('[EducationalDetailsTab] failed to load profile:', error)
			} finally {
				setIsLoadingProfile(false)
			}
		}

		loadDoctorProfile()
	}, [])

	const contentWidth = useMemo(() => {
		if (width >= 1280) return 760
		if (width >= 1024) return 680
		if (isTablet) return 600
		return 640
	}, [isTablet, width])

	if (isLoadingProfile) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size="small" color="#0c7c7c" />
			</View>
		)
	}

	const updateFormData = <K extends keyof QualificationFormData>(key: K, value: QualificationFormData[K]) => {
		setFormData((prev) => ({
			...prev,
			[key]: value,
		}))
	}

	const resetForm = () => {
		setFormData(EMPTY_FORM)
		setEditingId(null)
	}

	const handleAddPress = () => {
		resetForm()
		setSheetVisible(true)
	}

	const handleCloseSheet = () => {
		resetForm()
		setSheetVisible(false)
	}

	const handleUpload = async () => {
		const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()

		if (!permission.granted) {
			Alert.alert('Permission needed', 'Please allow photo library access to upload your certificate.')
			return
		}

		const result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ImagePicker.MediaTypeOptions.Images,
			allowsMultipleSelection: false,
			quality: 0.8,
		})

		if (result.canceled || !result.assets.length) return

		const asset = result.assets[0]
		updateFormData('certificate', asset.fileName || asset.uri.split('/').pop() || 'Selected certificate')
	}

	const validateForm = () => {
		if (!formData.type) return 'Please select a qualification type.'
		if (!formData.name.trim()) return 'Please select the qualification name.'
		if (!formData.institute.trim()) return 'Please select the institute or university.'
		if (formData.institute === 'other' && !formData.customInstitute.trim()) {
			return 'Please enter the custom institute or university name.'
		}
		if (!formData.yearOfCompletion) return 'Please select the year of completion.'
		if (!formData.certificate.trim()) return 'Please upload the certificate.'
		return ''
	}

	const handleAddOrUpdateQualification = () => {
		const validationMessage = validateForm()

		if (validationMessage) {
			Alert.alert('Validation', validationMessage)
			return
		}

		if (editingId) {
			setQualifications((prev) =>
				prev.map((qualification) =>
					qualification.id === editingId ? { ...qualification, ...formData } : qualification
				)
			)
		} else {
			setQualifications((prev) => [
				...prev,
				{
					id: `${Date.now()}`,
					...formData,
				},
			])
		}

		resetForm()
		setSheetVisible(false)
	}

	const handleEditQualification = (qualification: Qualification) => {
		setFormData({
			type: qualification.type,
			name: qualification.name,
			specialization: qualification.specialization || '',
			institute: qualification.institute,
			customInstitute: qualification.customInstitute,
			yearOfCompletion: qualification.yearOfCompletion,
			certificate: qualification.certificate,
		})
		setEditingId(qualification.id)
		setSheetVisible(true)
	}

	const handleDeleteQualification = (id: string) => {
		setQualifications((prev) => prev.filter((qualification) => qualification.id !== id))
		if (editingId === id) {
			resetForm()
			setSheetVisible(false)
		}
	}

	const handleSave = async () => {
		const qualificationsForSubmission = editingId
			? qualifications.map((qualification) =>
					qualification.id === editingId ? { ...qualification, ...formData } : qualification
				)
			: qualifications

		if (editingId) {
			const validationMessage = validateForm()

			if (validationMessage) {
				Alert.alert('Validation', validationMessage)
				return
			}
		}

		if (!qualificationsForSubmission.length) {
			Alert.alert('Validation', 'Please add at least one qualification before continuing.')
			return
		}

		const payload: DoctorEducationalQualificationsUpdatePayload = {
			degrees: qualificationsForSubmission.map((q) => {
				const collegeValue = q.institute === 'other' ? q.customInstitute : getOptionLabel(COLLEGE_OPTIONS, q.institute)
				return {
					degree: q.name,
					specialization: q.specialization?.trim() || null,
					college: collegeValue.trim(),
					year_of_passing: q.yearOfCompletion.trim(),
					qualification_proof_s3_key: q.certificate.trim() || null,
				}
			}),
		}

		try {
			setIsSaving(true)
			await updateDoctorEducationalQualifications(payload)
			setQualifications(qualificationsForSubmission)
			if (editingId) {
				resetForm()
				setSheetVisible(false)
			}
			Alert.alert('Success', 'Educational qualifications saved successfully.')
		} catch (error) {
			console.log('[EducationalDetailsTab] save error:', error)
			Alert.alert('Error', 'Unable to save educational qualifications right now.')
		} finally {
			setIsSaving(false)
		}
	}

	const sectionPadding = isMobile ? 16 : isTablet ? 20 : 24
	const rowSpacing = isMobile ? 16 : 20

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
					<View style={[styles.headerRow, { marginBottom: rowSpacing }]}>
						<View>
							<AppTypography variant="h4" style={styles.headerTitle}>
								Educational Qualifications
							</AppTypography>
							<AppTypography variant="caption" style={styles.headerSubtitle}>
								Add your degrees, fellowships, diplomas and certificates.
							</AppTypography>
						</View>
					</View>

					<View style={styles.listHeader}>
						<AppTypography variant="h4" style={styles.listTitle}>
							Your Qualifications ({qualifications.length})
						</AppTypography>
						{qualifications.length > 0 ? (
							<TouchableOpacity style={styles.headerAddButton} onPress={handleAddPress} activeOpacity={0.8}>
								<MaterialCommunityIcons name="plus" size={16} color="#0c7c7c" />
								<AppTypography variant="caption" style={styles.headerAddButtonText}>
									Add New
								</AppTypography>
							</TouchableOpacity>
						) : null}
					</View>

					<View style={styles.cardList}>
						{qualifications.length ? (
							qualifications.map((qualification) => (
								<QualificationCard
									key={qualification.id}
									qualification={qualification}
									onEdit={() => handleEditQualification(qualification)}
									onDelete={() => handleDeleteQualification(qualification.id)}
								/>
							))
						) : (
							<View style={styles.emptyCard}>
								<MaterialCommunityIcons name="school-outline" size={32} color="#0c7c7c" />
								<AppTypography variant="body" style={styles.emptyTitle}>
									No qualifications added yet
								</AppTypography>
								<AppTypography variant="caption" style={styles.emptyText}>
									Add your first degree, fellowship, or certificate to complete your profile.
								</AppTypography>
								<AppButton
									variant="primary"
									icon="plus"
									style={styles.emptyAddButton}
									onPress={handleAddPress}
								>
									Add Qualification
								</AppButton>
							</View>
						)}
					</View>

					<View style={styles.infoCard}>
						<MaterialCommunityIcons name="information" size={18} color="#0c7c7c" />
						<View style={styles.infoCopy}>
							<AppTypography variant="body" style={styles.infoTitle}>
								Why add all your qualifications?
							</AppTypography>
							<AppTypography variant="caption" style={styles.infoText}>
								Your qualifications help patients trust your expertise and help us verify your profile
								more efficiently.
							</AppTypography>
						</View>
					</View>
				</View>
			</ScrollView>
			<AppStickyFooter
				centered
				horizontalPadding={sectionPadding}
				contentStyle={styles.contentShell}
				contentMaxWidth={contentWidth}
				buttonStyle={styles.saveButton}
				onPress={handleSave}
				loading={isSaving}
				disabled={isSaving}
			>
				Save & Continue
			</AppStickyFooter>

			<AppBottomSheet
				visible={sheetVisible}
				title={editingId ? 'Edit Qualification' : 'Add Qualification'}
				onClose={handleCloseSheet}
			>
				<KeyboardAvoidingView
					behavior={Platform.OS === 'ios' ? 'padding' : undefined}
					keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
				>
					<View style={styles.sheetBody}>
						<View style={styles.sheetFormGrid}>
							<SelectDropdown
								label="Qualification Type"
								value={formData.type}
								placeholder="Select Type"
								options={QUALIFICATION_TYPE_OPTIONS}
								onSelect={(value) => updateFormData('type', value)}
								required
							/>

							<SelectDropdown
								label="Qualification Name"
								value={formData.name}
								placeholder="Select Qualification"
								options={DEGREE_OPTIONS}
								onSelect={(value) => updateFormData('name', value)}
								required
							/>

							<InputField
								label="Specialization / Field (Optional)"
								value={formData.specialization || ''}
								onChangeText={(value) => updateFormData('specialization', value)}
								placeholder="e.g. Cardiology, Pediatrics"
							/>

							<SelectDropdown
								label="Institute/University"
								value={formData.institute}
								placeholder="Select Institute/University"
								options={COLLEGE_OPTIONS}
								onSelect={(value) =>
									setFormData((prev) => ({
										...prev,
										institute: value,
										customInstitute: value === 'other' ? prev.customInstitute : '',
									}))
								}
								required
							/>

							{formData.institute === 'other' ? (
								<InputField
									label="Custom Institute/University"
									value={formData.customInstitute}
									onChangeText={(value) => updateFormData('customInstitute', value)}
									placeholder="Enter college or university name"
									required
								/>
							) : null}

							<SelectDropdown
								label="Year of Completion"
								value={formData.yearOfCompletion}
								placeholder="Select Year"
								options={YEAR_OPTIONS}
								onSelect={(value) => updateFormData('yearOfCompletion', value)}
								required
							/>

							<UploadBox fileName={formData.certificate} onUpload={handleUpload} />
						</View>

						<View style={styles.sheetActions}>
							<AppButton
								variant="primary"
								formAction
								icon={editingId ? 'content-save-edit-outline' : 'plus'}
								style={styles.sheetSubmitButton}
								onPress={handleAddOrUpdateQualification}
							>
								{editingId ? 'Update' : 'Add'}
							</AppButton>

							<AppButton variant="text" formAction style={styles.sheetCancelButton} onPress={handleCloseSheet}>
								Cancel
							</AppButton>
						</View>
					</View>
				</KeyboardAvoidingView>
			</AppBottomSheet>
		</View>
	)
}

const styles = StyleSheet.create({
	loadingContainer: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#ffffff',
	},
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
	headerRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		backgroundColor: '#f3f7ff',
		borderWidth: 1,
		borderColor: '#dfe7f5',
		borderRadius: 8,
		paddingHorizontal: 14,
		paddingVertical: 12,
	},
	headerTitle: {
		color: '#263238',
		fontSize: 16,
		lineHeight: 22,
		fontWeight: '700',
	},
	headerSubtitle: {
		marginTop: 2,
		color: '#6e7882',
		fontSize: 12,
		lineHeight: 18,
	},
	fieldGroup: {
		width: '100%',
	},
	fieldLabel: {
		marginBottom: 8,
		fontSize: 12,
		lineHeight: 18,
		color: '#2f3a40',
		fontWeight: '600',
	},
	requiredMark: {
		color: '#ef5d5d',
		fontSize: 12,
		lineHeight: 18,
		fontWeight: '700',
	},
	uploadBox: {
		minHeight: 120,
		borderWidth: 1.5,
		borderStyle: 'dashed',
		borderColor: '#b9d5dc',
		borderRadius: 10,
		backgroundColor: '#f5fbff',
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 14,
		paddingVertical: 16,
	},
	uploadIconWrap: {
		width: 32,
		height: 32,
		borderRadius: 16,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#e6f5f6',
	},
	uploadTitle: {
		marginTop: 8,
		color: '#0c7c7c',
		fontSize: 13,
		lineHeight: 18,
		fontWeight: '700',
	},
	uploadHint: {
		marginTop: 2,
		color: '#64717a',
		fontSize: 11,
		lineHeight: 16,
	},
	sheetBody: {
		paddingHorizontal: 20,
		paddingTop: 8,
		paddingBottom: 80,
	},
	sheetFormGrid: {
		gap: 16,
	},
	sheetActions: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 24,
		gap: 12,
	},
	sheetSubmitButton: {
		flex: 1,
		marginTop: 0,
	},
	sheetCancelButton: {
		flex: 1,
		marginTop: 0,
	},
	listHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginTop: 20,
		marginBottom: 10,
	},
	listTitle: {
		color: '#263238',
		fontSize: 16,
		lineHeight: 22,
		fontWeight: '700',
	},
	headerAddButton: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 4,
		paddingHorizontal: 8,
		borderRadius: 6,
		backgroundColor: '#e6f5f6',
		gap: 4,
	},
	headerAddButtonText: {
		color: '#0c7c7c',
		fontWeight: '700',
		fontSize: 12,
	},
	emptyAddButton: {
		marginTop: 14,
		minWidth: 160,
	},
	cardList: {
		gap: 10,
	},
	qualificationCard: {
		flexDirection: 'row',
		alignItems: 'center',
		borderWidth: 1,
		borderColor: '#dde6ea',
		borderRadius: 8,
		backgroundColor: '#ffffff',
		paddingHorizontal: 10,
		paddingVertical: 12,
	},
	cardDragHandle: {
		width: 18,
		alignItems: 'center',
	},
	cardIcon: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: '#eaf7f8',
		alignItems: 'center',
		justifyContent: 'center',
		marginHorizontal: 10,
	},
	cardContent: {
		flex: 1,
		minWidth: 0,
	},
	cardTitle: {
		color: '#263238',
		fontSize: 14,
		lineHeight: 19,
		fontWeight: '700',
	},
	cardSubtitle: {
		marginTop: 2,
		color: '#53636d',
		fontSize: 12,
		lineHeight: 17,
	},
	cardMeta: {
		marginTop: 2,
		color: '#7d8b94',
		fontSize: 11,
		lineHeight: 16,
	},
	cardActions: {
		flexDirection: 'row',
		alignItems: 'center',
		marginLeft: 8,
	},
	iconButton: {
		width: 32,
		height: 32,
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: 16,
	},
	emptyCard: {
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: 1,
		borderStyle: 'dashed',
		borderColor: '#cfe0e4',
		borderRadius: 8,
		backgroundColor: '#fbfdfd',
		padding: 18,
	},
	emptyTitle: {
		marginTop: 8,
		color: '#263238',
		fontSize: 14,
		lineHeight: 19,
		fontWeight: '700',
	},
	emptyText: {
		marginTop: 2,
		color: '#6d7a82',
		fontSize: 12,
		lineHeight: 17,
		textAlign: 'center',
	},
	infoCard: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		marginTop: 16,
		borderWidth: 1,
		borderColor: '#cfe0e4',
		borderRadius: 8,
		backgroundColor: '#edf7f9',
		paddingHorizontal: 12,
		paddingVertical: 12,
		columnGap: 10,
	},
	infoCopy: {
		flex: 1,
		minWidth: 0,
	},
	infoTitle: {
		color: '#263238',
		fontSize: 13,
		lineHeight: 18,
		fontWeight: '700',
	},
	infoText: {
		marginTop: 2,
		color: '#53636d',
		fontSize: 12,
		lineHeight: 17,
	},
	saveButton: {
		alignSelf: 'stretch',
		marginTop: 0,
		width: '100%',
	},
})
