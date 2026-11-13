// src/features/doctor/dashboard/DoctorScheduleScreen.tsx
//
// Doctor dashboard "Schedule" view, built to the "Doctor Dashboard" design: three categories --
// Today, Requests, All.
//   Today     — All / Upcoming / Done tabs + an All types / In-clinic / Video chip row over today's
//               appointment rows, each with a round check-in toggle (see TodayPatients.tsx).
//   Requests  — pending booking requests and patients' reschedule requests (tagged "Rescheduled"):
//               accept / reject / reschedule / refer, via the shared
//               AppointmentActionCard + AppointmentActionSheet (reusable as-is for a future
//               Pharmacy/Laboratory "requests" surface).
//   All       — an Upcoming | Past sub-toggle:
//                 Upcoming: confirmed bookings from today on, optionally narrowed to one day via a
//                           calendar sheet (days that hold appointments carry a dot); each is an
//                           action card (Cancel / Reschedule / Refer).
//                 Past:     a date-range picker (Yesterday / 7 days / 30 days / 3 months / custom) plus a
//                           Status + Visit-type filter sheet, rows grouped by day.
// All of it is wired to the real appointments API. Reschedule never picks a slot for the doctor: it asks the
// PATIENT to choose a new time (AskPatientRescheduleSheet); Refer reuses the real referral service via
// AppointmentActionSheet.

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import Toast from 'react-native-toast-message'
import {
	AppAppointmentRow,
	AppBottomSheet,
	AppConfirmSheet,
	AppointmentActionCard,
	AppointmentActionSheet,
	AppSegmentedControl,
	AppSoftCard,
	type ActionSheetMode,
} from '../../../components/common'
import { useAuth } from '../../../context/AuthContext'
import { APP_COLORS, TONE_ORDER } from '../../../config/theme'
import { ROUTES } from '../../../navigation/routes'
import { useTabBarClearance } from '../../../navigation/tabBar'
import { DoctorScreenHeader } from './DoctorScreenHeader'
import { DoctorStatusBanner } from './DoctorStatusBanner'
import { useDoctorStatus } from './useDoctorStatus'
import { ScheduleCalendarSheet } from './ScheduleCalendarSheet'
import { NoShowStrip, TodayPatientRow, TodayTabs, TodayVisitChips, type TodayTab, type TodayVisit } from './TodayPatients'
import { TodayActionSheet, type TodaySheetMode } from './TodayActionSheet'
import { getAppointments, getStatusIdByLabel, markAppointmentNoShow, setAppointmentCheckIn } from '../doctorService'
import { updateAppointmentsStatus } from '../../../services/appointmentService'
import { askPatientToReschedule } from '../doctorService'
import { AskPatientRescheduleSheet } from '../components/AskPatientRescheduleSheet'
import { createReferral } from '../../referrals/referralService'
import { clinicTodayIso, effectiveStatusLabel, formatTime12h, humanizeStatus, isAccepted, isCompletedAppt, isPending, isRequestLike, isNoShowAppt, isRescheduleNeeded, isRescheduleRequest, isVideoMode, NO_SHOW_SOURCE_STATUSES, noShowWindow, rowStatusTone, statusLabelOf, toApiDate } from '../scheduleUtils'
import type { Appointment } from '../../../types/appointment'
import type { FavouriteDoctorListItem } from '../search/components/FavouriteDoctorList'
import { showStatusModal } from '../../../services/apiService'

type ScheduleTab = 'today' | 'req' | 'all'
type AllMode = 'up' | 'past'
type PastRangeKey = 'yesterday' | 'last7' | 'last30' | 'last90' | 'custom'
type PastStatusKey = 'completed' | 'no_show' | 'cancelled' | 'other'
type PastSheet = 'range' | 'filter' | null

const PAST_RANGES: { id: PastRangeKey; label: string; days: number }[] = [
	{ id: 'yesterday', label: 'Yesterday', days: 1 },
	{ id: 'last7', label: 'Last 7 days', days: 7 },
	{ id: 'last30', label: 'Last 30 days', days: 30 },
	{ id: 'last90', label: 'Last 3 months', days: 90 },
	{ id: 'custom', label: 'Custom dates', days: 0 },
]
const PAST_STATUS_FILTERS: { id: 'all' | Exclude<PastStatusKey, 'other'>; label: string }[] = [
	{ id: 'all', label: 'All' },
	{ id: 'completed', label: 'Completed' },
	{ id: 'no_show', label: 'No-show' },
	{ id: 'cancelled', label: 'Cancelled' },
]
// Matches the calendar sheet's three-month reach.
const UPCOMING_WINDOW_DAYS = 90
const ISO_RE = /^\d{4}-\d{2}-\d{2}$/

// statusLabelOf/isPending/isAccepted imported from ../scheduleUtils -- shared with DoctorHomeScreen
// so the Requests/Today/All categorization rule can't drift between the two screens.
const isCompleted = isCompletedAppt

