// Doctor "My hospitals & clinics": places the doctor consults at (add / edit / remove -- remove is a soft
// delete on the backend) and the consultation rules, which apply to every place. Place changes save
// straight away; the rules save with the footer button.

import React, { useCallback, useState } from 'react'
import Toast from 'react-native-toast-message'
import {
	AppConfirmSheet,
	AppEditableList,
	AppFormCard,
	AppFormField,
	AppSaveFooter,
	AppSelect,
	FORM_SELECT_PROPS,
	StatusModal,
} from '../../../components/common'
import { formatInr } from '../../../config/theme'
import {
	createDoctorHospital,
	deleteDoctorHospital,
	fetchDoctorHospitals,
	updateDoctorHospital,
	type DoctorHospitalInput,
	type DoctorHospitalLink,
} from './doctorProfileService'
import { HospitalSheet } from './components/HospitalSheet'
import { useProfileForm } from '../hooks/useProfileForm'
import { ProfileScreen } from '../shared/components/ProfileScreen'

interface Rules {
	followUp: string
	reschedule: string
	payAtClinic: string
}

const FOLLOW_UP_OPTIONS = [
	{ value: '0', label: 'No free follow-up' },
	{ value: '3', label: '3 days' },
	{ value: '7', label: '7 days' },
	{ value: '14', label: '14 days' },
	{ value: '30', label: '30 days' },
]
const RESCHEDULE_OPTIONS = [
	{ value: '1', label: '1 hour before' },
	{ value: '2', label: '2 hours before' },
	{ value: '6', label: '6 hours before' },
	{ value: '24', label: '24 hours before' },
]
const PAY_OPTIONS = [
	{ value: 'yes', label: 'Allowed' },
	{ value: 'no', label: 'Not allowed' },
]

const withValue = (options: { value: string; label: string }[], value: string, suffix: string) =>
	value && !options.some((o) => o.value === value) ? [...options, { value, label: `${value} ${suffix}` }] : options

const placeSubtitle = (h: DoctorHospitalLink) => {
	const fees = [
		h.hospital?.offline_consultation_fee ? `Clinic ${formatInr(h.hospital.offline_consultation_fee)}` : '',
		h.hospital?.video_consultation_fee ? `Video ${formatInr(h.hospital.video_consultation_fee)}` : '',
	].filter(Boolean)
	return [h.hospital?.address, fees.join(' · ')].filter(Boolean).join(' · ')
}

