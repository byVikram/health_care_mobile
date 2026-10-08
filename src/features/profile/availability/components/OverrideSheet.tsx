// Add / edit a date override: pick a date (next 3 weeks), then "Unavailable all day" / "On leave" or
// "Different hours" (Morning / Afternoon / Evening ranges that replace that day's weekly hours), and an
// optional note (ancillary only -- the doctor backend has no note on overrides).

import React, { useEffect, useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { AppBottomSheet, AppButton, AppFormField, AppInfoBanner, AppRadioCard } from '../../../../components/common'
import { APP_COLORS } from '../../../../config/theme'
import {
	DAY_SHORT,
	dayRanges,
	emptyDay,
	rangeError,
	sectionForStart,
	SECTION_KEYS,
	toIsoDate,
	upcomingDates,
	type DateOverride,
	type DaySections as DaySectionsValue,
} from '../availabilityUtils'
import { DaySections } from './DaySections'

export type OverrideSheetProps = {
	visible: boolean
	onClose: () => void
	/** Editing an existing date; null = add. */
	initial: DateOverride | null
	/** Dates that already have an override (can't add a second one). */
	takenDates: string[]
	offLabel: string
	subtitle: string
	allowNote: boolean
	/** Confirmed visits already booked per date (YYYY-MM-DD): shows a warning when the date has some. */
	bookedByDate?: Record<string, number>
	onSave: (o: Pick<DateOverride, 'date' | 'off' | 'ranges' | 'note'>) => Promise<void>
}

const toDay = (o: DateOverride | null): DaySectionsValue => {
	const day = emptyDay()
	for (const r of o?.ranges ?? []) day[sectionForStart(r.start)].push(r)
	return day
}

export function OverrideSheet({
	visible,
	onClose,
	initial,
	takenDates,
	offLabel,
	subtitle,
	allowNote,
	bookedByDate,
	onSave,
}: OverrideSheetProps) {
	const dates = upcomingDates(21)
	const [date, setDate] = useState('')
	const [off, setOff] = useState(true)
	const [day, setDay] = useState<DaySectionsValue>(emptyDay())
	const [note, setNote] = useState('')
	const [saving, setSaving] = useState(false)

	useEffect(() => {
		if (!visible) return
		const firstFree = dates.map(toIsoDate).find((d) => !takenDates.includes(d)) ?? toIsoDate(dates[0])
		setDate(initial?.date ?? firstFree)
		setOff(initial ? initial.off : true)
		setDay(toDay(initial))
		setNote(initial?.note ?? '')
	}, [visible])

	const booked = bookedByDate?.[date] ?? 0
	const hasErrors = SECTION_KEYS.some((k) => day[k].some((_, i) => rangeError(day, k, i) !== null))
	const canSave = !!date && (off || (dayRanges(day).length > 0 && !hasErrors)) && !saving

	const save = async () => {
		setSaving(true)
		try {
			await onSave({ date, off, ranges: off ? [] : dayRanges(day), note: note.trim() || undefined })
		} finally {
			setSaving(false)
		}
	}

	return (
		<AppBottomSheet
			visible={visible}
			onClose={onClose}
			title={initial ? 'Edit date override' : 'Add date override'}
			subtitle={subtitle}
			appearance="modern"
			showHeaderDivider={false}
			dismissible={!saving}
			maxHeightRatio={0.92}
			footer={
				<AppButton variant="primary" size="lg" softDisabled onPress={save} disabled={!canSave} loading={saving}>
					Save override
				</AppButton>
			}
		>
			<View style={styles.body}>
				<Text style={styles.label}>Date</Text>
				<ScrollView
					horizontal
					showsHorizontalScrollIndicator={false}
					contentContainerStyle={styles.dates}
					accessibilityRole="radiogroup"
				>
					{dates.map((d) => {
						const iso = toIsoDate(d)
						const taken = takenDates.includes(iso) && iso !== initial?.date
						const sel = iso === date
						return (
							<TouchableOpacity
								key={iso}
								onPress={() => setDate(iso)}
								disabled={taken || !!initial}
								style={[
									styles.date,
									sel && styles.dateSel,
									(taken || (!!initial && !sel)) && styles.dateDisabled,
								]}
								accessibilityRole="radio"
								accessibilityState={{ checked: sel, disabled: taken }}
								accessibilityLabel={d.toDateString()}
							>
								<Text style={[styles.dow, sel && styles.textSel]}>{DAY_SHORT[d.getDay()]}</Text>
								<Text style={[styles.num, sel && styles.textSel]}>{d.getDate()}</Text>
							</TouchableOpacity>
						)
					})}
				</ScrollView>

				<Text style={styles.label}>On this date</Text>
				<View style={styles.modes}>
					<AppRadioCard
						title={offLabel}
						subtitle="No bookings on this date"
						selected={off}
						onPress={() => setOff(true)}
					/>
					<AppRadioCard
						title="Different hours"
						subtitle="Replace this day’s weekly hours"
						selected={!off}
						onPress={() => setOff(false)}
					/>
				</View>

				{booked > 0 && (
					<AppInfoBanner
						tone="warning"
						icon="alert-outline"
						title={`${booked} booked visit${booked > 1 ? 's' : ''} on this date`}
						subtitle="Already booked visits stay. This only stops new bookings, so cancel or reschedule them from Bookings."
					/>
				)}

				{!off && (
					<>
						<Text style={styles.label}>Hours for this date</Text>
						<DaySections day={day} onChange={setDay} />
					</>
				)}

				{allowNote && (
					<AppFormField
						label="Note"
						optional
						value={note}
						onChangeText={setNote}
						placeholder="e.g. Conference, family function"
						maxLength={120}
					/>
				)}
			</View>
		</AppBottomSheet>
	)
}

const styles = StyleSheet.create({
	body: {
		gap: 10,
		paddingBottom: 8,
	},
	label: {
		fontSize: 13,
		lineHeight: 18,
		fontWeight: '700',
		color: APP_COLORS.ink,
	},
	dates: {
		gap: 6,
	},
	date: {
		width: 48,
		height: 56,
		borderRadius: 12,
		borderWidth: 1.5,
		borderColor: APP_COLORS.divider,
		alignItems: 'center',
		justifyContent: 'center',
	},
	dateSel: {
		backgroundColor: APP_COLORS.primary,
		borderColor: APP_COLORS.primary,
	},
	dateDisabled: {
		opacity: 0.4,
	},
	dow: {
		fontSize: 11,
		lineHeight: 14,
		fontWeight: '600',
		color: APP_COLORS.inkMuted,
	},
	num: {
		fontSize: 17,
		lineHeight: 22,
		fontWeight: '800',
		color: APP_COLORS.ink,
	},
	textSel: {
		color: '#FFFFFF',
	},
	modes: {
		gap: 8,
	},
})

export default OverrideSheet
