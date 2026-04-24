import React, { useMemo, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { AppSidebar } from '../common'
import AppHeader from '../common/AppHeader'
import type { AppSidebarItem } from '../common'
import { useAuth } from '../../context/AuthContext'
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

// ─── Mock fallback user ───────────────────────────────────────────────────────
const MOCK_USER = {
	name: 'Nitin',
	avatar: undefined as string | undefined,
	profileCompletion: 72,
}

interface SidebarLayoutProps {
	children: React.ReactNode
}

export default function SidebarLayout({ children }: SidebarLayoutProps) {
	const [isSidebarOpen, setIsSidebarOpen] = useState(false)
	const navigation = useNavigation<any>()
	const { clearAuth, user: authUser } = useAuth()

	const user = {
		name: authUser?.name ?? MOCK_USER.name,
		avatar: authUser?.avatar ?? MOCK_USER.avatar,
		profileCompletion: authUser?.profileCompletion ?? MOCK_USER.profileCompletion,
	}

	const handleEditProfile = () => {
		setIsSidebarOpen(false)
		navigation.navigate('MainTabs', { screen: 'Profile' })
	}

	// ── Navigate to the SearchPage STACK screen (not the tab) ─────────────────
	// Using push ensures a fresh back-navigable screen even if SearchPage is
	// already the active tab. navigate('SearchPage') resolves to the stack screen
	// registered in AppNavigator's authenticated stack.
	const handleSearchPress = () => {
		navigation.navigate('SearchPage')
	}

	const menuItems = useMemo<AppSidebarItem[]>(
		() => [
			{
				id: 'appointments',
				label: 'My Appointments',
				icon: <AppointmentsIcon width={24} height={24} />,
				onPress: () => navigation.navigate('MainTabs', { screen: 'Portal' }),
			},
			{
				id: 'pharmacy',
				label: 'Pharmacy',
				icon: <PharmacyIcon width={20} height={20} />,
				onPress: () => navigation.navigate('MainTabs', { screen: 'Home' }),
			},
			{
				id: 'lab',
				label: 'Lab',
				icon: <LabIcon width={20} height={20} />,
				onPress: () => navigation.navigate('MainTabs', { screen: 'Home' }),
			},
			{
				id: 'radiology',
				label: 'Radiology',
				icon: <RadiologyIcon width={20} height={20} />,
				onPress: () => navigation.navigate('MainTabs', { screen: 'Home' }),
			},
			{
				id: 'ancillary',
				label: 'Ancillary',
				icon: <AncillaryIcon width={20} height={20} />,
				onPress: () => navigation.navigate('MainTabs', { screen: 'Home' }),
			},
			{
				id: 'treatment-history',
				label: 'Treatment History',
				icon: <TreatmentIcon width={20} height={20} />,
				onPress: () => navigation.navigate('MainTabs', { screen: 'Home' }),
			},
			{
				id: 'reminders',
				label: 'Reminders',
				icon: <RemindersIcon width={20} height={20} />,
				onPress: () => navigation.navigate('MainTabs', { screen: 'Home' }),
			},
			{
				id: 'payments',
				label: 'Payments',
				icon: <PaymentsIcon width={20} height={20} />,
				onPress: () => navigation.navigate('MainTabs', { screen: 'Home' }),
			},
			{
				id: 'blogs',
				label: 'Blogs',
				icon: 'newspaper-variant-outline',
				onPress: () => navigation.navigate('MainTabs', { screen: 'Home' }),
			},
			{
				id: 'help',
				label: 'Help Center',
				icon: <HelpCenterIcon width={20} height={20} />,
				onPress: () => navigation.navigate('MainTabs', { screen: 'Profile' }),
			},
			{
				id: 'settings',
				label: 'Settings',
				icon: <SettingsIcon width={20} height={20} />,
				onPress: () => navigation.navigate('SettingPage', { screen: 'Settings' }),
			},
		],
		[navigation],
	)

	return (
		<View style={styles.container}>
			<AppSidebar
				visible={isSidebarOpen}
				profileCompletion={user.profileCompletion}
				onClose={() => setIsSidebarOpen(false)}
				onLogout={clearAuth}
				onEditProfile={handleEditProfile}
				menuItems={menuItems}
			/>

			{/*
				THE single AppHeader for the Home screen.
				DashboardPage must NOT render its own AppHeader.
			*/}
			<AppHeader
				variant="home"
				userName={user.name}
				location="KR Market"
				avatarUri={user.avatar}
				onAvatarPress={() => setIsSidebarOpen(true)}
				isSearchEditable={false}
				onSearchPress={handleSearchPress}
			/>

			{children}
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f5f5f5',
	},
})

