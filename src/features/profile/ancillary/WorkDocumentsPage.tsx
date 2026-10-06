// Ancillary "Work & documents" (nursing / physio / home care / rehab; labels from ancillaryProfileConfig):
// registration number + licence certificate, ID / PAN / police documents (upload coming soon),
// qualifications, and work & services (specialisation, experience, services offered, bio).

import React, { useCallback, useEffect, useState } from 'react'
import { StyleSheet } from 'react-native'
import {
	AppChipGroup,
	AppDocumentRow,
	AppEditableList,
	AppFormCard,
	AppFormField,
	AppInfoBanner,
	AppListItemSheet,
	AppSaveFooter,
	AppSelect,
	AppTag,
	FORM_SELECT_PROPS,
	type AppListItemField,
} from '../../../components/common'
import { useAncillarySpecialty } from '../../../context/AuthContext'
import { showComingSoon } from '../../../utils/toast'
import {
	fetchAncillaryServicesBackend,
	fetchAncillarySubspecialtiesBackend,
	fetchProviderProfile,
	type AncillaryServiceItem,
	type AncillarySubspecialtyApiItem,
} from '../../ancillary/ancillaryService'
import { saveProviderCapabilities, saveProviderWork, type ProviderQualification } from './ancillaryProfileService'
import { ancillaryConfigFor, type AncillaryProfileConfig } from '../config/ancillaryProfileConfig'
import { useProfileForm } from '../hooks/useProfileForm'
import { ProfileScreen } from '../shared/components/ProfileScreen'

interface WorkDraft {
	specialtyId: string
	verificationStatus: string
	licenceNumber: string
	licenceProof: string
	qualifications: ProviderQualification[]
	subSpecialtyId: string
	experience: string
	services: string[]
	about: string
}

