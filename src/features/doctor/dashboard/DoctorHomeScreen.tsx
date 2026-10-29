// src/features/doctor/dashboard/DoctorHomeScreen.tsx
//
// Doctor dashboard "Home" view (source: the "Doctor Dashboard" design's Up next / Later today /
// Needs your action sections). Wired to the real appointments API for the schedule sections.
// "Health reads" and "Communities" deliberately reuse the exact patient-Home components
// (HomeHealthReadsSection / HomeCommunitiesSection) rather than a doctor-specific rebuild — same
// content, same behavior, same styling, one implementation to maintain.

import React, { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { AppAppointmentRow, AppAvatar, AppSidebar, AppSoftCard } from '../../../components/common'
import { APP_COLORS, TONES } from '../../../config/theme'
import { ROUTES } from '../../../navigation/routes'
import { useAuth } from '../../../context/AuthContext'
import { useTabBarClearance } from '../../../navigation/tabBar'
import { useSidebarMenu } from '../../../navigation/useSidebarMenu'
import { DoctorScreenHeader } from './DoctorScreenHeader'
import { DoctorStatusBanner } from './DoctorStatusBanner'
import { useDoctorStatus } from './useDoctorStatus'
import { fetchDoctorHub } from '../../profile/doctor/doctorProfileService'
import { getAppointments, getStatusIdByLabel, startConsultation } from '../doctorService'
import type { Appointment } from '../../../types/appointment'

import { buildS3Url } from '../../../utils/s3Utils'
import { getUnreadNotificationCount } from '../../../services/homeService'
import { listHealthQuestions } from '../../../services/qaService'
import HomeHealthReadsSection from '../../dashboard/components/HomeHealthReadsSection'
import HomeCommunitiesSection from '../../dashboard/components/HomeCommunitiesSection'
import Toast from 'react-native-toast-message'
import { clinicNowHms, clinicTodayIso, effectiveStatusLabel, humanizeStatus, isAccepted, isCompletedAppt, rowStatusTone, statusLabelOf } from '../scheduleUtils'

const isVideo = (apt: Appointment) => apt.appointment_mode === 'video_call' || apt.appointment_mode === 'video call'

function todayIso() {
	return clinicTodayIso() // today in Mumbai (the clinic's clock), not the phone's date
}

function formatTime12h(t?: string | null): string {
	if (!t) return '--'
	const [h, m] = t.split(':').map(Number)
	const suffix = h >= 12 ? 'PM' : 'AM'
	const hour = h > 12 ? h - 12 : h === 0 ? 12 : h
	return `${String(hour).padStart(2, '0')}:${String(m ?? 0).padStart(2, '0')} ${suffix}`
}

/** Status-chip color pair (source: the "Up next" card's "Checked in" chip) — takes the *effective*
 * label (see scheduleUtils.effectiveStatusLabel), so a same-day confirmed appointment reads
 * "not_arrived" here too, not green "Confirmed". Falls back to a neutral tone for anything without
 * an obvious color (e.g. "rescheduled"). */
function statusChipTone(label: string): { bg: string; fg: string } {
	const l = label.toLowerCase()
	if (l === 'checked_in' || l === 'confirmed' || l === 'completed') return { bg: APP_COLORS.successBg, fg: APP_COLORS.success }
	if (l === 'not_arrived') return { bg: TONES.sky.bg, fg: TONES.sky.ink }
	if (l === 'pending') return { bg: APP_COLORS.warningBg, fg: APP_COLORS.warning }
	if (l === 'cancelled') return { bg: APP_COLORS.dangerBg, fg: APP_COLORS.danger }
	return { bg: APP_COLORS.neutralBg, fg: APP_COLORS.inkMuted }
}

/** Real, live countdown to a same-day appointment's start_time (mirrors the mockup's "in 12 min" sub-line) -- never shown for a future date, and blank once the slot has already started. */
function etaLabel(apt: Appointment, isToday: boolean): string | null {
	if (!isToday || !apt.start_time) return null
	const [h, m] = apt.start_time.split(':').map(Number)
	const now = new Date()
	const target = new Date()
	target.setHours(h, m ?? 0, 0, 0)
	const diffMin = Math.round((target.getTime() - now.getTime()) / 60000)
	if (diffMin <= 0) return null
	if (diffMin < 60) return `in ${diffMin} min`
	const hrs = Math.floor(diffMin / 60)
	const mins = diffMin % 60
	return `in ${hrs}h${mins ? ` ${mins}m` : ''}`
}

export function DoctorHomeScreen() {
	const navigation = useNavigation<any>()
	const { user, clearAuth, selectedHospitalId, updateUser } = useAuth()
	const [sidebarOpen, setSidebarOpen] = useState(false)

	// The header and the drawer show the signed-in user's photo, which login doesn't carry: pull it from the
	// profile hub (SidebarLayout does the same for the other roles, but this screen doesn't sit inside it).
	useEffect(() => {
		let cancelled = false
		fetchDoctorHub()
			.then((hub) => {
				if (!cancelled && hub.avatar_url) void updateUser({ avatar: hub.avatar_url })
			})
			.catch(() => {
				// Non-fatal: the initials avatar shows instead.
			})
		return () => {
			cancelled = true
		}
		// updateUser changes with the user, so it is left out: this must run once, not on every update it makes.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	// This screen has its own dark "ink" header (see DoctorScreenHeader) instead of SidebarLayout's generic
	// AppHeader, so it can't wrap children in <SidebarLayout>; it drives the same AppSidebar drawer directly, with
	// the same backend-driven rows.
	const sidebarSections = useSidebarMenu(sidebarOpen)
	const clearance = useTabBarClearance()

	const [appointments, setAppointments] = useState<Appointment[]>([])
	const [loading, setLoading] = useState(true)
	const [refreshing, setRefreshing] = useState(false)
	const [search, setSearch] = useState('')
	const [startingId, setStartingId] = useState<string | null>(null)

	const [pendingRequestsCount, setPendingRequestsCount] = useState(0)
	const [openQuestionsCount, setOpenQuestionsCount] = useState(0)
	const [notificationCount, setNotificationCount] = useState(0)
	const [refreshToken, setRefreshToken] = useState(0)

	const load = useCallback(async (isRefresh = false) => {
		isRefresh ? setRefreshing(true) : setLoading(true)
		try {
			// Today's full list (limit raised from the default 10 -- a busy doctor's day can exceed
			// that) drives the seen/total stat, "Up next", and "Later today".
			// hospital_id is the clinic chosen in the header switcher (null = All clinics).
			const todayRes = await getAppointments({ appointment_date: todayIso(), variant: 'all', limit: 50, ...(selectedHospitalId ? { hospital_id: selectedHospitalId } : {}) })
			// Same rule as DoctorScheduleScreen's Today/Upcoming tabs (see scheduleUtils.isAccepted's
			// doc comment): a still-pending request never shows here, even if dated today -- it stays
			// under Requests until the doctor accepts it.
			const list = (todayRes.data ?? []).filter((a) => isAccepted(a) || isCompletedAppt(a))
			list.sort((a, b) => (a.start_time ?? '').localeCompare(b.start_time ?? ''))
			setAppointments(list)
		} catch {
			// Non-fatal: sections just render empty below.
		} finally {
			isRefresh ? setRefreshing(false) : setLoading(false)
		}
	}, [selectedHospitalId])

	// Profile / verification state for the banner at the top (re-read on focus and on returning to the app).
	const { status: doctorStatus, reload: reloadStatus } = useDoctorStatus()

	// Refetch on every focus, not just mount -- "Up next" now depends on check-in state, which the
	// doctor typically changes on the Schedule tab and then flips back here to start the visit; a
	// bottom-tab screen stays mounted across tab switches, so without this the card would keep
	// showing stale "waiting for check-in" data after the check-in already happened.
	useFocusEffect(
		useCallback(() => {
			load()
		}, [load]),
	)

	// "Needs your action" counts — independent of the today's-schedule refresh above since they're
	// not date-scoped. Best-effort: a failed call just leaves that count at its default rather than
	// blocking the rest of the screen. (Health reads / Communities fetch their own data internally —
	// see HomeHealthReadsSection / HomeCommunitiesSection below.)
	useEffect(() => {
		let active = true

		// The appointments list already returns `meta.total` for the filtered query, so resolve the
		// "pending" status id and read the total with limit 1 instead of pulling 100 rows to count.
		const loadPendingRequests = async () => {
			try {
				const pendingStatusId = await getStatusIdByLabel('pending')
				const res = await getAppointments({ variant: 'all', limit: 1, status_id: pendingStatusId })
				if (active) setPendingRequestsCount(res.meta?.total ?? 0)
			} catch {
				// Best-effort: leave the count at its default.
			}
		}
		const loadOpenQuestions = async () => {
			try {
				const res = await listHealthQuestions(undefined, 1, 1, false)
				if (active) setOpenQuestionsCount(res.meta?.total ?? 0)
			} catch {
				// Best-effort: leave the count at its default.
			}
		}
		const loadNotificationCount = async () => {
			try {
				const count = await getUnreadNotificationCount()
				if (active) setNotificationCount(count)
			} catch {
				// Best-effort: leave the count at its default.
			}
		}

		void loadPendingRequests()
		void loadOpenQuestions()
		void loadNotificationCount()

		return () => {
			active = false
		}
	}, [refreshToken])

	const handleStart = async (apt: Appointment) => {
		if (!apt.patient?.id) return
		setStartingId(apt.id)
		try {
			const res = await startConsultation(apt.id)
			if (res.success && res.data?.already_verified) {
				// The patient already gave the code for this appointment: no second code, straight to the consultation.
				navigation.navigate(ROUTES.STACK.CONSULTATION, { appointmentId: apt.id, patientId: apt.patient.id })
			} else if (res.success) {
				navigation.navigate(ROUTES.STACK.VERIFY_ACCESS, {
					appointmentId: apt.id,
					patientId: apt.patient.id,
					patientName: apt.patient.name,
					patientMeta: `${apt.patient.age} yrs · ${apt.patient.gender} · ${formatTime12h(apt.start_time)}`,
					slotTime: formatTime12h(apt.start_time),
				})
			}
		} catch {
			Toast.show({ type: 'error', text1: 'Failed to generate OTP' })
		} finally {
			setStartingId(null)
		}
	}

	const openPatientInfo = (apt: Appointment) => {
		// The patient's code was already entered for this appointment: straight into the consultation, no code.
		if (apt.access_verified && apt.patient?.id) {
			navigation.navigate(ROUTES.STACK.CONSULTATION, { appointmentId: apt.id, patientId: apt.patient.id })
			return
		}
		navigation.navigate(ROUTES.STACK.APPOINTMENT_DETAILS, { appointmentId: apt.id })
	}

	// "Up next" is the doctor's ready-to-see queue: only a patient who has actually checked in (i.e.
	// arrived at reception) -- a merely confirmed/not_arrived appointment stays off this card even if
	// its slot time has arrived, since starting a consultation before the patient is physically
	// present doesn't make sense. Sorted by scheduled time (earliest-checked-in-for wins) since we
	// don't track an actual check-in timestamp.
	const nowHm = clinicNowHms() // appointment start times are Mumbai wall-clock time
	const checkedInToday = appointments.filter((a) => effectiveStatusLabel(a) === 'checked_in')
	const next = checkedInToday[0] ?? undefined
	// "Later today" is the rest of today's remaining schedule (any accepted status, not just
	// checked-in) so the doctor can still see who's coming up even before they've checked in.
	const laterToday = appointments.filter((a) => (a.start_time ?? '') >= nowHm && a.id !== next?.id).slice(0, 6)
	const seenCount = appointments.filter((a) => statusLabelOf(a).toLowerCase() === 'completed').length

	return (
		<View style={styles.screen}>
			<AppSidebar
				visible={sidebarOpen}
				profileCompletion={(user as any)?.profileCompletion}
				onClose={() => setSidebarOpen(false)}
				onLogout={clearAuth}
				onEditProfile={() => {
					setSidebarOpen(false)
					navigation.navigate(ROUTES.MAIN.PROFILE)
				}}
				sections={sidebarSections}
			/>
			<DoctorScreenHeader
				variant="home"
				name={user?.name || 'Doctor'}
				avatarUri={buildS3Url((user as any)?.avatar_s3_key ?? (user as any)?.avatar)}
				notificationCount={notificationCount}
				onAvatarPress={() => setSidebarOpen(true)}
				onNotificationsPress={() => navigation.navigate(ROUTES.STACK.NOTIFICATION)}
				showHospitalSelector
				searchValue={search}
				onSearchChange={setSearch}
			/>
			<ScrollView
				style={styles.scroll}
				contentContainerStyle={{ paddingBottom: clearance, gap: 24, paddingTop: 16 }}
				refreshControl={
					<RefreshControl
						refreshing={refreshing}
						onRefresh={() => {
							load(true)
							void reloadStatus()
							setRefreshToken((t) => t + 1)
						}}
					/>
				}
			>
				<DoctorStatusBanner status={doctorStatus} />
				{loading ? (
					<ActivityIndicator style={{ marginTop: 40 }} color={APP_COLORS.primary} />
				) : (
					<>
						<Section
							title="Up next"
							subtitle={appointments.length > 0 ? `${seenCount} of ${appointments.length} patients seen today` : undefined}
							onAction={() => navigation.navigate(ROUTES.MAIN.SCHEDULE)} actionLabel="Full schedule">
							{next ? (
								<AppSoftCard padding={0} radius={12}>
									<View style={{ padding: 14, gap: 10 }}>
										<View style={styles.patientRow}>
											<AppAvatar uri={buildS3Url(next.patient?.avatar_s3_key)} name={next.patient?.name} size={52} radius={12} />
											<View style={{ flex: 1, minWidth: 0 }}>
												<Text style={styles.patientName} numberOfLines={1}>
													{next.patient?.name ?? 'Patient'}
												</Text>
												<Text style={styles.patientMeta} numberOfLines={1}>
													{next.patient?.age ? `${next.patient.age} yrs · ` : ''}
													{next.patient?.gender ?? ''}
												</Text>
											</View>
											<View style={[styles.statusChip, { backgroundColor: statusChipTone(effectiveStatusLabel(next)).bg }]}>
												<Text style={[styles.statusChipText, { color: statusChipTone(effectiveStatusLabel(next)).fg }]}>
													{humanizeStatus(effectiveStatusLabel(next))}
												</Text>
											</View>
										</View>
										{!!(next.symptoms || next.pre_intake?.symptoms) && (
											<Text style={styles.symptoms} numberOfLines={2}>
												{next.symptoms || next.pre_intake?.symptoms}
											</Text>
										)}
									</View>
									<View style={styles.upNextFooter}>
										<View style={{ flex: 1, minWidth: 0 }}>
											<View style={styles.footerTimeRow}>
												<MaterialCommunityIcons name="clock-outline" size={16} color={APP_COLORS.ink} />
												<Text style={styles.footerTime}>
													Today, {formatTime12h(next.start_time)}
												</Text>
											</View>
											<Text style={styles.footerSub}>
												{isVideo(next) ? 'Video' : 'In-clinic'}
												{etaLabel(next, true) ? ` · ${etaLabel(next, true)}` : ''}
											</Text>
										</View>
										<TouchableOpacity
											style={styles.primaryBtn}
											onPress={() => handleStart(next)}
											disabled={startingId === next.id}
										>
											{startingId === next.id ? (
												<ActivityIndicator size="small" color="#FFFFFF" />
											) : (
												<Text style={styles.primaryBtnText}>Start</Text>
											)}
										</TouchableOpacity>
									</View>
								</AppSoftCard>
							) : (
								<EmptyRow label={appointments.length ? 'Waiting for a patient to check in' : 'No more appointments today'} />
							)}
						</Section>

						<Section title="Later today" onAction={() => navigation.navigate(ROUTES.MAIN.SCHEDULE)} actionLabel="View all">
							{laterToday.length ? (
								<AppSoftCard padding={0} radius={14}>
									<View style={{ paddingHorizontal: 12 }}>
										{laterToday.map((apt, i) => (
											<AppAppointmentRow
												key={apt.id}
												time={formatTime12h(apt.start_time)}
												name={apt.patient?.name ?? 'Patient'}
												mode={isVideo(apt) ? 'Video' : 'In-clinic'}
												status={humanizeStatus(effectiveStatusLabel(apt))}
												statusTone={rowStatusTone(effectiveStatusLabel(apt))}
												divider={i < laterToday.length - 1}
												onPress={() => openPatientInfo(apt)}
											/>
										))}
									</View>
								</AppSoftCard>
							) : (
								<EmptyRow label="Nothing else scheduled today" />
							)}
						</Section>

						<Section title="Needs your action">
							<AppSoftCard padding={0} radius={12}>
								<View style={{ paddingHorizontal: 14 }}>
									<ActionRow
										icon="calendar-alert"
										title="Appointment requests"
										sub="New bookings waiting on you"
										count={pendingRequestsCount}
										onPress={() => navigation.navigate(ROUTES.MAIN.SCHEDULE, { segment: 'req' })}
									/>
									<ActionRow
										icon="comment-question-outline"
										title="Patient questions"
										sub="Free public Q&A"
										count={openQuestionsCount}
										onPress={() => navigation.navigate(ROUTES.MAIN.ENGAGE)}
										divider={false}
									/>
								</View>
							</AppSoftCard>
						</Section>

						{/* Same components as the patient Home screen (DashboardPage.tsx) -- not a doctor-specific
						    rebuild, per instruction: identical content, behavior and styling. */}
						<HomeHealthReadsSection refreshToken={refreshToken} />
						<HomeCommunitiesSection refreshToken={refreshToken} />
					</>
				)}
			</ScrollView>
		</View>
	)
}

function Section({
	title,
	subtitle,
	actionLabel,
	onAction,
	children,
}: {
	title: string
	subtitle?: string
	actionLabel?: string
	onAction?: () => void
	children: React.ReactNode
}) {
	return (
		<View style={{ gap: 10 }}>
			<View style={styles.sectionHeader}>
				<View style={{ flex: 1, minWidth: 0 }}>
					<Text style={styles.sectionTitle}>{title}</Text>
					{!!subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
				</View>
				{!!actionLabel && (
					<TouchableOpacity onPress={onAction} style={styles.sectionAction}>
						<Text style={styles.sectionActionText}>{actionLabel}</Text>
						<MaterialCommunityIcons name="chevron-right" size={16} color={APP_COLORS.primary} />
					</TouchableOpacity>
				)}
			</View>
			<View style={{ paddingHorizontal: 16 }}>{children}</View>
		</View>
	)
}

function ActionRow({
	icon,
	title,
	sub,
	count,
	onPress,
	divider = true,
}: {
	icon: keyof typeof MaterialCommunityIcons.glyphMap
	title: string
	sub: string
	count: number
	onPress: () => void
	divider?: boolean
}) {
	return (
		<TouchableOpacity
			style={[styles.actionRow, divider && styles.actionRowDivider]}
			onPress={onPress}
			activeOpacity={0.7}
		>
			<View style={styles.actionIcon}>
				<MaterialCommunityIcons name={icon} size={20} color={APP_COLORS.primary} />
			</View>
			<View style={{ flex: 1, minWidth: 0 }}>
				<Text style={styles.actionTitle}>{title}</Text>
				<Text style={styles.actionSub}>{sub}</Text>
			</View>
			{count > 0 && (
				<View style={styles.actionCount}>
					<Text style={styles.actionCountText}>{count}</Text>
				</View>
			)}
			<MaterialCommunityIcons name="chevron-right" size={16} color={APP_COLORS.inkMuted} />
		</TouchableOpacity>
	)
}

function EmptyRow({ label }: { label: string }) {
	return (
		<AppSoftCard>
			<Text style={styles.emptyText}>{label}</Text>
		</AppSoftCard>
	)
}

const styles = StyleSheet.create({
	screen: { flex: 1, backgroundColor: APP_COLORS.pageBg },
	scroll: { flex: 1 },
	sectionHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 8,
		paddingHorizontal: 16,
	},
	sectionTitle: { fontSize: 18, lineHeight: 26, fontWeight: '700', color: APP_COLORS.ink },
	sectionSubtitle: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
	sectionAction: { flexDirection: 'row', alignItems: 'center', gap: 2, height: 36 },
	sectionActionText: { fontSize: 14, lineHeight: 20, fontWeight: '700', color: APP_COLORS.primary },
	patientRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
	patientName: { fontSize: 16, lineHeight: 22, fontWeight: '800', color: APP_COLORS.ink },
	patientMeta: { fontSize: 13, lineHeight: 18, color: APP_COLORS.inkMuted },
	symptoms: { fontSize: 13, lineHeight: 18, color: APP_COLORS.ink },
	upNextFooter: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		padding: 14,
		backgroundColor: APP_COLORS.mint,
	},
	footerTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
	footerTime: { fontSize: 14, lineHeight: 20, fontWeight: '800', color: APP_COLORS.ink },
	footerSub: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
	statusChip: { flexShrink: 0, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
	statusChipText: { fontSize: 12, lineHeight: 16, fontWeight: '700' },
	primaryBtn: {
		height: 40,
		paddingHorizontal: 14,
		borderRadius: 10,
		backgroundColor: APP_COLORS.primary,
		alignItems: 'center',
		justifyContent: 'center',
		minWidth: 64,
	},
	primaryBtnText: { fontSize: 14, lineHeight: 20, fontWeight: '700', color: '#FFFFFF' },
	actionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingVertical: 12 },
	actionRowDivider: { borderBottomWidth: 1, borderBottomColor: APP_COLORS.divider },
	actionIcon: {
		width: 40,
		height: 40,
		borderRadius: 12,
		backgroundColor: APP_COLORS.mint,
		alignItems: 'center',
		justifyContent: 'center',
	},
	actionTitle: { fontSize: 15, lineHeight: 20, fontWeight: '700', color: APP_COLORS.ink },
	actionSub: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
	actionCount: {
		minWidth: 28,
		height: 28,
		paddingHorizontal: 8,
		borderRadius: 9999,
		backgroundColor: APP_COLORS.primary,
		alignItems: 'center',
		justifyContent: 'center',
	},
	actionCountText: { fontSize: 13, lineHeight: 28, fontWeight: '800', color: '#FFFFFF', textAlign: 'center' },
	emptyText: { fontSize: 14, lineHeight: 20, color: APP_COLORS.inkMuted, textAlign: 'center' },
})

export default DoctorHomeScreen
