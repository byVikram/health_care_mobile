// src/features/ancillary/staff/availability/goOnlinePermissions.ts
//
// What a provider must allow before going online ("Before you go online" screen): location while the app is
// in use (the dispatch needs the position to offer nearby requests) and notifications (offers reach a locked
// phone through push). `ensureGoOnlinePermissions()` is the gate: resolves true straight away when both are
// granted, otherwise opens GoOnlinePermissionsPage and resolves with what the provider decided there.
import { Linking, PermissionsAndroid, Platform } from 'react-native'
import * as Location from 'expo-location'
import { requestNativeOSPermission } from '../../../../services/notificationPermissionService'
import { navigate } from '../../../../navigation/navigationService'
import { ROUTES } from '../../../../navigation/routes'

export type GoOnlinePermissionState = {
	location: boolean
	notifications: boolean
	/** Device location switch (GPS) is on. Without it a granted permission still gives no position. */
	locationServices: boolean
	/** The OS will no longer show its prompt for location: the provider has to use Settings. */
	locationBlocked: boolean
}

const firebase = () => require('@react-native-firebase/messaging') as typeof import('@react-native-firebase/messaging')

const notificationsGranted = async (): Promise<boolean> => {
	try {
		if (Platform.OS === 'web') return true
		if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
			return await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS)
		}
		const fb = firebase()
		const status = await fb.hasPermission(fb.getMessaging())
		return status === fb.AuthorizationStatus.AUTHORIZED || status === fb.AuthorizationStatus.PROVISIONAL
	} catch {
		// Firebase not configured for this build: do not lock the provider out because we cannot tell.
		return true
	}
}

export const getGoOnlinePermissionState = async (): Promise<GoOnlinePermissionState> => {
	const [loc, notifications, services] = await Promise.all([
		Location.getForegroundPermissionsAsync().catch(() => null),
		notificationsGranted(),
		Location.hasServicesEnabledAsync().catch(() => true),
	])
	return {
		location: loc?.status === 'granted',
		notifications,
		locationServices: services,
		locationBlocked: !!loc && loc.status !== 'granted' && loc.canAskAgain === false,
	}
}

export const isReadyToGoOnline = (s: GoOnlinePermissionState) => s.location && s.locationServices && s.notifications

export const requestLocationPermission = async () => {
	await Location.requestForegroundPermissionsAsync()
}

export const requestNotificationPermission = async () => {
	if (Platform.OS === 'android') {
		await requestNativeOSPermission()
		return
	}
	try {
		const fb = firebase()
		await fb.requestPermission(fb.getMessaging())
	} catch {
		// Nothing more to do: the state check shows it is still missing.
	}
}

export const openAppSettings = () => {
	void Linking.openSettings()
}

// ── The gate ────────────────────────────────────────────────────────────────

let pending: ((ok: boolean) => void) | null = null

/** Called by GoOnlinePermissionsPage when the provider confirms ("Go online") or leaves the screen. */
export const resolveGoOnlineGate = (ok: boolean) => {
	const resolve = pending
	pending = null
	resolve?.(ok)
}

/** true = the provider may go online now (permissions granted); false = they backed out. */
export const ensureGoOnlinePermissions = async (): Promise<boolean> => {
	if (isReadyToGoOnline(await getGoOnlinePermissionState())) return true
	resolveGoOnlineGate(false)
	return new Promise<boolean>((resolve) => {
		pending = resolve
		navigate(ROUTES.STACK.GO_ONLINE_PERMISSIONS)
	})
}
