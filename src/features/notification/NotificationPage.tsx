// src/features/notification/NotificationPage.tsx
//
// Notifications screen, built to the "Notifications" design (patient and doctor variants share the
// layout; the category set differs by role): ink header with a settings button and an All / Unread
// switch, the list grouped Today / Yesterday / Earlier with "Mark all as read" on the first group,
// critical alerts pinned to the top of their day with an URGENT chip, and a settings sheet (UI only).

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, RefreshControl, SectionList, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NavigationProp } from '@react-navigation/native'

import { AppPathIcon, AppSegmentedControl } from '../../components/common'
import { APP_COLORS } from '../../config/theme'
import { useAuth } from '../../context/AuthContext'
import { DoctorScreenHeader } from '../doctor/dashboard/DoctorScreenHeader'
import NotificationRow from './components/NotificationRow'
import NotificationSettingsSheet from './components/NotificationSettingsSheet'
import { categoriesForRole, OTHER_CATEGORY, resolveCategory } from './notificationCategories'
import { getNotifications, markNotificationRead, type AppNotification } from '../referrals/referralService'
import { markAllNotificationsRead } from '../../services/homeService'
import { ROUTES } from '../../navigation/routes'
import type { AppStackParamList } from '../../navigation/types'

const BELL = OTHER_CATEGORY.icon
const SLIDERS = 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M16 4v4M10 10v4M18 16v4'
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const GROUP_LABELS = ['Today', 'Yesterday', 'Earlier'] as const

