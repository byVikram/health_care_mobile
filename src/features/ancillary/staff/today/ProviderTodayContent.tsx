// src/features/ancillary/staff/today/ProviderTodayContent.tsx
//
// Provider "Today" (the "Nursing · Today" screen of the Ancillary Home design): the header (photo, name, "Within N km", bell,
// "Fri 20 Nov · 2 visits done today", the Online / Offline switch), an offline note, "Up next" (a snapping row of the visits still
// to do, today's first), and "Needs your action" (open jobs near her; a row only when there is something). Open offers pushed on
// the dispatch WebSocket are unchanged: an instant request rings for 30 s in IncomingOfferSheet, and an offer for one visit of a
// provider-less scheduled order shows as a banner above "Up next". Wording follows the provider's speciality (visit / session /
// shift). Data: GET /provider/me/today, re-read on focus, on pull-to-refresh, every minute while focused and after every action.
// Offers are never polled here: the socket pushes them (also the pending ones on connect). The old stats row, availability card, next-visit
// card and timeline are gone with the redesign (earnings and the full day live on Earnings and Schedule).
import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
	ActivityIndicator,
	RefreshControl,
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	Vibration,
	View,
} from 'react-native'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import Toast from 'react-native-toast-message'
import { AppInfoBanner } from '../../../../components/common'
import { APP_COLORS, formatInr } from '../../../../config/theme'
import { useSidebarDrawer } from '../../../../components/layout/SidebarLayout'
import { useAuth } from '../../../../context/AuthContext'
import { ROUTES } from '../../../../navigation/routes'
import { useTabBarClearance } from '../../../../navigation/tabBar'
import { getUnreadNotificationCount } from '../../../../services/homeService'
import { dismissOfferNotification } from '../../../../services/offerNotification'
import { showStatusModal } from '../../../../services/apiService'
import { formatTimeSlot } from '../../../../utils/formatters'
import { getDevicePosition, getPlaceFromCoords } from '../../../../services/locationService'
import { callPhone } from '../../../../utils/maps'
import { acceptCareRequestBackend, extractApiErrorMessage, fetchProviderProfile } from '../../ancillaryService'
import { getOpenJobs, type OpenJobs } from '../../providerOpenJobsService'
import {
	getProviderToday,
	rejectOffer,
	type ProviderOffer,
	type ProviderToday,
	type ProviderVisitSummary,
} from '../../providerVisitService'
import { clinicTimeHm } from '../../../doctor/scheduleUtils'
import { getProviderSpecialityCopy } from '../providerSpecialityCopy'
import { PATHS } from '../schedule/scheduleTheme'
import { todayIso as todayIsoOf } from '../schedule/scheduleModel'
import { IncomingOfferSheet, type OfferPhase } from './IncomingOfferSheet'
import { NeedsActionList, type ActionRow } from './NeedsActionList'
import { VisitNotesSheet } from '../visit/VisitNotesSheet'
import { ProviderHomeHeader } from './ProviderHomeHeader'
import { RunningLateSheet } from '../schedule/RunningLateSheet'
import { UpNextCarousel } from './UpNextCarousel'
import { useOverlayPermission } from './useOverlayPermission'
import { useProviderDispatchSocket } from './useProviderDispatchSocket'
import { useProviderOnline } from './useProviderOnline'
import { isInstantOffer, offerCollect, offerSeenAtMs, shortDay, tipLabel } from './todayView'
import { toUpNextCard, upNextVisits, type UpNextCard } from './upNextView'

const REFRESH_MS = 60_000
/** The buzz when an instant request opens its sheet in the open app (the closed app's notification buzzes on its own channel). */
const OFFER_VIBRATION = [0, 700, 400, 700, 400, 700]
/** Seconds an instant request is held for this provider before it counts as missed. */
const INSTANT_WINDOW_S = 30
const NO_OPEN_JOBS: OpenJobs = { needed: [], nearby: [] }

