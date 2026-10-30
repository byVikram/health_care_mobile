// src/features/ancillary/patient/AncillaryBookVisitPage.tsx
//
// "Later · Schedule a visit" for every ancillary type (nursing, home care, physio, rehab, equipment):
//   1  Which day?   Single visit / Repeat visits, a 14-day date grid (multi-select, max 7 visits).
//   2  What time?   Hourly 7 AM - 9 PM in Morning / Afternoon / Evening groups; today's slots need at least
//                   1 hour of lead time. Repeat visits on several days: "Same time daily" (one time for every
//                   visit) or "Different times" (a tab per day, each with its own time).
// No provider is chosen here: a verified provider is assigned 1 hour before each visit (and can differ per visit).
// Footer: visits + time summary, total, Review -> Review & pay.

import React, { useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RouteProp } from '@react-navigation/native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import Toast from 'react-native-toast-message'
import { APP_COLORS } from '../../../config/theme'
import { ROUTES } from '../../../navigation/routes'
import type { AppStackParamList } from '../../../navigation/types'
import { DOW_LABELS, formatDateForApi, monthRangeLabel, nextDays, parseDateOnly } from '../../../utils/date'
import {
	AppCartFooter,
	AppRadioCard,
	AppScreenHeader,
	AppSegmentedControl,
	DateStrip,
	SlotChipGrid,
} from '../../../components/common'
import { ANCILLARY_BOOKING_MAX_VISITS, ANCILLARY_BOOKING_WINDOW_DAYS } from '../ancillaryProviderBookingService'
import { DayTimeTabs } from '../components/DayTimeTabs'
import { useNow } from '../hooks/useNow'
import { useVisitPolicy } from '../hooks/useVisitPolicy'
import { buildSlotGroups, hhmm, minutesNow, minutesOf } from '../utils/visitSlots'
import {
	dayLabel,
	inr,
	itemsFee,
	itemsSummary,
	leadText,
	plural,
	providerNoun,
	timeLabel,
} from './ancillaryBookingCopy'

type Nav = NativeStackNavigationProp<AppStackParamList>
type Route = RouteProp<AppStackParamList, typeof ROUTES.STACK.ANCILLARY_BOOK_VISIT>
type Mode = 'single' | 'repeat'

