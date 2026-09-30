// src/features/doctor/dashboard/DoctorScheduleScreen.tsx
//
// Doctor dashboard "Schedule" view (source: the "Doctor Dashboard" design) — the header's own
// segmented control confirms exactly 4 categories: Today, Requests, Upcoming, Past.
//   Today     — filter chips (Upcoming/Video/Done) over today's appointment rows.
//   Requests  — pending booking requests: accept / reject / reschedule / refer, via the shared
//               AppointmentActionCard + AppointmentActionSheet (also usable by Upcoming below, and
//               reusable as-is for a future Pharmacy/Laboratory "requests" surface).
//   Upcoming  — already-confirmed bookings for the next 7 days; same card, no Accept button.
//   Past      — date-range + status/visit-type filters over a date-grouped list.
// All four are wired to the real appointments API; Accept/Reject reuse the exact status ids
// DoctorAppointments.tsx already used successfully, Reschedule/Refer reuse the real
// availability/referral/favourites services via AppointmentActionSheet.

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
import { APP_COLORS, TONE_ORDER } from '../../../config/theme'
import { ROUTES } from '../../../navigation/routes'
import { useTabBarClearance } from '../../../navigation/tabBar'
import { DoctorScreenHeader } from './DoctorScreenHeader'
import { checkInAppointment, getAppointmentStatuses, getAppointments, getStatusIdByLabel, type AppointmentStatusOption } from '../doctorService'
import { updateAppointmentsStatus } from '../../../services/appointmentService'
import { rescheduleAppointment } from '../doctorService'
import { createReferral } from '../../referrals/referralService'
import { effectiveStatusLabel, formatTime12h, humanizeStatus, isAccepted, isCompletedAppt, isPending, isVideoMode, rowStatusTone, statusLabelOf, toApiDate } from '../scheduleUtils'
import type { Appointment } from '../../../types/appointment'
import type { FavouriteDoctorListItem } from '../search/components/FavouriteDoctorList'

type ScheduleTab = 'today' | 'req' | 'up' | 'past'
type TodayChip = 'all' | 'video' | 'done'
type DateRangeKey = 'yesterday' | '7' | '30' | '90' | 'custom'

const RANGE_LABELS: Record<DateRangeKey, string> = {
	yesterday: 'Yesterday',
	'7': 'Last 7 days',
	'30': 'Last 30 days',
	'90': 'Last 3 months',
	custom: 'Custom dates',
}
const RANGE_DAYS: Record<Exclude<DateRangeKey, 'custom'>, number> = { yesterday: 1, '7': 7, '30': 30, '90': 90 }

// statusLabelOf/isPending/isAccepted imported from ../scheduleUtils -- shared with DoctorHomeScreen
// so the Requests/Today/Upcoming/Past categorization rule can't drift between the two screens.
const isCompleted = isCompletedAppt

// rowStatusTone/humanizeStatus/effectiveStatusLabel imported from ../scheduleUtils -- shared with
// DoctorHomeScreen so a same-day confirmed appointment reads (and can be checked in) as
// "Not arrived" on both screens, not just this one.

