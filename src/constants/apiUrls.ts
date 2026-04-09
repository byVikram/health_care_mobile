// src/constants/apiUrls.ts

import { Platform } from 'react-native';

// Replace Vite's import.meta.env with Expo's process.env.EXPO_PUBLIC_
// If testing on a PHYSICAL device, change 'http://10.0.2.2:8000' and 'http://localhost:8000' 
// to your computer's local IPv4 network address (e.g., 'http://192.168.1.100:8000')
const getBaseUrl = () => {
	if (process.env.EXPO_PUBLIC_API_ENDPOINT) return process.env.EXPO_PUBLIC_API_ENDPOINT;
	return Platform.OS === 'android' ? 'http://127.0.0.1:8000' : 'http://127.0.0.1:8000';
};

export const BASE_URL = getBaseUrl();

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
	},
	DOCTOR_PROFILE: {
		DETAILS: `${BASE_URL}/api/doctors/details`,
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
	APPOINTMENTS: {
		GET: `${BASE_URL}/api/appointments`,
		CREATE: `${BASE_URL}/api/appointments`,
		GET_BY_ID: (id: number) => `${BASE_URL}/api/appointments/${id}`,
		UPDATE: `${BASE_URL}/api/appointments/update-status`,
	},
}
