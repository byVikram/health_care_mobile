import React from 'react'
import { View, ScrollView, StyleSheet } from 'react-native'
import { AppTypography, AppInput, AppSelect, AppCalendar, AppPhotoPicker, AppButton } from '../../../../components/common'
import type { PatientProfileState } from '../PatientProfileService'

const DEFAULT_PATIENT_IMAGE = require('../../../../assets/Banner/patient.png')

const GENDER_OPTIONS = [
	{ label: 'Male', value: 'Male' },
	{ label: 'Female', value: 'Female' },
	{ label: 'Non-binary', value: 'Non-binary' },
	{ label: 'Prefer not to say', value: 'Prefer not to say' },
]

const BLOOD_GROUP_OPTIONS = [
	{ label: 'A+', value: 'A+' },
	{ label: 'A-', value: 'A-' },
	{ label: 'B+', value: 'B+' },
	{ label: 'B-', value: 'B-' },
	{ label: 'AB+', value: 'AB+' },
	{ label: 'AB-', value: 'AB-' },
	{ label: 'O+', value: 'O+' },
	{ label: 'O-', value: 'O-' },
]

const MARITAL_STATUS_OPTIONS = [
	{ label: 'Single', value: 'Single' },
	{ label: 'Married', value: 'Married' },
	{ label: 'Divorced', value: 'Divorced' },
	{ label: 'Widowed', value: 'Widowed' },
]

interface Props {
	data: PatientProfileState
	onChange: (key: keyof PatientProfileState, value: any) => void
	onSave: () => void
	saving: boolean
}

