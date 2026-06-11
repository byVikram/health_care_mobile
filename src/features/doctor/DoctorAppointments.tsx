import React, { useEffect, useState } from 'react'
import {
	View,
	Text,
	TextInput,
	ScrollView,
	StyleSheet,
	TouchableOpacity,
	Pressable,
	useWindowDimensions,
	Alert,
	Modal,
	ActivityIndicator,
} from 'react-native'
import Toast from 'react-native-toast-message'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useNavigation, type NavigationProp } from '@react-navigation/native'
import { AppSkeleton } from '../../components/common'
import {
	getDoctorAvailability,
	updateAppointmentsStatus,
	rescheduleAppointment,
	referAppointment,
	getFavouriteDoctors,
	toggleFavouriteDoctor,
	getDoctors,
	getDoctorById,
	getDoctorProfile,
	type FavouriteDoctor,
	type SlotGroup,
} from './doctorService'
import { DateSlotPicker } from '../../components/common'
import { APPOINTMENT_STATUS } from '../../constants/constants'
import { ROUTES } from '../../navigation/routes'
import type { AppStackParamList } from '../../navigation/types'
import { navigate as navigateRoot } from '../../navigation/navigationService'
import DoctorHospitalDropdown from '../../components/common/DoctorHospitalDropdown'
import { useAuth } from '../../context/AuthContext'
import FavouriteDoctorList from './search/components/FavouriteDoctorList'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

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
	appointment_mode?: string
	mode?: string
	type?: string
	start_time: string
	end_time?: string
	symptoms?: string | string[]
	symptom?: string
	symptom_description?: string
	chief_complaint?: string
	complaint?: string
}

