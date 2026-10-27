// src/features/ancillary/patient/AncillaryBookVisitPage.tsx
//
// "Later · Schedule a visit" for every ancillary type (nursing, home care, physio, rehab, equipment):
//   1  Which day?   Single visit / Repeat visits, a 14-day date grid (multi-select, max 7 visits).
//   2  What time?   ONE time for every visit, hourly 7 AM - 9 PM in Morning / Afternoon / Evening groups;
//                   today's slots need at least 1 hour of lead time.
// No provider is chosen here: a verified nurse is assigned 20-30 min before each visit.
// Footer: visits + time summary, total, Review -> Review & pay.

import React, { useEffect, useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RouteProp } from '@react-navigation/native'
import Toast from 'react-native-toast-message'
import { APP_COLORS } from '../../../config/theme'
import { ROUTES } from '../../../navigation/routes'
import type { AppStackParamList } from '../../../navigation/types'
import { formatDateForApi, monthRangeLabel, nextDays } from '../../../utils/date'
import {
	AppCartFooter,
	AppInfoBanner,
	AppScreenHeader,
	AppSegmentedControl,
	DateStrip,
	SlotChipGrid,
} from '../../../components/common'
import type { SlotChipItem } from '../../../components/common'
import { ANCILLARY_BOOKING_MAX_VISITS, ANCILLARY_BOOKING_WINDOW_DAYS } from '../ancillaryProviderBookingService'
import {
	chipTimeLabel,
	dayLabel,
	inr,
	itemsFee,
	itemsSummary,
	plural,
	providerNoun,
	timeLabel,
} from './ancillaryBookingCopy'

type Nav = NativeStackNavigationProp<AppStackParamList>
type Route = RouteProp<AppStackParamList, typeof ROUTES.STACK.ANCILLARY_BOOK_VISIT>
type Mode = 'single' | 'repeat'

/** Slot hours, 7 AM - 9 PM (the last slot starts at 9 PM). */
const SLOT_GROUPS: { label: string; fromHour: number; toHour: number }[] = [
	{ label: 'Morning', fromHour: 7, toHour: 11 },
	{ label: 'Afternoon', fromHour: 12, toHour: 16 },
	{ label: 'Evening', fromHour: 17, toHour: 21 },
]

/** Today's slots must start at least this long from now. */
const LEAD_MINUTES = 60
const DEFAULT_VISIT_MINUTES = 60