export function ProviderTodayContent() {
	const navigation = useNavigation<any>()
	const clearance = useTabBarClearance()
	const { user } = useAuth()
	const drawer = useSidebarDrawer()
	const [data, setData] = useState<ProviderToday | null>(null)
	const [loading, setLoading] = useState(true)
	const [refreshing, setRefreshing] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [nowMs, setNowMs] = useState(() => Date.now())
	const [focused, setFocused] = useState(false)
	const [notificationCount, setNotificationCount] = useState(0)
	/** The Up next card whose "Running late?" sheet is open. */
	const [lateCard, setLateCard] = useState<UpNextCard | null>(null)
	const [radiusKm, setRadiusKm] = useState<number | null>(null)
	const [areaName, setAreaName] = useState<string | null>(null)
	const [openJobs, setOpenJobs] = useState<OpenJobs>(NO_OPEN_JOBS)
	const [notesOpen, setNotesOpen] = useState(false)
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

	/** What the header and "Needs your action" show besides the day: the bell, the travel radius and the open jobs. */
	const loadSide = useCallback(async () => {
		try {
			setNotificationCount(await getUnreadNotificationCount())
		} catch {
			// The bell just shows no dot.
		}
		try {
			const profile = await fetchProviderProfile()
			const r = Number(profile?.geofence_radius_km ?? profile?.geofence_radius)
			setRadiusKm(Number.isFinite(r) && r > 0 ? Math.round(r) : null)
		} catch {
			setRadiusKm(null)
		}
		try {
			setOpenJobs(await getOpenJobs())
		} catch {
			setOpenJobs(NO_OPEN_JOBS)
		}
	}, [])

	useFocusEffect(
		useCallback(() => {
			setFocused(true)
			void load()
			void loadSide()
			return () => setFocused(false)
		}, [load, loadSide])
	)

	const onRefresh = async () => {
		setRefreshing(true)
		await Promise.all([load(), loadSide()])
		setRefreshing(false)
	}

	// Where she is, by name, for the header pill: the device's last position, and only when location is already allowed (no prompt).
	useEffect(() => {
		let active = true
		const run = async () => {
			try {
				const pos = await getDevicePosition({ maxAgeMs: 60 * 60 * 1000 })
				if (pos.status !== 'ok' || !active) return
				const place = await getPlaceFromCoords(pos.position.latitude, pos.position.longitude)
				if (active && place?.area) setAreaName(place.area)
			} catch {
				// The pill just says the radius.
			}
		}
		void run()
		return () => {
			active = false
		}
	}, [])

	// Keep the visits fresh: re-read every minute while the screen is visible.
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
			// The server's time left on her offer wins (a re-push of the same offer corrects it); else the 30 s count from now.
			if (offer.expiresInMs != null || !offerSeenAt.current[offer.requestId])
				offerSeenAt.current[offer.requestId] = offerSeenAtMs(Date.now(), offer.expiresInMs, INSTANT_WINDOW_S)
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

	// A request that ran out on her stays open for other nurses (and for her): read "Needed now" so the sheet can say so.
	useEffect(() => {
		if (phase !== 'missed') return
		let active = true
		const run = async () => {
			try {
				const jobs = await getOpenJobs()
				if (active) setOpenJobs(jobs)
			} catch {
				// Best effort: the sheet just does not say the request is still open.
			}
		}
		void run()
		return () => {
			active = false
		}
	}, [phase])

	/** A visit in progress opens straight into the in-progress screen; anything else shows its details. */
	const openVisit = (visit: ProviderVisitSummary) => {
		navigation.navigate(
			visit.status === 'IN_PROGRESS'
				? ROUTES.STACK.PROVIDER_VISIT_IN_PROGRESS
				: ROUTES.STACK.PROVIDER_VISIT_DETAILS,
			{ visitId: visit.visit_public_id }
		)
	}

	/** The Schedule tab (the provider's Portal tab). */
	const openSchedule = () => navigation.navigate(ROUTES.MAIN.TABS, { screen: ROUTES.MAIN.PORTAL })

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
			const declined = await rejectOffer(offer.requestId)
			offerGone.current.add(offer.requestId)
			closeOfferSheet()
			// Already hers (her Accept got there first): nothing was declined, so no toast; the reload below shows the visit.
			if (declined) Toast.show({ type: 'success', text1: 'Request declined' })
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

	const cards = data ? upNextVisits(data.schedule, data.upcoming).map((v, i) => toUpNextCard(v, i, copy.noun)) : []
	/** The Online / Offline switch (header pill and the offline note): says what changed, once it has. */
	const goOnline = async (next: boolean) => {
		if (await availability.setOnline(next)) {
			Toast.show({
				type: 'info',
				text1: next
					? 'You’re online · instant requests near you will ring here'
					: 'You’re offline · no instant requests until you go online',
			})
		}
	}

	const done = data?.stats.visits_done ?? 0
	const offline = availability.online === false

	// "Your next visit: 7:00 PM with Vikram K." under an instant request: the first visit still to do today that starts later.
	const nowHm = clinicTimeHm(new Date(nowMs))
	const nextToday = data
		? upNextVisits(data.schedule, [])
				.filter((v) => v.start_time && v.start_time.slice(0, 5) > nowHm)
				.sort((a, b) => (a.start_time ?? '').localeCompare(b.start_time ?? ''))[0]
		: undefined
	const nextVisitLine = nextToday
		? `Your next ${copy.noun}: ${formatTimeSlot(nextToday.start_time)}${nextToday.patient.name ? ` with ${nextToday.patient.name}` : ''}`
		: null

	const actionRows: ActionRow[] = []
	if (openJobs.nearby.length > 0) {
		actionRows.push({
			key: 'open-jobs',
			title: 'Open jobs near you',
			sub: `Scheduled ${copy.noun}s this week · first to pick up gets them`,
			count: openJobs.nearby.length,
			icon: PATHS.pin,
			tone: 'amber',
			onPress: openSchedule,
		})
	}

	// "Visit notes to finish": her completed visits with no notes yet, inside the window in which notes can still be written.
	const notesPending = data?.notes_pending ?? []
	if (notesPending.length > 0) {
		const firstPending = notesPending[0]
		actionRows.push({
			key: 'notes',
			title: 'Visit notes to finish',
			sub: `${firstPending.patient_name} · ${firstPending.service_name}${
				notesPending.length > 1 ? ` + ${notesPending.length - 1} more` : ''
			}`,
			count: notesPending.length,
			icon: PATHS.file,
			tone: 'teal',
			onPress: () => setNotesOpen(true),
		})
	}

	return (
		<View style={styles.root}>
			<ProviderHomeHeader
				name={user?.name || data?.provider.name || 'Provider'}
				avatarUri={user?.avatar}
				areaLabel={
					radiusKm != null
						? areaName
							? `${areaName} · within ${radiusKm} km`
							: `Within ${radiusKm} km`
						: areaName
				}
				notificationCount={notificationCount}
				dateLabel={shortDay(todayIsoOf())}
				doneLine={data ? `${done} ${done === 1 ? copy.noun : `${copy.noun}s`} done today` : null}
				online={availability.online}
				busy={availability.busy}
				onAvatarPress={drawer.open}
				onAreaPress={() => navigation.navigate(ROUTES.STACK.PROFILE_AVAILABILITY)}
				onNotificationsPress={() => navigation.navigate(ROUTES.STACK.NOTIFICATION)}
				onToggleOnline={() => void goOnline(availability.online !== true)}
			/>

			<ScrollView
				contentContainerStyle={[styles.content, { paddingBottom: clearance + 16 }]}
				showsVerticalScrollIndicator={false}
				refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
			>
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

				{offline ? (
					<View style={[styles.padded, styles.offlineWrap]}>
						<View style={styles.offline} accessibilityRole="alert">
							<View style={styles.offlineText}>
								<Text style={styles.offlineTitle}>You’re offline</Text>
								<Text style={styles.offlineBody}>
									{`You won’t get instant requests. Your scheduled ${copy.noun}s still stand.`}
								</Text>
							</View>
							<TouchableOpacity
								onPress={() => void goOnline(true)}
								disabled={availability.busy}
								activeOpacity={0.85}
								style={styles.goOnline}
								accessibilityRole="button"
							>
								<Text style={styles.goOnlineText}>Go online</Text>
							</TouchableOpacity>
						</View>
					</View>
				) : null}

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

				{loading && !data ? (
					<View style={styles.loadingBox}>
						<ActivityIndicator color={APP_COLORS.primary} />
					</View>
				) : cards.length > 0 ? (
					<UpNextCarousel
						cards={cards}
						onOpen={(c) => openVisit(c.visit)}
						onCall={(c) => void callPhone(c.visit.patient.phone)}
						onRunningLate={setLateCard}
						onFullSchedule={openSchedule}
					/>
				) : data ? (
					<View style={styles.padded}>
						<View style={styles.empty}>
							<Text style={styles.emptyTitle}>{`No ${copy.noun}s coming up`}</Text>
							<Text style={styles.emptySub}>
								{offline
									? 'Go online to get requests near you.'
									: 'New requests near you will show here.'}
							</Text>
							<TouchableOpacity onPress={openSchedule} accessibilityRole="link" style={styles.emptyLink}>
								<Text style={styles.emptyLinkText}>Full schedule</Text>
							</TouchableOpacity>
						</View>
					</View>
				) : null}

				<NeedsActionList rows={actionRows} />

				{lateCard ? (
					<RunningLateSheet
						visible
						visitId={lateCard.id}
						patientName={lateCard.name}
						line={[lateCard.when, lateCard.service].filter(Boolean).join(' · ')}
						onClose={() => setLateCard(null)}
					/>
				) : null}

				<IncomingOfferSheet
					offer={sheetOffer}
					copy={copy}
					phase={phase}
					secondsLeft={sheetSecs}
					busy={offerBusy}
					nextVisitLine={nextVisitLine}
					onAccept={(o) => void handleAcceptOffer(o)}
					onDecline={(o) => void handleDeclineOffer(o)}
					onClose={closeOfferSheet}
					stillOpen={!!sheetOffer && openJobs.needed.some((j) => j.id === sheetOffer.requestId)}
					onSeeNeeded={() => {
						closeOfferSheet()
						openSchedule()
					}}
				/>
			</ScrollView>
			<VisitNotesSheet
				visible={notesOpen}
				items={notesPending}
				onClose={() => setNotesOpen(false)}
				onSaved={() => void load()}
			/>
		</View>
	)
}

