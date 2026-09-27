// SidebarLayout.tsx
//
// Home-tab chrome: the header plus the left drawer (AppSidebar). Patients get the redesigned drawer
// (profile card with display id / QR / completion, FAMILY strip, grouped sections, wallet balance) from
// <PatientSidebar />; every other role keeps its flat menu. useSidebarDrawer().open() opens the drawer
// from anywhere under this layout (e.g. a header menu button).
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Alert, StyleSheet, View } from 'react-native'
import { useNavigation, type NavigationProp } from '@react-navigation/native'

import { AppPathIcon, AppSidebar, AppTag } from '../common'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import AppHeader from '../common/layout/AppHeader'
import type { AppSidebarItem, AppSidebarSection } from '../common'
import { useAuth } from '../../context/AuthContext'
import { isPatientRole } from '../../constants/constants'
import { ScrollProvider } from '../../context/ScrollContext'
import { APP_COLORS } from '../../config/theme'
import { SELF_MEMBER_KEY, useFamilyMembers } from '../../hooks/useFamilyMembers'
import { useHomeSheets } from '../../features/dashboard/HomeSheetsContext'
import { HOME_CHROME_PATHS, type HomeChromeIcon } from '../../features/dashboard/homeChromeIcons'
import {
	formatBalance,
	openContactUrl,
	telUrl,
	useAppConfig,
	usePatientSummary,
	useWalletBalance,
} from '../../features/dashboard/useHomeChromeData'

import AppointmentsIcon from '../../assets/quick-services/appointments.svg'
import TreatmentIcon from '../../assets/icons/treatment.svg'
import RemindersIcon from '../../assets/icons/reminders.svg'
import PaymentsIcon from '../../assets/icons/payments.svg'
import HelpCenterIcon from '../../assets/icons/help-center.svg'
import SettingsIcon from '../../assets/icons/settings.svg'

import { ROUTES } from '../../navigation/routes'
import type { BookingsFilterKey } from '../../navigation/types'
import { getPatientDetails } from '../../features/profile/patient/PatientProfileService'
import { getDoctorProfile, mapDoctorProfileApi } from '../../features/doctor/doctorService'
import { fetchProviderProfile } from '../../features/ancillary/ancillaryService'
import { NEW_PHYSIOTHERAPIST_IMAGE_URL } from '../../features/profile/ancillary/specialtyConfig'
import type { AppStackParamList } from '../../navigation/types'

const MOCK_USER = {
	name: 'Nitin',
	avatar: undefined as string | undefined,
	profileCompletion: 72,
}

// Wait for the drawer's slide-out before presenting a sheet (iOS presents one modal at a time).
const DRAWER_HANDOFF_MS = 260

interface SidebarDrawerContextValue {
	open: () => void
	close: () => void
}

const SidebarDrawerContext = createContext<SidebarDrawerContextValue>({ open: () => {}, close: () => {} })

/** Open / close the Home drawer from any screen rendered inside <SidebarLayout>. */
export const useSidebarDrawer = () => useContext(SidebarDrawerContext)

const drawerIcon = (name: HomeChromeIcon) => (
	<AppPathIcon d={HOME_CHROME_PATHS[name]} size={18} color={APP_COLORS.primary} strokeWidth={2} />
)

interface PatientSidebarProps {
	visible: boolean
	onClose: () => void
	onLogout: () => void
	onViewProfile: () => void
}

