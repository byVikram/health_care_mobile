import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import type { MainTabParamList } from './types'
import { ROUTES } from './routes'
import { AppPathIcon, AppScreenHeader } from '../components/common'
import { APP_COLORS } from '../config/theme'
import { FLOATING_TAB_BAR_BOTTOM, FLOATING_TAB_ROUTES } from './tabBar'

import DashboardPage from '../features/dashboard/DashboardPage'
import SearchPage from '../features/doctor/search/SearchPage'
import BookingsPage from '../features/bookings/BookingsPage'
import ProfilePage from '../features/profile/ProfilePage'
import { hubRoleFor } from '../features/profile/config/profileHubConfig'
import { WalletPage } from '../features/wallet/WalletPage'
import SidebarLayout from '../components/layout/SidebarLayout'
import { useAuth } from '../context/AuthContext'
import { isPatientRole } from '../constants/constants'
import NursingCarePage from '../features/ancillary/patient/NursingCarePage'
import ProviderSchedulePage from '../features/ancillary/staff/ProviderSchedulePage'
import DoctorHomeScreen from '../features/doctor/dashboard/DoctorHomeScreen'
import DoctorScheduleScreen from '../features/doctor/dashboard/DoctorScheduleScreen'
import DoctorEngageScreen from '../features/doctor/dashboard/DoctorEngageScreen'
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
	/** Shorter text for the labelled bar when `label` is too long to fit under the icon. */
	shortLabel?: string
	icon: HomeChromeIcon
}

const PATIENT_TABS: FloatingTab[] = [
	{ key: 'home', route: ROUTES.MAIN.HOME, label: 'Home', icon: 'home' },
	{ key: 'search', route: ROUTES.MAIN.SEARCH, label: 'Search', icon: 'search' },
	{ key: 'care', route: null, label: 'Healthcare at home', shortLabel: 'Home care', icon: 'careAtHome' },
	{ key: 'bookings', route: ROUTES.MAIN.PORTAL, label: 'Bookings', icon: 'bookings' },
]

/** Ancillary provider tabs: Today · Schedule · Earnings · Profile (labelled bar, same as the doctor's). */
const PROVIDER_TABS: FloatingTab[] = [
	{ key: 'today', route: ROUTES.MAIN.HOME, label: 'Today', icon: 'today' },
	{ key: 'schedule', route: ROUTES.MAIN.PORTAL, label: 'Schedule', icon: 'appointments' },
	{ key: 'earnings', route: ROUTES.MAIN.WALLET, label: 'Earnings', icon: 'myWallet' },
	{ key: 'profile', route: ROUTES.MAIN.PROFILE, label: 'Profile', icon: 'profile' },
]
/** Doctor dashboard tab bar: Home · Schedule · Questions. Wallet and Profile stay reachable from the menu. */
const DOCTOR_TABS: FloatingTab[] = [
	{ key: 'home', route: ROUTES.MAIN.HOME, label: 'Home', icon: 'home' },
	{ key: 'schedule', route: ROUTES.MAIN.SCHEDULE, label: 'Schedule', icon: 'appointments' },
	{ key: 'engage', route: ROUTES.MAIN.ENGAGE, label: 'Questions', icon: 'help' },
]

/** Shared by both floating bars: the tab's route, whether it is the active one, and its press handler. */
function resolveFloatingTab(
	tab: FloatingTab,
	state: BottomTabBarProps['state'],
	navigation: BottomTabBarProps['navigation'],
	careOpen: boolean,
	openCare: () => void,
) {
	const activeName = state.routes[state.index]?.name
	const route = tab.route ? state.routes.find((r) => r.name === tab.route) : undefined
	const active = careOpen ? tab.route === null : tab.route === null ? activeName === ROUTES.MAIN.ANCILLARY : tab.route === activeName

	const onPress = () => {
		if (!route) {
			openCare()
			return
		}
		const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true })
		if (event.defaultPrevented) return
		if (route.name !== activeName || careOpen) navigation.navigate(route.name, route.params)
	}

	return { route, active, onPress }
}

// ── Labelled bar (solid white pill) ─────────────────────────────────────────────────
// 66-high fully rounded white pill; every tab is an equal-width, 52-high, fully rounded slot holding a
// 24px icon over a 12px label, and the active slot fills teal (white icon + label). The side inset
// is chosen so every label fits its slot: patient (4 tabs) sits 20 from the sides (~83px per slot),
// doctor (3 tabs) 48 (~92px), ancillary provider (4 tabs) 48.
const LABELLED_BAR_HEIGHT = 66
const LABELLED_ITEM_HEIGHT = 52
const PATIENT_LABELLED_SIDE = 20
const DOCTOR_LABELLED_SIDE = 48
const PROVIDER_LABELLED_SIDE = 48

