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
import { registrationSchema, getFieldErrors } from '../../../validation/authSchemas'

type RegisterFormData = {
	name: string
	email: string
	mobile: string
}

type RegisterFieldErrors = Partial<Record<keyof RegisterFormData, string>>

interface RegisterFormProps {
	roleId: string
	roleLabel?: string
	specialty?: string
	formData: RegisterFormData
	onFormDataChange: React.Dispatch<React.SetStateAction<RegisterFormData>>
	autoFocusMobile?: boolean
	onSubmit: (mobile: string) => void
	navigation: any
}

export default function RegisterForm({
	roleId,
	roleLabel,
	specialty,
	formData,
	onFormDataChange,
	autoFocusMobile = false,
	onSubmit,
	navigation,
}: RegisterFormProps) {
	const [loading, setLoading] = useState(false)
	const [formError, setFormError] = useState('')
	const [fieldErrors, setFieldErrors] = useState<RegisterFieldErrors>({})

	const { width, height } = useWindowDimensions()

	const isTablet = width >= 768
	const isLandscape = width > height

	const contentMaxWidth = isTablet ? 520 : 420

	const updateField = (field: keyof RegisterFormData, value: string) => {
		onFormDataChange((prev) => ({
			...prev,
			[field]: value,
		}))
		if (fieldErrors[field]) {
			setFieldErrors((prev) => ({ ...prev, [field]: undefined }))
		}
	}

	const handleRegister = async () => {
		const name = formData.name.trim()
		const email = formData.email.trim()
		const mobile = formData.mobile

		setFormError('')
		setFieldErrors({})

		if (!roleId) {
			setFormError('Role ID missing')
			return
		}

		const result = registrationSchema.safeParse({ name, email, mobile })
		if (!result.success) {
			setFieldErrors(getFieldErrors(registrationSchema, { name, email, mobile }) as RegisterFieldErrors)
			return
		}

		try {
			setLoading(true)

			const res = await createUser({
				role_id: roleId,
				name: result.data.name,
				email: result.data.email,
				contact_number: result.data.mobile,
				specialty_id: specialty,
			})

			const hasResponseData = typeof res === 'object' && res !== null && 'data' in res

			if (res?.success || hasResponseData) {
				onSubmit(mobile)
			} else {
				setFormError(res?.message || 'Registration failed')
			}
		} catch (err) {
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
					errorText={fieldErrors.name}
				/>

				<AppInput
					placeholder="Email"
					value={formData.email}
					onChangeText={(value) => updateField('email', value)}
					keyboardType="email-address"
					autoCapitalize="none"
					style={styles.input}
					errorText={fieldErrors.email}
				/>

				<AppInput
					placeholder="Mobile Number"
					value={formData.mobile}
					onChangeText={(t) => updateField('mobile', t.replace(/\D/g, '').slice(0, 10))}
					keyboardType="phone-pad"
					maxLength={10}
					autoFocus={autoFocusMobile}
					style={styles.input}
					errorText={fieldErrors.mobile}
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
