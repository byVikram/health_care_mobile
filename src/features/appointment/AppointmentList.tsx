// src/features/appointment/AppointmentList.tsx
//
// React Native equivalent of the web AppointmentList.tsx.
// All business logic (fetching, sorting, status labels, action handling,
// reschedule flow) is preserved exactly. UI uses React Native primitives.

import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Image,
  ScrollView,
  Platform,
  useWindowDimensions,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import Toast from 'react-native-toast-message'
import ApiService from '../../services/apiService'
import { API_ENDPOINTS } from '../../constants/apiUrls'
import { Appointment } from '../../types/appointment'
import { updateAppointmentsStatus } from '../../services/appointmentService'
import DateSlotPicker from '../../components/common/DateSlotPicker'
import {
  getDoctorAvailability,
  getDoctorById,
  rescheduleAppointment,
  type SlotGroup,
  type TimeSlot,
} from '../doctor/doctorService'
import AppointmentHistoryTab from './components/AppointmentHistoryTab'

// ── Constants ─────────────────────────────────────────────────────────────────

const FALLBACK_CONFIRMED_STATUS_ID = '3f9a2c8e-7b61-4d2a-9a3f-5c8e1b2d4f90'
const FALLBACK_REJECTED_STATUS_ID = 'a7d4e1c2-9f6b-4c83-b2e1-6f3a9d8c7b12'
const TERMINAL_STATUSES = new Set(['cancelled'])

// ── Types ─────────────────────────────────────────────────────────────────────

interface AppointmentRow {
  id: string
  patientName: string
  patientAvatar: string
  patientId: string
  appointmentDate: string
  startTime: string
  endTime: string | null
  appointmentMode: string
  status: string
  rescheduledBy: string | null
  doctorName: string
  doctorAvatar: string
  doctorId: string
  hospitalName: string | null
  hospitalAddress: string | null
  hospitalId: string | null
  fees: number | null
}

type RescheduleAppointmentMode = 'clinic' | 'video'

type RescheduleHospital = {
  id: string
  label: string
  address?: string
}

type AvailabilityApiSlot = {
  start_time?: string
  end_time?: string
  status?: TimeSlot['status'] | string
  is_enabled?: boolean
  is_booked?: boolean
  can_toggle?: boolean
}

type AvailabilityApiSession = {
  label?: string
  range?: string
  period?: string
  slots?: AvailabilityApiSlot[]
}

type AvailabilityApiModeGroup = {
  appointment_mode?: string
  sessions?: AvailabilityApiSession[]
  label?: string
  range?: string
  period?: string
  slots?: AvailabilityApiSlot[]
}

interface AppointmentMeta {
  total: number
  page: number
  limit: number
  pages: number
}

interface AppointmentsResponse {
  success: boolean
  message: string
  data: {
    id: string
    appointment_mode: string
    appointment_date: string
    start_time: string
    end_time: string | null
    status: string
    rescheduled_by?: string | null
    doctor: { id: string; name: string; avatar_s3_key?: string | null }
    patient: { id: string; name: string; avatar_s3_key: string | null; gender: string | null; age: number | null }
    hospital: { id: string; name: string; address: string } | null
    fees?: number | null
  }[]
  meta: { total: number; page: number; limit: number; pages: number }
}

// ── Filter options ────────────────────────────────────────────────────────────

const hospitalOptions = [
  { value: 'all', label: 'All Hospitals' },
  { value: 'manipal', label: 'Manipal Hospital' },
  { value: 'apollo', label: 'Apollo Hospital' },
]

const modeOptions = [
  { value: 'all', label: 'All Modes' },
  { value: 'clinic', label: 'Clinic Visit' },
  { value: 'video', label: 'Video Call' },
]

const dateOptions = [
  { value: 'all', label: 'All Dates' },
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last7', label: 'Last 7 days' },
  { value: 'last30', label: 'Last 30 days' },
]

