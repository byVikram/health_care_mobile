// src/features/dashboard/screens/DashboardPage.tsx
import React, { useEffect, useState } from 'react'
import {
	RefreshControl,
	ScrollView,
	StyleSheet,
	View,
	useWindowDimensions,
	Animated,
	Text,
	TouchableOpacity,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useNavigation, type NavigationProp } from '@react-navigation/native'

import QuickServicesSection from './components/QuickServicesSection'
import MediaPromotionsSection from './components/MediaPromotionsSection'
import ServicesSection from './components/ServiceSection'
import SpecialitySection from './components/SpecialitySection'
import ConsultSection from './components/ConsultSection'
import PatientQuestionsSection from './components/PatientQuestionsSection'
import PharmacyOrderDashboardCard from './components/PharmacyOrderDashboardCard'

import PatientUpcomingAppointments from './components/PatientUpcomingAppointments'
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

import { ROUTES } from '../../navigation/routes'
import type { AppNavigationParamList } from '../../navigation/types'

import PatientHealthQuestionsList from '../dashboard/components/PatientHealthQuestionsList'
import { AppButton, AppModal, AppTypography } from '../../components/common'
import { getDoctorStatus, DoctorStatusResponse } from '../doctor/doctorService'


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
	const defaultHeaderHeight = isDoctor ? insets.top + 84 : insets.top + 146
	const headerHeight = (scrollData?.headerHeight && scrollData.headerHeight > 0) ? scrollData.headerHeight : defaultHeaderHeight
	const navigation = useNavigation<NavigationProp<AppNavigationParamList>>()

	const [appointments, setAppointments] = useState<any[]>([])
	const [apptLoading, setApptLoading] = useState(false)
	const [apptError, setApptError] = useState('')
	const [refreshing, setRefreshing] = useState(false)
	const [refreshToken, setRefreshToken] = useState(0)
	const [modalType, setModalType] = useState<'success' | 'error' | null>(null)

	const [selectedDate, setSelectedDate] = useState(0)
	const [doctorAppointmentSearch, setDoctorAppointmentSearch] = useState('')

	// ----- Doctor Status Fetch effect -----
	const [doctorStatus, setDoctorStatus] = useState<DoctorStatusResponse['data'] | null>(null)
	const [showUnverifiedBanner, setShowUnverifiedBanner] = useState(false)

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

		const fetchStatus = async () => {
			try {
				const status = await getDoctorStatus()
				console.log("DOCTOR STATUS IN DASHBOARD:", status)
				setDoctorStatus(status)
				
				if (status.profile_completed && !status.is_verified) {
					console.log("SETTING SHOW UNVERIFIED BANNER TO TRUE")
					setShowUnverifiedBanner(true)
				} else {
					console.log("BANNER NOT SHOWN. profile_completed:", status.profile_completed, "is_verified:", status.is_verified)
				}
			} catch (error) {
				console.error('Failed to fetch doctor status:', error)
			}
		}

		fetchStatus()

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

	const renderDoctorPanel = () => (
		<>
			{showUnverifiedBanner && (
				<View style={styles.verificationBannerContainer}>
					<View style={styles.verificationBannerIconBox}>
						<MaterialCommunityIcons name="clock-outline" size={18} color="#F57C00" />
					</View>
					<View style={styles.verificationBannerTextContainer}>
						<AppTypography style={styles.verificationBannerTitle}>Verification Pending</AppTypography>
						<AppTypography style={styles.verificationBannerDesc} numberOfLines={3}>
							Your profile is under review. You'll get full access once your account is verified.
						</AppTypography>
					</View>
					<TouchableOpacity style={styles.verificationBannerButton}>
						<AppTypography style={styles.verificationBannerButtonText} numberOfLines={1}>Learn More</AppTypography>
					</TouchableOpacity>
				</View>
			)}
			<DoctorAppointments
			selectedDate={selectedDate}
			setSelectedDate={setSelectedDate}
			appointments={appointments}
			apptLoading={apptLoading}
			apptError={apptError}
			weekDays={weekDays}
			selectedDateObj={weekDays[selectedDate]?.dateObj}
			searchQuery={doctorAppointmentSearch}
			setSearchQuery={setDoctorAppointmentSearch}
		/>
		</>
	)

	const renderUserPanel = () => (
		<>
			<View style={styles.upcomingAppointmentsWrapper}>
				<PatientUpcomingAppointments
					refreshToken={refreshToken}
					onRefreshComplete={() => setRefreshing(false)}
					onJoin={() =>
						navigation.navigate(ROUTES.STACK.DOCTOR_SEARCH, {
							mode: 'video',
						})
					}
				/>
			</View>

			<SpecialitySection />
			<ConsultSection />
			{/* <PatientHealthQuestionsList /> */}
		</>
	)

	const renderPharmacyPanel = () => (
		<>
			<LocationScreen />
			<GPSLocationCard />
		</>
	)
	const renderRadiologyPanel = () => (
		<>
			<GPSLocationCard />
		</>
	)
	const renderLaboratoryPanel = () => <></>
	const renderQuickServicesSection = () => (
		<View style={isDoctor && styles.doctorQuickServicesSpacing}>
			<QuickServicesSection role={role} />
		</View>
	)
	const renderRoleBasedPanel = () => {
		switch (role) {
			case USER_ROLES.DOCTOR:
				return renderDoctorPanel()

			case USER_ROLES.PHARMACY:
				return renderPharmacyPanel()

			case USER_ROLES.RADIOLOGY:
				return renderRadiologyPanel()

			case USER_ROLES.LABORATORY:
				return renderLaboratoryPanel()

			default:
				return renderUserPanel()
		}
	}

	const renderMainContent = () => {
		if (
			role !== USER_ROLES.DOCTOR &&
			role !== USER_ROLES.PHARMACY &&
			role !== USER_ROLES.RADIOLOGY &&
			role !== USER_ROLES.LABORATORY
		) {
			return (
				<>
					{renderQuickServicesSection()}
					<ServicesSection />
					<MediaPromotionsSection role={role} />
					{renderUserPanel()}
				</>
			)
		}

		if (isTablet) {
			return (
				<View style={styles.tabletRow}>
					{/* HERO */}
					<View style={[styles.heroColumn, isLandscape && styles.heroColumnHalf]}>
						{renderQuickServicesSection()}
						<MediaPromotionsSection role={role} />
					</View>

					{/* ROLE PANEL */}
					<View style={[styles.column, isLandscape && styles.rightColumnHalf]}>{renderRoleBasedPanel()}</View>
				</View>
			)
		}
		// Mobile: stack vertically
		return (
			<>
				{renderQuickServicesSection()}
				<MediaPromotionsSection role={role} />
				{renderRoleBasedPanel()}
			</>
		)
	}

	return (
		<>
			<Animated.ScrollView
				style={styles.container}
				contentContainerStyle={[
					styles.content,
					{
						paddingTop: headerHeight,
						paddingBottom: Math.max(insets.bottom + 96, 120),
					},
				]}
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
				{role === USER_ROLES.PHARMACY && <PharmacyOrderDashboardCard />}

				{renderMainContent()}

				{/* New dashboard sections inserted before the existing community/blog sections. */}
				<ArticleSection />
				<UpcomingEventsSection />

				{/* Existing common sections */}
				<CommunitySection />
				<BlogsSection />
				<PodcastsSection />

				{role !== USER_ROLES.PHARMACY && (
					<>
						<PatientHealthQuestionsList showViewAll={true} />

						{role === USER_ROLES.PATIENT && (
							<View style={styles.askQuestionContainer}>
								<AppButton onPress={() => navigation.navigate(ROUTES.STACK.PATIENT_QUESTIONS_LIST)}>
									Ask a Free Question
								</AppButton>
							</View>
						)}
					</>
				)}
			</Animated.ScrollView>

			<StatusModal
				visible={modalType !== null}
				status={modalType === 'success' ? 'success' : 'error'}
				title={modalType === 'success' ? 'Success' : 'Booking Failed'}
				description={modalType === 'success' ? 'Updated successfully' : 'Something went wrong'}
				submitText={modalType === 'success' ? 'Go Home' : 'Try Again'}
				onSubmit={() => setModalType(null)}
			/>

			{/* Doctor Status Modals */}
			{/* Complete Profile Blocking Modal */}
			<AppModal 
				visible={role === USER_ROLES.DOCTOR && !!doctorStatus && !doctorStatus.profile_completed} 
				dismissable={false}
				onDismiss={() => {}}
				title="Complete Your Profile"
			>
				<AppTypography variant="body" style={{ marginBottom: 16 }}>
					Your profile is incomplete. Please complete your profile to continue using the application.
				</AppTypography>
				<AppButton onPress={() => navigation.navigate(ROUTES.MAIN.PROFILE as any)}>
					Complete Profile
				</AppButton>
			</AppModal>
		</>
	)
}

