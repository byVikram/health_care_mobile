import React, { useState, useEffect } from 'react'
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { StackActions, useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { ROUTES } from '../../../navigation/routes'
import type { AppStackParamList } from '../../../navigation/types'
import { getActiveConsent, ActiveConsentResponse } from '../doctorService'

interface Props {
  open?: boolean
  onClose?: () => void
  onAgree?: (consentId: string) => void
}

export default function ConsentModal({ open, onClose, onAgree }: Props) {
  const [checked, setChecked] = useState(false)
  const [activeConsent, setActiveConsent] = useState<ActiveConsentResponse['data'] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  
  const { width, height } = useWindowDimensions()
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>()
  const route = useRoute<RouteProp<AppStackParamList, typeof ROUTES.STACK.CONSENT_FORM>>()

  const isTablet = width >= 768
  const isScreenMode = open === undefined
  const visible = open ?? true
  const paymentParams = route.params?.paymentParams

  useEffect(() => {
    if (visible) {
      setChecked(false)
      setLoading(true)
      setError(false)
      getActiveConsent()
        .then(data => setActiveConsent(data))
        .catch(() => setError(true))
        .finally(() => setLoading(false))
    }
  }, [visible])

  const parsedContent = typeof activeConsent?.content === 'string'
    ? (() => { try { return JSON.parse(activeConsent.content) } catch { return { points: [] } } })()
    : activeConsent?.content

  const handleClose = () => {
    setChecked(false)
    if (onClose) {
      onClose()
      return
    }
    navigation.goBack()
  }

  const handleAgree = () => {
    if (!activeConsent) return
    setChecked(false)
    if (onAgree) {
      onAgree(activeConsent.id)
      return
    }

    if (paymentParams) {
      navigation.dispatch(StackActions.replace(ROUTES.STACK.PATIENT_PAYMENT, {
        ...paymentParams,
        consentVersionId: activeConsent.id
      }))
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType={isScreenMode ? 'slide' : 'fade'}
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.container,
            {
              width: isTablet ? '70%' : '90%',
              maxHeight: height * 0.9,
            },
          ]}
        >
          <Text style={styles.title}>Patient Appointment Consent</Text>
          <Text style={styles.subtitle}>
            Please read the following terms carefully before booking your appointment.
          </Text>

          {loading ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <ActivityIndicator size="large" color="#0c7c7c" />
            </View>
          ) : error ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <Text style={{ color: 'red' }}>Failed to load consent terms. Please try again.</Text>
            </View>
          ) : (
            <>
              <ScrollView style={styles.scrollBox} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator>
                {parsedContent?.points?.map((point: string, index: number) => (
                  <Text key={index} style={styles.listItem}>
                    • {point}
                  </Text>
                ))}
              </ScrollView>

              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => setChecked((current) => !current)}
                activeOpacity={0.75}
              >
            <View
              style={[
                styles.checkbox,
                checked && styles.checkboxChecked,
              ]}
            >
              {checked ? (
                <MaterialCommunityIcons name="check" size={16} color="#0c7c7c" />
              ) : null}
            </View>
            <Text style={styles.checkboxText}>
              I agree to the appointment booking terms and conditions.
            </Text>
          </TouchableOpacity>
          </>
          )}

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.primaryBtn,
                (!checked || !activeConsent || loading) && styles.primaryBtnDisabled,
              ]}
              disabled={!checked || !activeConsent || loading}
              onPress={handleAgree}
            >
              <Text style={styles.primaryText}>Agree and Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 12,
  },
  scrollBox: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#f8fafc',
    maxHeight: 300,
    marginBottom: 12,
  },
  sectionTitle: {
    fontWeight: '700',
    fontSize: 14,
    marginBottom: 6,
  },
  smallText: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 6,
  },
  listItem: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 6,
    lineHeight: 18,
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 10,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 16,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#9ca3af',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    borderColor: '#9ca3af',
    backgroundColor: '#fff',
  },
  checkboxText: {
    fontSize: 13,
    flex: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  cancelText: {
    fontSize: 14,
  },
  primaryBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#0c7c7c',
  },
  primaryBtnDisabled: {
    opacity: 0.5,
  },
  primaryText: {
    color: '#fff',
    fontWeight: '600',
  },
})
