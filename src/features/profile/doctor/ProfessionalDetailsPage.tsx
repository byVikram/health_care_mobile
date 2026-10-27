// Doctor "Professional & documents": specialisation (set at registration, read-only), areas of expertise,
// treatments, bio, qualifications list (each with its degree certificate), and government IDs (at least one, of a
// type the doctor picks from a dropdown; more are optional). Qualifications and every newly picked file save together through PATCH
// /doctors/professional-details (multipart when a file was picked), expertise / treatments through
// /profile/additional-details.

import React, { useCallback, useEffect, useState } from 'react'
import { z } from 'zod'
import {
	AppChipPicker,
	AppDocumentRow,
	DOCUMENT_LIST_TAG,
	documentRowStatus,
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
	type DegreeToAdd,
	type DegreeToUpdate,
	type DoctorProfessionalPatch,
	type IdLabel,
	type IdentityDocument,
	type IdentityDocumentType,
} from './doctorProfileService'
import { useProfileForm } from '../hooks/useProfileForm'
import { IdentityDocumentsField } from '../shared/components/IdentityDocumentsField'
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
	/** Review state of the stored certificate: pending / approved / rejected / reupload. */
	status?: string | null
	institution?: string
}

interface ProfessionalDraft {
	speciality: string
	expertise: string[]
	treatments: string[]
	bio: string
	qualifications: Qualification[]
	/** Medical registration and experience (shown before the documents). */
	registrationNumber: string
	/** The registration certificate already stored ('' when none), its review status, and one picked but not saved. */
	registrationProof: string
	registrationStatus: string
	registrationFile?: PickedFile
	experience: string
	/** Government IDs already stored, the ID types a doctor can choose from, and files picked but not saved yet. */
	identityDocuments: IdentityDocument[]
	identityTypes: IdentityDocumentType[]
	/** Picked on this device and not saved yet, by ID type code. */
	identityFiles: Record<string, PickedFile>
}

/**
 * At least one government ID is compulsory: one already stored (whatever its review status), or one picked and waiting
 * to be saved. The error is keyed by `identityFiles`, the field the doctor changes: the form clears a field's error when
 * that field is set, so adding an ID clears the message (under another key it stayed until the next Save).
 */
const profileSchema = z.looseObject({}).superRefine((value, ctx) => {
	const draft = value as unknown as ProfessionalDraft
	if (draft.identityDocuments.length === 0 && Object.keys(draft.identityFiles).length === 0) {
		ctx.addIssue({ code: 'custom', path: ['identityFiles'], message: 'Add at least one government ID' })
	}
})

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
		registrationNumber: prof.registration_number || '',
		registrationProof: prof.registration_proof || prof.registration_proof_s3_key || '',
		registrationStatus: prof.registration_status || '',
		experience: prof.experience_years != null ? String(prof.experience_years) : '',
			identityDocuments: prof.identity_documents ?? [],
			identityTypes: prof.identity_document_types ?? [],
			identityFiles: {},
		qualifications: (prof.degrees ?? []).map((d) => ({
			id: Number.isFinite(Number(d.id)) ? Number(d.id) : undefined,
			degree: d.degree || d.qualification || '',
			college: d.college || d.institution || '',
			year: d.year_of_passing || '',
			proof: d.degree_certificate || d.qualification_proof_s3_key || '',
			status: d.certificate_status ?? null,
		})),
	}
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

/**
 * What the doctor changed in the qualifications list, compared with what was loaded. A saved degree is matched by its
 * `id`: only the fields that differ are sent (plus a newly picked certificate), degrees that did not change are not
 * mentioned at all, degrees without an id are new, and saved ids that are gone from the list are removed.
 */
const diffQualifications = (draft: Qualification[], saved: Qualification[]) => {
	const savedById = new Map<number, Qualification>()
	saved.forEach((q) => q.id !== undefined && savedById.set(q.id, q))
	const draftIds = new Set(draft.map((q) => q.id))

	const add: DegreeToAdd[] = draft
		.filter((q) => q.id === undefined)
		.map((q) => ({ degree: q.degree, college: q.college, year_of_passing: q.year, certificate: q.file }))

	const update: DegreeToUpdate[] = []
	draft.forEach((q) => {
		const before = q.id !== undefined ? savedById.get(q.id) : undefined
		if (q.id === undefined || !before) return
		const change: DegreeToUpdate = { id: q.id }
		if (q.degree !== before.degree) change.degree = q.degree
		if (q.college !== before.college) change.college = q.college
		if (q.year !== before.year) change.year_of_passing = q.year
		if (q.file) change.certificate = q.file
		if (Object.keys(change).length > 1) update.push(change)
	})

	const remove = saved.flatMap((q) => (q.id !== undefined && !draftIds.has(q.id) ? [q.id] : []))
	return { add, update, remove }
}

