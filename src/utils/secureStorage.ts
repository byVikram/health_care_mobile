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
				if (__DEV__) {
					console.warn('[secureStorage] deleteItem fallback to AsyncStorage:', error)
				}
			}
		}
		await AsyncStorage.removeItem(key)
	},
}
