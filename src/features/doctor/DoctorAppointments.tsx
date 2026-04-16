import React, { useEffect, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, useWindowDimensions, Alert, Modal } from 'react-native'
import Toast from 'react-native-toast-message'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { AppSkeleton } from '../../components/common'
import {
	getDoctorAvailability,
	updateAppointmentsStatus,
	rescheduleAppointment,
	getDoctorById,
	getDoctorProfile,
} from './doctorService'
import { DateSlotPicker } from '../../components/common'
import { APPOINTMENT_STATUS } from '../../constants/constants'

type Appointment = {
	id: string
	doctor?: { id?: string }
	doctor_id?: string
	hospital?: { id?: string }
	hospital_id?: string
	patient: {
		id: string
		name: string
		age: number
		gender: string
		sex?: string
	}
	age?: number
	gender?: string
	sex?: string
	status: string | { label: string }
	appointment_time: string
	appointment_end_time?: string
	end_time?: string
}

const actionButtons: {
	label: string
	bg: string
	color: string
	action: string
	icon: keyof typeof MaterialCommunityIcons.glyphMap
}[] = [
	{
		label: 'Confirm',
		bg: '#d6eed8',
		color: '#2e8b57',
		action: 'confirm',
		icon: 'check',
	},
	{
		label: 'Reject',
		bg: '#f8dddd',
		color: '#d84545',
		action: 'reject',
		icon: 'close',
	},
	{
		label: 'Reschedule',
		bg: '#f8e8c6',
		color: '#d08a0a',
		action: 'reschedule',
		icon: 'refresh',
	},
	{
		label: 'Refer',
		bg: '#dbe2f5',
		color: '#4d6bb1',
		action: 'refer',
		icon: 'account-multiple-outline',
	},
]

const showSuccess = (message: string) => {
	Toast.show({
		type: 'success',
		text1: 'Success',
		text2: message,
	})
}

const showError = (message: string) => {
	Toast.show({
		type: 'error',
		text1: 'Error',
		text2: message,
	})
}

type DoctorAppointmentsProps = {
	selectedDate: number
	setSelectedDate: (i: number) => void
	appointments: Appointment[]
	apptLoading: boolean
	apptError: string
	weekDays: { day: string; date: string; red: boolean; dateObj: Date }[]
	selectedDateObj: Date
}

const TEAL = '#1a8c8c'

