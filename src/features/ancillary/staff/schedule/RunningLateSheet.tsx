// src/features/ancillary/staff/schedule/RunningLateSheet.tsx
//
// "Running late?": the nurse picks about how many minutes (a chip, or "Other" for any 5 to 120) and the PATIENT is told
// (POST /provider/me/visits/{id}/running-late: a push with her name and the minutes, nothing else; the minutes are also kept on the
// visit, so the patient's screen can say "about 20 min late"). The care team still gets the visit issue it always got. The sheet owns the
// call, so the Schedule's ⋮ menu, Today's Up next card and the visit screen share it. Only before she arrives, and on the visit's day
// (the server checks both); the server also allows one message every few minutes (409 RUNNING_LATE_COOLDOWN): that sentence shows inside
// the sheet, in red above the buttons, like every other error from inside a sheet.
import React, { useEffect, useState } from 'react'
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import Toast from 'react-native-toast-message'
import { AppBottomSheet, AppButton } from '../../../../components/common'
import { APP_COLORS } from '../../../../config/theme'
import { extractApiErrorMessage } from '../../ancillaryService'
import { reportRunningLate, reportVisitIssue } from '../../providerVisitService'
import { todayIso } from './scheduleModel'

/** Choices of "about how many minutes". */
export const RUNNING_LATE_MINUTES = [10, 15, 20, 30, 45]
/** What the server accepts. */
export const RUNNING_LATE_MIN = 5
export const RUNNING_LATE_MAX = 120

/** Visit statuses from which she can say she is late: confirmed or on the way, not yet arrived. */
const LATE_STATUS = /^(SCHEDULED_CONFIRMED|ASSIGNED|NURSE_ASSIGNED|EN_ROUTE)$/

/** She can tell the patient she is late for a visit that is due today (an instant one always is) and not yet arrived. */
export const canReportRunningLate = (status: string, date?: string | null) =>
	LATE_STATUS.test((status || '').toUpperCase()) && (!date || date === todayIso())

type Props = {
	visible: boolean
	visitId: string
	/** "Asha R." */
	patientName: string
	/** "10:00 AM · Wound dressing" under the name. */
	line?: string
	onClose: () => void
	/** After the patient was told. */
	onDone?: () => void
}

