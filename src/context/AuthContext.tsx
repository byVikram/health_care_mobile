// src/context/AuthContext.tsx
import React, { createContext, useState, useEffect, useContext } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { navigationRef } from '../navigation/AppNavigator'

export type UserRole = 'doctor' | 'patient'

export interface AuthUser {
	id?: string
	name: string
	email?: string
	avatar?: string
	profileCompletion?: number
	profilePath?: string
	showQr?: boolean
}

export interface AuthState {
	role: UserRole | null
	user: AuthUser | null
	accessToken: string | null
	refreshToken: string | null
	isLoading: boolean
	setAuth: (role: UserRole, user: AuthUser, accessToken: string, refreshToken: string) => Promise<void>
	clearAuth: () => Promise<void>
}

const AuthContext = createContext<AuthState>({
	role: null,
	user: null,
	accessToken: null,
	refreshToken: null,
	isLoading: true,
	setAuth: async () => {},
	clearAuth: async () => {},
})

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
	const [role, setRole] = useState<UserRole | null>(null)
	const [user, setUser] = useState<AuthUser | null>(null)
	const [accessToken, setAccessToken] = useState<string | null>(null)
	const [refreshToken, setRefreshToken] = useState<string | null>(null)
	const [isLoading, setIsLoading] = useState(true)

	useEffect(() => {
		const loadAuthData = async () => {
			try {
				const storedRole = (await AsyncStorage.getItem('role')) as UserRole | null
				const rawUser = await AsyncStorage.getItem('user')
				const storedUser = rawUser ? JSON.parse(rawUser) : null
				const storedAccessToken = await AsyncStorage.getItem('access_token')
				const storedRefreshToken = await AsyncStorage.getItem('refresh_token')

				setRole(storedRole)
				setUser(storedUser)
				setAccessToken(storedAccessToken)
				setRefreshToken(storedRefreshToken)
			} catch (error) {
				console.error('Failed to load auth data', error)
			} finally {
				setIsLoading(false)
			}
		}

		loadAuthData()
	}, [])

	const handleSetAuth = async (
		newRole: UserRole,
		newUser: AuthUser,
		newAccessToken: string,
		newRefreshToken: string
	) => {
		try {
			await AsyncStorage.setItem('role', newRole)
			await AsyncStorage.setItem('user', JSON.stringify(newUser))
			await AsyncStorage.setItem('access_token', newAccessToken)
			await AsyncStorage.setItem('refresh_token', newRefreshToken)

			setRole(newRole)
			setUser(newUser)
			setAccessToken(newAccessToken)
			setRefreshToken(newRefreshToken)
		} catch (error) {
			console.error('Failed to set auth data', error)
		}
	}

	const handleClearAuth = async () => {
		try {
			await AsyncStorage.multiRemove([
				'role',
				'user',
				'access_token',
				'refresh_token',
			])
			setRole(null)
			setUser(null)
			setAccessToken(null)
			setRefreshToken(null)
		} catch (error) {
			console.error('Failed to clear auth data', error)
		}
	}

	return (
		<AuthContext.Provider
			value={{
				role,
				user,
				accessToken,
				refreshToken,
				isLoading,
				setAuth: handleSetAuth,
				clearAuth: handleClearAuth,
			}}
		>
			{children}
		</AuthContext.Provider>
	)
}

export const useAuth = () => useContext(AuthContext)

// Utility function to clear auth from outside React components
// (e.g. from axios interceptor)
export const clearAuthStorage = async () => {
	await AsyncStorage.multiRemove([
		'role',
		'user',
		'access_token',
		'refresh_token',
	])
	// Navigate to login screen
	if (navigationRef.current) {
		navigationRef.current.navigate('Splash')
	}
	// To actually update state, you'd trigger a global event or the app will just
	// rely on the AuthStack handling unauthenticated requests when the token is missing.
}
