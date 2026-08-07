import React, { useEffect, useState } from 'react'
import {
	ActivityIndicator,
	Alert,
	ScrollView,
	StyleSheet,
	View,
	useWindowDimensions,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { AppInput, AppTypography, AppStickyFooter } from '../../../../components/common'
import { useAuth } from '../../../../context/AuthContext'

export default function PersonalDetailsTab() {
	const { user, updateUser } = useAuth()
	const { width } = useWindowDimensions()
	
	const contentWidth = width >= 768 ? 560 : '100%'

	const [name, setName] = useState('')
	const [email, setEmail] = useState('')
	const [phone, setPhone] = useState('')
	const [saving, setSaving] = useState(false)

	useEffect(() => {
		if (user) {
			setName(user.name || '')
			setEmail(user.email || '')
		}
		const loadPhone = async () => {
			const num = await AsyncStorage.getItem('contact_number')
			if (num) setPhone(num)
		}
		loadPhone()
	}, [user])

	const handleSave = async () => {
		if (!name) {
			Alert.alert('Error', 'Name field is required')
			return
		}
		try {
			setSaving(true)
			await updateUser({ name, email })
			Alert.alert('Saved', 'Personal details saved successfully')
		} catch (e) {
			console.log(e)
			Alert.alert('Error', 'Failed to save personal details')
		} finally {
			setSaving(false)
		}
	}

	return (
		<View style={styles.root}>
			<ScrollView 
				style={styles.scroll}
				contentContainerStyle={styles.scrollContent} 
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
			>
				<View style={[styles.contentShell, { width: contentWidth }]}>
					{/* Full Name */}
					<View style={styles.fieldGroup}>
						<AppTypography variant="caption" style={styles.fieldLabel}>
							Full Name<AppTypography variant="caption" style={styles.requiredMark}> *</AppTypography>
						</AppTypography>
						<AppInput 
							placeholder="Enter full name" 
							value={name} 
							onChangeText={setName} 
							placeholderTextColor="#9a9a9a"
							fieldSize="compact"
							noMargin
							dense
						/>
					</View>

					{/* Email */}
					<View style={styles.fieldGroup}>
						<AppTypography variant="caption" style={styles.fieldLabel}>
							Email Address
						</AppTypography>
						<AppInput
							placeholder="email@example.com"
							value={email}
							onChangeText={setEmail}
							keyboardType="email-address"
							autoCapitalize="none"
							placeholderTextColor="#9a9a9a"
							fieldSize="compact"
							noMargin
							dense
						/>
					</View>

					{/* Contact Number */}
					<View style={styles.fieldGroup}>
						<AppTypography variant="caption" style={styles.fieldLabel}>
							Contact Number
						</AppTypography>
						<AppInput 
							value={phone} 
							editable={false} 
							style={styles.readOnlyInput} 
							fieldSize="compact"
							noMargin
							dense
						/>
					</View>
				</View>
			</ScrollView>
			
			<AppStickyFooter 
				onPress={handleSave}
				loading={saving}
			>
				Save Personal Details
			</AppStickyFooter>
		</View>
	)
}

const styles = StyleSheet.create({
	root: {
		flex: 1,
		backgroundColor: '#f8fafc',
	},
	scroll: {
		flex: 1,
	},
	scrollContent: {
		paddingHorizontal: 16,
		paddingTop: 16,
		paddingBottom: 100,
		alignItems: 'center',
	},
	contentShell: {
		alignSelf: 'center',
	},
	fieldGroup: {
		marginBottom: 16,
	},
	fieldLabel: {
		fontWeight: '600',
		color: '#1a1a1a',
		marginBottom: 6,
		fontSize: 12,
	},
	requiredMark: {
		color: '#ff4d4f',
	},
	readOnlyInput: {
		backgroundColor: '#f2f4f4',
		color: '#62707a',
	},
})