export function RunningLateSheet({ visible, visitId, patientName, line, onClose, onDone }: Props) {
	const [minutes, setMinutes] = useState(RUNNING_LATE_MINUTES[0])
	/** "Other": the minutes are typed (digits only). */
	const [custom, setCustom] = useState<string | null>(null)
	const [busy, setBusy] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const first = patientName.split(' ')[0] || 'the patient'

	useEffect(() => {
		if (!visible) return
		setMinutes(RUNNING_LATE_MINUTES[0])
		setCustom(null)
		setError(null)
	}, [visible])

	const typed = custom === null ? null : Number(custom)
	const chosen = typed === null ? minutes : typed
	const valid = typed === null || (Number.isInteger(typed) && typed >= RUNNING_LATE_MIN && typed <= RUNNING_LATE_MAX)

	const confirm = async () => {
		if (busy || !valid) return
		setBusy(true)
		setError(null)
		try {
			await reportRunningLate(visitId, chosen)
		} catch (e) {
			setError(extractApiErrorMessage(e, 'Could not tell the patient. Please try again.'))
			setBusy(false)
			return
		}
		// The care team keeps hearing about it as before; a note that cannot be saved is not worth failing for.
		try {
			await reportVisitIssue(visitId, 'RUNNING_LATE', `Running about ${chosen} min late`, { silent: true })
		} catch {
			// not worth stopping for: the patient has been told
		}
		Toast.show({ type: 'success', text1: `${first} knows you’re about ${chosen} min late` })
		setBusy(false)
		onDone?.()
		onClose()
	}

	return (
		<AppBottomSheet
			visible={visible}
			title="Running late?"
			subtitle={`We’ll tell ${first} you need a few more minutes.`}
			onClose={onClose}
			appearance="modern"
			showHeaderDivider={false}
			dismissible={!busy}
			footer={
				<View style={styles.footerWrap}>
					{error ? (
						<Text accessibilityLiveRegion="polite" style={styles.error}>
							{error}
						</Text>
					) : null}
					<View style={styles.footer}>
						<AppButton variant="outline" size="lg" style={styles.back} onPress={onClose} disabled={busy}>
							Back
						</AppButton>
						<AppButton
							size="lg"
							style={styles.confirm}
							loading={busy}
							disabled={busy || !valid}
							onPress={() => void confirm()}
						>
							{`Tell ${first} · ${valid ? chosen : '?'} min`}
						</AppButton>
					</View>
				</View>
			}
		>
			<View style={styles.body}>
				<View style={styles.who}>
					<Text style={styles.whoName}>{patientName}</Text>
					{!!line && <Text style={styles.whoLine}>{line}</Text>}
				</View>

				<Text style={styles.label}>About how late?</Text>
				<View accessibilityRole="radiogroup" accessibilityLabel="Minutes late" style={styles.chips}>
					{RUNNING_LATE_MINUTES.map((m) => {
						const on = custom === null && m === minutes
						return (
							<TouchableOpacity
								key={m}
								onPress={() => {
									setMinutes(m)
									setCustom(null)
									setError(null)
								}}
								disabled={busy}
								activeOpacity={0.8}
								accessibilityRole="radio"
								accessibilityState={{ checked: on }}
								style={[styles.chip, on && styles.chipOn]}
							>
								<Text style={[styles.chipText, on && styles.chipTextOn]}>{`${m} min`}</Text>
							</TouchableOpacity>
						)
					})}
					<TouchableOpacity
						onPress={() => {
							setCustom(custom ?? '')
							setError(null)
						}}
						disabled={busy}
						activeOpacity={0.8}
						accessibilityRole="radio"
						accessibilityState={{ checked: custom !== null }}
						style={[styles.chip, custom !== null && styles.chipOn]}
					>
						<Text style={[styles.chipText, custom !== null && styles.chipTextOn]}>Other</Text>
					</TouchableOpacity>
				</View>

				{custom !== null && (
					<View style={styles.customRow}>
						<TextInput
							value={custom}
							onChangeText={(text) => {
								setCustom(text.replace(/[^0-9]/g, '').slice(0, 3))
								setError(null)
							}}
							editable={!busy}
							keyboardType="number-pad"
							maxLength={3}
							placeholder={`${RUNNING_LATE_MIN} to ${RUNNING_LATE_MAX}`}
							placeholderTextColor={APP_COLORS.inkMuted}
							accessibilityLabel="Minutes late"
							style={[styles.customInput, !valid && styles.customInputBad]}
						/>
						<Text style={styles.customUnit}>minutes</Text>
					</View>
				)}
				{custom !== null && !valid && (
					<Text style={styles.hint}>{`Enter a number from ${RUNNING_LATE_MIN} to ${RUNNING_LATE_MAX}.`}</Text>
				)}

				<View style={styles.info}>
					<Text style={styles.infoText}>
						{`${first} gets a notification with your name and the minutes. Nothing else is shared.`}
					</Text>
				</View>
			</View>
		</AppBottomSheet>
	)
}

const styles = StyleSheet.create({
	body: { gap: 12 },
	who: { padding: 12, borderRadius: 12, backgroundColor: APP_COLORS.pageBg },
	whoName: { fontSize: 15, lineHeight: 20, fontWeight: '700', color: APP_COLORS.ink },
	whoLine: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
	label: { fontSize: 13, fontWeight: '800', color: APP_COLORS.ink },
	chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
	chip: {
		minHeight: 44,
		minWidth: 76,
		paddingHorizontal: 14,
		borderRadius: 12,
		borderWidth: 1.5,
		borderColor: APP_COLORS.divider,
		backgroundColor: APP_COLORS.surface,
		alignItems: 'center',
		justifyContent: 'center',
	},
	chipOn: { borderColor: APP_COLORS.primary, backgroundColor: '#F0F7F7' },
	chipText: { fontSize: 14, fontWeight: '700', color: APP_COLORS.ink },
	chipTextOn: { color: APP_COLORS.primary },
	customRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
	customInput: {
		width: 120,
		minHeight: 44,
		paddingHorizontal: 14,
		borderRadius: 12,
		borderWidth: 1.5,
		borderColor: APP_COLORS.primary,
		backgroundColor: APP_COLORS.surface,
		fontSize: 16,
		fontWeight: '700',
		color: APP_COLORS.ink,
	},
	customInputBad: { borderColor: APP_COLORS.danger },
	customUnit: { fontSize: 14, color: APP_COLORS.inkMuted },
	hint: { fontSize: 12, lineHeight: 16, color: APP_COLORS.danger },
	info: { padding: 10, paddingHorizontal: 12, borderRadius: 10, backgroundColor: APP_COLORS.mint },
	infoText: { fontSize: 12, lineHeight: 17, color: APP_COLORS.ink },
	footerWrap: { gap: 8 },
	error: { fontSize: 13, lineHeight: 18, fontWeight: '600', color: APP_COLORS.danger },
	footer: { flexDirection: 'row', gap: 8 },
	back: { flex: 1 },
	confirm: { flex: 1.8 },
})
