// src/constants/apiUrls.ts

import { Platform } from 'react-native'

// Replace Vite's import.meta.env with Expo's process.env.EXPO_PUBLIC_
// If testing on a PHYSICAL device, change 'http://10.0.2.2:8000' and 'http://localhost:8000'
// to your computer's local IPv4 network address (e.g., 'http://192.168.1.100:8000')
const getBaseUrl = () => {
	const url = process.env.EXPO_PUBLIC_API_ENDPOINT

	if (!url) {
		throw new Error('API URL not found. Check .env file')
	}

	return url
}

export const BASE_URL = getBaseUrl()

export const API_ENDPOINTS = {
	AUTH: {
		SEND_OTP: `${BASE_URL}/api/auth/send-otp`,
		VERIFY_OTP: `${BASE_URL}/api/auth/verify-otp`,
		LOGOUT: `${BASE_URL}/api/auth/logout`,
		GET_ROLES: `${BASE_URL}/api/auth/get-roles`,
		CREATE_USER: `${BASE_URL}/api/auth/create-user`,
	},
	DOCTORS: {
		SEARCH: `${BASE_URL}/api/doctors`,
		DETAIL: (id: string) => `${BASE_URL}/api/doctors/${id}`,
		AVAILABILITY: `${BASE_URL}/api/doctors/availability`,
		OVERRIDES: `${BASE_URL}/api/doctors/availability/overrides`,
		HOSPITALS: `${BASE_URL}/api/doctors/hospitals`,
	},
	DOCTORS_FAVOURITES: {
		GET: `${BASE_URL}/api/doctors/favourites`,
		TOGGLE: (publicId: string) => `${BASE_URL}/api/doctors/favourites/${publicId}`,
	},
	DOCTOR_PROFILE: {
		DETAILS: `${BASE_URL}/api/doctors/details`,
		PROFESSIONAL_DETAILS: `${BASE_URL}/api/doctors/professional-details`,
		HOSPITALS: `${BASE_URL}/api/doctors/hospitals`,
		ACHIEVEMENTS: `${BASE_URL}/api/doctors/achievements`,
		DELETE_ACCOUNT: `${BASE_URL}/api/doctors/profile`,
	},
	SPECIALITIES: {
		LIST: `${BASE_URL}/api/specialities`,
	},
	USERS: {
		GET: `${BASE_URL}/api/users`,
		CREATE: `${BASE_URL}/api/users`,
		UPDATE: (id: string | number) => `${BASE_URL}/api/users/${id}`,
		DELETE: (id: string | number) => `${BASE_URL}/api/users/${id}`,
	},
	// APPOINTMENTS: {
	//   GET: `${BASE_URL}/api/appointments`,
	//   CREATE: `${BASE_URL}/api/appointments`,
	//   GET_BY_ID: (id: number) => `${BASE_URL}/api/appointments/${id}`,

	//   UPDATE: `${BASE_URL}/api/appointments/update-status`,
	// },
	APPOINTMENTS: {
		GET: `${BASE_URL}/api/appointments`,
		CREATE: `${BASE_URL}/api/appointments`,
		GET_BY_ID: (id: string) => `${BASE_URL}/api/appointments/${id}`, // Add this
		UPDATE: `${BASE_URL}/api/appointments/update-status`,
		RESCHEDULE: `${BASE_URL}/api/appointments/reschedule`,
		STATUSES: `${BASE_URL}/api/appointments/statuses`,
		REFER: `${BASE_URL}/api/appointments/refer`,
	},
	// constants/apiUrls.ts  — add inside API_ENDPOINTS

	PATIENT: {
		ME: `${BASE_URL}/api/patients/me`,
		DETAILS: `${BASE_URL}/api/patients/me/details`,
		GET_BY_PUBLIC_ID: (publicId: string) => `${BASE_URL}/api/patients/${publicId}/details`,
		GET_BY_ID: (id: string) => `${BASE_URL}/api/patients/${id}/details`,
		VITALS_CREATE: `${BASE_URL}/api/patients/vitals`,
		VITALS_LATEST: (id: string) => `${BASE_URL}/api/patients/${id}/vitals/latest`,
		VITALS_HISTORY: (id: string) => `${BASE_URL}/api/patients/${id}/vitals`,
		REPORTS: (id: string) => `${BASE_URL}/api/patients/${id}/reports`,
		REPORTS_CREATE: `${BASE_URL}/api/patients/reports`,
	},
	PHARMACY: {
		ME: `${BASE_URL}/api/pharmacies/me`,
		DETAILS: `${BASE_URL}/api/pharmacies/me/details`,
	},
	// Add inside API_ENDPOINTS in apiUrls.ts
	LOCATIONS: {
		LIST: `${BASE_URL}/api/locations`,
	},
}

