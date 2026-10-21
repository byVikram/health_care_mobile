// src/features/onboarding/useFirstLaunchPermissions.ts
//
// First launch on a fresh install: Location, then Notifications, then Camera, each as its own plain Android system
// dialog (Precise / Approximate + While using the app / Only this time / Don't allow; Allow / Don't allow) -- no
// custom screen, sheet or modal. Android grants nothing at install time, so without this the dialogs would only
// appear when a feature happens to need the permission. The second request waits for the first dialog to be
// answered (Android drops a dialog that opens on top of another).
//
// SMS is deliberately not asked: the OTP boxes use Android's SMS autofill (autoComplete="sms-otp"), which needs
// no SMS permission, and Google Play restricts READ_SMS / RECEIVE_SMS to default-SMS-handler apps.
//
// Runs once per install (flag in AsyncStorage, so a reinstalled APK asks again) and only once the app is ready
// (`enabled`). Nothing blocks the UI: a denied permission just means limited features, and location is asked
// for again in context (getCurrentLocation), which offers App Settings once Android stops showing the dialog.

import { useEffect, useRef } from 'react'
import { PermissionsAndroid, Platform, type Permission } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Location from 'expo-location'
import {
	getGoOnlinePermissionState,
	requestNotificationPermission,
} from '../ancillary/staff/availability/goOnlinePermissions'

const STORAGE_KEY = 'first_launch_permissions_done'

/** Android only: one system dialog for `permission` (nothing to ask on other platforms or when already granted). */
const requestAndroidPermission = async (permission: Permission) => {
	if (Platform.OS !== 'android') return
	if (!(await PermissionsAndroid.check(permission))) await PermissionsAndroid.request(permission)
}

export function useFirstLaunchPermissions(enabled: boolean) {
	const startedRef = useRef(false)

	useEffect(() => {
		if (!enabled || startedRef.current) return
		startedRef.current = true

		const run = async () => {
			try {
				if ((await AsyncStorage.getItem(STORAGE_KEY)) === 'true') return
				// 1. Location
				const location = await Location.getForegroundPermissionsAsync()
				if (location.status !== 'granted' && location.canAskAgain) {
					await Location.requestForegroundPermissionsAsync()
				}
				// 2. Notifications (after the location dialog has been answered)
				if (!(await getGoOnlinePermissionState()).notifications) {
					await requestNotificationPermission()
				}
				// 3. Camera (after the notification dialog has been answered)
				await requestAndroidPermission(PermissionsAndroid.PERMISSIONS.CAMERA)
				await AsyncStorage.setItem(STORAGE_KEY, 'true')
			} catch {
				// Never block or crash the app on a permission prompt; it is simply offered again next cold start.
			}
		}
		run()
	}, [enabled])
}
