import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import type { MainTabParamList } from './types'
import type { HomeSheetKey } from '../features/dashboard/HomeSheetsContext'
import { ROUTES } from './routes'
import { AppPathIcon, AppScreenHeader } from '../components/common'
import { APP_COLORS } from '../config/theme'
import { FLOATING_TAB_BAR_BOTTOM, FLOATING_TAB_ROUTES } from './tabBar'
import { navigate } from './navigationService'
import { CARE_AI_FAB_SIZE, CareAiFab } from '../features/care-ai/components/CareAiFab'

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
import { NavigationConfigProvider, useNavigationConfig } from './NavigationConfigContext'
import { DEFAULT_MENU, lookupKey, menuRoleFor, type NavTab } from './menuConfig'
import { iconPath } from './menuIcons'

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
	/** Tab route to navigate to; null = opens `sheet` instead. */
	route: string | null
	/** Home sheet this tab opens when it has no route. */
	sheet?: HomeSheetKey
	label: string
	/** SVG path (24x24) of the tab's icon. */
	iconPath: string
}

/**
 * What each tab KEY from GET /api/lookup/navigation opens here. The backend decides which tabs a role gets, in what order and
 * under which label; the app decides what a key does. A key not listed (a newer backend) is simply not drawn.
 */
const TAB_TARGETS: Record<string, { route: string } | { sheet: HomeSheetKey }> = {
	home: { route: ROUTES.MAIN.HOME },
	search: { route: ROUTES.MAIN.SEARCH },
	bookings: { route: ROUTES.MAIN.PORTAL },
	more: { sheet: 'more' },
	doctor_schedule: { route: ROUTES.MAIN.SCHEDULE },
	doctor_questions: { route: ROUTES.MAIN.ENGAGE },
	provider_today: { route: ROUTES.MAIN.HOME },
	provider_schedule: { route: ROUTES.MAIN.PORTAL },
	provider_earnings: { route: ROUTES.MAIN.WALLET },
	profile: { route: ROUTES.MAIN.PROFILE },
}

function toFloatingTabs(tabs: NavTab[]): FloatingTab[] {
	return tabs.flatMap((tab) => {
		const target = lookupKey(TAB_TARGETS, tab.key)
		if (!target) return []
		return [
			{
				key: tab.key,
				route: 'route' in target ? target.route : null,
				sheet: 'sheet' in target ? target.sheet : undefined,
				label: tab.label,
				iconPath: iconPath(tab.icon),
			},
		]
	})
}

/** Shared by both floating bars: the tab's route, whether it is the active one, and its press handler. */
function resolveFloatingTab(
	tab: FloatingTab,
	state: BottomTabBarProps['state'],
	navigation: BottomTabBarProps['navigation'],
	openSheet: HomeSheetKey | null,
	openHomeSheet: (sheet: HomeSheetKey) => void,
) {
	const activeName = state.routes[state.index]?.name
	const route = tab.route ? state.routes.find((r) => r.name === tab.route) : undefined
	// While a services sheet is open it owns the highlight; otherwise the current route does.
	const sheetOpen = openSheet === 'more' || openSheet === 'ancillary'
	const active = sheetOpen ? tab.sheet === openSheet : tab.route === activeName

	const onPress = () => {
		if (!route) {
			if (tab.sheet) openHomeSheet(tab.sheet)
			return
		}
		const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true })
		if (event.defaultPrevented) return
		if (route.name !== activeName || sheetOpen) navigation.navigate(route.name, route.params)
	}

	return { route, active, onPress }
}

// ── Labelled bar (solid white pill) ─────────────────────────────────────────────────
// 66-high fully rounded white pill; every tab is an equal-width, 52-high, fully rounded slot holding a
// 24px icon over a 12px label, and the active slot fills teal (white icon + label). The side inset
// is chosen so every label fits its slot: four tabs sit 20 from the sides (~83px per slot), three tabs 48 (~92px).
const LABELLED_BAR_HEIGHT = 66
const LABELLED_ITEM_HEIGHT = 52
const PILL_SLIDE_MS = 280
const sideFor = (tabCount: number) => (tabCount <= 3 ? 48 : 20)
// Home's Care AI button sits to the right of the patient pill, with this gap between them.
const CARE_AI_FAB_GAP = 12