export default function HospitalsPage() {
	const [hospitals, setHospitals] = useState<DoctorHospitalLink[]>([])
	const [sheet, setSheet] = useState<{ hospital: DoctorHospitalLink | null } | null>(null)
	const [removing, setRemoving] = useState<DoctorHospitalLink | null>(null)
	const [actionError, setActionError] = useState<string | null>(null)

	const load = useCallback(async (): Promise<Rules> => {
		const list = await fetchDoctorHospitals()
		setHospitals(list)
		const rules = list[0]?.appointment_rules
		return {
			followUp: String(rules?.free_followup_validity_days ?? 7),
			reschedule: String(rules?.reschedule_allowed_until_hours ?? 2),
			payAtClinic: rules?.allow_pay_later ? 'yes' : 'no',
		}
	}, [])

	const save = useCallback(
		async (rules: Rules) => {
			await Promise.all(
				hospitals.map((h) =>
					updateDoctorHospital(h.id, {
						free_followup_validity_days: Number(rules.followUp),
						reschedule_allowed_until_hours: Number(rules.reschedule),
						allow_pay_later: rules.payAtClinic === 'yes',
					})
				)
			)
			return rules
		},
		[hospitals]
	)

	const form = useProfileForm<Rules>({ load, save, successMessage: 'Consultation rules saved' })
	const { draft, set } = form

	const refreshList = async () => setHospitals(await fetchDoctorHospitals())

	const submitPlace = async (input: DoctorHospitalInput) => {
		try {
			if (sheet?.hospital) await updateDoctorHospital(sheet.hospital.id, input)
			else await createDoctorHospital(input)
			setSheet(null)
			Toast.show({ type: 'success', text1: sheet?.hospital ? 'Place updated' : 'Place added' })
			await refreshList()
		} catch (e) {
			setActionError(e instanceof Error ? e.message : 'Please try again.')
		}
	}

	const removePlace = async () => {
		if (!removing) return
		const target = removing
		try {
			await deleteDoctorHospital(target.id)
			setRemoving(null)
			Toast.show({ type: 'success', text1: `${target.hospital?.name ?? 'Place'} removed` })
			await refreshList()
		} catch (e) {
			setRemoving(null)
			setActionError(e instanceof Error ? e.message : 'Please try again.')
		}
	}

	return (
		<ProfileScreen
			title="My hospitals & clinics"
			subtitle="Where patients can visit you"
			loading={form.loading}
			loadError={form.loadError}
			onRetry={form.reload}
			saveError={form.saveError}
			onDismissSaveError={form.clearSaveError}
			footer={
				hospitals.length ? (
					<AppSaveFooter
						onSave={form.submit}
						dirty={form.dirty}
						saving={form.saving}
						label="Save consultation rules"
					/>
				) : null
			}
			overlays={
				<>
					<HospitalSheet
						visible={!!sheet}
						onClose={() => setSheet(null)}
						hospital={sheet?.hospital ?? null}
						onSubmit={submitPlace}
					/>
					<AppConfirmSheet
						visible={!!removing}
						onClose={() => setRemoving(null)}
						title={`Remove ${removing?.hospital?.name ?? 'this place'}?`}
						message="Patients can't book you here any more. Existing appointments stay as they are."
						confirmLabel="Remove"
						onConfirm={removePlace}
					/>
					<StatusModal
						visible={!!actionError}
						status="error"
						title="Something went wrong"
						description={actionError || ''}
						submitText="OK"
						onSubmit={() => setActionError(null)}
					/>
				</>
			}
		>
			<AppFormCard title="Places you consult">
				<AppEditableList
					items={hospitals.map((h) => ({
						key: h.id,
						title: h.hospital?.name || 'Hospital',
						subtitle: placeSubtitle(h),
						tag: h.is_primary ? { label: 'Primary', tone: 'mint' } : null,
					}))}
					icon="hospital-building"
					tone="peach"
					onEdit={(i) => setSheet({ hospital: hospitals[i] })}
					onRemove={(i) => setRemoving(hospitals[i])}
					addLabel="Add hospital or clinic"
					onAdd={() => setSheet({ hospital: null })}
					emptyText="Add where patients can visit you."
				/>
			</AppFormCard>

			{draft && hospitals.length > 0 && (
				<AppFormCard title="Consultation rules" helper="These apply at every place you consult.">
					<AppFormField label="Free follow-up within">
						<AppSelect
							{...FORM_SELECT_PROPS}
							options={withValue(FOLLOW_UP_OPTIONS, draft.followUp, 'days')}
							value={draft.followUp}
							onSelect={(v) => set('followUp', v)}
							presentation="sheet"
							sheetTitle="Free follow-up within"
						/>
					</AppFormField>
					<AppFormField label="Patients can reschedule until">
						<AppSelect
							{...FORM_SELECT_PROPS}
							options={withValue(RESCHEDULE_OPTIONS, draft.reschedule, 'hours before')}
							value={draft.reschedule}
							onSelect={(v) => set('reschedule', v)}
							presentation="sheet"
							sheetTitle="Patients can reschedule until"
						/>
					</AppFormField>
					<AppFormField label="Pay at clinic">
						<AppSelect
							{...FORM_SELECT_PROPS}
							options={PAY_OPTIONS}
							value={draft.payAtClinic}
							onSelect={(v) => set('payAtClinic', v)}
							presentation="sheet"
							sheetTitle="Pay at clinic"
						/>
					</AppFormField>
				</AppFormCard>
			)}
		</ProfileScreen>
	)
}
