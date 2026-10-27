import React, { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import axios from 'axios'
import { createUser } from '../authService'
import { ROUTES } from '../../../navigation/routes'
import { registrationSchema, getFieldErrors } from '../../../validation/authSchemas'
import { APP_COLORS } from '../../../config/theme'
import { roleDisplayName } from '../roleDisplay'
import { AuthField, AuthFooter, AuthHeaderMint, CtaButton, InfoNote, KeyboardLiftView, TermsLine } from './AuthKit'

type RegisterFormData = {
	name: string
	email: string
	mobile: string
}

type RegisterFieldName = keyof RegisterFormData

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
	const [touched, setTouched] = useState<Partial<Record<RegisterFieldName, boolean>>>({})

	const values = { name: formData.name.trim(), email: formData.email.trim(), mobile: formData.mobile }
	const errors = getFieldErrors(registrationSchema, values) as Partial<Record<RegisterFieldName, string>>
	const isValid = (field: RegisterFieldName) => values[field].length > 0 && !errors[field]
	const allValid = isValid('name') && isValid('email') && isValid('mobile')
	// Show an error only once the user has typed into / left the field, never on an untouched empty one.
	const shownError = (field: RegisterFieldName) =>
		touched[field] && values[field].length > 0 ? errors[field] : undefined

	const updateField = (field: RegisterFieldName, value: string) => {
		onFormDataChange((prev) => ({ ...prev, [field]: value }))
		if (formError) setFormError('')
	}
	const touch = (field: RegisterFieldName) => setTouched((prev) => ({ ...prev, [field]: true }))

	const handleRegister = async () => {
		setFormError('')

		if (!roleId) {
			setFormError('Role ID missing')
			return
		}

		const result = registrationSchema.safeParse(values)
		if (!result.success) {
			setTouched({ name: true, email: true, mobile: true })
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
				onSubmit(formData.mobile)
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

	const handleBack = () => {
		if (navigation.canGoBack()) navigation.goBack()
		else navigation.replace(ROUTES.AUTH.ROLE_SELECTION)
	}

	return (
		<KeyboardLiftView style={styles.container}>
			<AuthHeaderMint onBack={handleBack} step={1}>
				<View style={styles.titleBlock}>
					<Text style={styles.title}>Tell us about you</Text>
					<View style={styles.roleRow}>
						<Text style={styles.roleText}>Signing up as</Text>
						<View style={styles.rolePill}>
							<Text style={styles.rolePillText}>{roleDisplayName(roleId, roleLabel, specialty)}</Text>
						</View>
						<Pressable
							onPress={() => navigation.navigate(ROUTES.AUTH.ROLE_SELECTION)}
							accessibilityRole="link"
						>
							<Text style={styles.change}>Change</Text>
						</Pressable>
					</View>
				</View>
			</AuthHeaderMint>

			<ScrollView
				style={styles.flex}
				contentContainerStyle={styles.main}
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
			>
				<AuthField
					label="Full name"
					icon="person"
					placeholder="As on your ID"
					value={formData.name}
					onChangeText={(v) => updateField('name', v)}
					onBlur={() => touch('name')}
					autoComplete="name"
					autoCapitalize="words"
					valid={isValid('name')}
					error={shownError('name')}
				/>
				<AuthField
					label="Email"
					icon="mail"
					placeholder="you@example.com"
					value={formData.email}
					onChangeText={(v) => updateField('email', v)}
					onBlur={() => touch('email')}
					keyboardType="email-address"
					autoComplete="email"
					autoCapitalize="none"
					valid={isValid('email')}
					error={shownError('email')}
				/>
				<AuthField
					label="Mobile number"
					icon="phone"
					prefix="+91"
					placeholder="10-digit number"
					value={formData.mobile}
					onChangeText={(v) => updateField('mobile', v.replace(/\D/g, '').slice(0, 10))}
					onBlur={() => touch('mobile')}
					keyboardType="phone-pad"
					inputMode="numeric"
					autoComplete="tel-national"
					maxLength={10}
					autoFocus={autoFocusMobile}
					valid={isValid('mobile')}
					error={shownError('mobile')}
				/>

				<InfoNote text="We'll text a 6-digit code to verify this number. You'll use it to log in, no password needed." />

				{formError ? (
					<Text accessibilityRole="alert" style={styles.formError}>
						{formError}
					</Text>
				) : null}
			</ScrollView>

			<AuthFooter>
				<CtaButton label="Send code" onPress={handleRegister} disabled={!allValid} loading={loading} />
				<TermsLine
					onOpen={(tab) => navigation.navigate(ROUTES.AUTH.LEGAL, { tab })}
					trailing={
						<>
							{' '}
							Already have an account?{' '}
							<Text style={styles.loginLink} onPress={() => navigation.replace(ROUTES.AUTH.LOGIN)}>
								Log in
							</Text>
						</>
					}
				/>
			</AuthFooter>
		</KeyboardLiftView>
	)
}

const styles = StyleSheet.create({
	flex: { flex: 1 },
	container: { flex: 1, backgroundColor: APP_COLORS.surface },
	titleBlock: { gap: 6 },
	title: { fontSize: 28, lineHeight: 34, fontWeight: '800', color: APP_COLORS.ink },
	roleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
	roleText: { fontSize: 14, lineHeight: 20, color: '#3D5357' },
	rolePill: { paddingVertical: 3, paddingHorizontal: 10, borderRadius: 999, backgroundColor: APP_COLORS.surface },
	rolePillText: { fontSize: 14, lineHeight: 20, fontWeight: '800', color: APP_COLORS.primary },
	change: { fontSize: 14, lineHeight: 20, fontWeight: '800', color: APP_COLORS.primary },
	main: { padding: 24, paddingTop: 20, paddingBottom: 16, gap: 16 },
	formError: { fontSize: 13, lineHeight: 18, fontWeight: '600', color: APP_COLORS.danger },
	loginLink: { fontWeight: '800', color: APP_COLORS.primary },
})
