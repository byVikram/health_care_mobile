// Loads what the profile hub shows for a role (name, completion, badges...) and reloads it every time the
// hub regains focus, so edits made on a sub-screen show up when the user comes back. Each request fails
// soft: a failed call just leaves its part of the hub at the default.

import { useCallback, useState } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import { useAncillarySpecialty, useAuth } from '../../../context/AuthContext'
import { getSessions } from '../../auth/authService'
import { fetchProviderProfile } from '../../ancillary/ancillaryService'
import {
	fetchPatientDetails,
	fetchPatientSummary,
	getFamilyMembers,
	getPatientAddresses,
} from '../patient/PatientProfileService'
import { fetchDoctorDetails } from '../doctor/doctorProfileService'
import { ancillaryConfigFor } from '../config/ancillaryProfileConfig'
import type { HubData, HubRole } from '../config/profileHubConfig'
import { buildS3Url } from '../../../utils/s3Utils'

const settle = async <T>(p: Promise<T>): Promise<T | null> => {
	try {
		return await p
	} catch {
		return null
	}
}

const maskPhone = (phone?: string | null) => {
	const digits = (phone || '').replace(/\D/g, '').slice(-10)
	if (digits.length < 10) return phone || ''
	return `+91 ${digits.slice(0, 2)}xxx xx${digits.slice(7)}`
}

const yearsLabel = (years?: number | null) => (years ? `${years} yr${years > 1 ? 's' : ''}` : '')

export function useProfileHubData(role: HubRole) {
	const { user } = useAuth()
	const { specialtyId } = useAncillarySpecialty()
	const [data, setData] = useState<HubData>(() => ({
		name: user?.name || '',
		avatarUri: user?.avatar || null,
		roleDetail: '',
		completion: null,
		verified: false,
		inReview: false,
		mobileVerified: true,
		newLogins: 0,
		familyNames: [],
		incompleteMember: null,
		incompleteCount: 0,
		addressSummary: '',
		hospitalCount: 0,
		hasBio: false,
		roleTitle: role === 'ancillary' ? ancillaryConfigFor(specialtyId).roleTitle : '',
	}))
	const [loading, setLoading] = useState(true)

	const load = useCallback(async () => {
		const sessionsP = settle(getSessions())

		if (role === 'patient') {
			const [summary, details, members, addresses, sessions] = await Promise.all([
				settle(fetchPatientSummary()),
				settle(fetchPatientDetails()),
				settle(getFamilyMembers()),
				settle(getPatientAddresses()),
				sessionsP,
			])
			const others = (members ?? []).filter((m) => !m.is_self)
			const incomplete = others.filter((m) => m.is_complete === false)
			const sortedAddresses = [...(addresses ?? [])].sort((a, b) => Number(b.is_default) - Number(a.is_default))
			setData((cur) => ({
				...cur,
				name: details?.personal.name || summary?.name || cur.name,
				avatarUri: buildS3Url(summary?.avatar_url || details?.personal.avatar) || cur.avatarUri,
				roleDetail: maskPhone(details?.personal.contact_number),
				completion: summary?.profile_completion ?? cur.completion,
				familyNames: others.map((m) => m.name),
				incompleteMember: incomplete[0]
					? { id: incomplete[0].public_id || incomplete[0].id, name: incomplete[0].name }
					: null,
				incompleteCount: incomplete.length,
				addressSummary: sortedAddresses
					.slice(0, 2)
					.map((a, i) => (i === 0 && a.is_default ? `${a.label} (default)` : a.label))
					.join(', '),
				newLogins: (sessions?.data ?? []).filter((s) => s.is_new).length,
			}))
		} else if (role === 'doctor') {
			const [details, sessions] = await Promise.all([settle(fetchDoctorDetails()), sessionsP])
			const personal = details?.personal_details
			const professional = details?.professional_details
			const speciality = professional?.specialities?.[0]?.label
			setData((cur) => ({
				...cur,
				name: personal?.name || cur.name,
				avatarUri: buildS3Url(personal?.avatar_s3_key) || cur.avatarUri,
				roleDetail: [speciality, yearsLabel(professional?.experience_years)].filter(Boolean).join(' · '),
				completion: details?.profile_completion ?? cur.completion,
				verified: !!personal?.is_verified,
				hospitalCount: details?.hospitals?.length ?? 0,
				hasBio: !!professional?.about,
				newLogins: (sessions?.data ?? []).filter((s) => s.is_new).length,
			}))
		} else {
			const [profile, sessions] = await Promise.all([settle(fetchProviderProfile()), sessionsP])
			const config = ancillaryConfigFor(profile?.specialty_id || profile?.specialty?.label || specialtyId)
			const status = profile?.verification_status
			setData((cur) => ({
				...cur,
				name: profile?.name || cur.name,
				avatarUri: buildS3Url(profile?.avatar_s3_key) || cur.avatarUri,
				roleTitle: profile?.sub_specialty?.label || config.roleTitle,
				roleDetail: yearsLabel(profile?.experience_years),
				completion: profile?.profile_completion ?? cur.completion,
				verified: status === 'approved',
				inReview: !!profile?.license_number && status !== 'approved' && status !== 'rejected',
				newLogins: (sessions?.data ?? []).filter((s) => s.is_new).length,
			}))
		}
		setLoading(false)
	}, [role, specialtyId])

	useFocusEffect(
		useCallback(() => {
			void load()
		}, [load])
	)

	return { data, loading, reload: load }
}
