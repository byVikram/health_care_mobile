import { Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

// Lazy load SecureStore only when native to prevent web runtime failures
let SecureStore: any = null
if (Platform.OS !== 'web') {
	try {
		SecureStore = require('expo-secure-store')
	} catch {
		SecureStore = null
	}
}

export const secureStorage = {
	async getItem(key: string): Promise<string | null> {
		if (Platform.OS !== 'web' && SecureStore) {
			try {
				return await SecureStore.getItemAsync(key)
			} catch (error) {
				// FIXME: this falls back to unencrypted AsyncStorage but only
				// warns in __DEV__ -- if SecureStore ever actually fails on a
				// real device, tokens silently end up unencrypted with zero
				// production visibility. Report this in production too (crash
				// reporter breadcrumb, analytics event, etc.), not just __DEV__.
				if (__DEV__) {
					console.warn('[secureStorage] getItem fallback to AsyncStorage:', error)
				}
			}
		}
		return await AsyncStorage.getItem(key)
	},

	async setItem(key: string, value: string): Promise<void> {
		if (Platform.OS !== 'web' && SecureStore) {
			try {
				await SecureStore.setItemAsync(key, value)
				return
			} catch (error) {
				// FIXME: same production-visibility gap as getItem above -- this
				// write silently lands in unencrypted AsyncStorage instead, with
				// no signal outside __DEV__.
				if (__DEV__) {
					console.warn('[secureStorage] setItem fallback to AsyncStorage:', error)
				}
			}
		}
		await AsyncStorage.setItem(key, value)
	},

	async deleteItem(key: string): Promise<void> {
		if (Platform.OS !== 'web' && SecureStore) {
			try {
				await SecureStore.deleteItemAsync(key)
				return
			} catch (error) {
				// FIXME: same production-visibility gap as getItem above -- a
				// failed secure delete falls back to AsyncStorage.removeItem with
				// no signal outside __DEV__ (harmless here since deleteItem's own
				// intent is just "make sure it's gone", but still worth knowing
				// SecureStore is unreliable on this device if it happens).
				if (__DEV__) {
					console.warn('[secureStorage] deleteItem fallback to AsyncStorage:', error)
				}
			}
		}
		await AsyncStorage.removeItem(key)
	},
}
