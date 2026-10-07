// src/features/laboratory/LabCentersPage.tsx
//
// "Choose a lab" + "Choose a lab · date & time" from the Lab Tests Ordering design (in-clinic visit): search,
// Open now / NABL filters, lab cards sorted by distance, the "Pick a date and time" sheet (7 days, grouped
// slots) and the "Continue to review & pay" footer. Mock labs and slots (labMock.ts); the pick is stored in
// the booking store.

import React, { useEffect, useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import {
	AppBottomSheet,
	AppButton,
	AppChip,
	AppFooterBar,
	AppIconTile,
	AppPathIcon,
	AppScreenHeader,
	AppTag,
	SlotChipGrid,
	type SlotChipItem,
} from '../../components/common'
import { APP_COLORS } from '../../config/theme'
import { ROUTES } from '../../navigation/routes'
import type { AppStackParamList } from '../../navigation/types'
import { labBooking, needsFasting, useLabBooking } from './labBookingStore'
import { addDays, commaDate, dayNum, dowShort, monShort, plural, slotStart, toIso } from './labFormat'
import {
	CLINIC_DAY_COUNT,
	CLINIC_SLOT_PARTS,
	LAB_ICONS,
	LAB_CENTERS,
	isClinicSlotBusy,
	labCenterById,
	type LabCenter,
} from './labMock'

type Nav = NativeStackNavigationProp<AppStackParamList>

type Filter = 'open' | 'nabl'
const FILTERS: { id: Filter; label: string }[] = [
	{ id: 'open', label: 'Open now' },
	{ id: 'nabl', label: 'NABL accredited' },
]

export default function LabCentersPage() {
	const navigation = useNavigation<Nav>()
	const booking = useLabBooking()
	const [query, setQuery] = useState('')
	const [filters, setFilters] = useState<Partial<Record<Filter, boolean>>>({})
	// The lab whose slot sheet is open, and the day / time picked inside it.
	const [sheetLab, setSheetLab] = useState<string | null>(null)
	const [dayIdx, setDayIdx] = useState(1)
	const [time, setTime] = useState<string | null>(null)
	useEffect(() => labBooking.dropExpired(), [])

	const testCount = booking.cart.length
	const picked = booking.clinic
	const pickedLab = labCenterById(picked?.labId)

	const days = useMemo(() => Array.from({ length: CLINIC_DAY_COUNT }, (_, i) => toIso(addDays(new Date(), i))), [])

	const q = query.trim().toLowerCase()
	const labs = useMemo(
		() =>
			LAB_CENTERS.filter(
				(l) =>
					(!q || `${l.name} ${l.address}`.toLowerCase().includes(q)) &&
					(!filters.open || l.open) &&
					(!filters.nabl || l.nabl)
			)
				.slice()
				.sort((a, b) => a.km - b.km),
		[q, filters]
	)

	const openSheet = (lab: LabCenter) => {
		const same = picked?.labId === lab.id
		setSheetLab(lab.id)
		setDayIdx(same ? Math.max(0, days.indexOf(picked!.date)) : 1)
		setTime(same ? picked!.time : null)
	}

	const sheet = labCenterById(sheetLab)
	const confirm = () => {
		if (!sheet || !time) return
		labBooking.set({ clinic: { labId: sheet.id, date: days[dayIdx], time } })
		setSheetLab(null)
	}

	return (
		<View style={styles.screen}>
			<AppScreenHeader
				variant="bar"
				title="Choose a lab"
				subtitle={`In-clinic visit · ${plural(testCount, 'test', 'tests')}`}
				onBack={() => navigation.goBack()}
				backAccessibilityLabel="Back to cart"
			/>

			<View style={styles.filterBlock}>
				<View style={styles.search}>
					<AppPathIcon d={LAB_ICONS.search} size={20} strokeWidth={2} color={APP_COLORS.inkMuted} />
					<TextInput
						value={query}
						onChangeText={setQuery}
						placeholder="Search lab or area"
						placeholderTextColor={APP_COLORS.inkMuted}
						style={styles.searchInput}
						returnKeyType="search"
						autoCorrect={false}
						accessibilityLabel="Search labs"
					/>
				</View>
				<ScrollView
					horizontal
					showsHorizontalScrollIndicator={false}
					contentContainerStyle={styles.filterRow}
					accessibilityLabel="Filters"
				>
					{FILTERS.map((f) => {
						const on = !!filters[f.id]
						return (
							<AppChip
								key={f.id}
								label={f.label}
								selected={on}
								onPress={() => setFilters((cur) => ({ ...cur, [f.id]: !cur[f.id] }))}
								accessibilityRole="checkbox"
							/>
						)
					})}
				</ScrollView>
			</View>

			<ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
				<Text style={styles.count} accessibilityLiveRegion="polite">
					{`${labs.length} ${labs.length === 1 ? 'lab' : 'labs'} near you`}
				</Text>

				{labs.map((l) => {
					const on = picked?.labId === l.id
					return (
						<TouchableOpacity
							key={l.id}
							style={[styles.card, on && styles.cardOn]}
							activeOpacity={0.85}
							onPress={() => openSheet(l)}
							accessibilityRole="button"
							accessibilityState={{ selected: on }}
						>
							<View style={styles.cardTop}>
								<AppIconTile size={44} radius={12} tone="mint">
									<AppPathIcon
										d={LAB_ICONS.clinic}
										size={22}
										strokeWidth={2}
										color={APP_COLORS.primary}
									/>
								</AppIconTile>
								<View style={styles.flex}>
									<Text style={styles.labName}>{l.name}</Text>
									<Text style={styles.labAddress}>{l.address}</Text>
									<Text style={styles.labMeta}>{`${l.km} km · ${l.hours}`}</Text>
								</View>
								{on && (
									<View style={styles.tick}>
										<AppPathIcon d={LAB_ICONS.check} size={14} strokeWidth={3} color="#FFFFFF" />
									</View>
								)}
							</View>
							<View style={styles.tags}>
								{l.nabl && (
									<AppTag label="NABL" bg={APP_COLORS.successBg} ink={APP_COLORS.success} size="xs" />
								)}
								<AppTag label="Reports in 24 hrs" bg="#DDEBFA" ink="#2463A8" size="xs" />
								<Text
									style={[styles.next, { color: l.open ? APP_COLORS.success : APP_COLORS.inkMuted }]}
								>
									{l.open ? 'Next slot today, 11:00 AM' : 'Next slot tomorrow, 8:00 AM'}
								</Text>
							</View>
						</TouchableOpacity>
					)
				})}

				{labs.length === 0 && <Text style={styles.empty}>No labs match your search.</Text>}
			</ScrollView>

			<AppFooterBar direction="column">
				{picked && pickedLab ? (
					<>
						<View style={styles.pickRow}>
							<AppPathIcon d={LAB_ICONS.calendar} size={16} strokeWidth={2} color={APP_COLORS.primary} />
							<Text style={styles.pickText} numberOfLines={2}>
								<Text style={styles.pickBold}>{`${commaDate(picked.date)}, ${picked.time}`}</Text>
								{` · ${pickedLab.name}`}
							</Text>
							<TouchableOpacity
								onPress={() => openSheet(pickedLab)}
								accessibilityRole="button"
								style={styles.changeBtn}
							>
								<Text style={styles.changeText}>Change</Text>
							</TouchableOpacity>
						</View>
						<AppButton
							size="lg"
							onPress={() => navigation.navigate(ROUTES.STACK.LABORATORY_BOOKING_SUMMARY)}
						>
							Continue to review & pay
						</AppButton>
					</>
				) : (
					<AppButton size="lg" disabled>
						Select a lab to continue
					</AppButton>
				)}
			</AppFooterBar>

			<AppBottomSheet
				visible={!!sheet}
				title="Pick a date and time"
				subtitle={sheet ? `${sheet.name} · ${sheet.address}` : undefined}
				onClose={() => setSheetLab(null)}
				appearance="modern"
				showHeaderDivider={false}
				maxHeightRatio={0.88}
				footer={
					<AppButton
						size="lg"
						disabled={!time}
						onPress={confirm}
						style={!time ? styles.confirmOff : undefined}
						labelStyle={styles.confirmText}
					>
						{time ? `Confirm · ${commaDate(days[dayIdx])}, ${time}` : 'Select a time'}
					</AppButton>
				}
			>
				<View style={styles.sheetBody}>
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
									onPress={() => {
										setDayIdx(i)
										setTime(null)
									}}
									accessibilityRole="radio"
									accessibilityState={{ checked: on }}
									accessibilityLabel={commaDate(d)}
								>
									<Text style={[styles.dayDow, { color: on ? '#FFFFFF' : APP_COLORS.ink }]}>
										{i === 0 ? 'Today' : dowShort(d)}
									</Text>
									<Text style={[styles.dayNum, { color: on ? '#FFFFFF' : APP_COLORS.ink }]}>
										{dayNum(d)}
									</Text>
									<Text style={[styles.dayMon, { color: on ? '#FFFFFF' : APP_COLORS.ink }]}>
										{monShort(d)}
									</Text>
								</TouchableOpacity>
							)
						})}
					</ScrollView>

					{needsFasting(booking) && (
						<View style={styles.fastNote} accessibilityRole="text">
							<MaterialCommunityIcons name="clock-outline" size={16} color={APP_COLORS.warning} />
							<Text style={styles.fastNoteText}>Fasting tests: a morning slot is best.</Text>
						</View>
					)}

					{CLINIC_SLOT_PARTS.map((p) => {
						const slots: SlotChipItem[] = p.slots.map((t) => {
							const value = `${t} ${p.ap}`
							// Taken, or already past today.
							const busy =
								!!sheet &&
								(isClinicSlotBusy(sheet.id, dayIdx, value) ||
									slotStart(days[dayIdx], value).getTime() <= Date.now())
							return {
								value,
								label: t,
								struck: busy,
								accessibilityLabel: `${value}${busy ? ', booked' : ''}`,
							}
						})
						return (
							<View key={p.label} style={styles.part}>
								<Text style={styles.partLabel}>{p.label}</Text>
								<SlotChipGrid columns={4} slots={slots} selectedValue={time} onSelectValue={setTime} />
							</View>
						)
					})}
				</View>
			</AppBottomSheet>
		</View>
	)
}

