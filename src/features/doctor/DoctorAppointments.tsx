// src/features/doctor/DoctorAppointments.tsx
//
// React Native equivalent of the web DoctorAppointments component.
// All business logic (status helpers, confirm/reject/reschedule flow,
// local state overrides) is preserved exactly.

import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
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
  Image,
} from 'react-native'
import Toast from 'react-native-toast-message'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { ROUTES } from '../../navigation/routes'
import { Appointment } from '../../types/appointment'
import { updateAppointmentsStatus } from '../../services/appointmentService'
import ApiService from '../../services/apiService'
import { API_ENDPOINTS } from '../../constants/apiUrls'
import DateSlotPicker from '../../components/common/inputs/DateSlotPicker'
import { AppInput, AppModal } from '../../components/common'
import { RejectReasonModal } from './components/RejectReasonModal'
import { WeekSelector, type WeekDay } from './components/WeekSelector'
import FavouriteDoctorList, { type FavouriteDoctorListItem } from './search/components/FavouriteDoctorList'
import {
  getDoctorAvailability,
  getDoctorProfile,
  rescheduleAppointment,
  startConsultation,
  getFavouriteDoctors,
  toggleFavouriteDoctor,
  getDoctors,
  type SlotGroup,
  type FavouriteDoctor,
} from './doctorService'
import { createReferral } from '../referrals/referralService'

// ── Action icons ──────────────────────────────────────────────────────────────

import ConfirmIcon from '../../assets/icons/confirm.svg'
import RejectIcon from '../../assets/icons/reject.svg'
import RescheduleIcon from '../../assets/icons/reschedule.svg'
import ReferIcon from '../../assets/icons/refer.svg'
import {
  formatTime12h,
  isVideoMode,
  toApiDate,
  getRescheduleModeKey,
  normalizeAvailabilitySlots,
} from './scheduleUtils'

// ── Helpers ───────────────────────────────────────────────────────────────────
// (formatTime12h/isVideoMode/toApiDate/getRescheduleModeKey/normalizeAvailabilitySlots now live in
// ./scheduleUtils.ts, shared with the new DoctorScheduleScreen -- imported above, not redefined here.)

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
  if (isCancelled) return { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }
  if (isConfirmed) return { bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }
  if (isWaitingPatient) return { bg: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }
  return { bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }
}

// ── Reject confirm modal ──────────────────────────────────────────────────────

export const REJECTION_REASONS = [
  'Doctor is unavailable at the requested time.',
  'The requested appointment slot is no longer available.',
  'The appointment request is not suitable for this specialty.',
  'Required medical information is incomplete.',
] as const

interface RejectModalProps {
  visible: boolean
  onCancel: () => void
  onConfirm: (reason: string) => void
  submitting?: boolean
}

