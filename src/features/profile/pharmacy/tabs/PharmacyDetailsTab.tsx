import React, { useEffect, useMemo, useState } from 'react'
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
import {
	AppButton,
	AppInput,
	AppModal,
	AppPhotoPicker,
	AppTypography,
	type AppPhotoPickerUpload,
} from '../../../../components/common'
import { mergePharmacyProfileData, updatePharmacyProfile } from '../pharmacyService'
import { PharmacyProfileData } from '../../../../types/pharmacy-profile-api'

const DEFAULT_LOGO_IMAGE = require('../../../../assets/Banner/pharmacy.png')

type InputFieldProps = {
	label: string
	value: string
	onChangeText: (value: string) => void
	placeholder: string
	keyboardType?: React.ComponentProps<typeof AppInput>['keyboardType']
	autoCapitalize?: React.ComponentProps<typeof AppInput>['autoCapitalize']
	maxLength?: number
	required?: boolean
	multiline?: boolean
}

type UploadBoxProps = {
	label: string
	required?: boolean
	description?: string
	fileName?: string
	onUpload: () => void
	stacked: boolean
}

type PharmacyDetailsFormData = {
	name: string
	drugLicenseNumber: string
	drugLicenseCertificate: string
	gstNumber: string
	gstCertificate: string
	address: string
	city: string
	state: string
	pincode: string
	landmark: string
	latitude: string
	longitude: string
}