const QUAL_FIELDS: AppListItemField[] = [
	{
		key: 'qualification',
		label: 'Degree or certificate',
		required: true,
		placeholder: 'e.g. B.Sc Nursing',
		maxLength: 100,
	},
	{
		key: 'institution',
		label: 'Institution',
		required: true,
		placeholder: 'College or training institute',
		maxLength: 200,
	},
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

const load = async (): Promise<WorkDraft> => {
	const p = await fetchProviderProfile()
	if (!p) throw new Error('Could not load your profile')
	const list = Array.isArray(p.qualifications_list) ? p.qualifications_list : []
	return {
		specialtyId: p.specialty_id || p.specialty?.id || '',
		verificationStatus: p.verification_status || '',
		licenceNumber: p.license_number || '',
		licenceProof: p.license_proof_s3_key || '',
		qualifications: list.map((q: Record<string, string | null>) => ({
			qualification: q.qualification || '',
			institution: q.institution || '',
			year_of_passing: q.year_of_passing || '',
			proof_s3_key: q.proof_s3_key || q.qualification_proof_s3_key || null,
		})),
		subSpecialtyId: p.sub_specialty_id || p.sub_specialty?.id || '',
		experience: p.experience_years != null ? String(p.experience_years) : '',
		services: p.checked_procedures || [],
		about: p.about || '',
	}
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

const save = async (d: WorkDraft, saved: WorkDraft) => {
	await saveProviderWork({
		...(d.licenceNumber.trim() ? { license_number: d.licenceNumber.trim() } : {}),
		...(d.experience ? { experience_years: Number(d.experience) } : {}),
		about: d.about.trim(),
		...(d.subSpecialtyId ? { sub_specialty_id: d.subSpecialtyId } : {}),
		...(!same(d.qualifications, saved.qualifications) ? { qualifications: d.qualifications } : {}),
	})
	if (!same(d.services, saved.services)) await saveProviderCapabilities(d.services)
	return load()
}

const validate = (d: WorkDraft, config: AncillaryProfileConfig) => {
	const errors: Record<string, string> = {}
	if (config.registrationRequired && d.licenceNumber.trim().length < 3)
		errors.licenceNumber = 'Enter your registration number'
	if (d.experience && !/^\d{1,2}$/.test(d.experience)) errors.experience = 'Enter years as a number'
	return errors
}

export default function WorkDocumentsPage() {
	const { specialtyId: authSpecialty } = useAncillarySpecialty()
	const form = useProfileForm<WorkDraft>({ load, save })
	const { draft, set, errors, setErrors } = form
	const config = ancillaryConfigFor(draft?.specialtyId || authSpecialty)
	const [subSpecialties, setSubSpecialties] = useState<AncillarySubspecialtyApiItem[]>([])
	const [services, setServices] = useState<AncillaryServiceItem[]>([])
	const [editing, setEditing] = useState<number | 'new' | null>(null)

	useEffect(() => {
		if (!draft?.specialtyId) return
		let active = true
		const load = async () => {
			try {
				const items = await fetchAncillarySubspecialtiesBackend(draft.specialtyId)
				if (active) setSubSpecialties(items)
			} catch {
				if (active) setSubSpecialties([])
			}
		}
		void load()
		return () => {
			active = false
		}
	}, [draft?.specialtyId])

	useEffect(() => {
		if (!draft?.specialtyId) return
		let active = true
		const load = async () => {
			try {
				const items = await fetchAncillaryServicesBackend({
					specialtyId: draft.specialtyId,
					subspecialtyId: draft.subSpecialtyId || undefined,
				})
				if (active) setServices(items)
			} catch {
				if (active) setServices([])
			}
		}
		void load()
		return () => {
			active = false
		}
	}, [draft?.specialtyId, draft?.subSpecialtyId])

	const submit = useCallback(async () => {
		if (!draft) return
		const found = validate(draft, config)
		if (Object.keys(found).length) {
			setErrors(found)
			return
		}
		await form.submit()
	}, [draft, config, form, setErrors])

	const verified = draft?.verificationStatus === 'approved'
	const inReview = !!draft?.licenceNumber && !verified && draft?.verificationStatus !== 'rejected'
	const editingQual = typeof editing === 'number' ? draft?.qualifications[editing] : undefined

	const saveQual = (v: Record<string, string>) => {
		if (!draft) return
		const list = [...draft.qualifications]
		const item: ProviderQualification = {
			qualification: v.qualification,
			institution: v.institution,
			year_of_passing: v.year || null,
			proof_s3_key: editingQual?.proof_s3_key ?? null,
		}
		if (typeof editing === 'number') list[editing] = item
		else list.push(item)
		set('qualifications', list)
		setEditing(null)
	}

	// Keep services the provider already has visible even if the catalogue call fails.
	const serviceOptions = services.length
		? services.map((s) => ({ value: s.id, label: s.label || s.title || s.id }))
		: (draft?.services ?? []).map((id) => ({ value: id, label: id }))

	const docStatus = (key: 'licence' | 'id' | 'pan' | 'police') =>
		key === 'licence' && draft?.licenceProof ? (verified ? 'verified' : 'in_review') : 'missing'

	return (
		<ProfileScreen
			title="Work & documents"
			subtitle="Checked by Karolahealth before you go live"
			loading={form.loading}
			loadError={form.loadError}
			onRetry={form.reload}
			saveError={form.saveError}
			onDismissSaveError={form.clearSaveError}
			footer={
				<AppSaveFooter
					onSave={submit}
					dirty={form.dirty}
					saving={form.saving}
					invalid={Object.keys(errors).length > 0}
				/>
			}
			overlays={
				<AppListItemSheet
					visible={editing !== null}
					onClose={() => setEditing(null)}
					title={editingQual ? 'Edit qualification' : 'Add qualification'}
					subtitle="We check the certificate before it shows on your profile"
					fields={QUAL_FIELDS}
					initialValues={
						editingQual
							? {
									qualification: editingQual.qualification,
									institution: editingQual.institution,
									year: editingQual.year_of_passing || '',
								}
							: undefined
					}
					submitLabel={editingQual ? 'Save qualification' : 'Add qualification'}
					onSubmit={saveQual}
				>
					<AppDocumentRow
						label="Degree certificate"
						fileName={editingQual?.proof_s3_key}
						status={editingQual?.proof_s3_key ? 'in_review' : 'missing'}
						optional
						onUpload={() => showComingSoon('Certificate upload will be available soon')}
					/>
				</AppListItemSheet>
			}
		>
			{draft && (
				<>
					{inReview && (
						<AppInfoBanner
							tone="warning"
							icon={null}
							title="Your licence is being checked"
							subtitle="This usually takes 1–2 working days. You can take bookings once approved."
							style={styles.banner}
						/>
					)}

					<AppFormCard
						title="Registration"
						right={
							verified ? (
								<AppTag label="Verified" tone="confirmed" icon="check" size="sm" shape="rounded" />
							) : inReview ? (
								<AppTag label="In review" tone="pending" size="sm" shape="rounded" />
							) : undefined
						}
						helper="Changes to your registration or certificate are checked by our team before they count."
					>
						<AppFormField
							label={config.registrationLabel}
							required={config.registrationRequired}
							optional={!config.registrationRequired}
							value={draft.licenceNumber}
							onChangeText={(v) => set('licenceNumber', v)}
							maxLength={50}
							autoCapitalize="characters"
							errorText={errors.licenceNumber}
						/>
						<AppDocumentRow
							label={config.licenceDocLabel}
							fileName={draft.licenceProof}
							status={docStatus('licence')}
							optional={!config.registrationRequired}
							onUpload={() => showComingSoon('Document upload will be available soon')}
						/>
					</AppFormCard>

					<AppFormCard
						title="Documents"
						helper="Our team checks each upload, usually within 1–2 working days."
					>
						{config.documents
							.filter((doc) => doc.key !== 'licence')
							.map((doc) => (
								<AppDocumentRow
									key={doc.key}
									label={doc.label}
									description={doc.description}
									status={docStatus(doc.key)}
									optional={doc.optional}
									onUpload={() => showComingSoon('Document upload will be available soon')}
								/>
							))}
					</AppFormCard>

					<AppFormCard title="Qualifications">
						<AppEditableList
							items={draft.qualifications.map((q, i) => ({
								key: `${q.qualification}-${i}`,
								title: q.qualification,
								subtitle: [q.institution, q.year_of_passing].filter(Boolean).join(' · '),
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
							emptyText="Add your degree or training certificate."
						/>
					</AppFormCard>

					<AppFormCard title="Work & services">
						{subSpecialties.length > 0 && (
							<AppFormField label="Specialisation">
								<AppSelect
									{...FORM_SELECT_PROPS}
									options={subSpecialties.map((s) => ({
										value: s.public_id || s.id,
										label: s.label,
									}))}
									value={draft.subSpecialtyId}
									onSelect={(v) => set('subSpecialtyId', v)}
									placeholder="Select specialisation"
								/>
							</AppFormField>
						)}
						<AppFormField
							label="Years of experience"
							value={draft.experience}
							onChangeText={(v) => set('experience', v.replace(/\D/g, ''))}
							keyboardType="number-pad"
							maxLength={2}
							errorText={errors.experience}
						/>
						<AppFormField label={config.servicesLabel}>
							<AppChipGroup
								options={serviceOptions}
								values={draft.services}
								onChange={(v) => set('services', v)}
								accessibilityLabel={config.servicesLabel}
							/>
						</AppFormField>
						<AppFormField
							label="About you"
							value={draft.about}
							onChangeText={(v) => set('about', v)}
							placeholder="A short intro patients read before booking you"
							multiline
							maxLength={1000}
						/>
					</AppFormCard>
				</>
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
