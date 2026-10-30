// src/hooks/useCurrentPincode.ts
//
// The pincode the app uses to show what is available near the patient (lab tests today). In order:
//   1. the current location's pincode (captured on the location screen);
//   2. for a location saved before that, the pincode of its coordinates, looked up once and saved back;
//   3. the default saved address's pincode.
// `resolving` is true while a lookup is still running, so a screen can wait instead of showing the unfiltered list first.

import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { getPatientAddresses } from '../features/profile/patient/PatientProfileService'
import { getAddressFromCoords } from '../services/locationService'
import { isPincode } from '../utils/pincode'

export function useCurrentPincode(): { pincode: string | undefined; resolving: boolean } {
	const { currentLocation, setCurrentLocation } = useAuth()
	const saved = isPincode(currentLocation?.pincode) ? currentLocation?.pincode : undefined

	const [geocoding, setGeocoding] = useState(false)
	const [geocodeDone, setGeocodeDone] = useState(false)
	const triedFor = useRef<string | null>(null)

	// 2. A location saved without a pincode: ask the device's geocoder once for these coordinates.
	const latitude = currentLocation?.latitude
	const longitude = currentLocation?.longitude
	useEffect(() => {
		if (saved || !currentLocation || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
			setGeocodeDone(true)
			return
		}
		const key = `${latitude},${longitude}`
		if (triedFor.current === key) return
		triedFor.current = key
		let active = true
		setGeocodeDone(false)
		const run = async () => {
			setGeocoding(true)
			try {
				const geo: { pincode?: string } = await getAddressFromCoords(latitude as number, longitude as number)
				if (active && geo.pincode) await setCurrentLocation({ ...currentLocation, pincode: geo.pincode })
			} catch {
				// No pincode from the geocoder: the saved address below, or the patient is asked.
			} finally {
				if (active) {
					setGeocoding(false)
					setGeocodeDone(true)
				}
			}
		}
		void run()
		return () => {
			active = false
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [saved, latitude, longitude])

	// 3. Still none: the patient's default saved address.
	const [addressPincode, setAddressPincode] = useState<string | undefined>(undefined)
	const [addressLooking, setAddressLooking] = useState(false)
	const addressTried = useRef(false)
	useEffect(() => {
		if (saved || !geocodeDone || addressTried.current) return
		addressTried.current = true
		let active = true
		const run = async () => {
			setAddressLooking(true)
			try {
				const addresses = await getPatientAddresses()
				const usable = addresses.filter((a) => isPincode(a.pincode))
				const pick = usable.find((a) => a.is_default) ?? usable[0]
				if (active && pick) setAddressPincode(pick.pincode)
			} catch {
				// Not signed in as a patient, or offline: nothing to fall back to.
			} finally {
				if (active) setAddressLooking(false)
			}
		}
		void run()
		return () => {
			active = false
		}
	}, [saved, geocodeDone])

	const pincode = saved ?? addressPincode
	return { pincode, resolving: !pincode && (geocoding || !geocodeDone || addressLooking) }
}

export default useCurrentPincode
