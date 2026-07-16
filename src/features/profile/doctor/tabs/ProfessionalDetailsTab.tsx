import React, { useEffect, useMemo, useState } from 'react'
import {
	ActivityIndicator,
	Alert,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	StyleSheet,
	TextInput,
	TouchableOpacity,
	View,
	useWindowDimensions,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import {
	AppBottomSheet,
	AppStickyFooter,
	AppInput,
	AppSelect,
	AppSelectOption,
	AppMultiSelect,
	AppTypography,
	StatusModal,
} from '../../../../components/common'
import { useAuth } from '../../../../context/AuthContext'
import {
	getDoctorProfile,
	getSpecialities,
	getAreasOfExpertise,
	getTreatmentsOffering,
	mapDoctorProfileApi,
	updateDoctorProfessionalDetails,
	updateDoctorAdditionalDetails,
} from '../../../doctor/doctorService'

type Option = AppSelectOption

type ProfessionalFormData = {
	specialization_id: string
	specialization_label: string
	currentDesignation: string
	areasOfExpertise: string[]
	treatments: string[]
	registrationNumber: string
	registrationProof: string
	about: string
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

function MultiSelectDropdown({
	label,
	values,
	placeholder,
	options,
	onChange,
	required = false,
}: {
	label: string
	values: string[]
	placeholder: string
	options: Option[]
	onChange: (values: string[]) => void
	required?: boolean
}) {
	return (
		<View style={styles.fieldGroup}>
			{label ? <FieldLabel label={label} required={required} /> : null}
			<AppMultiSelect
				values={values}
				placeholder={placeholder}
				options={options}
				onChange={onChange}
				borderRadius={10}
				size="form"
				noMargin
			/>
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
		treatments: [],
		registrationNumber: '',
		registrationProof: '',
		about: '',
	})
	const [experienceYears, setExperienceYears] = useState<string>('')
	const [specialities, setSpecialities] = useState<Option[]>([])
	const [isLoadingProfile, setIsLoadingProfile] = useState(false)
	const [isLoadingSpecialities, setIsLoadingSpecialities] = useState(false)
	const [isSaving, setIsSaving] = useState(false)
	const [statusModal, setStatusModal] = useState<{
		visible: boolean
		status: 'success' | 'error'
		title: string
		description: string
		submitText?: string
	} | null>(null)

	const [expertiseOptions, setExpertiseOptions] = useState<Option[]>([])
	const [treatmentOptions, setTreatmentOptions] = useState<Option[]>([])

	const updateFormData = <K extends keyof ProfessionalFormData>(key: K, value: ProfessionalFormData[K]) => {
		setFormData((prev) => ({ ...prev, [key]: value }))
	}

	useEffect(() => {
		const fetchSpecialities = async () => {
			try {
				setIsLoadingSpecialities(true)
				const [resSpec, resExp, resTreat] = await Promise.all([
					getSpecialities(),
					getAreasOfExpertise(),
					getTreatmentsOffering(),
				])
				const formattedSpec = (resSpec.data ?? []).map((item: { id: string; label: string }) => ({
					value: item.id,
					label: item.label,
				}))
				const formattedExp = (resExp.data ?? []).map((item: { id: string; label: string }) => ({
					value: item.id,
					label: item.label,
				}))
				const formattedTreat = (resTreat.data ?? []).map((item: { id: string; label: string }) => ({
					value: item.id,
					label: item.label,
				}))
				setSpecialities(formattedSpec)
				setExpertiseOptions(formattedExp)
				setTreatmentOptions(formattedTreat)
			} catch (error) {
				console.log('[ProfessionalDetailsTab] failed to fetch specialities/master data:', error)
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
					treatments: profile.professional.treatments || [],
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
				treatments: profile.professional.treatments || [],
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

		const profPayload = {
			experience_years: experienceYears !== '' && !isNaN(parsedExperience) ? parsedExperience : 0,
			current_designation: formData.currentDesignation.trim(),
			registration_number: formData.registrationNumber.trim(),
			registration_proof_s3_key: formData.registrationProof.trim() || null,
			about: formData.about.trim(),
		}

		const addlPayload = {
			areas_of_expertise: formData.areasOfExpertise,
			treatments: formData.treatments,
		}

		try {
			setIsSaving(true)
			await Promise.all([
				updateDoctorProfessionalDetails(profPayload),
				updateDoctorAdditionalDetails(addlPayload),
			])
			await syncProfileAfterSave()
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
	const selectedLabel = formData.specialization_label



	if (isLoadingProfile) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size="small" color="#0c7c7c" />
			</View>
		)
	}

	return (
		<View style = {{flex: 1}} >
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

							<MultiSelectDropdown
								label="Areas of Expertise"
								values={formData.areasOfExpertise}
								onChange={(val) => updateFormData('areasOfExpertise', val)}
								options={expertiseOptions}
								placeholder="Select areas of expertise"
							/>

							<MultiSelectDropdown
								label="Treatments & Procedures"
								values={formData.treatments}
								onChange={(val) => updateFormData('treatments', val)}
								options={treatmentOptions}
								placeholder="Select treatments or procedures"
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
					onSubmit={() => setStatusModal(null)}
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
	fieldHeaderRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 8,
	},
	fieldLabel: {
		marginBottom: 0,
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
	// Bottom sheet
	sheetBody: {
		paddingHorizontal: 16,
		paddingTop: 8,
		paddingBottom: 8,
	},
	sheetInputBox: {
		borderWidth: 1,
		borderColor: '#d0dadd',
		borderRadius: 10,
		minHeight: 100,
		padding: 12,
		backgroundColor: '#fafcfc',
	},
	sheetTextInput: {
		fontSize: 14,
		color: '#1a2226',
		minHeight: 80,
		padding: 0,
	},
	sheetSaveBtn: {
		marginTop: 16,
		backgroundColor: '#0c7c7c',
		borderRadius: 24,
		paddingVertical: 13,
		alignItems: 'center',
	},
	sheetSaveBtnDisabled: {
		opacity: 0.45,
	},
	sheetSaveBtnText: {
		color: '#fff',
		fontWeight: '600',
	},
})