export default function PersonalTab({ data, onChange, onSave, saving }: Props) {
	return (
		<ScrollView
			style={styles.scroll}
			contentContainerStyle={styles.scrollContent}
			keyboardShouldPersistTaps="handled"
			showsVerticalScrollIndicator={false}
		>
			<View style={styles.photoPickerWrapper}>
				<AppPhotoPicker
					imageUri={data.photoUrl}
					fallbackSource={DEFAULT_PATIENT_IMAGE}
					fileNamePrefix="patient-profile"
					onChange={({ uri, removed }: { uri: string; removed: boolean }) => {
						onChange('photoUrl', uri)
						if (removed) {
							onChange('photoUrl', '')
						}
					}}
				/>
			</View>

			<View style={styles.divider} />

			<View style={styles.formFieldsWrapper}>
				{/* Full Name */}
				<View style={styles.fieldMargin}>
					<AppTypography variant="caption" style={styles.fieldLabel}>
						Name<AppTypography variant="caption" style={styles.requiredMark}> *</AppTypography>
					</AppTypography>
					<AppInput
						value={data.name}
						onChangeText={(val: string) => onChange('name', val)}
						placeholder="Enter your full name"
						placeholderTextColor="#9a9a9a"
						fieldSize="compact"
						noMargin
						dense
						style={styles.inputStyle}
					/>
				</View>

				{/* Contact Number */}
				<View style={styles.fieldMargin}>
					<AppTypography variant="caption" style={styles.fieldLabel}>
						Contact Number
					</AppTypography>
					<AppInput
						value={data.contactNumber}
						onChangeText={(val: string) => onChange('contactNumber', val)}
						placeholder="+91 XXXXX XXXXX"
						placeholderTextColor="#9a9a9a"
						keyboardType="phone-pad"
						fieldSize="compact"
						noMargin
						dense
						style={styles.inputStyle}
					/>
				</View>

				{/* Email */}
				<View style={styles.fieldMargin}>
					<AppTypography variant="caption" style={styles.fieldLabel}>
						Email id
					</AppTypography>
					<AppInput
						value={data.email}
						onChangeText={(val: string) => onChange('email', val)}
						placeholder="example@email.com"
						placeholderTextColor="#9a9a9a"
						keyboardType="email-address"
						autoCapitalize="none"
						fieldSize="compact"
						noMargin
						dense
						style={styles.inputStyle}
					/>
				</View>

				{/* Gender */}
				<AppSelect
					label="Gender"
					options={GENDER_OPTIONS}
					value={data.gender}
					onSelect={(val: string) => onChange('gender', val)}
					placeholder="Select gender"
					size="compact"
					style={styles.fieldMargin}
				/>

				{/* Date of Birth */}
				<View style={styles.fieldMargin}>
					<AppCalendar
						label="Date of birth"
						value={data.dateOfBirth}
						onChange={(val: string) => onChange('dateOfBirth', val)}
						placeholder="DD-MM-YYYY"
						isMobile={true}
						modalTitle="Select Date of birth"
					/>
				</View>

				{/* Blood Group */}
				<AppSelect
					label="Blood group"
					options={BLOOD_GROUP_OPTIONS}
					value={data.bloodGroup}
					onSelect={(val: string) => onChange('bloodGroup', val)}
					placeholder="Select blood group"
					size="compact"
					style={styles.fieldMargin}
				/>

				{/* Marital Status */}
				<AppSelect
					label="Marital status"
					options={MARITAL_STATUS_OPTIONS}
					value={data.maritalStatus}
					onSelect={(val: string) => onChange('maritalStatus', val)}
					placeholder="Select marital status"
					size="compact"
					style={styles.fieldMargin}
				/>

				{/* Height */}
				<View style={styles.fieldMargin}>
					<AppTypography variant="caption" style={styles.fieldLabel}>
						Height
					</AppTypography>
					<AppInput
						value={data.height}
						onChangeText={(val: string) => onChange('height', val)}
						placeholder="e.g. 170"
						placeholderTextColor="#9a9a9a"
						keyboardType="numeric"
						fieldSize="compact"
						noMargin
						dense
						style={styles.inputStyle}
						right={<AppInput.Affix text="cm" />}
					/>
				</View>

				{/* Weight */}
				<View style={styles.fieldMargin}>
					<AppTypography variant="caption" style={styles.fieldLabel}>
						Weight
					</AppTypography>
					<AppInput
						value={data.weight}
						onChangeText={(val: string) => onChange('weight', val)}
						placeholder="e.g. 65"
						placeholderTextColor="#9a9a9a"
						keyboardType="numeric"
						fieldSize="compact"
						noMargin
						dense
						style={styles.inputStyle}
						right={<AppInput.Affix text="kg" />}
					/>
				</View>

				{/* Emergency Contact */}
				<View style={styles.fieldMargin}>
					<AppTypography variant="caption" style={styles.fieldLabel}>
						Emergency contact
					</AppTypography>
					<AppInput
						value={data.emergencyContact}
						onChangeText={(val: string) => onChange('emergencyContact', val)}
						placeholder="+91 XXXXX XXXXX"
						placeholderTextColor="#9a9a9a"
						keyboardType="phone-pad"
						fieldSize="compact"
						noMargin
						dense
						style={styles.inputStyle}
					/>
				</View>

				{/* Location */}
				<View style={styles.fieldMargin}>
					<AppTypography variant="caption" style={styles.fieldLabel}>
						Location
					</AppTypography>
					<AppInput
						value={data.location}
						onChangeText={(val: string) => onChange('location', val)}
						placeholder="City, State"
						placeholderTextColor="#9a9a9a"
						fieldSize="compact"
						noMargin
						dense
						style={styles.inputStyle}
					/>
				</View>
			</View>

			<View style={styles.saveButtonWrapper}>
				<AppButton
					variant="primary"
					formAction
					style={styles.saveButton}
					onPress={onSave}
					loading={saving}
					disabled={saving}
				>
					Save
				</AppButton>
			</View>
		</ScrollView>
	)
}

const styles = StyleSheet.create({
	scroll: {
		flex: 1,
		backgroundColor: '#fff',
	},
	scrollContent: {
		flexGrow: 1,
	},
	photoPickerWrapper: {
		paddingVertical: 16,
		alignItems: 'center',
		justifyContent: 'center',
	},
	divider: {
		height: 0.5,
		backgroundColor: '#e8ecee',
		marginHorizontal: 16,
		marginBottom: 2,
	},
	formFieldsWrapper: {
		paddingHorizontal: 16,
		paddingVertical: 16,
	},
	fieldMargin: {
		marginBottom: 16,
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
		fontWeight: '700',
	},
	inputStyle: {
		backgroundColor: '#fff',
	},
	saveButtonWrapper: {
		paddingHorizontal: 16,
		paddingBottom: 24,
		alignItems: 'center',
	},
	saveButton: {
		width: '100%',
		// maxWidth: 320,
	},
})
