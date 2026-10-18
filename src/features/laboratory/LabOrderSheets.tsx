// src/features/laboratory/LabOrderSheets.tsx
//
// The two bottom sheets on the Lab order screen: "Cancel this order?" (reasons, "Reschedule instead", Keep it /
// Yes, cancel) and "Reschedule" (current slot struck through, a 14-day strip and that day's real free times at the
// order's lab, "Confirm · day, time"), both on the shared AppCancelSheet / AppRescheduleSheet that the patient
// appointment sheets use too. Both call our API (/api/laboratory/orders/{id}/cancel | reschedule | slots).

import React, { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import Toast from 'react-native-toast-message'
import {
	AppCancelSheet,
	AppRescheduleGroup,
	AppRescheduleSheet,
	SlotChipGrid,
	type SlotChipItem,
} from '../../components/common'
import { APP_COLORS } from '../../config/theme'
import { addDays, commaDate, dayNum, dowShort, monShort, timeLabel, toIso } from './labFormat'
import { CANCEL_REASONS } from './labMock'
import {
	cancelOrder,
	fetchOrderSlots,
	labErrorMessage,
	rescheduleOrder,
	type ApiOrder,
} from './labService'

const DAY_COUNT = 14

const PARTS: { label: string; from: number; to: number }[] = [
	{ label: 'Morning', from: 0, to: 12 },
	{ label: 'Afternoon', from: 12, to: 17 },
	{ label: 'Evening', from: 17, to: 24 },
]

const hourOf = (hhmm: string) => Number(hhmm.split(':')[0])

// ---------------------------------------------------------------------------------------------------------
// Cancel
// ---------------------------------------------------------------------------------------------------------

type CancelProps = {
	visible: boolean
	orderId: string
	subtitle: string
	canReschedule: boolean
	onClose: () => void
	onRescheduleInstead: () => void
	/** The order as the server now has it (cancelled, or cancellation requested). */
	onCancelled: (order: ApiOrder) => void
}

export function LabCancelSheet({ visible, orderId, subtitle, canReschedule, onClose, onRescheduleInstead, onCancelled }: CancelProps) {
	const [busy, setBusy] = useState(false)

	const confirm = async (reason: string | null) => {
		setBusy(true)
		try {
			onCancelled(await cancelOrder(orderId, reason))
		} catch (e) {
			Toast.show({ type: 'error', text1: 'Couldn’t cancel the order', text2: labErrorMessage(e) })
		} finally {
			setBusy(false)
		}
	}

	return (
		<AppCancelSheet
			visible={visible}
			title="Cancel this order?"
			subtitle={subtitle}
			reasons={CANCEL_REASONS}
			busy={busy}
			onClose={onClose}
			onRescheduleInstead={canReschedule ? onRescheduleInstead : onClose}
			onConfirm={(reason) => void confirm(reason)}
		/>
	)
}

// ---------------------------------------------------------------------------------------------------------
// Reschedule
// ---------------------------------------------------------------------------------------------------------

export type LabPickup = { date: string; time: string }

type RescheduleProps = {
	visible: boolean
	orderId: string
	/** "Home sample collection · 2 tests". */
	subtitle: string
	/** The current slot; `time` is a display label ("9:00 AM"). */
	current: LabPickup
	onClose: () => void
	/** The order as the server now has it. */
	onRescheduled: (order: ApiOrder) => void
}

export function LabRescheduleSheet({ visible, orderId, subtitle, current, onClose, onRescheduled }: RescheduleProps) {
	const days = useMemo(() => Array.from({ length: DAY_COUNT }, (_, i) => toIso(addDays(new Date(), i))), [visible])
	const [dayIdx, setDayIdx] = useState(0)
	const [time, setTime] = useState<string | null>(null)
	const [times, setTimes] = useState<string[]>([])
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [tick, setTick] = useState(0)
	const [busy, setBusy] = useState(false)

	useEffect(() => {
		if (!visible) return
		const idx = days.indexOf(current.date)
		setDayIdx(idx >= 0 ? idx : 0)
		setTime(null)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [visible])

	const day = days[dayIdx]

	useEffect(() => {
		setTimes([])
		setError(null)
		if (!visible) return
		let active = true
		const load = async () => {
			setLoading(true)
			try {
				const t = await fetchOrderSlots(orderId, day)
				if (active) setTimes(t)
			} catch (e) {
				if (active) setError(labErrorMessage(e))
			} finally {
				if (active) setLoading(false)
			}
		}
		void load()
		return () => {
			active = false
		}
	}, [visible, orderId, day, tick])

	const confirm = async () => {
		if (!time) return
		setBusy(true)
		try {
			onRescheduled(await rescheduleOrder(orderId, day, time))
		} catch (e) {
			Toast.show({ type: 'error', text1: 'Couldn’t reschedule', text2: labErrorMessage(e) })
			setTick((n) => n + 1) // the time may have just gone: reload the free ones
			setTime(null)
		} finally {
			setBusy(false)
		}
	}

	const first = monShort(days[0])
	const last = monShort(days[days.length - 1])
	const currentLabel = `${commaDate(current.date)}, ${current.time}`

	return (
		<AppRescheduleSheet
			visible={visible}
			title="Reschedule"
			subtitle={subtitle}
			currentLabel={currentLabel}
			monthLabel={last !== first ? `${first} – ${last}` : first}
			dateSection={
				<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayRow}>
					{days.map((d, i) => {
						const on = i === dayIdx
						return (
							<TouchableOpacity
								key={d}
								style={[
									styles.dayCell,
									{
										backgroundColor: on ? APP_COLORS.primary : '#FFFFFF',
										borderColor: on ? APP_COLORS.primary : APP_COLORS.border,
									},
								]}
								onPress={() => {
									setDayIdx(i)
									setTime(null)
								}}
								accessibilityRole="button"
								accessibilityState={{ selected: on }}
								accessibilityLabel={commaDate(d)}
							>
								<Text style={[styles.dayDow, { color: on ? '#FFFFFF' : APP_COLORS.ink }]}>{dowShort(d)}</Text>
								<Text style={[styles.dayNum, { color: on ? '#FFFFFF' : APP_COLORS.ink }]}>{dayNum(d)}</Text>
							</TouchableOpacity>
						)
					})}
				</ScrollView>
			}
			note="Same lab, a new time. Fasting tests work best in a morning slot."
			confirmLabel={time ? `Confirm · ${commaDate(day)}, ${timeLabel(time)}` : 'Select a new time'}
			confirmDisabled={!time}
			busy={busy}
			onConfirm={() => void confirm()}
			onClose={onClose}
		>
			{loading && <ActivityIndicator color={APP_COLORS.primary} />}
			{!!error && (
				<Text style={styles.empty} onPress={() => setTick((n) => n + 1)}>
					{`${error} Tap to try again.`}
				</Text>
			)}
			{!loading && !error && times.length === 0 && <Text style={styles.empty}>No free times on this day.</Text>}
			{PARTS.map((p) => {
				const inPart = times.filter((t) => hourOf(t) >= p.from && hourOf(t) < p.to)
				if (inPart.length === 0) return null
				const slots: SlotChipItem[] = inPart.map((t) => {
					const isCurrent = day === current.date && timeLabel(t) === current.time
					return {
						value: t,
						label: isCurrent ? `${timeLabel(t)} · now` : timeLabel(t),
						disabled: isCurrent,
						accessibilityLabel: `${timeLabel(t)}${isCurrent ? ', your current slot' : ''}`,
					}
				})
				return (
					<AppRescheduleGroup key={p.label} label={p.label}>
						<SlotChipGrid columns={2} slots={slots} selectedValue={time} onSelectValue={setTime} />
					</AppRescheduleGroup>
				)
			})}
		</AppRescheduleSheet>
	)
}

const styles = StyleSheet.create({
	dayRow: { gap: 6 },
	dayCell: {
		width: 52,
		height: 56,
		borderRadius: 12,
		borderWidth: 1,
		alignItems: 'center',
		justifyContent: 'center',
		gap: 2,
	},
	dayDow: { fontSize: 11, lineHeight: 14, fontWeight: '600' },
	dayNum: { fontSize: 17, lineHeight: 22, fontWeight: '800' },
	empty: { marginVertical: 12, textAlign: 'center', fontSize: 14, color: APP_COLORS.inkMuted },
})
