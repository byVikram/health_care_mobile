import React, { useEffect, useMemo, useState } from 'react'
import Toast from 'react-native-toast-message'
import {
	ScrollView,
	StyleSheet,
	View,
	useWindowDimensions,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import {
	AppButton,
	AppInput,
	AppModal,
	AppPhotoPicker,
	type AppPhotoPickerUpload,
	AppTypography,
} from '../../../../components/common'
import { useAuth } from '../../../../context/AuthContext'
import { mergePharmacyProfileData, updatePharmacyProfile } from '../pharmacyService'
import { PharmacyProfileData } from '../../../../types/pharmacy-profile-api'
import { showStatusModal } from '../../../../services/apiService'

const DEFAULT_PROFILE_IMAGE = require('../../../../assets/Banner/doctor.png')
const SUCCESS_MESSAGE = 'Personal details saved successfully'

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
				left={leftText ? <AppInput.Affix text={leftText} textStyle={styles.leftPrefixText} /> : undefined}
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
	const [profilePhotoUpload, setProfilePhotoUpload] = useState<AppPhotoPickerUpload | null>(null)
	const [isProfilePhotoRemoved, setIsProfilePhotoRemoved] = useState(false)
	const [successModalVisible, setSuccessModalVisible] = useState(false)

	const updateFormData = <K extends keyof PharmacyPersonalFormData>(key: K, value: PharmacyPersonalFormData[K]) => {
		setFormData((prev) => ({
			...prev,
			[key]: value,
		}))
	}

	useEffect(() => {
		const personal = profileData?.personal
		if (!personal) return

		setProfilePhotoUri(personal.avatar_s3_key || '')
		setProfilePhotoUpload(null)
		setIsProfilePhotoRemoved(false)
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
			Toast.show({ type: 'error', text1: 'Owner name is required.' })
			return
		}

		if (trimmedMobileNumber && !isValidPhone(trimmedMobileNumber)) {
			Toast.show({ type: 'error', text1: 'Please enter a valid mobile number.' })
			return
		}

		if (trimmedAlternateMobile && !isValidPhone(trimmedAlternateMobile)) {
			Toast.show({ type: 'error', text1: 'Please enter a valid alternate mobile number.' })
			return
		}

		if (trimmedWhatsappNumber && !isValidPhone(trimmedWhatsappNumber)) {
			Toast.show({ type: 'error', text1: 'Please enter a valid WhatsApp number.' })
			return
		}

		if (trimmedEmail && !isValidEmail(trimmedEmail)) {
			Toast.show({ type: 'error', text1: 'Please enter a valid email address.' })
			return
		}

		try {
			setIsSaving(true)

			const payload = {
				owner_name: trimmedOwnerName,
				alternate_mobile: trimmedAlternateMobile,
				whatsapp_number: trimmedWhatsappNumber,
				...(profilePhotoUpload ? { avatar: profilePhotoUpload } : {}),
				...(isProfilePhotoRemoved ? { avatar: null, avatar_s3_key: null } : {}),
			}

			const response = await updatePharmacyProfile(payload)

			if (response?.success === false) {
				showStatusModal({
					status: 'error',
					title: "Couldn't save personal details",
					description: response.message || 'Unable to save personal details right now.',
					submitText: 'OK',
				})
				return
			}

			await updateUser({
				name: trimmedOwnerName,
				avatar: isProfilePhotoRemoved ? undefined : profilePhotoUri || user?.avatar,
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
						...(profilePhotoUpload ? { avatar: profilePhotoUpload, avatar_s3_key: profilePhotoUri } : {}),
						...(isProfilePhotoRemoved ? { avatar: null, avatar_s3_key: null } : {}),
					},
				})
			)
			setProfilePhotoUpload(null)
			setIsProfilePhotoRemoved(false)
			setSuccessModalVisible(true)
		} catch (err) {
			console.error('[PharmacyPersonalDetailsTab] save error:', err)
			showStatusModal({
				status: 'error',
				title: "Couldn't save personal details",
				description: 'Unable to save personal details right now.',
				submitText: 'OK',
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
				<AppPhotoPicker
					imageUri={profilePhotoUri}
					fallbackSource={DEFAULT_PROFILE_IMAGE}
					fileNamePrefix="pharmacy-profile"
					onChange={({ uri, upload, removed }) => {
						setProfilePhotoUri(uri)
						setProfilePhotoUpload(upload)
						setIsProfilePhotoRemoved(removed)
					}}
				/>

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
	saveButton: {
		alignSelf: 'stretch',
		marginTop: 0,
		width: '100%',
		minWidth: 160,
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