const save = async (draft: ProfessionalDraft, saved: ProfessionalDraft) => {
	// A real PATCH: build the request from what changed and send nothing else.
	const patch: DoctorProfessionalPatch = {}
	if (draft.bio.trim() !== saved.bio.trim()) patch.about = draft.bio.trim()
	const degreeChanges = diffQualifications(draft.qualifications, saved.qualifications)
	if (degreeChanges.add.length || degreeChanges.update.length || degreeChanges.remove.length) {
		patch.degreeChanges = degreeChanges
	}
	if (draft.registrationNumber.trim() !== saved.registrationNumber.trim()) {
		patch.registration_number = draft.registrationNumber.trim()
	}
	if (draft.experience !== saved.experience && draft.experience) patch.experience_years = Number(draft.experience)
	if (draft.registrationFile) patch.registrationProof = draft.registrationFile
	if (Object.keys(draft.identityFiles).length > 0) patch.identityDocuments = draft.identityFiles
	if (Object.keys(patch).length > 0) await saveDoctorProfessional(patch)

	if (!same(draft.expertise, saved.expertise) || !same(draft.treatments, saved.treatments)) {
		await saveDoctorAdditional({ areas_of_expertise: draft.expertise, treatments: draft.treatments })
	}
	return load()
}

const toOptions = (list: IdLabel[]) => list.map((o) => ({ value: o.id, label: o.label }))

export default function ProfessionalDetailsPage() {
	const form = useProfileForm<ProfessionalDraft>({ load, save, schema: profileSchema })
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

	// Registration certificate: pick now, uploaded with the rest when "Save" is pressed.
	const pickRegistration = useCallback(async () => {
		const file = await pickCertificateFile()
		if (file) set('registrationFile', file)
	}, [set])

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
						status={pendingFile ? 'in_review' : documentRowStatus(editingQual?.status, !!editingQual?.proof)}
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
						<AppChipPicker
							label="Areas of expertise"
							options={toOptions(expertiseOptions)}
							values={draft.expertise}
							onChange={(v) => set('expertise', v)}
							searchPlaceholder="Search conditions, e.g. arrhythmia"
						/>
						<AppChipPicker
							label="Treatments & procedures"
							options={toOptions(treatmentOptions)}
							values={draft.treatments}
							onChange={(v) => set('treatments', v)}
							searchPlaceholder="Search procedures, e.g. stent"
						/>
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
										? DOCUMENT_LIST_TAG[documentRowStatus(q.status, true) as keyof typeof DOCUMENT_LIST_TAG]
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
						title="Medical registration"
						helper="Our team checks your registration certificate before it shows as verified."
					>
						<AppFormField
							label="Registration number"
							value={draft.registrationNumber}
							onChangeText={(v) => set('registrationNumber', v)}
							maxLength={50}
							autoCapitalize="characters"
						/>
						<AppDocumentRow
							label="Registration certificate (state council / NMC)"
							fileName={draft.registrationFile?.name ?? draft.registrationProof}
							status={documentRowStatus(
								draft.registrationFile ? null : draft.registrationStatus,
								!!(draft.registrationFile || draft.registrationProof)
							)}
							onUpload={() => void pickRegistration()}
						/>
						<AppFormField
							label="Years of experience"
							value={draft.experience}
							onChangeText={(v) => set('experience', v.replace(/\D/g, ''))}
							keyboardType="number-pad"
							maxLength={2}
						/>
					</AppFormCard>

					<AppFormCard
						title="Documents"
						helper="Our team checks each upload, usually within 1–2 working days."
					>
						<IdentityDocumentsField
							stored={draft.identityDocuments}
							types={draft.identityTypes}
							files={draft.identityFiles}
							onChangeFiles={(files) => set('identityFiles', files)}
							errorText={form.errors.identityFiles}
						/>
					</AppFormCard>
				</>
			)}
		</ProfileScreen>
	)
}
