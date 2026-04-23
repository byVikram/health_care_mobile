import React, { useEffect, useState } from 'react'
import {
	View,
	Text,
	ScrollView,
	StyleSheet,
	TouchableOpacity,
	useWindowDimensions,
	Alert,
	Modal,
} from 'react-native'
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
	appointment_date: string
	start_time: string
	end_time?: string
}

const showSuccess = (message: string) => {
	Toast.show({ type: 'success', text1: 'Success', text2: message })
}

const showError = (message: string) => {
	Toast.show({ type: 'error', text1: 'Error', text2: message })
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

	// ── Reschedule state ──────────────────────────────────────────────────────
	const [rescheduleOpen, setRescheduleOpen] = useState(false)
	const [rescheduleAppt, setRescheduleAppt] = useState<Appointment | null>(null)
	const [rescheduleDate, setRescheduleDate] = useState<Date>(new Date())
	const [selectedSlot, setSelectedSlot] = useState('')
	const [rescheduleSlots, setRescheduleSlots] = useState<any[]>([])
	const [rescheduleSlotsLoading, setRescheduleSlotsLoading] = useState(false)
	const [rescheduleHospitals, setRescheduleHospitals] = useState<any[]>([])
	const [rescheduleHospitalId, setRescheduleHospitalId] = useState<string>('')

	// ── Reject modal: stores the appointment id pending rejection ─────────────
	const [rejectModalId, setRejectModalId] = useState<string | null>(null)

	// ── confirmedIds: tracks which appointments had Confirm pressed ───────────
	const [confirmedIds, setConfirmedIds] = useState<Set<string>>(new Set())

	// ── rejectedIds: local set to mark appointments rejected by doctor ─────────
	const [rejectedIds, setRejectedIds] = useState<Set<string>>(new Set())

	// ── Helpers ───────────────────────────────────────────────────────────────
	const getStatusLabel = (status: any) =>
		typeof status === 'string' ? status : (status?.label ?? 'pending')
	const formatStatus = (s: string) =>
		s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
	const getPatientAge = (apt: any) => apt?.patient?.age ?? apt?.age ?? '--'
	const getPatientGender = (apt: any) =>
		apt?.patient?.gender ?? apt?.patient?.sex ?? apt?.gender ?? '--'
	const getTimeRange = (apt: any) => {
		const start = apt?.start_time
		const end = apt?.end_time
		if (start && end) return `${start} - ${end}`
		return start ?? '--'
	}

	// ── Reschedule helpers ────────────────────────────────────────────────────
	const handleOpenReschedule = (apt: Appointment) => {
		// Don't allow reschedule if appointment is already rejected (locally or via status)
		const isLocallyRejected = rejectedIds.has(apt.id)
		const statusFromProp = getStatusLabel(apt.status)
		if (isLocallyRejected || statusFromProp === 'cancelled' || statusFromProp === 'rejected') {
			showError('Cannot reschedule a rejected or cancelled appointment.')
			return
		}
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

		const hospitalId =
			rescheduleHospitalId ||
			(rescheduleAppt?.hospital?.id ?? (rescheduleAppt as any)?.hospital_id)
		const dateStr = rescheduleDate.toISOString().split('T')[0]

		if (!hospitalId || !dateStr) {
			showError('Missing appointment details for reschedule.')
			return
		}

		setRescheduleSlotsLoading(true)
		try {
			const res = await rescheduleAppointment({
				appointment_id: rescheduleAppt.id,
				appointment_date: dateStr,
				start_time: selectedSlot,
				end_time: null,
				hospital_id: hospitalId,
				reason: 'Doctor unavailable',

				// 👇 ADD THIS LINE
				status_id: APPOINTMENT_STATUS.CONFIRM
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
				let hData: any[] = []
				if (doctorId) {
					const res = await getDoctorById(doctorId)
					if (res.success && res.data) hData = res.data.hospitals || []
				} else {
					const res = await getDoctorProfile()
					if (res.success && res.data) hData = res.data.hospitals || []
				}
				setRescheduleHospitals(hData)
				if (!rescheduleHospitalId && hData.length > 0)
					setRescheduleHospitalId(hData[0].hospital.id)
			} catch {
				console.log('Failed to fetch doctor hospitals')
			}
		}
		fetchHospitals()
	}, [rescheduleAppt, rescheduleOpen])

	useEffect(() => {
		if (!rescheduleOpen || !rescheduleAppt) return

		const doctorId = rescheduleAppt?.doctor?.id ?? (rescheduleAppt as any)?.doctor_id
		const hospitalId =
			rescheduleHospitalId ||
			(rescheduleAppt?.hospital?.id ?? (rescheduleAppt as any)?.hospital_id)
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

	// ── Confirm ───────────────────────────────────────────────────────────────
	const handleConfirmAppointment = async (appointmentId: string) => {
		try {
			const res = await updateAppointmentsStatus(
				appointmentId,
				APPOINTMENT_STATUS.CONFIRM
			)

			console.log("CONFIRM RESPONSE 👉", res)

			if (res.success) {
				showSuccess(res.message)

				// optional UI update
				setConfirmedIds((prev) => new Set(prev).add(appointmentId))

				// 🔥 IMPORTANT: refresh data from backend

			}

			else {
				showError(res.message || 'Failed to confirm')
			}
		} catch (err: any) {
			console.log("ERROR 👉", err?.response?.data)
			showError('Something went wrong')
		}
	}

	// ── Reject (after modal OK) with optimistic UI update ─────────────────────
	const handleConfirmReject = async () => {
		if (!rejectModalId) return
		try {
			const res = await updateAppointmentsStatus(rejectModalId, APPOINTMENT_STATUS.REJECT)
			if (res.success) {
				showSuccess(res.message)
				// Optimistically mark as rejected locally
				setRejectedIds((prev) => new Set(prev).add(rejectModalId))
				// Also remove from confirmed set if it was previously confirmed
				if (confirmedIds.has(rejectModalId)) {
					setConfirmedIds((prev) => {
						const next = new Set(prev)
						next.delete(rejectModalId)
						return next
					})
				}
			} else {
				showError(res.message || 'Failed to reject appointment.')
			}
		} catch {
			showError('Something went wrong')
		} finally {
			setRejectModalId(null)
		}
	}

	// ── Navigation ────────────────────────────────────────────────────────────
	const handleCardPress = (apt: any) => {
		const patientId =
			apt.patient?.id ||
			apt.patient?.patient_id ||
			apt.patient?.public_id ||
			apt.patient_public_id
		const doctorId = apt.doctor?.id || apt.doctor_id

		if (!patientId) {
			Alert.alert('Error', 'Patient ID not found for this appointment')
			return
		}
		if (!doctorId) {
			Alert.alert('Error', 'Doctor ID not found for this appointment')
			return
		}

		navigation.navigate('Consultation', {
			appointmentId: apt.id,
			patientId,
			patient: apt.patient,
			doctorID: doctorId,
			doctor: apt.doctor,
			appointment: apt,
		})
	}

	const getTypeIcon = (type?: string) => {
		switch (type) {
			case 'video':
				return { name: 'video', color: '#4d6bb1' }
			case 'clinic':
				return { name: 'hospital-building', color: '#2e7d32' }
			case 'home':
				return { name: 'home-heart', color: '#e67e22' }
			default:
				return { name: 'calendar', color: '#999' }
		}
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

	// ── Action buttons (only for active, non-rejected appointments) ──────────
	const renderActions = (apt: any) => {
		const rawStatus = getStatusLabel(apt.status)
		const isConfirmed = rawStatus === 'confirmed'
		const isRejectedLocally = rejectedIds.has(apt.id)
		const statusFromProp = getStatusLabel(apt.status)
		const isRejected = isRejectedLocally || statusFromProp === 'rejected' || statusFromProp === 'cancelled'

		// If appointment is rejected, don't show any action buttons
		if (isRejected) return null

		return (
			<View style={[styles.actions, isTablet && styles.actionsTablet]}>

				{/* ── Confirm button OR confirmed mini-badge ── */}
				{!isConfirmed && (
					<TouchableOpacity
						onPress={(e) => {
							e.stopPropagation?.()
							handleConfirmAppointment(apt.id)
						}}
						style={[styles.btn, { backgroundColor: '#d6eed8' }]}
						activeOpacity={0.75}
					>
						<MaterialCommunityIcons name="check" size={16} color="#2e8b57" />
						<Text style={[styles.btnLabel, { color: '#2e8b57' }]}>Confirm</Text>
					</TouchableOpacity>
				)}

				{/* ── Reject — always visible for active appointments, opens centered modal ── */}
				<TouchableOpacity
					onPress={(e) => {
						e.stopPropagation?.()
						setRejectModalId(apt.id)
					}}
					style={[styles.btn, { backgroundColor: '#f8dddd' }]}
					activeOpacity={0.75}
				>
					<MaterialCommunityIcons name="close" size={16} color="#d84545" />
					<Text style={[styles.btnLabel, { color: '#d84545' }]}>Reject</Text>
				</TouchableOpacity>

				{/* ── Reschedule — always visible for active appointments ── */}
				<TouchableOpacity
					onPress={(e) => {
						e.stopPropagation?.()
						handleOpenReschedule(apt)
					}}
					style={[styles.btn, { backgroundColor: '#f8e8c6' }]}
					activeOpacity={0.75}
				>
					<MaterialCommunityIcons name="refresh" size={16} color="#d08a0a" />
					<Text style={[styles.btnLabel, { color: '#d08a0a' }]}>Reschedule</Text>
				</TouchableOpacity>

				{/* ── Refer — always visible for active appointments ── */}
				<TouchableOpacity
					onPress={(e) => {
						e.stopPropagation?.()
						alert('Refer coming soon!')
					}}
					style={[styles.btn, { backgroundColor: '#dbe2f5' }]}
					activeOpacity={0.75}
				>
					<MaterialCommunityIcons name="account-multiple-outline" size={16} color="#4d6bb1" />
					<Text style={[styles.btnLabel, { color: '#4d6bb1' }]}>Refer</Text>
				</TouchableOpacity>

				{/* ── Chevron ── */}
				<TouchableOpacity
					style={styles.chevronBtn}
					activeOpacity={0.7}
					onPress={() => handleCardPress(apt)}
				>
					<MaterialCommunityIcons name="chevron-right" size={26} color={TEAL} />
				</TouchableOpacity>
			</View>
		)
	}

	const renderRejectedNotice = () => (
		<View style={styles.cancelNoticeBox}>
			<MaterialCommunityIcons name="close-circle-outline" size={34} color="#d84545" />
			<Text style={styles.cancelNoticeText}>Appointment rejected by doctor</Text>
		</View>
	)

	const renderCancelledNotice = () => (
		<View style={styles.cancelNoticeBox}>
			<MaterialCommunityIcons name="close-thick" size={34} color="#df4a4a" />
			<Text style={styles.cancelNoticeText}>Patient has cancelled the appointment</Text>
		</View>
	)

	// ── Reject confirmation modal (exactly as per screenshot) ─────────────────
	const renderRejectModal = () => (
		<Modal
			visible={rejectModalId !== null}
			transparent
			animationType="fade"
			onRequestClose={() => setRejectModalId(null)}
		>
			<TouchableOpacity
				activeOpacity={1}
				style={styles.rejectBackdrop}
				onPress={() => setRejectModalId(null)}
			>
				<TouchableOpacity activeOpacity={1} style={styles.rejectCard} onPress={() => { }}>
					<View style={styles.rejectIconCircle}>
						<MaterialCommunityIcons name="close" size={28} color="#d84545" />
					</View>
					<Text style={styles.rejectTitle}>Are you sure?</Text>
					<Text style={styles.rejectSubtitle}>You want to reject this appointment</Text>
					<View style={styles.rejectBtnRow}>
						<TouchableOpacity
							style={styles.rejectCancelBtn}
							onPress={() => setRejectModalId(null)}
						>
							<Text style={styles.rejectCancelText}>Cancel</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={styles.rejectConfirmBtn}
							onPress={handleConfirmReject}
						>
							<Text style={styles.rejectConfirmText}>Yes, Reject</Text>
						</TouchableOpacity>
					</View>
				</TouchableOpacity>
			</TouchableOpacity>
		</Modal>
	)

	// ── Reschedule bottom-sheet ───────────────────────────────────────────────
	const renderRescheduleDrawer = () => (
		<Modal
			visible={rescheduleOpen}
			transparent
			animationType="slide"
			onRequestClose={() => setRescheduleOpen(false)}
		>
			<TouchableOpacity
				activeOpacity={1}
				style={styles.drawerBackdrop}
				onPress={() => setRescheduleOpen(false)}
			>
				<TouchableOpacity activeOpacity={1} style={styles.drawerSheet} onPress={() => { }}>
					<View style={styles.drawerHeader}>
						<View>
							<Text style={styles.drawerTitle}>Reschedule Appointment</Text>
							<Text style={styles.drawerSubtitle}>
								{rescheduleAppt?.patient?.name ?? 'Patient'}
							</Text>
						</View>
						<TouchableOpacity
							style={styles.drawerCloseBtn}
							onPress={() => setRescheduleOpen(false)}
						>
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
											style={[
												styles.hospitalItem,
												isSelected && styles.hospitalItemActive,
											]}
											onPress={() => setRescheduleHospitalId(h.id)}
										>
											<View
												style={[
													styles.hospitalIcon,
													isSelected && styles.hospitalIconActive,
												]}
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
						<TouchableOpacity
							style={styles.drawerCancelBtn}
							onPress={() => setRescheduleOpen(false)}
						>
							<Text style={styles.drawerCancelBtnText}>Cancel</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={styles.drawerConfirmBtn}
							onPress={handleConfirmReschedule}
						>
							<Text style={styles.drawerConfirmBtnText}>Confirm</Text>
						</TouchableOpacity>
					</View>
				</TouchableOpacity>
			</TouchableOpacity>
		</Modal>
	)

	// ── Card ──────────────────────────────────────────────────────────────────
	const renderCard = (apt: any) => {
		const rawStatus = getStatusLabel(apt.status)
		// Determine final status: confirmed (optimistic), rejected (optimistic or from prop), cancelled
		const statusFromProp = getStatusLabel(apt.status)
		const isConfirmed = statusFromProp === 'confirmed'
		const isRejectedLocally = rejectedIds.has(apt.id)
		const isRejectedFromProp = rawStatus === 'rejected' || rawStatus === 'cancelled'
		const isRejected = isRejectedLocally || isRejectedFromProp
		const typeIcon = getTypeIcon(apt?.appointment_type)
		let status = rawStatus

		// optional optimistic UI
		if (confirmedIds.has(apt.id)) status = 'confirmed'
		if (rejectedIds.has(apt.id)) status = 'rejected'

		const statusStyle =
			status === 'confirmed'
				? styles.pillConfirmed
				: status === 'rejected'
					? styles.pillCancelled
					: styles.pillPending

		const statusTextStyle =
			status === 'confirmed'
				? styles.pillTextConfirmed
				: status === 'rejected'
					? styles.pillTextCancelled
					: styles.pillTextPending

		// ── Rejected / Cancelled card ──
		if (isRejected) {
			const isPatientCancelled = rawStatus === 'cancelled' && !isRejectedLocally
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
									<Text style={[styles.pillText, statusTextStyle]}>
										{formatStatus(status)}
									</Text>
								</View>
							</View>
							<View style={styles.cancelledMetaRow}>
								<Text style={styles.subText}>
									{getPatientAge(apt)} years / {getPatientGender(apt)}
								</Text>
								<View style={styles.metaDot} />
								<MaterialCommunityIcons
									name="clock-time-three-outline"
									size={16}
									color="#9ea5ac"
								/>
								<Text style={styles.subText}>{getTimeRange(apt)}</Text>
							</View>
						</View>
						<View
							style={[
								styles.cancelDivider,
								useCompactCancelledLayout && styles.cancelDividerCompact,
							]}
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
							{isPatientCancelled ? renderCancelledNotice() : renderRejectedNotice()}
						</View>
					</View>
				</TouchableOpacity>
			)
		}

		// ── Tablet ──
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
									<Text style={[styles.pillText, statusTextStyle]}>
										{formatStatus(status)}
									</Text>
								</View>
							</View>
							<View style={styles.metaRow}>
								<MaterialCommunityIcons
									name="clock-time-three-outline"
									size={14}
									color="#5f6973"
								/>
								<Text style={styles.subText}>
									{getPatientAge(apt)} yrs / {getPatientGender(apt)} |{' '}
									{getTimeRange(apt)}
								</Text>
							</View>
						</View>
						<View style={styles.tabletRight}>{renderActions(apt)}</View>
					</View>
				</TouchableOpacity>
			)
		}

		// ── Mobile ──
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

	// ── Root ──────────────────────────────────────────────────────────────────
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
			<ScrollView
				horizontal
				showsHorizontalScrollIndicator={false}
				style={styles.weekContainer}
				contentContainerStyle={styles.weekContent}
			>
				{weekDays.map((d: any, i: number) => (
					<TouchableOpacity
						key={i}
						onPress={() => setSelectedDate(i)}
						style={[
							styles.dayBox,
							d.red && styles.weekendDayBox,
							selectedDate === i && styles.selectedDay,
						]}
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

			{/* Appointment list */}
			<View style={styles.listContainer}>
				{apptLoading ? renderSkeleton() : null}
				{apptError ? <Text style={styles.error}>{apptError}</Text> : null}
				{!apptLoading && appointments.length === 0 && (
					<Text style={styles.empty}>No appointments</Text>
				)}
				{!apptLoading && appointments.map(renderCard)}
			</View>

			{/* Modals — at root level */}
			{renderRejectModal()}
			{renderRescheduleDrawer()}
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		paddingHorizontal: 18,
		paddingTop: 16,
		paddingBottom: 18,
		backgroundColor: '#fff',
		borderRadius: 12,
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 14,
	},
	heading: { fontSize: 18, fontWeight: '700', color: '#253136' },
	month: { color: '#0c7c7c', fontWeight: '600', fontSize: 13 },
	weekContainer: { marginBottom: 16 },
	weekContent: { paddingRight: 8 },
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
	dateText: { fontSize: 16, fontWeight: '700', color: '#2c3136', lineHeight: 32 },
	selectedText: { color: '#fff' },
	weekendText: { color: '#e25555' },
	listContainer: { marginTop: 6, paddingBottom: 4 },
	card: {
		padding: 14,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: '#d6dbde',
		marginBottom: 12,
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
	metaDot: { width: 5, height: 5, borderRadius: 999, backgroundColor: '#cfd5d9' },
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

	// ── Action row ────────────────────────────────────────────────────────────
	actions: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 12,
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
	btnLabel: { fontSize: 10, fontWeight: '500', textAlign: 'center', marginTop: 3 },
	chevronBtn: { marginLeft: 'auto', paddingLeft: 4 },

	// Confirmed mini badge
	confirmedMiniBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		backgroundColor: '#eaf7ec',
		borderWidth: 1,
		borderColor: '#b6debb',
		borderRadius: 6,
		paddingHorizontal: 8,
		paddingVertical: 6,
		minWidth: 52,
	},
	confirmedMiniText: { fontSize: 10, fontWeight: '600', color: '#2e8b57' },

	// ── Reject centered modal (exactly as per screenshot) ────────────────────
	rejectBackdrop: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.45)',
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 32,
	},
	rejectCard: {
		backgroundColor: '#fff',
		borderRadius: 16,
		paddingHorizontal: 24,
		paddingTop: 28,
		paddingBottom: 20,
		width: '100%',
		alignItems: 'center',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 8 },
		shadowOpacity: 0.18,
		shadowRadius: 20,
		elevation: 10,
	},
	rejectIconCircle: {
		width: 56,
		height: 56,
		borderRadius: 28,
		backgroundColor: '#fbeaea',
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 14,
	},
	rejectTitle: {
		fontSize: 17,
		fontWeight: '700',
		color: '#1a2429',
		textAlign: 'center',
		marginBottom: 6,
	},
	rejectSubtitle: {
		fontSize: 14,
		color: '#5f6973',
		textAlign: 'center',
		marginBottom: 22,
		lineHeight: 20,
	},
	rejectBtnRow: { flexDirection: 'row', gap: 10, width: '100%' },
	rejectCancelBtn: {
		flex: 1,
		borderRadius: 24,
		borderWidth: 1.5,
		borderColor: '#0c7c7c',
		paddingVertical: 11,
		alignItems: 'center',
	},
	rejectCancelText: { color: '#0c7c7c', fontWeight: '600', fontSize: 14 },
	rejectConfirmBtn: {
		flex: 1,
		borderRadius: 24,
		backgroundColor: '#d84545',
		paddingVertical: 11,
		alignItems: 'center',
	},
	rejectConfirmText: { color: '#fff', fontWeight: '700', fontSize: 14 },

	// ── Reschedule bottom-sheet ───────────────────────────────────────────────
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
	drawerBody: { flexShrink: 1 },
	drawerBodyContent: { paddingHorizontal: 16, paddingVertical: 14 },
	drawerTitle: { fontSize: 16, fontWeight: '700', color: '#233238' },
	drawerSubtitle: { fontSize: 12, color: '#62707a', marginTop: 2 },
	drawerSectionTitle: {
		fontSize: 14,
		color: '#2b3a40',
		fontWeight: '600',
		marginTop: 10,
		marginBottom: 10,
	},
	drawerInfoText: { fontSize: 13, color: '#73818a', marginBottom: 8 },
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
	hospitalIconActive: { backgroundColor: '#3d7b7b' },
	hospitalIconText: {
		color: '#fff',
		fontSize: 12,
		fontWeight: '600',
		transform: [{ rotate: '45deg' }],
	},
	hospitalTextCol: { flex: 1 },
	hospitalName: { fontSize: 14, fontWeight: '600', color: '#233238' },
	hospitalAddress: { fontSize: 11, color: '#62707a', marginTop: 2 },
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
	skeletonNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
	skeletonMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
	skeletonActionsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
	error: { color: 'red', fontSize: 13, paddingVertical: 12 },
	empty: { color: '#999', fontSize: 13, paddingVertical: 16 },
})