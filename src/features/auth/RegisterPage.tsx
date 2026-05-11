import React, { useState, useEffect } from 'react'
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
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

export default function RegisterPage({
  navigation,
  route,
}: AuthScreenProps<typeof ROUTES.AUTH.REGISTER>) {
  const [step, setStep] = useState<Step>('register')
  const [contactNumber, setContactNumber] = useState('')
  const [registerDraft, setRegisterDraft] = useState<RegisterDraft>({
    name: '',
    email: '',
    mobile: '',
  })
  const [focusMobileOnRegister, setFocusMobileOnRegister] = useState(false)
  const { width, height } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const isTablet = width >= 768
  const isLandscape = width > height
  const backButtonOffset = insets.top + (isTablet ? 24 : isLandscape ? 18 : 16)

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
        style={[
          styles.backButton,
          { top: backButtonOffset },
          isTablet && styles.backButtonTablet,
        ]}
        onPress={() => navigation.replace(ROUTES.AUTH.ROLE_SELECTION)}
        accessibilityRole="button"
        accessibilityLabel="Back to role selection"
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="chevron-back" size={isTablet ? 34 : 30} color="#134149" />
      </Pressable>

      {step === 'register' && (
        <RegisterForm
          roleId={roleId}
          roleLabel={roleLabel}
          formData={registerDraft}
          onFormDataChange={setRegisterDraft}
          autoFocusMobile={focusMobileOnRegister}
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
  backButton: {
    position: 'absolute',
    left: 14,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(19,65,73,0.08)',
  },
  backButtonTablet: {
    left: 24,
    width: 52,
    height: 52,
    borderRadius: 26,
  },
})
