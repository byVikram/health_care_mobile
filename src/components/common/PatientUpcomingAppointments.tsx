import React, { useEffect, useMemo, useState } from 'react'
import {
	ActivityIndicator,
	Alert,
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
import ApiService from '../../services/apiService'
import { API_ENDPOINTS } from '../../constants/apiUrls'
import { APPOINTMENT_STATUS } from '../../constants/constants'
import DateSlotPicker from './DateSlotPicker'
import {
	getAppointments,
	getDoctorAvailability,
	getDoctorById,
	rescheduleAppointment,
	type SlotGroup,
} from '../../features/doctor/doctorService'
import type { Appointment, AppointmentStatus } from '../../types/appointment'

export type PatientAppointmentStatus = 'confirmed' | 'pending' | 'cancelled' | 'completed' | 'rescheduled' | string
export type PatientAppointmentMode = 'in-person' | 'virtual'

type ApiAppointment = Appointment & {
	start_time?: string
	end_time?: string
	appointment_time?: string
	public_id?: string
}

type LookupHospital = {
	id: string
	label: string
}

export type PatientAppointmentItem = {
	id: string
	doctorName: string
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
	raw?: ApiAppointment
}

type PatientUpcomingAppointmentsProps = {
	appointments?: PatientAppointmentItem[]
	onJoin?: (appointment: PatientAppointmentItem) => void
	onReschedule?: (appointment: PatientAppointmentItem) => void
	onCancel?: (appointment: PatientAppointmentItem) => void
}

const STATUS_STYLES: Record<string, { color: string; bgColor: string; text: string }> = {
	confirmed: { color: '#10b981', bgColor: 'rgba(16, 185, 129, 0.1)', text: 'Confirmed' },
	pending: { color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.1)', text: 'Pending' },
	cancelled: { color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.1)', text: 'Cancelled' },
	completed: { color: '#6366f1', bgColor: 'rgba(99, 102, 241, 0.1)', text: 'Completed' },
	rescheduled: { color: '#8b5cf6', bgColor: 'rgba(139, 92, 246, 0.1)', text: 'Rescheduled' },
}

const getStatusStyle = (status: string) =>
	STATUS_STYLES[status?.toLowerCase()] ?? { color: '#64748b', bgColor: '#f1f5f9', text: status || 'Pending' }

const toApiDate = (date: Date) => date.toISOString().split('T')[0]

const formatDate = (dateStr?: string) => {
	if (!dateStr) return '-'
	const d = new Date(dateStr)
	if (Number.isNaN(d.getTime())) return dateStr
	return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'long' })
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

const mapApiAppointment = (appointment: ApiAppointment, localStatuses: Record<string, string>): PatientAppointmentItem => {
	const status = localStatuses[appointment.id] || getStatusValue(appointment.status)
	const isVirtual = appointment.appointment_mode === 'online'
	const hospitalAddress = appointment.hospital?.address ?? ''

	return {
		id: appointment.id,
		doctorName: appointment.doctor?.name ?? 'Doctor',
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
		raw: appointment,
	}
}

