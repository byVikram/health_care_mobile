// src/services/pushNotificationService.ts
//
// Push notifications via Firebase Cloud Messaging. Gives the backend this device's FCM token (PATCH
// /api/auth/session/fcm-token) so it can wake a closed / backgrounded app -- e.g. the "New care request
// nearby" offer sent to nurses -- and opens the right screen when the notification is tapped.
//
// Foreground: a care-request offer or home-care news is ignored (the offer already arrives over the dispatch WebSocket,
// useProviderDispatchSocket, and would show twice). News that carries a `notification_id` (an appointment was confirmed, a
// reminder ...) is a row in the notification list. Android draws a push itself only while the app is closed or in the background;
// while the app is open it hands the message to the app. So the app posts the same system notification itself (expo-notifications,
// on the same "updates" channel: a banner with sound, and an entry in the notification shade, exactly like the one a closed app
// gets), unless that screen is already open; the bell and the list refresh. Only if posting fails does it fall back to a banner
// inside the app (components/common/feedback/NotificationToast). A tap on either opens the same screen as a tap on the phone's
// notification.
import { useEffect } from 'react'
import { Platform } from 'react-native'
import type { RemoteMessage } from '@react-native-firebase/messaging'
import Toast from 'react-native-toast-message'
import ApiService from './apiService'
import { API_ENDPOINTS } from '../constants/apiUrls'
import { emitNotificationsChanged } from './notificationEvents'
import { getCurrentRoute, navigate } from '../navigation/navigationService'
import { ROUTES } from '../navigation/routes'
import { openNotificationTarget, type NavigateFn } from '../features/notification/openNotificationTarget'
import { markNotificationRead } from '../features/referrals/referralService'

// Loaded lazily and never on web: @react-native-firebase is native-only and must not run at module load.
const isNative = Platform.OS !== 'web'
const firebase = () => require('@react-native-firebase/messaging') as typeof import('@react-native-firebase/messaging')
const notifications = () => require('expo-notifications') as typeof import('expo-notifications')

// The Android channel the app's own notifications use: created natively at start-up (plugins/withNotificationChannels.js); the
// backend sends the same id (health_care_backend/app/core/push.py UPDATES_CHANNEL_ID).
const UPDATES_CHANNEL_ID = 'updates'

const FCM_TOKEN_URL = API_ENDPOINTS.AUTH.SESSION_FCM_TOKEN
const NEW_CARE_REQUEST_OFFER = 'NEW_CARE_REQUEST_OFFER'
// News about a patient's home-care visit (the provider arrived, the visit was reported as missed, the reply reminder, the
// strike warning, the booking pause): the push carries the booking id, and a tap opens that booking.
const PATIENT_HOME_CARE_NEWS = new Set([
	'ANCILLARY_VISIT_ARRIVED',
	'ANCILLARY_VISIT_NO_SHOW',
	'ANCILLARY_NO_SHOW_REPLY_REMINDER',
	'ANCILLARY_NO_SHOW_WARNING',
	'ANCILLARY_BOOKING_RESTRICTED',
])

// The first request right after sign-in can fail on a connection that went stale (Android's HTTP client retries a GET on its own,
// never a PATCH), so a failed registration is tried again a few times before giving up. A refusal by the server (a 4xx) is not retried.
const TOKEN_RETRY_DELAYS_MS = [1500, 4000, 10000]
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/** Send a token to the backend for the current login session, retrying a network failure. Never throws. */
async function sendToken(token: string | null | undefined) {
	if (!token) return
	for (let attempt = 0; ; attempt++) {
		try {
			await ApiService.patch(FCM_TOKEN_URL, { fcm_token: token })
			return
		} catch (error) {
			const status = (error as { response?: { status?: number } })?.response?.status
			const retryable = (status === undefined || status >= 500) && attempt < TOKEN_RETRY_DELAYS_MS.length
			console.warn(`[push] Could not register the FCM token with the backend (attempt ${attempt + 1}):`, error)
			if (!retryable) return
			await wait(TOKEN_RETRY_DELAYS_MS[attempt])
		}
	}
}

