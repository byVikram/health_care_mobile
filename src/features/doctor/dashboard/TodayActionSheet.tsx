// src/features/doctor/dashboard/TodayActionSheet.tsx
//
// Schedule -> Today, the "more" (three dots) sheet of a patient row, from the "Doctor schedule" design:
//   menu        Reschedule / Cancel appointment
//   cancel      a reason (radio list), a "patient is notified" note, Keep it / Cancel visit
// "Reschedule" does not pick a slot here: the doctor asks the patient to choose the new time, so the row just
// hands over to the parent (onAskReschedule), which shows the "Ask the patient to reschedule?" confirmation.

import React, { useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { AppBottomSheet, AppPathIcon } from '../../../components/common'
import { APP_COLORS } from '../../../config/theme'

export type TodaySheetMode = 'menu' | 'cancel'

export const TODAY_CANCEL_REASONS = [
	{ id: 'emerg', label: 'I have an emergency' },
	{ id: 'late', label: 'Running too late to see this patient' },
	{ id: 'pt', label: 'Patient asked to cancel' },
	{ id: 'other', label: 'Other reason' },
]

const BLUE = '#2463A8'
const BLUE_TILE = '#DDEBFA'
const DANGER = '#B42318'
const DANGER_TILE = '#FDECEA'
const DANGER_INK = '#8A1C12'

type Props = {
	visible: boolean
	mode: TodaySheetMode
	patientName: string
	/** "Today, 5:30 PM · In-clinic" */
	slotLabel: string
	video: boolean
	busy?: boolean
	onClose: () => void
	onModeChange: (mode: TodaySheetMode) => void
	/** The doctor chose Reschedule: ask the patient to pick the new time (no slot is chosen here). */
	onAskReschedule: () => void
	onConfirmCancel: (reasonLabel: string) => void
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
	onConfirmCancel,
}: Props) {
	const [reasonId, setReasonId] = useState<string | null>(null)

	useEffect(() => {
		if (!visible) return
		setReasonId(null)
	}, [visible])

	const title = mode === 'cancel' ? 'Cancel appointment' : 'Appointment'
	const subtitle = `${patientName} · ${slotLabel}`

	const row = (iconPath: string, tile: string, ink: string, heading: string, sub: string, onPress: () => void, last = false) => (
		<TouchableOpacity
			onPress={onPress}
			accessibilityRole="button"
			style={[styles.menuRow, !last && styles.menuRowRule]}
			activeOpacity={0.7}
		>
			<View style={[styles.menuIcon, { backgroundColor: tile }]}>
				<AppPathIcon d={iconPath} size={18} strokeWidth={2} color={ink} />
			</View>
			<View style={styles.flex}>
				<Text style={[styles.menuTitle, ink === DANGER && { color: DANGER }]}>{heading}</Text>
				<Text style={styles.menuSub}>{sub}</Text>
			</View>
			<AppPathIcon d="M9 6l6 6-6 6" size={16} strokeWidth={2.4} color="#7A8B8E" />
		</TouchableOpacity>
	)

	return (
		<AppBottomSheet visible={visible} title={title} subtitle={subtitle} onClose={onClose} appearance="modern">
			{mode !== 'menu' && (
				<TouchableOpacity onPress={() => onModeChange('menu')} accessibilityRole="button" accessibilityLabel="Back" style={styles.back}>
					<AppPathIcon d="M15 6l-6 6 6 6" size={18} strokeWidth={2.2} color={APP_COLORS.ink} />
					<Text style={styles.backText}>Back</Text>
				</TouchableOpacity>
			)}

			{mode === 'menu' && (
				<View style={styles.menu}>
					{row(
						'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4M12 13v3l2 1',
						BLUE_TILE,
						BLUE,
						'Reschedule',
						'Ask the patient to choose a new time',
						onAskReschedule,
					)}
					{row(
						'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4M10 13l4 4M14 13l-4 4',
						DANGER_TILE,
						DANGER,
						'Cancel appointment',
						'Patient is notified and refunded',
						() => onModeChange('cancel'),
						true,
					)}
				</View>
			)}

			{mode === 'cancel' && (
				<View style={styles.stack}>
					<Text style={styles.label}>Reason</Text>
					<View style={styles.reasons} accessibilityRole="radiogroup">
						{TODAY_CANCEL_REASONS.map((r) => {
							const on = r.id === reasonId
							return (
								<TouchableOpacity
									key={r.id}
									accessibilityRole="radio"
									accessibilityState={{ checked: on }}
									onPress={() => setReasonId(r.id)}
									style={[styles.reason, { borderColor: on ? APP_COLORS.primary : APP_COLORS.divider, backgroundColor: on ? APP_COLORS.mint : '#FFFFFF' }]}
								>
									<View style={[styles.ring, { borderColor: on ? APP_COLORS.primary : '#7A8B8E' }]}>
										<View style={[styles.dot, { backgroundColor: on ? APP_COLORS.primary : 'transparent' }]} />
									</View>
									<Text style={styles.reasonText}>{r.label}</Text>
								</TouchableOpacity>
							)
						})}
					</View>
					<View style={[styles.note, { backgroundColor: DANGER_TILE }]}>
						<AppPathIcon d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 8v4M12 16h.01" size={16} strokeWidth={2} color={DANGER} />
						<Text style={[styles.noteText, { color: DANGER_INK }]}>
							{patientName} is notified right away. {video ? 'The full fee is refunded to their payment method.' : 'Any advance paid is refunded in full.'}
						</Text>
					</View>
					<View style={styles.pair}>
						<TouchableOpacity onPress={() => onModeChange('menu')} style={[styles.cta, styles.keep]}>
							<Text style={[styles.ctaText, { color: APP_COLORS.ink }]}>Keep it</Text>
						</TouchableOpacity>
						<TouchableOpacity
							disabled={!reasonId || busy}
							onPress={() => {
								const r = TODAY_CANCEL_REASONS.find((x) => x.id === reasonId)
								if (r) onConfirmCancel(r.label)
							}}
							style={[styles.cta, styles.flex, { backgroundColor: reasonId ? DANGER : '#D9A39C' }]}
						>
							{busy ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.ctaText}>Cancel visit</Text>}
						</TouchableOpacity>
					</View>
				</View>
			)}
		</AppBottomSheet>
	)
}

