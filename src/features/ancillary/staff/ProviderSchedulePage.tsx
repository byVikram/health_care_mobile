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
import Toast from 'react-native-toast-message'
import { AppInfoBanner, AppPathIcon, AppScreenHeader, AppSegmentedControl } from '../../../components/common'
import { APP_COLORS } from '../../../config/theme'
import { ROUTES } from '../../../navigation/routes'
import { useTabBarClearance } from '../../../navigation/tabBar'
import type { AppStackParamList } from '../../../navigation/types'
import { callPhone, openDirections, openOnMap } from '../../../utils/maps'
import { formatTimeSlot } from '../../../utils/formatters'
import { extractApiErrorMessage } from '../ancillaryService'
import {
	acceptOpenJob,
	apiErrorCode,
	hideOpenJob,
	isStaleJobError,
	releaseVisitDay,
	type OpenJob,
	type ReleaseScope,
} from '../providerOpenJobsService'
import {
	getProviderVisit,
	markVisitOnTheWay,
	releaseOrder,
	reportVisitIssue,
	type VisitIssueReason,
} from '../providerVisitService'
import { ScheduleCalendarSheet } from '../../doctor/dashboard/ScheduleCalendarSheet'
import { InstantRequestCard } from './schedule/InstantRequestCard'
import { ManageVisitSheet, type ManageAction } from './schedule/ManageVisitSheet'
import { OpenJobView } from './schedule/OpenJobView'
import { OpenJobsSection } from './schedule/OpenJobsSection'
import { PastVisitsView } from './schedule/PastVisitsView'
import { ReasonSheet } from './schedule/ReasonSheet'
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
import { useScheduleOffer } from './schedule/useScheduleOffer'

type Filter = 'all' | VisitKind

const FILTER_OPTIONS = [
	{ value: 'all' as const, label: 'All' },
	{ value: 'instant' as const, label: 'Instant' },
	{ value: 'scheduled' as const, label: 'Scheduled' },
]

/** Why a visit is given back, as the design words it, and how the care team files it. */
const RELEASE_REASONS: { label: string; issue: VisitIssueReason }[] = [
	{ label: 'Not available that day', issue: 'CANT_MAKE_IT' },
	{ label: 'Emergency / unwell', issue: 'CANT_MAKE_IT' },
	{ label: 'Clash with another visit', issue: 'CANT_MAKE_IT' },
	{ label: 'Other reason', issue: 'OTHER' },
]
const INSTANT_REASONS: { label: string; issue: VisitIssueReason }[] = [
	{ label: 'Stuck in traffic / too far', issue: 'RUNNING_LATE' },
	{ label: 'Previous visit running long', issue: 'RUNNING_LATE' },
	{ label: 'Emergency / unwell', issue: 'CANT_MAKE_IT' },
	{ label: 'Other reason', issue: 'OTHER' },
]

