import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useTheme } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import type { MainTabParamList } from './types'
import { ROUTES } from './routes'
import { AppScreenHeader } from '../components/common'

import DashboardPage from '../features/dashboard/DashboardPage'
import SearchPage from '../features/doctor/search/SearchPage'
import PortalPage from '../features/portal/PortalPage'
import ProfilePage from '../features/profile/ProfilePage'
import SidebarLayout from '../components/layout/SidebarLayout'
import { useAuth } from '../context/AuthContext'

const Tab = createBottomTabNavigator<MainTabParamList>()

function HomeWithSidebar() {
	return (
		<SidebarLayout>
			<DashboardPage />
		</SidebarLayout>
	)
}

function getTabConfig(routeName: string) {
	if (routeName === ROUTES.MAIN.SEARCH) {
		return { iconName: 'magnify' as const, label: 'Search' }
	}
	if (routeName === ROUTES.MAIN.PORTAL) {
		return { iconName: 'calendar-clock' as const, label: 'Portal' }
	}
	if (routeName === ROUTES.MAIN.PROFILE) {
		return { iconName: 'account' as const, label: 'Profile' }
	}

	return { iconName: 'home' as const, label: 'Home' }
}

function DockedTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
	const theme = useTheme()
	const insets = useSafeAreaInsets()
	const activeRoute = state.routes[state.index]

	if (activeRoute?.name === ROUTES.MAIN.PROFILE) {
		return null
	}

	return (
		<View
			style={[
				styles.tabBar,
				{
					paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
					height: 60 + (insets.bottom > 0 ? insets.bottom : 8),
				},
			]}
		>
			{state.routes.map((route, index) => {
				const focused = state.index === index
				const { options } = descriptors[route.key]
				const { iconName, label } = getTabConfig(route.name)
				const color = focused ? '#0C7C7C' : '#94a3b8'

				const onPress = () => {
					const event = navigation.emit({
						type: 'tabPress',
						target: route.key,
						canPreventDefault: true,
					})

					if (!focused && !event.defaultPrevented) {
						navigation.navigate(route.name, route.params)
					}
				}

				const onLongPress = () => {
					navigation.emit({
						type: 'tabLongPress',
						target: route.key,
					})
				}

				return (
					<Pressable
						key={route.key}
						accessibilityRole="button"
						accessibilityState={focused ? { selected: true } : {}}
						accessibilityLabel={options.tabBarAccessibilityLabel}
						testID={options.tabBarButtonTestID}
						onPress={onPress}
						onLongPress={onLongPress}
						style={styles.tabBarItem}
					>
						<View style={styles.tabButton}>
							<View
								style={[
									styles.iconActiveCapsule,
									focused && styles.iconActiveCapsuleFocused,
								]}
							>
								<MaterialCommunityIcons name={iconName} size={24} color={color} />
							</View>
							<Text
								style={[
									styles.tabLabel,
									{ color },
									focused && styles.tabLabelFocused,
								]}
							>
								{label}
							</Text>
						</View>
					</Pressable>
				)
			})}
		</View>
	)
}

export default function MainTabNavigator() {
	const { role } = useAuth()
	const navigation = useNavigation<any>()
	const shouldShowSearch = role !== 'doctor'

	return (
		<Tab.Navigator
			tabBar={(props) => <DockedTabBar {...props} />}
			screenOptions={{
				headerShown: false,
			}}
		>
			<Tab.Screen name={ROUTES.MAIN.HOME} component={HomeWithSidebar} />
			{shouldShowSearch ? (
				<Tab.Screen
					name={ROUTES.MAIN.SEARCH}
					component={SearchPage}
					options={{
						headerShown: true,
						header: () => <AppScreenHeader title="Find Doctors" onBack={() => navigation.navigate(ROUTES.MAIN.HOME)} />,
					}}
				/>
			) : null}
			<Tab.Screen name={ROUTES.MAIN.PORTAL} component={PortalPage} />
			<Tab.Screen
				name={ROUTES.MAIN.PROFILE}
				component={ProfilePage}
				options={{
					headerShown: true,
					header: ({ navigation: screenNavigation }) => <AppScreenHeader title="My Profile" onBack={() => (screenNavigation.canGoBack() ? screenNavigation.goBack() : navigation.navigate(ROUTES.MAIN.HOME))} />,
				}}
			/>
		</Tab.Navigator>
	)
}

const styles = StyleSheet.create({
	tabBar: {
		backgroundColor: '#ffffff',
		borderTopWidth: 1,
		borderTopColor: '#f1f5f9',
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		width: '100%',
	},

	tabBarItem: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		height: '100%',
	},

	tabButton: {
		alignItems: 'center',
		justifyContent: 'center',
		gap: 3,
	},

	iconActiveCapsule: {
		width: 52,
		height: 30,
		borderRadius: 15,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: 'transparent',
	},

	iconActiveCapsuleFocused: {
		backgroundColor: '#eef8f8',
	},

	tabLabel: {
		fontSize: 10.5,
		lineHeight: 12,
		textAlign: 'center',
		fontWeight: '500',
	},

	tabLabelFocused: {
		fontWeight: '600',
	},
})
