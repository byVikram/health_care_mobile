// src/navigation/menuIcons.tsx
//
// The icon KEYS the backend sends with each menu entry ('wallet', 'care-ai', ...) -> what the app draws. An icon
// key the app does not know gets a neutral dot, so a new backend icon never breaks the menu.
import React from 'react'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { AppPathIcon } from '../components/common'
import { APP_COLORS } from '../config/theme'
import { CARE_AI_ICONS } from '../features/care-ai/careAiIcons'
import { HOME_CHROME_PATHS } from '../features/dashboard/homeChromeIcons'
import { lookupKey } from './menuConfig'

const PATHS: Record<string, string> = {
	home: HOME_CHROME_PATHS.home,
	search: HOME_CHROME_PATHS.search,
	bookings: HOME_CHROME_PATHS.bookings,
	more: HOME_CHROME_PATHS.grid,
	schedule: HOME_CHROME_PATHS.appointments,
	questions: HOME_CHROME_PATHS.help,
	today: HOME_CHROME_PATHS.today,
	profile: HOME_CHROME_PATHS.profile,
	appointments: HOME_CHROME_PATHS.appointments,
	medicine: HOME_CHROME_PATHS.medicine,
	lab: HOME_CHROME_PATHS.lab,
	radiology: HOME_CHROME_PATHS.radiology,
	'home-care': HOME_CHROME_PATHS.homeCare,
	'care-ai': CARE_AI_ICONS.sparkle,
	treatment: HOME_CHROME_PATHS.treatment,
	reminders: HOME_CHROME_PATHS.reminders,
	wallet: HOME_CHROME_PATHS.myWallet,
	earnings: HOME_CHROME_PATHS.myWallet,
	payments: HOME_CHROME_PATHS.payments,
	help: HOME_CHROME_PATHS.help,
	settings: HOME_CHROME_PATHS.settings,
	notifications: HOME_CHROME_PATHS.bell,
}

/** Icons the shared path set has no drawing for. */
const GLYPHS: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
	'past-visits': 'history',
	'medical-records': 'file-document-multiple-outline',
	availability: 'calendar-clock-outline',
}

/** 24x24 stroke path for an icon key (the tab bar draws these itself); a dot for an unknown key. */
export const iconPath = (icon: string): string => lookupKey(PATHS, icon) ?? 'M12 12h.01'

/** Drawer-row icon for an icon key. */
export const sidebarIcon = (icon: string): React.ReactNode => {
	const glyph = lookupKey(GLYPHS, icon)
	if (glyph) return <MaterialCommunityIcons name={glyph} size={20} color={APP_COLORS.primary} />
	return <AppPathIcon d={iconPath(icon)} size={18} color={APP_COLORS.primary} strokeWidth={2} />
}