function LabelledTabBar({
	state,
	navigation,
	tabs,
	side,
	keepOnProfile = false,
	reserveRight = 0,
	accessory,
}: BottomTabBarProps & {
	tabs: FloatingTab[]
	side: number
	/** Keep the bar on the Profile tab (the nurse's bar has Profile as one of its tabs). */
	keepOnProfile?: boolean
	/** Extra space kept free on the right of the pill (for `accessory`). */
	reserveRight?: number
	/** A floating button drawn to the right of the pill, centred on it (Home's Care AI button). */
	accessory?: React.ReactNode
}) {
	const insets = useSafeAreaInsets()
	const barHeight = LABELLED_BAR_HEIGHT
	const { openSheet, open } = useHomeSheets()
	const activeName = state.routes[state.index]?.name

	// One highlight pill slides to the active tab (instead of each tab drawing its own fill). Tab slot
	// geometry comes from onLayout so it follows whatever width the equal-width slots get.
	const [slots, setSlots] = useState<Record<string, { x: number; y: number; width: number; height: number }>>({})
	const pillX = useRef(new Animated.Value(0)).current
	const pillPlaced = useRef(false)
	// Tapping a sheet tab (More) moves the pill first and opens the sheet once it has arrived; otherwise the
	// sheet's backdrop would cover the bar before the slide could be seen.
	const [pendingKey, setPendingKey] = useState<string | null>(null)
	const sheetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
	useEffect(
		() => () => {
			if (sheetTimer.current) clearTimeout(sheetTimer.current)
		},
		[]
	)
	const activeKey =
		pendingKey ??
		tabs.find((tab) => {
			const r = resolveFloatingTab(tab, state, navigation, openSheet, () => {})
			return r.active && !(tab.route && !r.route)
		})?.key
	const activeSlot = activeKey ? slots[activeKey] : undefined
	// Icon/label colours follow the pill, switching midway through the slide so they never sit white-on-white.
	const [inkKey, setInkKey] = useState(activeKey)
	useEffect(() => {
		if (activeKey === inkKey) return
		const t = setTimeout(() => setInkKey(activeKey), PILL_SLIDE_MS / 2)
		return () => clearTimeout(t)
	}, [activeKey, inkKey])

	useEffect(() => {
		if (!activeSlot) return
		if (!pillPlaced.current) {
			pillX.setValue(activeSlot.x)
			pillPlaced.current = true
			return
		}
		const slide = Animated.timing(pillX, {
			toValue: activeSlot.x,
			duration: PILL_SLIDE_MS,
			easing: Easing.out(Easing.cubic),
			useNativeDriver: true,
		})
		slide.start()
		return () => slide.stop()
	}, [activeSlot?.x, activeSlot?.width, pillX])

	// Patient / doctor reach Profile from the menu, so their bar hides there. The nurse's bar has a Profile tab
	// (`keepOnProfile`): hiding it would strand them on that screen with no way to the other tabs.
	if (activeName === ROUTES.MAIN.PROFILE && !keepOnProfile) {
		return null
	}

	const floating = FLOATING_TAB_ROUTES.includes(activeName)
	const bottom = FLOATING_TAB_BAR_BOTTOM + insets.bottom

	return (
		<View
			pointerEvents="box-none"
			style={[floating ? styles.floatingWrapOverlay : styles.floatingWrapBand, { height: barHeight + bottom + (floating ? 0 : 8) }]}
		>
			<View
				style={[
					styles.labelledShadow,
					{ bottom, left: side, right: side + reserveRight },
				]}
			>
				<View style={styles.labelledBar}>
					{activeSlot ? (
						<Animated.View
							pointerEvents="none"
							style={[
								styles.labelledActiveFill,
								{
									top: activeSlot.y,
									width: activeSlot.width,
									height: activeSlot.height,
									transform: [{ translateX: pillX }],
								},
							]}
						/>
					) : null}
					{tabs.map((tab) => {
						const { route, active, onPress: resolvedPress } = resolveFloatingTab(tab, state, navigation, openSheet, open)
						const onPress = tab.sheet
							? () => {
									if (pendingKey || sheetTimer.current) return
									setPendingKey(tab.key)
									sheetTimer.current = setTimeout(() => {
										sheetTimer.current = null
										open(tab.sheet as HomeSheetKey)
										setPendingKey(null)
									}, PILL_SLIDE_MS * 0.7)
								}
							: resolvedPress
						if (tab.route && !route) return null
						const inked = tab.key === inkKey
						const color = inked ? '#FFFFFF' : APP_COLORS.inkMuted

						return (
							<Pressable
								key={tab.key}
								onPress={onPress}
								onLongPress={route ? () => navigation.emit({ type: 'tabLongPress', target: route.key }) : undefined}
								accessibilityRole="button"
								accessibilityLabel={tab.label}
								accessibilityState={{ selected: active }}
								accessibilityHint={route ? undefined : `Opens ${tab.label.toLowerCase()} services`}
								style={styles.labelledItem}
								onLayout={(e) => {
									const { x, y, width, height } = e.nativeEvent.layout
									setSlots((prev) => {
										const cur = prev[tab.key]
										return cur && cur.x === x && cur.y === y && cur.width === width && cur.height === height
											? prev
											: { ...prev, [tab.key]: { x, y, width, height } }
									})
								}}
							>
								<View style={styles.labelledIcon}>
									<AppPathIcon d={tab.iconPath} size={24} strokeWidth={2.1} color={color} />
								</View>
								<Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} style={[styles.labelledLabel, { color, fontWeight: inked ? '800' : '600' }]}>
									{tab.label}
								</Text>
							</Pressable>
						)
					})}
				</View>
			</View>
			{accessory ? (
				<View pointerEvents="box-none" style={[styles.accessory, { right: side, bottom: bottom + (barHeight - CARE_AI_FAB_SIZE) / 2 }]}>
					{accessory}
				</View>
			) : null}
		</View>
	)
}
export default function MainTabNavigator() {
	return (
		<NavigationConfigProvider>
			<HomeSheetsProvider>
				<MainTabs />
				<HomeSheetsHost />
			</HomeSheetsProvider>
		</NavigationConfigProvider>
	)
}

