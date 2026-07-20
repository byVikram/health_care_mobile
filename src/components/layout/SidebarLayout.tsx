// SidebarLayout.tsx
import React, { useCallback, useMemo, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { useNavigation, type NavigationProp, useFocusEffect } from '@react-navigation/native'

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
import { getFamilyMembers } from '../../features/profile/patient/family/familyMemberService'
import { buildS3Url } from '../../utils/s3Utils'
import type { FamilyMember } from '../../types/familyMember'
import type { AppStackParamList } from '../../navigation/types'

interface SidebarLayoutProps {
	children: React.ReactNode
}

export default function SidebarLayout({ children }: SidebarLayoutProps) {
	const [isSidebarOpen, setIsSidebarOpen] = useState(false)
	const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
	const [profilesLoading, setProfilesLoading] = useState(false)

	const navigation = useNavigation<NavigationProp<AppStackParamList>>()

	const { clearAuth, user: authUser, role, updateUser } = useAuth()

	const user = {
		name: authUser?.name ?? 'User',
		avatar: authUser?.avatar ?? undefined,
		profileCompletion: authUser?.profileCompletion ?? 0,
	}

	// ── Fetch avatar sync + family members whenever screen gains focus ──────────
	useFocusEffect(
		useCallback(() => {
			let cancelled = false

			const syncData = async () => {
				try {
					if (role === 'doctor') {
						const res = await getDoctorProfile()
						if (!cancelled && res.success && res.data) {
							const profile = mapDoctorProfileApi(res.data)
							if (profile.personal.avatar) updateUser({ avatar: profile.personal.avatar })
						}
						return
					}

					if (role === 'patient') {
						// Sync avatar
						const res = await getPatientDetails()
						if (!cancelled && res.success && res.data?.personal?.avatar) {
							updateUser({ avatar: res.data.personal.avatar })
						}

						// Fetch family members for the Profiles section
						setProfilesLoading(true)
						const members = await getFamilyMembers()
						if (!cancelled) setFamilyMembers(members)
					}
				} catch {
					// Silently ignore; existing avatar/profiles will show.
				} finally {
					if (!cancelled) setProfilesLoading(false)
				}
			}

			syncData()
			return () => { cancelled = true }
		}, [role])
	)

	// ── Map family members to AppSidebarProfile shape ──────────────────────────
	const profiles = useMemo<AppSidebarProfile[]>(() => {
		const memberProfiles: AppSidebarProfile[] = familyMembers.map((m) => {
			const avatarUrl = buildS3Url(m.avatar_s3_key)
			return {
				id: m.id,
				label: m.is_self ? 'Myself' : m.name,
				avatarUrl: avatarUrl ?? undefined,
				variant: 'smile' as const,
			}
		})
		return [...memberProfiles, { id: '__add__', label: 'Add', variant: 'add' as const }]
	}, [familyMembers])

	// ── Navigation handlers ────────────────────────────────────────────────────
	const handleEditProfile = () => {
		setIsSidebarOpen(false)
		navigation.navigate(ROUTES.MAIN.TABS, { screen: ROUTES.MAIN.PROFILE })
	}

	const handleProfilePress = useCallback((profileId: string) => {
		navigation.navigate(ROUTES.STACK.EDIT_FAMILY_MEMBER, { patientPublicId: profileId })
	}, [navigation])

	const handleAddProfile = useCallback(() => {
		navigation.navigate(ROUTES.STACK.ADD_FAMILY_MEMBER)
	}, [navigation])

	const handleSearchPress = () => {
		if (role === 'pharmacy') {
			navigation.navigate(ROUTES.STACK.ORDER_LIST as any)
		} else if (role === 'radiology') {
			navigation.navigate(ROUTES.STACK.RADIOLOGY_ORDERS as any)
		} else {
			navigation.navigate(ROUTES.MAIN.TABS, { screen: ROUTES.MAIN.SEARCH as any })
		}
	}

	const menuItems = useMemo<AppSidebarItem[]>(
		() => {
			const openAppointments = () => {
				setIsSidebarOpen(false)
				navigation.navigate(ROUTES.STACK.APPOINTMENTS)
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
					onPress: () => navigation.navigate(ROUTES.MAIN.TABS, { screen: ROUTES.MAIN.HOME }),
				},
				{
					id: 'reminders',
					label: 'Reminders',
					icon: <RemindersIcon width={20} height={20} />,
					onPress: () => navigation.navigate(ROUTES.MAIN.TABS, { screen: ROUTES.MAIN.HOME }),
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
					onPress: () => navigation.navigate(ROUTES.MAIN.TABS, { screen: ROUTES.MAIN.PROFILE }),
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
					profiles={profiles}
					profilesLoading={profilesLoading}
					onProfilePress={handleProfilePress}
					onAddProfile={handleAddProfile}
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

