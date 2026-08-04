import React, { useEffect, useState, useCallback } from 'react'
import {
	View,
	Text,
	ScrollView,
	StyleSheet,
	TouchableOpacity,
	ActivityIndicator,
	RefreshControl,
} from 'react-native'
import { Card, useTheme, Button } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { AppStackParamList } from '../../navigation/types'
import { ROUTES } from '../../navigation/routes'
import ApiService from '../../services/apiService'
import { API_ENDPOINTS } from '../../constants/apiUrls'
import { Appointment } from '../../types/appointment'
import { getRideState, clearRideStorage, clearAllTransportationData } from './transportationService'
import { RideState } from '../../types/transportation'
import AppScreenHeader from '../../components/common/AppScreenHeader'

type NavigationProp = NativeStackNavigationProp<AppStackParamList>

export default function TransportationLandingPage() {
	const theme = useTheme()
	const navigation = useNavigation<NavigationProp>()

	const [appointments, setAppointments] = useState<Appointment[]>([])
	const [rideStates, setRideStates] = useState<Record<string, RideState>>({})
	const [loading, setLoading] = useState(true)
	const [refreshing, setRefreshing] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const loadData = useCallback(async () => {
		try {
			setError(null)
			const res = await ApiService.getWithParams<{ data?: Appointment[] } | Appointment[]>(
				API_ENDPOINTS.APPOINTMENTS.GET,
				{ variant: 'upcoming' }
			)
			const rawList: Appointment[] = Array.isArray(res.data)
				? res.data
				: (res.data as any)?.data || []

			const clinicVisits = rawList.filter((appt) => {
				const isClinic =
					appt.appointment_mode === 'clinic visit' || appt.appointment_mode === 'clinic_visit'
				const rawStatus = typeof appt.status === 'string' ? appt.status.toLowerCase() : ''
				const isUpcoming = rawStatus !== 'completed' && rawStatus !== 'cancelled'
				return isClinic && isUpcoming
			})

			setAppointments(clinicVisits)

			const states: Record<string, RideState> = {}
			for (const appt of clinicVisits) {
				const state = await getRideState(String(appt.id))
				states[String(appt.id)] = state
			}
			setRideStates(states)
		} catch (err) {
			console.error('[TransportationLandingPage] Error loading appointments:', err)
			setError('Failed to load upcoming hospital visits.')
		} finally {
			setLoading(false)
			setRefreshing(false)
		}
	}, [])

	useFocusEffect(
		useCallback(() => {
			loadData()
		}, [loadData])
	)

	const onRefresh = () => {
		setRefreshing(true)
		loadData()
	}

	const handleDevClearRide = async (appointmentId: string, type: 'onward' | 'return') => {
		await clearRideStorage(appointmentId, type)
		await loadData()
	}

	const handleDevClearAll = async () => {
		await clearAllTransportationData()
		await loadData()
	}

	const formatDate = (dateStr: string) => {
		const d = new Date(dateStr)
		if (isNaN(d.getTime())) return dateStr
		return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
	}

	const formatTime = (timeStr?: string) => {
		if (!timeStr) return ''
		const [h, m] = timeStr.split(':')
		const hour = parseInt(h, 10)
		const ampm = hour >= 12 ? 'PM' : 'AM'
		const displayHour = hour % 12 || 12
		return `${displayHour}:${m || '00'} ${ampm}`
	}

	return (
		<View style={styles.container}>
			<AppScreenHeader title="Book a Cab" />

			<ScrollView
				contentContainerStyle={styles.scrollContent}
				showsVerticalScrollIndicator={false}
				refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0c7c7c']} />}
			>
				{/* Premium Hero Banner */}
				<View style={styles.heroBanner}>
					<View style={styles.heroBadge}>
						<MaterialCommunityIcons name="car-side" size={14} color="#ffffff" />
						<Text style={styles.heroBadgeText}>Transportation Services</Text>
					</View>
					<Text style={styles.heroTitle}>Ride to Your Appointment Safely</Text>
					<Text style={styles.heroSubtitle}>
						Avoid traffic stress and parking worries. Book, update, or track professional cabs directly bundled with your appointments.
					</Text>
				</View>

				{/* Notice Banner */}
				<View style={styles.noticeCard}>
					<MaterialCommunityIcons name="information-outline" size={20} color="#0c7c7c" />
					<Text style={styles.noticeText}>
						Only in-person hospital visits are eligible for cab scheduling services.
					</Text>
				</View>

				{/* Section Header */}
				<View style={styles.sectionHeader}>
					<Text style={styles.sectionTitle}>Select Upcoming Visit to Arrange Ride</Text>
				</View>

				{loading ? (
					<ActivityIndicator size="large" color="#0c7c7c" style={{ marginTop: 32 }} />
				) : error ? (
					<View style={styles.errorContainer}>
						<Text style={styles.errorText}>{error}</Text>
						<Button mode="contained" buttonColor="#0c7c7c" onPress={loadData} style={{ marginTop: 12 }}>
							Retry
						</Button>
					</View>
				) : appointments.length === 0 ? (
					<View style={styles.emptyState}>
						<MaterialCommunityIcons name="car-off" size={48} color="#90a4ae" />
						<Text style={styles.emptyTitle}>No Upcoming Clinic Visits Found</Text>
						<Text style={styles.emptySubtitle}>
							Only in-person hospital visits are eligible for cab scheduling services.
						</Text>
						<Button
							mode="contained"
							buttonColor="#0c7c7c"
							style={{ marginTop: 16 }}
							onPress={() => navigation.navigate(ROUTES.STACK.DOCTOR_SEARCH)}
						>
							Find a Doctor
						</Button>
					</View>
				) : (
					appointments.map((appt) => {
						const apptId = String(appt.id)
						const rideState = rideStates[apptId] || {
							hasOnward: false,
							hasReturn: false,
							onwardStatus: null,
							returnStatus: null,
						}

						const { hasOnward, hasReturn } = rideState

						return (
							<Card key={apptId} style={styles.apptCard}>
								<Card.Content style={styles.cardContent}>
									{/* Top Header: Doctor Info + Ride Status Badge */}
									<View style={styles.cardTopRow}>
										<View style={styles.doctorAvatar}>
											<Text style={styles.avatarChar}>
												{((appt.doctor as any)?.name || 'D').charAt(0).toUpperCase()}
											</Text>
										</View>
										<View style={styles.doctorTextContainer}>
											<Text style={styles.doctorName} numberOfLines={1} ellipsizeMode="tail">
												{(appt.doctor as any)?.name || 'Dr. Arjun Sharma'}
											</Text>
											<Text style={styles.doctorSpeciality} numberOfLines={1} ellipsizeMode="tail">
												{(appt.doctor as any)?.specialty || (appt.doctor as any)?.speciality || 'General Medicine'}
											</Text>
										</View>

										{/* Status Pill Badge */}
										<View style={styles.statusBadgeContainer}>
											{hasOnward && hasReturn ? (
												<View style={[styles.statusBadge, styles.badgeSuccess]}>
													<MaterialCommunityIcons name="check-circle-outline" size={12} color="#2e7d32" />
													<Text style={styles.badgeSuccessText}>Round Trip</Text>
												</View>
											) : hasOnward ? (
												<View style={[styles.statusBadge, styles.badgeWarning]}>
													<MaterialCommunityIcons name="car-clock" size={12} color="#ed6c02" />
													<Text style={styles.badgeWarningText}>Onward Booked</Text>
												</View>
											) : (
												<View style={[styles.statusBadge, styles.badgeDefault]}>
													<MaterialCommunityIcons name="car-off" size={12} color="#64748b" />
													<Text style={styles.badgeDefaultText}>No Ride</Text>
												</View>
											)}
										</View>
									</View>

									{/* Hospital Location Row */}
									<View style={styles.locationRow}>
										<MaterialCommunityIcons name="map-marker-outline" size={15} color="#0c7c7c" />
										<Text style={styles.locationText} numberOfLines={1} ellipsizeMode="tail">
											{appt.hospital?.name || appt.hospital?.address || 'Apollo Hospital, Bengaluru'}
										</Text>
									</View>

									<View style={styles.divider} />

									{/* Sleek Modern Date & Time Bar */}
									<View style={styles.dateTimeBar}>
										<View style={styles.dateTimeItem}>
											<MaterialCommunityIcons name="calendar-month-outline" size={15} color="#0c7c7c" />
											<Text style={styles.dateTimeText}>{formatDate(appt.appointment_date)}</Text>
										</View>
										<View style={styles.dateTimeDot} />
										<View style={styles.dateTimeItem}>
											<MaterialCommunityIcons name="clock-outline" size={15} color="#0c7c7c" />
											<Text style={styles.dateTimeText}>{formatTime(appt.start_time)}</Text>
										</View>
									</View>

									{/* Responsive Action Buttons Section */}
									<View style={styles.actionContainer}>
										{!hasOnward && !hasReturn ? (
											<TouchableOpacity
												style={styles.fullTouchBtn}
												activeOpacity={0.8}
												onPress={() =>
													navigation.navigate(ROUTES.STACK.BOOK_RIDE, {
														appointmentId: apptId,
														type: 'onward',
													})
												}
											>
												<MaterialCommunityIcons name="car" size={18} color="#ffffff" style={{ marginRight: 6 }} />
												<Text style={styles.fullTouchBtnText}>Book a Cab</Text>
											</TouchableOpacity>
										) : hasOnward && !hasReturn ? (
											<View style={styles.dualActionRow}>
												<TouchableOpacity
													style={styles.halfTouchBtnOutlined}
													activeOpacity={0.8}
													onPress={() =>
														navigation.navigate(ROUTES.STACK.RIDE_TRACKING, {
															appointmentId: apptId,
														})
													}
												>
													<Text style={styles.halfTouchOutlinedText}>Track Onward</Text>
												</TouchableOpacity>
												<TouchableOpacity
													style={styles.halfTouchBtnContained}
													activeOpacity={0.8}
													onPress={() =>
														navigation.navigate(ROUTES.STACK.BOOK_RIDE, {
															appointmentId: apptId,
															type: 'return',
														})
													}
												>
													<Text style={styles.halfTouchContainedText}>Book Return</Text>
												</TouchableOpacity>
											</View>
										) : (
											<TouchableOpacity
												style={styles.fullTouchBtnOutlined}
												activeOpacity={0.8}
												onPress={() =>
													navigation.navigate(ROUTES.STACK.RIDE_TRACKING, {
														appointmentId: apptId,
													})
												}
											>
												<MaterialCommunityIcons name="navigation" size={16} color="#0c7c7c" style={{ marginRight: 6 }} />
												<Text style={styles.fullTouchOutlinedText}>Track Cabs</Text>
											</TouchableOpacity>
										)}
									</View>

									{/* Dev Reset Controls */}
									{(hasOnward || hasReturn) && (
										<View style={styles.devCardRow}>
											<Text style={styles.devTag}>DEV RESET:</Text>
											{hasOnward && (
												<TouchableOpacity
													style={styles.devClearBtn}
													onPress={() => handleDevClearRide(apptId, 'onward')}
												>
													<Text style={styles.devClearTxt}>Clear Onward</Text>
												</TouchableOpacity>
											)}
											{hasReturn && (
												<TouchableOpacity
													style={styles.devClearBtn}
													onPress={() => handleDevClearRide(apptId, 'return')}
												>
													<Text style={styles.devClearTxt}>Clear Return</Text>
												</TouchableOpacity>
											)}
										</View>
									)}
								</Card.Content>
							</Card>
						)
					})
				)}

				{/* Dev Helper Card at Bottom */}
				<View style={styles.devHelperCard}>
					<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
						<MaterialCommunityIcons name="developer-board" size={18} color="#d32f2f" />
						<Text style={styles.devHelperTitle}>Dev Testing Helper: Reset Storage</Text>
					</View>
					<Text style={styles.devHelperSub}>
						Wipe all locally stored cab bookings in AsyncStorage for testing booking flows.
					</Text>
					<Button
						mode="outlined"
						textColor="#d32f2f"
						style={{ borderColor: '#d32f2f', marginTop: 10, borderRadius: 8 }}
						labelStyle={{ fontSize: 12, fontWeight: '700' }}
						onPress={handleDevClearAll}
					>
						Clear All Local Rides
					</Button>
				</View>
			</ScrollView>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f8fafc',
	},
	scrollContent: {
		padding: 16,
		paddingBottom: 90,
	},
	heroBanner: {
		backgroundColor: '#0c7c7c',
		borderRadius: 20,
		padding: 20,
		marginBottom: 16,
		elevation: 4,
		shadowColor: '#0c7c7c',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.2,
		shadowRadius: 8,
	},
	heroBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: 'rgba(255, 255, 255, 0.2)',
		alignSelf: 'flex-start',
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 12,
		marginBottom: 10,
		gap: 6,
	},
	heroBadgeText: {
		color: '#ffffff',
		fontSize: 11,
		fontWeight: '700',
	},
	heroTitle: {
		color: '#ffffff',
		fontSize: 22,
		fontWeight: '800',
		marginBottom: 6,
	},
	heroSubtitle: {
		color: 'rgba(255, 255, 255, 0.9)',
		fontSize: 13,
		lineHeight: 18,
	},
	noticeCard: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: 'rgba(12, 124, 124, 0.08)',
		padding: 12,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: 'rgba(12, 124, 124, 0.2)',
		marginBottom: 20,
		gap: 10,
	},
	noticeText: {
		flex: 1,
		fontSize: 12.5,
		color: '#0c7c7c',
		fontWeight: '600',
	},
	sectionHeader: {
		marginBottom: 12,
	},
	sectionTitle: {
		fontSize: 15,
		fontWeight: '800',
		color: '#1e293b',
	},
	errorContainer: {
		alignItems: 'center',
		padding: 24,
		backgroundColor: '#ffffff',
		borderRadius: 16,
	},
	errorText: {
		color: '#d32f2f',
		fontSize: 14,
	},
	emptyState: {
		alignItems: 'center',
		padding: 32,
		backgroundColor: '#ffffff',
		borderRadius: 16,
		borderWidth: 1,
		borderColor: '#e2e8f0',
		borderStyle: 'dashed',
	},
	emptyTitle: {
		fontSize: 16,
		fontWeight: '700',
		color: '#334155',
		marginTop: 12,
	},
	emptySubtitle: {
		fontSize: 12,
		color: '#64748b',
		textAlign: 'center',
		marginTop: 4,
		lineHeight: 18,
	},
	apptCard: {
		backgroundColor: '#ffffff',
		borderRadius: 16,
		marginBottom: 16,
		elevation: 2,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.04,
		shadowRadius: 8,
		borderWidth: 1,
		borderColor: '#eaecf0',
	},
	cardContent: {
		padding: 16,
	},
	cardTopRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 10,
	},
	doctorAvatar: {
		width: 44,
		height: 44,
		borderRadius: 22,
		backgroundColor: '#0c7c7c',
		justifyContent: 'center',
		alignItems: 'center',
	},
	avatarChar: {
		color: '#ffffff',
		fontSize: 18,
		fontWeight: 'bold',
	},
	doctorTextContainer: {
		flex: 1,
		marginLeft: 12,
		marginRight: 8,
	},
	doctorName: {
		fontSize: 15,
		fontWeight: '700',
		color: '#0f172a',
	},
	doctorSpeciality: {
		fontSize: 12.5,
		color: '#0c7c7c',
		fontWeight: '600',
		marginTop: 2,
	},
	statusBadgeContainer: {
		alignSelf: 'flex-start',
	},
	statusBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 6,
		gap: 4,
	},
	badgeSuccess: {
		backgroundColor: '#e8f5e9',
		borderWidth: 1,
		borderColor: '#a5d6a7',
	},
	badgeSuccessText: {
		color: '#2e7d32',
		fontSize: 10.5,
		fontWeight: '700',
	},
	badgeWarning: {
		backgroundColor: '#fff3e0',
		borderWidth: 1,
		borderColor: '#ffe0b2',
	},
	badgeWarningText: {
		color: '#ed6c02',
		fontSize: 10.5,
		fontWeight: '700',
	},
	badgeDefault: {
		backgroundColor: '#f1f5f9',
		borderWidth: 1,
		borderColor: '#cbd5e1',
	},
	badgeDefaultText: {
		color: '#64748b',
		fontSize: 10.5,
		fontWeight: '700',
	},
	locationRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 2,
		gap: 4,
	},
	locationText: {
		flex: 1,
		fontSize: 12.5,
		fontWeight: '500',
		color: '#475569',
	},
	divider: {
		height: 1,
		backgroundColor: '#f1f5f9',
		marginVertical: 12,
	},
	dateTimeBar: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#f8fafc',
		borderRadius: 10,
		paddingHorizontal: 12,
		paddingVertical: 10,
		marginBottom: 14,
		borderWidth: 1,
		borderColor: '#f1f5f9',
	},
	dateTimeItem: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	dateTimeText: {
		fontSize: 12.5,
		fontWeight: '600',
		color: '#1e293b',
	},
	dateTimeDot: {
		width: 4,
		height: 4,
		borderRadius: 2,
		backgroundColor: '#94a3b8',
		marginHorizontal: 12,
	},
	actionContainer: {
		marginTop: 2,
	},
	fullTouchBtn: {
		backgroundColor: '#0c7c7c',
		height: 44,
		borderRadius: 10,
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		width: '100%',
		paddingHorizontal: 12,
	},
	fullTouchBtnText: {
		color: '#ffffff',
		fontSize: 13.5,
		fontWeight: '700',
	},
	fullTouchBtnOutlined: {
		backgroundColor: '#ffffff',
		borderWidth: 1.5,
		borderColor: '#0c7c7c',
		height: 44,
		borderRadius: 10,
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		width: '100%',
		paddingHorizontal: 12,
	},
	fullTouchOutlinedText: {
		color: '#0c7c7c',
		fontSize: 13.5,
		fontWeight: '700',
	},
	dualActionRow: {
		flexDirection: 'row',
		gap: 8,
		width: '100%',
	},
	halfTouchBtnOutlined: {
		flex: 1,
		backgroundColor: '#ffffff',
		borderWidth: 1.5,
		borderColor: '#0c7c7c',
		height: 44,
		borderRadius: 10,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 6,
	},
	halfTouchOutlinedText: {
		color: '#0c7c7c',
		fontSize: 12.5,
		fontWeight: '700',
	},
	halfTouchBtnContained: {
		flex: 1,
		backgroundColor: '#0c7c7c',
		height: 44,
		borderRadius: 10,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 6,
	},
	halfTouchContainedText: {
		color: '#ffffff',
		fontSize: 12.5,
		fontWeight: '700',
	},
	devCardRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 10,
		paddingTop: 8,
		borderTopWidth: 1,
		borderTopColor: '#f1f5f9',
		gap: 8,
	},
	devTag: {
		fontSize: 10,
		fontWeight: '700',
		color: '#d32f2f',
	},
	devClearBtn: {
		backgroundColor: '#fef2f2',
		paddingHorizontal: 8,
		paddingVertical: 3,
		borderRadius: 6,
		borderWidth: 1,
		borderColor: '#fecaca',
	},
	devClearTxt: {
		fontSize: 10,
		fontWeight: '700',
		color: '#dc2626',
	},
	devHelperCard: {
		backgroundColor: '#fef2f2',
		borderRadius: 12,
		padding: 14,
		borderWidth: 1,
		borderColor: '#fecaca',
		borderStyle: 'dashed',
		marginTop: 8,
	},
	devHelperTitle: {
		fontSize: 13,
		fontWeight: '700',
		color: '#dc2626',
	},
	devHelperSub: {
		fontSize: 11,
		color: '#7f1d1d',
		lineHeight: 16,
	},
})
