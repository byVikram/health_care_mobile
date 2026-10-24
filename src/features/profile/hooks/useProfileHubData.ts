// Loads what the profile hub shows for a role (name, completion, badges...) and reloads it every time the
// hub regains focus, so edits made on a sub-screen show up when the user comes back. One light call per role
// (GET .../profile-hub): the hub no longer loads the data of the screens behind it -- each of those screens
// fetches its own when it is opened. A failed call just leaves the hub at what it had.

import { useCallback, useState } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import { useAncillarySpecialty, useAuth } from '../../../context/AuthContext'
import { fetchPatientHub } from '../patient/PatientProfileService'
import { fetchDoctorHub } from '../doctor/doctorProfileService'
import { fetchProviderHub } from '../ancillary/ancillaryProfileService'
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
		if (role === 'patient') {
			const hub = await settle(fetchPatientHub())
			if (hub) {
				setData((cur) => ({
					...cur,
					name: hub.name || cur.name,
					avatarUri: buildS3Url(hub.avatar_url) || cur.avatarUri,
					roleDetail: hub.phone_masked,
					completion: hub.profile_completion ?? cur.completion,
					familyNames: hub.family_names,
					incompleteMember: hub.incomplete_member,
					incompleteCount: hub.incomplete_count,
					addressSummary: hub.addresses
						.map((a, i) => (i === 0 && a.is_default ? `${a.label} (default)` : a.label))
						.join(', '),
					newLogins: hub.new_logins,
				}))
			}
		} else if (role === 'doctor') {
			const hub = await settle(fetchDoctorHub())
			if (hub) {
				setData((cur) => ({
					...cur,
					name: hub.name || cur.name,
					avatarUri: buildS3Url(hub.avatar_url) || cur.avatarUri,
					roleDetail: [hub.speciality, yearsLabel(hub.experience_years)].filter(Boolean).join(' · '),
					completion: hub.profile_completion ?? cur.completion,
					verified: hub.is_verified,
					hospitalCount: hub.hospital_count,
					hasBio: hub.has_about,
					newLogins: hub.new_logins,
				}))
			}
		} else {
			const hub = await settle(fetchProviderHub())
			if (hub) {
				const config = ancillaryConfigFor(hub.specialty_id || hub.specialty_name || specialtyId)
				const status = hub.verification_status
				setData((cur) => ({
					...cur,
					name: hub.name || cur.name,
					avatarUri: buildS3Url(hub.avatar_url) || cur.avatarUri,
					roleTitle: hub.sub_specialty_label || config.roleTitle,
					roleDetail: yearsLabel(hub.experience_years),
					completion: hub.profile_completion ?? cur.completion,
					verified: status === 'approved',
					inReview: hub.has_license && status !== 'approved' && status !== 'rejected',
					newLogins: hub.new_logins,
				}))
			}
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
