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
import { fetchProviderStatusBackend, updateProviderLocationBackend } from '../../../ancillary/ancillaryService'

type Option = AppSelectOption

type ProfessionalFormData = {
	specialty: string
	qualification: string
	currentDesignation: string
	experience: string
	nursingRegistrationNumber: string
	stateNursingCouncil: string
	registrationProof: string
	verificationStatus: string
	about: string
	location: string
	latitude: string
	longitude: string
}

const SPECIALTY_OPTIONS: Option[] = [
	{ label: 'Nursing Care', value: 'Nursing Care' },
	{ label: 'Physiotherapy', value: 'Physiotherapy' },
	{ label: 'Rehabilitation', value: 'Rehabilitation' },
	{ label: 'Elderly Care', value: 'Elderly Care' },
]

const EXPERIENCE_OPTIONS: Option[] = [
	{ label: 'Less than 1 year', value: '<1' },
	{ label: '1 - 3 years', value: '1-3' },
	{ label: '3 - 5 years', value: '3-5' },
	{ label: '5 - 10 years', value: '5-10' },
	{ label: '10+ years', value: '10+' },
]

const LOCATION_OPTIONS: Option[] = [
	{ label: 'Bangalore', value: 'Bangalore' },
	{ label: 'Mumbai', value: 'Mumbai' },
	{ label: 'Delhi', value: 'Delhi' },
	{ label: 'Chennai', value: 'Chennai' },
	{ label: 'Hyderabad', value: 'Hyderabad' },
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

function UploadBox({
	label,
	fileName,
	onUpload,
	required = false,
}: {
	label: string
	fileName?: string
	onUpload: () => void
	required?: boolean
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
						{fileName ? 'Document Selected' : 'Upload Registration Proof / Document'}
					</AppTypography>
					<AppTypography variant="caption" style={styles.uploadHint} numberOfLines={1}>
						{fileName || 'Tap to choose image / proof document (JPG or PNG)'}
					</AppTypography>
				</View>
			</TouchableOpacity>
		</View>
	)
}

const isValidLatitude = (value: string) => {
	if (!value.trim()) return true
	const num = Number(value)
	return Number.isFinite(num) && num >= -90 && num <= 90
}

const isValidLongitude = (value: string) => {
	if (!value.trim()) return true
	const num = Number(value)
	return Number.isFinite(num) && num >= -180 && num <= 180
}

export default function ProfessionalDetailsTab() {
	const { width } = useWindowDimensions()

	const isTablet = width >= 768 && width < 1024
	const isMobile = width < 768
	const isLandscape = width > 900
	const useTwoColumns = width >= 768

	const [formData, setFormData] = useState<ProfessionalFormData>({
		specialty: 'Nursing Care',
		qualification: '',
		currentDesignation: '',
		experience: '',
		nursingRegistrationNumber: '',
		stateNursingCouncil: '',
		registrationProof: '',
		verificationStatus: 'pending',
		about: '',
		location: 'Hyderabad',
		latitude: '',
		longitude: '',
	})

	const [loading, setLoading] = useState(false)
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

	useEffect(() => {
		const loadDetails = async () => {
			try {
				setLoading(true)
				const spec = await AsyncStorage.getItem('ancillary_specialty')
				const qual = await AsyncStorage.getItem('ancillary_qualification')
				const desig = await AsyncStorage.getItem('ancillary_designation')
				const exp = await AsyncStorage.getItem('ancillary_experience')
				const regNo = await AsyncStorage.getItem('ancillary_license')
				const council = await AsyncStorage.getItem('ancillary_licensing_authority')
				const proof = await AsyncStorage.getItem('ancillary_registration_proof')
				const verification = await AsyncStorage.getItem('ancillary_verification_status')
				const abt = await AsyncStorage.getItem('ancillary_about')
				const loc = await AsyncStorage.getItem('ancillary_location')

				// Latitude / Longitude are backed by the ancillary_providers.current_lat /
				// current_lng columns via GET /api/ancillary/provider/status.
				const providerStatus = await fetchProviderStatusBackend()

				setFormData((prev) => ({
					...prev,
					specialty: spec || 'Nursing Care',
					qualification: qual || '',
					currentDesignation: desig || '',
					experience: exp || '',
					nursingRegistrationNumber: regNo || '',
					stateNursingCouncil: council || '',
					registrationProof: proof || '',
					verificationStatus: verification || 'pending',
					about: abt || '',
					location: loc || 'Hyderabad',
					latitude: providerStatus ? String(providerStatus.latitude) : prev.latitude,
					longitude: providerStatus ? String(providerStatus.longitude) : prev.longitude,
				}))
			} catch (e) {
				console.log('[ProfessionalDetailsTab] load error:', e)
			} finally {
				setLoading(false)
			}
		}

		loadDetails()
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

	const handleSave = async () => {
		if (!formData.nursingRegistrationNumber.trim()) {
			Alert.alert('Validation', 'Nursing Registration Number is required.')
			return
		}

		if (!isValidLatitude(formData.latitude)) {
			Alert.alert('Validation', 'Please enter a valid latitude between -90 and 90.')
			return
		}

		if (!isValidLongitude(formData.longitude)) {
			Alert.alert('Validation', 'Please enter a valid longitude between -180 and 180.')
			return
		}

		try {
			setIsSaving(true)
			await AsyncStorage.multiSet([
				['ancillary_specialty', formData.specialty],
				['ancillary_qualification', formData.qualification.trim()],
				['ancillary_designation', formData.currentDesignation.trim()],
				['ancillary_experience', formData.experience],
				['ancillary_license', formData.nursingRegistrationNumber.trim()],
				['ancillary_licensing_authority', formData.stateNursingCouncil.trim()],
				['ancillary_registration_proof', formData.registrationProof],
				['ancillary_about', formData.about.trim()],
				['ancillary_location', formData.location],
			])

			// Latitude / Longitude persist to the backend (ancillary_providers.current_lat /
			// current_lng) via the existing POST /api/ancillary/provider/location endpoint.
			const trimmedLat = formData.latitude.trim()
			const trimmedLng = formData.longitude.trim()
			if (trimmedLat && trimmedLng) {
				await updateProviderLocationBackend(Number(trimmedLat), Number(trimmedLng))
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

	if (loading) {
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
					{/* Verification status badge */}
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

					{/* Specialty / Clinical Practice */}
					<View style={{ marginBottom: rowSpacing }}>
						<SectionTitle>Specialty / Clinical Practice</SectionTitle>
						<SelectDropdown
							label="Primary Specialty"
							value={formData.specialty}
							placeholder="Select specialty"
							options={SPECIALTY_OPTIONS}
							onSelect={(val) => updateFormData('specialty', val)}
							required
						/>
					</View>

					{/* Professional Information */}
					<View style={{ marginBottom: rowSpacing }}>
						<SectionTitle>Professional Information</SectionTitle>
						<View style={{ gap: 18 }}>
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
									label="Practice Location Base"
									value={formData.location}
									placeholder="Select location"
									options={LOCATION_OPTIONS}
									onSelect={(val) => updateFormData('location', val)}
								/>
							</FormRow>

							<FormRow stacked={!useTwoColumns} compact={isTablet}>
								<InputField
									label="Latitude"
									value={formData.latitude}
									onChangeText={(val) => updateFormData('latitude', val)}
									placeholder="e.g. 17.3850"
									keyboardType="numbers-and-punctuation"
								/>
								<InputField
									label="Longitude"
									value={formData.longitude}
									onChangeText={(val) => updateFormData('longitude', val)}
									placeholder="e.g. 78.4867"
									keyboardType="numbers-and-punctuation"
								/>
							</FormRow>

							<FormRow stacked={!useTwoColumns} compact={isTablet}>
								<InputField
									label="Nursing Registration Number"
									value={formData.nursingRegistrationNumber}
									onChangeText={(val) => updateFormData('nursingRegistrationNumber', val)}
									placeholder="e.g. RN-12930"
									required
								/>
								<InputField
									label="State Nursing Council"
									value={formData.stateNursingCouncil}
									onChangeText={(val) => updateFormData('stateNursingCouncil', val)}
									placeholder="e.g. Karnataka State Nursing Council"
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

					{/* About / Bio */}
					<View style={{ marginTop: isMobile ? 20 : 24, marginBottom: rowSpacing }}>
						<SectionTitle>About / Bio</SectionTitle>
						<InputField
							label="About / Bio"
							value={formData.about}
							onChangeText={(val) => updateFormData('about', val)}
							placeholder="Write a short professional bio describing your experience and care approach"
						/>
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
