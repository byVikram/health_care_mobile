import React, { useEffect, useState } from 'react'
import {
	RefreshControl,
	ScrollView,
	StyleSheet,
	TouchableOpacity,
	Text,
	View,
	useWindowDimensions,
	Animated,
} from 'react-native'
import { useNavigation, type NavigationProp } from '@react-navigation/native'

import HeroSection from './components/HeroSection'
import SpecialitySection from './components/SpecialitySection'
import ConsultSection from './components/ConsultSection'
import PatientQuestionsSection from './components/PatientQuestionsSection'
import PharmacyOrderDashboardCard from './components/PharmacyOrderDashboardCard'
import PatientUpcomingAppointments from '../../components/common/PatientUpcomingAppointments'
import CommunitySection from './components/CommunitySection'
import LocationScreen from '../../components/common/LocationScreen'
import { GPSLocationCard } from '../../components/common/GPSLocationCard'
import BlogsSection from './components/BlogsSection'
import ArticleSection from './components/ArticleSection'
import UpcomingEventsSection from './components/EventSection'
import PodcastsSection from './components/PodcastsSection'
import DoctorAppointments from '../doctor/DoctorAppointments'
import { getAppointments } from '../doctor/doctorService'

import { formatDateForApi } from '../../utils/date'
import { USER_ROLES } from '../../constants/constants'
import { useAuth } from '../../context/AuthContext'
import StatusModal from '../../components/common/StatusModal'
import { useScroll } from '../../context/ScrollContext'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import TreatmentHistoryIcon from '../../assets/icons/treatmenthistory.svg'
import TreatmentHistoryArrowIcon from '../../assets/icons/treatmenthistory-icon.svg'
import { ROUTES } from '../../navigation/routes'
import type { AppNavigationParamList } from '../../navigation/types'

