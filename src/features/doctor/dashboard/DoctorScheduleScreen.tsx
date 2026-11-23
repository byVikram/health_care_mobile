// src/features/doctor/dashboard/DoctorScheduleScreen.tsx
//
// Doctor dashboard "Schedule" view, built to the "Doctor Dashboard NEW" design:
//   Date strip   a "Past" chip, then one chip per day from today (a dot under days that hold appointments); the calendar button
//                and the "Today" pill in the header jump to a day.
//   Day          a "N booking requests" banner (-> the Booking requests page), the day's title and an All / In-clinic / Video
//                switch, for today a progress bar ("4 seen · 1 no-show · 7 to go"), then "UP NEXT" rows with the one thing to do
//                next (Check in / Checked in / Start video) and a three-dots menu (reschedule, no-show, cancel), and a folded
//                "EARLIER TODAY" list of the visits that are over.
//   Requests     the Booking requests page: pending booking requests and patients' reschedule requests as swipe cards (right
//                accepts, left declines, the three dots hold every option: accept, ask for another time, refer, decline).
//   Past         a date range (Yesterday / 7 days / 30 days / 3 months / custom), a name search and a Status + Visit-type filter
//                sheet, rows grouped by day with "N of M seen".
// All of it is wired to the real appointments API. Reschedule never picks a slot for the doctor: it asks the PATIENT to choose a
// new time (AskPatientRescheduleSheet); Refer reuses the real referral service (ReferDoctorSheet).
// Not drawn because nothing behind them exists yet: the booking requests' 6-hour answer window, the call-patient action, a
// clinic-closed day on the strip.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, BackHandler, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import Toast from 'react-native-toast-message'
import {
	AppAppointmentRow,
	AppConfirmSheet,
	AppEmptyCard,
	AppPathIcon,
	AppSearchBar,
	AppSegmentedControl,
	AppButton,
	AppChip,
	AppFilterSheet,
	AppSoftCard,
	type AppFilterGroup,
	type AppTagTone,
} from '../../../components/common'
import { useAuth } from '../../../context/AuthContext'
import { APP_COLORS, formatInr, TONES } from '../../../config/theme'
import { ROUTES } from '../../../navigation/routes'
import { useTabBarClearance } from '../../../navigation/tabBar'
import { DoctorScreenHeader } from './DoctorScreenHeader'
import { DoctorStatusBanner } from './DoctorStatusBanner'
import { useDoctorStatus } from './useDoctorStatus'
import { ScheduleCalendarSheet } from './ScheduleCalendarSheet'
import { PAST_KEY, ScheduleDateStrip } from './ScheduleDateStrip'
import { ScheduleRow, type RowAction, type RowChip } from './ScheduleRow'
import { DayProgress, RequestsBanner } from './ScheduleParts'
import { AutoConfirmCard } from './AutoConfirmCard'
import { BookingRequestsView, requestWho } from './BookingRequestsView'
import { DeclineRequestSheet, ReferDoctorSheet, RequestActionsSheet } from './RequestSheets'
import { useStartConsultation } from './useStartConsultation'
import { TodayActionSheet, type TodaySheetMode } from './TodayActionSheet'
import { askPatientToReschedule, getAllAppointments, getAutoConfirm, getStatusIdByLabel, markAppointmentNoShow, setAppointmentCheckIn, setAutoConfirm } from '../doctorService'
import { updateAppointmentsStatus } from '../../../services/appointmentService'
import { AskPatientRescheduleSheet } from '../components/AskPatientRescheduleSheet'
import { createReferral, type Referral } from '../../referrals/referralService'
import { byDateTime, fetchWaitingRequests } from '../waitingRequests'
import { clinicTodayIso, dateLabelOf, effectiveStatusLabel, formatMinutes, formatTime12h, humanizeStatus, isAccepted, isCompletedAppt, isPending, isRequestLike, isNoShowAppt, isRescheduleNeeded, isUrgentRequest, isVideoMode, MON_SHORT, minutesUntilStart, NO_SHOW_SOURCE_STATUSES, noShowWindow, rowStatusTone, statusLabelOf, toApiDate } from '../scheduleUtils'
import type { Appointment } from '../../../types/appointment'
import type { FavouriteDoctorListItem } from '../search/components/FavouriteDoctorList'
import { showStatusModal } from '../../../services/apiService'

/** The day list, or the full-page Booking requests. */
type ScheduleView = 'day' | 'requests'
type VisitFilter = 'any' | 'clinic' | 'video'
type PastRangeKey = 'last7' | 'last30' | 'last90' | 'all' | 'month' | 'custom'
type PastStatusKey = 'completed' | 'no_show' | 'referred' | 'cancelled' | 'other'

const PAST_RANGES: { id: PastRangeKey; label: string }[] = [
	{ id: 'last7', label: 'Last 7 days' },
	{ id: 'last30', label: 'Last 30 days' },
	{ id: 'last90', label: 'Last 3 months' },
	{ id: 'all', label: 'All time' },
	{ id: 'month', label: 'This month' },
	{ id: 'custom', label: 'Custom dates' },
]
const PAST_STATUS_FILTERS: { id: 'all' | Exclude<PastStatusKey, 'other'>; label: string }[] = [
	{ id: 'all', label: 'All' },
	{ id: 'completed', label: 'Seen' },
	{ id: 'no_show', label: 'No-show' },
	{ id: 'referred', label: 'Referred' },
	{ id: 'cancelled', label: 'Cancelled' },
]
// The Past "Filters" sheet (the shared AppFilterSheet): when the visit happened, and how it ended.
const PAST_FILTER_GROUPS: AppFilterGroup[] = [
	{
		key: 'date',
		label: 'Date',
		title: 'Date',
		hint: 'When the visit happened',
		multi: false,
		options: PAST_RANGES.map((r) => ({ value: r.id, label: r.label })),
	},
	{
		key: 'status',
		label: 'Visit status',
		title: 'Visit status',
		hint: 'How the visit ended',
		multi: false,
		options: PAST_STATUS_FILTERS.map((f) => ({ value: f.id, label: f.label })),
	},
]
// Visits shown at first in Past, and each "Show older visits" adds.
const PAST_PAGE = 6
// "All time" reaches back to here.
const PAST_EPOCH = '2000-01-01'
// Matches the calendar sheet's three-month reach.
const UPCOMING_WINDOW_DAYS = 90
const ISO_RE = /^\d{4}-\d{2}-\d{2}$/

// statusLabelOf/isPending/isAccepted imported from ../scheduleUtils -- shared with DoctorHomeScreen
// so the Requests/Today/All categorization rule can't drift between the two screens.
const isCompleted = isCompletedAppt

// A past-dated appointment that was never completed or cancelled (still confirmed / not_arrived /
// no_show) is, in practice, a no-show -- the design's Past list knows Seen / No-show / Referred / Cancelled, so those buckets are
// derived from the real status label (and from the doctor's sent referrals: a visit that was referred is "Referred", whatever
// its status says, unless it was seen or cancelled) rather than invented.
// Anything else (e.g. checked_in, rescheduled) stays visible under "All" with its own label.
function pastStatusKey(apt: Appointment, referred: boolean): PastStatusKey {
	const l = statusLabelOf(apt).toLowerCase()
	if (l === 'completed') return 'completed'
	if (l === 'cancelled') return 'cancelled'
	if (referred) return 'referred'
	if (l === 'no_show') return 'no_show'
	// Confirmed / not arrived and still markable: not a no-show yet, so it is listed (as "Not arrived") under All only.
	if (l === 'not_arrived' || l === 'confirmed') return canStillMarkNoShow(apt) ? 'other' : 'no_show'
	return 'other'
}
/** A past appointment the doctor can still mark as a no-show: confirmed / not arrived, within the policy's window. */
function canStillMarkNoShow(apt: Appointment): boolean {
	return NO_SHOW_SOURCE_STATUSES.includes(statusLabelOf(apt).toLowerCase()) && !noShowWindow(apt).expired
}
function pastStatusDisplay(apt: Appointment, referred: boolean): { label: string; tone: AppTagTone } {
	// Not marked yet (the "No-show" action is offered on the row): do not call it a no-show before the doctor does.
	if (!referred && canStillMarkNoShow(apt)) return { label: 'Not arrived', tone: 'onTheWay' }
	switch (pastStatusKey(apt, referred)) {
		case 'referred':
			return { label: 'Referred', tone: 'lilac' }
		case 'completed':
			return { label: 'Completed', tone: 'completed' }
		case 'cancelled':
			return { label: 'Cancelled', tone: 'cancelled' }
		case 'no_show':
			return { label: 'No-show', tone: 'sand' }
		default:
			return { label: humanizeStatus(statusLabelOf(apt)), tone: rowStatusTone(statusLabelOf(apt)) }
	}
}