const styles = StyleSheet.create({
	root: { flex: 1, backgroundColor: APP_COLORS.pageBg },
	content: { gap: 20, paddingTop: 16 },
	padded: { paddingHorizontal: 16 },
	loadingBox: { paddingVertical: 48, alignItems: 'center' },
	offlineWrap: { marginTop: -4 },
	offline: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		gap: 10,
		padding: 12,
		paddingHorizontal: 14,
		borderRadius: 14,
		backgroundColor: APP_COLORS.warningBg,
		borderWidth: 1,
		borderColor: '#F0D9AE',
	},
	offlineText: { flex: 1, gap: 2 },
	offlineTitle: { fontSize: 14, lineHeight: 19, fontWeight: '700', color: APP_COLORS.warning },
	offlineBody: { fontSize: 12, lineHeight: 17, color: '#3F5357' },
	goOnline: {
		height: 34,
		paddingHorizontal: 12,
		borderRadius: 9,
		backgroundColor: APP_COLORS.primary,
		alignItems: 'center',
		justifyContent: 'center',
	},
	goOnlineText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
	empty: {
		padding: 20,
		borderRadius: 14,
		borderWidth: 1,
		borderColor: APP_COLORS.divider,
		backgroundColor: APP_COLORS.surface,
		alignItems: 'center',
		gap: 4,
	},
	emptyTitle: { fontSize: 15, lineHeight: 20, fontWeight: '800', color: APP_COLORS.ink },
	emptySub: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted, textAlign: 'center' },
	emptyLink: { marginTop: 6, height: 36, justifyContent: 'center' },
	emptyLinkText: { fontSize: 13, fontWeight: '700', color: APP_COLORS.primary },
})

export default ProviderTodayContent
