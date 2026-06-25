import React, { useEffect, useMemo, useState } from 'react'
import * as ImagePicker from 'expo-image-picker'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Alert, ScrollView, TouchableOpacity, StyleSheet, View, useWindowDimensions } from 'react-native'
import {
	AppInput,
	AppPhotoPicker,
	AppStickyFooter,
	AppTypography,
	StatusModal,
	type AppPhotoPickerUpload,
} from '../../../../components/common'
import {
	buildLaboratoryProfileUpdatePayload,
	mergeLaboratoryProfileData,
	updateLaboratoryProfile,
} from '../laboratoryService'
import { LaboratoryProfileData } from '../../../../types/laboratory-profile-api'

const DEFAULT_LOGO_IMAGE = require('../../../../assets/Banner/pharmacy.png')

type LaboratoryDetailsFormData = {
	name: string
	logoS3Key: string
	licenseNumber: string
	licenseProofS3Key: string
	gstNumber: string
	address: string
	city: string
	state: string
	pincode: string
	latitude: string
	longitude: string
}

type UploadBoxProps = {
	label: string
	required?: boolean
	description?: string
	fileName?: string
	onUpload: () => void
	stacked: boolean
}

type LaboratoryDetailsTabProps = {
	profileData?: LaboratoryProfileData | null
	onProfileChange?: React.Dispatch<React.SetStateAction<LaboratoryProfileData | null>>
}

