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
