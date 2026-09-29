// src/features/ancillary/staff/today/ProviderTodayContent.tsx
//
// Provider "Today" (ancillary-provider design, screen 1) rendered inside DashboardPage's scroll view for the
// ancillary role: stats, new booking requests (banner -> BookingRequestSheet -> accept / decline), the next
// visit card, today's schedule timeline and what's coming up. Data: GET /provider/me/today, re-read on
// focus, on pull-to-refresh (refreshToken), every minute while focused, and after every action.
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import Toast from 'react-native-toast-message'
import {
	AppInfoBanner,
	AppScheduleTimeline,
	AppStatRow,
	AppStatTile,
	AppTextLink,
	type AppScheduleTimelineItem,
} from '../../../../components/common'
import { APP_COLORS } from '../../../../config/theme'
import { ROUTES } from '../../../../navigation/routes'
import { relativeDayLabel } from '../../../../utils/date'
import { formatTimeSlot } from '../../../../utils/formatters'
import { acceptScheduledOrder, declineScheduledOrder } from '../../ancillaryProviderBookingService'
import { extractApiErrorMessage } from '../../ancillaryService'
import {
	getProviderToday,
	type ProviderPendingRequest,
	type ProviderToday,
	type ProviderVisitSummary,
} from '../../providerVisitService'
import { DeclineOrderSheet } from '../components/DeclineOrderSheet'
import { BookingRequestSheet } from './BookingRequestSheet'
import { ProviderNextVisitCard } from './ProviderNextVisitCard'
import {
	isFinishedVisit,
	replyInLabel,
	scheduleStatus,
	visitStart,
	visitSubtitle,
	visitTitle,
	visitsWord,
} from './todayView'

const REFRESH_MS = 60_000

export type ProviderTodayContentProps = {
	/** Bumped by the page's pull-to-refresh. */
	refreshToken?: number
	/** Called once a refresh-triggered load finishes (stops the page's spinner). */
	onRefreshComplete?: () => void
}

