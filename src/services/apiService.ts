// src/services/apiService.ts
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { secureStorage } from '../utils/secureStorage'
import { isKnownOffline } from '../utils/networkState'
import { API_ENDPOINTS } from '../constants/apiUrls'

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

// Axios's default query-param serializer encodes arrays as repeated
// `key[]=value` pairs. FastAPI's `Query(None)` for a `List[str]` param only
// recognizes repeated `key=value` pairs (no brackets), so any endpoint taking
// an array query param (e.g. `procedure_ids`) silently receives an empty list
// instead of a 422 -- there is no error to catch, so the request "succeeds"
// with an empty/wrong result. Serialize arrays as repeated keys to match.
const serializeParams = (params: Record<string, unknown>): string => {
	const parts: string[] = []
	Object.entries(params).forEach(([key, value]) => {
		if (value === undefined || value === null) return
		const values = Array.isArray(value) ? value : [value]
		values.forEach((v) => {
			if (v === undefined || v === null) return
			parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`)
		})
	})
	return parts.join('&')
}

const axiosInstance = axios.create({ paramsSerializer: serializeParams })
let unauthorizedHandler: (() => void) | null = null
let statusModalHandler: StatusModalHandler | null = null
let hasShownSessionExpiredAlert = false
type TokenRefreshedHandler = (accessToken: string, refreshToken: string) => void
let tokenRefreshedHandler: TokenRefreshedHandler | null = null
// Shared in-flight refresh call -- concurrent 401s all await this same
// promise instead of each firing their own /api/auth/refresh request.
let refreshPromise: Promise<string | null> | null = null
// Synthetic error used to short-circuit a request we already know will fail
// because the device is offline (see isKnownOffline() below), so we don't
// waste time waiting on a doomed request. Tagged the same way a real Axios
// network error is (no .response, code 'ERR_NETWORK') so the response
// interceptor's error-classification logic below handles both identically.
const createOfflineError = (): Error & { code: string; isOfflineError: true } => {
	const err = new Error('No internet connection') as Error & { code: string; isOfflineError: true }
	err.code = 'ERR_NETWORK'
	err.isOfflineError = true
	return err
}

export const setUnauthorizedHandler = (handler: (() => void) | null) => {
	unauthorizedHandler = handler
}

export const setTokenRefreshedHandler = (handler: TokenRefreshedHandler | null) => {
	tokenRefreshedHandler = handler
}

/**
 * Exchange the stored refresh token for a new access/refresh pair.
 * Deliberately uses a raw, unintercepted axios.post -- not `axiosInstance`
 * -- so a 401 on the refresh call itself doesn't recurse back into this
 * same response interceptor.
 * Returns the new access token, or null if there was nothing to refresh
 * with or the refresh call failed (both mean: fall back to a hard logout).
 */
const performTokenRefresh = async (): Promise<string | null> => {
	const currentRefreshToken = await secureStorage.getItem('refresh_token')
	if (!currentRefreshToken) return null

	try {
		const response = await axios.post(API_ENDPOINTS.AUTH.REFRESH, {
			refresh_token: currentRefreshToken,
		})
		const data = response.data?.data
		const newAccessToken: string | undefined = data?.access_token
		const newRefreshToken: string | undefined = data?.refresh_token
		if (!newAccessToken || !newRefreshToken) return null

		await secureStorage.setItem('access_token', newAccessToken)
		await secureStorage.setItem('refresh_token', newRefreshToken)
		tokenRefreshedHandler?.(newAccessToken, newRefreshToken)

		return newAccessToken
	} catch {
		return null
	}
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
		if (isKnownOffline()) {
			return Promise.reject(createOfflineError())
		}
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
		const isAxiosErr = axios.isAxiosError(error)
		const hasResponse = Boolean(error?.response)

		// No response at all: either a real Axios network/timeout failure, or the
		// synthetic offline error from the request interceptor above. Distinguish
		// this from a genuine server/auth/validation error (which always has a
		// response) so we don't show a confusing 'Something went wrong' when the
		// real problem is connectivity.
		if (!hasResponse) {
			const isTimeout = isAxiosErr && error.code === 'ECONNABORTED'
			// Deliberately do NOT call showStatusModal here (Task 9 correction).
			// The global OfflineBanner already communicates connectivity loss, and
			// the calling screen's own catch block is responsible for any request-
			// specific UI (local StatusModal, Toast, inline error, etc). Showing a
			// second global modal here would duplicate that message. 401/403 and
			// the other HTTP-status branches below are unaffected.
			//
			// We still overwrite .message with a clean, user-safe string so that
			// screen-level catches reading err.message (e.g. err?.message ||
			// 'Something went wrong') never surface raw Axios/network internals
			// such as 'Network Error' or 'timeout of 30000ms exceeded'.
			error.message = isTimeout
				? 'The request took too long. Please try again.'
				: 'No internet connection. Please check your network and try again.'
			return Promise.reject(error)
		}

		const status = error.response?.status
		const message = error.response?.data?.message || 'Something went wrong'

		if (status === 401) {
			const originalRequest = error.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined

			// Try exactly one silent refresh-and-retry before giving up. Requests
			// already retried once (_retry) skip straight to the hard logout below
			// -- this also covers the case where the refresh itself succeeded but
			// the freshly-issued token is STILL rejected, which should not loop.
			if (originalRequest && !originalRequest._retry) {
				originalRequest._retry = true

				if (!refreshPromise) {
					refreshPromise = performTokenRefresh().finally(() => {
						refreshPromise = null
					})
				}
				const newAccessToken = await refreshPromise

				if (newAccessToken) {
					originalRequest.headers = {
						...originalRequest.headers,
						Authorization: `Bearer ${newAccessToken}`,
					}
					return axiosInstance(originalRequest)
				}
			}

			// No refresh token, or the refresh call failed -- fall back to a hard
			// logout, same as before this retry logic existed.
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
			if (__DEV__) console.log('403 RESPONSE:', error.response?.data)
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
