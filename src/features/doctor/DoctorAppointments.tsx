// src/features/doctor/DoctorAppointments.tsx
//
// React Native equivalent of the web DoctorAppointments component.
// All business logic (status helpers, confirm/reject/reschedule flow,
// local state overrides) is preserved exactly.

import React, { useState, useEffect, useMemo } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  FlatList,
  Modal,
  Pressable,
  Alert,
  Animated,
  Easing,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native'
import Toast from 'react-native-toast-message'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { Appointment } from '../../types/appointment'
import { updateAppointmentsStatus } from '../../services/appointmentService'
import ApiService from '../../services/apiService'
import { API_ENDPOINTS } from '../../constants/apiUrls'
import DateSlotPicker from '../../components/common/DateSlotPicker'
import { AppInput } from '../../components/common'
import FavouriteDoctorList, { type FavouriteDoctorListItem } from './search/components/FavouriteDoctorList'
import {
  getDoctorAvailability,
  getDoctorProfile,
  rescheduleAppointment,
  startConsultation,
  getFavouriteDoctors,
  toggleFavouriteDoctor,
  referAppointment,
  type SlotGroup,
  type FavouriteDoctor,
} from './doctorService'

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatTime12h = (t?: string | null): string => {
  if (!t) return '--'
  const [h, m] = t.split(':').map(Number)
  const suffix = h >= 12 ? 'PM' : 'AM'
  const hour = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${String(hour).padStart(2, '0')}:${String(m).padStart(2, '0')} ${suffix}`
}

const isVideoMode = (mode?: string | null): boolean => mode === 'video_call'

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonCard() {
  const opacity = React.useRef(new Animated.Value(0.4)).current
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, easing: Easing.ease, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, easing: Easing.ease, useNativeDriver: true }),
      ])
    )
    anim.start()
    return () => anim.stop()
  }, [opacity])

  return (
    <Animated.View style={[styles.skeletonCard, { opacity }]}>
      <View style={styles.skeletonIcon} />
      <View style={styles.skeletonContent}>
        <View style={[styles.skeletonLine, { width: '60%' }]} />
        <View style={[styles.skeletonLine, { width: '35%', marginTop: 6 }]} />
      </View>
    </Animated.View>
  )
}

// ── Status chip ───────────────────────────────────────────────────────────────

function getStatusChipStyle(
  isCancelled: boolean,
  isConfirmed: boolean,
  isWaitingPatient: boolean
): { bg: string; color: string } {
  if (isCancelled) return { bg: '#ffeeee', color: '#e53935' }
  if (isConfirmed) return { bg: '#e8f5e9', color: '#4caf50' }
  if (isWaitingPatient) return { bg: '#fff3e0', color: '#e65100' }
  return { bg: '#fff8e8', color: '#f59e0b' }
}

// ── Reject confirm modal ──────────────────────────────────────────────────────

interface RejectModalProps {
  visible: boolean
  onCancel: () => void
  onConfirm: () => void
}

function RejectConfirmModal({ visible, onCancel, onConfirm }: RejectModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.rejectBackdrop} onPress={onCancel} />
      <View style={styles.rejectCard}>
        <Text style={styles.rejectTitle}>Are you sure?</Text>
        <Text style={styles.rejectSubtitle}>You want to reject this appointment</Text>
        <View style={styles.rejectButtons}>
          <TouchableOpacity style={styles.rejectCancelBtn} onPress={onCancel} activeOpacity={0.8}>
            <Text style={styles.rejectCancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.rejectConfirmBtn} onPress={onConfirm} activeOpacity={0.8}>
            <Text style={styles.rejectConfirmText}>Yes, Reject</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

// ── Week day selector ─────────────────────────────────────────────────────────

interface WeekDay {
  day: string
  date: string
  red: boolean
  dateObj: Date
}

interface WeekSelectorProps {
  weekDays: WeekDay[]
  selectedDate: number
  onSelectDate: (i: number) => void
  selectedDateObj: Date
}

function WeekSelector({ weekDays, selectedDate, onSelectDate, selectedDateObj }: WeekSelectorProps) {
  return (
    <View>
      <View style={styles.weekHeader}>
        <Text style={styles.weekHeaderTitle}>Today's Appointments</Text>
        <Text style={styles.weekMonth}>
          {selectedDateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.weekDayRow}>
        {weekDays.map((d, i) => (
          <TouchableOpacity
            key={i}
            style={[
              styles.dayCell,
              selectedDate === i && styles.dayCellSelected,
            ]}
            onPress={() => onSelectDate(i)}
            activeOpacity={0.7}
          >
            <Text style={[styles.dayLabel, selectedDate === i && styles.dayLabelSelected]}>
              {d.day}
            </Text>
            <Text
              style={[
                styles.dateLabel,
                selectedDate === i && styles.dateLabelSelected,
                !selectedDate && d.red && styles.dateLabelRed,
              ]}
            >
              {d.date}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <View style={styles.divider} />
    </View>
  )
}

// ── Reschedule Helpers ────────────────────────────────────────────────────────

const toApiDate = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getRescheduleModeKey = (appointmentType: 'clinic' | 'video') =>
  appointmentType === 'video' ? 'video_call' : 'clinic_visit'

const getSlotStatus = (slot: any) => {
  const status = typeof slot.status === 'string' ? slot.status.toUpperCase() : ''

  if (slot.is_booked || status === 'OCCUPIED') return 'OCCUPIED'
  if (slot.is_enabled === false || status === 'UNAVAILABLE') return 'UNAVAILABLE'
  if (status === 'BLOCKED') return 'BLOCKED'
  if (status === 'BOOKED') return 'BOOKED'
  return 'AVAILABLE'
}

const normalizeAvailabilitySlots = (
  response: any,
  appointmentType: 'clinic' | 'video'
): SlotGroup[] => {
  const rawData = (
    Array.isArray(response) ? response : Array.isArray(response?.data) ? response.data : []
  )
  const modeKey = getRescheduleModeKey(appointmentType)

  return rawData
    .filter((item: any) => !item.appointment_mode || item.appointment_mode.toLowerCase() === modeKey)
    .flatMap((item: any, itemIndex: number) => {
      const sessions =
        Array.isArray(item.sessions) && item.sessions.length > 0
          ? item.sessions
          : [{ label: item.label, range: item.range, period: item.period, slots: item.slots }]

      return sessions
        .map((session: any, sessionIndex: number): SlotGroup => {
          const label = session.label || `Session ${sessionIndex + 1}`

          return {
            label,
            range: session.range,
            period: session.period || session.range,
            slots: (session.slots ?? [])
              .filter((slot: any) => Boolean(slot.start_time && slot.end_time))
              .map((slot: any, slotIndex: number) => ({
                id: `${modeKey}-${itemIndex}-${label}-${slot.start_time}-${slotIndex}`,
                start_time: slot.start_time as string,
                end_time: slot.end_time as string,
                status: getSlotStatus(slot),
                is_enabled: slot.is_enabled,
                is_booked: slot.is_booked,
                can_toggle: slot.is_enabled === false ? false : slot.can_toggle,
              })),
          }
        })
        .filter((session: any) => session.slots.length > 0)
    })
}

// ── Main component ────────────────────────────────────────────────────────────

interface DoctorAppointmentsProps {
  selectedDate: number
  setSelectedDate: (i: number) => void
  appointments: Appointment[]
  apptLoading: boolean
  apptError: string
  weekDays: WeekDay[]
  selectedDateObj: Date
  searchQuery: string
  setSearchQuery: (value: string) => void
}

export function DoctorAppointments({
  selectedDate,
  setSelectedDate,
  appointments,
  apptLoading,
  apptError,
  weekDays,
  selectedDateObj,
  searchQuery,
  setSearchQuery,
}: DoctorAppointmentsProps) {

  // Local status overrides (set after an action without a full refresh)
  const [localStatuses, setLocalStatuses] = useState<Record<string, string>>({})
  const [localTimes, setLocalTimes] = useState<Record<string, { start_time: string; end_time: string | null }>>({})
  // Tracks who initiated the most recent reschedule for each appointment.
  const [localRescheduledBy, setLocalRescheduledBy] = useState<Record<string, string>>({})

  // Reject confirmation modal state
  const [rejectModalVisible, setRejectModalVisible] = useState(false)
  const [pendingRejectId, setPendingRejectId] = useState<string | null>(null)

  // Reschedule state
  const [rescheduleAppt, setRescheduleAppt] = useState<Appointment | null>(null)
  const [rescheduleOpen, setRescheduleOpen] = useState(false)
  const [rescheduleDate, setRescheduleDate] = useState(new Date())
  const [rescheduleTime, setRescheduleTime] = useState('')
  const [rescheduleSlots, setRescheduleSlots] = useState<SlotGroup[]>([])
  const [rescheduleSlotsLoading, setRescheduleSlotsLoading] = useState(false)
  const [rescheduleSubmitting, setRescheduleSubmitting] = useState(false)
  const [rescheduleHospitals, setRescheduleHospitals] = useState<{ id: string; label: string }[]>([])
  const [rescheduleHospitalId, setRescheduleHospitalId] = useState('')
  const [hospitalDropdownOpen, setHospitalDropdownOpen] = useState(false)
  const [appointmentType, setAppointmentType] = useState<'clinic' | 'video'>('clinic')

  // Refer state
  const [referOpen, setReferOpen] = useState(false)
  const [referApptId, setReferApptId] = useState<string | null>(null)
  const [favouriteDoctors, setFavouriteDoctors] = useState<FavouriteDoctorListItem[]>([])
  const [favouriteDoctorIds, setFavouriteDoctorIds] = useState<Set<string>>(new Set())
  const [referLoading, setReferLoading] = useState(false)
  const [referSearchQuery, setReferSearchQuery] = useState('')
  const [bookmarkingIds, setBookmarkingIds] = useState<Set<string>>(new Set())

  const { width, height } = useWindowDimensions()
  const isTablet = width >= 768
  const isLandscape = width > height
  const rescheduleColumns = isTablet || isLandscape ? 4 : 3

  const canConfirmReschedule = Boolean(
    rescheduleDate &&
      rescheduleTime &&
      (rescheduleHospitalId || rescheduleAppt?.hospital?.id) &&
      !rescheduleSlotsLoading &&
      !rescheduleSubmitting
  )

  useEffect(() => {
    if (!rescheduleOpen || !rescheduleAppt) return

    const doctorId = rescheduleAppt.doctor?.id
    if (!doctorId) return

    let mounted = true
    const fetchDoctorHospitals = async () => {
      try {
        const res = await getDoctorProfile()
        if (mounted && res.success && res.data) {
          const hospitals = (res.data.hospitals ?? []).map((h) => ({
            id: h.hospital?.id || h.id,
            label: h.hospital?.name || 'Unknown Hospital',
          }))
          setRescheduleHospitals(hospitals)
          setRescheduleHospitalId((current) => current || rescheduleAppt.hospital?.id || hospitals[0]?.id || '')
        }
      } catch (error) {
        console.log('[DoctorAppointments] fetch doctor hospitals error:', error)
      }
    }

    void fetchDoctorHospitals()

    return () => {
      mounted = false
    }
  }, [rescheduleAppt, rescheduleOpen])

  useEffect(() => {
    if (!rescheduleOpen || !rescheduleAppt) return

    const doctorId = rescheduleAppt.doctor?.id
    const hospitalId = rescheduleHospitalId || rescheduleAppt.hospital?.id

    if (!doctorId || !hospitalId) {
      setRescheduleSlots([])
      setRescheduleTime('')
      return
    }

    let mounted = true

    const fetchSlots = async () => {
      setRescheduleSlotsLoading(true)
      setRescheduleSlots([])
      setRescheduleTime('')

      try {
        const dateStr = toApiDate(rescheduleDate)
        const responseData = await getDoctorAvailability({
          doctor_id: doctorId,
          hospital_id: hospitalId,
          date: dateStr,
        })
        if (mounted) {
          setRescheduleSlots(normalizeAvailabilitySlots(responseData, appointmentType))
        }
      } catch (error) {
        console.log('[DoctorAppointments] fetch reschedule slots error:', error)
        if (mounted) Alert.alert('Error', 'Could not load available slots.')
      } finally {
        if (mounted) setRescheduleSlotsLoading(false)
      }
    }

    void fetchSlots()

    return () => {
      mounted = false
    }
  }, [appointmentType, rescheduleAppt, rescheduleDate, rescheduleHospitalId, rescheduleOpen])

  useEffect(() => {
    if (!referOpen) return

    let mounted = true
    const fetchFavouriteDoctors = async () => {
      try {
        setReferLoading(true)
        const res = await getFavouriteDoctors()
        if (mounted && res.success) {
          const mapped = (res.data?.favourites ?? []).map((doctor: FavouriteDoctor) => ({
            id: doctor.id,
            name: doctor.name,
            avatar_s3_key: doctor.avatar_s3_key ?? null,
            location: doctor.location ?? '',
            experience_years: doctor.experience_years ?? null,
            specialities: doctor.specialities ?? [],
            is_verified: doctor.is_verified,
          }))
          setFavouriteDoctors(mapped)
          setFavouriteDoctorIds(new Set(res.data?.favourite_ids ?? []))
        } else if (mounted) {
          Toast.show({
            type: 'error',
            text1: 'Error',
            text2: res.message || 'Failed to load favourite doctors',
          })
        }
      } catch {
        if (mounted) {
          Toast.show({
            type: 'error',
            text1: 'Error',
            text2: 'Failed to load favourite doctors',
          })
        }
      } finally {
        if (mounted) setReferLoading(false)
      }
    }

    void fetchFavouriteDoctors()

    return () => {
      mounted = false
    }
  }, [referOpen])

  const filteredReferDoctors = useMemo(() => {
    const query = referSearchQuery.trim().toLowerCase()
    if (!query) return favouriteDoctors
    return favouriteDoctors.filter(
      (doctor) =>
        doctor.name.toLowerCase().includes(query) ||
        (doctor.specialities[0]?.toLowerCase().includes(query) ?? false)
    )
  }, [favouriteDoctors, referSearchQuery])

  const handleToggleBookmark = async (doctor: FavouriteDoctorListItem) => {
    if (bookmarkingIds.has(doctor.id)) return

    const wasFavourite = favouriteDoctorIds.has(doctor.id)

    setBookmarkingIds((prev) => new Set(prev).add(doctor.id))
    setFavouriteDoctorIds((prev) => {
      const next = new Set(prev)
      if (wasFavourite) next.delete(doctor.id)
      else next.add(doctor.id)
      return next
    })

    try {
      const res = await toggleFavouriteDoctor(doctor.id)
      if (res.success === false) {
        throw new Error(res.message || 'Failed to update favourites')
      }

      const isFavourite = res.data?.action ? res.data.action === 'added' : !wasFavourite
      
      if (res.data?.favourite_ids) {
        setFavouriteDoctorIds(new Set(res.data.favourite_ids))
      }
      
      if (res.data?.favourites) {
        const mapped = res.data.favourites.map((doc: FavouriteDoctor) => ({
          id: doc.id,
          name: doc.name,
          avatar_s3_key: doc.avatar_s3_key ?? null,
          location: doc.location ?? '',
          experience_years: doc.experience_years ?? null,
          specialities: doc.specialities ?? [],
          is_verified: doc.is_verified,
        }))
        setFavouriteDoctors(mapped)
      } else {
        setFavouriteDoctors((prev) => {
          if (!isFavourite) return prev.filter((item) => item.id !== doctor.id)
          return prev.some((item) => item.id === doctor.id) ? prev : [...prev, doctor]
        })
      }

      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: isFavourite ? 'Added to favourites' : 'Removed from favourites',
      })
    } catch {
      setFavouriteDoctorIds((prev) => {
        const next = new Set(prev)
        if (wasFavourite) next.add(doctor.id)
        else next.delete(doctor.id)
        return next
      })
      setFavouriteDoctors((prev) => {
        if (wasFavourite) {
          return prev.some((item) => item.id === doctor.id) ? prev : [...prev, doctor]
        }
        return prev.filter((item) => item.id !== doctor.id)
      })
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to update favourites',
      })
    } finally {
      setBookmarkingIds((prev) => {
        const next = new Set(prev)
        next.delete(doctor.id)
        return next
      })
    }
  }

  const handleReferClick = (appointmentId: string) => {
    setReferApptId(appointmentId)
    setReferSearchQuery('')
    setReferOpen(true)
  }

  const handleReferConfirm = async (doctor: FavouriteDoctorListItem) => {
    if (!referApptId) return

    try {
      const res = await referAppointment({
        appointment_id: referApptId,
        doctor_id: doctor.id,
      })

      if (res.success) {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: `Referred appointment to Dr. ${doctor.name}`,
        })
        setReferOpen(false)
      } else {
        Alert.alert('Error', res.message || 'Failed to refer appointment.')
      }
    } catch (error) {
      console.log('[DoctorAppointments] refer error:', error)
      Alert.alert('Error', 'Something went wrong. Please try again.')
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  const getStatusLabel = (apt: Appointment): string => {
    const localStatus = localStatuses[apt.id]
    const status = (
      localStatus ??
      (typeof apt.status === 'string' ? apt.status : (apt.status?.label ?? 'pending'))
    ).toLowerCase()

    if (status === 'rescheduled') {
      const rescheduledBy = (localRescheduledBy[apt.id] ?? apt.rescheduled_by ?? '').toLowerCase()
      if (rescheduledBy === 'doctor') return 'Waiting for Patient Confirmation'
      if (rescheduledBy === 'patient') return 'Waiting for Your Confirmation'
      return 'Rescheduled'
    }

    return localStatus ?? (typeof apt.status === 'string' ? apt.status : (apt.status?.label ?? 'pending'))
  }

  // ── Action handlers ───────────────────────────────────────────────────────

  const handleConfirmAppointment = async (appointmentId: string) => {
    try {
      const res = await updateAppointmentsStatus(appointmentId, '3f9a2c8e-7b61-4d2a-9a3f-5c8e1b2d4f90')
      if (res.success) {
        Toast.show({ type: 'success', text1: 'Appointment confirmed successfully.' })
        setLocalStatuses((prev) => ({ ...prev, [appointmentId]: 'confirmed' }))
      }
    } catch {
      Toast.show({ type: 'error', text1: 'Something went wrong. Please try again.' })
    }
  }

  const handleRejectClick = (appointmentId: string) => {
    setPendingRejectId(appointmentId)
    setRejectModalVisible(true)
  }

  const handleCancelReject = () => {
    setRejectModalVisible(false)
    setPendingRejectId(null)
  }

  const handleConfirmReject = async () => {
    if (!pendingRejectId) return
    setRejectModalVisible(false)
    try {
      const res = await updateAppointmentsStatus(pendingRejectId, 'a7d4e1c2-9f6b-4c83-b2e1-6f3a9d8c7b12')
      if (res.success) {
        Toast.show({ type: 'success', text1: 'Appointment rejected successfully.' })
        setLocalStatuses((prev) => ({ ...prev, [pendingRejectId!]: 'cancelled' }))
      }
    } catch {
      Toast.show({ type: 'error', text1: 'Something went wrong. Please try again.' })
    } finally {
      setPendingRejectId(null)
    }
  }

  const handleRescheduleDateChange = (date: Date) => {
    setRescheduleDate(date)
    setRescheduleTime('')
    setRescheduleSlots([])
  }

  const handleRescheduleClick = (apt: Appointment) => {
    const isVirtual = isVideoMode(apt.appointment_mode)
    setRescheduleAppt(apt)
    setRescheduleDate(new Date())
    setRescheduleTime('')
    setRescheduleSlots([])
    setRescheduleHospitals([])
    setHospitalDropdownOpen(false)
    setRescheduleHospitalId(apt.hospital?.id || '')
    setAppointmentType(isVirtual ? 'video' : 'clinic')
    setRescheduleOpen(true)
  }

  const handleRescheduleConfirm = async () => {
    if (!rescheduleAppt || !rescheduleTime) {
      Alert.alert('Select time', 'Please select a time slot before confirming.')
      return
    }

    const hospitalId = rescheduleHospitalId || rescheduleAppt.hospital?.id
    if (!hospitalId) {
      Alert.alert('Select hospital', 'Please select a hospital before confirming.')
      return
    }

    const selectedSlot = rescheduleSlots
      .flatMap((group) => group.slots)
      .find((slot) => slot.start_time === rescheduleTime)
    
    const dateStr = toApiDate(rescheduleDate)

    setRescheduleSubmitting(true)
    try {
      const res = await rescheduleAppointment({
        appointment_id: rescheduleAppt.id,
        appointment_date: dateStr,
        start_time: rescheduleTime,
        end_time: selectedSlot?.end_time ?? null,
        hospital_id: hospitalId,
        reason: 'Doctor unavailable',
      })

      if (res.success) {
        Toast.show({ type: 'success', text1: 'Appointment rescheduled successfully.' })
        setLocalStatuses((prev) => ({ ...prev, [rescheduleAppt.id]: 'rescheduled' }))
        setLocalRescheduledBy((prev) => ({ ...prev, [rescheduleAppt.id]: 'doctor' }))
        
        setLocalTimes((prev) => ({
          ...prev,
          [rescheduleAppt.id]: {
            start_time: rescheduleTime,
            end_time: selectedSlot?.end_time ?? null
          }
        }))

        setRescheduleOpen(false)
      } else {
        Alert.alert('Error', res.message || 'Reschedule failed. Please try again.')
      }
    } catch (error: any) {
      console.log('[DoctorAppointments] reschedule error:', error?.response?.data || error?.message || error)
      Alert.alert('Error', 'Something went wrong. Please try again.')
    } finally {
      setRescheduleSubmitting(false)
    }
  }

  const handleStartConsultation = async (appointmentId: string, patientId: string) => {
    try {
      const res = await startConsultation(appointmentId)
      if (res.success) {
        // Navigate to OTP or consultation screen
        console.log('Start consultation for patient', patientId)
        Alert.alert('Consultation', 'Starting OTP verification…')
      }
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to generate OTP' })
    }
  }

  // ── Filter (by search query) ─────────────────────────────────────────────

  const filteredAppointments = appointments
    .filter((apt) => getStatusLabel(apt).toLowerCase() !== 'cancelled')
    .filter((apt) => {
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase()
      return (
        (apt.patient?.name ?? '').toLowerCase().includes(q) ||
        (apt.patient?.id ?? '').toLowerCase().includes(q)
      )
    })

  // ── Render each appointment card ─────────────────────────────────────────

  const renderAppointment = ({ item: apt }: { item: Appointment }) => {
    const statusLabel = getStatusLabel(apt)
    const isCancelled = statusLabel.toLowerCase() === 'cancelled'
    const isConfirmed = statusLabel.toLowerCase() === 'confirmed'
    const rescheduledByDoctor =
      statusLabel.toLowerCase().includes('waiting for patient') ||
      (statusLabel === 'rescheduled' &&
        (localRescheduledBy[apt.id] ?? apt.rescheduled_by ?? '').toLowerCase() === 'doctor')

    const chipStyle = getStatusChipStyle(isCancelled, isConfirmed, rescheduledByDoctor)
    const video = isVideoMode(apt.appointment_mode)

    const allActionButtons = [
      { label: 'Confirm', action: 'confirm', bg: '#e8f5e9', color: '#4caf50' },
      { label: 'Reject', action: 'reject', bg: '#ffeeee', color: '#e53935' },
      { label: 'Reschedule', action: 'reschedule', bg: '#fff8e8', color: '#f59e0b' },
      { label: 'Refer', action: 'refer', bg: '#e8f4f8', color: '#0c7c7c' },
    ]

    const visibleActions = allActionButtons.filter(
      (btn) =>
        !(btn.action === 'confirm' && isConfirmed) &&
        !(btn.action === 'confirm' && rescheduledByDoctor)
    )

    return (
      <TouchableOpacity
        style={[styles.aptCard, isCancelled && styles.aptCardCancelled]}
        onPress={() => {
          if (apt.patient?.id && apt.id) {
            handleStartConsultation(apt.id, apt.patient.id)
          }
        }}
        activeOpacity={0.85}
      >
        {/* Mode icon */}
        <View style={[styles.modeIcon, { backgroundColor: isCancelled ? '#f5f5f5' : '#e8f4f0' }]}>
          <Text style={[styles.modeIconText, { color: isCancelled ? '#b0b0b0' : '#0c7c7c' }]}>
            {video ? '📹' : '🏠'}
          </Text>
        </View>

        {/* Content */}
        <View style={styles.aptContent}>
          {/* Name + Status */}
          <View style={styles.aptNameRow}>
            <Text style={[styles.aptName, isCancelled && styles.aptNameMuted]} numberOfLines={1}>
              {apt.patient?.name ?? 'Unknown Patient'}
            </Text>
            <View style={[styles.aptChip, { backgroundColor: chipStyle.bg }]}>
              <Text style={[styles.aptChipText, { color: chipStyle.color }]} numberOfLines={1}>
                {statusLabel}
              </Text>
            </View>
          </View>

          {/* Age / gender / time */}
          <View style={styles.aptMetaRow}>
            {(apt.patient?.age || apt.patient?.gender) && (
              <Text style={styles.aptMeta}>
                {apt.patient?.age} yrs / {apt.patient?.gender}{'  '}
              </Text>
            )}
            <Text style={styles.aptMeta}>🕐 </Text>
            <Text style={styles.aptMeta}>
              {formatTime12h(localTimes[apt.id]?.start_time ?? apt.start_time)} –{' '}
              {formatTime12h(localTimes[apt.id]?.end_time ?? apt.end_time)}
            </Text>
          </View>

          {/* Cancelled banner */}
          {isCancelled && (
            <View style={styles.cancelledBanner}>
              <Text style={styles.cancelledBannerIcon}>✕</Text>
              <Text style={styles.cancelledBannerText}>Doctor rejected the appointment</Text>
            </View>
          )}

          {/* Action buttons */}
          {!isCancelled && (
            <View style={styles.aptActionRow}>
              {visibleActions.map((btn) => (
                <TouchableOpacity
                  key={btn.action}
                  style={[styles.aptActionBtn, { backgroundColor: btn.bg }]}
                  onPress={(e) => {
                    // Prevent triggering the card's onPress
                    if (btn.action === 'confirm') handleConfirmAppointment(apt.id)
                    else if (btn.action === 'reject') handleRejectClick(apt.id)
                    else if (btn.action === 'reschedule') handleRescheduleClick(apt)
                    else if (btn.action === 'refer') handleReferClick(apt.id)
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.aptActionBtnText, { color: btn.color }]}>{btn.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </TouchableOpacity>
    )
  }

  // ── Root render ───────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchSection}>
        <Text style={styles.searchLabel}>Search Patient</Text>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search Patient ID, Name..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      {/* Week selector */}
      <WeekSelector
        weekDays={weekDays}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        selectedDateObj={selectedDateObj}
      />

      {/* Appointments */}
      {apptLoading && (
        <View style={styles.skeletonContainer}>
          {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
        </View>
      )}

      {!apptLoading && apptError !== '' && (
        <Text style={styles.errorText}>{apptError}</Text>
      )}

      {!apptLoading && apptError === '' && filteredAppointments.length === 0 && (
        <Text style={styles.emptyText}>No appointments for the selected date.</Text>
      )}

      {!apptLoading && apptError === '' && filteredAppointments.length > 0 && (
        <FlatList
          data={filteredAppointments}
          keyExtractor={(item) => item.id}
          renderItem={renderAppointment}
          contentContainerStyle={styles.aptList}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        />
      )}

      {/* Reject confirm modal */}
      <RejectConfirmModal
        visible={rejectModalVisible}
        onCancel={handleCancelReject}
        onConfirm={handleConfirmReject}
      />

      {/* Refer modal */}
      <Modal
        visible={referOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setReferOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, isTablet && styles.modalCardTablet]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Refer to Doctor</Text>
              <TouchableOpacity
                onPress={() => setReferOpen(false)}
                hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
              >
                <Ionicons name="close" size={22} color="#526173" />
              </TouchableOpacity>
            </View>

            <View style={{ padding: 16 }}>
              <AppInput
                value={referSearchQuery}
                onChangeText={setReferSearchQuery}
                placeholder="Search doctor..."
                placeholderTextColor="#98a1aa"
                textColor="#1b2d3c"
                left={<AppInput.Icon icon="magnify" size={20} color="#9b9b9b" />}
                autoCorrect={false}
                noMargin
              />
            </View>

            {referLoading ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <ActivityIndicator color="#0c7c7c" />
              </View>
            ) : (
              <FlatList
                data={filteredReferDoctors}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
                renderItem={({ item }) => (
                  <FavouriteDoctorList
                    doctor={item}
                    isCompact={true}
                    showShare={true}
                    onShare={() => handleReferConfirm(item)}
                    isBookmarked={favouriteDoctorIds.has(item.id)}
                    isBookmarking={bookmarkingIds.has(item.id)}
                    onToggleBookmark={handleToggleBookmark}
                    placeholderImage={require('../../assets/Banner/doctor.png')}
                    primaryColor="#0c7c7c"
                  />
                )}
                ListEmptyComponent={
                  <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                    <MaterialCommunityIcons name="bookmark-outline" size={40} color="#8ca0a9" />
                    <Text style={{ color: '#7f98a3', fontSize: 13, marginTop: 10, textAlign: 'center' }}>
                      No favourite doctors yet
                    </Text>
                  </View>
                }
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Reschedule confirm modal */}
      <Modal
        visible={rescheduleOpen}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!rescheduleSubmitting) setRescheduleOpen(false)
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, isTablet && styles.modalCardTablet]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reschedule Appointment</Text>
              <TouchableOpacity
                onPress={() => setRescheduleOpen(false)}
                disabled={rescheduleSubmitting}
                hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
              >
                <Ionicons name="close" size={22} color="#526173" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollContent}>
              {rescheduleHospitals.length > 0 ? (
                <View style={styles.hospitalPicker}>
                  <Text style={styles.modalLabel}>Choose Hospital</Text>
                  <TouchableOpacity
                    style={styles.hospitalSelectTrigger}
                    activeOpacity={0.85}
                    onPress={() => setHospitalDropdownOpen((prev) => !prev)}
                  >
                    <Text
                      style={[
                        styles.hospitalSelectValue,
                        !rescheduleHospitalId && styles.hospitalSelectPlaceholder,
                      ]}
                      numberOfLines={1}
                    >
                      {rescheduleHospitals.find((h) => h.id === rescheduleHospitalId)?.label || 'Choose Hospital'}
                    </Text>
                    <Ionicons
                      name={hospitalDropdownOpen ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color="#526173"
                    />
                  </TouchableOpacity>

                  {hospitalDropdownOpen ? (
                    <View style={styles.hospitalDropdown}>
                      <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={rescheduleHospitals.length > 4}>
                        {rescheduleHospitals.map((hospital) => {
                          const selected = hospital.id === rescheduleHospitalId
                          return (
                            <TouchableOpacity
                              key={hospital.id}
                              style={[styles.hospitalDropdownItem, selected && styles.hospitalDropdownItemSelected]}
                              onPress={() => {
                                setRescheduleHospitalId(hospital.id)
                                setRescheduleTime('')
                                setRescheduleSlots([])
                                setHospitalDropdownOpen(false)
                              }}
                            >
                              <Text
                                style={[
                                  styles.hospitalDropdownText,
                                  selected && styles.hospitalDropdownTextSelected,
                                ]}
                                numberOfLines={2}
                              >
                                {hospital.label}
                              </Text>
                              {selected ? <Ionicons name="checkmark-circle" size={18} color="#0c7c7c" /> : null}
                            </TouchableOpacity>
                          )
                        })}
                      </ScrollView>
                    </View>
                  ) : null}
                </View>
              ) : null}

              <DateSlotPicker
                selectedDate={rescheduleDate}
                onDateChange={handleRescheduleDateChange}
                selectedTime={rescheduleTime}
                onTimeChange={setRescheduleTime}
                availableSlots={rescheduleSlots}
                loading={rescheduleSlotsLoading}
                timeSlotColumns={rescheduleColumns}
                disablePast
                disableBookedSlots
                dateLabel="Select Date"
                timeLabel="Select Time"
                selectedAppointmentType={appointmentType}
                onAppointmentTypeChange={setAppointmentType}
              />
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalSecondaryButton, rescheduleSubmitting && styles.buttonDisabled]}
                onPress={() => setRescheduleOpen(false)}
                disabled={rescheduleSubmitting}
              >
                <Text style={styles.modalSecondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalPrimaryButton, !canConfirmReschedule && styles.buttonDisabled]}
                onPress={handleRescheduleConfirm}
                disabled={!canConfirmReschedule}
              >
                {rescheduleSubmitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.modalPrimaryButtonText}>Confirm</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

export default DoctorAppointments

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  // Search
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  searchLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },
  // Week selector
  weekHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  weekHeaderTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  weekMonth: {
    fontSize: 13,
    color: '#0c7c7c',
    fontWeight: '600',
  },
  weekDayRow: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 8,
  },
  dayCell: {
    width: 52,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(51,51,51,0.2)',
  },
  dayCellSelected: {
    backgroundColor: '#0c7c7c',
    borderColor: '#0c7c7c',
  },
  dayLabel: {
    fontSize: 11,
    color: '#6b7280',
  },
  dayLabelSelected: {
    color: 'rgba(255,255,255,0.8)',
  },
  dateLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
    marginTop: 2,
  },
  dateLabelSelected: {
    color: '#ffffff',
  },
  dateLabelRed: {
    color: '#e53935',
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 16,
    marginVertical: 12,
  },
  // Skeleton
  skeletonContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  skeletonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  skeletonIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#e5e7eb',
  },
  skeletonContent: {
    flex: 1,
  },
  skeletonLine: {
    height: 13,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
  },
  // Error / empty
  errorText: {
    fontSize: 13,
    color: '#dc2626',
    paddingHorizontal: 16,
    marginTop: 8,
  },
  emptyText: {
    fontSize: 13,
    color: '#9ca3af',
    paddingHorizontal: 16,
    marginTop: 8,
  },
  // Appointment list
  aptList: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: 4,
  },
  // Appointment card
  // Appointment card
  aptCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    gap: 12,
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  aptCardCancelled: {
    opacity: 0.6,
  },
  modeIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  modeIconText: {
    fontSize: 16,
  },
  aptContent: {
    flex: 1,
    gap: 4,
  },
  aptNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  aptName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    flexShrink: 1,
  },
  aptNameMuted: {
    color: '#6b7280',
  },
  aptChip: {
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
    maxWidth: 200,
  },
  aptChipText: {
    fontSize: 9,
    fontWeight: '600',
  },
  aptMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  aptMeta: {
    fontSize: 12,
    color: '#6b7280',
  },
  cancelledBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#e8c7c7',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 4,
  },
  cancelledBannerIcon: {
    fontSize: 12,
    color: '#e53935',
  },
  cancelledBannerText: {
    fontSize: 10,
    color: '#e53935',
    fontWeight: '600',
  },
  aptActionRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  aptActionBtn: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  aptActionBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  // Reject modal
  rejectBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  rejectCard: {
    position: 'absolute',
    alignSelf: 'center',
    top: '40%',
    width: 280,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 24,
  },
  rejectTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  rejectSubtitle: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
    marginBottom: 24,
    textAlign: 'center',
  },
  rejectButtons: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  rejectCancelBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#0c7c7c',
    alignItems: 'center',
  },
  rejectCancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0c7c7c',
  },
  rejectConfirmBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 50,
    backgroundColor: '#e53935',
    alignItems: 'center',
  },
  rejectConfirmText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  // Reschedule Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(18, 28, 33, 0.35)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxHeight: '90%',
    borderRadius: 18,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  modalCardTablet: {
    maxWidth: 720,
    alignSelf: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#edf2f5',
  },
  modalTitle: {
    flex: 1,
    color: '#1D2B36',
    fontSize: 17,
    fontWeight: '700',
    paddingRight: 12,
  },
  modalScrollContent: {
    paddingBottom: 8,
  },
  hospitalPicker: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  modalLabel: {
    color: '#536672',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
  },
  hospitalSelectTrigger: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#d7e2e8',
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  hospitalSelectValue: {
    flex: 1,
    color: '#1D2B36',
    fontSize: 14,
    fontWeight: '600',
  },
  hospitalSelectPlaceholder: {
    color: '#8a9aa6',
  },
  hospitalDropdown: {
    marginTop: 8,
    maxHeight: 190,
    borderWidth: 1,
    borderColor: '#d7e2e8',
    borderRadius: 12,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  hospitalDropdownItem: {
    minHeight: 46,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#eef3f5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  hospitalDropdownItemSelected: {
    backgroundColor: '#eefafa',
  },
  hospitalDropdownText: {
    flex: 1,
    color: '#526173',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
  hospitalDropdownTextSelected: {
    color: '#0c7c7c',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#edf2f5',
  },
  modalSecondaryButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d7e2e8',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
  },
  modalSecondaryButtonText: {
    color: '#1A2A38',
    fontSize: 15,
    fontWeight: '500',
  },
  modalPrimaryButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: '#0c7c7c',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  modalPrimaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
})
