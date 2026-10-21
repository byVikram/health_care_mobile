// src/features/dashboard/useHomeChromeData.ts
//
// Soft-failing data hooks for the patient Home chrome (drawer, My health QR, More services / Healthcare at
// home sheets). Each keeps the last good value in a module cache so reopening a sheet renders instantly,
// refreshes when `enabled` turns true, and never throws: on failure the value stays null (or the cache)
// and callers fall back / hide the dependent row.
import { useCallback, useEffect, useRef, useState } from 'react'
import { Linking } from 'react-native'
import {
	getAppConfig,
	getAncillaryStartingPrices,
	getPatientSummary,
	type AppConfig,
	type PatientSummary,
} from '../../services/homeService'
import { getWallet } from '../wallet/walletService'
import { registerSessionCache } from '../../utils/sessionCache'

function useSoftFetch<T>(fetcher: () => Promise<T | null>, cache: { value: T | null }, enabled: boolean) {
	const [value, setValue] = useState<T | null>(cache.value)
	// True once the latest request has finished (either way), so callers can tell "loading" from "failed".
	const [settled, setSettled] = useState(cache.value != null)
	const activeRef = useRef(true)

	const load = useCallback(async () => {
		try {
			const next = await fetcher()
			if (next == null) return
			cache.value = next
			if (activeRef.current) setValue(next)
		} catch {
			// Soft-fail: keep the cached value (or null) and let the caller hide / fall back.
		} finally {
			if (activeRef.current) setSettled(true)
		}
		// fetcher / cache are module-level constants.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	useEffect(() => {
		activeRef.current = true
		return () => {
			activeRef.current = false
		}
	}, [])

	useEffect(() => {
		if (enabled) void load()
	}, [enabled, load])

	return { value, settled, reload: load }
}

const summaryCache: { value: PatientSummary | null } = { value: null }
const configCache: { value: AppConfig | null } = { value: null }
const walletCache: { value: number | null } = { value: null }
const pricesCache: { value: Record<string, number> | null } = { value: null }

// The summary (ID, name, QR public id) and wallet balance belong to the signed-in patient: drop them on
// logout / session expiry / new login so the next user never sees them. Config and prices are not per-user.
registerSessionCache(() => {
	summaryCache.value = null
	walletCache.value = null
})

const fetchSummary = async () => (await getPatientSummary()) ?? null
const fetchConfig = async () => (await getAppConfig()) ?? null
const fetchPrices = async () => await getAncillaryStartingPrices()
const fetchWalletBalance = async () => {
	const res = await getWallet()
	const balance = Number(res?.data?.balance)
	return res?.success !== false && Number.isFinite(balance) ? balance : null
}

/** GET /api/patients/me/summary — display id, public id, profile completion, avatar. */
export const usePatientSummary = (enabled = true) => {
	const { value, settled, reload } = useSoftFetch(fetchSummary, summaryCache, enabled)
	return { summary: value, settled, reload }
}

/** GET /api/lookup/app-config — SOS / ambulance / support numbers. */
export const useAppConfig = (enabled = true) => {
	const { value } = useSoftFetch(fetchConfig, configCache, enabled)
	return value
}

/** Wallet balance (number) from the wallet API, or null when unknown. */
export const useWalletBalance = (enabled = true) => {
	const { value } = useSoftFetch(fetchWalletBalance, walletCache, enabled)
	return value
}

/** Home-care starting prices keyed by lower-case category key / slug / name. */
export const useAncillaryStartingPrices = (enabled = true) => {
	const { value } = useSoftFetch(fetchPrices, pricesCache, enabled)
	return value ?? {}
}

/** India's national numbers, used only when /api/lookup/app-config is unreachable (contract defaults). */
export const FALLBACK_EMERGENCY_NUMBER = '112'
export const FALLBACK_AMBULANCE_NUMBER = '108'

/** Opens the dialer / mail app; resolves false (never throws) if the device can't handle the URL. */
export const openContactUrl = async (url: string): Promise<boolean> => {
	try {
		await Linking.openURL(url)
		return true
	} catch {
		return false
	}
}

export const telUrl = (number: string) => `tel:${number.replace(/[^\d+]/g, '')}`

/** "₹1,250" (no decimals for whole rupees). */
export const formatBalance = (amount: number) =>
	`₹${amount.toLocaleString('en-IN', { maximumFractionDigits: Number.isInteger(amount) ? 0 : 2 })}`
