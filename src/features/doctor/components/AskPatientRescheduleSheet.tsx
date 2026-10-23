// src/features/doctor/components/AskPatientRescheduleSheet.tsx
//
// A doctor does not pick a new slot when rescheduling: they ask the PATIENT to choose one. This is the
// confirmation sheet for that ("Ask the patient to reschedule?"): what will happen, an optional reason for the
// patient, Confirm / Cancel. The caller makes the call (askPatientToReschedule in doctorService) and closes it.

import React, { useEffect, useState } from 'react'
import { StyleSheet, Text, TextInput, View } from 'react-native'
import { AppConfirmSheet } from '../../../components/common'
import { APP_COLORS } from '../../../config/theme'
import { RESCHEDULE_REASON_MAX_LENGTH } from '../doctorService'

type Props = {
	visible: boolean
	patientName: string
	/** "Fri 26 Sep, 5:30 PM" -- the slot being given up. */
	slotLabel?: string
	onClose: () => void
	/** Resolves when the call is done; the sheet shows a spinner until then. The reason is trimmed, '' when empty. */
	onConfirm: (reason: string) => void | Promise<void>
}

export function AskPatientRescheduleSheet({ visible, patientName, slotLabel, onClose, onConfirm }: Props) {
	const [reason, setReason] = useState('')

	useEffect(() => {
		if (visible) setReason('')
	}, [visible])

	return (
		<AppConfirmSheet
			visible={visible}
			onClose={onClose}
			title="Ask the patient to reschedule?"
			message={`${patientName}${slotLabel ? ` (${slotLabel})` : ''} will be emailed and asked to choose a new time. You'll be asked to confirm the time they pick.`}
			confirmLabel="Confirm"
			cancelLabel="Cancel"
			tone="primary"
			onConfirm={() => onConfirm(reason.trim())}
		>
			<View style={styles.field}>
				<Text style={styles.label}>Reason for the patient (optional)</Text>
				<TextInput
					value={reason}
					onChangeText={(t) => setReason(t.slice(0, RESCHEDULE_REASON_MAX_LENGTH))}
					placeholder="A short explanation, e.g. I'm unavailable at this time"
					placeholderTextColor={APP_COLORS.inkMuted}
					multiline
					numberOfLines={3}
					maxLength={RESCHEDULE_REASON_MAX_LENGTH}
					style={styles.input}
				/>
				<Text style={styles.count}>
					{reason.length}/{RESCHEDULE_REASON_MAX_LENGTH}
				</Text>
			</View>
		</AppConfirmSheet>
	)
}

export default AskPatientRescheduleSheet

const styles = StyleSheet.create({
	field: { gap: 6 },
	label: { fontSize: 12, lineHeight: 16, fontWeight: '800', letterSpacing: 0.4, color: APP_COLORS.inkMuted },
	input: {
		minHeight: 72,
		padding: 10,
		borderWidth: 1,
		borderColor: APP_COLORS.border,
		borderRadius: 10,
		backgroundColor: APP_COLORS.surface,
		fontSize: 15,
		lineHeight: 21,
		color: APP_COLORS.ink,
		textAlignVertical: 'top',
	},
	count: { fontSize: 11, lineHeight: 14, color: APP_COLORS.inkMuted, textAlign: 'right' },
})
