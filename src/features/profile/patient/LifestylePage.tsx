// Patient "Lifestyle": smoking, alcohol, activity, food preference, sleep and occupation, in the same card
// style as the other profile screens. Saved with PATCH /api/patients/me/details.

import React from 'react'
import {
	AppChipGroup,
	AppFormCard,
	AppFormField,
	AppSaveFooter,
	AppSelect,
	FORM_SELECT_PROPS,
} from '../../../components/common'
import { fetchPatientDetails, savePatientDetails, type PatientDetailsData } from './PatientProfileService'
import {
	ACTIVITY_OPTIONS,
	ALCOHOL_OPTIONS,
	FOOD_OPTIONS,
	OCCUPATION_OPTIONS,
	SLEEP_OPTIONS,
	SMOKING_OPTIONS,
	withCurrent,
	type Option,
} from '../config/profileOptions'
import { useProfileForm } from '../hooks/useProfileForm'
import { ProfileScreen } from '../shared/components/ProfileScreen'

interface LifestyleValues {
	smoking: string
	alcohol: string
	activity: string
	food: string
	sleep: string
	occupation: string
}

const toValues = (d: PatientDetailsData): LifestyleValues => ({
	smoking: d.lifestyle.smoking_status || '',
	alcohol: d.lifestyle.alcohol_consumption || '',
	activity: d.lifestyle.activity_level || '',
	food: d.lifestyle.food_preference || '',
	sleep: d.lifestyle.sleep_hours ? String(Math.round(d.lifestyle.sleep_hours)) : '',
	occupation: d.lifestyle.occupation || '',
})

const load = async () => toValues(await fetchPatientDetails())

const save = async (v: LifestyleValues) =>
	toValues(
		await savePatientDetails({
			smoking_status: v.smoking,
			alcohol_consumption: v.alcohol,
			activity_level: v.activity,
			food_preference: v.food,
			...(v.sleep ? { sleep_hours: Number(v.sleep) } : {}),
			occupation: v.occupation,
		})
	)

export default function LifestylePage() {
	const form = useProfileForm<LifestyleValues>({ load, save })
	const { draft, set } = form

	// Habits, exercise and food preference pick from a bottom sheet; sleep stays as chips.
	const pick = (key: keyof LifestyleValues, label: string, options: Option[]) =>
		draft && (
			<AppFormField label={label}>
				<AppSelect
					{...FORM_SELECT_PROPS}
					options={withCurrent(options, draft[key])}
					value={draft[key]}
					onSelect={(v) => set(key, v)}
					placeholder={`Select ${label.toLowerCase()}`}
					presentation="sheet"
					sheetTitle={label}
				/>
			</AppFormField>
		)

	// Single-choice chips for the short sleep list.
	const chips = (key: keyof LifestyleValues, label: string, options: Option[]) =>
		draft && (
			<AppFormField label={label}>
				<AppChipGroup
					options={withCurrent(options, draft[key])}
					values={draft[key] ? [draft[key]] : []}
					onChange={(v) => set(key, v[0] ?? '')}
					single
					allowDeselect
					accessibilityLabel={label}
				/>
			</AppFormField>
		)

	return (
		<ProfileScreen
			title="Lifestyle"
			subtitle="Helps doctors give better advice"
			loading={form.loading}
			loadError={form.loadError}
			onRetry={form.reload}
			saveError={form.saveError}
			onDismissSaveError={form.clearSaveError}
			footer={<AppSaveFooter onSave={form.submit} dirty={form.dirty} saving={form.saving} />}
		>
			{draft && (
				<>
					<AppFormCard title="Habits">
						{pick('smoking', 'Smoking', SMOKING_OPTIONS)}
						{pick('alcohol', 'Alcohol', ALCOHOL_OPTIONS)}
					</AppFormCard>
					<AppFormCard title="Activity & diet">
						{pick('activity', 'Exercise', ACTIVITY_OPTIONS)}
						{pick('food', 'Food preference', FOOD_OPTIONS)}
						{chips('sleep', 'Sleep per night', SLEEP_OPTIONS)}
					</AppFormCard>
					<AppFormCard title="Work">
						<AppFormField label="Occupation">
							<AppSelect
								{...FORM_SELECT_PROPS}
								options={withCurrent(OCCUPATION_OPTIONS, draft.occupation)}
								value={draft.occupation}
								onSelect={(v) => set('occupation', v)}
								placeholder="Select occupation"
								presentation="sheet"
								sheetTitle="Occupation"
							/>
						</AppFormField>
					</AppFormCard>
				</>
			)}
		</ProfileScreen>
	)
}
