import React, { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
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
import NursingCarePage from '../features/ancillary/patient/NursingCarePage'
import NurseBookingHistoryPage from '../features/ancillary/staff/NurseBookingHistoryPage'
import BookingsBottomSheet from '../features/bookings/BookingsBottomSheet'
import AncillaryServicesBottomSheet from '../features/ancillary/components/AncillaryServicesBottomSheet'

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
		<View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
			<NursingCarePage />
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
	onAncillaryPress: () => void
}

function DockedTabBar({ state, descriptors, navigation, onBookingsPress, onAncillaryPress }: DockedTabBarProps) {
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
				const isAncillaryTab = route.name === ROUTES.MAIN.ANCILLARY

				const onPress = () => {
					const event = navigation.emit({
						type: 'tabPress',
						target: route.key,
						canPreventDefault: true,
					})

					if (event.defaultPrevented) return

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

					if (isAncillaryTab) {
						onAncillaryPress()
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
	const [ancillarySheetVisible, setAncillarySheetVisible] = useState(false)

	return (
		<>
			<Tab.Navigator
				tabBar={(props) => (
					<DockedTabBar
						{...props}
						onBookingsPress={() => setBookingsSheetVisible(true)}
						onAncillaryPress={() => setAncillarySheetVisible(true)}
					/>
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
							headerShown: false,
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

			{/* BOOKINGS BOTTOM SHEET */}
			<BookingsBottomSheet
				visible={bookingsSheetVisible}
				onClose={() => setBookingsSheetVisible(false)}
			/>

			{/* ANCILLARY SERVICES SELECTION BOTTOM SHEET */}
			<AncillaryServicesBottomSheet
				visible={ancillarySheetVisible}
				onClose={() => setAncillarySheetVisible(false)}
			/>
		</>
	)
}

const styles = StyleSheet.create({
	tabBar: {
		flexDirection: 'row',
		backgroundColor: '#FFFFFF',
		borderTopWidth: 1,
		borderTopColor: '#E2E8F0',
		elevation: 8,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: -2 },
		shadowOpacity: 0.05,
		shadowRadius: 4,
	},
	tabBarItem: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
	},
	tabButton: {
		alignItems: 'center',
		justifyContent: 'center',
	},
	iconActiveCapsule: {
		paddingHorizontal: 12,
		paddingVertical: 4,
		borderRadius: 16,
	},
	iconActiveCapsuleFocused: {
		backgroundColor: 'rgba(12, 124, 124, 0.1)',
	},
	tabLabel: {
		fontSize: 11,
		fontWeight: '500',
		marginTop: 2,
	},
	tabLabelFocused: {
		fontWeight: '700',
	},
})
