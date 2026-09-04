// src/context/AuthContext.tsx
import React, { createContext, useState, useEffect, useContext } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { setUnauthorizedHandler } from '../services/apiService'

export type UserRole = 'doctor' | 'patient' | 'pharmacy' | 'radiology' | 'laboratory' | 'ancillary' | 'nurse'

// Canonical specialty IDs from lookup_ancillary_specialties.public_id
export type AncillarySpecialty =
	| 'nursing-care'
	| 'physiotherapy'
	| 'rehab-care'
	| 'elder-day-care'
	| 'medical-equipment'
	| string

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

	// Ancillary specialty — persisted to AsyncStorage so it survives reload/restart
	// Format: matches lookup_ancillary_specialties.public_id (e.g. "physiotherapy", "nursing-care")
	// null = not an ancillary user, or specialty not yet loaded
	ancillarySpecialty: AncillarySpecialty | null
	setAncillarySpecialty: (specialty: AncillarySpecialty | null) => Promise<void>

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
	const [ancillarySpecialty, setAncillarySpecialtyState] = useState<AncillarySpecialty | null>(null)

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
		setAncillarySpecialtyState(null)
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

	/**
	 * Persist and update ancillary specialty in both AsyncStorage and React state.
	 * This is the source of truth for the dashboard — it must be called after
	 * the provider profile is fetched at login so specialty survives app restarts.
	 */
	const setAncillarySpecialty = async (specialty: AncillarySpecialty | null) => {
		if (specialty) {
			await AsyncStorage.setItem('user_specialty', specialty)
		} else {
			await AsyncStorage.removeItem('user_specialty')
		}
		setAncillarySpecialtyState(specialty)
	}

	useEffect(() => {
		const load = async () => {
			const savedRole = await AsyncStorage.getItem('role')
			console.log('[AuthContext] active role:', savedRole)
			const savedUser = await AsyncStorage.getItem('user')
			const token = await AsyncStorage.getItem('access_token')
			const refresh = await AsyncStorage.getItem('refresh_token')
			const nps = await AsyncStorage.getItem('notification_prompt_shown')
			const savedLocation = await AsyncStorage.getItem('current_location')
			// Load persisted specialty (survives restarts)
			const savedSpecialty = await AsyncStorage.getItem('user_specialty')

			setRole(savedRole as UserRole)
			setUser(savedUser ? JSON.parse(savedUser) : null)
			setAccessToken(token)
			setRefreshToken(refresh)
			setNotificationPromptShownState(nps === 'true')
			if (savedSpecialty) {
				setAncillarySpecialtyState(savedSpecialty as AncillarySpecialty)
				console.log('[AuthContext] restored ancillary specialty:', savedSpecialty)
			}

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
			'ancillary_capabilities',
			'ancillary_license',
			'ancillary_location',
			'user_specialty',
			'ancillary_verification_status',
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
				ancillarySpecialty,
				setAncillarySpecialty,
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

/**
 * Convenience hook for ancillary staff — returns specialty-aware labels.
 * e.g. { specialtyLabel: 'Physiotherapist', specialtyPossessive: 'Physiotherapy', specialtyId: 'physiotherapy' }
 */
export const useAncillarySpecialty = () => {
	const { ancillarySpecialty } = useContext(AuthContext)

	const specialtyId = ancillarySpecialty || 'nursing-care'

	const labelMap: Record<string, { role: string; adjective: string; icon: string }> = {
		'nursing-care':      { role: 'Nurse',            adjective: 'Nursing',        icon: 'medical-bag' },
		'physiotherapy':     { role: 'Physiotherapist',  adjective: 'Physiotherapy',  icon: 'run-fast' },
		'rehab-care':        { role: 'Rehab Therapist',  adjective: 'Rehab',          icon: 'wheelchair-accessibility' },
		'elder-day-care':    { role: 'Care Worker',      adjective: 'Elder Day Care', icon: 'account-heart' },
		'medical-equipment': { role: 'Technician',       adjective: 'Equipment',      icon: 'toolbox' },
	}

	const info = labelMap[specialtyId] ?? labelMap['nursing-care']

	return {
		specialtyId,
		/** e.g. "Physiotherapist" or "Nurse" */
		roleLabel: info.role,
		/** e.g. "Physiotherapy" or "Nursing" — for "X Appointments", "X Earnings" */
		adjective: info.adjective,
		/** e.g. "Physiotherapy Appointments" */
		appointments: `${info.adjective} Appointments`,
		/** e.g. "Physiotherapy Earnings" */
		earnings: `${info.adjective} Earnings`,
		/** e.g. "Physiotherapy Booking History" */
		history: `${info.adjective} Booking History`,
		/** e.g. "Physiotherapy Orders" */
		orders: `${info.adjective} Orders`,
		icon: info.icon,
		isNursing: specialtyId === 'nursing-care',
		isPhysio: specialtyId === 'physiotherapy',
	}
}
