// Travel radius -- the ancillary provider's profile > "Travel radius": how far the provider will go for a visit. A request is
// offered only to providers whose radius covers the patient's address. A provider keeps no weekly hours or days off: the only
// availability is the online switch on Today.

import React, { useCallback } from 'react'
import { AppChipGroup, AppFormCard, AppSaveFooter } from '../../../components/common'
import { useAncillarySpecialty } from '../../../context/AuthContext'
import { fetchProviderProfile } from '../../ancillary/ancillaryService'
import { ancillaryConfigFor } from '../config/ancillaryProfileConfig'
import { useProfileForm } from '../hooks/useProfileForm'
import { ProfileScreen } from '../shared/components/ProfileScreen'
import { saveProviderTravelRadius } from './ancillaryProfileService'

interface TravelDraft {
	travel: number
}

export default function TravelRadiusPage() {
	const { specialtyId } = useAncillarySpecialty()
	const config = ancillaryConfigFor(specialtyId)

	const load = useCallback(async (): Promise<TravelDraft> => {
		const profile = await fetchProviderProfile()
		return {
			travel: Math.round(profile?.geofence_radius_km ?? profile?.geofence_radius ?? config.travelOptions[1]),
		}
	}, [config])

	const save = useCallback(async (draft: TravelDraft, saved: TravelDraft) => {
		if (draft.travel !== saved.travel) await saveProviderTravelRadius(draft.travel)
		return draft
	}, [])

	const form = useProfileForm<TravelDraft>({ load, save, successMessage: 'Travel radius saved' })
	const { draft } = form

	return (
		<ProfileScreen
			title="Travel radius"
			subtitle="How far you will go for a visit"
			loading={form.loading}
			loadError={form.loadError}
			onRetry={form.reload}
			saveError={form.saveError}
			onDismissSaveError={form.clearSaveError}
			footer={
				<AppSaveFooter
					onSave={form.submit}
					dirty={form.dirty}
					saving={form.saving}
					label="Save travel radius"
				/>
			}
		>
			{draft && (
				<AppFormCard
					title="How far I travel"
					helper="You are offered requests only inside this distance from where you are."
				>
					<AppChipGroup
						options={config.travelOptions.map((km) => ({ value: String(km), label: `${km} km` }))}
						values={[String(draft.travel)]}
						onChange={(v) => v[0] && form.set('travel', Number(v[0]))}
						single
						accessibilityLabel="How far I travel"
					/>
				</AppFormCard>
			)}
		</ProfileScreen>
	)
}
