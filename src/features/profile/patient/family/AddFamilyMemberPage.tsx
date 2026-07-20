// src/features/profile/patient/family/AddFamilyMemberPage.tsx

import React, { useState } from 'react'
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useTheme } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import {
  AppButton,
  AppInput,
  AppSelect,
  AppScreenHeader,
  StatusModal,
} from '../../../../components/common'
import { createFamilyMember } from './familyMemberService'

// ── Constants ──────────────────────────────────────────────────────────────────

const RELATION_OPTIONS = [
  { label: 'Spouse', value: 'Spouse' },
  { label: 'Child', value: 'Child' },
  { label: 'Parent', value: 'Parent' },
  { label: 'Sibling', value: 'Sibling' },
  { label: 'Grandparent', value: 'Grandparent' },
  { label: 'Other', value: 'Other' },
]

const GENDER_OPTIONS = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Other', value: 'other' },
]

const BLOOD_GROUP_OPTIONS = [
  { label: 'A+', value: 'A+' },
  { label: 'A-', value: 'A-' },
  { label: 'B+', value: 'B+' },
  { label: 'B-', value: 'B-' },
  { label: 'AB+', value: 'AB+' },
  { label: 'AB-', value: 'AB-' },
  { label: 'O+', value: 'O+' },
  { label: 'O-', value: 'O-' },
]

// ── Component ─────────────────────────────────────────────────────────────────

export default function AddFamilyMemberPage() {
  const navigation = useNavigation<any>()
  const theme = useTheme()
  const insets = useSafeAreaInsets()

  const [name, setName] = useState('')
  const [relation, setRelation] = useState('')
  const [gender, setGender] = useState('')
  const [bloodGroup, setBloodGroup] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [statusModal, setStatusModal] = useState<{
    visible: boolean
    status: 'success' | 'error'
    title: string
    description: string
  } | null>(null)

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter the member\'s name.')
      return
    }
    if (!relation) {
      Alert.alert('Required', 'Please select a relation.')
      return
    }

    setSubmitting(true)
    try {
      await createFamilyMember({
        name: name.trim(),
        relation,
        ...(gender ? { gender } : {}),
        ...(bloodGroup ? { blood_group: bloodGroup } : {}),
      })
      setStatusModal({
        visible: true,
        status: 'success',
        title: 'Member Added!',
        description: `${name.trim()} has been added to your family profiles.`,
      })
    } catch (err: any) {
      setStatusModal({
        visible: true,
        status: 'error',
        title: 'Failed to Add',
        description: err?.message || 'Something went wrong. Please try again.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <AppScreenHeader title="Add Family Member" onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Name */}
          <AppInput
            label="Full Name *"
            value={name}
            onChangeText={setName}
            placeholder="Enter member's name"
            style={styles.field}
          />

          {/* Relation */}
          <View style={styles.field}>
            <AppSelect
              label="Relation *"
              value={relation}
              options={RELATION_OPTIONS}
              onSelect={(val) => setRelation(val as string)}
              placeholder="Select relation"
            />
          </View>

          {/* Gender (optional) */}
          <View style={styles.field}>
            <AppSelect
              label="Gender"
              value={gender}
              options={GENDER_OPTIONS}
              onSelect={(val) => setGender(val as string)}
              placeholder="Select gender (optional)"
            />
          </View>

          {/* Blood Group (optional) */}
          <View style={styles.field}>
            <AppSelect
              label="Blood Group"
              value={bloodGroup}
              options={BLOOD_GROUP_OPTIONS}
              onSelect={(val) => setBloodGroup(val as string)}
              placeholder="Select blood group (optional)"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer */}
      <View style={[styles.footer, { borderTopColor: theme.colors.outlineVariant }]}>
        <AppButton
          onPress={handleSubmit}
          loading={submitting}
          disabled={submitting}
          style={styles.submitButton}
        >
          Add Family Member
        </AppButton>
      </View>

      {/* Status Modal */}
      {statusModal?.visible && (
        <StatusModal
          visible={statusModal.visible}
          status={statusModal.status}
          title={statusModal.title}
          description={statusModal.description}
          onSubmit={() => {
            setStatusModal(null)
            if (statusModal.status === 'success') navigation.goBack()
          }}
          onCancel={() => setStatusModal(null)}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  flex: { flex: 1 },
  scrollContent: {
    padding: 20,
    paddingBottom: 32,
  },
  field: { marginBottom: 18 },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    backgroundColor: '#fff',
  },
  submitButton: { borderRadius: 12 },
})
