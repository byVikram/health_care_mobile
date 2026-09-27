import React, { useState } from 'react'
import { View, StyleSheet, Text, TouchableOpacity, ScrollView } from 'react-native'
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons'
import { AppModal } from '../../../components/common/layout/AppModal'
import { AppButton } from '../../../components/common/buttons/AppButton'
import { AppTypography } from '../../../components/common/display/AppTypography'

export const CANCELLATION_REASONS = [
  { id: '1', label: 'Wait time is too long' },
  { id: '2', label: 'Booked by mistake / wrong address' },
  { id: '3', label: 'Patient condition improved / no longer required' },
  { id: '4', label: 'Found alternative care professional' },
  { id: '5', label: 'Other reason' },
]

interface CancellationDetailsModalProps {
  visible: boolean
  onClose: () => void
  onConfirmCancel: (reason: string) => void
  isCancelling?: boolean
  feeAmount?: string
}

export default function CancellationDetailsModal({
  visible,
  onClose,
  onConfirmCancel,
  isCancelling = false,
  feeAmount = '₹0',
}: CancellationDetailsModalProps) {
  const [selectedReasonId, setSelectedReasonId] = useState<string>('1')

  const handleConfirm = () => {
    const selected = CANCELLATION_REASONS.find((r) => r.id === selectedReasonId)
    onConfirmCancel(selected ? selected.label : 'Other reason')
  }

  return (
    <AppModal visible={visible} onDismiss={onClose} title="Cancel Booking Request">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Warning Banner */}
        <View style={styles.warningBox}>
          <MaterialCommunityIcons name="alert-circle-outline" size={24} color="#D97706" />
          <Text style={styles.warningText}>
            Free cancellation is available before provider assignment. 100% refund will be processed to original payment method.
          </Text>
        </View>

        {/* Cancellation Reason Selector */}
        <AppTypography variant="h3" style={styles.policyTitle}>
          Select Reason for Cancellation
        </AppTypography>

        <View style={styles.reasonList}>
          {CANCELLATION_REASONS.map((item) => {
            const isSelected = item.id === selectedReasonId
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.reasonRow, isSelected && styles.reasonRowSelected]}
                onPress={() => setSelectedReasonId(item.id)}
                activeOpacity={0.8}
              >
                <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                  {isSelected && <View style={styles.radioInnerDot} />}
                </View>
                <Text style={[styles.reasonText, isSelected && styles.reasonTextSelected]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>

        {/* Policy Terms */}
        <View style={styles.policyBox}>
          <AppTypography variant="h4" style={styles.policyBoxTitle}>
            Refund Terms
          </AppTypography>
          <View style={styles.policyRow}>
            <Ionicons name="checkmark-circle" size={16} color="#059669" />
            <Text style={styles.policyText}>Before provider assignment: Full 100% refund.</Text>
          </View>
          <View style={styles.policyRow}>
            <Ionicons name="time-outline" size={16} color="#D97706" />
            <Text style={styles.policyText}>Provider en route (&gt;5 mins): ₹100 travel fee applies.</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <AppButton variant="outline" onPress={onClose} style={styles.keepBtn}>
            Keep Booking
          </AppButton>
          <AppButton
            variant="primary"
            onPress={handleConfirm}
            loading={isCancelling}
            style={styles.cancelBtn}
          >
            Confirm Cancel
          </AppButton>
        </View>
      </ScrollView>
    </AppModal>
  )
}

const styles = StyleSheet.create({
  content: {
    gap: 14,
    paddingVertical: 4,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  warningText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '600',
    flex: 1,
    lineHeight: 17,
  },
  policyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  reasonList: {
    gap: 8,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    gap: 10,
  },
  reasonRowSelected: {
    borderColor: '#0D8585',
    backgroundColor: 'rgba(13, 133, 133, 0.06)',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#94A3B8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleSelected: {
    borderColor: '#0D8585',
  },
  radioInnerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0D8585',
  },
  reasonText: {
    fontSize: 13,
    color: '#334155',
    flex: 1,
  },
  reasonTextSelected: {
    color: '#0F172A',
    fontWeight: '600',
  },
  policyBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  policyBoxTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  policyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  policyText: {
    fontSize: 12,
    color: '#475569',
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  keepBtn: {
    flex: 1,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#EF4444',
  },
})