const hhmm = (minutes: number) => {
	const m = Math.min(minutes, 23 * 60 + 59)
	return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

function StepTitle({ n, title, right }: { n: number; title: string; right?: string }) {
	return (
		<View style={styles.stepRow}>
			<View style={styles.stepNum}>
				<Text style={styles.stepNumText}>{n}</Text>
			</View>
			<Text style={styles.stepTitle} accessibilityRole="header">
				{title}
			</Text>
			{!!right && <Text style={styles.stepRight}>{right}</Text>}
		</View>
	)
}

export default function AncillaryBookVisitPage() {
	const navigation = useNavigation<Nav>()
	const route = useRoute<Route>()
	const params = route.params
	const { serviceKey, serviceLabel, items, initialDates } = params

	const noun = providerNoun(serviceKey)
	const fee = itemsFee(items)
	const visitMinutes = useMemo(() => {
		const total = items.reduce((sum, i) => sum + (Number(i.durationMinutes) || 0), 0)
		return total > 0 ? total : DEFAULT_VISIT_MINUTES
	}, [items])

	// The 14-day window, fixed for the lifetime of the screen.
	const windowDays = useMemo(() => nextDays(ANCILLARY_BOOKING_WINDOW_DAYS), [])
	const windowIsos = useMemo(() => windowDays.map(formatDateForApi), [windowDays])
	const todayIso = windowIsos[0]

	const startDates = useMemo(() => {
		const valid = (initialDates ?? []).filter((d) => windowIsos.includes(d))
		return [...new Set(valid)].sort().slice(0, ANCILLARY_BOOKING_MAX_VISITS)
	}, [initialDates, windowIsos])

	const [mode, setMode] = useState<Mode>(startDates.length > 1 ? 'repeat' : 'single')
	const [dates, setDates] = useState<string[]>(startDates)
	const [time, setTime] = useState<string | null>(null) // "HH:MM"
	// Re-evaluated every minute so "too soon" slots stay correct while the screen is open.
	const [now, setNow] = useState(() => new Date())
	useEffect(() => {
		const id = setInterval(() => setNow(new Date()), 60000)
		return () => clearInterval(id)
	}, [])

	const isRepeat = mode === 'repeat'
	const n = dates.length
	const hasToday = dates.includes(todayIso)
	const nowMinutes = now.getHours() * 60 + now.getMinutes()
	const slotOk = (startMinutes: number) => !(hasToday && startMinutes < nowMinutes + LEAD_MINUTES)
	const timeMinutes = time ? Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5)) : null
	const timeValid = timeMinutes != null && slotOk(timeMinutes)
	const done = n > 0 && timeValid

	// ---- Actions ----
	const onModeChange = (m: Mode) => {
		setMode(m)
		if (m === 'single' && dates.length > 1) setDates(dates.slice(0, 1))
	}

	const onPickDate = (d: Date) => {
		const iso = formatDateForApi(d)
		if (!isRepeat) {
			setDates([iso])
			return
		}
		if (dates.includes(iso)) {
			setDates(dates.filter((x) => x !== iso))
			return
		}
		if (dates.length >= ANCILLARY_BOOKING_MAX_VISITS) {
			Toast.show({ type: 'info', text1: `You can book up to ${ANCILLARY_BOOKING_MAX_VISITS} visits at a time` })
			return
		}
		setDates([...dates, iso].sort())
	}

	const onContinue = () => {
		if (!done || timeMinutes == null) return
		const end = hhmm(timeMinutes + visitMinutes)
		navigation.navigate(ROUTES.STACK.ANCILLARY_REVIEW_PAY, {
			serviceKey,
			serviceLabel,
			items,
			initialDates: dates,
			visits: dates.map((date) => ({ date, start_time: time as string, end_time: end })),
		})
	}

	// ---- Labels ----
	const dateHint = isRepeat
		? n
			? `${plural(n, 'visit')} selected · tap to add or remove days`
			: 'Tap the days you need a visit'
		: n
			? `Visit on ${dayLabel(dates[0])}`
			: 'Pick a day'

	const timeHint = isRepeat && n > 1 ? 'Same time for all visits' : hasToday ? 'At least 1 hr from now' : ''

	const groups = SLOT_GROUPS.map((g) => {
		const slots: SlotChipItem[] = []
		for (let h = g.fromHour; h <= g.toHour; h++) {
			const value = hhmm(h * 60)
			const ok = slotOk(h * 60)
			slots.push({
				value,
				label: chipTimeLabel(value),
				struck: !ok,
				accessibilityLabel: `${timeLabel(value)}${ok ? '' : ', too soon'}`,
			})
		}
		return { label: g.label, slots }
	})

	const summary = n ? `${plural(n, 'visit')} · ${done && time ? timeLabel(time) : 'pick a time'}` : 'Pick your days'
	const ctaLabel = done ? 'Review' : !n ? 'Pick days' : 'Pick time'
	const headerSub = [itemsSummary(items), fee > 0 ? `${inr(fee)} per visit` : ''].filter(Boolean).join(' · ')

	return (
		<View style={styles.container}>
			<AppScreenHeader
				variant="bar"
				title="Schedule a visit"
				subtitle={headerSub || undefined}
				onBack={() => navigation.goBack()}
			/>

			<ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
				{/* 1 · Which day */}
				<View style={styles.section}>
					<StepTitle n={1} title="Which day?" />
					<AppSegmentedControl<Mode>
						options={[
							{ value: 'single', label: 'Single visit' },
							{ value: 'repeat', label: 'Repeat visits' },
						]}
						value={mode}
						onChange={onModeChange}
						accessibilityLabel="Visit type"
					/>
					<View style={styles.hintRow}>
						<Text style={styles.hint}>{dateHint}</Text>
						<Text style={styles.muted}>{monthRangeLabel(windowDays)}</Text>
					</View>
					<DateStrip
						variant="grid"
						density="compact"
						columns={7}
						dayCount={ANCILLARY_BOOKING_WINDOW_DAYS}
						selectedDates={dates}
						onSelectDate={onPickDate}
					/>
				</View>

				{/* 2 · Time */}
				{n > 0 && (
					<View style={styles.section}>
						<StepTitle n={2} title="What time?" right={timeHint || undefined} />
						{groups.map((g) => (
							<View key={g.label} style={styles.group}>
								<Text style={styles.groupLabel}>{g.label}</Text>
								<SlotChipGrid
									columns={4}
									slots={g.slots}
									selectedValue={timeValid ? time : null}
									onSelectValue={setTime}
								/>
							</View>
						))}
					</View>
				)}

				<View style={styles.noteWrap}>
					<AppInfoBanner
						tone="info"
						icon={null}
						title={`A verified ${noun} near you will be assigned 20–30 min before each visit.`}
					/>
				</View>
			</ScrollView>

			<AppCartFooter
				countLabel={summary}
				totalLabel={inr(fee * Math.max(n, 1))}
				ctaLabel={ctaLabel}
				onCtaPress={onContinue}
				ctaDisabled={!done}
			/>
		</View>
	)
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: APP_COLORS.pageBg },
	scroll: { paddingTop: 8, paddingBottom: 16, gap: 8 },
	section: { backgroundColor: APP_COLORS.surface, padding: 16, gap: 12 },
	stepRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
	stepNum: {
		width: 24,
		height: 24,
		borderRadius: 9999,
		backgroundColor: APP_COLORS.ink,
		alignItems: 'center',
		justifyContent: 'center',
	},
	stepNumText: { fontSize: 12, fontWeight: '800', color: APP_COLORS.surface },
	stepTitle: { flex: 1, fontSize: 17, lineHeight: 24, fontWeight: '800', color: APP_COLORS.ink },
	stepRight: { fontSize: 12, lineHeight: 16, fontWeight: '700', color: APP_COLORS.inkMuted },
	hintRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
	hint: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: '700', color: APP_COLORS.ink },
	muted: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
	group: { gap: 8 },
	groupLabel: { fontSize: 13, lineHeight: 18, fontWeight: '800', color: APP_COLORS.ink },
	noteWrap: { marginHorizontal: 16 },
})
