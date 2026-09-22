import React, { useState } from 'react'
import {
	Modal,
	View,
	TouchableOpacity,
	StyleSheet,
	ActivityIndicator,
	ScrollView,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { AppTypography, AppInput, AppButton } from '../../../components/common'
import DateSlotPicker from '../../../components/common/DateSlotPicker'
import { proposeRescheduleSlot } from '../ancillaryService'

interface RescheduleProposalModalProps {
	visible: boolean
	requestPublicId: string
	rescheduleCount?: number
	onClose: () => void
	onSuccess: (message: string) => void
}

export function RescheduleProposalModal({
	visible,
	requestPublicId,
	rescheduleCount = 0,
	onClose,
	onSuccess,
}: RescheduleProposalModalProps) {
	const [selectedDate, setSelectedDate] = useState<Date>(new Date())
	const [selectedTime, setSelectedTime] = useState<string>('11:00')
	const [reason, setReason] = useState<string>('')
	const [submitting, setSubmitting] = useState<boolean>(false)

	const isLimitReached = rescheduleCount >= 2

	const handlePropose = async () => {
		if (isLimitReached) {
			onSuccess('Maximum reschedule proposals (2) reached for this order.')
			onClose()
			return
		}

		if (!selectedTime) {
			return
		}

		try {
			setSubmitting(true)
			const dateStr = selectedDate.toISOString().split('T')[0]
			const [hours, minutes] = selectedTime.split(':').map(Number)
			const endMinutes = (minutes + 30) % 60
			const endHours = hours + Math.floor((minutes + 30) / 60)
			const endTimeStr = `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`

			const res = await proposeRescheduleSlot(requestPublicId, {
				rescheduled_date: dateStr,
				rescheduled_start_time: selectedTime,
				rescheduled_end_time: endTimeStr,
				reason: reason || 'Provider proposed new slot due to schedule conflict.',
			})

			setSubmitting(false)
			onSuccess(res.message || `Reschedule proposal (${dateStr} ${selectedTime}) sent to patient.`)
			onClose()
		} catch (error: any) {
			setSubmitting(false)
			const message = error?.response?.data?.detail?.message || error?.message || 'Failed to submit reschedule proposal.'
			onSuccess(message)
			onClose()
		}
	}

	return (
		<Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
			<TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
				<TouchableOpacity activeOpacity={1} style={styles.card} onPress={(e) => e.stopPropagation()}>
					<View style={styles.header}>
						<AppTypography variant="h3" style={styles.title}>
							Propose Reschedule Slot
						</AppTypography>
						<TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
							<Ionicons name="close" size={22} color="#64748B" />
						</TouchableOpacity>
					</View>

					{isLimitReached ? (
						<View style={styles.limitBox}>
							<Ionicons name="warning-outline" size={24} color="#EF4444" />
							<AppTypography variant="body" style={styles.limitText}>
								Maximum limit of 2 reschedule proposals reached for this booking request.
							</AppTypography>
						</View>
					) : (
						<ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
							<AppTypography variant="caption" style={styles.label}>
								Select New Proposed Date & 30-min Slot
							</AppTypography>
							<DateSlotPicker
								selectedDate={selectedDate}
								onDateChange={setSelectedDate}
								selectedTime={selectedTime}
								onTimeChange={setSelectedTime}
							/>

							<AppTypography variant="caption" style={styles.label}>
								Reason for Reschedule (Shared with Patient)
							</AppTypography>
							<AppInput
								placeholder="e.g. Original slot busy due to emergency appointment"
								value={reason}
								onChangeText={setReason}
								multiline
								numberOfLines={3}
							/>

							<View style={styles.actions}>
								<AppButton variant="secondary" onPress={onClose} style={styles.cancelBtn}>
									Cancel
								</AppButton>
								<AppButton
									onPress={handlePropose}
									disabled={submitting || !selectedTime}
									style={styles.submitBtn}
								>
									{submitting ? 'Sending Proposal...' : 'Send Proposal'}
								</AppButton>
							</View>
						</ScrollView>
					)}
				</TouchableOpacity>
			</TouchableOpacity>
		</Modal>
	)
}

const styles = StyleSheet.create({
	backdrop: {
		flex: 1,
		backgroundColor: 'rgba(15, 23, 42, 0.5)',
		justifyContent: 'center',
		alignItems: 'center',
		padding: 20,
	},
	card: {
		width: '100%',
		maxWidth: 480,
		backgroundColor: '#FFFFFF',
		borderRadius: 20,
		padding: 20,
		maxHeight: '90%',
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 16,
	},
	title: {
		fontSize: 18,
		fontWeight: '700',
		color: '#0F172A',
	},
	body: {
		gap: 12,
	},
	label: {
		fontSize: 13,
		fontWeight: '600',
		color: '#475569',
		marginTop: 8,
	},
	limitBox: {
		alignItems: 'center',
		padding: 20,
		gap: 12,
	},
	limitText: {
		textAlign: 'center',
		color: '#EF4444',
		fontWeight: '600',
	},
	actions: {
		flexDirection: 'row',
		gap: 12,
		marginTop: 16,
	},
	cancelBtn: {
		flex: 1,
	},
	submitBtn: {
		flex: 1,
		backgroundColor: '#0C7C7C',
	},
})
