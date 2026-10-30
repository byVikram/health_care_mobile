import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Image, Pressable, StyleSheet, Text, View, Animated, type LayoutChangeEvent } from 'react-native'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { USER_ROLES, isPatientRole } from '../../../constants/constants'
import DoctorHospitalDropdown from '../inputs/DoctorHospitalDropdown'
import LocationSelector from '../location/LocationSelector'
import { useAncillarySpecialty, useAuth } from '../../../context/AuthContext'
import { ROUTES } from '../../../navigation/routes'
import { useScroll } from '../../../context/ScrollContext'
import { AppInput } from '../inputs/AppInput'
import AppAvatar from '../display/AppAvatar'
import { AppPathIcon } from '../display/AppIcon'
import { AppIconTile } from '../display/AppIconTile'
import { AppIconButton } from '../buttons/AppIconButton'
import { AppHeaderBackdrop } from './AppScreenHeader'
import { APP_COLORS } from '../../../config/theme'
import { getUnreadNotificationCount } from '../../../services/homeService'

interface AppHeaderProps {
	variant?: 'home' | 'search' // home → pressable; search → editable input
	userName?: string
	location?: string
	avatarUri?: string
	onAvatarPress: () => void

	// For search variant
	searchValue?: string
	onSearchChange?: (text: string) => void
	onSearchSubmit?: () => void
	isSearchEditable?: boolean
	onSearchPress?: () => void
}

/**
 * 'home' variant: patients get the redesigned Home header (PatientHomeHeader below) and ancillary providers
 * the provider Today header (ProviderHomeHeader); other staff roles and the 'search' variant keep the
 * original header (RoleHomeHeader) unchanged.
 */
export default function AppHeader(props: AppHeaderProps) {
	const { role } = useAuth()
	const isHome = (props.variant ?? 'home') === 'home'
	if (isHome && isPatientRole(role)) {
		return <PatientHomeHeader {...props} />
	}
	if (isHome && (role === USER_ROLES.ANCILLARY || role === USER_ROLES.NURSE)) {
		return <ProviderHomeHeader {...props} />
	}
	return <RoleHomeHeader {...props} />
}

// ─────────────────────────────────────────────────────────────────────────────
// Patient Home header ("1 · Home" design): ink bar with a 24px bottom radius and two decorative
// circles, avatar/menu button (opens the drawer), time-of-day greeting, bell (unread dot) + saved
// buttons, a location row that collapses once the page scrolls (compact after 24px, expands again
// below 4px) and a tap-through search field.
// ─────────────────────────────────────────────────────────────────────────────

const DAY_PARTS = (hour: number) => (hour < 12 ? 'Good morning,' : hour < 17 ? 'Good afternoon,' : 'Good evening,')

const HEADER_ICONS = {
	menu: 'M5 7h14M5 12h14M5 17h9',
	bell: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0',
	heart: 'M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z',
	search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4',
	mic: 'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3',
}

/** 12% white tile behind the header icon buttons (design #FFFFFF1F). */
const HEADER_BUTTON_BG = `${APP_COLORS.surface}1F`

