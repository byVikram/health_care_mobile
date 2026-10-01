// Role-specific content of the profile hub ("My profile"). ProfileHubPage renders whatever this config
// describes, so patient / doctor / ancillary share one screen. Static text is plain strings; the few
// values that depend on live data (family names, "1 new login", verification state...) are small
// functions of HubData, which useProfileHubData loads.

import { MaterialCommunityIcons } from '@expo/vector-icons'
import type { AppTagTone } from '../../../components/common'
import type { ToneKey } from '../../../config/theme'
import { ROUTES } from '../../../navigation/routes'

type IconName = keyof typeof MaterialCommunityIcons.glyphMap
type StackRoute = (typeof ROUTES.STACK)[keyof typeof ROUTES.STACK]

export type HubRole = 'patient' | 'doctor' | 'ancillary'

export interface HubData {
	name: string
	avatarUri: string | null
	/** e.g. "+91 98xxx xx210", "Cardiologist · 12 yrs". */
	roleDetail: string
	completion: number | null
	/** Doctor: is_verified. Ancillary: verification_status === 'approved'. */
	verified: boolean
	/** Ancillary: licence submitted but not yet approved. */
	inReview: boolean
	mobileVerified: boolean
	newLogins: number
	// patient
	familyNames: string[]
	incompleteMember: { id: string; name: string } | null
	incompleteCount: number
	addressSummary: string
	// doctor
	hospitalCount: number
	hasBio: boolean
	// ancillary
	roleTitle: string
}

export interface HubBadge {
	label: string
	tone: AppTagTone
}

export interface HubRow {
	key: string
	title: string
	subtitle: string | ((d: HubData) => string)
	icon: IconName
	tone: ToneKey
	/** No route -> tapping shows "Coming soon". */
	route?: StackRoute
	params?: (d: HubData) => Record<string, unknown> | undefined
	badge?: (d: HubData) => HubBadge | null
	visible?: (d: HubData) => boolean
}

export interface HubBanner {
	key: string
	visible: (d: HubData) => boolean
	tone: 'warning' | 'info'
	icon: IconName
	title: (d: HubData) => string
	subtitle: string | ((d: HubData) => string)
	route?: StackRoute
	params?: (d: HubData) => Record<string, unknown> | undefined
}

export interface HubConfig {
	/** Role line under the name. */
	roleLine: (d: HubData) => string
	statusTag: (d: HubData) => (HubBadge & { icon?: IconName }) | null
	completionHint: (d: HubData) => string | undefined
	showHealthQr: boolean
	banners: HubBanner[]
	sections: { title: string; rows: HubRow[] }[]
}

const newLoginBadge = (d: HubData): HubBadge | null =>
	d.newLogins > 0 ? { label: `${d.newLogins} new login${d.newLogins > 1 ? 's' : ''}`, tone: 'pending' } : null

const SETTINGS_ROW: HubRow = {
	key: 'settings',
	title: 'Settings',
	subtitle: 'Notifications, language, privacy',
	icon: 'cog-outline',
	tone: 'sky',
	route: ROUTES.STACK.PROFILE_SETTINGS,
}

const SECURITY_ROW: HubRow = {
	key: 'security',
	title: 'Login & security',
	subtitle: 'Logged-in devices',
	icon: 'shield-lock-outline',
	tone: 'lilac',
	route: ROUTES.STACK.PROFILE_SECURITY,
	badge: newLoginBadge,
}

const HELP_ROW: HubRow = {
	key: 'help',
	title: 'Help & support',
	subtitle: 'FAQs and chat',
	icon: 'lifebuoy',
	tone: 'sand',
}

