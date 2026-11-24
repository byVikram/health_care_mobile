// src/features/doctor/dashboard/TodayActionSheet.tsx
//
// Schedule, the "more" (three dots) sheet of an appointment row, from the "Doctor Dashboard NEW" design:
//   menu        "Appointment actions": Ask to reschedule / Refer to another doctor / Mark no-show / Cancel appointment
//   cancel      "Cancel appointment": the shared AppCancelSheet (a reason, an optional message to the patient, a "patient is
//               notified" notice, Cancel appointment / Keep appointment); the menu sheet slides away and it takes its place
//   no_show     "Mark as no-show?": how late the patient is and what happens; Mark no-show / Not yet. Only enabled from 60 minutes
//               after the start until 2 days after it; outside that window the control stays visible, disabled, with a short hint.
// "Ask to reschedule" does not pick a slot here: the doctor asks the patient to choose the new time, so the menu just hands over
// to the parent (onAskReschedule), which shows the Ask to reschedule sheet. Not drawn: "Call patient" (no phone number is sent).
// Built from the shared AppBottomSheet, AppButton, AppInfoBanner and AppCancelSheet (plus the doctor-side SheetMenu, SheetPatientCard).

import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import {
	AppBottomSheet,
	AppButton,
	AppCancelSheet,
	AppInfoBanner,
	type AppCancelResult,
} from '../../../components/common'
import { APP_COLORS, TONES } from '../../../config/theme'
import { RESCHEDULE_REASON_MAX_LENGTH } from '../doctorService'
import { composeReason, type ReasonOption } from '../components/ReasonPicker'
import { SheetMenu } from '../components/SheetMenu'
import { SheetPatientCard } from '../components/SheetPatientCard'

export type TodaySheetMode = 'menu' | 'cancel' | 'no_show'

export const TODAY_CANCEL_REASONS: ReasonOption[] = [
	{ id: 'emerg', label: 'I have an emergency' },
	{ id: 'late', label: 'I’m running too late' },
	{ id: 'pt', label: 'Patient asked to cancel' },
	{ id: 'other', label: 'Other reason' },
]

const SAND_INK = TONES.sand.ink

type Props = {
	visible: boolean
	mode: TodaySheetMode
	patientName: string
	/** "Today, Thu 25 Sep, 4:00 PM · In-clinic" */
	slotLabel: string
	video: boolean
	busy?: boolean
	onClose: () => void
	onModeChange: (mode: TodaySheetMode) => void
	/** The doctor chose Ask to reschedule: the patient picks the new time (no slot is chosen here). */
	onAskReschedule: () => void
	/** The doctor chose Refer to another doctor (opens the refer sheet). */
	onRefer: () => void
	/** Cancels with the reason as it is sent (the picked one, then the doctor's message) and returns how it went. */
	onConfirmCancel: (reason: string) => Promise<AppCancelResult>
	/** The no-show window is open (see noShowWindow in scheduleUtils). */
	noShowCanMark: boolean
	/** Why it is not open yet / any more ("Can be marked 1 hour after the start"); shown under the disabled control. */
	noShowHint: string
	/** "1h 30m late": how far past the slot the patient is, when they are. */
	lateLabel?: string
	/** Opened straight on the no-show step (from the Past list): no menu to go back to. */
	noShowOnly?: boolean
	onConfirmNoShow: () => void
	/** The server's reason when marking failed (a 400 with its message); shown in the sheet, since a toast would sit behind it. */
	noShowError?: string | null
}

