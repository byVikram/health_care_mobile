// src/features/ancillary/patient/useVisitPatientAddress.ts
//
// "Who is this visit for?" + "Where should the nurse come?" state shared by the two Review & pay screens
// (Book now and Later): the family-member list, the patient's saved addresses (pick / add new) and a resolver that turns the picked address into the {street_address, lat, lng} the booking
// APIs want. Rendering lives in VisitWhoWhereSection.

import { useCallback, useEffect, useRef, useState } from 'react'
import axios from 'axios'
import Toast from 'react-native-toast-message'
import { useFamilyMembers } from '../../../hooks/useFamilyMembers'
import {
	createPatientAddress,
	getPatientAddresses,
	type PatientAddress,
} from '../../profile/patient/PatientProfileService'
import type { AppAddressDraft } from '../../../components/common'
import type { VisitAddressInput } from '../ancillaryProviderBookingService'
import { useBookingLocation } from './useBookingLocation'
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

export function useVisitPatientAddress(initialPatientKey = 'self', initialAddressId: string | null = null) {
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
	const [addressId, setAddressId] = useState<string | null>(initialAddressId)
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
			showStatusModal({
				status: 'error',
				title: "Couldn't save the address",
				description: apiErrorMessage(e) || 'Please try again.',
				submitText: 'OK',
			})
			return false
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
				text2: 'Turn on location, or edit the address and add its PIN code.',
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
		resolveBookingAddress,
	}
}

export type VisitPatientAddress = ReturnType<typeof useVisitPatientAddress>