const DEFAULT_VISIT_MINUTES = 60

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
	const { serviceKey, serviceLabel, items, initialDates } = route.params

	const leadMinutes = useVisitPolicy().assign_lead_minutes
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
	const [sameTime, setSameTime] = useState(true)
	const [time, setTime] = useState<string | null>(null) // "HH:MM", the one time when `sameTime`
	const [times, setTimes] = useState<Record<string, string>>({}) // date -> "HH:MM" when the times differ
	const [activeDay, setActiveDay] = useState<string | null>(null)
	// Re-evaluated every minute so "too soon" slots stay correct while the screen is open.
	const nowMin = minutesNow(useNow())

	const isRepeat = mode === 'repeat'
	const n = dates.length
	const hasToday = dates.includes(todayIso)
	const multi = isRepeat && n > 1
	const perDay = multi && !sameTime

	/** Today's slots must start at least leadMinutes from now. */
	const okOn = (iso: string, startMinutes: number) => !(iso === todayIso && startMinutes < nowMin + leadMinutes)
	const okSame = (startMinutes: number) => !(hasToday && startMinutes < nowMin + leadMinutes)
	const timeOf = (iso: string) => {
		const t = times[iso]
		return t !== undefined && okOn(iso, minutesOf(t)) ? t : null
	}

	const active = perDay ? (activeDay && dates.includes(activeDay) ? activeDay : dates[0]) : null
	const sameTimeValue = time !== null && okSame(minutesOf(time)) ? time : null
	const shownTime = perDay && active ? timeOf(active) : sameTimeValue
	const missing = perDay ? dates.filter((d) => timeOf(d) === null).length : 0
	const done = n > 0 && (perDay ? missing === 0 : sameTimeValue !== null)

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

	const onTimeModeChange = (same: boolean) => {
		if (!same && sameTimeValue !== null) {
			// Start "Different times" from the time already picked, on every day it still works for.
			const copy = { ...times }
			dates.forEach((d) => {
				if (copy[d] === undefined && okOn(d, minutesOf(sameTimeValue))) copy[d] = sameTimeValue
			})
			setTimes(copy)
		}
		setSameTime(same)
	}

	const onPickTime = (value: string) => {
		if (!perDay || !active) {
			setTime(value)
			return
		}
		const next = { ...times, [active]: value }
		setTimes(next)
		// Move on to the next day that still needs a time.
		const needs = dates.find((d) => d !== active && !(next[d] !== undefined && okOn(d, minutesOf(next[d]))))
		setActiveDay(needs ?? active)
	}

	const onContinue = () => {
		if (!done) return
		const visits = dates.map((date) => {
			const start = (perDay ? timeOf(date) : sameTimeValue) as string
			return { date, start_time: start, end_time: hhmm(minutesOf(start) + visitMinutes) }
		})
		navigation.navigate(ROUTES.STACK.ANCILLARY_REVIEW_PAY, {
			serviceKey,
			serviceLabel,
			items,
			initialDates: dates,
			visits,
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

	const timeHint = perDay
		? missing
			? `${missing} left`
			: 'All set'
		: hasToday
			? `At least ${leadText(leadMinutes)} from now`
			: ''

	const groups = buildSlotGroups((startMinutes) =>
		perDay && active ? okOn(active, startMinutes) : okSame(startMinutes)
	)

	const dayTabs = dates.map((iso) => {
		const d = parseDateOnly(iso)
		const t = timeOf(iso)
		return {
			key: iso,
			day: iso === todayIso ? 'Today' : `${DOW_LABELS[d?.getDay() ?? 0]} ${d?.getDate() ?? ''}`,
			time: t ? timeLabel(t) : null,
			accessibilityLabel: `${dayLabel(iso)}, ${t ? timeLabel(t) : 'pick a time'}`,
		}
	})

	const summary = n
		? `${plural(n, 'visit')}${
				done
					? ` · ${perDay ? 'different times' : timeLabel(sameTimeValue as string)}`
					: perDay
						? ` · ${plural(missing, 'time')} to pick`
						: ' · pick a time'
			}`
		: 'Pick your days'
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
					<View style={styles.modeRow} accessibilityRole="radiogroup" accessibilityLabel="Visit type">
						<AppRadioCard
							variant="option"
							title="Single visit"
							subtitle="One day"
							selected={mode === 'single'}
							onPress={() => onModeChange('single')}
							style={styles.flex}
						/>
						<AppRadioCard
							variant="option"
							title="Repeat visits"
							subtitle="Pick several days"
							selected={mode === 'repeat'}
							onPress={() => onModeChange('repeat')}
							style={styles.flex}
						/>
					</View>
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
						{multi && (
							<AppSegmentedControl
								shape="rounded"
								options={[
									{ value: 'same', label: 'Same time daily' },
									{ value: 'different', label: 'Different times' },
								]}
								value={sameTime ? 'same' : 'different'}
								onChange={(v) => onTimeModeChange(v === 'same')}
								accessibilityLabel="Time for visits"
							/>
						)}
						{perDay && active && <DayTimeTabs tabs={dayTabs} activeKey={active} onSelect={setActiveDay} />}
						{groups.map((g) => (
							<View key={g.label} style={styles.group}>
								<Text style={styles.groupLabel}>{g.label}</Text>
								<SlotChipGrid
									columns={4}
									density="compact"
									slots={g.slots}
									selectedValue={shownTime}
									onSelectValue={onPickTime}
								/>
							</View>
						))}
					</View>
				)}

				<View style={styles.note}>
					<MaterialCommunityIcons name="clock-outline" size={18} color={APP_COLORS.primary} />
					<Text style={styles.noteText}>
						{`A verified ${noun} is assigned `}
						<Text style={styles.bold}>{`${leadText(leadMinutes)} before each visit`}</Text>
						{` — each visit can have a different ${noun}. You’ll get their name, photo and start code then.`}
					</Text>
				</View>
			</ScrollView>

			<AppCartFooter
				plainCta
				countLabel={summary}
				totalLabel={`${inr(fee)} per visit`}
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
	stepRight: { fontSize: 12, fontWeight: '700', color: APP_COLORS.inkMuted },
	hintRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
	hint: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: '700', color: APP_COLORS.ink },
	muted: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
	flex: { flex: 1 },
	modeRow: { flexDirection: 'row', gap: 8 },
	group: { gap: 8 },
	groupLabel: { fontSize: 13, lineHeight: 18, fontWeight: '800', color: APP_COLORS.ink },
	note: {
		marginHorizontal: 16,
		flexDirection: 'row',
		gap: 10,
		padding: 12,
		borderRadius: 12,
		backgroundColor: APP_COLORS.mint,
	},
	noteText: { flex: 1, fontSize: 13, lineHeight: 18, color: APP_COLORS.ink },
	bold: { fontWeight: '800' },
})
