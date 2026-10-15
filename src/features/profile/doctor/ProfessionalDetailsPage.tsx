// Doctor "Professional & documents": specialisation (set at registration, read-only), areas of expertise,
// treatments, bio, qualifications list (each with its degree certificate), and government IDs (at least one, of a
// type the doctor picks from a dropdown; more are optional). Qualifications and every newly picked file save together through PATCH
// /doctors/professional-details (multipart when a file was picked), expertise / treatments through
// /profile/additional-details.

import React, { useCallback, useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { z } from 'zod'
import {
	AppButton,
	AppChipGroup,
	AppDocumentRow,
	documentRowStatus,
	AppEditableList,
	AppFormCard,
	AppFormField,
	AppListItemSheet,
	AppSaveFooter,
	AppSelect,
	FORM_SELECT_PROPS,
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
	/** Government IDs already stored, the ID types a doctor can choose from, and files picked but not saved yet. */
	identityDocuments: IdentityDocument[]
	identityTypes: IdentityDocumentType[]
	/** Picked on this device and not saved yet, by ID type code. */
	identityFiles: Record<string, PickedFile>
}

/** The list tag of a stored degree certificate, by its review status. */
const CERTIFICATE_TAG: Record<string, { label: string; tone: 'confirmed' | 'pending' | 'cancelled' }> = {
	verified: { label: 'Approved', tone: 'confirmed' },
	in_review: { label: 'In review', tone: 'pending' },
	rejected: { label: 'Rejected', tone: 'cancelled' },
	reupload: { label: 'Re-upload needed', tone: 'cancelled' },
}

/** At least one government ID is compulsory: one already stored, or one picked and waiting to be saved. */
const profileSchema = z.looseObject({}).superRefine((value, ctx) => {
	const draft = value as unknown as ProfessionalDraft
	if (draft.identityDocuments.length === 0 && Object.keys(draft.identityFiles).length === 0) {
		ctx.addIssue({ code: 'custom', path: ['identityDocuments'], message: 'Add at least one government ID' })
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
	// The ID type chosen in the dropdown, waiting for its file.
	const [newIdType, setNewIdType] = useState('')
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

	// Government ID of one type: pick now, uploaded with the rest when "Save" is pressed. Picking the same type
	// again replaces the earlier pick (or, once saved, the stored file).
	const pickIdentity = useCallback(
		async (code: string) => {
			const file = await pickCertificateFile()
			if (file && draft) {
				set('identityFiles', { ...draft.identityFiles, [code]: file })
				setNewIdType('')
			}
		},
		[draft, set]
	)

	// One row per ID type the doctor has (saved or just picked); the dropdown offers the types still unused.
	const identityRows = draft
		? [
				...draft.identityDocuments.map((d) => ({ code: d.type, label: d.label, stored: d.url ?? '', status: d.status ?? null })),
				...Object.keys(draft.identityFiles)
					.filter((code) => !draft.identityDocuments.some((d) => d.type === code))
					.map((code) => ({
						code,
						label: draft.identityTypes.find((t) => t.code === code)?.label ?? code,
						stored: '',
						status: null as string | null,
					})),
			]
		: []
	const idOptions = draft
		? draft.identityTypes
				.filter((t) => !identityRows.some((r) => r.code === t.code))
				.map((t) => ({ value: t.code, label: t.label }))
		: []

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
										? CERTIFICATE_TAG[documentRowStatus(q.status, true)]
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
						<AppFormField
							label="Government ID"
							required
							helper="Add at least one. You can add more if you like."
							errorText={form.errors.identityDocuments}
						>
							<View style={styles.idList}>
								{identityRows.map((row) => (
									<AppDocumentRow
										key={row.code}
										label={row.label}
										fileName={draft.identityFiles[row.code]?.name ?? row.stored}
										status={documentRowStatus(
											draft.identityFiles[row.code] ? null : row.status,
											!!(draft.identityFiles[row.code] || row.stored)
										)}
										onUpload={() => void pickIdentity(row.code)}
									/>
								))}
								{idOptions.length > 0 && (
									<View style={styles.idAdd}>
										<AppSelect
											{...FORM_SELECT_PROPS}
											options={idOptions}
											value={newIdType}
											onSelect={setNewIdType}
											placeholder={
												identityRows.length === 0 ? 'Select ID type' : 'Add another ID (optional)'
											}
										/>
										{/* The upload option appears only once a type is chosen, below the dropdown. */}
										{!!newIdType && (
											<AppButton
												variant="primary"
												size="sm"
												icon="upload"
												onPress={() => void pickIdentity(newIdType)}
											>
												{`Upload ${idOptions.find((o) => o.value === newIdType)?.label ?? 'ID'}`}
											</AppButton>
										)}
									</View>
								)}
							</View>
						</AppFormField>
					</AppFormCard>
				</>
			)}
		</ProfileScreen>
	)
}

const styles = StyleSheet.create({
	idList: { gap: 10 },
	// the dropdown, with the Upload button under it once a type is chosen
	idAdd: { gap: 10 },
})
