import React from 'react'
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { BlurView } from 'expo-blur'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useTheme } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import type { MainTabParamList } from './types'
import { ROUTES } from './routes'
import { AppPathIcon, AppScreenHeader } from '../components/common'
import { APP_COLORS } from '../config/theme'
import { FLOATING_TAB_BAR_BOTTOM, FLOATING_TAB_BAR_HEIGHT, FLOATING_TAB_BAR_SIDE, FLOATING_TAB_ROUTES } from './tabBar'

import DashboardPage from '../features/dashboard/DashboardPage'
import SearchPage from '../features/doctor/search/SearchPage'
import BookingsPage from '../features/bookings/BookingsPage'
import PortalPage from '../features/portal/PortalPage'
import ProfilePage from '../features/profile/ProfilePage'
import { WalletPage } from '../features/wallet/WalletPage'
import SidebarLayout from '../components/layout/SidebarLayout'
import { useAuth } from '../context/AuthContext'
import { isPatientRole } from '../constants/constants'
import NursingCarePage from '../features/ancillary/patient/NursingCarePage'
import ProviderSchedulePage from '../features/ancillary/staff/ProviderSchedulePage'
import { HomeSheetsProvider, useHomeSheets } from '../features/dashboard/HomeSheetsContext'
import HomeSheetsHost from '../features/dashboard/components/HomeSheetsHost'
import { HOME_CHROME_PATHS, type HomeChromeIcon } from '../features/dashboard/homeChromeIcons'

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
			{state.routes
				.filter((route) => route.name !== ROUTES.MAIN.PROFILE)
				.map((route) => {
					const index = state.routes.findIndex((r) => r.key === route.key)
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

interface FloatingTab {
	key: string
	/** Tab route to navigate to; null = opens the "Healthcare at home" sheet instead. */
	route: string | null
	label: string
	icon: HomeChromeIcon
}

const PATIENT_TABS: FloatingTab[] = [
	{ key: 'home', route: ROUTES.MAIN.HOME, label: 'Home', icon: 'home' },
	{ key: 'search', route: ROUTES.MAIN.SEARCH, label: 'Search', icon: 'search' },
	{ key: 'care', route: null, label: 'Healthcare at home', icon: 'careAtHome' },
	{ key: 'bookings', route: ROUTES.MAIN.PORTAL, label: 'Bookings', icon: 'bookings' },
	{ key: 'wallet', route: ROUTES.MAIN.WALLET, label: 'Wallet', icon: 'wallet' },
]

/** Ancillary provider tabs (ancillary-provider design): Today · Schedule · Earnings · Profile. */
const PROVIDER_TABS: FloatingTab[] = [
	{ key: 'today', route: ROUTES.MAIN.HOME, label: 'Today', icon: 'today' },
	{ key: 'schedule', route: ROUTES.MAIN.PORTAL, label: 'Schedule', icon: 'appointments' },
	{ key: 'earnings', route: ROUTES.MAIN.WALLET, label: 'Earnings', icon: 'myWallet' },
	{ key: 'profile', route: ROUTES.MAIN.PROFILE, label: 'Profile', icon: 'profile' },
]
/** The 4-button provider pill sits 36 from the sides (design); the 5-button patient pill 20. */
const PROVIDER_PILL_SIDE = 36

// Android's BlurView has no real blur without an experimental method, so the fill is more opaque there.
const PILL_FILL = Platform.OS === 'ios' ? '#FFFFFF59' : '#FFFFFFE6'

interface FloatingTabBarProps extends BottomTabBarProps {
	tabs: FloatingTab[]
	/** Pill inset from the screen sides. Defaults to FLOATING_TAB_BAR_SIDE. */
	side?: number
}

/**
 * Floating tab bar (Home redesign): a blurred pill of icon-only 48px buttons -- five for patients (the
 * middle one opens the "Healthcare at home" sheet, highlighted while it's open, instead of navigating) and
 * four for ancillary providers. On FLOATING_TAB_ROUTES the bar overlays the screen (content pads by
 * TAB_BAR_CLEARANCE); on other tabs it sits in an in-flow band so their existing layouts aren't covered.
 */
function FloatingTabBar({ state, navigation, tabs, side = FLOATING_TAB_BAR_SIDE }: FloatingTabBarProps) {
	const insets = useSafeAreaInsets()
	const { openSheet, open } = useHomeSheets()
	const activeName = state.routes[state.index]?.name

	if (activeName === ROUTES.MAIN.PROFILE) {
		return null
	}

	const careOpen = openSheet === 'ancillary'
	const floating = FLOATING_TAB_ROUTES.includes(activeName)
	const bottom = FLOATING_TAB_BAR_BOTTOM + insets.bottom

	return (
		<View
			pointerEvents="box-none"
			style={[
				floating ? styles.floatingWrapOverlay : styles.floatingWrapBand,
				{ height: FLOATING_TAB_BAR_HEIGHT + bottom + (floating ? 0 : 8) },
			]}
		>
			<View style={[styles.pillShadow, { bottom, left: side, right: side }]}>
				<View style={styles.pill}>
					<BlurView intensity={40} tint="light" style={StyleSheet.absoluteFill} />
					<View style={[StyleSheet.absoluteFill, { backgroundColor: PILL_FILL }]} />
					{tabs.map((tab) => {
						const route = tab.route ? state.routes.find((r) => r.name === tab.route) : undefined
						if (tab.route && !route) return null
						const active = careOpen
							? tab.route === null
							: tab.route === null
								? activeName === ROUTES.MAIN.ANCILLARY
								: tab.route === activeName

						const onPress = () => {
							if (!route) {
								open('ancillary')
								return
							}
							const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true })
							if (event.defaultPrevented) return
							if (route.name !== activeName || careOpen) navigation.navigate(route.name, route.params)
						}

						return (
							<Pressable
								key={tab.key}
								onPress={onPress}
								onLongPress={
									route ? () => navigation.emit({ type: 'tabLongPress', target: route.key }) : undefined
								}
								accessibilityRole="button"
								accessibilityLabel={tab.label}
								accessibilityState={{ selected: active }}
								accessibilityHint={route ? undefined : 'Opens home healthcare services'}
								style={[styles.pillButton, active && styles.pillButtonActive]}
							>
								<AppPathIcon
									d={HOME_CHROME_PATHS[tab.icon]}
									size={22}
									strokeWidth={2.1}
									color={active ? APP_COLORS.surface : APP_COLORS.ink}
								/>
								{active && <View style={styles.pillDot} />}
							</Pressable>
						)
					})}
				</View>
			</View>
		</View>
	)
}

export default function MainTabNavigator() {
	return (
		<HomeSheetsProvider>
			<MainTabs />
			<HomeSheetsHost />
		</HomeSheetsProvider>
	)
}

function MainTabs() {
	const navigation = useNavigation<any>()
	const { role } = useAuth()
	const { open } = useHomeSheets()
	const isNurse = role === 'nurse' || role === 'ancillary'
	const isDoctor = role === 'doctor'
	const isPatient = isPatientRole(role)
	const shouldShowSearch = role !== 'doctor'
	const shouldShowAncillary = !isNurse

	return (
		<>
			<Tab.Navigator
				tabBar={(props) =>
					isPatient ? (
						<FloatingTabBar {...props} tabs={PATIENT_TABS} />
					) : isNurse ? (
						<FloatingTabBar {...props} tabs={PROVIDER_TABS} side={PROVIDER_PILL_SIDE} />
					) : (
						<DockedTabBar {...props} onAncillaryPress={() => open('ancillary')} />
					)
				}
				screenOptions={{
					headerShown: false,
				}}
			>
				<Tab.Screen name={ROUTES.MAIN.HOME} component={HomeWithSidebar} />
				{shouldShowSearch ? (
					<Tab.Screen
						name={ROUTES.MAIN.SEARCH}
						component={SearchPage}
					/>
				) : null}
				{/* Nurse persona: PORTAL tab is the provider Schedule (scheduled bookings). */}
				{/* Doctor persona: PORTAL tab keeps the existing PortalPage (unaffected by the patient Bookings consolidation). */}
				{/* Patient persona: PORTAL tab renders the consolidated BookingsPage (Doctor Appointments page + category filters). */}
				<Tab.Screen
					name={ROUTES.MAIN.PORTAL}
					component={isNurse ? ProviderSchedulePage : isDoctor ? PortalPage : BookingsPage}
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
					component={WalletPage}
					options={{
						headerShown: false,
					}}
				/>
				<Tab.Screen
					name={ROUTES.MAIN.PROFILE}
					component={ProfilePage}
					options={{
						headerShown: true,
						header: () => (
							<AppScreenHeader
								title="My Profile"
								onBack={() => navigation.navigate(ROUTES.MAIN.HOME)}
							/>
						),
					}}
				/>
			</Tab.Navigator>
		</>
	)
}

const styles = StyleSheet.create({
	floatingWrapOverlay: {
		position: 'absolute',
		left: 0,
		right: 0,
		bottom: 0,
	},
	floatingWrapBand: {
		backgroundColor: APP_COLORS.pageBg,
	},
	pillShadow: {
		position: 'absolute',
		left: FLOATING_TAB_BAR_SIDE,
		right: FLOATING_TAB_BAR_SIDE,
		height: FLOATING_TAB_BAR_HEIGHT,
		borderRadius: FLOATING_TAB_BAR_HEIGHT / 2,
		shadowColor: APP_COLORS.shadow,
		shadowOffset: { width: 0, height: 8 },
		shadowOpacity: 0.15,
		shadowRadius: 28,
		elevation: 6,
	},
	pill: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 10,
		borderRadius: FLOATING_TAB_BAR_HEIGHT / 2,
		borderWidth: 1,
		borderColor: '#FFFFFF99',
		overflow: 'hidden',
	},
	pillButton: {
		width: 48,
		height: 48,
		borderRadius: 24,
		alignItems: 'center',
		justifyContent: 'center',
	},
	pillButtonActive: {
		backgroundColor: APP_COLORS.primary,
	},
	pillDot: {
		position: 'absolute',
		bottom: -7,
		width: 5,
		height: 5,
		borderRadius: 2.5,
		backgroundColor: APP_COLORS.primary,
	},
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
