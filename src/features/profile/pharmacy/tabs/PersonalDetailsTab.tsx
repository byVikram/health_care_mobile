import React, { useEffect, useMemo, useState } from 'react'
import { Alert, Image } from 'react-native'
import {
	Modal,
	Pressable,
	ScrollView,
	StyleSheet,
	TouchableOpacity,
	View,
	useWindowDimensions,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { TextInput as PaperTextInput } from 'react-native-paper'
import {
	AppButton,
	AppInput,
	AppTypography,
} from '../../../../components/common'
import { useAuth } from '../../../../context/AuthContext'
import { mergePharmacyProfileData, updatePharmacyProfile } from '../pharmacyService'
import { PharmacyProfileData } from '../../../../types/pharmacy-profile-api'

const DEFAULT_PROFILE_IMAGE = require('../../../../assets/Banner/doctor.png')

type InputFieldProps = {
	label: string
	value: string
	onChangeText: (value: string) => void
	placeholder: string
	keyboardType?: React.ComponentProps<typeof AppInput>['keyboardType']
	autoCapitalize?: React.ComponentProps<typeof AppInput>['autoCapitalize']
	maxLength?: number
	rightIcon?: React.ComponentProps<typeof MaterialCommunityIcons>['name']
	rightIconColor?: string
	onFocus?: () => void
	onBlur?: () => void
	leftText?: string
	errorText?: string
	required?: boolean
}

type PharmacyPersonalFormData = {
	ownerName: string
	mobileNumber: string
	alternateMobile: string
	whatsappNumber: string
	email: string
}

type ProfileImageUpload = {
	uri: string
	name: string
	type: string
}

type PersonalDetailsTabProps = {
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
	autoCapitalize = 'sentences',
	maxLength,
	rightIcon,
	rightIconColor = '#1f8a8f',
	onFocus,
	onBlur,
	leftText,
	errorText,
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
				autoCapitalize={autoCapitalize}
				maxLength={maxLength}
				onFocus={onFocus}
				onBlur={onBlur}
				errorText={errorText}
				fieldSize="compact"
				noMargin
				dense
				left={leftText ? <PaperTextInput.Affix text={leftText} textStyle={styles.leftPrefixText} /> : undefined}
				right={rightIcon ? <AppInput.Icon icon={rightIcon} color={rightIconColor} /> : undefined}
			/>
		</View>
	)
}

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
const isValidPhone = (value: string) => value.replace(/\D/g, '').length >= 10

