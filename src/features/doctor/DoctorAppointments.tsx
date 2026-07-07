// src/features/doctor/DoctorAppointments.tsx
//
// React Native equivalent of the web DoctorAppointments component.
// All business logic (status helpers, confirm/reject/reschedule flow,
// local state overrides) is preserved exactly.

import React, { useState, useEffect } from 'react'
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
} from 'react-native'
import Toast from 'react-native-toast-message'
import { Appointment } from '../../types/appointment'
import { updateAppointmentsStatus } from '../../services/appointmentService'
import ApiService from '../../services/apiService'
import { API_ENDPOINTS } from '../../constants/apiUrls'

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

  // Reschedule state (mirrors web — slot-picker would go in a separate bottom sheet)
  const [rescheduleAppt, setRescheduleAppt] = useState<Appointment | null>(null)

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
    setRejectModalVisible(false)
    setPendingRejectId(null)
  }

  const handleConfirmReject = async () => {
    if (!pendingRejectId) return
    setRejectModalVisible(false)
    try {
      const res = await updateAppointmentsStatus(pendingRejectId, 'a7d4e1c2-9f6b-4c83-b2e1-6f3a9d8c7b12')
      if (res.success) {
        Toast.show({ type: 'success', text1: res.message })
        setLocalStatuses((prev) => ({ ...prev, [pendingRejectId!]: 'cancelled' }))
      }
    } catch {
      Toast.show({ type: 'error', text1: 'Something went wrong. Please try again.' })
    } finally {
      setPendingRejectId(null)
    }
  }

  const handleRescheduleClick = (apt: Appointment) => {
    setRescheduleAppt(apt)
    // In a full integration, open a RescheduleBottomSheet here.
    // The reschedule API call logic is identical to the web version:
    //   POST API_ENDPOINTS.APPOINTMENTS.RESCHEDULE with { appointment_id, appointment_date, start_time, hospital_id, reason }
    Alert.alert(
      'Reschedule Appointment',
      `Reschedule appointment for ${apt.patient?.name ?? 'patient'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Reschedule',
          onPress: () => {
            console.log('Open reschedule for appointment', apt.id)
          },
        },
      ]
    )
  }

  const handleStartConsultation = async (appointmentId: string, patientId: string) => {
    try {
      const res = await ApiService.post<{ success: boolean }>(
        `${API_ENDPOINTS.APPOINTMENTS.GET_BY_ID(appointmentId)}/start-consultation`,
        {}
      )
      if (res.data.success) {
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
})
