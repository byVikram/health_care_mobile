// src/features/ancillary/staff/visit/useLiveLocationShare.ts
//
// While the provider is on the way to a visit with "Share live location" on (and the screen is open), send
// their position (POST /provider/location) now and every 30 s so the patient can follow them.
import { useEffect } from 'react'
import { getCurrentLocation } from '../../../../services/locationService'
import { updateProviderLocation } from '../../ancillaryService'

const PING_MS = 30_000

export function useLiveLocationShare(enabled: boolean) {
	useEffect(() => {
		if (!enabled) return
		let active = true
		const ping = async () => {
			try {
				const { latitude, longitude } = await getCurrentLocation()
				if (active) await updateProviderLocation(latitude, longitude)
			} catch {
				// No permission / no fix: the patient keeps seeing the ETA only.
			}
		}
		void ping()
		const t = setInterval(() => void ping(), PING_MS)
		return () => {
			active = false
			clearInterval(t)
		}
	}, [enabled])
}
