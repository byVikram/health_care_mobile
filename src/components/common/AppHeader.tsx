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
  const isPharmacy = role === 'pharmacy'

  // ── Display name ──────────────────────────────────────────────────────────
  // FIX: user.name is "" (empty string) for pharmacy — must check trim().length
  // so we fall through to the email prefix instead of rendering blank.
  const u = user as any
  let displayName = 'User'
  if (u?.name && u.name.trim().length > 0) {
    displayName = u.name.trim()
  } else if (u?.pharmacy_name && u.pharmacy_name.trim().length > 0) {
    displayName = u.pharmacy_name.trim()
  } else if (u?.business_name && u.business_name.trim().length > 0) {
    displayName = u.business_name.trim()
  } else if (u?.email) {
    displayName = u.email.split('@')[0]
  }

  // Location for pharmacy
  const pharmacyLocation = u?.location || selectedHospital || 'Select Location'

  const handlePharmacyLocationPress = () => {
    console.log('Open pharmacy location selector')
  }

  return (
    <View style={[styles.wrapper, { paddingTop: insets.top + 16 }]}>

      {/* TOP ROW: Avatar + Greeting + Notification (pharmacy only) */}
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

            {/* Role-specific subtext */}
            {isDoctor ? (
              <DoctorHospitalDropdown />
            ) : isPharmacy ? (
              <Pressable onPress={handlePharmacyLocationPress}>
                <Text style={styles.subText}>{pharmacyLocation}</Text>
              </Pressable>
            ) : (
              <Text style={styles.subText}>
                {selectedHospital || 'K R Market' || 'Select Location'}
              </Text>
            )}
          </View>
        </Pressable>

        {/* Notification Icon – only for pharmacy */}
        {isPharmacy && (
          <Pressable
            onPress={() => navigation.navigate(ROUTES.STACK.NOTIFICATION)}
            style={styles.notificationIcon}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialCommunityIcons name="bell-outline" size={24} color="#6fe3e8" />
          </Pressable>
        )}
      </View>

      {/* SEARCH BAR – role based */}
      {isPatient && (
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
      )}

      {isPharmacy && (
        <View style={styles.searchContainer}>
          <MaterialCommunityIcons name="magnify" size={22} color="#26727a" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search order ID"
            value={searchValue}
            onChangeText={onSearchChange}
            onSubmitEditing={onSearchSubmit}
            editable={isSearchEditable}
          />
        </View>
      )}

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
    justifyContent: 'space-between',
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

  notificationIcon: {
    marginLeft: 12,
    padding: 4,
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