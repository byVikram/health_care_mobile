import React, { useEffect, useState } from 'react'
import {
	ActivityIndicator,
	Alert,
	Image,
	Modal,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
	useWindowDimensions,
} from 'react-native'
import { Ionicons, MaterialIcons } from '@expo/vector-icons'
import ApiService from '../../../services/apiService'
import { API_ENDPOINTS } from '../../../constants/apiUrls'
import { APPOINTMENT_STATUS } from '../../../constants/constants'
import { useAuth } from '../../../context/AuthContext'
import DateSlotPicker from '../../../components/common/DateSlotPicker'
import { AppModal } from '../../../components/common/AppModal'
import {
	getDoctorAvailability,
	getDoctorById,
	rescheduleAppointment,
	type SlotGroup,
	type TimeSlot,
} from '../../doctor/doctorService'

export type MobileAppointmentRow = {
	id: string
	patientName?: string
	patientAvatar?: string
	doctorName?: string
	doctorAvatar?: string
	consultationType?: string
	dateLabel?: string
	timeLabel?: string
	mode?: string
	appointmentDate?: string
	startTime?: string
	endTime?: string | null
	appointmentMode?: string
	status: string
	hospitalName?: string | null
	hospitalAddress?: string | null
	address?: string
	doctorId?: string
	hospitalId?: string
	raw?: {
		doctor?: { id?: string } | null
		hospital?: { id?: string } | null
	}
}

type LookupHospital = {
	id: string
	label: string
}

type AppointmentStatusOption = {
	id: string
	label: string
}

type RescheduleAppointmentMode = 'clinic' | 'video'

type AvailabilityApiSlot = {
	start_time?: string
	end_time?: string
	status?: TimeSlot['status'] | string
	is_enabled?: boolean
	is_booked?: boolean
	can_toggle?: boolean
}

type AvailabilityApiSession = {
	label?: string
	range?: string
	period?: string
	slots?: AvailabilityApiSlot[]
}

type AvailabilityApiModeGroup = {
	appointment_mode?: string
	sessions?: AvailabilityApiSession[]
	label?: string
	range?: string
	period?: string
	slots?: AvailabilityApiSlot[]
}

type MobileAppointmentCardProps<TAppointment extends MobileAppointmentRow = MobileAppointmentRow> = {
	row: TAppointment
	horizontalInset?: number
}

const STATUS_STYLES: Record<string, { color: string; bgColor: string; text: string }> = {
	confirmed: { color: '#10b981', bgColor: 'rgba(16, 185, 129, 0.1)', text: 'Confirmed' },
	pending: { color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.1)', text: 'Pending' },
	cancelled: { color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.1)', text: 'Cancelled' },
	completed: { color: '#6366f1', bgColor: 'rgba(99, 102, 241, 0.1)', text: 'Completed' },
	rescheduled: { color: '#8b5cf6', bgColor: 'rgba(139, 92, 246, 0.1)', text: 'Rescheduled' },
}

const getStatusStyle = (status: string) => {
	const normalized = status?.trim().toLowerCase()
	return STATUS_STYLES[normalized] ?? { color: '#64748b', bgColor: '#f1f5f9', text: status || 'Pending' }
}

const parseDateOnly = (value?: string) => {
	if (!value) return null
	const dateOnly = value.split('T')[0]
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOnly)

	if (match) {
		const [, year, month, day] = match
		return new Date(Number(year), Number(month) - 1, Number(day))
	}

	const parsed = new Date(value)
	return Number.isNaN(parsed.getTime()) ? null : parsed
}

const parseTimeParts = (value?: string) => {
	const normalized = value?.trim()
	if (!normalized) return null

	const match = /^(\d{1,2})(?::(\d{2}))?(?::(\d{2}))?\s*(AM|PM)?$/i.exec(normalized)
	if (!match) return null

	const [, hourValue, minuteValue = '0', secondValue = '0', periodValue] = match
	let hour = Number(hourValue)
	const minute = Number(minuteValue)
	const second = Number(secondValue)
	const period = periodValue?.toUpperCase()

	if (!Number.isFinite(hour) || !Number.isFinite(minute) || !Number.isFinite(second)) return null
	if (hour < 0 || hour > 23 || minute < 0 || minute > 59 || second < 0 || second > 59) return null

	if (period === 'PM' && hour < 12) hour += 12
	if (period === 'AM' && hour === 12) hour = 0

	return { hour, minute, second }
}

