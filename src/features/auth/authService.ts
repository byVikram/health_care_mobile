// src/features/auth/authService.ts

import ApiService from '../../services/apiService'
import { API_ENDPOINTS } from '../../constants/apiUrls'



export interface SendOtpResponse {
	success: boolean
	message: string
	data: Record<string, unknown>
}

export interface VerifyOtpUser {
	id: string
	name: string
	email: string
	role: 'doctor' | 'patient'
}

export interface VerifyOtpResponse {
	success: boolean
	message: string
	data: {
		user: VerifyOtpUser
		access_token: string
		refresh_token: string
		token_type: string
		expires_in: number
	}
}

export interface VerifyRolesResponse {
	success: boolean
	message: string
	data: {
		id: string
		label: string
	}[]   // ✅ FIXED (array)
}

export interface CreateUserRequest {
	contact_number: string
	email: string
	name: string
	role_id: string
}

export interface VerifyUserCreationResponse {
	success: boolean
	message: string
}

export const sendOtp = async (contactNumber: string): Promise<SendOtpResponse> => {
	
	const res = await ApiService.post<SendOtpResponse>(API_ENDPOINTS.AUTH.SEND_OTP, { contact_number: contactNumber })
	console.log('sendOtp response:', res)  
	return res.data

}

export interface VerifyOtpRequest {
	contact_number: string
	otp: string

	device_type: string
	device_name?: string | null

	fcm_token?: string | null

	device_metadata?: Record<string, unknown>
}

export const verifyOtp = async (
	data: VerifyOtpRequest
): Promise<VerifyOtpResponse> => {
	const res = await ApiService.post<VerifyOtpResponse>(
		API_ENDPOINTS.AUTH.VERIFY_OTP,
		data
	)

	return res.data
}

export const getRoles = async (): Promise<VerifyRolesResponse> => {
	const res = await ApiService.get<VerifyRolesResponse>(API_ENDPOINTS.AUTH.GET_ROLES)
	return res.data
}

export const createUser = async (data: CreateUserRequest): Promise<VerifyUserCreationResponse> => {
	const res = await ApiService.post<VerifyUserCreationResponse>(API_ENDPOINTS.AUTH.CREATE_USER, data)
	return res.data
}

export interface Session {
	id: string
	device_type: string
	device_name: string
	ip_address: string
	login_at: string
	last_active_at: string
	is_active: boolean
	is_current: boolean
}

export interface SessionsResponse {
	success: boolean
	message: string
	data: Session[]
}

export interface SessionLogoutResponse {
	success: boolean
	message: string
}

export const getSessions = async (): Promise<SessionsResponse> => {
	const res = await ApiService.get<SessionsResponse>(API_ENDPOINTS.AUTH.SESSIONS)
	return res.data
}

export const logoutSession = async (publicId: string): Promise<SessionLogoutResponse> => {
	const res = await ApiService.delete<SessionLogoutResponse>(API_ENDPOINTS.AUTH.SESSION_LOGOUT(publicId))
	return res.data
}
