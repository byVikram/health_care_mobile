// src/features/doctor/components/RejectReasonModal.tsx
import React from 'react'
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import { AppInput } from '../../../components/common'

interface RejectReasonModalProps {
  visible: boolean
  reason: string
  onReasonChange: (text: string) => void
  onCancel: () => void
  onConfirm: () => void
  submitting?: boolean
}

export const RejectReasonModal: React.FC<RejectReasonModalProps> = ({
  visible,
  reason,
  onReasonChange,
  onCancel,
  onConfirm,
  submitting = false,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <TouchableOpacity
        style={styles.modalCenteredView}
        activeOpacity={1}
        onPress={onCancel}
      >
        <View style={styles.rejectBackdrop} />
        <TouchableOpacity
          activeOpacity={1}
          style={styles.rejectCard}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={styles.rejectTitle}>Decline Appointment</Text>
          <Text style={styles.rejectSubtitle}>
            Please provide a brief reason for declining this appointment. This will be shared with the patient.
          </Text>

          <View style={styles.rejectInputWrap}>
            <AppInput
              placeholder="e.g. Unexpected emergency, time conflict..."
              value={reason}
              onChangeText={onReasonChange}
              multiline
              numberOfLines={3}
              style={styles.rejectInput}
              autoFocus
            />
          </View>

          <View style={styles.rejectModalActions}>
            <TouchableOpacity
              style={[styles.rejectSecondaryBtn, submitting && styles.btnDisabled]}
              onPress={onCancel}
              disabled={submitting}
            >
              <Text style={styles.rejectSecondaryText}>Back</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.rejectPrimaryBtn,
                (!reason.trim() || submitting) && styles.btnDisabled,
              ]}
              onPress={onConfirm}
              disabled={!reason.trim() || submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.rejectPrimaryText}>Decline</Text>
              )}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  )
}

const styles = StyleSheet.create({
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
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  rejectInputWrap: {
    width: '100%',
    marginBottom: 16,
  },
  rejectInput: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  rejectModalActions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  rejectSecondaryBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  rejectSecondaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  rejectPrimaryBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#dc2626',
    alignItems: 'center',
  },
  rejectPrimaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  btnDisabled: {
    opacity: 0.5,
  },
})
