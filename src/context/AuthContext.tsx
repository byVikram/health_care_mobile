// src/context/AuthContext.tsx
import React, { createContext, useState, useEffect, useContext } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { setUnauthorizedHandler } from '../services/apiService'

export type UserRole = 'doctor' | 'patient' | 'pharmacy' | 'radiology'

export interface AuthUser {
	id?: string
	name: string
	email?: string
	avatar?: string
	profileCompletion?: number
}

export interface AuthState {
	role: UserRole | null
	user: AuthUser | null
	accessToken: string | null
	refreshToken: string | null
	isLoading: boolean

	selectedHospital: string | null
	setSelectedHospital: (hospital: string) => void

	// ✅ NEW — hospital ID used for filtering appointments & fetching slots
	selectedHospitalId: string | null
	setSelectedHospitalId: (id: string | null) => void

	setAuth: (role: UserRole, user: AuthUser, accessToken: string, refreshToken: string) => Promise<void>

	updateUser: (updates: Partial<AuthUser>) => Promise<void>

	clearAuth: () => Promise<void>
}

const AuthContext = createContext<AuthState>({} as AuthState)

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
	const [role, setRole] = useState<UserRole | null>(null)
	const [user, setUser] = useState<AuthUser | null>(null)
	const [accessToken, setAccessToken] = useState<string | null>(null)
	const [refreshToken, setRefreshToken] = useState<string | null>(null)
	const [isLoading, setIsLoading] = useState(true)

	const [selectedHospital, setSelectedHospitalState] = useState<string | null>(null)
	const [selectedHospitalId, setSelectedHospitalIdState] = useState<string | null>(null) // ✅ NEW

	const clearAuthState = () => {
		setRole(null)
		setUser(null)
		setAccessToken(null)
		setRefreshToken(null)
		setSelectedHospitalState(null)
		setSelectedHospitalIdState(null)
	}

	const setSelectedHospital = (hospital: string) => {
		setSelectedHospitalState(hospital)
	}

	// ✅ NEW
	const setSelectedHospitalId = (id: string | null) => {
		setSelectedHospitalIdState(id)
	}

	useEffect(() => {
		const load = async () => {
			const role = await AsyncStorage.getItem('role')
			const user = await AsyncStorage.getItem('user')
			const token = await AsyncStorage.getItem('access_token')

			setRole(role as UserRole)
			setUser(user ? JSON.parse(user) : null)
			setAccessToken(token)

			setIsLoading(false)
		}
		load()
	}, [])

	useEffect(() => {
		setUnauthorizedHandler(clearAuthState)
		return () => setUnauthorizedHandler(null)
	}, [])

	const setAuth = async (role: UserRole, user: AuthUser, accessToken: string, refreshToken: string) => {
		await AsyncStorage.setItem('role', role)
		await AsyncStorage.setItem('user', JSON.stringify(user))
		await AsyncStorage.setItem('access_token', accessToken)

		setRole(role)
		setUser(user)
		setAccessToken(accessToken)
		setRefreshToken(refreshToken)
	}

	const updateUser = async (updates: Partial<AuthUser>) => {
		const nextUser = {
			...(user ?? { name: '' }),
			...updates,
		}

		await AsyncStorage.setItem('user', JSON.stringify(nextUser))
		setUser(nextUser)
	}

	const clearAuth = async () => {
		await AsyncStorage.clear()
		clearAuthState()
	}

	return (
		<AuthContext.Provider
			value={{
				role,
				user,
				accessToken,
				refreshToken,
				isLoading,
				selectedHospital,
				setSelectedHospital,
				selectedHospitalId,
				setSelectedHospitalId,
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
