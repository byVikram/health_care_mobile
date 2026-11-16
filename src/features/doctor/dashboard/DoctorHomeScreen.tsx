// src/features/doctor/dashboard/DoctorHomeScreen.tsx
//
// Doctor dashboard "Home" view (source: the "Doctor Dashboard NEW" design: a header with the day's progress, an
// "Up next" carousel of the patients still to be seen, and the "Needs your action" list). Wired to the real appointments API.
// "Health reads" and "Communities" deliberately reuse the exact patient-Home components
// (HomeHealthReadsSection / HomeCommunitiesSection) rather than a doctor-specific rebuild — same
// content, same behavior, same styling, one implementation to maintain.

import React, { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { AppProgressBar, AppSidebar, AppSoftCard } from '../../../components/common'
import { APP_COLORS } from '../../../config/theme'
import { ROUTES } from '../../../navigation/routes'
import { useAuth } from '../../../context/AuthContext'
import { useTabBarClearance } from '../../../navigation/tabBar'
import { useSidebarMenu } from '../../../navigation/useSidebarMenu'
import { DoctorScreenHeader } from './DoctorScreenHeader'
import { DoctorStatusBanner } from './DoctorStatusBanner'
import { useDoctorStatus } from './useDoctorStatus'
import { UpNextCarousel } from './UpNextCarousel'
import { useStartConsultation } from './useStartConsultation'
import { useDoctorAvatarSync } from '../../profile/doctor/useDoctorAvatarSync'
import { getAppointments, setAppointmentCheckIn } from '../doctorService'
import type { Appointment } from '../../../types/appointment'

import { buildS3Url } from '../../../utils/s3Utils'
import { getUnreadNotificationCount } from '../../../services/homeService'
import { listHealthQuestions } from '../../../services/qaService'
import HomeHealthReadsSection from '../../dashboard/components/HomeHealthReadsSection'
import HomeCommunitiesSection from '../../dashboard/components/HomeCommunitiesSection'
import Toast from 'react-native-toast-message'
import { clinicTodayIso, dateLabelOf, isAccepted, isCompletedAppt, isNoShowAppt, isVideoMode, statusLabelOf } from '../scheduleUtils'

function todayIso() {
	return clinicTodayIso() // today in Mumbai (the clinic's clock), not the phone's date
}

export function DoctorHomeScreen() {
	const navigation = useNavigation<any>()
	const { user, clearAuth, selectedHospitalId } = useAuth()
	const [sidebarOpen, setSidebarOpen] = useState(false)

	// The header and the drawer show the signed-in user's photo, which login doesn't carry: one shared fetch per
	// sign-in (see useDoctorAvatarSync), also used by the drawer layout, the profile hub and Personal details.
	useDoctorAvatarSync()

	// This screen has its own dark "ink" header (see DoctorScreenHeader) instead of SidebarLayout's generic
	// AppHeader, so it can't wrap children in <SidebarLayout>; it drives the same AppSidebar drawer directly, with
	// the same backend-driven rows.
	const sidebarSections = useSidebarMenu(sidebarOpen)
	const clearance = useTabBarClearance()

	const [appointments, setAppointments] = useState<Appointment[]>([])
	const [loading, setLoading] = useState(true)
	const [refreshing, setRefreshing] = useState(false)
	const { startingId, start: handleStart } = useStartConsultation()
	const [checkingInId, setCheckingInId] = useState<string | null>(null)

	const [openQuestionsCount, setOpenQuestionsCount] = useState(0)
	const [notificationCount, setNotificationCount] = useState(0)
	const [refreshToken, setRefreshToken] = useState(0)

	const load = useCallback(async (isRefresh = false) => {
		isRefresh ? setRefreshing(true) : setLoading(true)
		try {
			// Today's full list (limit raised from the default 10 -- a busy doctor's day can exceed
			// that) drives the seen/total stat and "Up next".
			// hospital_id is the clinic chosen in the header switcher (null = All clinics).
			const todayRes = await getAppointments({ appointment_date: todayIso(), variant: 'all', limit: 50, ...(selectedHospitalId ? { hospital_id: selectedHospitalId } : {}) })
			// Same rule as DoctorScheduleScreen's day list (see scheduleUtils.isAccepted's
			// doc comment): a still-pending request never shows here, even if dated today -- it stays
			// under booking requests until the doctor accepts it.
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

	// Refetch on every focus, not just mount -- "Up next" depends on check-in state, which the
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

		void loadOpenQuestions()
		void loadNotificationCount()

		return () => {
			active = false
		}
	}, [refreshToken])

	// Checks a patient in from the card: the card flips at once and rolls back if the call fails.
	const handleCheckIn = async (apt: Appointment) => {
		if (checkingInId) return
		const patch = (status: string) => setAppointments((prev) => prev.map((a) => (a.id === apt.id ? { ...a, status } : a)))
		setCheckingInId(apt.id)
		patch('checked_in')
		try {
			const res = await setAppointmentCheckIn(apt.id, true)
			if (!res.success) throw new Error(res.message)
			Toast.show({ type: 'success', text1: res.message ?? 'Patient checked in' })
		} catch {
			patch(typeof apt.status === 'string' ? apt.status : (apt.status?.label ?? 'confirmed'))
			Toast.show({ type: 'error', text1: 'Could not check in the patient. Please try again.' })
		} finally {
			setCheckingInId(null)
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

	// "Up next" is everyone still to be seen today, earliest first (a patient who has not arrived yet is in it too, with a Check in
	// button; one who is checked in gets Start consult). Finished visits and no-shows are not.
	const toGo = appointments.filter((a) => !isCompletedAppt(a) && !isNoShowAppt(a))
	const seenCount = appointments.filter((a) => statusLabelOf(a).toLowerCase() === 'completed').length
	// "Token 06": the visit's place in today's in-clinic queue (video visits have none).
	const clinicQueue = appointments.filter((a) => !isVideoMode(a.appointment_mode))
	const tokenOf = (apt: Appointment) => {
		const i = clinicQueue.findIndex((a) => a.id === apt.id)
		return i < 0 ? undefined : String(i + 1).padStart(2, '0')
	}

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
			>
				<View style={styles.daySummary}>
					<Text style={styles.dayLine}>
						{dateLabelOf(todayIso())}
						{appointments.length > 0 && (
							<Text style={styles.dayCount}>
								{' '}
								· {seenCount} of {appointments.length} patients seen
							</Text>
						)}
					</Text>
					{appointments.length > 0 && (
						<AppProgressBar
							value={(seenCount / appointments.length) * 100}
							height={6}
							trackColor="#FFFFFF2E"
							fillColor={APP_COLORS.mintAccent}
							accessibilityLabel={`${seenCount} of ${appointments.length} patients seen today`}
						/>
					)}
				</View>
			</DoctorScreenHeader>
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
						<View style={{ gap: 10 }}>
							<View style={styles.sectionHeader}>
								<Text style={styles.sectionTitle}>
									Up next
									{toGo.length > 0 && <Text style={styles.sectionCount}> · {toGo.length}</Text>}
								</Text>
								<TouchableOpacity onPress={() => navigation.navigate(ROUTES.MAIN.SCHEDULE)} style={styles.sectionAction}>
									<Text style={styles.sectionActionText}>Full schedule</Text>
									<MaterialCommunityIcons name="chevron-right" size={16} color={APP_COLORS.primary} />
								</TouchableOpacity>
							</View>
							{toGo.length ? (
								<UpNextCarousel
									items={toGo}
									tokenOf={tokenOf}
									startingId={startingId}
									checkingInId={checkingInId}
									onStart={handleStart}
									onCheckIn={handleCheckIn}
									onOpen={openPatientInfo}
									onSeeAll={() => navigation.navigate(ROUTES.MAIN.SCHEDULE)}
								/>
							) : (
								<View style={{ paddingHorizontal: 16 }}>
									<EmptyRow label={appointments.length ? 'All of today’s patients are seen' : 'No appointments today'} />
								</View>
							)}
						</View>

						<Section title="Needs your action">
							<AppSoftCard padding={0} radius={12}>
								<View style={{ paddingHorizontal: 14 }}>
									<ActionRow
										icon="calendar-alert"
										title="Appointment requests"
										sub="Review new booking requests"
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<View style={{ gap: 10 }}>
			<View style={styles.sectionHeader}>
				<Text style={styles.sectionTitle}>{title}</Text>
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
	count?: number
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
			{!!count && count > 0 && (
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
	daySummary: { gap: 8 },
	dayLine: { fontSize: 14, lineHeight: 20, fontWeight: '800', color: '#FFFFFF' },
	dayCount: { color: APP_COLORS.mintAccent },
	sectionHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 8,
		paddingHorizontal: 16,
	},
	sectionTitle: { fontSize: 18, lineHeight: 26, fontWeight: '700', color: APP_COLORS.ink },
	sectionCount: { color: APP_COLORS.inkMuted },
	sectionAction: { flexDirection: 'row', alignItems: 'center', gap: 2, height: 36 },
	sectionActionText: { fontSize: 14, lineHeight: 20, fontWeight: '700', color: APP_COLORS.primary },
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
