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
import BookingsPage from '../features/bookings/BookingsPage'
import PortalPage from '../features/portal/PortalPage'
import ProfilePage from '../features/profile/ProfilePage'
import { WalletScreen } from '../features/wallet/WalletScreen'
import SidebarLayout from '../components/layout/SidebarLayout'
import { useAuth } from '../context/AuthContext'
import NursingCarePage from '../features/ancillary/patient/NursingCarePage'
import NurseBookingHistoryPage from '../features/ancillary/staff/NurseBookingHistoryPage'
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

function getTabConfig(routeName: string, focused: boolean) {
	if (routeName === ROUTES.MAIN.SEARCH) {
		return {
			iconName: 'magnify' as const,
			label: 'Search',
		}
	}
	if (routeName === ROUTES.MAIN.PORTAL) {
		return {
			iconName: focused ? ('calendar-month' as const) : ('calendar-month-outline' as const),
			label: 'Bookings',
		}
	}
	if (routeName === ROUTES.MAIN.WALLET) {
		return {
			iconName: focused ? ('wallet' as const) : ('wallet-outline' as const),
			label: 'Wallet',
		}
	}
	if (routeName === ROUTES.MAIN.PROFILE) {
		return {
			iconName: focused ? ('account-circle' as const) : ('account-circle-outline' as const),
			label: 'Profile',
		}
	}
	if (routeName === ROUTES.MAIN.ANCILLARY) {
		return {
			iconName: focused ? ('plus-box' as const) : ('plus-box-outline' as const),
			label: 'Ancillary',
		}
	}

	return {
		iconName: focused ? ('home' as const) : ('home-outline' as const),
		label: 'Home',
	}
}

interface DockedTabBarProps extends BottomTabBarProps {
	onAncillaryPress: () => void
}

function DockedTabBar({ state, descriptors, navigation, onAncillaryPress }: DockedTabBarProps) {
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
				const { iconName, label } = getTabConfig(route.name, focused)
				const color = focused ? '#0C7C7C' : '#64748B'
				const isAncillaryTab = route.name === ROUTES.MAIN.ANCILLARY

				const onPress = () => {
					const event = navigation.emit({
						type: 'tabPress',
						target: route.key,
						canPreventDefault: true,
					})

					if (event.defaultPrevented) return

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
	const isDoctor = (role as any) === 'doctor'
	const shouldShowSearch = role !== 'doctor'
	const shouldShowAncillary = !isNurse
	const [ancillarySheetVisible, setAncillarySheetVisible] = useState(false)

	return (
		<>
			<Tab.Navigator
				tabBar={(props) => (
					<DockedTabBar
						{...props}
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
				{/* Nurse persona: PORTAL tab renders NurseBookingHistoryPage directly. */}
				{/* Doctor persona: PORTAL tab keeps the existing PortalPage (unaffected by the patient Bookings consolidation). */}
				{/* Patient persona: PORTAL tab renders the consolidated BookingsPage (Doctor Appointments page + category filters). */}
				<Tab.Screen
					name={ROUTES.MAIN.PORTAL}
					component={isNurse ? NurseBookingHistoryPage : isDoctor ? PortalPage : BookingsPage}
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
					name={ROUTES.MAIN.WALLET}
					component={WalletScreen}
					options={{
						headerShown: false,
					}}
				/>
			</Tab.Navigator>

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
		borderTopColor: '#F1F5F9',
		elevation: 12,
		shadowColor: '#0F172A',
		shadowOffset: { width: 0, height: -4 },
		shadowOpacity: 0.06,
		shadowRadius: 8,
	},
	tabBarItem: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
	},
	tabButton: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 2,
	},
	iconActiveCapsule: {
		paddingHorizontal: 0,
		paddingVertical: 0,
		justifyContent: 'center',
		alignItems: 'center',
	},
	iconActiveCapsuleFocused: {
		backgroundColor: 'transparent',
	},
	tabLabel: {
		fontSize: 11,
		fontWeight: '500',
		marginTop: 3,
		letterSpacing: 0.1,
	},
	tabLabelFocused: {
		fontWeight: '700',
		color: '#0C7C7C',
	},
})
