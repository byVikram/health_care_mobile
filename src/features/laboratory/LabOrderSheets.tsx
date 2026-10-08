// src/features/laboratory/LabOrderSheets.tsx
//
// The two bottom sheets on the Lab order screen: "Cancel this order?" (reasons, "Reschedule instead", Keep it /
// Yes, cancel) and "Reschedule pickup" (current slot struck through, a 7-day strip, pickup windows and a
// "Confirm · day, time" footer), both on the shared AppCancelSheet / AppRescheduleSheet that the patient
// appointment sheets use too. The actions are local (mock) -- there is no lab order API behind this flow yet.

import React, { useEffect, useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import {
	AppCancelSheet,
	AppRescheduleGroup,
	AppRescheduleSheet,
	SlotChipGrid,
	type SlotChipItem,
} from '../../components/common'
import { APP_COLORS } from '../../config/theme'
import { addDays, commaDate, dayNum, dowShort, monShort, toIso } from './labFormat'
import { CANCEL_REASONS, RESCHEDULE_DAY_COUNT, RESCHEDULE_PICKUP_WINDOWS } from './labMock'

// ---------------------------------------------------------------------------------------------------------
// Cancel
// ---------------------------------------------------------------------------------------------------------

type CancelProps = {
	visible: boolean
	/** "Your ₹1,998 will be refunded to your UPI". */
	subtitle: string
	onClose: () => void
	onRescheduleInstead: () => void
	onCancelled: () => void
}

export function LabCancelSheet({ visible, subtitle, onClose, onRescheduleInstead, onCancelled }: CancelProps) {
	return (
		<AppCancelSheet
			visible={visible}
			title="Cancel this order?"
			subtitle={subtitle}
			reasons={CANCEL_REASONS}
			onClose={onClose}
			onRescheduleInstead={onRescheduleInstead}
			onConfirm={() => onCancelled()}
		/>
	)
}

// ---------------------------------------------------------------------------------------------------------
// Reschedule
// ---------------------------------------------------------------------------------------------------------

export type LabPickup = { date: string; time: string }

type RescheduleProps = {
	visible: boolean
	/** "Home sample collection · 2 tests". */
	subtitle: string
	current: LabPickup
	onClose: () => void
	onConfirm: (next: LabPickup) => void
}

export function LabRescheduleSheet({ visible, subtitle, current, onClose, onConfirm }: RescheduleProps) {
	const days = Array.from({ length: RESCHEDULE_DAY_COUNT }, (_, i) => toIso(addDays(new Date(), i + 1)))
	const [dayIdx, setDayIdx] = useState(0)
	const [time, setTime] = useState<string | null>(null)

	useEffect(() => {
		if (!visible) return
		const idx = days.indexOf(current.date)
		setDayIdx(idx >= 0 ? idx : 0)
		setTime(null)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [visible])

	const day = days[dayIdx]
	const slots: SlotChipItem[] = RESCHEDULE_PICKUP_WINDOWS.map((t, ti) => {
		const isCurrent = day === current.date && t === current.time
		const busy = !isCurrent && (dayIdx * 3 + ti * 5 + 'Morning pickup windows'.length) % 6 === 0
		return {
			value: t,
			label: isCurrent ? `${t} · now` : t,
			disabled: isCurrent,
			struck: busy,
			accessibilityLabel: `${t}${isCurrent ? ', your current slot' : busy ? ', booked' : ''}`,
		}
	})
	const first = monShort(days[0])
	const last = monShort(days[days.length - 1])

	return (
		<AppRescheduleSheet
			visible={visible}
			title="Reschedule pickup"
			subtitle={subtitle}
			currentLabel={`${commaDate(current.date)}, ${current.time}`}
			monthLabel={last !== first ? `${first} – ${last}` : first}
			dateSection={
				<View style={styles.dayRow}>
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
								<Text style={[styles.dayDow, { color: on ? '#FFFFFF' : APP_COLORS.ink }]}>
									{dowShort(d)}
								</Text>
								<Text style={[styles.dayNum, { color: on ? '#FFFFFF' : APP_COLORS.ink }]}>
									{dayNum(d)}
								</Text>
							</TouchableOpacity>
						)
					})}
				</View>
			}
			note="Free to reschedule. Fasting tests work best in a morning slot."
			confirmLabel={time ? `Confirm · ${commaDate(day)}, ${time}` : 'Select a new time'}
			confirmDisabled={!time}
			onConfirm={() => time && onConfirm({ date: day, time })}
			onClose={onClose}
		>
			<AppRescheduleGroup label="Morning pickup windows">
				<SlotChipGrid columns={2} slots={slots} selectedValue={time} onSelectValue={setTime} />
			</AppRescheduleGroup>
		</AppRescheduleSheet>
	)
}

const styles = StyleSheet.create({
	dayRow: { flexDirection: 'row', gap: 4 },
	dayCell: {
		flex: 1,
		minWidth: 0,
		height: 56,
		borderRadius: 12,
		borderWidth: 1,
		alignItems: 'center',
		justifyContent: 'center',
		gap: 2,
	},
	dayDow: { fontSize: 11, lineHeight: 14, fontWeight: '600' },
	dayNum: { fontSize: 17, lineHeight: 22, fontWeight: '800' },
})
