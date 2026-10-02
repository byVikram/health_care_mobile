import AsyncStorage from '@react-native-async-storage/async-storage'
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
	const [activeSpecialty, setActiveSpecialty] = useState<string | undefined>(route.params?.specialty)

	useEffect(() => {
		let active = true
		if (route.params?.specialty) {
			setActiveSpecialty(route.params.specialty)
		} else if (roleLabel.toLowerCase() === 'ancillary' || roleId === 'ancillary') {
			const loadStoredSpecialty = async () => {
				const stored = await AsyncStorage.getItem('user_specialty')
				if (active && stored) setActiveSpecialty(stored)
			}
			void loadStoredSpecialty()
		}
		return () => {
			active = false
		}
	}, [route.params?.specialty, roleLabel, roleId])

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
					specialty={activeSpecialty}
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
						setTimeout(() => {
							resetNavigation(ROUTES.STACK.DOCTOR_WELCOME)
						}, 0)
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
