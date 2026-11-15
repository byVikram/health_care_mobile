// src/services/offerNotification.ts
//
// A new care request, drawn by the APP as a notification with Accept / Decline buttons (Android), so a provider can answer from the
// lock screen or with the app closed, like a ride request.
//
//   1. The backend sends the offer as a DATA-ONLY high-priority push (no `notification` block, so Android shows nothing itself) to a
//      session that said it can draw it (`offer_actions` when the push token is registered: see canDrawOffers). Its data carries the
//      title, the text (lines separated by newlines), the channel, the request and when the offer ends (health_care_backend
//      app/core/push.py, ancillary/dispatch_service.py::_push_offer_notification).
//   2. The Firebase background handler (pushNotificationService.registerBackgroundPushHandler, set in index.ts) runs even when the app is
//      closed and calls showOfferNotification: the card, on the care_request_ring channel for an instant request (the phone's ringtone,
//      repeated until it is answered or ends: `loopSound`), a countdown in its header and the buttons.
//   3. A tap on a button comes back as an ACTION_PRESS event to handleOfferEvent (notifee.onBackgroundEvent, also registered in index.ts,
//      or the foreground one), which calls the same accept / reject APIs as the in-app offer sheet with the stored login, stops the ring and
//      shows what happened (accepted / taken by another provider / could not accept). A tap on the card itself opens the app on Today.
//
// The library is react-native-notify-kit (the maintained fork of Notifee). It is loaded lazily and only on Android, and every call is
// guarded: an app build without its native module (or an older native build run from a dev server) simply never says it can draw offers,
// and the backend sends those the ordinary notification.
import { AppRegistry, NativeModules, Platform } from 'react-native'
import type { RemoteMessage } from '@react-native-firebase/messaging'
import { acceptCareRequestBackend } from '../features/ancillary/ancillaryService'
import { rejectOffer } from '../features/ancillary/providerVisitService'

const isAndroid = Platform.OS === 'android'
const kit = () => require('react-native-notify-kit') as typeof import('react-native-notify-kit')
const notifee = () => kit().default

/**
 * The native ring (plugins/offer-overlay/*.kt, added by plugins/withOfferOverlay.js): a foreground service that plays the phone's
 * ringtone itself, buzzes and shows the care request as a card over other apps / over the lock screen, and keeps working with the app
 * closed. Missing on an older native build (then the notification card below is used).
 */
type OfferOverlayNative = {
	canDrawOverlays(): Promise<boolean>
	openOverlaySettings(): void
	show(offer: {
		requestId: string
		visitPublicId: string
		bookingType: string
		title: string
		body: string
		expiresAtMs: number
	}): Promise<boolean>
	hide(requestId: string): void
}
const nativeRing = (): OfferOverlayNative | undefined =>
	isAndroid ? (NativeModules.OfferOverlay as OfferOverlayNative | undefined) : undefined

/** True when this build has the native ring: the Account / Today screen can then offer "Display over other apps". */
export const hasNativeRing = (): boolean => !!nativeRing()

/** Whether "Display over other apps" is allowed (the card over other apps needs it); false when this build has no native ring. */
export async function canShowOverOtherApps(): Promise<boolean> {
	try {
		return !!(await nativeRing()?.canDrawOverlays())
	} catch {
		return false
	}
}

/** Opens Android's "Display over other apps" page for this app. */
export function openOverlaySettings(): void {
	try {
		nativeRing()?.openOverlaySettings()
	} catch (error) {
		console.warn('[offer] Could not open the overlay settings:', error)
	}
}

export const OFFER_TYPE = 'NEW_CARE_REQUEST_OFFER'
const RESULT_TYPE = 'CARE_REQUEST_RESULT'
const ACCEPT = 'accept'
const DECLINE = 'decline'
// The channel an instant request rings in (created natively by plugins/withNotificationChannels.js; ids match the backend).
const RING_CHANNEL_ID = 'care_request_ring'
// What happened after a tap on a button: a quiet notification (no sound), created here.
const RESULT_CHANNEL_ID = 'care_request_result'
const BRAND_COLOR = '#2B6F71'
const SMALL_ICON = 'notification_icon'

/** One card per request: a second push for the same request replaces it. */
const offerId = (requestId: string) => `care-offer-${requestId}`

/** True when this app build can draw a care offer with buttons: Android, the library's native module is linked and the ringing channel exists. */
export async function canDrawOffers(): Promise<boolean> {
	if (!isAndroid) return false
	try {
		return !!(await notifee().isChannelCreated(RING_CHANNEL_ID))
	} catch {
		return false
	}
}