export default function DoctorAppointments({
	selectedDate,
	setSelectedDate,
	appointments,
	apptLoading,
	apptError,
	weekDays,
	selectedDateObj,
}: DoctorAppointmentsProps) {
	const { width } = useWindowDimensions()
	const isTablet = width >= 768
	const useCompactCancelledLayout = width < 640
	const navigation = useNavigation<any>()
	const [rescheduleOpen, setRescheduleOpen] = useState(false)
	const [rescheduleAppt, setRescheduleAppt] = useState<Appointment | null>(null)
	const [rescheduleDate, setRescheduleDate] = useState<Date>(new Date())
	const [selectedSlot, setSelectedSlot] = useState('')
	const [rescheduleSlots, setRescheduleSlots] = useState<any[]>([])
	const [rescheduleSlotsLoading, setRescheduleSlotsLoading] = useState(false)
	const [rescheduleHospitals, setRescheduleHospitals] = useState<any[]>([])
	const [rescheduleHospitalId, setRescheduleHospitalId] = useState<string>('')

	// ── Helpers ───────────────────────────────────────────────────────────────
	const getStatusLabel = (status: any) => (typeof status === 'string' ? status : (status?.label ?? 'pending'))
	const formatStatus = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
	const getPatientAge = (apt: any) => apt?.patient?.age ?? apt?.age ?? '--'
	const getPatientGender = (apt: any) => apt?.patient?.gender ?? apt?.patient?.sex ?? apt?.gender ?? '--'
	const getTimeRange = (apt: any) => {
		const start = apt?.start_time
		const end = apt?.end_time ?? apt?.end_time
		if (start && end) return `${start} - ${end}`
		return start ?? '--'
	}
	const buildRescheduleSlots = (apt: any) => {
		const current = getTimeRange(apt)
		const fallback = ['09:00 - 09:30', '10:00 - 10:30', '11:00 - 11:30', '04:00 - 04:30', '05:00 - 05:30']
		return Array.from(new Set([current, ...fallback].filter(Boolean)))
	}
	const handleOpenReschedule = (apt: Appointment) => {
		setRescheduleAppt(apt)
		setRescheduleDate(new Date())
		setRescheduleSlots([])
		setSelectedSlot('')
		setRescheduleHospitalId(apt?.hospital?.id ?? (apt as any)?.hospital_id ?? '')
		setRescheduleHospitals([])
		setRescheduleOpen(true)
	}
	const handleConfirmReschedule = async () => {
		if (!selectedSlot) {
			Alert.alert('Select time', 'Please select a slot to reschedule.')
			return
		}

		if (!rescheduleAppt || !rescheduleDate) return

		const doctorId = rescheduleAppt?.doctor?.id ?? (rescheduleAppt as any)?.doctor_id
		const hospitalId =
			rescheduleHospitalId || (rescheduleAppt?.hospital?.id ?? (rescheduleAppt as any)?.hospital_id)
		const dateStr = rescheduleDate.toISOString().split('T')[0]

		if (!hospitalId || !dateStr) {
			showError('Missing appointment details for reschedule.')
			return
		}

		setRescheduleSlotsLoading(true)
		try {
			const start_time = selectedSlot
			const end_time = null

			const res = await rescheduleAppointment({
				appointment_id: rescheduleAppt.id,
				appointment_date: dateStr,
				start_time,
				end_time,
				hospital_id: hospitalId,
				reason: 'Doctor unavailable',
			})

			if (res.success) {
				showSuccess(res.message || 'Reschedule request submitted')
				setRescheduleOpen(false)
			} else {
				showError(res.message || 'Reschedule failed. Please try again.')
			}
		} catch {
			showError('Something went wrong. Please try again.')
		} finally {
			setRescheduleSlotsLoading(false)
		}
	}

	useEffect(() => {
		if (!rescheduleAppt || !rescheduleOpen) return

		const doctorId = rescheduleAppt?.doctor?.id ?? (rescheduleAppt as any)?.doctor_id

		const fetchHospitals = async () => {
			try {
				let hData = []
				if (doctorId) {
					const res = await getDoctorById(doctorId)
					if (res.success && res.data) {
						hData = res.data.hospitals || []
					}
				} else {
					const res = await getDoctorProfile()
					if (res.success && res.data) {
						hData = res.data.hospitals || []
					}
				}

				setRescheduleHospitals(hData)
				if (!rescheduleHospitalId && hData.length > 0) {
					setRescheduleHospitalId(hData[0].hospital.id)
				}
			} catch (e) {
				console.log('Failed to fetch doctor hospitals')
			}
		}
		fetchHospitals()
	}, [rescheduleAppt, rescheduleOpen])

	useEffect(() => {
		if (!rescheduleOpen || !rescheduleAppt) return

		const doctorId = rescheduleAppt?.doctor?.id ?? (rescheduleAppt as any)?.doctor_id
		const hospitalId =
			rescheduleHospitalId || (rescheduleAppt?.hospital?.id ?? (rescheduleAppt as any)?.hospital_id)
		const dateStr = rescheduleDate.toISOString().split('T')[0]

		if (!hospitalId || !dateStr) {
			setRescheduleSlots([])
			setSelectedSlot('')
			return
		}

		const fetchSlots = async () => {
			try {
				setRescheduleSlotsLoading(true)
				setRescheduleSlots([])
				setSelectedSlot('')

				const responseData = await getDoctorAvailability({
					doctor_id: doctorId,
					hospital_id: hospitalId,
					date: dateStr,
				})

				const groups = Array.isArray(responseData)
					? responseData
					: Array.isArray((responseData as any)?.data)
						? (responseData as any).data
						: []

				setRescheduleSlots(groups)
			} catch {
				setRescheduleSlots([])
				setSelectedSlot('')
			} finally {
				setRescheduleSlotsLoading(false)
			}
		}

		fetchSlots()
	}, [rescheduleOpen, rescheduleAppt, rescheduleDate, weekDays, rescheduleHospitalId])

	const handleAction = async (action: string, appointmentId: string) => {
		try {
			if (action === 'confirm') {
				const res = await updateAppointmentsStatus(appointmentId, APPOINTMENT_STATUS.CONFIRM)
				if (res.success) {
					showSuccess(res.message)
				}
			}
			if (action === 'reject') {
				const res = await updateAppointmentsStatus(appointmentId, APPOINTMENT_STATUS.REJECT)
				if (res.success) {
					showSuccess(res.message)
				}
			}
			if (action === 'reschedule') {
				const apt = appointments.find((a: any) => a.id === appointmentId)
				if (apt) handleOpenReschedule(apt)
			}
			if (action === 'refer') {
				alert('Refer coming soon!')
			}
		} catch {
			showError('Something went wrong')
		}
	}

	// ── Card press navigation ────────────────────────────────────────────────
	const handleCardPress = (apt: any) => {
		const patientId = apt.patient?.id || apt.patient?.patient_id || apt.patient?.public_id || apt.patient_public_id

		console.log('Appointment data:', apt)
		console.log('Patient ID found:', patientId)

		if (!patientId) {
			Alert.alert('Error', 'Patient ID not found for this appointment')
			return
		}

		// Pass the full patient object from the appointment
		navigation.navigate('Consultation', {
			patient_id: patientId,
			appointmentId: apt.id,
			patient: apt.patient,
		})
	}

	// ── Skeleton ──────────────────────────────────────────────────────────────
	const renderSkeleton = () =>
		Array.from({ length: 3 }).map((_, i) => (
			<View key={`sk-${i}`} style={styles.card}>
				<View style={isTablet ? styles.tabletCardInner : undefined}>
					<View style={styles.skeletonNameRow}>
						<AppSkeleton width={24} height={24} borderRadius={6} />
						<AppSkeleton width={110} height={16} borderRadius={6} />
						<AppSkeleton width={72} height={16} borderRadius={999} />
					</View>
					<View style={[styles.skeletonMetaRow, { marginTop: 8 }]}>
						<AppSkeleton width={14} height={14} borderRadius={7} />
						<AppSkeleton width="80%" height={13} borderRadius={6} />
					</View>
					{isTablet && (
						<View style={styles.skeletonActionsRow}>
							{[0, 1, 2, 3].map((j) => (
								<AppSkeleton
									key={j}
									width={52}
									height={44}
									borderRadius={6}
									style={{ marginRight: 8 }}
								/>
							))}
						</View>
					)}
				</View>
			</View>
		))

	// ── Action buttons ────────────────────────────────────────────────────────
	const renderActions = (apt: any) => (
		<View style={[styles.actions, isTablet && styles.actionsTablet]}>
			{actionButtons.map((btn, i) => (
				<TouchableOpacity
					key={i}
					onPress={(e) => {
						e.stopPropagation?.()
						handleAction(btn.action, apt.id)
					}}
					style={[styles.btn, { backgroundColor: btn.bg }]}
					activeOpacity={0.75}
				>
					<MaterialCommunityIcons name={btn.icon} size={16} color={btn.color} />
					<Text style={[styles.btnLabel, { color: btn.color }]}>{btn.label}</Text>
				</TouchableOpacity>
			))}
			<TouchableOpacity style={styles.chevronBtn} activeOpacity={0.7} onPress={() => handleCardPress(apt)}>
				<MaterialCommunityIcons name="chevron-right" size={26} color={TEAL} />
			</TouchableOpacity>
		</View>
	)

	const renderCancelledNotice = () => (
		<View style={styles.cancelNoticeBox}>
			<MaterialCommunityIcons name="close-thick" size={34} color="#df4a4a" />
			<Text style={styles.cancelNoticeText}>Patient has cancelled the appointment</Text>
		</View>
	)

	const renderRescheduleDrawer = () => (
		<Modal
			visible={rescheduleOpen}
			transparent
			animationType="slide"
			onRequestClose={() => setRescheduleOpen(false)}
		>
			<TouchableOpacity activeOpacity={1} style={styles.drawerBackdrop} onPress={() => setRescheduleOpen(false)}>
				<TouchableOpacity activeOpacity={1} style={styles.drawerSheet} onPress={() => {}}>
					<View style={styles.drawerHeader}>
						<View>
							<Text style={styles.drawerTitle}>Reschedule Appointment</Text>
							<Text style={styles.drawerSubtitle}>{rescheduleAppt?.patient?.name ?? 'Patient'}</Text>
						</View>
						<TouchableOpacity style={styles.drawerCloseBtn} onPress={() => setRescheduleOpen(false)}>
							<MaterialCommunityIcons name="close" size={18} color="#7a848d" />
						</TouchableOpacity>
					</View>

					<ScrollView
						style={styles.drawerBody}
						contentContainerStyle={styles.drawerBodyContent}
						showsVerticalScrollIndicator={false}
					>
						<Text style={styles.drawerSectionTitle}>Select Hospital</Text>
						{rescheduleHospitals.length === 0 ? (
							<Text style={styles.drawerInfoText}>Loading hospitals...</Text>
						) : (
							<View style={styles.hospitalList}>
								{rescheduleHospitals.map((hParam, index) => {
									const h = hParam?.hospital
									if (!h) return null
									const isSelected = rescheduleHospitalId === h.id
									return (
										<TouchableOpacity
											key={h.id}
											style={[styles.hospitalItem, isSelected && styles.hospitalItemActive]}
											onPress={() => setRescheduleHospitalId(h.id)}
										>
											<View
												style={[styles.hospitalIcon, isSelected && styles.hospitalIconActive]}
											>
												<Text style={styles.hospitalIconText}>{index + 1}</Text>
											</View>
											<View style={styles.hospitalTextCol}>
												<Text style={styles.hospitalName} numberOfLines={1}>
													{h.name}
												</Text>
												<Text style={styles.hospitalAddress} numberOfLines={2}>
													{h.address}
												</Text>
											</View>
											<MaterialCommunityIcons
												name={isSelected ? 'radiobox-marked' : 'radiobox-blank'}
												size={20}
												color={isSelected ? '#3d7b7b' : '#c1c7ce'}
											/>
										</TouchableOpacity>
									)
								})}
							</View>
						)}

						{/* Shared Date & Time Slot Picker */}
						<DateSlotPicker
							selectedDate={rescheduleDate}
							onDateChange={(date) => {
								setRescheduleDate(date)
								setSelectedSlot('')
							}}
							selectedTime={selectedSlot}
							onTimeChange={setSelectedSlot}
							availableSlots={rescheduleSlots}
							loading={rescheduleSlotsLoading}
						/>
					</ScrollView>

					<View style={styles.drawerActions}>
						<TouchableOpacity style={styles.drawerCancelBtn} onPress={() => setRescheduleOpen(false)}>
							<Text style={styles.drawerCancelBtnText}>Cancel</Text>
						</TouchableOpacity>
						<TouchableOpacity style={styles.drawerConfirmBtn} onPress={handleConfirmReschedule}>
							<Text style={styles.drawerConfirmBtnText}>Confirm</Text>
						</TouchableOpacity>
					</View>
				</TouchableOpacity>
			</TouchableOpacity>
		</Modal>
	)

	// ── Card ──────────────────────────────────────────────────────────────────
	const renderCard = (apt: any) => {
		const status = getStatusLabel(apt.status)
		const isCancelled = status === 'cancelled'

		const statusStyle =
			status === 'confirmed'
				? styles.pillConfirmed
				: status === 'cancelled'
					? styles.pillCancelled
					: styles.pillPending

		const statusTextStyle =
			status === 'confirmed'
				? styles.pillTextConfirmed
				: status === 'cancelled'
					? styles.pillTextCancelled
					: styles.pillTextPending

		if (isCancelled) {
			return (
				<TouchableOpacity
					key={apt.id}
					activeOpacity={0.85}
					onPress={() => handleCardPress(apt)}
					style={styles.card}
				>
					<View
						style={[
							styles.cancelledCardInner,
							useCompactCancelledLayout && styles.cancelledCardInnerCompact,
						]}
					>
						<View
							style={[
								styles.cancelledCardLeft,
								useCompactCancelledLayout && styles.cancelledCardLeftCompact,
							]}
						>
							<View style={styles.patientNameRow}>
								<View style={styles.patientIconBox}>
									<MaterialCommunityIcons name="home-heart" size={20} color="#2e7d32" />
								</View>
								<Text style={styles.name} numberOfLines={1}>
									{apt?.patient?.name || 'Unknown Patient'}
								</Text>
								<View style={[styles.pill, statusStyle]}>
									<Text style={[styles.pillText, statusTextStyle]}>{formatStatus(status)}</Text>
								</View>
							</View>
							<View style={styles.cancelledMetaRow}>
								<Text style={styles.subText}>
									{getPatientAge(apt)} years / {getPatientGender(apt)}
								</Text>
								<View style={styles.metaDot} />
								<MaterialCommunityIcons name="clock-time-three-outline" size={16} color="#9ea5ac" />
								<Text style={styles.subText}>{getTimeRange(apt)}</Text>
							</View>
						</View>
						<View
							style={[styles.cancelDivider, useCompactCancelledLayout && styles.cancelDividerCompact]}
						/>
						<View
							style={[
								styles.cancelledCardRight,
								!useCompactCancelledLayout &&
									!isTablet && {
										width: Math.max(230, Math.floor(width * 0.52)),
									},
								useCompactCancelledLayout && styles.cancelledCardRightCompact,
							]}
						>
							{renderCancelledNotice()}
						</View>
					</View>
				</TouchableOpacity>
			)
		}

		if (isTablet) {
			return (
				<TouchableOpacity
					key={apt.id}
					activeOpacity={0.85}
					onPress={() => handleCardPress(apt)}
					style={styles.card}
				>
					<View style={styles.tabletCardInner}>
						<View style={styles.tabletLeft}>
							<View style={styles.patientNameRow}>
								<View style={styles.patientIconBox}>
									<MaterialCommunityIcons name="home-heart" size={20} color="#2e7d32" />
								</View>
								<Text style={styles.name} numberOfLines={1}>
									{apt?.patient?.name || 'Unknown Patient'}
								</Text>
								<View style={[styles.pill, statusStyle]}>
									<Text style={[styles.pillText, statusTextStyle]}>{formatStatus(status)}</Text>
								</View>
							</View>
							<View style={styles.metaRow}>
								<MaterialCommunityIcons name="clock-time-three-outline" size={14} color="#5f6973" />
								<Text style={styles.subText}>
									{getPatientAge(apt)} yrs / {getPatientGender(apt)} | {getTimeRange(apt)}
								</Text>
							</View>
						</View>
						<View style={styles.tabletRight}>{renderActions(apt)}</View>
					</View>
				</TouchableOpacity>
			)
		}

		return (
			<TouchableOpacity
				key={apt.id}
				activeOpacity={0.85}
				onPress={() => handleCardPress(apt)}
				style={styles.card}
			>
				<View style={styles.patientNameRow}>
					<View style={styles.patientIconBox}>
						<MaterialCommunityIcons name="home-heart" size={20} color="#2e7d32" />
					</View>
					<Text style={styles.name} numberOfLines={1}>
						{apt?.patient?.name || 'Unknown Patient'}
					</Text>
					<View style={[styles.pill, statusStyle]}>
						<Text style={[styles.pillText, statusTextStyle]}>{formatStatus(status)}</Text>
					</View>
				</View>
				<View style={styles.metaRow}>
					<MaterialCommunityIcons name="clock-time-three-outline" size={14} color="#5f6973" />
					<Text style={styles.subText}>
						{getPatientAge(apt)} yrs / {getPatientGender(apt)} | {getTimeRange(apt)}
					</Text>
				</View>
				{renderActions(apt)}
			</TouchableOpacity>
		)
	}

	return (
		<View style={styles.container}>
			{/* Header */}
			<View style={styles.header}>
				<Text style={styles.heading}>Doctor Appointments</Text>
				<Text style={styles.month}>
					{selectedDateObj?.toLocaleDateString('en-US', {
						month: 'long',
						year: 'numeric',
					})}
				</Text>
			</View>

			{/* Week strip */}
			<ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.weekContainer}>
				{weekDays.map((d: any, i: number) => (
					<TouchableOpacity
						key={i}
						onPress={() => setSelectedDate(i)}
						style={[styles.dayBox, d.red && styles.weekendDayBox, selectedDate === i && styles.selectedDay]}
					>
						<Text
							style={[
								styles.dayText,
								d.red && styles.weekendText,
								selectedDate === i && styles.selectedText,
							]}
						>
							{d.day}
						</Text>
						<Text
							style={[
								styles.dateText,
								d.red && styles.weekendText,
								selectedDate === i && styles.selectedText,
							]}
						>
							{d.date}
						</Text>
					</TouchableOpacity>
				))}
			</ScrollView>

			{/* List */}
			<View style={styles.listContainer}>
				{apptLoading ? renderSkeleton() : null}
				{apptError ? <Text style={styles.error}>{apptError}</Text> : null}
				{!apptLoading && appointments.length === 0 && <Text style={styles.empty}>No appointments</Text>}
				{!apptLoading && appointments.map(renderCard)}
			</View>
			{renderRescheduleDrawer()}
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		paddingHorizontal: 16,
		paddingVertical: 12,
		backgroundColor: '#fff',
		borderRadius: 12,
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 8,
	},
	heading: { fontSize: 18, fontWeight: '700', color: '#253136' },
	month: { color: '#0c7c7c', fontWeight: '600', fontSize: 13 },
	weekContainer: { marginBottom: 12 },
	dayBox: {
		width: 64,
		height: 64,
		borderRadius: 8,
		marginRight: 10,
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: 1,
		borderColor: '#b8bec3',
	},
	weekendDayBox: { borderColor: '#efb2b2', backgroundColor: '#fff9f9' },
	selectedDay: { backgroundColor: '#2d7679', borderColor: '#2d7679' },
	dayText: { fontSize: 12, color: '#6f7680', marginBottom: 2 },
	dateText: {
		fontSize: 16,
		fontWeight: '700',
		color: '#2c3136',
		lineHeight: 32,
	},
	selectedText: { color: '#fff' },
	weekendText: { color: '#e25555' },
	listContainer: { marginTop: 2 },
	card: {
		padding: 12,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: '#d6dbde',
		marginBottom: 10,
		backgroundColor: '#fff',
	},
	tabletCardInner: { flexDirection: 'row', alignItems: 'center', gap: 12 },
	tabletLeft: { flex: 1, minWidth: 0 },
	tabletRight: { flexShrink: 0 },
	cancelledCardInner: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	cancelledCardInnerCompact: {
		flexDirection: 'column',
		alignItems: 'stretch',
		justifyContent: 'flex-start',
	},
	cancelledCardLeft: { flex: 1, minWidth: 0, paddingRight: 12 },
	cancelledCardLeftCompact: { paddingRight: 0 },
	cancelledCardRight: { width: 250, paddingLeft: 12 },
	cancelledCardRightCompact: { width: '100%', paddingLeft: 0 },
	patientNameRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		marginBottom: 4,
	},
	patientIconBox: {
		width: 28,
		height: 28,
		borderRadius: 6,
		backgroundColor: '#e8f4ea',
		alignItems: 'center',
		justifyContent: 'center',
	},
	name: { fontSize: 15, fontWeight: '600', color: '#2a2f34', flex: 1 },
	pill: {
		paddingHorizontal: 10,
		paddingVertical: 2,
		borderRadius: 999,
		minWidth: 68,
		alignItems: 'center',
	},
	pillPending: { backgroundColor: '#f8df8d' },
	pillConfirmed: { backgroundColor: '#d6eed8' },
	pillCancelled: { backgroundColor: '#f8dddd' },
	pillText: { fontSize: 12, fontWeight: '600' },
	pillTextPending: { color: '#c48508' },
	pillTextConfirmed: { color: '#2e7d32' },
	pillTextCancelled: { color: '#d84545' },
	metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
	cancelledMetaRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		marginTop: 2,
		flexWrap: 'wrap',
	},
	metaDot: {
		width: 5,
		height: 5,
		borderRadius: 999,
		backgroundColor: '#cfd5d9',
	},
	subText: { fontSize: 13, color: '#5f6973', fontWeight: '500' },
	cancelDivider: {
		width: 1,
		alignSelf: 'stretch',
		backgroundColor: '#eceff2',
		marginHorizontal: 4,
	},
	cancelDividerCompact: {
		width: '100%',
		height: 1,
		alignSelf: 'auto',
		marginHorizontal: 0,
		marginVertical: 10,
	},
	cancelNoticeBox: {
		borderWidth: 1,
		borderColor: '#f08d8d',
		backgroundColor: '#fbeaea',
		borderRadius: 10,
		minHeight: 64,
		paddingHorizontal: 14,
		paddingVertical: 12,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	cancelNoticeText: {
		color: '#df4a4a',
		fontSize: 15,
		fontWeight: '500',
		lineHeight: 20,
		flex: 1,
		flexShrink: 1,
	},
	actions: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 10,
		flexWrap: 'wrap',
		gap: 6,
	},
	actionsTablet: { flexWrap: 'nowrap', marginTop: 0 },
	btn: {
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: 6,
		paddingVertical: 4,
		paddingHorizontal: 8,
		minWidth: 52,
	},
	btnLabel: {
		fontSize: 10,
		fontWeight: '500',
		textAlign: 'center',
		marginTop: 3,
	},
	chevronBtn: { marginLeft: 'auto', paddingLeft: 4 },
	skeletonNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
	skeletonMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
	skeletonActionsRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 10,
	},
	error: { color: 'red', fontSize: 13 },
	empty: { color: '#999', fontSize: 13 },
	drawerBackdrop: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.35)',
		justifyContent: 'flex-end',
		padding: 12,
	},
	drawerSheet: {
		backgroundColor: '#fff',
		borderRadius: 16,
		maxHeight: '80%',
		overflow: 'hidden',
		borderWidth: 1,
		borderColor: '#edf1f3',
		width: '100%',
		flexShrink: 1,
	},
	drawerHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingVertical: 14,
		borderBottomWidth: 1,
		borderBottomColor: '#e5eaee',
	},
	drawerCloseBtn: {
		width: 28,
		height: 28,
		borderRadius: 14,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#f3f6f8',
	},
	drawerBody: {
		flexShrink: 1,
	},
	drawerBodyContent: {
		paddingHorizontal: 16,
		paddingVertical: 14,
	},
	drawerTitle: { fontSize: 16, fontWeight: '700', color: '#233238' },
	drawerSubtitle: { fontSize: 12, color: '#62707a', marginTop: 2 },
	drawerSectionTitle: {
		fontSize: 14,
		color: '#2b3a40',
		fontWeight: '600',
		marginTop: 10,
		marginBottom: 10,
	},
	drawerDateRow: { paddingRight: 12, gap: 8 },
	drawerDateChip: {
		borderWidth: 1,
		borderColor: '#d7dfe4',
		borderRadius: 8,
		paddingVertical: 8,
		paddingHorizontal: 12,
		minWidth: 60,
		alignItems: 'center',
	},
	drawerDateChipActive: {
		borderColor: '#3d7b7b',
		backgroundColor: 'rgba(79, 209, 197, 0.08)',
	},
	drawerDateChipDay: { fontSize: 12, color: '#6d7881', fontWeight: '500' },
	drawerDateChipDate: {
		fontSize: 14,
		color: '#2c3136',
		fontWeight: '700',
		marginTop: 2,
	},
	drawerDateChipTextActive: { color: '#3d7b7b' },
	drawerDateChipTextActive: { color: '#3d7b7b' },
	hospitalList: { flexDirection: 'column', gap: 8 },
	hospitalItem: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		padding: 12,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#e5eaee',
		backgroundColor: '#fff',
	},
	hospitalItemActive: {
		borderColor: '#0c7c7c',
		backgroundColor: 'rgba(79, 209, 197, 0.06)',
	},
	hospitalIcon: {
		width: 26,
		height: 26,
		backgroundColor: '#0c7c7c',
		borderTopLeftRadius: 13,
		borderTopRightRadius: 13,
		borderBottomRightRadius: 13,
		borderBottomLeftRadius: 0,
		transform: [{ rotate: '-45deg' }],
		alignItems: 'center',
		justifyContent: 'center',
	},
	hospitalIconActive: {
		backgroundColor: '#3d7b7b',
	},
	hospitalIconText: {
		color: '#fff',
		fontSize: 12,
		fontWeight: '600',
		transform: [{ rotate: '45deg' }],
	},
	hospitalTextCol: { flex: 1 },
	hospitalName: { fontSize: 14, fontWeight: '600', color: '#233238' },
	hospitalAddress: { fontSize: 11, color: '#62707a', marginTop: 2 },

	slotsGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	slotItem: {
		width: '23%',
		borderWidth: 1.5,
		borderColor: '#dde3e8',
		borderRadius: 8,
		paddingVertical: 6,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#fff',
	},
	slotItemActive: {
		borderColor: '#0c7c7c',
		backgroundColor: '#0c7c7c',
	},
	slotItemText: {
		fontSize: 12,
		fontWeight: '500',
		color: '#42525d',
	},
	slotItemTextActive: {
		color: '#fff',
		fontWeight: '600',
	},
	drawerInfoText: {
		fontSize: 13,
		color: '#73818a',
		marginBottom: 8,
	},
	drawerActions: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		gap: 10,
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderTopWidth: 1,
		borderTopColor: '#e5eaee',
	},
	drawerCancelBtn: {
		borderRadius: 20,
		borderWidth: 1,
		borderColor: '#d5dde2',
		paddingHorizontal: 22,
		paddingVertical: 10,
		flex: 1,
		alignItems: 'center',
	},
	drawerCancelBtnText: { color: '#60717d', fontWeight: '600', fontSize: 14 },
	drawerConfirmBtn: {
		borderRadius: 20,
		backgroundColor: '#3d7b7b',
		paddingHorizontal: 22,
		paddingVertical: 10,
		flex: 1,
		alignItems: 'center',
	},
	drawerConfirmBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
})
