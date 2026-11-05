import { Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

const describe = (error: unknown) => (error instanceof Error ? error.message : String(error))

// Lazy load SecureStore only when native to prevent web runtime failures
let SecureStore: any = null
if (Platform.OS !== 'web') {
	try {
		SecureStore = require('expo-secure-store')
	} catch (error) {
		// Not silent: without the module (not installed, or missing from the installed native build) every token
		// lives in memory only and the user is signed in again on each reload / app restart.
		console.warn(
			'[secureStorage] expo-secure-store is not available, so sign-in will not survive an app restart. ' +
				'Install it and rebuild the app:',
			describe(error)
		)
		SecureStore = null
	}
}

// Fail closed: if the platform keystore is unavailable or errors on a NATIVE
// device, tokens are kept in memory only -- never written to plaintext
// AsyncStorage. The session then lasts until the app process ends and the user
// signs in again, which is far better than leaving a refresh token readable on
// disk. (Web has no keystore and is not a supported target; it keeps using
// AsyncStorage so the web build doesn't crash.)
const memoryStore = new Map<string, string>()

const usesAsyncStorage = () => Platform.OS === 'web'

export const secureStorage = {
	async getItem(key: string): Promise<string | null> {
		if (usesAsyncStorage()) return await AsyncStorage.getItem(key)
		if (SecureStore) {
			try {
				const value = await SecureStore.getItemAsync(key)
				if (value != null) return value
			} catch (error) {
				console.warn('[secureStorage] getItem failed, using in-memory value only:', describe(error))
			}
		}
		return memoryStore.get(key) ?? null
	},

	async setItem(key: string, value: string): Promise<void> {
		if (usesAsyncStorage()) {
			await AsyncStorage.setItem(key, value)
			return
		}
		if (SecureStore) {
			try {
				await SecureStore.setItemAsync(key, value)
				memoryStore.delete(key)
				return
			} catch (error) {
				console.warn('[secureStorage] setItem failed, keeping value in memory only:', describe(error))
			}
		}
		memoryStore.set(key, value)
	},

	async deleteItem(key: string): Promise<void> {
		memoryStore.delete(key)
		if (usesAsyncStorage()) {
			await AsyncStorage.removeItem(key)
			return
		}
		if (SecureStore) {
			try {
				await SecureStore.deleteItemAsync(key)
			} catch (error) {
				console.warn('[secureStorage] deleteItem failed:', describe(error))
			}
		}
	},
}

/**
 * Reads a value that older builds kept in plain AsyncStorage (the signed-in user, the chosen location, recent places):
 * from secure storage when it is already there, otherwise from the old place -- moved into secure storage, and the
 * plaintext copy deleted, on the way. After one launch nothing readable is left on disk.
 */
export const getMigratedItem = async (key: string): Promise<string | null> => {
	const secure = await secureStorage.getItem(key)
	// On web both stores are AsyncStorage: there is nothing to move.
	if (usesAsyncStorage()) return secure
	if (secure != null) {
		await AsyncStorage.removeItem(key).catch(() => {})
		return secure
	}
	const legacy = await AsyncStorage.getItem(key)
	if (legacy == null) return null
	await secureStorage.setItem(key, legacy)
	await AsyncStorage.removeItem(key)
	return legacy
}
