import React, { useEffect, useState } from 'react'
import { ScrollView, StyleSheet, TouchableOpacity, Text, View, useWindowDimensions } from 'react-native'
import { useTheme } from 'react-native-paper'
import { useNavigation, NavigationProp } from '@react-navigation/native'

import HeroSection from './HeroSection'
import SpecialitySection from './SpecialitySection'
import ConsultSection from './ConsultSection'
import CommunityBlogsSection from './CommunityBlogsSection'
import PatientQuestionsSection from './PatientQuestionsSection'
import PatientUpcomingAppointments from '../../components/common/PatientUpcomingAppointments'

import DoctorAppointments from '../doctor/DoctorAppointments'
import { getAppointments, Appointment } from '../doctor/doctorService'

import { formatDateForApi } from '../../utils/date'
import { USER_ROLES } from '../../constants/constants'
import { useAuth } from '../../context/AuthContext'
import StatusModal from '../../components/common/StatusModal'

import TreatmentHistoryIcon from '../../assets/icons/treatmenthistory.svg'
import TreatmentHistoryArrowIcon from '../../assets/icons/treatmenthistory-icon.svg'

export default function DashboardPage() {
	const { width } = useWindowDimensions()
	// const isTablet = width >= 768
	const isTablet = width >= 768
	const isLandscape = width > 1024

	const { role } = useAuth()
	const isDoctor = role === USER_ROLES.DOCTOR
	const navigation = useNavigation<NavigationProp<any>>()

	const [appointments, setAppointments] = useState<Appointment[]>([])
	const [apptLoading, setApptLoading] = useState(false)
	const [apptError, setApptError] = useState('')
	const [modalType, setModalType] = useState<'success' | 'error' | null>(null)

	const [selectedDate, setSelectedDate] = useState(0)

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

	useEffect(() => {
		if (!isDoctor) return

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
	}, [isDoctor, selectedDate, weekDays])

	function handleRetry() {
		setModalType(null)
	}

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

	const renderUserPanel = () => (
		<>
			<TouchableOpacity activeOpacity={0.85} style={styles.treatmentHistoryCard}>
				<View style={styles.treatmentHistoryLeft}>
					<TreatmentHistoryIcon width={52} height={52} />
					<Text style={styles.treatmentHistoryTitle}>Treatment History</Text>
				</View>
				<TreatmentHistoryArrowIcon width={26} height={26} />
			</TouchableOpacity>

			<PatientUpcomingAppointments
				onJoin={(appointment) =>
					navigation.navigate('VideoConsultation', {
						appointmentId: appointment.id,
					})
				}
				onReschedule={(appointment) =>
					navigation.navigate('RescheduleAppointment', {
						appointmentId: appointment.id,
					})
				}
				onCancel={(appointment) =>
					navigation.navigate('CancelAppointment', {
						appointmentId: appointment.id,
					})
				}
			/>

			<SpecialitySection />
			<ConsultSection />
		</>
	)

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
						{/* HERO SECTION - Left Column */}
						<View style={[styles.heroColumn, isLandscape && styles.heroColumnHalf]}>
							<HeroSection />
						</View>

						{/* RIGHT SIDE - Appointments/Treatment History */}
						<View style={[styles.column, isLandscape && styles.rightColumnHalf]}>
							{isDoctor ? renderDoctorPanel() : renderUserPanel()}
						</View>
					</View>
				) : (
					<>
						{/* Mobile View - Hero then panels stacked */}
						<HeroSection />
						{isDoctor ? renderDoctorPanel() : renderUserPanel()}
					</>
				)}

				{/* COMMON SECTIONS */}
				<CommunityBlogsSection />
				<PatientQuestionsSection />
			</ScrollView>

			<StatusModal
				visible={modalType !== null}
				status={modalType === 'success' ? 'success' : 'error'}
				title={modalType === 'success' ? 'Your appointment is successfully booked' : 'Booking Failed'}
				description={
					modalType === 'success'
						? 'The update will appear in your profile.'
						: 'Something went wrong. Please try again.'
				}
				submitText={modalType === 'success' ? 'Go Home' : 'Try Again'}
				cancelText={modalType === 'error' ? 'Go Home' : undefined}
				onSubmit={() => {
					if (modalType === 'success') {
						setModalType(null)
						navigation.navigate('Home')
					} else {
						handleRetry()
					}
				}}
				onCancel={() => {
					setModalType(null)
					navigation.navigate('Home')
				}}
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

	treatmentHistoryCard: {
		marginHorizontal: 16,
		marginTop: 8,
		marginBottom: 12,
		minHeight: 64,
		paddingHorizontal: 12,
		borderWidth: 1,
		borderColor: '#CFDBDD',
		borderRadius: 10,
		backgroundColor: '#fff',
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
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

	heroColumn: {
		flex: 1,
	},

	heroColumnHalf: {
		flex: 0.5, // Adjust ratio as needed
	},

	rightColumnHalf: {
		flex: 0.5, // Adjust ratio as needed
	},
})