function todayIso() {
	return clinicTodayIso() // today in Mumbai (the clinic's clock), not the phone's date
}
function isoPlusDays(iso: string, days: number) {
	const d = new Date(`${iso}T00:00:00`)
	d.setDate(d.getDate() + days)
	return toApiDate(d)
}
function resolvePastRange(key: PastRangeKey, customFrom: string, customTo: string): { from: string; to: string } {
	if (key === 'custom') return { from: customFrom, to: customTo }
	const today = todayIso()
	const to = isoPlusDays(today, -1)
	if (key === 'all') return { from: PAST_EPOCH, to }
	if (key === 'month') return { from: `${today.slice(0, 8)}01`, to }
	const days = key === 'last7' ? 7 : key === 'last90' ? 90 : 30
	return { from: isoPlusDays(today, -days), to }
}

const MON_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
/** "September 2026" */
function monthLabelOf(iso: string) {
	const d = new Date(`${iso}T00:00:00`)
	if (Number.isNaN(d.getTime())) return ''
	return `${MON_FULL[d.getMonth()]} ${d.getFullYear()}`
}
/** "26 Sep" */
function shortDateLabelOf(iso: string) {
	const d = new Date(`${iso}T00:00:00`)
	if (Number.isNaN(d.getTime())) return iso
	return `${d.getDate()} ${MON_SHORT[d.getMonth()]}`
}
function slotLabelOf(apt: Appointment, includeDate: boolean) {
	const time = formatTime12h(apt.start_time)
	if (!includeDate) return `Today, ${time}`
	// "Today, Thu 25 Sep, 4:00 PM" / "Fri 26 Sep, 4:00 PM"
	const day = dateLabelOf(apt.appointment_date)
	return `${apt.appointment_date === todayIso() ? `Today, ${day}` : day}, ${time}`
}
type Outcome = { kind: 'accept' | 'reject' | 'reschedule' | 'refer'; title: string; sub: string; tone: 'success' | 'danger' | 'info' | 'purple' }

/** What a Today row says after its three-dots sheet was used. */
function todayOutcomeOf(o?: Outcome): { text: string; tone: 'danger' | 'info' } | undefined {
	if (!o) return undefined
	if (o.kind === 'reject') return { text: 'Cancelled · patient notified', tone: 'danger' }
	// The patient still has to choose the new time, so the row says it was asked, not that it moved.
	if (o.kind === 'reschedule') return { text: o.title, tone: 'info' }
	return undefined
}

