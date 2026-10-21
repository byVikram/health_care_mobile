import AsyncStorage from '@react-native-async-storage/async-storage'
import { secureStorage } from './secureStorage'

// Every AsyncStorage key that holds data belonging to the signed-in user (profile,
// location, specialty, ancillary onboarding state...). The single source of truth
// for "what must not outlive a session" -- add a key here whenever a new
// AsyncStorage.setItem for user data is introduced.
export const LOCAL_SESSION_ASYNC_KEYS = [
	'role',
	'user',
	'notification_prompt_shown',
	'current_location',
	'user_specialty',
	'ancillary_capabilities',
	'ancillary_license',
	'ancillary_location',
	'ancillary_verification_status',
	'ancillary_subspecialty_id',
	'ancillary_setup_completed',
	// Written by the old patient-profile picker; may still hold the previous user's family list.
	'family_members',
] as const

/**
 * Remove all locally stored session data: both tokens (secure storage) and every
 * cached user value. Used by BOTH the explicit logout (AuthContext.clearAuth) and
 * the forced logout after a rejected token refresh (apiService), so the two paths
 * can never drift apart and leave PHI behind.
 */
export const purgeLocalSession = async (): Promise<void> => {
	await secureStorage.deleteItem('access_token')
	await secureStorage.deleteItem('refresh_token')
	await AsyncStorage.multiRemove([...LOCAL_SESSION_ASYNC_KEYS])
}
