// src/features/doctor/components/AskPatientRescheduleSheet.tsx
//
// A doctor does not pick a new slot when rescheduling: they ask the PATIENT to choose one ("Doctor Dashboard NEW"). Two looks of
// the same sheet:
//   appointment  "Ask to reschedule", from a booked appointment: the patient and slot, "Select a reason", an optional message,
//                what will happen, "Send reschedule request" / "Keep appointment"
//   request      "Ask for another time", from a booking request: the patient strip, its own reasons, "Send to patient"
// The caller makes the call (askPatientToReschedule in doctorService) and closes it.

import React, { useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { AppBottomSheet, AppButton, AppInfoBanner } from '../../../components/common'
import { APP_COLORS } from '../../../config/theme'
import { RESCHEDULE_REASON_MAX_LENGTH } from '../doctorService'
import { composeReason, ReasonPicker, type ReasonOption } from './ReasonPicker'
import { SheetPatientCard } from './SheetPatientCard'

export const RESCHEDULE_REASONS: ReasonOption[] = [
	{ id: 'emerg', label: 'I have an emergency' },
	{ id: 'late', label: 'Running late at the hospital' },
	{ id: 'report', label: 'Need a test report first' },
	{ id: 'other', label: 'Other reason' },
]

export const REQUEST_RESCHEDULE_REASONS: ReasonOption[] = [
	{ id: 'na', label: 'Not available at this time' },
	{ id: 'taken', label: 'Slot already taken' },
	{ id: 'long', label: 'Needs a longer appointment' },
	{ id: 'other', label: 'Other reason' },
]

type Props = {
	visible: boolean
	/** 'appointment' (default) or 'request' (the Booking requests menu). */
	variant?: 'appointment' | 'request'
	patientName: string
	/** "Today, Thu 25 Sep, 4:00 PM · In-clinic" -- the slot being given up. */
	slotLabel?: string
	onClose: () => void
	/** Resolves when the call is done; the sheet shows a spinner until then. The reason is the picked one, then the note. */
	onConfirm: (reason: string) => void | Promise<void>
}

export function AskPatientRescheduleSheet({
	visible,
	variant = 'appointment',
	patientName,
	slotLabel,
	onClose,
	onConfirm,
}: Props) {
	const request = variant === 'request'
	const reasons = request ? REQUEST_RESCHEDULE_REASONS : RESCHEDULE_REASONS
	const first = patientName.split(' ')[0]
	const [reasonId, setReasonId] = useState<string | null>(reasons[0].id)
	const [note, setNote] = useState('')
	const [busy, setBusy] = useState(false)

	useEffect(() => {
		if (!visible) return
		setReasonId(reasons[0].id)
		setNote('')
	}, [visible, reasons])

	const send = async () => {
		if (busy) return
		setBusy(true)
		try {
			await onConfirm(composeReason(reasons, reasonId, note, RESCHEDULE_REASON_MAX_LENGTH))
		} finally {
			setBusy(false)
		}
	}

	return (
		<AppBottomSheet
			visible={visible}
			title={request ? 'Ask for another time' : 'Ask to reschedule'}
			subtitle={
				request
					? `You won’t pick the time. ${first} chooses a new slot from your open ones.`
					: 'The patient picks a new slot that suits them'
			}
			onClose={onClose}
			appearance="modern"
		>
			<View style={{ gap: 16 }}>
				<SheetPatientCard name={patientName} slotLabel={slotLabel} />
				<ReasonPicker
					options={reasons}
					value={reasonId}
					onChange={setReasonId}
					note={note}
					onNoteChange={setNote}
					noteMaxLength={RESCHEDULE_REASON_MAX_LENGTH}
					notePlaceholder={request ? 'e.g. Evenings after 6 PM work best this week' : 'Add a short note'}
				/>
				<AppInfoBanner
					tone="info"
					icon={null}
					title={
						request
							? `The request shows as Reschedule requested until ${first} picks a slot. It then comes back here to confirm.`
							: `${patientName} is emailed right away and asked to choose a new time. You'll be asked to confirm the time they pick.`
					}
					titleStyle={styles.bannerText}
				/>
				<View style={{ gap: 8 }}>
					<AppButton size="lg" onPress={send} loading={busy} disabled={busy || !reasonId}>
						{request ? 'Send to patient' : 'Send reschedule request'}
					</AppButton>
					{!request && (
						<AppButton variant="outline" size="lg" onPress={onClose} disabled={busy}>
							Keep appointment
						</AppButton>
					)}
				</View>
			</View>
		</AppBottomSheet>
	)
}

export default AskPatientRescheduleSheet

const styles = StyleSheet.create({
	// The shared banner's title is a bold coloured line; these notes are ordinary sentences.
	bannerText: { fontSize: 14, lineHeight: 20, fontWeight: '400', color: APP_COLORS.ink },
})