export default function PatientUpcomingAppointments({
	appointments,
	onJoin,
}: PatientUpcomingAppointmentsProps) {
	const { width, height } = useWindowDimensions()
	const isTablet = width >= 768
	const isLandscape = width > height
	const shouldFetchAppointments = appointments === undefined

	const [apiAppointments, setApiAppointments] = useState<ApiAppointment[]>([])
	const [loading, setLoading] = useState(shouldFetchAppointments)
	const [error, setError] = useState('')
	const [localStatuses, setLocalStatuses] = useState<Record<string, string>>({})
	const [localReschedules, setLocalReschedules] = useState<Record<string, Partial<PatientAppointmentItem>>>({})
	const [cancelledStatusId, setCancelledStatusId] = useState('')

	const [cancelOpen, setCancelOpen] = useState(false)
	const [cancelAppt, setCancelAppt] = useState<PatientAppointmentItem | null>(null)
	const [cancelReason, setCancelReason] = useState('')
	const [cancelSubmitting, setCancelSubmitting] = useState(false)

	const [rescheduleOpen, setRescheduleOpen] = useState(false)
	const [rescheduleAppt, setRescheduleAppt] = useState<PatientAppointmentItem | null>(null)
	const [rescheduleDate, setRescheduleDate] = useState(new Date())
	const [rescheduleTime, setRescheduleTime] = useState('')
	const [rescheduleSlots, setRescheduleSlots] = useState<SlotGroup[]>([])
	const [rescheduleSlotsLoading, setRescheduleSlotsLoading] = useState(false)
	const [rescheduleSubmitting, setRescheduleSubmitting] = useState(false)
	const [rescheduleHospitals, setRescheduleHospitals] = useState<LookupHospital[]>([])
	const [rescheduleHospitalId, setRescheduleHospitalId] = useState('')
	const [hospitalDropdownOpen, setHospitalDropdownOpen] = useState(false)
	const [appointmentType, setAppointmentType] = useState<'clinic' | 'video'>('clinic')

	useEffect(() => {
		let mounted = true

		const fetchData = async () => {
			try {
				setLoading(true)
				setError('')
				const [apptRes, statusRes] = await Promise.all([
					shouldFetchAppointments ? getAppointments({ limit: 10 }) : Promise.resolve(null),
					ApiService.get<{ success: boolean; data: AppointmentStatus[] }>(API_ENDPOINTS.APPOINTMENTS.STATUSES),
				])

				if (!mounted) return

				if (apptRes) {
					if (apptRes.success) {
						setApiAppointments(Array.isArray(apptRes.data) ? (apptRes.data as ApiAppointment[]) : [])
					} else {
						setError(apptRes.message ?? 'Failed to load appointments')
					}
				}

				const cancelledStatus = statusRes.data?.data?.find((status) => status.label === 'cancelled')
				if (cancelledStatus) setCancelledStatusId(cancelledStatus.id)
			} catch {
				if (mounted && shouldFetchAppointments) setError('Failed to load appointments')
			} finally {
				if (mounted) setLoading(false)
			}
		}

		fetchData()

		return () => {
			mounted = false
		}
	}, [shouldFetchAppointments])

	useEffect(() => {
		if (!rescheduleAppt || !rescheduleOpen) return

		const fetchDoctorHospitals = async () => {
			const doctorId = rescheduleAppt.doctorId || rescheduleAppt.raw?.doctor?.id
			if (!doctorId) return

			try {
				const res = await getDoctorById(doctorId)
				if (res.success && res.data) {
					setRescheduleHospitals(
						res.data.hospitals.map((hospital) => ({
							id: hospital.hospital.id,
							label: hospital.hospital.name,
						}))
					)
				}
			} catch {
				console.log('Failed to fetch doctor hospitals')
			}
		}

		fetchDoctorHospitals()
	}, [rescheduleAppt, rescheduleOpen])

	useEffect(() => {
		if (!rescheduleOpen || !rescheduleAppt) return

		const doctorId = rescheduleAppt.doctorId || rescheduleAppt.raw?.doctor?.id
		const hospitalId = rescheduleHospitalId || rescheduleAppt.hospitalId || rescheduleAppt.raw?.hospital?.id

		if (!doctorId || !hospitalId) return

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
				let processedData: SlotGroup[] = []
				if (Array.isArray(responseData)) {
					processedData = responseData
				} else if (responseData && Array.isArray(responseData.data)) {
					processedData = responseData.data
				}
				setRescheduleSlots(processedData)
			} catch {
				Alert.alert('Error', 'Could not load available slots.')
			} finally {
				setRescheduleSlotsLoading(false)
			}
		}

		fetchSlots()
	}, [rescheduleDate, rescheduleOpen, rescheduleAppt, rescheduleHospitalId])

	const displayedAppointments = useMemo(() => {
		if (appointments) {
			return appointments
				.map((appointment) => ({
					...appointment,
					status: localStatuses[appointment.id] || appointment.status,
					...(localReschedules[appointment.id] || {}),
				}))
				.filter((appointment) => appointment.status !== 'cancelled')
		}

		return apiAppointments.map((appointment) => {
			const mappedAppointment = mapApiAppointment(appointment, localStatuses)
			return {
				...mappedAppointment,
				...(localReschedules[mappedAppointment.id] || {}),
			}
		})
	}, [apiAppointments, appointments, localStatuses, localReschedules])

	const openReschedule = (appointment: PatientAppointmentItem) => {
		setRescheduleAppt(appointment)
		setRescheduleHospitalId(appointment.hospitalId || appointment.raw?.hospital?.id || '')
		setRescheduleDate(new Date())
		setRescheduleTime('')
		setRescheduleSlots([])
		setRescheduleHospitals([])
		setHospitalDropdownOpen(false)
		setAppointmentType(appointment.mode === 'virtual' ? 'video' : 'clinic')
		setRescheduleOpen(true)
	}

	const handleRescheduleDateChange = (date: Date) => {
		setRescheduleDate(date)
		setRescheduleTime('')
		setRescheduleSlots([])
	}

	const resolveRescheduleHospitalId = () =>
		rescheduleHospitalId || rescheduleAppt?.hospitalId || rescheduleAppt?.raw?.hospital?.id || ''

	const getSelectedRescheduleSlot = () =>
		rescheduleSlots.flatMap((group) => group.slots).find((slot) => slot.start_time === rescheduleTime)

	const handleRescheduleConfirm = async () => {
		if (!rescheduleAppt || !rescheduleTime) {
			Alert.alert('Select time', 'Please select a time slot before confirming.')
			return
		}

		const hospitalId = resolveRescheduleHospitalId()
		const dateStr = toApiDate(rescheduleDate)
		const selectedSlot = getSelectedRescheduleSlot()
		const selectedHospital = rescheduleHospitals.find((hospital) => hospital.id === hospitalId)

		if (!hospitalId) {
			Alert.alert('Select hospital', 'Please select a hospital before confirming.')
			return
		}

		setRescheduleSubmitting(true)
		try {
			const res = await rescheduleAppointment({
				appointment_id: rescheduleAppt.id,
				appointment_date: dateStr,
				start_time: rescheduleTime,
				end_time: selectedSlot?.end_time ?? null,
				hospital_id: hospitalId,
				reason: 'Patient requested reschedule',
				status_id: APPOINTMENT_STATUS.CONFIRM,
			})

			if (res.success) {
				Alert.alert('Success', res.message || 'Appointment rescheduled!')
				const nextHospitalName = selectedHospital?.label || rescheduleAppt.hospitalName
				const nextDetails: Partial<PatientAppointmentItem> = {
					appointmentDate: dateStr,
					startTime: rescheduleTime,
					dateLabel: formatDate(dateStr),
					timeLabel: formatTime(rescheduleTime),
					hospitalId,
					hospitalName: nextHospitalName,
					status: 'rescheduled',
				}

				setApiAppointments((prev) =>
					prev.map((appointment) =>
						appointment.id === rescheduleAppt.id
							? {
									...appointment,
									appointment_date: dateStr,
									appointment_time: rescheduleTime,
									start_time: rescheduleTime,
									end_time: selectedSlot?.end_time ?? appointment.end_time,
									hospital: appointment.hospital
										? {
												...appointment.hospital,
												id: hospitalId,
												name: nextHospitalName,
											}
										: appointment.hospital,
								}
							: appointment
					)
				)
				setLocalStatuses((prev) => ({ ...prev, [rescheduleAppt.id]: 'rescheduled' }))
				setLocalReschedules((prev) => ({ ...prev, [rescheduleAppt.id]: nextDetails }))
				setHospitalDropdownOpen(false)
				setRescheduleOpen(false)
			} else {
				Alert.alert('Error', res.message || 'Reschedule failed. Please try again.')
			}
		} catch (err: any) {
			console.log('RESCHEDULE ERROR', err?.response?.data || err?.message || err)
			Alert.alert('Error', 'Something went wrong. Please try again.')
		} finally {
			setRescheduleSubmitting(false)
		}
	}

	const openCancel = (appointment: PatientAppointmentItem) => {
		setCancelAppt(appointment)
		setCancelReason('')
		setCancelOpen(true)
	}

	const handleCancelAppointment = async () => {
		if (!cancelAppt || !cancelledStatusId) return

		setCancelSubmitting(true)
		try {
			const res = await ApiService.patch<{ success: boolean; message: string }>(
				API_ENDPOINTS.APPOINTMENTS.UPDATE,
				{
					appointment_id: cancelAppt.id,
					status_id: cancelledStatusId,
					reason: cancelReason,
				}
			)

			if (res.data?.success) {
				Alert.alert('Success', 'Appointment cancelled successfully')
				setApiAppointments((prev) => prev.filter((appointment) => appointment.id !== cancelAppt.id))
				setLocalStatuses((prev) => ({ ...prev, [cancelAppt.id]: 'cancelled' }))
				setCancelOpen(false)
				setCancelReason('')
			} else {
				Alert.alert('Error', res.data?.message || 'Failed to cancel appointment')
			}
		} catch {
			Alert.alert('Error', 'Something went wrong. Please try again.')
		} finally {
			setCancelSubmitting(false)
		}
	}

	const rescheduleColumns = isTablet || isLandscape ? 4 : 3
	const canConfirmReschedule = Boolean(
		rescheduleAppt &&
			rescheduleDate &&
			rescheduleTime &&
			resolveRescheduleHospitalId() &&
			!rescheduleSlotsLoading &&
			!rescheduleSubmitting
	)
	const selectedHospitalLabel =
		rescheduleHospitals.find((hospital) => hospital.id === rescheduleHospitalId)?.label || 'Choose Hospital'

	return (
		<View style={[styles.section, isTablet && styles.sectionTablet]}>
			<View style={styles.sectionHeader}>
				<Text style={styles.sectionTitle}>Upcoming Appointments</Text>
				<View style={styles.countBadge}>
					<Text style={styles.countBadgeText}>{displayedAppointments.length}</Text>
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
				? displayedAppointments.map((appointment) => {
						const status = getStatusValue(appointment.status)
						const statusStyle = getStatusStyle(status)
						const isVirtual = appointment.mode === 'virtual'
						const canJoin = isVirtual && status === 'confirmed'
						const canAct = status !== 'cancelled' && status !== 'completed'

						return (
							<View
								key={appointment.id}
								style={[
									styles.card,
									{ borderTopColor: status === 'cancelled' ? '#fee2e2' : statusStyle.color },
								]}
							>
								<View style={styles.headerRow}>
									<View style={[styles.avatar, { borderColor: statusStyle.color }]}>
										<Ionicons name="person-outline" size={26} color="#5B7186" />
									</View>

									<View style={styles.headerText}>
										<View style={styles.nameRow}>
											<Text style={styles.doctorName} numberOfLines={1}>
												{appointment.doctorName}
											</Text>
											<View style={[styles.statusBadge, { backgroundColor: statusStyle.bgColor }]}>
												<Text style={[styles.statusText, { color: statusStyle.color }]}>
													{statusStyle.text}
												</Text>
											</View>
										</View>
										<Text style={styles.consultationType}>{appointment.consultationType}</Text>
									</View>
								</View>

								<View style={styles.metaRow}>
									<View style={styles.metaItem}>
										<Ionicons name="calendar-outline" size={16} color="#667B8F" />
										<Text style={styles.metaText}>{appointment.dateLabel}</Text>
									</View>

									<View style={styles.metaItem}>
										<Ionicons name="time-outline" size={16} color="#667B8F" />
										<Text style={styles.metaText}>{appointment.timeLabel}</Text>
									</View>

									<View style={styles.metaItem}>
										<MaterialIcons
											name={isVirtual ? 'videocam' : 'location-on'}
											size={16}
											color="#667B8F"
										/>
										<Text style={styles.metaText}>{isVirtual ? 'Virtual' : 'In-person'}</Text>
									</View>
								</View>

								<View style={styles.locationPill}>
									<Ionicons name="location-sharp" size={14} color="#667B8F" />
									<Text style={styles.locationText} numberOfLines={2}>
										{appointment.hospitalName} {'\u2022'} {appointment.address}
									</Text>
								</View>

								{canAct ? (
									<View style={[styles.actionsRow, !isTablet && styles.actionsRowMobile]}>
										{canJoin ? (
											<TouchableOpacity
												activeOpacity={0.88}
												style={[styles.actionButton, styles.joinButton]}
												onPress={() => onJoin?.(appointment)}
											>
												<MaterialIcons name="videocam" size={16} color="#fff" />
												<Text style={styles.joinButtonText}>Join</Text>
											</TouchableOpacity>
										) : null}

										<TouchableOpacity
											activeOpacity={0.88}
											style={[styles.actionButton, styles.secondaryButton, styles.flexButton]}
											onPress={() => openReschedule(appointment)}
										>
											<Text style={styles.secondaryButtonText}>Reschedule</Text>
										</TouchableOpacity>

										<TouchableOpacity
											activeOpacity={0.88}
											style={[styles.actionButton, styles.dangerButton, styles.flexButton]}
											onPress={() => openCancel(appointment)}
										>
											<Text style={styles.dangerButtonText}>Cancel</Text>
										</TouchableOpacity>
									</View>
								) : null}
							</View>
						)
					})
				: null}

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
								onPress={() => {
									if (!rescheduleSubmitting) setRescheduleOpen(false)
								}}
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
		</View>
	)
}

