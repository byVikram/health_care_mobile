import React, { useEffect, useState } from 'react'
import { ScrollView, StyleSheet, TouchableOpacity, Text, View, useWindowDimensions } from 'react-native'
import { useTheme } from 'react-native-paper'
import { useNavigation, NavigationProp } from '@react-navigation/native'

import HeroSection from './HeroSection'
import SpecialitySection from './SpecialitySection'
import ConsultSection from './ConsultSection'
import CommunityBlogsSection from './CommunityBlogsSection'
import PatientQuestionsSection from './PatientQuestionsSection'
import  PatientUpcomingAppointments from '../../components/common/PatientUpcomingAppointments';

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
	const isTablet = width >= 768
	const { role } = useAuth()
	const isDoctor = role === USER_ROLES.DOCTOR
	const navigation = useNavigation<NavigationProp<any>>()

	const [appointments, setAppointments] = useState<Appointment[]>([])
	const [apptLoading, setApptLoading] = useState(false)
	const [apptError, setApptError] = useState('')
	const [modalType, setModalType] = useState<'success' | 'error' | null>(null)
	// useEffect(() => {
	// 	setModalType("success");
	// }, []);
	const [selectedDate, setSelectedDate] = useState(0)
	type WeekDay = {
		dateObj: Date
	}
	const buildWeekDays = () => {
		const today = new Date()
		const days = []
		for (let i = 0; i < 7; i += 1) {
			const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i)
			const dayLabel = d.toLocaleDateString('en-US', {
				weekday: 'short',
			})
			const isWeekend = d.getDay() === 0 || d.getDay() === 6
			days.push({
				day: dayLabel,
				date: String(d.getDate()),
				red: isWeekend,
				dateObj: d,
			})
		}
		return days
	}
	const [weekDays] = useState(() => buildWeekDays())

	const theme = useTheme()

	useEffect(() => {
		if (!isDoctor || !weekDays.length) return

		const fetchAppointments = async () => {
			try {
				setApptLoading(true)
				setApptError('')

				const dateStr = formatDateForApi(weekDays[selectedDate]?.dateObj ?? new Date())

				const res = await getAppointments({
					appointment_date: dateStr,
				})

				if (res.success) {
					const items = Array.isArray(res.data) ? res.data : []
					setAppointments(items)
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

	const renderDashboard = () => {
		return (
			<>
				{isTablet ? (
					<View style={styles.tabletTopRow}>
						<View style={styles.tabletColumn}>
							<HeroSection />
						</View>

						{isDoctor ? (
							<View style={[styles.tabletColumn, styles.tabletColumnRight]}>
								<DoctorAppointments
									selectedDate={selectedDate}
									setSelectedDate={setSelectedDate}
									appointments={appointments}
									apptLoading={apptLoading}
									apptError={apptError}
									weekDays={weekDays}
									selectedDateObj={weekDays[selectedDate]?.dateObj}
								/>
							</View>
						) : (
							<>
								<TouchableOpacity activeOpacity={0.85} style={styles.treatmentHistoryCard}>
									<View style={styles.treatmentHistoryLeft}>
										<TreatmentHistoryIcon width={52} height={52} />
										<Text style={styles.treatmentHistoryTitle}>Treatment History</Text>
									</View>
									<TreatmentHistoryArrowIcon width={26} height={26} />
								</TouchableOpacity>
								<SpecialitySection />
								<ConsultSection />
								<CommunityBlogsSection />
							</>
						)}
					</View>
				) : (
					<>
						<HeroSection />

						{isDoctor ? (
							<DoctorAppointments
								selectedDate={selectedDate}
								setSelectedDate={setSelectedDate}
								appointments={appointments}
								apptLoading={apptLoading}
								apptError={apptError}
								weekDays={weekDays}
								selectedDateObj={weekDays[selectedDate]?.dateObj}
							/>
						) : (
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
						)}
					</>
				)}

				<CommunityBlogsSection />

				<PatientQuestionsSection
				// Pass real questions + handler once you wire up the API:
				// questions={patientQuestions}
				// loading={questionsLoading}
				// onSubmitAnswer={handleSubmitAnswer}
				/>
			</>
		)
	}

	function handleRetry(): void {
		throw new Error('Function not implemented.')
	}

	return (
		<>
			<ScrollView style={styles.container}>{renderDashboard()}</ScrollView>

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
	tabletTopRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		paddingHorizontal: 8,
	},
	tabletColumn: {
		flex: 1,
	},
	tabletColumnRight: {
		marginLeft: 8,
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
		shadowOpacity: 0,
		elevation: 0,
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
	card: {
		marginHorizontal: 16,
		marginBottom: 24,
	},
	sectionTitle: {
		marginHorizontal: 16,
		marginBottom: 12,
		fontWeight: 'bold',
	},
	grid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		paddingHorizontal: 8,
	},
	gridItem: {
		width: '45%',
		margin: '2.5%',
		justifyContent: 'center',
		height: 100,
	},
})
