export type AppointmentModeKey = 'clinic' | 'video'

export interface HospitalItem {
	id: string
	label: string
	address?: string
}

export interface BackgroundListItem {
	id: string
	label: string
	sublabel?: string
}

export interface AchievementItem {
	id: string
	category: string
	title: string
	imageUrl: string
	awardedOn: string
	issuingOrganization: string
	description: string
}

export interface HospitalEntry {
	hospital: {
		id: string
		name: string
		address?: string
		distance?: string
		contact_number?: string
	}
	is_primary?: boolean
	offline_consultation_fee?: string | number
	video_consultation_fee?: string | number
	// Real field from the doctor-detail API (day-of-week names, lowercase,
	// e.g. ["monday","tuesday"]) -- used to grey out closed days on the date
	// grid instead of guessing.
	available_days?: string[]
}
