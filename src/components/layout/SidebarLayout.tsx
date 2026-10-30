// SidebarLayout.tsx
//
// Home-tab chrome: the header plus the left drawer (AppSidebar). The drawer's rows come from the backend
// (useSidebarMenu); patients also get the redesigned profile card (display id / QR / completion) and the FAMILY
// strip from <PatientSidebar />. useSidebarDrawer().open() opens the drawer from anywhere under this layout
// (e.g. a header menu button).
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { useNavigation, type NavigationProp } from '@react-navigation/native'

import { AppSidebar } from '../common'
import AppHeader from '../common/layout/AppHeader'
import type { AppSidebarSection } from '../common'
import { useAuth } from '../../context/AuthContext'
import { isPatientRole } from '../../constants/constants'
import { ScrollProvider } from '../../context/ScrollContext'
import { SELF_MEMBER_KEY, useFamilyMembers } from '../../hooks/useFamilyMembers'
import { useHomeSheets } from '../../features/dashboard/HomeSheetsContext'
import { usePatientSummary } from '../../features/dashboard/useHomeChromeData'

import { ROUTES } from '../../navigation/routes'
import { useSidebarMenu } from '../../navigation/useSidebarMenu'
import { getPatientSummary } from '../../services/homeService'
import { fetchDoctorHub } from '../../features/profile/doctor/doctorProfileService'
import { fetchProviderHub } from '../../features/profile/ancillary/ancillaryProfileService'
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

interface PatientSidebarProps {
	visible: boolean
	onClose: () => void
	onLogout: () => void
	onViewProfile: () => void
	sections: AppSidebarSection[]
}

/** Patient drawer content (design 1a). Every call soft-fails: the dependent line / row hides. */
function PatientSidebar({ visible, onClose, onLogout, onViewProfile, sections }: PatientSidebarProps) {
	const navigation = useNavigation<NavigationProp<AppStackParamList>>()
	const { user } = useAuth()
	const { open: openSheet } = useHomeSheets()
	const { summary } = usePatientSummary(visible)
	const { members } = useFamilyMembers() // the shared family list: loaded once, refreshed when the app changes it
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

	const openProfile = useCallback(() => {
		navigation.navigate(ROUTES.MAIN.TABS, { screen: ROUTES.MAIN.PROFILE })
	}, [navigation])

	const openFamily = useCallback(() => navigation.navigate(ROUTES.STACK.PATIENT_FAMILY), [navigation])
	const addFamilyMember = useCallback(() => navigation.navigate(ROUTES.STACK.PATIENT_FAMILY_MEMBER), [navigation])

	const handleOpenQr = () => {
		onClose()
		if (timerRef.current) clearTimeout(timerRef.current)
		timerRef.current = setTimeout(() => openSheet('qr'), DRAWER_HANDOFF_MS)
	}

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
			family={{ members: familyItems, onAdd: addFamilyMember, onManage: openFamily }}
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
	const sections = useSidebarMenu(isSidebarOpen)

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
				// Each role's hub endpoint is a light call that carries the photo; the full profile is loaded only by
				// the screens that show it.
				if (role === 'doctor') {
					const hub = await fetchDoctorHub()
					if (!cancelled && hub.avatar_url) updateUser({ avatar: hub.avatar_url })
					return
				}

				if (role === 'ancillary' || role === 'nurse') {
					const hub = await fetchProviderHub()
					if (!cancelled) {
						const resolvedAvatar =
							hub.avatar_url ||
							(ancillarySpecialty === 'physiotherapy' ? NEW_PHYSIOTHERAPIST_IMAGE_URL : '')
						if (resolvedAvatar && resolvedAvatar !== authUser?.avatar) {
							updateUser({ avatar: resolvedAvatar })
						}
					}
					return
				}

				const summary = await getPatientSummary()
				if (!cancelled && summary.avatar_url) {
					updateUser({ avatar: summary.avatar_url })
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
							sections={sections}
						/>
					) : (
						<AppSidebar
							visible={isSidebarOpen}
							profileCompletion={user.profileCompletion}
							onClose={closeSidebar}
							onLogout={clearAuth}
							onEditProfile={handleEditProfile}
							sections={sections}
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