const QUIET_HOURS_NOTE: Record<'doctor' | 'patient', string> = {
	doctor: 'Critical lab values and red-flag questions still come through.',
	patient: 'Critical alerts, medicine reminders and visit updates still come through.',
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()

/** 0 = today, 1 = yesterday, 2 = anything older (or unparseable). */
function groupIndexOf(iso: string, now: Date): number {
	const t = new Date(iso)
	if (Number.isNaN(t.getTime())) return 2
	const days = Math.round((startOfDay(now) - startOfDay(t)) / 86_400_000)
	return days <= 0 ? 0 : days === 1 ? 1 : 2
}

function timeLabelOf(iso: string, group: number): string {
	const t = new Date(iso)
	if (Number.isNaN(t.getTime())) return ''
	if (group === 2) return `${t.getDate()} ${MON[t.getMonth()]}`
	const h = t.getHours()
	return `${h % 12 || 12}:${String(t.getMinutes()).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}

export default function NotificationPage() {
	const navigation = useNavigation<NavigationProp<AppStackParamList>>()
	const { role } = useAuth()
	const isDoctor = role === 'doctor'
	const categories = useMemo(() => categoriesForRole(role), [role])

	const [notifications, setNotifications] = useState<AppNotification[]>([])
	const [loading, setLoading] = useState(true)
	const [refreshing, setRefreshing] = useState(false)
	const [tab, setTab] = useState<'all' | 'unread'>('all')
	const [settingsOpen, setSettingsOpen] = useState(false)

	const load = useCallback(async () => {
		try {
			setNotifications(await getNotifications())
		} catch (error) {
			console.log('[NotificationPage] failed to load notifications', error)
		} finally {
			setLoading(false)
			setRefreshing(false)
		}
	}, [])

	useEffect(() => {
		load()
	}, [load])

	const live = notifications
	const unreadCount = live.filter((n) => !n.is_read).length

	const sections = useMemo(() => {
		const now = new Date()
		const shown = live.filter((n) => tab === 'all' || !n.is_read)
		const groups = GROUP_LABELS.map((title, gi) => ({
			title,
			data: shown
				.filter((n) => groupIndexOf(n.created_at, now) === gi)
				// Unread critical alerts first, then newest first.
				.sort((a, b) => {
					const ca = a.is_critical && !a.is_read ? 1 : 0
					const cb = b.is_critical && !b.is_read ? 1 : 0
					return cb - ca || new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
				})
				.map((n) => ({ n, time: timeLabelOf(n.created_at, gi) })),
		}))
		return groups.filter((g) => g.data.length > 0)
	}, [live, tab])

	const handleMarkAll = async () => {
		setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
		try {
			await markAllNotificationsRead()
		} catch (error) {
			console.log('[NotificationPage] failed to mark all read', error)
			load()
		}
	}

	const handlePress = async (notification: AppNotification) => {
		setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n)))
		try {
			await markNotificationRead(notification.id)
		} catch (error) {
			console.log('[NotificationPage] failed to mark notification read', error)
		}

		// Navigate based on redirect_type/redirect_id set by the backend
		const nav = navigation as NavigationProp<any>
		if (notification.redirect_type === 'doctor_availability' && notification.redirect_id) {
			const referralId = notification.reference_type === 'referral' ? notification.reference_id ?? undefined : undefined
			navigation.navigate(ROUTES.STACK.DOCTOR_DETAIL, { id: notification.redirect_id, referralId })
		} else if (
			(notification.redirect_type === 'appointment' || notification.redirect_type === 'appointment_detail') &&
			notification.redirect_id
		) {
			navigation.navigate(ROUTES.STACK.APPOINTMENTS, { appointmentId: notification.redirect_id })
		} else if (
			(notification.redirect_type === 'ancillary_booking' || notification.redirect_type === 'ancillary') &&
			notification.redirect_id
		) {
			navigation.navigate(ROUTES.STACK.ANCILLARY_TRACK_APPOINTMENT, { bookingId: notification.redirect_id })
		} else if (notification.redirect_type === 'lab_order' && notification.redirect_id) {
			navigation.navigate(ROUTES.STACK.LABORATORY_BOOKING_TRACKING, { orderId: notification.redirect_id })
		} else if (notification.redirect_type === 'doctor_schedule') {
			// This screen lives in the root stack, so reach the tab through its navigator (see SidebarLayout).
			nav.navigate(ROUTES.MAIN.TABS, {
				screen: ROUTES.MAIN.SCHEDULE,
				params: { segment: notification.redirect_id === 'req' ? 'req' : 'today' },
			})
		} else if (notification.redirect_type === 'doctor_engage') {
			nav.navigate(ROUTES.MAIN.TABS, { screen: ROUTES.MAIN.ENGAGE })
		}
	}

	return (
		<View style={styles.screen}>
			<DoctorScreenHeader
				variant="simple"
				title="Notifications"
				onBack={() => navigation.goBack()}
				rightAccessory={
					<TouchableOpacity
						onPress={() => setSettingsOpen(true)}
						accessibilityRole="button"
						accessibilityLabel="Notification settings"
						style={styles.settingsBtn}
					>
						<AppPathIcon d={SLIDERS} size={20} strokeWidth={2.2} color="#FFFFFF" />
					</TouchableOpacity>
				}
			>
				<AppSegmentedControl
					shape="rounded"
					tabs
					onDark
					accessibilityLabel="Show"
					options={[
						{ value: 'all', label: 'All' },
						{ value: 'unread', label: 'Unread', count: unreadCount },
					]}
					value={tab}
					onChange={(v) => setTab(v as 'all' | 'unread')}
					style={{ backgroundColor: '#FFFFFF1F', borderWidth: 0 }}
				/>
			</DoctorScreenHeader>

			{loading ? (
				<ActivityIndicator style={{ marginTop: 40 }} color={APP_COLORS.primary} />
			) : (
				<SectionList
					sections={sections}
					keyExtractor={(item) => item.n.id}
					stickySectionHeadersEnabled={false}
					contentContainerStyle={styles.listContent}
					showsVerticalScrollIndicator={false}
					refreshControl={
						<RefreshControl
							refreshing={refreshing}
							onRefresh={() => {
								setRefreshing(true)
								load()
							}}
							colors={[APP_COLORS.primary]}
						/>
					}
					renderSectionHeader={({ section }) => (
						<View style={styles.groupHeader}>
							<Text style={styles.groupTitle} accessibilityRole="header">
								{section.title}
							</Text>
							{section.title === sections[0]?.title && unreadCount > 0 && (
								<TouchableOpacity onPress={handleMarkAll} hitSlop={8}>
									<Text style={styles.markAll}>Mark all as read</Text>
								</TouchableOpacity>
							)}
						</View>
					)}
					renderItem={({ item, index, section }) => (
						<NotificationRow
							category={resolveCategory(item.n.type, role)}
							title={item.n.title}
							body={item.n.message}
							time={item.time}
							unread={!item.n.is_read}
							critical={!!item.n.is_critical}
							divider={index < section.data.length - 1}
							onPress={() => handlePress(item.n)}
						/>
					)}
					ListEmptyComponent={
						<View style={styles.empty}>
							<View style={styles.emptyIcon}>
								<AppPathIcon d={BELL} size={28} strokeWidth={2} color={APP_COLORS.primary} />
							</View>
							<Text style={styles.emptyTitle}>You’re all caught up</Text>
							<Text style={styles.emptySub}>New updates will show up here.</Text>
						</View>
					}
				/>
			)}

			<NotificationSettingsSheet
				visible={settingsOpen}
				onClose={() => setSettingsOpen(false)}
				categories={categories}
				quietHoursNote={QUIET_HOURS_NOTE[isDoctor ? 'doctor' : 'patient']}
			/>
		</View>
	)
}

const styles = StyleSheet.create({
	screen: { flex: 1, backgroundColor: '#FFFFFF' },
	settingsBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#FFFFFF1F', alignItems: 'center', justifyContent: 'center' },
	listContent: { paddingTop: 4, paddingBottom: 32, flexGrow: 1 },
	groupHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4, backgroundColor: '#FFFFFF' },
	groupTitle: { fontSize: 14, lineHeight: 20, fontWeight: '800', color: APP_COLORS.ink },
	markAll: { fontSize: 13, lineHeight: 18, fontWeight: '700', color: APP_COLORS.primary },
	empty: { paddingVertical: 72, paddingHorizontal: 32, alignItems: 'center', gap: 8 },
	emptyIcon: { width: 64, height: 64, borderRadius: 9999, backgroundColor: APP_COLORS.mint, alignItems: 'center', justifyContent: 'center' },
	emptyTitle: { marginTop: 4, fontSize: 17, lineHeight: 24, fontWeight: '800', color: APP_COLORS.ink },
	emptySub: { fontSize: 14, lineHeight: 20, color: APP_COLORS.inkMuted, textAlign: 'center' },
})
