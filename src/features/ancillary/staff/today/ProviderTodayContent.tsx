// src/features/ancillary/staff/today/ProviderTodayContent.tsx
//
// Provider "Today" (ancillary-provider design, screen 1) rendered inside DashboardPage's scroll view for the
// ancillary role: stats, new booking requests (banner -> BookingRequestSheet -> accept / decline), open offers
// pushed on the dispatch WebSocket (instant requests ring for 30 s in IncomingOfferSheet; per-visit offers of
// provider-less orders show as banners, with an optional tip) and the next visit card. Stats: visits today,
// earned today (dashboard metrics) and rating ("—": no ancillary ratings yet). Wording follows the provider's speciality (visit / session / shift). Data: GET
// /provider/me/today, re-read on focus, on pull-to-refresh (refreshToken), every minute while focused, and
// after every action. Offers are never polled: the socket pushes them (also the pending ones on connect).
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import Toast from 'react-native-toast-message'
import { AppInfoBanner, AppStatRow, AppStatTile } from '../../../../components/common'
import { APP_COLORS, formatInr } from '../../../../config/theme'
import { ROUTES } from '../../../../navigation/routes'
import { acceptScheduledOrder, declineScheduledOrder } from '../../ancillaryProviderBookingService'
import { acceptCareRequestBackend, extractApiErrorMessage } from '../../ancillaryService'
import {
	getProviderToday,
	getTodayEarnings,
	rejectOffer,
	type ProviderOffer,
	type ProviderPendingRequest,
	type ProviderToday,
	type ProviderVisitSummary,
} from '../../providerVisitService'
import { DeclineOrderSheet } from '../components/DeclineOrderSheet'
import { getProviderSpecialityCopy } from '../providerSpecialityCopy'
import { ProviderAvailabilityCard } from './ProviderAvailabilityCard'
import { useProviderDispatchSocket } from './useProviderDispatchSocket'
import { useProviderOnline } from './useProviderOnline'
import { BookingRequestSheet } from './BookingRequestSheet'
import { IncomingOfferSheet, type OfferPhase } from './IncomingOfferSheet'
import { ProviderNextVisitCard } from './ProviderNextVisitCard'
import { isInstantOffer, isProviderWork, offerCollect, replyInLabel, shortDay, tipLabel, visitsWord } from './todayView'

