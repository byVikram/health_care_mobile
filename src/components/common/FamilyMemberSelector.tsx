// src/components/common/FamilyMemberSelector.tsx
//
// Reusable chip-row selector for choosing a patient (self or family member).
// Used across booking flows: Doctor Appointment, Lab, Radiology, Pharmacy.
//
// Props:
//   selectedPatientId – null means "Myself" (current account's patient record).
//   onSelect          – called with the selected patient's public_id (or null for self).

import React, { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useTheme } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { getFamilyMembers } from '../../features/profile/patient/family/familyMemberService'
import { buildS3Url } from '../../utils/s3Utils'
import type { FamilyMember } from '../../types/familyMember'

const FALLBACK_AVATAR = require('../../assets/Banner/patient.png')

export interface FamilyMemberSelectorProps {
  selectedPatientId: string | null
  onSelect: (patientId: string | null) => void
  label?: string
}

export default function FamilyMemberSelector({
  selectedPatientId,
  onSelect,
  label = 'Booking for',
}: FamilyMemberSelectorProps) {
  const theme = useTheme()
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [loading, setLoading] = useState(true)
  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    setLoading(true)
    getFamilyMembers()
      .then((data) => { if (isMounted.current) setMembers(data) })
      .catch(() => {/* silently ignore; selector will be hidden if no data */ })
      .finally(() => { if (isMounted.current) setLoading(false) })
    return () => { isMounted.current = false }
  }, [])

  // If only the logged-in user (is_self) exists with no dependents, hide the selector.
  const hasDependents = members.some((m) => !m.is_self)
  if (!loading && !hasDependents) return null

  const selfMember = members.find((m) => m.is_self)

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>

      {loading ? (
        <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginTop: 8 }} />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {/* "Myself" chip (always first) */}
          {selfMember && (
            <Chip
              key="self"
              member={selfMember}
              isSelected={selectedPatientId === null}
              onPress={() => onSelect(null)}
              primaryColor={theme.colors.primary}
            />
          )}

          {/* Dependent chips */}
          {members
            .filter((m) => !m.is_self)
            .map((member) => (
              <Chip
                key={member.id}
                member={member}
                isSelected={selectedPatientId === member.id}
                onPress={() => onSelect(member.id)}
                primaryColor={theme.colors.primary}
              />
            ))}
        </ScrollView>
      )}
    </View>
  )
}

// ── Private Chip ──────────────────────────────────────────────────────────────

interface ChipProps {
  member: FamilyMember
  isSelected: boolean
  onPress: () => void
  primaryColor: string
}

function Chip({ member, isSelected, onPress, primaryColor }: ChipProps) {
  const avatarUrl = buildS3Url(member.avatar_s3_key)
  const imageSource = avatarUrl ? { uri: avatarUrl } : FALLBACK_AVATAR

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[
        styles.chip,
        isSelected && { borderColor: primaryColor, backgroundColor: `${primaryColor}14` },
      ]}
    >
      <View style={[styles.avatarWrapper, isSelected && { borderColor: primaryColor }]}>
        <Image source={imageSource} style={styles.avatar} />
        {isSelected && (
          <View style={[styles.checkBadge, { backgroundColor: primaryColor }]}>
            <MaterialCommunityIcons name="check" size={10} color="#fff" />
          </View>
        )}
      </View>
      <Text
        style={[styles.chipLabel, isSelected && { color: primaryColor, fontWeight: '600' }]}
        numberOfLines={1}
      >
        {member.is_self ? 'Myself' : member.name}
      </Text>
      {member.relation && !member.is_self && (
        <Text style={styles.chipRelation} numberOfLines={1}>
          {member.relation}
        </Text>
      )}
    </TouchableOpacity>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 10,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 2,
    paddingBottom: 4,
  },
  chip: {
    alignItems: 'center',
    width: 72,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    backgroundColor: '#f9f9f9',
  },
  avatarWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    marginBottom: 6,
    overflow: 'visible',
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  checkBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  chipLabel: {
    fontSize: 11,
    color: '#333',
    textAlign: 'center',
  },
  chipRelation: {
    fontSize: 10,
    color: '#888',
    textAlign: 'center',
    marginTop: 1,
  },
})