/** Patient drawer content (design 1a). Every call soft-fails: the dependent line / row hides. */
function PatientSidebar({ visible, onClose, onLogout, onViewProfile }: PatientSidebarProps) {
	const navigation = useNavigation<NavigationProp<AppStackParamList>>()
	const { user } = useAuth()
	const { open: openSheet } = useHomeSheets()
	const { summary } = usePatientSummary(visible)
	const walletBalance = useWalletBalance(visible)
	const config = useAppConfig(visible)
	const { members, reload: reloadFamily } = useFamilyMembers()
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	useEffect(() => {
		if (visible) void reloadFamily()
	}, [visible, reloadFamily])

	useEffect(
		() => () => {
			if (timerRef.current) clearTimeout(timerRef.current)
		},
		[]
	)

	const familyItems = useMemo(
		() =>
			members
				.filter((m) => m.key !== SELF_MEMBER_KEY)
				.map((m) => ({ uri: m.avatar, name: m.name, label: `${m.name}, ${m.relation}` })),
		[members]
	)

	// No family-management screen exists yet: add / manage land on the patient profile.
	const openProfile = useCallback(() => {
		navigation.navigate(ROUTES.MAIN.TABS, { screen: ROUTES.MAIN.PROFILE })
	}, [navigation])

	const handleOpenQr = () => {
		onClose()
		if (timerRef.current) clearTimeout(timerRef.current)
		timerRef.current = setTimeout(() => openSheet('qr'), DRAWER_HANDOFF_MS)
	}

	const sections = useMemo<AppSidebarSection[]>(() => {
		const openBookings = (filter: BookingsFilterKey) =>
			navigation.navigate(ROUTES.MAIN.TABS, { screen: ROUTES.MAIN.PORTAL, params: { filter } })

		const supportPhone = config?.support_phone || ''
		const supportEmail = config?.support_email || ''
		const openHelp = () => {
			const call = () => void openContactUrl(telUrl(supportPhone))
			const mail = () => void openContactUrl(`mailto:${supportEmail}`)
			if (supportPhone && supportEmail) {
				Alert.alert('Help centre', 'How would you like to reach Karolahealth support?', [
					{ text: `Call ${supportPhone}`, onPress: call },
					{ text: 'Email us', onPress: mail },
					{ text: 'Cancel', style: 'cancel' },
				])
				return
			}
			if (supportPhone) call()
			else mail()
		}

		return [
			{
				id: 'bookings',
				title: 'BOOKINGS & ORDERS',
				items: [
					{
						id: 'appointments',
						label: 'Appointments',
						icon: drawerIcon('appointments'),
						onPress: () => openBookings('doctor'),
					},
					{
						id: 'medicine-orders',
						label: 'Medicine orders',
						icon: drawerIcon('medicine'),
						onPress: () => openBookings('medicine'),
					},
					{
						id: 'lab-bookings',
						label: 'Lab bookings',
						icon: drawerIcon('lab'),
						onPress: () => openBookings('lab'),
					},
					{
						id: 'radiology-bookings',
						label: 'Radiology bookings',
						icon: drawerIcon('radiology'),
						onPress: () => openBookings('radiology'),
					},
					{
						id: 'home-care-orders',
						label: 'Home care orders',
						icon: drawerIcon('homeCare'),
						onPress: () => openBookings('ancillary'),
					},
				],
			},
			{
				id: 'health',
				title: 'HEALTH',
				// No standalone treatment-history screen or completed-status filter exists: the appointment
				// history (each visit opens its summary) is the closest real target. "Reminders" has no
				// target yet, so it's hidden.
				items: [
					{
						id: 'treatment-history',
						label: 'Treatment history',
						icon: drawerIcon('treatment'),
						onPress: () => openBookings('doctor'),
					},
				],
			},
			{
				id: 'payments',
				title: 'PAYMENTS',
				items: [
					{
						id: 'my-wallet',
						label: 'My wallet',
						icon: drawerIcon('myWallet'),
						value:
							walletBalance != null ? <AppTag label={formatBalance(walletBalance)} tone="paid" /> : undefined,
						accessibilityLabel:
							walletBalance != null ? `My wallet, balance ${formatBalance(walletBalance)}` : 'My wallet',
						onPress: () => navigation.navigate(ROUTES.STACK.WALLET),
					},
					{
						id: 'payments',
						label: 'Payments',
						icon: drawerIcon('payments'),
						onPress: () => navigation.navigate(ROUTES.STACK.WALLET_TRANSACTIONS),
					},
				],
			},
			{
				id: 'support',
				title: 'SUPPORT',
				items: [
					...(supportPhone || supportEmail
						? [{ id: 'help', label: 'Help centre', icon: drawerIcon('help'), onPress: openHelp }]
						: []),
					{
						id: 'settings',
						label: 'Settings',
						icon: drawerIcon('settings'),
						onPress: () => navigation.navigate(ROUTES.STACK.SETTINGS),
					},
				],
			},
		]
	}, [navigation, walletBalance, config?.support_phone, config?.support_email])

	return (
		<AppSidebar
			visible={visible}
			onClose={onClose}
			onLogout={onLogout}
			onEditProfile={onViewProfile}
			profileName={summary?.name || user?.name}
			avatarUri={summary?.avatar_url || user?.avatar || null}
			profileSubtitle={summary?.display_id ? `ID · ${summary.display_id}` : undefined}
			profileCompletion={summary ? summary.profile_completion : null}
			onCompleteProfile={openProfile}
			onOpenQr={handleOpenQr}
			qrValue={summary?.public_id}
			family={{ members: familyItems, onAdd: openProfile, onManage: openProfile }}
			sections={sections}
		/>
	)
}