export default function ProviderSchedulePage() {
	const clearance = useTabBarClearance()
	const isFocused = useIsFocused()
	const navigation = useNavigation<NavigationProp<AppStackParamList>>()
	const { visits, openJobs, today, loading, loaded, error, reload } = useProviderSchedule()

	const [selected, setSelected] = useState('')
	const [filter, setFilter] = useState<Filter>('all')
	const [doneOpen, setDoneOpen] = useState(false)
	const [calendarOpen, setCalendarOpen] = useState(false)
	const [manage, setManage] = useState<ScheduleVisit | null>(null)
	const [releasing, setReleasing] = useState<ScheduleVisit | null>(null)
	/** What a release gives back: this day only, or this day and the later ones she holds. */
	const [releaseScope, setReleaseScope] = useState<ReleaseScope>('DAY')
	const [late, setLate] = useState<ScheduleVisit | null>(null)
	const [releaseBusy, setReleaseBusy] = useState(false)
	const [job, setJob] = useState<OpenJob | null>(null)
	const [jobBusy, setJobBusy] = useState(false)
	const [declining, setDeclining] = useState<OpenJob | null>(null)

	// Until the user picks a day, the schedule shows today (the date can change under an open screen: read it each render).
	const day = selected || today
	const isPast = day === PAST_KEY
	const days = useMemo(() => stripDays(today), [today])
	const offerOn = isFocused && !isPast && day === today && !job
	const offerState = useScheduleOffer({ enabled: isFocused && !job, onAccepted: () => void reload() })

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
		const now = new Date()
		const nowHm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
		const next = activeOn(visits, today)
			.filter((v) => v.startTime && v.startTime > nowHm)
			.sort((a, b) => a.startTime.localeCompare(b.startTime))[0]
		return next ? `Your next visit: ${formatTimeSlot(next.startTime)} with ${next.patientName}` : null
	}, [visits, today])

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

	/** How many days of the booking she holds from this one on (this day and the later ones). */
	const remainingDays = (v: ScheduleVisit) =>
		visits.filter(
			(x) =>
				x.orderId === v.orderId &&
				x.state === 'active' &&
				(x.date > v.date || (x.date === v.date && x.startTime >= v.startTime))
		).length

	const runAction = async (action: ManageAction, v: ScheduleVisit) => {
		if (action === 'details') {
			setManage(null)
			openVisit(v)
			return
		}
		if (action === 'release' || action === 'releaseDay' || action === 'releaseRest') {
			setManage(null)
			setReleaseScope(action === 'releaseRest' ? 'REMAINING' : 'DAY')
			setReleasing(v)
			return
		}
		if (action === 'late') {
			setManage(null)
			setLate(v)
			return
		}
		setManage(null)
		try {
			if (action === 'navigate' || action === 'call') {
				const detail = v.visitId ? await getProviderVisit(v.visitId) : null
				if (action === 'navigate') {
					if (detail) {
						await openDirections(
							detail.address.latitude,
							detail.address.longitude,
							detail.address.street_address
						)
					} else {
						openOnMap(v.address, undefined)
					}
				} else if (detail?.patient.phone) {
					await callPhone(detail.patient.phone)
				} else {
					Toast.show({ type: 'info', text1: 'No phone number for this patient' })
				}
			} else if (action === 'onTheWay' && v.visitId) {
				await markVisitOnTheWay(v.visitId, true)
				Toast.show({ type: 'success', text1: `${v.patientName} can see you are on the way` })
				void reload()
			}
		} catch (e) {
			Toast.show({
				type: 'error',
				text1: 'That did not work',
				text2: extractApiErrorMessage(e, 'Please try again.'),
			})
		}
	}

	const confirmRelease = async (reason: string, note: string) => {
		if (!releasing || releaseBusy) return
		setReleaseBusy(true)
		const all = releaseScope === 'REMAINING' && remainingDays(releasing) > 1
		const reasons = releasing.kind === 'instant' ? INSTANT_REASONS : RELEASE_REASONS
		const issue = reasons.find((r) => r.label === reason)?.issue ?? 'OTHER'
		const text = [reason, note].filter(Boolean).join(' - ')
		try {
			// Noted for the care team BEFORE the hand-back: once the visit is given back the provider no longer holds it and the server
			// refuses her note. A note that cannot be saved is not worth stopping the release for.
			if (releasing.visitId)
				await reportVisitIssue(releasing.visitId, issue, text, { silent: true }).catch(() => undefined)
			// A visit of a booking sent out day by day goes back out by itself: this day, or this and the later ones. An instant visit, and
			// an older order that was never sent out that way (409 RELEASE_NOT_SUPPORTED), go back as the whole order.
			let wholeOrder = releasing.kind === 'instant' || !releasing.visitId
			if (!wholeOrder && releasing.visitId) {
				try {
					await releaseVisitDay(releasing.visitId, releaseScope, reason, note)
				} catch (e) {
					if (apiErrorCode(e) !== 'RELEASE_NOT_SUPPORTED') throw e
					wholeOrder = true
				}
			}
			if (wholeOrder) await releaseOrder(releasing.orderId, text)
			setReleasing(null)
			Toast.show({
				type: 'success',
				text1:
					releasing.kind === 'instant'
						? 'Instant visit passed to another nurse'
						: all
							? 'Released · finding other nurses'
							: 'Released · finding another nurse',
			})
			void reload()
		} catch (e) {
			Toast.show({
				type: 'error',
				text1: 'Could not release the visit',
				text2: extractApiErrorMessage(e, 'Please try again.'),
			})
		} finally {
			setReleaseBusy(false)
		}
	}

	/**
	 * A refused job call. Someone else took it, or a day is no longer open: the list was out of date, so say so and re-read it.
	 * Anything else (a clash with a visit she holds, no connection) shows the server's own sentence and leaves the job open.
	 */
	const onJobError = (e: unknown, title: string) => {
		if (isStaleJobError(e)) {
			Toast.show({
				type: 'info',
				text1:
					apiErrorCode(e) === 'ALREADY_TAKEN' ? 'Someone else just took this' : 'That day is no longer open',
				text2: extractApiErrorMessage(e, 'Your list has been refreshed.'),
			})
			setJob(null)
			setDeclining(null)
			void reload()
			return
		}
		Toast.show({ type: 'error', text1: title, text2: extractApiErrorMessage(e, 'Please try again.') })
	}

	const acceptJob = async (j: OpenJob, dates: string[]) => {
		setJobBusy(true)
		try {
			const res = await acceptOpenJob(j.id, dates)
			setJob(null)
			void reload()
			// What the server really gave her: a day someone took meanwhile is not in `acceptedDates`.
			const taken = res.acceptedDates.map(longDay)
			const left = (
				res.openDates.length
					? res.openDates
					: j.days.filter((d) => !res.acceptedDates.includes(d.date)).map((d) => d.date)
			).map(longDay)
			const first = j.patientName
			Toast.show({
				type: 'success',
				text1: left.length
					? `Added ${taken.join(', ')} · ${left.join(', ')} stays open for other nurses`
					: j.days.length > 1
						? `All ${j.days.length} days with ${first} added to your schedule`
						: `Visit with ${first} added to your schedule`,
			})
		} catch (e) {
			onJobError(e, 'Could not pick up this job')
		} finally {
			setJobBusy(false)
		}
	}

	const declineJob = async (j: OpenJob, reason: string) => {
		setJobBusy(true)
		try {
			await hideOpenJob(j.id, reason)
			setDeclining(null)
			setJob(null)
			void reload()
			Toast.show({ type: 'success', text1: 'Job hidden · it stays open for other nurses' })
		} catch (e) {
			onJobError(e, 'Could not hide this job')
		} finally {
			setJobBusy(false)
		}
	}

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
					<ReasonSheet
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
						busy={jobBusy}
						onClose={() => setDeclining(null)}
						onConfirm={(reason) => void declineJob(declining, reason)}
					/>
				)}
			</>
		)
	}

	const isToday = day === today
	const relMany = releasing ? remainingDays(releasing) > 1 : false
	const relRest = relMany && releaseScope === 'REMAINING'
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
								onPick={(j) =>
									void acceptJob(
										j,
										j.days.map((d) => d.date)
									)
								}
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
				<ReasonSheet
					visible
					title={
						releasing.kind === 'instant'
							? 'Can’t make it?'
							: relRest
								? 'Release remaining days?'
								: relMany
									? 'Release this day?'
									: 'Release this visit?'
					}
					subtitle={
						releasing.kind === 'instant'
							? `${releasing.patientName.split(' ')[0]} is waiting for you.`
							: relRest
								? `You’ll stop visiting ${releasing.patientName} from ${longDay(releasing.date)}.`
								: relMany
									? `Only ${longDay(releasing.date)}. Your other days with ${releasing.patientName} stay yours.`
									: undefined
					}
					who={releasing.patientName}
					line={[
						releasing.kind === 'instant' ? 'Instant visit' : longDay(releasing.date),
						releasing.startTime ? formatTimeSlot(releasing.startTime) : null,
						releasing.care,
					]
						.filter(Boolean)
						.join(' · ')}
					reasons={(releasing.kind === 'instant' ? INSTANT_REASONS : RELEASE_REASONS).map((r) => r.label)}
					notePlaceholder="Note for the care team (optional)"
					info={
						releasing.kind === 'instant'
							? `We’ll offer this visit to other nurses nearby right away and tell ${releasing.patientName.split(' ')[0]}.`
							: 'We’ll offer it to other nurses nearby and tell the family who’s coming. Release at least 12 hours before the visit when you can.'
					}
					confirmLabel={
						releasing.kind === 'instant'
							? 'Cancel instant visit'
							: relRest
								? `Release ${remainingDays(releasing)} days`
								: relMany
									? 'Release this day'
									: 'Release this visit'
					}
					busy={releaseBusy}
					onClose={() => setReleasing(null)}
					onConfirm={(reason, note) => void confirmRelease(reason, note)}
				/>
			)}

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
