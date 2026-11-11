// src/features/laboratory/LabSlotPicker.tsx
//
// "Lab and time" shown straight on the Cart (home collection and in-clinic alike): the labs that can do the whole
// cart (the cheapest is pre-selected, each with its logo and total), a 14-day date strip and the selected lab's
// real slots grouped morning / afternoon / evening. Tapping a slot stores the lab, slot and that lab's prices in
// the booking store. Labs come from the cart's /quote call; slots from /api/laboratory/slots, which also carries
// each lab's logo.

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { AppButton, AppTag, SlotChipGrid, type SlotChipItem } from '../../components/common'
import { APP_COLORS } from '../../config/theme'
import { labBooking, needsFasting, useLabBooking } from './labBookingStore'
import { addDays, commaDate, dayNum, dowShort, inr, monShort, timeLabel, toIso } from './labFormat'
import { LabLogo } from './LabLogo'
import { fetchSlots, labErrorMessage, type ApiQuoteLab, type LabServiceType } from './labService'

const DAY_COUNT = 14

const PARTS: { label: string; from: number; to: number }[] = [
	{ label: 'Morning', from: 0, to: 12 },
	{ label: 'Afternoon', from: 12, to: 17 },
	{ label: 'Evening', from: 17, to: 24 },
]

const hourOf = (hhmm: string) => Number(hhmm.split(':')[0])

type Props = {
	/** The labs that can do the whole cart for the chosen service, cheapest first. */
	labs: ApiQuoteLab[]
	service: LabServiceType
}

