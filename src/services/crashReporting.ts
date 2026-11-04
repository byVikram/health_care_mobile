// src/services/crashReporting.ts
//
// One place that sends crashes and handled errors to Firebase Crashlytics. The package is loaded lazily and only on
// device, like pushNotificationService does with Firebase Messaging. It needs the native side: after pulling this change
// rebuild the app (npx expo run:android / run:ios); until a build includes it every call below is a quiet no-op.
// Report only what helps to find the bug: error objects and short
// context strings, never patient data (names, phone numbers, request or response bodies).
import { Platform } from 'react-native'

type CrashlyticsModule = typeof import('@react-native-firebase/crashlytics')

let cached: CrashlyticsModule | null | undefined

const crashlytics = (): CrashlyticsModule | null => {
	if (cached !== undefined) return cached
	cached = null
	if (Platform.OS === 'web') return cached
	try {
		cached = require('@react-native-firebase/crashlytics') as CrashlyticsModule
	} catch {
		// Not installed in this build: reporting stays off.
	}
	return cached
}

const toError = (error: unknown): Error => (error instanceof Error ? error : new Error(String(error)))

/** Send a handled or caught error. `context` says where it happened ("ErrorBoundary", "global handler"...). Never throws. */
export function reportError(error: unknown, context?: string) {
	try {
		const module = crashlytics()
		if (!module) return
		const client = module.getCrashlytics()
		if (context) module.log(client, context)
		module.recordError(client, toError(error))
	} catch {
		// Reporting must never be the thing that crashes the app.
	}
}

/**
 * Report errors nothing else catches (a throw in an event handler or a timer) while keeping React Native's own
 * handling (red box in development, native crash in release).
 */
export function installGlobalErrorReporting() {
	const errorUtils = (
		globalThis as { ErrorUtils?: { getGlobalHandler: () => unknown; setGlobalHandler: (h: unknown) => void } }
	).ErrorUtils
	if (!errorUtils) return
	const previous = errorUtils.getGlobalHandler() as (error: unknown, isFatal?: boolean) => void
	errorUtils.setGlobalHandler((error: unknown, isFatal?: boolean) => {
		reportError(error, isFatal ? 'fatal JS error' : 'JS error')
		previous?.(error, isFatal)
	})
}
