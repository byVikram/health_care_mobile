import React, { useEffect, useState } from 'react'
import {
	ScrollView,
	StyleSheet,
	TouchableOpacity,
	Text,
	View,
	useWindowDimensions,
} from 'react-native'
import { useNavigation, type NavigationProp } from '@react-navigation/native'

import HeroSection from './HeroSection'
import SpecialitySection from './SpecialitySection'
import ConsultSection from './ConsultSection'
import PatientQuestionsSection from './PatientQuestionsSection'
import PatientUpcomingAppointments from '../../components/common/PatientUpcomingAppointments'
import CommunitySection from './CommunitySection'
import BlogsSection from './BlogsSection'
import DoctorAppointments from '../doctor/DoctorAppointments'
import { getAppointments, Appointment } from '../doctor/doctorService'

import { formatDateForApi } from '../../utils/date'
import { USER_ROLES } from '../../constants/constants'
import { useAuth } from '../../context/AuthContext'
import StatusModal from '../../components/common/StatusModal'

import TreatmentHistoryIcon from '../../assets/icons/treatmenthistory.svg'
import TreatmentHistoryArrowIcon from '../../assets/icons/treatmenthistory-icon.svg'
import { ROUTES } from '../../navigation/routes'
import type { AppNavigationParamList } from '../../navigation/types'

export default function DashboardPage() {
	const { width } = useWindowDimensions()
	const isTablet = width >= 768
	const isLandscape = width > 1024

	const { role } = useAuth()
	const navigation = useNavigation<NavigationProp<AppNavigationParamList>>()

	const [appointments, setAppointments] = useState<Appointment[]>([])
	const [apptLoading, setApptLoading] = useState(false)
	const [apptError, setApptError] = useState('')
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

				const dateStr = formatDateForApi(
					weekDays[selectedDate]?.dateObj ?? new Date()
				)

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
					<Text style={styles.treatmentHistoryTitle}>
						Treatment History
					</Text>
				</View>
				<TreatmentHistoryArrowIcon width={26} height={26} />
			</TouchableOpacity>

			<PatientUpcomingAppointments
				onJoin={(appointment) =>
					navigation.navigate(ROUTES.STACK.VIDEO_CONSULTATION, {
						appointmentId: appointment.id,
					})
				}
				onReschedule={(appointment) =>
					navigation.navigate(ROUTES.STACK.RESCHEDULE_APPOINTMENT, {
						appointmentId: appointment.id,
					})
				}
				onCancel={(appointment) =>
					navigation.navigate(ROUTES.STACK.CANCEL_APPOINTMENT, {
						appointmentId: appointment.id,
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
			<TouchableOpacity style={styles.treatmentHistoryCard}>
				<Text style={styles.treatmentHistoryTitle}>
					📦 Inventory Management
				</Text>
			</TouchableOpacity>

			<TouchableOpacity style={styles.treatmentHistoryCard}>
				<Text style={styles.treatmentHistoryTitle}>
					🧾 Orders
				</Text>
			</TouchableOpacity>

			<TouchableOpacity style={styles.treatmentHistoryCard}>
				<Text style={styles.treatmentHistoryTitle}>
					💊 Upload Medicines
				</Text>
			</TouchableOpacity>
		</>
	)

	// ---------------- CONDITIONAL HERO SECTION ----------------
	const shouldShowHero = role !== USER_ROLES.PHARMACY

	// ---------------- ROLE-BASED RIGHT PANEL ----------------
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

	return (
		<>
			<ScrollView
				style={styles.container}
				contentContainerStyle={styles.content}
				showsVerticalScrollIndicator={false}
			>
				{/* MAIN RESPONSIVE LAYOUT */}
				{isTablet ? (
					<View style={styles.tabletRow}>
						{/* HERO SECTION (hidden for pharmacy) */}
						{shouldShowHero && (
							<View
								style={[
									styles.heroColumn,
									isLandscape && styles.heroColumnHalf,
								]}
							>
								<HeroSection />
							</View>
						)}

						{/* RIGHT PANEL (appointments / pharmacy cards) */}
						<View
							style={[
								styles.column,
								isLandscape && styles.rightColumnHalf,
								!shouldShowHero && styles.fullColumn,
							]}
						>
							{renderRoleBasedPanel()}
						</View>
					</View>
				) : (
					<>
						{/* Mobile: Hero only if not pharmacy */}
						{shouldShowHero && <HeroSection />}
						{renderRoleBasedPanel()}
					</>
				)}

				{/* COMMON SECTIONS - always visible */}
				<CommunitySection />
				<BlogsSection />
				<PatientQuestionsSection />
			</ScrollView>

			<StatusModal
				visible={modalType !== null}
				status={modalType === 'success' ? 'success' : 'error'}
				title={modalType === 'success' ? 'Success' : 'Booking Failed'}
				description={
					modalType === 'success'
						? 'Updated successfully'
						: 'Something went wrong'
				}
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

	fullColumn: {
		flex: 1,
	},

	treatmentHistoryCard: {
		marginHorizontal: 16,
		marginTop: 8,
		padding: 14,
		borderWidth: 1,
		borderColor: '#CFDBDD',
		borderRadius: 10,
		backgroundColor: '#fff',
	},

	treatmentHistoryLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},

	treatmentHistoryTitle: {
		fontSize: 16,
		fontWeight: '500',
		color: '#30353A',
	},
})