export default function DashboardPage() {
	const { width } = useWindowDimensions()
	const scrollData = useScroll()
	const isTablet = width >= 768
	const isLandscape = width > 1024

	const scrollY = React.useRef(new Animated.Value(0)).current

	React.useEffect(() => {
		scrollData?.registerScrollY(scrollY)
		return () => scrollData?.unregisterScrollY(scrollY)
	}, [scrollData, scrollY])

	const insets = useSafeAreaInsets()
	const { role } = useAuth()
	const isDoctor = role === USER_ROLES.DOCTOR
	const headerHeight = isDoctor ? insets.top + 84 : insets.top + 146
	const navigation = useNavigation<NavigationProp<AppNavigationParamList>>()

	const [appointments, setAppointments] = useState<any[]>([])
	const [apptLoading, setApptLoading] = useState(false)
	const [apptError, setApptError] = useState('')
	const [refreshing, setRefreshing] = useState(false)
	const [refreshToken, setRefreshToken] = useState(0)
	const [modalType, setModalType] = useState<'success' | 'error' | null>(null)

	const [selectedDate, setSelectedDate] = useState(0)

	// ---------------- WEEK DAYS ----------------
	const buildWeekDays = () => {
		const today = new Date()
		const days = []

		for (let i = 0; i < 7; i++) {
			const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i)

			days.push({
				day: d.toLocaleDateString('en-US', { weekday: 'short' }),
				date: String(d.getDate()),
				red: d.getDay() === 0 || d.getDay() === 6,
				dateObj: d,
			})
		}
		return days
	}

	const [weekDays] = useState(() => buildWeekDays())

	// ---------------- DOCTOR API ----------------
	useEffect(() => {
		if (role !== USER_ROLES.DOCTOR) return

		const fetchAppointments = async () => {
			try {
				setApptLoading(true)
				setApptError('')

				const dateStr = formatDateForApi(weekDays[selectedDate]?.dateObj ?? new Date())

				const res = await getAppointments({
					appointment_date: dateStr,
				})

				if (res.success) {
					setAppointments(Array.isArray(res.data) ? res.data : [])
				} else {
					setApptError(res.message ?? 'Failed to load appointments')
				}
			} catch {
				setApptError('Failed to load appointments')
			} finally {
				setApptLoading(false)
			}
		}

		fetchAppointments()
	}, [role, selectedDate, weekDays])

	const handleRefresh = async () => {
		setRefreshing(true)

		try {
			if (role === USER_ROLES.DOCTOR) {
				setApptError('')

				const dateStr = formatDateForApi(weekDays[selectedDate]?.dateObj ?? new Date())

				const res = await getAppointments({
					appointment_date: dateStr,
				})

				if (res.success) {
					setAppointments(Array.isArray(res.data) ? res.data : [])
				} else {
					setApptError(res.message ?? 'Failed to load appointments')
				}
			} else if (role === USER_ROLES.PHARMACY) {
				setRefreshing(false)
			} else {
				setRefreshToken((token) => token + 1)
			}
		} catch {
			if (role === USER_ROLES.DOCTOR) {
				setApptError('Failed to load appointments')
			}
		} finally {
			if (role === USER_ROLES.DOCTOR) {
				setRefreshing(false)
			}
		}
	}

	// ---------------- DOCTOR PANEL ----------------
	const renderDoctorPanel = () => (
		<DoctorAppointments
			selectedDate={selectedDate}
			setSelectedDate={setSelectedDate}
			appointments={appointments}
			apptLoading={apptLoading}
			apptError={apptError}
			weekDays={weekDays}
			selectedDateObj={weekDays[selectedDate]?.dateObj}
		/>
	)

	// ---------------- PATIENT PANEL ----------------
	const renderUserPanel = () => (
		<>
			<TouchableOpacity style={styles.treatmentHistoryCard}>
				<View style={styles.treatmentHistoryLeft}>
					<TreatmentHistoryIcon width={52} height={52} />
					<Text style={styles.treatmentHistoryTitle}>Treatment History</Text>
				</View>
				<TreatmentHistoryArrowIcon width={26} height={26} />
			</TouchableOpacity>

			<PatientUpcomingAppointments
				refreshToken={refreshToken}
				onRefreshComplete={() => setRefreshing(false)}
				onJoin={() =>
					navigation.navigate(ROUTES.STACK.DOCTOR_SEARCH, {
						mode: 'video',
					})
				}
			/>

			<SpecialitySection />
			<ConsultSection />
		</>
	)

	// ---------------- PHARMACY PANEL ----------------
	const renderPharmacyPanel = () => (
		<>
			<LocationScreen />
			<GPSLocationCard />
		</>
	)

	// ---------------- ROLE SWITCH ----------------
	const renderRoleBasedPanel = () => {
		switch (role) {
			case USER_ROLES.DOCTOR:
				return renderDoctorPanel()

			case USER_ROLES.PHARMACY:
				return renderPharmacyPanel()

			default:
				return renderUserPanel()
		}
	}

	// ---- Helper: main content (hero + role panel) ----
	const renderMainContent = () => {
		if (role !== USER_ROLES.DOCTOR && role !== USER_ROLES.PHARMACY) {
			return (
				<>
					<HeroSection role={role} />
					{renderUserPanel()}
				</>
			)
		}

		if (isTablet) {
			return (
				<View style={styles.tabletRow}>
					{/* HERO */}
					<View style={[styles.heroColumn, isLandscape && styles.heroColumnHalf]}>
						<HeroSection role={role} />
					</View>

					{/* ROLE PANEL */}
					<View style={[styles.column, isLandscape && styles.rightColumnHalf]}>{renderRoleBasedPanel()}</View>
				</View>
			)
		}
		// Mobile: stack vertically
		return (
			<>
				<HeroSection role={role} />
				{renderRoleBasedPanel()}
			</>
		)
	}

	return (
		<>
			<Animated.ScrollView
				style={styles.container}
				contentContainerStyle={[styles.content, { paddingTop: headerHeight }]}
				showsVerticalScrollIndicator={false}
				scrollEventThrottle={16}
				onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
					useNativeDriver: true,
				})}
				refreshControl={
					<RefreshControl
						refreshing={refreshing}
						onRefresh={handleRefresh}
						colors={['#0c7c7c']}
						tintColor="#0c7c7c"
						progressBackgroundColor="#ffffff"
					/>
				}
			>
				{/* For PHARMACY role: show PharmacyOrder at the top (before HeroSection) */}
				{role === USER_ROLES.PHARMACY && <PharmacyOrderDashboardCard />}

				{renderMainContent()}

				{/* New dashboard sections inserted before the existing community/blog sections. */}
				<ArticleSection />
				<UpcomingEventsSection />

				{/* Existing common sections */}
				<CommunitySection />
				<BlogsSection />
				<PodcastsSection />

				{/* PatientQuestionsSection is NOT rendered for Pharmacy */}
				{role !== USER_ROLES.PHARMACY && <PatientQuestionsSection />}
			</Animated.ScrollView>

			<StatusModal
				visible={modalType !== null}
				status={modalType === 'success' ? 'success' : 'error'}
				title={modalType === 'success' ? 'Success' : 'Booking Failed'}
				description={modalType === 'success' ? 'Updated successfully' : 'Something went wrong'}
				submitText={modalType === 'success' ? 'Go Home' : 'Try Again'}
				onSubmit={() => setModalType(null)}
			/>
		</>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f5f5f5',
	},

	content: {
		flexGrow: 1,
		maxWidth: 1200,
		alignSelf: 'center',
		width: '100%',
		paddingBottom: 24,
	},

	tabletRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		gap: 16,
		paddingHorizontal: 12,
		marginTop: 8,
	},

	column: {
		flex: 1,
	},

	heroColumn: {
		flex: 1,
	},

	heroColumnHalf: {
		flex: 0.5,
	},

	rightColumnHalf: {
		flex: 0.5,
	},

	treatmentHistoryCard: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 12,
		marginHorizontal: 16,
		marginTop: 8,
		padding: 14,
		borderWidth: 1,
		borderColor: '#CFDBDD',
		borderRadius: 10,
		backgroundColor: '#fff',
	},

	treatmentHistoryLeft: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},

	treatmentHistoryTitle: {
		flex: 1,
		fontSize: 16,
		fontWeight: '500',
		color: '#30353A',
	},
})