const styles = StyleSheet.create({
	screen: { flex: 1, backgroundColor: APP_COLORS.pageBg },
	flex: { flex: 1, minWidth: 0 },
	filterBlock: {
		backgroundColor: '#FFFFFF',
		paddingVertical: 12,
		paddingHorizontal: 16,
		gap: 10,
		borderBottomWidth: 1,
		borderBottomColor: APP_COLORS.divider,
	},
	search: {
		height: 44,
		paddingHorizontal: 12,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#9FB4B6',
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	searchInput: { flex: 1, minWidth: 0, height: 40, fontSize: 15, color: APP_COLORS.ink, paddingVertical: 0 },
	filterRow: { gap: 8 },
	list: { padding: 16, paddingTop: 12, gap: 10 },
	count: { fontSize: 13, lineHeight: 18, fontWeight: '600', color: APP_COLORS.inkMuted },
	card: {
		padding: 14,
		borderRadius: 14,
		borderWidth: 1,
		borderColor: APP_COLORS.divider,
		backgroundColor: '#FFFFFF',
		gap: 10,
	},
	cardOn: { borderWidth: 2, borderColor: APP_COLORS.primary },
	cardTop: { flexDirection: 'row', gap: 12 },
	labName: { fontSize: 15, lineHeight: 20, fontWeight: '800', color: APP_COLORS.ink },
	labAddress: { fontSize: 13, lineHeight: 18, color: APP_COLORS.inkMuted },
	labMeta: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
	tick: {
		width: 22,
		height: 22,
		borderRadius: 11,
		backgroundColor: APP_COLORS.primary,
		alignItems: 'center',
		justifyContent: 'center',
	},
	tags: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
	next: { marginLeft: 'auto', fontSize: 12, lineHeight: 16, fontWeight: '700' },
	empty: { marginVertical: 32, textAlign: 'center', fontSize: 14, color: APP_COLORS.inkMuted },
	pickRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
	pickText: { flex: 1, minWidth: 0, fontSize: 13, lineHeight: 18, color: APP_COLORS.ink },
	pickBold: { fontWeight: '800' },
	changeBtn: { height: 32, paddingHorizontal: 4, justifyContent: 'center' },
	changeText: { fontSize: 13, fontWeight: '700', color: APP_COLORS.primary },

	sheetBody: { gap: 16 },
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
	part: { gap: 8 },
	partLabel: { fontSize: 13, lineHeight: 18, fontWeight: '800', color: APP_COLORS.ink },
	confirmOff: { backgroundColor: '#9DB9BA' },
	confirmText: { fontWeight: '800', color: '#FFFFFF' },
})
