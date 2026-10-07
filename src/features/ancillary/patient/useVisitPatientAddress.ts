// src/features/ancillary/patient/useVisitPatientAddress.ts
//
// "Who is this visit for?" + "Where should the nurse come?" state shared by the two Review & pay screens
// (Book now and Later): the family-member list, the patient's saved addresses (add new / use current
// location) and a resolver that turns the picked address into the {street_address, lat, lng} the booking
// APIs want. Rendering lives in VisitWhoWhereSection.

import { useCallback, useEffect, useRef, useState } from 'react'
import * as Location from 'expo-location'
import axios from 'axios'
import Toast from 'react-native-toast-message'
import { useFamilyMembers } from '../../../hooks/useFamilyMembers'
import { getCurrentLocation } from '../../../services/locationService'
import {
	createPatientAddress,
	getPatientAddresses,
	type PatientAddress,
} from '../../profile/patient/PatientProfileService'
import type { AppAddressDraft, AppAddressPrefill } from '../../../components/common'
import type { VisitAddressInput } from '../ancillaryProviderBookingService'
import { useBookingLocation } from './useBookingLocation'

export const addressLine = (a: PatientAddress) =>
	[a.address_line, a.city, a.state].filter(Boolean).join(', ') + (a.pincode ? ` - ${a.pincode}` : '')

export const apiErrorMessage = (e: unknown) => {
	if (axios.isAxiosError(e)) {
		const data = e.response?.data as { message?: string; detail?: unknown } | undefined
		if (data?.message) return data.message
		if (typeof data?.detail === 'string') return data.detail
	}
	return e instanceof Error ? e.message : ''
}

export function useVisitPatientAddress(initialPatientKey = 'self') {
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
	const [addresses, setAddresses] = useState<PatientAddress[]>([])
	const [addrLoading, setAddrLoading] = useState(true)
	const [addrError, setAddrError] = useState<string | null>(null)
	const [addressId, setAddressId] = useState<string | null>(null)
	const [addrOpen, setAddrOpen] = useState(false)
	const activeRef = useRef(true)
	const { coords: bookingCoords, locate } = useBookingLocation()

	useEffect(() => {
		activeRef.current = true
		return () => {
			activeRef.current = false
		}
	}, [])

	const loadAddresses = useCallback(async (selectId?: string | null) => {
		setAddrLoading(true)
		setAddrError(null)
		try {
			const list = await getPatientAddresses()
			if (!activeRef.current) return list
			setAddresses(list)
			setAddressId((cur) => {
				const want = selectId ?? cur
				if (want && list.some((a) => a.id === want)) return want
				return (list.find((a) => a.is_default) ?? list[0])?.id ?? null
			})
			return list
		} catch {
			if (activeRef.current) setAddrError("Couldn't load your saved addresses")
			return null
		} finally {
			if (activeRef.current) setAddrLoading(false)
		}
	}, [])

	useEffect(() => {
		void loadAddresses()
	}, [loadAddresses])

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
				is_default: addresses.length === 0,
			})
			const list = await loadAddresses(res?.data?.id ?? null)
			if (!res?.data?.id && list) {
				const match = list.find((a) => a.address_line === line && a.pincode === draft.pincode)
				if (match) setAddressId(match.id)
			}
			Toast.show({ type: 'success', text1: 'Address saved' })
			return true
		} catch (e) {
			Toast.show({
				type: 'error',
				text1: "Couldn't save the address",
				text2: apiErrorMessage(e) || 'Please try again.',
			})
			return false
		}
	}

	const useCurrentLocation = async (): Promise<AppAddressPrefill | null> => {
		try {
			const c = await getCurrentLocation()
			let prefill: AppAddressPrefill = { latitude: c.latitude, longitude: c.longitude }
			try {
				const [geo] = await Location.reverseGeocodeAsync(c)
				if (geo) {
					prefill = {
						...prefill,
						area: [geo.street, geo.district || geo.subregion].filter(Boolean).join(', ') || undefined,
						city: geo.city || undefined,
						state: geo.region || undefined,
						pincode: geo.postalCode || undefined,
					}
				}
			} catch {
				// Coordinates alone are still useful; the patient types the rest.
			}
			return prefill
		} catch (e) {
			const denied = e instanceof Error && /denied/i.test(e.message)
			Toast.show({
				type: 'error',
				text1: denied ? 'Location permission is off' : "Couldn't get your location",
				text2: denied ? 'Allow location access, or type the address.' : 'Please type the address instead.',
			})
			return null
		}
	}

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
			const c = bookingCoords ?? (await locate())
			lat = c?.latitude
			lng = c?.longitude
		}
		if (lat == null || lng == null) {
			Toast.show({
				type: 'error',
				text1: "We couldn't place this address on the map",
				text2: 'Turn on location, or add the address with "Use my current location".',
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
		addresses,
		addrLoading,
		addrError,
		addressId,
		setAddressId,
		addrOpen,
		setAddrOpen,
		address,
		loadAddresses,
		saveAddress,
		useCurrentLocation,
		resolveBookingAddress,
	}
}

export type VisitPatientAddress = ReturnType<typeof useVisitPatientAddress>