type ReferDoctor = {
	id: string
	name: string
	avatar_s3_key: string | null
	location: string | null
	experience_years: number | null
	specialities: string[]
	is_verified?: boolean
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

type AppointmentModeKey = 'clinic' | 'video'
type AppointmentModeIcon = {
	name: React.ComponentProps<typeof MaterialCommunityIcons>['name']
	color: string
	backgroundColor: string
}

type AvailabilityAppointmentMode = 'clinic_visit' | 'video_call' | 'offline' | 'online' | 'clinic' | 'video' | string

type AvailabilityApiSlot = {
	start_time?: string
	end_time?: string
	status?: 'AVAILABLE' | 'BOOKED' | 'UNAVAILABLE' | 'BLOCKED' | 'OCCUPIED' | ''
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
	appointment_mode?: AvailabilityAppointmentMode
	sessions?: AvailabilityApiSession[]
	label?: string
	range?: string
	period?: string
	slots?: AvailabilityApiSlot[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const TEAL = '#1a8c8c'
const DOCTOR_IMAGE_PLACEHOLDER = require('../../assets/Banner/doctor.png')

const showSuccess = (message: string) =>
	Toast.show({ type: 'success', text1: 'Success', text2: message })

const showError = (message: string) =>
	Toast.show({ type: 'error', text1: 'Error', text2: message })

/**
 * Extracts the hospital id from an appointment, handling every possible shape
 * that different API endpoints return.
 */
function getAptHospitalId(apt: any): string {
	const raw =
		apt?.hospital?.id ??
		apt?.hospital_id ??
		apt?.hospital?.hospital_id ??
		apt?.pivot?.hospital_id ??
		''
	return raw ? String(raw) : ''
}

const getModeKey = (mode?: string | null): AppointmentModeKey => {
	const normalized = String(mode || '').toLowerCase()
	if (normalized === 'video_call' || normalized === 'online' || normalized === 'video') {
		return 'video'
	}
	return 'clinic'
}

const getAppointmentModeKey = (appointment?: Appointment | null): AppointmentModeKey => {
	const rawMode =
		appointment?.appointment_mode ||
		appointment?.mode ||
		appointment?.type ||
		(appointment as any)?.appointment_type ||
		(appointment as any)?.consultation_type

	return getModeKey(rawMode)
}

const normalizeSlotStatus = (slot: AvailabilityApiSlot): SlotGroup['slots'][number]['status'] => {
	if (slot.is_booked || slot.status === 'OCCUPIED') return 'OCCUPIED'
	if (slot.is_enabled === false) return 'UNAVAILABLE'
	return slot.status || 'AVAILABLE'
}

const normalizeAvailabilityByMode = (
	response: unknown
): Record<AppointmentModeKey, SlotGroup[]> => {
	const rawData = Array.isArray(response)
		? response
		: Array.isArray((response as { data?: unknown })?.data)
			? ((response as { data: AvailabilityApiModeGroup[] }).data)
			: []

	const grouped: Record<AppointmentModeKey, SlotGroup[]> = {
		clinic: [],
		video: [],
	}

	rawData.forEach((item: AvailabilityApiModeGroup, itemIndex) => {
		const hasModeStructure =
			Boolean(item.appointment_mode) || Array.isArray(item.sessions)
		const modeKey = hasModeStructure ? getModeKey(item.appointment_mode) : 'clinic'
		const sessions =
			Array.isArray(item.sessions) && item.sessions.length > 0
				? item.sessions
				: [{ label: item.label, range: item.range, period: item.period, slots: item.slots }]

		const normalizedSessions = sessions
			.map((session, sessionIndex): SlotGroup => {
				const range = session.range || session.period || ''
				const label = session.label || `Session ${sessionIndex + 1}`
				const groupLabel = range ? `${label} (${range})` : label

				return {
					label: groupLabel,
					period: range,
					range,
					slots: (session.slots || [])
						.filter((slot) => slot.start_time)
						.map((slot, slotIndex) => ({
							id: `${modeKey}-${itemIndex}-${sessionIndex}-${slot.start_time}-${slotIndex}`,
							start_time: String(slot.start_time || ''),
							end_time: String(slot.end_time || ''),
							status: normalizeSlotStatus(slot),
							is_enabled: slot.is_enabled,
							is_booked: slot.is_booked,
							can_toggle: slot.can_toggle,
						})),
				}
			})
			.filter((session) => session.slots.length > 0)

		grouped[modeKey] = [...grouped[modeKey], ...normalizedSessions]
	})

	return grouped
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function DoctorAppointments({
	selectedDate,
	setSelectedDate,
	appointments,
	apptLoading,
	apptError,
	weekDays,
	selectedDateObj,
}: DoctorAppointmentsProps) {
	const { width, height } = useWindowDimensions()
	const isTablet = width >= 768
	const useCompactCancelledLayout = width < 640
	const navigation = useNavigation<NavigationProp<AppStackParamList>>()

	// ── Read the globally selected hospital ID from AuthContext ───────────────
	//    DoctorHospitalDropdown (in the header) writes both:
	//      • selectedHospital   → display name
	//      • selectedHospitalId → numeric/string id used for filtering & API calls
	const { selectedHospitalId: contextHospitalId } = useAuth() as any

	// ── Filter appointments by selected hospital ──────────────────────────────
	//    contextHospitalId === null | undefined | '' → show ALL appointments
	const filteredAppointments =
		contextHospitalId
			? appointments.filter(
					(apt) => getAptHospitalId(apt) === String(contextHospitalId)
				)
			: appointments

	// ── Reschedule state ──────────────────────────────────────────────────────
	const [rescheduleOpen, setRescheduleOpen] = useState(false)
	const [rescheduleAppt, setRescheduleAppt] = useState<Appointment | null>(null)
	const [rescheduleDate, setRescheduleDate] = useState<Date>(new Date())
	const [selectedSlot, setSelectedSlot] = useState('')
	const [rescheduleSlots, setRescheduleSlots] = useState<any[]>([])
	const [rescheduleSlotsLoading, setRescheduleSlotsLoading] = useState(false)
const [successModalVisible, setSuccessModalVisible] = useState(false)
const [successMessage, setSuccessMessage] = useState('')
	const [symptomsPopover, setSymptomsPopover] = useState({
		visible: false,
		message: '',
		x: 0,
		y: 0,
	})
	// ── Optimistic UI sets ────────────────────────────────────────────────────
	const [confirmedIds, setConfirmedIds] = useState<Set<string>>(new Set())
	const [rejectedIds, setRejectedIds] = useState<Set<string>>(new Set())

	// ── Reject modal ──────────────────────────────────────────────────────────
	const [rejectModalId, setRejectModalId] = useState<string | null>(null)

	// ── Refer modal ───────────────────────────────────────────────────────────
	const [referOpen, setReferOpen] = useState(false)
	const [referAppt, setReferAppt] = useState<Appointment | null>(null)
	const [referQuery, setReferQuery] = useState('')
	const [favouriteDoctors, setFavouriteDoctors] = useState<ReferDoctor[]>([])
	const [favouriteDoctorIds, setFavouriteDoctorIds] = useState<Set<string>>(new Set())
	const [referSearchResults, setReferSearchResults] = useState<ReferDoctor[]>([])
	const [referLoading, setReferLoading] = useState(false)
	const [referSearchLoading, setReferSearchLoading] = useState(false)
	const [referringIds, setReferringIds] = useState<Set<string>>(new Set())
	const [bookmarkingIds, setBookmarkingIds] = useState<Set<string>>(new Set())

	// ─────────────────────────────────────────────────────────────────────────
	// Small helpers
	// ─────────────────────────────────────────────────────────────────────────

	const getStatusLabel = (status: any) =>
		typeof status === 'string' ? status : (status?.label ?? 'pending')

	const formatStatus = (s: string) =>
		s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()

	const getPatientAge = (apt: any) => apt?.patient?.age ?? apt?.age ?? '--'

	const getPatientGender = (apt: any) =>
		apt?.patient?.gender ?? apt?.patient?.sex ?? apt?.gender ?? '--'

	const normalizeSymptoms = (value: any): string => {
		if (Array.isArray(value)) {
			return value
				.map((item) =>
					typeof item === 'string'
						? item.trim()
						: String(item?.label ?? item?.name ?? item?.symptom ?? item?.description ?? '').trim()
				)
				.filter(Boolean)
				.join(', ')
		}
		return typeof value === 'string' ? value.trim() : ''
	}

	const getPatientSymptoms = (apt: any) => {
		const preIntake = apt?.pre_intake
		if (!preIntake?.symptoms) {
			return 'No symptoms entered by patient'
		}

		return (
			`Symptoms: ${preIntake.symptoms}\n\n`+
			`Duration: ${preIntake.duration || 'Not specified'}\n\n`+
			`Severity: ${preIntake.severity || 'Not specified'}`
		)
	}

	const openSymptomsPopover = (apt: any, event: any) => {
		event?.stopPropagation?.()
		const { pageX = width / 2, pageY = height / 2 } = event?.nativeEvent ?? {}
		setSymptomsPopover({
			visible: true,
			message: getPatientSymptoms(apt),
			x: pageX,
			y: pageY,
		})
	}

	const getTimeRange = (apt: any) => {
		const start = apt?.start_time
		const end = apt?.end_time
		if (start && end) return `${start} - ${end}`
		return start ?? '--'
	}

	const getTypeIcon = (mode: AppointmentModeKey): AppointmentModeIcon => {
		if (mode === 'video') {
			return { name: 'video', color: '#0066ff', backgroundColor: '#e6f0ff' }
		}
		return { name: 'home-plus', color: '#00a82d', backgroundColor: '#e8faee' }
	}

	const mapReferDoctor = (doctor: FavouriteDoctor | ReferDoctor): ReferDoctor => ({
		id: doctor.id,
		name: doctor.name,
		avatar_s3_key: doctor.avatar_s3_key ?? null,
		location: doctor.location ?? '',
		experience_years: doctor.experience_years ?? null,
		specialities: doctor.specialities ?? [],
		is_verified: doctor.is_verified,
	})

	// ─────────────────────────────────────────────────────────────────────────
	// Reschedule
	// ─────────────────────────────────────────────────────────────────────────

	const handleOpenReschedule = (apt: Appointment) => {
		debugger
		const isLocallyRejected = rejectedIds.has(apt.id)
		const status = getStatusLabel(apt.status)
		if (isLocallyRejected || status === 'cancelled' || status === 'rejected') {
			showError('Cannot reschedule a rejected or cancelled appointment.')
			return
		}
		setRescheduleAppt(apt)
		setRescheduleDate(new Date())
		setRescheduleSlots([])
		setSelectedSlot('')
		setRescheduleOpen(true)
	}

	// ── Resolve the hospital id to use for the reschedule API call ───────────
	//    Priority: context selection (what the dropdown shows) → appointment's own hospital
	const resolveRescheduleHospitalId = (): string => {
		if (contextHospitalId) return String(contextHospitalId)
		if (!rescheduleAppt) return ''
		return getAptHospitalId(rescheduleAppt)
	}

	const handleConfirmReschedule = async () => {
		if (!selectedSlot) {
			Alert.alert('Select time', 'Please select a time slot to reschedule.')
			return
		}
		if (!rescheduleAppt) return

		const hospitalId = resolveRescheduleHospitalId()
		const dateStr = rescheduleDate.toISOString().split('T')[0]

		if (!hospitalId) {
			showError('Please select a hospital before rescheduling.')
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
				status_id: APPOINTMENT_STATUS.CONFIRM,
			})
			if (res.success) {
	setRescheduleOpen(false)

	setSuccessMessage(res.message || 'Appointment rescheduled successfully')
	setSuccessModalVisible(true)
}else {
				showError(res.message || 'Reschedule failed. Please try again.')
			}
		} catch {
			showError('Something went wrong. Please try again.')
		} finally {
			setRescheduleSlotsLoading(false)
		}
	}

	const renderSuccessModal = () => (
	<Modal
		visible={successModalVisible}
		transparent
		animationType="fade"
		onRequestClose={() => setSuccessModalVisible(false)}
	>
		<View style={styles.successBackdrop}>
			<View style={styles.successCard}>

				<MaterialCommunityIcons
					name="check-circle"
					size={60}
					color="#2e8b57"
				/>

				<Text style={styles.successTitle}>Success</Text>

				<Text style={styles.successMessage}>
					{successMessage}
				</Text>

				<TouchableOpacity
					style={styles.successBtn}
					onPress={() => setSuccessModalVisible(false)}
				>
					<Text style={styles.successBtnText}>Done</Text>
				</TouchableOpacity>

			</View>
		</View>
	</Modal>
)
	// ── Fetch available slots whenever the hospital or date changes ───────────
	//    Uses contextHospitalId so it stays in sync with the dropdown inside the drawer.
	useEffect(() => {
		if (!rescheduleOpen || !rescheduleAppt) return

		const doctorId =
			rescheduleAppt?.doctor?.id ?? (rescheduleAppt as any)?.doctor_id
		const hospitalId = resolveRescheduleHospitalId()
		const dateStr = rescheduleDate.toISOString().split('T')[0]

		if (!hospitalId) {
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

				const availabilityByMode = normalizeAvailabilityByMode(responseData)
				const appointmentMode = getAppointmentModeKey(rescheduleAppt)

				setRescheduleSlots(availabilityByMode[appointmentMode])
			} catch {
				setRescheduleSlots([])
				setSelectedSlot('')
			} finally {
				setRescheduleSlotsLoading(false)
			}
		}

		fetchSlots()
		// Re-run whenever: drawer opens, appointment changes, date changes, or the
		// globally selected hospital changes (user switches via the in-drawer dropdown).
	}, [rescheduleOpen, rescheduleAppt, rescheduleDate, contextHospitalId])

	// ─────────────────────────────────────────────────────────────────────────
	// Confirm / Reject
	// ─────────────────────────────────────────────────────────────────────────

	const handleConfirmAppointment = async (appointmentId: string) => {
		try {
			const res = await updateAppointmentsStatus(appointmentId, APPOINTMENT_STATUS.CONFIRM)
			if (res.success) {
				showSuccess(res.message)
				setConfirmedIds((prev) => new Set(prev).add(appointmentId))
			} else {
				showError(res.message || 'Failed to confirm')
			}
		} catch (err: any) {
			console.log('CONFIRM ERROR 👉', err?.response?.data)
			showError('Something went wrong')
		}
	}

	const handleConfirmReject = async () => {
		if (!rejectModalId) return
		try {
			const res = await updateAppointmentsStatus(rejectModalId, APPOINTMENT_STATUS.REJECT)
			if (res.success) {
				showSuccess(res.message)
				setRejectedIds((prev) => new Set(prev).add(rejectModalId))
				setConfirmedIds((prev) => {
					const next = new Set(prev)
					next.delete(rejectModalId!)
					return next
				})
			} else {
				showError(res.message || 'Failed to reject appointment.')
			}
		} catch {
			showError('Something went wrong')
		} finally {
			setRejectModalId(null)
		}
	}

	// ─────────────────────────────────────────────────────────────────────────
	// Refer
	// ─────────────────────────────────────────────────────────────────────────

	const handleOpenRefer = (apt: Appointment) => {
		setReferAppt(apt)
		setReferQuery('')
		setReferSearchResults([])
		setReferOpen(true)
	}

	const handleCloseRefer = () => {
		setReferOpen(false)
		setReferAppt(null)
		setReferQuery('')
		setReferSearchResults([])
		setReferringIds(new Set())
		setBookmarkingIds(new Set())
	}

	useEffect(() => {
		if (!referOpen) return

		const fetchFavouriteDoctors = async () => {
			try {
				setReferLoading(true)
				const res = await getFavouriteDoctors()
				if (res.success) {
					setFavouriteDoctors((res.data?.favourites ?? []).map(mapReferDoctor))
					setFavouriteDoctorIds(new Set(res.data?.favourite_ids ?? []))
				} else {
					showError(res.message || 'Failed to load doctors')
				}
			} catch {
				showError('Failed to load doctors')
			} finally {
				setReferLoading(false)
			}
		}

		fetchFavouriteDoctors()
	}, [referOpen])

	useEffect(() => {
		if (!referOpen) return

		const query = referQuery.trim()
		if (query.length < 2) {
			setReferSearchResults([])
			setReferSearchLoading(false)
			return
		}

		let cancelled = false
		const timer = setTimeout(async () => {
			try {
				setReferSearchLoading(true)
				const res = await getDoctors({ search: query, limit: 20 })
				if (!cancelled && res.success) {
					setReferSearchResults((res.data ?? []).map(mapReferDoctor))
				}
			} catch {
				if (!cancelled) showError('Search failed')
			} finally {
				if (!cancelled) setReferSearchLoading(false)
			}
		}, 350)

		return () => {
			cancelled = true
			clearTimeout(timer)
		}
	}, [referOpen, referQuery])

	const handleReferDoctor = async (doctor: ReferDoctor) => {
		if (!referAppt || referringIds.has(doctor.id)) return

		setReferringIds((prev) => new Set(prev).add(doctor.id))
		try {
			const res = await referAppointment({
				appointment_id: referAppt.id,
				doctor_id: doctor.id,
			})

			if (res.success) {
				showSuccess(res.message || 'Appointment referred successfully')
				handleCloseRefer()
			} else {
				showError(res.message || 'Failed to refer appointment')
			}
		} catch {
			showError('Failed to refer appointment')
		} finally {
			setReferringIds((prev) => {
				const next = new Set(prev)
				next.delete(doctor.id)
				return next
			})
		}
	}

	const handleToggleBookmark = async (doctor: ReferDoctor) => {
		if (bookmarkingIds.has(doctor.id)) return

		const wasFavourite = favouriteDoctorIds.has(doctor.id)

		setBookmarkingIds((prev) => new Set(prev).add(doctor.id))
		setFavouriteDoctorIds((prev) => {
			const next = new Set(prev)
			if (wasFavourite) next.delete(doctor.id)
			else next.add(doctor.id)
			return next
		})
		setFavouriteDoctors((prev) => {
			if (wasFavourite) return prev.filter((item) => item.id !== doctor.id)
			return prev.some((item) => item.id === doctor.id) ? prev : [...prev, doctor]
		})

		try {
			const res = await toggleFavouriteDoctor(doctor.id)

			if (res.success === false) {
				throw new Error(res.message || 'Failed to update favourites')
			}

			const isFavourite = res.data?.action
				? res.data.action === 'added'
				: !wasFavourite

			if (res.data?.favourite_ids) {
				setFavouriteDoctorIds(new Set(res.data.favourite_ids))
			} else {
				setFavouriteDoctorIds((prev) => {
					const next = new Set(prev)
					if (isFavourite) next.add(doctor.id)
					else next.delete(doctor.id)
					return next
				})
			}

			if (res.data?.favourites) {
				setFavouriteDoctors(res.data.favourites.map(mapReferDoctor))
			} else {
				setFavouriteDoctors((prev) => {
					if (!isFavourite) return prev.filter((item) => item.id !== doctor.id)
					return prev.some((item) => item.id === doctor.id) ? prev : [...prev, doctor]
				})
			}

			showSuccess(isFavourite ? 'Added to favourites' : 'Removed from favourites')
		} catch {
			setFavouriteDoctorIds((prev) => {
				const next = new Set(prev)
				if (wasFavourite) next.add(doctor.id)
				else next.delete(doctor.id)
				return next
			})
			setFavouriteDoctors((prev) => {
				if (wasFavourite) {
					return prev.some((item) => item.id === doctor.id) ? prev : [...prev, doctor]
				}
				return prev.filter((item) => item.id !== doctor.id)
			})
			showError('Failed to update favourites')
		} finally {
			setBookmarkingIds((prev) => {
				const next = new Set(prev)
				next.delete(doctor.id)
				return next
			})
		}
	}

	// ─────────────────────────────────────────────────────────────────────────
	// Navigation
	//───────────────────────────────────────────────────────────────────

	const handleCardPress = (apt: any) => {
		const appointmentId = apt.id || apt.appointment_id
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
		if (!appointmentId) {
			Alert.alert('Error', 'Appointment ID not found for this appointment')
			return
		}

		const consultationParams = {
			appointmentId,
			patientId,
			patient: apt.patient,
			doctorID: doctorId,
			doctor: apt.doctor,
			appointment: apt,
		}

		navigateRoot(ROUTES.STACK.CONSULTATION, consultationParams)
	}

	// ─────────────────────────────────────────────────────────────────────────
	// Skeleton
	// ─────────────────────────────────────────────────────────────────────────

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
								<AppSkeleton key={j} width={52} height={44} borderRadius={6} style={{ marginRight: 8 }} />
							))}
						</View>
					)}
				</View>
			</View>
		))

	// ─────────────────────────────────────────────────────────────────────────
	// Action buttons
	// ─────────────────────────────────────────────────────────────────────────

	const renderActions = (apt: any) => {
		const rawStatus = getStatusLabel(apt.status)
		const isConfirmed = confirmedIds.has(apt.id) || rawStatus === 'confirmed'
		const isRejected =
			rejectedIds.has(apt.id) ||
			rawStatus === 'rejected' ||
			rawStatus === 'cancelled'

		if (isRejected) return null

		return (
			<View style={[styles.actions, isTablet && styles.actionsTablet]}>
				{!isConfirmed && (
					<TouchableOpacity
						onPress={(e) => { e.stopPropagation?.(); handleConfirmAppointment(apt.id) }}
						style={[styles.btn, { backgroundColor: '#d6eed8' }]}
						activeOpacity={0.75}
					>
						<MaterialCommunityIcons name="check" size={16} color="#2e8b57" />
						<Text style={[styles.btnLabel, { color: '#2e8b57' }]}>Confirm</Text>
					</TouchableOpacity>
				)}

				<TouchableOpacity
					onPress={(e) => { e.stopPropagation?.(); setRejectModalId(apt.id) }}
					style={[styles.btn, { backgroundColor: '#f8dddd' }]}
					activeOpacity={0.75}
				>
					<MaterialCommunityIcons name="close" size={16} color="#d84545" />
					<Text style={[styles.btnLabel, { color: '#d84545' }]}>Reject</Text>
				</TouchableOpacity>

				<TouchableOpacity
					onPress={(e) => { e.stopPropagation?.(); handleOpenReschedule(apt) }}
					style={[styles.btn, { backgroundColor: '#f8e8c6' }]}
					activeOpacity={0.75}
				>
					<MaterialCommunityIcons name="refresh" size={16} color="#d08a0a" />
					<Text style={[styles.btnLabel, { color: '#d08a0a' }]}>Reschedule</Text>
				</TouchableOpacity>

				<TouchableOpacity
					onPress={(e) => { e.stopPropagation?.(); handleOpenRefer(apt) }}
					style={[styles.btn, { backgroundColor: '#dbe2f5' }]}
					activeOpacity={0.75}
				>
					<MaterialCommunityIcons name="account-multiple-outline" size={16} color="#4d6bb1" />
					<Text style={[styles.btnLabel, { color: '#4d6bb1' }]}>Refer</Text>
				</TouchableOpacity>

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

	// ─────────────────────────────────────────────────────────────────────────
	// Notice banners
	// ─────────────────────────────────────────────────────────────────────────

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

	// ─────────────────────────────────────────────────────────────────────────
	// Reject modal
	// ─────────────────────────────────────────────────────────────────────────

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
				<TouchableOpacity activeOpacity={1} style={styles.rejectCard} onPress={() => {}}>
					<View style={styles.rejectIconCircle}>
						<MaterialCommunityIcons name="close" size={28} color="#d84545" />
					</View>
					<Text style={styles.rejectTitle}>Are you sure?</Text>
					<Text style={styles.rejectSubtitle}>You want to reject this appointment</Text>
					<View style={styles.rejectBtnRow}>
						<TouchableOpacity style={styles.rejectCancelBtn} onPress={() => setRejectModalId(null)}>
							<Text style={styles.rejectCancelText}>Cancel</Text>
						</TouchableOpacity>
						<TouchableOpacity style={styles.rejectConfirmBtn} onPress={handleConfirmReject}>
							<Text style={styles.rejectConfirmText}>Yes, Reject</Text>
						</TouchableOpacity>
					</View>
				</TouchableOpacity>
			</TouchableOpacity>
		</Modal>
	)

	const renderReferDoctorRow = (doctor: ReferDoctor) => {
		const isSubmitting = referringIds.has(doctor.id)
		const isBookmarking = bookmarkingIds.has(doctor.id)
		const isBookmarked = favouriteDoctorIds.has(doctor.id)
		const isCompactRefer = width < 520

		return (
			<FavouriteDoctorList
				key={doctor.id}
				doctor={doctor}
				isCompact={isCompactRefer}
				isSubmitting={isSubmitting}
				isBookmarking={isBookmarking}
				isBookmarked={isBookmarked}
				onShare={handleReferDoctor}
				onToggleBookmark={handleToggleBookmark}
				placeholderImage={DOCTOR_IMAGE_PLACEHOLDER}
				primaryColor={TEAL}
			/>
		)
	}

	const renderReferModal = () => {
		const searchText = referQuery.trim()
		const currentDoctorId = referAppt?.doctor?.id ?? (referAppt as any)?.doctor_id
		const doctors = (searchText.length >= 2 ? referSearchResults : favouriteDoctors).filter(
			(doctor) => doctor.id !== currentDoctorId
		)
		const isSearching = searchText.length >= 2
		const showLoading = isSearching ? referSearchLoading : referLoading
		const isCompactRefer = width < 520
		const referBodyMaxHeight = Math.max(220, Math.floor(height * (isCompactRefer ? 0.58 : 0.62)))

		return (
			<Modal
				visible={referOpen}
				transparent
				animationType="fade"
				onRequestClose={handleCloseRefer}
			>
				<TouchableOpacity
					activeOpacity={1}
					style={styles.referBackdrop}
					onPress={handleCloseRefer}
				>
					<TouchableOpacity
						activeOpacity={1}
						style={[
							styles.referCard,
							isCompactRefer && styles.referCardCompact,
							{ width: Math.min(width - 28, 900) },
						]}
						onPress={() => {}}
					>
						<View style={[styles.referHeader, isCompactRefer && styles.referHeaderCompact]}>
							<Text style={[styles.referTitle, isCompactRefer && styles.referTitleCompact]}>Refer a doctor</Text>
						</View>

						<ScrollView
							style={[styles.referBody, { maxHeight: referBodyMaxHeight }]}
							contentContainerStyle={[
								styles.referBodyContent,
								isCompactRefer && styles.referBodyContentCompact,
							]}
							showsVerticalScrollIndicator
							persistentScrollbar
							scrollIndicatorInsets={{ right: 2 }}
							nestedScrollEnabled
							keyboardShouldPersistTaps="handled"
						>
							<View style={[styles.referSearchBox, isCompactRefer && styles.referSearchBoxCompact]}>
								<MaterialCommunityIcons name="magnify" size={isCompactRefer ? 20 : 28} color="#9b9b9b" />
								<TextInput
									value={referQuery}
									onChangeText={setReferQuery}
									placeholder="Search doctor..."
									placeholderTextColor="#98a1aa"
									style={[styles.referSearchInput, isCompactRefer && styles.referSearchInputCompact]}
									autoCorrect={false}
									returnKeyType="search"
								/>
								<MaterialCommunityIcons name="microphone-outline" size={isCompactRefer ? 20 : 28} color="#9b9b9b" />
							</View>

							<Text style={[styles.referSectionTitle, isCompactRefer && styles.referSectionTitleCompact]}>
								{isSearching ? 'SEARCH RESULTS' : 'FAVOURITE DOCTORS'}
							</Text>

							{showLoading ? (
								<View style={styles.referLoadingBox}>
									<ActivityIndicator size="small" color={TEAL} />
								</View>
							) : doctors.length === 0 ? (
								<Text style={styles.referEmptyText}>
									{isSearching ? 'No doctors found' : 'No favourite doctors found'}
								</Text>
							) : (
								doctors.map(renderReferDoctorRow)
							)}
						</ScrollView>
					</TouchableOpacity>
				</TouchableOpacity>
			</Modal>
		)
	}

	// ─────────────────────────────────────────────────────────────────────────
	// Reschedule drawer
	// ─────────────────────────────────────────────────────────────────────────

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
				<TouchableOpacity activeOpacity={1} style={styles.drawerSheet} onPress={() => {}}>

					{/* Header */}
					<View style={styles.drawerHeader}>
						<View>
							<Text style={styles.drawerTitle}>Reschedule Appointment</Text>
							<Text style={styles.drawerSubtitle}>
								{rescheduleAppt?.patient?.name ?? 'Patient'}
							</Text>
						</View>
						<TouchableOpacity style={styles.drawerCloseBtn} onPress={() => setRescheduleOpen(false)}>
							<MaterialCommunityIcons name="close" size={18} color="#7a848d" />
						</TouchableOpacity>
					</View>

					{/* Body */}
					<ScrollView
						style={styles.drawerBody}
						contentContainerStyle={styles.drawerBodyContent}
						showsVerticalScrollIndicator={false}
					>
						{/* ── Hospital selector ─────────────────────────────────────────────
						    Same DoctorHospitalDropdown used in the header.
						    When the user picks a hospital here it writes to AuthContext
						    (setSelectedHospitalId), which triggers the slot-fetch useEffect above.
						    This means the appointment list AND the reschedule drawer always stay
						    in sync with the same selected hospital. ── */}
						<Text style={styles.drawerSectionTitle}>Select Hospital</Text>
						<DoctorHospitalDropdown />

						{/* ── Date + time slots ─────────────────────────────────────────── */}
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
							selectedAppointmentType={getAppointmentModeKey(rescheduleAppt)}
							showSlotStatusLabels={false}
						/>
					</ScrollView>

					{/* Footer actions */}
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

	// ─────────────────────────────────────────────────────────────────────────
	// Card renderer
	// ─────────────────────────────────────────────────────────────────────────

	const renderPatientNameRow = (apt: any, status: string, statusStyle: any, statusTextStyle: any) => {
		const modeIcon = getTypeIcon(getAppointmentModeKey(apt))

		return (
			<View style={styles.patientNameRow}>
				<View style={[styles.patientIconBox, { backgroundColor: modeIcon.backgroundColor }]}>
					<MaterialCommunityIcons name={modeIcon.name} size={20} color={modeIcon.color} />
				</View>
				<View style={styles.patientNameWithInfo}>
					<Text style={styles.name} numberOfLines={1}>
						{apt?.patient?.name || 'Unknown Patient'}
					</Text>
					<TouchableOpacity
						activeOpacity={0.75}
						style={styles.symptomsInfoButton}
						onPress={(event) => openSymptomsPopover(apt, event)}
						hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
					>
						<MaterialCommunityIcons name="information-outline" size={17} color={TEAL} />
					</TouchableOpacity>
				</View>
				<View style={[styles.pill, statusStyle]}>
					<Text style={[styles.pillText, statusTextStyle]}>{formatStatus(status)}</Text>
				</View>
			</View>
		)
	}

	const renderSymptomsPopover = () => {
		if (!symptomsPopover.visible) return null

		const popoverWidth = Math.min(width - 32, isTablet ? 330 : 300)
		const popoverLeft = Math.max(16, Math.min(symptomsPopover.x - 32, width - popoverWidth - 16))
		const verticalLift = isTablet ? 24 : 18
		const shouldOpenAbove = symptomsPopover.y + 160 > height
		const popoverTop = shouldOpenAbove
			? Math.max(16, symptomsPopover.y - 150 - verticalLift)
			: Math.max(16, symptomsPopover.y + 16 - verticalLift)

		return (
			<Modal
				visible={symptomsPopover.visible}
				transparent
				animationType="fade"
				onRequestClose={() => setSymptomsPopover((prev) => ({ ...prev, visible: false }))}
			>
				<Pressable
					style={styles.symptomsModalOverlay}
					onPress={() => setSymptomsPopover((prev) => ({ ...prev, visible: false }))}
				>
					<Pressable
						style={[
							styles.symptomsPopover,
							{
								width: popoverWidth,
								left: popoverLeft,
								top: popoverTop,
							},
						]}
						onPress={(event) => event.stopPropagation()}
					>
						<Text style={styles.symptomsPopoverTitle}>Patient Symptoms</Text>
						<Text
							style={[
								styles.symptomsPopoverMessage,
								symptomsPopover.message === 'No symptoms entered by patient.' && styles.symptomsPopoverEmpty,
							]}
						>
							{symptomsPopover.message}
						</Text>
					</Pressable>
				</Pressable>
			</Modal>
		)
	}

	const renderCard = (apt: any) => {
		const rawStatus = getStatusLabel(apt.status)
		const isRejectedLocally = rejectedIds.has(apt.id)
		const isRejectedFromProp = rawStatus === 'rejected' || rawStatus === 'cancelled'
		const isRejected = isRejectedLocally || isRejectedFromProp

		let status = rawStatus
		if (confirmedIds.has(apt.id)) status = 'confirmed'
		if (rejectedIds.has(apt.id)) status = 'rejected'

		const statusStyle =
			status === 'confirmed' ? styles.pillConfirmed :
			status === 'rejected'  ? styles.pillCancelled :
			                         styles.pillPending

		const statusTextStyle =
			status === 'confirmed' ? styles.pillTextConfirmed :
			status === 'rejected'  ? styles.pillTextCancelled :
			                         styles.pillTextPending

		// ── Rejected / Cancelled card ─────────────────────────────────────────
		if (isRejected) {
			const isPatientCancelled = rawStatus === 'cancelled' && !isRejectedLocally
			return (
				<TouchableOpacity
					key={apt.id}
					activeOpacity={0.85}
					onPress={() => handleCardPress(apt)}
					style={styles.card}
				>
					<View style={[styles.cancelledCardInner, useCompactCancelledLayout && styles.cancelledCardInnerCompact]}>
						<View style={[styles.cancelledCardLeft, useCompactCancelledLayout && styles.cancelledCardLeftCompact]}>
							{renderPatientNameRow(apt, status, statusStyle, statusTextStyle)}
							<View style={styles.cancelledMetaRow}>
								<Text style={styles.subText}>
									{getPatientAge(apt)} years / {getPatientGender(apt)}
								</Text>
								<View style={styles.metaDot} />
								<MaterialCommunityIcons name="clock-time-three-outline" size={16} color="#9ea5ac" />
								<Text style={styles.subText}>{getTimeRange(apt)}</Text>
							</View>
						</View>
						<View style={[styles.cancelDivider, useCompactCancelledLayout && styles.cancelDividerCompact]} />
						<View
							style={[
								styles.cancelledCardRight,
								!useCompactCancelledLayout && !isTablet && { width: Math.max(230, Math.floor(width * 0.52)) },
								useCompactCancelledLayout && styles.cancelledCardRightCompact,
							]}
						>
							{isPatientCancelled ? renderCancelledNotice() : renderRejectedNotice()}
						</View>
					</View>
				</TouchableOpacity>
			)
		}

		// ── Tablet card ───────────────────────────────────────────────────────
		if (isTablet) {
			return (
				<TouchableOpacity key={apt.id} activeOpacity={0.85} onPress={() => handleCardPress(apt)} style={styles.card}>
					<View style={styles.tabletCardInner}>
						<View style={styles.tabletLeft}>
							{renderPatientNameRow(apt, status, statusStyle, statusTextStyle)}
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

		// ── Mobile card ───────────────────────────────────────────────────────
		return (
			<TouchableOpacity key={apt.id} activeOpacity={0.85} onPress={() => handleCardPress(apt)} style={styles.card}>
				{renderPatientNameRow(apt, status, statusStyle, statusTextStyle)}
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

	// ─────────────────────────────────────────────────────────────────────────
	// Root render
	// ─────────────────────────────────────────────────────────────────────────

	return (
		<View style={styles.container}>
			{/* Header */}
			<View style={styles.header}>
				<Text style={styles.heading}>Doctor Appointments</Text>
				<Text style={styles.month}>
					{selectedDateObj?.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
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
						<Text style={[styles.dayText, d.red && styles.weekendText, selectedDate === i && styles.selectedText]}>
							{d.day}
						</Text>
						<Text style={[styles.dateText, d.red && styles.weekendText, selectedDate === i && styles.selectedText]}>
							{d.date}
						</Text>
					</TouchableOpacity>
				))}
			</ScrollView>

			{/* Appointment list — uses filteredAppointments, not raw appointments */}
			<View style={styles.listContainer}>
				{apptLoading ? renderSkeleton() : null}
				{apptError ? <Text style={styles.error}>{apptError}</Text> : null}
				{!apptLoading && filteredAppointments.length === 0 && (
					<Text style={styles.empty}>
						{contextHospitalId
							? 'No appointments for the selected hospital'
							: 'No appointments'}
					</Text>
				)}
				{!apptLoading && filteredAppointments.map(renderCard)}
			</View>

			{/* Modals */}
			
{renderRejectModal()}
{renderReferModal()}
{renderRescheduleDrawer()}
{renderSuccessModal()}
{renderSymptomsPopover()}
		</View>
	)
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles  (unchanged from original)
// ─────────────────────────────────────────────────────────────────────────────

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
	patientNameWithInfo: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
		minWidth: 0,
		gap: 4,
	},
	name: { fontSize: 15, fontWeight: '600', color: '#2a2f34', flexShrink: 1, minWidth: 0 },
	symptomsInfoButton: {
		width: 24,
		height: 24,
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
		flexShrink: 0,
	},
	symptomsModalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.01)',
	},
	symptomsPopover: {
		position: 'absolute',
		borderRadius: 14,
		backgroundColor: '#fff',
		paddingHorizontal: 22,
		paddingVertical: 20,
		borderWidth: 1,
		borderColor: '#e5edf2',
		shadowColor: '#172838',
		shadowOffset: { width: 0, height: 12 },
		shadowOpacity: 0.16,
		shadowRadius: 24,
		elevation: 12,
	},
	symptomsPopoverTitle: {
		fontSize: 17,
		fontWeight: '700',
		color: '#1f2d3d',
		marginBottom: 18,
	},
	symptomsPopoverMessage: {
		fontSize: 15,
		lineHeight: 22,
		color: '#526b7a',
	},
	symptomsPopoverEmpty: {
		fontStyle: 'italic',
	},
	pill: {
		paddingHorizontal: 10,
		paddingVertical: 2,
		borderRadius: 999,
		minWidth: 68,
		alignItems: 'center',
	},
	pillPending:          { backgroundColor: '#f8df8d' },
	pillConfirmed:        { backgroundColor: '#d6eed8' },
	pillCancelled:        { backgroundColor: '#f8dddd' },
	pillText:             { fontSize: 12, fontWeight: '600' },
	pillTextPending:      { color: '#c48508' },
	pillTextConfirmed:    { color: '#2e7d32' },
	pillTextCancelled:    { color: '#d84545' },
	metaRow:              { flexDirection: 'row', alignItems: 'center', gap: 4 },
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
	referBackdrop: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.5)',
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 14,
	},
	referCard: {
		backgroundColor: '#fff',
		borderRadius: 26,
		maxHeight: '90%',
		overflow: 'hidden',
		shadowColor: '#000',
		shadowOffset: { width: 8, height: 0 },
		shadowOpacity: 0.18,
		shadowRadius: 0,
		elevation: 12,
	},
	referCardCompact: {
		borderRadius: 18,
		maxHeight: '86%',
	},
	referHeader: {
		paddingHorizontal: 36,
		paddingVertical: 36,
		borderBottomWidth: 1,
		borderBottomColor: '#dfe7ec',
	},
	referHeaderCompact: {
		paddingHorizontal: 18,
		paddingVertical: 18,
	},
	referTitle: {
		fontSize: 23,
		fontWeight: '500',
		color: '#172838',
	},
	referTitleCompact: { fontSize: 20 },
	referBody: { flexShrink: 1 },
	referBodyContent: {
		paddingHorizontal: 36,
		paddingTop: 24,
		paddingBottom: 34,
	},
	referBodyContentCompact: {
		paddingHorizontal: 16,
		paddingTop: 16,
		paddingBottom: 22,
	},
	referSearchBox: {
		height: 54,
		borderRadius: 18,
		borderWidth: 3,
		borderColor: '#2e7b7d',
		backgroundColor: '#f8fbff',
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 18,
		marginBottom: 64,
	},
	referSearchBoxCompact: {
		height: 44,
		borderRadius: 14,
		borderWidth: 2,
		paddingHorizontal: 12,
		marginBottom: 28,
	},
	referSearchInput: {
		flex: 1,
		height: 50,
		paddingHorizontal: 12,
		fontSize: 17,
		color: '#1b2d3c',
	},
	referSearchInputCompact: {
		height: 42,
		paddingHorizontal: 8,
		fontSize: 15,
	},
	referSectionTitle: {
		fontSize: 15,
		fontWeight: '700',
		color: '#526b7a',
		letterSpacing: 0,
		marginBottom: 30,
	},
	referSectionTitleCompact: {
		fontSize: 13,
		marginBottom: 18,
	},
	referLoadingBox: {
		paddingVertical: 30,
		alignItems: 'center',
	},
	referEmptyText: {
		color: '#8a969d',
		fontSize: 15,
		paddingVertical: 22,
		textAlign: 'center',
	},
	successBackdrop: {
	flex: 1,
	backgroundColor: 'rgba(0,0,0,0.5)',
	justifyContent: 'center',
	alignItems: 'center',
},

successCard: {
	width: 280,
	backgroundColor: '#fff',
	borderRadius: 14,
	padding: 20,
	alignItems: 'center',
},

successTitle: {
	fontSize: 18,
	fontWeight: '700',
	color: '#1a1a1a',
	marginTop: 10,
},

successMessage: {
	fontSize: 14,
	color: '#555',
	textAlign: 'center',
	marginTop: 8,
	marginBottom: 20,
},

successBtn: {
	backgroundColor: '#2e8b57',
	paddingHorizontal: 20,
	paddingVertical: 10,
	borderRadius: 8,
},

successBtnText: {
	color: '#fff',
	fontWeight: '600',
},
})
