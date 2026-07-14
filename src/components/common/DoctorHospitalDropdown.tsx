import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { API_ENDPOINTS } from '../../constants/apiUrls'
import { useAuth } from '../../context/AuthContext'
import AppBottomSheet from './AppBottomSheet'

interface HospitalItem {
  id: string
  label: string
  address?: string
}

const PRIMARY = '#2B6F71'

export default function DoctorHospitalDropdown() {
  const [hospitals, setHospitals] = useState<HospitalItem[]>([])
  const [selectedHospitalLocal, setSelectedHospitalLocal] = useState<HospitalItem | null>(null)
  const [dropdownVisible, setDropdownVisible] = useState(false)
  const [loading, setLoading] = useState(false)

  // ── Pull BOTH setters from context ────────────────────────────────────────
  const { setSelectedHospital, setSelectedHospitalId } = useAuth() as any

  useEffect(() => {
    fetchHospitals()
  }, [])

  const fetchHospitals = async () => {
    try {
      setLoading(true)
      const token = await AsyncStorage.getItem('access_token')
      if (!token) return

      const response = await axios.get(API_ENDPOINTS.DOCTORS.HOSPITALS, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.data?.success) {
        const formatted: HospitalItem[] = response.data.data.map((item: any) => ({
          id: String(item.hospital.id),
          label: item.hospital.name,
          address: item.hospital.address,
        }))

        setHospitals(formatted)

        // ── Auto-select the first hospital on load ────────────────────────
        if (formatted.length > 0) {
          const first = formatted[0]
          setSelectedHospitalLocal(first)
          setSelectedHospital(first.label)      // name → context
          setSelectedHospitalId(first.id)       // id   → context  ✅
        }
      }
    } catch (error: any) {
      console.log('Hospital fetch error:', error?.response?.data || error.message)
    } finally {
      setLoading(false)
    }
  }

  const openDropdown = () => {
    setDropdownVisible(true)
  }

  const handleSelect = (item: HospitalItem) => {
    setSelectedHospitalLocal(item)
    setSelectedHospital(item.label)       // name → context
    setSelectedHospitalId(item.id)        // id   → context  ✅
    setDropdownVisible(false)
  }

  return (
    <>
      {/* ── Selector button ───────────────────────────────────────────────── */}
      <Pressable style={styles.selector} onPress={openDropdown}>
        <MaterialCommunityIcons name="map-marker-outline" size={16} color="#fff" />
        <Text style={styles.selectorText} numberOfLines={1}>
          {selectedHospitalLocal?.label || (loading ? 'Loading...' : 'Select Hospital')}
        </Text>
        {hospitals.length > 1 && (
          <Text style={styles.extraCount}>+{hospitals.length - 1}</Text>
        )}
        <MaterialCommunityIcons name="chevron-down" size={18} color="#fff" />
      </Pressable>

      {/* ── Dropdown bottom sheet ─────────────────────────────────────────── */}
      <AppBottomSheet
        visible={dropdownVisible}
        title="Select Clinic / Hospital"
        onClose={() => setDropdownVisible(false)}
      >
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator color={PRIMARY} size="large" />
          </View>
        ) : hospitals.length === 0 ? (
          <View style={styles.centerBox}>
            <Text style={styles.noHospitalsText}>No hospitals assigned</Text>
          </View>
        ) : (
          <View style={styles.bottomSheetList}>
            {hospitals.map((item) => {
              const isSelected = selectedHospitalLocal?.id === item.id
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.bottomSheetItem,
                    isSelected && styles.bottomSheetItemActive,
                  ]}
                  onPress={() => handleSelect(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.itemHeader}>
                    <View style={[
                      styles.iconCircle,
                      isSelected ? styles.iconCircleActive : styles.iconCircleInactive
                    ]}>
                      <MaterialCommunityIcons 
                        name="hospital-building" 
                        size={20} 
                        color={isSelected ? '#ffffff' : '#64748b'} 
                      />
                    </View>
                    <View style={styles.itemTextContent}>
                      <Text style={[
                        styles.itemTitle,
                        isSelected && styles.itemTitleActive
                      ]}>
                        {item.label}
                      </Text>
                      {!!item.address && (
                        <Text style={styles.itemAddress}>{item.address}</Text>
                      )}
                    </View>
                    <View style={styles.selectionIndicator}>
                      <MaterialCommunityIcons 
                        name={isSelected ? "checkbox-marked-circle" : "checkbox-blank-circle-outline"} 
                        size={22} 
                        color={isSelected ? PRIMARY : '#cbd5e1'} 
                      />
                    </View>
                  </View>
                </TouchableOpacity>
              )
            })}
          </View>
        )}
      </AppBottomSheet>
    </>
  )
}

const styles = StyleSheet.create({
  selector: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    maxWidth: 240,
  },
  selectorText: {
    color: '#fff',
    fontSize: 13,
    marginLeft: 6,
    flex: 1,
    fontWeight: '500',
  },
  extraCount: {
    color: '#d8f3f5',
    fontSize: 12,
    marginHorizontal: 4,
    fontWeight: '600',
  },
  centerBox: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noHospitalsText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  bottomSheetList: {
    paddingVertical: 12,
    gap: 12,
  },
  bottomSheetItem: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
  },
  bottomSheetItemActive: {
    backgroundColor: '#f0fdfa',
    borderColor: PRIMARY,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleInactive: {
    backgroundColor: '#e2e8f0',
  },
  iconCircleActive: {
    backgroundColor: PRIMARY,
  },
  itemTextContent: {
    flex: 1,
    gap: 2,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
  itemTitleActive: {
    color: PRIMARY,
    fontWeight: '700',
  },
  itemAddress: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 16,
    marginTop: 2,
  },
  selectionIndicator: {
    justifyContent: 'center',
    alignItems: 'center',
  },
})