function FormRow({ children, stacked, compact }: { children: React.ReactNode; stacked: boolean; compact: boolean }) {
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
			{required ? (
				<AppTypography variant="caption" style={styles.requiredMark}>
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
	autoCapitalize = 'sentences',
	maxLength,
	required = false,
	multiline = false,
}: {
	label: string
	value: string
	onChangeText: (value: string) => void
	placeholder: string
	keyboardType?: React.ComponentProps<typeof AppInput>['keyboardType']
	autoCapitalize?: React.ComponentProps<typeof AppInput>['autoCapitalize']
	maxLength?: number
	required?: boolean
	multiline?: boolean
}) {
	return (
		<View style={styles.fieldGroup}>
			<FieldLabel label={label} required={required} />
			<AppInput
				value={value}
				onChangeText={onChangeText}
				placeholder={placeholder}
				placeholderTextColor="#9a9a9a"
				style={multiline && styles.multilineInput}
				contentStyle={multiline && styles.multilineInputContent}
				keyboardType={keyboardType}
				autoCapitalize={autoCapitalize}
				maxLength={maxLength}
				multiline={multiline}
				textAlignVertical={multiline ? 'top' : 'center'}
				fieldSize="form"
				noMargin
				dense
			/>
		</View>
	)
}

function UploadBox({ label, required, description, fileName, onUpload, stacked }: UploadBoxProps) {
	return (
		<View style={[styles.uploadSection, stacked && styles.uploadSectionStacked]}>
			<View style={styles.uploadCopy}>
				<FieldLabel label={label} required={required} />
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
				style={[styles.uploadTile, stacked && styles.uploadTileStacked]}
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

const parseCoordinate = (value: string) => {
	const trimmed = value.trim()
	if (!trimmed) return 0
	const parsed = Number(trimmed)
	return Number.isFinite(parsed) ? parsed : NaN
}

export default function LaboratoryDetailsTab({ profileData, onProfileChange }: LaboratoryDetailsTabProps) {
	const { width } = useWindowDimensions()
	const isTablet = width >= 768 && width < 1024
	const isMobile = width < 768
	const useTwoColumns = width >= 768

	const [formData, setFormData] = useState<LaboratoryDetailsFormData>({
		name: '',
		logoS3Key: '',
		licenseNumber: '',
		licenseProofS3Key: '',
		gstNumber: '',
		address: '',
		city: '',
		state: '',
		pincode: '',
		latitude: '',
		longitude: '',
	})
	const [logoUri, setLogoUri] = useState('')
	const [logoUpload, setLogoUpload] = useState<AppPhotoPickerUpload | null>(null)
	const [licenseProofUri, setLicenseProofUri] = useState('')
	const [licenseProofUpload, setLicenseProofUpload] = useState<AppPhotoPickerUpload | null>(null)
	const [isSaving, setIsSaving] = useState(false)
	const [statusModal, setStatusModal] = useState<{
		visible: boolean
		status: 'success' | 'error'
		title: string
		description: string
	} | null>(null)

	const updateFormData = <K extends keyof LaboratoryDetailsFormData>(key: K, value: LaboratoryDetailsFormData[K]) => {
		setFormData((prev) => ({ ...prev, [key]: value }))
	}

	const handleDocumentUpload = async () => {
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

		if (result.canceled || !result.assets.length) {
			return
		}

		const asset = result.assets[0]
		const fileLabel = asset.fileName || asset.uri.split('/').pop() || 'Selected file'

		updateFormData('licenseProofS3Key', fileLabel)
	}

	useEffect(() => {
		const details = profileData?.details
		if (!details) return

		const logoS3Key = details.logo_s3_key || ''
		const licenseProofS3Key = details.license_proof_s3_key || ''
		setLogoUri(logoS3Key)
		setLogoUpload(null)
		setLicenseProofUri(licenseProofS3Key)
		setLicenseProofUpload(null)
		setFormData({
			name: details.name || '',
			logoS3Key,
			licenseNumber: details.license_number || '',
			licenseProofS3Key,
			gstNumber: details.gst_number || '',
			address: details.address || '',
			city: details.city || '',
			state: details.state || '',
			pincode: details.pincode || '',
			latitude: details.latitude !== undefined && details.latitude !== null ? String(details.latitude) : '',
			longitude: details.longitude !== undefined && details.longitude !== null ? String(details.longitude) : '',
		})
	}, [profileData?.details])

	const handleSave = async () => {
		const name = formData.name.trim()
		const licenseNumber = formData.licenseNumber.trim()
		const licenseProofS3Key = formData.licenseProofS3Key.trim()
		const gstNumber = formData.gstNumber.trim()
		const address = formData.address.trim()
		const city = formData.city.trim()
		const state = formData.state.trim()
		const pincode = formData.pincode.trim()
		const latitude = parseCoordinate(formData.latitude)
		const longitude = parseCoordinate(formData.longitude)

		if (!name) {
			Alert.alert('Validation', 'Laboratory name is required.')
			return
		}

		if (!licenseNumber) {
			Alert.alert('Validation', 'License number is required.')
			return
		}

		if (!address) {
			Alert.alert('Validation', 'Address is required.')
			return
		}

		if (pincode && !/^\d{6}$/.test(pincode)) {
			Alert.alert('Validation', 'Please enter a valid 6-digit pincode.')
			return
		}

		if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
			Alert.alert('Validation', 'Please enter valid latitude and longitude values.')
			return
		}

		try {
			setIsSaving(true)
			const payload = buildLaboratoryProfileUpdatePayload(profileData ?? null, {
				name,
				logo_s3_key: formData.logoS3Key.trim(),
				license_number: licenseNumber,
				license_proof_s3_key: licenseProofS3Key,
				gst_number: gstNumber,
				address,
				city,
				state,
				pincode,
				latitude,
				longitude,
			})
			const response = await updateLaboratoryProfile(payload)

			if (response?.success === false) {
				setStatusModal({
					visible: true,
					status: 'error',
					title: 'Error',
					description: response.message || 'Unable to save laboratory details right now.',
				})
				return
			}

			onProfileChange?.(
				(current) =>
					response.data ??
					mergeLaboratoryProfileData(current, {
						details: {
							...(current?.details ?? {}),
							name,
							logo_s3_key: formData.logoS3Key.trim(),
							license_number: licenseNumber,
							license_proof_s3_key: licenseProofS3Key,
							gst_number: gstNumber,
							address,
							city,
							state,
							pincode,
							latitude,
							longitude,
						},
					})
			)
			setLogoUpload(null)
			setLicenseProofUpload(null)
			setStatusModal({
				visible: true,
				status: 'success',
				title: 'Success',
				description: 'Laboratory details saved successfully.',
			})
		} catch (error) {
			console.error('[LaboratoryDetailsTab] save error:', error)
			setStatusModal({
				visible: true,
				status: 'error',
				title: 'Error',
				description: 'Unable to save laboratory details right now.',
			})
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
	const rowSpacing = isMobile ? 18 : 20

	return (
		<View style={styles.root}>
			<ScrollView
				style={styles.container}
				contentContainerStyle={[
					styles.contentContainer,
					{ paddingHorizontal: sectionPadding, paddingTop: sectionPadding, paddingBottom: 100 },
				]}
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
			>
				<View style={[styles.contentShell, { maxWidth: contentWidth }]}>
					<AppPhotoPicker
						imageUri={logoUri}
						fallbackSource={DEFAULT_LOGO_IMAGE}
						fileNamePrefix="laboratory-logo"
						accessibilityLabel="Edit laboratory logo"
						onChange={({ uri, upload, removed }) => {
							setLogoUri(uri)
							setLogoUpload(upload)
							updateFormData('logoS3Key', removed ? '' : uri)
						}}
					/>

					<View style={{ marginBottom: rowSpacing }}>
						<InputField
							label="Laboratory Name"
							value={formData.name}
							onChangeText={(value) => updateFormData('name', value)}
							placeholder="Enter laboratory name"
							required
						/>
					</View>

					<View style={{ marginBottom: rowSpacing }}>
						<FormRow stacked={!useTwoColumns} compact={isTablet}>
							<InputField
								label="License Number"
								value={formData.licenseNumber}
								onChangeText={(value) => updateFormData('licenseNumber', value)}
								placeholder="Enter license number"
								autoCapitalize="characters"
								required
							/>
							<InputField
								label="GST Number"
								value={formData.gstNumber}
								onChangeText={(value) => updateFormData('gstNumber', value.toUpperCase())}
								placeholder="Enter GST number"
								autoCapitalize="characters"
							/>
						</FormRow>
					</View>

					<UploadBox
						label="License Proof Certificate"
						required
						description="Upload an image of your license proof certificate."
						fileName={formData.licenseProofS3Key}
						onUpload={handleDocumentUpload}
						stacked={isMobile}
					/>

					<View style={{ marginBottom: rowSpacing }}>
						<InputField
							label="Address"
							value={formData.address}
							onChangeText={(value) => updateFormData('address', value)}
							placeholder="Enter address"
							multiline
							required
						/>
					</View>

					<View style={{ marginBottom: rowSpacing }}>
						<FormRow stacked={!useTwoColumns} compact={isTablet}>
							<InputField
								label="City"
								value={formData.city}
								onChangeText={(value) => updateFormData('city', value)}
								placeholder="Enter city"
							/>
							<InputField
								label="State"
								value={formData.state}
								onChangeText={(value) => updateFormData('state', value)}
								placeholder="Enter state"
							/>
						</FormRow>
					</View>

					<View style={{ marginBottom: rowSpacing }}>
						<FormRow stacked={!useTwoColumns} compact={isTablet}>
							<InputField
								label="Pincode"
								value={formData.pincode}
								onChangeText={(value) =>
									updateFormData('pincode', value.replace(/\D/g, '').slice(0, 6))
								}
								placeholder="Enter pincode"
								keyboardType="numeric"
								maxLength={6}
							/>
							<View />
						</FormRow>
					</View>
				</View>
			</ScrollView>

			<AppStickyFooter onPress={handleSave} disabled={isSaving} loading={isSaving}>
				Save
			</AppStickyFooter>

			{statusModal ? (
				<StatusModal
					visible={statusModal.visible}
					status={statusModal.status}
					title={statusModal.title}
					description={statusModal.description}
					submitText="Okay"
					onSubmit={() => setStatusModal(null)}
					onCancel={() => setStatusModal(null)}
				/>
			) : null}
		</View>
	)
}

const styles = StyleSheet.create({
	root: { flex: 1, backgroundColor: '#ffffff' },
	container: { flex: 1, backgroundColor: '#ffffff' },
	contentContainer: { flexGrow: 1, alignItems: 'center' },
	contentShell: { width: '100%' },
	formRow: { flexDirection: 'row', alignItems: 'flex-start', marginHorizontal: -10 },
	formRowCompact: { marginHorizontal: -8 },
	formRowStacked: { flexDirection: 'column', marginHorizontal: 0 },
	formCell: { flex: 1, minWidth: 0 },
	formCellLeft: { paddingHorizontal: 10 },
	formCellRight: { paddingHorizontal: 10 },
	formCellStacked: { width: '100%', marginTop: 16 },
	formCellStackedFirst: { marginTop: 0 },
	fieldGroup: { width: '100%' },
	fieldLabel: {
		marginBottom: 8,
		fontSize: 14,
		lineHeight: 20,
		color: '#8f8f8f',
		fontWeight: '500',
	},
	requiredMark: { color: '#ef5d5d', fontSize: 14, lineHeight: 20, fontWeight: '600' },
	multilineInput: { minHeight: 100, height: 100 },
	multilineInputContent: {
		minHeight: 82,
		height: 82,
		paddingTop: 12,
		paddingBottom: 12,
		paddingHorizontal: 12,
	},
	uploadSection: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		columnGap: 16,
		marginVertical: 10,
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
	selectedFileText: {
		marginTop: -8,
		color: '#1f8a8f',
		fontSize: 12,
		lineHeight: 18,
		fontWeight: '600',
		textAlign: 'center',
	},
})
