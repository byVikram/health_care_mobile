// src/constants/apiUrls.ts

import { Platform } from 'react-native'

// Replace Vite's import.meta.env with Expo's process.env.EXPO_PUBLIC_
// If testing on a PHYSICAL device, change 'http://10.0.2.2:8000' and 'http://localhost:8000'
// to your computer's local IPv4 network address (e.g., 'http://192.168.1.100:8000')
const getBaseUrl = () => {
	// const url = process.env.EXPO_PUBLIC_API_ENDPOINT
	const url = "http://192.168.4.103:8000"

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
		TREATMENT_HISTORY: (id: string) => `${BASE_URL}/api/treatments/patient/${id}/history`,
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
	RADIOLOGY_PROFILE: {
		SEARCH: `${BASE_URL}/api/radiology/search`, // Add this line
		DETAILS: `${BASE_URL}/api/radiology/profile`,
		UPDATE: `${BASE_URL}/api/radiology/profile`,
		SCAN_TYPES: `${BASE_URL}/api/radiology/scan-types`,
		SCANS: `${BASE_URL}/api/radiology/scans`,
		BOOKINGS: `${BASE_URL}/api/radiology/bookings`,
		BOOKING_DETAIL: (id: string) => `${BASE_URL}/api/radiology/bookings/${id}`,
		SUBMIT_QUOTE: (id: string) => `${BASE_URL}/api/radiology/bookings/${id}/quote`,
		VERIFY_PRESCRIPTION: (id: string) => `${BASE_URL}/api/radiology/bookings/${id}/verify`,
		UPLOAD_REPORT: (id: string) => `${BASE_URL}/api/radiology/bookings/${id}/report`,
	},
	LABORATORY_PROFILE: {
		DETAILS: `${BASE_URL}/api/laboratory/profile`,
		UPDATE: `${BASE_URL}/api/laboratory/profile`,
		TEST_TYPES: `${BASE_URL}/api/laboratory/test-types`,
		TESTS: `${BASE_URL}/api/laboratory/tests`,
	},

	LABORATORY: {
		SEARCH: `${BASE_URL}/api/laboratory/search`,

		PROFILE: `${BASE_URL}/api/laboratory/profile`,
		DETAILS: `${BASE_URL}/api/laboratory/details`,

		TEST_TYPES: `${BASE_URL}/api/laboratory/test-types`,
		TESTS: `${BASE_URL}/api/laboratory/tests`,

		BOOKINGS: `${BASE_URL}/api/laboratory/bookings`,
		BOOKING_DETAIL: (id: string) => `${BASE_URL}/api/laboratory/bookings/${id}`,

		BOOKING_ITEMS: (bookingId: string) => `${BASE_URL}/api/laboratory/bookings/${bookingId}/items`,

		REPORTS: `${BASE_URL}/api/laboratory/reports`,
		UPLOAD_REPORT: (bookingId: string) => `${BASE_URL}/api/laboratory/bookings/${bookingId}/report`,

		VERIFY_PRESCRIPTION: (bookingId: string) => `${BASE_URL}/api/laboratory/bookings/${bookingId}/verify`,
		TESTS_BY_PUBLIC_ID: (publicId: string) => `${BASE_URL}/api/laboratories/${publicId}/tests`,
	},

	// Add inside API_ENDPOINTS in apiUrls.ts
	LOCATIONS: {
		LIST: `${BASE_URL}/api/locations`,
	},
}
