// src/features/appointment/components/patient-details/CancelAppointmentSheet.tsx
//
// "Cancel this appointment?" sheet (design 7 / 7a). Uses the same cancel
// flow as MobileAppointmentCard: look up the "cancelled" status id from
// APPOINTMENTS.STATUSES, then PATCH APPOINTMENTS.UPDATE.

import React, { useEffect, useState } from 'react'
import { Alert, StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import ApiService from '../../../../services/apiService'
import { API_ENDPOINTS } from '../../../../constants/apiUrls'
import { updateAppointmentsStatus } from '../../../../services/appointmentService'
import { AppBottomSheet, AppButton, AppChip } from '../../../../components/common'
import { APP_COLORS } from '../../../../config/theme'

const REASONS = ['Feeling better', 'Can’t make it', 'Booked by mistake', 'Seeing another doctor']

type AppointmentStatusOption = { id: string; label: string }

type CancelAppointmentSheetProps = {
	visible: boolean
	appointmentId: string
	subtitle: string
	onClose: () => void
	onRescheduleInstead: () => void
	onCancelled: () => void
}

export default function CancelAppointmentSheet({
	visible,
	appointmentId,
	subtitle,
	onClose,
	onRescheduleInstead,
	onCancelled,
}: CancelAppointmentSheetProps) {
	const [reason, setReason] = useState<string | null>(null)
	const [cancelledStatusId, setCancelledStatusId] = useState('')
	const [submitting, setSubmitting] = useState(false)

	useEffect(() => {
		if (!visible) return
		setReason(null)
		if (cancelledStatusId) return
		let mounted = true
		const fetchStatuses = async () => {
			try {
				const res = await ApiService.get<{ success?: boolean; data?: AppointmentStatusOption[] }>(
					API_ENDPOINTS.APPOINTMENTS.STATUSES
				)
				const match = res.data?.data?.find((s) => s.label?.toLowerCase() === 'cancelled')
				if (mounted && match) setCancelledStatusId(match.id)
			} catch (error) {
				console.log('[CancelAppointmentSheet] fetch statuses error:', error)
			}
		}
		fetchStatuses()
		return () => {
			mounted = false
		}
	}, [visible, cancelledStatusId])

	const handleConfirm = async () => {
		if (submitting) return
		if (!cancelledStatusId) {
			Alert.alert('Unable to cancel', 'Cancellation status is unavailable. Please try again in a moment.')
			return
		}
		setSubmitting(true)
		try {
			const res = await updateAppointmentsStatus(appointmentId, cancelledStatusId, reason ?? undefined)
			if (res?.success) {
				onCancelled()
			} else {
				Alert.alert('Error', res?.message || 'Failed to cancel appointment.')
			}
		} catch (error: any) {
			console.log('[CancelAppointmentSheet] cancel error:', error?.response?.data || error?.message || error)
			Alert.alert('Error', 'Something went wrong. Please try again.')
		} finally {
			setSubmitting(false)
		}
	}

	return (
		<AppBottomSheet
			appearance="modern"
			showHeaderDivider={false}
			visible={visible}
			title="Cancel this appointment?"
			subtitle={subtitle}
			// AppBottomSheet always animates itself closed before calling onClose, so a no-op here
			// would desync it from `visible`; an in-flight cancel still resolves via onCancelled.
			onClose={onClose}
			dismissible={!submitting}
			maxHeightRatio={0.88}
		>
			<View style={styles.body}>
				<View style={styles.reasonBlock}>
					<Text style={styles.reasonLabel}>Tell us why (optional)</Text>
					<View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel="Reason">
						{REASONS.map((r) => {
							const on = reason === r
							return (
								<AppChip
									key={r}
									label={r}
									selected={on}
									onPress={() => setReason(on ? null : r)}
									variant="soft"
									shape="rounded"
									size="sm"
									radius={10}
									borderColor={APP_COLORS.divider}
									accessibilityRole="radio"
									style={styles.chip}
									textStyle={[styles.chipText, on && styles.chipTextOn]}
								/>
							)
						})}
					</View>
				</View>

				<View style={styles.rescheduleHint}>
					<MaterialCommunityIcons name="calendar-blank-outline" size={18} color={APP_COLORS.primary} />
					<Text style={styles.hintText}>
						Prefer another time?{' '}
						<Text style={styles.hintLink} onPress={onRescheduleInstead} accessibilityRole="button">
							Reschedule instead
						</Text>
					</Text>
				</View>

				<View style={styles.actions}>
					{/* Not `disabled` while submitting: Paper greys disabled buttons out; the handlers guard instead. */}
					<AppButton
						variant="outline"
						size="lg"
						style={styles.btn}
						onPress={submitting ? undefined : onClose}
					>
						Keep it
					</AppButton>
					<AppButton
						variant="danger"
						size="lg"
						style={[styles.btn, submitting && styles.disabled]}
						onPress={handleConfirm}
						loading={submitting}
					>
						Yes, cancel
					</AppButton>
				</View>
			</View>
		</AppBottomSheet>
	)
}

const styles = StyleSheet.create({
	// AppBottomSheet supplies the 16px side padding and safe-area bottom padding.
	body: { paddingBottom: 4, gap: 14 },
	reasonBlock: { gap: 8 },
	reasonLabel: { fontSize: 13, lineHeight: 18, fontWeight: '700', color: APP_COLORS.ink },
	chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
	chip: { borderWidth: 1.5 },
	chipText: { fontWeight: '700' },
	chipTextOn: { color: APP_COLORS.primary },
	rescheduleHint: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		paddingVertical: 10,
		paddingHorizontal: 12,
		borderRadius: 12,
		backgroundColor: APP_COLORS.mint,
	},
	hintText: { flex: 1, fontSize: 13, lineHeight: 18, color: APP_COLORS.ink },
	hintLink: { color: APP_COLORS.primary, fontWeight: '700' },
	actions: { flexDirection: 'row', gap: 8 },
	btn: { flex: 1 },
	disabled: { opacity: 0.7 },
})
