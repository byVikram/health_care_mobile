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
		notification_prompt_shown?: boolean
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
	specialty_id?: string
	license_number?: string
	procedure_ids?: string[]
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

export interface RefreshTokenResponse {
	success: boolean
	message: string
	data: {
		user: VerifyOtpUser
		access_token: string
		refresh_token: string
		token_type: string
		expires_in: number
		notification_prompt_shown?: boolean
	}
}

/**
 * Exchange a refresh token for a new access/refresh token pair. The backend
 * rotates the refresh token on every use (the old one is invalidated), so
 * callers must persist BOTH tokens from the response, not just the access
 * token.
 *
 * For manual/explicit calls only -- apiService.ts's own 401-retry logic
 * makes an unintercepted raw request instead, to avoid recursing back into
 * this same response interceptor if the refresh call itself gets a 401.
 */
export const refreshAccessToken = async (
	refreshToken: string
): Promise<RefreshTokenResponse> => {
	const res = await ApiService.post<RefreshTokenResponse>(API_ENDPOINTS.AUTH.REFRESH, {
		refresh_token: refreshToken,
	})
	return res.data
}

export interface LogoutResponse {
	success: boolean
	message: string
}

/**
 * Invalidate the current session's refresh token server-side. Callers
 * should still clear local auth state even if this fails (e.g. offline) --
 * losing the ability to revoke server-side shouldn't block a local logout.
 */
export const logout = async (refreshToken: string): Promise<LogoutResponse> => {
	const res = await ApiService.post<LogoutResponse>(API_ENDPOINTS.AUTH.LOGOUT, {
		refresh_token: refreshToken,
	})
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
	/** Another device that logged in within the last 24 h and hasn't been confirmed yet. */
	is_new?: boolean
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

/** "Log out of all other devices" -- returns how many sessions were revoked. */
export const logoutOtherSessions = async (): Promise<number> => {
	const res = await ApiService.delete<{ data?: { revoked?: number } }>(API_ENDPOINTS.AUTH.SESSIONS_OTHERS)
	return res.data?.data?.revoked ?? 0
}

/** "Yes, it was me" on a new-login alert. */
export const acknowledgeSession = async (publicId: string): Promise<void> => {
	await ApiService.post(API_ENDPOINTS.AUTH.SESSION_ACKNOWLEDGE(publicId), {})
}

/** Soft-deletes the signed-in account (any role) and logs out every session. */
export const deleteMyAccount = async (): Promise<void> => {
	await ApiService.delete(API_ENDPOINTS.AUTH.DELETE_ACCOUNT)
}