type PharmacyDetailsTabProps = {
	profileData?: PharmacyProfileData | null
	onProfileChange?: React.Dispatch<React.SetStateAction<PharmacyProfileData | null>>
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
			{required ? <AppTypography variant="caption" style={styles.requiredMark}>*</AppTypography> : null}
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
}: InputFieldProps) {
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

export default function PharmacyDetailsTab({ profileData, onProfileChange }: PharmacyDetailsTabProps) {
	const { width } = useWindowDimensions()

	const isTablet = width >= 768 && width < 1024
	const isMobile = width < 768
	const isLandscape = width > 900
	const useTwoColumns = width >= 768

	const [formData, setFormData] = useState<PharmacyDetailsFormData>({
		name: '',
		drugLicenseNumber: '',
		drugLicenseCertificate: '',
		gstNumber: '',
		gstCertificate: '',
		address: '',
		city: '',
		state: '',
		pincode: '',
		landmark: '',
		latitude: '',
		longitude: '',
	})
	const [isSaving, setIsSaving] = useState(false)
	const [logoUri, setLogoUri] = useState('')
	const [logoUpload, setLogoUpload] = useState<AppPhotoPickerUpload | null>(null)
	const [isLogoRemoved, setIsLogoRemoved] = useState(false)
	const [successModalVisible, setSuccessModalVisible] = useState(false)

	const updateFormData = <K extends keyof PharmacyDetailsFormData>(key: K, value: PharmacyDetailsFormData[K]) => {
		setFormData((prev) => ({
			...prev,
			[key]: value,
		}))
	}

	const handleDocumentUpload = async (field: 'drugLicenseCertificate' | 'gstCertificate') => {
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
		updateFormData(field, fileLabel)
	}

	useEffect(() => {
		const pharmacy = profileData?.pharmacy
		if (!pharmacy) return

		setLogoUri(pharmacy.logo_s3_key || '')
		setLogoUpload(null)
		setIsLogoRemoved(false)
		setFormData({
			name: pharmacy.name || '',
			drugLicenseNumber: pharmacy.drug_license_number || '',
			drugLicenseCertificate: pharmacy.drug_license_s3_key || '',
			gstNumber: pharmacy.gst_number || '',
			gstCertificate: pharmacy.gst_certificate_s3_key || '',
			address: pharmacy.address || '',
			city: pharmacy.city || '',
			state: pharmacy.state || '',
			pincode: pharmacy.pincode || '',
			landmark: pharmacy.landmark || '',
			latitude: pharmacy.latitude !== undefined && pharmacy.latitude !== null ? String(pharmacy.latitude) : '',
			longitude: pharmacy.longitude !== undefined && pharmacy.longitude !== null ? String(pharmacy.longitude) : '',
		})
	}, [profileData?.pharmacy])

	const handleSave = async () => {
		const payload = {
			name: formData.name.trim(),
			drug_license_number: formData.drugLicenseNumber.trim(),
			gst_number: formData.gstNumber.trim(),
			address: formData.address.trim(),
			city: formData.city.trim(),
			state: formData.state.trim(),
			pincode: formData.pincode.trim(),
			landmark: formData.landmark.trim(),
			latitude: formData.latitude ? Number(formData.latitude) : null,
			longitude: formData.longitude ? Number(formData.longitude) : null,
			...(logoUpload ? { logo: logoUpload } : {}),
			...(isLogoRemoved ? { logo: null, logo_s3_key: null } : {}),
		}

		if (!payload.name) {
			Alert.alert('Validation', 'Pharmacy name is required.')
			return
		}

		if (!payload.drug_license_number) {
			Alert.alert('Validation', 'Drug license number is required.')
			return
		}

		if (!payload.address) {
			Alert.alert('Validation', 'Address is required.')
			return
		}

		if (payload.pincode && !/^\d{6}$/.test(payload.pincode)) {
			Alert.alert('Validation', 'Please enter a valid 6-digit pincode.')
			return
		}

		try {
			setIsSaving(true)
			const response = await updatePharmacyProfile(payload)

			if (response?.success === false) {
				Alert.alert('Error', response.message || 'Unable to save pharmacy details right now.')
				return
			}

			setFormData({
				name: payload.name,
				drugLicenseNumber: payload.drug_license_number,
				drugLicenseCertificate: formData.drugLicenseCertificate.trim(),
				gstNumber: payload.gst_number,
				gstCertificate: formData.gstCertificate.trim(),
				address: payload.address,
				city: payload.city,
				state: payload.state,
				pincode: payload.pincode,
				landmark: payload.landmark,
				latitude: formData.latitude,
				longitude: formData.longitude,
			})
			onProfileChange?.((current) =>
				mergePharmacyProfileData(current, response.data ?? {
					pharmacy: {
						...payload,
						drug_license_s3_key: formData.drugLicenseCertificate.trim(),
						gst_certificate_s3_key: formData.gstCertificate.trim(),
						...(logoUpload ? { logo: logoUpload, logo_s3_key: logoUri } : {}),
						...(isLogoRemoved ? { logo: null, logo_s3_key: null } : {}),
					},
				})
			)
			setLogoUpload(null)
			setIsLogoRemoved(false)
			setSuccessModalVisible(true)
		} catch (error) {
			console.error('[PharmacyDetailsTab] save error:', error)
			Alert.alert('Error', 'Unable to save pharmacy details right now.')
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
					imageUri={logoUri}
					fallbackSource={DEFAULT_LOGO_IMAGE}
					fileNamePrefix="pharmacy-logo"
					accessibilityLabel="Edit pharmacy logo"
					onChange={({ uri, upload, removed }) => {
						setLogoUri(uri)
						setLogoUpload(upload)
						setIsLogoRemoved(removed)
					}}
				/>

				<View style={{ marginBottom: rowSpacing }}>
					<InputField
						label="Pharmacy Name"
						value={formData.name}
						onChangeText={(value) => updateFormData('name', value)}
						placeholder="Enter pharmacy name"
						required
					/>
				</View>

				<View style={{ marginBottom: rowSpacing }}>
					<FormRow stacked={!useTwoColumns} compact={isTablet}>
						<View style={styles.documentFieldGroup}>
							<InputField
								label="Drug License Number"
								value={formData.drugLicenseNumber}
								onChangeText={(value) => updateFormData('drugLicenseNumber', value)}
								placeholder="Enter drug license number"
								autoCapitalize="characters"
								required
							/>
							<UploadBox
								label="Drug License Certificate"
								required
								description="Upload an image of your drug license certificate."
								fileName={formData.drugLicenseCertificate}
								onUpload={() => handleDocumentUpload('drugLicenseCertificate')}
								stacked={isMobile}
							/>
						</View>
						<View style={styles.documentFieldGroup}>
							<InputField
								label="GST Number"
								value={formData.gstNumber}
								onChangeText={(value) => updateFormData('gstNumber', value.toUpperCase())}
								placeholder="Enter GST number"
								autoCapitalize="characters"
							/>
							<UploadBox
								label="GST Certificate"
								description="Upload an image of your GST certificate."
								fileName={formData.gstCertificate}
								onUpload={() => handleDocumentUpload('gstCertificate')}
								stacked={isMobile}
							/>
						</View>
					</FormRow>
				</View>

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
							onChangeText={(value) => updateFormData('pincode', value.replace(/\D/g, '').slice(0, 6))}
							placeholder="Enter pincode"
							keyboardType="numeric"
							maxLength={6}
						/>
						<InputField
							label="Landmark"
							value={formData.landmark}
							onChangeText={(value) => updateFormData('landmark', value)}
							placeholder="Enter landmark"
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

			<AppModal
				visible={successModalVisible}
				onDismiss={() => setSuccessModalVisible(false)}
				title="Success"
			>
				<AppTypography variant="body" style={styles.successModalMessage}>
					Pharmacy details saved successfully
				</AppTypography>
				<AppButton
					variant="primary"
					formAction
					style={styles.successModalButton}
					onPress={() => setSuccessModalVisible(false)}
				>
					OK
				</AppButton>
			</AppModal>
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
	documentFieldGroup: {
		width: '100%',
		gap: 14,
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
	multilineInput: {
		minHeight: 100,
		height: 100,
	},
	multilineInputContent: {
		minHeight: 82,
		height: 82,
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
	saveButton: {
		alignSelf: 'stretch',
		marginTop: 0,
		width: '100%',
	},
	successModalMessage: {
		color: '#343434',
		fontSize: 14,
		lineHeight: 20,
		marginBottom: 20,
	},
	successModalButton: {
		alignSelf: 'stretch',
		marginTop: 0,
		minWidth: 120,
	},
})
