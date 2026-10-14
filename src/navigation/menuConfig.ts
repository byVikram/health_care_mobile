// src/navigation/menuConfig.ts
//
// The sidebar and bottom tab bar are data served by GET /api/lookup/navigation (see health_care_backend/docs/navigation.md):
// per role, an ordered list of stable `key`s with a label and an icon key, never a route. The app owns what a key
// DOES (useSidebarMenu for the drawer, TAB_TARGETS in MainTabNavigator for the bar) and ignores keys it does not
// know, so the backend can add or reorder entries without an app release.
//
// DEFAULT_MENU is what the app shows until the first response arrives, when the request fails, and for a role the
// backend has no menu for. It mirrors the backend's shipped data (health_care_backend/app/utils/navigation_defaults.py).
import { USER_ROLES } from '../constants/constants'

export interface NavTab {
	key: string
	label: string
	/** Icon key (e.g. 'wallet'); the app draws it -- see menuIcons.tsx. */
	icon: string
}

export interface NavSidebarItem extends NavTab {
	/** Caps heading the row sits under; consecutive rows with the same group share one heading. */
	group: string | null
}

export interface NavigationConfig {
	bottomTabs: NavTab[]
	sidebar: NavSidebarItem[]
}

/**
 * `map[key]` for a key the map really has. A plain object also answers for inherited names ('constructor',
 * 'valueof', ...), which the backend's key format allows, so every key -> action / icon / tab lookup goes through here.
 */
export const lookupKey = <T>(map: Record<string, T>, key: string): T | undefined =>
	Object.prototype.hasOwnProperty.call(map, key) ? map[key] : undefined

/** The role a user gets a menu for: the backend's three menus, plus 'other' (pharmacy, radiology, laboratory). */
export type MenuRole = 'patient' | 'doctor' | 'ancillary' | 'other'

export const menuRoleFor = (role?: string | null): MenuRole => {
	if (role === USER_ROLES.PATIENT) return 'patient'
	if (role === USER_ROLES.DOCTOR) return 'doctor'
	if (role === USER_ROLES.ANCILLARY || role === USER_ROLES.NURSE) return 'ancillary'
	return 'other'
}

const tab = (key: string, label: string, icon: string): NavTab => ({ key, label, icon })
const row = (key: string, label: string, icon: string, group: string | null = null): NavSidebarItem => ({
	key,
	label,
	icon,
	group,
})

const HELP = row('help', 'Help & Support', 'help')
const SETTINGS = row('settings', 'Settings', 'settings')

export const DEFAULT_MENU: Record<MenuRole, NavigationConfig> = {
	patient: {
		bottomTabs: [
			tab('home', 'Home', 'home'),
			tab('search', 'Search', 'search'),
			tab('bookings', 'Bookings', 'bookings'),
			tab('more', 'More', 'more'),
		],
		sidebar: [
			row('appointments', 'Appointments', 'appointments', 'BOOKINGS & ORDERS'),
			row('medicine_orders', 'Medicine Orders', 'medicine', 'BOOKINGS & ORDERS'),
			row('lab_bookings', 'Lab Bookings', 'lab', 'BOOKINGS & ORDERS'),
			row('radiology_bookings', 'Radiology Bookings', 'radiology', 'BOOKINGS & ORDERS'),
			row('home_care_orders', 'Home Care Orders', 'home-care', 'BOOKINGS & ORDERS'),
			row('care_ai', 'Care AI', 'care-ai', 'HEALTH'),
			row('treatment_history', 'Treatment History', 'treatment', 'HEALTH'),
			row('help', 'Help & Support', 'help', 'SUPPORT'),
			row('settings', 'Settings', 'settings', 'SUPPORT'),
		],
	},
	doctor: {
		bottomTabs: [
			tab('home', 'Home', 'home'),
			tab('doctor_schedule', 'Schedule', 'schedule'),
			tab('doctor_questions', 'Questions', 'questions'),
		],
		sidebar: [
			row('appointments', 'Appointments', 'appointments'),
			row('doctor_past_visits', 'Past Visits', 'past-visits'),
			row('doctor_availability', 'Availability', 'availability'),
			row('notifications', 'Notifications', 'notifications'),
			HELP,
			SETTINGS,
		],
	},
	ancillary: {
		bottomTabs: [
			tab('provider_today', 'Today', 'today'),
			tab('provider_schedule', 'Schedule', 'schedule'),
			tab('provider_earnings', 'Earnings', 'earnings'),
			tab('profile', 'Profile', 'profile'),
		],
		sidebar: [
			row('bookings', 'Bookings', 'bookings'),
			row('earnings_payments', 'Earnings & Payments', 'earnings'),
			row('notifications', 'Notifications', 'notifications'),
			HELP,
			SETTINGS,
		],
	},
	// No server menu: the docked tab bar of MainTabNavigator stays, and the drawer lists the generic rows.
	other: {
		bottomTabs: [],
		sidebar: [
			row('appointments', 'Appointments', 'appointments'),
			row('medicine_orders', 'Medicine Orders', 'medicine'),
			row('lab_bookings', 'Lab Bookings', 'lab'),
			row('radiology_bookings', 'Radiology Bookings', 'radiology'),
			row('home_care_orders', 'Home Care Orders', 'home-care'),
			row('treatment_history', 'Treatment History', 'treatment'),
			row('reminders', 'Reminders', 'reminders'),
			row('wallet', 'My Wallet', 'wallet'),
			row('payments', 'Payments', 'payments'),
			HELP,
			SETTINGS,
		],
	},
}
