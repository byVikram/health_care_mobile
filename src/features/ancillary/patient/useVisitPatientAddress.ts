// src/features/ancillary/patient/useVisitPatientAddress.ts
//
// "Who is this visit for?" + "Where should the nurse come?" state shared by the two Review & pay screens
// (Book now and Later): the family-member list, the patient's saved addresses (add new / the current location) and a
// resolver that turns the picked address into the {street_address, lat, lng} the booking APIs want. Rendering lives in
// VisitWhoWhereSection.
//
// The current location is the app's shared one (AuthContext.currentLocation, kept by the Dashboard's single detector): nothing
// here reads the GPS. It becomes the patient's one managed "current location" saved address (currentLocationAddress.ts) and is
// selected by default until the patient picks an address themselves; after that their pick is kept for the whole booking.

import { useCallback, useEffect, useRef, useState } from 'react'
import axios from 'axios'
import Toast from 'react-native-toast-message'
import { useAuth, type LocationData } from '../../../context/AuthContext'
import { useFamilyMembers } from '../../../hooks/useFamilyMembers'
import { requestLocationRefresh } from '../../../hooks/useAutoLocation'
import { offerAppSettings } from '../../../services/locationService'
import {
	createPatientAddress,
	getPatientAddresses,
	type PatientAddress,
} from '../../profile/patient/PatientProfileService'
import type { AppAddressDraft, AppAddressPrefill, CurrentLocationResult } from '../../../components/common'
import type { VisitAddressInput } from '../ancillaryProviderBookingService'
import { ensureCurrentLocationAddress, isManagedAddress, locationKey, methodOf } from './currentLocationAddress'
import { showStatusModal } from '../../../services/apiService'

export const addressLine = (a: PatientAddress) =>
	[a.address_line, a.city, a.state].filter(Boolean).join(', ') + (a.pincode ? ` - ${a.pincode}` : '')

export const apiErrorMessage = (e: unknown) => {
	if (axios.isAxiosError(e)) {
		const data = e.response?.data as { message?: string; detail?: unknown } | undefined
		if (data?.message) return data.message
		if (typeof data?.detail === 'string') return data.detail
		// HTTPException(detail={code, message}): the backend's business-rule refusals (409 / 422).
		const detail = data?.detail as { message?: unknown } | undefined
		if (typeof detail?.message === 'string') return detail.message
	}
	return e instanceof Error ? e.message : ''
}

/** Why there is no shared location to use, in the words the address sheet shows (with a saved address as the way on). */
const unavailableMessage = (status: string) =>
	status === 'denied'
		? 'Location permission is off. Allow location access in your phone settings, or choose a saved address.'
		: status === 'off'
			? "Your phone's location is turned off. Turn it on, or choose a saved address."
			: status === 'detecting'
				? 'Still finding your location. Try again in a moment, or choose a saved address.'
				: "We couldn't find your location. Choose a saved address or add one."

/**
 * A GPS location saved before its accuracy was recorded cannot become an address as it is: ask the Dashboard's one detector to look
 * again (it never reads the GPS from here), which records the accuracy. Anything else is returned as it is.
 */
const withAccuracy = async (loc: LocationData): Promise<LocationData> =>
	methodOf(loc) === 'gps' && loc.accuracy == null ? ((await requestLocationRefresh()) ?? loc) : loc

/**
 * The patient's saved addresses and what the address sheet needs: pick one, add a new one, use the current location. Used by the
 * home-visit booking flows (through useVisitPatientAddress), the lab cart and the pharmacy order; the picked address id is `addressId`.
 *
 * `addressPicked` says the patient chose the address themselves (`initialPicked` carries that over from an earlier screen of the
 * same booking): only then is the choice kept when the shared location changes. Until then the current location is the default.
 */
