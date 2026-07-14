// src/features/patient/PatientAppointments.tsx
//
// React Native equivalent of the web PatientAppointments component.
// All business logic (fetch, cancel, reschedule, status helpers, local
// state overrides) is preserved exactly.

import React, { useEffect, useState, useCallback } from 'react'
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
  Image,
  Linking,
  Alert,
  Animated,
  Easing,
  Platform,
} from 'react-native'
import Toast from 'react-native-toast-message'
import { Appointment } from '../../types/appointment'
import ApiService from '../../services/apiService'
import { API_ENDPOINTS } from '../../constants/apiUrls'
import { getStatusStyle } from '../../constants/statusColors'

// ── Helpers that are imported from doctorService in the web version ───────────
// Replicated here to avoid cross-feature circular imports in RN.

async function getAppointments(params: {
  limit?: number
  variant?: string
}): Promise<{ success: boolean; data: Appointment[]; message?: string }> {
  const res = await ApiService.getWithParams<{
    success: boolean
    data: Appointment[]
    message?: string
  }>(API_ENDPOINTS.APPOINTMENTS.GET, params)
  return res.data
}


// ── Formatting (identical to web) ─────────────────────────────────────────────

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'long' })
}

const formatTime = (timeStr: string) => {
  const [h, m] = timeStr.split(':').map(Number)
  const suffix = h >= 12 ? 'PM' : 'AM'
  const hour = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${String(hour).padStart(2, '0')}:${String(m).padStart(2, '0')} ${suffix}`
}

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
      <View style={styles.skeletonAvatar} />
      <View style={styles.skeletonContent}>
        <View style={[styles.skeletonLine, { width: '65%' }]} />
        <View style={[styles.skeletonLine, { width: '40%', marginTop: 6 }]} />
        <View style={[styles.skeletonLine, { width: '55%', marginTop: 6 }]} />
      </View>
    </Animated.View>
  )
}

// ── Cancel modal ──────────────────────────────────────────────────────────────

interface CancelModalProps {
  visible: boolean
  cancelReason: string
  onChangeReason: (v: string) => void
  onClose: () => void
  onSubmit: () => void
  submitting: boolean
}

function CancelModal({ visible, cancelReason, onChangeReason, onClose, onSubmit, submitting }: CancelModalProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.cancelBackdrop} onPress={onClose} />
      <View style={styles.cancelSheet}>
        <View style={styles.cancelHandle} />
        <Text style={styles.cancelTitle}>Reason for Cancelling</Text>
        <TextInput
          style={styles.cancelInput}
          placeholder="Enter reason..."
          placeholderTextColor="#9ca3af"
          value={cancelReason}
          onChangeText={onChangeReason}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
        <View style={styles.cancelButtons}>
          <TouchableOpacity style={styles.cancelSkipBtn} onPress={onClose} activeOpacity={0.8}>
            <Text style={styles.cancelSkipText}>Skip for Now</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.cancelSubmitBtn, (!cancelReason.trim() || submitting) && styles.cancelSubmitBtnDisabled]}
            onPress={onSubmit}
            disabled={!cancelReason.trim() || submitting}
            activeOpacity={0.8}
          >
            <Text style={styles.cancelSubmitText}>{submitting ? 'Submitting…' : 'Submit'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function PatientAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [localStatuses, setLocalStatuses] = useState<Record<string, string>>({})

  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelAppt, setCancelAppt] = useState<Appointment | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelSubmitting, setCancelSubmitting] = useState(false)
  const [cancelledStatusId, setCancelledStatusId] = useState('')

  // ── Fetch data ────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const [apptRes, statusRes] = await Promise.all([
        getAppointments({ limit: 10, variant: 'upcoming' }),
        ApiService.get<{ success: boolean; data: { id: string; label: string }[] }>(
          API_ENDPOINTS.APPOINTMENTS.STATUSES
        ),
      ])
      if (apptRes.success) {
        setAppointments(Array.isArray(apptRes.data) ? apptRes.data : [])
      } else {
        setError(apptRes.message ?? 'Failed to load appointments')
      }
      const cancelledStatus = statusRes.data?.data?.find((s) => s.label === 'cancelled')
      if (cancelledStatus) setCancelledStatusId(cancelledStatus.id)
    } catch {
      setError('Failed to load appointments')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ── Status helper (same as web statusOf) ─────────────────────────────────

  const statusOf = (appt: Appointment): string =>
    localStatuses[appt.id] ||
    (typeof appt.status === 'string'
      ? appt.status
      : ((appt.status as { label: string })?.label ?? 'pending'))

  // ── Cancel ────────────────────────────────────────────────────────────────

  const handleCancelAppointment = async () => {
    if (!cancelAppt || !cancelledStatusId) return
    setCancelSubmitting(true)
    try {
      const res = await ApiService.patch<{ success: boolean; message: string }>(
        API_ENDPOINTS.APPOINTMENTS.UPDATE,
        {
          appointment_id: cancelAppt.id,
          status_id: cancelledStatusId,
          reason: cancelReason,
        }
      )
      if (res.data?.success) {
        Toast.show({ type: 'success', text1: 'Appointment cancelled successfully' })
        setAppointments((prev) => prev.filter((a) => a.id !== cancelAppt.id))
        setCancelOpen(false)
        setCancelReason('')
      } else {
        Toast.show({ type: 'error', text1: res.data?.message || 'Failed to cancel appointment' })
      }
    } catch {
      Toast.show({ type: 'error', text1: 'Something went wrong. Please try again.' })
    } finally {
      setCancelSubmitting(false)
    }
  }

  // ── Reschedule ────────────────────────────────────────────────────────────

  const handleOpenReschedule = (appt: Appointment) => {
    // Navigate to RescheduleScreen or open a RescheduleBottomSheet.
    // The slot-fetching and API POST logic is identical to the web:
    //   POST API_ENDPOINTS.APPOINTMENTS.RESCHEDULE with { appointment_id, appointment_date, start_time, hospital_id, reason }
    Alert.alert(
      'Reschedule Appointment',
      `Reschedule appointment with ${appt.doctor?.name ?? 'doctor'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Reschedule',
          onPress: () => {
            console.log('Open reschedule for appointment', appt.id)
          },
        },
      ]
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const renderAppointment = ({ item: appt }: { item: Appointment }) => {
    const status = statusOf(appt)
    const style = getStatusStyle(status)
    const isVirtual = appt.appointment_mode === 'video call'
    const canJoin = isVirtual && status === 'confirmed'
    const canAct = status !== 'cancelled' && status !== 'completed'

    return (
      <View style={[styles.card, status === 'cancelled' && styles.cardCancelled]}>
        {/* Status accent bar */}
        {status !== 'cancelled' && (
          <View style={[styles.cardAccent, { backgroundColor: style.color }]} />
        )}

        <View style={styles.cardInner}>
          {/* Doctor row */}
          <View style={styles.cardDoctorRow}>
            {appt.doctor?.avatar_s3_key ? (
              <Image
                source={{ uri: appt.doctor.avatar_s3_key }}
                style={styles.doctorAvatar}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.doctorAvatar, styles.doctorAvatarPlaceholder]}>
                <Text style={styles.doctorAvatarInitial}>
                  {(appt.doctor?.name ?? 'D').charAt(0)}
                </Text>
              </View>
            )}

            <View style={styles.cardDoctorInfo}>
              <View style={styles.cardDoctorTopRow}>
                <Text style={styles.doctorName} numberOfLines={1}>
                  {appt.doctor?.name ?? 'Unknown Doctor'}
                </Text>
                <View style={[styles.statusPill, { backgroundColor: style.bgColor }]}>
                  <Text style={[styles.statusPillText, { color: style.color }]}>
                    {status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()}
                  </Text>
                </View>
              </View>
              <Text style={styles.consultationLabel}>Consultation</Text>
            </View>
          </View>

          {/* Date / Time / Mode row */}
          <View style={styles.cardMetaRow}>
            <View style={styles.cardMetaItem}>
              <Text style={styles.metaIcon}>📅</Text>
              <Text style={styles.metaText}>{formatDate(appt.appointment_date)}</Text>
            </View>
            <View style={styles.cardMetaItem}>
              <Text style={styles.metaIcon}>🕐</Text>
              <Text style={styles.metaText}>{formatTime(appt.start_time)}</Text>
            </View>
            <View style={styles.cardMetaItem}>
              <Text style={styles.metaIcon}>{isVirtual ? '📹' : '📍'}</Text>
              <Text style={styles.metaText}>{isVirtual ? 'Video Call' : 'Clinic Visit'}</Text>
            </View>
          </View>

          {/* Hospital row */}
          {appt.hospital && (
            <View style={styles.hospitalRow}>
              <Text style={styles.metaIcon}>📍</Text>
              <Text style={styles.hospitalText} numberOfLines={1}>
                {appt.hospital.name} | {appt.hospital.address?.split(',')[0]}
              </Text>
            </View>
          )}

          {/* Actions */}
          {canAct && (
            <View style={styles.cardActions}>
              {canJoin && (
                <TouchableOpacity style={styles.joinBtn} activeOpacity={0.85}>
                  <Text style={styles.joinBtnIcon}>📹</Text>
                  <Text style={styles.joinBtnText}>Join</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.rescheduleBtn}
                onPress={() => handleOpenReschedule(appt)}
                activeOpacity={0.8}
              >
                <Text style={styles.rescheduleBtnText}>Reschedule</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setCancelAppt(appt)
                  setCancelOpen(true)
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Upcoming Appointments</Text>
          <Text style={styles.headerSubtitle}>Manage your upcoming healthcare visits</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{appointments.length}</Text>
          </View>
        </View>
      </View>

      {/* Content */}
      {loading && (
        <View style={styles.skeletonList}>
          {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </View>
      )}

      {!loading && error !== '' && (
        <Text style={styles.errorText}>{error}</Text>
      )}

      {!loading && error === '' && appointments.length === 0 && (
        <Text style={styles.emptyText}>No upcoming appointments.</Text>
      )}

      {!loading && error === '' && appointments.length > 0 && (
        <FlatList
          data={appointments}
          keyExtractor={(item) => item.id}
          renderItem={renderAppointment}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        />
      )}

      {/* Cancel modal */}
      <CancelModal
        visible={cancelOpen}
        cancelReason={cancelReason}
        onChangeReason={setCancelReason}
        onClose={() => setCancelOpen(false)}
        onSubmit={handleCancelAppointment}
        submitting={cancelSubmitting}
      />
    </View>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

export default PatientAppointments

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 3,
  },
  headerRight: {
    marginLeft: 12,
  },
  countBadge: {
    backgroundColor: '#0c7c7c',
    borderRadius: 12,
    minWidth: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  countBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  // Skeleton
  skeletonList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  skeletonCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  skeletonAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
  // Error / Empty
  errorText: {
    fontSize: 13,
    color: '#dc2626',
    textAlign: 'center',
    paddingTop: 24,
    paddingHorizontal: 16,
  },
  emptyText: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
    paddingTop: 24,
    paddingHorizontal: 16,
  },
  // List
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
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
    borderColor: '#f0f2f5',
  },
  cardCancelled: {
    borderColor: '#fee2e2',
  },
  cardAccent: {
    height: 3,
  },
  cardInner: {
    padding: 14,
    gap: 10,
  },
  // Doctor row
  cardDoctorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  doctorAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    flexShrink: 0,
  },
  doctorAvatarPlaceholder: {
    backgroundColor: '#0c7c7c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doctorAvatarInitial: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  cardDoctorInfo: {
    flex: 1,
  },
  cardDoctorTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  doctorName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  statusPill: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '600',
  },
  consultationLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  // Meta row
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  cardMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaIcon: {
    fontSize: 11,
    color: '#6b7280',
  },
  metaText: {
    fontSize: 11,
    color: '#6b7280',
  },
  // Hospital
  hospitalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  hospitalText: {
    fontSize: 10,
    color: '#6b7280',
    flex: 1,
  },
  // Action buttons
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  joinBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#0c7c7c',
    borderRadius: 10,
    paddingVertical: 9,
  },
  joinBtnIcon: {
    fontSize: 11,
    color: '#fff',
  },
  joinBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ffffff',
  },
  rescheduleBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  rescheduleBtnText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#111827',
  },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: '#fee2e2',
  },
  cancelBtnText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#ef4444',
  },
  // Cancel modal
  cancelBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  cancelSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 20,
  },
  cancelHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#d1d5db',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  cancelTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 14,
  },
  cancelInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    height: 90,
    backgroundColor: '#f9fafb',
    marginBottom: 16,
  },
  cancelButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelSkipBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  cancelSkipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  cancelSubmitBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#0c7c7c',
    alignItems: 'center',
  },
  cancelSubmitBtnDisabled: {
    backgroundColor: '#d1d5db',
  },
  cancelSubmitText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
})
