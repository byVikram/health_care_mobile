// src/constants/apiUrls.ts

import { Platform } from 'react-native'

// Replace Vite's import.meta.env with Expo's process.env.EXPO_PUBLIC_
// If testing on a PHYSICAL device, change 'http://10.0.2.2:8000' and 'http://localhost:8000'
// to your computer's local IPv4 network address (e.g., 'http://192.168.1.100:8000')
const getBaseUrl = () => {
	const url = process.env.EXPO_PUBLIC_API_ENDPOINT
	// const url = "http://192.168.29.250:8000"

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
		SESSIONS: `${BASE_URL}/api/auth/sessions`,
		SESSION_LOGOUT: (publicId: string) => `${BASE_URL}/api/auth/sessions/${publicId}`,
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
		PERSONAL_DETAILS: `${BASE_URL}/api/doctors/personal-details`,
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
		PRE_INTAKE: (id: string) => `${BASE_URL}/api/appointments/${id}/pre-intake`,
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
		ADDRESSES: `${BASE_URL}/api/patients/me/addresses`,
		ADDRESS_BY_ID: (id: string) => `${BASE_URL}/api/patients/me/addresses/${id}`,
	},
	PHARMACY: {
		ME: `${BASE_URL}/api/pharmacies/me`,
		DETAILS: `${BASE_URL}/api/pharmacies/me/details`,
        ME_DETAILS: `${BASE_URL}/api/pharmacies/me/details`,
	},
	PHARMACY_ORDERS: {
		CREATE: `${BASE_URL}/api/pharmacy-orders`,
		LIST: `${BASE_URL}/api/pharmacy-orders`,
		LIST_BY_PHARMACY: `${BASE_URL}/api/pharmacies`, // New endpoint to get orders fr the logged-in pharmacy
		GET_BY_ID: (id: string) => `${BASE_URL}/api/pharmacy-orders/${id}`,
		UPDATE_STATUS: (id: string) => `${BASE_URL}/api/pharmacy-orders/${id}/status`,
		UPDATE_MEDICINES: (id: string) => `${BASE_URL}/api/pharmacy-orders/${id}/medicines`,
		SEND_REMINDER: (id: string) => `${BASE_URL}/api/pharmacy-orders/${id}/remind`,
	},
	// Add inside API_ENDPOINTS in apiUrls.ts
	LOCATIONS: {
		LIST: `${BASE_URL}/api/locations`,
	},
}

