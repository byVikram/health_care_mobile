// src/services/notificationEvents.ts
//
// "A new notification just arrived" -- sent when a push comes in while the app is open, so the bell on Home and the Notifications
// screen (if it is open) refresh at once instead of waiting for the next focus.
import { DeviceEventEmitter } from 'react-native'

const NOTIFICATIONS_CHANGED = 'karolahealth:notifications-changed'

export function emitNotificationsChanged() {
	DeviceEventEmitter.emit(NOTIFICATIONS_CHANGED)
}

/** Subscribes to new notifications; returns the unsubscribe function. */
export function onNotificationsChanged(listener: () => void): () => void {
	const subscription = DeviceEventEmitter.addListener(NOTIFICATIONS_CHANGED, listener)
	return () => subscription.remove()
}
