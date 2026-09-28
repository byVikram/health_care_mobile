import { MaterialCommunityIcons } from '@expo/vector-icons'

export type CareTypeKey = 'DAY_CARE' | 'NIGHT_CARE' | 'FULL_DAY_CARE' | 'HOURLY_CARE'

export type SchedulingMode = 'FIXED_WINDOW' | 'FLEXIBLE_START_24H' | 'CUSTOM_WINDOW'

export interface CareTypeMetadata {
	id: CareTypeKey
	title: string
	tagline: string
	explanation: string
	icon: keyof typeof MaterialCommunityIcons.glyphMap
	schedulingMode: SchedulingMode
	fixedStartTime?: string
	fixedEndTime?: string
	isOvernightFixed?: boolean
	fixedHoursFormatted?: string
	fixedDurationLabel?: string
	fixedDurationHours?: number
	windowNote?: string
	badgeText?: string
}

export const CAREGIVER_TIME_SERVICES: Record<CareTypeKey, CareTypeMetadata> = {
	DAY_CARE: {
		id: 'DAY_CARE',
		title: 'Day Care',
		tagline: 'Daytime caregiver support',
		explanation: 'Caregiver assistance at your home during the scheduled daytime hours.',
		icon: 'white-balance-sunny',
		schedulingMode: 'FIXED_WINDOW',
		fixedStartTime: '09:00',
		fixedEndTime: '18:00',
		fixedHoursFormatted: '09:00 AM – 06:00 PM',
		fixedDurationLabel: '9 hours',
		fixedDurationHours: 9,
		isOvernightFixed: false,
		windowNote: 'Fixed daytime care window',
		badgeText: 'Fixed 9 Hrs',
	},
	NIGHT_CARE: {
		id: 'NIGHT_CARE',
		title: 'Night Care',
		tagline: 'Overnight caregiver support',
		explanation: 'Caregiver assistance during overnight hours at your home.',
		icon: 'weather-night',
		schedulingMode: 'FIXED_WINDOW',
		fixedStartTime: '20:00',
		fixedEndTime: '08:00',
		fixedHoursFormatted: '08:00 PM – 08:00 AM next day',
		fixedDurationLabel: '12 hours',
		fixedDurationHours: 12,
		isOvernightFixed: true,
		windowNote: 'Fixed overnight care window (crosses midnight into next day)',
		badgeText: 'Fixed 12 Hrs',
	},
	FULL_DAY_CARE: {
		id: 'FULL_DAY_CARE',
		title: '24-Hour Care',
		tagline: 'Continuous caregiver support',
		explanation: 'Caregiver assistance throughout a full 24-hour period.',
		icon: 'clock-time-four-outline',
		schedulingMode: 'FLEXIBLE_START_24H',
		fixedDurationLabel: '24 hours',
		fixedDurationHours: 24,
		windowNote: 'Continuous 24-hour care window',
		badgeText: 'Full 24 Hrs',
	},
	HOURLY_CARE: {
		id: 'HOURLY_CARE',
		title: 'Hourly Care',
		tagline: 'Flexible caregiver hours',
		explanation: 'Choose your start and end time according to your care needs.',
		icon: 'calendar-clock-outline',
		schedulingMode: 'CUSTOM_WINDOW',
		windowNote: 'Customizable care window',
		badgeText: 'Hourly Duration',
	},
}

export interface CareCapabilityItem {
	id: string
	label: string
	icon: keyof typeof MaterialCommunityIcons.glyphMap
}

export const CAREGIVER_INCLUDED_CAPABILITIES: CareCapabilityItem[] = [
	{ id: 'personal', label: 'Personal Care & Hygiene', icon: 'account-outline' },
	{ id: 'mobility', label: 'Mobility & Walking Support', icon: 'walk' },
	{ id: 'meals', label: 'Meal Assistance', icon: 'silverware-fork-knife' },
	{ id: 'meds', label: 'Medication Reminders', icon: 'pill' },
	{ id: 'companion', label: 'Companionship', icon: 'account-group-outline' },
	{ id: 'daily', label: 'Help with Daily Activities', icon: 'home-heart' },
]
