import React, { useState, useEffect } from 'react'
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import RegisterForm from './components/RegisterForm'
import OtpForm from './components/OtpForm'
import { ROUTES } from '../../navigation/routes'
import { reset as resetNavigation } from '../../navigation/navigationService'
import type { AuthScreenProps } from '../../navigation/types'

type Step = 'register' | 'otp'

export default function RegisterPage({
  navigation,
  route,
}: AuthScreenProps<typeof ROUTES.AUTH.REGISTER>) {
  const [step, setStep] = useState<Step>('register')
  const [contactNumber, setContactNumber] = useState('')
  const { width } = useWindowDimensions()
  const isTablet = width >= 768

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
      <Pressable
        style={[styles.closeButton, isTablet && styles.closeButtonTablet]}
        onPress={() => navigation.replace(ROUTES.AUTH.ROLE_SELECTION)}
        accessibilityRole="button"
        accessibilityLabel="Back to role selection"
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="close" size={isTablet ? 30 : 26} color="#134149" />
      </Pressable>

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
          onVerify={() => {
            if (isDoctorRegistration) {
              setTimeout(() => {
                resetNavigation(ROUTES.STACK.DOCTOR_WELCOME)
              }, 0)
            }
          }}
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
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(19,65,73,0.08)',
  },
  closeButtonTablet: {
    top: 28,
    right: 32,
    width: 48,
    height: 48,
    borderRadius: 24,
  },
})
