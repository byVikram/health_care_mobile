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
import { useNavigation, NavigationProp } from '@react-navigation/native'

import { ROUTES } from '../../navigation/routes'
import { useAuth } from '../../context/AuthContext'
import DoctorHospitalDropdown from './DoctorHospitalDropdown'

interface AppHeaderProps {
  variant?: 'home' | 'search'
  avatarUri?: string
  onAvatarPress: () => void

  searchValue?: string
  onSearchChange?: (text: string) => void
  onSearchSubmit?: () => void
  isSearchEditable?: boolean
  location?: string
}

export default function AppHeader({
  variant = 'home',
  avatarUri,
  onAvatarPress,
  searchValue = '',
  onSearchChange,
  onSearchSubmit,
  isSearchEditable = false,
  location,
}: AppHeaderProps) {
  const insets = useSafeAreaInsets()
  const navigation = useNavigation<NavigationProp<any>>()

  const { role, user, selectedHospital } = useAuth()

  const isDoctor = role === 'doctor'
  const isPatient = role === 'patient'

  const displayName = user?.name || 'User'

  return (
    <View style={[styles.wrapper, { paddingTop: insets.top + 16 }]}>

      {/* TOP */}
      <View style={styles.topRow}>
        <Pressable onPress={onAvatarPress} style={styles.profileRow}>

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
              <Text style={styles.helloAccent}>Hello, </Text>
              {displayName}
            </Text>

            {/* ROLE BASED LOCATION DISPLAY */}
            {isDoctor ? (
              <DoctorHospitalDropdown />
            ) : (
              <Text style={styles.subText}>
                {selectedHospital || 'K R Market' || 'Select Location'}
              </Text>
            )}
          </View>
        </Pressable>
      </View>

      {/* SEARCH ONLY FOR PATIENT */}
      {isPatient ? (
        variant === 'home' ? (
          <Pressable
            style={styles.searchContainer}
            onPress={() => navigation.navigate(ROUTES.STACK.SEARCH)}
          >
            <MaterialCommunityIcons name="magnify" size={22} color="#26727a" />
            <Text style={styles.searchPlaceholder}>
              Search Doctors / Symptoms
            </Text>
          </Pressable>
        ) : (
          <View style={styles.searchContainer}>
            <MaterialCommunityIcons name="magnify" size={22} color="#26727a" />

            <TextInput
              style={styles.searchInput}
              placeholder="Search Doctors / Symptoms"
              value={searchValue}
              onChangeText={onSearchChange}
              onSubmitEditing={onSearchSubmit}
              editable={isSearchEditable}
            />
          </View>
        )
      ) : null}

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

  subText: {
    color: '#d7e7e8',
    fontSize: 13,
    marginTop: 2,
  },

  searchContainer: {
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  searchPlaceholder: {
    color: '#999',
    fontSize: 14,
  },

  searchInput: {
    flex: 1,
    fontSize: 14,
  },
})