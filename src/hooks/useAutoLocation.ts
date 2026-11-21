// src/hooks/useAutoLocation.ts
//
// The ONE place that finds the signed-in patient's current location by itself. It is mounted once for the patient's tabs
// (MainTabNavigator), so the Dashboard, Find a Doctor and Consult a Doctor never detect or ask on their own: they all read
// AuthContext.currentLocation (address, coordinates, pincode), which this hook keeps up to date.
//
//   - Runs after sign-in, when the app comes back to the foreground, and when the Dashboard tab is shown again (the caller
//     passes `refresh` to the tab listener). Every trigger goes through the same `refresh`, which never runs twice at once and
//     skips a check that comes sooner than REFRESH_AFTER_MS after the last one.
//   - A location the patient picked (source 'manual', or saved before `source` existed) is never replaced here; only their
//     own "Use current location" makes the location automatic again.
//   - New coordinates are saved (and the address looked up again) only when the patient moved more than MOVED_METERS, so GPS
//     wobble does not reload Find a Doctor's results.
//   - Permission: the first-launch dialogs (useFirstLaunchPermissions) are reused and waited for. This hook asks itself at most
//     once, and only if the permission was never asked. A denied or blocked permission shows "Enable location" in the location
//     row (LocationSelector), which offers the Settings page; it is never asked for again here.
//   - Every await is checked against the session it started in: after sign-out or an account change nothing is written.
import { useCallback, useEffect, useRef } from 'react'
import { AppState } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Location from 'expo-location'
import { useAuth, type LocationData, type LocationStatus } from '../context/AuthContext'
import { firstLaunchPermissionsSettled } from '../features/onboarding/useFirstLaunchPermissions'
import { distanceMeters, getDevicePosition, getPlaceFromCoords, placeLabel } from '../services/locationService'

/** A check sooner than this after the last one is skipped. */
const REFRESH_AFTER_MS = 10 * 60 * 1000
/** Moving less than this is GPS wobble: the saved coordinates and address stay as they are. */
const MOVED_METERS = 300
/** How long to wait for the first-launch permission dialogs before looking at the permission anyway. */
const FIRST_LAUNCH_WAIT_MS = 15000
const PROMPTED_KEY = 'auto_location_prompted'

/** Chosen by the patient, or saved before `source` existed: never replaced automatically. */
const isManual = (loc: LocationData | null) => !!loc && loc.source !== 'auto'

/** Location permission for the automatic lookup. Asks at most once (only if it was never asked), after the first-launch dialogs. */
const hasLocationPermission = async (): Promise<boolean> => {
	await Promise.race([
		firstLaunchPermissionsSettled,
		new Promise<void>((resolve) => setTimeout(resolve, FIRST_LAUNCH_WAIT_MS)),
	])
	let permission = await Location.getForegroundPermissionsAsync()
	if (
		permission.status === 'undetermined' &&
		permission.canAskAgain &&
		(await AsyncStorage.getItem(PROMPTED_KEY)) !== 'true'
	) {
		await AsyncStorage.setItem(PROMPTED_KEY, 'true')
		permission = await Location.requestForegroundPermissionsAsync()
	}
	return permission.status === 'granted'
}

const statusFor = (reason: 'denied' | 'services_off' | 'timeout' | 'error' | 'inaccurate'): LocationStatus =>
	reason === 'denied' ? 'denied' : reason === 'services_off' ? 'off' : 'error'

