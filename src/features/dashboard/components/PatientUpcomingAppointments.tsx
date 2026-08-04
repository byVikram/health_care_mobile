import React, { useEffect, useMemo, useState } from 'react'
import {
	ActivityIndicator,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
	useWindowDimensions,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useNavigation, type NavigationProp } from '@react-navigation/native'
import { getAppointments } from '../../doctor/doctorService'
import MobileAppointmentCard from '../../appointment/components/MobileAppointmentCard'
import type { Appointment } from '../../../types/appointment'
import { ROUTES } from '../../../navigation/routes'
import type { RootStackParamList } from '../../../navigation/types'


export type PatientAppointmentStatus = 'confirmed' | 'pending' | 'cancelled' | 'completed' | 'rescheduled' | string
export type PatientAppointmentMode = 'in-person' | 'virtual'

type ApiAppointment = Appointment & {
	start_time?: string
	end_time?: string
	appointment_time?: string
	public_id?: string
}

export type PatientAppointmentItem = {
	id: string
	doctorName: string
	doctorAvatar?: string
	consultationType: string
	rating: number
	qualifications: string
	dateLabel: string
	timeLabel: string
	mode: PatientAppointmentMode
	hospitalName: string
	address: string
	status: PatientAppointmentStatus
	doctorId?: string
	hospitalId?: string
	appointmentDate?: string
	startTime?: string
	endTime?: string | null
	raw?: ApiAppointment
}

type PatientUpcomingAppointmentsProps = {
	appointments?: PatientAppointmentItem[]
	onJoin?: (appointment: PatientAppointmentItem) => void
	refreshToken?: number
	onRefreshComplete?: () => void
}

const formatDate = (dateStr?: string) => {
	if (!dateStr) return '-'
	const date = new Date(dateStr)
	if (Number.isNaN(date.getTime())) return dateStr
	return date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'long' })
}

const formatTime = (timeStr?: string) => {
	if (!timeStr) return '-'
	const [h, m] = timeStr.split(':').map(Number)
	if (!Number.isFinite(h) || !Number.isFinite(m)) return timeStr
	const suffix = h >= 12 ? 'PM' : 'AM'
	const hour = h > 12 ? h - 12 : h === 0 ? 12 : h
	return `${String(hour).padStart(2, '0')}:${String(m).padStart(2, '0')} ${suffix}`
}

const getStatusValue = (status: ApiAppointment['status'] | PatientAppointmentStatus) =>
	typeof status === 'string' ? status : status?.label ?? 'pending'

const getStartTime = (appointment: ApiAppointment) =>
	appointment.start_time || appointment.appointment_time || ''

const mapApiAppointment = (appointment: ApiAppointment): PatientAppointmentItem => {
	const status = getStatusValue(appointment.status)
	const appointmentMode = appointment.appointment_mode?.toLowerCase()
	const isVirtual = appointmentMode === 'online' || appointmentMode === 'video_call'
	const hospitalAddress = appointment.hospital?.address ?? ''
	const avatar = appointment.doctor?.avatar_s3_key || 
	               (appointment.doctor as any)?.avatar_url || 
	               (appointment.doctor as any)?.avatar || 
	               (appointment.doctor as any)?.profile_picture || 
	               (appointment.doctor as any)?.photo_url || 
	               (appointment.doctor as any)?.image_url;

	return {
		id: appointment.id,
		doctorName: appointment.doctor?.name ?? 'Doctor',
		doctorAvatar: avatar ?? undefined,
		consultationType: 'Consultation',
		rating: 4.8,
		qualifications: '',
		dateLabel: formatDate(appointment.appointment_date),
		timeLabel: formatTime(getStartTime(appointment)),
		mode: isVirtual ? 'virtual' : 'in-person',
		hospitalName: appointment.hospital?.name ?? (isVirtual ? 'Virtual consultation' : 'Hospital'),
		address: hospitalAddress?.split(',')[0] || hospitalAddress || '-',
		status,
		doctorId: appointment.doctor?.id,
		hospitalId: appointment.hospital?.id,
		appointmentDate: appointment.appointment_date,
		startTime: getStartTime(appointment),
		endTime: appointment.end_time ?? null,
		raw: appointment,
	}
}