export function useSavedAddresses(initialAddressId: string | null = null, enabled = true, initialPicked = false) {
	const { currentLocation, locationStatus } = useAuth()

	// ---- Address ----
	const [addresses, setAddresses] = useState<PatientAddress[]>([])
	const [addrLoading, setAddrLoading] = useState(enabled)
	const [addrError, setAddrError] = useState<string | null>(null)
	const [addressId, setAddressIdState] = useState<string | null>(initialAddressId)
	const [addressPicked, setAddressPicked] = useState(initialPicked)
	const [addrOpen, setAddrOpen] = useState(false)
	/** The shared location is there but cannot become an address (not accurate / complete enough): shown in the sheet. */
	const [locationIssue, setLocationIssue] = useState<string | null>(null)
	const [syncedKey, setSyncedKey] = useState<string | null>(null)
	const activeRef = useRef(true)
	const pickedRef = useRef(initialPicked)

	useEffect(() => {
		activeRef.current = true
		return () => {
			activeRef.current = false
		}
	}, [])

	/** The patient chose: from now on a change of the shared location does not replace this address. */
	const markPicked = useCallback(() => {
		pickedRef.current = true
		setAddressPicked(true)
	}, [])

	const setAddressId = useCallback(
		(id: string | null) => {
			markPicked()
			setAddressIdState(id)
		},
		[markPicked]
	)

	const loadAddresses = useCallback(async (selectId?: string | null) => {
		setAddrLoading(true)
		setAddrError(null)
		try {
			const list = await getPatientAddresses()
			if (!activeRef.current) return list
			setAddresses(list)
			setAddressIdState((cur) => {
				const want = selectId ?? cur
				if (want && list.some((a) => a.id === want)) return want
				// the patient's own default (the managed current-location address is never the default)
				return (list.find((a) => a.is_default) ?? list.find((a) => !isManagedAddress(a)) ?? list[0])?.id ?? null
			})
			return list
		} catch {
			if (activeRef.current) setAddrError("Couldn't load your saved addresses")
			return null
		} finally {
			if (activeRef.current) setAddrLoading(false)
		}
	}, [])

	// enabled lets a screen load the list only when it needs it (the pharmacy order does, for home delivery)
	useEffect(() => {
		if (enabled) void loadAddresses()
	}, [enabled, loadAddresses])

	/** Put the managed current-location address into the list (the server already replaced the old one). */
	const applyManaged = useCallback((managed: PatientAddress) => {
		setAddresses((list) => [...list.filter((a) => !isManagedAddress(a) && a.id !== managed.id), managed])
	}, [])

	// The shared location is the default address: once the list is in, make the managed address for it and select it, unless the
	// patient has already chosen another one. Runs again when the shared location changes (e.g. changed on the Dashboard).
	const locKey = locationKey(currentLocation)
	useEffect(() => {
		if (!enabled || addrLoading || addrError || !currentLocation || !locKey) return
		if (pickedRef.current || syncedKey === locKey) return
		let active = true
		const sync = async () => {
			const res = await ensureCurrentLocationAddress(await withAccuracy(currentLocation), addresses)
			if (!active || !activeRef.current) return
			setSyncedKey(locKey)
			if (res.ok) {
				setLocationIssue(null)
				applyManaged(res.address)
				if (!pickedRef.current) setAddressIdState(res.address.id)
			} else {
				setLocationIssue(res.message)
			}
		}
		void sync()
		return () => {
			active = false
		}
		// `addresses` is read when the list has just loaded; a later change to it must not run this again (syncedKey guards).
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [enabled, addrLoading, addrError, locKey, syncedKey, addressPicked])

	// While the default is still being worked out the row shows "Loading…" instead of flashing another address first.
	const awaitingLocation = enabled && !addrError && !addressPicked && !!locKey && syncedKey !== locKey
	const address = addresses.find((a) => a.id === addressId) ?? null

	const saveAddress = async (draft: AppAddressDraft) => {
		const line = [draft.flat, draft.area, draft.landmark ? `Near ${draft.landmark}` : ''].filter(Boolean).join(', ')
		try {
			const res: { data?: { id?: string } } | undefined = await createPatientAddress({
				label: draft.label,
				address_line: line,
				city: draft.city,
				state: draft.state,
				pincode: draft.pincode,
				latitude: draft.latitude,
				longitude: draft.longitude,
				// the patient's first address of their own is the default (the managed current-location one never is)
				is_default: !addresses.some((a) => !isManagedAddress(a)),
			})
			markPicked()
			const list = await loadAddresses(res?.data?.id ?? null)
			if (!res?.data?.id && list) {
				const match = list.find((a) => a.address_line === line && a.pincode === draft.pincode)
				if (match) setAddressIdState(match.id)
			}
			Toast.show({ type: 'success', text1: 'Address saved' })
			return true
		} catch (e) {
			showStatusModal({
				status: 'error',
				title: "Couldn't save the address",
				description: apiErrorMessage(e) || 'Please try again.',
				submitText: 'OK',
			})
			return false
		}
	}

	/** The add form's "Use my current location": prefilled from the SHARED location (no GPS read here). */
	const useCurrentLocation = async (): Promise<AppAddressPrefill | null> => {
		if (!currentLocation || !locKey) {
			Toast.show({
				type: 'error',
				text1: "We couldn't find your location",
				text2: 'Please type the address instead.',
			})
			return null
		}
		const known = (currentLocation.line ?? currentLocation.address).trim()
		return {
			latitude: currentLocation.latitude,
			longitude: currentLocation.longitude,
			...(known && known !== 'Current location' ? { area: known } : {}),
			...(currentLocation.city ? { city: currentLocation.city } : {}),
			...(currentLocation.state ? { state: currentLocation.state } : {}),
			...(currentLocation.pincode ? { pincode: currentLocation.pincode } : {}),
		}
	}

	/**
	 * The sheet's "Current location" card: select the managed address for the shared location. It never reads the GPS: with no
	 * location yet it asks the Dashboard's one detector to look again, and a denied permission gets the settings prompt.
	 */
	const pickCurrentLocation = async (): Promise<CurrentLocationResult> => {
		let location = currentLocation
		if (!location) {
			if (locationStatus === 'denied') offerAppSettings()
			else location = await requestLocationRefresh()
			if (!location) return { kind: 'error', message: unavailableMessage(locationStatus) }
		}
		location = await withAccuracy(location)
		const res = await ensureCurrentLocationAddress(location, addresses)
		if (!res.ok) {
			setLocationIssue(res.message)
			return { kind: 'error', message: res.message }
		}
		setLocationIssue(null)
		applyManaged(res.address)
		setAddressId(res.address.id)
		const key = locationKey(location)
		if (key) setSyncedKey(key)
		Toast.show({
			type: 'success',
			text1: methodOf(location) === 'gps' ? 'Using your current location' : 'Using your selected location',
		})
		return { kind: 'picked' }
	}

	/** What the sheet's Current location card is called (a place the patient picked is not "GPS") and shows under its title. */
	const currentLocationTitle =
		currentLocation && methodOf(currentLocation) === 'manual' ? 'Selected location' : 'Current location'
	const currentLocationLine = currentLocation?.address?.trim() || undefined
	// With the last detected location still shown but access off, say it may be out of date (the Dashboard row offers Settings).
	const accessOff = locationStatus === 'denied' || locationStatus === 'off'
	const currentLocationNote = currentLocation
		? (locationIssue ??
			(accessOff && currentLocation.source === 'auto'
				? 'Location access is off, so this is your last detected location. Enable location from the Home screen to update it.'
				: null))
		: unavailableMessage(locationStatus)

	return {
		addresses,
		addrLoading: addrLoading || awaitingLocation,
		addrError,
		addressId,
		setAddressId,
		addressPicked,
		addrOpen,
		setAddrOpen,
		address,
		loadAddresses,
		saveAddress,
		useCurrentLocation,
		pickCurrentLocation,
		currentLocationTitle,
		currentLocationLine,
		currentLocationNote,
	}
}

export type SavedAddresses = ReturnType<typeof useSavedAddresses>

export function useVisitPatientAddress(
	initialPatientKey = 'self',
	initialAddressId: string | null = null,
	initialPicked = false
) {
	// ---- Patient ----
	const { members, addFromDraft } = useFamilyMembers()
	const [patientKey, setPatientKey] = useState(initialPatientKey)
	const [familyOpen, setFamilyOpen] = useState(false)
	const memberIndex = Math.max(
		0,
		members.findIndex((m) => m.key === patientKey)
	)
	const member = members[memberIndex] ?? members[0]

	// ---- Address ----
	const saved = useSavedAddresses(initialAddressId, true, initialPicked)
	const { address, setAddrOpen } = saved
	const { currentLocation } = useAuth()

	/**
	 * The picked address as the booking APIs want it. Null (with a toast) when none is picked or it can't be
	 * placed on the map.
	 */
	const resolveBookingAddress = async (): Promise<VisitAddressInput | null> => {
		if (!address) {
			Toast.show({ type: 'info', text1: 'Add the visit address first' })
			setAddrOpen(true)
			return null
		}
		let lat = address.latitude
		let lng = address.longitude
		if (lat == null || lng == null) {
			// An address saved without a map position borrows the shared location's (no GPS read here).
			lat = currentLocation && Number.isFinite(currentLocation.latitude) ? currentLocation.latitude : undefined
			lng = currentLocation && Number.isFinite(currentLocation.longitude) ? currentLocation.longitude : undefined
		}
		if (lat == null || lng == null) {
			Toast.show({
				type: 'error',
				text1: "We couldn't place this address on the map",
				text2: 'Choose another address, or set your location from the Home screen.',
			})
			return null
		}
		return { street_address: addressLine(address), latitude: lat, longitude: lng, label: address.label }
	}

	return {
		members,
		addFromDraft,
		patientKey,
		setPatientKey,
		familyOpen,
		setFamilyOpen,
		memberIndex,
		member,
		/** Family member's public id, undefined for the signed-in patient. */
		patientPublicId: member && member.key !== 'self' ? member.id : undefined,
		...saved,
		resolveBookingAddress,
	}
}

export type VisitPatientAddress = ReturnType<typeof useVisitPatientAddress>
