// src/features/ancillary/staff/ProviderSchedulePage.tsx
//
// Provider "Schedule" tab, from the "ancillary schedule" design: the provider's days at a glance. A strip of Past + today and the six
// days after it, then what the picked day holds: the request that is open to her right now (instant request or an unfilled visit),
// "Needed now" / "Open near you" jobs nobody has taken (GET /provider/me/open-jobs; she can take some days of a booking, or hide it),
// her visits for the day (Start, a "Day 2 of 5" chip, a ⋮ menu to navigate / call / tell the patient she is running late / give a day
// or the rest back) and "Earlier today". "Past" is the history with filters. A provider keeps no weekly hours: the only availability
// is the online switch on Today. Visits come from GET /provider/me/orders, the open request from GET /provider/requests/available.
import React, { useCallback, useMemo, useState } from 'react'
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useIsFocused, useNavigation, type NavigationProp } from '@react-navigation/native'
import {
	AppInfoBanner,
	AppPathIcon,
	AppReasonSheet,
	AppScreenHeader,
	AppSegmentedControl,
} from '../../../components/common'
import { APP_COLORS } from '../../../config/theme'
import { ROUTES } from '../../../navigation/routes'
import { useTabBarClearance } from '../../../navigation/tabBar'
import type { AppStackParamList } from '../../../navigation/types'
import { formatTimeSlot } from '../../../utils/formatters'
import { clinicNowHms } from '../../doctor/scheduleUtils'
import { ScheduleCalendarSheet } from '../../doctor/dashboard/ScheduleCalendarSheet'
import { InstantRequestCard } from './schedule/InstantRequestCard'
import { ManageVisitSheet } from './schedule/ManageVisitSheet'
import { OpenJobView } from './schedule/OpenJobView'
import { OpenJobsSection } from './schedule/OpenJobsSection'
import { PastVisitsView } from './schedule/PastVisitsView'
import { ReleaseVisitSheet } from './schedule/ReleaseVisitSheet'
import { RunningLateSheet } from './schedule/RunningLateSheet'
import { PAST_KEY, ScheduleDayStrip } from './schedule/ScheduleDayStrip'
import { ScheduleCard, ScheduleVisitRow, SubLine, TimeColumn } from './schedule/ScheduleVisitRow'
import {
	activeOn,
	buildDayView,
	dayTitle,
	longDay,
	monthLabel,
	stripDays,
	type ScheduleVisit,
	type VisitKind,
} from './schedule/scheduleModel'
import { PATHS, SCH } from './schedule/scheduleTheme'
import { useProviderSchedule } from './schedule/useProviderSchedule'
import { TakeJobSheet } from './schedule/TakeJobSheet'
import { useScheduleActions } from './schedule/useScheduleActions'
import { useScheduleOffer } from './schedule/useScheduleOffer'

type Filter = 'all' | VisitKind

const FILTER_OPTIONS = [
	{ value: 'all' as const, label: 'All' },
	{ value: 'instant' as const, label: 'Instant' },
	{ value: 'scheduled' as const, label: 'Scheduled' },
]

