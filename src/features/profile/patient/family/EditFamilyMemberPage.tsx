// src/features/profile/patient/family/EditFamilyMemberPage.tsx
//
// Loads existing member details via GET /api/patients/me/details?patient_id=
// Saves via PATCH /api/patients/me/details?patient_id=
// Deletes via DELETE /api/patients/family-members/{id}

import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import { useTheme } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import {
  AppButton,
  AppInput,
  AppSelect,
  AppScreenHeader,
  StatusModal,
} from '../../../../components/common'
import {
  getFamilyMemberDetails,
  updateFamilyMemberDetails,
  deleteFamilyMember,
} from './familyMemberService'
import { mapApiToLocalState } from '../PatientProfileService'

// ── Constants ──────────────────────────────────────────────────────────────────

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

const MARITAL_STATUS_OPTIONS = [
  { label: 'Single', value: 'single' },
  { label: 'Married', value: 'married' },
  { label: 'Divorced', value: 'divorced' },
  { label: 'Widowed', value: 'widowed' },
]

// ── Component ─────────────────────────────────────────────────────────────────

export default function EditFamilyMemberPage() {
  const navigation = useNavigation<any>()
  const route = useRoute<any>()
  const theme = useTheme()
  const insets = useSafeAreaInsets()

  const { patientPublicId } = route.params as { patientPublicId: string }

  // ── State ──────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [memberName, setMemberName] = useState('')

  const [name, setName] = useState('')
  const [gender, setGender] = useState('')
  const [bloodGroup, setBloodGroup] = useState('')
  const [maritalStatus, setMaritalStatus] = useState('')
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')
  const [location, setLocation] = useState('')

  const [statusModal, setStatusModal] = useState<{
    visible: boolean
    status: 'success' | 'error'
    title: string
    description: string
    onSuccessNavigate?: boolean
  } | null>(null)

  // ── Load member details ────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        setLoading(true)
        const data = await getFamilyMemberDetails(patientPublicId)
        if (!cancelled && data) {
          const mapped = mapApiToLocalState(data)
          setName(mapped.name || '')
          setMemberName(mapped.name || 'Family Member')
          setGender(mapped.gender || '')
          setBloodGroup(mapped.bloodGroup || '')
          setMaritalStatus(mapped.maritalStatus || '')
          setHeight(mapped.height || '')
          setWeight(mapped.weight || '')
          setLocation(mapped.location || '')
        }
      } catch {
        Alert.alert('Error', 'Could not load member details.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [patientPublicId])

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Name cannot be empty.')
      return
    }
    setSaving(true)
    try {
      await updateFamilyMemberDetails(patientPublicId, {
        name: name.trim(),
        gender: gender || undefined,
        blood_group: bloodGroup || undefined,
        marital_status: maritalStatus || undefined,
        height: height ? Number(height) : undefined,
        weight: weight ? Number(weight) : undefined,
        location: location || undefined,
      })
      setStatusModal({
        visible: true,
        status: 'success',
        title: 'Profile Updated',
        description: 'Family member details have been saved.',
        onSuccessNavigate: true,
      })
    } catch (err: any) {
      setStatusModal({
        visible: true,
        status: 'error',
        title: 'Save Failed',
        description: err?.message || 'Something went wrong.',
      })
    } finally {
      setSaving(false)
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = () => {
    Alert.alert(
      'Delete Family Member',
      `Are you sure you want to remove ${memberName} from your profiles? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true)
            try {
              await deleteFamilyMember(patientPublicId)
              setStatusModal({
                visible: true,
                status: 'success',
                title: 'Member Removed',
                description: `${memberName} has been removed from your profiles.`,
                onSuccessNavigate: true,
              })
            } catch (err: any) {
              setStatusModal({
                visible: true,
                status: 'error',
                title: 'Delete Failed',
                description: err?.message || 'Something went wrong.',
              })
            } finally {
              setDeleting(false)
            }
          },
        },
      ]
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    )
  }

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <AppScreenHeader title={memberName || 'Edit Member'} onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <AppInput
            label="Full Name *"
            value={name}
            onChangeText={setName}
            placeholder="Member's name"
            style={styles.field}
          />

          <View style={styles.field}>
            <AppSelect
              label="Gender"
              value={gender}
              options={GENDER_OPTIONS}
              onSelect={(val) => setGender(val as string)}
              placeholder="Select gender"
            />
          </View>

          <View style={styles.field}>
            <AppSelect
              label="Blood Group"
              value={bloodGroup}
              options={BLOOD_GROUP_OPTIONS}
              onSelect={(val) => setBloodGroup(val as string)}
              placeholder="Select blood group"
            />
          </View>

          <View style={styles.field}>
            <AppSelect
              label="Marital Status"
              value={maritalStatus}
              options={MARITAL_STATUS_OPTIONS}
              onSelect={(val) => setMaritalStatus(val as string)}
              placeholder="Select marital status"
            />
          </View>

          <View style={styles.fieldRow}>
            <View style={styles.halfField}>
              <AppInput
                label="Height (cm)"
                value={height}
                onChangeText={setHeight}
                placeholder="e.g. 170"
                keyboardType="numeric"
              />
            </View>
            <View style={styles.halfField}>
              <AppInput
                label="Weight (kg)"
                value={weight}
                onChangeText={setWeight}
                placeholder="e.g. 65"
                keyboardType="numeric"
              />
            </View>
          </View>

          <AppInput
            label="Location"
            value={location}
            onChangeText={setLocation}
            placeholder="City or area"
            style={styles.field}
          />

          {/* Delete button */}
          <AppButton
            variant="outline"
            onPress={handleDelete}
            loading={deleting}
            disabled={deleting || saving}
            style={[styles.deleteButton, { borderColor: theme.colors.error }]}
            textColor={theme.colors.error}
          >
            Delete Family Member
          </AppButton>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Save Footer */}
      <View style={[styles.footer, { borderTopColor: theme.colors.outlineVariant }]}>
        <AppButton
          onPress={handleSave}
          loading={saving}
          disabled={saving || deleting}
          style={styles.saveButton}
        >
          Save Changes
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
            if (statusModal.onSuccessNavigate) navigation.goBack()
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
  centered: { alignItems: 'center', justifyContent: 'center' },
  scrollContent: { padding: 20, paddingBottom: 32 },
  field: { marginBottom: 18 },
  fieldRow: { flexDirection: 'row', gap: 12, marginBottom: 18 },
  halfField: { flex: 1 },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    backgroundColor: '#fff',
  },
  saveButton: { borderRadius: 12 },
  deleteButton: {
    marginTop: 20,
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
})