function LabelledTabBar({
	state,
	navigation,
	tabs,
	side,
}: BottomTabBarProps & { tabs: FloatingTab[]; side: number }) {
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
			style={[floating ? styles.floatingWrapOverlay : styles.floatingWrapBand, { height: LABELLED_BAR_HEIGHT + bottom + (floating ? 0 : 8) }]}
		>
			<View style={[styles.labelledShadow, { bottom, left: side, right: side }]}>
				<View style={styles.labelledBar}>
					{tabs.map((tab) => {
						const { route, active, onPress } = resolveFloatingTab(tab, state, navigation, careOpen, () => open('ancillary'))
						if (tab.route && !route) return null
						const color = active ? '#FFFFFF' : APP_COLORS.inkMuted

						return (
							<Pressable
								key={tab.key}
								onPress={onPress}
								onLongPress={route ? () => navigation.emit({ type: 'tabLongPress', target: route.key }) : undefined}
								accessibilityRole="button"
								accessibilityLabel={tab.label}
								accessibilityState={{ selected: active }}
								accessibilityHint={route ? undefined : 'Opens home healthcare services'}
								style={styles.labelledItem}
							>
								{/* The active highlight is its own fully opaque layer under the icon + label, so its colour
								    is identical on every tab and can't be tinted by the glass or the content behind the bar. */}
								{active && <View pointerEvents="none" style={styles.labelledActiveFill} />}
								<View style={styles.labelledIcon}>
									<AppPathIcon d={HOME_CHROME_PATHS[tab.icon]} size={24} strokeWidth={2.1} color={color} />
								</View>
								<Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} style={[styles.labelledLabel, { color, fontWeight: active ? '800' : '600' }]}>
									{tab.shortLabel ?? tab.label}
								</Text>
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
	// Doctor persona: Schedule + Engage replace Portal/Search/Ancillary (none of those apply to a
	// doctor's own dashboard) — see DOCTOR_TABS / DoctorHomeScreen / DoctorScheduleScreen / DoctorEngageScreen.
	const shouldShowSearch = role !== 'doctor'
	const shouldShowAncillary = !isNurse && !isDoctor
	const shouldShowPortal = !isDoctor

	return (
		<>
			<Tab.Navigator
				tabBar={(props) =>
					isPatient ? (
						<LabelledTabBar {...props} tabs={PATIENT_TABS} side={PATIENT_LABELLED_SIDE} />
					) : isDoctor ? (
						<LabelledTabBar {...props} tabs={DOCTOR_TABS} side={DOCTOR_LABELLED_SIDE} />
					) : isNurse ? (
						<LabelledTabBar {...props} tabs={PROVIDER_TABS} side={PROVIDER_LABELLED_SIDE} />
					) : (
						<DockedTabBar {...props} onAncillaryPress={() => open('ancillary')} />
					)
				}
				screenOptions={{
					headerShown: false,
				}}
			>
				<Tab.Screen name={ROUTES.MAIN.HOME} component={isDoctor ? DoctorHomeScreen : HomeWithSidebar} />
				{shouldShowSearch ? (
					<Tab.Screen
						name={ROUTES.MAIN.SEARCH}
						component={SearchPage}
					/>
				) : null}
				{isDoctor ? <Tab.Screen name={ROUTES.MAIN.SCHEDULE} component={DoctorScheduleScreen} /> : null}
				{isDoctor ? <Tab.Screen name={ROUTES.MAIN.ENGAGE} component={DoctorEngageScreen} /> : null}
				{/* Nurse persona: PORTAL tab is the provider Schedule (scheduled bookings). */}
				{/* Patient persona: PORTAL tab renders the consolidated BookingsPage (Doctor Appointments page + category filters). */}
				{shouldShowPortal ? (
					<Tab.Screen
						name={ROUTES.MAIN.PORTAL}
						component={isNurse ? ProviderSchedulePage : BookingsPage}
					/>
				) : null}
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
						// The profile hub (patient / doctor / ancillary) draws its own header.
						headerShown: hubRoleFor(role) === null,
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
	// Solid white on purpose: a translucent bar with a shadow on a background-less view let the shadow and
	// the page behind show through unevenly (a dimmed patch beside the active Bookings tab). With an
	// opaque fill the shadow is cast cleanly outside the bar and nothing shows through.
	labelledShadow: {
		position: 'absolute',
		height: LABELLED_BAR_HEIGHT,
		borderRadius: LABELLED_BAR_HEIGHT / 2,
		backgroundColor: '#FFFFFF',
		shadowColor: APP_COLORS.shadow,
		shadowOffset: { width: 0, height: 8 },
		shadowOpacity: 0.14,
		shadowRadius: 24,
		elevation: 6,
	},
	labelledBar: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 2,
		paddingHorizontal: 8,
		borderRadius: LABELLED_BAR_HEIGHT / 2,
		borderWidth: 1,
		borderColor: '#E3EAEB',
		overflow: 'hidden',
	},
	labelledItem: {
		flex: 1,
		minWidth: 0,
		height: LABELLED_ITEM_HEIGHT,
		borderRadius: LABELLED_ITEM_HEIGHT / 2,
		alignItems: 'center',
		justifyContent: 'center',
		gap: 3,
	},
	labelledActiveFill: {
		...StyleSheet.absoluteFill,
		borderRadius: LABELLED_ITEM_HEIGHT / 2,
		backgroundColor: APP_COLORS.primary,
		opacity: 1,
	},
	labelledIcon: {
		width: 26,
		height: 26,
		alignItems: 'center',
		justifyContent: 'center',
	},
	labelledLabel: {
		fontSize: 12,
		lineHeight: 15,
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