export function ProviderTodayContent({ refreshToken = 0, onRefreshComplete }: ProviderTodayContentProps) {
	const navigation = useNavigation<any>()
	const [data, setData] = useState<ProviderToday | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [nowMs, setNowMs] = useState(() => Date.now())
	const [sheetRequest, setSheetRequest] = useState<ProviderPendingRequest | null>(null)
	const [acceptingId, setAcceptingId] = useState<string | null>(null)
	const [declineTarget, setDeclineTarget] = useState<ProviderPendingRequest | null>(null)
	const [declining, setDeclining] = useState(false)
	const [focused, setFocused] = useState(false)
	const requestSeq = useRef(0)

	const load = useCallback(async () => {
		const seq = ++requestSeq.current
		try {
			const today = await getProviderToday()
			if (seq !== requestSeq.current) return
			setData(today)
			setError(null)
		} catch (e) {
			if (seq !== requestSeq.current) return
			setError(extractApiErrorMessage(e, 'Could not load your day.'))
		} finally {
			if (seq === requestSeq.current) {
				setLoading(false)
				setNowMs(Date.now())
			}
		}
	}, [])

	useFocusEffect(
		useCallback(() => {
			setFocused(true)
			void load()
			return () => setFocused(false)
		}, [load])
	)

	// Pull-to-refresh from the page.
	const firstToken = useRef(refreshToken)
	useEffect(() => {
		if (refreshToken === firstToken.current) return
		const run = async () => {
			await load()
			onRefreshComplete?.()
		}
		void run()
	}, [refreshToken, load, onRefreshComplete])

	// New booking requests have no push channel here: re-read every minute while the screen is visible.
	useEffect(() => {
		if (!focused) return
		const t = setInterval(() => void load(), REFRESH_MS)
		return () => clearInterval(t)
	}, [focused, load])

	// Countdown tick while a request is waiting for a reply; re-read once one runs out.
	const pending = data?.pending_requests ?? []
	const hasPending = pending.length > 0
	useEffect(() => {
		if (!focused || !hasPending) return
		const t = setInterval(() => setNowMs(Date.now()), 1000)
		return () => clearInterval(t)
	}, [focused, hasPending])

	const expiredSeen = useRef<Set<string>>(new Set())
	useEffect(() => {
		const expired = pending.filter(
			(r) => r.expires_at && !replyInLabel(r.expires_at, nowMs) && !expiredSeen.current.has(r.request_public_id)
		)
		if (expired.length === 0) return
		expired.forEach((r) => expiredSeen.current.add(r.request_public_id))
		void load()
	}, [pending, nowMs, load])

	// Keep an open sheet in sync with the latest data (it closes if the request is gone).
	useEffect(() => {
		if (!sheetRequest || acceptingId) return
		const fresh = pending.find((r) => r.request_public_id === sheetRequest.request_public_id)
		if (!fresh) setSheetRequest(null)
		else if (fresh !== sheetRequest) setSheetRequest(fresh)
	}, [pending, sheetRequest, acceptingId])

	/** A visit in progress opens straight into the in-progress screen; anything else shows its details. */
	const openVisit = (visit: ProviderVisitSummary) => {
		navigation.navigate(
			visit.status === 'IN_PROGRESS'
				? ROUTES.STACK.PROVIDER_VISIT_IN_PROGRESS
				: ROUTES.STACK.PROVIDER_VISIT_DETAILS,
			{ visitId: visit.visit_public_id }
		)
	}

	const handleAccept = async (request: ProviderPendingRequest) => {
		if (acceptingId) return
		setAcceptingId(request.request_public_id)
		try {
			await acceptScheduledOrder(request.request_public_id)
			setSheetRequest(null)
			const n = request.totals.visits_count
			Toast.show({
				type: 'success',
				text1: 'Booking accepted',
				text2:
					n > 1
						? `All ${n} visits with ${request.patient.name ?? 'the patient'} are confirmed.`
						: `Your visit with ${request.patient.name ?? 'the patient'} is confirmed.`,
			})
		} catch (e) {
			Toast.show({
				type: 'error',
				text1: 'Could not accept booking',
				text2: extractApiErrorMessage(e, 'This request may have expired. Please try again.'),
			})
		} finally {
			setAcceptingId(null)
			void load()
		}
	}

	const handleDecline = (request: ProviderPendingRequest) => {
		setSheetRequest(null)
		setDeclineTarget(request)
	}

	const confirmDecline = async (reason: string) => {
		if (!declineTarget || declining) return
		const target = declineTarget
		setDeclining(true)
		try {
			await declineScheduledOrder(target.request_public_id, reason)
			setDeclineTarget(null)
			Toast.show({
				type: 'success',
				text1: 'Booking declined',
				text2: `${target.patient.name ?? 'The patient'} has been notified.`,
			})
		} catch (e) {
			Toast.show({
				type: 'error',
				text1: 'Could not decline booking',
				text2: extractApiErrorMessage(e, 'Please try again.'),
			})
		} finally {
			setDeclining(false)
			void load()
		}
	}

	if (loading && !data) {
		return (
			<View style={styles.loadingBox}>
				<ActivityIndicator color={APP_COLORS.primary} />
			</View>
		)
	}

	const stats = data?.stats
	const nextId = data?.next_visit?.visit_public_id

	const scheduleItems: AppScheduleTimelineItem[] = (data?.schedule ?? []).map((v) => {
		const finished = isFinishedVisit(v.status)
		const isNext = v.visit_public_id === nextId
		return {
			key: v.visit_public_id,
			time: formatTimeSlot(v.start_time),
			title: visitTitle(v),
			subtitle: visitSubtitle(v),
			status: scheduleStatus(v, isNext),
			dot: finished ? 'done' : isNext ? 'current' : 'upcoming',
			dimmed: finished,
			onPress: () => openVisit(v),
		}
	})

	const upcomingItems: AppScheduleTimelineItem[] = (data?.upcoming ?? []).map((v) => {
		const start = visitStart(v)
		return {
			key: v.visit_public_id,
			time: `${start ? relativeDayLabel(start) : ''}\n${formatTimeSlot(v.start_time)}`,
			title: visitTitle(v),
			subtitle: visitSubtitle(v),
			status: scheduleStatus(v, false),
			dot: 'upcoming',
			onPress: () => openVisit(v),
		}
	})

	return (
		<View style={styles.root}>
			{error ? (
				<View style={styles.padded}>
					<AppInfoBanner
						tone="danger"
						title="Couldn't load your day"
						subtitle={error}
						action={{ label: 'Retry', onPress: () => void load() }}
					/>
				</View>
			) : null}

			{stats ? (
				<AppStatRow style={styles.padded}>
					<AppStatTile
						label="Visits today"
						value={`${stats.visits_done} of ${stats.visits_total}`}
						backgroundColor={APP_COLORS.surface}
						labelColor={APP_COLORS.inkMuted}
						style={styles.statTile}
						valueStyle={styles.statValue}
					/>
					<AppStatTile
						label="New requests"
						value={stats.pending_requests}
						backgroundColor={APP_COLORS.surface}
						labelColor={APP_COLORS.inkMuted}
						style={styles.statTile}
						valueStyle={styles.statValue}
					/>
					<AppStatTile
						label="Coming up"
						value={data?.upcoming.length ?? 0}
						backgroundColor={APP_COLORS.surface}
						labelColor={APP_COLORS.inkMuted}
						style={styles.statTile}
						valueStyle={styles.statValue}
					/>
				</AppStatRow>
			) : null}

			{pending.map((r) => {
				const replyIn = replyInLabel(r.expires_at, nowMs)
				return (
					<View key={r.request_public_id} style={styles.padded}>
						<AppInfoBanner
							tone="sky"
							icon="calendar-plus"
							title={r.patient.name ? `New booking from ${r.patient.name}` : 'New booking request'}
							subtitle={[
								visitsWord(r.totals.visits_count),
								replyIn ? `reply in ${replyIn}` : 'expired',
							].join(' · ')}
							onPress={() => setSheetRequest(r)}
							chevron
						/>
					</View>
				)
			})}

			{data?.next_visit ? (
				<View style={styles.padded}>
					<ProviderNextVisitCard visit={data.next_visit} onOpen={openVisit} />
				</View>
			) : null}

			{data ? (
				<View style={styles.section}>
					<View style={styles.sectionHeader}>
						<Text style={styles.sectionTitle} accessibilityRole="header">
							Today’s schedule
						</Text>
						<AppTextLink
							label="All bookings"
							size="sm"
							onPress={() => navigation.navigate(ROUTES.MAIN.TABS, { screen: ROUTES.MAIN.PORTAL })}
						/>
					</View>
					{scheduleItems.length > 0 ? (
						<AppScheduleTimeline items={scheduleItems} />
					) : (
						<Text style={styles.empty}>No visits scheduled for today.</Text>
					)}
				</View>
			) : null}

			{upcomingItems.length > 0 ? (
				<View style={styles.section}>
					<Text style={styles.sectionTitle} accessibilityRole="header">
						Coming up
					</Text>
					<AppScheduleTimeline items={upcomingItems} />
				</View>
			) : null}

			<BookingRequestSheet
				request={sheetRequest}
				nowMs={nowMs}
				accepting={!!acceptingId}
				onClose={() => setSheetRequest(null)}
				onAccept={(r) => void handleAccept(r)}
				onDecline={handleDecline}
			/>

			<DeclineOrderSheet
				visible={!!declineTarget}
				patientName={declineTarget?.patient.name ?? undefined}
				visitsCount={declineTarget?.totals.visits_count || 1}
				submitting={declining}
				onClose={() => {
					if (!declining) setDeclineTarget(null)
				}}
				onConfirm={(reason) => void confirmDecline(reason)}
			/>
		</View>
	)
}

const styles = StyleSheet.create({
	root: {
		gap: 8,
		paddingTop: 8,
	},
	padded: {
		paddingHorizontal: 16,
	},
	loadingBox: {
		paddingVertical: 48,
		alignItems: 'center',
	},
	statTile: {
		borderRadius: 12,
		borderWidth: 1,
		borderColor: APP_COLORS.divider,
	},
	statValue: {
		fontSize: 16,
		lineHeight: 22,
	},
	section: {
		backgroundColor: APP_COLORS.surface,
		padding: 16,
		gap: 10,
	},
	sectionHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 8,
	},
	sectionTitle: {
		fontSize: 16,
		lineHeight: 22,
		fontWeight: '800',
		color: APP_COLORS.ink,
	},
	empty: {
		fontSize: 13,
		lineHeight: 18,
		color: APP_COLORS.inkMuted,
	},
})

export default ProviderTodayContent
