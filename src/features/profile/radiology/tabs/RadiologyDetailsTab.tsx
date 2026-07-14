// src/features/profile/radiology/tabs/RadiologyDetailsTab.tsx

import React, { useEffect, useMemo, useState } from 'react'
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View, useWindowDimensions } from 'react-native'
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
import { mergeRadiologyProfileData, updateRadiologyProfile } from '../radiologyService'
import { RadiologyProfileData } from '../../../../types/radiology-profile-api'

const DEFAULT_LOGO_IMAGE = require('../../../../assets/Banner/pharmacy.png')
const SUCCESS_MESSAGE = 'Clinic details saved successfully'

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

type RadiologyDetailsFormData = {
	name: string
	licenseNumber: string
	licenseProof: string
	gstNumber: string
	address: string
	city: string
	state: string
	pincode: string
	latitude: string
	longitude: string
}

type RadiologyDetailsTabProps = {
	profileData?: RadiologyProfileData | null
	onProfileChange?: React.Dispatch<React.SetStateAction<RadiologyProfileData | null>>
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

export default function RadiologyDetailsTab({ profileData, onProfileChange }: RadiologyDetailsTabProps) {
	const { width } = useWindowDimensions()

	const isTablet = width >= 768 && width < 1024
	const isMobile = width < 768
	const isLandscape = width > 900
	const useTwoColumns = width >= 768

	const [formData, setFormData] = useState<RadiologyDetailsFormData>({
		name: '',
		licenseNumber: '',
		licenseProof: '',
		gstNumber: '',
		address: '',
		city: '',
		state: '',
		pincode: '',
		latitude: '',
		longitude: '',
	})
	const [isSaving, setIsSaving] = useState(false)
	const [logoUri, setLogoUri] = useState('')
	const [logoUpload, setLogoUpload] = useState<AppPhotoPickerUpload | null>(null)
	const [isLogoRemoved, setIsLogoRemoved] = useState(false)  
	const [successModalVisible, setSuccessModalVisible] = useState(false)

	const updateFormData = <K extends keyof RadiologyDetailsFormData>(key: K, value: RadiologyDetailsFormData[K]) => {
		setFormData((prev) => ({
			...prev,
			[key]: value,
		}))
	}

	const handleDocumentUpload = async (field: 'licenseProof') => {
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
		const details = profileData?.details
		if (!details) return

		setLogoUri(details.logo_s3_key || '')
		setLogoUpload(null)
		setIsLogoRemoved(false)
		setFormData({
			name: details.name || '',
			licenseNumber: details.license_number || '',
			licenseProof: details.license_proof_s3_key || '',
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
		const payload = {
			name: formData.name.trim(),
			license_number: formData.licenseNumber.trim(),
			license_proof_s3_key: formData.licenseProof.trim(),
			gst_number: formData.gstNumber.trim() || null,
			address: formData.address.trim(),
			city: formData.city.trim(),
			state: formData.state.trim(),
			pincode: formData.pincode.trim(),
			latitude: formData.latitude ? Number(formData.latitude) : null,
			longitude: formData.longitude ? Number(formData.longitude) : null,
			...(logoUpload ? { logo: logoUpload } : {}),
			...(isLogoRemoved ? { logo: null, logo_s3_key: null } : {}),
		}

		if (!payload.name) {
			Alert.alert('Validation', 'Clinic name is required.')
			return
		}

		if (!payload.license_number) {
			Alert.alert('Validation', 'License number is required.')
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
			const response = await updateRadiologyProfile(payload)

			if (response?.success === false) {
				Alert.alert('Error', response.message || 'Unable to save clinic details right now.')
				return
			}

			setFormData({
				name: payload.name,
				licenseNumber: payload.license_number,
				licenseProof: formData.licenseProof.trim(),
				gstNumber: payload.gst_number || '',
				address: payload.address,
				city: payload.city,
				state: payload.state,
				pincode: payload.pincode,
				latitude: formData.latitude,
				longitude: formData.longitude,
			})

			onProfileChange?.((current) =>
				mergeRadiologyProfileData(current, {
					details: {
						...(current?.details ?? {}),
						...payload,
						logo_s3_key: isLogoRemoved ? null : logoUri || current?.details?.logo_s3_key,
					},
				})
			)

			setLogoUpload(null)
			setIsLogoRemoved(false)
			setSuccessModalVisible(true)
		} catch (error) {
			console.error('[RadiologyDetailsTab] save error:', error)
			Alert.alert('Error', 'Unable to save clinic details right now.')
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
					fileNamePrefix="radiology-logo"
					accessibilityLabel="Edit clinic logo"
					onChange={({ uri, upload, removed }) => {
						setLogoUri(uri)
						setLogoUpload(upload)
						setIsLogoRemoved(removed)
					}}
				/>

				<View style={{ marginBottom: rowSpacing }}>
					<InputField
						label="Clinic Name"
						value={formData.name}
						onChangeText={(value) => updateFormData('name', value)}
						placeholder="Enter clinic name"
						required
					/>
				</View>

				<View style={{ marginBottom: rowSpacing }}>
					<FormRow stacked={!useTwoColumns} compact={isTablet}>
						<View style={styles.documentFieldGroup}>
							<InputField
								label="License Number"
								value={formData.licenseNumber}
								onChangeText={(value) => updateFormData('licenseNumber', value)}
								placeholder="Enter license number"
								autoCapitalize="characters"
								required
							/>
							<UploadBox
								label="License Proof Certificate"
								required
								description="Upload an image of your license proof certificate."
								fileName={formData.licenseProof}
								onUpload={() => handleDocumentUpload('licenseProof')}
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
				contentContainerStyle={styles.successModalContainer}
			>
				<View style={styles.successIconCircle}>
					<MaterialCommunityIcons name="check" size={46} color="#2E7D32" />
				</View>
				<AppTypography variant="h3" style={styles.successModalTitle}>
					Success
				</AppTypography>
				<AppTypography variant="body" style={styles.successModalMessage}>
					{SUCCESS_MESSAGE}
				</AppTypography>
				<AppButton
					variant="primary"
					formAction
					style={styles.successModalButton}
					contentStyle={styles.successModalButtonContent}
					labelStyle={styles.successModalButtonLabel}
					onPress={() => setSuccessModalVisible(false)}
				>
					Okay
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
	saveButton: {
		alignSelf: 'stretch',
		marginTop: 0,
		width: '100%',
	},
	successModalContainer: {
		alignSelf: 'center',
		width: '78%',
		maxWidth: 330,
		borderRadius: 16,
		paddingHorizontal: 20,
		paddingTop: 18,
		paddingBottom: 18,
	},
	successIconCircle: {
		width: 52,
		height: 52,
		borderRadius: 26,
		backgroundColor: '#E6F4EA',
		alignItems: 'center',
		justifyContent: 'center',
		alignSelf: 'center',
		marginBottom: 12,
	},
	successModalTitle: {
		color: '#000000',
		fontSize: 21,
		lineHeight: 26,
		fontWeight: '700',
		textAlign: 'center',
		marginBottom: 6,
	},
	successModalMessage: {
		color: '#6b6b6b',
		fontSize: 14,
		lineHeight: 20,
		textAlign: 'center',
		marginBottom: 16,
	},
	successModalButton: {
		alignSelf: 'stretch',
		marginTop: 0,
		minWidth: 120,
		borderRadius: 12,
		paddingVertical: 0,
	},
	successModalButtonContent: {
		minHeight: 44,
		paddingVertical: 0,
	},
	successModalButtonLabel: {
		fontSize: 16,
		lineHeight: 20,
		fontWeight: '700',
	},
})
