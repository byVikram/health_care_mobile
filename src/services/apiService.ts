// src/services/apiService.ts
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { secureStorage } from '../utils/secureStorage'

export interface StatusModalData {
	status?: 'success' | 'error' | 'info'
	title: string
	description: string
	submitText?: string
	onSubmit?: () => void
	cancelText?: string
	onCancel?: () => void
}

type StatusModalHandler = (data: StatusModalData | null) => void

const axiosInstance = axios.create()
let unauthorizedHandler: (() => void) | null = null
let statusModalHandler: StatusModalHandler | null = null
let hasShownSessionExpiredAlert = false

export const setUnauthorizedHandler = (handler: (() => void) | null) => {
	unauthorizedHandler = handler
}

export const setStatusModalHandler = (handler: StatusModalHandler | null) => {
	statusModalHandler = handler
}

export const showStatusModal = (data: StatusModalData | null) => {
	statusModalHandler?.(data)
}

// Request interceptor
axiosInstance.interceptors.request.use(
	async (config) => {
		const token = await secureStorage.getItem('access_token')
		if (token && config.headers && !config.headers.Authorization && !config.headers.authorization) {
			config.headers.Authorization = `Bearer ${token}`
		}
		return config
	},
	(error) => Promise.reject(error)
)

// Response interceptor
axiosInstance.interceptors.response.use(
	(response) => response,
	async (error) => {
		const status = error.response?.status
		const message = error.response?.data?.message || 'Something went wrong'

		if (status === 401) {
			// Clear storage locally to avoid circular dependencies
			await secureStorage.deleteItem('access_token')
			await secureStorage.deleteItem('refresh_token')
			await AsyncStorage.multiRemove(['role', 'user'])
			unauthorizedHandler?.()
			if (!hasShownSessionExpiredAlert) {
				hasShownSessionExpiredAlert = true
				showStatusModal({
					status: 'error',
					title: 'Session Expired',
					description: 'Please log in again.',
					submitText: 'OK',
					onSubmit: () => {
						hasShownSessionExpiredAlert = false
					},
					onCancel: () => {
						hasShownSessionExpiredAlert = false
					},
				})
			}
		} else if (status === 403) {
			console.log('403 RESPONSE:', error.response?.data)
			const errorDetail = error.response?.data?.detail
			const isVerificationRequired =
				typeof errorDetail === 'object' && (errorDetail?.code === 'ANCILLARY_VERIFICATION_REQUIRED' || errorDetail?.code === 'NURSE_VERIFICATION_REQUIRED')

			if (!isVerificationRequired) {
				showStatusModal({
					status: 'error',
					title: 'Access Denied',
					description:
						error.response?.data?.message ||
						(typeof errorDetail === 'string'
							? errorDetail
							: 'You do not have permission to perform this action.'),
					submitText: 'OK',
				})
			}
		} else {
			showStatusModal({
				status: 'error',
				title: 'API Error',
				description: message,
				submitText: 'OK',
			})
		}

		return Promise.reject(error)
	}
)

const ApiService = {
	get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
		return axiosInstance.get<T>(url, config)
	},
	getWithParams<T = unknown>(url: string, params: Record<string, unknown>): Promise<AxiosResponse<T>> {
		return axiosInstance.get<T>(url, { params })
	},
	post<T = unknown>(url: string, body: unknown, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
		return axiosInstance.post<T>(url, body, config)
	},
	patch<T = unknown>(url: string, body: unknown, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
		return axiosInstance.patch<T>(url, body, config)
	},
	put<T = unknown>(url: string, body: unknown): Promise<AxiosResponse<T>> {
		return axiosInstance.put<T>(url, body)
	},
	delete<T = unknown>(url: string): Promise<AxiosResponse<T>> {
		return axiosInstance.delete<T>(url)
	},
	deleteWithBody<T = unknown>(url: string, body: unknown): Promise<AxiosResponse<T>> {
		return axiosInstance.delete<T>(url, { data: body })
	},
}

export default ApiService
