import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useTheme } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
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

function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
	const theme = useTheme()
	const insets = useSafeAreaInsets()

	return (
		<View style={[styles.tabBar, { bottom: insets.bottom + 10 }]}>
			{state.routes.map((route, index) => {
				const focused = state.index === index
				const { options } = descriptors[route.key]
				const { iconName, label } = getTabConfig(route.name)
				const color = focused ? '#ffffff' : '#242833'
				const labelColor = focused ? '#ffffff' : '#242833'

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
									styles.activeCircle,
									focused && { backgroundColor: theme.colors.primary },
								]}
							>
								<View style={styles.iconWrapper}>
									<MaterialCommunityIcons name={iconName} size={26} color={color} />
								</View>
								<Text style={[styles.tabLabel, { color: labelColor }]}>
									{label}
								</Text>
							</View>
						</View>
					</Pressable>
				)
			})}
		</View>
	)
}

export default function MainTabNavigator() {
	return (
		<Tab.Navigator
			tabBar={(props) => <FloatingTabBar {...props} />}
			screenOptions={{
				headerShown: false,
			}}
		>
			<Tab.Screen name={ROUTES.MAIN.HOME} component={HomeWithSidebar} />
			<Tab.Screen name={ROUTES.MAIN.SEARCH} component={SearchPage} />
			<Tab.Screen name={ROUTES.MAIN.PORTAL} component={PortalPage} />
			<Tab.Screen name={ROUTES.MAIN.PROFILE} component={ProfilePage} />
		</Tab.Navigator>
	)
}

const styles = StyleSheet.create({
	tabBar: {
		position: 'absolute',
		left: 18,
		right: 18,
		bottom: 18,
		height: 74,
		borderRadius: 37,
		backgroundColor: '#ffffff',
		borderTopWidth: 0,
		paddingHorizontal: 12,
		paddingTop: 6,
		paddingBottom: 6,
		overflow: 'visible',
		flexDirection: 'row',
		alignItems: 'center',

		shadowColor: '#000000',
		shadowOffset: { width: 0, height: 14 },
		shadowOpacity: 0.18,
		shadowRadius: 18,
		elevation: 18,
	},

	tabBarItem: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		height: 62,
	},

	tabButton: {
		width: 76,
		height: 58,
		alignItems: 'center',
		justifyContent: 'center',
		flexGrow: 0,
		flexShrink: 0,
	},

	activeCircle: {
		width: 76,
		height: 58,
		minWidth: 76,
		maxWidth: 76,
		minHeight: 58,
		maxHeight: 58,
		borderRadius: 29,
		overflow: 'hidden',
		alignItems: 'center',
		justifyContent: 'center',
		paddingTop: 6,
		paddingBottom: 6,
		flexGrow: 0,
		flexShrink: 0,
	},

	iconWrapper: {
		width: 30,
		height: 30,
		alignItems: 'center',
		justifyContent: 'center',
		flexGrow: 0,
		flexShrink: 0,
	},

	tabLabel: {
		fontSize: 11,
		lineHeight: 13,
		textAlign: 'center',
		marginTop: 1,
	},
})