const styles = StyleSheet.create({
	section: {
		marginTop: 4,
		marginBottom: 12,
	},
	sectionTablet: {
		maxWidth: 720,
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
		fontSize: 18,
		fontWeight: '700',
		color: '#1D2B36',
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
	card: {
		marginHorizontal: 16,
		marginBottom: 16,
		paddingHorizontal: 16,
		paddingTop: 16,
		paddingBottom: 14,
		backgroundColor: '#FFFFFF',
		borderRadius: 20,
		borderWidth: 1,
		borderTopWidth: 4,
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
		marginBottom: 4,
	},
	consultationType: {
		fontSize: 15,
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
		marginTop: 16,
		marginBottom: 14,
		gap: 14,
	},
	metaItem: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	metaText: {
		marginLeft: 5,
		fontSize: 14,
		color: '#4E667B',
	},
	locationPill: {
		minHeight: 38,
		borderRadius: 12,
		backgroundColor: '#F5F8FC',
		paddingHorizontal: 12,
		paddingVertical: 8,
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 16,
	},
	locationText: {
		flex: 1,
		marginLeft: 6,
		fontSize: 14,
		color: '#567085',
	},
	actionsRow: {
		flexDirection: 'row',
		gap: 10,
	},
	actionsRowMobile: {
		flexWrap: 'wrap',
	},
	actionButton: {
		minHeight: 42,
		borderRadius: 14,
		alignItems: 'center',
		justifyContent: 'center',
		flexDirection: 'row',
		paddingHorizontal: 14,
	},
	joinButton: {
		flex: 1,
		backgroundColor: '#0F6B68',
	},
	joinButtonText: {
		marginLeft: 6,
		color: '#FFFFFF',
		fontSize: 16,
		fontWeight: '700',
	},
	secondaryButton: {
		backgroundColor: '#FFFFFF',
		borderWidth: 1,
		borderColor: '#D8E1EA',
	},
	secondaryButtonText: {
		color: '#1A2A38',
		fontSize: 16,
		fontWeight: '500',
	},
	dangerButton: {
		backgroundColor: '#FFFFFF',
		borderWidth: 1,
		borderColor: '#F5D5D2',
	},
	dangerButtonText: {
		color: '#FF3B30',
		fontSize: 16,
		fontWeight: '500',
	},
	flexButton: {
		flex: 1,
		minWidth: 112,
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
})
