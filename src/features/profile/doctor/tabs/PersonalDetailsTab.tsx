import React, { useState } from 'react'
import { View, StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { AppTypography, AppInput, AppButton } from '../../../../components/common'
import { useAuth } from '../../../../context/AuthContext'

export default function PersonalDetailsTab() {
	const { user } = useAuth()

	// Mock or initialize state
	const [firstName, setFirstName] = useState(user?.name?.split(' ')[0] || 'Sarah')
	const [lastName, setLastName] = useState(user?.name?.split(' ')[1] || 'Jenkins')
	const [email, setEmail] = useState(user?.email || 'sarah.jenkins@cityhospital.com')
	const [phone, setPhone] = useState('+1 (555) 123-4567')
	const [dob, setDob] = useState('12 Oct 1985')
	const [isSaving, setIsSaving] = useState(false)

	const handleSave = () => {
		setIsSaving(true)
		setTimeout(() => setIsSaving(false), 1000)
	}

	return (
		<ScrollView
			style={styles.container}
			contentContainerStyle={styles.contentParams}
			showsVerticalScrollIndicator={false}
		>
			{/* Header / Avatar */}
			<View style={styles.headerContainer}>
				<View style={styles.avatarWrapper}>
					<Image source={{ uri: user?.avatar || 'https://via.placeholder.com/150' }} style={styles.avatar} />
					<TouchableOpacity style={styles.editIconBadge} activeOpacity={0.8}>
						<MaterialCommunityIcons name="pencil" size={16} color="#fff" />
					</TouchableOpacity>
				</View>
				<AppTypography variant="h2" style={styles.doctorName}>
					Dr. {firstName} {lastName}
				</AppTypography>
				<AppTypography variant="caption" style={styles.doctorSubtitle}>
					General Practitioner • City Hospital
				</AppTypography>
			</View>

			{/* Form Section */}
			<View style={styles.formContainer}>
				{/* Row: First and Last Name */}
				<View style={styles.row}>
					<View style={styles.halfWidth}>
						<AppTypography variant="caption" style={styles.inputLabel}>
							First Name
						</AppTypography>
						<AppInput value={firstName} onChangeText={setFirstName} style={styles.inputField} />
					</View>
					<View style={styles.halfWidth}>
						<AppTypography variant="caption" style={styles.inputLabel}>
							Last Name
						</AppTypography>
						<AppInput value={lastName} onChangeText={setLastName} style={styles.inputField} />
					</View>
				</View>

				{/* Email Address */}
				<View style={styles.inputGroup}>
					<AppTypography variant="caption" style={styles.inputLabel}>
						Email Address
					</AppTypography>
					<AppInput
						value={email}
						onChangeText={setEmail}
						style={styles.inputField}
						left={<AppInput.Icon icon="email-outline" color="#73818a" />}
					/>
				</View>

				{/* Phone Number */}
				<View style={styles.inputGroup}>
					<AppTypography variant="caption" style={styles.inputLabel}>
						Phone Number
					</AppTypography>
					<AppInput
						value={phone}
						onChangeText={setPhone}
						style={styles.inputField}
						left={<AppInput.Icon icon="phone-outline" color="#73818a" />}
						keyboardType="phone-pad"
					/>
				</View>

				{/* Date of Birth */}
				<View style={styles.inputGroup}>
					<AppTypography variant="caption" style={styles.inputLabel}>
						Date of Birth
					</AppTypography>
					<AppInput
						value={dob}
						onChangeText={setDob}
						style={styles.inputField}
						left={<AppInput.Icon icon="calendar-blank-outline" color="#73818a" />}
					/>
				</View>
			</View>

			<View style={styles.footer}>
				<AppButton variant="primary" onPress={handleSave} loading={isSaving} style={styles.saveButton}>
					Save Details
				</AppButton>
			</View>
		</ScrollView>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#fff',
	},
	contentParams: {
		paddingBottom: 40,
	},
	headerContainer: {
		alignItems: 'center',
		paddingVertical: 24,
	},
	avatarWrapper: {
		position: 'relative',
		marginBottom: 16,
	},
	avatar: {
		width: 100,
		height: 100,
		borderRadius: 50,
		borderWidth: 3,
		borderColor: '#e8faee',
	},
	editIconBadge: {
		position: 'absolute',
		bottom: 0,
		right: 0,
		backgroundColor: '#0c7c7c',
		width: 32,
		height: 32,
		borderRadius: 16,
		justifyContent: 'center',
		alignItems: 'center',
		borderWidth: 2,
		borderColor: '#fff',
	},
	doctorName: {
		fontWeight: 'bold',
		color: '#233238',
		marginBottom: 4,
	},
	doctorSubtitle: {
		color: '#62707a',
		fontSize: 13,
	},
	formContainer: {
		paddingHorizontal: 20,
	},
	row: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: -4,
	},
	halfWidth: {
		width: '48%',
	},
	inputGroup: {
		marginBottom: -4,
	},
	inputLabel: {
		color: '#62707a',
		fontWeight: '600',
		marginBottom: 8,
	},
	inputField: {
		backgroundColor: '#fff',
		borderColor: '#dde3e8',
	},
	footer: {
		paddingHorizontal: 20,
		paddingTop: 16,
	},
	saveButton: {
		paddingVertical: 4,
	},
})
