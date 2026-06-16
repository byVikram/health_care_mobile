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
	AppTypography,
	StatusModal,
} from '../../../../components/common'
import { useAuth } from '../../../../context/AuthContext'
import {
	getDoctorProfile,
	getSpecialities,
	mapDoctorProfileApi,
	updateDoctorProfessionalDetails,
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

type SheetMode = 'expertise' | 'treatment' | null

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

// Chip list with "+ add" trigger that opens AppBottomSheet
function ChipListField({
	label,
	items,
	onRemove,
	onOpenSheet,
	emptyText,
	required = false,
}: {
	label: string
	items: string[]
	onRemove: (index: number) => void
	onOpenSheet: () => void
	emptyText: string
	required?: boolean
}) {
	return (
		<View style={styles.fieldGroup}>
			<View style={styles.fieldHeaderRow}>
				<FieldLabel label={label} required={required} />
				<TouchableOpacity onPress={onOpenSheet} activeOpacity={0.8} style={styles.addBtn}>
					<AppTypography variant="caption" style={styles.addBtnText}>
						+ add
					</AppTypography>
				</TouchableOpacity>
			</View>
			<View style={styles.chipsContainer}>
				{items.length === 0 ? (
					<AppTypography variant="body" style={styles.emptyText}>
						{emptyText}
					</AppTypography>
				) : (
					items.map((item, index) => (
						<View key={`${item}-${index}`} style={styles.chip}>
							<AppTypography variant="caption" style={styles.chipText}>
								{item}
							</AppTypography>
							<TouchableOpacity
								onPress={() => onRemove(index)}
								hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
							>
								<MaterialCommunityIcons name="close-circle" size={16} color="#0c7c7c" />
							</TouchableOpacity>
						</View>
					))
				)}
			</View>
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

	// Bottom sheet state
	const [sheetMode, setSheetMode] = useState<SheetMode>(null)
	const [sheetDraft, setSheetDraft] = useState('')

	const updateFormData = <K extends keyof ProfessionalFormData>(key: K, value: ProfessionalFormData[K]) => {
		setFormData((prev) => ({ ...prev, [key]: value }))
	}

	const openSheet = (mode: SheetMode) => {
		setSheetDraft('')
		setSheetMode(mode)
	}

	const closeSheet = () => {
		setSheetMode(null)
		setSheetDraft('')
	}

	const handleSheetSave = () => {
		const trimmed = sheetDraft.trim()
		if (!trimmed) return

		if (sheetMode === 'expertise') {
			const isDuplicate = formData.areasOfExpertise.some(
				(e) => e.toLowerCase() === trimmed.toLowerCase()
			)
			if (!isDuplicate) {
				updateFormData('areasOfExpertise', [...formData.areasOfExpertise, trimmed])
			}
		} else if (sheetMode === 'treatment') {
			const isDuplicate = formData.treatments.some(
				(t) => t.toLowerCase() === trimmed.toLowerCase()
			)
			if (!isDuplicate) {
				updateFormData('treatments', [...formData.treatments, trimmed])
			}
		}

		closeSheet()
	}

	const handleRemoveExpertise = (index: number) => {
		updateFormData(
			'areasOfExpertise',
			formData.areasOfExpertise.filter((_, i) => i !== index)
		)
	}

	const handleRemoveTreatment = (index: number) => {
		updateFormData(
			'treatments',
			formData.treatments.filter((_, i) => i !== index)
		)
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

		const payload = {
			experience_years: experienceYears !== '' && !isNaN(parsedExperience) ? parsedExperience : 0,
			current_designation: formData.currentDesignation.trim(),
			areas_of_expertise: formData.areasOfExpertise,
			treatments: formData.treatments,
			registration_number: formData.registrationNumber.trim(),
			registration_proof_s3_key: formData.registrationProof.trim() || null,
			about: formData.about.trim(),
		}

		try {
			setIsSaving(true)
			await updateDoctorProfessionalDetails(payload)
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

	const sheetTitle =
		sheetMode === 'expertise'
			? 'Add Area of Expertise'
			: sheetMode === 'treatment'
				? 'Add Treatment & Procedure'
				: ''
	const sheetPlaceholder =
		sheetMode === 'expertise'
			? 'e.g. Interventional Cardiology'
			: 'e.g. Coronary Angioplasty'

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

							<ChipListField
								label="Areas of Expertise"
								items={formData.areasOfExpertise}
								onRemove={handleRemoveExpertise}
								onOpenSheet={() => openSheet('expertise')}
								emptyText="No areas of expertise added yet."
							/>

							<ChipListField
								label="Treatments & Procedures"
								items={formData.treatments}
								onRemove={handleRemoveTreatment}
								onOpenSheet={() => openSheet('treatment')}
								emptyText="No treatments or procedures added yet."
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

				{/* Shared bottom sheet for expertise + treatments */}
				<AppBottomSheet
					visible={sheetMode !== null}
					title={sheetTitle}
					onClose={closeSheet}
				>
					<KeyboardAvoidingView
						behavior={Platform.OS === 'ios' ? 'padding' : undefined}
						keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
					>
						<View style={styles.sheetBody}>
							<View style={styles.sheetInputBox}>
								<TextInput
									style={styles.sheetTextInput}
									value={sheetDraft}
									onChangeText={setSheetDraft}
									placeholder={sheetPlaceholder}
									placeholderTextColor="#b0bcc0"
									multiline={sheetMode === 'treatment'}
									autoFocus
									textAlignVertical={sheetMode === 'treatment' ? 'top' : 'center'}
								/>
							</View>
							<TouchableOpacity
								style={[styles.sheetSaveBtn, !sheetDraft.trim() && styles.sheetSaveBtnDisabled]}
								onPress={handleSheetSave}
								activeOpacity={0.8}
								disabled={!sheetDraft.trim()}
							>
								<AppTypography variant="subtitle" style={styles.sheetSaveBtnText}>
									Save
								</AppTypography>
							</TouchableOpacity>
						</View>
					</KeyboardAvoidingView>
				</AppBottomSheet>
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
	addBtn: {
		paddingVertical: 2,
		paddingHorizontal: 8,
	},
	addBtnText: {
		color: '#0c7c7c',
		fontWeight: '600',
		fontSize: 13,
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
	// Chip list
	chipsContainer: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		marginTop: 4,
		gap: 8,
	},
	chip: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#f0f7f7',
		borderWidth: 1,
		borderColor: '#d4e8ea',
		borderRadius: 20,
		paddingVertical: 6,
		paddingHorizontal: 12,
		gap: 6,
	},
	chipText: {
		fontSize: 13,
		color: '#1f6e71',
		fontWeight: '500',
	},
	emptyText: {
		color: '#9aabb0',
		fontSize: 14,
		fontStyle: 'italic',
		marginLeft: 2,
		marginTop: 2,
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
