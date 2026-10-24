// src/features/doctor/dashboard/DoctorStatusBanner.tsx
//
// The banner at the top of the doctor's Home: "Complete your profile" until the profile is complete, then
// "Verification pending" until an admin approves it. Nothing once the doctor is verified. Driven by
// GET /api/doctors/me/status, which the home screen loads every time it is shown, so the banner disappears as soon
// as the doctor comes back to it after an approval. While the profile is incomplete the status also says what is
// missing, so the banner names it and opens the screen where it is added.

import React from 'react'
import { ProfileHubBanner } from '../../profile/shared/components/ProfileHubBanner'

export type DoctorStatus = { profile_completed: boolean; is_verified: boolean; missing?: string[] }

/** Where the banner sends the doctor: the personal-details screen (also holds the photo), the professional one
 * (registration, qualifications, ID) or, when nothing specific is known, the profile hub. */
export type DoctorStatusTarget = 'personal' | 'professional' | 'profile'

type Props = {
	/** Null until the first answer (nothing is shown then), and if it never comes. */
	status: DoctorStatus | null
	onOpen: (target: DoctorStatusTarget) => void
}

const MISSING_LABELS: Record<string, { label: string; target: DoctorStatusTarget }> = {
	personal_details: { label: 'your personal details', target: 'personal' },
	photo: { label: 'a profile photo', target: 'personal' },
	registration: { label: 'your registration number', target: 'professional' },
	degree: { label: 'a qualification', target: 'professional' },
	government_id: { label: 'a government ID', target: 'professional' },
}

function describeMissing(missing: string[] | undefined): { subtitle: string; target: DoctorStatusTarget } {
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

export function DoctorStatusBanner({ status, onOpen }: Props) {
	if (!status || status.is_verified) return null

	if (!status.profile_completed) {
		const { subtitle, target } = describeMissing(status.missing)
		return (
			<ProfileHubBanner
				tone="warning"
				icon="account-alert-outline"
				title="Complete your profile"
				subtitle={subtitle}
				onPress={() => onOpen(target)}
			/>
		)
	}

	return (
		<ProfileHubBanner
			tone="warning"
			icon="clock-outline"
			title="Verification pending"
			subtitle="Your profile is under review. Patients can't find or book you until it's approved."
			onPress={() => onOpen('profile')}
		/>
	)
}

export default DoctorStatusBanner
