// src/context/NetworkContext.tsx
//
// Single, application-wide connectivity monitor. Mounted once in App.tsx
// (same level as AuthProvider) so exactly one NetInfo listener exists for
// the lifetime of the app — screens/components should consume connectivity
// via useNetwork() rather than creating their own NetInfo listeners.
//
// NetInfo's own listener already fires on foreground/background transitions,
// so no extra AppState handling is needed here.

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { Platform } from 'react-native'
import NetInfo, { NetInfoState } from '@react-native-community/netinfo'
import { setNetworkState } from '../utils/networkState'

export interface NetworkContextValue {
	// null = unknown (initial NetInfo state hasn't resolved yet) — never
	// treated as "offline" by consumers, to avoid a false offline flash on
	// app startup.
	isConnected: boolean | null
	isInternetReachable: boolean | null
	// Manually force a fresh connectivity check (e.g. a "Retry" tap).
	refresh: () => Promise<void>
}

const NetworkContext = createContext<NetworkContextValue>({
	isConnected: null,
	isInternetReachable: null,
	refresh: async () => {},
})

const applyState = (state: NetInfoState) => {
	// On web, NetInfo's `isInternetReachable` is a reachability probe (its own
	// fetch to a check URL) that is unreliable in browser environments — CORS,
	// ad blockers, or dev proxies can make it report `false` even though the
	// browser is genuinely online. `isConnected` on web mirrors
	// `navigator.onLine`, which is reliable enough on its own, so on web we
	// don't let `isInternetReachable` downgrade `isConnected` to false.
	if (Platform.OS === 'web') {
		return { isConnected: state.isConnected, isInternetReachable: state.isInternetReachable }
	}

	// Native: a device can be "connected" to a network (e.g. Wi-Fi with no
	// internet) but not actually have internet access. Treat explicit `false`
	// on either flag as offline; anything else (true or unresolved/null) is
	// treated as connected/unknown so we never show a false offline state.
	const isConnected = state.isConnected === false || state.isInternetReachable === false ? false : state.isConnected
	return { isConnected, isInternetReachable: state.isInternetReachable }
}

export const NetworkProvider = ({ children }: { children: React.ReactNode }) => {
	const [state, setState] = useState<{ isConnected: boolean | null; isInternetReachable: boolean | null }>({
		isConnected: null,
		isInternetReachable: null,
	})
	// Avoids setting state on an unmounted provider (app teardown edge case).
	const mountedRef = useRef(true)

	useEffect(() => {
		mountedRef.current = true

		const handleUpdate = (netInfoState: NetInfoState) => {
			const next = applyState(netInfoState)
			setNetworkState(next)
			if (mountedRef.current) {
				setState(next)
			}
		}

		// Resolve the initial state immediately (NetInfo.fetch), then keep
		// listening for changes. Using fetch() first avoids briefly rendering
		// the "unknown" state longer than necessary.
		NetInfo.fetch().then(handleUpdate)
		const unsubscribe = NetInfo.addEventListener(handleUpdate)

		return () => {
			mountedRef.current = false
			unsubscribe()
		}
	}, [])

	const refresh = useCallback(async () => {
		const netInfoState = await NetInfo.fetch()
		const next = applyState(netInfoState)
		setNetworkState(next)
		if (mountedRef.current) {
			setState(next)
		}
	}, [])

	return (
		<NetworkContext.Provider value={{ isConnected: state.isConnected, isInternetReachable: state.isInternetReachable, refresh }}>
			{children}
		</NetworkContext.Provider>
	)
}

export const useNetwork = () => useContext(NetworkContext)
