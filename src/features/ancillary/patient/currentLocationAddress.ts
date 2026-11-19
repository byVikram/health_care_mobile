// src/features/ancillary/patient/currentLocationAddress.ts
//
// Turns the app's shared location (AuthContext.currentLocation, kept by the Dashboard's one detector) into the patient's managed
// "current location" saved address, which Lab and Pharmacy need (they work from a saved-address id). It never reads the GPS: it
// only looks at the shared location, asks the geocoder (once per place) for a city / state / PIN the location lacks, and calls
// PUT /api/patients/me/addresses/current-location, which returns the existing managed address when it still stands for the
// location or replaces it. The same place is never sent twice at once (one shared in-flight request per place).

import type { LocationData } from '../../../context/AuthContext'
import { MAX_GPS_ACCURACY_METERS, distanceMeters, getPlaceFromCoords } from '../../../services/locationService'
import { isPincode } from '../../../utils/pincode'
import { putCurrentLocationAddress, type PatientAddress } from '../../profile/patient/PatientProfileService'

/** Mirrors the backend: a GPS position this close to the managed address (accuracy allowing) is the same place. */
const SAME_PLACE_METERS = 300
/** A place the patient picked by hand: another spot (or another line) is a different place. */
const SAME_MANUAL_PLACE_METERS = 50
/** What the shared location's text is when the geocoder found nothing: not an address. */
const GENERIC_LABEL = 'Current location'

export type LocationMethod = 'gps' | 'manual'

/** 'auto' (the phone's GPS) is 'gps'; a place the patient picked (or an older saved location) is 'manual'. */
export const methodOf = (loc: Pick<LocationData, 'source'>): LocationMethod =>
	loc.source === 'auto' ? 'gps' : 'manual'

/** A short key for the position + method: what "the same location" means for deduplication. */
export const locationKey = (loc: LocationData | null): string | null =>
	loc && Number.isFinite(loc.latitude) && Number.isFinite(loc.longitude)
		? `${loc.latitude.toFixed(5)}:${loc.longitude.toFixed(5)}:${methodOf(loc)}`
		: null

/** The address text a booking uses for the location: the fuller line when the place has one, else the short label. */
const lineOf = (loc: LocationData) => loc.line?.trim() || loc.address.trim()

export const isManagedAddress = (a: Pick<PatientAddress, 'source'>) => a.source === 'current_location'

export type EnsureResult = { ok: true; address: PatientAddress } | { ok: false; message: string }

const INCOMPLETE = "We couldn't work out the full address of your location. Please choose a saved address or add one."
const UNCONFIRMED = "We're still confirming your location. Please choose a saved address or try again shortly."
const INACCURATE =
	"Your phone's GPS position isn't accurate enough yet. Please choose a saved address or try again shortly."

// One reverse lookup per place, for a location saved without a city / state / PIN (a place picked from the search).
const placeLookups = new Map<string, ReturnType<typeof getPlaceFromCoords>>()
const lookupPlace = (loc: LocationData) => {
	const key = `${loc.latitude.toFixed(5)}:${loc.longitude.toFixed(5)}`
	let pending = placeLookups.get(key)
	if (!pending) {
		pending = getPlaceFromCoords(loc.latitude, loc.longitude)
		placeLookups.set(key, pending)
		// a failed lookup may be retried later; a good one is kept
		void pending.then((place) => {
			if (!place) placeLookups.delete(key)
		})
	}
	return pending
}

type Place = Awaited<ReturnType<typeof getPlaceFromCoords>>

/** Whether the managed address the list already holds stands for this location (so no request is needed). */
export const coversLocation = (managed: PatientAddress | undefined, loc: LocationData): boolean => {
	if (!managed || managed.latitude == null || managed.longitude == null) return false
	const method = methodOf(loc)
	if (managed.location_method !== method) return false
	if (loc.pincode && managed.pincode !== loc.pincode) return false
	const metres = distanceMeters(managed as { latitude: number; longitude: number }, loc)
	if (method === 'manual') return metres <= SAME_MANUAL_PLACE_METERS && managed.address_line === lineOf(loc)
	return metres <= SAME_PLACE_METERS
}

/**
 * Whether the shared location can be used as an address, and the address to send. A GPS location needs an accurate fix; a place
 * the patient picked needs none. Both need an address line, city, state and a 6-digit PIN (looked up once when missing).
 */
const buildInput = async (
	loc: LocationData
): Promise<{ input: Parameters<typeof putCurrentLocationAddress>[0] } | { message: string }> => {
	const method = methodOf(loc)
	if (!Number.isFinite(loc.latitude) || !Number.isFinite(loc.longitude)) return { message: INCOMPLETE }
	if (method === 'gps') {
		if (loc.accuracy == null) return { message: UNCONFIRMED }
		if (loc.accuracy > MAX_GPS_ACCURACY_METERS) return { message: INACCURATE }
	}

	let place: Place | undefined
	const needsPlace = !loc.city || !loc.state || !isPincode(loc.pincode)
	if (needsPlace) place = await lookupPlace(loc)

	const city = loc.city || place?.city || ''
	const state = loc.state || place?.state || ''
	const pincode = isPincode(loc.pincode) ? loc.pincode : place?.pincode
	const text = lineOf(loc)
	const line = text && text !== GENERIC_LABEL ? text : place?.fullAddress || ''
	if (!city.trim() || !state.trim() || !isPincode(pincode) || !line) return { message: INCOMPLETE }

	return {
		input: {
			method,
			latitude: loc.latitude,
			longitude: loc.longitude,
			...(method === 'gps' && loc.accuracy != null ? { accuracy_m: loc.accuracy } : {}),
			address_line: line,
			...(place?.area ? { area: place.area } : {}),
			city: city.trim(),
			state: state.trim(),
			pincode,
		},
	}
}

const inFlight = new Map<string, Promise<EnsureResult>>()

/**
 * The patient's managed address for the shared location: the one already in `known` when it still stands for it, otherwise the
 * server's answer (it creates or replaces the single managed row). Several callers for the same place share one request.
 */
export const ensureCurrentLocationAddress = (loc: LocationData, known: PatientAddress[]): Promise<EnsureResult> => {
	const managed = known.find(isManagedAddress)
	if (managed && coversLocation(managed, loc)) return Promise.resolve({ ok: true, address: managed })

	const key = locationKey(loc)
	if (!key) return Promise.resolve({ ok: false, message: INCOMPLETE })
	const running = inFlight.get(key)
	if (running) return running

	const request = (async (): Promise<EnsureResult> => {
		try {
			const built = await buildInput(loc)
			if ('message' in built) return { ok: false, message: built.message }
			return { ok: true, address: await putCurrentLocationAddress(built.input) }
		} catch {
			return {
				ok: false,
				message: "Couldn't use your current location right now. Please choose a saved address.",
			}
		} finally {
			inFlight.delete(key)
		}
	})()
	inFlight.set(key, request)
	return request
}
