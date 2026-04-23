// src/services/apiService.ts
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios'
import { Alert } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { navigate } from '../navigation/navigationService'

const axiosInstance = axios.create()

// Request interceptor
axiosInstance.interceptors.request.use(
	async (config) => {
		// Use AsyncStorage in React Native
		const token = await AsyncStorage.getItem('access_token')
		if (token) {
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

		if (status === 401 || status === 403) {
			// Clear storage locally to avoid circular dependencies
			await AsyncStorage.multiRemove(['role', 'user', 'access_token', 'refresh_token'])
			// Navigate to onboarding
			navigate('Onboarding')
			Alert.alert('Session Expired', 'Please log in again.')
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
	post<T = unknown>(url: string, body: unknown): Promise<AxiosResponse<T>> {
		return axiosInstance.post<T>(url, body)
	},
	patch<T = unknown>(url: string, body: unknown): Promise<AxiosResponse<T>> {
		return axiosInstance.patch<T>(url, body)
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