function todayIso() {
	const d = new Date()
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function isoPlusDays(iso: string, days: number) {
	const d = new Date(`${iso}T00:00:00`)
	d.setDate(d.getDate() + days)
	return toApiDate(d)
}
function dateLabelOf(iso: string) {
	const d = new Date(`${iso}T00:00:00`)
	if (Number.isNaN(d.getTime())) return iso
	return d.toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short' })
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

export function DoctorScheduleScreen() {
	const navigation = useNavigation<any>()
	const route = useRoute<any>()
	const clearance = useTabBarClearance()

	const [tab, setTab] = useState<ScheduleTab>((route.params?.segment as ScheduleTab) ?? 'today')

	// Today
	const [todayList, setTodayList] = useState<Appointment[]>([])
	const [todayLoading, setTodayLoading] = useState(true)
	const [todayChip, setTodayChip] = useState<TodayChip>('all')

	// Requests + Upcoming share one fetch/action-sheet/outcome machinery
	const [reqList, setReqList] = useState<Appointment[]>([])
	const [upList, setUpList] = useState<Appointment[]>([])
	const [apptsLoading, setApptsLoading] = useState(true)
	const [outcomes, setOutcomes] = useState<Record<string, Outcome>>({})
	const [busyId, setBusyId] = useState<string | null>(null)
	const [sheet, setSheet] = useState<{ mode: ActionSheetMode; appt: Appointment } | null>(null)
	const [checkingInId, setCheckingInId] = useState<string | null>(null)

	// Past
	const [pastRangeSheetOpen, setPastRangeSheetOpen] = useState(false)
	const [pastFilterSheetOpen, setPastFilterSheetOpen] = useState(false)
	const [pastRange, setPastRange] = useState<DateRangeKey>('7')
	const [pastFrom, setPastFrom] = useState(isoPlusDays(todayIso(), -30))
	const [pastTo, setPastTo] = useState(isoPlusDays(todayIso(), -1))
	const [pastStatus, setPastStatus] = useState('all')
	const [pastMode, setPastMode] = useState<'all' | 'clinic' | 'video'>('all')
	const [pastQuery, setPastQuery] = useState('')
	const [pastList, setPastList] = useState<Appointment[]>([])
	const [pastLoading, setPastLoading] = useState(true)
	const [statusOptions, setStatusOptions] = useState<AppointmentStatusOption[]>([])

	const [refreshing, setRefreshing] = useState(false)

	const loadToday = useCallback(async () => {
		setTodayLoading(true)
		try {
			const res = await getAppointments({ appointment_date: todayIso(), variant: 'all', limit: 50 })
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
	}, [])

	const loadAppts = useCallback(async () => {
		setApptsLoading(true)
		try {
			const res = await getAppointments({ variant: 'upcoming', limit: 100 })
			const list = res.data ?? []
			const today = todayIso()
			const weekOut = isoPlusDays(today, 7)
			// Requests: no action taken yet -- pending, regardless of date.
			setReqList(list.filter(isPending).sort((a, b) => (a.appointment_date + (a.start_time ?? '')).localeCompare(b.appointment_date + (b.start_time ?? ''))))
			// Upcoming: already accepted, strictly after today, within the next week.
			setUpList(
				list
					.filter((a) => isAccepted(a) && a.appointment_date > today && a.appointment_date <= weekOut)
					.sort((a, b) => (a.appointment_date + (a.start_time ?? '')).localeCompare(b.appointment_date + (b.start_time ?? ''))),
			)
		} catch {
			setReqList([])
			setUpList([])
		} finally {
			setApptsLoading(false)
		}
	}, [])

	const loadPast = useCallback(async () => {
		setPastLoading(true)
		try {
			const today = todayIso()
			const from = pastRange === 'custom' ? pastFrom : isoPlusDays(today, -RANGE_DAYS[pastRange])
			const to = pastRange === 'custom' ? pastTo : isoPlusDays(today, -1)
			const res = await getAppointments({
				start_date: from,
				end_date: to,
				variant: 'all',
				limit: 100,
				...(pastQuery.trim() ? { search: pastQuery.trim() } : {}),
			})
			// Past: completed visits, or accepted bookings whose date has simply gone by without an
			// explicit "completed" (e.g. the doctor never flipped it) -- never a pending request that
			// was left undecided and aged into the past.
			setPastList((res.data ?? []).filter((a) => isCompleted(a) || isAccepted(a)))
		} catch {
			setPastList([])
		} finally {
			setPastLoading(false)
		}
	}, [pastRange, pastFrom, pastTo, pastQuery])

	useEffect(() => {
		loadToday()
		loadAppts()
		getAppointmentStatuses().then(setStatusOptions).catch(() => {})
	}, [loadToday, loadAppts])

	useEffect(() => {
		loadPast()
	}, [loadPast])

	const refreshAll = () => {
		setRefreshing(true)
		Promise.all([loadToday(), loadAppts(), loadPast()]).finally(() => setRefreshing(false))
	}

	// ── Today derived ──────────────────────────────────────────────────────
	const todayNotDone = todayList.filter((a) => !isCompleted(a))
	const todayVideo = todayNotDone.filter((a) => isVideoMode(a.appointment_mode))
	const todayDone = todayList.filter(isCompleted)
	const todayShown = todayChip === 'video' ? todayVideo : todayChip === 'done' ? todayDone : todayNotDone

	// Row token (source: the "Doctor Dashboard" design's Today rows -- "Token 06" under the time for
	// an in-clinic visit, "Video" for a video one). No real "token number" field exists on the
	// backend, so this is a real, derived value (sequential position in today's own list, sorted by
	// start_time like the list already is) rather than a fabricated one -- and it's computed from the
	// full `todayList`, not the chip-filtered `todayShown`, so a patient's token stays stable no
	// matter which filter chip is active.
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

	return (
		<View style={styles.screen}>
			<DoctorScreenHeader
				variant="simple"
				title="Schedule"
				subtitle={new Date().toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short' })}
			>
				<AppSegmentedControl
					shape="rounded"
					tabs
					accessibilityLabel="Schedule category"
					options={[
						{ value: 'today', label: 'Today' },
						{ value: 'req', label: 'Requests', count: reqLeft, countTone: 'warn' },
						{ value: 'up', label: 'Upcoming' },
						{ value: 'past', label: 'Past' },
					]}
					value={tab}
					onChange={(v) => setTab(v as ScheduleTab)}
					style={{ backgroundColor: '#FFFFFF14', borderWidth: 0 }}
				/>
			</DoctorScreenHeader>

			<ScrollView
				contentContainerStyle={{ paddingTop: 16, paddingBottom: clearance, gap: 12 }}
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
							<AppSoftCard>
								<Text style={styles.emptyText}>Nothing here yet</Text>
							</AppSoftCard>
						)}
					</View>
				)}

				{(tab === 'req' || tab === 'up') && (
					<View style={{ gap: 12, paddingHorizontal: 16 }}>
						<Text style={styles.hintText}>
							{tab === 'req' ? 'New bookings waiting for you. Accept, reschedule, refer or reject.' : 'Confirmed bookings for the next 7 days.'}
						</Text>
						{apptsLoading ? (
							<ActivityIndicator style={{ marginTop: 24 }} color={APP_COLORS.primary} />
						) : (tab === 'req' ? reqList : upList).length === 0 ? (
							<AppSoftCard>
								<Text style={styles.emptyText}>{tab === 'req' ? 'No requests waiting. New bookings will show up here.' : 'Nothing confirmed for the next 7 days.'}</Text>
							</AppSoftCard>
						) : (
							(tab === 'req' ? reqList : upList).map(renderApptCard)
						)}
					</View>
				)}

				{tab === 'past' && (
					<View style={{ gap: 14, paddingHorizontal: 16 }}>
						<View style={styles.searchBox}>
							<MaterialCommunityIcons name="magnify" size={18} color={APP_COLORS.inkMuted} />
							<TextInput
								value={pastQuery}
								onChangeText={setPastQuery}
								placeholder="Search patient name"
								placeholderTextColor={APP_COLORS.inkMuted}
								style={styles.searchInput}
							/>
						</View>
						<View style={{ flexDirection: 'row', gap: 8 }}>
							<TouchableOpacity style={styles.rangeBtn} onPress={() => setPastRangeSheetOpen(true)}>
								<MaterialCommunityIcons name="calendar-outline" size={18} color={APP_COLORS.primary} />
								<Text style={styles.rangeBtnText} numberOfLines={1}>
									{RANGE_LABELS[pastRange]}
								</Text>
								<MaterialCommunityIcons name="chevron-down" size={16} color={APP_COLORS.inkMuted} />
							</TouchableOpacity>
							<TouchableOpacity
								style={[styles.filterBtn, (pastStatus !== 'all' || pastMode !== 'all') && styles.filterBtnActive]}
								onPress={() => setPastFilterSheetOpen(true)}
							>
								<MaterialCommunityIcons name="filter-variant" size={18} color={pastStatus !== 'all' || pastMode !== 'all' ? APP_COLORS.primary : APP_COLORS.ink} />
								<Text style={styles.filterBtnText}>
									{[pastStatus !== 'all' && 1, pastMode !== 'all' && 1].filter(Boolean).length
										? `Filters · ${[pastStatus !== 'all', pastMode !== 'all'].filter(Boolean).length}`
										: 'Filters'}
								</Text>
							</TouchableOpacity>
						</View>

						{pastLoading ? (
							<ActivityIndicator style={{ marginTop: 24 }} color={APP_COLORS.primary} />
						) : (
							(() => {
								const filtered = pastList.filter((a) => {
									if (pastStatus !== 'all' && statusLabelOf(a).toLowerCase() !== pastStatus) return false
									if (pastMode === 'clinic' && isVideoMode(a.appointment_mode)) return false
									if (pastMode === 'video' && !isVideoMode(a.appointment_mode)) return false
									return true
								})
								const byDate = new Map<string, Appointment[]>()
								filtered.forEach((a) => {
									if (!byDate.has(a.appointment_date)) byDate.set(a.appointment_date, [])
									byDate.get(a.appointment_date)!.push(a)
								})
								const groups = Array.from(byDate.entries()).sort((a, b) => b[0].localeCompare(a[0]))

								return (
									<>
										<Text style={styles.summaryText}>
											<Text style={styles.summaryBold}>
												{filtered.length} {filtered.length === 1 ? 'appointment' : 'appointments'}
											</Text>{' '}
											· {dateLabelOf(pastRange === 'custom' ? pastFrom : isoPlusDays(todayIso(), -RANGE_DAYS[pastRange as Exclude<DateRangeKey, 'custom'>]))} –{' '}
											{dateLabelOf(pastRange === 'custom' ? pastTo : isoPlusDays(todayIso(), -1))}
										</Text>
										{groups.length ? (
											groups.map(([date, rows]) => (
												<View key={date} style={{ gap: 6 }}>
													<Text style={styles.groupLabel}>{dateLabelOf(date).toUpperCase()}</Text>
													<AppSoftCard padding={0} radius={8}>
														<View style={{ paddingHorizontal: 12 }}>
															{rows.map((apt, i) => (
																<AppAppointmentRow
																	key={apt.id}
																	time={formatTime12h(apt.start_time)}
																	token={`Visit ${i + 1}`}
																	name={apt.patient?.name ?? 'Patient'}
																	mode={isVideoMode(apt.appointment_mode) ? 'Video' : 'In-clinic'}
																	meta={[apt.patient?.age ? `${apt.patient.age} yrs` : null, apt.patient?.gender].filter(Boolean).join(' · ')}
																	status={humanizeStatus(statusLabelOf(apt))}
																	statusTone={rowStatusTone(statusLabelOf(apt))}
																	divider={i < rows.length - 1}
																	onPress={() => openAppointment(apt)}
																/>
															))}
														</View>
													</AppSoftCard>
												</View>
											))
										) : (
											<AppSoftCard style={{ alignItems: 'center', gap: 8 }}>
												<Text style={styles.emptyText}>No appointments in this period</Text>
												<TouchableOpacity
													style={styles.resetBtn}
													onPress={() => {
														setPastRange('7')
														setPastStatus('all')
														setPastMode('all')
														setPastQuery('')
													}}
												>
													<Text style={styles.resetBtnText}>Reset filters</Text>
												</TouchableOpacity>
											</AppSoftCard>
										)}
									</>
								)
							})()
						)}
					</View>
				)}
			</ScrollView>

			<AppBottomSheet visible={pastRangeSheetOpen} title="Show appointments from" onClose={() => setPastRangeSheetOpen(false)} appearance="modern">
				{(Object.keys(RANGE_LABELS) as DateRangeKey[]).map((key) => {
					const on = key === pastRange
					return (
						<TouchableOpacity
							key={key}
							style={styles.radioRow}
							onPress={() => {
								setPastRange(key)
								if (key !== 'custom') setPastRangeSheetOpen(false)
							}}
						>
							<Text style={[styles.radioLabel, on && styles.radioLabelOn]}>{RANGE_LABELS[key]}</Text>
							<MaterialCommunityIcons name={on ? 'radiobox-marked' : 'radiobox-blank'} size={20} color={on ? APP_COLORS.primary : APP_COLORS.border} />
						</TouchableOpacity>
					)
				})}
				{pastRange === 'custom' && (
					<View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
						<View style={{ flex: 1, gap: 4 }}>
							<Text style={styles.fieldLabel}>From</Text>
							<TextInput value={pastFrom} onChangeText={setPastFrom} style={styles.dateInput} placeholder="YYYY-MM-DD" />
						</View>
						<View style={{ flex: 1, gap: 4 }}>
							<Text style={styles.fieldLabel}>To</Text>
							<TextInput value={pastTo} onChangeText={setPastTo} style={styles.dateInput} placeholder="YYYY-MM-DD" />
						</View>
					</View>
				)}
			</AppBottomSheet>

			<AppBottomSheet
				visible={pastFilterSheetOpen}
				title="Filter appointments"
				onClose={() => setPastFilterSheetOpen(false)}
				appearance="modern"
				footer={
					<TouchableOpacity style={styles.applyBtn} onPress={() => setPastFilterSheetOpen(false)}>
						<Text style={styles.applyBtnText}>Apply</Text>
					</TouchableOpacity>
				}
			>
				<View style={{ gap: 16 }}>
					<View style={{ gap: 8 }}>
						<Text style={styles.fieldLabel}>Status</Text>
						<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
							{[{ id: 'all', label: 'All' }, ...statusOptions.map((s) => ({ id: s.label.toLowerCase(), label: s.label }))].map((s) => {
								const on = s.id === pastStatus
								return (
									<TouchableOpacity key={s.id} style={[styles.filterChip, on && styles.filterChipOn]} onPress={() => setPastStatus(s.id)}>
										<Text style={[styles.filterChipText, on && styles.filterChipTextOn]}>{s.label}</Text>
									</TouchableOpacity>
								)
							})}
						</View>
					</View>
					<View style={{ gap: 8 }}>
						<Text style={styles.fieldLabel}>Visit type</Text>
						<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
							{([{ id: 'all', label: 'All' }, { id: 'clinic', label: 'In-clinic' }, { id: 'video', label: 'Video' }] as const).map((m) => {
								const on = m.id === pastMode
								return (
									<TouchableOpacity key={m.id} style={[styles.filterChip, on && styles.filterChipOn]} onPress={() => setPastMode(m.id)}>
										<Text style={[styles.filterChipText, on && styles.filterChipTextOn]}>{m.label}</Text>
									</TouchableOpacity>
								)
							})}
						</View>
					</View>
				</View>
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
	emptyText: { fontSize: 14, lineHeight: 20, color: APP_COLORS.inkMuted, textAlign: 'center' },
	hintText: { fontSize: 12, lineHeight: 16, fontWeight: '700', color: APP_COLORS.inkMuted },
	rangeBtn: {
		flex: 1,
		minWidth: 0,
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
	rangeBtnText: { flex: 1, fontSize: 14, lineHeight: 18, fontWeight: '700', color: APP_COLORS.ink },
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
	summaryBold: { color: APP_COLORS.ink, fontWeight: '800' },
	groupLabel: { fontSize: 12, lineHeight: 16, fontWeight: '800', letterSpacing: 0.4, color: APP_COLORS.inkMuted },
	resetBtn: { height: 36, paddingHorizontal: 12, borderRadius: 8, backgroundColor: APP_COLORS.mint, alignItems: 'center', justifyContent: 'center' },
	resetBtnText: { fontSize: 13, lineHeight: 18, fontWeight: '700', color: APP_COLORS.primary },
	radioRow: {
		minHeight: 52,
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: APP_COLORS.divider,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	radioLabel: { fontSize: 15, lineHeight: 20, fontWeight: '600', color: APP_COLORS.ink },
	radioLabelOn: { fontWeight: '800' },
	fieldLabel: { fontSize: 13, lineHeight: 18, fontWeight: '800', color: APP_COLORS.ink },
	dateInput: {
		height: 44,
		paddingHorizontal: 10,
		borderWidth: 1,
		borderColor: APP_COLORS.border,
		borderRadius: 6,
		backgroundColor: APP_COLORS.surface,
		fontSize: 14,
		color: APP_COLORS.ink,
	},
	filterChip: {
		height: 40,
		paddingHorizontal: 14,
		borderRadius: 6,
		borderWidth: 1,
		borderColor: APP_COLORS.divider,
		alignItems: 'center',
		justifyContent: 'center',
	},
	filterChipOn: { backgroundColor: APP_COLORS.mint, borderColor: APP_COLORS.primary },
	filterChipText: { fontSize: 14, lineHeight: 18, fontWeight: '700', color: APP_COLORS.ink },
	filterChipTextOn: { color: APP_COLORS.primary },
	applyBtn: { height: 48, borderRadius: 10, backgroundColor: APP_COLORS.primary, alignItems: 'center', justifyContent: 'center' },
	applyBtnText: { fontSize: 14, lineHeight: 20, fontWeight: '800', color: '#FFFFFF' },
	searchBox: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		height: 44,
		paddingHorizontal: 12,
		borderWidth: 1,
		borderColor: APP_COLORS.border,
		borderRadius: 8,
		backgroundColor: APP_COLORS.surface,
	},
	searchInput: { flex: 1, fontSize: 15, color: APP_COLORS.ink },
})
