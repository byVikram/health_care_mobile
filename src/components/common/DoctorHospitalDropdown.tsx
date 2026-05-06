import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  Pressable,
  Modal,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { API_ENDPOINTS } from '../../constants/apiUrls'
import { useAuth } from '../../context/AuthContext'

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
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 })
  const buttonRef = React.useRef<any>(null)

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
    buttonRef.current?.measure(
      (_fx: number, _fy: number, width: number, height: number, px: number, py: number) => {
        setDropdownPos({ top: py + height, left: px, width })
        setDropdownVisible(true)
      }
    )
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
      <Pressable ref={buttonRef} style={styles.selector} onPress={openDropdown}>
        <MaterialCommunityIcons name="map-marker-outline" size={16} color="#fff" />
        <Text style={styles.selectorText} numberOfLines={1}>
          {selectedHospitalLocal?.label || (loading ? 'Loading...' : 'Select Hospital')}
        </Text>
        {hospitals.length > 1 && (
          <Text style={styles.extraCount}>+{hospitals.length - 1}</Text>
        )}
        <MaterialCommunityIcons name="chevron-down" size={18} color="#fff" />
      </Pressable>

      {/* ── Dropdown modal ────────────────────────────────────────────────── */}
      <Modal visible={dropdownVisible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setDropdownVisible(false)}>
          <View
            style={[
              styles.dropdownBox,
              { top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width },
            ]}
          >
            {loading ? (
              <View style={styles.centerBox}>
                <ActivityIndicator color={PRIMARY} />
              </View>
            ) : (
              <FlatList
                data={hospitals}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.dropdownItem,
                      selectedHospitalLocal?.id === item.id && { backgroundColor: `${PRIMARY}15` },
                    ]}
                    onPress={() => handleSelect(item)}
                  >
                    <Text style={styles.dropdownTitle}>{item.label}</Text>
                    {!!item.address && (
                      <Text style={styles.dropdownAddress}>{item.address}</Text>
                    )}
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </Pressable>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  selector: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#276668',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    maxWidth: 320,
  },
  selectorText: {
    color: '#fff',
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
  },
  extraCount: {
    color: '#d8f3f5',
    fontSize: 12,
    marginHorizontal: 6,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  dropdownBox: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 12,
    maxHeight: 300,
    elevation: 10,
    overflow: 'hidden',
  },
  dropdownItem: {
    padding: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: '#eee',
  },
  dropdownTitle: {
    fontWeight: '600',
    fontSize: 14,
    color: '#222',
  },
  dropdownAddress: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  centerBox: {
    padding: 20,
    alignItems: 'center',
  },
})