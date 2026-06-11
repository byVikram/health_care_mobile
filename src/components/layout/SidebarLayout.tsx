// SidebarLayout.tsx
import React, { useMemo, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { useNavigation, type NavigationProp } from '@react-navigation/native'

import { AppSidebar } from '../common'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import AppHeader from '../common/AppHeader'
import type { AppSidebarItem, AppSidebarProfile } from '../common'
import { useAuth } from '../../context/AuthContext'
import { ScrollProvider } from '../../context/ScrollContext'

import AppointmentsIcon from '../../assets/quick-services/appointments.svg'
import PharmacyIcon from '../../assets/icons/pharmacy.svg'
import LabIcon from '../../assets/icons/lab.svg'
import RadiologyIcon from '../../assets/icons/radiology.svg'
import AncillaryIcon from '../../assets/icons/ancillary.svg'
import TreatmentIcon from '../../assets/icons/treatment.svg'
import RemindersIcon from '../../assets/icons/reminders.svg'
import PaymentsIcon from '../../assets/icons/payments.svg'
import HelpCenterIcon from '../../assets/icons/help-center.svg'
import SettingsIcon from '../../assets/icons/settings.svg'

import { ROUTES } from '../../navigation/routes'
import type { AppStackParamList } from '../../navigation/types'

const MOCK_USER = {
	name: 'Nitin',
	avatar: undefined as string | undefined,
	profileCompletion: 72,
}

const PROFILES: AppSidebarProfile[] = [
	{
		id: 'anjali',
		label: 'Anjali',
		variant: 'smile',
		avatar: require('../../assets/Banner/patient.png'),
	},
	{
		id: 'anjali-mom',
		label: 'Anjali Mom',
		variant: 'mom',
		avatar: require('../../assets/Banner/doctor.png'),
	},
	{
		id: 'anjali-dad',
		label: 'Anjali’s Dad',
		variant: 'dad',
		avatar: require('../../assets/Banner/welcome-doctor.png'),
	},
	{ id: 'add', label: 'Add', variant: 'add' },
]

interface SidebarLayoutProps {
	children: React.ReactNode
}

export default function SidebarLayout({ children }: SidebarLayoutProps) {
	const [isSidebarOpen, setIsSidebarOpen] = useState(false)

	const navigation = useNavigation<NavigationProp<AppStackParamList>>()

	const { clearAuth, user: authUser, role } = useAuth()

	const user = {
		name: authUser?.name ?? MOCK_USER.name,
		avatar: authUser?.avatar ?? MOCK_USER.avatar,
		profileCompletion: authUser?.profileCompletion ?? MOCK_USER.profileCompletion,
	}

	const handleEditProfile = () => {
		setIsSidebarOpen(false)

		navigation.navigate(ROUTES.MAIN.TABS, {
			screen: ROUTES.MAIN.PROFILE,
		})
	}

	const handleSearchPress = () => {
		if (role === 'pharmacy') {
			navigation.navigate(ROUTES.STACK.ORDER_LIST as any)
		} else {
			navigation.navigate(ROUTES.MAIN.TABS, {
				screen: ROUTES.MAIN.SEARCH as any,
			})
		}
	}

	const menuItems = useMemo<AppSidebarItem[]>(
		() => [
			{
				id: 'appointments',
				label: 'My Appointments',
				icon: <AppointmentsIcon width={24} height={24} />,
				onPress: () => {
					setIsSidebarOpen(false)
					navigation.navigate(ROUTES.STACK.APPOINTMENTS)
				},
			},
			{
				id: 'pharmacy',
				label: 'Pharmacy',
				icon: <PharmacyIcon width={20} height={20} />,
				onPress: () => {
					setIsSidebarOpen(false)
					navigation.navigate(ROUTES.STACK.PHARMACY_SEARCH_PAGE)
				},
			},
			{
				id: 'medicine-orders',
				label: 'Medicine Orders',
				icon: <MaterialCommunityIcons name="pill" size={20} color="#1f5f68" />,
				onPress: () => {
					setIsSidebarOpen(false)
					navigation.navigate(ROUTES.STACK.ORDER_LIST as any)
				},
			},
			{
				id: 'lab',
				label: 'Lab',
				icon: <LabIcon width={20} height={20} />,
				onPress: () =>
					navigation.navigate(ROUTES.MAIN.TABS, {
						screen: ROUTES.MAIN.HOME,
					}),
			},
			{
				id: 'radiology',
				label: 'Radiology',
				icon: <RadiologyIcon width={20} height={20} />,
				onPress: () =>
					navigation.navigate(ROUTES.MAIN.TABS, {
						screen: ROUTES.MAIN.HOME,
					}),
			},
			{
				id: 'ancillary',
				label: 'Ancillary',
				icon: <AncillaryIcon width={20} height={20} />,
				onPress: () =>
					navigation.navigate(ROUTES.MAIN.TABS, {
						screen: ROUTES.MAIN.HOME,
					}),
			},
			{
				id: 'treatment-history',
				label: 'Treatment History',
				icon: <TreatmentIcon width={20} height={20} />,
				onPress: () =>
					navigation.navigate(ROUTES.MAIN.TABS, {
						screen: ROUTES.MAIN.HOME,
					}),
			},
			{
				id: 'reminders',
				label: 'Reminders',
				icon: <RemindersIcon width={20} height={20} />,
				onPress: () =>
					navigation.navigate(ROUTES.MAIN.TABS, {
						screen: ROUTES.MAIN.HOME,
					}),
			},
			{
				id: 'payments',
				label: 'Payments',
				icon: <PaymentsIcon width={20} height={20} />,
				onPress: () => navigation.navigate(ROUTES.STACK.PATIENT_PAYMENT),
			},
			{
				id: 'help',
				label: 'Help Center',
				icon: <HelpCenterIcon width={20} height={20} />,
				onPress: () =>
					navigation.navigate(ROUTES.MAIN.TABS, {
						screen: ROUTES.MAIN.PROFILE,
					}),
			},
			{
				id: 'settings',
				label: 'Settings',
				icon: <SettingsIcon width={20} height={20} />,
				onPress: () => navigation.navigate(ROUTES.STACK.SETTINGS),
			},
			{
				id: 'screencapturetest',
				label: 'Screen Capture Test',
				icon: <MaterialCommunityIcons name="camera" size={20} color="#1f5f68" />,
				onPress: () => navigation.navigate(ROUTES.STACK.SCREEN_CAPTURE_TEST),
			},
		],
		[navigation]
	)

	return (
		<ScrollProvider>
			<View style={styles.container}>
				<AppSidebar
					visible={isSidebarOpen}
					profileCompletion={user.profileCompletion}
					onClose={() => setIsSidebarOpen(false)}
					onLogout={clearAuth}
					onEditProfile={handleEditProfile}
					menuItems={menuItems}
					profiles={PROFILES}
				/>

				<AppHeader
					variant="home"
					userName={user.name}
					avatarUri={user.avatar}
					onAvatarPress={() => setIsSidebarOpen(true)}
					isSearchEditable={false}
					onSearchPress={handleSearchPress}
				/>

				<View style={styles.content}>{children}</View>
			</View>
		</ScrollProvider>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f5f5f5',
	},
	content: {
		flex: 1,
	},
})
