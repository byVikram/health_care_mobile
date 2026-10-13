// Doctor "Professional & documents": specialisation (set at registration, read-only), areas of expertise,
// treatments, bio, qualifications list (each with its degree certificate), and the government ID / PAN card
// documents. Qualifications and every newly picked file save together through PATCH
// /doctors/professional-details (multipart when a file was picked), expertise / treatments through
// /profile/additional-details.

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
import { pickCertificateFile, type PickedFile } from '../../../utils/pickedFile'

interface Qualification {
	/** Set for a degree already saved, so saving again keeps it (and its certificate). */
	id?: number
	degree: string
	college: string
	year: string
	/** The certificate already stored for this degree ('' when none). */
	proof: string
	/** A certificate picked on this device and not saved yet. */
	file?: PickedFile
}

interface ProfessionalDraft {
	speciality: string
	expertise: string[]
	treatments: string[]
	bio: string
	qualifications: Qualification[]
	/** Government photo ID and PAN card already stored ('' when none), and ones picked but not saved yet. */
	identityProof: string
	panCard: string
	identityFile?: PickedFile
	panFile?: PickedFile
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
			identityProof: prof.identity_proof || '',
			panCard: prof.pan_card || '',
		qualifications: (prof.degrees ?? []).map((d) => ({
			id: Number.isFinite(Number(d.id)) ? Number(d.id) : undefined,
			degree: d.degree || d.qualification || '',
			college: d.college || d.institution || '',
			year: d.year_of_passing || '',
			proof: d.degree_certificate || d.qualification_proof_s3_key || '',
		})),
	}
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

const save = async (draft: ProfessionalDraft, saved: ProfessionalDraft) => {
	if (
		!same(draft.bio, saved.bio) ||
		!same(draft.qualifications, saved.qualifications) ||
		draft.identityFile ||
		draft.panFile
	) {
		// one request: the details and any newly picked files are saved together
		await saveDoctorProfessional({
			about: draft.bio.trim(),
			degrees: draft.qualifications.map((q) => ({
				id: q.id,
				degree: q.degree,
				college: q.college,
				year_of_passing: q.year,
				certificate: q.file,
			})),
			identityProof: draft.identityFile,
			panCard: draft.panFile,
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
		let active = true
		const loadExpertise = async () => {
			try {
				const options = await fetchExpertiseOptions()
				if (active) setExpertiseOptions(options)
			} catch {
				if (active) setExpertiseOptions([])
			}
		}
		const loadTreatments = async () => {
			try {
				const options = await fetchTreatmentOptions()
				if (active) setTreatmentOptions(options)
			} catch {
				if (active) setTreatmentOptions([])
			}
		}
		void loadExpertise()
		void loadTreatments()
		return () => {
			active = false
		}
	}, [])

	const editingQual = typeof editing === 'number' ? draft?.qualifications[editing] : undefined

	// The certificate picked in the open sheet; it joins the qualification when the sheet is submitted.
	const [pendingFile, setPendingFile] = useState<PickedFile | null>(null)
	useEffect(() => {
		// only when the sheet opens for another item, not on every edit of the draft
		setPendingFile(editingQual?.file ?? null)
	}, [editing])

	const pickCertificate = useCallback(async () => {
		// a photo or a PDF; null when the doctor cancels
		const file = await pickCertificateFile()
		if (file) setPendingFile(file)
	}, [])

	// Government ID / PAN card: pick now, uploaded with the rest when "Save" is pressed.
	const pickInto = useCallback(
		async (field: 'identityFile' | 'panFile') => {
			const file = await pickCertificateFile()
			if (file) set(field, file)
		},
		[set]
	)

	const saveQual = useCallback(
		(v: Record<string, string>) => {
			if (!draft) return
			const list = [...draft.qualifications]
			const item: Qualification = {
				id: editingQual?.id,
				degree: v.degree,
				college: v.college,
				year: v.year,
				proof: editingQual?.proof ?? '',
				file: pendingFile ?? undefined,
			}
			if (typeof editing === 'number') list[editing] = item
			else list.push(item)
			set('qualifications', list)
			setEditing(null)
		},
		[draft, editing, editingQual, pendingFile, set]
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
						fileName={pendingFile?.name ?? editingQual?.proof}
						status={pendingFile || editingQual?.proof ? 'in_review' : 'missing'}
						optional
						onUpload={() => void pickCertificate()}
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
								tag: q.file
									? { label: 'Uploads when you save', tone: 'neutral' }
									: q.proof
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
								fileName={draft.identityFile?.name ?? draft.identityProof}
								status={draft.identityFile || draft.identityProof ? 'in_review' : 'missing'}
								onUpload={() => void pickInto('identityFile')}
							/>
							<AppDocumentRow
								label="PAN card"
								description="Needed for payouts and TDS"
								fileName={draft.panFile?.name ?? draft.panCard}
								status={draft.panFile || draft.panCard ? 'in_review' : 'missing'}
								onUpload={() => void pickInto('panFile')}
							/>
					</AppFormCard>
				</>
			)}
		</ProfileScreen>
	)
}