const REFRESH_MS = 60_000
/** Seconds an instant request is held for this provider before it counts as missed. */
const INSTANT_WINDOW_S = 30

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
	const [earnedToday, setEarnedToday] = useState<number | null>(null)
	const [offers, setOffers] = useState<ProviderOffer[]>([])
	const [sheetOffer, setSheetOffer] = useState<ProviderOffer | null>(null)
	const [offerPhase, setOfferPhase] = useState<OfferPhase>('open')
	const [offerBusy, setOfferBusy] = useState(false)
	const requestSeq = useRef(0)
	const sheetOfferRef = useRef<ProviderOffer | null>(null)
	sheetOfferRef.current = sheetOffer
	const offerSeenAt = useRef<Record<string, number>>({})
	const offerAutoOpened = useRef<Set<string>>(new Set())
	const offerGone = useRef<Set<string>>(new Set())

	const load = useCallback(async (): Promise<ProviderToday | null> => {
		const seq = ++requestSeq.current
		const loadEarnings = async () => {
			try {
				setEarnedToday(await getTodayEarnings())
			} catch {
				setEarnedToday(null)
			}
		}
		void loadEarnings()
		try {
			const today = await getProviderToday()
			if (seq !== requestSeq.current) return null
			setData(today)
			setError(null)
			return today
		} catch (e) {
			if (seq !== requestSeq.current) return null
			setError(extractApiErrorMessage(e, 'Could not load your day.'))
			return null
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

	// Online switch: going online sends the location (the backend only pushes offers to online providers with
	// a location); going offline drops every open offer.
	const availability = useProviderOnline({
		onWentOffline: () => {
			setOffers([])
			setSheetOffer(null)
			setOfferPhase('open')
		},
	})

	// Offers arrive on the dispatch socket (open only while online, focused and in the foreground).
	useProviderDispatchSocket({
		enabled: focused && availability.online === true,
		onOffer: (offer) => {
			// Same request id again (tip changed, reconnect re-push) updates in place; the 30 s window is kept.
			if (!offerSeenAt.current[offer.requestId]) offerSeenAt.current[offer.requestId] = Date.now()
			setNowMs(Date.now())
			setOffers((prev) =>
				prev.some((o) => o.requestId === offer.requestId)
					? prev.map((o) => (o.requestId === offer.requestId ? offer : o))
					: [...prev, offer]
			)
			setSheetOffer((cur) => (cur?.requestId === offer.requestId ? offer : cur))
		},
		onOfferGone: ({ requestId, visitPublicId, reason }) => {
			// Already accepted / declined by this provider: nothing to withdraw.
			if (offerGone.current.has(requestId)) return
			const matches = (o: ProviderOffer) =>
				o.requestId === requestId && (!visitPublicId || !o.visitPublicId || o.visitPublicId === visitPublicId)
			offerGone.current.add(visitPublicId ?? requestId)
			setOffers((prev) => prev.filter((o) => !matches(o)))
			// An open sheet for it ends as "Taken by another provider" / "Request missed", then is dismissed normally.
			const open = sheetOfferRef.current
			if (open && matches(open)) setOfferPhase(reason === 'ACCEPTED_BY_OTHER' ? 'taken' : 'missed')
		},
		onOrdersChanged: () => void load(),
	})

	const copy = getProviderSpecialityCopy(data?.provider.specialty)

	// Countdown tick while a request is waiting for a reply; re-read once one runs out.
	const pending = data?.pending_requests ?? []
	const hasPending = pending.length > 0
	const hasInstant = offers.some(isInstantOffer)
	useEffect(() => {
		if (!focused || (!hasPending && !hasInstant)) return
		const t = setInterval(() => setNowMs(Date.now()), 1000)
		return () => clearInterval(t)
	}, [focused, hasPending, hasInstant])

	/** Seconds left for an instant offer (counted from when this device first saw it). */
	const offerSecondsLeft = (o: ProviderOffer) =>
		isInstantOffer(o)
			? Math.max(0, INSTANT_WINDOW_S - Math.floor((nowMs - (offerSeenAt.current[o.requestId] ?? nowMs)) / 1000))
			: null
	const liveOffers = offers.filter(
		(o) =>
			!offerGone.current.has(o.requestId) &&
			!(o.visitPublicId && offerGone.current.has(o.visitPublicId)) &&
			offerSecondsLeft(o) !== 0
	)

	// An instant request rings once: its sheet opens by itself when there is nothing else on screen.
	useEffect(() => {
		if (sheetOffer || sheetRequest || declineTarget) return
		const next = liveOffers.find((o) => isInstantOffer(o) && !offerAutoOpened.current.has(o.requestId))
		if (!next) return
		offerAutoOpened.current.add(next.requestId)
		setOfferPhase('open')
		setSheetOffer(next)
	})

	// The open instant sheet turns into "Request missed" when the window runs out.
	const sheetSecs = sheetOffer ? offerSecondsLeft(sheetOffer) : null
	const phase: OfferPhase = offerPhase === 'open' && sheetSecs === 0 ? 'missed' : offerPhase

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

	const closeOfferSheet = () => {
		setSheetOffer(null)
		setOfferPhase('open')
	}

	const handleAcceptOffer = async (offer: ProviderOffer) => {
		if (offerBusy) return
		setOfferBusy(true)
		try {
			const res = await acceptCareRequestBackend(offer.requestId)
			if (res.success) {
				offerGone.current.add(offer.requestId)
				closeOfferSheet()
				Toast.show({
					type: 'success',
					text1: 'Request accepted',
					text2: `Your ${copy.noun}${offer.patientName ? ` with ${offer.patientName}` : ''} is confirmed.`,
				})
				const today = await load()
				const all = today ? [...today.schedule, ...today.upcoming] : []
				const visitId =
					offer.visitPublicId ??
					all.find((v) => v.request_public_id === offer.requestId && v.status !== 'COMPLETED')
						?.visit_public_id
				if (visitId) navigation.navigate(ROUTES.STACK.PROVIDER_VISIT_DETAILS, { visitId })
			} else if (res.alreadyClaimed) {
				offerGone.current.add(offer.requestId)
				setOfferPhase('taken')
				void load()
			} else {
				Toast.show({
					type: 'error',
					text1: 'Could not accept request',
					text2: res.message ?? 'Please try again.',
				})
			}
		} finally {
			setOfferBusy(false)
		}
	}

	const handleDeclineOffer = async (offer: ProviderOffer) => {
		if (offerBusy) return
		setOfferBusy(true)
		try {
			await rejectOffer(offer.requestId)
			offerGone.current.add(offer.requestId)
			closeOfferSheet()
			Toast.show({ type: 'success', text1: 'Request declined' })
		} catch (e) {
			Toast.show({
				type: 'error',
				text1: 'Could not decline request',
				text2: extractApiErrorMessage(e, 'Please try again.'),
			})
		} finally {
			setOfferBusy(false)
			void load()
		}
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
						? `All ${n} ${copy.noun}s with ${request.patient.name ?? 'the patient'} are confirmed.`
						: `Your ${copy.noun} with ${request.patient.name ?? 'the patient'} is confirmed.`,
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
	// A visit nobody took (UNASSIGNED) is not this provider's work: never shown.
	const nextVisit = data?.next_visit && isProviderWork(data.next_visit.status) ? data.next_visit : null

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

			<View style={styles.padded}>
				<ProviderAvailabilityCard
					online={availability.online === true}
					busy={availability.busy || availability.online === null}
					noun={copy.noun}
					onChange={(v) => void availability.setOnline(v)}
				/>
			</View>

			{stats ? (
				<AppStatRow style={styles.padded}>
					<AppStatTile
						label={copy.today.statLabel}
						value={`${stats.visits_done} of ${stats.visits_total}`}
						backgroundColor={APP_COLORS.surface}
						labelColor={APP_COLORS.inkMuted}
						style={styles.statTile}
						valueStyle={styles.statValue}
					/>
					<AppStatTile
						label="Earned today"
						value={earnedToday == null ? '—' : formatInr(earnedToday)}
						backgroundColor={APP_COLORS.surface}
						labelColor={APP_COLORS.inkMuted}
						style={styles.statTile}
						valueStyle={styles.statValue}
					/>
					<AppStatTile
						label="Rating"
						value="—"
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
								visitsWord(r.totals.visits_count, copy.noun),
								replyIn ? `reply in ${replyIn}` : 'expired',
							].join(' · ')}
							onPress={() => setSheetRequest(r)}
							chevron
						/>
					</View>
				)
			})}

			{liveOffers.map((o) => {
				const secs = offerSecondsLeft(o)
				const instant = isInstantOffer(o)
				return (
					<View key={o.requestId} style={styles.padded}>
						<AppInfoBanner
							tone="sky"
							icon={instant ? 'flash' : 'calendar-plus'}
							title={
								instant
									? `Instant request${o.patientName ? ` from ${o.patientName}` : ''}`
									: `New ${copy.noun} request${o.patientName ? ` from ${o.patientName}` : ''}`
							}
							subtitle={[
								o.serviceName,
								o.scheduledDate ? shortDay(o.scheduledDate) : null,
								instant && secs != null ? `reply in ${secs} sec` : null,
								formatInr(offerCollect(o)),
								tipLabel(o.tipAmount),
							]
								.filter(Boolean)
								.join(' · ')}
							onPress={() => {
								setOfferPhase('open')
								setSheetOffer(o)
							}}
							chevron
						/>
					</View>
				)
			})}

			{nextVisit ? (
				<View style={styles.padded}>
					<ProviderNextVisitCard visit={nextVisit} copy={copy} onOpen={openVisit} />
				</View>
			) : null}

			<IncomingOfferSheet
				offer={sheetOffer}
				copy={copy}
				phase={phase}
				secondsLeft={sheetSecs}
				busy={offerBusy}
				onAccept={(o) => void handleAcceptOffer(o)}
				onDecline={(o) => void handleDeclineOffer(o)}
				onClose={closeOfferSheet}
			/>

			<BookingRequestSheet
				request={sheetRequest}
				copy={copy}
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
})

export default ProviderTodayContent
