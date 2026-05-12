import React, { useState, useEffect } from 'react'
import { StyleSheet, View, useWindowDimensions } from 'react-native'
import RegisterForm from './components/RegisterForm'
import OtpForm from './components/OtpForm'
import { ROUTES } from '../../navigation/routes'
import { reset as resetNavigation } from '../../navigation/navigationService'
import type { AuthScreenProps } from '../../navigation/types'

type Step = 'register' | 'otp'

type RegisterDraft = {
	name: string
	email: string
	mobile: string
}

export default function RegisterPage({ navigation, route }: AuthScreenProps<typeof ROUTES.AUTH.REGISTER>) {
	const [step, setStep] = useState<Step>('register')
	const [contactNumber, setContactNumber] = useState('')

	const [registerDraft, setRegisterDraft] = useState<RegisterDraft>({
		name: '',
		email: '',
		mobile: '',
	})

	const [focusMobileOnRegister, setFocusMobileOnRegister] = useState(false)

	const { width, height } = useWindowDimensions()

	const isTablet = width >= 768
	const isLandscape = width > height

	const roleId = route.params?.roleId ?? ''
	const roleLabel = route.params?.roleLabel ?? ''

	const isDoctorRegistration = roleLabel.toLowerCase() === 'doctor' || roleId.toLowerCase() === 'doctor'

	useEffect(() => {
		if (!roleId) {
			navigation.replace(ROUTES.AUTH.ROLE_SELECTION)
		}
	}, [roleId, navigation])

	return (
		<View style={styles.container}>
			{step === 'register' && (
				<RegisterForm
					roleId={roleId}
					roleLabel={roleLabel}
					formData={registerDraft}
					onFormDataChange={setRegisterDraft}
					autoFocusMobile={focusMobileOnRegister}
					navigation={navigation}
					onSubmit={(mobile: string) => {
						setContactNumber(mobile)
						setFocusMobileOnRegister(false)
						setStep('otp')
					}}
				/>
			)}

			{step === 'otp' && (
				<OtpForm
					contactNumber={contactNumber}
					onVerify={() => {
						if (isDoctorRegistration) {
							setTimeout(() => {
								resetNavigation(ROUTES.STACK.DOCTOR_WELCOME)
							}, 0)
						}
					}}
					onEditContact={() => {
						setFocusMobileOnRegister(true)
						setStep('register')
					}}
					onBack={() => {
						setFocusMobileOnRegister(false)
						setStep('register')
					}}
					backLabel="Back to Register"
				/>
			)}
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#fff',
	},
})