const toApiDate = (date: Date) => {
	const year = date.getFullYear()
	const month = String(date.getMonth() + 1).padStart(2, '0')
	const day = String(date.getDate()).padStart(2, '0')
	return `${year}-${month}-${day}`
}

const formatDate = (dateStr?: string) => {
	if (!dateStr) return '-'
	const d = parseDateOnly(dateStr)
	if (!d) return dateStr
	return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'long' })
}

const formatTime = (timeStr?: string) => {
	if (!timeStr) return '-'
	const time = parseTimeParts(timeStr)
	if (!time) return timeStr

	const suffix = time.hour >= 12 ? 'PM' : 'AM'
	const hour = time.hour > 12 ? time.hour - 12 : time.hour === 0 ? 12 : time.hour
	return `${String(hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')} ${suffix}`
}

const getModeLabel = (row: MobileAppointmentRow) => {
	if (row.mode === 'virtual') return 'Virtual'
	if (row.mode === 'in-person') return 'In-person'

	const normalized = (row.appointmentMode || '').replace(/[-\s]/g, '_').toLowerCase()
	if (['online', 'video', 'virtual', 'teleconsultation', 'video_call'].includes(normalized)) return 'Virtual'
	return 'In-person'
}

const getRescheduleModeKey = (appointmentType: RescheduleAppointmentMode) =>
	appointmentType === 'video' ? 'video_call' : 'clinic_visit'

const getSlotStatus = (slot: AvailabilityApiSlot): TimeSlot['status'] => {
	const status = typeof slot.status === 'string' ? slot.status.toUpperCase() : ''

	if (slot.is_booked || status === 'OCCUPIED') return 'OCCUPIED'
	if (slot.is_enabled === false || status === 'UNAVAILABLE') return 'UNAVAILABLE'
	if (status === 'BLOCKED') return 'BLOCKED'
	if (status === 'BOOKED') return 'BOOKED'
	return 'AVAILABLE'
}

const normalizeAvailabilitySlots = (
	response: SlotGroup[] | { data?: AvailabilityApiModeGroup[] } | null | undefined,
	appointmentType: RescheduleAppointmentMode
): SlotGroup[] => {
	const rawData = (
		Array.isArray(response) ? response : Array.isArray(response?.data) ? response.data : []
	) as AvailabilityApiModeGroup[]
	const modeKey = getRescheduleModeKey(appointmentType)

	return rawData
		.filter((item) => !item.appointment_mode || item.appointment_mode.toLowerCase() === modeKey)
		.flatMap((item, itemIndex) => {
			const sessions =
				Array.isArray(item.sessions) && item.sessions.length > 0
					? item.sessions
					: [{ label: item.label, range: item.range, period: item.period, slots: item.slots }]

			return sessions
				.map((session, sessionIndex): SlotGroup => {
					const label = session.label || `Session ${sessionIndex + 1}`

					return {
						label,
						range: session.range,
						period: session.period || session.range,
						slots: (session.slots ?? [])
							.filter((slot) => Boolean(slot.start_time && slot.end_time))
							.map((slot, slotIndex): TimeSlot => ({
								id: `${modeKey}-${itemIndex}-${label}-${slot.start_time}-${slotIndex}`,
								start_time: slot.start_time as string,
								end_time: slot.end_time as string,
								status: getSlotStatus(slot),
								is_enabled: slot.is_enabled,
								is_booked: slot.is_booked,
								can_toggle: slot.is_enabled === false ? false : slot.can_toggle,
							})),
					}
				})
				.filter((session) => session.slots.length > 0)
		})
}

const isAppointmentUpcoming = (row: MobileAppointmentRow) => {
	const date = parseDateOnly(row.appointmentDate)
	const time = parseTimeParts(row.startTime)

	if (!date || !time) return false

	date.setHours(time.hour, time.minute, time.second, 0)
	return date.getTime() > Date.now()
}