function PatientHomeHeader({ userName = 'there', location, avatarUri, onAvatarPress, onSearchPress }: AppHeaderProps) {
	const insets = useSafeAreaInsets()
	const navigation = useNavigation<any>()
	const { user } = useAuth()
	const scrollData = useScroll()
	const scrollY = scrollData?.scrollY ?? null

	// The scroll context re-creates setHeaderHeight on every render; keep the latest in a ref.
	const setHeaderHeightRef = useRef(scrollData?.setHeaderHeight)
	setHeaderHeightRef.current = scrollData?.setHeaderHeight

	const [compact, setCompact] = useState(false)
	const compactRef = useRef(false)
	const animatingRef = useRef(false)
	const heightRef = useRef(0)
	const progress = useRef(new Animated.Value(0)).current

	const [unread, setUnread] = useState(0)
	const [greeting, setGreeting] = useState(() => DAY_PARTS(new Date().getHours()))

	const displayName = user?.name || (user as any)?.full_name || userName

	// Collapse / expand on scroll, with hysteresis so it doesn't flicker around the threshold.
	useEffect(() => {
		if (!scrollY) return
		const id = scrollY.addListener(({ value }) => {
			const next = compactRef.current ? value > 4 : value > 24
			if (next !== compactRef.current) {
				compactRef.current = next
				setCompact(next)
			}
		})
		return () => scrollY.removeListener(id)
	}, [scrollY])

	useEffect(() => {
		animatingRef.current = true
		Animated.timing(progress, { toValue: compact ? 1 : 0, duration: 220, useNativeDriver: false }).start(() => {
			animatingRef.current = false
			// Only the expanded height is reported, so the page's top padding never jumps while collapsed.
			if (!compactRef.current && heightRef.current > 0) setHeaderHeightRef.current?.(heightRef.current)
		})
	}, [compact, progress])

	// Unread count + greeting refresh whenever Home regains focus (e.g. back from Notifications).
	useFocusEffect(
		useCallback(() => {
			let active = true
			setGreeting(DAY_PARTS(new Date().getHours()))
			const load = async () => {
				try {
					const count = await getUnreadNotificationCount()
					if (active) setUnread(count)
				} catch {
					// Soft-fail: keep the last known count (no dot on first load).
				}
			}
			void load()
			return () => {
				active = false
			}
		}, [])
	)

	const handleLayout = (e: LayoutChangeEvent) => {
		const height = e.nativeEvent.layout.height
		heightRef.current = height
		if (height > 0 && !compactRef.current && !animatingRef.current) setHeaderHeightRef.current?.(height)
	}

	const handleSearch = () => {
		if (onSearchPress) {
			onSearchPress()
			return
		}
		navigation.navigate(ROUTES.MAIN.TABS, { screen: ROUTES.MAIN.SEARCH })
	}

	const paddingBottom = progress.interpolate({ inputRange: [0, 1], outputRange: [16, 12] })
	const introHeight = progress.interpolate({ inputRange: [0, 1], outputRange: [28, 0] })
	const introGap = progress.interpolate({ inputRange: [0, 1], outputRange: [6, 8] })
	const introOpacity = progress.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 0, 0] })
	const shadowOpacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 0.16] })
	const elevation = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 4] })

	return (
		<Animated.View onLayout={handleLayout} style={[patientStyles.shell, { shadowOpacity, elevation }]}>
			<Animated.View style={[patientStyles.bar, { paddingTop: insets.top + 8, paddingBottom }]}>
				<AppHeaderBackdrop />

				{/* Avatar / greeting / actions */}
				<View style={patientStyles.topRow}>
					<Pressable
						onPress={onAvatarPress}
						style={patientStyles.avatarButton}
						accessibilityRole="button"
						accessibilityLabel="Open menu and profile"
					>
						<AppAvatar
							uri={avatarUri}
							name={displayName}
							size={44}
							radius={10}
							backgroundColor={APP_COLORS.mint}
							initialsColor={APP_COLORS.primary}
						/>
						<View style={patientStyles.menuBadge} importantForAccessibility="no-hide-descendants">
							<AppPathIcon d={HEADER_ICONS.menu} size={14} strokeWidth={2.6} color={APP_COLORS.ink} />
						</View>
					</Pressable>

					<View style={patientStyles.nameCol}>
						<Text style={patientStyles.greeting}>{greeting}</Text>
						<Text style={patientStyles.name} numberOfLines={1}>
							{displayName}
						</Text>
					</View>

					<AppIconButton
						size={44}
						radius={12}
						variant="ghost"
						backgroundColor={HEADER_BUTTON_BG}
						badge={unread > 0}
						accessibilityLabel={unread > 0 ? `Notifications, ${unread} new` : 'Notifications'}
						onPress={() => navigation.navigate(ROUTES.STACK.NOTIFICATION)}
					>
						<AppPathIcon d={HEADER_ICONS.bell} size={22} strokeWidth={2} color={APP_COLORS.surface} />
					</AppIconButton>
					<AppIconButton
						size={44}
						radius={12}
						variant="ghost"
						backgroundColor={HEADER_BUTTON_BG}
						accessibilityLabel="Saved doctors"
						onPress={() => navigation.navigate(ROUTES.STACK.FAVOURITE_DOCTOR)}
					>
						<AppPathIcon d={HEADER_ICONS.heart} size={22} strokeWidth={2} color={APP_COLORS.surface} />
					</AppIconButton>
				</View>

				{/* Location (collapses on scroll) */}
				<Animated.View
					pointerEvents={compact ? 'none' : 'auto'}
					importantForAccessibility={compact ? 'no-hide-descendants' : 'auto'}
					style={[
						patientStyles.intro,
						{ height: introHeight, opacity: introOpacity, marginTop: introGap, marginBottom: introGap },
					]}
				>
					<LocationSelector
						location={location}
						color={APP_COLORS.mint}
						textStyle={patientStyles.locationText}
					/>
				</Animated.View>

				{/* Search (tap-through to the Search tab) */}
				<View style={patientStyles.search}>
					<Pressable
						onPress={handleSearch}
						style={patientStyles.searchTapArea}
						accessibilityRole="button"
						accessibilityLabel="Search specialities or symptoms"
					>
						<AppPathIcon d={HEADER_ICONS.search} size={20} strokeWidth={2.2} color={APP_COLORS.inkMuted} />
						<Text style={patientStyles.searchPlaceholder} numberOfLines={1}>
							Search specialities or symptoms
						</Text>
					</Pressable>
					<Pressable onPress={handleSearch} accessibilityRole="button" accessibilityLabel="Search by voice">
						<AppIconTile size={40} radius={10} tone="mint">
							<AppPathIcon d={HEADER_ICONS.mic} size={20} strokeWidth={2} color={APP_COLORS.primary} />
						</AppIconTile>
					</Pressable>
				</View>
			</Animated.View>
		</Animated.View>
	)
}