export function LabSlotPicker({ labs, service }: Props) {
	const booking = useLabBooking()
	const { addressId, cart } = booking
	const cartKey = cart.join(',')
	const days = useMemo(() => Array.from({ length: DAY_COUNT }, (_, i) => toIso(addDays(new Date(), i))), [])

	const saved = booking.lab
	const [labId, setLabId] = useState<number | null>(saved?.id ?? labs[0]?.lab_id ?? null)
	const [dayIdx, setDayIdx] = useState(() => Math.max(0, days.indexOf(booking.slot?.date ?? '')))
	const [timesByLab, setTimesByLab] = useState<Record<number, string[]>>({})
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [tick, setTick] = useState(0)
	// Logos seen so far (LabStack sends a lab's logo with its slots): they stay across days.
	const logos = useRef<Record<number, string>>({})
	const [, bump] = useState(0)

	// Keep the selection valid when the labs change (other cart / address / visit type).
	useEffect(() => {
		setLabId((cur) => (cur != null && labs.some((l) => l.lab_id === cur) ? cur : (labs[0]?.lab_id ?? null)))
	}, [labs])

	useEffect(() => {
		setTimesByLab({})
		setError(null)
		if (!addressId || !cartKey || labs.length === 0) return
		let active = true
		const load = async () => {
			setLoading(true)
			try {
				const res = await fetchSlots({ addressId, itemIds: cartKey.split(','), date: days[dayIdx], service })
				if (!active) return
				const next: Record<number, string[]> = {}
				res.labs.forEach((l) => {
					next[l.lab_id] = l.times
					if (l.logo_url) logos.current[l.lab_id] = l.logo_url
				})
				setTimesByLab(next)
				bump((n) => n + 1)
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
	}, [addressId, cartKey, service, dayIdx, days, labs.length, tick])

	// Tomorrow's slots too, only to learn the logos of labs with no slot left today.
	useEffect(() => {
		if (!addressId || !cartKey || labs.length === 0 || dayIdx !== 0) return
		let active = true
		const load = async () => {
			try {
				const res = await fetchSlots({ addressId, itemIds: cartKey.split(','), date: days[1], service })
				if (!active) return
				res.labs.forEach((l) => {
					if (l.logo_url && !logos.current[l.lab_id]) logos.current[l.lab_id] = l.logo_url
				})
				bump((n) => n + 1)
			} catch {
				// Logos are cosmetic: the lab icon stands in.
			}
		}
		void load()
		return () => {
			active = false
		}
	}, [addressId, cartKey, service, dayIdx, days, labs.length])

	const lab = labs.find((l) => l.lab_id === labId)
	const times = labId != null ? (timesByLab[labId] ?? []) : []
	const slot = booking.slot
	const selectedTime = booking.lab?.id === labId && slot?.date === days[dayIdx] ? slot.time : null

	const pickSlot = (time: string) => {
		if (!lab) return
		const lineAmounts: Record<string, { price: number; mrp: number }> = {}
		lab.items.forEach((i) => {
			lineAmounts[i.item_id] = { price: Number(i.price), mrp: Number(i.mrp) }
		})
		labBooking.set({
			lab: { id: lab.lab_id, name: lab.lab_name ?? 'Lab', logoUrl: lab.logo_url ?? logos.current[lab.lab_id] ?? null, distanceKm: null },
			slot: { date: days[dayIdx], time },
			lineAmounts,
			quoteTotal: Number(lab.total),
		})
	}

	if (labs.length === 0) return null

	return (
		<View style={styles.body}>
			<View style={styles.section}>
				<Text style={styles.sectionLabel}>{labs.length > 1 ? 'Choose a lab · cheapest first' : 'Lab'}</Text>
				{labs.map((l) => {
					const on = l.lab_id === labId
					const mrp = Number(l.total_mrp)
					const total = Number(l.total)
					return (
						<TouchableOpacity
							key={l.lab_id}
							style={[styles.labRow, on && styles.labRowOn]}
							activeOpacity={0.85}
							onPress={() => setLabId(l.lab_id)}
							accessibilityRole="radio"
							accessibilityState={{ checked: on }}
							accessibilityLabel={`${l.lab_name ?? 'Lab'}, ${inr(total)}`}
						>
							<LabLogo uri={l.logo_url ?? logos.current[l.lab_id]} size={44} />
							<View style={styles.flex}>
								<Text style={styles.labName} numberOfLines={1}>
									{l.lab_name ?? 'Lab'}
								</Text>
								{l.tat_hours != null && (
									<AppTag label={`Reports in ${l.tat_hours} hrs`} bg="#DDEBFA" ink="#2463A8" size="xs" />
								)}
							</View>
							<View style={styles.priceCol}>
								<Text style={styles.price}>{inr(total)}</Text>
								{mrp > total && <Text style={styles.mrp}>{inr(mrp)}</Text>}
							</View>
							<MaterialCommunityIcons
								name={on ? 'radiobox-marked' : 'radiobox-blank'}
								size={22}
								color={on ? APP_COLORS.primary : APP_COLORS.border}
							/>
						</TouchableOpacity>
					)
				})}
			</View>

			<View style={styles.section}>
				<Text style={styles.sectionLabel}>Date</Text>
				<ScrollView
					horizontal
					showsHorizontalScrollIndicator={false}
					contentContainerStyle={styles.dayRow}
					accessibilityRole="radiogroup"
					accessibilityLabel="Date"
				>
					{days.map((d, i) => {
						const on = i === dayIdx
						return (
							<TouchableOpacity
								key={d}
								style={[
									styles.dayCell,
									{
										backgroundColor: on ? APP_COLORS.primary : '#FFFFFF',
										borderColor: on ? APP_COLORS.primary : '#B9CACB',
									},
								]}
								onPress={() => setDayIdx(i)}
								accessibilityRole="radio"
								accessibilityState={{ checked: on }}
								accessibilityLabel={commaDate(d)}
							>
								<Text style={[styles.dayDow, { color: on ? '#FFFFFF' : APP_COLORS.ink }]}>
									{i === 0 ? 'Today' : dowShort(d)}
								</Text>
								<Text style={[styles.dayNum, { color: on ? '#FFFFFF' : APP_COLORS.ink }]}>{dayNum(d)}</Text>
								<Text style={[styles.dayMon, { color: on ? '#FFFFFF' : APP_COLORS.ink }]}>{monShort(d)}</Text>
							</TouchableOpacity>
						)
					})}
				</ScrollView>
			</View>

			{needsFasting(booking) && (
				<View style={styles.fastNote} accessibilityRole="text">
					<Text style={styles.fastNoteText}>Fasting tests: a morning slot is best.</Text>
				</View>
			)}

			{loading && <ActivityIndicator color={APP_COLORS.primary} />}

			{!!error && (
				<View style={styles.errorBox}>
					<Text style={styles.empty}>{error}</Text>
					<AppButton size="md" onPress={() => setTick((n) => n + 1)}>
						Try again
					</AppButton>
				</View>
			)}

			{!loading && !error && times.length === 0 && (
				<Text style={styles.empty}>No slots on this day for this lab. Try another date.</Text>
			)}

			{PARTS.map((p) => {
				const inPart = times.filter((t) => hourOf(t) >= p.from && hourOf(t) < p.to)
				if (inPart.length === 0) return null
				const slots: SlotChipItem[] = inPart.map((t) => ({ value: t, label: timeLabel(t) }))
				return (
					<View key={p.label} style={styles.section}>
						<Text style={styles.sectionLabel}>{p.label}</Text>
						<SlotChipGrid columns={3} slots={slots} selectedValue={selectedTime} onSelectValue={pickSlot} />
					</View>
				)
			})}
		</View>
	)
}

const styles = StyleSheet.create({
	body: { gap: 16 },
	flex: { flex: 1, minWidth: 0, gap: 4, alignItems: 'flex-start' },
	section: { gap: 8 },
	sectionLabel: { fontSize: 13, lineHeight: 18, fontWeight: '800', color: APP_COLORS.ink },
	empty: { marginVertical: 12, textAlign: 'center', fontSize: 14, color: APP_COLORS.inkMuted },
	errorBox: { alignItems: 'center', gap: 8 },
	labRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		padding: 12,
		borderRadius: 14,
		borderWidth: 1,
		borderColor: APP_COLORS.divider,
		backgroundColor: '#FFFFFF',
	},
	labRowOn: { borderWidth: 2, borderColor: APP_COLORS.primary },
	labName: { fontSize: 15, lineHeight: 20, fontWeight: '800', color: APP_COLORS.ink },
	priceCol: { alignItems: 'flex-end' },
	price: { fontSize: 16, lineHeight: 22, fontWeight: '800', color: APP_COLORS.ink },
	mrp: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted, textDecorationLine: 'line-through' },
	dayRow: { gap: 8 },
	dayCell: {
		width: 60,
		height: 70,
		borderRadius: 12,
		borderWidth: 1,
		alignItems: 'center',
		justifyContent: 'center',
		gap: 2,
	},
	dayDow: { fontSize: 12, fontWeight: '700', opacity: 0.85 },
	dayNum: { fontSize: 20, lineHeight: 24, fontWeight: '800' },
	dayMon: { fontSize: 11, fontWeight: '600', opacity: 0.85 },
	fastNote: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		paddingVertical: 8,
		paddingHorizontal: 12,
		borderRadius: 8,
		backgroundColor: APP_COLORS.warningBg,
	},
	fastNoteText: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: '500', color: APP_COLORS.warning },
})
