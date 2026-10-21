// Patient "Health details": body & blood, allergies & conditions, current medicines, family history and
// emergency contacts. Saved with PATCH /api/patients/me/details.

import React from 'react'
import { StyleSheet } from 'react-native'
import { AppInfoBanner, AppSaveFooter } from '../../../components/common'
import { fetchPatientDetails, savePatientDetails } from './PatientProfileService'
import { HealthFields, detailsToHealth, healthToPatch, type HealthValues } from './components/HealthFields'
import { useProfileForm } from '../hooks/useProfileForm'
import { ProfileScreen } from '../shared/components/ProfileScreen'

const load = async () => detailsToHealth(await fetchPatientDetails())

const save = async (draft: HealthValues) => detailsToHealth(await savePatientDetails(healthToPatch(draft, true)))

export default function HealthDetailsPage() {
	const form = useProfileForm<HealthValues>({ load, save })

	return (
		<ProfileScreen
			title="Health details"
			subtitle="Shared with your care team only"
			loading={form.loading}
			loadError={form.loadError}
			onRetry={form.reload}
			saveError={form.saveError}
			onDismissSaveError={form.clearSaveError}
			footer={<AppSaveFooter onSave={form.submit} dirty={form.dirty} saving={form.saving} />}
		>
			<AppInfoBanner
				tone="info"
				icon={null}
				title="Doctors and nurses see this only for your bookings"
				subtitle="You can change it any time."
				style={styles.banner}
			/>
			{form.draft && (
				<HealthFields
					value={form.draft}
					onChange={(patch) => form.setDraft((cur) => (cur ? { ...cur, ...patch } : cur))}
					ownerFields
				/>
			)}
		</ProfileScreen>
	)
}

const styles = StyleSheet.create({
	banner: {
		marginHorizontal: 16,
		marginTop: 12,
	},
})
