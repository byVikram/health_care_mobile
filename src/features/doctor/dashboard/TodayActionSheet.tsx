// src/features/doctor/dashboard/TodayActionSheet.tsx
//
// Schedule -> Today, the "more" (three dots) sheet of a patient row, from the "Doctor schedule" design:
//   menu        Reschedule / Cancel appointment
//   reschedule  a Day strip (today + the next four days), the free slots of that day, a note, one confirm button
//   cancel      a reason (radio list), a "patient is notified" note, Keep it / Cancel visit
// The free slots are the doctor's real availability for the chosen day (the same service the other schedule
// sheets use); today's list only offers the slots still ahead.

import React, { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { AppBottomSheet, AppPathIcon } from '../../../components/common'
import { APP_COLORS } from '../../../config/theme'
import { fullDayLabel } from '../../../utils/date'
import { getDoctorAvailability, type SlotGroup } from '../doctorService'
import { formatTime12h, normalizeAvailabilitySlots, toApiDate } from '../scheduleUtils'
import { isSlotBooked, isSlotSelectable } from '../../../utils/slots'

export type TodaySheetMode = 'menu' | 'resched' | 'cancel'

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
const BUSY_BG = '#F0F4F4'
const BUSY_INK = '#9AAFB2'
const DAYS_SHOWN = 5

type Props = {
	visible: boolean
	mode: TodaySheetMode
	patientName: string
	/** "Today, 5:30 PM · In-clinic" */
	slotLabel: string
	video: boolean
	doctorId?: string
	hospitalId?: string
	busy?: boolean
	onClose: () => void
	onModeChange: (mode: TodaySheetMode) => void
	onConfirmReschedule: (date: Date, startTime: string, endTime: string | null) => void
	onConfirmCancel: (reasonLabel: string) => void
}

const addDays = (d: Date, n: number) => {
	const c = new Date(d)
	c.setDate(c.getDate() + n)
	return c
}

export function TodayActionSheet({
	visible,
	mode,
	patientName,
	slotLabel,
	video,
	doctorId,
	hospitalId,
	busy = false,
	onClose,
	onModeChange,
	onConfirmReschedule,
	onConfirmCancel,
}: Props) {
	const days = useMemo(() => {
		const today = new Date()
		return Array.from({ length: DAYS_SHOWN }, (_, i) => addDays(today, i))
	}, [visible]) // eslint-disable-line react-hooks/exhaustive-deps -- a fresh strip each time the sheet opens
	const [dayIndex, setDayIndex] = useState(0)
	const [time, setTime] = useState<string | null>(null)
	const [slots, setSlots] = useState<SlotGroup[]>([])
	const [loading, setLoading] = useState(false)
	const [reasonId, setReasonId] = useState<string | null>(null)

	useEffect(() => {
		if (!visible) return
		setDayIndex(0)
		setTime(null)
		setReasonId(null)
	}, [visible])

	useEffect(() => {
		if (!visible || mode !== 'resched' || !doctorId || !hospitalId) return
		let mounted = true
		setLoading(true)
		setSlots([])
		;(async () => {
			try {
				const res = await getDoctorAvailability({ doctor_id: doctorId, hospital_id: hospitalId, date: toApiDate(days[dayIndex]) })
				if (mounted) setSlots(normalizeAvailabilitySlots(res, video ? 'video' : 'clinic'))
			} catch {
				// The empty state below says there is nothing to pick.
			} finally {
				if (mounted) setLoading(false)
			}
		})()
		return () => {
			mounted = false
		}
	}, [visible, mode, dayIndex, doctorId, hospitalId, video, days])

	const nowHm = new Date().toTimeString().slice(0, 8)
	const daySlots = slots
		.flatMap((g) => g.slots)
		.filter((s) => dayIndex > 0 || s.start_time > nowHm) // today: only what is still ahead
		.sort((a, b) => a.start_time.localeCompare(b.start_time))

	const chosenDay = days[dayIndex]
	const dayWord = dayIndex === 0 ? 'today' : fullDayLabel(chosenDay, { markToday: false })
	const title = mode === 'resched' ? 'Reschedule' : mode === 'cancel' ? 'Cancel appointment' : 'Appointment'
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
						'Move to a later slot today or another day',
						() => onModeChange('resched'),
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

			{mode === 'resched' && (
				<View style={styles.stack}>
					<View style={styles.block}>
						<Text style={styles.label}>Day</Text>
						<View style={styles.dayGrid}>
							{days.map((d, i) => {
								const on = i === dayIndex
								return (
									<TouchableOpacity
										key={i}
										accessibilityRole="button"
										accessibilityState={{ selected: on }}
										onPress={() => {
											setDayIndex(i)
											setTime(null)
										}}
										style={[styles.day, { borderColor: on ? APP_COLORS.primary : APP_COLORS.divider, backgroundColor: on ? APP_COLORS.primary : '#FFFFFF' }]}
									>
										<Text style={[styles.dayDow, { color: on ? '#FFFFFF' : APP_COLORS.ink }]}>
											{i === 0 ? 'Today' : d.toLocaleDateString('en-IN', { weekday: 'short' })}
										</Text>
										<Text style={[styles.dayDate, { color: on ? '#FFFFFF' : APP_COLORS.ink }]}>{d.getDate()}</Text>
									</TouchableOpacity>
								)
							})}
						</View>
					</View>

					<View style={styles.block}>
						<Text style={styles.label}>{dayIndex === 0 ? 'Free slots later today' : `Free slots · ${fullDayLabel(chosenDay, { markToday: false })}`}</Text>
						{loading ? (
							<ActivityIndicator color={APP_COLORS.primary} style={{ alignSelf: 'flex-start' }} />
						) : daySlots.length === 0 ? (
							<Text style={styles.empty}>{dayIndex === 0 ? 'No slots left today.' : 'No slots on this day.'} Try another day.</Text>
						) : (
							<View style={styles.slotGrid}>
								{daySlots.map((s) => {
									const busyNow = isSlotBooked(s) || !isSlotSelectable(s)
									const on = s.start_time === time
									const label = formatTime12h(s.start_time)
									return (
										<TouchableOpacity
											key={s.id ?? s.start_time}
											disabled={busyNow}
											accessibilityRole="button"
											accessibilityState={{ selected: on, disabled: busyNow }}
											onPress={() => setTime(s.start_time)}
											style={[
												styles.slot,
												{
													borderColor: on ? APP_COLORS.primary : APP_COLORS.divider,
													backgroundColor: on ? APP_COLORS.mint : busyNow ? BUSY_BG : '#FFFFFF',
												},
											]}
										>
											<Text style={[styles.slotText, { color: busyNow ? BUSY_INK : APP_COLORS.ink }, busyNow && styles.struck]}>{label}</Text>
										</TouchableOpacity>
									)
								})}
							</View>
						)}
					</View>

					<View style={styles.note}>
						<AppPathIcon d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 16v-4M12 8h.01" size={16} strokeWidth={2} color={APP_COLORS.primary} />
						<Text style={styles.noteText}>
							{patientName} gets an alert with the new time and can accept it or pick another.
						</Text>
					</View>

					<TouchableOpacity
						disabled={!time || busy}
						onPress={() => {
							if (!time) return
							const slot = daySlots.find((s) => s.start_time === time)
							onConfirmReschedule(chosenDay, time, slot?.end_time ?? null)
						}}
						style={[styles.cta, { backgroundColor: time ? APP_COLORS.primary : BUSY_INK }]}
					>
						{busy ? (
							<ActivityIndicator size="small" color="#FFFFFF" />
						) : (
							<Text style={styles.ctaText}>{time ? `Propose ${dayWord}, ${formatTime12h(time)}` : 'Pick a slot'}</Text>
						)}
					</TouchableOpacity>
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
	block: { gap: 6 },
	label: { fontSize: 13, lineHeight: 18, fontWeight: '800', color: APP_COLORS.ink },
	back: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginBottom: 10, minHeight: 36 },
	backText: { fontSize: 14, fontWeight: '700', color: APP_COLORS.ink },

	menu: { borderWidth: 1, borderColor: APP_COLORS.divider, borderRadius: 12, overflow: 'hidden' },
	menuRow: { minHeight: 60, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF' },
	menuRowRule: { borderBottomWidth: 1, borderBottomColor: '#E3EAEB' },
	menuIcon: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
	menuTitle: { fontSize: 15, lineHeight: 20, fontWeight: '800', color: APP_COLORS.ink },
	menuSub: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },

	dayGrid: { flexDirection: 'row', gap: 6 },
	day: { flex: 1, height: 56, borderWidth: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center', gap: 1 },
	dayDow: { fontSize: 11, lineHeight: 14, fontWeight: '700' },
	dayDate: { fontSize: 16, lineHeight: 20, fontWeight: '800' },
	slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
	slot: { width: '31.8%', height: 40, borderWidth: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
	slotText: { fontSize: 13, fontWeight: '700' },
	struck: { textDecorationLine: 'line-through' },
	empty: { fontSize: 13, lineHeight: 18, color: APP_COLORS.inkMuted },

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