const patientStyles = StyleSheet.create({
	shell: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		zIndex: 10,
		borderBottomLeftRadius: 24,
		borderBottomRightRadius: 24,
		backgroundColor: APP_COLORS.ink,
		shadowColor: APP_COLORS.shadow,
		shadowOffset: { width: 0, height: 4 },
		shadowRadius: 12,
	},
	bar: {
		paddingHorizontal: 16,
		borderBottomLeftRadius: 24,
		borderBottomRightRadius: 24,
		backgroundColor: APP_COLORS.ink,
		overflow: 'hidden',
	},
	topRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		minHeight: 52,
	},
	avatarButton: {
		width: 48,
		height: 48,
		borderRadius: 12,
		borderWidth: 2,
		borderColor: APP_COLORS.mintAccent,
		backgroundColor: APP_COLORS.mint,
		alignItems: 'center',
		justifyContent: 'center',
	},
	menuBadge: {
		position: 'absolute',
		right: -6,
		bottom: -6,
		width: 22,
		height: 22,
		borderRadius: 8,
		backgroundColor: APP_COLORS.surface,
		alignItems: 'center',
		justifyContent: 'center',
		shadowColor: APP_COLORS.shadow,
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.16,
		shadowRadius: 3,
		elevation: 2,
	},
	nameCol: {
		flex: 1,
		minWidth: 0,
	},
	greeting: {
		fontSize: 13,
		lineHeight: 18,
		fontWeight: '600',
		color: APP_COLORS.mintAccent,
	},
	name: {
		fontSize: 20,
		lineHeight: 26,
		fontWeight: '800',
		color: APP_COLORS.surface,
	},
	intro: {
		overflow: 'hidden',
		justifyContent: 'center',
	},
	locationText: {
		fontSize: 13,
		lineHeight: 18,
		fontWeight: '600',
	},
	search: {
		height: 48,
		borderRadius: 12,
		backgroundColor: APP_COLORS.surface,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		paddingLeft: 14,
		paddingRight: 4,
	},
	searchTapArea: {
		flex: 1,
		minWidth: 0,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	searchPlaceholder: {
		flex: 1,
		minWidth: 0,
		fontSize: 16,
		color: APP_COLORS.inkMuted,
	},
})

// ─────────────────────────────────────────────────────────────────────────────
// Provider Today header (ancillary-provider design): ink bar with a 24px bottom radius and one decorative
// circle, round initials avatar (opens the drawer), time-of-day greeting, name, "<role> · Home visits",
// bell with unread dot. Doesn't collapse.
// ─────────────────────────────────────────────────────────────────────────────

