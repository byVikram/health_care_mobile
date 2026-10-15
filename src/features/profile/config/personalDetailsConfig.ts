// What the shared PersonalDetailsPage shows for each role, plus how it loads and saves. The page renders the
// cards and fields listed here; field labels / inputs live in PERSONAL_FIELD_META so a field looks the same
// wherever it appears.

import type { KeyboardTypeOptions } from 'react-native'
import { z } from 'zod'
import { formatApiDateForDisplay, formatDateStringForApi } from '../../../utils/date'
import { fetchProviderProfile, updateProviderProfileBackend } from '../../ancillary/ancillaryService'
import { fetchPatientDetails, savePatientDetails } from '../patient/PatientProfileService'
import {
	fetchDoctorPersonal,
	fetchDoctorProfessional,
	saveDoctorPersonal,
	saveDoctorProfessional,
} from '../doctor/doctorProfileService'
import type { HubRole } from './profileHubConfig'
import { GENDER_OPTIONS, LANGUAGE_OPTIONS, MARITAL_STATUS_OPTIONS, type Option } from './profileOptions'

/** One flat draft for every role; each role only uses its own fields. */
export interface PersonalDraft {
	name: string
	gender: string
	/** DD-MM-YYYY (AppCalendar's format). */
	dob: string
	maritalStatus: string
	location: string
	languages: string[]
	mobile: string
	email: string
	registrationNumber: string
	registrationProof: string
	/** Review state of the registration proof: pending / approved / rejected / reupload ('' when there is none). */
	registrationStatus: string
	experience: string
	instagram: string
	facebook: string
	twitter: string
	avatar: string
}

export type PersonalFieldKey = Exclude<keyof PersonalDraft, 'avatar' | 'registrationStatus'>

export type PersonalFieldMeta = {
	label: string
	kind: 'text' | 'select' | 'date' | 'chips' | 'readonly' | 'document'
	placeholder?: string
	keyboardType?: KeyboardTypeOptions
	options?: Option[] | string[]
	maxLength?: number
	helper?: string
}

export const PERSONAL_FIELD_META: Record<PersonalFieldKey, PersonalFieldMeta> = {
	name: { label: 'Full name', kind: 'text', placeholder: 'As on your ID', maxLength: 100 },
	gender: { label: 'Gender', kind: 'select', options: GENDER_OPTIONS },
	dob: { label: 'Date of birth', kind: 'date' },
	maritalStatus: { label: 'Marital status', kind: 'select', options: MARITAL_STATUS_OPTIONS },
	location: { label: 'City', kind: 'text', placeholder: 'e.g. Bengaluru', maxLength: 200 },
	languages: { label: 'Languages you speak', kind: 'chips', options: LANGUAGE_OPTIONS },
	mobile: { label: 'Mobile number', kind: 'readonly' },
	email: {
		label: 'Email',
		kind: 'text',
		placeholder: 'For receipts and reports',
		keyboardType: 'email-address',
		maxLength: 255,
	},
	registrationNumber: { label: 'Registration number', kind: 'text', maxLength: 50 },
	registrationProof: { label: 'Registration certificate (state council / NMC)', kind: 'document' },
	experience: { label: 'Years of experience', kind: 'text', keyboardType: 'number-pad', maxLength: 2 },
	instagram: { label: 'Instagram', kind: 'text', placeholder: '@username', maxLength: 100 },
	facebook: { label: 'Facebook', kind: 'text', placeholder: 'Profile link', maxLength: 200 },
	twitter: { label: 'X (Twitter)', kind: 'text', placeholder: '@username', maxLength: 100 },
}

export interface PersonalCard {
	key: string
	title: string
	/** Green "Verified" tag on the card title (contact = mobile verified by OTP at login). */
	verifiedTag?: boolean
	helper?: string
	fields: PersonalFieldKey[]
	/** Per-role label overrides, e.g. "Languages you consult in" for doctors. */
	labels?: Partial<Record<PersonalFieldKey, string>>
}

