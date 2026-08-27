// src/services/apiService.ts
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios'
import { Alert } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

const axiosInstance = axios.create()
let unauthorizedHandler: (() => void) | null = null
let hasShownSessionExpiredAlert = false

export const setUnauthorizedHandler = (handler: (() => void) | null) => {
	unauthorizedHandler = handler
}

const normalizeHeadersForLog = (headers: unknown) => {
	const maybeHeaders = headers as {
		toJSON?: () => unknown
		Authorization?: unknown
		authorization?: unknown
	}

	if (typeof maybeHeaders?.toJSON === 'function') {
		return maybeHeaders.toJSON()
	}

	return headers
}

// Request interceptor
axiosInstance.interceptors.request.use(
	async (config) => {
		// Use AsyncStorage in React Native
		const token = await AsyncStorage.getItem('access_token')
		console.log('[API TOKEN]', token)
		const requestUrl = String(config.url || '')
		const isBookingRequest = requestUrl.includes('/appointments') || requestUrl.includes('appointments')
		config.headers = config.headers || {}
		const headers = config.headers as any
		const explicitAuthorization = headers?.Authorization || headers?.authorization

		if (isBookingRequest) {
			console.log('[ApiService interceptor][RN booking] before', {
				url: requestUrl,
				method: config.method,
				asyncStorageAccessToken: token,
				explicitAuthorization,
				headers: normalizeHeadersForLog(config.headers),
			})
		}

		if (token && !explicitAuthorization) {
			headers.Authorization = `Bearer ${token}`
		}

		if (isBookingRequest) {
			const finalAuthorization = (config.headers as any)?.Authorization || (config.headers as any)?.authorization
			console.log('[ApiService interceptor][RN booking] after', {
				url: requestUrl,
				method: config.method,
				authorizationWasOverwritten: Boolean(token && !explicitAuthorization),
				authorizationWasRemoved: Boolean(explicitAuthorization && !finalAuthorization),
				finalAuthorization,
				headers: normalizeHeadersForLog(config.headers),
				headerComparisonWithWeb: {
					reactWebSource:
						'C:\\Health_Care\\health_care_frontend\\src\\services\\apiService.ts uses localStorage.getItem("access_token")',
					reactWebExpectedAuthorization: token ? `Bearer ${token}` : null,
					reactNativeActualAuthorization: finalAuthorization,
					sameAuthorizationShape:
						Boolean(finalAuthorization) && String(finalAuthorization).startsWith('Bearer '),
					sameTokenAsRnAccessToken: finalAuthorization === (token ? `Bearer ${token}` : null),
				},
			})
		}

		return config
	},
	(error) => Promise.reject(error)
)

// Response interceptor
axiosInstance.interceptors.response.use(
	(response) => {
		const requestUrl = String(response.config?.url || '')
		if (requestUrl.includes('/appointments') || requestUrl.includes('appointments')) {
			console.log('[ApiService response][RN booking] success', {
				url: requestUrl,
				status: response.status,
				requestHeaders: normalizeHeadersForLog(response.config?.headers),
				data: response.data,
			})
		}

		return response
	},
	async (error) => {
		const status = error.response?.status
		const message = error.response?.data?.message || 'Something went wrong'
		const requestUrl = String(error.config?.url || error.response?.config?.url || '')

		if (requestUrl.includes('/appointments') || requestUrl.includes('appointments')) {
			console.log('[ApiService response][RN booking] error', {
				url: requestUrl,
				status,
				requestHeaders: normalizeHeadersForLog(error.config?.headers || error.response?.config?.headers),
				responseData: error.response?.data,
				message: error.message,
			})
		}

		if (status === 401) {
			// Clear storage locally to avoid circular dependencies
			await AsyncStorage.multiRemove(['role', 'user', 'access_token', 'refresh_token'])
			unauthorizedHandler?.()
			if (!hasShownSessionExpiredAlert) {
				hasShownSessionExpiredAlert = true
				Alert.alert('Session Expired', 'Please log in again.', [
					{
						text: 'OK',
						onPress: () => {
							hasShownSessionExpiredAlert = false
						},
					},
				])
			}
		} else if (status === 403) {
			console.log('403 RESPONSE:', error.response?.data)
			const errorDetail = error.response?.data?.detail
			const isVerificationRequired =
				typeof errorDetail === 'object' && errorDetail?.code === 'NURSE_VERIFICATION_REQUIRED'

			if (!isVerificationRequired) {
				Alert.alert(
					'Access Denied',
					error.response?.data?.message ||
						(typeof errorDetail === 'string' ? errorDetail : 'You do not have permission to perform this action.')
				)
			}
		} else {
			// Replace react-toastify with Alert in RN
			Alert.alert('API Error', message)
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
