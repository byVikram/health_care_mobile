// features/auth/RegisterPage.tsx
import React, { useState } from 'react'
import { View, StyleSheet } from 'react-native'
import RegisterForm from "./components/RegisterForm";
import OtpForm from './components/OtpForm'
// import AccountSuccess from './components/AccountSuccess'
// import WelcomePage from './WelcomePage'

type Step = 'register' | 'otp' | 'success' | 'welcome'

export default function RegisterPage({ navigation }: any) {
    const [step, setStep] = useState<Step>('register')
    const [contactNumber, setContactNumber] = useState('')

    return (
        <View style={styles.container}>
            {step === 'register' && (
                <RegisterForm
                    onSubmit={(mobile: string) => {
                        setContactNumber(mobile)
                        setStep('otp')
                    }}
                    onSwitchToLogin={() => navigation.navigate('Login')}
                />
            )}

            {step === 'otp' && (
                <OtpForm
                    contactNumber={contactNumber}
                    onVerify={() => {
                        // AppNavigator will switch to authenticated stack after setAuth in OtpForm
                    }}
                    onBack={() => setStep('register')}
                    backLabel="Back to Register"
                />
            )}

            {/* {step === 'success' && (
                <AccountSuccess
                    onContinue={() => setStep('welcome')}
                />
            )}

            {step === 'welcome' && (
                <WelcomePage
                    onContinue={() => navigation.navigate('Login')}
                />
            )} */}
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
})
