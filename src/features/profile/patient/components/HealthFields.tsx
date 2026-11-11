// Health cards shared by Health details (the account owner) and a family member's profile: body & blood,
// allergies & conditions chips, current medicines list; optionally family history and emergency
// contacts (account owner only). Owns the add / edit sheets; the caller owns the values.

import React, { useState } from 'react'
import {
	AppChipGroup,
	AppChipPicker,
	AppEditableList,
	AppFormCard,
	AppFormField,
	AppListItemSheet,
	AppSelect,
	FORM_SELECT_PROPS,
	type AppListItemField,
} from '../../../../components/common'
import type { EmergencyContactItem, MedicationItem, PatientDetailsData } from '../PatientProfileService'
import {
	ALLERGY_OPTIONS,
	BLOOD_GROUP_OPTIONS,
	CONDITION_OPTIONS,
	FAMILY_HISTORY_OPTIONS,
	isValidIndianMobile,
	withCurrent,
} from '../../config/profileOptions'

// The picker takes {label, value} options; these lists are plain strings.
const ALLERGY_CHOICES = ALLERGY_OPTIONS.map((o) => ({ value: o, label: o }))
const CONDITION_CHOICES = CONDITION_OPTIONS.map((o) => ({ value: o, label: o }))

export interface HealthValues {
	bloodGroup: string
	height: string
	weight: string
	allergies: string[]
	conditions: string[]
	medications: MedicationItem[]
	familyHistory: string[]
	familyHistoryNote: string
	contacts: EmergencyContactItem[]
}

export const EMPTY_HEALTH: HealthValues = {
	bloodGroup: '',
	height: '',
	weight: '',
	allergies: [],
	conditions: [],
	medications: [],
	familyHistory: [],
	familyHistoryNote: '',
	contacts: [],
}

/** family_history is one string on the backend ("Diabetes, Heart disease, grandfather had a stroke"). */
export const splitFamilyHistory = (value?: string | null) => {
	const parts = (value || '')
		.split(',')
		.map((p) => p.trim())
		.filter(Boolean)
	return {
		chips: parts.filter((p) => FAMILY_HISTORY_OPTIONS.includes(p)),
		note: parts.filter((p) => !FAMILY_HISTORY_OPTIONS.includes(p)).join(', '),
	}
}

export const joinFamilyHistory = (chips: string[], note: string) => [...chips, note.trim()].filter(Boolean).join(', ')

export const detailsToHealth = (d: PatientDetailsData): HealthValues => {
	const history = splitFamilyHistory(d.medical.family_history)
	return {
		bloodGroup: d.personal.blood_group || '',
		height: d.personal.height ? String(d.personal.height) : '',
		weight: d.personal.weight ? String(d.personal.weight) : '',
		allergies: d.medical.allergies || [],
		conditions: d.medical.chronic_conditions || [],
		medications:
			d.medical.medications ??
			(d.medical.current_medications || []).map((name) => ({ name, dose: '', frequency: '' })),
		familyHistory: history.chips,
		familyHistoryNote: history.note,
		contacts: d.personal.emergency_contacts || [],
	}
}

const numberOrUndefined = (value: string) => {
	const n = Number(value)
	return value.trim() && Number.isFinite(n) && n > 0 ? n : undefined
}

export const healthToPatch = (v: HealthValues, withOwnerFields: boolean) => ({
	blood_group: v.bloodGroup,
	...(numberOrUndefined(v.height) ? { height: numberOrUndefined(v.height) } : {}),
	...(numberOrUndefined(v.weight) ? { weight: numberOrUndefined(v.weight) } : {}),
	allergies: v.allergies,
	chronic_conditions: v.conditions,
	medications: v.medications,
	...(withOwnerFields
		? {
				family_history: joinFamilyHistory(v.familyHistory, v.familyHistoryNote),
				emergency_contacts: v.contacts,
			}
		: {}),
})