/** A data-only offer the backend asked the app to draw (an ordinary offer is drawn by Android and never reaches the app's code). */
export function isDrawnOffer(data: RemoteMessage['data']): boolean {
	return data?.type === OFFER_TYPE && typeof data.title === 'string' && !!data.title && !!data.requestId
}

/** Draws the offer card. Never throws: a failure must not break the background handler. */
export async function showOfferNotification(message: Pick<RemoteMessage, 'data'>): Promise<void> {
	if (!isAndroid) return
	try {
		const data = message.data ?? {}
		const requestId = String(data.requestId ?? '')
		if (!requestId) return
		const expiresAtMs = Number(data.expiresAtMs) || 0
		const msLeft = expiresAtMs ? expiresAtMs - Date.now() : 0
		if (expiresAtMs && msLeft < 1500) return // it ended while the push was on its way
		const instant = String(data.bookingType ?? 'INSTANT').toUpperCase() === 'INSTANT'
		// An instant request goes to the native ring when this build has it: its own ringtone and buzz, the card over other apps or the
		// lock screen. If Android refuses to start it now, the notification card below is the fallback.
		const ring = nativeRing()
		if (instant && ring) {
			try {
				await ring.show({
					requestId,
					visitPublicId: String(data.visitPublicId ?? ''),
					bookingType: String(data.bookingType ?? 'INSTANT'),
					title: String(data.title ?? ''),
					body: String(data.body ?? ''),
					expiresAtMs,
				})
				return
			} catch (error) {
				console.warn('[offer] The native ring could not start, drawing the notification card instead:', error)
			}
		}
		const lines = String(data.body ?? '')
			.split('\n')
			.filter(Boolean)
		// The collapsed card (what a heads-up banner shows): the service and the distance. Expanded: every line.
		const distance = lines.find((line) => line.includes('km away'))
		const collapsed = [lines[0], distance].filter(Boolean).join(' · ')
		const { AndroidImportance, AndroidStyle, AndroidVisibility } = kit()
		await notifee().displayNotification({
			id: offerId(requestId),
			title: String(data.title),
			body: collapsed || undefined,
			data: {
				type: OFFER_TYPE,
				requestId,
				visitPublicId: String(data.visitPublicId ?? ''),
				bookingType: String(data.bookingType ?? 'INSTANT'),
			},
			android: {
				channelId: String(data.channelId || RING_CHANNEL_ID),
				smallIcon: SMALL_ICON,
				color: BRAND_COLOR,
				importance: AndroidImportance.HIGH,
				visibility: AndroidVisibility.PUBLIC,
				// One line per row (a BigText paragraph runs the lines together on some phones, Samsung's among them).
				style: { type: AndroidStyle.INBOX, lines },
				// An instant request rings until it is answered or ends (the ringtone repeats), and counts down to the end of the offer.
				loopSound: instant,
				...(expiresAtMs ? { timeoutAfter: msLeft } : {}),
				...(instant && expiresAtMs
					? { showChronometer: true, chronometerDirection: 'down' as const, timestamp: expiresAtMs }
					: {}),
				// A tap on the card opens the app (on Today, where the offer sheet is); the buttons answer without opening it.
				pressAction: { id: 'open', launchActivity: 'default' },
				actions: [
					{ title: 'Decline', pressAction: { id: DECLINE } },
					{ title: 'Accept', pressAction: { id: ACCEPT } },
				],
			},
		})
	} catch (error) {
		console.warn('[offer] Could not draw the care request notification:', error)
	}
}

/** Removes a request's card (the in-app sheet answered it, or it was withdrawn). Best effort. */
export async function dismissOfferNotification(requestId: string): Promise<void> {
	if (!isAndroid) return
	try {
		nativeRing()?.hide(requestId) // stops the ring and the card over other apps
	} catch {
		// no native ring
	}
	try {
		await notifee().cancelNotification(offerId(requestId))
	} catch {
		// no native module, or nothing to remove
	}
}

/** What happened after a tap on a button: one quiet notification; a tap on it opens the app. */
async function showResult(requestId: string, title: string, body: string, lasts: boolean): Promise<void> {
	try {
		const { AndroidImportance } = kit()
		const channelId = await notifee().createChannel({
			id: RESULT_CHANNEL_ID,
			name: 'Care request results',
			importance: AndroidImportance.LOW,
		})
		await notifee().displayNotification({
			id: `care-result-${requestId}`,
			title,
			body,
			data: { type: RESULT_TYPE, requestId },
			android: {
				channelId,
				smallIcon: SMALL_ICON,
				color: BRAND_COLOR,
				autoCancel: true,
				...(lasts ? {} : { timeoutAfter: 120_000 }),
				pressAction: { id: 'open', launchActivity: 'default' },
			},
		})
	} catch (error) {
		console.warn('[offer] Could not show the result of the request:', error)
	}
}

