// Doctor "Professional & documents": specialisation (set at registration, read-only), areas of expertise,
// treatments, bio, qualifications list, and ID / PAN documents (upload coming soon). Qualifications save
// through PATCH /doctors/professional-details, expertise / treatments through /profile/additional-details.

import React, { useCallback, useEffect, useState } from 'react'
import {
	AppChipGroup,
	AppDocumentRow,
	AppEditableList,
	AppFormCard,
	AppFormField,
	AppListItemSheet,
	AppSaveFooter,
	type AppListItemField,
} from '../../../components/common'
import { showComingSoon } from '../../../utils/toast'
import {
	fetchDoctorDetails,
	fetchDoctorProfessional,
	fetchExpertiseOptions,
	fetchTreatmentOptions,
	saveDoctorAdditional,
	saveDoctorProfessional,
	type IdLabel,
} from './doctorProfileService'
import { useProfileForm } from '../hooks/useProfileForm'
import { ProfileScreen } from '../shared/components/ProfileScreen'

interface Qualification {
	degree: string
	college: string
	year: string
	proof: string
}

interface ProfessionalDraft {
	speciality: string
	expertise: string[]
	treatments: string[]
	bio: string
	qualifications: Qualification[]
}

const QUAL_FIELDS: AppListItemField[] = [
	{ key: 'degree', label: 'Degree or award', required: true, placeholder: 'e.g. DM Cardiology', maxLength: 100 },
	{ key: 'college', label: 'Institution', required: true, placeholder: 'College or organisation', maxLength: 200 },
	{
		key: 'year',
		label: 'Year',
		placeholder: 'YYYY',
		keyboardType: 'number-pad',
		maxLength: 4,
		validate: (v) =>
			!v || (/^\d{4}$/.test(v) && Number(v) <= new Date().getFullYear()) ? null : 'Enter a valid year',
	},
]