const MED_FIELDS: AppListItemField[] = [
	{ key: 'name', label: 'Medicine name', required: true, placeholder: 'e.g. Metformin 500 mg', maxLength: 200 },
	{ key: 'dose', label: 'Dosage', placeholder: 'e.g. 1 tablet', maxLength: 100 },
	{ key: 'frequency', label: 'When', placeholder: 'e.g. Morning, after food', maxLength: 100 },
]

const CONTACT_FIELDS: AppListItemField[] = [
	{ key: 'name', label: 'Name', required: true, placeholder: 'Full name', maxLength: 100 },
	{ key: 'relation', label: 'Relationship', placeholder: 'e.g. Brother', maxLength: 50 },
	{
		key: 'phone',
		label: 'Phone number',
		required: true,
		placeholder: '+91',
		keyboardType: 'phone-pad',
		maxLength: 15,
		validate: (v) => (isValidIndianMobile(v) ? null : 'Enter a valid 10-digit mobile number'),
	},
]

type Sheet = { kind: 'med' | 'contact'; index: number | null } | null

export type HealthFieldsProps = {
	value: HealthValues
	onChange: (patch: Partial<HealthValues>) => void
	/** Family history + emergency contacts (account owner only). */
	ownerFields?: boolean
	/** e.g. "Shown to doctors and nurses only for this person's bookings." */
	healthHelper?: string
}

