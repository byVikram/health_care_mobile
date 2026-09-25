import React, { useEffect, useState } from 'react'
import {
	ActivityIndicator,
	Alert,
	Image,
	Modal,
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
import { useAuth } from '../../../context/AuthContext'
import { AppModal } from '../../../components/common/AppModal'
import { getStatusStyle } from '../../../constants/statusColors'
import AppointmentHistoryTab from './AppointmentHistoryTab'
import RescheduleModal, { type RescheduleResult } from './RescheduleModal'

// Design tokens matching the rest of the booking flow (Screens 1/2/3/5/7's
// teal family) -- no mockup screen depicts this card directly, so only
// color tokens are aligned here for consistency; layout/logic is unchanged.
const PRIMARY = '#2B6F71'
const INK = '#12373E'
const INK_MUTED = '#5B6B6E'
const DIVIDER = '#D5E1E2'

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

type AppointmentStatusOption = {
	id: string
	label: string
}

type MobileAppointmentCardProps<TAppointment extends MobileAppointmentRow = MobileAppointmentRow> = {
	row: TAppointment
	horizontalInset?: number
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
	const { width } = useWindowDimensions()
	const isTablet = width >= 768

	const [localRow, setLocalRow] = useState<MobileAppointmentRow>(row)
	const [detailsOpen, setDetailsOpen] = useState(false)
	const [cancelledStatusId, setCancelledStatusId] = useState('')
	const [cancelOpen, setCancelOpen] = useState(false)
	const [cancelReason, setCancelReason] = useState('')
	const [cancelSubmitting, setCancelSubmitting] = useState(false)
	const [cancelSuccessOpen, setCancelSuccessOpen] = useState(false)
	const [rescheduleOpen, setRescheduleOpen] = useState(false)

	useEffect(() => {
		setLocalRow(row)
	}, [row])

	const status = localRow.status || 'pending'
	const normalizedStatus = status.trim().toLowerCase()
	const statusStyle = getStatusStyle(status)
	const displayStatusText = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()
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
	const rescheduleDoctorId = localRow.doctorId || localRow.raw?.doctor?.id
	const rescheduleHospitalId = localRow.hospitalId || localRow.raw?.hospital?.id

	const openReschedule = () => {
		if (!rescheduleDoctorId) {
			Alert.alert('Unable to reschedule', 'Doctor details are missing for this appointment.')
			return
		}

		setRescheduleOpen(true)
	}

	const handleRescheduled = (result: RescheduleResult) => {
		setLocalRow((prev) => ({
			...prev,
			appointmentDate: result.appointmentDate,
			startTime: result.startTime,
			endTime: result.endTime ?? prev.endTime,
			dateLabel: formatDate(result.appointmentDate),
			timeLabel: formatTime(result.startTime),
			hospitalId: result.hospitalId,
			hospitalName: result.hospitalName || prev.hospitalName,
			status: result.status,
		}))
		setRescheduleOpen(false)
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
				<View style={[styles.avatar, 
					// { borderColor: statusStyle.color }
					{ borderColor: 'transparent' }
					]}>
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
							<Text style={[styles.statusText, { color: statusStyle.color }]}>{displayStatusText}</Text>
						</View>
					</View>
					<Text style={styles.consultationType}>{localRow.consultationType || 'Consultation'}</Text>
				</View>

				<TouchableOpacity
					style={styles.infoButton}
					onPress={() => setDetailsOpen(true)}
					activeOpacity={0.75}
					hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
				>
					<Ionicons name="information-circle-outline" size={22} color={PRIMARY} />
				</TouchableOpacity>
			</View>

			<View style={styles.metaRow}>
				<View style={styles.metaItem}>
					<Ionicons name="calendar-outline" size={16} color={INK_MUTED} />
					<Text style={styles.metaText}>{localRow.dateLabel || formatDate(localRow.appointmentDate)}</Text>
				</View>

				<View style={styles.metaItem}>
					<Ionicons name="time-outline" size={16} color={INK_MUTED} />
					<Text style={styles.metaText}>{localRow.timeLabel || formatTime(localRow.startTime)}</Text>
				</View>

				<View style={styles.metaItem}>
					<MaterialIcons name={isVirtual ? 'videocam' : 'location-on'} size={16} color={INK_MUTED} />
					<Text style={styles.metaText}>{displayMode}</Text>
				</View>
			</View>

			<View style={styles.locationPill}>
				<Ionicons name="location-sharp" size={14} color={INK_MUTED} />
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
						<Text style={styles.secondaryButtonText} numberOfLines={1} adjustsFontSizeToFit>
							Reschedule
						</Text>
					</TouchableOpacity>

					<TouchableOpacity
						activeOpacity={0.88}
						style={[styles.actionButton, styles.dangerButton]}
						onPress={openCancel}
					>
						<Text style={styles.dangerButtonText} numberOfLines={1} adjustsFontSizeToFit>
							Cancel
						</Text>
					</TouchableOpacity>
				</View>
			) : null}

			<RescheduleModal
				visible={rescheduleOpen}
				onClose={() => setRescheduleOpen(false)}
				appointmentId={localRow.id}
				doctorId={rescheduleDoctorId}
				hospitalId={rescheduleHospitalId}
				isVirtual={isVirtual}
				onRescheduled={handleRescheduled}
			/>

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
								<Ionicons name="close" size={22} color={INK_MUTED} />
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

			<AppointmentHistoryTab
				open={detailsOpen}
				onClose={() => setDetailsOpen(false)}
				appointmentId={localRow.id}
			/>
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
		borderColor: DIVIDER,
	},
	headerRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
	},
	infoButton: {
		width: 34,
		height: 34,
		borderRadius: 17,
		alignItems: 'center',
		justifyContent: 'center',
		marginLeft: 8,
		backgroundColor: '#EAF6F6',
		flexShrink: 0,
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
		color: INK,
		marginBottom: 2,
	},
	consultationType: {
		fontSize: 14,
		color: INK_MUTED,
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
		color: INK_MUTED,
	},
	actionsRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	actionButton: {
		flex: 1,
		minWidth: 0,
		minHeight: 38,
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 4,
	},
	secondaryButton: {
		backgroundColor: '#FFFFFF',
		borderWidth: 1,
		borderColor: DIVIDER,
	},
	secondaryButtonText: {
		color: INK,
		fontSize: 12.5,
		fontWeight: '700',
	},
	dangerButton: {
		backgroundColor: '#FFFFFF',
		borderWidth: 1,
		borderColor: '#F5D5D2',
	},
	dangerButtonText: {
		color: '#FF3B30',
		fontSize: 12.5,
		fontWeight: '700',
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(18, 28, 33, 0.35)',
		justifyContent: 'center',
		padding: 16,
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
	modalTitle: {
		flex: 1,
		color: INK,
		fontSize: 17,
		fontWeight: '700',
		paddingRight: 12,
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
	cancelActions: {
		flexDirection: 'row',
		gap: 10,
		marginTop: 16,
	},
	skipButton: {
		flex: 1,
		minHeight: 44,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: PRIMARY,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#ffffff',
		paddingHorizontal: 12,
	},
	reasonInput: {
		marginTop: 16,
		minHeight: 104,
		borderWidth: 1,
		borderColor: DIVIDER,
		borderRadius: 12,
		paddingHorizontal: 12,
		paddingVertical: 10,
		color: INK,
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
		color: INK,
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
		backgroundColor: PRIMARY,
		paddingHorizontal: 22,
	},
	successDoneText: {
		color: '#ffffff',
		fontSize: 14,
		fontWeight: '700',
	},
})