const styles = StyleSheet.create({
	flex: { flex: 1 },
	stack: { gap: 14 },
	label: { fontSize: 13, lineHeight: 18, fontWeight: '800', color: APP_COLORS.ink },
	back: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginBottom: 10, minHeight: 36 },
	backText: { fontSize: 14, fontWeight: '700', color: APP_COLORS.ink },

	menu: { borderWidth: 1, borderColor: APP_COLORS.divider, borderRadius: 12, overflow: 'hidden' },
	menuRow: { minHeight: 60, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF' },
	menuRowRule: { borderBottomWidth: 1, borderBottomColor: '#E3EAEB' },
	menuIcon: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
	menuTitle: { fontSize: 15, lineHeight: 20, fontWeight: '800', color: APP_COLORS.ink },
	menuSub: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },

	note: { flexDirection: 'row', gap: 8, padding: 10, paddingHorizontal: 12, borderRadius: 8, backgroundColor: APP_COLORS.pageBg },
	noteText: { flex: 1, fontSize: 12, lineHeight: 17, color: APP_COLORS.inkMuted },
	cta: { height: 50, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
	ctaText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
	pair: { flexDirection: 'row', gap: 8 },
	keep: { flex: 1, borderWidth: 1, borderColor: APP_COLORS.divider, backgroundColor: '#FFFFFF' },

	reasons: { gap: 6 },
	reason: { minHeight: 46, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 10 },
	ring: { width: 18, height: 18, borderRadius: 9999, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
	dot: { width: 8, height: 8, borderRadius: 9999 },
	reasonText: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: '700', color: APP_COLORS.ink },
})