// A past-dated appointment that was never completed or cancelled (still confirmed / not_arrived /
// no_show) is, in practice, a no-show -- the design's Past list only knows Completed / No-show /
// Cancelled, so those three buckets are derived from the real status label rather than invented.
// Anything else (e.g. checked_in, rescheduled) stays visible under "All" with its own label.
function pastStatusKey(apt: Appointment): PastStatusKey {
	const l = statusLabelOf(apt).toLowerCase()
	if (l === 'completed') return 'completed'
	if (l === 'cancelled') return 'cancelled'
	if (l === 'no_show') return 'no_show'
	// Confirmed / not arrived and still markable: not a no-show yet, so it is listed (as "Not arrived") under All only.
	if (l === 'not_arrived' || l === 'confirmed') return canStillMarkNoShow(apt) ? 'other' : 'no_show'
	return 'other'
}
/** A past appointment the doctor can still mark as a no-show: confirmed / not arrived, within the policy's window. */
function canStillMarkNoShow(apt: Appointment): boolean {
	return NO_SHOW_SOURCE_STATUSES.includes(statusLabelOf(apt).toLowerCase()) && !noShowWindow(apt).expired
}
function pastStatusDisplay(apt: Appointment): { label: string; tone: 'completed' | 'sand' | 'cancelled' | 'pending' | 'confirmed' | 'onTheWay' } {
	// Not marked yet (the "No-show" action is offered on the row): do not call it a no-show before the doctor does.
	if (canStillMarkNoShow(apt)) return { label: 'Not arrived', tone: 'onTheWay' }
	switch (pastStatusKey(apt)) {
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
	const days = PAST_RANGES.find((r) => r.id === key)?.days ?? 7
	const today = todayIso()
	return { from: isoPlusDays(today, -days), to: isoPlusDays(today, -1) }
}

const DOW_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MON_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
/** "Fri 26 Sep" */
function dateLabelOf(iso: string) {
	const d = new Date(`${iso}T00:00:00`)
	if (Number.isNaN(d.getTime())) return iso
	return `${DOW_SHORT[d.getDay()]} ${d.getDate()} ${MON_SHORT[d.getMonth()]}`
}
/** "26 Sep 2026" */
function fullDateLabelOf(iso: string) {
	const d = new Date(`${iso}T00:00:00`)
	if (Number.isNaN(d.getTime())) return iso
	return `${d.getDate()} ${MON_SHORT[d.getMonth()]} ${d.getFullYear()}`
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
	return `${dateLabelOf(apt.appointment_date)}, ${time}`
}
const toneKeyAt = (i: number) => TONE_ORDER[i % TONE_ORDER.length]
const initialsOf = (name?: string) =>
	(name ?? '?')
		.split(' ')
		.slice(0, 2)
		.map((p) => p[0])
		.join('')
		.toUpperCase()
const byDateTime = (a: Appointment, b: Appointment) =>
	(a.appointment_date + (a.start_time ?? '')).localeCompare(b.appointment_date + (b.start_time ?? ''))

const REQUEST_REASONS = [
	{ id: 'spec', label: 'Outside my speciality' },
	{ id: 'slot', label: "I'm not available at this time" },
	{ id: 'urgent', label: 'Needs emergency or in-person care' },
	{ id: 'other', label: 'Other reason' },
]
const CANCEL_REASONS = [
	{ id: 'leave', label: "I'm on leave that day" },
	{ id: 'clinic', label: 'Clinic closed' },
	{ id: 'other', label: 'Other reason' },
]

type Outcome = { kind: 'accept' | 'reject' | 'reschedule' | 'refer'; title: string; sub: string; tone: 'success' | 'danger' | 'info' | 'purple' }

/** What a Today row says after its three-dots sheet was used. */
function todayOutcomeOf(o?: Outcome): { text: string; tone: 'danger' | 'info' } | undefined {
	if (!o) return undefined
	if (o.kind === 'reject') return { text: 'Cancelled · patient notified', tone: 'danger' }
	// The patient still has to choose the new time, so the row says it was asked, not that it moved.
	if (o.kind === 'reschedule') return { text: o.title, tone: 'info' }
	return undefined
}

/** The "Upcoming | Past" switch at the top of the All tab. */
function AllModeToggle({ value, onChange }: { value: AllMode; onChange: (v: AllMode) => void }) {
	return (
		<View style={styles.modeTrack} accessibilityRole="tablist" accessibilityLabel="Show">
			{([
				{ id: 'up' as AllMode, label: 'Upcoming' },
				{ id: 'past' as AllMode, label: 'Past' },
			]).map((t) => {
				const on = t.id === value
				return (
					<TouchableOpacity
						key={t.id}
						accessibilityRole="tab"
						accessibilityState={{ selected: on }}
						onPress={() => onChange(t.id)}
						style={[styles.modeBtn, on && styles.modeBtnOn]}
					>
						<Text style={[styles.modeBtnText, { color: on ? APP_COLORS.ink : APP_COLORS.inkMuted }]}>{t.label}</Text>
					</TouchableOpacity>
				)
			})}
		</View>
	)
}

export function DoctorScheduleScreen() {
	const navigation = useNavigation<any>()
	const route = useRoute<any>()
	const clearance = useTabBarClearance()
	const { selectedHospitalId } = useAuth()
	// Scope every list to the clinic chosen in the clinic switcher in the header (null = All clinics).
	const clinicFilter = selectedHospitalId ? { hospital_id: selectedHospitalId } : {}

	const [tab, setTab] = useState<ScheduleTab>((route.params?.segment as ScheduleTab) ?? 'today')

	// Today
	const [todayList, setTodayList] = useState<Appointment[]>([])
	const [todayLoading, setTodayLoading] = useState(true)
	const [todayTab, setTodayTab] = useState<TodayTab>('upcoming')
	const [todayVisit, setTodayVisit] = useState<TodayVisit>('any')

	// Requests: pending only (uses variant='upcoming', so a request whose date has already gone by
	// without being acted on ages out).
	const [reqList, setReqList] = useState<Appointment[]>([])
	const [reqLoading, setReqLoading] = useState(true)
	const [outcomes, setOutcomes] = useState<Record<string, Outcome>>({})
	const [busyId, setBusyId] = useState<string | null>(null)
	const [sheet, setSheet] = useState<{ mode: ActionSheetMode; appt: Appointment } | null>(null)
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

	// All
	const [allMode, setAllMode] = useState<AllMode>((route.params?.mode as AllMode) ?? 'up')

	// The Schedule tab stays mounted between visits, so a later navigate(SCHEDULE, { segment, mode }) (the Home
	// shortcuts, the drawer's My Consultations / Treatment History) has to move the view itself: the initial
	// state above only covers the first mount.
	useEffect(() => {
		const { segment, mode } = route.params ?? {}
		if (segment) setTab(segment as ScheduleTab)
		if (segment === 'all') setAllMode((mode as AllMode) ?? 'up')
	}, [route.params])

	// All -> Upcoming
	const [upList, setUpList] = useState<Appointment[]>([])
	const [upLoading, setUpLoading] = useState(true)
	const [upDay, setUpDay] = useState<string | null>(null)
	const [upCalOpen, setUpCalOpen] = useState(false)

	// All -> Past (defaults to the last 7 days, like the design)
	const [pastSheet, setPastSheet] = useState<PastSheet>(null)
	const [pastRange, setPastRange] = useState<PastRangeKey>('last7')
	const [pastFrom, setPastFrom] = useState(isoPlusDays(todayIso(), -30))
	const [pastTo, setPastTo] = useState(isoPlusDays(todayIso(), -1))
	const [pastStatus, setPastStatus] = useState<'all' | Exclude<PastStatusKey, 'other'>>('all')
	const [pastMode, setPastMode] = useState<'all' | 'clinic' | 'video'>('all')
	const [pastList, setPastList] = useState<Appointment[]>([])
	const [pastLoading, setPastLoading] = useState(true)

	const [refreshing, setRefreshing] = useState(false)
	const { status: doctorStatus, reload: reloadStatus } = useDoctorStatus()

	const loadToday = useCallback(async () => {
		setTodayLoading(true)
		try {
			const res = await getAppointments({ appointment_date: todayIso(), variant: 'all', limit: 50, ...clinicFilter })
			// Today shows what the doctor has already accepted (at any point in today's arrival
			// workflow) plus what's already done -- never a still-pending request, even if it happens
			// to be dated today. Those stay under Requests until the doctor acts on them. A patient marked
			// no-show stays on the list too (tinted red, tagged NO-SHOW): they may still turn up later.
			setTodayList(
				(res.data ?? [])
					.filter((a) => isAccepted(a) || isCompleted(a) || isNoShowAppt(a))
					.sort((a, b) => (a.start_time ?? '').localeCompare(b.start_time ?? '')),
			)
		} catch {
			setTodayList([])
		} finally {
			setTodayLoading(false)
		}
	}, [selectedHospitalId])

	const loadRequests = useCallback(async () => {
		setReqLoading(true)
		try {
			const res = await getAppointments({ variant: 'upcoming', limit: 100, ...clinicFilter })
			// Requests: no action taken yet -- pending, or a reschedule the patient asked for; regardless of date.
			setReqList((res.data ?? []).filter(isRequestLike).sort(byDateTime))
		} catch {
			setReqList([])
		} finally {
			setReqLoading(false)
		}
	}, [selectedHospitalId])

	const loadUpcoming = useCallback(async () => {
		setUpLoading(true)
		try {
			// From today: 'All' is every appointment still to come (today's also have their own Today tab).
			const res = await getAppointments({
				start_date: todayIso(),
				end_date: isoPlusDays(todayIso(), UPCOMING_WINDOW_DAYS),
				variant: 'all',
				limit: 100,
				...clinicFilter,
			})
			// Confirmed bookings only -- a still-pending request belongs to Requests. Ones waiting for the patient to
			// choose a new time (reschedule_required) stay listed so the doctor can see where they stand.
			setUpList((res.data ?? []).filter((a) => isAccepted(a) || isRescheduleNeeded(a)).sort(byDateTime))
		} catch {
			setUpList([])
		} finally {
			setUpLoading(false)
		}
	}, [selectedHospitalId])

	const loadPast = useCallback(async () => {
		const { from, to } = resolvePastRange(pastRange, pastFrom, pastTo)
		// A half-typed custom date shouldn't fire a request.
		if (!ISO_RE.test(from) || !ISO_RE.test(to) || from > to) {
			setPastLoading(false)
			return
		}
		setPastLoading(true)
		try {
			const res = await getAppointments({ start_date: from, end_date: to, variant: 'all', limit: 100, ...clinicFilter })
			setPastList((res.data ?? []).filter((a) => !isRequestLike(a)))
		} catch {
			setPastList([])
		} finally {
			setPastLoading(false)
		}
	}, [pastRange, pastFrom, pastTo, selectedHospitalId])

	useEffect(() => {
		loadToday()
		loadRequests()
		loadUpcoming()
	}, [loadToday, loadRequests, loadUpcoming])

	useEffect(() => {
		loadPast()
	}, [loadPast])

	const refreshAll = () => {
		setRefreshing(true)
		void reloadStatus()
		Promise.all([loadToday(), loadRequests(), loadUpcoming(), loadPast()]).finally(() => setRefreshing(false))
	}

	// ── Today derived ──────────────────────────────────────────────────────
	// Counts follow the visit-type chip, like the design; "Upcoming" is everything not yet completed.
	const todayByVisit = todayList.filter(
		(a) => todayVisit === 'any' || (todayVisit === 'video' ? isVideoMode(a.appointment_mode) : !isVideoMode(a.appointment_mode)),
	)
	const todayUpcoming = todayByVisit.filter((a) => !isCompleted(a))
	const todayDone = todayByVisit.filter(isCompleted)
	const todayCounts = { every: todayByVisit.length, upcoming: todayUpcoming.length, done: todayDone.length }
	const todayNoShowCount = todayByVisit.filter(isNoShowAppt).length
	// "All" lists the patients still to be seen first, then the finished ones (the list is already by time). A no-show goes
	// last in every view, so a marked patient drops to the bottom at once (the lists are updated in place when one is marked).
	const todayToSee = todayUpcoming.filter((a) => !isNoShowAppt(a))
	const todayMissed = todayUpcoming.filter(isNoShowAppt)
	const todayShown =
		todayTab === 'upcoming'
			? [...todayToSee, ...todayMissed]
			: todayTab === 'done'
				? todayDone
				: [...todayToSee, ...todayDone, ...todayMissed]

	// ── Upcoming derived ───────────────────────────────────────────────────
	const upMarkedDates = useMemo(() => new Set(upList.map((a) => a.appointment_date)), [upList])
	const upShown = upDay ? upList.filter((a) => a.appointment_date === upDay) : upList
	const upCountLabel = `${upShown.length} ${upShown.length === 1 ? 'appointment' : 'appointments'}`

	// ── Past derived ───────────────────────────────────────────────────────
	const pastRangeResolved = resolvePastRange(pastRange, pastFrom, pastTo)
	const pastRangeName =
		pastRange === 'custom'
			? `Custom · ${shortDateLabelOf(pastRangeResolved.from)} – ${shortDateLabelOf(pastRangeResolved.to)}`
			: (PAST_RANGES.find((r) => r.id === pastRange)?.label ?? '')
	const pastFilterCount = (pastStatus !== 'all' ? 1 : 0) + (pastMode !== 'all' ? 1 : 0)
	const pastFiltered = pastList.filter((a) => {
		if (pastStatus !== 'all' && pastStatusKey(a) !== pastStatus) return false
		if (pastMode === 'clinic' && isVideoMode(a.appointment_mode)) return false
		if (pastMode === 'video' && !isVideoMode(a.appointment_mode)) return false
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
	const pastApplyLabel = `Show ${pastFiltered.length} ${pastFiltered.length === 1 ? 'appointment' : 'appointments'}`
	const resetPast = () => {
		setPastStatus('all')
		setPastMode('all')
		setPastRange('last7')
	}

	// ── Requests / Upcoming action handlers ───────────────────────────────
	// A completed appointment (the Past list), or one whose patient code was already entered, opens straight into the
	// consultation page; no code is asked for.
	const openAppointment = (apt: Appointment) =>
		(isCompletedAppt(apt) || apt.access_verified) && apt.patient?.id
			? navigation.navigate(ROUTES.STACK.CONSULTATION, { appointmentId: apt.id, patientId: apt.patient.id })
			: navigation.navigate(ROUTES.STACK.APPOINTMENT_DETAILS, { appointmentId: apt.id })

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
				Toast.show({ type: 'success', text1: res.message ?? 'Appointment confirmed' })
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
		const apt = target ?? sheet?.appt
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
			setSheet(null)
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
				Toast.show({ type: 'success', text1: res.message ?? 'The patient has been asked to choose a new time' })
				setAskTarget(null)
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
		if (!sheet) return
		const apt = sheet.appt
		setBusyId(apt.id)
		try {
			await createReferral({ appointment_id: apt.id, referred_doctor_id: doctor.id, notes: notes || undefined })
			setOutcomes((prev) => ({
				...prev,
				[apt.id]: { kind: 'refer', title: `Referred to ${doctor.name}`, sub: notes || 'No notes added', tone: 'purple' },
			}))
			Toast.show({ type: 'success', text1: `Referred to ${doctor.name}` })
		} catch {
			showStatusModal({
				status: 'error',
				title: "Couldn't refer the appointment",
				description: 'Failed to refer appointment. Please try again.',
				submitText: 'OK',
			})
		} finally {
			setBusyId(null)
			setSheet(null)
		}
	}

	const renderApptCard = (apt: Appointment, i: number) => {
		const isReq = isRequestLike(apt)
		const rescheduled = isRescheduleRequest(apt)
		const needsNewTime = isRescheduleNeeded(apt)
		const outcome = outcomes[apt.id]
		return (
			<AppointmentActionCard
				key={apt.id}
				id={apt.id}
				initials={initialsOf(apt.patient?.name)}
				avatarTone={toneKeyAt(i)}
				name={apt.patient?.name ?? 'Patient'}
				meta={`${apt.patient?.age ?? '--'} yrs · ${apt.patient?.gender ?? '--'} · ${rescheduled ? 'Reschedule request' : needsNewTime ? 'Waiting for patient' : isReq ? 'New request' : 'Follow-up'}`}
				isRequest={isReq}
				requestLabel={rescheduled ? 'Rescheduled' : undefined}
				statusLabel={needsNewTime ? 'Reschedule needed' : undefined}
				urgent={apt.pre_intake?.severity === 'severe' || apt.severity === 'severe'}
				slotLabel={slotLabelOf(apt, true)}
				mode={isVideoMode(apt.appointment_mode) ? 'Video' : 'In-clinic'}
				payLabel={`₹${apt.fees ?? '--'}`}
				reason={apt.symptoms || apt.pre_intake?.symptoms || apt.reason}
				busy={busyId === apt.id}
				outcome={outcome}
				onAccept={() => handleAccept(apt)}
				onReject={() => setSheet({ mode: 'reject', appt: apt })}
				onReschedule={() => setAskTarget(apt)}
				onRefer={() => setSheet({ mode: 'refer', appt: apt })}
				onUndo={outcome?.kind === 'reschedule' ? undefined : () => setOutcomes((prev) => { const next = { ...prev }; delete next[apt.id]; return next })}
			/>
		)
	}


	const reqLeft = reqList.filter((a) => !outcomes[a.id]).length
	const yesterdayIso = isoPlusDays(todayIso(), -1)

	return (
		<View style={styles.screen}>
			<DoctorScreenHeader variant="simple" title="Schedule" showHospitalSelector>
				<AppSegmentedControl
					shape="rounded"
					tabs
					onDark
					accessibilityLabel="Schedule category"
					options={[
						{ value: 'today', label: 'Today' },
						{ value: 'req', label: 'Requests', count: reqLeft, countTone: 'warn' },
						{ value: 'all', label: 'All' },
					]}
					value={tab}
					onChange={(v) => {
						setTab(v as ScheduleTab)
						if (v === 'all') setAllMode('up')
					}}
					style={{ backgroundColor: '#FFFFFF14', borderWidth: 0 }}
				/>
			</DoctorScreenHeader>

			<ScrollView
				contentContainerStyle={{ paddingTop: 16, paddingBottom: clearance, gap: 16 }}
				refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshAll} />}
			>
				<DoctorStatusBanner status={doctorStatus} />
				{tab === 'today' && (
					<View style={{ gap: 10, paddingHorizontal: 16 }}>
						<TodayTabs value={todayTab} counts={todayCounts} onChange={setTodayTab} />
						<TodayVisitChips value={todayVisit} onChange={setTodayVisit} />
						<NoShowStrip count={todayNoShowCount} />
						{todayLoading ? (
							<ActivityIndicator style={{ marginTop: 24 }} color={APP_COLORS.primary} />
						) : todayShown.length ? (
							<AppSoftCard padding={0} radius={14}>
								<View style={{ paddingHorizontal: 12 }}>
									{todayShown.map((apt, i) => (
										<TodayPatientRow
											key={apt.id}
											time={formatTime12h(apt.start_time)}
											name={apt.patient?.name ?? 'Patient'}
											video={isVideoMode(apt.appointment_mode)}
											meta={[apt.patient?.age ? `${apt.patient.age} yrs` : null, apt.patient?.gender].filter(Boolean).join(' · ')}
											done={isCompleted(apt)}
											checkedIn={effectiveStatusLabel(apt) === 'checked_in'}
											noShow={isNoShowAppt(apt)}
											busy={checkingInId === apt.id}
											divider={i < todayShown.length - 1}
											onPress={() => openAppointment(apt)}
											onToggle={() => handleToggleCheckIn(apt)}
											onMore={() => setTodaySheet({ mode: 'menu', appt: apt })}
											outcome={todayOutcomeOf(outcomes[apt.id])}
										/>
									))}
								</View>
							</AppSoftCard>
						) : (
							<Text style={styles.emptyPlain}>Nothing here yet</Text>
						)}
					</View>
				)}

				{tab === 'req' && (
					<View style={{ gap: 10, paddingHorizontal: 16 }}>
						<Text style={styles.hintText}>New bookings waiting for you. Accept, reschedule, refer or reject.</Text>
						{reqLoading ? (
							<ActivityIndicator style={{ marginTop: 24 }} color={APP_COLORS.primary} />
						) : reqList.length === 0 ? (
							<Text style={styles.emptyPlain}>No requests waiting. New bookings will show up here.</Text>
						) : (
							reqList.map(renderApptCard)
						)}
					</View>
				)}

				{tab === 'all' && (
					<>
						<View style={{ paddingHorizontal: 16 }}>
							<AllModeToggle value={allMode} onChange={setAllMode} />
						</View>

						{allMode === 'up' && (
							<View style={{ gap: 10, paddingHorizontal: 16 }}>
								<Text style={styles.hintText}>Confirmed bookings, and ones waiting for the patient to choose a new time. Tap a date to see that day only.</Text>
								<View style={{ gap: 8 }}>
									<TouchableOpacity
										style={[styles.selectBtn, !!upDay && styles.selectBtnActive]}
										onPress={() => setUpCalOpen(true)}
										accessibilityRole="button"
									>
										<MaterialCommunityIcons name="calendar-outline" size={18} color={APP_COLORS.primary} />
										<Text style={styles.selectBtnText} numberOfLines={1}>
											{upDay ? dateLabelOf(upDay) : 'All upcoming dates'}
										</Text>
										<MaterialCommunityIcons name="chevron-down" size={16} color={APP_COLORS.inkMuted} />
									</TouchableOpacity>
									<View style={styles.countRow}>
										<Text style={styles.summaryBold}>{upCountLabel}</Text>
										{!!upDay && (
											<TouchableOpacity onPress={() => setUpDay(null)} hitSlop={8}>
												<Text style={styles.linkText}>Show all dates</Text>
											</TouchableOpacity>
										)}
									</View>
								</View>
								{upLoading ? (
									<ActivityIndicator style={{ marginTop: 24 }} color={APP_COLORS.primary} />
								) : upShown.length === 0 ? (
									<Text style={styles.emptyPlain}>
										{upDay ? 'No appointments on this date. Pick another day.' : 'No confirmed appointments coming up.'}
									</Text>
								) : (
									upShown.map(renderApptCard)
								)}
							</View>
						)}

						{allMode === 'past' && (
							<View style={{ gap: 14, paddingHorizontal: 16 }}>
								<View style={{ flexDirection: 'row', gap: 8 }}>
									<TouchableOpacity
										style={[styles.selectBtn, { flex: 1, minWidth: 0 }]}
										onPress={() => setPastSheet('range')}
										accessibilityRole="button"
									>
										<MaterialCommunityIcons name="calendar-outline" size={18} color={APP_COLORS.primary} />
										<Text style={styles.selectBtnText} numberOfLines={1}>
											{pastRangeName}
										</Text>
										<MaterialCommunityIcons name="chevron-down" size={16} color={APP_COLORS.inkMuted} />
									</TouchableOpacity>
									<TouchableOpacity
										style={[styles.filterBtn, pastFilterCount > 0 && styles.filterBtnActive]}
										onPress={() => setPastSheet('filter')}
										accessibilityRole="button"
										accessibilityLabel={pastFilterCount ? `Filters, ${pastFilterCount} applied` : 'Filters'}
									>
										<MaterialCommunityIcons name="filter-variant" size={18} color={APP_COLORS.ink} />
										<Text style={styles.filterBtnText}>{pastFilterCount ? `Filters · ${pastFilterCount}` : 'Filters'}</Text>
									</TouchableOpacity>
								</View>

								<Text style={styles.summaryText}>
									<Text style={styles.summaryBold}>
										{pastFiltered.length} {pastFiltered.length === 1 ? 'appointment' : 'appointments'}
									</Text>{' '}
									· {fullDateLabelOf(pastRangeResolved.from)} – {fullDateLabelOf(pastRangeResolved.to)}
								</Text>

								{pastLoading ? (
									<ActivityIndicator style={{ marginTop: 24 }} color={APP_COLORS.primary} />
								) : pastGroups.length ? (
									pastGroups.map(([date, rows]) => {
										let clinicSeq = 0
										return (
											<View key={date} style={{ gap: 6 }}>
												<Text style={styles.groupLabel}>
													{date === yesterdayIso ? 'YESTERDAY · ' : ''}
													{fullDateLabelOf(date).toUpperCase()}
												</Text>
												<AppSoftCard padding={0} radius={8}>
													<View style={{ paddingHorizontal: 12 }}>
														{rows.map((apt, i) => {
															const video = isVideoMode(apt.appointment_mode)
															if (!video) clinicSeq += 1
															const st = pastStatusDisplay(apt)
															return (
																<AppAppointmentRow
																	key={apt.id}
																	time={formatTime12h(apt.start_time)}
																	token={video ? 'Video' : `Token ${String(clinicSeq).padStart(2, '0')}`}
																	name={apt.patient?.name ?? 'Patient'}
																	mode={video ? 'Video' : 'In-clinic'}
																	meta={[apt.patient?.age ? `${apt.patient.age} yrs` : null, apt.patient?.gender].filter(Boolean).join(' · ')}
																	status={st.label}
																	statusTone={st.tone}
																	action={
																		canStillMarkNoShow(apt)
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
																	divider={i < rows.length - 1}
																	onPress={() => openAppointment(apt)}
																/>
															)
														})}
													</View>
												</AppSoftCard>
											</View>
										)
									})
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
					</>
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
				visible={upCalOpen}
				onClose={() => setUpCalOpen(false)}
				selected={upDay}
				onSelect={setUpDay}
				onClear={() => {
					setUpDay(null)
					setUpCalOpen(false)
				}}
				markedDates={upMarkedDates}
				minDate={todayIso()}
				monthsAhead={3}
				applyLabel={`Show ${upCountLabel}`}
			/>

			<AppBottomSheet
				visible={!!pastSheet}
				title={pastSheet === 'filter' ? 'Filter appointments' : 'Show appointments from'}
				onClose={() => setPastSheet(null)}
				appearance="modern"
				footer={
					<View style={styles.footerRow}>
						<TouchableOpacity style={styles.secondaryBtn} onPress={resetPast}>
							<Text style={styles.secondaryBtnText}>Reset</Text>
						</TouchableOpacity>
						<TouchableOpacity style={styles.primaryBtn} onPress={() => setPastSheet(null)}>
							<Text style={styles.primaryBtnText}>{pastApplyLabel}</Text>
						</TouchableOpacity>
					</View>
				}
			>
				{pastSheet === 'filter' ? (
					<View style={{ gap: 16 }}>
						<View style={{ gap: 8 }}>
							<Text style={styles.fieldLabel}>Status</Text>
							<View style={styles.chipWrap}>
								{PAST_STATUS_FILTERS.map((s) => {
									const on = s.id === pastStatus
									return (
										<TouchableOpacity key={s.id} style={[styles.filterChip, on && styles.filterChipOn]} onPress={() => setPastStatus(s.id)} accessibilityState={{ selected: on }}>
											<Text style={[styles.filterChipText, on && styles.filterChipTextOn]}>{s.label}</Text>
										</TouchableOpacity>
									)
								})}
							</View>
						</View>
						<View style={{ gap: 8 }}>
							<Text style={styles.fieldLabel}>Visit type</Text>
							<View style={styles.chipWrap}>
								{([
									{ id: 'all', label: 'All' },
									{ id: 'clinic', label: 'In-clinic' },
									{ id: 'video', label: 'Video' },
								] as const).map((m) => {
									const on = m.id === pastMode
									return (
										<TouchableOpacity key={m.id} style={[styles.filterChip, on && styles.filterChipOn]} onPress={() => setPastMode(m.id)} accessibilityState={{ selected: on }}>
											<Text style={[styles.filterChipText, on && styles.filterChipTextOn]}>{m.label}</Text>
										</TouchableOpacity>
									)
								})}
							</View>
						</View>
					</View>
				) : (
					<View style={{ gap: 14 }}>
						<View>
							{PAST_RANGES.map((r) => {
								const on = r.id === pastRange
								return (
									<TouchableOpacity key={r.id} style={styles.radioRow} onPress={() => setPastRange(r.id)} accessibilityRole="radio" accessibilityState={{ checked: on }}>
										<Text style={[styles.radioLabel, on && styles.radioLabelOn]}>{r.label}</Text>
										<MaterialCommunityIcons name={on ? 'radiobox-marked' : 'radiobox-blank'} size={22} color={on ? APP_COLORS.primary : APP_COLORS.border} />
									</TouchableOpacity>
								)
							})}
						</View>
						{pastRange === 'custom' && (
							<View style={{ flexDirection: 'row', gap: 8 }}>
								<View style={{ flex: 1, gap: 4 }}>
									<Text style={styles.dateFieldLabel}>From</Text>
									<TextInput value={pastFrom} onChangeText={setPastFrom} style={styles.dateInput} placeholder="YYYY-MM-DD" autoCorrect={false} />
								</View>
								<View style={{ flex: 1, gap: 4 }}>
									<Text style={styles.dateFieldLabel}>To</Text>
									<TextInput value={pastTo} onChangeText={setPastTo} style={styles.dateInput} placeholder="YYYY-MM-DD" autoCorrect={false} />
								</View>
							</View>
						)}
					</View>
				)}
			</AppBottomSheet>

			{todaySheet && (
				<TodayActionSheet
					visible={!!todaySheet}
					mode={todaySheet.mode}
					patientName={todaySheet.appt.patient?.name ?? 'Patient'}
					slotLabel={`${slotLabelOf(todaySheet.appt, true)} · ${isVideoMode(todaySheet.appt.appointment_mode) ? 'Video' : 'In-clinic'}`}
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

			{sheet && (
				<AppointmentActionSheet
					visible={!!sheet}
					mode={sheet.mode}
					onClose={() => setSheet(null)}
					appointmentId={sheet.appt.id}
					patientName={sheet.appt.patient?.name ?? 'Patient'}
					slotLabel={slotLabelOf(sheet.appt, true)}
					reasons={isRequestLike(sheet.appt) ? REQUEST_REASONS : CANCEL_REASONS}
					busy={busyId === sheet.appt.id}
					onConfirmReject={handleConfirmReject}
					onConfirmRefer={handleConfirmRefer}
				/>
			)}

			<AskPatientRescheduleSheet
				visible={!!askTarget}
				patientName={askTarget?.patient?.name ?? 'The patient'}
				slotLabel={askTarget ? slotLabelOf(askTarget, true) : undefined}
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
	modeTrack: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: 8, backgroundColor: APP_COLORS.mint },
	modeBtn: { flex: 1, height: 36, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
	modeBtnOn: {
		backgroundColor: '#FFFFFF',
		shadowColor: APP_COLORS.ink,
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.12,
		shadowRadius: 3,
		elevation: 1,
	},
	modeBtnText: { fontSize: 13, lineHeight: 18, fontWeight: '700' },
	selectBtn: {
		height: 44,
		paddingHorizontal: 12,
		borderWidth: 1,
		borderColor: APP_COLORS.divider,
		borderRadius: 8,
		backgroundColor: APP_COLORS.surface,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	selectBtnActive: { backgroundColor: APP_COLORS.mint, borderColor: APP_COLORS.primary },
	selectBtnText: { flex: 1, fontSize: 14, lineHeight: 18, fontWeight: '700', color: APP_COLORS.ink },
	countRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
	linkText: { fontSize: 13, lineHeight: 18, fontWeight: '700', color: APP_COLORS.primary },
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
	radioRow: {
		minHeight: 52,
		paddingHorizontal: 4,
		borderBottomWidth: 1,
		borderBottomColor: APP_COLORS.divider,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	radioLabel: { fontSize: 15, lineHeight: 20, fontWeight: '600', color: APP_COLORS.ink },
	radioLabelOn: { fontWeight: '800' },
	fieldLabel: { fontSize: 13, lineHeight: 18, fontWeight: '800', color: APP_COLORS.ink },
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
	chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
	filterChip: {
		height: 40,
		paddingHorizontal: 14,
		borderRadius: 6,
		borderWidth: 1,
		borderColor: APP_COLORS.divider,
		backgroundColor: '#FFFFFF',
		alignItems: 'center',
		justifyContent: 'center',
	},
	filterChipOn: { backgroundColor: APP_COLORS.ink, borderColor: APP_COLORS.ink },
	filterChipText: { fontSize: 14, lineHeight: 18, fontWeight: '700', color: APP_COLORS.ink },
	filterChipTextOn: { color: '#FFFFFF' },
	footerRow: { flexDirection: 'row', gap: 8 },
	secondaryBtn: {
		height: 52,
		paddingHorizontal: 18,
		borderWidth: 1.5,
		borderColor: APP_COLORS.border,
		borderRadius: 8,
		backgroundColor: '#FFFFFF',
		alignItems: 'center',
		justifyContent: 'center',
	},
	secondaryBtnText: { fontSize: 14, fontWeight: '700', color: APP_COLORS.ink },
	primaryBtn: { flex: 1, height: 52, borderRadius: 8, backgroundColor: APP_COLORS.primary, alignItems: 'center', justifyContent: 'center' },
	primaryBtnText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
})
