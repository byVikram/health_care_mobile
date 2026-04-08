// src/features/auth/authService.ts

import ApiService from '../../services/apiService'
import { API_ENDPOINTS } from '../../constants/apiUrls'

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

export const getRoles = async (): Promise<VerifyRolesResponse> => {
	const res = await ApiService.get<VerifyRolesResponse>(API_ENDPOINTS.AUTH.GET_ROLES)
	return res.data
}

export const createUser = async (data: CreateUserRequest): Promise<VerifyUserCreationResponse> => {
	const res = await ApiService.post<VerifyUserCreationResponse>(API_ENDPOINTS.AUTH.CREATE_USER, data)
	return res.data
}