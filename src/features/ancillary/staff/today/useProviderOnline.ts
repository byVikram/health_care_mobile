// src/features/ancillary/staff/today/useProviderOnline.ts
//
// Provider availability for the Today switch. Initial state comes from the server (GET /provider/status). Going
// online asks for location permission, reads the current position and POSTs {isOnline:true, latitude, longitude}
// (the dispatch socket only delivers offers to online providers that have a location); going offline POSTs
// {isOnline:false} and calls `onWentOffline` so the screen can drop open offers. The switch is optimistic and
// rolls back with a toast on failure. While online the location is refreshed (throttled) when the app comes back
// to the foreground.
import { useCallback, useEffect, useRef, useState } from 'react'
import { AppState } from 'react-native'
import * as Location from 'expo-location'
import Toast from 'react-native-toast-message'
import { extractApiErrorMessage } from '../../ancillaryService'
import { getProviderOnlineStatus, pingProviderLocation, setProviderOnline } from '../../providerVisitService'

const LOCATION_REFRESH_MS = 5 * 60_000

class LocationDeniedError extends Error {}

const currentPosition = async () => {
	const { status } = await Location.requestForegroundPermissionsAsync()
	if (status !== 'granted') throw new LocationDeniedError('Allow location access to go online.')
	const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
	return { latitude: pos.coords.latitude, longitude: pos.coords.longitude, heading: pos.coords.heading ?? 0 }
}

export function useProviderOnline({ onWentOffline }: { onWentOffline: () => void }) {
	/** null until the server answers. */
	const [online, setOnlineState] = useState<boolean | null>(null)
	const [busy, setBusy] = useState(false)
	const onlineRef = useRef<boolean | null>(null)
	const lastPing = useRef(0)
	const offlineCb = useRef(onWentOffline)
	offlineCb.current = onWentOffline

	const apply = (value: boolean | null) => {
		onlineRef.current = value
		setOnlineState(value)
	}

	const refreshLocation = useCallback(async () => {
		if (Date.now() - lastPing.current < LOCATION_REFRESH_MS) return
		lastPing.current = Date.now()
		try {
			const p = await currentPosition()
			await pingProviderLocation(p.latitude, p.longitude, p.heading)
		} catch {
			// Best effort: the next foreground retries.
			lastPing.current = 0
		}
	}, [])

	// Initial state from the server; when already online, refresh the stored location too.
	useEffect(() => {
		let active = true
		const run = async () => {
			try {
				const isOnline = await getProviderOnlineStatus()
				if (!active) return
				apply(isOnline)
				if (isOnline) void refreshLocation()
			} catch {
				if (active) apply(false)
			}
		}
		void run()
		return () => {
			active = false
		}
	}, [refreshLocation])

	useEffect(() => {
		const sub = AppState.addEventListener('change', (state) => {
			if (state === 'active' && onlineRef.current) void refreshLocation()
		})
		return () => sub.remove()
	}, [refreshLocation])

	const setOnline = async (next: boolean) => {
		if (busy || onlineRef.current === null || onlineRef.current === next) return
		const previous = onlineRef.current
		setBusy(true)
		apply(next)
		try {
			if (next) {
				const p = await currentPosition()
				await setProviderOnline(true, p.latitude, p.longitude)
				lastPing.current = Date.now()
			} else {
				await setProviderOnline(false)
				offlineCb.current()
			}
		} catch (e) {
			apply(previous)
			Toast.show({
				type: 'error',
				text1: next ? 'Could not go online' : 'Could not go offline',
				text2:
					e instanceof LocationDeniedError
						? e.message
						: extractApiErrorMessage(e, 'Please check your connection and try again.'),
			})
		} finally {
			setBusy(false)
		}
	}

	return { online, busy, setOnline }
}