function RejectConfirmModal({ visible, onCancel, onConfirm, submitting = false }: RejectModalProps) {
  const [selectedReason, setSelectedReason] = useState('')

  useEffect(() => {
    if (visible) setSelectedReason('')
  }, [visible])

  const handleConfirmClick = () => {
    if (!selectedReason || submitting) return
    onConfirm(selectedReason)
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={submitting ? undefined : onCancel}>
      <Pressable style={styles.rejectBackdrop} onPress={submitting ? undefined : onCancel} />
      <View style={styles.modalCenteredView}>
        <View style={styles.rejectCard}>
          <Text style={styles.rejectTitle}>Are you sure?</Text>
          <Text style={styles.rejectSubtitle}>You want to reject this appointment</Text>

          <Text style={styles.rejectSectionTitle}>Select a reason for rejection</Text>
          <View style={styles.reasonsList}>
            {REJECTION_REASONS.map((reason) => {
              const isSelected = selectedReason === reason
              return (
                <TouchableOpacity
                  key={reason}
                  style={[styles.reasonRow, isSelected && styles.reasonRowSelected]}
                  onPress={() => setSelectedReason(reason)}
                  disabled={submitting}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name={isSelected ? 'radiobox-marked' : 'radiobox-blank'}
                    size={18}
                    color={isSelected ? '#0c7c7c' : '#9ca3af'}
                    style={styles.radioIcon}
                  />
                  <Text style={[styles.reasonText, isSelected && styles.reasonTextSelected]}>
                    {reason}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>

          <View style={styles.rejectButtons}>
            <TouchableOpacity
              style={styles.rejectCancelBtn}
              onPress={onCancel}
              disabled={submitting}
              activeOpacity={0.8}
            >
              <Text style={styles.rejectCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.rejectConfirmBtn,
                (!selectedReason || submitting) && styles.rejectConfirmBtnDisabled,
              ]}
              onPress={handleConfirmClick}
              disabled={!selectedReason || submitting}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.rejectConfirmText}>Yes, Reject</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}


// ── Reschedule Helpers ────────────────────────────────────────────────────────
// (toApiDate/getRescheduleModeKey/normalizeAvailabilitySlots imported from ./scheduleUtils above.)

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
  const navigation = useNavigation<any>()

  // Local status overrides (set after an action without a full refresh)
  const [localStatuses, setLocalStatuses] = useState<Record<string, string>>({})
  const [localTimes, setLocalTimes] = useState<Record<string, { start_time: string; end_time: string | null }>>({})
  // Tracks who initiated the most recent reschedule for each appointment.
  const [localRescheduledBy, setLocalRescheduledBy] = useState<Record<string, string>>({})

  // Reject confirmation modal state
  const [rejectModalVisible, setRejectModalVisible] = useState(false)
  const [pendingRejectId, setPendingRejectId] = useState<string | null>(null)
  const [rejectSubmitting, setRejectSubmitting] = useState(false)


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
  const [referSearchResults, setReferSearchResults] = useState<FavouriteDoctorListItem[]>([])
  const [referSearchLoading, setReferSearchLoading] = useState(false)
  const [bookmarkingIds, setBookmarkingIds] = useState<Set<string>>(new Set())
  const [referNotesOpen, setReferNotesOpen] = useState(false)
  const [referSelectedDoctor, setReferSelectedDoctor] = useState<FavouriteDoctorListItem | null>(null)
  const [referNotes, setReferNotes] = useState('')
  const [referSubmitting, setReferSubmitting] = useState(false)
  const [referDetail, setReferDetail] = useState<{
    doctorName: string
    avatar?: string | null
    notes?: string
  } | null>(null)

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

  const isReferSearching = referSearchQuery.trim().length > 0

  useEffect(() => {
    if (!referOpen) return

    const trimmed = referSearchQuery.trim()
    if (!trimmed) {
      setReferSearchResults([])
      setReferSearchLoading(false)
      return
    }

    let mounted = true
    const timer = setTimeout(async () => {
      setReferSearchLoading(true)
      try {
        const res = await getDoctors({ search: trimmed, limit: 20 })
        if (mounted && res.success) {
          const mapped = (res.data ?? []).map((doctor) => ({
            id: doctor.id,
            name: doctor.name,
            avatar_s3_key: doctor.avatar_s3_key ?? null,
            location: doctor.location ?? '',
            experience_years: doctor.experience_years ?? null,
            specialities: doctor.specialities ?? [],
            is_verified: doctor.is_verified,
          }))
          setReferSearchResults(mapped)
        } else if (mounted) {
          setReferSearchResults([])
        }
      } catch (error) {
        console.log('[DoctorAppointments] refer search error:', error)
        if (mounted) setReferSearchResults([])
      } finally {
        if (mounted) setReferSearchLoading(false)
      }
    }, 400)

    return () => {
      mounted = false
      clearTimeout(timer)
    }
  }, [referOpen, referSearchQuery])

  const filteredReferDoctors = isReferSearching ? referSearchResults : favouriteDoctors
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
    setReferSearchResults([])
    setReferOpen(true)
  }

  const handleReferSelectDoctor = (doctor: FavouriteDoctorListItem) => {
    if (!referApptId) return
    setReferSelectedDoctor(doctor)
    setReferNotes('')
    setReferNotesOpen(true)
  }

  const handleReferSubmit = async () => {
    if (!referApptId || !referSelectedDoctor) return
    setReferSubmitting(true)
    try {
      await createReferral({
        appointment_id: referApptId,
        referred_doctor_id: referSelectedDoctor.id,
        notes: referNotes.trim() || undefined,
      })
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: `Patient successfully referred to ${referSelectedDoctor.name}`,
      })
      setReferNotesOpen(false)
      setReferOpen(false)
      setReferSelectedDoctor(null)
      setReferNotes('')
      setReferApptId(null)
    } catch (error) {
      console.log('[DoctorAppointments] refer error:', error)
      Alert.alert('Error', 'Failed to refer appointment. Please try again.')
    } finally {
      setReferSubmitting(false)
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
        Toast.show({ type: 'success', text1: res.message })
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
    if (rejectSubmitting) return
    setRejectModalVisible(false)
    setPendingRejectId(null)
  }

  const handleConfirmReject = async (reason: string) => {
    if (!pendingRejectId) return
    const rowId = pendingRejectId
    setRejectSubmitting(true)
    try {
      const res = await updateAppointmentsStatus(rowId, 'a7d4e1c2-9f6b-4c83-b2e1-6f3a9d8c7b12', reason)
      if (res.success) {
        // Rejection uses a visually distinct toast (red left border) while
        // still reusing the shared BaseToast styling from the design system.
        Toast.show({ type: 'rejectSuccess', text1: res.message })
        setLocalStatuses((prev) => ({ ...prev, [rowId]: 'cancelled' }))
      }
    } catch {
      Toast.show({ type: 'error', text1: 'Something went wrong. Please try again.' })
    } finally {
      setRejectSubmitting(false)
      setRejectModalVisible(false)
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
        navigation.navigate(ROUTES.STACK.CONSULTATION, {
          appointmentId: appointmentId,
          patientId: patientId,
        })
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
      { label: 'Confirm', action: 'confirm', bg: '#e8f5e9', Icon: ConfirmIcon },
      { label: 'Reject', action: 'reject', bg: '#ffeeee', Icon: RejectIcon },
      { label: 'Reschedule', action: 'reschedule', bg: '#fff8e8', Icon: RescheduleIcon },
      { label: 'Refer', action: 'refer', bg: '#e8f4f8', Icon: ReferIcon },
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
          {video ? (
            <MaterialCommunityIcons name="video" size={18} color={isCancelled ? '#b0b0b0' : '#0c7c7c'} />
          ) : (
            <MaterialCommunityIcons name="home" size={18} color={isCancelled ? '#b0b0b0' : '#0c7c7c'} />
          )}
        </View>

        {/* Content */}
        <View style={styles.aptContent}>
          {/* Name + Status */}
          <View style={styles.aptNameRow}>
            <Text style={[styles.aptName, isCancelled && styles.aptNameMuted]} numberOfLines={1}>
              {apt.patient?.name ?? 'Unknown Patient'}
            </Text>
            {apt.referral && (
              <TouchableOpacity
                style={styles.referralBadge}
                onPress={() => {
                  const ref = apt.referral!
                  const avatar = ref.referring_doctor.avatar_s3_key || 
                                 ref.referring_doctor.avatar_url || 
                                 ref.referring_doctor.avatar || 
                                 ref.referring_doctor.profile_picture || 
                                 ref.referring_doctor.photo_url || 
                                 ref.referring_doctor.image_url;
                  setReferDetail({
                    doctorName: ref.referring_doctor.name,
                    avatar: avatar ?? undefined,
                    notes: ref.notes ?? undefined,
                  })
                }}
                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
              >
                <MaterialCommunityIcons name="call-made" size={10} color="#0c7c7c" />
                <Text style={styles.referralBadgeText}>referred</Text>
              </TouchableOpacity>
            )}
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
              {visibleActions.map((btn) => {
                const ActionIcon = btn.Icon
                return (
                  <TouchableOpacity
                    key={btn.action}
                    style={styles.aptActionItem}
                    onPress={() => {
                      // Prevent triggering the card's onPress
                      if (btn.action === 'confirm') handleConfirmAppointment(apt.id)
                      else if (btn.action === 'reject') handleRejectClick(apt.id)
                      else if (btn.action === 'reschedule') handleRescheduleClick(apt)
                      else if (btn.action === 'refer') handleReferClick(apt.id)
                    }}
                    activeOpacity={0.8}
                    hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                    accessibilityRole="button"
                    accessibilityLabel={btn.label}
                  >
                    <View style={[styles.aptActionIconBox, { backgroundColor: btn.bg }]}>
                      <ActionIcon width={18} height={18} />
                    </View>
                    <Text style={styles.aptActionLabel} numberOfLines={1}>
                      {btn.label}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          )}
        </View>
      </TouchableOpacity>
    )
  }

  // ── Root render ───────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      {/* Search — reuses the same AppInput-based search field as the All Appointments tab */}
      <View style={styles.searchRow}>
        <View style={styles.searchInputWrap}>
          <AppInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search Patient ID, Name..."
            placeholderTextColor="#98a1aa"
            containerStyle={styles.searchInputContainer}
            style={styles.searchInput}
            contentStyle={styles.searchInputContent}
            outlineStyle={styles.searchInputOutline}
            outlineColor="#2e7b7d"
            activeOutlineColor="#2e7b7d"
            textColor="#1b2d3c"
            left={<AppInput.Icon icon="magnify" size={22} color="#9b9b9b" />}
            right={
              searchQuery.length > 0 ? (
                <AppInput.Icon
                  icon="close-circle"
                  size={20}
                  color="#9b9b9b"
                  onPress={() => setSearchQuery('')}
                />
              ) : undefined
            }
            autoCorrect={false}
            returnKeyType="search"
            noMargin
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
        submitting={rejectSubmitting}
      />


      {/* Refer modal */}
      <AppModal
        visible={referOpen}
        onDismiss={() => setReferOpen(false)}
        title="Refer to Doctor"
      >
        <View style={{ maxHeight: 450 }}>
          <View style={{ paddingBottom: 16 }}>
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

          {(referLoading || (isReferSearching && referSearchLoading)) ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <ActivityIndicator color="#0c7c7c" />
            </View>
          ) : (
            <FlatList
              data={filteredReferDoctors}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingBottom: 24 }}
              renderItem={({ item }) => (
                <FavouriteDoctorList
                  doctor={item}
                  isCompact={true}
                  showShare={true}
                  onShare={() => handleReferSelectDoctor(item)}
                  isBookmarked={favouriteDoctorIds.has(item.id)}
                  isBookmarking={bookmarkingIds.has(item.id)}
                  onToggleBookmark={handleToggleBookmark}
                  placeholderImage={require('../../assets/Banner/doctor.png')}
                  primaryColor="#0c7c7c"
                  onPress={(doc) => {
                    setReferOpen(false)
                    navigation.navigate(ROUTES.STACK.DOCTOR_DETAIL, { id: doc.id })
                  }}
                />
              )}
              ListEmptyComponent={
                <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                  <MaterialCommunityIcons
                    name={isReferSearching ? 'account-search-outline' : 'bookmark-outline'}
                    size={40}
                    color="#8ca0a9"
                  />
                  <Text style={{ color: '#7f98a3', fontSize: 13, marginTop: 10, textAlign: 'center' }}>
                    {isReferSearching ? 
                      'No doctors found'
                      : 'No favourite doctors yet'}
                  </Text>
                </View>
              }
            />
          )}
        </View>
      </AppModal>

      {/* Referral notes modal — step 2, mirrors web ReferralNotesDialog */}
      <AppModal
        visible={referNotesOpen}
        onDismiss={() => {
          if (referSubmitting) return
          setReferNotesOpen(false)
        }}
        title="Refer Patient"
        dismissable={!referSubmitting}
      >
        <View>
          {referSelectedDoctor && (
            <View style={styles.referSelectedDoctorCard}>
              <View style={styles.referSelectedDoctorAvatar}>
                <Text style={styles.referSelectedDoctorInitial}>
                  {referSelectedDoctor.name.charAt(0)}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.referSelectedDoctorName} numberOfLines={1}>
                  {referSelectedDoctor.name}
                </Text>
                <Text style={styles.referSelectedDoctorSpecialty} numberOfLines={1}>
                  {referSelectedDoctor.specialities?.[0] ?? 'General Physician'}
                </Text>
              </View>
            </View>
          )}

          <Text style={styles.referNotesLabel}>Referral Notes (optional)</Text>
          <AppInput
            value={referNotes}
            onChangeText={(text: string) => setReferNotes(text.slice(0, 500))}
            placeholder="Add any clinical notes, reason for referral..."
            placeholderTextColor="#98a1aa"
            textColor="#1b2d3c"
            multiline
            numberOfLines={4}
            noMargin
          />
          <Text style={styles.referNotesCount}>{referNotes.length}/500</Text>

          <View style={styles.referNotesActions}>
            <TouchableOpacity
              style={[styles.referNotesButton, styles.referNotesButtonOutline]}
              disabled={referSubmitting}
              onPress={() => setReferNotesOpen(false)}
            >
              <Text style={styles.referNotesButtonOutlineText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.referNotesButton, styles.referNotesButtonFilled]}
              disabled={referSubmitting}
              onPress={handleReferSubmit}
            >
              {referSubmitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.referNotesButtonFilledText}>Refer</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </AppModal>

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

      {/* Referral detail modal */}
      <AppModal
        visible={referDetail !== null}
        onDismiss={() => setReferDetail(null)}
        title="Referral Details"
      >
        {referDetail && (
          <View style={{ paddingVertical: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 }}>
              <Image
                source={referDetail.avatar ? { uri: referDetail.avatar } : require('../../assets/Banner/doctor.png')}
                style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: '#f3f4f6' }}
                resizeMode="cover"
              />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#172838' }}>
                  {referDetail.doctorName}
                </Text>
                <Text style={{ fontSize: 12, color: '#0c7c7c', fontWeight: '600', marginTop: 2 }}>
                  Referring Doctor
                </Text>
              </View>
            </View>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#526b7a', marginBottom: 6 }}>
              Referral Notes
            </Text>
            {referDetail.notes ? (
              <View style={{ backgroundColor: '#f3f4f6', borderRadius: 8, padding: 12 }}>
                <Text style={{ fontSize: 13, color: '#374151', lineHeight: 18 }}>
                  {referDetail.notes}
                </Text>
              </View>
            ) : (
              <Text style={{ fontSize: 13, color: '#9ca3af', fontStyle: 'italic' }}>
                No referral notes provided.
              </Text>
            )}
          </View>
        )}
      </AppModal>
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
  // Search — matches the AppointmentList (All Appointments) search field
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  searchInputWrap: {
    flex: 1,
  },
  searchInputContainer: {
    width: '100%',
  },
  searchInput: {
    backgroundColor: '#ffffff',
  },
  searchInputContent: {
    height: 48,
    minHeight: 48,
    paddingVertical: 0,
    fontSize: 14,
  },
  searchInputOutline: {
    borderRadius: 12,
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
    gap: 16,
    marginTop: 10,
    flexWrap: 'wrap',
  },
  aptActionItem: {
    alignItems: 'center',
    minWidth: 48,
  },
  aptActionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aptActionLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#3949ab',
    marginTop: 4,
    textAlign: 'center',
  },
  modalCenteredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  rejectCard: {
    width: 320,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
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
    textAlign: 'center',
  },
  rejectSubtitle: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
    marginBottom: 16,
    textAlign: 'center',
  },
  rejectSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  reasonsList: {
    gap: 8,
    marginBottom: 20,
    width: '100%',
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 8,
    borderRadius: 10,
    backgroundColor: 'transparent',
  },
  reasonRowSelected: {
    backgroundColor: 'rgba(12, 124, 124, 0.06)',
  },
  radioIcon: {
    marginRight: 8,
    marginTop: 1,
  },
  reasonText: {
    flex: 1,
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
  },
  reasonTextSelected: {
    color: '#0c7c7c',
    fontWeight: '500',
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
    justifyContent: 'center',
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
    justifyContent: 'center',
  },
  rejectConfirmBtnDisabled: {
    opacity: 0.5,
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
  referSelectedDoctorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f0f9f9',
    borderWidth: 1,
    borderColor: 'rgba(12,124,124,0.2)',
    marginBottom: 16,
  },
  referSelectedDoctorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0c7c7c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  referSelectedDoctorInitial: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  referSelectedDoctorName: {
    color: '#1D2B36',
    fontSize: 14,
    fontWeight: '700',
  },
  referSelectedDoctorSpecialty: {
    color: '#6b7c86',
    fontSize: 12,
    marginTop: 2,
  },
  referNotesLabel: {
    color: '#1D2B36',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  referNotesCount: {
    color: '#98a1aa',
    fontSize: 11,
    textAlign: 'right',
    marginTop: 4,
  },
  referNotesActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  referNotesButton: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  referNotesButtonOutline: {
    borderWidth: 1.5,
    borderColor: '#0c7c7c',
  },
  referNotesButtonOutlineText: {
    color: '#0c7c7c',
    fontSize: 14,
    fontWeight: '600',
  },
  referNotesButtonFilled: {
    backgroundColor: '#0c7c7c',
  },
  referNotesButtonFilledText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  referralBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#e8f4f8',
  },
  referralBadgeText: {
    color: '#0c7c7c',
    fontSize: 9,
    fontWeight: '600',
  },
})
