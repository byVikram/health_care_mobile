import React, { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import OtpForm from './components/OtpForm'
import { AuthField, AuthFooter, AuthHero, CtaButton, InfoNote, KeyboardLiftView, TermsLine } from './components/AuthKit'
import { sendOtp } from './authService'
import { ROUTES } from '../../navigation/routes'
import type { AuthScreenProps } from '../../navigation/types'
import { loginSchema, getFieldErrors } from '../../validation/authSchemas'
import { APP_COLORS } from '../../config/theme'

export default function LoginPage({ navigation }: AuthScreenProps<typeof ROUTES.AUTH.LOGIN>) {
	const [step, setStep] = useState<'login' | 'otp'>('login')
	const [contactNumber, setContactNumber] = useState('')
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')

	const complete = contactNumber.length === 10

	const handleContinue = async () => {
		const fieldErrors = getFieldErrors(loginSchema, { contactNumber })
		if (fieldErrors.contactNumber) {
			setError(fieldErrors.contactNumber)
			return
		}

		setLoading(true)
		setError('')
		try {
			const res = await sendOtp(contactNumber)
			if (res.success !== false) {
				setStep('otp')
			} else {
				setError(res.message || 'Failed to send OTP')
			}
		} catch (err: any) {
			setError(err.response?.data?.message || 'Failed to send OTP')
		} finally {
			setLoading(false)
		}
	}

	if (step === 'otp') {
		return (
			<OtpForm
				contactNumber={contactNumber}
				onVerify={() => {
					// handled by AuthContext
				}}
				onEditContact={() => setStep('login')}
				onBack={() => setStep('login')}
				ctaLabel="Verify & log in"
				autoVerify
			/>
		)
	}

	return (
		<KeyboardLiftView style={styles.container}>
			<AuthHero title="Welcome back" subtitle="Log in with your mobile number." />

			<ScrollView
				style={styles.flex}
				contentContainerStyle={styles.main}
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
			>
				<AuthField
					label="Mobile number"
					icon="phone"
					prefix="+91"
					placeholder="10-digit number"
					value={contactNumber}
					onChangeText={(value) => {
						setContactNumber(value.replace(/\D/g, '').slice(0, 10))
						if (error) setError('')
					}}
					keyboardType="phone-pad"
					inputMode="numeric"
					autoComplete="tel-national"
					maxLength={10}
					valid={complete}
					error={error}
				/>

				<InfoNote text="We'll text a 6-digit code to this number. No password needed." />

				<View style={styles.spacer} />

				<View style={styles.newHere}>
					<Text style={styles.newHereText}>New to Karolahealth?</Text>
					<Pressable onPress={() => navigation.navigate(ROUTES.AUTH.ROLE_SELECTION)} accessibilityRole="link">
						<Text style={styles.newHereLink}>Create an account</Text>
					</Pressable>
				</View>
			</ScrollView>

			<AuthFooter>
				<CtaButton label="Send code" onPress={handleContinue} disabled={!complete} loading={loading} />
				<TermsLine onOpen={(tab) => navigation.navigate(ROUTES.AUTH.LEGAL, { tab })} />
			</AuthFooter>
		</KeyboardLiftView>
	)
}

const styles = StyleSheet.create({
	flex: { flex: 1 },
	container: { flex: 1, backgroundColor: APP_COLORS.surface },
	main: { flexGrow: 1, padding: 24, gap: 16 },
	spacer: { flexGrow: 1 },
	newHere: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 6,
		padding: 14,
		borderRadius: 14,
		borderWidth: 1.5,
		borderStyle: 'dashed',
		borderColor: APP_COLORS.dotInactive,
	},
	newHereText: { fontSize: 14, lineHeight: 20, color: APP_COLORS.inkMuted },
	newHereLink: { fontSize: 14, lineHeight: 20, fontWeight: '800', color: APP_COLORS.primary },
})
