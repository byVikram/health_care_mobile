import React, { useState } from 'react'
import {
	Text,
	StyleSheet,
	ScrollView,
	TouchableOpacity,
	ActivityIndicator,
	View,
	useWindowDimensions,
	Pressable,
} from 'react-native'
import axios from 'axios'
import { createUser } from '../authService'
import { AppInput } from '../../../components/common'
import { ROUTES } from '../../../navigation/routes'

type RegisterFormData = {
	name: string
	email: string
	mobile: string
}

interface RegisterFormProps {
	roleId: string
	roleLabel?: string
	formData: RegisterFormData
	onFormDataChange: React.Dispatch<React.SetStateAction<RegisterFormData>>
	autoFocusMobile?: boolean
	onSubmit: (mobile: string) => void
	navigation: any
}

export default function RegisterForm({
	roleId,
	roleLabel,
	formData,
	onFormDataChange,
	autoFocusMobile = false,
	onSubmit,
	navigation,
}: RegisterFormProps) {
	const [loading, setLoading] = useState(false)
	const [formError, setFormError] = useState('')

	const { width, height } = useWindowDimensions()

	const isTablet = width >= 768
	const isLandscape = width > height

	const contentMaxWidth = isTablet ? 520 : 420

	const updateField = (field: keyof RegisterFormData, value: string) => {
		onFormDataChange((prev) => ({
			...prev,
			[field]: value,
		}))
	}

	const handleRegister = async () => {
		const name = formData.name.trim()
		const email = formData.email.trim()
		const mobile = formData.mobile

		console.log('Registering with:', {
			roleId,
			name,
			email,
			mobile,
		})

		setFormError('')

		if (!roleId) {
			setFormError('Role ID missing')
			return
		}

		if (!name.trim()) {
			setFormError('Name is required')
			return
		}

		if (!email.trim()) {
			setFormError('Email is required')
			return
		}

		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			setFormError('Invalid email')
			return
		}

		if (!/^[6-9]\d{9}$/.test(mobile)) {
			setFormError('Enter valid 10-digit mobile number')
			return
		}

		try {
			setLoading(true)

			const res = await createUser({
				role_id: roleId,
				name,
				email,
				contact_number: mobile,
			})

			const hasResponseData = typeof res === 'object' && res !== null && 'data' in res

			if (res?.success || hasResponseData) {
				onSubmit(mobile)
			} else {
				setFormError(res?.message || 'Registration failed')
			}
		} catch (err) {
			console.log(err)

			if (axios.isAxiosError(err)) {
				setFormError(err.response?.data?.message || 'Server error')
			} else {
				setFormError('Something went wrong')
			}
		} finally {
			setLoading(false)
		}
	}

	return (
		<ScrollView
			keyboardShouldPersistTaps="handled"
			contentContainerStyle={[
				styles.container,
				{
					paddingHorizontal: isTablet ? 40 : 24,
					justifyContent: isLandscape && !isTablet ? 'flex-start' : 'center',
					paddingTop: isLandscape && !isTablet ? 64 : 24,
				},
			]}
		>
			<View style={[styles.content, { maxWidth: contentMaxWidth }]}>
				<Text style={[styles.title, isTablet && styles.titleTablet]}>Register</Text>

				{/* {roleLabel ? (
	        <Text style={styles.roleText}>Role: {roleLabel}</Text>
	      ) : null} */}

				<AppInput
					placeholder="Name"
					value={formData.name}
					onChangeText={(value) => updateField('name', value)}
					style={styles.input}
				/>

				<AppInput
					placeholder="Email"
					value={formData.email}
					onChangeText={(value) => updateField('email', value)}
					keyboardType="email-address"
					autoCapitalize="none"
					style={styles.input}
				/>

				<AppInput
					placeholder="Mobile Number"
					value={formData.mobile}
					onChangeText={(t) => updateField('mobile', t.replace(/\D/g, '').slice(0, 10))}
					keyboardType="phone-pad"
					maxLength={10}
					autoFocus={autoFocusMobile}
					style={styles.input}
				/>

				<TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
					{loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Register</Text>}
				</TouchableOpacity>

				<View style={styles.loginContainer}>
					<Text style={styles.accountText}>Already have an account?</Text>

					<Pressable onPress={() => navigation.replace(ROUTES.AUTH.LOGIN)}>
						<Text style={styles.loginText}>Login</Text>
					</Pressable>
				</View>

				{!!formError && <Text style={styles.error}>{formError}</Text>}
			</View>
		</ScrollView>
	)
}

const styles = StyleSheet.create({
	container: {
		flexGrow: 1,
		alignItems: 'center',
	},

	content: {
		width: '100%',
	},

	title: {
		fontSize: 26,
		fontWeight: '600',
		marginBottom: 12,
	},

	titleTablet: {
		fontSize: 30,
	},

	roleText: {
		fontSize: 15,
		color: '#0d9488',
		marginBottom: 16,
	},

	input: {
		marginTop: 12,
	},

	button: {
		backgroundColor: '#0d9488',
		padding: 14,
		borderRadius: 8,
		alignItems: 'center',
		marginTop: 20,
	},

	buttonText: {
		color: '#fff',
		fontWeight: '600',
		fontSize: 16,
	},

	loginContainer: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		marginTop: 16,
	},

	accountText: {
		fontSize: 15,
		color: '#666',
	},

	loginText: {
		fontSize: 15,
		fontWeight: '600',
		color: '#0d9488',
		marginLeft: 4,
	},

	error: {
		color: 'red',
		marginTop: 12,
	},
})
