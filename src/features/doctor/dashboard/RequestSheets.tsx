// src/features/doctor/dashboard/RequestSheets.tsx
//
// The sheets of the Booking requests page, from the "Doctor Dashboard NEW" design:
//   RequestActionsSheet   the card's three-dots menu: Accept / Ask to reschedule / Refer to another doctor / Decline
//   DeclineRequestSheet   "Decline request" on the shared AppCancelSheet: a reason (one of them is "Refer to another doctor", which
//                         carries on to the refer sheet), an optional note, the red Decline request button
// "Ask for another time" and "Refer to another doctor" are the one DoctorActionSheet (components/DoctorActionSheet.tsx).
// Built from the shared AppBottomSheet, AppCancelSheet and AppTag.

import React, { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { AppBottomSheet, AppCancelSheet, type AppCancelResult, AppTag } from '../../../components/common'
import { APP_COLORS, TONES } from '../../../config/theme'
import { composeReason, type ReasonOption } from '../components/ReasonPicker'
import { SheetMenu } from '../components/SheetMenu'

const REASON_MAX = 500

/** The strip under a request sheet's title: the patient, "Today, 8:00 PM · 70 yrs · Male", and the Red flag tag. */
function RequestStrip({ name, line, flag }: { name: string; line: string; flag: boolean }) {
	return (
		<View style={styles.strip}>
			<View style={{ flex: 1, minWidth: 0 }}>
				<Text style={styles.stripName}>{name}</Text>
				<Text style={styles.stripLine} numberOfLines={1}>
					{line}
				</Text>
			</View>
			{flag && <AppTag label="Red flag" tone="cancelled" />}
		</View>
	)
}

type Who = { name: string; line: string; flag: boolean }

// ── the three-dots menu ────────────────────────────────────────────────────────────────────────────

export function RequestActionsSheet({
	visible,
	who,
	onClose,
	onAccept,
	onAskReschedule,
	onRefer,
	onDecline,
}: {
	visible: boolean
	who: Who
	onClose: () => void
	onAccept: () => void
	onAskReschedule: () => void
	onRefer: () => void
	onDecline: () => void
}) {
	return (
		<AppBottomSheet
			visible={visible}
			title="Appointment actions"
			subtitle="Choose an action for this appointment"
			onClose={onClose}
			appearance="modern"
		>
			<View style={{ gap: 16 }}>
				<RequestStrip {...who} />
				<SheetMenu
					rows={[
						{
							icon: 'check',
							tile: APP_COLORS.successBg,
							ink: APP_COLORS.success,
							title: 'Accept',
							sub: 'Confirm the booking · patient is notified',
							onPress: onAccept,
						},
						{
							icon: 'calendar-clock-outline',
							tile: TONES.sky.bg,
							ink: TONES.sky.ink,
							title: 'Ask to reschedule',
							sub: 'Patient picks a new slot',
							onPress: onAskReschedule,
						},
						{
							icon: 'arrow-right',
							tile: TONES.lilac.bg,
							ink: TONES.lilac.ink,
							title: 'Refer to another doctor',
							sub: 'Send to a specialist who can see them',
							onPress: onRefer,
						},
						{
							icon: 'calendar-remove-outline',
							tile: APP_COLORS.dangerBg,
							ink: APP_COLORS.danger,
							title: 'Decline',
							sub: 'Patient is told why',
							danger: true,
							onPress: onDecline,
						},
					]}
				/>
			</View>
		</AppBottomSheet>
	)
}

// ── decline ────────────────────────────────────────────────────────────────────────────────────────

export const DECLINE_REASONS: ReasonOption[] = [
	{ id: 'spec', label: 'Not my speciality' },
	{ id: 'refer', label: 'Refer to another doctor' },
	{ id: 'emerg', label: 'Needs emergency care, not a clinic visit' },
	{ id: 'full', label: 'Fully booked that day' },
	{ id: 'other', label: 'Other reason' },
]

export function DeclineRequestSheet({
	visible,
	who,
	firstName,
	onClose,
	onDecline,
	onDeclined,
	onChooseDoctor,
}: {
	visible: boolean
	who: Who
	firstName: string
	onClose: () => void
	/** Declines with the reason as sent (the picked one, then the note) and returns how it went. */
	onDecline: (reason: string) => Promise<AppCancelResult>
	/** The confirmation was closed: the request is handled, refresh the list. */
	onDeclined: () => void
	/** "Refer to another doctor" was picked: carry on to the refer sheet. */
	onChooseDoctor: () => void
}) {
	const [reason, setReason] = useState<string | null>(null)
	const refer = reason === DECLINE_REASONS.find((r) => r.id === 'refer')?.label

	return (
		<AppCancelSheet
			visible={visible}
			title="Decline request"
			subtitle={`${firstName} will be told and can book another doctor.`}
			reasons={DECLINE_REASONS.map((r) => r.label)}
			reasonRequired
			onReasonChange={setReason}
			noteLabel="Message to patient"
			noteMaxLength={REASON_MAX}
			notice={{
				tone: 'info',
				text: refer
					? `Next, pick the doctor. ${firstName} gets their profile and can book directly.`
					: `${firstName} is notified with your reason.`,
			}}
			confirmLabel={refer ? 'Choose a doctor' : 'Decline request'}
			confirmTone={refer ? 'primary' : 'danger'}
			successTitle="Request declined"
			successMessage={`${firstName} has been told and can book another doctor.`}
			onClose={onClose}
			onDone={onDeclined}
			onConfirm={async (picked, note) => {
				if (refer) {
					onChooseDoctor()
					return { ok: true, carryOn: true }
				}
				return onDecline(
					composeReason(
						DECLINE_REASONS,
						DECLINE_REASONS.find((r) => r.label === picked)?.id ?? null,
						note,
						REASON_MAX
					)
				)
			}}
		>
			<RequestStrip {...who} />
		</AppCancelSheet>
	)
}

const styles = StyleSheet.create({
	strip: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		padding: 12,
		borderRadius: 12,
		backgroundColor: APP_COLORS.pageBg,
	},
	stripName: { fontSize: 16, lineHeight: 22, fontWeight: '800', color: APP_COLORS.ink },
	stripLine: { fontSize: 13, lineHeight: 18, color: APP_COLORS.inkMuted },
})
