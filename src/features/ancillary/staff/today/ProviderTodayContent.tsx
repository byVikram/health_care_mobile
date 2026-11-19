// src/features/ancillary/staff/today/ProviderTodayContent.tsx
//
// Provider "Today" (ancillary-provider design, screen 1) rendered inside ProviderTodayScreen's scroll view for the
// ancillary role: stats, open offers
// pushed on the dispatch WebSocket (instant requests ring for 30 s in IncomingOfferSheet; per-visit offers of
// provider-less orders show as banners, with an optional tip) and the next visit card. Stats: visits today,
// earned today (dashboard metrics) and rating (average of approved reviews, "—" until there is one). Wording follows the provider's speciality (visit / session / shift). Data: GET
// /provider/me/today, re-read on focus, on pull-to-refresh (refreshToken), every minute while focused, and
// after every action. Offers are never polled: the socket pushes them (also the pending ones on connect).
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, Vibration, View } from 'react-native'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import Toast from 'react-native-toast-message'
import { AppInfoBanner } from '../../../../components/common'
import { APP_COLORS, formatInr } from '../../../../config/theme'
import { ROUTES } from '../../../../navigation/routes'
import { acceptCareRequestBackend, extractApiErrorMessage } from '../../ancillaryService'
import {
	getProviderToday,
	getTodayEarnings,
	rejectOffer,
	type ProviderOffer,
	type ProviderToday,
	type ProviderVisitSummary,
} from '../../providerVisitService'
import { dismissOfferNotification } from '../../../../services/offerNotification'
import { getProviderSpecialityCopy } from '../providerSpecialityCopy'
import { ProviderAvailabilityCard } from './ProviderAvailabilityCard'
import { useProviderDispatchSocket } from './useProviderDispatchSocket'
import { useProviderOnline } from './useProviderOnline'
import { useOverlayPermission } from './useOverlayPermission'
import { IncomingOfferSheet, type OfferPhase } from './IncomingOfferSheet'
import { ProviderNextVisitCard } from './ProviderNextVisitCard'
import { ProviderScheduleTimeline } from './ProviderScheduleTimeline'
import { getProviderAverageRating, ratingLabel } from './providerRating'
import { isInstantOffer, isProviderWork, offerCollect, shortDay, tipLabel } from './todayView'
import { showStatusModal } from '../../../../services/apiService'

const REFRESH_MS = 60_000
/** The buzz when an instant request opens its sheet in the open app (the closed app's notification buzzes on its own channel). */
const OFFER_VIBRATION = [0, 700, 400, 700, 400, 700]
/** Seconds an instant request is held for this provider before it counts as missed. */
const INSTANT_WINDOW_S = 30

export type ProviderTodayContentProps = {
	/** Bumped by the page's pull-to-refresh. */
	refreshToken?: number
	/** Called once a refresh-triggered load finishes (stops the page's spinner). */
	onRefreshComplete?: () => void
}

function StatTile({ label, value }: { label: string; value: string }) {
	return (
		<View style={styles.statTile} accessible accessibilityLabel={`${label}: ${value}`}>
			<Text style={styles.statLabel} numberOfLines={1}>
				{label}
			</Text>
			<Text style={styles.statValue} numberOfLines={1}>
				{value}
			</Text>
		</View>
	)
}