const statusOptions = [
  { value: 'all', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'reschedule', label: 'Reschedule' },
  { value: 'cancelled', label: 'Cancelled' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(t: string | null): string {
  if (!t) return ''
  const [h, m] = t.split(':')
  return parseInt(h, 10) + ':' + m
}

function isAppointmentPast(row: AppointmentRow): boolean {
  if (!row.appointmentDate) return false
  const rawTime = row.startTime || '00:00:00'
  const timePart = rawTime.length === 5 ? `${rawTime}:00` : rawTime
  const appointmentDateTime = new Date(`${row.appointmentDate}T${timePart}`)
  if (Number.isNaN(appointmentDateTime.getTime())) return false
  return appointmentDateTime.getTime() < Date.now()
}

function formatFallbackStatus(label: string): string {
  return label
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function getStatusColor(status: string): { bg: string; text: string } {
  const s = status.toLowerCase()
  if (s === 'confirmed') return { bg: '#e8f5e9', text: '#2e7d32' }
  if (s === 'cancelled') return { bg: '#ffebee', text: '#c62828' }
  if (s === 'completed') return { bg: '#e3f2fd', text: '#1565c0' }
  if (s === 'rescheduled') return { bg: '#fff8e1', text: '#e65100' }
  if (s.includes('waiting')) return { bg: '#fff3e0', text: '#e65100' }
  return { bg: '#f3e5f5', text: '#6a1b9a' }
}

function toApiDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getRescheduleModeKey(appointmentType: RescheduleAppointmentMode): string {
  return appointmentType === 'video' ? 'video_call' : 'clinic_visit'
}

function getSlotStatus(slot: AvailabilityApiSlot): TimeSlot['status'] {
  const status = typeof slot.status === 'string' ? slot.status.toUpperCase() : ''

  if (slot.is_booked || status === 'OCCUPIED') return 'OCCUPIED'
  if (slot.is_enabled === false || status === 'UNAVAILABLE') return 'UNAVAILABLE'
  if (status === 'BLOCKED') return 'BLOCKED'
  if (status === 'BOOKED') return 'BOOKED'
  return 'AVAILABLE'
}

function normalizeAvailabilitySlots(
  response: SlotGroup[] | { data?: AvailabilityApiModeGroup[] } | null | undefined,
  appointmentType: RescheduleAppointmentMode
): SlotGroup[] {
  const rawData = (
    Array.isArray(response) ? response : Array.isArray(response?.data) ? response.data : []
  ) as AvailabilityApiModeGroup[]
  const modeKey = getRescheduleModeKey(appointmentType)

  return rawData
    .filter((item) => !item.appointment_mode || item.appointment_mode.toLowerCase() === modeKey)
    .flatMap((item, itemIndex) => {
      const sessions =
        Array.isArray(item.sessions) && item.sessions.length > 0
          ? item.sessions
          : [{ label: item.label, range: item.range, period: item.period, slots: item.slots }]

      return sessions
        .map((session, sessionIndex): SlotGroup => {
          const label = session.label || `Session ${sessionIndex + 1}`

          return {
            label,
            range: session.range,
            period: session.period || session.range,
            slots: (session.slots ?? [])
              .filter((slot) => Boolean(slot.start_time && slot.end_time))
              .map((slot, slotIndex): TimeSlot => ({
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
        .filter((session) => session.slots.length > 0)
    })
}

// ── Skeleton row ──────────────────────────────────────────────────────────────

function SkeletonRow() {
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
    <Animated.View style={[styles.skeletonRow, { opacity }]}>
      <View style={styles.skeletonAvatar} />
      <View style={styles.skeletonContent}>
        <View style={[styles.skeletonLine, { width: '60%' }]} />
        <View style={[styles.skeletonLine, { width: '40%', marginTop: 6 }]} />
      </View>
    </Animated.View>
  )
}

// ── Dropdown picker (mobile-native) ───────────────────────────────────────────

interface DropdownProps {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
}

function FilterDropdown({ label, value, options, onChange }: DropdownProps) {
  const [open, setOpen] = useState(false)
  const selected = options.find((o) => o.value === value)

  return (
    <View style={styles.dropdownWrapper}>
      <TouchableOpacity style={styles.dropdownTrigger} onPress={() => setOpen(true)} activeOpacity={0.7}>
        <Text style={styles.dropdownLabel}>{label}</Text>
        <Text style={styles.dropdownValue} numberOfLines={1}>
          {selected?.value !== 'all' ? selected?.label : ''}
        </Text>
        <Text style={styles.dropdownChevron}>▾</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.dropdownBackdrop} onPress={() => setOpen(false)} />
        <View style={styles.dropdownMenu}>
          <Text style={styles.dropdownMenuTitle}>{label}</Text>
          {options.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.dropdownMenuItem, opt.value === value && styles.dropdownMenuItemSelected]}
              onPress={() => { onChange(opt.value); setOpen(false) }}
            >
              <Text style={[styles.dropdownMenuItemText, opt.value === value && styles.dropdownMenuItemTextSelected]}>
                {opt.label}
              </Text>
              {opt.value === value && <Text style={styles.dropdownMenuItemCheck}>✓</Text>}
            </TouchableOpacity>
          ))}
        </View>
      </Modal>
    </View>
  )
}

// ── Reject confirmation modal ─────────────────────────────────────────────────

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

// ── Appointment card ──────────────────────────────────────────────────────────

interface AppointmentCardProps {
  row: AppointmentRow
  viewAs: 'doctor' | 'patient'
  statusLabel: string
  onViewDetails: () => void
  onConfirm: () => void
  onReject: () => void
  onReschedule: () => void
}

function AppointmentCard({
  row,
  viewAs,
  statusLabel,
  onViewDetails,
  onConfirm,
  onReject,
  onReschedule,
}: AppointmentCardProps) {
  const status = (row.status || '').toLowerCase()
  const rescheduledBy = (row.rescheduledBy || '').toLowerCase()
  const past = isAppointmentPast(row)
  const terminal = TERMINAL_STATUSES.has(status)
  const showActions = viewAs === 'patient' && !past && !terminal
  const showConfirm = showActions && status === 'rescheduled' && rescheduledBy === 'doctor'
  const { bg, text: textColor } = getStatusColor(statusLabel)
  const nameToShow = viewAs === 'doctor' ? row.patientName : row.doctorName
  const avatarToShow = viewAs === 'doctor' ? row.patientAvatar : row.doctorAvatar

  return (
    <View style={styles.card}>
      {/* Status accent bar */}
      {!terminal && <View style={[styles.cardAccent, { backgroundColor: textColor }]} />}

      <View style={styles.cardBody}>
        {/* Avatar + name row */}
        <View style={styles.cardTopRow}>
          {avatarToShow ? (
            <Image source={{ uri: avatarToShow }} style={styles.cardAvatar} />
          ) : (
            <View style={[styles.cardAvatar, styles.cardAvatarPlaceholder]}>
              <Text style={styles.cardAvatarInitial}>{nameToShow.charAt(0)}</Text>
            </View>
          )}
          <View style={styles.cardNameBlock}>
            <Text style={styles.cardName} numberOfLines={1}>{nameToShow}</Text>
            <View style={[styles.statusPill, { backgroundColor: bg }]}>
              <Text style={[styles.statusPillText, { color: textColor }]} numberOfLines={1}>
                {statusLabel}
              </Text>
            </View>
          </View>
          {/* Info button */}
          <TouchableOpacity style={styles.infoBtn} onPress={onViewDetails} hitSlop={8}>
            <Text style={styles.infoBtnText}>ℹ</Text>
          </TouchableOpacity>
        </View>

        {/* Date / time / mode row */}
        <View style={styles.cardMeta}>
          <Text style={styles.cardMetaText}>📅 {row.appointmentDate}</Text>
          <Text style={styles.cardMetaText}>  🕐 {formatTime(row.startTime)}{row.endTime ? ' – ' + formatTime(row.endTime) : ''}</Text>
        </View>
        <View style={styles.cardMeta}>
          <Text style={styles.cardMetaText} numberOfLines={1}>
            🏥 {row.appointmentMode?.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
          </Text>
          {row.fees != null && (
            <Text style={styles.cardFee}>  ₹{row.fees}</Text>
          )}
        </View>

        {/* Hospital */}
        {row.hospitalName && (
          <Text style={styles.cardHospital} numberOfLines={1}>
            📍 {row.hospitalName}
          </Text>
        )}

        {/* Action buttons (patient only, non-past, non-terminal) */}
        {showActions && (
          <View style={styles.actionRow}>
            {showConfirm && (
              <TouchableOpacity style={[styles.actionBtn, styles.actionBtnConfirm]} onPress={onConfirm} activeOpacity={0.8}>
                <Text style={styles.actionBtnText}>✓ Confirm</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnReject]} onPress={onReject} activeOpacity={0.8}>
              <Text style={[styles.actionBtnText, { color: '#e53935' }]}>✕ Reject</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnReschedule]} onPress={onReschedule} activeOpacity={0.8}>
              <Text style={[styles.actionBtnText, { color: '#f59e0b' }]}>↻ Reschedule</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface AppointmentListProps {
  viewAs?: 'doctor' | 'patient'
}

export default function AppointmentList({ viewAs: viewAsProp }: AppointmentListProps) {
  const { width, height } = useWindowDimensions()
  const isTablet = width >= 768
  const isLandscape = width > height
  const [viewAs, setViewAs] = useState<'doctor' | 'patient'>('patient')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const size = 10
  const [rows, setRows] = useState<AppointmentRow[]>([])
  const [meta, setMeta] = useState<AppointmentMeta>({ total: 0, page: 1, limit: 10, pages: 0 })
  const [loading, setLoading] = useState(true)

  const [filterHospital, setFilterHospital] = useState('all')
  const [filterMode, setFilterMode] = useState('all')
  const [filterDate, setFilterDate] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')

  // Reject popover state
  const [rejectModalVisible, setRejectModalVisible] = useState(false)
  const [pendingRejectId, setPendingRejectId] = useState<string | null>(null)

  // Details drawer state
  const [detailsDrawerOpen, setDetailsDrawerOpen] = useState(false)
  const [detailsAppointmentId, setDetailsAppointmentId] = useState<string | null>(null)

  const [rescheduleOpen, setRescheduleOpen] = useState(false)
  const [rescheduleRow, setRescheduleRow] = useState<AppointmentRow | null>(null)
  const [rescheduleDate, setRescheduleDate] = useState(new Date())
  const [rescheduleTime, setRescheduleTime] = useState('')
  const [rescheduleSlots, setRescheduleSlots] = useState<SlotGroup[]>([])
  const [rescheduleSlotsLoading, setRescheduleSlotsLoading] = useState(false)
  const [rescheduleSubmitting, setRescheduleSubmitting] = useState(false)
  const [rescheduleHospitals, setRescheduleHospitals] = useState<RescheduleHospital[]>([])
  const [rescheduleHospitalId, setRescheduleHospitalId] = useState('')
  const [hospitalDropdownOpen, setHospitalDropdownOpen] = useState(false)
  const [appointmentType, setAppointmentType] = useState<RescheduleAppointmentMode>('clinic')

  const confirmedStatusId = FALLBACK_CONFIRMED_STATUS_ID
  const rejectedStatusId = FALLBACK_REJECTED_STATUS_ID

  // Resolve role from AsyncStorage on mount
  useEffect(() => {
    if (viewAsProp) {
      setViewAs(viewAsProp)
      return
    }
    AsyncStorage.getItem('role').then((role) => {
      if (role === 'patient') setViewAs('patient')
      else setViewAs('doctor')
    })
  }, [viewAsProp])

  // ── Fetch appointments ────────────────────────────────────────────────────

  useEffect(() => {
    if (!rescheduleOpen || !rescheduleRow?.doctorId) return

    let mounted = true

    const fetchDoctorHospitals = async () => {
      try {
        const res = await getDoctorById(rescheduleRow.doctorId)
        if (mounted && res.success && res.data) {
          const hospitals = (res.data.hospitals ?? []).map((hospital) => ({
            id: hospital.hospital.id,
            label: hospital.hospital.name,
            address: hospital.hospital.address,
          }))

          setRescheduleHospitals(hospitals)
          setRescheduleHospitalId((current) => current || rescheduleRow.hospitalId || hospitals[0]?.id || '')
        }
      } catch (error) {
        console.log('[AppointmentList] fetch doctor hospitals error:', error)
      }
    }

    fetchDoctorHospitals()

    return () => {
      mounted = false
    }
  }, [rescheduleOpen, rescheduleRow])

  useEffect(() => {
    if (!rescheduleOpen || !rescheduleRow) return

    const hospitalId = rescheduleHospitalId || rescheduleRow.hospitalId

    if (!rescheduleRow.doctorId || !hospitalId) {
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
        const responseData = await getDoctorAvailability({
          doctor_id: rescheduleRow.doctorId,
          hospital_id: hospitalId,
          date: toApiDate(rescheduleDate),
        })
        if (mounted) setRescheduleSlots(normalizeAvailabilitySlots(responseData, appointmentType))
      } catch (error) {
        console.log('[AppointmentList] fetch reschedule slots error:', error)
        if (mounted) Alert.alert('Error', 'Could not load available slots.')
      } finally {
        if (mounted) setRescheduleSlotsLoading(false)
      }
    }

    fetchSlots()

    return () => {
      mounted = false
    }
  }, [appointmentType, rescheduleDate, rescheduleHospitalId, rescheduleOpen, rescheduleRow])

  const fetchAppointments = useCallback(async () => {
    setLoading(true)
    try {
      const patientId = await AsyncStorage.getItem('patient_id')
      const params: Record<string, unknown> = {
        page,
        limit: size,
        patient_id: patientId,
      }
      if (search) params.search = search

      const res = await ApiService.getWithParams<AppointmentsResponse>(
        API_ENDPOINTS.APPOINTMENTS.GET,
        params
      )

      const mapped: AppointmentRow[] = res.data.data.map((appt) => ({
        id: appt.id,
        patientName: appt.patient.name,
        patientAvatar: appt.patient.avatar_s3_key ?? '',
        patientId: appt.patient.id,
        appointmentDate: appt.appointment_date,
        startTime: appt.start_time,
        endTime: appt.end_time,
        appointmentMode: appt.appointment_mode,
        status: appt.status,
        rescheduledBy: appt.rescheduled_by ?? null,
        doctorName: appt.doctor.name,
        doctorAvatar: appt.doctor.avatar_s3_key ?? '',
        doctorId: appt.doctor.id,
        hospitalName: appt.hospital?.name ?? null,
        hospitalAddress: appt.hospital?.address ?? null,
        hospitalId: appt.hospital?.id ?? null,
        fees: appt.fees ?? null,
      }))

      // Sort by appointment date descending, then start time descending
      const sorted = [...mapped].sort((a, b) => {
        const dateDiff = b.appointmentDate.localeCompare(a.appointmentDate)
        if (dateDiff !== 0) return dateDiff
        return (b.startTime ?? '').localeCompare(a.startTime ?? '')
      })

      setRows(sorted)
      setMeta({
        total: res.data.meta.total,
        page: res.data.meta.page,
        limit: res.data.meta.limit,
        pages: res.data.meta.pages,
      })
    } finally {
      setLoading(false)
    }
  }, [page, search, size])

  useEffect(() => {
    fetchAppointments()
  }, [fetchAppointments])

  // ── Status label (role-aware) ─────────────────────────────────────────────

  function getStatusDisplayLabel(row: AppointmentRow): string {
    const status = (row.status || '').toLowerCase()
    const rescheduledBy = (row.rescheduledBy || '').toLowerCase()

    if (status === 'pending') {
      return viewAs === 'doctor' ? 'Pending' : 'Waiting for Doctor Confirmation'
    }
    if (status === 'rescheduled') {
      if (!rescheduledBy) return 'Rescheduled'
      if (rescheduledBy === 'doctor') {
        return viewAs === 'doctor' ? 'Waiting for Patient Confirmation' : 'Waiting for Your Confirmation'
      } else if (rescheduledBy === 'patient') {
        return viewAs === 'patient' ? 'Waiting for Doctor Confirmation' : 'Waiting for Your Confirmation'
      }
      return rescheduledBy === viewAs ? 'Rescheduled' : 'Waiting for Your Confirmation'
    }
    return formatFallbackStatus(row.status || '')
  }

  // ── Action handlers ───────────────────────────────────────────────────────

  const handleConfirm = async (row: AppointmentRow) => {
    try {
      const res = await updateAppointmentsStatus(row.id, confirmedStatusId)
      if (res.success) {
        Toast.show({ type: 'success', text1: res.message || 'Appointment confirmed.' })
        setRows((prev) =>
          prev.map((r) => (r.id === row.id ? { ...r, status: 'confirmed', rescheduledBy: null } : r))
        )
      }
    } catch {
      Toast.show({ type: 'error', text1: 'Something went wrong. Please try again.' })
    }
  }

  const handleRejectClick = (rowId: string) => {
    setPendingRejectId(rowId)
    setRejectModalVisible(true)
  }

  const handleCancelReject = () => {
    setRejectModalVisible(false)
    setPendingRejectId(null)
  }

  const handleConfirmReject = async () => {
    if (!pendingRejectId) return
    const rowId = pendingRejectId
    setRejectModalVisible(false)
    try {
      const res = await updateAppointmentsStatus(rowId, rejectedStatusId)
      if (res.success) {
        Toast.show({ type: 'success', text1: res.message || 'Appointment rejected.' })
        setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, status: 'cancelled' } : r)))
      }
    } catch {
      Toast.show({ type: 'error', text1: 'Something went wrong. Please try again.' })
    } finally {
      setPendingRejectId(null)
    }
  }

  const closeReschedule = () => {
    if (rescheduleSubmitting) return
    setRescheduleOpen(false)
    setHospitalDropdownOpen(false)
  }

  const handleRescheduleClick = (row: AppointmentRow) => {
    if (!row.doctorId) {
      Alert.alert('Unable to reschedule', 'Doctor details are missing for this appointment.')
      return
    }

    setRescheduleRow(row)
    setRescheduleDate(new Date())
    setRescheduleTime('')
    setRescheduleSlots([])
    setRescheduleHospitals([])
    setHospitalDropdownOpen(false)
    setRescheduleHospitalId(row.hospitalId ?? '')
    setAppointmentType(row.appointmentMode?.toLowerCase().includes('video') ? 'video' : 'clinic')
    setRescheduleOpen(true)
  }

  const handleRescheduleDateChange = (date: Date) => {
    setRescheduleDate(date)
    setRescheduleTime('')
    setRescheduleSlots([])
  }

  const handleRescheduleConfirm = async () => {
    if (!rescheduleRow) return

    if (!rescheduleTime) {
      Alert.alert('Select time', 'Please select a time slot before confirming.')
      return
    }

    const hospitalId = rescheduleHospitalId || rescheduleRow.hospitalId
    if (!hospitalId) {
      Alert.alert('Select hospital', 'Please select a hospital before confirming.')
      return
    }

    const dateStr = toApiDate(rescheduleDate)
    const selectedSlot = rescheduleSlots.flatMap((group) => group.slots).find((slot) => slot.start_time === rescheduleTime)

    setRescheduleSubmitting(true)
    try {
      const res = await rescheduleAppointment({
        appointment_id: rescheduleRow.id,
        appointment_date: dateStr,
        start_time: rescheduleTime,
        end_time: selectedSlot?.end_time ?? null,
        hospital_id: hospitalId,
        reason: 'Doctor unavailable',
      })

      if (res.success) {
        Toast.show({ type: 'success', text1: res.message || 'Appointment rescheduled.' })
        setRows((prev) =>
          prev.map((row) => {
            if (row.id !== rescheduleRow.id) return row
            const wasPending = (row.status || '').toLowerCase() === 'pending'
            const selectedHospital = rescheduleHospitals.find((hospital) => hospital.id === hospitalId)

            return {
              ...row,
              appointmentDate: dateStr,
              startTime: rescheduleTime,
              endTime: selectedSlot?.end_time ?? row.endTime,
              hospitalId,
              hospitalName: selectedHospital?.label ?? row.hospitalName,
              hospitalAddress: selectedHospital?.address ?? row.hospitalAddress,
              status: wasPending ? row.status : 'rescheduled',
              rescheduledBy: wasPending ? row.rescheduledBy : 'patient',
            }
          })
        )
        setRescheduleOpen(false)
        setHospitalDropdownOpen(false)
      } else {
        Toast.show({ type: 'error', text1: res.message || 'Reschedule failed. Please try again.' })
      }
    } catch (error: any) {
      console.log('[AppointmentList] reschedule appointment error:', error?.response?.data || error?.message || error)
      Toast.show({ type: 'error', text1: 'Something went wrong. Please try again.' })
    } finally {
      setRescheduleSubmitting(false)
    }
  }

  // ── Client-side filtering (applied on top of server-paginated data) ────────

  const filteredRows = rows.filter((row) => {
    if (filterMode !== 'all') {
      const mode = row.appointmentMode.toLowerCase()
      if (filterMode === 'clinic' && !mode.includes('clinic')) return false
      if (filterMode === 'video' && !mode.includes('video')) return false
    }
    if (filterHospital !== 'all') {
      const hospital = (row.hospitalName ?? '').toLowerCase()
      if (!hospital.includes(filterHospital)) return false
    }
    if (filterStatus !== 'all') {
      if (!row.status.toLowerCase().includes(filterStatus)) return false
    }
    if (filterDate !== 'all') {
      const now = new Date()
      const apptDate = new Date(row.appointmentDate)
      if (filterDate === 'today') {
        if (apptDate.toDateString() !== now.toDateString()) return false
      } else if (filterDate === 'yesterday') {
        const yesterday = new Date(now)
        yesterday.setDate(yesterday.getDate() - 1)
        if (apptDate.toDateString() !== yesterday.toDateString()) return false
      } else if (filterDate === 'last7') {
        const cutoff = new Date(now)
        cutoff.setDate(cutoff.getDate() - 7)
        if (apptDate < cutoff) return false
      } else if (filterDate === 'last30') {
        const cutoff = new Date(now)
        cutoff.setDate(cutoff.getDate() - 30)
        if (apptDate < cutoff) return false
      }
    }
    return true
  })

  // ── Render ────────────────────────────────────────────────────────────────

  const renderItem = ({ item }: { item: AppointmentRow }) => (
    <AppointmentCard
      row={item}
      viewAs={viewAs}
      statusLabel={getStatusDisplayLabel(item)}
      onViewDetails={() => {
        setDetailsAppointmentId(item.id)
        setDetailsDrawerOpen(true)
      }}
      onConfirm={() => handleConfirm(item)}
      onReject={() => handleRejectClick(item.id)}
      onReschedule={() => handleRescheduleClick(item)}
    />
  )

  const selectedHospitalLabel =
    rescheduleHospitals.find((hospital) => hospital.id === rescheduleHospitalId)?.label ||
    rescheduleRow?.hospitalName ||
    'Choose Hospital'
  const canConfirmReschedule = Boolean(
    rescheduleRow &&
      rescheduleDate &&
      rescheduleTime &&
      (rescheduleHospitalId || rescheduleRow.hospitalId) &&
      !rescheduleSlotsLoading &&
      !rescheduleSubmitting
  )
  const rescheduleColumns = isTablet || isLandscape ? 4 : 3

  return (
    <View style={styles.container}>
      {/* ── Search bar ─────────────────────────────────────────────────── */}
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder={viewAs === 'doctor' ? 'Search Patient ID, Name...' : 'Search Doctor ID, Name...'}
          placeholderTextColor="#9ca3af"
          value={search}
          onChangeText={(t) => { setSearch(t); setPage(1) }}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      {/* ── Filter row ─────────────────────────────────────────────────── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollRow} contentContainerStyle={styles.filterScrollContent}>
        <FilterDropdown label="Hospital" value={filterHospital} options={hospitalOptions} onChange={(v) => { setFilterHospital(v); setPage(1) }} />
        <FilterDropdown label="Mode" value={filterMode} options={modeOptions} onChange={(v) => { setFilterMode(v); setPage(1) }} />
        <FilterDropdown label="Date" value={filterDate} options={dateOptions} onChange={(v) => { setFilterDate(v); setPage(1) }} />
        <FilterDropdown label="Status" value={filterStatus} options={statusOptions} onChange={(v) => { setFilterStatus(v); setPage(1) }} />
      </ScrollView>

      {/* ── List ───────────────────────────────────────────────────────── */}
      {loading ? (
        <View style={styles.skeletonContainer}>
          {Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}
        </View>
      ) : (
        <FlatList
          data={filteredRows}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No appointments found</Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />
      )}

      {/* ── Pagination ─────────────────────────────────────────────────── */}
      {!loading && meta.pages > 1 && (
        <View style={styles.paginationRow}>
          <TouchableOpacity
            style={[styles.pageBtn, page === 1 && styles.pageBtnDisabled]}
            onPress={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <Text style={styles.pageBtnText}>‹ Prev</Text>
          </TouchableOpacity>
          <Text style={styles.pageInfo}>{page} / {meta.pages}</Text>
          <TouchableOpacity
            style={[styles.pageBtn, page === meta.pages && styles.pageBtnDisabled]}
            onPress={() => setPage((p) => Math.min(meta.pages, p + 1))}
            disabled={page === meta.pages}
          >
            <Text style={styles.pageBtnText}>Next ›</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Reject confirmation modal ───────────────────────────────────── */}
      <RejectConfirmModal
        visible={rejectModalVisible}
        onCancel={handleCancelReject}
        onConfirm={handleConfirmReject}
      />

      {/* ── Appointment Details Drawer ──────────────────────────────────── */}
      <AppointmentHistoryTab
        open={detailsDrawerOpen}
        onClose={() => {
          setDetailsDrawerOpen(false)
          setDetailsAppointmentId(null)
        }}
        appointmentId={detailsAppointmentId}
      />
    </View>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  // Search
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
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
  // Filter row
  filterScrollRow: {
    maxHeight: 52,
    marginBottom: 6,
  },
  filterScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  // Dropdown
  dropdownWrapper: {
    marginRight: 8,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 4,
    minWidth: 100,
  },
  dropdownLabel: {
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: '500',
  },
  dropdownValue: {
    fontSize: 12,
    color: '#0c7c7c',
    fontWeight: '600',
    flex: 1,
  },
  dropdownChevron: {
    fontSize: 10,
    color: '#6b7280',
  },
  dropdownBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  dropdownMenu: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 32,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 16,
  },
  dropdownMenuTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  dropdownMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  dropdownMenuItemSelected: {
    backgroundColor: '#f0fdf4',
  },
  dropdownMenuItemText: {
    fontSize: 14,
    color: '#374151',
  },
  dropdownMenuItemTextSelected: {
    color: '#0c7c7c',
    fontWeight: '600',
  },
  dropdownMenuItemCheck: {
    fontSize: 14,
    color: '#0c7c7c',
    fontWeight: '700',
  },
  // Skeleton
  skeletonContainer: {
    paddingHorizontal: 16,
    gap: 10,
    marginTop: 4,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  skeletonAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#e5e7eb',
  },
  skeletonContent: {
    flex: 1,
  },
  skeletonLine: {
    height: 14,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
  },
  // List
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  // Card
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  cardAccent: {
    height: 3,
  },
  cardBody: {
    padding: 14,
    gap: 6,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  cardAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    flexShrink: 0,
  },
  cardAvatarPlaceholder: {
    backgroundColor: '#0c7c7c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardAvatarInitial: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  cardNameBlock: {
    flex: 1,
    gap: 4,
  },
  cardName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  statusPill: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '600',
  },
  infoBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#e8eaf6',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  infoBtnText: {
    fontSize: 14,
    color: '#3949ab',
    fontWeight: '700',
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardMetaText: {
    fontSize: 12,
    color: '#6b7280',
  },
  cardFee: {
    fontSize: 12,
    color: '#6b7280',
  },
  cardHospital: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  // Action buttons
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  actionBtnConfirm: {
    backgroundColor: '#e8f5e9',
  },
  actionBtnReject: {
    backgroundColor: '#ffeeee',
  },
  actionBtnReschedule: {
    backgroundColor: '#fff8e8',
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4caf50',
  },
  // Pagination
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  pageBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#0c7c7c',
    borderRadius: 10,
  },
  pageBtnDisabled: {
    backgroundColor: '#e5e7eb',
  },
  pageBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  pageInfo: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  // Reject modal
  rejectBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  rejectCard: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    transform: [{ translateX: -140 }, { translateY: -90 }],
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
})