export function DoctorScheduleScreen() {
	const navigation = useNavigation<any>()
	const route = useRoute<any>()
	const clearance = useTabBarClearance()
	const { selectedHospitalId } = useAuth()
	// Scope every list to the clinic chosen in the clinic switcher in the header (null = All clinics).
	const clinicFilter = selectedHospitalId ? { hospital_id: selectedHospitalId } : {}

	const today = todayIso()
	// The days of the strip: today and the next 90 (the reach of the calendar sheet).
	const stripDays = useMemo(() => Array.from({ length: UPCOMING_WINDOW_DAYS + 1 }, (_, i) => isoPlusDays(today, i)), [today])
	// What the strip has picked: PAST_KEY or a day (YYYY-MM-DD). The drawer's "Treatment History" opens on Past.
	const openedOn = (p: any) => (p?.segment === 'all' && p?.mode === 'past' ? PAST_KEY : today)
	const [selected, setSelected] = useState<string>(openedOn(route.params))
	const [view, setView] = useState<ScheduleView>(route.params?.segment === 'req' ? 'requests' : 'day')
	const [calOpen, setCalOpen] = useState(false)

	// The picked day: today has its own list (it also holds the visits that are over), later days come from `upList` below.
	const [todayList, setTodayList] = useState<Appointment[]>([])
	const [todayLoading, setTodayLoading] = useState(true)
	const [visit, setVisit] = useState<VisitFilter>('any')
	// "EARLIER TODAY" is folded until opened.
	const [earlierOpen, setEarlierOpen] = useState(false)
	const { startingId, start: startVisit } = useStartConsultation()

	// Requests: pending only (uses variant='upcoming', so a request whose date has already gone by
	// without being acted on ages out).
	const [reqList, setReqList] = useState<Appointment[]>([])
	// The doctor's sent referrals by the appointment they came from (the ones still standing): a referred request is closed for the
	// doctor (it leaves Requests), and a referred visit is "Referred" in Past.
	const [referrals, setReferrals] = useState<Record<string, Referral>>({})
	// The last read of the requests failed: the list on screen is the last good one (or empty), not proof that none are waiting.
	const [reqFailed, setReqFailed] = useState(false)
	const [reqLoading, setReqLoading] = useState(true)
	const [outcomes, setOutcomes] = useState<Record<string, Outcome>>({})
	const [busyId, setBusyId] = useState<string | null>(null)
	// The sheets of a booking request: its three-dots menu, then Decline or Refer.
	const [reqSheet, setReqSheet] = useState<{ kind: 'menu' | 'decline' | 'refer'; appt: Appointment } | null>(null)
	// The three-dots sheet of a Today row (menu -> reschedule / cancel).
	// noShowOnly = opened from the Past list straight on the "Mark as no-show" step.
	const [todaySheet, setTodaySheet] = useState<{ mode: TodaySheetMode; appt: Appointment; noShowOnly?: boolean } | null>(null)
	// Why marking a no-show failed (the server's 400 message), shown inside that sheet.
	const [noShowError, setNoShowError] = useState<string | null>(null)
	// The appointment whose patient the doctor is being asked to confirm "ask to reschedule" for.
	const [askTarget, setAskTarget] = useState<Appointment | null>(null)
	const [checkingInId, setCheckingInId] = useState<string | null>(null)
	// The patient whose check-in the doctor is being asked to confirm undoing.
	const [undoTarget, setUndoTarget] = useState<Appointment | null>(null)

	// The Schedule tab stays mounted between visits, so a later navigate(SCHEDULE, { segment, mode }) (the Home
	// shortcuts, the drawer's My Consultations / Treatment History) has to move the view itself: the initial
	// state above only covers the first mount.
	useEffect(() => {
		const { segment } = route.params ?? {}
		if (!segment) return
		setView(segment === 'req' ? 'requests' : 'day')
		if (segment !== 'req') setSelected(openedOn(route.params))
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [route.params])

	// The phone's back button leaves the Booking requests page for the day list instead of leaving the tab.
	useEffect(() => {
		if (view !== 'requests') return
		const sub = BackHandler.addEventListener('hardwareBackPress', () => {
			setView('day')
			return true
		})
		return () => sub.remove()
	}, [view])

	// The "Auto-confirm bookings" switch on the Booking requests page: null until the server has said (the card waits for it).
	const [autoOn, setAutoOn] = useState<boolean | null>(null)
	const [autoBusy, setAutoBusy] = useState(false)
	const [autoConfirmed, setAutoConfirmed] = useState(0)

	// From today on: every confirmed day, only for the dots of the strip (a later day's own list is `futureRows`).
	const [upList, setUpList] = useState<Appointment[]>([])
	// The picked day after today, read for that date alone, so it is complete however many other days are booked.
	const [futureRows, setFutureRows] = useState<Appointment[]>([])
	const [futureLoading, setFutureLoading] = useState(false)

	// The newest read of a list wins: a slower reply for a day or range the doctor has already moved off must not replace the
	// list now on screen.
	const futureReq = useRef(0)
	const pastReq = useRef(0)

	// Past (defaults to the last 30 days, like the design)
	const [pastFilterOpen, setPastFilterOpen] = useState(false)
	const [pastRange, setPastRange] = useState<PastRangeKey>('last30')
	const [pastQuery, setPastQuery] = useState('')
	const [pastFrom, setPastFrom] = useState(isoPlusDays(todayIso(), -30))
	const [pastTo, setPastTo] = useState(isoPlusDays(todayIso(), -1))
	const [pastStatus, setPastStatus] = useState<'all' | Exclude<PastStatusKey, 'other'>>('all')
	// "Show older visits": how many more than the first page, for the filters it was pressed under.
	const [pastMore, setPastMore] = useState<{ key: string; extra: number }>({ key: '', extra: 0 })
	const [pastList, setPastList] = useState<Appointment[]>([])
	const [pastLoading, setPastLoading] = useState(true)

	const [refreshing, setRefreshing] = useState(false)
	const { status: doctorStatus, reload: reloadStatus } = useDoctorStatus()

	const loadToday = useCallback(async (silent = false) => {
		if (!silent) setTodayLoading(true)
		try {
			const rows = await getAllAppointments({ appointment_date: todayIso(), variant: 'all', ...clinicFilter })
			// Today shows what the doctor has already accepted (at any point in today's arrival
			// workflow) plus what's already done -- never a still-pending request, even if it happens
			// to be dated today. Those stay under Requests until the doctor acts on them. A patient marked
			// no-show stays on the list too (under "Earlier today"): they may still turn up later. One waiting for the patient to
			// choose a new time stays too, so the doctor sees where it stands.
			setTodayList(
				rows
					.filter((a) => isAccepted(a) || isCompleted(a) || isNoShowAppt(a) || isRescheduleNeeded(a))
					.sort((a, b) => (a.start_time ?? '').localeCompare(b.start_time ?? '')),
			)
		} catch {
			setTodayList([])
		} finally {
			setTodayLoading(false)
		}
	}, [selectedHospitalId])

	const loadRequests = useCallback(async (silent = false) => {
		if (!silent) setReqLoading(true)
		try {
			// The same function Home counts them with (waitingRequests.ts): no action taken yet -- pending, or a reschedule the patient
			// asked for; regardless of date; one the doctor has referred is answered ("the request closes as Referred"), so not listed.
			const { requests, referred } = await fetchWaitingRequests(selectedHospitalId)
			if (referred) setReferrals(referred)
			setReqList(requests)
			setReqFailed(false)
			// What was done to a request on this screen is remembered only until the server shows it again: a request that comes
			// back (the patient chose the new time we asked for, so it is waiting for us once more) must not stay hidden.
			setOutcomes((prev) => {
				if (!requests.some((a) => prev[a.id])) return prev
				const next = { ...prev }
				requests.forEach((a) => delete next[a.id])
				return next
			})
		} catch {
			// Keep what is on screen: an empty list here would read as "no requests waiting" and show the Auto-confirm card.
			setReqFailed(true)
		} finally {
			setReqLoading(false)
		}
	}, [selectedHospitalId])

	const loadUpcoming = useCallback(async () => {
		try {
			// Every day still to come, for the strip's dots (today's rows also have their own list).
			const rows = await getAllAppointments({
				start_date: todayIso(),
				end_date: isoPlusDays(todayIso(), UPCOMING_WINDOW_DAYS),
				variant: 'all',
				...clinicFilter,
			})
			// Confirmed bookings only -- a still-pending request belongs to Requests. Ones waiting for the patient to
			// choose a new time (reschedule_required) stay listed so the doctor can see where they stand.
			setUpList(rows.filter((a) => isAccepted(a) || isRescheduleNeeded(a)).sort(byDateTime))
		} catch {
			// Keep the dots as they were.
		}
	}, [selectedHospitalId])

	// The picked day after today: asked for by its own date, never cut out of a longer list.
	const loadFuture = useCallback(
		async (silent = false) => {
			const req = ++futureReq.current
			if (selected === PAST_KEY || selected === todayIso()) return
			if (!silent) {
				setFutureRows([])
				setFutureLoading(true)
			}
			try {
				const rows = await getAllAppointments({ appointment_date: selected, variant: 'all', ...clinicFilter })
				if (req !== futureReq.current) return
				setFutureRows(rows.filter((a) => isAccepted(a) || isRescheduleNeeded(a)).sort(byDateTime))
			} catch {
				// Keep what is shown (a silent re-read that fails changes nothing).
			} finally {
				if (req === futureReq.current) setFutureLoading(false)
			}
		},
		[selected, selectedHospitalId],
	)

	const loadPast = useCallback(async () => {
		const req = ++pastReq.current
		const { from, to } = resolvePastRange(pastRange, pastFrom, pastTo)
		// A half-typed custom date shouldn't fire a request.
		if (!ISO_RE.test(from) || !ISO_RE.test(to)) {
			setPastLoading(false)
			return
		}
		// A range with no days in it (this month, on the 1st) has nothing to read.
		if (from > to) {
			setPastList([])
			setPastLoading(false)
			return
		}
		setPastLoading(true)
		try {
			const rows = await getAllAppointments({ start_date: from, end_date: to, variant: 'all', ...clinicFilter }, 5)
			if (req === pastReq.current) setPastList(rows)
		} catch {
			if (req === pastReq.current) setPastList([])
		} finally {
			if (req === pastReq.current) setPastLoading(false)
		}
	}, [pastRange, pastFrom, pastTo, selectedHospitalId])

	useEffect(() => {
		loadToday()
		loadRequests()
		loadUpcoming()
	}, [loadToday, loadRequests, loadUpcoming])

	useEffect(() => {
		void loadFuture()
	}, [loadFuture])

	// The Schedule tab stays mounted, so new booking requests (made while the doctor was elsewhere) are read again each time it comes
	// back into view: the requests banner and the Auto-confirm card below it follow the pending count without a pull to refresh.
	// (The first focus is the mount above, which has just read them.)
	const seenFocus = useRef(false)
	useFocusEffect(
		useCallback(() => {
			if (!seenFocus.current) {
				seenFocus.current = true
				return
			}
			void loadRequests(true)
		}, [loadRequests]),
	)

	useEffect(() => {
		loadPast()
	}, [loadPast])

	const refreshAll = () => {
		setRefreshing(true)
		void reloadStatus()
		Promise.all([loadToday(), loadRequests(), loadUpcoming(), loadFuture(true), loadPast()]).finally(() => setRefreshing(false))
	}

	// ── The picked day ─────────────────────────────────────────────────────
	const isToday = selected === today
	const dayAll = isToday ? todayList : futureRows
	const dayList = dayAll.filter((a) => visit === 'any' || (visit === 'video' ? isVideoMode(a.appointment_mode) : !isVideoMode(a.appointment_mode)))
	const dayLoading = isToday ? todayLoading : futureLoading
	// Today: the patients still to be seen first (earliest first), then the visits that are over (seen, no-show), which are folded.
	const dayToSee = dayList.filter((a) => !isCompleted(a) && !isNoShowAppt(a))
	const dayEarlier = isToday ? dayList.filter((a) => isCompleted(a) || isNoShowAppt(a)) : []
	const seenCount = dayList.filter(isCompleted).length
	const noShowCount = dayList.filter(isNoShowAppt).length
	const dayCountLabel = `${dayList.length} ${dayList.length === 1 ? 'appointment' : 'appointments'}`
	const dayTitle = isToday ? `Today, ${dateLabelOf(selected)}` : dateLabelOf(selected)
	// Dots under the strip's days: every day that holds an appointment.
	const markedDays = useMemo(() => {
		const set = new Set(upList.map((a) => a.appointment_date))
		if (todayList.length) set.add(today)
		return set
	}, [upList, todayList, today])

	// ── Past derived ───────────────────────────────────────────────────────
	const pastRangeResolved = resolvePastRange(pastRange, pastFrom, pastTo)
	const pastRangeName =
		pastRange === 'custom'
			? `Custom · ${shortDateLabelOf(pastRangeResolved.from)} – ${shortDateLabelOf(pastRangeResolved.to)}`
			: (PAST_RANGES.find((r) => r.id === pastRange)?.label ?? '')
	const pastFilterCount = (pastStatus !== 'all' ? 1 : 0) + (pastRange !== 'last30' ? 1 : 0)
	const pastNeedle = pastQuery.trim().toLowerCase()
	const isReferred = (a: Appointment) => !!referrals[a.id]
	const pastFiltered = pastList.filter((a) => {
		// A request nobody answered is not a past visit; one that was referred is.
		if (isRequestLike(a) && !isReferred(a)) return false
		if (pastStatus !== 'all' && pastStatusKey(a, isReferred(a)) !== pastStatus) return false
		if (pastNeedle && !(a.patient?.name ?? '').toLowerCase().includes(pastNeedle)) return false
		return true
	})
	const pastGroups = (() => {
		const byDate = new Map<string, Appointment[]>()
		pastFiltered.forEach((a) => {
			if (!byDate.has(a.appointment_date)) byDate.set(a.appointment_date, [])
			byDate.get(a.appointment_date)!.push(a)
		})
		return Array.from(byDate.entries())
			.sort((a, b) => b[0].localeCompare(a[0]))
			.map(([date, rows]) => [date, [...rows].sort((a, b) => (a.start_time ?? '').localeCompare(b.start_time ?? ''))] as const)
	})()
	const pastApplyLabel = `Show ${pastFiltered.length} ${pastFiltered.length === 1 ? 'visit' : 'visits'}`
	// The first page of visits, grouped by day; "Show older visits" adds more. A day cut in the middle still counts all its visits.
	const pastFilterKey = [pastRange, pastStatus, pastNeedle, pastFrom, pastTo].join('|')
	const pastShownCount = PAST_PAGE + (pastMore.key === pastFilterKey ? pastMore.extra : 0)
	const pastShownGroups = (() => {
		let left = pastShownCount
		const out: { date: string; shown: Appointment[]; all: Appointment[] }[] = []
		for (const [date, rows] of pastGroups) {
			if (left <= 0) break
			out.push({ date, shown: rows.slice(0, left), all: rows })
			left -= rows.length
		}
		return out
	})()
	const pastHasMore = pastFiltered.length > pastShownCount
	// The filters back to their start (the sheet's "Clear all"); the name search is its own box and stays.
	const resetPastFilters = () => {
		setPastStatus('all')
		setPastRange('last30')
	}
	const resetPast = () => {
		resetPastFilters()
		setPastQuery('')
	}

	// ── Requests / Upcoming action handlers ───────────────────────────────
	// A completed appointment (the Past list), or one whose patient code was already entered, opens straight into the
	// consultation page; no code is asked for.
	// A visit that was not seen opens its own page: "Referred visit" for one the doctor referred, "Missed appointment" for a no-show,
	// "Cancelled appointment" for a cancelled one, "Appointment" for one that was moved, is waiting for a new time, or is a past day
	// nobody has marked yet.
	const openAppointment = (apt: Appointment, token?: string) => {
		const referral = referrals[apt.id]
		if (!isCompletedAppt(apt) && referral) {
			navigation.navigate(ROUTES.STACK.DOCTOR_PAST_VISIT, { appointmentId: apt.id, kind: 'referred', referralId: referral.id, token })
		} else if (isNoShowAppt(apt)) {
			navigation.navigate(ROUTES.STACK.DOCTOR_PAST_VISIT, { appointmentId: apt.id, kind: 'noshow', token })
		} else if (statusLabelOf(apt).toLowerCase() === 'cancelled') {
			navigation.navigate(ROUTES.STACK.DOCTOR_PAST_VISIT, { appointmentId: apt.id, kind: 'cancelled', token })
		} else if (isRescheduleNeeded(apt) || statusLabelOf(apt).toLowerCase() === 'rescheduled') {
			// Moved, or waiting for the patient to pick a new time: no consultation to open, so the same past-visit page.
			navigation.navigate(ROUTES.STACK.DOCTOR_PAST_VISIT, { appointmentId: apt.id, kind: 'other', token })
		} else if (!isCompletedAppt(apt) && apt.appointment_date < todayIso() && !apt.access_verified) {
			// A day that is over and no visit happened: still "Confirmed" / "Not arrived" on the server, but in practice a no-show (the
			// Past list calls it one once the marking window has closed). Never the old appointment screen.
			navigation.navigate(ROUTES.STACK.DOCTOR_PAST_VISIT, { appointmentId: apt.id, kind: pastStatusKey(apt, false) === 'no_show' ? 'noshow' : 'other', token })
		} else if ((isCompletedAppt(apt) || apt.access_verified) && apt.patient?.id) {
			navigation.navigate(ROUTES.STACK.CONSULTATION, { appointmentId: apt.id, patientId: apt.patient.id })
		} else {
			navigation.navigate(ROUTES.STACK.APPOINTMENT_DETAILS, { appointmentId: apt.id })
		}
	}

	// Doctor-only: the Today toggle checks a patient in (not_arrived -> checked_in) or undoes a
	// check-in made by mistake (checked_in -> not_arrived). Both go through the one check-in endpoint
	// (payload `checked_in`) and are enforced server-side -- it is require_role("doctor") and rejects
	// any other current status; this screen only exists for doctors anyway. The row flips straight
	// away and rolls back if the call fails.
	// Checking in is one tap; undoing one asks for confirmation first (see the sheet below).
	const handleToggleCheckIn = (apt: Appointment) => {
		if (checkingInId) return
		if (effectiveStatusLabel(apt) === 'checked_in') setUndoTarget(apt)
		else void runCheckInToggle(apt)
	}

	const runCheckInToggle = async (apt: Appointment) => {
		const wasCheckedIn = effectiveStatusLabel(apt) === 'checked_in'
		const patch = (changes: Partial<Appointment>) =>
			setTodayList((prev) => prev.map((a) => (a.id === apt.id ? { ...a, ...changes } : a)))
		setCheckingInId(apt.id)
		patch({ status: wasCheckedIn ? 'not_arrived' : 'checked_in' })
		try {
			const res = await setAppointmentCheckIn(apt.id, !wasCheckedIn)
			if (!res.success) throw new Error(res.message)
			Toast.show({ type: 'success', text1: res.message ?? (wasCheckedIn ? 'Check-in undone' : 'Patient checked in') })
		} catch {
			patch({ status: apt.status })
			Toast.show({
				type: 'error',
				text1: wasCheckedIn ? 'Could not undo the check-in. Please try again.' : 'Could not check in the patient. Please try again.',
			})
		} finally {
			setCheckingInId(null)
		}
	}

	// Read the switch when the screen opens (and again, on a change of page, if the first try failed): the main page shows its card
	// when no request is waiting, the Booking requests page always does.
	useEffect(() => {
		if (autoOn !== null) return
		let live = true
		getAutoConfirm()
			.then((res) => live && setAutoOn(res.enabled))
			.catch(() => {
				// The card just stays out: the page works without it.
			})
		return () => {
			live = false
		}
	}, [view, autoOn])

	// Turning it on also confirms the requests already waiting (the server does it and says how many), so the lists are read again.
	const toggleAutoConfirm = async (on: boolean) => {
		if (autoBusy) return
		setAutoBusy(true)
		try {
			const res = await setAutoConfirm(on)
			const confirmed = on ? (res.confirmed_now ?? 0) : 0
			setAutoOn(res.enabled)
			setAutoConfirmed(confirmed)
			Toast.show({
				type: 'success',
				text1: !on
					? 'Auto-confirm off'
					: confirmed
						? `Auto-confirm on · ${confirmed} ${confirmed === 1 ? 'request' : 'requests'} confirmed`
						: 'Auto-confirm on',
			})
			if (confirmed) void Promise.all([loadToday(true), loadUpcoming(), loadFuture(true), loadRequests(true)])
		} catch (error: any) {
			Toast.show({
				type: 'error',
				text1: 'Could not change auto-confirm',
				text2: error?.response?.data?.message ?? 'Please try again.',
			})
		} finally {
			setAutoBusy(false)
		}
	}

	// A booking request was answered (accepted, declined, referred, or the patient asked for another time): its sheets close, the page
	// goes back to the day list when no request is left, and the lists are read again quietly (an accepted one now sits on its day).
	const afterRequestHandled = (apt: Appointment) => {
		setReqSheet(null)
		if (reqList.every((a) => a.id === apt.id || outcomes[a.id])) setView('day')
		void Promise.all([loadToday(true), loadUpcoming(), loadFuture(true), loadRequests(true)])
	}

	const handleAccept = async (apt: Appointment) => {
		if (busyId) return
		setBusyId(apt.id)
		try {
			const res = await updateAppointmentsStatus(apt.id, await getStatusIdByLabel('confirmed'))
			if (res.success) {
				setOutcomes((prev) => ({
					...prev,
					[apt.id]: { kind: 'accept', title: 'Accepted · added to your schedule', sub: `${slotLabelOf(apt, true)} · patient notified`, tone: 'success' },
				}))
				Toast.show({ type: 'success', text1: `${apt.patient?.name ?? 'Patient'} confirmed for ${requestWhenOf(apt)}` })
				afterRequestHandled(apt)
			}
		} catch {
			showStatusModal({
				status: 'error',
				title: "Couldn't accept the appointment",
				description: 'Please try again.',
				submitText: 'OK',
			})
		} finally {
			setBusyId(null)
		}
	}

	const handleConfirmReject = async (reasonLabel: string, note: string, target?: Appointment) => {
		const apt = target
		if (!apt || busyId) return
		setBusyId(apt.id)
		try {
			const res = await updateAppointmentsStatus(apt.id, await getStatusIdByLabel('cancelled'), note ? `${reasonLabel} — ${note}` : reasonLabel)
			if (res.success) {
				const isReq = isRequestLike(apt)
				setOutcomes((prev) => ({
					...prev,
					[apt.id]: { kind: 'reject', title: isReq ? 'Declined' : 'Cancelled', sub: reasonLabel, tone: 'danger' },
				}))
				Toast.show({ type: 'success', text1: res.message ?? (isReq ? 'Request declined' : 'Appointment cancelled') })
				if (isReq) afterRequestHandled(apt)
			}
		} catch {
			showStatusModal({
				status: 'error',
				title: "Couldn't decline the appointment",
				description: 'Please try again.',
				submitText: 'OK',
			})
		} finally {
			setBusyId(null)
			setTodaySheet(null)
		}
	}

	// Patient no-show policy: only from 60 minutes after the start until 2 days after it (checked here against the device
	// clock, and by the server, which answers 400 with its own message -- shown in the sheet when it refuses).
	const handleMarkNoShow = async (apt: Appointment) => {
		if (busyId) return
		const markWindow = noShowWindow(apt)
		if (!markWindow.canMark) {
			setNoShowError(markWindow.hint)
			return
		}
		setBusyId(apt.id)
		setNoShowError(null)
		try {
			const res = await markAppointmentNoShow(apt.id)
			if (!res.success) {
				setNoShowError(res.message || 'Could not mark the no-show. Please try again.')
				return
			}
			// A no-show of today stays on the Today list, tinted and tagged (the patient may still turn up); an older one
			// is listed under Past. Either way it is off Upcoming.
			const marked = { ...apt, status: 'no_show' }
			setUpList((prev) => prev.filter((a) => a.id !== apt.id))
			if (apt.appointment_date === todayIso()) {
				setTodayList((prev) => prev.map((a) => (a.id === apt.id ? marked : a)))
			} else {
				setTodayList((prev) => prev.filter((a) => a.id !== apt.id))
				setPastList((prev) => (prev.some((a) => a.id === apt.id) ? prev.map((a) => (a.id === apt.id ? marked : a)) : [marked, ...prev]))
			}
			setTodaySheet(null)
			Toast.show({ type: 'success', text1: 'Marked as a no-show', text2: 'The patient has been emailed.' })
		} catch (error: any) {
			setNoShowError(error?.response?.data?.message ?? error?.message ?? 'Could not mark the no-show. Please try again.')
		} finally {
			setBusyId(null)
		}
	}

	// Doctor "reschedule": no slot is chosen here. The patient is asked to pick the new time (status becomes
	// reschedule_required, the patient is emailed) and the doctor confirms the slot they choose later.
	const handleAskReschedule = async (reason: string) => {
		const apt = askTarget
		if (!apt) return
		setBusyId(apt.id)
		try {
			const res = await askPatientToReschedule(apt.id, reason)
			if (res.success) {
				setOutcomes((prev) => ({
					...prev,
					[apt.id]: {
						kind: 'reschedule',
						title: 'Asked to choose a new time',
						sub: 'Waiting for the patient to pick a slot',
						tone: 'info',
					},
				}))
				// The row is now 'reschedule_required': show that straight away instead of waiting for a refetch.
				const patch = (list: Appointment[]) => list.map((a) => (a.id === apt.id ? { ...a, status: 'reschedule_required' } : a))
				setTodayList(patch)
				setUpList(patch)
				setFutureRows(patch)
				Toast.show({ type: 'success', text1: res.message ?? 'The patient has been asked to choose a new time' })
				setAskTarget(null)
				if (isRequestLike(apt)) afterRequestHandled(apt)
			} else {
				showStatusModal({
					status: 'error',
					title: "Couldn't ask the patient to reschedule",
					description: res.message ?? 'Could not ask the patient to reschedule. Please try again.',
					submitText: 'OK',
				})
			}
		} catch (error: any) {
			showStatusModal({
				status: 'error',
				title: "Couldn't ask the patient to reschedule",
				description: error?.response?.data?.message ?? 'Could not ask the patient to reschedule. Please try again.',
				submitText: 'OK',
			})
		} finally {
			setBusyId(null)
		}
	}

	const handleConfirmRefer = async (doctor: FavouriteDoctorListItem, notes: string) => {
		if (!reqSheet) return
		const apt = reqSheet.appt
		setBusyId(apt.id)
		try {
			await createReferral({ appointment_id: apt.id, referred_doctor_id: doctor.id, notes: notes || undefined })
			setOutcomes((prev) => ({
				...prev,
				[apt.id]: { kind: 'refer', title: `Referred to ${doctor.name}`, sub: notes || 'No notes added', tone: 'purple' },
			}))
			Toast.show({ type: 'success', text1: `Referred to ${doctor.name}` })
			afterRequestHandled(apt)
		} catch {
			showStatusModal({
				status: 'error',
				title: "Couldn't refer the appointment",
				description: 'Failed to refer appointment. Please try again.',
				submitText: 'OK',
			})
		} finally {
			setBusyId(null)
		}
	}

	// "Today, 8:00 PM" / "Fri 26 Sep, 10:30 AM": the slot of a request card.
	const requestWhenOf = (apt: Appointment) =>
		apt.appointment_date === today ? `Today, ${formatTime12h(apt.start_time)}` : `${dateLabelOf(apt.appointment_date)}, ${formatTime12h(apt.start_time)}`
	const requestFeeOf = (apt: Appointment) => {
		const fee = formatInr(apt.fees)
		return fee === '--' ? '' : fee
	}
	const requestWho3 = (apt: Appointment) => ({
		name: apt.patient?.name ?? 'Patient',
		line: `${requestWhenOf(apt)} · ${requestWho(apt)}`,
		flag: isUrgentRequest(apt),
	})

	const reqVisible = reqList.filter((a) => !outcomes[a.id])
	const reqLeft = reqVisible.length
	const urgentLeft = reqVisible.filter(isUrgentRequest).length
	const yesterdayIso = isoPlusDays(today, -1)

	const ageSex = (apt: Appointment) => {
		const age = apt.patient?.age
		const sex = (apt.patient?.gender ?? '').trim().charAt(0).toUpperCase()
		return age ? `${age} ${sex}`.trim() : sex || null
	}
	const reasonOf = (apt: Appointment) => apt.reason || apt.symptoms || apt.pre_intake?.symptoms || null

	// One line of the day list: what the patient's status says, the one thing to do next, and the three-dots menu.
	const renderDayRow = (apt: Appointment, divider: boolean) => {
		const label = effectiveStatusLabel(apt)
		const video = isVideoMode(apt.appointment_mode)
		const done = isCompleted(apt)
		const noShow = isNoShowAppt(apt)
		const needsNewTime = isRescheduleNeeded(apt)
		const outcome = todayOutcomeOf(outcomes[apt.id])
		const diff = isToday ? minutesUntilStart(apt) : null
		const late = isToday && label === 'not_arrived' && diff !== null && diff < 0

		const lead = noShow ? 'No-show' : label === 'not_arrived' ? 'Not arrived' : video ? 'Video' : 'In-clinic'
		const detail = late
			? `Not arrived · ${formatMinutes(diff ?? 0)} late`
			: [lead, ageSex(apt), reasonOf(apt)].filter(Boolean).join(' · ')

		let action: RowAction | undefined
		let chip: RowChip | undefined
		if (outcome) {
			chip = outcome.tone === 'danger' ? { text: 'Cancelled', bg: APP_COLORS.dangerBg, fg: APP_COLORS.danger } : { text: 'Asked to reschedule', bg: TONES.sky.bg, fg: TONES.sky.ink }
		} else if (done) {
			chip = { text: 'Seen', bg: APP_COLORS.successBg, fg: APP_COLORS.success }
		} else if (needsNewTime) {
			chip = { text: 'Reschedule needed', bg: TONES.sky.bg, fg: TONES.sky.ink }
		} else if (noShow) {
			// The patient turned up after being marked: checking them in reverses the no-show.
			action = { kind: 'checkin', label: 'Check in', busy: checkingInId === apt.id, onPress: () => handleToggleCheckIn(apt) }
		} else if (isToday) {
			if (video) action = { kind: 'video', busy: startingId === apt.id, onPress: () => startVisit(apt) }
			else if (apt.access_verified && label === 'checked_in') chip = { text: 'In consultation', bg: TONES.lilac.bg, fg: TONES.lilac.ink }
			else if (label === 'checked_in') action = { kind: 'checkedin', busy: checkingInId === apt.id, onPress: () => handleToggleCheckIn(apt) }
			else action = { kind: 'checkin', busy: checkingInId === apt.id, onPress: () => handleToggleCheckIn(apt) }
		}
		const menu = !outcome && !done && !noShow && !needsNewTime
		return (
			<ScheduleRow
				key={apt.id}
				time={formatTime12h(apt.start_time)}
				late={late}
				ready={label === 'checked_in'}
				name={apt.patient?.name ?? 'Patient'}
				video={video}
				detail={detail}
				action={action}
				chip={chip}
				muted={done || noShow || !!outcome}
				divider={divider}
				onPress={() => openAppointment(apt)}
				onMore={menu ? () => setTodaySheet({ mode: 'menu', appt: apt }) : undefined}
			/>
		)
	}

	// One line of the Past list: the shared appointment row, with the visit's number in that day's clinic queue ("Token 05").
	const renderPastRow = (apt: Appointment, divider: boolean, token: string) => {
		const referred = isReferred(apt)
		const st = pastStatusDisplay(apt, referred)
		const markable = !referred && canStillMarkNoShow(apt)
		const video = isVideoMode(apt.appointment_mode)
		return (
			<AppAppointmentRow
				key={apt.id}
				time={formatTime12h(apt.start_time)}
				token={video ? 'Video' : token}
				name={apt.patient?.name ?? 'Patient'}
				mode={video ? 'Video' : 'In-clinic'}
				meta={[apt.patient?.age ? `${apt.patient.age} yrs` : null, apt.patient?.gender].filter(Boolean).join(' · ')}
				status={st.tone === 'completed' ? 'Seen' : st.label}
				statusTone={st.tone}
				action={
					markable
						? {
								label: 'No-show',
								disabled: !noShowWindow(apt).canMark,
								onPress: () => {
									setNoShowError(null)
									setTodaySheet({ mode: 'no_show', appt: apt, noShowOnly: true })
								},
							}
						: undefined
				}
				divider={divider}
				onPress={() => openAppointment(apt, video ? undefined : token)}
			/>
		)
	}

	// "1h 30m late" for a patient whose slot has started and who is not checked in (shown in the actions sheet).
	const sheetLateLabel = (apt: Appointment) => {
		const diff = minutesUntilStart(apt)
		return diff !== null && diff < 0 && effectiveStatusLabel(apt) !== 'checked_in' ? `${formatMinutes(diff)} late` : undefined
	}

	const requestsView = view === 'requests'
	const pastView = !requestsView && selected === PAST_KEY

	return (
		<View style={styles.screen}>
			{requestsView ? (
				<DoctorScreenHeader
					variant="simple"
					title="Booking requests"
					subtitle={`${reqLeft} ${reqLeft === 1 ? 'request' : 'requests'}`}
					onBack={() => setView('day')}
				/>
			) : (
				<DoctorScreenHeader
					variant="simple"
					title="Schedule"
					showHospitalSelector
					rightAccessory={
						<View style={styles.headerButtons}>
							<Pressable
								onPress={() => setSelected(today)}
								accessibilityRole="button"
								accessibilityLabel="Go to today"
								style={styles.todayPill}
							>
								<Text style={styles.todayPillText}>Today</Text>
							</Pressable>
							<Pressable onPress={() => setCalOpen(true)} accessibilityRole="button" accessibilityLabel="Pick a date" style={styles.calendarBtn}>
								<AppPathIcon d="M4 6h16v14H4zM4 10h16M8 3v4M16 3v4" size={20} strokeWidth={2.1} color="#FFFFFF" />
							</Pressable>
						</View>
					}
				/>
			)}

			{!requestsView && (
				<View style={styles.dateBlock}>
					<View style={styles.dateHead}>
						<Text style={styles.dateTitle}>Date</Text>
						{pastView ? (
							<Pressable onPress={() => setPastFilterOpen(true)} accessibilityRole="button" accessibilityLabel={`Date range: ${pastRangeName}. Change`} hitSlop={8}>
								<Text style={styles.rangeLink}>{pastRangeName}</Text>
							</Pressable>
						) : (
							<Text style={styles.monthText}>{monthLabelOf(selected)}</Text>
						)}
					</View>
					<ScheduleDateStrip days={stripDays} todayIso={today} selected={selected} marked={markedDays} onSelect={setSelected} />
				</View>
			)}

			<ScrollView
				contentContainerStyle={{ paddingTop: 12, paddingBottom: clearance, gap: 16 }}
				refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshAll} />}
			>
				<DoctorStatusBanner status={doctorStatus} />

				{requestsView && (
					<BookingRequestsView
						requests={reqVisible}
						loading={reqLoading}
						busyId={busyId}
						loadFailed={reqFailed}
						whenOf={requestWhenOf}
						feeOf={requestFeeOf}
						onAccept={handleAccept}
						onDecline={(apt) => setReqSheet({ kind: 'decline', appt: apt })}
						onMenu={(apt) => setReqSheet({ kind: 'menu', appt: apt })}
						autoConfirm={autoOn === null ? null : { enabled: autoOn, busy: autoBusy, confirmedCount: autoConfirmed, onChange: toggleAutoConfirm }}
					/>
				)}

				{!requestsView && !pastView && (
					<View style={{ gap: 14, paddingHorizontal: 16 }}>
						<RequestsBanner count={reqLeft} urgent={urgentLeft} onPress={() => setView('requests')} />
						{/* With requests waiting the doctor reaches the switch through Review; with none, it is here on the main page. It
						    follows reqLeft, so it appears when the last request is answered and goes when a new one arrives. */}
						{reqLeft === 0 && !reqLoading && !reqFailed && autoOn !== null && (
							<AutoConfirmCard enabled={autoOn} busy={autoBusy} confirmedCount={autoConfirmed} onChange={toggleAutoConfirm} />
						)}

						<View style={styles.dayHead}>
							<View style={{ minWidth: 0 }}>
								<Text style={styles.dayTitle} numberOfLines={1}>
									{dayTitle}
								</Text>
								<Text style={styles.daySub} numberOfLines={1}>
									{dayCountLabel}
								</Text>
							</View>
							<AppSegmentedControl
								accessibilityLabel="Visit type"
								options={[
									{ value: 'any', label: 'All' },
									{ value: 'clinic', label: 'In-clinic' },
									{ value: 'video', label: 'Video' },
								]}
								value={visit}
								onChange={(v) => setVisit(v as VisitFilter)}
							/>
						</View>

						{isToday && !dayLoading && dayList.length > 0 && <DayProgress seen={seenCount} noShow={noShowCount} toGo={dayToSee.length} />}

						{dayLoading ? (
							<ActivityIndicator style={{ marginTop: 24 }} color={APP_COLORS.primary} />
						) : dayList.length === 0 ? (
							<AppEmptyCard title={isToday ? 'No appointments today' : 'No appointments on this day'} message="New bookings show up here once they are confirmed." />
						) : (
							<>
								<AppSoftCard padding={0} radius={14}>
									<View style={{ paddingHorizontal: 12, paddingTop: 12 }}>
										{isToday && <Text style={styles.groupLabel}>UP NEXT · {dayToSee.length}</Text>}
										{dayToSee.length === 0 && <Text style={[styles.emptyPlain, { paddingVertical: 12 }]}>Nothing left to see today.</Text>}
										{dayToSee.map((apt, i) => renderDayRow(apt, i < dayToSee.length - 1))}
									</View>
								</AppSoftCard>

								{dayEarlier.length > 0 && (
									<AppSoftCard padding={0} radius={14}>
										<Pressable
											onPress={() => setEarlierOpen((o) => !o)}
											accessibilityRole="button"
											accessibilityState={{ expanded: earlierOpen }}
											style={styles.earlierHead}
										>
											<Text style={styles.groupLabelFlat}>EARLIER TODAY · {dayEarlier.length}</Text>
											<MaterialCommunityIcons name={earlierOpen ? 'chevron-up' : 'chevron-down'} size={22} color={APP_COLORS.inkMuted} />
										</Pressable>
										{earlierOpen && (
											<View style={{ paddingHorizontal: 12 }}>{dayEarlier.map((apt, i) => renderDayRow(apt, i < dayEarlier.length - 1))}</View>
										)}
									</AppSoftCard>
								)}
							</>
						)}
					</View>
				)}

				{pastView && (
					<View style={{ gap: 14, paddingHorizontal: 16 }}>
						<View>
							<Text style={styles.dayTitle}>Past appointments</Text>
							<Text style={styles.daySub}>
								{pastFiltered.length} {pastFiltered.length === 1 ? 'visit' : 'visits'} · {pastRangeName}
							</Text>
						</View>

						<View style={{ flexDirection: 'row', gap: 8 }}>
							<TouchableOpacity
								style={[styles.filterBtn, pastFilterCount > 0 && styles.filterBtnActive]}
								onPress={() => setPastFilterOpen(true)}
								accessibilityRole="button"
								accessibilityLabel={pastFilterCount ? `Filters, ${pastFilterCount} applied` : 'Filters'}
							>
								<MaterialCommunityIcons name="filter-variant" size={18} color={APP_COLORS.ink} />
								<Text style={styles.filterBtnText}>{pastFilterCount ? `Filters · ${pastFilterCount}` : 'Filters'}</Text>
							</TouchableOpacity>
							<View style={styles.searchBox}>
								<AppSearchBar placeholder="Search patient name" hints={[]} value={pastQuery} onChangeText={setPastQuery} />
							</View>
						</View>

						{/* What is filtered on: the date range always, the status when one is picked (tap the chip to change, the cross removes it). */}
						<View style={styles.activeChips}>
							<AppChip
								label={pastRangeName}
								icon="calendar-blank-outline"
								variant="soft"
								shape="pill"
								size="sm"
								selected={pastRange !== 'last30'}
								onPress={() => setPastFilterOpen(true)}
								accessibilityLabel={`Date: ${pastRangeName}. Tap to change`}
							/>
							{pastStatus !== 'all' && (
								<AppChip
									label={PAST_STATUS_FILTERS.find((f) => f.id === pastStatus)?.label ?? ''}
									icon="check"
									variant="soft"
									shape="pill"
									size="sm"
									selected
									onPress={() => setPastStatus('all')}
									trailing={<MaterialCommunityIcons name="close" size={14} color={APP_COLORS.ink} />}
									accessibilityLabel="Remove the status filter"
								/>
							)}
						</View>

						{pastLoading ? (
							<ActivityIndicator style={{ marginTop: 24 }} color={APP_COLORS.primary} />
						) : pastGroups.length ? (
							<>
								{pastShownGroups.map(({ date, shown, all }) => (
									<AppSoftCard key={date} padding={0} radius={14}>
										<View style={{ paddingHorizontal: 12, paddingTop: 12 }}>
											<View style={styles.pastGroupHead}>
												<Text style={styles.groupLabelFlat}>
													{date === yesterdayIso ? 'YESTERDAY · ' : ''}
													{dateLabelOf(date).toUpperCase()}
												</Text>
												<Text style={styles.groupSeen}>
													{all.filter(isCompleted).length} of {all.length} seen
												</Text>
											</View>
											{(() => {
												let clinicSeq = 0
												return shown.map((apt, i) => {
													if (!isVideoMode(apt.appointment_mode)) clinicSeq += 1
													return renderPastRow(apt, i < shown.length - 1, `Token ${String(clinicSeq).padStart(2, '0')}`)
												})
											})()}
										</View>
									</AppSoftCard>
								))}
								{pastHasMore && (
									<AppButton
										variant="outline"
										size="md"
										onPress={() =>
											setPastMore({ key: pastFilterKey, extra: (pastMore.key === pastFilterKey ? pastMore.extra : 0) + PAST_PAGE })
										}
									>
										Show older visits
									</AppButton>
								)}
							</>
						) : (
							<AppSoftCard padding={16} radius={8} style={{ alignItems: 'center', gap: 8 }}>
								<Text style={styles.emptyTitle}>No appointments in this period</Text>
								<TouchableOpacity style={styles.resetBtn} onPress={resetPast}>
									<Text style={styles.resetBtnText}>Reset filters</Text>
								</TouchableOpacity>
							</AppSoftCard>
						)}
					</View>
				)}
			</ScrollView>

			<AppConfirmSheet
				visible={!!undoTarget}
				onClose={() => setUndoTarget(null)}
				title={`Undo check-in for ${undoTarget?.patient?.name ?? 'this patient'}?`}
				message="They'll go back to “Not arrived”. You can check them in again at any time."
				confirmLabel="Undo check-in"
				cancelLabel="Keep checked in"
				tone="primary"
				onConfirm={async () => {
					const target = undoTarget
					setUndoTarget(null)
					if (target) await runCheckInToggle(target)
				}}
			/>

			<ScheduleCalendarSheet
				visible={calOpen}
				onClose={() => setCalOpen(false)}
				selected={selected === PAST_KEY ? null : selected}
				onSelect={setSelected}
				onClear={() => {
					setSelected(today)
					setCalOpen(false)
				}}
				markedDates={markedDays}
				minDate={today}
				monthsAhead={3}
				applyLabel="Show this day"
			/>

			<AppFilterSheet
				visible={pastFilterOpen}
				groups={PAST_FILTER_GROUPS}
				selected={(key) => [key === 'date' ? pastRange : pastStatus]}
				count={(key) => (key === 'date' ? (pastRange !== 'last30' ? 1 : 0) : pastStatus !== 'all' ? 1 : 0)}
				onSelect={(key, value) => (key === 'date' ? setPastRange(value as PastRangeKey) : setPastStatus(value as typeof pastStatus))}
				onClearAll={resetPastFilters}
				onClose={() => setPastFilterOpen(false)}
				applyLabel={pastApplyLabel}
				renderGroupExtra={(key) =>
					key === 'date' && pastRange === 'custom' ? (
						<View style={styles.customDates}>
							<View style={{ flex: 1, gap: 4 }}>
								<Text style={styles.dateFieldLabel}>From</Text>
								<TextInput value={pastFrom} onChangeText={setPastFrom} style={styles.dateInput} placeholder="YYYY-MM-DD" autoCorrect={false} />
							</View>
							<View style={{ flex: 1, gap: 4 }}>
								<Text style={styles.dateFieldLabel}>To</Text>
								<TextInput value={pastTo} onChangeText={setPastTo} style={styles.dateInput} placeholder="YYYY-MM-DD" autoCorrect={false} />
							</View>
						</View>
					) : null
				}
			/>

			{todaySheet && (
				<TodayActionSheet
					visible={!!todaySheet}
					mode={todaySheet.mode}
					patientName={todaySheet.appt.patient?.name ?? 'Patient'}
					slotLabel={`${slotLabelOf(todaySheet.appt, true)} · ${isVideoMode(todaySheet.appt.appointment_mode) ? 'Video' : 'In-clinic'}`}
					lateLabel={sheetLateLabel(todaySheet.appt)}
					video={isVideoMode(todaySheet.appt.appointment_mode)}
					busy={busyId === todaySheet.appt.id}
					onClose={() => setTodaySheet(null)}
					onModeChange={(mode) => {
						setNoShowError(null)
						setTodaySheet({ ...todaySheet, mode })
					}}
					onAskReschedule={() => {
						setAskTarget(todaySheet.appt)
						setTodaySheet(null)
					}}
					onRefer={() => {
						setReqSheet({ kind: 'refer', appt: todaySheet.appt })
						setTodaySheet(null)
					}}
					onConfirmCancel={(reason) => handleConfirmReject(reason, '', todaySheet.appt)}
					noShowCanMark={noShowWindow(todaySheet.appt).canMark && NO_SHOW_SOURCE_STATUSES.includes(effectiveStatusLabel(todaySheet.appt))}
					noShowHint={
						noShowWindow(todaySheet.appt).canMark && !NO_SHOW_SOURCE_STATUSES.includes(effectiveStatusLabel(todaySheet.appt))
							? 'The patient is checked in'
							: noShowWindow(todaySheet.appt).hint
					}
					noShowOnly={todaySheet.noShowOnly}
					onConfirmNoShow={() => handleMarkNoShow(todaySheet.appt)}
					noShowError={noShowError}
				/>
			)}

			{reqSheet && (
				<>
					<RequestActionsSheet
						visible={reqSheet.kind === 'menu'}
						who={requestWho3(reqSheet.appt)}
						onClose={() => setReqSheet(null)}
						onAccept={() => handleAccept(reqSheet.appt)}
						onAskReschedule={() => {
							setAskTarget(reqSheet.appt)
							setReqSheet(null)
						}}
						onRefer={() => setReqSheet({ kind: 'refer', appt: reqSheet.appt })}
						onDecline={() => setReqSheet({ kind: 'decline', appt: reqSheet.appt })}
					/>
					<DeclineRequestSheet
						visible={reqSheet.kind === 'decline'}
						who={requestWho3(reqSheet.appt)}
						firstName={(reqSheet.appt.patient?.name ?? 'The patient').split(' ')[0]}
						busy={busyId === reqSheet.appt.id}
						onClose={() => setReqSheet(null)}
						onDecline={(reason) => handleConfirmReject(reason, '', reqSheet.appt)}
						onChooseDoctor={() => setReqSheet({ kind: 'refer', appt: reqSheet.appt })}
					/>
					<ReferDoctorSheet
						visible={reqSheet.kind === 'refer'}
						who={requestWho3(reqSheet.appt)}
						firstName={(reqSheet.appt.patient?.name ?? 'The patient').split(' ')[0]}
						busy={busyId === reqSheet.appt.id}
						onClose={() => setReqSheet(null)}
						onRefer={handleConfirmRefer}
					/>
				</>
			)}

			<AskPatientRescheduleSheet
				visible={!!askTarget}
				variant={askTarget && isRequestLike(askTarget) ? 'request' : 'appointment'}
				patientName={askTarget?.patient?.name ?? 'The patient'}
				slotLabel={askTarget ? `${slotLabelOf(askTarget, true)} · ${isVideoMode(askTarget.appointment_mode) ? 'Video' : 'In-clinic'}` : undefined}
				onClose={() => setAskTarget(null)}
				onConfirm={handleAskReschedule}
			/>
		</View>
	)
}