/** Fetch this device's FCM token and register it for the current session. Never throws. */
export async function registerPushToken() {
	if (!isNative) return
	try {
		const fb = firebase()
		const messaging = fb.getMessaging()
		if (Platform.OS === 'ios') await fb.registerDeviceForRemoteMessages(messaging)
		await sendToken(await fb.getToken(messaging))
	} catch (error) {
		// Typically: Firebase not configured for this build (no google-services / GoogleService-Info), or simulator.
		console.warn('[push] Could not get an FCM token:', error)
	}
}

/**
 * On logout: drop this device's FCM token, so the token the server may still hold for the ended session is dead and
 * the next sign-in on this phone (possibly another person) gets a new one. Never throws; the server stops pushing to
 * the session anyway once it is revoked.
 */
export async function unregisterPushToken() {
	if (!isNative) return
	try {
		const fb = firebase()
		await fb.deleteToken(fb.getMessaging())
	} catch (error) {
		console.warn('[push] Could not delete the FCM token:', error)
	}
}

const openScreen: NavigateFn = (name, params) => (navigate as unknown as NavigateFn)(name, params)

/** The screen a push opens, from its data (`redirect_type` / `redirect_id`, the same fields as the row in the list). */
function openFromData(data: RemoteMessage['data']): boolean {
	if (!data || typeof data.redirect_type !== 'string' || !data.redirect_type) return false
	return openNotificationTarget(openScreen, {
		redirect_type: data.redirect_type,
		redirect_id: typeof data.redirect_id === 'string' ? data.redirect_id : null,
	})
}

/**
 * Notification tapped: a care-request offer lands on the provider's Today screen, whose socket delivers the offer; news about a
 * patient's home-care visit opens the booking (a scheduled order's details, or the live screen of an instant one).
 */
function handleOpened(message: Pick<RemoteMessage, 'data'> | null) {
	const data = message?.data
	if (data?.type === NEW_CARE_REQUEST_OFFER) {
		navigate(ROUTES.MAIN.TABS, { screen: ROUTES.MAIN.HOME } as never)
		return
	}
	if (typeof data?.type === 'string' && PATIENT_HOME_CARE_NEWS.has(data.type) && data.requestId) {
		const id = String(data.requestId)
		if (data.bookingType === 'SCHEDULED')
			navigate(ROUTES.STACK.ANCILLARY_SCHEDULED_DETAILS, { requestId: id } as never)
		else navigate(ROUTES.STACK.ANCILLARY_TRACK_APPOINTMENT, { bookingId: id } as never)
		return
	}
	// News that is also a row in the notification list (an appointment update): open its screen and mark it read.
	if (openFromData(data) && typeof data?.notification_id === 'string' && data.notification_id) {
		void markRead(data.notification_id)
	}
}

/** Mark the notification behind a tapped push as read (best effort), then refresh the bell and the list. */
async function markRead(notificationId: string) {
	try {
		await markNotificationRead(notificationId)
	} catch (error) {
		console.warn('[push] Could not mark the notification as read:', error)
	} finally {
		emitNotificationsChanged()
	}
}

/** True when the screen in front already shows what the push is about, so a banner would only repeat it. */
function alreadyOnScreen(data: NonNullable<RemoteMessage['data']>): boolean {
	const route = getCurrentRoute()
	if (!route) return false
	if (route.name === ROUTES.STACK.NOTIFICATION) return true // the list itself: it reloads on its own
	const params = route.params as { appointmentId?: string } | undefined
	return data.redirect_type === 'appointment' && route.name === ROUTES.STACK.APPOINTMENT_DETAILS && params?.appointmentId === data.redirect_id
}

let handlerSet = false

/** Tell expo-notifications to show a notification the app posts while it is open (it shows nothing in the foreground otherwise). */
function ensureNotificationHandler() {
	if (handlerSet) return
	handlerSet = true
	notifications().setNotificationHandler({
		handleNotification: async () => ({
			shouldShowBanner: true,
			shouldShowList: true,
			shouldPlaySound: true,
			shouldSetBadge: false,
		}),
	})
}

/** Post the push as a system notification from the app itself. Returns false when it could not be posted. */
async function showSystemNotification(message: RemoteMessage): Promise<boolean> {
	try {
		ensureNotificationHandler()
		await notifications().scheduleNotificationAsync({
			content: {
				title: message.notification?.title ?? 'New notification',
				body: message.notification?.body ?? undefined,
				data: { ...(message.data ?? {}) },
				sound: 'default',
			},
			// Android: straight onto the "updates" channel (a banner with sound); null = now, on iOS.
			trigger: Platform.OS === 'android' ? { channelId: UPDATES_CHANNEL_ID } : null,
		})
		return true
	} catch (error) {
		console.warn('[push] Could not show the notification while the app is open:', error)
		return false
	}
}

