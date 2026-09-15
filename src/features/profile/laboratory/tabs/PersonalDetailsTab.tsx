import React, { useEffect, useMemo, useState } from 'react'
import { Alert, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import {
	AppInput,
	AppPhotoPicker,
	AppStickyFooter,
	AppTypography,
	StatusModal,
	type AppPhotoPickerUpload,
} from '../../../../components/common'
import { useAuth } from '../../../../context/AuthContext'
import {
	buildLaboratoryProfileUpdatePayload,
	mergeLaboratoryProfileData,
	updateLaboratoryProfile,
} from '../laboratoryService'
import { LaboratoryProfileData } from '../../../../types/laboratory-profile-api'

const DEFAULT_PROFILE_IMAGE = require('../../../../assets/Banner/doctor.png')

type PersonalFormData = {
	ownerName: string
	contactNumber: string
	alternateMobile: string
	whatsappNumber: string
	email: string
}

type PersonalDetailsTabProps = {
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
	required = false,
	editable = true,
	leftText,
	rightIcon,
	rightIconColor = '#24a148',
}: {
	label: string
	value: string
	onChangeText: (value: string) => void
	placeholder: string
	keyboardType?: React.ComponentProps<typeof AppInput>['keyboardType']
	autoCapitalize?: React.ComponentProps<typeof AppInput>['autoCapitalize']
	required?: boolean
	editable?: boolean
	leftText?: string
	rightIcon?: React.ComponentProps<typeof MaterialCommunityIcons>['name']
	rightIconColor?: string
}) {
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
				editable={editable}
				style={!editable && styles.readOnlyInput}
				fieldSize="compact"
				noMargin
				dense
				left={leftText ? <AppInput.Affix text={leftText} textStyle={styles.leftPrefixText} /> : undefined}
				right={rightIcon ? <AppInput.Icon icon={rightIcon} color={rightIconColor} /> : undefined}
			/>
		</View>
	)
}

const isValidPhone = (value: string) => value.replace(/\D/g, '').length >= 10
const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())