export function HealthFields({ value, onChange, ownerFields = false, healthHelper }: HealthFieldsProps) {
	const [sheet, setSheet] = useState<Sheet>(null)

	const med = sheet?.kind === 'med' && sheet.index != null ? value.medications[sheet.index] : null
	const contact = sheet?.kind === 'contact' && sheet.index != null ? value.contacts[sheet.index] : null

	const saveMed = (v: Record<string, string>) => {
		const item: MedicationItem = { name: v.name, dose: v.dose, frequency: v.frequency }
		const list = [...value.medications]
		if (sheet?.index != null) list[sheet.index] = item
		else list.push(item)
		onChange({ medications: list })
		setSheet(null)
	}

	const saveContact = (v: Record<string, string>) => {
		const list = [...value.contacts]
		const item: EmergencyContactItem = {
			name: v.name,
			relation: v.relation,
			phone: v.phone,
			// The first contact is the primary one unless another was already marked.
			is_primary: sheet?.index != null ? !!list[sheet.index]?.is_primary : list.length === 0,
		}
		if (sheet?.index != null) list[sheet.index] = item
		else list.push(item)
		onChange({ contacts: list })
		setSheet(null)
	}

	const removeContact = (index: number) => {
		const list = value.contacts.filter((_, i) => i !== index)
		if (list.length && !list.some((c) => c.is_primary)) list[0] = { ...list[0], is_primary: true }
		onChange({ contacts: list })
	}

	return (
		<>
			<AppFormCard title={ownerFields ? 'Body & blood' : 'Health'} helper={healthHelper}>
				<AppFormField label="Blood group">
					<AppSelect
						{...FORM_SELECT_PROPS}
						options={withCurrent(BLOOD_GROUP_OPTIONS, value.bloodGroup)}
						value={value.bloodGroup}
						onSelect={(v) => onChange({ bloodGroup: v })}
						placeholder="Select blood group"
						presentation="sheet"
						sheetTitle="Blood group"
					/>
				</AppFormField>
				<AppFormField
					label="Height (cm)"
					value={value.height}
					onChangeText={(v) => onChange({ height: v.replace(/[^\d.]/g, '') })}
					keyboardType="decimal-pad"
					maxLength={5}
				/>
				<AppFormField
					label="Weight (kg)"
					value={value.weight}
					onChangeText={(v) => onChange({ weight: v.replace(/[^\d.]/g, '') })}
					keyboardType="decimal-pad"
					maxLength={5}
				/>
				{!ownerFields && (
					<>
						<AppChipPicker
							label="Allergies"
							options={ALLERGY_CHOICES}
							values={value.allergies}
							onChange={(v) => onChange({ allergies: v })}
							searchPlaceholder="Search allergies"
						/>
						<AppChipPicker
							label="Long-term conditions"
							options={CONDITION_CHOICES}
							values={value.conditions}
							onChange={(v) => onChange({ conditions: v })}
							searchPlaceholder="Search conditions"
						/>
					</>
				)}
			</AppFormCard>

			{ownerFields && (
				<AppFormCard title="Allergies & conditions">
					<AppChipPicker
						label="Allergies"
						options={ALLERGY_CHOICES}
						values={value.allergies}
						onChange={(v) => onChange({ allergies: v })}
						searchPlaceholder="Search allergies"
					/>
					<AppChipPicker
						label="Long-term conditions"
						options={CONDITION_CHOICES}
						values={value.conditions}
						onChange={(v) => onChange({ conditions: v })}
						searchPlaceholder="Search conditions"
					/>
				</AppFormCard>
			)}

			<AppFormCard title="Current medicines">
				<AppEditableList
					items={value.medications.map((m, i) => ({
						key: `${m.name}-${i}`,
						title: m.name,
						subtitle: [m.dose, m.frequency].filter(Boolean).join(' · '),
					}))}
					icon="pill"
					tone="peach"
					onEdit={(index) => setSheet({ kind: 'med', index })}
					onRemove={(index) => onChange({ medications: value.medications.filter((_, i) => i !== index) })}
					addLabel="Add medicine"
					onAdd={() => setSheet({ kind: 'med', index: null })}
					emptyText="No medicines added"
				/>
			</AppFormCard>

			{ownerFields && (
				<AppFormCard
					title="Family history"
					helper="Conditions that run in your family help doctors assess your risk."
				>
					<AppChipGroup
						options={FAMILY_HISTORY_OPTIONS}
						values={value.familyHistory}
						onChange={(v) => onChange({ familyHistory: v })}
						accessibilityLabel="Family history"
					/>
					<AppFormField
						label="Anything else"
						optional
						value={value.familyHistoryNote}
						onChangeText={(v) => onChange({ familyHistoryNote: v })}
						placeholder="e.g. Father had a heart attack at 55"
						maxLength={300}
					/>
				</AppFormCard>
			)}

			{ownerFields && (
				<AppFormCard title="Emergency contacts">
					<AppEditableList
						items={value.contacts.map((c, i) => ({
							key: `${c.name}-${i}`,
							title: c.name,
							subtitle: [c.relation, c.phone].filter(Boolean).join(' · '),
							tag: c.is_primary ? { label: 'Primary', tone: 'mint' } : null,
						}))}
						icon="phone-outline"
						tone="lilac"
						onEdit={(index) => setSheet({ kind: 'contact', index })}
						onRemove={removeContact}
						addLabel="Add emergency contact"
						onAdd={() => setSheet({ kind: 'contact', index: null })}
						emptyText="Add someone we can call in an emergency"
					/>
				</AppFormCard>
			)}

			<AppListItemSheet
				visible={sheet?.kind === 'med'}
				onClose={() => setSheet(null)}
				title={med ? 'Edit medicine' : 'Add medicine'}
				fields={MED_FIELDS}
				initialValues={med ? { name: med.name, dose: med.dose, frequency: med.frequency } : undefined}
				submitLabel={med ? 'Save medicine' : 'Add medicine'}
				onSubmit={saveMed}
			/>
			<AppListItemSheet
				visible={sheet?.kind === 'contact'}
				onClose={() => setSheet(null)}
				title={contact ? 'Edit emergency contact' : 'Add emergency contact'}
				fields={CONTACT_FIELDS}
				initialValues={
					contact ? { name: contact.name, relation: contact.relation, phone: contact.phone } : undefined
				}
				submitLabel={contact ? 'Save contact' : 'Add contact'}
				onSubmit={saveContact}
			/>
		</>
	)
}

export default HealthFields
