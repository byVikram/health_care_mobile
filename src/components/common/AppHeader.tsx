// AppHeader.tsx
import React from 'react'
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import DoctorHospitalDropdown from './DoctorHospitalDropdown'

interface AppHeaderProps {
  userName?: string
  avatarUri?: string
  onAvatarPress: () => void
  searchValue?: string
  onSearchChange?: (text: string) => void
  onSearchSubmit?: () => void
  isSearchEditable?: boolean
}

export default function AppHeader({
  userName = 'User',
  avatarUri,
  onAvatarPress,
  searchValue,
  onSearchChange,
  onSearchSubmit,
  isSearchEditable = true,
}: AppHeaderProps) {
  const insets = useSafeAreaInsets()

  return (
    <View
      style={[
        styles.wrapper,
        { paddingTop: insets.top + 16 },
      ]}
    >
      {/* Top Section */}
      <View style={styles.topRow}>
        <Pressable
          onPress={onAvatarPress}
          style={styles.profileRow}
        >
          <Image
            source={
              avatarUri
                ? { uri: avatarUri }
                : require('../../assets/Banner/patient.png')
            }
            style={styles.avatar}
          />

          <View style={{ flex: 1 }}>
            <Text style={styles.helloText}>
              <Text style={styles.helloAccent}>
                Hello,{' '}
              </Text>
              {userName}
            </Text>

            {/* Separate Hospital Dropdown */}
            <DoctorHospitalDropdown />
          </View>
        </Pressable>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <MaterialCommunityIcons
          name="magnify"
          size={22}
          color="#26727a"
        />

        <TextInput
          placeholder="Search Doctors/Symptoms"
          style={styles.searchInput}
          value={searchValue}
          onChangeText={onSearchChange}
          editable={isSearchEditable}
          onSubmitEditing={() =>
            onSearchSubmit?.()
          }
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#155a61',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 14,
  },
  helloText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  helloAccent: {
    color: '#6fe3e8',
  },
  searchContainer: {
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
  },
})