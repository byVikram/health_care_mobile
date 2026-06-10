import React, { useMemo, useState } from 'react'
import {
	Alert,
	ScrollView,
	StyleSheet,
	TouchableOpacity,
	View,
	useWindowDimensions,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { AppButton, AppInput, AppSelect, AppSelectOption, AppTypography } from '../../../../components/common'
import {
	type DoctorEducationalQualificationPayload,
	updateDoctorEducationalQualifications,
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

const mapQualificationToPayload = (qualification: Qualification): DoctorEducationalQualificationPayload => ({
	qualification_type: qualification.type.trim(),
	qualification_name: qualification.name.trim(),
	institute_university: getInstituteLabel(qualification).trim(),
	institute_university_value: qualification.institute.trim(),
	custom_institute_university:
		qualification.institute === 'other' ? qualification.customInstitute.trim() || null : null,
	year_of_completion: qualification.yearOfCompletion.trim(),
	certificate_s3_key: qualification.certificate.trim() || null,
})

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
					{qualificationName}
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

	const contentWidth = useMemo(() => {
		if (width >= 1280) return 760
		if (width >= 1024) return 680
		if (isTablet) return 600
		return 640
	}, [isTablet, width])

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
					qualification.id === editingId ? { ...qualification, ...formData } : qualification,
				),
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
	}

	const handleEditQualification = (qualification: Qualification) => {
		setFormData({
			type: qualification.type,
			name: qualification.name,
			institute: qualification.institute,
			customInstitute: qualification.customInstitute,
			yearOfCompletion: qualification.yearOfCompletion,
			certificate: qualification.certificate,
		})
		setEditingId(qualification.id)
	}

	const handleDeleteQualification = (id: string) => {
		setQualifications((prev) => prev.filter((qualification) => qualification.id !== id))
		if (editingId === id) resetForm()
	}

	const handleSave = async () => {
		const qualificationsForSubmission = editingId
			? qualifications.map((qualification) =>
					qualification.id === editingId ? { ...qualification, ...formData } : qualification,
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

		const payload = {
			educational_qualifications: qualificationsForSubmission.map(mapQualificationToPayload),
		}

		try {
			setIsSaving(true)
			await updateDoctorEducationalQualifications(payload)
			setQualifications(qualificationsForSubmission)
			if (editingId) resetForm()
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
		<ScrollView
			style={styles.container}
			contentContainerStyle={[
				styles.contentContainer,
				{
					paddingHorizontal: sectionPadding,
					paddingTop: sectionPadding,
					paddingBottom: sectionPadding + 10,
				},
			]}
			keyboardShouldPersistTaps="handled"
			showsVerticalScrollIndicator={false}
		>
			<View style={[styles.contentShell, { maxWidth: contentWidth }]}>
				<View style={styles.headerRow}>
					<View>
						<AppTypography variant="h4" style={styles.headerTitle}>
							Educational Qualifications
						</AppTypography>
						<AppTypography variant="caption" style={styles.headerSubtitle}>
							Add your degrees, fellowships, diplomas and certificates.
						</AppTypography>
					</View>
				</View>

				<View style={[styles.formPanel, { marginBottom: rowSpacing }]}>
					<View style={styles.formGrid}>
						<View style={[styles.formCell, useTwoColumns && styles.formCellHalf]}>
							<SelectDropdown
								label="Qualification Type"
								value={formData.type}
								placeholder="Select Type"
								options={QUALIFICATION_TYPE_OPTIONS}
								onSelect={(value) => updateFormData('type', value)}
								required
							/>
						</View>

						<View style={[styles.formCell, useTwoColumns && styles.formCellHalf]}>
							<SelectDropdown
								label="Qualification Name"
								value={formData.name}
								placeholder="Select Qualification"
								options={DEGREE_OPTIONS}
								onSelect={(value) => updateFormData('name', value)}
								required
							/>
						</View>

						<View style={[styles.formCell, useTwoColumns && styles.formCellHalf]}>
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
						</View>

						{formData.institute === 'other' ? (
							<View style={[styles.formCell, useTwoColumns && styles.formCellHalf]}>
								<InputField
									label="Custom Institute/University"
									value={formData.customInstitute}
									onChangeText={(value) => updateFormData('customInstitute', value)}
									placeholder="Enter college or university name"
									required
								/>
							</View>
						) : null}

						<View style={[styles.formCell, useTwoColumns && styles.formCellHalf]}>
							<SelectDropdown
								label="Year of Completion"
								value={formData.yearOfCompletion}
								placeholder="Select Year"
								options={YEAR_OPTIONS}
								onSelect={(value) => updateFormData('yearOfCompletion', value)}
								required
							/>
						</View>

						<View style={styles.formCell}>
							<UploadBox fileName={formData.certificate} onUpload={handleUpload} />
						</View>
					</View>

					<View style={styles.formActions}>
						<AppButton
							variant={editingId ? 'secondary' : 'primary'}
							formAction
							icon={editingId ? 'content-save-edit-outline' : 'plus'}
							style={styles.addButton}
							onPress={handleAddOrUpdateQualification}
						>
							{editingId ? 'Update Qualification' : 'Add Qualification'}
						</AppButton>

						{editingId ? (
							<AppButton variant="text" formAction style={styles.cancelButton} onPress={resetForm}>
								Cancel
							</AppButton>
						) : null}
					</View>
				</View>

				<View style={styles.listHeader}>
					<AppTypography variant="h4" style={styles.listTitle}>
						Your Qualifications ({qualifications.length})
					</AppTypography>
					<AppTypography variant="caption" style={styles.reorderHint}>
						Drag to reorder
					</AppTypography>
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
							<MaterialCommunityIcons name="school-outline" size={24} color="#0c7c7c" />
							<AppTypography variant="body" style={styles.emptyTitle}>
								No qualifications added yet
							</AppTypography>
							<AppTypography variant="caption" style={styles.emptyText}>
								Fill the form above and add your first qualification.
							</AppTypography>
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
							Your qualifications help patients trust your expertise and help us verify your profile more efficiently.
						</AppTypography>
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
					Save & Continue
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
	formPanel: {
		borderWidth: 1,
		borderTopWidth: 0,
		borderColor: '#dfe7f5',
		borderBottomLeftRadius: 8,
		borderBottomRightRadius: 8,
		padding: 14,
		backgroundColor: '#ffffff',
	},
	formGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		marginHorizontal: -6,
		rowGap: 14,
	},
	formCell: {
		width: '100%',
		paddingHorizontal: 6,
	},
	formCellHalf: {
		width: '50%',
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
	formActions: {
		flexDirection: 'row',
		alignItems: 'center',
		flexWrap: 'wrap',
		marginTop: 16,
		gap: 10,
	},
	addButton: {
		flexGrow: 1,
		marginTop: 0,
		minWidth: 190,
	},
	cancelButton: {
		marginTop: 0,
		minWidth: 90,
	},
	listHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 10,
	},
	listTitle: {
		color: '#263238',
		fontSize: 16,
		lineHeight: 22,
		fontWeight: '700',
	},
	reorderHint: {
		color: '#7a858d',
		fontSize: 11,
		lineHeight: 16,
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
		marginTop: 28,
		width: '100%',
	},
})
