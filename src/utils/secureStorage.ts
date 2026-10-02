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

// Fail closed: if the platform keystore is unavailable or errors on a NATIVE
// device, tokens are kept in memory only -- never written to plaintext
// AsyncStorage. The session then lasts until the app process ends and the user
// signs in again, which is far better than leaving a refresh token readable on
// disk. (Web has no keystore and is not a supported target; it keeps using
// AsyncStorage so the web build doesn't crash.)
const memoryStore = new Map<string, string>()

const usesAsyncStorage = () => Platform.OS === 'web'

const describe = (error: unknown) => (error instanceof Error ? error.message : String(error))

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