interface SidebarLayoutProps {
	children: React.ReactNode
}

export default function SidebarLayout({ children }: SidebarLayoutProps) {
	const [isSidebarOpen, setIsSidebarOpen] = useState(false)

	const navigation = useNavigation<NavigationProp<AppStackParamList>>()

	const { clearAuth, user: authUser, role, updateUser, ancillarySpecialty } = useAuth()

	const user = {
		name: authUser?.name ?? MOCK_USER.name,
		avatar: authUser?.avatar ?? MOCK_USER.avatar,
		profileCompletion: authUser?.profileCompletion ?? MOCK_USER.profileCompletion,
	}

	// Sync the real profile photo from the API so the dashboard header
	// and sidebar show the latest uploaded image.
	useEffect(() => {
		if (role !== 'patient' && role !== 'doctor' && role !== 'ancillary' && role !== 'nurse') return

		let cancelled = false
		const syncAvatar = async () => {
			try {
				if (role === 'doctor') {
					const res = await getDoctorProfile()
					if (!cancelled && res.success && res.data) {
						const profile = mapDoctorProfileApi(res.data)
						if (profile.personal.avatar) {
							updateUser({ avatar: profile.personal.avatar })
						}
					}
					return
				}

				if (role === 'ancillary' || role === 'nurse') {
					const profile = await fetchProviderProfile()
					if (!cancelled) {
						const resolvedAvatar =
							profile?.avatar_s3_key ||
							(ancillarySpecialty === 'physiotherapy' ? NEW_PHYSIOTHERAPIST_IMAGE_URL : '')
						if (resolvedAvatar && resolvedAvatar !== authUser?.avatar) {
							updateUser({ avatar: resolvedAvatar })
						}
					}
					return
				}

				const res = await getPatientDetails()
				if (!cancelled && res.success && res.data?.personal?.avatar) {
					updateUser({ avatar: res.data.personal.avatar })
				}
			} catch {
				// Silently ignore; the existing avatar (or default) will show.
			}
		}

		syncAvatar()
		return () => { cancelled = true }
		// authUser/updateUser deliberately excluded: this effect calls
		// updateUser(), which would otherwise change authUser and re-trigger
		// itself on every sync. It only needs to run once per role/specialty.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [role, ancillarySpecialty])

	const handleEditProfile = () => {
		setIsSidebarOpen(false)

		navigation.navigate(ROUTES.MAIN.TABS, {
			screen: ROUTES.MAIN.PROFILE,
		})
	}

	const handleSearchPress = () => {
		if (role === 'pharmacy') {
			navigation.navigate(ROUTES.STACK.ORDER_LIST as any)
		} else if (role === 'radiology') {
			navigation.navigate(ROUTES.STACK.RADIOLOGY_ORDERS as any)
		} else {
			navigation.navigate(ROUTES.MAIN.TABS, {
				screen: ROUTES.MAIN.SEARCH as any,
			})
		}
	}

	const menuItems = useMemo<AppSidebarItem[]>(
		() => {
			const openAppointments = () => {
				setIsSidebarOpen(false)
				navigation.navigate(ROUTES.STACK.APPOINTMENTS)
			}

			// Patients: land on the consolidated Bookings page (the Doctor
			// Appointments page) with the corresponding filter pre-selected,
			// instead of navigating to the standalone category screen directly.
			const openBookingsFilter = (filter: 'doctor' | 'ancillary' | 'lab' | 'medicine' | 'radiology') => {
				setIsSidebarOpen(false)
				navigation.navigate(ROUTES.MAIN.TABS, {
					screen: ROUTES.MAIN.PORTAL,
					params: { filter },
				} as any)
			}
		// Nurse/Ancillary drawer prioritizes the actions a nurse needs day-to-day
	// (bookings, earnings) over general account items --
		// Profile lives in the header above and Log out below, so neither repeats here.
		if ((role as any) === 'nurse' || (role as any) === 'ancillary') {
			return [
				{
				id: 'bookings',
				label: 'Bookings',
					icon: <AppointmentsIcon width={24} height={24} />,
					onPress: () => {
						setIsSidebarOpen(false)
						navigation.navigate(ROUTES.MAIN.TABS, {
							screen: ROUTES.MAIN.PORTAL,
						})
					},
				},
				{
					id: 'earnings-payments',
					label: 'Earnings & Payments',
					icon: <PaymentsIcon width={20} height={20} />,
					onPress: () => {
						setIsSidebarOpen(false)
						navigation.navigate(ROUTES.STACK.NURSE_EARNINGS as any)
					},
				},
				{
					id: 'notifications',
					label: 'Notifications',
					icon: <MaterialCommunityIcons name="bell-outline" size={20} color="#1f5f68" />,
					onPress: () => {
						setIsSidebarOpen(false)
						navigation.navigate(ROUTES.STACK.NOTIFICATION)
					},
				},
				{
					id: 'help',
					label: 'Help Center',
					icon: <HelpCenterIcon width={20} height={20} />,
					onPress: () =>
						navigation.navigate(ROUTES.MAIN.TABS, {
							screen: ROUTES.MAIN.PROFILE,
						}),
				},
				{
					id: 'settings',
					label: 'Settings',
					icon: <SettingsIcon width={20} height={20} />,
					onPress: () => navigation.navigate(ROUTES.STACK.SETTINGS),
				},
			]
		}


			const roleItems: AppSidebarItem[] =
				role === 'doctor'
					? [
							{
								id: 'my-patients',
								label: 'My Patients',
								icon: <MaterialCommunityIcons name="account-group-outline" size={20} color="#1f5f68" />,
								onPress: openAppointments,
							},
							{
								id: 'my-consultations',
								label: 'My Consultations',
								icon: <MaterialCommunityIcons name="stethoscope" size={20} color="#1f5f68" />,
								onPress: openAppointments,
							},
							{
								id: 'create-event',
								label: 'Create Event',
								icon: <MaterialCommunityIcons name="calendar-plus" size={20} color="#1f5f68" />,
								onPress: () => {
									setIsSidebarOpen(false)
									navigation.navigate(ROUTES.STACK.DOCTOR_EVENTS as any)
								},
							},
						]
					: [
							{
								id: 'medicine-orders',
								label: 'Medicine Orders',
								icon: <MaterialCommunityIcons name="pill" size={20} color="#1f5f68" />,
								onPress: () => openBookingsFilter('medicine'),
							},
							{
								id: 'lab booking',
								label: 'Lab Bookings',
								icon: <MaterialCommunityIcons name="clipboard-text-play-outline" size={20} color="#1f5f68" />,
								onPress: () => openBookingsFilter('lab'),
							},
							{
								id: 'radiology-bookings',
								label: 'Radiology Bookings',
								icon: <MaterialCommunityIcons name="clipboard-text-play-outline" size={20} color="#1f5f68" />,
								onPress: () => openBookingsFilter('radiology'),
							},
							{
								id: 'ancillary-orders',
								label: 'Ancillary Orders',
								icon: <MaterialCommunityIcons name="medical-bag" size={20} color="#1f5f68" />,
								onPress: () => openBookingsFilter('ancillary'),
							},
						]

			return [
				{
					id: 'appointments',
					label: 'My Appointments',
					icon: <AppointmentsIcon width={24} height={24} />,
					onPress: role === 'doctor' ? openAppointments : () => openBookingsFilter('doctor'),
				},
				...roleItems,
				{
					id: 'treatment-history',
					label: 'Treatment History',
					icon: <TreatmentIcon width={20} height={20} />,
					onPress: () =>
						navigation.navigate(ROUTES.MAIN.TABS, {
							screen: ROUTES.MAIN.HOME,
						}),
				},
				{
					id: 'reminders',
					label: 'Reminders',
					icon: <RemindersIcon width={20} height={20} />,
					onPress: () =>
						navigation.navigate(ROUTES.MAIN.TABS, {
							screen: ROUTES.MAIN.HOME,
						}),
				},
				{
					id: 'my-wallet',
					label: 'My Wallet',
					icon: <MaterialCommunityIcons name="wallet-outline" size={20} color="#1f5f68" />,
					onPress: () => {
						setIsSidebarOpen(false)
						navigation.navigate(ROUTES.STACK.WALLET)
					},
				},
				{
					id: 'payments',
					label: 'Payments',
					icon: <PaymentsIcon width={20} height={20} />,
					onPress: () => navigation.navigate(ROUTES.STACK.PATIENT_PAYMENT),
				},
				{
					id: 'help',
					label: 'Help Center',
					icon: <HelpCenterIcon width={20} height={20} />,
					onPress: () =>
						navigation.navigate(ROUTES.MAIN.TABS, {
							screen: ROUTES.MAIN.PROFILE,
						}),
				},
				{
					id: 'settings',
					label: 'Settings',
					icon: <SettingsIcon width={20} height={20} />,
					onPress: () => navigation.navigate(ROUTES.STACK.SETTINGS),
				},
			]
		},
		[navigation, role]
	)

	const openSidebar = useCallback(() => setIsSidebarOpen(true), [])
	const closeSidebar = useCallback(() => setIsSidebarOpen(false), [])
	const drawerContext = useMemo(() => ({ open: openSidebar, close: closeSidebar }), [openSidebar, closeSidebar])

	return (
		<SidebarDrawerContext.Provider value={drawerContext}>
			<ScrollProvider>
				<View style={styles.container}>
					{isPatientRole(role) ? (
						<PatientSidebar
							visible={isSidebarOpen}
							onClose={closeSidebar}
							onLogout={clearAuth}
							onViewProfile={handleEditProfile}
						/>
					) : (
						<AppSidebar
							visible={isSidebarOpen}
							profileCompletion={user.profileCompletion}
							onClose={closeSidebar}
							onLogout={clearAuth}
							onEditProfile={handleEditProfile}
							menuItems={menuItems}
						/>
					)}

					<AppHeader
						variant="home"
						userName={user.name}
						avatarUri={user.avatar}
						onAvatarPress={openSidebar}
						isSearchEditable={false}
						onSearchPress={handleSearchPress}
					/>

					<View style={styles.content}>{children}</View>
				</View>
			</ScrollProvider>
		</SidebarDrawerContext.Provider>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f5f5f5',
	},
	content: {
		flex: 1,
	},
})