export function ProviderTodayContent({ refreshToken = 0, onRefreshComplete }: ProviderTodayContentProps) {
	const navigation = useNavigation<any>()
	const [data, setData] = useState<ProviderToday | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [nowMs, setNowMs] = useState(() => Date.now())
	const [focused, setFocused] = useState(false)
	const [earnedToday, setEarnedToday] = useState<number | null>(null)
	const [rating, setRating] = useState<number | null>(null)
	const ratingFor = useRef<string | null>(null)
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
			// Rating belongs to the provider, not the day: read once per provider.
			const providerId = today.provider.provider_public_id
			if (providerId && ratingFor.current !== providerId) {
				ratingFor.current = providerId
				const loadRating = async () => {
					try {
						setRating(await getProviderAverageRating(providerId))
					} catch {
						ratingFor.current = null
					}
				}
				void loadRating()
			}
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

	// Keep the next visit and the day's schedule fresh: re-read every minute while the screen is visible.
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

	// A new request over other apps needs "Display over other apps": a prompt shows until it is allowed.
	const overlay = useOverlayPermission()

	// Offers arrive on the dispatch socket (open only while online, focused and in the foreground).
	useProviderDispatchSocket({
		enabled: focused && availability.online === true,
		onOffer: (offer) => {
			// A deliberate re-offer (the patient searched again, or raised the tip after this provider declined) is a NEW offer: what was
			// remembered about the earlier one (answered, run out, already opened) is forgotten, so it rings and counts down again.
			if (offer.reoffer) {
				offerGone.current.delete(offer.requestId)
				delete offerSeenAt.current[offer.requestId]
				offerAutoOpened.current.delete(offer.requestId)
				setOfferPhase((p) => (sheetOfferRef.current?.requestId === offer.requestId ? 'open' : p))
			}
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
			void dismissOfferNotification(requestId) // the card in the shade goes too
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

	// Countdown tick while an instant request is waiting for a reply.
	const hasInstant = offers.some(isInstantOffer)
	useEffect(() => {
		if (!focused || !hasInstant) return
		const t = setInterval(() => setNowMs(Date.now()), 1000)
		return () => clearInterval(t)
	}, [focused, hasInstant])

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
		if (sheetOffer) return
		const next = liveOffers.find((o) => isInstantOffer(o) && !offerAutoOpened.current.has(o.requestId))
		if (!next) return
		offerAutoOpened.current.add(next.requestId)
		setOfferPhase('open')
		setSheetOffer(next)
		Vibration.vibrate(OFFER_VIBRATION)
	})

	// The open instant sheet turns into "Request missed" when the window runs out.
	const sheetSecs = sheetOffer ? offerSecondsLeft(sheetOffer) : null
	const phase: OfferPhase = offerPhase === 'open' && sheetSecs === 0 ? 'missed' : offerPhase

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
		Vibration.cancel()
		setSheetOffer(null)
		setOfferPhase('open')
	}

	const handleAcceptOffer = async (offer: ProviderOffer) => {
		if (offerBusy) return
		setOfferBusy(true)
		void dismissOfferNotification(offer.requestId)
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
				showStatusModal({
					status: 'error',
					title: 'Could not accept request',
					description: res.message ?? 'Please try again.',
					submitText: 'OK',
				})
			}
		} finally {
			setOfferBusy(false)
		}
	}

	const handleDeclineOffer = async (offer: ProviderOffer) => {
		if (offerBusy) return
		setOfferBusy(true)
		void dismissOfferNotification(offer.requestId)
		try {
			await rejectOffer(offer.requestId)
			offerGone.current.add(offer.requestId)
			closeOfferSheet()
			Toast.show({ type: 'success', text1: 'Request declined' })
		} catch (e) {
			showStatusModal({
				status: 'error',
				title: 'Could not decline request',
				description: extractApiErrorMessage(e, 'Please try again.'),
				submitText: 'OK',
			})
		} finally {
			setOfferBusy(false)
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

			{overlay.needed ? (
				<View style={styles.padded}>
					<AppInfoBanner
						tone="warning"
						icon="layers-outline"
						title="Show new requests over other apps"
						subtitle="Allow “Display over other apps” so a new request appears on top of your screen, even when the app is closed."
						action={{ label: 'Allow', onPress: overlay.open }}
					/>
				</View>
			) : null}

			{stats ? (
				<View style={styles.statRow}>
					<StatTile label={copy.today.statLabel} value={`${stats.visits_done} of ${stats.visits_total}`} />
					<StatTile label="Earned today" value={earnedToday == null ? '—' : formatInr(earnedToday)} />
					<StatTile label="Rating" value={ratingLabel(rating)} />
				</View>
			) : null}

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

			{data ? (
				<View style={styles.padded}>
					<ProviderScheduleTimeline
						schedule={data.schedule}
						upcoming={data.upcoming}
						nextVisitId={nextVisit?.visit_public_id}
						copy={copy}
						onOpen={openVisit}
					/>
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
	statRow: {
		flexDirection: 'row',
		gap: 8,
		paddingHorizontal: 16,
	},
	statTile: {
		flex: 1,
		minWidth: 0,
		gap: 2,
		padding: 12,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: APP_COLORS.divider,
		backgroundColor: APP_COLORS.surface,
	},
	statLabel: {
		fontSize: 11,
		lineHeight: 14,
		fontWeight: '700',
		color: APP_COLORS.inkMuted,
	},
	statValue: {
		fontSize: 16,
		lineHeight: 22,
		fontWeight: '800',
		color: APP_COLORS.ink,
	},
})

export default ProviderTodayContent
