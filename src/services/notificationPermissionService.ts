// src/services/notificationPermissionService.ts
import { PermissionsAndroid, Platform } from 'react-native'
import ApiService from './apiService'
import { API_ENDPOINTS } from '../constants/apiUrls'

let backendPromptMarked = false

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
	if (backendPromptMarked) {
		console.log('[NOTIFICATION PERMISSION] Backend already updated in this session, skipping call.')
		return true
	}
	try {
		backendPromptMarked = true
		console.log('[NOTIFICATION PERMISSION] Updating notification_prompt_shown = true on backend...')
		// An empty JSON body, not none: Android's HTTP client can refuse a PATCH that has no body at all.
		await ApiService.patch(API_ENDPOINTS.AUTH.SESSION_NOTIFICATION_PROMPT, {})
		console.log('[NOTIFICATION PERMISSION SUCCESS] Session notification_prompt_shown updated.')
		return true
	} catch (error) {
		console.error('[NOTIFICATION PERMISSION ERROR] Failed to update backend prompt flag:', error)
		return false
	}
}
