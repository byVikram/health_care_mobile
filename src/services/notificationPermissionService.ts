// src/services/notificationPermissionService.ts
import { PermissionsAndroid, Platform } from 'react-native'
import ApiService from './apiService'

export async function requestNativeOSPermission(): Promise<boolean> {
	try {
		console.log('[NOTIFICATION PERMISSION] Requesting native OS notification permission...')

		if (Platform.OS === 'android' && Platform.Version >= 33) {
			const granted = await PermissionsAndroid.request(
				PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
			)
			console.log('[NOTIFICATION PERMISSION] Android POST_NOTIFICATIONS result:', granted)
			return granted === PermissionsAndroid.RESULTS.GRANTED
		}

		return true
	} catch (error) {
		console.error('[NOTIFICATION PERMISSION ERROR] Permission request failed:', error)
		return false
	}
}

export async function markNotificationPromptShownOnBackend(): Promise<boolean> {
	try {
		console.log('[NOTIFICATION PERMISSION] Updating notification_prompt_shown = true on backend...')
		await ApiService.patch('/api/auth/session/notification-prompt', undefined)
		console.log('[NOTIFICATION PERMISSION SUCCESS] Session notification_prompt_shown updated.')
		return true
	} catch (error) {
		console.error('[NOTIFICATION PERMISSION ERROR] Failed to update backend prompt flag:', error)
		return false
	}
}