export default DoctorScheduleScreen

const styles = StyleSheet.create({
	screen: { flex: 1, backgroundColor: APP_COLORS.pageBg },
	emptyPlain: { fontSize: 14, lineHeight: 20, color: APP_COLORS.inkMuted },
	emptyTitle: { fontSize: 14, lineHeight: 20, fontWeight: '800', color: APP_COLORS.ink },
	hintText: { fontSize: 12, lineHeight: 16, fontWeight: '700', color: APP_COLORS.inkMuted },
	dateBlock: { gap: 10, paddingTop: 14, paddingBottom: 4 },
	dateHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 16 },
	dateTitle: { fontSize: 18, lineHeight: 26, fontWeight: '700', color: APP_COLORS.ink },
	monthText: { fontSize: 13, lineHeight: 18, color: APP_COLORS.inkMuted },
	rangeLink: { fontSize: 13, lineHeight: 18, fontWeight: '800', color: APP_COLORS.primary },
	headerButtons: { flexDirection: 'row', alignItems: 'center', gap: 8 },
	todayPill: { height: 36, paddingHorizontal: 14, borderRadius: 9999, borderWidth: 1, borderColor: '#FFFFFF40', alignItems: 'center', justifyContent: 'center' },
	todayPillText: { fontSize: 13, lineHeight: 18, fontWeight: '700', color: '#FFFFFF' },
	calendarBtn: { width: 40, height: 40, borderRadius: 9999, backgroundColor: '#FFFFFF1F', alignItems: 'center', justifyContent: 'center' },
	// Stacked, not side by side: a title and a three-way control do not fit one row on a narrow phone, and a control with no width of its
	// own took the whole row and left the title none (its text then wrapped into a tall empty block).
	dayHead: { gap: 10 },
	dayTitle: { fontSize: 18, lineHeight: 26, fontWeight: '800', color: APP_COLORS.ink },
	daySub: { fontSize: 13, lineHeight: 18, color: APP_COLORS.inkMuted },
	groupLabelFlat: { fontSize: 12, lineHeight: 16, fontWeight: '800', letterSpacing: 0.5, color: APP_COLORS.inkMuted },
	earlierHead: { minHeight: 52, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
	pastGroupHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingBottom: 6 },
	groupSeen: { fontSize: 12, lineHeight: 16, fontWeight: '700', color: APP_COLORS.inkMuted },
	searchBox: { flex: 1, minWidth: 0 },
	filterBtn: {
		height: 44,
		paddingHorizontal: 14,
		borderWidth: 1,
		borderColor: APP_COLORS.divider,
		borderRadius: 8,
		backgroundColor: APP_COLORS.surface,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	filterBtnActive: { backgroundColor: APP_COLORS.mint, borderColor: APP_COLORS.primary },
	filterBtnText: { fontSize: 14, lineHeight: 18, fontWeight: '700', color: APP_COLORS.ink },
	summaryText: { fontSize: 13, lineHeight: 18, color: APP_COLORS.inkMuted },
	summaryBold: { fontSize: 13, lineHeight: 18, color: APP_COLORS.ink, fontWeight: '800' },
	groupLabel: { fontSize: 12, lineHeight: 16, fontWeight: '800', letterSpacing: 0.5, color: APP_COLORS.inkMuted },
	resetBtn: { height: 36, paddingHorizontal: 12, borderRadius: 8, backgroundColor: APP_COLORS.mint, alignItems: 'center', justifyContent: 'center' },
	resetBtnText: { fontSize: 13, lineHeight: 18, fontWeight: '700', color: APP_COLORS.primary },
	activeChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
	customDates: { flexDirection: 'row', gap: 8, paddingTop: 12 },
	dateFieldLabel: { fontSize: 12, lineHeight: 16, fontWeight: '700', color: APP_COLORS.inkMuted },
	dateInput: {
		height: 44,
		paddingHorizontal: 10,
		borderWidth: 1,
		borderColor: APP_COLORS.border,
		borderRadius: 6,
		backgroundColor: APP_COLORS.surface,
		fontSize: 15,
		color: APP_COLORS.ink,
	},
})
