// src/features/appointment/AppointmentList.tsx
//
// React Native equivalent of the web AppointmentList.tsx.
// All business logic (fetching, sorting, status labels, action handling,
// reschedule flow) is preserved exactly. UI uses React Native primitives.

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Image,
  ScrollView,
} from 'react-native'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import Toast from 'react-native-toast-message'
import ApiService from '../../services/apiService'
import { API_ENDPOINTS } from '../../constants/apiUrls'
import { Appointment } from '../../types/appointment'
import { updateAppointmentsStatus } from '../../services/appointmentService'
import { AppBottomSheet } from '../../components/common/AppBottomSheet'
import { AppInput } from '../../components/common/AppInput'
import { AppSelect, AppSelectOption, AppTypography, AppCalendar } from '../../components/common'
import AppointmentHistoryTab from './components/AppointmentHistoryTab'
import RescheduleModal, { type RescheduleResult } from './components/RescheduleModal'

// ── Constants ─────────────────────────────────────────────────────────────────

const FALLBACK_CONFIRMED_STATUS_ID = '3f9a2c8e-7b61-4d2a-9a3f-5c8e1b2d4f90'
const FALLBACK_REJECTED_STATUS_ID = 'a7d4e1c2-9f6b-4c83-b2e1-6f3a9d8c7b12'
const TERMINAL_STATUSES = new Set(['cancelled'])

const MODE_FILTER_OPTIONS: AppSelectOption[] = [
  { value: 'all', label: 'All Modes' },
  { value: 'video', label: 'Video Call' },
  { value: 'clinic', label: 'Clinic Visit' },
]

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

// Filter "Date" values come back from AppCalendar as "DD-MM-YYYY"; appointment
// rows carry API-formatted "YYYY-MM-DD" dates, so convert before comparing.
function convertDisplayDateToApiDate(displayDate: string): string | null {
  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(displayDate)
  if (!match) return null
  const [, day, month, year] = match
  return `${year}-${month}-${day}`
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
    <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={onViewDetails}>
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
          <View style={styles.infoBtn}>
            <Text style={styles.infoBtnText}>ℹ</Text>
          </View>
        </View>

        {/* Date / time / mode row */}
        <View style={styles.cardMeta}>
          <View style={styles.metaIconGroup}>
            <MaterialCommunityIcons name="calendar-blank-outline" size={13} color="#6b7280" />
            <Text style={styles.cardMetaText}>{row.appointmentDate}</Text>
          </View>
          <View style={[styles.metaIconGroup, styles.metaIconGroupSpaced]}>
            <MaterialCommunityIcons name="clock-outline" size={13} color="#6b7280" />
            <Text style={styles.cardMetaText}>{formatTime(row.startTime)}{row.endTime ? ' – ' + formatTime(row.endTime) : ''}</Text>
          </View>
        </View>
        <View style={styles.cardMeta}>
          <View style={styles.metaIconGroup}>
            <MaterialCommunityIcons name="hospital-box-outline" size={13} color="#6b7280" />
            <Text style={styles.cardMetaText} numberOfLines={1}>
              {row.appointmentMode?.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
            </Text>
          </View>
          {row.fees != null && (
            <Text style={styles.cardFee}>  ₹{row.fees}</Text>
          )}
        </View>

        {/* Hospital */}
        {row.hospitalName && (
          <View style={styles.cardHospitalRow}>
            <MaterialCommunityIcons name="map-marker-outline" size={13} color="#6b7280" />
            <Text style={styles.cardHospital} numberOfLines={1}>
              {row.hospitalName}
            </Text>
          </View>
        )}

        {/* Action buttons (patient only, non-past, non-terminal) */}
        {showActions && (
          <View style={styles.actionRow}>
            {showConfirm && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnConfirm]}
                onPress={(event) => {
                  event.stopPropagation()
                  onConfirm()
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.actionBtnText}>✓ Confirm</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnReject]}
              onPress={(event) => {
                event.stopPropagation()
                onReject()
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.actionBtnText, { color: '#e53935' }]}>✕ Reject</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnReschedule]}
              onPress={(event) => {
                event.stopPropagation()
                onReschedule()
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.actionBtnText, { color: '#f59e0b' }]}>↻ Reschedule</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </TouchableOpacity>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface AppointmentListProps {
  viewAs?: 'doctor' | 'patient'
  route?: any
}

const PAGE_SIZE = 10