const styles = StyleSheet.create({
	askQuestionContainer: {
		marginHorizontal: 16,
		marginTop: 12,
		marginBottom: 8,
	},
	askQuestionButton: {
		marginHorizontal: 16,
		marginTop: 12,
		marginBottom: 8,
		backgroundColor: '#0C7C7C',
		borderRadius: 12,
		paddingVertical: 14,
		alignItems: 'center',
		justifyContent: 'center',
	},

	askQuestionText: {
		color: '#FFFFFF',
		fontSize: 16,
		fontWeight: '600',
	},
	container: {
		flex: 1,
		backgroundColor: '#f5f5f5',
	},

	content: {
		flexGrow: 1,
		maxWidth: 1200,
		alignSelf: 'center',
		width: '100%',
	},

	doctorQuickServicesSpacing: {
		marginTop: 12,
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

	upcomingAppointmentsWrapper: {
		marginTop: 8,
	},
	verificationBannerContainer: {
		backgroundColor: '#FFF8E1',
		borderWidth: 1,
		borderColor: '#FFE082',
		borderRadius: 12,
		padding: 12,
		marginHorizontal: 16,
		marginBottom: 16,
		flexDirection: 'row',
		alignItems: 'center',
	},
	verificationBannerIconBox: {
		backgroundColor: '#FFECB3',
		borderRadius: 8,
		width: 32,
		height: 32,
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 8,
	},
	verificationBannerTextContainer: {
		flex: 1,
		marginRight: 8,
	},
	verificationBannerTitle: {
		fontWeight: '700',
		fontSize: 14,
		color: '#212121',
		marginBottom: 2,
	},
	verificationBannerDesc: {
		fontSize: 12,
		color: '#616161',
		lineHeight: 16,
	},
	verificationBannerButton: {
		borderWidth: 1,
		borderColor: '#F57C00',
		borderRadius: 24,
		paddingVertical: 6,
		paddingHorizontal: 12,
		alignItems: 'center',
		justifyContent: 'center',
	},
	verificationBannerButtonText: {
		color: '#F57C00',
		fontWeight: '600',
		fontSize: 12,
	},
})

