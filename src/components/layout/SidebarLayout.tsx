// SidebarLayout.tsx
import React, { useEffect, useMemo, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { useNavigation, type NavigationProp } from '@react-navigation/native'

import { AppSidebar } from '../common'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import AppHeader from '../common/AppHeader'
import type { AppSidebarItem, AppSidebarProfile } from '../common'
import { useAuth } from '../../context/AuthContext'
import { ScrollProvider } from '../../context/ScrollContext'

import AppointmentsIcon from '../../assets/quick-services/appointments.svg'
import TreatmentIcon from '../../assets/icons/treatment.svg'
import RemindersIcon from '../../assets/icons/reminders.svg'
import PaymentsIcon from '../../assets/icons/payments.svg'
import HelpCenterIcon from '../../assets/icons/help-center.svg'
import SettingsIcon from '../../assets/icons/settings.svg'

import { ROUTES } from '../../navigation/routes'
import { getPatientDetails } from '../../features/profile/patient/PatientProfileService'
import { getDoctorProfile, mapDoctorProfileApi } from '../../features/doctor/doctorService'
import type { AppStackParamList } from '../../navigation/types'

const MOCK_USER = {
	name: 'Nitin',
	avatar: undefined as string | undefined,
	profileCompletion: 72,
}

const PROFILES: AppSidebarProfile[] = [
	{
		id: 'anjali',
		label: 'Anjali',
		variant: 'smile',
		avatar: require('../../assets/Banner/patient.png'),
	},
	{
		id: 'anjali-mom',
		label: 'Anjali Mom',
		variant: 'mom',
		avatar: require('../../assets/Banner/doctor.png'),
	},
	{
		id: 'anjali-dad',
		label: 'Anjali’s Dad',
		variant: 'dad',
		avatar: require('../../assets/Banner/welcome-doctor.png'),
	},
	{ id: 'add', label: 'Add', variant: 'add' },
]

interface SidebarLayoutProps {
	children: React.ReactNode
}

export default function SidebarLayout({ children }: SidebarLayoutProps) {
	const [isSidebarOpen, setIsSidebarOpen] = useState(false)

	const navigation = useNavigation<NavigationProp<AppStackParamList>>()

	const { clearAuth, user: authUser, role, updateUser } = useAuth()

	const user = {
		name: authUser?.name ?? MOCK_USER.name,
		avatar: authUser?.avatar ?? MOCK_USER.avatar,
		profileCompletion: authUser?.profileCompletion ?? MOCK_USER.profileCompletion,
	}

	// Sync the real profile photo from the API so the dashboard header
	// and sidebar show the latest uploaded image.
	useEffect(() => {
		if (role !== 'patient' && role !== 'doctor') return

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
	}, [role])

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
								onPress: () => {
									setIsSidebarOpen(false)
									navigation.navigate(ROUTES.STACK.ORDER_LIST as any)
								},
							},
							{
								id: 'lab booking',
								label: 'Lab Bookings',
								icon: <MaterialCommunityIcons name="clipboard-text-play-outline" size={20} color="#1f5f68" />,
								onPress: () => {
									setIsSidebarOpen(false)
									navigation.navigate(ROUTES.STACK.LABORATORY_ORDERS as any)
								},
							},
							{
								id: 'radiology-bookings',
								label: 'Radiology Bookings',
								icon: <MaterialCommunityIcons name="clipboard-text-play-outline" size={20} color="#1f5f68" />,
								onPress: () => {
									setIsSidebarOpen(false)
									navigation.navigate(ROUTES.STACK.RADIOLOGY_ORDERS as any)
								},
							},
							{
								id: 'ancillary-orders',
								label: 'Ancillary Orders',
								icon: <MaterialCommunityIcons name="medical-bag" size={20} color="#1f5f68" />,
								onPress: () => {
									setIsSidebarOpen(false)
									navigation.navigate(ROUTES.STACK.ANCILLARY_MY_BOOKINGS as any)
								},
							},
							{
								id: 'book-cab',
								label: 'Book a Cab',
								icon: <MaterialCommunityIcons name="car" size={20} color="#1f5f68" />,
								onPress: () => {
									setIsSidebarOpen(false)
									navigation.navigate(ROUTES.STACK.TRANSPORTATION_LANDING as any)
								},
							},
						]

			return [
				{
					id: 'appointments',
					label: 'My Appointments',
					icon: <AppointmentsIcon width={24} height={24} />,
					onPress: openAppointments,
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

	return (
		<ScrollProvider>
			<View style={styles.container}>
				<AppSidebar
					visible={isSidebarOpen}
					profileCompletion={user.profileCompletion}
					onClose={() => setIsSidebarOpen(false)}
					onLogout={clearAuth}
					onEditProfile={handleEditProfile}
					menuItems={menuItems}
					profiles={PROFILES}
				/>

				<AppHeader
					variant="home"
					userName={user.name}
					avatarUri={user.avatar}
					onAvatarPress={() => setIsSidebarOpen(true)}
					isSearchEditable={false}
					onSearchPress={handleSearchPress}
				/>

				<View style={styles.content}>{children}</View>
			</View>
		</ScrollProvider>
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