export default function MobileAppointmentCard<TAppointment extends MobileAppointmentRow = MobileAppointmentRow>({
	row,
	horizontalInset = 0,
}: MobileAppointmentCardProps<TAppointment>) {
	const { role } = useAuth()
	const { width, height } = useWindowDimensions()
	const isTablet = width >= 768
	const isLandscape = width > height

	const [localRow, setLocalRow] = useState<MobileAppointmentRow>(row)
	const [cancelledStatusId, setCancelledStatusId] = useState('')
	const [cancelOpen, setCancelOpen] = useState(false)
	const [cancelReason, setCancelReason] = useState('')
	const [cancelSubmitting, setCancelSubmitting] = useState(false)
	const [cancelSuccessOpen, setCancelSuccessOpen] = useState(false)
	const [rescheduleOpen, setRescheduleOpen] = useState(false)
	const [rescheduleDate, setRescheduleDate] = useState(new Date())
	const [rescheduleTime, setRescheduleTime] = useState('')
	const [rescheduleSlots, setRescheduleSlots] = useState<SlotGroup[]>([])
	const [rescheduleSlotsLoading, setRescheduleSlotsLoading] = useState(false)
	const [rescheduleSubmitting, setRescheduleSubmitting] = useState(false)
	const [rescheduleHospitals, setRescheduleHospitals] = useState<LookupHospital[]>([])
	const [rescheduleHospitalId, setRescheduleHospitalId] = useState('')
	const [hospitalDropdownOpen, setHospitalDropdownOpen] = useState(false)
	const [appointmentType, setAppointmentType] = useState<RescheduleAppointmentMode>('clinic')

	useEffect(() => {
		setLocalRow(row)
	}, [row])

	useEffect(() => {
		if (!rescheduleOpen) return

		const doctorId = localRow.doctorId || localRow.raw?.doctor?.id
		if (!doctorId) return

		let mounted = true

		const fetchDoctorHospitals = async () => {
			try {
				const res = await getDoctorById(doctorId)
				if (mounted && res.success && res.data) {
					const hospitals = (res.data.hospitals ?? []).map((hospital) => ({
						id: hospital.hospital.id,
						label: hospital.hospital.name,
					}))
					setRescheduleHospitals(hospitals)
					setRescheduleHospitalId((current) => current || localRow.hospitalId || localRow.raw?.hospital?.id || hospitals[0]?.id || '')
				}
			} catch (error) {
				console.log('[MobileAppointmentCard] fetch doctor hospitals error:', error)
			}
		}

		void fetchDoctorHospitals()

		return () => {
			mounted = false
		}
	}, [localRow, rescheduleOpen])

	useEffect(() => {
		if (!rescheduleOpen) return

		const doctorId = localRow.doctorId || localRow.raw?.doctor?.id
		const hospitalId = rescheduleHospitalId || localRow.hospitalId || localRow.raw?.hospital?.id

		if (!doctorId || !hospitalId) {
			setRescheduleSlots([])
			setRescheduleTime('')
			return
		}

		let mounted = true

		const fetchSlots = async () => {
			setRescheduleSlotsLoading(true)
			setRescheduleSlots([])
			setRescheduleTime('')

			try {
				const responseData = await getDoctorAvailability({
					doctor_id: doctorId,
					hospital_id: hospitalId,
					date: toApiDate(rescheduleDate),
				})
				if (mounted) setRescheduleSlots(normalizeAvailabilitySlots(responseData, appointmentType))
			} catch (error) {
				console.log('[MobileAppointmentCard] fetch reschedule slots error:', error)
				if (mounted) Alert.alert('Error', 'Could not load available slots.')
			} finally {
				if (mounted) setRescheduleSlotsLoading(false)
			}
		}

		void fetchSlots()

		return () => {
			mounted = false
		}
	}, [appointmentType, localRow, rescheduleDate, rescheduleHospitalId, rescheduleOpen])

	const status = localRow.status || 'pending'
	const normalizedStatus = status.trim().toLowerCase()
	const statusStyle = getStatusStyle(status)
	const displayMode = getModeLabel(localRow)
	const isVirtual = displayMode === 'Virtual'
	const displayName = role === 'doctor'
		? localRow.patientName || 'Unknown patient'
		: localRow.doctorName || localRow.patientName || 'Unknown doctor'
	const displayAvatar = role === 'doctor'
		? localRow.patientAvatar
		: localRow.doctorAvatar || localRow.patientAvatar
	const locationName = localRow.hospitalName ?? (isVirtual ? 'Virtual consultation' : 'Hospital')
	const locationAddress = localRow.address || localRow.hospitalAddress?.split(',')[0] || localRow.hospitalAddress || '-'
	const canAct = isAppointmentUpcoming(localRow) && normalizedStatus !== 'cancelled' && normalizedStatus !== 'completed'
	const rescheduleColumns = isTablet || isLandscape ? 4 : 3
	const selectedHospitalLabel =
		rescheduleHospitals.find((hospital) => hospital.id === rescheduleHospitalId)?.label || 'Choose Hospital'
	const canConfirmReschedule = Boolean(
		rescheduleDate &&
			rescheduleTime &&
			(rescheduleHospitalId || localRow.hospitalId || localRow.raw?.hospital?.id) &&
			!rescheduleSlotsLoading &&
			!rescheduleSubmitting
	)

	const openReschedule = () => {
		const doctorId = localRow.doctorId || localRow.raw?.doctor?.id
		const hospitalId = localRow.hospitalId || localRow.raw?.hospital?.id

		if (!doctorId) {
			Alert.alert('Unable to reschedule', 'Doctor details are missing for this appointment.')
			return
		}

		setRescheduleDate(new Date())
		setRescheduleTime('')
		setRescheduleSlots([])
		setRescheduleHospitals([])
		setHospitalDropdownOpen(false)
		setRescheduleHospitalId(hospitalId || '')
		setAppointmentType(isVirtual ? 'video' : 'clinic')
		setRescheduleOpen(true)
	}

	const handleRescheduleDateChange = (date: Date) => {
		setRescheduleDate(date)
		setRescheduleTime('')
		setRescheduleSlots([])
	}

	const getSelectedRescheduleSlot = () =>
		rescheduleSlots.flatMap((group) => group.slots).find((slot) => slot.start_time === rescheduleTime)

	const handleRescheduleConfirm = async () => {
		if (!rescheduleTime) {
			Alert.alert('Select time', 'Please select a time slot before confirming.')
			return
		}

		const hospitalId = rescheduleHospitalId || localRow.hospitalId || localRow.raw?.hospital?.id
		const selectedSlot = getSelectedRescheduleSlot()
		const selectedHospital = rescheduleHospitals.find((hospital) => hospital.id === hospitalId)
		const dateStr = toApiDate(rescheduleDate)

		if (!hospitalId) {
			Alert.alert('Select hospital', 'Please select a hospital before confirming.')
			return
		}

		setRescheduleSubmitting(true)
		try {
			const res = await rescheduleAppointment({
				appointment_id: localRow.id,
				appointment_date: dateStr,
				start_time: rescheduleTime,
				end_time: selectedSlot?.end_time ?? null,
				hospital_id: hospitalId,
				reason: 'Patient requested reschedule',
				status_id: APPOINTMENT_STATUS.CONFIRM,
			})

			if (res.success) {
				setLocalRow((prev) => ({
					...prev,
					appointmentDate: dateStr,
					startTime: rescheduleTime,
					endTime: selectedSlot?.end_time ?? prev.endTime,
					dateLabel: formatDate(dateStr),
					timeLabel: formatTime(rescheduleTime),
					hospitalId,
					hospitalName: selectedHospital?.label || prev.hospitalName,
					status: 'rescheduled',
				}))
				setRescheduleOpen(false)
				setHospitalDropdownOpen(false)
				Alert.alert('Success', 'Appointment rescheduled successfully.')
			} else {
				Alert.alert('Error', res.message || 'Reschedule failed. Please try again.')
			}
		} catch (error: any) {
			console.log('[MobileAppointmentCard] reschedule appointment error:', error?.response?.data || error?.message || error)
			Alert.alert('Error', 'Something went wrong. Please try again.')
		} finally {
			setRescheduleSubmitting(false)
		}
	}

	const openCancel = async () => {
		setCancelReason('')
		setCancelOpen(true)

		if (cancelledStatusId) return

		try {
			const res = await ApiService.get<{ success?: boolean; data?: AppointmentStatusOption[] }>(
				API_ENDPOINTS.APPOINTMENTS.STATUSES
			)
			const cancelledStatus = res.data?.data?.find((status) => status.label?.toLowerCase() === 'cancelled')
			if (cancelledStatus) setCancelledStatusId(cancelledStatus.id)
		} catch (error) {
			console.log('[MobileAppointmentCard] fetch appointment statuses error:', error)
		}
	}

	const handleCancelAppointment = async () => {
		if (!cancelledStatusId) {
			Alert.alert('Unable to cancel', 'Cancellation status is unavailable. Please try again in a moment.')
			return
		}

		setCancelSubmitting(true)
		try {
			const res = await ApiService.patch<{ success?: boolean; message?: string }>(
				API_ENDPOINTS.APPOINTMENTS.UPDATE,
				{
					appointment_id: localRow.id,
					status_id: cancelledStatusId,
					reason: cancelReason,
				}
			)

			if (res.data?.success) {
				setLocalRow((prev) => ({ ...prev, status: 'cancelled' }))
				setCancelOpen(false)
				setCancelReason('')
				setCancelSuccessOpen(true)
			} else {
				Alert.alert('Error', res.data?.message || 'Failed to cancel appointment.')
			}
		} catch (error: any) {
			console.log('[MobileAppointmentCard] cancel appointment error:', error?.response?.data || error?.message || error)
			Alert.alert('Error', 'Something went wrong. Please try again.')
		} finally {
			setCancelSubmitting(false)
		}
	}

	return (
		<View style={[styles.card, horizontalInset > 0 && { marginHorizontal: horizontalInset }]}>
			<View style={styles.headerRow}>
				<View style={[styles.avatar, { borderColor: statusStyle.color }]}>
					{displayAvatar ? (
						<Image source={{ uri: displayAvatar }} style={styles.avatarImage} resizeMode="cover" />
					) : (
						<Ionicons name="person-outline" size={26} color="#5B7186" />
					)}
				</View>

				<View style={styles.headerText}>
					<View style={styles.nameRow}>
						<Text style={styles.doctorName} numberOfLines={1}>
							{displayName}
						</Text>
						<View style={[styles.statusBadge, { backgroundColor: statusStyle.bgColor }]}>
							<Text style={[styles.statusText, { color: statusStyle.color }]}>{statusStyle.text}</Text>
						</View>
					</View>
					<Text style={styles.consultationType}>{localRow.consultationType || 'Consultation'}</Text>
				</View>
			</View>

			<View style={styles.metaRow}>
				<View style={styles.metaItem}>
					<Ionicons name="calendar-outline" size={16} color="#667B8F" />
					<Text style={styles.metaText}>{localRow.dateLabel || formatDate(localRow.appointmentDate)}</Text>
				</View>

				<View style={styles.metaItem}>
					<Ionicons name="time-outline" size={16} color="#667B8F" />
					<Text style={styles.metaText}>{localRow.timeLabel || formatTime(localRow.startTime)}</Text>
				</View>

				<View style={styles.metaItem}>
					<MaterialIcons name={isVirtual ? 'videocam' : 'location-on'} size={16} color="#667B8F" />
					<Text style={styles.metaText}>{displayMode}</Text>
				</View>
			</View>

			<View style={styles.locationPill}>
				<Ionicons name="location-sharp" size={14} color="#667B8F" />
				<Text style={styles.locationText} numberOfLines={2}>
					{locationName} {'\u2022'} {locationAddress}
				</Text>
			</View>

			{canAct ? (
				<View style={styles.actionsRow}>
					<TouchableOpacity
						activeOpacity={0.88}
						style={[styles.actionButton, styles.secondaryButton]}
						onPress={openReschedule}
					>
						<Text style={styles.secondaryButtonText}>Reschedule</Text>
					</TouchableOpacity>

					<TouchableOpacity
						activeOpacity={0.88}
						style={[styles.actionButton, styles.dangerButton]}
						onPress={openCancel}
					>
						<Text style={styles.dangerButtonText}>Cancel</Text>
					</TouchableOpacity>
				</View>
			) : null}

			<Modal
				visible={rescheduleOpen}
				transparent
				animationType="slide"
				onRequestClose={() => {
					if (!rescheduleSubmitting) setRescheduleOpen(false)
				}}
			>
				<View style={styles.modalOverlay}>
					<View style={[styles.modalCard, isTablet && styles.modalCardTablet]}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>Reschedule Appointment</Text>
							<TouchableOpacity
								onPress={() => setRescheduleOpen(false)}
								disabled={rescheduleSubmitting}
								hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
							>
								<Ionicons name="close" size={22} color="#526173" />
							</TouchableOpacity>
						</View>

						<ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollContent}>
							{rescheduleHospitals.length > 0 ? (
								<View style={styles.hospitalPicker}>
									<Text style={styles.modalLabel}>Choose Hospital</Text>
									<TouchableOpacity
										style={styles.hospitalSelectTrigger}
										activeOpacity={0.85}
										onPress={() => setHospitalDropdownOpen((prev) => !prev)}
									>
										<Text
											style={[
												styles.hospitalSelectValue,
												!rescheduleHospitalId && styles.hospitalSelectPlaceholder,
											]}
											numberOfLines={1}
										>
											{selectedHospitalLabel}
										</Text>
										<Ionicons
											name={hospitalDropdownOpen ? 'chevron-up' : 'chevron-down'}
											size={18}
											color="#526173"
										/>
									</TouchableOpacity>

									{hospitalDropdownOpen ? (
										<View style={styles.hospitalDropdown}>
											<ScrollView nestedScrollEnabled showsVerticalScrollIndicator={rescheduleHospitals.length > 4}>
												{rescheduleHospitals.map((hospital) => {
													const selected = hospital.id === rescheduleHospitalId
													return (
														<TouchableOpacity
															key={hospital.id}
															style={[styles.hospitalDropdownItem, selected && styles.hospitalDropdownItemSelected]}
															onPress={() => {
																setRescheduleHospitalId(hospital.id)
																setRescheduleTime('')
																setRescheduleSlots([])
																setHospitalDropdownOpen(false)
															}}
														>
															<Text
																style={[
																	styles.hospitalDropdownText,
																	selected && styles.hospitalDropdownTextSelected,
																]}
																numberOfLines={2}
															>
																{hospital.label}
															</Text>
															{selected ? <Ionicons name="checkmark-circle" size={18} color="#0c7c7c" /> : null}
														</TouchableOpacity>
													)
												})}
											</ScrollView>
										</View>
									) : null}
								</View>
							) : null}

							<DateSlotPicker
								selectedDate={rescheduleDate}
								onDateChange={handleRescheduleDateChange}
								selectedTime={rescheduleTime}
								onTimeChange={setRescheduleTime}
								availableSlots={rescheduleSlots}
								loading={rescheduleSlotsLoading}
								timeSlotColumns={rescheduleColumns}
								disablePast
								disableBookedSlots
								dateLabel="Select Date"
								timeLabel="Select Time"
								selectedAppointmentType={appointmentType}
								onAppointmentTypeChange={setAppointmentType}
							/>
						</ScrollView>

						<View style={styles.modalActions}>
							<TouchableOpacity
								style={[styles.modalSecondaryButton, rescheduleSubmitting && styles.buttonDisabled]}
								onPress={() => setRescheduleOpen(false)}
								disabled={rescheduleSubmitting}
							>
								<Text style={styles.modalSecondaryButtonText}>Cancel</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={[styles.modalPrimaryButton, !canConfirmReschedule && styles.buttonDisabled]}
								onPress={handleRescheduleConfirm}
								disabled={!canConfirmReschedule}
							>
								{rescheduleSubmitting ? (
									<ActivityIndicator size="small" color="#ffffff" />
								) : (
									<Text style={styles.modalPrimaryButtonText}>Confirm</Text>
								)}
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</Modal>

			<Modal visible={cancelOpen} transparent animationType="fade" onRequestClose={() => setCancelOpen(false)}>
				<View style={styles.modalOverlay}>
					<View style={[styles.cancelCard, isTablet && styles.cancelCardTablet]}>
						<View style={styles.cancelHeader}>
							<Text style={styles.modalTitle}>Reason for Cancelling the Appointment</Text>
							<TouchableOpacity
								onPress={() => setCancelOpen(false)}
								style={styles.closeButton}
								hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
							>
								<Ionicons name="close" size={22} color="#526173" />
							</TouchableOpacity>
						</View>

						<TextInput
							value={cancelReason}
							onChangeText={setCancelReason}
							placeholder="Reason"
							placeholderTextColor="#9aa8b2"
							style={styles.reasonInput}
							multiline
							textAlignVertical="top"
						/>

						<View style={styles.cancelActions}>
							<TouchableOpacity style={styles.skipButton} onPress={() => setCancelOpen(false)}>
								<Text style={styles.modalSecondaryButtonText}>Skip for Now</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={[
									styles.modalPrimaryButton,
									(!cancelReason.trim() || cancelSubmitting) && styles.buttonDisabled,
								]}
								onPress={handleCancelAppointment}
								disabled={!cancelReason.trim() || cancelSubmitting}
							>
								{cancelSubmitting ? (
									<ActivityIndicator size="small" color="#ffffff" />
								) : (
									<Text style={styles.modalPrimaryButtonText}>Submit</Text>
								)}
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</Modal>

			<AppModal visible={cancelSuccessOpen} onDismiss={() => setCancelSuccessOpen(false)}>
				<View style={[styles.successContent, isTablet && styles.successContentTablet]}>
					<View style={styles.cancelSuccessIconCircle}>
						<Ionicons name="close" size={34} color="#ffffff" />
					</View>

					<Text style={styles.successTitle}>You have successfully cancelled the appointment.</Text>

					<TouchableOpacity
						style={styles.successDoneButton}
						onPress={() => setCancelSuccessOpen(false)}
						activeOpacity={0.85}
					>
						<Text style={styles.successDoneText}>Done</Text>
					</TouchableOpacity>
				</View>
			</AppModal>
		</View>
	)
}