async function cancelCard(notificationId: string | undefined): Promise<void> {
	if (!notificationId) return
	try {
		await notifee().cancelNotification(notificationId)
	} catch {
		// nothing to remove
	}
}

async function acceptFromNotification(notificationId: string | undefined, requestId: string): Promise<void> {
	// Stop the ring at once: the answer itself takes a moment.
	await cancelCard(notificationId)
	try {
		const res = await acceptCareRequestBackend(requestId)
		if (res.success) await showResult(requestId, 'Request accepted', 'Tap to open your visit.', true)
		else if (res.alreadyClaimed)
			await showResult(
				requestId,
				'Taken by another provider',
				'Another provider accepted this request first.',
				false
			)
		else
			await showResult(
				requestId,
				"Couldn't accept the request",
				res.message ?? 'Open the app and try again.',
				false
			)
	} catch {
		await showResult(requestId, "Couldn't accept the request", 'Check your connection and open the app.', false)
	}
}

async function declineFromNotification(notificationId: string | undefined, requestId: string): Promise<void> {
	await cancelCard(notificationId)
	try {
		await rejectOffer(requestId)
	} catch {
		// A decline that did not reach the server only means the offer is shown to this provider until it ends: nothing to tell them.
	}
}

type OfferEvent = import('react-native-notify-kit').Event

/** A press on one of the card's buttons (foreground or background): Accept / Decline call the offer APIs. Never throws. */
export async function handleOfferEvent({ type, detail }: OfferEvent): Promise<void> {
	try {
		const { EventType } = kit()
		const notification = detail.notification
		if (type !== EventType.ACTION_PRESS || notification?.data?.type !== OFFER_TYPE) return
		const requestId = String(notification.data?.requestId ?? '')
		if (!requestId) return
		if (detail.pressAction?.id === ACCEPT) await acceptFromNotification(notification.id, requestId)
		else if (detail.pressAction?.id === DECLINE) await declineFromNotification(notification.id, requestId)
	} catch (error) {
		console.warn('[offer] Could not handle a press on the care request notification:', error)
	}
}

/**
 * The native ring's Accept / Decline (OfferActionService starts the headless task `OfferAction`): the ring and the card are already
 * stopped natively, this calls the same APIs as the in-app sheet and shows what happened. Never throws.
 */
export async function answerOfferFromNative(data: { requestId?: string; action?: string }): Promise<void> {
	try {
		const requestId = String(data?.requestId ?? '')
		if (!requestId) return
		if (data.action === ACCEPT) await acceptFromNotification(offerId(requestId), requestId)
		else if (data.action === DECLINE) await declineFromNotification(offerId(requestId), requestId)
	} catch (error) {
		console.warn('[offer] Could not answer the care request from the native card:', error)
	}
}

/** Index.ts, at module load: the headless task the native ring's buttons start (the app may be closed). */
export function registerOfferHeadlessTask(): void {
	if (!isAndroid) return
	AppRegistry.registerHeadlessTask('OfferAction', () => answerOfferFromNative)
}

/** Index.ts, at module load: button presses while the app is in the background or closed. */
export function registerOfferBackgroundEvents(): void {
	if (!isAndroid) return
	try {
		notifee().onBackgroundEvent(handleOfferEvent)
	} catch (error) {
		console.warn('[offer] Could not register the background handler for care request notifications:', error)
	}
}

/**
 * While signed in: button presses with the app open, and a tap on the card (or on its result) that opens the app, also the tap that
 * started it from closed (`onOpen` then opens the provider's Today screen). Returns the unsubscribe.
 */
export function subscribeToOfferEvents(onOpen: () => void): () => void {
	if (!isAndroid) return () => {}
	let unsubscribe: (() => void) | undefined
	let active = true
	try {
		const { EventType } = kit()
		const isCare = (data: unknown) => {
			const type = (data as { type?: unknown } | undefined)?.type
			return type === OFFER_TYPE || type === RESULT_TYPE
		}
		unsubscribe = notifee().onForegroundEvent(async (event) => {
			await handleOfferEvent(event)
			if (event.type === EventType.PRESS && isCare(event.detail.notification?.data)) onOpen()
		})
		const openFromClosed = async () => {
			try {
				const initial = await notifee().getInitialNotification()
				if (active && initial && isCare(initial.notification?.data)) onOpen()
			} catch (error) {
				console.warn('[offer] Could not read the notification that opened the app:', error)
			}
		}
		void openFromClosed()
	} catch (error) {
		console.warn('[offer] Could not subscribe to care request notification events:', error)
	}
	return () => {
		active = false
		unsubscribe?.()
	}
}
