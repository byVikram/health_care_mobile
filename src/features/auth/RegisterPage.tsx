import React, { useState, useEffect } from 'react'
import { View, StyleSheet } from 'react-native'
import RegisterForm from './components/RegisterForm'
import OtpForm from './components/OtpForm'

type Step = 'register' | 'otp'

export default function RegisterPage({ navigation, route }: any) {
  const [step, setStep] = useState<Step>('register')
  const [contactNumber, setContactNumber] = useState('')

  const { roleId, roleLabel } = route.params || {}

  useEffect(() => {
    if (!roleId) {
      navigation.replace('RoleSelection')
    }
  }, [roleId])

  return (
    <View style={styles.container}>
      {step === 'register' && (
        <RegisterForm
          roleId={roleId}
          roleLabel={roleLabel}
          onSubmit={(mobile: string) => {
            setContactNumber(mobile)
            setStep('otp')
          }}
        />
      )}

      {step === 'otp' && (
        <OtpForm
          contactNumber={contactNumber}
          onVerify={() => {}}
          onBack={() => setStep('register')}
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