const styles = StyleSheet.create({
	card: {
		marginBottom: 16,
		paddingHorizontal: 12,
		paddingTop: 12,
		paddingBottom: 12,
		backgroundColor: '#FFFFFF',
		borderRadius: 16,
		borderWidth: 1,
		borderColor: '#E6EDF2',
	},
	headerRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
	},
	avatar: {
		width: 56,
		height: 56,
		borderRadius: 28,
		backgroundColor: '#F4F8FB',
		borderWidth: 2,
		alignItems: 'center',
		justifyContent: 'center',
		overflow: 'hidden',
	},
	avatarImage: {
		width: '100%',
		height: '100%',
	},
	headerText: {
		flex: 1,
		marginLeft: 12,
		minWidth: 0,
	},
	nameRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	doctorName: {
		flex: 1,
		fontSize: 17,
		fontWeight: '700',
		color: '#16324A',
		marginBottom: 2,
	},
	consultationType: {
		fontSize: 14,
		color: '#587087',
	},
	statusBadge: {
		borderRadius: 10,
		paddingHorizontal: 10,
		paddingVertical: 6,
		flexShrink: 0,
	},
	statusText: {
		fontSize: 12,
		fontWeight: '700',
	},
	metaRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		marginTop: 12,
		marginBottom: 10,
		gap: 10,
	},
	metaItem: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	metaText: {
		marginLeft: 5,
		fontSize: 13,
		color: '#4E667B',
	},
	locationPill: {
		minHeight: 34,
		borderRadius: 12,
		backgroundColor: '#F5F8FC',
		paddingHorizontal: 12,
		paddingVertical: 6,
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 12,
	},
	locationText: {
		flex: 1,
		marginLeft: 6,
		fontSize: 13,
		color: '#567085',
	},
	actionsRow: {
		flexDirection: 'row',
		gap: 10,
	},
	actionButton: {
		flex: 1,
		minWidth: 0,
		minHeight: 38,
		borderRadius: 14,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 10,
	},
	secondaryButton: {
		backgroundColor: '#FFFFFF',
		borderWidth: 1,
		borderColor: '#D8E1EA',
	},
	secondaryButtonText: {
		color: '#1A2A38',
		fontSize: 15,
		fontWeight: '500',
	},
	dangerButton: {
		backgroundColor: '#FFFFFF',
		borderWidth: 1,
		borderColor: '#F5D5D2',
	},
	dangerButtonText: {
		color: '#FF3B30',
		fontSize: 15,
		fontWeight: '500',
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(18, 28, 33, 0.35)',
		justifyContent: 'center',
		padding: 16,
	},
	modalCard: {
		width: '100%',
		maxHeight: '90%',
		borderRadius: 18,
		backgroundColor: '#ffffff',
		overflow: 'hidden',
	},
	modalCardTablet: {
		maxWidth: 720,
		alignSelf: 'center',
	},
	cancelCard: {
		width: '100%',
		borderRadius: 18,
		backgroundColor: '#ffffff',
		paddingHorizontal: 18,
		paddingTop: 16,
		paddingBottom: 18,
	},
	cancelCardTablet: {
		maxWidth: 520,
		alignSelf: 'center',
	},
	modalHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 18,
		paddingVertical: 14,
		borderBottomWidth: 1,
		borderBottomColor: '#edf2f5',
	},
	modalTitle: {
		flex: 1,
		color: '#1D2B36',
		fontSize: 17,
		fontWeight: '700',
		paddingRight: 12,
	},
	modalScrollContent: {
		paddingBottom: 8,
	},
	cancelHeader: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		justifyContent: 'space-between',
		gap: 12,
	},
	closeButton: {
		width: 32,
		height: 32,
		borderRadius: 16,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#f5f8fa',
		flexShrink: 0,
	},
	hospitalPicker: {
		paddingHorizontal: 16,
		paddingTop: 16,
	},
	modalLabel: {
		color: '#536672',
		fontSize: 13,
		fontWeight: '700',
		marginBottom: 10,
	},
	hospitalSelectTrigger: {
		minHeight: 48,
		borderWidth: 1,
		borderColor: '#d7e2e8',
		borderRadius: 12,
		paddingHorizontal: 14,
		backgroundColor: '#ffffff',
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 10,
	},
	hospitalSelectValue: {
		flex: 1,
		color: '#1D2B36',
		fontSize: 14,
		fontWeight: '600',
	},
	hospitalSelectPlaceholder: {
		color: '#8a9aa6',
	},
	hospitalDropdown: {
		marginTop: 8,
		maxHeight: 190,
		borderWidth: 1,
		borderColor: '#d7e2e8',
		borderRadius: 12,
		backgroundColor: '#ffffff',
		overflow: 'hidden',
	},
	hospitalDropdownItem: {
		minHeight: 46,
		paddingHorizontal: 14,
		paddingVertical: 11,
		borderBottomWidth: 1,
		borderBottomColor: '#eef3f5',
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 10,
	},
	hospitalDropdownItemSelected: {
		backgroundColor: '#eefafa',
	},
	hospitalDropdownText: {
		flex: 1,
		color: '#526173',
		fontSize: 14,
		fontWeight: '600',
		lineHeight: 18,
	},
	hospitalDropdownTextSelected: {
		color: '#0c7c7c',
	},
	modalActions: {
		flexDirection: 'row',
		gap: 10,
		padding: 16,
		borderTopWidth: 1,
		borderTopColor: '#edf2f5',
	},
	cancelActions: {
		flexDirection: 'row',
		gap: 10,
		marginTop: 16,
	},
	modalSecondaryButton: {
		flex: 1,
		minHeight: 44,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#d7e2e8',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#ffffff',
		paddingHorizontal: 12,
	},
	skipButton: {
		flex: 1,
		minHeight: 44,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#0c7c7c',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#ffffff',
		paddingHorizontal: 12,
	},
	modalSecondaryButtonText: {
		color: '#526173',
		fontSize: 14,
		fontWeight: '700',
	},
	modalPrimaryButton: {
		flex: 1,
		minHeight: 44,
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#0c7c7c',
		paddingHorizontal: 12,
	},
	modalPrimaryButtonText: {
		color: '#ffffff',
		fontSize: 14,
		fontWeight: '700',
	},
	buttonDisabled: {
		opacity: 0.55,
	},
	reasonInput: {
		marginTop: 16,
		minHeight: 104,
		borderWidth: 1,
		borderColor: '#d7e2e8',
		borderRadius: 12,
		paddingHorizontal: 12,
		paddingVertical: 10,
		color: '#1D2B36',
		fontSize: 14,
		lineHeight: 20,
	},
	successContent: {
		width: '100%',
		alignItems: 'center',
		paddingHorizontal: 4,
		paddingVertical: 8,
	},
	successContentTablet: {
		minWidth: 320,
	},
	cancelSuccessIconCircle: {
		width: 64,
		height: 64,
		borderRadius: 32,
		backgroundColor: '#FF3B30',
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 14,
	},
	successTitle: {
		color: '#1D2B36',
		fontSize: 18,
		fontWeight: '700',
		textAlign: 'center',
		lineHeight: 24,
		marginBottom: 20,
	},
	successDoneButton: {
		minWidth: 120,
		minHeight: 44,
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#0c7c7c',
		paddingHorizontal: 22,
	},
	successDoneText: {
		color: '#ffffff',
		fontSize: 14,
		fontWeight: '700',
	},
})