export default function ProviderSchedulePage() {
	const clearance = useTabBarClearance()
	const isFocused = useIsFocused()
	const navigation = useNavigation<NavigationProp<AppStackParamList>>()
	const { visits, openJobs, today, online, loading, loaded, error, reload } = useProviderSchedule()

	const [selected, setSelected] = useState('')
	const [filter, setFilter] = useState<Filter>('all')
	const [doneOpen, setDoneOpen] = useState(false)
	const [calendarOpen, setCalendarOpen] = useState(false)
	// Until the user picks a day, the schedule shows today (the date can change under an open screen: read it each render).
	const day = selected || today
	const isPast = day === PAST_KEY
	const days = useMemo(() => stripDays(today), [today])

	const openVisit = useCallback(
		(v: ScheduleVisit) => {
			if (!v.visitId) return
			navigation.navigate(
				v.inProgress ? ROUTES.STACK.PROVIDER_VISIT_IN_PROGRESS : ROUTES.STACK.PROVIDER_VISIT_DETAILS,
				{
					visitId: v.visitId,
				}
			)
		},
		[navigation]
	)

	const {
		manage,
		setManage,
		releasing,
		setReleasing,
		releaseScope,
		late,
		setLate,
		job,
		setJob,
		jobBusy,
		declining,
		setDeclining,
		taking,
		setTaking,
		remainingDays,
		runAction,
		confirmRelease,
		acceptJob,
		pickNeeded,
		confirmTake,
		declineJob,
	} = useScheduleActions({ visits, reload, openVisit })

	const offerOn = isFocused && !isPast && day === today && !job
	// Offers are polled only while she is online: an offline nurse is offered nothing (unknown still polls).
	const offerState = useScheduleOffer({
		enabled: isFocused && !job && online !== false,
		onAccepted: () => void reload(),
	})

	const dayView = useMemo(
		() => buildDayView(visits, day, today, day === today ? filter : 'all'),
		[visits, day, today, filter]
	)
	const weekCount = useMemo(() => days.reduce((n, iso) => n + activeOn(visits, iso).length, 0), [days, visits])
	const openDays = useMemo(() => {
		const set = new Set<string>()
		for (const j of openJobs.nearby) for (const d of j.days) set.add(d.date)
		if (openJobs.needed.length > 0 || offerState.offer) set.add(today)
		return set
	}, [openJobs, offerState.offer, today])
	const markedDays = useMemo(() => new Set(visits.filter((v) => v.state === 'active').map((v) => v.date)), [visits])

	const nextVisitLine = useMemo(() => {
		const nowHm = clinicNowHms().slice(0, 5)
		const next = activeOn(visits, today)
			.filter((v) => v.startTime && v.startTime > nowHm)
			.sort((a, b) => a.startTime.localeCompare(b.startTime))[0]
		return next ? `Your next visit: ${formatTimeSlot(next.startTime)} with ${next.patientName}` : null
	}, [visits, today])

	// ---- The open job view replaces the schedule while a booking is being looked at. ----
	if (job) {
		const first = job.days[0]
		return (
			<>
				<OpenJobView
					key={job.id}
					job={job}
					busy={jobBusy}
					bottomClearance={clearance}
					onBack={() => setJob(null)}
					onAccept={(dates) => void acceptJob(job, dates)}
					onDecline={() => setDeclining(job)}
				/>
				{declining && (
					<AppReasonSheet
						visible
						title="Not for you?"
						subtitle="We’ll stop showing this job in your schedule."
						who={declining.patientName}
						line={[
							`${declining.days.length} ${declining.days.length === 1 ? 'day' : 'days'}`,
							first ? longDay(first.date) : null,
							declining.services[0]?.name ?? null,
						]
							.filter(Boolean)
							.join(' · ')}
						reasons={[
							'Too far from me',
							'Timing doesn’t suit me',
							'Needs skills I don’t have',
							'Other reason',
						]}
						info="It stays open for other nurses nearby. Your reason helps us show you better-matched jobs."
						confirmLabel="Hide this job"
						tone="primary"
						successTitle="Job hidden"
						successMessage="It stays open for other nurses."
						onClose={() => setDeclining(null)}
						onDone={() => {
							setDeclining(null)
							setJob(null)
						}}
						onConfirm={(reason) => declineJob(declining, reason)}
					/>
				)}
			</>
		)
	}

	const isToday = day === today
	const showSeg = isToday && !isPast
	const neededVisible = isToday && (filter === 'all' || filter === 'instant')
	const nearbyVisible = !isPast && (filter === 'all' || filter === 'scheduled' || !isToday)
	const nearbyJobs = openJobs.nearby.filter((j) => j.days.some((d) => d.date === day))
	const empty =
		!dayView.section &&
		!dayView.done.length &&
		!(neededVisible && openJobs.needed.length) &&
		nearbyJobs.length === 0
	const sub = `${longDay(today)} · ${weekCount} ${weekCount === 1 ? 'visit' : 'visits'} this week`

	return (
		<View style={styles.page}>
			<AppScreenHeader
				variant="bar"
				solid
				showBack={false}
				title="Schedule"
				subtitle={sub}
				titleStyle={styles.headerTitle}
				subtitleStyle={styles.headerSub}
				style={styles.header}
				rightElement={
					<View style={styles.headerButtons}>
						<TouchableOpacity
							onPress={() => setSelected(today)}
							activeOpacity={0.8}
							style={styles.todayBtn}
							accessibilityRole="button"
							accessibilityLabel="Go to today"
						>
							<Text style={styles.todayText}>Today</Text>
						</TouchableOpacity>
						<TouchableOpacity
							onPress={() => setCalendarOpen(true)}
							activeOpacity={0.8}
							style={styles.calBtn}
							accessibilityRole="button"
							accessibilityLabel="Pick a date"
						>
							<AppPathIcon d={PATHS.calendar} size={20} strokeWidth={2.2} color="#FFFFFF" />
						</TouchableOpacity>
					</View>
				}
			/>

			<View style={styles.dateBlock}>
				<View style={styles.dateHead}>
					<Text style={styles.dateTitle}>Date</Text>
					<Text style={styles.dateMonth}>{isPast ? 'Past visits' : monthLabel(day)}</Text>
				</View>
				<ScheduleDayStrip
					days={days}
					todayIso={today}
					selected={isPast ? PAST_KEY : day}
					countOf={(iso) => activeOn(visits, iso).length}
					hasOpen={(iso) => openDays.has(iso)}
					onSelect={(value) => {
						setSelected(value)
						if (value !== today) setFilter('all')
					}}
				/>
			</View>

			<ScrollView
				contentContainerStyle={[styles.content, { paddingBottom: clearance + 16 }]}
				showsVerticalScrollIndicator={false}
				refreshControl={<RefreshControl refreshing={loading && loaded} onRefresh={() => void reload()} />}
			>
				{error ? (
					<AppInfoBanner
						tone="danger"
						title="Couldn't load your schedule"
						subtitle={error}
						action={{ label: 'Retry', onPress: () => void reload() }}
					/>
				) : null}

				{!loaded && loading ? (
					<View style={styles.loading}>
						<ActivityIndicator color={APP_COLORS.primary} />
					</View>
				) : isPast ? (
					<PastVisitsView today={today} onOpenVisit={openVisit} />
				) : (
					<>
						{offerOn && offerState.offer && (
							<InstantRequestCard
								offer={offerState.offer}
								secondsLeft={offerState.secondsLeft}
								busy={offerState.busy}
								nextVisitLine={nextVisitLine}
								onAccept={(o) => void offerState.accept(o)}
								onDecline={(o) => void offerState.decline(o)}
							/>
						)}

						<View style={styles.dayRow}>
							<View>
								<Text style={styles.dayTitle}>{dayTitle(day, today)}</Text>
								<Text style={styles.daySub}>
									{isToday
										? `${dayView.toGo} to go · ${visits.filter((v) => v.date === today && v.state === 'done').length} done`
										: `${dayView.toGo} ${dayView.toGo === 1 ? 'visit' : 'visits'}`}
								</Text>
							</View>
							{showSeg && (
								<AppSegmentedControl
									options={FILTER_OPTIONS}
									value={filter}
									onChange={setFilter}
									accessibilityLabel="Visit type"
								/>
							)}
						</View>

						{neededVisible && (
							<OpenJobsSection
								kind="needed"
								jobs={openJobs.needed}
								day={day}
								online={online}
								onPick={pickNeeded}
							/>
						)}

						{dayView.section && (
							<ScheduleCard title={dayView.section.title}>
								{dayView.section.rows.map((v) => (
									<ScheduleVisitRow
										key={v.key}
										visit={v}
										isToday={isToday}
										onOpen={() => openVisit(v)}
										onMore={() => setManage(v)}
									/>
								))}
							</ScheduleCard>
						)}

						{nearbyVisible && (
							<OpenJobsSection kind="nearby" jobs={nearbyJobs} day={day} onPick={(j) => setJob(j)} />
						)}

						{dayView.done.length > 0 && (
							<View style={styles.doneCard}>
								<TouchableOpacity
									onPress={() => setDoneOpen((o) => !o)}
									activeOpacity={0.7}
									style={styles.doneHead}
									accessibilityRole="button"
									accessibilityState={{ expanded: doneOpen }}
								>
									<Text style={styles.doneTitle}>{`EARLIER TODAY · ${dayView.done.length}`}</Text>
									<AppPathIcon
										d={doneOpen ? PATHS.chevronDown : PATHS.chevronRight}
										size={16}
										strokeWidth={2.4}
										color={APP_COLORS.inkMuted}
									/>
								</TouchableOpacity>
								{doneOpen &&
									dayView.done.map((v) => (
										<TouchableOpacity
											key={v.key}
											onPress={() => openVisit(v)}
											disabled={!v.visitId}
											activeOpacity={0.7}
											style={styles.doneRow}
										>
											<TimeColumn startTime={v.startTime} color={SCH.faint} />
											<View style={styles.doneMid}>
												<Text style={styles.doneName} numberOfLines={1}>
													{v.patientName}
												</Text>
												<SubLine
													instant={v.kind === 'instant'}
													text={[v.care, v.area, v.kind === 'instant' ? 'Instant' : null]
														.filter(Boolean)
														.join(' · ')}
												/>
											</View>
											<View style={styles.donePill}>
												<Text style={styles.donePillText}>Completed</Text>
											</View>
										</TouchableOpacity>
									))}
							</View>
						)}

						{empty && !error && (
							<View style={styles.empty}>
								<Text style={styles.emptyText}>No visits on this day.</Text>
							</View>
						)}
					</>
				)}
			</ScrollView>

			<ManageVisitSheet
				visible={!!manage}
				visit={manage}
				remainingDays={manage ? remainingDays(manage) : 1}
				onClose={() => setManage(null)}
				onAction={(a, v) => void runAction(a, v)}
			/>

			{releasing && (
				<ReleaseVisitSheet
					visit={releasing}
					remainingDays={remainingDays(releasing)}
					scope={releaseScope}
					onClose={() => setReleasing(null)}
					onConfirm={confirmRelease}
				/>
			)}

			<TakeJobSheet job={taking} onClose={() => setTaking(null)} onConfirm={confirmTake} />

			{late && late.visitId ? (
				<RunningLateSheet
					visible
					visitId={late.visitId}
					patientName={late.patientName}
					line={[late.startTime ? formatTimeSlot(late.startTime) : 'Instant visit', late.care]
						.filter(Boolean)
						.join(' · ')}
					onClose={() => setLate(null)}
				/>
			) : null}

			<ScheduleCalendarSheet
				visible={calendarOpen}
				onClose={() => setCalendarOpen(false)}
				selected={isPast ? null : day}
				onSelect={(iso) => {
					setSelected(iso)
					setFilter('all')
					setCalendarOpen(false)
				}}
				onClear={() => {
					setSelected(today)
					setCalendarOpen(false)
				}}
				markedDates={markedDays}
				minDate={today}
				monthsAhead={2}
				applyLabel="Show this day"
			/>
		</View>
	)
}

