// src/features/appointment/components/patient-details/RescheduleSheet.tsx
//
// "Reschedule appointment" / "Reschedule video call" sheet (design 7 / 7a):
// current slot struck through, 7-day date strip, grouped time slots, and a
// "Confirm · {day}, {time}" footer. Slots come from getDoctorAvailability
// (normalised with RescheduleModal's normaliser); submit uses
// rescheduleAppointment -- same payload as RescheduleModal.

import React, { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { AppBottomSheet, AppButton, DateStrip, SlotChipGrid, type SlotChipItem } from '../../../../components/common'
import { APPOINTMENT_STATUS } from '../../../../constants/constants'
import {
	getDoctorAvailability,
	getDoctorById,
	rescheduleAppointment,
	type SlotGroup,
	type TimeSlot,
} from '../../../doctor/doctorService'
import { APP_COLORS } from '../../../../config/theme'
import { normalizeAvailabilitySlots } from '../RescheduleModal'
import { formatDateForApi, monthRangeLabel, nextDays, parseDateOnly, relativeDayLabel } from '../../../../utils/date'
import { formatTimeSlot } from '../../../../utils/formatters'

const COLS = 3

type RescheduleSheetProps = {
	visible: boolean
	appointmentId: string
	doctorId?: string | null
	hospitalId?: string | null
	isVideo: boolean
	/** Current slot, used for the struck-through "Current" row and the "· now" slot. */
	currentDate?: string | null
	currentStart?: string | null
	title: string
	subtitle: string
	note: string
	onClose: () => void
	onRescheduled: () => void
}

const hhmm = (t?: string | null) => (t ?? '').slice(0, 5)

export default function RescheduleSheet({
	visible,
	appointmentId,
	doctorId,
	hospitalId,
	isVideo,
	currentDate,
	currentStart,
	title,
	subtitle,
	note,
	onClose,
	onRescheduled,
}: RescheduleSheetProps) {
	const [days, setDays] = useState<Date[]>(() => nextDays())
	const [dayIdx, setDayIdx] = useState(0)
	const [selected, setSelected] = useState<TimeSlot | null>(null)
	const [groups, setGroups] = useState<SlotGroup[]>([])
	const [loading, setLoading] = useState(false)
	const [loadError, setLoadError] = useState(false)
	const [submitting, setSubmitting] = useState(false)
	const [resolvedHospitalId, setResolvedHospitalId] = useState<string | null>(hospitalId ?? null)

	const currentDay = parseDateOnly(currentDate)
	const currentKey = currentDay ? formatDateForApi(currentDay) : ''

	// Reset each time the sheet opens -- start on the current appointment's day if it's in the strip.
	useEffect(() => {
		if (!visible) return
		const fresh = nextDays()
		setDays(fresh)
		const idx = fresh.findIndex((d) => formatDateForApi(d) === currentKey)
		setDayIdx(idx >= 0 ? idx : 0)
		setSelected(null)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [visible])

	// Video bookings may carry no hospital -- fall back to the doctor's first hospital (as RescheduleModal does).
	useEffect(() => {
		if (!visible) return
		if (hospitalId) {
			setResolvedHospitalId(hospitalId)
			return
		}
		if (!doctorId) return
		let mounted = true
		const fetchDoctorHospital = async () => {
			try {
				const res = await getDoctorById(doctorId)
				const first = res?.data?.hospitals?.[0]?.hospital?.id
				if (mounted && first) setResolvedHospitalId(first)
			} catch (error) {
				console.log('[RescheduleSheet] fetch doctor hospitals error:', error)
			}
		}
		fetchDoctorHospital()
		return () => {
			mounted = false
		}
	}, [visible, hospitalId, doctorId])

	const activeDay = days[dayIdx]
	const activeKey = activeDay ? formatDateForApi(activeDay) : ''

	useEffect(() => {
		if (!visible || !doctorId || !resolvedHospitalId || !activeKey) return
		let mounted = true
		setLoading(true)
		setLoadError(false)
		setGroups([])
		setSelected(null)
		const fetchSlots = async () => {
			try {
				const res = await getDoctorAvailability({
					doctor_id: doctorId,
					hospital_id: resolvedHospitalId,
					date: activeKey,
				})
				if (mounted) setGroups(normalizeAvailabilitySlots(res, isVideo ? 'video' : 'clinic'))
			} catch (error) {
				console.log('[RescheduleSheet] fetch slots error:', error)
				if (mounted) setLoadError(true)
			} finally {
				if (mounted) setLoading(false)
			}
		}
		fetchSlots()
		return () => {
			mounted = false
		}
	}, [visible, doctorId, resolvedHospitalId, activeKey, isVideo])

	const nowMinutes = useMemo(() => {
		const n = new Date()
		return n.getHours() * 60 + n.getMinutes()
	}, [visible, activeKey]) // eslint-disable-line react-hooks/exhaustive-deps

	const isToday = dayIdx === 0
	const visibleGroups = groups.filter((g) => g.slots.length > 0)
	const currentLabel = currentDay
		? `${relativeDayLabel(currentDay)}${currentStart ? `, ${formatTimeSlot(currentStart)}` : ''}`
		: '—'
	const btnLabel =
		selected && activeDay
			? `Confirm · ${relativeDayLabel(activeDay)}, ${formatTimeSlot(selected.start_time)}`
			: 'Select a new time'
	const canConfirm = !!selected && !submitting && !!resolvedHospitalId

	const handleConfirm = async () => {
		if (!selected || !resolvedHospitalId || submitting) return
		setSubmitting(true)
		try {
			const res = await rescheduleAppointment({
				appointment_id: appointmentId,
				appointment_date: activeKey,
				start_time: selected.start_time,
				end_time: selected.end_time ?? null,
				hospital_id: resolvedHospitalId,
				reason: 'Patient requested reschedule',
				status_id: APPOINTMENT_STATUS.CONFIRM,
			})
			if (res?.success) {
				onRescheduled()
			} else {
				Alert.alert('Error', res?.message || 'Reschedule failed. Please try again.')
			}
		} catch (error: any) {
			console.log('[RescheduleSheet] reschedule error:', error?.response?.data || error?.message || error)
			Alert.alert('Error', 'Something went wrong. Please try again.')
		} finally {
			setSubmitting(false)
		}
	}

	const toSlotItems = (slots: TimeSlot[]): SlotChipItem[] =>
		slots.map((slot) => {
			const start = hhmm(slot.start_time)
			const [h, m] = start.split(':').map(Number)
			const isCurrent = activeKey === currentKey && start === hhmm(currentStart)
			const isPast = isToday && h * 60 + m <= nowMinutes
			const off = isCurrent || isPast || slot.status !== 'AVAILABLE'
			const label = formatTimeSlot(slot.start_time)
			return {
				value: slot.start_time,
				label: isCurrent ? `${label} · now` : label,
				// The current slot is greyed but not struck through; other unavailable slots are struck.
				disabled: isCurrent,
				struck: off && !isCurrent,
				accessibilityLabel: `${label}${isCurrent ? ', your current slot' : off ? ', unavailable' : ''}`,
			}
		})

	const confirmBlocked = !selected || !resolvedHospitalId

	return (
		<AppBottomSheet
			appearance="modern"
			showHeaderDivider={false}
			visible={visible}
			title={title}
			subtitle={subtitle}
			// AppBottomSheet always animates itself closed before calling onClose, so a no-op here
			// would desync it from `visible`; an in-flight reschedule still resolves via onRescheduled.
			onClose={onClose}
			dismissible={!submitting}
			maxHeightRatio={0.92}
			footer={
				// Only greyed when there is nothing to confirm; while submitting the handler guards re-entry.
				<AppButton
					size="lg"
					onPress={handleConfirm}
					disabled={confirmBlocked}
					loading={submitting}
					accessibilityState={{ disabled: !canConfirm }}
					style={confirmBlocked ? styles.confirmBtnDisabled : undefined}
					labelStyle={styles.confirmText}
				>
					{btnLabel}
				</AppButton>
			}
		>
			<View style={styles.body}>
				<View style={styles.currentRow}>
					<Text style={styles.currentTag}>Current</Text>
					<Text style={styles.currentValue}>{currentLabel}</Text>
				</View>

				<View style={styles.block}>
					<View style={styles.dateHead}>
						<Text style={styles.blockTitle}>Pick a new date</Text>
						<Text style={styles.monthLabel}>{monthRangeLabel(days)}</Text>
					</View>
					{!!activeDay && (
						<DateStrip
							variant="grid"
							strikeDisabled
							dayCount={days.length}
							selectedDate={activeDay}
							onSelectDate={(d) => {
								const idx = days.findIndex((day) => formatDateForApi(day) === formatDateForApi(d))
								if (idx >= 0) setDayIdx(idx)
							}}
						/>
					)}
				</View>

				{loading ? (
					<View style={styles.stateBox}>
						<ActivityIndicator color={APP_COLORS.primary} />
					</View>
				) : loadError ? (
					<Text style={styles.stateText}>Couldn’t load slots. Try another date.</Text>
				) : visibleGroups.length === 0 ? (
					<Text style={styles.stateText}>No slots on this day. Try another date.</Text>
				) : (
					visibleGroups.map((g, gi) => (
						<View key={`${g.label}-${gi}`} style={styles.block}>
							<Text style={styles.groupLabel}>{g.label}</Text>
							<SlotChipGrid
								columns={COLS}
								slots={toSlotItems(g.slots)}
								selectedValue={selected?.start_time ?? null}
								onSelectValue={(value) =>
									setSelected(g.slots.find((s) => s.start_time === value) ?? null)
								}
							/>
						</View>
					))
				)}

				<View style={styles.noteRow}>
					<MaterialCommunityIcons name="shield-check-outline" size={16} color={APP_COLORS.primary} />
					<Text style={styles.noteText}>{note}</Text>
				</View>
			</View>
		</AppBottomSheet>
	)
}

const styles = StyleSheet.create({
	// AppBottomSheet supplies the 16px side padding and bottom padding above the footer.
	body: { gap: 14 },
	currentRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		paddingVertical: 10,
		paddingHorizontal: 12,
		borderRadius: 12,
		backgroundColor: APP_COLORS.pageBg,
	},
	currentTag: { fontSize: 13, lineHeight: 18, fontWeight: '600', color: APP_COLORS.inkMuted },
	currentValue: {
		flex: 1,
		fontSize: 13,
		lineHeight: 18,
		fontWeight: '700',
		color: APP_COLORS.inkMuted,
		textDecorationLine: 'line-through',
	},
	block: { gap: 8 },
	dateHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
	blockTitle: { fontSize: 15, lineHeight: 20, fontWeight: '800', color: APP_COLORS.ink },
	monthLabel: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
	groupLabel: { fontSize: 13, lineHeight: 18, fontWeight: '700', color: APP_COLORS.inkMuted },
	stateBox: { paddingVertical: 16, alignItems: 'center' },
	stateText: { paddingVertical: 8, textAlign: 'center', fontSize: 14, lineHeight: 20, color: APP_COLORS.inkMuted },
	noteRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
	noteText: { flex: 1, fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
	// Overrides Paper's disabled palette so the blocked CTA keeps the design's grey fill + white label.
	confirmBtnDisabled: { backgroundColor: APP_COLORS.inkDisabled },
	confirmText: { fontWeight: '700', color: '#FFFFFF' },
})
