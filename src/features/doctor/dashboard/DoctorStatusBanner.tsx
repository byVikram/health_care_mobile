// src/features/doctor/dashboard/DoctorStatusBanner.tsx
//
// The banner at the top of the doctor's Home, Schedule and Questions tabs: "Complete your profile" until the profile
// is complete, then "Verification pending" until an admin approves it. Nothing once the doctor is verified. The state
// comes from useDoctorStatus. While the profile is incomplete the status also says what is missing, so the banner
// names it and opens the screen where it is added.

import React from 'react'
import { useNavigation } from '@react-navigation/native'
import { ROUTES } from '../../../navigation/routes'
import { ProfileHubBanner } from '../../profile/shared/components/ProfileHubBanner'

export type DoctorStatus = { profile_completed: boolean; is_verified: boolean; missing?: string[] }

/** Where the banner sends the doctor: the personal-details screen (also holds the photo), the professional one
 * (registration, qualifications, ID) or, when nothing specific is known, the profile hub. */
type Target = 'personal' | 'professional' | 'profile'

type Props = {
	/** Null until the first answer (nothing is shown then), and if it never comes. */
	status: DoctorStatus | null
}

const MISSING_LABELS: Record<string, { label: string; target: Target }> = {
	personal_details: { label: 'your personal details', target: 'personal' },
	photo: { label: 'a profile photo', target: 'personal' },
	registration: { label: 'your registration number', target: 'professional' },
	degree: { label: 'a qualification', target: 'professional' },
	government_id: { label: 'a government ID', target: 'professional' },
}

const ROUTE_FOR: Record<Target, string> = {
	personal: ROUTES.STACK.PROFILE_PERSONAL,
	professional: ROUTES.STACK.DOCTOR_PROFESSIONAL,
	profile: ROUTES.MAIN.PROFILE,
}

function describeMissing(missing: string[] | undefined): { subtitle: string; target: Target } {
	const known = (missing ?? []).filter((key) => key in MISSING_LABELS)
	if (known.length === 0) {
		return {
			subtitle: 'Add your registration, qualifications, ID and photo so we can review and verify you.',
			target: 'profile',
		}
	}
	const labels = known.map((key) => MISSING_LABELS[key].label)
	const list = labels.length === 1 ? labels[0] : `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`
	return {
		subtitle: `Add ${list} so we can review and verify you.`,
		target: MISSING_LABELS[known[0]].target,
	}
}

export function DoctorStatusBanner({ status }: Props) {
	const navigation = useNavigation<any>()
	if (!status || status.is_verified) return null

	if (!status.profile_completed) {
		const { subtitle, target } = describeMissing(status.missing)
		return (
			<ProfileHubBanner
				tone="warning"
				icon="account-alert-outline"
				title="Complete your profile"
				subtitle={subtitle}
				onPress={() => navigation.navigate(ROUTE_FOR[target])}
			/>
		)
	}

	return (
		<ProfileHubBanner
			tone="warning"
			icon="clock-outline"
			title="Verification pending"
			subtitle="Your profile is under review. Patients can't find or book you until it's approved."
			onPress={() => navigation.navigate(ROUTE_FOR.profile)}
		/>
	)
}

export default DoctorStatusBanner
