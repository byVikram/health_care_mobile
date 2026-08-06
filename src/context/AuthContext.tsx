// src/context/AuthContext.tsx
import React, { createContext, useState, useEffect, useContext } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { setUnauthorizedHandler } from '../services/apiService'

export type UserRole = 'doctor' | 'patient' | 'pharmacy' | 'radiology' | 'laboratory'

export interface AuthUser {
	id?: string
	name: string
	email?: string
	avatar?: string
	profileCompletion?: number
}

export interface LocationData {
	address: string
	latitude: number
	longitude: number
}

export interface AuthState {
	role: UserRole | null
	user: AuthUser | null
	accessToken: string | null
	refreshToken: string | null
	notificationPromptShown: boolean
	setNotificationPromptShown: (val: boolean) => Promise<void>
	isLoading: boolean

	selectedHospital: string | null
	setSelectedHospital: (hospital: string) => void

	selectedHospitalId: string | null
	setSelectedHospitalId: (id: string | null) => void

	currentLocation: LocationData | null
	setCurrentLocation: (loc: LocationData | null) => void

	setAuth: (role: UserRole, user: AuthUser, accessToken: string, refreshToken: string, notificationPromptShown?: boolean) => Promise<void>

	updateUser: (updates: Partial<AuthUser>) => Promise<void>

	clearAuth: () => Promise<void>
}

const AuthContext = createContext<AuthState>({} as AuthState)

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
	const [role, setRole] = useState<UserRole | null>(null)
	const [user, setUser] = useState<AuthUser | null>(null)
	const [accessToken, setAccessToken] = useState<string | null>(null)
	const [refreshToken, setRefreshToken] = useState<string | null>(null)
	const [notificationPromptShown, setNotificationPromptShownState] = useState<boolean>(false)
	const [isLoading, setIsLoading] = useState(true)

	const [selectedHospital, setSelectedHospitalState] = useState<string | null>(null)
	const [selectedHospitalId, setSelectedHospitalIdState] = useState<string | null>(null)
	const [currentLocation, setCurrentLocationState] = useState<LocationData | null>(null)

	const clearAuthState = () => {
		setRole(null)
		setUser(null)
		setAccessToken(null)
		setRefreshToken(null)
		setNotificationPromptShownState(false)
		setSelectedHospitalState(null)
		setSelectedHospitalIdState(null)
		setCurrentLocationState(null)
	}

	const setSelectedHospital = (hospital: string) => {
		setSelectedHospitalState(hospital)
	}

	const setSelectedHospitalId = (id: string | null) => {
		setSelectedHospitalIdState(id)
	}

	const setCurrentLocation = async (loc: LocationData | null) => {
		if (loc) {
			await AsyncStorage.setItem('current_location', JSON.stringify(loc))
		} else {
			await AsyncStorage.removeItem('current_location')
		}
		setCurrentLocationState(loc)
	}

	const setNotificationPromptShown = async (val: boolean) => {
		await AsyncStorage.setItem('notification_prompt_shown', String(val))
		setNotificationPromptShownState(val)
	}

	useEffect(() => {
		const load = async () => {
			const role = await AsyncStorage.getItem('role')
			console.log('[AuthContext] active role:', role)
			const user = await AsyncStorage.getItem('user')
			const token = await AsyncStorage.getItem('access_token')
			const refresh = await AsyncStorage.getItem('refresh_token')
			const nps = await AsyncStorage.getItem('notification_prompt_shown')
			const savedLocation = await AsyncStorage.getItem('current_location')

			setRole(role as UserRole)
			setUser(user ? JSON.parse(user) : null)
			setAccessToken(token)
			setRefreshToken(refresh)
			setNotificationPromptShownState(nps === 'true')
			
			if (savedLocation) {
				try {
					setCurrentLocationState(JSON.parse(savedLocation))
				} catch (e) {
					console.error("Failed to parse saved location", e)
				}
			}

			setIsLoading(false)
		}
		load()
	}, [])

	useEffect(() => {
		setUnauthorizedHandler(clearAuthState)
		return () => setUnauthorizedHandler(null)
	}, [])

	const setAuth = async (
		role: UserRole,
		user: AuthUser,
		accessToken: string,
		refreshToken: string,
		nps: boolean = false
	) => {
		await AsyncStorage.setItem('role', role)
		await AsyncStorage.setItem('user', JSON.stringify(user))
		await AsyncStorage.setItem('access_token', accessToken)
		await AsyncStorage.setItem('refresh_token', refreshToken)
		await AsyncStorage.setItem('notification_prompt_shown', String(nps))

		setRole(role)
		setUser(user)
		setAccessToken(accessToken)
		setRefreshToken(refreshToken)
		setNotificationPromptShownState(nps)
	}

	const updateUser = async (updates: Partial<AuthUser>) => {
		const base: AuthUser = (user ?? { name: '' }) as AuthUser
		const nextUser: AuthUser = {
			...base,
			...updates,
		}

		await AsyncStorage.setItem('user', JSON.stringify(nextUser))
		setUser(nextUser)
	}

	const clearAuth = async () => {
		await AsyncStorage.multiRemove([
			'role',
			'user',
			'access_token',
			'refresh_token',
			'notification_prompt_shown',
			'current_location',
		])

		clearAuthState()
	}

	return (
		<AuthContext.Provider
			value={{
				role,
				user,
				accessToken,
				refreshToken,
				notificationPromptShown,
				setNotificationPromptShown,
				isLoading,
				selectedHospital,
				setSelectedHospital,
				selectedHospitalId,
				setSelectedHospitalId,
				currentLocation,
				setCurrentLocation,
				setAuth,
				updateUser,
				clearAuth,
			}}
		>
			{children}
		</AuthContext.Provider>
	)
}

export const useAuth = () => useContext(AuthContext)