export default function AppointmentList({ viewAs: viewAsProp, route }: AppointmentListProps) {
  const [viewAs, setViewAs] = useState<'doctor' | 'patient'>('patient')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const size = PAGE_SIZE
  const [rows, setRows] = useState<AppointmentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const isFetchingRef = useRef(false)

  // Reject popover state
  const [rejectModalVisible, setRejectModalVisible] = useState(false)
  const [pendingRejectId, setPendingRejectId] = useState<string | null>(null)

  // Details drawer state
  const [detailsDrawerOpen, setDetailsDrawerOpen] = useState(false)
  const [detailsAppointmentId, setDetailsAppointmentId] = useState<string | null>(null)
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
  const [filterHospital, setFilterHospital] = useState('all')
  const [filterMode, setFilterMode] = useState('all')
  const [draftFilterHospital, setDraftFilterHospital] = useState('all')
  const [draftFilterMode, setDraftFilterMode] = useState('all')
  const [hospitalOptions, setHospitalOptions] = useState<AppSelectOption[]>([{ value: 'all', label: 'All' }])

  const [rescheduleOpen, setRescheduleOpen] = useState(false)
  const [rescheduleRow, setRescheduleRow] = useState<AppointmentRow | null>(null)

  const confirmedStatusId = FALLBACK_CONFIRMED_STATUS_ID
  const rejectedStatusId = FALLBACK_REJECTED_STATUS_ID

  // Resolve role from AsyncStorage on mount
  useEffect(() => {
    if (viewAsProp) {
      setViewAs(viewAsProp)
      fetchHospitals(viewAsProp)
      return
    }
    AsyncStorage.getItem('role').then((role) => {
      const activeRole = role === 'patient' ? 'patient' : 'doctor'
      setViewAs(activeRole)
      fetchHospitals(activeRole)
    })
  }, [viewAsProp])

  const fetchHospitals = async (role: 'doctor' | 'patient') => {
    try {
      if (role === 'patient') {
        const res = await ApiService.get<{ data: { hospital_id: string; hospital_name: string }[] }>(
          API_ENDPOINTS.PATIENT.APPOINTMENT_HOSPITALS
        )
        if (res.data?.data) {
          const options: AppSelectOption[] = [{ value: 'all', label: 'All Hospitals' }]
          res.data.data.forEach((h) => {
            options.push({ value: h.hospital_id, label: h.hospital_name })
          })
          setHospitalOptions(options)
        }
      } else {
        const res = await ApiService.get<{ data: { hospital: { id: string; name: string } }[] }>(
          API_ENDPOINTS.DOCTOR_PROFILE.HOSPITALS
        )
        if (res.data?.data) {
          const options: AppSelectOption[] = [{ value: 'all', label: 'All Hospitals' }]
          res.data.data.forEach((h) => {
            if (h.hospital) {
              options.push({ value: h.hospital.id, label: h.hospital.name })
            }
          })
          setHospitalOptions(options)
        }
      }
    } catch (err) {
      console.log('[fetchHospitals] failed to load hospitals:', err)
    }
  }

  // ── Handle route params ───────────────────────────────────────────────────
  useEffect(() => {
    if (route?.params?.appointmentId) {
      setDetailsAppointmentId(route.params.appointmentId)
      setDetailsDrawerOpen(true)
    }
  }, [route?.params?.appointmentId])

  // ── Fetch appointments ────────────────────────────────────────────────────

  const fetchAppointments = useCallback(
    async (targetPage = 1, isLoadMore = false) => {
      if (isFetchingRef.current) return
      isFetchingRef.current = true

      if (isLoadMore) setLoadingMore(true)
      else setLoading(true)

      try {
        const patientId = await AsyncStorage.getItem('patient_id')
        const params: Record<string, unknown> = {
          page: targetPage,
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

        const sorted = [...mapped].sort((a, b) => {
          const dateDiff = b.appointmentDate.localeCompare(a.appointmentDate)
          if (dateDiff !== 0) return dateDiff
          return (b.startTime ?? '').localeCompare(a.startTime ?? '')
        })

        setRows((prev) => (isLoadMore ? [...prev, ...sorted] : sorted))
        setPage(targetPage)
        setHasMore(targetPage < (res.data.meta.pages ?? 1))
      } finally {
        setLoading(false)
        setLoadingMore(false)
        isFetchingRef.current = false
      }
    },
    [search, size]
  )

  useEffect(() => {
    setHasMore(true)
    fetchAppointments(1, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const handleEndReached = useCallback(() => {
    if (isFetchingRef.current || loading || loadingMore || !hasMore) return
    fetchAppointments(page + 1, true)
  }, [loading, loadingMore, hasMore, page, fetchAppointments])

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
        Toast.show({ type: 'success', text1: 'Appointment confirmed successfully.' })
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
        Toast.show({ type: 'success', text1: 'Appointment rejected successfully.' })
        setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, status: 'cancelled' } : r)))
      }
    } catch {
      Toast.show({ type: 'error', text1: 'Something went wrong. Please try again.' })
    } finally {
      setPendingRejectId(null)
    }
  }

  const closeReschedule = () => {
    setRescheduleOpen(false)
  }

  const handleRescheduleClick = (row: AppointmentRow) => {
    if (!row.doctorId) {
      Alert.alert('Unable to reschedule', 'Doctor details are missing for this appointment.')
      return
    }

    setRescheduleRow(row)
    setRescheduleOpen(true)
  }

  const handleRescheduled = (result: RescheduleResult) => {
    if (!rescheduleRow) return

    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== rescheduleRow.id) return row
        const wasPending = (row.status || '').toLowerCase() === 'pending'

        return {
          ...row,
          appointmentDate: result.appointmentDate,
          startTime: result.startTime,
          endTime: result.endTime ?? row.endTime,
          hospitalId: result.hospitalId,
          hospitalName: result.hospitalName ?? row.hospitalName,
          hospitalAddress: result.hospitalAddress ?? row.hospitalAddress,
          status: wasPending ? row.status : result.status,
          rescheduledBy: wasPending ? row.rescheduledBy : 'patient',
        }
      })
    )
    setRescheduleOpen(false)
  }

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

  const renderFooter = () =>
    loadingMore ? (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#0c7c7c" />
      </View>
    ) : null

  const hasActiveFilters =
    filterHospital !== 'all' || filterMode !== 'all'

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (filterHospital !== 'all' && row.hospitalId !== filterHospital) {
        return false
      }
      if (filterMode !== 'all' && !(row.appointmentMode ?? '').toLowerCase().includes(filterMode)) {
        return false
      }
      return true
    })
  }, [rows, filterHospital, filterMode])

  const openFilterSheet = () => {
    setDraftFilterHospital(filterHospital)
    setDraftFilterMode(filterMode)
    setFilterSheetOpen(true)
  }

  const closeFilterSheet = () => {
    setFilterSheetOpen(false)
  }

  const applyFilters = () => {
    setFilterHospital(draftFilterHospital)
    setFilterMode(draftFilterMode)
    setPage(1)
    closeFilterSheet()
  }

  const resetFilters = () => {
    setDraftFilterHospital('all')
    setDraftFilterMode('all')
    setFilterHospital('all')
    setFilterMode('all')
    setPage(1)
  }

  const renderModeChips = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filterChipRow}
    >
      {MODE_FILTER_OPTIONS.map((option) => {
        const selected = option.value === draftFilterMode
        return (
          <TouchableOpacity
            key={option.value}
            style={[styles.filterChip, selected && styles.filterChipActive]}
            onPress={() => setDraftFilterMode(option.value)}
            activeOpacity={0.82}
          >
            <Text style={[styles.filterChipText, selected && styles.filterChipTextActive]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        )
      })}
    </ScrollView>
  )

  return (
    <View style={styles.container}>
      {/* ── Search bar ─────────────────────────────────────────────────── */}
      <View style={styles.searchRow}>
        <View style={styles.searchInputWrap}>
          <AppInput
            isSearch
            showMicrophone
            value={search}
            onChangeText={(text) => {
              setSearch(text)
              setPage(1)
            }}
            placeholder={viewAs === 'doctor' ? 'Search Patient ID, Name...' : 'Search Doctor ID, Name...'}
            placeholderTextColor="#98a1aa"
            containerStyle={styles.searchInputContainer}
            style={styles.searchInput}
            contentStyle={styles.searchInputContent}
            outlineStyle={styles.searchInputOutline}
            outlineColor="#2e7b7d"
            activeOutlineColor="#2e7b7d"
            textColor="#1b2d3c"
            autoCorrect={false}
            returnKeyType="search"
            noMargin
          />
        </View>
        <TouchableOpacity
          style={[styles.filterIconButton, hasActiveFilters && styles.filterIconButtonActive]}
          onPress={openFilterSheet}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Filter appointments"
        >
          <MaterialCommunityIcons name="tune" size={22} color="#1f5f68" />
        </TouchableOpacity>
      </View>

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
              <Text style={styles.emptyText}>
                {hasActiveFilters ? 'No appointments match your filters' : 'No appointments found'}
              </Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
        />
      )}

      {/* ── Reject confirmation modal ───────────────────────────────────── */}
      <RejectConfirmModal
        visible={rejectModalVisible}
        onCancel={handleCancelReject}
        onConfirm={handleConfirmReject}
      />

      {/* ── Appointments Filter Sheet ──────────────────────────────────── */}
      <AppBottomSheet
        visible={filterSheetOpen}
        title="Filters"
        onClose={closeFilterSheet}
        maxHeightRatio={0.62}
      >
        <View style={styles.filterSheetBody}>
          <View style={styles.filterGroup}>
            <AppTypography variant="subtitle" style={styles.filterGroupLabel}>Hospital</AppTypography>
            <AppSelect
              options={hospitalOptions}
              value={draftFilterHospital}
              onSelect={setDraftFilterHospital}
              placeholder="Select Hospital"
              size="medium"
              borderRadius={16}
              customCardStyle={styles.filterSelectCard}
              borderColor="#c1e0de"
              style={styles.filterSelectFill}
            />
          </View>

          <View style={styles.filterGroup}>
            <AppTypography variant="subtitle" style={styles.filterGroupLabel}>Mode</AppTypography>
            {renderModeChips()}
          </View>

          <View style={styles.filterSheetActions}>
            <TouchableOpacity
              style={[styles.filterActionBtn, styles.filterResetButton]}
              activeOpacity={0.8}
              onPress={resetFilters}
            >
              <Text style={styles.filterResetText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterActionBtn, styles.filterApplyButton]}
              activeOpacity={0.85}
              onPress={applyFilters}
            >
              <Text style={styles.filterApplyText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </AppBottomSheet>

      <AppointmentHistoryTab
        open={detailsDrawerOpen}
        onClose={() => {
          setDetailsDrawerOpen(false)
          setDetailsAppointmentId(null)
        }}
        appointmentId={detailsAppointmentId}
        viewAs={viewAs}
      />

      <RescheduleModal
        visible={rescheduleOpen}
        onClose={closeReschedule}
        appointmentId={rescheduleRow?.id ?? ''}
        doctorId={rescheduleRow?.doctorId}
        hospitalId={rescheduleRow?.hospitalId}
        isVirtual={rescheduleRow?.appointmentMode?.toLowerCase().includes('video')}
        onRescheduled={handleRescheduled}
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
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 22,
    marginRight: 12,
    marginTop: 12,
    marginBottom: 12,
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
  filterIconButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EAECF0',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  filterIconButtonActive: {
    backgroundColor: '#eaf8f9',
    borderColor: '#1f5f68',
  },
  filterSheetBody: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 20,
    alignItems: 'center',
  },
  filterGroup: {
    gap: 8,
    width: '100%',
    alignItems: 'flex-start',
  },
  filterGroupLabel: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    color: '#333333',
    alignSelf: 'flex-start',
    marginLeft: 4,
  },
  filterSelectFill: {
    width: '100%',
    marginBottom: 0,
  },
  filterSelectCard: {
    height: 46,
    borderRadius: 10,
    backgroundColor: '#ffffff',
  },
  filterChipRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 2,
  },
  filterChip: {
    minHeight: 36,
    borderRadius: 18,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f7f7',
  },
  filterChipActive: {
    backgroundColor: '#eef8f7',
    borderWidth: 1,
    borderColor: '#c1e0de',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64707d',
  },
  filterChipTextActive: {
    color: '#2e7d74',
    fontWeight: '600',
  },
  filterSheetActions: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 16,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  filterActionBtn: {
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterResetButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#c1e0de',
    backgroundColor: '#ffffff',
  },
  filterResetText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2e7d74',
  },
  filterApplyButton: {
    flex: 2,
    backgroundColor: '#1f6e71',
  },
  filterApplyText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  // Skeleton
  skeletonContainer: {
    paddingLeft: 22,
    paddingRight: 16,
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
    paddingLeft: 22,
    paddingRight: 16,
    paddingBottom: 16,
    paddingTop: 8,
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
  metaIconGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaIconGroupSpaced: {
    marginLeft: 12,
  },
  cardMetaText: {
    fontSize: 12,
    color: '#6b7280',
  },
  cardFee: {
    fontSize: 12,
    color: '#6b7280',
  },
  cardHospitalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  cardHospital: {
    fontSize: 12,
    color: '#6b7280',
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
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
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