/** The notification could not be posted: show the banner inside the app instead. */
function showInAppBanner(message: RemoteMessage) {
	Toast.show({
		type: 'notification',
		text1: message.notification?.title ?? 'New notification',
		text2: message.notification?.body,
		position: 'top',
		topOffset: 48,
		visibilityTime: 5000,
		onPress: () => {
			Toast.hide()
			handleOpened(message)
		},
	})
}

async function presentForeground(message: RemoteMessage) {
	if (await showSystemNotification(message)) return
	showInAppBanner(message)
}

/** App open and a push arrives: refresh the bell and the list and, unless it is already on screen, post the notification. */
function handleForeground(message: RemoteMessage) {
	const data = message.data
	if (!data || typeof data.notification_id !== 'string' || !data.notification_id) return
	emitNotificationsChanged()
	if (alreadyOnScreen(data)) return
	void presentForeground(message)
}

let lastTappedId: string | undefined

/** A notification the app posted itself was tapped (app open, in the background, or closed since): open its screen. */
function handleLocalTap(response: import('expo-notifications').NotificationResponse | null | undefined) {
	if (!response) return
	const id = response.notification.request.identifier
	if (id === lastTappedId) return // the same tap is delivered once by the listener and once as the launch response
	lastTappedId = id
	handleOpened({ data: response.notification.request.content.data as RemoteMessage['data'] })
}

/** Call once from index.ts, before the app is registered, so messages received while the app is killed are handled. */
export function registerBackgroundPushHandler() {
	if (!isNative) return
	try {
		// The system tray shows the notification itself; a handler only has to exist so Android runs the task cleanly.
		const fb = firebase()
		fb.setBackgroundMessageHandler(fb.getMessaging(), async () => {})
	} catch (error) {
		console.warn('[push] Could not register the background message handler:', error)
	}
}

/** Keeps this login session's FCM token registered, and routes notification taps. `enabled` = signed in. */
export function usePushNotifications(enabled: boolean) {
	useEffect(() => {
		if (!enabled || !isNative) return
		let active = true
		void registerPushToken()

		let unsubscribeRefresh: (() => void) | undefined
		let unsubscribeOpened: (() => void) | undefined
		let unsubscribeForeground: (() => void) | undefined
		let removeLocalTapListener: (() => void) | undefined
		let retry: ReturnType<typeof setTimeout> | undefined
		try {
			const fb = firebase()
			const messaging = fb.getMessaging()
			unsubscribeRefresh = fb.onTokenRefresh(messaging, (token) => void sendToken(token))
			unsubscribeOpened = fb.onNotificationOpenedApp(messaging, handleOpened)
			unsubscribeForeground = fb.onMessage(messaging, async (message) => handleForeground(message))
			// App launched by tapping a notification while it was killed. Navigation may not be ready yet: try again once.
			const openInitial = async () => {
				try {
					const message = await fb.getInitialNotification(messaging)
					if (!active || !message) return
					handleOpened(message)
					retry = setTimeout(() => handleOpened(message), 800)
				} catch (error) {
					console.warn('[push] Could not read the notification that opened the app:', error)
				}
			}
			void openInitial()
		} catch (error) {
			console.warn('[push] Could not subscribe to push events:', error)
		}
		try {
			// Taps on the notification the app posts itself while it is open (also after it has been closed and reopened by the tap).
			const n = notifications()
			const subscription = n.addNotificationResponseReceivedListener(handleLocalTap)
			removeLocalTapListener = () => subscription.remove()
			handleLocalTap(n.getLastNotificationResponse())
		} catch (error) {
			console.warn('[push] Could not subscribe to notification taps:', error)
		}

		return () => {
			active = false
			if (retry) clearTimeout(retry)
			unsubscribeRefresh?.()
			unsubscribeOpened?.()
			unsubscribeForeground?.()
			removeLocalTapListener?.()
		}
	}, [enabled])
}
