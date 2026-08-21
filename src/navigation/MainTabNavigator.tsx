import React, { useState } from 'react'
import { Pressable, StyleSheet, Text, View, ScrollView } from 'react-native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useTheme } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import type { MainTabParamList } from './types'
import { ROUTES } from './routes'
import { AppScreenHeader, LocationSelector } from '../components/common'

import DashboardPage from '../features/dashboard/DashboardPage'
import SearchPage from '../features/doctor/search/SearchPage'
import PortalPage from '../features/portal/PortalPage'
import ProfilePage from '../features/profile/ProfilePage'
import SidebarLayout from '../components/layout/SidebarLayout'
import { useAuth } from '../context/AuthContext'
import AncillaryDashboard from '../features/ancillary/patient/AncillaryDashboard'
import NurseBookingHistoryPage from '../features/ancillary/staff/NurseBookingHistoryPage'
import BookingsBottomSheet from '../features/bookings/BookingsBottomSheet'

const Tab = createBottomTabNavigator<MainTabParamList>()

function HomeWithSidebar() {
	return (
		<SidebarLayout>
			<DashboardPage />
		</SidebarLayout>
	)
}

function AncillaryTabWrapper() {
	return (
		<View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
			<AncillaryDashboard />
		</View>
	)
}

function getTabConfig(routeName: string) {
	if (routeName === ROUTES.MAIN.SEARCH) {
		return { iconName: 'magnify' as const, label: 'Search' }
	}
	if (routeName === ROUTES.MAIN.PORTAL) {
		return { iconName: 'calendar-multiple-check' as const, label: 'Bookings' }
	}
	if (routeName === ROUTES.MAIN.PROFILE) {
		return { iconName: 'account' as const, label: 'Profile' }
	}
	if (routeName === ROUTES.MAIN.ANCILLARY) {
		return { iconName: 'medical-bag' as const, label: 'Ancillary' }
	}

	return { iconName: 'home' as const, label: 'Home' }
}

interface DockedTabBarProps extends BottomTabBarProps {
	onBookingsPress: () => void
}

function DockedTabBar({ state, descriptors, navigation, onBookingsPress }: DockedTabBarProps) {
	const theme = useTheme()
	const insets = useSafeAreaInsets()
	const { role } = useAuth()
	const isNurse = (role as any) === 'nurse' || (role as any) === 'ancillary'
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
				const isBookingsTab = route.name === ROUTES.MAIN.PORTAL

				const onPress = () => {
					const event = navigation.emit({
						type: 'tabPress',
						target: route.key,
						canPreventDefault: true,
					})

					if (event.defaultPrevented) return

					// For Nurse persona, Bookings tab navigates directly to NurseBookingHistoryPage screen;
					// for other personas, open the Bookings bottom sheet as normal.
					if (isBookingsTab) {
						if (isNurse) {
							if (!focused) {
								navigation.navigate(route.name, route.params)
							}
							return
						}
						onBookingsPress()
						return
					}

					if (!focused) {
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
	const isNurse = (role as any) === 'nurse' || (role as any) === 'ancillary'
	const shouldShowSearch = role !== 'doctor'
	const shouldShowAncillary = !isNurse
	const [bookingsSheetVisible, setBookingsSheetVisible] = useState(false)

	return (
		<>
			<Tab.Navigator
				tabBar={(props) => (
					<DockedTabBar {...props} onBookingsPress={() => setBookingsSheetVisible(true)} />
				)}
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
							header: () => (
								<AppScreenHeader 
									title="Find Doctors" 
									onBack={() => navigation.navigate(ROUTES.MAIN.HOME)} 
									rightElement={<LocationSelector />}
								/>
							),
						}}
					/>
				) : null}
				{/* For Nurse persona, PORTAL tab renders NurseBookingHistoryPage directly */}
				<Tab.Screen
					name={ROUTES.MAIN.PORTAL}
					component={isNurse ? NurseBookingHistoryPage : PortalPage}
				/>
				{shouldShowAncillary ? (
					<Tab.Screen
						name={ROUTES.MAIN.ANCILLARY}
						component={AncillaryTabWrapper}
						options={{
							headerShown: !isNurse,
							header: () => (
								<AppScreenHeader
									title="Ancillary Dashboard"
									onBack={() => navigation.navigate(ROUTES.MAIN.HOME)}
								/>
							),
						}}
					/>
				) : null}
				<Tab.Screen
					name={ROUTES.MAIN.PROFILE}
					component={ProfilePage}
					options={{
						headerShown: true,
						header: ({ navigation: screenNavigation }) => <AppScreenHeader title="My Profile" onBack={() => (screenNavigation.canGoBack() ? screenNavigation.goBack() : navigation.navigate(ROUTES.MAIN.HOME))} />,
					}}
				/>
			</Tab.Navigator>

			<BookingsBottomSheet
				visible={bookingsSheetVisible}
				onClose={() => setBookingsSheetVisible(false)}
			/>
		</>
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
