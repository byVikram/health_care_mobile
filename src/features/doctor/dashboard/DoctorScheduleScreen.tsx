// src/features/doctor/dashboard/DoctorScheduleScreen.tsx
//
// Doctor dashboard "Schedule" view, built to the "Doctor Dashboard" design: three categories --
// Today, Requests, All.
//   Today     — filter chips (Upcoming/Video/Done) over today's appointment rows.
//   Requests  — pending booking requests: accept / reject / reschedule / refer, via the shared
//               AppointmentActionCard + AppointmentActionSheet (reusable as-is for a future
//               Pharmacy/Laboratory "requests" surface).
//   All       — an Upcoming | Past sub-toggle:
//                 Upcoming: confirmed bookings from tomorrow on, optionally narrowed to one day via a
//                           calendar sheet (days that hold appointments carry a dot); each is an
//                           action card (Cancel / Reschedule / Refer).
//                 Past:     a date-range picker (Yesterday / 7 days / 30 days / 3 months / custom) plus a
//                           Status + Visit-type filter sheet, rows grouped by day.
// All of it is wired to the real appointments API; Reschedule/Refer reuse the real
// availability/referral services via AppointmentActionSheet.

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import Toast from 'react-native-toast-message'
import {
	AppAppointmentRow,
	AppBottomSheet,
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
import { ScheduleCalendarSheet } from './ScheduleCalendarSheet'
import { checkInAppointment, getAppointments, getStatusIdByLabel } from '../doctorService'
import { updateAppointmentsStatus } from '../../../services/appointmentService'
import { rescheduleAppointment } from '../doctorService'
import { createReferral } from '../../referrals/referralService'
import { effectiveStatusLabel, formatTime12h, humanizeStatus, isAccepted, isCompletedAppt, isPending, isVideoMode, rowStatusTone, statusLabelOf, toApiDate } from '../scheduleUtils'
import type { Appointment } from '../../../types/appointment'
import type { FavouriteDoctorListItem } from '../search/components/FavouriteDoctorList'

type ScheduleTab = 'today' | 'req' | 'all'
type TodayChip = 'all' | 'video' | 'done'
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
	if (l === 'no_show' || l === 'not_arrived' || l === 'confirmed') return 'no_show'
	return 'other'
}
function pastStatusDisplay(apt: Appointment): { label: string; tone: 'completed' | 'sand' | 'cancelled' | 'pending' | 'confirmed' | 'onTheWay' } {
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
	return toApiDate(new Date())
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
	const { selectedHospital, selectedHospitalId } = useAuth()
	// Scope every list to the clinic chosen in the Home header's switcher (null = All clinics).
	const clinicFilter = selectedHospitalId ? { hospital_id: selectedHospitalId } : {}

	const [tab, setTab] = useState<ScheduleTab>((route.params?.segment as ScheduleTab) ?? 'today')

	// Today
	const [todayList, setTodayList] = useState<Appointment[]>([])
	const [todayLoading, setTodayLoading] = useState(true)
	const [todayChip, setTodayChip] = useState<TodayChip>('all')

	// Requests: pending only (uses variant='upcoming', so a request whose date has already gone by
	// without being acted on ages out).
	const [reqList, setReqList] = useState<Appointment[]>([])
	const [reqLoading, setReqLoading] = useState(true)
	const [outcomes, setOutcomes] = useState<Record<string, Outcome>>({})
	const [busyId, setBusyId] = useState<string | null>(null)
	const [sheet, setSheet] = useState<{ mode: ActionSheetMode; appt: Appointment } | null>(null)
	const [checkingInId, setCheckingInId] = useState<string | null>(null)

	// All
	const [allMode, setAllMode] = useState<AllMode>('up')

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

	const loadToday = useCallback(async () => {
		setTodayLoading(true)
		try {
			const res = await getAppointments({ appointment_date: todayIso(), variant: 'all', limit: 50, ...clinicFilter })
			// Today shows what the doctor has already accepted (at any point in today's arrival
			// workflow) plus what's already done -- never a still-pending request, even if it happens
			// to be dated today. Those stay under Requests until the doctor acts on them.
			setTodayList(
				(res.data ?? [])
					.filter((a) => isAccepted(a) || isCompleted(a))
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
			// Requests: no action taken yet -- pending, regardless of date.
			setReqList((res.data ?? []).filter(isPending).sort(byDateTime))
		} catch {
			setReqList([])
		} finally {
			setReqLoading(false)
		}
	}, [selectedHospitalId])

	const loadUpcoming = useCallback(async () => {
		setUpLoading(true)
		try {
			// From tomorrow: today's patients live under the Today tab.
			const res = await getAppointments({
				start_date: isoPlusDays(todayIso(), 1),
				end_date: isoPlusDays(todayIso(), UPCOMING_WINDOW_DAYS),
				variant: 'all',
				limit: 100,
				...clinicFilter,
			})
			// Confirmed bookings only -- a still-pending request belongs to Requests.
			setUpList((res.data ?? []).filter(isAccepted).sort(byDateTime))
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
			setPastList((res.data ?? []).filter((a) => !isPending(a)))
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
		Promise.all([loadToday(), loadRequests(), loadUpcoming(), loadPast()]).finally(() => setRefreshing(false))
	}

	// ── Today derived ──────────────────────────────────────────────────────
	const todayNotDone = todayList.filter((a) => !isCompleted(a))
	const todayVideo = todayNotDone.filter((a) => isVideoMode(a.appointment_mode))
	const todayDone = todayList.filter(isCompleted)
	const todayShown = todayChip === 'video' ? todayVideo : todayChip === 'done' ? todayDone : todayNotDone

	// Row token (source: the design's Today rows -- "Token 06" under the time for an in-clinic visit,
	// "Video" for a video one). No real "token number" field exists on the backend, so this is a real,
	// derived value (sequential position in today's own list, sorted by start_time like the list
	// already is) rather than a fabricated one -- and it's computed from the full `todayList`, not the
	// chip-filtered `todayShown`, so a patient's token stays stable no matter which filter chip is active.
	const todayTokenById = new Map<string, string>()
	let clinicTokenSeq = 0
	todayList.forEach((a) => {
		if (isVideoMode(a.appointment_mode)) {
			todayTokenById.set(a.id, 'Video')
		} else {
			clinicTokenSeq += 1
			todayTokenById.set(a.id, `Token ${String(clinicTokenSeq).padStart(2, '0')}`)
		}
	})

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
	const openAppointment = (apt: Appointment) => navigation.navigate(ROUTES.STACK.APPOINTMENT_DETAILS, { appointmentId: apt.id })

	// Doctor-only: not_arrived -> checked_in (backend rejects the call for any other current
	// status, and the endpoint itself is require_role("doctor") -- this screen only exists for
	// doctors anyway, but the real restriction lives server-side, not in this button being hidden).
	const handleCheckIn = async (apt: Appointment) => {
		if (checkingInId) return
		setCheckingInId(apt.id)
		try {
			const res = await checkInAppointment(apt.id)
			if (res.success) {
				setTodayList((prev) => prev.map((a) => (a.id === apt.id ? { ...a, status: 'checked_in' } : a)))
				Toast.show({ type: 'success', text1: res.message ?? 'Patient checked in' })
			}
		} catch {
			Toast.show({ type: 'error', text1: 'Could not check in the patient. Please try again.' })
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
			Toast.show({ type: 'error', text1: 'Something went wrong. Please try again.' })
		} finally {
			setBusyId(null)
		}
	}

	const handleConfirmReject = async (reasonLabel: string, note: string) => {
		if (!sheet || busyId) return
		const apt = sheet.appt
		setBusyId(apt.id)
		try {
			const res = await updateAppointmentsStatus(apt.id, await getStatusIdByLabel('cancelled'), note ? `${reasonLabel} — ${note}` : reasonLabel)
			if (res.success) {
				const isReq = isPending(apt)
				setOutcomes((prev) => ({
					...prev,
					[apt.id]: { kind: 'reject', title: isReq ? 'Declined' : 'Cancelled', sub: reasonLabel, tone: 'danger' },
				}))
				Toast.show({ type: 'success', text1: res.message ?? (isReq ? 'Request declined' : 'Appointment cancelled') })
			}
		} catch {
			Toast.show({ type: 'error', text1: 'Something went wrong. Please try again.' })
		} finally {
			setBusyId(null)
			setSheet(null)
		}
	}

	const handleConfirmReschedule = async (date: Date, startTime: string, endTime: string | null) => {
		if (!sheet) return
		const apt = sheet.appt
		setBusyId(apt.id)
		try {
			const res = await rescheduleAppointment({
				appointment_id: apt.id,
				appointment_date: toApiDate(date),
				start_time: startTime,
				end_time: endTime,
				hospital_id: apt.hospital?.id,
				reason: 'Doctor proposed a new time',
			})
			if (res.success) {
				setOutcomes((prev) => ({
					...prev,
					[apt.id]: {
						kind: 'reschedule',
						title: `New time proposed · ${dateLabelOf(toApiDate(date))}, ${formatTime12h(startTime)}`,
						sub: 'Waiting for the patient to confirm',
						tone: 'info',
					},
				}))
				Toast.show({ type: 'success', text1: 'New time sent to the patient' })
			}
		} catch {
			Toast.show({ type: 'error', text1: 'Something went wrong. Please try again.' })
		} finally {
			setBusyId(null)
			setSheet(null)
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
			Toast.show({ type: 'error', text1: 'Failed to refer appointment. Please try again.' })
		} finally {
			setBusyId(null)
			setSheet(null)
		}
	}

	const renderApptCard = (apt: Appointment, i: number) => {
		const isReq = isPending(apt)
		return (
			<AppointmentActionCard
				key={apt.id}
				id={apt.id}
				initials={initialsOf(apt.patient?.name)}
				avatarTone={toneKeyAt(i)}
				name={apt.patient?.name ?? 'Patient'}
				meta={`${apt.patient?.age ?? '--'} yrs · ${apt.patient?.gender ?? '--'} · ${isReq ? 'New request' : 'Follow-up'}`}
				isRequest={isReq}
				urgent={apt.pre_intake?.severity === 'severe' || apt.severity === 'severe'}
				slotLabel={slotLabelOf(apt, true)}
				mode={isVideoMode(apt.appointment_mode) ? 'Video' : 'In-clinic'}
				payLabel={`₹${apt.fees ?? '--'}`}
				reason={apt.symptoms || apt.pre_intake?.symptoms || apt.reason}
				busy={busyId === apt.id}
				outcome={outcomes[apt.id]}
				onAccept={() => handleAccept(apt)}
				onReject={() => setSheet({ mode: 'reject', appt: apt })}
				onReschedule={() => setSheet({ mode: 'reschedule', appt: apt })}
				onRefer={() => setSheet({ mode: 'refer', appt: apt })}
				onUndo={() => setOutcomes((prev) => { const next = { ...prev }; delete next[apt.id]; return next })}
			/>
		)
	}


	const reqLeft = reqList.filter((a) => !outcomes[a.id]).length
	const now = new Date()
	const headerSubtitle = `${DOW_SHORT[now.getDay()]} ${now.getDate()} ${MON_SHORT[now.getMonth()]}${selectedHospital ? ` · ${selectedHospital}` : ''}`
	const yesterdayIso = isoPlusDays(todayIso(), -1)

	return (
		<View style={styles.screen}>
			<DoctorScreenHeader variant="simple" title="Schedule" subtitle={headerSubtitle}>
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
				{tab === 'today' && (
					<View style={{ gap: 10, paddingHorizontal: 16 }}>
						<View style={{ flexDirection: 'row', gap: 8 }}>
							{([
								{ id: 'all' as TodayChip, label: `Upcoming · ${todayNotDone.length}` },
								{ id: 'video' as TodayChip, label: `Video · ${todayVideo.length}` },
								{ id: 'done' as TodayChip, label: `Done · ${todayDone.length}` },
							]).map((c) => {
								const on = c.id === todayChip
								return (
									<TouchableOpacity key={c.id} onPress={() => setTodayChip(c.id)} style={[styles.chip, on && styles.chipOn]}>
										<Text style={[styles.chipText, on && styles.chipTextOn]}>{c.label}</Text>
									</TouchableOpacity>
								)
							})}
						</View>
						{todayLoading ? (
							<ActivityIndicator style={{ marginTop: 24 }} color={APP_COLORS.primary} />
						) : todayShown.length ? (
							<AppSoftCard padding={0} radius={14}>
								<View style={{ paddingHorizontal: 12 }}>
									{todayShown.map((apt, i) => (
										<AppAppointmentRow
											key={apt.id}
											time={formatTime12h(apt.start_time)}
											token={todayTokenById.get(apt.id)}
											name={apt.patient?.name ?? 'Patient'}
											mode={isVideoMode(apt.appointment_mode) ? 'Video' : 'In-clinic'}
											meta={[apt.patient?.age ? `${apt.patient.age} yrs` : null, apt.patient?.gender].filter(Boolean).join(' · ')}
											status={humanizeStatus(effectiveStatusLabel(apt))}
											statusTone={rowStatusTone(effectiveStatusLabel(apt))}
											divider={i < todayShown.length - 1}
											onPress={() => openAppointment(apt)}
											action={
												effectiveStatusLabel(apt) === 'not_arrived'
													? { label: 'Check In', onPress: () => handleCheckIn(apt), loading: checkingInId === apt.id }
													: undefined
											}
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
								<Text style={styles.hintText}>Confirmed bookings. Tap a date to see that day only.</Text>
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
				minDate={isoPlusDays(todayIso(), 1)}
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

			{sheet && (
				<AppointmentActionSheet
					visible={!!sheet}
					mode={sheet.mode}
					onClose={() => setSheet(null)}
					appointmentId={sheet.appt.id}
					patientName={sheet.appt.patient?.name ?? 'Patient'}
					slotLabel={slotLabelOf(sheet.appt, true)}
					doctorId={sheet.appt.doctor?.id}
					hospitalId={sheet.appt.hospital?.id}
					appointmentType={isVideoMode(sheet.appt.appointment_mode) ? 'video' : 'clinic'}
					reasons={isPending(sheet.appt) ? REQUEST_REASONS : CANCEL_REASONS}
					busy={busyId === sheet.appt.id}
					onConfirmReject={handleConfirmReject}
					onConfirmReschedule={handleConfirmReschedule}
					onConfirmRefer={handleConfirmRefer}
				/>
			)}
		</View>
	)
}

export default DoctorScheduleScreen

const styles = StyleSheet.create({
	screen: { flex: 1, backgroundColor: APP_COLORS.pageBg },
	chip: {
		height: 36,
		paddingHorizontal: 14,
		borderRadius: 9999,
		borderWidth: 1,
		borderColor: APP_COLORS.divider,
		backgroundColor: APP_COLORS.surface,
		alignItems: 'center',
		justifyContent: 'center',
	},
	chipOn: { borderColor: APP_COLORS.ink, backgroundColor: APP_COLORS.ink },
	chipText: { fontSize: 13, lineHeight: 18, fontWeight: '700', color: APP_COLORS.ink },
	chipTextOn: { color: '#FFFFFF' },
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