export function useAutoLocation(enabled: boolean) {
	const { accessToken, currentLocation, setCurrentLocation, setLocationStatus } = useAuth()
	const tokenRef = useRef(accessToken)
	const locationRef = useRef(currentLocation)
	const busyRef = useRef(false)
	const lastRunRef = useRef(0)
	// Permission refused / Location switch off: the next run (e.g. the app coming back from Settings) must not wait for the usual
	// "ran a moment ago" pause, so a patient who just turned location on sees it used at once. It only looks at the permission:
	// the system dialog is never shown again from here (see hasLocationPermission).
	const blockedRef = useRef(false)

	useEffect(() => {
		tokenRef.current = accessToken
		if (!accessToken) {
			lastRunRef.current = 0
			blockedRef.current = false
		}
	}, [accessToken])
	useEffect(() => {
		locationRef.current = currentLocation
	}, [currentLocation])

	const run = useCallback(async (): Promise<LocationData | null> => {
		const session = tokenRef.current
		if (!enabled || !session || busyRef.current) return locationRef.current
		const known = locationRef.current
		if (isManual(known)) {
			blockedRef.current = false
			setLocationStatus('idle')
			return known
		}
		// A position looked up a moment ago is not looked up again, but the permission is still checked (it never prompts again:
		// see hasLocationPermission), so a refusal or a switched-off Location shows at once, and one that has just been turned on
		// (`blockedRef`) is refreshed at once.
		const recent =
			!blockedRef.current &&
			!!known &&
			Date.now() - Math.max(lastRunRef.current, known.detectedAt ?? 0) < REFRESH_AFTER_MS

		busyRef.current = true
		const stale = () => tokenRef.current !== session
		// A status only matters while there is no location to show; with one, a failed refresh is silent.
		// 'denied' / 'off' are kept even while the last location is shown, so the row can say location access is off.
		const report = (status: LocationStatus) => {
			const needsPatient = status === 'denied' || status === 'off'
			blockedRef.current = needsPatient
			if (!stale()) setLocationStatus(locationRef.current && !needsPatient ? 'idle' : status)
			return locationRef.current
		}
		// Keep what the lookup found in step with the shared state at once (the context updates on the next render).
		const save = async (loc: LocationData) => {
			locationRef.current = loc
			await setCurrentLocation(loc)
		}
		try {
			if (!known) setLocationStatus('detecting')
			if (!(await hasLocationPermission())) return report('denied')
			if (recent) return report('idle')

			const result = await getDevicePosition()
			if (stale()) return locationRef.current
			lastRunRef.current = Date.now()
			if (result.status !== 'ok') return report(statusFor(result.status))

			const { latitude, longitude, accuracy } = result.position
			// The patient may have picked a place while the position was being found.
			if (isManual(locationRef.current)) return report('idle')

			const current = locationRef.current
			// A location saved without a PIN (the geocoder had nothing then) gets one now, even if it has not moved.
			const lacksDetails = !!current && !current.pincode
			if (current && !lacksDetails && distanceMeters(current, { latitude, longitude }) < MOVED_METERS) {
				await save({ ...current, ...(accuracy != null ? { accuracy } : {}), detectedAt: Date.now() })
				return report('idle')
			}

			const place = await getPlaceFromCoords(latitude, longitude)
			if (stale() || isManual(locationRef.current)) return report('idle')
			await save({
				address: (place && placeLabel(place)) || 'Current location',
				latitude,
				longitude,
				...(place?.pincode ? { pincode: place.pincode } : {}),
				...(place?.city ? { city: place.city } : {}),
				...(place?.state ? { state: place.state } : {}),
				...(accuracy != null ? { accuracy } : {}),
				source: 'auto',
				detectedAt: Date.now(),
			})
			return report('idle')
		} catch {
			return report('error')
		} finally {
			busyRef.current = false
		}
	}, [enabled, setCurrentLocation, setLocationStatus])
	const refresh = useCallback(async () => {
		await run()
	}, [run])

	// After sign-in (and whenever the signed-in account changes).
	useEffect(() => {
		if (enabled && accessToken) void refresh()
	}, [enabled, accessToken, refresh])

	// Back to the app from the background.
	useEffect(() => {
		if (!enabled) return
		const subscription = AppState.addEventListener('change', (state) => {
			if (state === 'active') void refresh()
		})
		return () => subscription.remove()
	}, [enabled, refresh])

	return { refresh }
}

export default useAutoLocation
