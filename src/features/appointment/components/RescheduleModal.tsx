// src/features/appointment/components/RescheduleModal.tsx
//
// Shared reschedule screen used by both the Patient Dashboard
// (MobileAppointmentCard).
// Extracted so both places open the exact same reschedule experience
// instead of maintaining duplicate UI/logic.

import React, { useEffect, useState } from 'react'
import {
	ActivityIndicator,
	Alert,
	Modal,
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
	useWindowDimensions,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import DateSlotPicker from '../../../components/common/inputs/DateSlotPicker'
import { APPOINTMENT_STATUS } from '../../../constants/constants'
import {
	getDoctorAvailability,
	getDoctorById,
	rescheduleAppointment,
	type SlotGroup,
	type TimeSlot,
} from '../../doctor/doctorService'

// Design tokens matching the rest of the booking flow (Screens 1/2/3/5/7's
// teal family) -- no mockup screen depicts this modal directly, so only
// color tokens are aligned here for consistency; layout/logic is unchanged.
const PRIMARY = '#2B6F71'
const PRIMARY_TINT = '#E3EFEF'
const INK = '#12373E'
const INK_MUTED = '#5B6B6E'
const DIVIDER = '#D5E1E2'

export type RescheduleAppointmentMode = 'clinic' | 'video'

export type RescheduleResult = {
	appointmentDate: string
	startTime: string
	endTime: string | null
	hospitalId: string
	hospitalName?: string
	hospitalAddress?: string
	status: 'rescheduled'
}

type LookupHospital = {
	id: string
	label: string
	address?: string
}

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

export type RescheduleModalProps = {
	visible: boolean
	onClose: () => void
	appointmentId: string
	doctorId?: string | null
	hospitalId?: string | null
	isVirtual?: boolean
	onRescheduled: (result: RescheduleResult) => void
}

const toApiDate = (date: Date) => {
	const year = date.getFullYear()
	const month = String(date.getMonth() + 1).padStart(2, '0')
	const day = String(date.getDate()).padStart(2, '0')
	return `${year}-${month}-${day}`
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

export const normalizeAvailabilitySlots = (
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

export default function RescheduleModal({
	visible,
	onClose,
	appointmentId,
	doctorId,
	hospitalId,
	isVirtual,
	onRescheduled,
}: RescheduleModalProps) {
	const { width, height } = useWindowDimensions()
	const isTablet = width >= 768
	const isLandscape = width > height

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
		if (!visible) return
		setRescheduleDate(new Date())
		setRescheduleTime('')
		setRescheduleSlots([])
		setRescheduleHospitals([])
		setHospitalDropdownOpen(false)
		setRescheduleHospitalId(hospitalId || '')
		setAppointmentType(isVirtual ? 'video' : 'clinic')
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [visible])

	useEffect(() => {
		if (!visible || !doctorId) return

		let mounted = true

		const fetchDoctorHospitals = async () => {
			try {
				const res = await getDoctorById(doctorId)
				if (mounted && res.success && res.data) {
					const hospitals = (res.data.hospitals ?? []).map((hospital) => ({
						id: hospital.hospital.id,
						label: hospital.hospital.name,
						address: hospital.hospital.address,
					}))
					setRescheduleHospitals(hospitals)
					setRescheduleHospitalId((current) => current || hospitalId || hospitals[0]?.id || '')
				}
			} catch (error) {
				console.log('[RescheduleModal] fetch doctor hospitals error:', error)
			}
		}

		void fetchDoctorHospitals()

		return () => {
			mounted = false
		}
	}, [visible, doctorId, hospitalId])

	useEffect(() => {
		if (!visible) return

		const activeHospitalId = rescheduleHospitalId || hospitalId

		if (!doctorId || !activeHospitalId) {
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
					hospital_id: activeHospitalId,
					date: toApiDate(rescheduleDate),
				})
				if (mounted) setRescheduleSlots(normalizeAvailabilitySlots(responseData, appointmentType))
			} catch (error) {
				console.log('[RescheduleModal] fetch reschedule slots error:', error)
				if (mounted) Alert.alert('Error', 'Could not load available slots.')
			} finally {
				if (mounted) setRescheduleSlotsLoading(false)
			}
		}

		void fetchSlots()

		return () => {
			mounted = false
		}
	}, [visible, appointmentType, doctorId, hospitalId, rescheduleDate, rescheduleHospitalId])

	const rescheduleColumns = isTablet || isLandscape ? 4 : 3
	const selectedHospitalLabel =
		rescheduleHospitals.find((hospital) => hospital.id === rescheduleHospitalId)?.label || 'Choose Hospital'
	const canConfirmReschedule = Boolean(
		rescheduleDate &&
			rescheduleTime &&
			(rescheduleHospitalId || hospitalId) &&
			!rescheduleSlotsLoading &&
			!rescheduleSubmitting
	)

	const handleRescheduleDateChange = (date: Date) => {
		setRescheduleDate(date)
		setRescheduleTime('')
		setRescheduleSlots([])
	}

	const getSelectedRescheduleSlot = () =>
		rescheduleSlots.flatMap((group) => group.slots).find((slot) => slot.start_time === rescheduleTime)

	const handleClose = () => {
		if (rescheduleSubmitting) return
		setHospitalDropdownOpen(false)
		onClose()
	}

	const handleRescheduleConfirm = async () => {
		if (!rescheduleTime) {
			Alert.alert('Select time', 'Please select a time slot before confirming.')
			return
		}

		const activeHospitalId = rescheduleHospitalId || hospitalId
		const selectedSlot = getSelectedRescheduleSlot()
		const selectedHospital = rescheduleHospitals.find((hospital) => hospital.id === activeHospitalId)
		const dateStr = toApiDate(rescheduleDate)

		if (!activeHospitalId) {
			Alert.alert('Select hospital', 'Please select a hospital before confirming.')
			return
		}

		setRescheduleSubmitting(true)
		try {
			const res = await rescheduleAppointment({
				appointment_id: appointmentId,
				appointment_date: dateStr,
				start_time: rescheduleTime,
				end_time: selectedSlot?.end_time ?? null,
				hospital_id: activeHospitalId,
				reason: 'Patient requested reschedule',
				status_id: APPOINTMENT_STATUS.CONFIRM,
			})

			if (res.success) {
				onRescheduled({
					appointmentDate: dateStr,
					startTime: rescheduleTime,
					endTime: selectedSlot?.end_time ?? null,
					hospitalId: activeHospitalId,
					hospitalName: selectedHospital?.label,
					hospitalAddress: selectedHospital?.address,
					status: 'rescheduled',
				})
				setHospitalDropdownOpen(false)
				Alert.alert('Success', 'Appointment rescheduled successfully.')
			} else {
				Alert.alert('Error', res.message || 'Reschedule failed. Please try again.')
			}
		} catch (error: any) {
			console.log('[RescheduleModal] reschedule appointment error:', error?.response?.data || error?.message || error)
			Alert.alert('Error', 'Something went wrong. Please try again.')
		} finally {
			setRescheduleSubmitting(false)
		}
	}

	return (
		<Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
			<View style={styles.modalOverlay}>
				<View style={[styles.modalCard, isTablet && styles.modalCardTablet]}>
					<View style={styles.modalHeader}>
						<Text style={styles.modalTitle}>Reschedule Appointment</Text>
						<TouchableOpacity
							onPress={handleClose}
							disabled={rescheduleSubmitting}
							hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
						>
							<Ionicons name="close" size={22} color={INK_MUTED} />
						</TouchableOpacity>
					</View>

					<ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollContent}>
						{rescheduleHospitals.length > 0 ? (
							<View style={styles.hospitalPicker}>
								<Text style={styles.modalLabel}>Choose Hospital</Text>
								<View style={styles.hospitalSelectWrapper}>
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
											color={INK_MUTED}
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
															{selected ? <Ionicons name="checkmark-circle" size={18} color={PRIMARY} /> : null}
														</TouchableOpacity>
													)
												})}
											</ScrollView>
										</View>
									) : null}
								</View>
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
							onPress={handleClose}
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
	)
}

