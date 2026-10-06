// Role-specific content of the Settings screen. Notification toggles and the app language are screen-only
// for now (no backend yet) -- they change on screen but aren't saved.

import type { HubRole } from './profileHubConfig'

export interface SettingsToggle {
	key: string
	title: string
	subtitle: string
	defaultOn: boolean
}

export interface SettingsConfig {
	toggles: SettingsToggle[]
	privacySubtitle: string
	/** Delete-account sheet message. Accounts are soft-deleted: nothing is erased, login is blocked. */
	deleteMessage: string
}

const DELETE_NOTE = 'Your records are kept for legal and medical reasons, but you won’t be able to log in again.'

export const SETTINGS_CONFIG: Record<HubRole, SettingsConfig> = {
	patient: {
		toggles: [
			{
				key: 'remind',
				title: 'Appointment & visit reminders',
				subtitle: 'Before doctor visits, home visits and lab pickups',
				defaultOn: true,
			},
			{
				key: 'reports',
				title: 'Reports ready',
				subtitle: 'When lab reports and prescriptions arrive',
				defaultOn: true,
			},
			{ key: 'tips', title: 'Health tips & articles', subtitle: 'Occasional wellness reads', defaultOn: false },
			{ key: 'offers', title: 'Offers', subtitle: 'Discounts on labs and consultations', defaultOn: false },
		],
		privacySubtitle: 'Who can see your health records',
		deleteMessage: `This closes your account and the family members you manage. ${DELETE_NOTE}`,
	},
	doctor: {
		toggles: [
			{
				key: 'requests',
				title: 'Appointment requests',
				subtitle: 'New bookings and reschedules',
				defaultOn: true,
			},
			{
				key: 'questions',
				title: 'Patient questions',
				subtitle: 'When patients ask you something',
				defaultOn: true,
			},
			{ key: 'news', title: 'Karolahealth updates', subtitle: 'New features and tips', defaultOn: false },
		],
		privacySubtitle: 'What patients can see on your profile',
		deleteMessage: `This closes your account and removes you from search. ${DELETE_NOTE}`,
	},
	ancillary: {
		toggles: [
			{ key: 'bookings', title: 'New bookings', subtitle: 'When a patient chooses you', defaultOn: true },
			{ key: 'reminders', title: 'Visit reminders', subtitle: '30 minutes before each visit', defaultOn: true },
			{ key: 'news', title: 'Karolahealth updates', subtitle: 'Training and tips', defaultOn: false },
		],
		privacySubtitle: 'What patients can see before booking you',
		deleteMessage: `This closes your account and you’ll stop receiving bookings. ${DELETE_NOTE}`,
	},
}

export const LANGUAGE_CHOICES = ['English', 'हिन्दी', 'ಕನ್ನಡ', 'தமிழ்', 'മലയാളം']
