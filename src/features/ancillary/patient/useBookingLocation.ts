// src/features/ancillary/patient/useBookingLocation.ts
//
// The patient's location for ancillary provider matching (providers are geofenced server-side).
// Uses the app's saved location (AuthContext.currentLocation) when there is one, otherwise asks for a
// one-off GPS fix via locationService and saves it back as the current location.

import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { getAddressFromCoords, getCurrentLocation } from '../../../services/locationService'

export type BookingCoords = { latitude: number; longitude: number }

export function useBookingLocation() {
	const { currentLocation, setCurrentLocation } = useAuth()
	const saved: BookingCoords | null =
		currentLocation && Number.isFinite(currentLocation.latitude) && Number.isFinite(currentLocation.longitude)
			? { latitude: currentLocation.latitude, longitude: currentLocation.longitude }
			: null

	const [gpsCoords, setGpsCoords] = useState<BookingCoords | null>(null)
	const [loading, setLoading] = useState(!saved)
	const [error, setError] = useState<string | null>(null)
	const activeRef = useRef(true)

	useEffect(() => {
		activeRef.current = true
		return () => {
			activeRef.current = false
		}
	}, [])

	const locate = useCallback(async (): Promise<BookingCoords | null> => {
		setLoading(true)
		setError(null)
		try {
			const coords = await getCurrentLocation()
			if (!activeRef.current) return coords
			setGpsCoords(coords)
			try {
				const geo: { fullAddress?: string; pincode?: string } = await getAddressFromCoords(coords.latitude, coords.longitude)
				await setCurrentLocation({
					address: geo.fullAddress || 'Current location',
					...coords,
					...(geo.pincode ? { pincode: geo.pincode } : {}),
				})
			} catch {
				// Saving the app-wide location is best-effort.
			}
			return coords
		} catch (e: unknown) {
			const msg =
				e instanceof Error && /denied/i.test(e.message)
					? 'Location permission is off'
					: "Couldn't get your location"
			if (activeRef.current) setError(msg)
			return null
		} finally {
			if (activeRef.current) setLoading(false)
		}
	}, [setCurrentLocation])

	const hasSaved = !!saved
	useEffect(() => {
		if (!hasSaved) void locate()
		// Only on mount: a saved location never needs a GPS fix.
	}, [])

	const coords = saved ?? gpsCoords
	return { coords, loading: loading && !coords, error: coords ? null : error, locate }
}

export default useBookingLocation