const styles = StyleSheet.create({
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
	modalHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 18,
		paddingVertical: 14,
		borderBottomWidth: 1,
		borderBottomColor: DIVIDER,
	},
	modalTitle: {
		flex: 1,
		color: INK,
		fontSize: 17,
		fontWeight: '700',
		paddingRight: 12,
	},
	modalScrollContent: {
		paddingBottom: 8,
	},
	hospitalPicker: {
		paddingHorizontal: 16,
		paddingTop: 16,
		position: 'relative',
		zIndex: 20,
	},
	hospitalSelectWrapper: {
		position: 'relative',
		zIndex: 20,
	},
	modalLabel: {
		color: INK_MUTED,
		fontSize: 13,
		fontWeight: '700',
		marginBottom: 10,
	},
	hospitalSelectTrigger: {
		minHeight: 48,
		borderWidth: 1,
		borderColor: DIVIDER,
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
		color: INK,
		fontSize: 14,
		fontWeight: '600',
	},
	hospitalSelectPlaceholder: {
		color: INK_MUTED,
	},
	hospitalDropdown: {
		position: 'absolute',
		top: '100%',
		left: 0,
		right: 0,
		marginTop: 8,
		maxHeight: 190,
		borderWidth: 1,
		borderColor: DIVIDER,
		borderRadius: 12,
		backgroundColor: '#ffffff',
		overflow: 'hidden',
		zIndex: 30,
		elevation: 8,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.15,
		shadowRadius: 8,
	},
	hospitalDropdownItem: {
		minHeight: 46,
		paddingHorizontal: 14,
		paddingVertical: 11,
		borderBottomWidth: 1,
		borderBottomColor: DIVIDER,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 10,
	},
	hospitalDropdownItemSelected: {
		backgroundColor: PRIMARY_TINT,
	},
	hospitalDropdownText: {
		flex: 1,
		color: INK_MUTED,
		fontSize: 14,
		fontWeight: '600',
		lineHeight: 18,
	},
	hospitalDropdownTextSelected: {
		color: PRIMARY,
	},
	modalActions: {
		flexDirection: 'row',
		gap: 10,
		padding: 16,
		borderTopWidth: 1,
		borderTopColor: DIVIDER,
	},
	modalSecondaryButton: {
		flex: 1,
		minHeight: 44,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: DIVIDER,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#ffffff',
		paddingHorizontal: 12,
	},
	modalSecondaryButtonText: {
		color: INK_MUTED,
		fontSize: 14,
		fontWeight: '700',
	},
	modalPrimaryButton: {
		flex: 1,
		minHeight: 44,
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: PRIMARY,
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
})
