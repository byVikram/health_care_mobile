// src/features/ancillary/staff/schedule/RunningLateSheet.tsx
//
// "Running late?": the nurse picks about how many minutes and the PATIENT is told (POST /provider/me/visits/{id}/running-late: a push with
// her name and the minutes, nothing else). The care team still gets the visit issue it always got. The sheet owns the call, so the
// Schedule's ⋮ menu and the visit screen share it. Only before she arrives, and on the visit's day (the server checks both).
import React, { useEffect, useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import Toast from 'react-native-toast-message'
import { AppBottomSheet, AppButton } from '../../../../components/common'
import { APP_COLORS } from '../../../../config/theme'
import { extractApiErrorMessage } from '../../ancillaryService'
import { reportRunningLate, reportVisitIssue } from '../../providerVisitService'
import { todayIso } from './scheduleModel'

/** Choices of "about how many minutes" (the server accepts 5 to 120). */
export const RUNNING_LATE_MINUTES = [10, 15, 20, 30, 45]

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
	const [busy, setBusy] = useState(false)
	const first = patientName.split(' ')[0] || 'the patient'

	useEffect(() => {
		if (visible) setMinutes(RUNNING_LATE_MINUTES[0])
	}, [visible])

	const confirm = async () => {
		if (busy) return
		setBusy(true)
		try {
			await reportRunningLate(visitId, minutes)
			// The care team keeps hearing about it as before; a note that cannot be saved is not worth failing for.
			await reportVisitIssue(visitId, 'RUNNING_LATE', `Running about ${minutes} min late`, {
				silent: true,
			}).catch(() => undefined)
			Toast.show({ type: 'success', text1: `${first} knows you’re about ${minutes} min late` })
			onDone?.()
			onClose()
		} catch (e) {
			Toast.show({
				type: 'error',
				text1: 'Could not tell the patient',
				text2: extractApiErrorMessage(e, 'Please try again.'),
			})
		} finally {
			setBusy(false)
		}
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
				<View style={styles.footer}>
					<AppButton variant="outline" size="lg" style={styles.back} onPress={onClose} disabled={busy}>
						Back
					</AppButton>
					<AppButton
						size="lg"
						style={styles.confirm}
						loading={busy}
						disabled={busy}
						onPress={() => void confirm()}
					>
						{`Tell ${first} · ${minutes} min`}
					</AppButton>
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
						const on = m === minutes
						return (
							<TouchableOpacity
								key={m}
								onPress={() => setMinutes(m)}
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
				</View>

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
	info: { padding: 10, paddingHorizontal: 12, borderRadius: 10, backgroundColor: APP_COLORS.mint },
	infoText: { fontSize: 12, lineHeight: 17, color: APP_COLORS.ink },
	footer: { flexDirection: 'row', gap: 8 },
	back: { flex: 1 },
	confirm: { flex: 1.8 },
})
