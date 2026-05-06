import React, { useState } from 'react'
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

interface Props {
  open: boolean
  onClose: () => void
  onAgree: () => void
}

const appointmentRules = [
  'The appointment is subject to doctor availability and confirmation.',
  'Please provide accurate personal and medical information.',
  'Arrive at least 10-15 minutes before your appointment time.',
  'Late arrival may result in delay or rescheduling.',
  'Cancellation or rescheduling must follow clinic/hospital policy.',
  "Consultation outcomes are determined by the doctor's medical judgment.",
  'For online consultations, patients are responsible for internet/device availability.',
  'Patient information will be stored securely for healthcare purposes.',
]

const consentPoints = [
  'You have read and understood these terms.',
  'You agree to follow appointment policies.',
  'You consent to the collection and use of your information for appointment scheduling.',
]

export default function ConsentModal({ open, onClose, onAgree }: Props) {
  const [checked, setChecked] = useState(false)
  const { width, height } = useWindowDimensions()

  const isTablet = width >= 768

  const handleClose = () => {
    setChecked(false)
    onClose()
  }

  const handleAgree = () => {
    setChecked(false)
    onAgree()
  }

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
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

          <ScrollView style={styles.scrollBox} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator>
            <Text style={styles.sectionTitle}>
              By booking an appointment through this app, you agree to:
            </Text>

            {appointmentRules.map((rule, index) => (
              <Text key={index} style={styles.listItem}>
                • {rule}
              </Text>
            ))}

            <View style={styles.divider} />

            <Text style={styles.sectionTitle}>Consent</Text>
            <Text style={styles.smallText}>
              By clicking "Agree & Continue", you confirm that:
            </Text>

            {consentPoints.map((point, index) => (
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

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.primaryBtn,
                !checked && styles.primaryBtnDisabled,
              ]}
              disabled={!checked}
              onPress={handleAgree}
            >
              <Text style={styles.primaryText}>Agree & Continue</Text>
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
