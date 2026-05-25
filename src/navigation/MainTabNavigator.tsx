import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useTheme } from 'react-native-paper'
import type { MainTabParamList } from './types'
import { ROUTES } from './routes'

import DashboardPage from '../features/dashboard/DashboardPage'
import SearchPage from '../features/doctor/search/SearchPage'
import PortalPage from '../features/portal/PortalPage'
import ProfilePage from '../features/profile/ProfilePage'
import SidebarLayout from '../components/layout/SidebarLayout'

const Tab = createBottomTabNavigator<MainTabParamList>()

function HomeWithSidebar() {
	return (
		<SidebarLayout>
			<DashboardPage />
		</SidebarLayout>
	)
}

export default function MainTabNavigator() {
	const theme = useTheme()

	return (
		<Tab.Navigator
			screenOptions={({ route }) => ({
				headerShown: false,
				tabBarActiveTintColor: theme.colors.primary,
				tabBarInactiveTintColor: 'gray',
				tabBarIcon: ({ color, size }) => {
					let iconName: keyof typeof MaterialCommunityIcons.glyphMap = 'home'
					if (route.name === ROUTES.MAIN.HOME) iconName = 'home'
					else if (route.name === ROUTES.MAIN.SEARCH) iconName = 'magnify'
					else if (route.name === ROUTES.MAIN.PORTAL) iconName = 'calendar-clock'
					else if (route.name === ROUTES.MAIN.PROFILE) iconName = 'account'

					return <MaterialCommunityIcons name={iconName} size={size} color={color} />
				},
			})}
		>
			<Tab.Screen name={ROUTES.MAIN.HOME} component={HomeWithSidebar} />
			<Tab.Screen name={ROUTES.MAIN.SEARCH} component={SearchPage} />
			<Tab.Screen name={ROUTES.MAIN.PORTAL} component={PortalPage} />
			<Tab.Screen name={ROUTES.MAIN.PROFILE} component={ProfilePage} />
		</Tab.Navigator>
	)
}