const load = async (): Promise<ProfessionalDraft> => {
	const [prof, details] = await Promise.all([fetchDoctorProfessional(), fetchDoctorDetails()])
	return {
		speciality: (prof.specialities ?? []).map((s) => s.label).join(', '),
		expertise: (details.additionalDetail?.areas_of_expertise ?? []).map((a) => a.id),
		treatments: (details.additionalDetail?.treatments ?? []).map((t) => t.id),
		bio: prof.about || '',
		qualifications: (prof.degrees ?? []).map((d) => ({
			degree: d.degree || d.qualification || '',
			college: d.college || d.institution || '',
			year: d.year_of_passing || '',
			proof: d.qualification_proof_s3_key || '',
		})),
	}
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

const save = async (draft: ProfessionalDraft, saved: ProfessionalDraft) => {
	if (!same(draft.bio, saved.bio) || !same(draft.qualifications, saved.qualifications)) {
		await saveDoctorProfessional({
			about: draft.bio.trim(),
			degrees: draft.qualifications.map((q) => ({
				degree: q.degree,
				college: q.college,
				year_of_passing: q.year,
				qualification_proof_s3_key: q.proof || null,
			})),
		})
	}
	if (!same(draft.expertise, saved.expertise) || !same(draft.treatments, saved.treatments)) {
		await saveDoctorAdditional({ areas_of_expertise: draft.expertise, treatments: draft.treatments })
	}
	return load()
}

const toOptions = (list: IdLabel[]) => list.map((o) => ({ value: o.id, label: o.label }))

export default function ProfessionalDetailsPage() {
	const form = useProfileForm<ProfessionalDraft>({ load, save })
	const { draft, set } = form
	const [expertiseOptions, setExpertiseOptions] = useState<IdLabel[]>([])
	const [treatmentOptions, setTreatmentOptions] = useState<IdLabel[]>([])
	const [editing, setEditing] = useState<number | 'new' | null>(null)

	useEffect(() => {
		fetchExpertiseOptions()
			.then(setExpertiseOptions)
			.catch(() => setExpertiseOptions([]))
		fetchTreatmentOptions()
			.then(setTreatmentOptions)
			.catch(() => setTreatmentOptions([]))
	}, [])

	const editingQual = typeof editing === 'number' ? draft?.qualifications[editing] : undefined

	const saveQual = useCallback(
		(v: Record<string, string>) => {
			if (!draft) return
			const list = [...draft.qualifications]
			const item: Qualification = {
				degree: v.degree,
				college: v.college,
				year: v.year,
				proof: editingQual?.proof ?? '',
			}
			if (typeof editing === 'number') list[editing] = item
			else list.push(item)
			set('qualifications', list)
			setEditing(null)
		},
		[draft, editing, editingQual, set]
	)

	const isNew = !!draft && draft.qualifications.length === 0 && !draft.bio

	return (
		<ProfileScreen
			title="Professional details"
			subtitle={isNew ? 'New doctor · nothing uploaded yet' : 'Qualifications, certificates and ID'}
			loading={form.loading}
			loadError={form.loadError}
			onRetry={form.reload}
			saveError={form.saveError}
			onDismissSaveError={form.clearSaveError}
			footer={<AppSaveFooter onSave={form.submit} dirty={form.dirty} saving={form.saving} />}
			overlays={
				<AppListItemSheet
					visible={editing !== null}
					onClose={() => setEditing(null)}
					title={editingQual ? 'Edit qualification' : 'Add qualification'}
					subtitle="We check the certificate before it shows on your profile"
					fields={QUAL_FIELDS}
					initialValues={
						editingQual
							? { degree: editingQual.degree, college: editingQual.college, year: editingQual.year }
							: undefined
					}
					submitLabel={editingQual ? 'Save qualification' : 'Add qualification'}
					onSubmit={saveQual}
				>
					<AppDocumentRow
						label="Degree certificate"
						fileName={editingQual?.proof}
						status={editingQual?.proof ? 'in_review' : 'missing'}
						optional
						onUpload={() => showComingSoon('Certificate upload will be available soon')}
					/>
				</AppListItemSheet>
			}
		>
			{draft && (
				<>
					<AppFormCard title="Practice">
						<AppFormField
							label="Specialisation"
							value={draft.speciality || 'Not set'}
							editable={false}
							helper="Set when you registered. Contact support to change it."
						/>
						<AppFormField label="Areas of expertise">
							<AppChipGroup
								options={toOptions(expertiseOptions)}
								values={draft.expertise}
								onChange={(v) => set('expertise', v)}
								accessibilityLabel="Areas of expertise"
							/>
						</AppFormField>
						<AppFormField label="Treatments & procedures">
							<AppChipGroup
								options={toOptions(treatmentOptions)}
								values={draft.treatments}
								onChange={(v) => set('treatments', v)}
								accessibilityLabel="Treatments and procedures"
							/>
						</AppFormField>
						<AppFormField
							label="About you"
							value={draft.bio}
							onChangeText={(v) => set('bio', v)}
							placeholder="A short intro patients will read on your profile"
							multiline
							maxLength={1000}
						/>
					</AppFormCard>

					<AppFormCard
						title="Qualifications & achievements"
						helper="New qualifications show on your profile after we check the certificate."
					>
						<AppEditableList
							items={draft.qualifications.map((q, i) => ({
								key: `${q.degree}-${i}`,
								title: q.degree,
								subtitle: [q.college, q.year].filter(Boolean).join(' · '),
								tag: q.proof
									? { label: 'Certificate added', tone: 'confirmed' }
									: { label: 'No certificate', tone: 'neutral' },
							}))}
							icon="school-outline"
							tone="sky"
							onEdit={(i) => setEditing(i)}
							onRemove={(i) =>
								set(
									'qualifications',
									draft.qualifications.filter((_, j) => j !== i)
								)
							}
							addLabel="Add qualification"
							onAdd={() => setEditing('new')}
							emptyText="Add your degrees so patients know your training."
						/>
					</AppFormCard>

					<AppFormCard
						title="Documents"
						helper="Our team checks each upload, usually within 1–2 working days."
					>
						<AppDocumentRow
							label="Government photo ID"
							description="Aadhaar, passport, voter ID or driving licence"
							status="missing"
							onUpload={() => showComingSoon('Document upload will be available soon')}
						/>
						<AppDocumentRow
							label="PAN card"
							description="Needed for payouts and TDS"
							status="missing"
							onUpload={() => showComingSoon('Document upload will be available soon')}
						/>
					</AppFormCard>
				</>
			)}
		</ProfileScreen>
	)
}
