// src/services/pushNotificationService.ts
//
// Push notifications via Firebase Cloud Messaging. Gives the backend this device's FCM token (PATCH
// /api/auth/session/fcm-token) so it can wake a closed / backgrounded app -- e.g. the "New care request
// nearby" offer sent to nurses -- and opens the right screen when the notification is tapped.
//
// Foreground messages are deliberately ignored here: while the app is open the offer already arrives over the
// dispatch WebSocket (useProviderDispatchSocket), which would otherwise show it twice.
import { useEffect } from 'react'
import { Platform } from 'react-native'
import type { RemoteMessage } from '@react-native-firebase/messaging'
import ApiService from './apiService'
import { navigate } from '../navigation/navigationService'
import { ROUTES } from '../navigation/routes'

// Loaded lazily and never on web: @react-native-firebase is native-only and must not run at module load.
const isNative = Platform.OS !== 'web'
const firebase = () => require('@react-native-firebase/messaging') as typeof import('@react-native-firebase/messaging')

const FCM_TOKEN_URL = '/api/auth/session/fcm-token'
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

/** Send a token to the backend for the current login session. Never throws. */
async function sendToken(token: string | null | undefined) {
	if (!token) return
	try {
		await ApiService.patch(FCM_TOKEN_URL, { fcm_token: token })
	} catch (error) {
		console.warn('[push] Could not register the FCM token with the backend:', error)
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

/**
 * Notification tapped: a care-request offer lands on the provider's Today screen, whose socket delivers the offer; news about a
 * patient's home-care visit opens the booking (a scheduled order's details, or the live screen of an instant one).
 */
function handleOpened(message: RemoteMessage | null) {
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
	}
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
		let retry: ReturnType<typeof setTimeout> | undefined
		try {
			const fb = firebase()
			const messaging = fb.getMessaging()
			unsubscribeRefresh = fb.onTokenRefresh(messaging, (token) => void sendToken(token))
			unsubscribeOpened = fb.onNotificationOpenedApp(messaging, handleOpened)
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

		return () => {
			active = false
			if (retry) clearTimeout(retry)
			unsubscribeRefresh?.()
			unsubscribeOpened?.()
		}
	}, [enabled])
}