function MainTabs() {
	const navigation = useNavigation<any>()
	const { role } = useAuth()
	const { open } = useHomeSheets()
	const { bottomTabs } = useNavigationConfig()
	const menuRole = menuRoleFor(role)
	// A server list the app cannot map at all (a newer backend) falls back to the role's built-in tabs; only roles with no
	// tabs of their own (pharmacy, radiology) get the docked bar.
	const floatingTabs = useMemo(() => {
		const fromServer = toFloatingTabs(bottomTabs)
		return fromServer.length ? fromServer : toFloatingTabs(DEFAULT_MENU[menuRole].bottomTabs)
	}, [bottomTabs, menuRole])
	const isNurse = role === 'nurse' || role === 'ancillary'
	const isDoctor = role === 'doctor'
	const isPatient = isPatientRole(role)
	// Doctor persona: Schedule + Engage replace Portal/Search/Ancillary (none of those apply to a
	// doctor's own dashboard) — see the doctor bottom tabs (backend menu) / DoctorHomeScreen / DoctorScheduleScreen / DoctorEngageScreen.
	const shouldShowSearch = role !== 'doctor'
	const shouldShowAncillary = !isNurse && !isDoctor
	const shouldShowPortal = !isDoctor

	return (
		<>
			<Tab.Navigator
				tabBar={(props) =>
					floatingTabs.length === 0 ? (
						<DockedTabBar {...props} onAncillaryPress={() => open('ancillary')} />
					) : (
						<LabelledTabBar
							{...props}
							tabs={floatingTabs}
							side={sideFor(floatingTabs.length)}
							// The ancillary provider's bar has Profile as a tab: hiding it there would strand them.
							keepOnProfile={floatingTabs.some((t) => t.route === ROUTES.MAIN.PROFILE)}
							{...(isPatient && props.state.routes[props.state.index]?.name === ROUTES.MAIN.HOME
								? {
										reserveRight: CARE_AI_FAB_SIZE + CARE_AI_FAB_GAP,
										accessory: <CareAiFab onPress={() => navigate(ROUTES.STACK.CARE_AI)} />,
									}
								: {})}
						/>
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
				{/* The doctor has no Wallet entry (neither a tab nor a drawer row), so the tab is not mounted for them. */}
				{isDoctor ? null : (
					<Tab.Screen
						name={ROUTES.MAIN.WALLET}
						component={WalletPage}
						options={{
							headerShown: false,
						}}
					/>
				)}
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
	accessory: {
		position: 'absolute',
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
		position: 'absolute',
		left: 0,
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