export const PROFILE_HUB_CONFIG: Record<HubRole, HubConfig> = {
	patient: {
		roleLine: (d) => ['Patient', d.roleDetail].filter(Boolean).join(' · '),
		statusTag: (d) => (d.mobileVerified ? { label: 'Mobile verified', tone: 'confirmed', icon: 'check' } : null),
		completionHint: (d) => (d.completion === 100 ? 'Complete' : 'Almost done'),
		showHealthQr: true,
		banners: [
			{
				key: 'incomplete-member',
				visible: (d) => !!d.incompleteMember,
				tone: 'warning',
				icon: 'account-alert-outline',
				title: (d) => `Complete ${d.incompleteMember?.name.split(' ')[0] ?? ''}'s details`,
				subtitle: 'Added while booking · date of birth and health info missing',
				route: ROUTES.STACK.PATIENT_FAMILY_MEMBER,
				params: (d) => ({ memberId: d.incompleteMember?.id }),
			},
		],
		sections: [
			{
				title: 'ABOUT YOU',
				rows: [
					{
						key: 'personal',
						title: 'Personal details',
						subtitle: 'Name, date of birth, contact',
						icon: 'account-outline',
						tone: 'mint',
						route: ROUTES.STACK.PROFILE_PERSONAL,
					},
					{
						key: 'health',
						title: 'Health details',
						subtitle: 'Allergies, conditions, medicines, emergency contacts',
						icon: 'heart-pulse',
						tone: 'peach',
						route: ROUTES.STACK.PATIENT_HEALTH,
					},
					{
						key: 'lifestyle',
						title: 'Lifestyle',
						subtitle: 'Smoking, alcohol, activity, sleep',
						icon: 'run',
						tone: 'sky',
						route: ROUTES.STACK.PATIENT_LIFESTYLE,
					},
					{
						key: 'family',
						title: 'Family members',
						subtitle: (d) =>
							d.familyNames.length ? d.familyNames.join(', ') : 'Add the people you book care for',
						icon: 'account-group-outline',
						tone: 'lilac',
						route: ROUTES.STACK.PATIENT_FAMILY,
						badge: (d) =>
							d.incompleteCount ? { label: `${d.incompleteCount} incomplete`, tone: 'pending' } : null,
					},
					{
						key: 'addresses',
						title: 'Saved addresses',
						subtitle: (d) => d.addressSummary || 'For home visits and sample pickup',
						icon: 'map-marker-outline',
						tone: 'sand',
						route: ROUTES.STACK.PATIENT_ADDRESSES,
					},
				],
			},
			{ title: 'APP', rows: [SETTINGS_ROW, SECURITY_ROW, HELP_ROW] },
		],
	},

	doctor: {
		roleLine: (d) => d.roleDetail || 'Doctor',
		statusTag: (d) =>
			d.verified
				? { label: 'Verified doctor', tone: 'confirmed', icon: 'check-decagram' }
				: { label: 'Verification pending', tone: 'pending', icon: 'clock-outline' },
		completionHint: (d) => (d.completion === 100 ? 'Complete' : d.hasBio ? 'Almost done' : 'Add a bio'),
		showHealthQr: false,
		banners: [],
		sections: [
			{
				title: 'YOUR PRACTICE',
				rows: [
					{
						key: 'personal',
						title: 'Personal details',
						subtitle: 'Name, registration & certificate, contact',
						icon: 'account-outline',
						tone: 'mint',
						route: ROUTES.STACK.PROFILE_PERSONAL,
					},
					{
						key: 'professional',
						title: 'Professional & documents',
						subtitle: 'Qualifications, expertise, ID',
						icon: 'school-outline',
						tone: 'sky',
						route: ROUTES.STACK.DOCTOR_PROFESSIONAL,
						badge: (d) => (d.verified ? { label: 'Verified', tone: 'confirmed' } : null),
					},
					{
						key: 'hospitals',
						title: 'My hospitals & clinics',
						subtitle: (d) =>
							d.hospitalCount
								? `${d.hospitalCount} place${d.hospitalCount > 1 ? 's' : ''} · fees and consultation rules`
								: 'Add where patients can visit you',
						icon: 'hospital-building',
						tone: 'peach',
						route: ROUTES.STACK.DOCTOR_HOSPITALS,
					},
					{
						key: 'availability',
						title: 'Availability',
						subtitle: 'Hours and date overrides for each clinic',
						icon: 'calendar-clock-outline',
						tone: 'lilac',
						route: ROUTES.STACK.PROFILE_AVAILABILITY,
					},
					{
						key: 'achievements',
						title: 'Achievements',
						subtitle: 'Awards, publications, conferences',
						icon: 'trophy-outline',
						tone: 'sand',
						route: ROUTES.STACK.DOCTOR_ACHIEVEMENTS,
					},
				],
			},
			{
				title: 'APP',
				rows: [
					{
						key: 'favourites',
						title: 'Favourite doctors',
						subtitle: 'Doctors you refer to often',
						icon: 'heart-outline',
						tone: 'peach',
						route: ROUTES.STACK.DOCTOR_FAVOURITES,
					},
					SETTINGS_ROW,
					SECURITY_ROW,
				],
			},
		],
	},

	ancillary: {
		roleLine: (d) => [d.roleTitle, d.roleDetail].filter(Boolean).join(' · '),
		statusTag: (d) =>
			d.verified
				? { label: 'Verified provider', tone: 'confirmed', icon: 'check-decagram' }
				: d.inReview
					? { label: 'Licence in review', tone: 'pending', icon: 'clock-outline' }
					: null,
		completionHint: (d) => (d.completion === 100 ? 'Complete' : d.inReview ? 'Licence in review' : 'Almost done'),
		showHealthQr: false,
		banners: [
			{
				key: 'licence-review',
				visible: (d) => d.inReview,
				tone: 'warning',
				icon: 'clock-outline',
				title: () => 'Licence under review',
				subtitle: 'Usually 1–2 working days. You can take bookings once approved.',
				route: ROUTES.STACK.PROVIDER_WORK,
			},
		],
		sections: [
			{
				title: 'YOUR WORK',
				rows: [
					{
						key: 'personal',
						title: 'Personal details',
						subtitle: 'Name, contact, languages',
						icon: 'account-outline',
						tone: 'mint',
						route: ROUTES.STACK.PROFILE_PERSONAL,
					},
					{
						key: 'work',
						title: 'Work & documents',
						subtitle: 'Registration, certificates, ID, services',
						icon: 'briefcase-outline',
						tone: 'sky',
						route: ROUTES.STACK.PROVIDER_WORK,
						badge: (d) =>
							d.verified
								? { label: 'Verified', tone: 'confirmed' }
								: d.inReview
									? { label: 'In review', tone: 'pending' }
									: null,
					},
					{
						key: 'availability',
						title: 'Availability',
						subtitle: 'Time ranges for each day, leave',
						icon: 'calendar-clock-outline',
						tone: 'lilac',
						route: ROUTES.STACK.PROFILE_AVAILABILITY,
					},
					{
						key: 'payout',
						title: 'Payout account',
						subtitle: 'Bank or UPI for your earnings',
						icon: 'bank-outline',
						tone: 'sand',
						badge: () => ({ label: 'Coming soon', tone: 'neutral' }),
					},
				],
			},
			{ title: 'APP', rows: [SETTINGS_ROW, SECURITY_ROW] },
		],
	},
}

/** Which hub a signed-in role gets; null = role keeps its older profile screen. */
export const hubRoleFor = (role?: string | null): HubRole | null => {
	if (role === 'doctor') return 'doctor'
	if (role === 'ancillary' || role === 'nurse') return 'ancillary'
	if (role === 'patient' || !role) return 'patient'
	return null
}
