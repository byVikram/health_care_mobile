import React from 'react'
import { Image, Pressable, StyleSheet, Text, TextInput, View, Alert, Animated } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { USER_ROLES } from '../../constants/constants'
import DoctorHospitalDropdown from './DoctorHospitalDropdown'
import LocationSelector from './LocationSelector'
import { useAuth } from '../../context/AuthContext'
import { ROUTES } from '../../navigation/routes'
import { useScroll } from '../../context/ScrollContext'
import { AppInput } from './AppInput'

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

export default function AppHeader({
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
	const { user, role } = useAuth()
	const scrollData = useScroll()
	const scrollY = scrollData?.scrollY

	const isDoctor = role === 'doctor'
	const isPharmacy = role === 'pharmacy'

	const isRadiology = role === USER_ROLES.RADIOLOGY
	const isLaboratory = role === USER_ROLES.LABORATORY
	const isPatient = !isDoctor && !isPharmacy && !isRadiology && !isLaboratory

	// Option B GPU animation values
	const maxScroll = 60
	const headerTranslateY = scrollY && !isDoctor
		? scrollY.interpolate({
				inputRange: [0, maxScroll],
				outputRange: [0, -maxScroll],
				extrapolate: 'clamp',
			})
		: 0

	const topRowOpacity = scrollY && !isDoctor
		? scrollY.interpolate({
				inputRange: [0, maxScroll - 10],
				outputRange: [1, 0],
				extrapolate: 'clamp',
			})
		: 1

	const waveOpacity = scrollY && !isDoctor
		? scrollY.interpolate({
				inputRange: [0, maxScroll],
				outputRange: [1, 0.4],
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
		? 'Search Order ID'
		: isRadiology
			? 'Search Radiology ID'
			: isNurse
				? 'Search patient, booking or care request...'
				: 'Search Doctors/Symptoms'

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
		} 
		else if (isLaboratory){
			console.log('LABORATORY_ORDERS')
			navigation.navigate(ROUTES.STACK.LABORATORY_ORDERS)
		}
		
		else {
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
			{/* Background Waves */}
			<Animated.View style={[styles.waveOne, { opacity: waveOpacity }]} />
			<Animated.View style={[styles.waveTwo, { opacity: waveOpacity }]} />

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
						source={avatarUri ? { uri: avatarUri } : require('../../assets/Banner/patient.png')}
						style={styles.avatar}
					/>
					<View>
						<Text style={styles.helloText}>
							<Text style={styles.helloAccent}>Hello, </Text>
							{displayName}
						</Text>

						{isDoctor ? (
							<DoctorHospitalDropdown />
						) : (
							<LocationSelector location={location} />
						)}
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
		backgroundColor: '#1f5f68',
		paddingHorizontal: 16,
		paddingBottom: 16,
		borderBottomLeftRadius: 24,
		borderBottomRightRadius: 24,
		overflow: 'hidden',
	},
	waveOne: {
		position: 'absolute',
		width: 420,
		height: 240,
		borderRadius: 120,
		backgroundColor: 'rgba(255,255,255,0.06)',
		left: -140,
		top: -70,
		transform: [{ rotate: '-4deg' }],
	},
	waveTwo: {
		position: 'absolute',
		width: 430,
		height: 240,
		borderRadius: 120,
		backgroundColor: 'rgba(255,255,255,0.05)',
		left: -95,
		top: -22,
		transform: [{ rotate: '-4deg' }],
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