export default function PersonalDetailsTab({ profileData, onProfileChange }: PersonalDetailsTabProps) {
	const { user, updateUser } = useAuth()
	const { width } = useWindowDimensions()
	const isTablet = width >= 768 && width < 1024
	const isMobile = width < 768
	const useTwoColumns = width >= 768

	const [formData, setFormData] = useState<PersonalFormData>({
		ownerName: user?.name || '',
		contactNumber: '',
		alternateMobile: '',
		whatsappNumber: '',
		email: user?.email || '',
	})
	const [isSaving, setIsSaving] = useState(false)
	const [avatarUri, setAvatarUri] = useState(user?.avatar || '')
	const [avatarUpload, setAvatarUpload] = useState<AppPhotoPickerUpload | null>(null)
	const [isAvatarRemoved, setIsAvatarRemoved] = useState(false)
	const [statusModal, setStatusModal] = useState<{
		visible: boolean
		status: 'success' | 'error'
		title: string
		description: string
	} | null>(null)

	const updateFormData = <K extends keyof PersonalFormData>(key: K, value: PersonalFormData[K]) => {
		setFormData((prev) => ({ ...prev, [key]: value }))
	}

	useEffect(() => {
		if (!profileData) return

		setAvatarUri(profileData.avatar_s3_key || '')
		setAvatarUpload(null)
		setIsAvatarRemoved(false)
		setFormData({
			ownerName: profileData.owner_name || user?.name || '',
			contactNumber: profileData.contact_number || '',
			alternateMobile: profileData.alternate_mobile || '',
			whatsappNumber: profileData.whatsapp_number || '',
			email: profileData.email || user?.email || '',
		})
	}, [profileData, user?.email, user?.name])

	const handleSave = async () => {
		const ownerName = formData.ownerName.trim()
		const alternateMobile = formData.alternateMobile.trim()
		const whatsappNumber = formData.whatsappNumber.trim()

		if (!ownerName) {
			Alert.alert('Validation', 'Owner name is required.')
			return
		}

		if (alternateMobile && !isValidPhone(alternateMobile)) {
			Alert.alert('Validation', 'Please enter a valid alternate mobile number.')
			return
		}

		if (whatsappNumber && !isValidPhone(whatsappNumber)) {
			Alert.alert('Validation', 'Please enter a valid WhatsApp number.')
			return
		}

		try {
			setIsSaving(true)
			const payload = buildLaboratoryProfileUpdatePayload(profileData ?? null, {
				owner_name: ownerName,
				alternate_mobile: alternateMobile,
				whatsapp_number: whatsappNumber,
			})
			const response = await updateLaboratoryProfile(payload)

			if (response?.success === false) {
				setStatusModal({
					visible: true,
					status: 'error',
					title: 'Error',
					description: response.message || 'Unable to save personal details right now.',
				})
				return
			}

			await updateUser({
				name: ownerName,
				avatar: isAvatarRemoved ? undefined : avatarUri || user?.avatar,
			})

			onProfileChange?.((current) =>
				response.data ??
				mergeLaboratoryProfileData(current, {
					owner_name: ownerName,
					alternate_mobile: alternateMobile,
					whatsapp_number: whatsappNumber,
				})
			)
			setAvatarUpload(null)
			setIsAvatarRemoved(false)
			setStatusModal({
				visible: true,
				status: 'success',
				title: 'Success',
				description: 'Personal details saved successfully.',
			})
		} catch (error) {
			console.error('[LaboratoryPersonalDetailsTab] save error:', error)
			setStatusModal({
				visible: true,
				status: 'error',
				title: 'Error',
				description: 'Unable to save personal details right now.',
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
						imageUri={avatarUri}
						fallbackSource={DEFAULT_PROFILE_IMAGE}
						fileNamePrefix="laboratory-profile"
						accessibilityLabel="Edit profile avatar"
						onChange={({ uri, upload, removed }) => {
							setAvatarUri(uri)
							setAvatarUpload(upload)
							setIsAvatarRemoved(removed)
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
								label="Contact Number"
								value={formData.contactNumber}
								onChangeText={(value) => updateFormData('contactNumber', value)}
								placeholder="Contact number"
								keyboardType="phone-pad"
								leftText="+91"
								editable={false}
								rightIcon={isValidPhone(formData.contactNumber) ? 'check-circle' : undefined}
							/>
							<InputField
								label="Email ID"
								value={formData.email}
								onChangeText={(value) => updateFormData('email', value)}
								placeholder="Email"
								keyboardType="email-address"
								autoCapitalize="none"
								editable={false}
								rightIcon={isValidEmail(formData.email) ? 'check-circle' : undefined}
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
							/>
							<InputField
								label="WhatsApp Number"
								value={formData.whatsappNumber}
								onChangeText={(value) => updateFormData('whatsappNumber', value.replace(/\D/g, ''))}
								placeholder="Enter WhatsApp number"
								keyboardType="phone-pad"
								leftText="+91"
								rightIcon={isValidPhone(formData.whatsappNumber) ? 'check-circle' : undefined}
							/>
						</FormRow>
					</View>

					{profileData?.is_verified ? (
						<View style={styles.verifiedBadge}>
							<MaterialCommunityIcons name="check-decagram" size={18} color="#0c7c7c" />
							<AppTypography variant="caption" style={styles.verifiedBadgeText}>
								Verified Laboratory
							</AppTypography>
						</View>
					) : null}
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
	requiredMark: { color: '#d84545', fontSize: 12, lineHeight: 14, fontWeight: '700' },
	leftPrefixText: { color: '#303030', fontSize: 14 },
	readOnlyInput: { backgroundColor: '#f5f8f9' },
	verifiedBadge: {
		alignSelf: 'flex-start',
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		borderWidth: 1,
		borderColor: '#cfe5e6',
		borderRadius: 18,
		backgroundColor: '#f0f7f7',
		paddingHorizontal: 12,
		paddingVertical: 7,
	},
	verifiedBadgeText: { color: '#0c6f72', fontSize: 13, lineHeight: 18, fontWeight: '700' },
})