export default function PatientUpcomingAppointments({
	appointments,
	refreshToken,
	onRefreshComplete,
}: PatientUpcomingAppointmentsProps) {
	const navigation = useNavigation<NavigationProp<RootStackParamList>>()
	const { width } = useWindowDimensions()
	const isTablet = width >= 768
	const shouldFetchAppointments = appointments === undefined

	const [apiAppointments, setApiAppointments] = useState<ApiAppointment[]>([])
	const [loading, setLoading] = useState(shouldFetchAppointments)
	const [error, setError] = useState('')

	useEffect(() => {
		let mounted = true

		const fetchData = async () => {
			try {
				if (!shouldFetchAppointments) {
					onRefreshComplete?.()
					return
				}

				setLoading(true)
				setError('')

				const apptRes = await getAppointments({ limit: 10, variant: 'upcoming' })

				if (!mounted) return

				if (apptRes.success) {
					setApiAppointments(Array.isArray(apptRes.data) ? (apptRes.data as ApiAppointment[]) : [])
				} else {
					setError(apptRes.message ?? 'Failed to load appointments')
				}
			} catch {
				if (mounted && shouldFetchAppointments) setError('Failed to load appointments')
			} finally {
				if (mounted) {
					setLoading(false)
					onRefreshComplete?.()
				}
			}
		}

		void fetchData()

		return () => {
			mounted = false
		}
	}, [shouldFetchAppointments, refreshToken, onRefreshComplete])

	const displayedAppointments = useMemo(() => {
		if (appointments) return appointments
		return apiAppointments.map(mapApiAppointment)
	}, [apiAppointments, appointments])

	const handleSeeAll = () => {
		navigation.navigate(ROUTES.STACK.APPOINTMENTS)
	}


	return (
		<View style={[styles.section, isTablet && styles.sectionTablet]}>
			<View style={styles.sectionHeader}>
				<Text style={styles.sectionTitle}>Upcoming Appointments</Text>
				<View style={styles.headerActions}>
					<View style={styles.countBadge}>
						<Text style={styles.countBadgeText}>{displayedAppointments.length}</Text>
					</View>
					<TouchableOpacity onPress={handleSeeAll} activeOpacity={0.75} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
						<Text style={styles.seeAllText}>See All</Text>
					</TouchableOpacity>
				</View>
			</View>
			<Text style={styles.sectionSubtitle}>Manage your upcoming healthcare visits</Text>

			{loading ? (
				<View style={styles.loadingBox}>
					<ActivityIndicator size="small" color="#0c7c7c" />
				</View>
			) : null}

			{!loading && error ? <Text style={styles.stateTextError}>{error}</Text> : null}

			{!loading && !error && displayedAppointments.length === 0 ? (
				<Text style={styles.stateText}>No upcoming appointments.</Text>
			) : null}

			{!loading && !error
				? displayedAppointments.map((appointment) => (
						<MobileAppointmentCard key={appointment.id} row={appointment} horizontalInset={16} />
					))
				: null}

		</View>
	)
}

const styles = StyleSheet.create({
	section: {
		marginTop: 4,
		marginBottom: 12,
	},
	sectionTablet: {
		maxWidth: 560,
		width: '100%',
		alignSelf: 'center',
	},
	sectionHeader: {
		marginHorizontal: 16,
		marginBottom: 4,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	sectionTitle: {
		flex: 1,
		fontSize: 18,
		fontWeight: '700',
		color: '#1D2B36',
	},
	headerActions: {
		flexDirection: 'row',
		alignItems: 'center',
		marginLeft: 12,
		gap: 10,
	},
	sectionSubtitle: {
		marginHorizontal: 16,
		marginBottom: 12,
		fontSize: 12,
		color: '#667B8F',
	},
	countBadge: {
		minWidth: 24,
		height: 24,
		borderRadius: 12,
		backgroundColor: '#0c7c7c',
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 8,
	},
	countBadgeText: {
		color: '#ffffff',
		fontSize: 12,
		fontWeight: '700',
	},
	seeAllText: {
		color: '#0c7c7c',
		fontSize: 13,
		fontWeight: '700',
	},
	loadingBox: {
		minHeight: 120,
		alignItems: 'center',
		justifyContent: 'center',
	},
	stateText: {
		marginHorizontal: 16,
		paddingVertical: 24,
		textAlign: 'center',
		color: '#667B8F',
		fontSize: 14,
	},
	stateTextError: {
		marginHorizontal: 16,
		paddingVertical: 24,
		textAlign: 'center',
		color: '#ef4444',
		fontSize: 14,
	},

})
