import React from 'react'
import { StyleSheet, TouchableOpacity, View, ScrollView } from 'react-native'
import { Text } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'

export interface PatientProfile {
  id: string
  name: string
  relation: string
  age: number
  gender: string
  phone?: string
}

export const MOCK_FAMILY_PROFILES: PatientProfile[] = [
  { id: '1', name: 'Self', relation: 'Self', age: 35, gender: 'Primary' },
  { id: '2', name: 'Family Member', relation: 'Dependent', age: 60, gender: 'Female' },
]

interface Props {
  selectedPatientId: string
  onSelectPatient: (patient: PatientProfile) => void
  onAddNewPatient?: () => void
  accentColor?: string
}

export default function PatientSelectorCard({
  selectedPatientId,
  onSelectPatient,
  onAddNewPatient,
  accentColor = '#0D8585',
}: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <MaterialCommunityIcons name="account-group-outline" size={20} color={accentColor} />
          <Text style={styles.sectionTitle}>Patient Recipient</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={onAddNewPatient} activeOpacity={0.7}>
          <MaterialCommunityIcons name="plus-circle-outline" size={16} color={accentColor} />
          <Text style={[styles.addBtnText, { color: accentColor }]}>Add Family</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollList}>
        {MOCK_FAMILY_PROFILES.map((profile) => {
          const isSelected = profile.id === selectedPatientId
          return (
            <TouchableOpacity
              key={profile.id}
              style={[
                styles.profileCard,
                isSelected && { borderColor: accentColor, backgroundColor: `${accentColor}0D` },
              ]}
              onPress={() => onSelectPatient(profile)}
              activeOpacity={0.8}
            >
              <View style={styles.avatarRow}>
                <View style={[styles.avatarCircle, isSelected && { backgroundColor: accentColor }]}>
                  <MaterialCommunityIcons
                    name={profile.gender === 'Female' ? 'account-outline' : 'account-outline'}
                    size={20}
                    color={isSelected ? '#FFFFFF' : '#64748B'}
                  />
                </View>
                {isSelected && (
                  <View style={[styles.checkBadge, { backgroundColor: accentColor }]}>
                    <MaterialCommunityIcons name="check" size={12} color="#FFFFFF" />
                  </View>
                )}
              </View>

              <Text style={styles.profileName} numberOfLines={1}>
                {profile.name}
              </Text>
              <Text style={styles.profileMeta}>
                {profile.relation} • {profile.age} yrs
              </Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  scrollList: {
    gap: 10,
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
  profileCard: {
    width: 124,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  avatarRow: {
    position: 'relative',
    marginBottom: 8,
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  profileName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
    textAlign: 'center',
  },
  profileMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    textAlign: 'center',
  },
})