export default function PersonalDetailsTab({ profileData, onProfileChange }: PersonalDetailsTabProps) {
	const { user, updateUser } = useAuth()
	const { width } = useWindowDimensions()

	const isTablet = width >= 768 && width < 1024
	const isMobile = width < 768
	const useTwoColumns = width >= 768

	const [formData, setFormData] = useState<PharmacyPersonalFormData>({
		ownerName: user?.name || '',
		mobileNumber: '',
		alternateMobile: '',
		whatsappNumber: '',
		email: user?.email || '',
	})
	const [isSaving, setIsSaving] = useState(false)
	const [profilePhotoUri, setProfilePhotoUri] = useState(user?.avatar || '')
	const [profilePhotoUpload, setProfilePhotoUpload] = useState<ProfileImageUpload | null>(null)
	const [photoSheetVisible, setPhotoSheetVisible] = useState(false)

	const updateFormData = <K extends keyof PharmacyPersonalFormData>(key: K, value: PharmacyPersonalFormData[K]) => {
		setFormData((prev) => ({
			...prev,
			[key]: value,
		}))
	}

	const closePhotoSheet = () => setPhotoSheetVisible(false)

	const prepareProfileImageUpload = (asset: ImagePicker.ImagePickerAsset): ProfileImageUpload => {
		const fileName = asset.fileName || asset.uri.split('/').pop() || `pharmacy-profile-${Date.now()}.jpg`
		const extension = fileName.split('.').pop()?.toLowerCase()
		const mimeType = asset.mimeType || (extension ? `image/${extension === 'jpg' ? 'jpeg' : extension}` : 'image/jpeg')

		return {
			uri: asset.uri,
			name: fileName,
			type: mimeType,
		}
	}

	const applySelectedProfilePhoto = (asset: ImagePicker.ImagePickerAsset) => {
		setProfilePhotoUri(asset.uri)
		setProfilePhotoUpload(prepareProfileImageUpload(asset))
	}

	const takeProfilePhoto = async () => {
		closePhotoSheet()
		const permission = await ImagePicker.requestCameraPermissionsAsync()

		if (!permission.granted) {
			Alert.alert('Permission needed', 'Please allow camera access to take a profile photo.')
			return
		}

		const result = await ImagePicker.launchCameraAsync({
			mediaTypes: ImagePicker.MediaTypeOptions.Images,
			allowsEditing: true,
			aspect: [1, 1],
			quality: 0.8,
		})

		if (!result.canceled && result.assets.length > 0) {
			applySelectedProfilePhoto(result.assets[0])
		}
	}

	const chooseProfilePhoto = async () => {
		closePhotoSheet()
		const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()

		if (!permission.granted) {
			Alert.alert('Permission needed', 'Please allow photo library access to choose a profile photo.')
			return
		}

		const result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ImagePicker.MediaTypeOptions.Images,
			allowsEditing: true,
			aspect: [1, 1],
			allowsMultipleSelection: false,
			quality: 0.8,
		})

		if (!result.canceled && result.assets.length > 0) {
			applySelectedProfilePhoto(result.assets[0])
		}
	}

	useEffect(() => {
		const personal = profileData?.personal
		if (!personal) return

		setProfilePhotoUri(personal.avatar_s3_key || '')
		setProfilePhotoUpload(null)
		setFormData({
			ownerName: personal.owner_name || user?.name || '',
			mobileNumber: personal.mobile_number || '',
			alternateMobile: personal.alternate_mobile || '',
			whatsappNumber: personal.whatsapp_number || '',
			email: personal.email || user?.email || '',
		})
	}, [profileData?.personal, user?.email, user?.name])

	const handleSave = async () => {
		const trimmedOwnerName = formData.ownerName.trim()
		const trimmedMobileNumber = formData.mobileNumber.trim()
		const trimmedAlternateMobile = formData.alternateMobile.trim()
		const trimmedWhatsappNumber = formData.whatsappNumber.trim()
		const trimmedEmail = formData.email.trim()

		if (!trimmedOwnerName) {
			Alert.alert('Validation', 'Owner name is required.')
			return
		}

		if (trimmedMobileNumber && !isValidPhone(trimmedMobileNumber)) {
			Alert.alert('Validation', 'Please enter a valid mobile number.')
			return
		}

		if (trimmedAlternateMobile && !isValidPhone(trimmedAlternateMobile)) {
			Alert.alert('Validation', 'Please enter a valid alternate mobile number.')
			return
		}

		if (trimmedWhatsappNumber && !isValidPhone(trimmedWhatsappNumber)) {
			Alert.alert('Validation', 'Please enter a valid WhatsApp number.')
			return
		}

		if (trimmedEmail && !isValidEmail(trimmedEmail)) {
			Alert.alert('Validation', 'Please enter a valid email address.')
			return
		}

		try {
			setIsSaving(true)

			const payload = {
				owner_name: trimmedOwnerName,
				alternate_mobile: trimmedAlternateMobile,
				whatsapp_number: trimmedWhatsappNumber,
			}

			const response = await updatePharmacyProfile(payload)

			if (response?.success === false) {
				Alert.alert('Error', response.message || 'Unable to save personal details right now.')
				return
			}

			await updateUser({
				name: trimmedOwnerName,
			})
			setFormData({
				ownerName: trimmedOwnerName,
				mobileNumber: trimmedMobileNumber,
				alternateMobile: trimmedAlternateMobile,
				whatsappNumber: trimmedWhatsappNumber,
				email: trimmedEmail,
			})
			onProfileChange?.((current) =>
				mergePharmacyProfileData(current, response.data ?? {
					personal: {
						owner_name: trimmedOwnerName,
						alternate_mobile: trimmedAlternateMobile,
						whatsapp_number: trimmedWhatsappNumber,
					},
				})
			)
			setProfilePhotoUpload(null)
			Alert.alert('Success', 'Personal details saved successfully.')
		} catch (err) {
			console.error('[PharmacyPersonalDetailsTab] save error:', err)
			Alert.alert('Error', 'Unable to save personal details right now.')
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
	const rowSpacing = isMobile ? 16 : isTablet ? 18 : 20

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
				<View style={styles.profilePhotoSection}>
					<View style={styles.profilePhotoWrapper}>
						<Image
							source={profilePhotoUri ? { uri: profilePhotoUri } : DEFAULT_PROFILE_IMAGE}
							style={styles.profilePhoto}
							resizeMode="cover"
						/>
						<TouchableOpacity
							style={styles.profilePhotoEditButton}
							onPress={() => setPhotoSheetVisible(true)}
							activeOpacity={0.85}
							accessibilityRole="button"
							accessibilityLabel="Edit profile photo"
						>
							<MaterialCommunityIcons name="camera-outline" size={15} color="#0c7c7c" />
						</TouchableOpacity>
					</View>
				</View>

				<View style={{ marginBottom: rowSpacing }}>
					<InputField
						label="Owner Name"
						value={formData.ownerName}
						onChangeText={(value) => updateFormData('ownerName', value)}
						placeholder="Enter owner name"
						autoCapitalize="words"
						required
					/>
				</View>

				<View style={{ marginBottom: rowSpacing }}>
					<FormRow stacked={!useTwoColumns} compact={isTablet}>
						<InputField
							label="Mobile Number"
							value={formData.mobileNumber}
							onChangeText={(value) => updateFormData('mobileNumber', value.replace(/\D/g, ''))}
							placeholder="Enter mobile number"
							keyboardType="phone-pad"
							leftText="+91"
							rightIcon={isValidPhone(formData.mobileNumber) ? 'check-circle' : undefined}
							rightIconColor="#24a148"
							required
						/>
						<InputField
							label="Email ID"
							value={formData.email}
							onChangeText={(value) => updateFormData('email', value)}
							placeholder="Enter email"
							keyboardType="email-address"
							autoCapitalize="none"
							rightIcon={isValidEmail(formData.email) ? 'check-circle' : undefined}
							rightIconColor="#24a148"
							required
						/>
					</FormRow>
				</View>

				<View style={{ marginBottom: rowSpacing }}>
					<FormRow stacked={!useTwoColumns} compact={isTablet}>
						<InputField
							label="Alternate Mobile Number"
							value={formData.alternateMobile}
							onChangeText={(value) => updateFormData('alternateMobile', value.replace(/\D/g, ''))}
							placeholder="Enter alternate mobile number"
							keyboardType="phone-pad"
							leftText="+91"
							rightIcon={isValidPhone(formData.alternateMobile) ? 'check-circle' : undefined}
							rightIconColor="#24a148"
						/>
						<InputField
							label="WhatsApp Number"
							value={formData.whatsappNumber}
							onChangeText={(value) => updateFormData('whatsappNumber', value.replace(/\D/g, ''))}
							placeholder="Enter WhatsApp number"
							keyboardType="phone-pad"
							leftText="+91"
							rightIcon={isValidPhone(formData.whatsappNumber) ? 'check-circle' : undefined}
							rightIconColor="#24a148"
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

			<Modal visible={photoSheetVisible} transparent animationType="slide" onRequestClose={closePhotoSheet}>
				<Pressable style={styles.photoSheetOverlay} onPress={closePhotoSheet}>
					<Pressable style={styles.photoSheet} onPress={(event) => event.stopPropagation()}>
						<View style={styles.photoSheetHandle} />
						<TouchableOpacity style={styles.photoSheetOption} onPress={takeProfilePhoto} activeOpacity={0.85}>
							<MaterialCommunityIcons name="camera-outline" size={22} color="#0c7c7c" />
							<AppTypography variant="body" style={styles.photoSheetOptionText}>
								Take Photo
							</AppTypography>
						</TouchableOpacity>
						<TouchableOpacity style={styles.photoSheetOption} onPress={chooseProfilePhoto} activeOpacity={0.85}>
							<MaterialCommunityIcons name="image-outline" size={22} color="#0c7c7c" />
							<AppTypography variant="body" style={styles.photoSheetOptionText}>
								Choose from Library
							</AppTypography>
						</TouchableOpacity>
					</Pressable>
				</Pressable>
			</Modal>
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
	profilePhotoSection: {
		alignItems: 'center',
		marginBottom: 18,
	},
	profilePhotoWrapper: {
		width: 92,
		height: 92,
		borderRadius: 46,
		position: 'relative',
	},
	profilePhoto: {
		width: 92,
		height: 92,
		borderRadius: 46,
		backgroundColor: '#edf4f5',
	},
	profilePhotoEditButton: {
		position: 'absolute',
		right: 2,
		bottom: 4,
		width: 24,
		height: 24,
		borderRadius: 12,
		backgroundColor: '#ffffff',
		borderWidth: 1,
		borderColor: '#a7d3db',
		alignItems: 'center',
		justifyContent: 'center',
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
	fieldLabel: {
		marginBottom: 8,
		fontSize: 14,
		lineHeight: 20,
		color: '#8f8f8f',
		fontWeight: '500',
	},
	requiredMark: {
		color: '#d84545',
		fontSize: 12,
		lineHeight: 14,
		fontWeight: '700',
		textAlignVertical: 'top',
	},
	leftPrefixText: {
		color: '#303030',
		fontSize: 14,
	},
	photoSheetOverlay: {
		flex: 1,
		backgroundColor: 'rgba(18, 28, 33, 0.28)',
		justifyContent: 'flex-end',
	},
	photoSheet: {
		backgroundColor: '#ffffff',
		borderTopLeftRadius: 18,
		borderTopRightRadius: 18,
		paddingTop: 10,
		paddingBottom: 20,
	},
	photoSheetHandle: {
		width: 42,
		height: 4,
		borderRadius: 2,
		backgroundColor: '#d5e4e6',
		alignSelf: 'center',
		marginBottom: 8,
	},
	photoSheetOption: {
		minHeight: 54,
		paddingHorizontal: 22,
		flexDirection: 'row',
		alignItems: 'center',
		borderTopWidth: 1,
		borderTopColor: '#eef4f5',
	},
	photoSheetOptionText: {
		marginLeft: 14,
		color: '#2f2f2f',
		fontWeight: '500',
	},
	saveButton: {
		alignSelf: 'stretch',
		marginTop: 0,
		width: '100%',
		minWidth: 160,
	},
})
