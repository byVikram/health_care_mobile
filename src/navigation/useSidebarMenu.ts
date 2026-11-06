// src/navigation/useSidebarMenu.ts
//
// The drawer's rows for the signed-in user: the server's sidebar list (useNavigationConfig) with each KEY mapped to
// what it does here. A key the app has no action for is skipped, so the backend can add keys ahead of an app release.
// AppSidebar closes itself after a row is pressed, so the actions only navigate.
import { useMemo } from 'react'
import { useNavigation, type NavigationProp } from '@react-navigation/native'
import type { AppSidebarItem, AppSidebarSection } from '../components/common'
import { useAuth } from '../context/AuthContext'
import { hubRoleFor } from '../features/profile/config/profileHubConfig'
import { contactSupport, useAppConfig } from '../features/dashboard/useHomeChromeData'
import { useNavigationConfig } from './NavigationConfigContext'
import { lookupKey, menuRoleFor } from './menuConfig'
import { sidebarIcon } from './menuIcons'
import { ROUTES } from './routes'
import type { AppStackParamList, BookingsFilterKey } from './types'

/** @param active Whether the drawer is open: the support numbers are only fetched then. */
export function useSidebarMenu(active: boolean): AppSidebarSection[] {
	const navigation = useNavigation<NavigationProp<AppStackParamList>>()
	const { role } = useAuth()
	const { sidebar } = useNavigationConfig()
	const menuRole = menuRoleFor(role)
	const isPatient = menuRole === 'patient'
	const isDoctor = menuRole === 'doctor'
	// Patients and doctors reach support from the Help row; the other roles' Help row opens their profile.
	const hasSupportHelp = isPatient || isDoctor
	const config = useAppConfig(active && hasSupportHelp)
	const supportPhone = config?.support_phone || ''
	const supportEmail = config?.support_email || ''

	return useMemo(() => {
		const openTab = (screen: string, params?: object) =>
			navigation.navigate(ROUTES.MAIN.TABS, { screen, ...(params ? { params } : {}) } as never)
		// Patients land on the consolidated Bookings page with the category pre-selected.
		const openBookings = (filter: BookingsFilterKey) => () => openTab(ROUTES.MAIN.PORTAL, { filter })
		// The doctor's Schedule tab, All > Upcoming (appointments) or All > Past (finished visits).
		const openSchedule = (mode: 'up' | 'past') => () => openTab(ROUTES.MAIN.SCHEDULE, { segment: 'all', mode })
		const toHome = () => openTab(ROUTES.MAIN.HOME)
		const openHelp = () => {
			// No support number or email configured (or not loaded yet): the profile hub has the Help & support row.
			if (!contactSupport(supportPhone, supportEmail)) openTab(ROUTES.MAIN.PROFILE)
		}

		const actions: Record<string, () => void> = {
			appointments: isDoctor ? openSchedule('up') : openBookings('doctor'),
			medicine_orders: openBookings('medicine'),
			lab_bookings: openBookings('lab'),
			radiology_bookings: openBookings('radiology'),
			home_care_orders: openBookings('ancillary'),
			care_ai: () => navigation.navigate(ROUTES.STACK.CARE_AI),
			medical_records: () => navigation.navigate(ROUTES.STACK.MEDICAL_RECORDS),
			// There is no standalone treatment-history screen: for a patient the appointment history is the closest real
			// target; the other roles have none yet and stay on Home.
			treatment_history: isPatient ? openBookings('doctor') : toHome,
			doctor_past_visits: openSchedule('past'),
			doctor_availability: () => navigation.navigate(ROUTES.STACK.PROFILE_AVAILABILITY),
			reminders: toHome,
			wallet: () => navigation.navigate(ROUTES.STACK.WALLET),
			payments: () =>
				navigation.navigate(isPatient ? ROUTES.STACK.WALLET_TRANSACTIONS : ROUTES.STACK.PATIENT_PAYMENT),
			help: hasSupportHelp ? openHelp : () => openTab(ROUTES.MAIN.PROFILE),
			settings: () =>
				navigation.navigate(hubRoleFor(role) ? ROUTES.STACK.PROFILE_SETTINGS : ROUTES.STACK.SETTINGS),
			bookings: () => openTab(ROUTES.MAIN.PORTAL),
			earnings_payments: () => navigation.navigate(ROUTES.STACK.NURSE_EARNINGS),
			notifications: () => navigation.navigate(ROUTES.STACK.NOTIFICATION),
		}

		const sections: AppSidebarSection[] = []
		for (const entry of sidebar) {
			const onPress = lookupKey(actions, entry.key)
			if (!onPress) continue
			// A patient's Help row only exists when there is a support number or email to reach; the doctor's always does.
			if (entry.key === 'help' && isPatient && !supportPhone && !supportEmail) continue

			const item: AppSidebarItem = { id: entry.key, label: entry.label, icon: sidebarIcon(entry.icon), onPress }

			const last = sections[sections.length - 1]
			if (last && last.title === (entry.group ?? undefined)) last.items.push(item)
			else sections.push({ id: `${sections.length}-${entry.group ?? ''}`, title: entry.group ?? undefined, items: [item] })
		}
		return sections
	}, [navigation, role, sidebar, isPatient, isDoctor, hasSupportHelp, supportPhone, supportEmail])
}