export interface PersonalDetailsConfig {
	subtitle: string
	photoSubtitle: string
	cards: PersonalCard[]
	required: PersonalFieldKey[]
	load: () => Promise<PersonalDraft>
	save: (draft: PersonalDraft, saved: PersonalDraft) => Promise<PersonalDraft>
}

const EMPTY: PersonalDraft = {
	name: '',
	gender: '',
	dob: '',
	maritalStatus: '',
	location: '',
	languages: [],
	mobile: '',
	email: '',
	registrationNumber: '',
	registrationProof: '',
	registrationStatus: '',
	experience: '',
	instagram: '',
	facebook: '',
	twitter: '',
	avatar: '',
}

const CONTACT_CARD: PersonalCard = {
	key: 'contact',
	title: 'Contact',
	verifiedTag: true,
	helper: 'Your mobile number is how you log in, so it can’t be changed here.',
	fields: ['mobile', 'email'],
}

const isoOrNull = (dob: string) => (dob ? formatDateStringForApi(dob) : null)

const changed = <K extends keyof PersonalDraft>(draft: PersonalDraft, saved: PersonalDraft, keys: K[]) =>
	keys.some((k) => JSON.stringify(draft[k]) !== JSON.stringify(saved[k]))

export const PERSONAL_DETAILS_CONFIG: Record<HubRole, PersonalDetailsConfig> = {
	patient: {
		subtitle: 'Used on bookings and reports',
		photoSubtitle: 'Shown to your doctors and care team',
		cards: [
			{ key: 'basic', title: 'Basic details', fields: ['name', 'gender', 'dob', 'maritalStatus'] },
			CONTACT_CARD,
		],
		required: ['name', 'gender', 'dob'],
		load: async () => {
			const d = await fetchPatientDetails()
			return {
				...EMPTY,
				name: d.personal.name || '',
				gender: d.personal.gender || '',
				dob: formatApiDateForDisplay(d.personal.date_of_birth),
				maritalStatus: d.personal.marital_status || '',
				mobile: d.personal.contact_number || '',
				email: d.personal.email || '',
				avatar: d.personal.avatar || '',
			}
		},
		save: async (draft) => {
			await savePatientDetails({
				name: draft.name.trim(),
				gender: draft.gender,
				date_of_birth: isoOrNull(draft.dob),
				marital_status: draft.maritalStatus,
				...(draft.email.trim() ? { email: draft.email.trim() } : {}),
			})
			return PERSONAL_DETAILS_CONFIG.patient.load()
		},
	},

	doctor: {
		subtitle: 'Shown on your public profile',
		photoSubtitle: 'Patients see this on your profile',
		cards: [
			{
				key: 'basic',
				title: 'Basic details',
				fields: ['name', 'gender', 'dob', 'location', 'languages'],
				labels: { languages: 'Languages you consult in' },
			},
			{
				key: 'registration',
				title: 'Medical registration',
				helper: 'Our team checks your registration certificate before it shows as verified.',
				fields: ['registrationNumber', 'registrationProof', 'experience'],
			},
			CONTACT_CARD,
			{ key: 'social', title: 'Social links', fields: ['instagram', 'facebook', 'twitter'] },
		],
		required: ['name', 'gender', 'location', 'registrationNumber'],
		load: async () => {
			const [p, prof] = await Promise.all([fetchDoctorPersonal(), fetchDoctorProfessional()])
			const social = p.social_media_handles || {}
			return {
				...EMPTY,
				name: p.name || '',
				gender: p.gender || '',
				dob: formatApiDateForDisplay(p.date_of_birth || undefined),
				location: p.location || '',
				languages: p.languages || [],
				mobile: p.contact_number || p.mobile_number || '',
				email: p.email || '',
				registrationNumber: prof.registration_number || '',
				registrationProof: prof.registration_proof_s3_key || '',
				registrationStatus: prof.registration_status || '',
				experience: prof.experience_years != null ? String(prof.experience_years) : '',
				instagram: social.instagram || '',
				facebook: social.facebook || '',
				twitter: social.twitter || social.x || '',
				avatar: p.avatar_s3_key || '',
			}
		},
		save: async (draft, saved) => {
			if (
				changed(draft, saved, [
					'name',
					'gender',
					'dob',
					'location',
					'languages',
					'email',
					'instagram',
					'facebook',
					'twitter',
				])
			) {
				await saveDoctorPersonal({
					name: draft.name.trim(),
					gender: draft.gender,
					date_of_birth: isoOrNull(draft.dob),
					location: draft.location.trim(),
					languages: draft.languages,
					...(draft.email.trim() ? { email: draft.email.trim() } : {}),
					social_media_handles: {
						instagram: draft.instagram.trim(),
						facebook: draft.facebook.trim(),
						twitter: draft.twitter.trim(),
					},
				})
			}
			// only the field(s) that changed
			const professional: { registration_number?: string; experience_years?: number } = {}
			if (changed(draft, saved, ['registrationNumber'])) {
				professional.registration_number = draft.registrationNumber.trim()
			}
			if (changed(draft, saved, ['experience']) && draft.experience) {
				professional.experience_years = Number(draft.experience)
			}
			if (Object.keys(professional).length > 0) await saveDoctorProfessional(professional)
			return PERSONAL_DETAILS_CONFIG.doctor.load()
		},
	},

	ancillary: {
		subtitle: 'Patients see your name, photo and languages',
		photoSubtitle: 'Shown to patients before they book you',
		cards: [
			{
				key: 'basic',
				title: 'Basic details',
				fields: ['name', 'gender', 'dob', 'location', 'languages'],
				labels: { location: 'Area you work in' },
			},
			CONTACT_CARD,
		],
		required: ['name', 'gender', 'location'],
		load: async () => {
			const p = await fetchProviderProfile()
			if (!p) throw new Error('Could not load your profile')
			return {
				...EMPTY,
				name: p.name || '',
				gender: p.gender || '',
				dob: formatApiDateForDisplay(p.date_of_birth || undefined),
				location: p.location || '',
				languages: p.languages || [],
				mobile: p.contact_number || p.mobile_number || '',
				email: p.email || '',
				avatar: p.avatar_s3_key || '',
			}
		},
		save: async (draft) => {
			await updateProviderProfileBackend({
				name: draft.name.trim(),
				gender: draft.gender,
				date_of_birth: isoOrNull(draft.dob) || undefined,
				location: draft.location.trim(),
				languages: draft.languages,
				...(draft.email.trim() ? { email: draft.email.trim() } : {}),
			})
			return PERSONAL_DETAILS_CONFIG.ancillary.load()
		},
	},
}

/** Required-field + format checks, built from the role's `required` list. */
export const personalSchemaFor = (required: PersonalFieldKey[]) =>
	z
		.object({
			name: z.string(),
			gender: z.string(),
			dob: z.string(),
			location: z.string(),
			registrationNumber: z.string(),
			email: z.string(),
			experience: z.string(),
		})
		.passthrough()
		.superRefine((v, ctx) => {
			for (const key of required) {
				const value = (v as Record<string, unknown>)[key]
				if (typeof value === 'string' && !value.trim()) {
					ctx.addIssue({
						code: 'custom',
						path: [key],
						message: `${PERSONAL_FIELD_META[key].label} is required`,
					})
				}
			}
			if (v.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim())) {
				ctx.addIssue({ code: 'custom', path: ['email'], message: 'Enter a valid email address' })
			}
			if (v.experience && !/^\d{1,2}$/.test(v.experience)) {
				ctx.addIssue({ code: 'custom', path: ['experience'], message: 'Enter years as a number' })
			}
		})