function ProviderHomeHeader({ userName = 'there', avatarUri, onAvatarPress }: AppHeaderProps) {
	const insets = useSafeAreaInsets()
	const navigation = useNavigation<any>()
	const { user } = useAuth()
	const { roleLabel } = useAncillarySpecialty()
	const scrollData = useScroll()
	const setHeaderHeightRef = useRef(scrollData?.setHeaderHeight)
	setHeaderHeightRef.current = scrollData?.setHeaderHeight

	const [unread, setUnread] = useState(0)
	const [greeting, setGreeting] = useState(() => DAY_PARTS(new Date().getHours()))
	const displayName = user?.name || (user as any)?.full_name || userName

	useFocusEffect(
		useCallback(() => {
			let active = true
			setGreeting(DAY_PARTS(new Date().getHours()))
			const load = async () => {
				try {
					const count = await getUnreadNotificationCount()
					if (active) setUnread(count)
				} catch {
					// Soft-fail: keep the last known count.
				}
			}
			void load()
			return () => {
				active = false
			}
		}, [])
	)

	const handleLayout = (e: LayoutChangeEvent) => {
		const height = e.nativeEvent.layout.height
		if (height > 0) setHeaderHeightRef.current?.(height)
	}

	return (
		<View onLayout={handleLayout} style={providerStyles.shell}>
			<View style={[patientStyles.bar, { paddingTop: insets.top + 8, paddingBottom: 16 }]}>
				<AppHeaderBackdrop />
				<View style={patientStyles.topRow}>
					<Pressable
						onPress={onAvatarPress}
						style={providerStyles.avatarButton}
						accessibilityRole="button"
						accessibilityLabel="Open menu and profile"
					>
						<AppAvatar
							uri={avatarUri}
							name={displayName}
							size={44}
							radius={22}
							backgroundColor={APP_COLORS.mint}
							initialsColor={APP_COLORS.primary}
							initialsStyle={providerStyles.initials}
						/>
					</Pressable>
					<View style={patientStyles.nameCol}>
						<Text style={patientStyles.greeting}>{greeting}</Text>
						<Text style={patientStyles.name} numberOfLines={1}>
							{displayName.trim().split(/\s+/)[0] || displayName}
						</Text>
						<Text style={providerStyles.roleLine} numberOfLines={1}>
							{`${roleLabel} · Home visits`}
						</Text>
					</View>
					<AppIconButton
						size={44}
						radius={12}
						variant="ghost"
						backgroundColor={HEADER_BUTTON_BG}
						badge={unread > 0}
						accessibilityLabel={unread > 0 ? `Notifications, ${unread} new` : 'Notifications'}
						onPress={() => navigation.navigate(ROUTES.STACK.NOTIFICATION)}
					>
						<AppPathIcon d={HEADER_ICONS.bell} size={22} strokeWidth={2} color={APP_COLORS.surface} />
					</AppIconButton>
				</View>
			</View>
		</View>
	)
}

const providerStyles = StyleSheet.create({
	shell: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		zIndex: 10,
		borderBottomLeftRadius: 24,
		borderBottomRightRadius: 24,
		backgroundColor: APP_COLORS.ink,
	},
	avatarButton: {
		width: 48,
		height: 48,
		borderRadius: 24,
		borderWidth: 2,
		borderColor: APP_COLORS.mintAccent,
		backgroundColor: APP_COLORS.mint,
		alignItems: 'center',
		justifyContent: 'center',
	},
	initials: {
		fontSize: 16,
		lineHeight: 22,
		fontWeight: '800',
	},
	roleLine: {
		fontSize: 12,
		lineHeight: 16,
		color: APP_COLORS.mint,
	},
})

// ─────────────────────────────────────────────────────────────────────────────
// Original header — staff roles ('home') and the 'search' variant. Unchanged.
// ─────────────────────────────────────────────────────────────────────────────