const styles = StyleSheet.create({
	page: { flex: 1, backgroundColor: APP_COLORS.pageBg },
	header: { borderBottomLeftRadius: 24, borderBottomRightRadius: 24, paddingBottom: 8 },
	headerTitle: { fontSize: 24, lineHeight: 30, fontWeight: '800' },
	headerSub: { fontSize: 13, lineHeight: 18, fontWeight: '700', color: APP_COLORS.disabledBtn },
	headerButtons: { flexDirection: 'row', alignItems: 'center', gap: 8 },
	todayBtn: {
		height: 36,
		paddingHorizontal: 12,
		borderRadius: 18,
		borderWidth: 1,
		borderColor: '#FFFFFF40',
		alignItems: 'center',
		justifyContent: 'center',
	},
	todayText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
	calBtn: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: '#FFFFFF1F',
		alignItems: 'center',
		justifyContent: 'center',
	},
	dateBlock: { paddingTop: 14, paddingBottom: 4, gap: 10 },
	dateHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 16 },
	dateTitle: { fontSize: 18, lineHeight: 26, fontWeight: '700', color: APP_COLORS.ink },
	dateMonth: { fontSize: 13, lineHeight: 18, color: APP_COLORS.inkMuted },
	content: { padding: 16, gap: 12 },
	loading: { paddingVertical: 32, alignItems: 'center' },
	dayRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
	dayTitle: { fontSize: 17, lineHeight: 22, fontWeight: '700', color: APP_COLORS.ink },
	daySub: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
	doneCard: {
		paddingHorizontal: 14,
		paddingVertical: 2,
		borderRadius: 16,
		borderWidth: 1,
		borderColor: SCH.cardBorder,
		backgroundColor: APP_COLORS.surface,
	},
	doneHead: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
	doneTitle: { fontSize: 12, fontWeight: '800', letterSpacing: 0.7, color: APP_COLORS.inkMuted },
	doneRow: {
		paddingVertical: 12,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		borderTopWidth: 1,
		borderTopColor: SCH.rule,
	},
	doneMid: { flex: 1, minWidth: 0, gap: 2 },
	doneName: { fontSize: 15, lineHeight: 20, fontWeight: '700', color: APP_COLORS.inkMuted },
	donePill: {
		height: 22,
		paddingHorizontal: 8,
		borderRadius: 6,
		justifyContent: 'center',
		backgroundColor: APP_COLORS.mint,
	},
	donePillText: { fontSize: 11, fontWeight: '800', color: APP_COLORS.primary },
	empty: {
		padding: 32,
		borderRadius: 16,
		borderWidth: 1,
		borderColor: SCH.cardBorder,
		backgroundColor: APP_COLORS.surface,
		alignItems: 'center',
	},
	emptyText: { fontSize: 13, color: APP_COLORS.inkMuted },
})
