// src/features/wallet/walletService.ts
import ApiService from '../../services/apiService'
import { API_ENDPOINTS } from '../../constants/apiUrls'

export interface WalletData {
	id: string
	public_id: string
	user_id: number
	currency: string
	balance: string | number
	is_active: boolean
	is_frozen: boolean
	created_at: string
	updated_at: string
}

export interface WalletTransactionData {
	id: string
	public_id: string
	transaction_type: 'CREDIT' | 'DEBIT'
	category: 'TOPUP' | 'PAYMENT' | 'REFUND' | 'WITHDRAWAL' | 'TRANSFER' | 'CASHBACK' | 'BONUS' | 'ADJUSTMENT' | 'FEE' | 'PENALTY'
	amount: string | number
	balance_before: string | number
	balance_after: string | number
	currency: string
	payment_method?: string | null
	status: 'COMPLETED' | 'PENDING' | 'FAILED' | 'CANCELLED'
	reference_id?: string | null
	reference_type?: string | null
	description?: string | null
	meta_data?: Record<string, unknown> | null
	created_at: string
}

export interface WalletTopUpPayload {
	amount: number
	payment_method?: string
	reference_id?: string
	description?: string
}

export interface WalletDebitPayload {
	amount: number
	reference_id?: string
	reference_type?: string
	description?: string
}

export interface WalletApiResponse<T> {
	success: boolean
	message: string
	data: T
}

export interface PaginatedWalletTransactionsResponse {
	success: boolean
	message: string
	data: WalletTransactionData[]
	meta: {
		total: number
		page: number
		limit: number
		pages: number
	}
}

export const getWallet = async (): Promise<WalletApiResponse<WalletData>> => {
	const response = await ApiService.get<WalletApiResponse<WalletData>>(API_ENDPOINTS.WALLET.GET)
	return response.data
}

export const getWalletTransactions = async (params?: {
	transaction_type?: string
	category?: string
	status?: string
	page?: number
	limit?: number
}): Promise<PaginatedWalletTransactionsResponse> => {
	const response = await ApiService.getWithParams<PaginatedWalletTransactionsResponse>(
		API_ENDPOINTS.WALLET.TRANSACTIONS,
		(params as Record<string, unknown>) || {}
	)
	return response.data
}

export const getWalletTransactionDetail = async (
	id: string
): Promise<WalletApiResponse<WalletTransactionData>> => {
	const response = await ApiService.get<WalletApiResponse<WalletTransactionData>>(
		API_ENDPOINTS.WALLET.TRANSACTION_DETAIL(id)
	)
	return response.data
}

export const topUpWallet = async (
	payload: WalletTopUpPayload
): Promise<WalletApiResponse<WalletTransactionData>> => {
	const response = await ApiService.post<WalletApiResponse<WalletTransactionData>>(
		API_ENDPOINTS.WALLET.TOPUP,
		payload
	)
	return response.data
}

export const payWithWallet = async (
	payload: WalletDebitPayload
): Promise<WalletApiResponse<WalletTransactionData>> => {
	const response = await ApiService.post<WalletApiResponse<WalletTransactionData>>(
		API_ENDPOINTS.WALLET.PAY,
		payload
	)
	return response.data
}