function RoleHomeHeader({
	variant = 'home',
	userName = 'Nitin',
	location = 'KR Market',
	avatarUri,
	onAvatarPress,
	searchValue,
	onSearchChange,
	onSearchSubmit,
	isSearchEditable = true,
	onSearchPress,
}: AppHeaderProps) {
	const insets = useSafeAreaInsets()
	const navigation = useNavigation<any>()
	const { user, role, ancillarySpecialty } = useAuth()
	const scrollData = useScroll()
	const scrollY = scrollData?.scrollY

	const [avatarError, setAvatarError] = useState(false)

	useEffect(() => {
		setAvatarError(false)
	}, [avatarUri])

	const isDoctor = role === 'doctor'
	const isPharmacy = role === 'pharmacy'

	const isRadiology = role === USER_ROLES.RADIOLOGY
	const isPatient = !isDoctor && !isPharmacy && !isRadiology

	const isPhysiotherapy =
		(role === USER_ROLES.ANCILLARY || role === USER_ROLES.NURSE) &&
		(ancillarySpecialty === 'physiotherapy' || !ancillarySpecialty)

	const defaultAvatar = isPhysiotherapy
		? require('../../../assets/physiotherapy/physiotherapist.png')
		: isDoctor
			? require('../../../assets/Banner/doctor.png')
			: require('../../../assets/Banner/patient.png')

	// Option B GPU animation values
	const maxScroll = 60
	const headerTranslateY =
		scrollY && !isDoctor
			? scrollY.interpolate({
					inputRange: [0, maxScroll],
					outputRange: [0, -maxScroll],
					extrapolate: 'clamp',
				})
			: 0

	const topRowOpacity =
		scrollY && !isDoctor
			? scrollY.interpolate({
					inputRange: [0, maxScroll - 10],
					outputRange: [1, 0],
					extrapolate: 'clamp',
				})
			: 1

	// ── Display name (pharmacy fallback) ─────────────────────────────────────
	let displayName = 'User'
	if (user) {
		if (isPharmacy) {
			displayName =
				(user as any).pharmacy_name ||
				(user as any).business_name ||
				(user as any).store_name ||
				(user as any).pharmacyName ||
				(user as any).businessName ||
				(user as any).full_name ||
				user.name
			if (!displayName && user.email) {
				displayName = user.email.split('@')[0]
			}
			if (!displayName) displayName = 'Pharmacy'
		} else {
			displayName = user.name || (user as any).full_name || userName
		}
	} else {
		displayName = userName
	}

	const isNurse = role === USER_ROLES.ANCILLARY || role === USER_ROLES.NURSE

	const searchPlaceholder = isPharmacy
		? 'Search orders by ID or patient'
		: isRadiology
			? 'Search scans by ID or patient'
			: isNurse
				? 'Search patients, bookings or care requests'
				: 'Search doctors by name or speciality'

	// ── Handlers ─────────────────────────────────────────────────────────────
	const handleSearchPress = () => {
		console.log('onSearchPress =', onSearchPress)
		console.log('isRadiology =', isRadiology)

		if (onSearchPress) {
			console.log('Using parent onSearchPress')
			onSearchPress()
			return
		}

		if (isPharmacy) {
			console.log('ORDER_LIST')
			navigation.navigate(ROUTES.STACK.ORDER_LIST)
		} else if (isRadiology) {
			console.log('RADIOLOGY_ORDERS')
			navigation.navigate(ROUTES.STACK.RADIOLOGY_ORDERS)
		} else {
			console.log('SEARCH')
			navigation.navigate(ROUTES.STACK.DOCTOR_SEARCH)
		}
	}

	const renderSearchBar = () => {
		if (variant === 'search') {
			// Editable TextInput for SearchPage
			return (
				<AppInput
					isSearch
					showMicrophone
					placeholder={searchPlaceholder}
					placeholderTextColor="#8b8e94"
					value={searchValue}
					onChangeText={onSearchChange}
					onSubmitEditing={onSearchSubmit}
					editable={isSearchEditable}
					returnKeyType="search"
					autoFocus={isSearchEditable}
					noMargin
					borderRadius={12}
					containerStyle={{ marginTop: 20 }}
					style={{ backgroundColor: '#ffffff', height: 48 }}
					contentStyle={{ height: 48 }}
					outlineStyle={{ borderWidth: 0 }}
				/>
			)
		} else {
			// Pressable for dashboard (navigates to appropriate search page)
			return (
				<Pressable onPress={handleSearchPress} style={{ marginTop: 20 }}>
					<View pointerEvents="none">
						<AppInput
							isSearch
							showMicrophone
							placeholder={searchPlaceholder}
							placeholderTextColor="#8b8e94"
							editable={false}
							noMargin
							borderRadius={12}
							style={{ backgroundColor: '#ffffff', height: 48 }}
							contentStyle={{ height: 48 }}
							outlineStyle={{ borderWidth: 0 }}
						/>
					</View>
				</Pressable>
			)
		}
	}

	const handleLayout = (e: any) => {
		const height = e.nativeEvent.layout.height
		if (scrollData?.setHeaderHeight && height > 0) {
			scrollData.setHeaderHeight(height)
		}
	}

	return (
		<Animated.View
			onLayout={handleLayout}
			style={[
				styles.wrapper,
				{
					paddingTop: insets.top + 16,
					paddingBottom: 16,
				},
				scrollY
					? {
							position: 'absolute' as const,
							top: 0,
							left: 0,
							right: 0,
							zIndex: 10,
							transform: [{ translateY: headerTranslateY }],
						}
					: null,
			]}
		>
			<AppHeaderBackdrop />

			{/* Top Row */}
			<Animated.View
				style={[
					styles.topRow,
					{
						opacity: topRowOpacity,
					},
				]}
			>
				<Pressable onPress={onAvatarPress} style={styles.profileRow}>
					<Image
						source={avatarUri && !avatarError ? { uri: avatarUri } : defaultAvatar}
						onError={() => setAvatarError(true)}
						style={styles.avatar}
					/>
					<View>
						<Text style={styles.helloText}>
							<Text style={styles.helloAccent}>Hello, </Text>
							{displayName}
						</Text>

						{isDoctor ? <DoctorHospitalDropdown /> : <LocationSelector location={location} />}
					</View>
				</Pressable>

				{/* Action Buttons (all roles) */}
				<View style={styles.actionsRow}>
					<Pressable style={styles.actionButton} onPress={() => navigation.navigate('Notification')}>
						<MaterialCommunityIcons name="bell-outline" size={22} color="#1b5f66" />
						<View style={styles.notificationDot} />
					</Pressable>
					{isPatient && (
						<Pressable
							style={styles.actionButton}
							onPress={() => navigation.navigate(ROUTES.STACK.FAVOURITE_DOCTOR)}
						>
							<MaterialCommunityIcons name="heart-outline" size={22} color="#1b5f66" />
						</Pressable>
					)}
				</View>
			</Animated.View>

			{/* Search Bar – hidden for doctor */}
			{!isDoctor && <View style={{ marginTop: 16 }}>{renderSearchBar()}</View>}
		</Animated.View>
	)
}

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: APP_COLORS.ink,
		paddingHorizontal: 16,
		paddingBottom: 16,
		borderBottomLeftRadius: 24,
		borderBottomRightRadius: 24,
		overflow: 'hidden',
	},
	topRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	profileRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		flex: 1,
	},
	avatar: {
		width: 52,
		height: 52,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: 'rgba(255,255,255,0.5)',
		backgroundColor: '#fff',
	},
	helloText: {
		color: '#ffffff',
		fontSize: 18,
		fontWeight: '500',
	},
	helloAccent: {
		color: '#5dd0d7',
		fontWeight: '400',
	},
	actionsRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	actionButton: {
		width: 44,
		height: 44,
		borderRadius: 10,
		backgroundColor: '#f1f1f1',
		alignItems: 'center',
		justifyContent: 'center',
		position: 'relative',
	},
	notificationDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: '#2fa748',
		position: 'absolute',
		top: 10,
		right: 10,
	},
	searchContainer: {
		marginTop: 16,
		backgroundColor: '#f3f3f3',
		borderRadius: 10,
		height: 46,
		paddingHorizontal: 14,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	searchPlaceholder: {
		flex: 1,
		fontSize: 16,
		color: '#8b8e94',
	},
	searchInput: {
		flex: 1,
		fontSize: 16,
		color: '#333',
		paddingVertical: 8,
	},
})