export function TodayActionSheet({
	visible,
	mode,
	patientName,
	slotLabel,
	video,
	busy = false,
	onClose,
	onModeChange,
	onAskReschedule,
	onRefer,
	onConfirmCancel,
	noShowCanMark,
	noShowHint,
	lateLabel,
	noShowOnly = false,
	onConfirmNoShow,
	noShowError,
}: Props) {
	const title = mode === 'no_show' ? 'Mark as no-show?' : 'Appointment actions'
	const subtitle =
		mode === 'no_show' ? 'Confirm that the patient didn’t arrive' : 'Choose an action for this appointment'
	const back = noShowOnly ? onClose : () => onModeChange('menu')

	return (
		<>
			<AppBottomSheet
				visible={visible && mode !== 'cancel'}
				title={title}
				subtitle={subtitle}
				onClose={onClose}
				appearance="modern"
			>
				<View style={styles.stack}>
					<SheetPatientCard name={patientName} slotLabel={slotLabel} />

					{mode === 'menu' && (
						<SheetMenu
							rows={[
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
									icon: 'account-remove-outline',
									tile: TONES.sand.bg,
									ink: SAND_INK,
									title: 'Mark no-show',
									sub: noShowCanMark
										? lateLabel
											? `Patient is ${lateLabel}`
											: 'The patient did not come'
										: noShowHint,
									disabled: !noShowCanMark,
									onPress: () => onModeChange('no_show'),
								},
								{
									icon: 'calendar-remove-outline',
									tile: APP_COLORS.dangerBg,
									ink: APP_COLORS.danger,
									title: 'Cancel appointment',
									sub: 'Patient is notified and refunded',
									danger: true,
									onPress: () => onModeChange('cancel'),
								},
							]}
						/>
					)}

					{mode === 'no_show' && (
						<>
							{!!lateLabel && (
								<Text style={styles.lateLine}>
									{patientName} is {lateLabel}
								</Text>
							)}
							<AppInfoBanner
								tone="warning"
								icon="information-outline"
								title={`No-show can be marked 1 hour after the slot time. ${patientName} is emailed and can reply once with a reason. Missed appointments the patient cannot explain count towards pausing their online booking.`}
								titleStyle={styles.bannerText}
							/>
							{!noShowCanMark && !!noShowHint && <Text style={styles.hint}>{noShowHint}</Text>}
							{!!noShowError && (
								<Text style={[styles.hint, { color: APP_COLORS.danger }]}>{noShowError}</Text>
							)}
							<View style={{ gap: 8 }}>
								<AppButton
									size="lg"
									buttonColor={SAND_INK}
									softDisabled
									onPress={onConfirmNoShow}
									loading={busy}
									disabled={!noShowCanMark || busy}
								>
									Mark no-show
								</AppButton>
								<AppButton variant="outline" size="lg" onPress={back}>
									Not yet
								</AppButton>
							</View>
						</>
					)}
				</View>
			</AppBottomSheet>
			<AppCancelSheet
				visible={visible && mode === 'cancel'}
				title="Cancel appointment"
				subtitle="This can’t be undone."
				summary={{ title: patientName, line: slotLabel }}
				reasons={TODAY_CANCEL_REASONS.map((r) => r.label)}
				reasonRequired
				noteLabel="Message to patient"
				noteMaxLength={RESCHEDULE_REASON_MAX_LENGTH}
				notice={{
					tone: 'danger',
					text: `${patientName} is notified right away. ${
						video
							? 'The full fee is refunded to their payment method.'
							: 'Any advance paid is refunded in full.'
					}`,
				}}
				confirmLabel="Cancel appointment"
				successTitle="Appointment cancelled"
				successMessage={`${patientName} has been notified.`}
				onClose={onClose}
				onConfirm={(reason, note) =>
					onConfirmCancel(
						composeReason(
							TODAY_CANCEL_REASONS,
							TODAY_CANCEL_REASONS.find((r) => r.label === reason)?.id ?? null,
							note,
							RESCHEDULE_REASON_MAX_LENGTH
						)
					)
				}
			/>
		</>
	)
}

const styles = StyleSheet.create({
	stack: { gap: 16 },
	lateLine: { fontSize: 16, lineHeight: 22, fontWeight: '800', color: APP_COLORS.ink },
	hint: { fontSize: 13, lineHeight: 18, fontWeight: '700', color: APP_COLORS.inkMuted },
	// The shared banner's title is a bold coloured line; these notes are ordinary sentences.
	bannerText: { fontSize: 13, lineHeight: 19, fontWeight: '400', color: APP_COLORS.ink },
})
