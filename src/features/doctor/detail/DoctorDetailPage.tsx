import React, { useRef, useState } from 'react'
import {
	Image,
	NativeScrollEvent,
	NativeSyntheticEvent,
	ScrollView,
	Share,
	StyleSheet,
	TouchableOpacity,
	View,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useNavigation, useRoute } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { NavigationProp, RouteProp } from '@react-navigation/native'
import { AppButton, AppScreenHeader, AppSkeleton, AppTypography } from '../../../components/common'
import { getDoctorById, getDoctorAvailability, SlotGroup } from '../doctorService'
import { DoctorDetailData } from '../../../types/doctor-detail'
import { ROUTES } from '../../../navigation/routes'
import type { AppStackParamList } from '../../../navigation/types'
import { formatDateDisplay, formatDateForApi, formatTimeForApi } from '../../../utils/date'
import { capitalize } from '../../../utils/formatters'
import { DETAIL_PRIMARY, HospitalAppointmentCard } from './components'
import type { AppointmentModeKey, HospitalEntry } from './components'
import { DOCTOR_PROFILE_AVAILABLE_TODAY_MOCK, DOCTOR_PROFILE_GOOD_TO_KNOW_MOCK } from './doctorProfileMockData'

type AvailabilityAppointmentMode = 'clinic_visit' | 'video_call' | 'offline' | 'online'

interface AvailabilityApiSlot {
	start_time: string
	end_time: string
	status?: 'AVAILABLE' | 'BOOKED' | 'UNAVAILABLE' | 'BLOCKED' | 'OCCUPIED' | ''
	is_enabled?: boolean
	is_booked?: boolean
	can_toggle?: boolean
}

interface AvailabilityApiSession {
	label?: string
	range?: string
	period?: string
	slots?: AvailabilityApiSlot[]
}

interface AvailabilityApiModeGroup {
	appointment_mode?: AvailabilityAppointmentMode
	sessions?: AvailabilityApiSession[]
	label?: string
	period?: string
	range?: string
	slots?: AvailabilityApiSlot[]
}

// Design tokens matching the "Doctor profile" HTML design exactly.
const PRIMARY = DETAIL_PRIMARY // #2B6F71
const INK = '#12373E'
const INK_MUTED = '#5B6B6E'
const DIVIDER = '#D5E1E2'
const PAGE_BG = '#F5F8F8'
const SPEC_TONE = '#6A4BB5'
const SPEC_TONE_BG = '#ECE6FA'
const SUCCESS = '#1E7A4E'
const SUCCESS_BG = '#E6F4EC'
const SKY = '#2463A8'
const SKY_BG = '#DDEBFA'

type ProfileTabKey = 'about' | 'services' | 'clinics' | 'awards'
const PROFILE_TABS: { key: ProfileTabKey; label: string }[] = [
	{ key: 'about', label: 'About' },
	{ key: 'services', label: 'Services' },
	{ key: 'clinics', label: 'Clinics' },
	{ key: 'awards', label: 'Awards' },
]

const TREATMENTS_COLLAPSED_COUNT = 4

const emptyAvailabilityByMode: Record<AppointmentModeKey, SlotGroup[]> = {
	clinic: [],
	video: [],
}

const getModeKey = (mode?: string): AppointmentModeKey => {
	if (mode === 'video_call' || mode === 'online' || mode === 'video') {
		return 'video'
	}
	return 'clinic'
}

const normalizeSlotStatus = (slot: AvailabilityApiSlot) => {
	if (slot.is_booked) return 'BOOKED'
	if (slot.is_enabled === false) return 'UNAVAILABLE'
	if (slot.status === 'OCCUPIED') return 'BOOKED'
	return slot.status || 'AVAILABLE'
}

const normalizeAvailabilityByMode = (response: unknown): Record<AppointmentModeKey, SlotGroup[]> => {
	const rawData = Array.isArray(response)
		? response
		: Array.isArray((response as { data?: unknown })?.data)
			? (response as { data: AvailabilityApiModeGroup[] }).data
			: []

	const grouped: Record<AppointmentModeKey, SlotGroup[]> = {
		clinic: [],
		video: [],
	}

	rawData.forEach((item: AvailabilityApiModeGroup) => {
		const modeKey = getModeKey(item.appointment_mode)
		const sessions =
			Array.isArray(item.sessions) && item.sessions.length > 0
				? item.sessions
				: [{ label: item.label, range: item.range, period: item.period, slots: item.slots }]

		const normalizedSessions = sessions
			.map((session, sessionIndex): SlotGroup => {
				const range = session.range || session.period || ''
				const label = session.label || `Session ${sessionIndex + 1}`

				return {
					label: range ? `${label} (${range})` : label,
					period: range,
					slots: (session.slots || []).map((slot, slotIndex) => ({
						id: `${modeKey}-${label}-${slot.start_time}-${slotIndex}`,
						start_time: slot.start_time,
						end_time: slot.end_time,
						status: normalizeSlotStatus(slot),
						is_enabled: slot.is_enabled,
						can_toggle: slot.can_toggle,
					})),
				}
			})
			.filter((session) => session.slots.length > 0)

		grouped[modeKey] = [...grouped[modeKey], ...normalizedSessions]
	})

	return grouped
}

const formatYear = (dateStr?: string | null): string => {
	if (!dateStr) return ''
	const parsed = new Date(dateStr)
	return isNaN(parsed.getTime()) ? dateStr : String(parsed.getFullYear())
}

// ----------------------------------------------------------------------
// Main Doctor Detail Page
//
// PROTECTED FUNCTIONALITY -- presentation-only changes past this point.
// Do not change: fetchDetail/fetchAvailability effects, selectedHospital /
// apptType / selectedDate / selectedTime / expandedHospitalId state,
// handleAppointmentTypeChange, getSelectedFee, handleToggleExpand, the
// availableSlotsByMode derivation, or the final booking AppButton's
// onPress (CONSENT_FORM navigation + its paymentParams). These are the
// real hospital-selection / availability-fetching / slot-selection /
// fee-handling / payment-handoff logic and must keep working exactly as
// before -- only their visual presentation changes in this pass.
// ----------------------------------------------------------------------
export default function DoctorDetailPage() {
	const navigation = useNavigation<NavigationProp<AppStackParamList>>()
	const route = useRoute<RouteProp<AppStackParamList, typeof ROUTES.STACK.DOCTOR_DETAIL>>()
	const referralId = route.params?.referralId
	const insets = useSafeAreaInsets()

	const [doctor, setDoctor] = useState<DoctorDetailData | null>(null)
	const [loading, setLoading] = useState(true)

	// Form States
	const [selectedHospital, setSelectedHospital] = useState<string | null>(null)
	const [apptType, setApptType] = useState<'offline' | 'video' | null>('offline')
	const [selectedDate, setSelectedDate] = useState<Date>(new Date())
	const [selectedTime, setSelectedTime] = useState<string | null>(null)

	// Tracks which hospital card is expanded inline (null = none expanded)
	const [expandedHospitalId, setExpandedHospitalId] = useState<string | null>(null)

	// About section "Read more/less" toggle (matches the HTML's 2-line clamp)
	const [aboutExpanded, setAboutExpanded] = useState(false)
	// Treatments & services "Show all / Show fewer" toggle
	const [treatmentsExpanded, setTreatmentsExpanded] = useState(false)

	const [availableSlotsByMode, setAvailableSlotsByMode] =
		useState<Record<AppointmentModeKey, SlotGroup[]>>(emptyAvailabilityByMode)
	const [slotsLoading, setSlotsLoading] = useState(false)

	// ---- Presentation-only: sticky tab scroll-spy (About/Services/Clinics/Awards) ----
	const scrollRef = useRef<any>(null)
	const sectionOffsets = useRef<Record<ProfileTabKey, number>>({ about: 0, services: 0, clinics: 0, awards: 0 })
	const [activeTab, setActiveTab] = useState<ProfileTabKey>('about')
	const jumpingRef = useRef(false)
	const jumpTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	const handleTabPress = (tab: ProfileTabKey) => {
		setActiveTab(tab)
		jumpingRef.current = true
		if (jumpTimeoutRef.current) clearTimeout(jumpTimeoutRef.current)
		jumpTimeoutRef.current = setTimeout(() => {
			jumpingRef.current = false
		}, 700)
		scrollRef.current?.scrollTo?.({ y: Math.max(0, sectionOffsets.current[tab] - 8), animated: true })
	}

	const handleContentScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
		if (jumpingRef.current) return
		const y = event.nativeEvent.contentOffset.y
		const offsets = sectionOffsets.current
		let next: ProfileTabKey = 'about'
		;(Object.keys(offsets) as ProfileTabKey[]).forEach((key) => {
			if (y + 80 >= offsets[key]) next = key
		})
		setActiveTab((prev) => (prev === next ? prev : next))
	}

	React.useEffect(() => {
		const fetchDetail = async () => {
			if (!route.params?.id) return
			try {
				const res = await getDoctorById(route.params.id)
				if (res.success && res.data) {
					setDoctor(res.data)
					if (res.data.hospitals?.length > 0) {
						const primary = res.data.hospitals.find((h) => h.is_primary) || res.data.hospitals[0]
						setSelectedHospital(primary.hospital.id)
						// Auto-expand the primary hospital card by default
						setExpandedHospitalId(primary.hospital.id)
					}
				}
			} catch (error) {
				console.error('Error fetching doctor details:', error)
			} finally {
				setLoading(false)
			}
		}
		fetchDetail()
	}, [route.params?.id])

	React.useEffect(() => {
		const id = route.params?.id
		if (!id || !selectedHospital || !selectedDate) return
		let active = true

		const fetchAvailability = async () => {
			try {
				setSlotsLoading(true)
				const res = await getDoctorAvailability({
					doctor_id: id,
					hospital_id: selectedHospital,
					date: formatDateForApi(selectedDate),
				})
				if (!active) return
				setAvailableSlotsByMode(normalizeAvailabilityByMode(res))
			} catch (err) {
				if (!active) return
				setAvailableSlotsByMode(emptyAvailabilityByMode)
			} finally {
				if (active) {
					setSlotsLoading(false)
				}
			}
		}

		fetchAvailability()
		return () => {
			active = false
		}
	}, [route.params?.id, selectedHospital, selectedDate])

	const primaryHospital =
		doctor?.hospitals.find((h) => h.is_primary) || (doctor?.hospitals.length ? doctor.hospitals[0] : null)

	const selectedHospitalEntry = doctor?.hospitals.find((h) => h.hospital.id === selectedHospital) || primaryHospital

	const selectedAppointmentType: AppointmentModeKey = apptType === 'video' ? 'video' : 'clinic'

	const visibleSlotGroups = availableSlotsByMode[selectedAppointmentType] || []

	const handleAppointmentTypeChange = (type: AppointmentModeKey) => {
		setApptType(type === 'clinic' ? 'offline' : 'video')
		setSelectedTime(null)
	}

	const getSelectedFee = () => {
		if (apptType === 'offline') {
			return Number(selectedHospitalEntry?.offline_consultation_fee) || 0
		} else {
			return Number(selectedHospitalEntry?.video_consultation_fee) || 0
		}
	}

	// Toggle which hospital card is expanded; switching expands the new
	// hospital, sets it as the booking target, and resets slot selection.
	const handleToggleExpand = (hospitalId: string) => {
		const isCurrentlyExpanded = expandedHospitalId === hospitalId
		setExpandedHospitalId(isCurrentlyExpanded ? null : hospitalId)

		if (!isCurrentlyExpanded) {
			setSelectedHospital(hospitalId)
			setSelectedTime(null)
		}
	}

	const handleShare = () => {
		if (!doctor) return
		Share.share({
			message: `${doctor.name}${specialitiesText ? ` — ${specialitiesText}` : ''} on KarolaHealth`,
		}).catch(() => {})
	}

	if (loading) {
		return (
			<View style={styles.container}>
				<View style={{ padding: 16 }}>
					<AppSkeleton height={150} style={{ marginBottom: 16, marginTop: 40 }} />
					<AppSkeleton height={100} style={{ marginBottom: 16 }} />
					<AppSkeleton height={300} style={{ marginBottom: 16 }} />
				</View>
			</View>
		)
	}

	if (!doctor) {
		return (
			<View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
				<AppTypography>Doctor not found</AppTypography>
				<AppButton variant="text" onPress={() => navigation.goBack()}>
					Go Back
				</AppButton>
			</View>
		)
	}

	const { details, specialities, hospitals } = doctor

	const avatarValue = details?.avatar_s3_key
	const avatarUrl = typeof avatarValue === 'string' && avatarValue.trim() ? avatarValue : null

	// Real fee figures (already used by getSelectedFee()/booking below) --
	// surfaced in the stat pills, not fabricated.
	const offlineFee = Number(selectedHospitalEntry?.offline_consultation_fee) || null
	const videoFee = Number(selectedHospitalEntry?.video_consultation_fee) || null
	const hasVideoConsult = !!videoFee && videoFee > 0

	const specialitiesText = (specialities || []).filter(Boolean).join(' · ')

	// Qualifications line ("MBBS, MD (Medicine), DM (Endocrinology)") -- built
	// from the real `degrees` list; falls back to the single `degree` field
	// some older records still carry.
	const qualificationsText = details?.degrees?.length
		? details.degrees
				.map((d) => (d.specialization ? `${d.degree} (${d.specialization})` : d.degree))
				.filter(Boolean)
				.join(', ')
		: details?.degree || null

	const languagesText = details?.languages?.length ? details.languages.map(capitalize).join(', ') : null

	const experienceYearsText = details?.experience_years != null ? `${details.experience_years} yrs` : '--'

	const aboutText = details?.about?.trim() || null

	const areasOfExpertise = doctor.additionalDetail?.areas_of_expertise || []
	const treatments = doctor.additionalDetail?.treatments || []
	const visibleTreatments = treatmentsExpanded ? treatments : treatments.slice(0, TREATMENTS_COLLAPSED_COUNT)

	const achievements = doctor.achievements || []

	// Education & training timeline -- most recent degree first, matching the
	// HTML's ordering (DM 2012 -> MD 2009 -> MBBS 2006).
	const educationItems = [...(details?.degrees || [])].sort((a, b) => {
		const ay = parseInt(a.year_of_passing, 10) || 0
		const by = parseInt(b.year_of_passing, 10) || 0
		return by - ay
	})

	const practicesSubtitle = hospitals.length
		? `${hospitals.length} ${hospitals.length === 1 ? 'clinic' : 'clinics'}${hasVideoConsult ? ' · video' : ''}`
		: ''

	return (
		<View style={styles.container}>
			<AppScreenHeader
				title="Doctor profile"
				backgroundColor={PRIMARY}
				variant="flat"
				onBack={() => navigation.goBack()}
				rightElement={
					<TouchableOpacity onPress={handleShare} hitSlop={8}>
						<MaterialCommunityIcons name="share-variant" size={22} color="#fff" />
					</TouchableOpacity>
				}
			/>

			<ScrollView
				ref={scrollRef}
				style={styles.scrollArea}
				contentContainerStyle={{ paddingBottom: 100 }}
				scrollEventThrottle={16}
				onScroll={handleContentScroll}
			>
				{/* Hero / profile identity -- matches the HTML's avatar + name +
            specialities + qualifications + badge row + stats grid. No
            "next available slot" banner (explicitly excluded). */}
				<View style={styles.heroBanner}>
					<View style={styles.heroDecorCircleTop} />
					<View style={styles.heroDecorCircleBottom} />
				</View>
				<View style={styles.profileCard}>
					<View style={styles.profileAvatarWrap}>
						{avatarUrl ? (
							<Image source={{ uri: avatarUrl }} style={styles.profileAvatarImage} resizeMode="cover" />
						) : (
							<View style={[styles.profileAvatarImage, styles.profileAvatarPlaceholder]}>
								<MaterialCommunityIcons name="account" size={48} color={SPEC_TONE} />
							</View>
						)}
						<View style={styles.profileAvatarBadge} />
					</View>

					<AppTypography variant="h3" style={styles.doctorName} numberOfLines={2}>
						{doctor.name}
					</AppTypography>

					{!!specialitiesText && (
						<AppTypography variant="body" style={styles.doctorSpec} numberOfLines={1}>
							{specialitiesText}
						</AppTypography>
					)}

					{!!qualificationsText && (
						<AppTypography variant="caption" style={styles.qualificationText} numberOfLines={1}>
							{qualificationsText}
						</AppTypography>
					)}

					<View style={styles.badgeRow}>
						{DOCTOR_PROFILE_AVAILABLE_TODAY_MOCK && (
							<View style={styles.availableBadge}>
								<View style={styles.availableDot} />
								<AppTypography style={styles.availableBadgeText}>Available today</AppTypography>
							</View>
						)}
						{hasVideoConsult && (
							<View style={styles.videoBadge}>
								<MaterialCommunityIcons name="video-outline" size={13} color={SKY} />
								<AppTypography style={styles.videoBadgeText}>Video consult</AppTypography>
							</View>
						)}
						{!!languagesText && (
							<View style={styles.languageBadge}>
								<AppTypography style={styles.languageBadgeText} numberOfLines={1}>
									{languagesText}
								</AppTypography>
							</View>
						)}
					</View>

					<View style={styles.statsRow}>
						<View style={[styles.statBox, { backgroundColor: SPEC_TONE_BG }]}>
							<AppTypography style={[styles.statLabel, { color: SPEC_TONE }]}>Experience</AppTypography>
							<AppTypography style={styles.statValue}>{experienceYearsText}</AppTypography>
						</View>
						<View style={[styles.statBox, { backgroundColor: '#E3EFEF' }]}>
							<AppTypography style={[styles.statLabel, { color: PRIMARY }]}>Clinic visit</AppTypography>
							<AppTypography style={styles.statValue}>
								{offlineFee ? `₹${offlineFee}` : '--'}
							</AppTypography>
						</View>
						<View style={[styles.statBox, { backgroundColor: SKY_BG }]}>
							<AppTypography style={[styles.statLabel, { color: SKY }]}>Video call</AppTypography>
							<AppTypography style={styles.statValue}>{videoFee ? `₹${videoFee}` : '--'}</AppTypography>
						</View>
					</View>
				</View>

				{/* Sticky-feel tab nav */}
				<View style={styles.tabsRow}>
					{PROFILE_TABS.map((tab) => {
						const isActive = activeTab === tab.key
						return (
							<TouchableOpacity
								key={tab.key}
								style={[styles.tabButton, isActive && styles.tabButtonActive]}
								onPress={() => handleTabPress(tab.key)}
								activeOpacity={0.8}
							>
								<AppTypography style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}>
									{tab.label}
								</AppTypography>
							</TouchableOpacity>
						)
					})}
				</View>

				{/* About -- flat section, no card, 2-line clamp + Read more/less */}
				<View
					style={styles.section}
					onLayout={(e) => {
						sectionOffsets.current.about = e.nativeEvent.layout.y
					}}
				>
					<AppTypography variant="h4" style={styles.sectionTitle}>
						About
					</AppTypography>
					<AppTypography
						variant="body"
						style={styles.aboutBodyText}
						numberOfLines={aboutExpanded ? undefined : 2}
					>
						{aboutText || "This doctor hasn't added a bio yet."}
					</AppTypography>
					{!!aboutText && (
						<TouchableOpacity onPress={() => setAboutExpanded((v) => !v)} activeOpacity={0.7}>
							<AppTypography variant="caption" style={styles.linkText}>
								{aboutExpanded ? 'Show less' : 'Read more'}
							</AppTypography>
						</TouchableOpacity>
					)}
				</View>

				{/* Areas of expertise -- flat chip row (Services tab) */}
				{areasOfExpertise.length > 0 && (
					<View
						style={styles.section}
						onLayout={(e) => {
							sectionOffsets.current.services = e.nativeEvent.layout.y
						}}
					>
						<AppTypography variant="h4" style={styles.sectionTitle}>
							Areas of expertise
						</AppTypography>
						<View style={styles.chipRow}>
							{areasOfExpertise.map((item) => (
								<View key={item.id} style={styles.expertiseChip}>
									<AppTypography style={styles.expertiseChipText}>{item.label}</AppTypography>
								</View>
							))}
						</View>
					</View>
				)}

				{/* Treatments & services -- checkmark list (Services tab) */}
				{treatments.length > 0 && (
					<View style={styles.section}>
						<View style={styles.rowBetween}>
							<AppTypography variant="h4" style={styles.sectionTitle}>
								Treatments &amp; services
							</AppTypography>
							<AppTypography variant="caption" style={styles.mutedSmall}>
								{treatments.length} offered
							</AppTypography>
						</View>
						<View>
							{visibleTreatments.map((item, idx) => (
								<View
									key={item.id}
									style={[
										styles.treatmentRow,
										idx !== visibleTreatments.length - 1 && styles.treatmentRowDivider,
									]}
								>
									<MaterialCommunityIcons
										name="check"
										size={18}
										color={SUCCESS}
										style={{ marginTop: 2 }}
									/>
									<AppTypography style={styles.treatmentName}>{item.label}</AppTypography>
								</View>
							))}
						</View>
						{treatments.length > TREATMENTS_COLLAPSED_COUNT && (
							<TouchableOpacity onPress={() => setTreatmentsExpanded((v) => !v)} activeOpacity={0.7}>
								<AppTypography variant="caption" style={[styles.linkText, { marginTop: 8 }]}>
									{treatmentsExpanded ? 'Show fewer' : `Show all ${treatments.length} treatments`}
								</AppTypography>
							</TouchableOpacity>
						)}
					</View>
				)}

				{/* Practises at -- PROTECTED booking cards, restyled only */}
				<View
					style={styles.section}
					onLayout={(e) => {
						sectionOffsets.current.clinics = e.nativeEvent.layout.y
					}}
				>
					<View style={styles.rowBetween}>
						<AppTypography variant="h4" style={styles.sectionTitle}>
							Practises at
						</AppTypography>
						{!!practicesSubtitle && (
							<AppTypography variant="caption" style={styles.mutedSmall}>
								{practicesSubtitle}
							</AppTypography>
						)}
					</View>

					{hospitals.length > 0 ? (
						hospitals.map((entry) => (
							<HospitalAppointmentCard
								key={entry.hospital.id}
								entry={entry as HospitalEntry}
								isExpanded={expandedHospitalId === entry.hospital.id}
								onToggleExpand={() => handleToggleExpand(entry.hospital.id)}
								apptType={apptType}
								onAppointmentTypeChange={handleAppointmentTypeChange}
								selectedDate={selectedDate}
								onDateChange={(date) => {
									setSelectedDate(date)
									setSelectedTime(null)
								}}
								selectedTime={selectedTime}
								onTimeChange={setSelectedTime}
								availableSlots={expandedHospitalId === entry.hospital.id ? visibleSlotGroups : []}
								slotsLoading={expandedHospitalId === entry.hospital.id ? slotsLoading : false}
								selectedAppointmentType={selectedAppointmentType}
							/>
						))
					) : (
						<AppTypography variant="caption" style={styles.mutedSmall}>
							No hospitals available for this doctor
						</AppTypography>
					)}
				</View>

				{/* Achievements & recognition -- real data, flat list (Awards tab) */}
				{achievements.length > 0 && (
					<View
						style={styles.section}
						onLayout={(e) => {
							sectionOffsets.current.awards = e.nativeEvent.layout.y
						}}
					>
						<AppTypography variant="h4" style={styles.sectionTitle}>
							Achievements &amp; recognition
						</AppTypography>
						<View>
							{achievements.map((item, idx) => {
								const year = formatYear(item.achievement_date)
								const sub = [item.organization, year].filter(Boolean).join(' · ')
								return (
									<View
										key={item.id}
										style={[
											styles.achievementRow,
											idx !== achievements.length - 1 && styles.treatmentRowDivider,
										]}
									>
										<View style={styles.achievementIconBox}>
											<MaterialCommunityIcons name="trophy-outline" size={18} color="#8A5300" />
										</View>
										<View style={{ flex: 1 }}>
											<AppTypography style={styles.achievementTitle}>{item.title}</AppTypography>
											{!!sub && <AppTypography style={styles.mutedSmall}>{sub}</AppTypography>}
										</View>
									</View>
								)
							})}
						</View>
					</View>
				)}

				{/* Education & training -- vertical timeline, real degrees data */}
				{educationItems.length > 0 && (
					<View style={styles.section}>
						<AppTypography variant="h4" style={styles.sectionTitle}>
							Education &amp; training
						</AppTypography>
						<View>
							{educationItems.map((deg, idx) => (
								<View key={deg.id ?? idx} style={styles.timelineRow}>
									<View style={styles.timelineMarkerCol}>
										<View style={styles.timelineDot} />
										{idx !== educationItems.length - 1 && <View style={styles.timelineLine} />}
									</View>
									<View style={{ paddingBottom: 14, flex: 1 }}>
										<AppTypography style={styles.timelineTitle}>
											{deg.specialization ? `${deg.degree}, ${deg.specialization}` : deg.degree}
										</AppTypography>
										<AppTypography style={styles.mutedSmall}>
											{[deg.college, deg.year_of_passing].filter(Boolean).join(' · ')}
										</AppTypography>
									</View>
								</View>
							))}
						</View>
					</View>
				)}

				{/* Good to know -- static policy copy (see doctorProfileMockData.ts) */}
				<View style={styles.section}>
					<AppTypography variant="h4" style={styles.sectionTitle}>
						Good to know
					</AppTypography>
					{DOCTOR_PROFILE_GOOD_TO_KNOW_MOCK.map((line, idx) => (
						<View key={idx} style={styles.bulletRow}>
							<View style={styles.bulletDot} />
							<AppTypography style={styles.bulletText}>{line}</AppTypography>
						</View>
					))}
				</View>
			</ScrollView>

			{/* Bottom Sticky Button -- PROTECTED: same booking/payment handoff as before */}
			<View style={[styles.bottomBar, { paddingBottom: 16 + insets.bottom }]}>
				<AppButton
					variant="primary"
					style={styles.bookButton}
					disabled={!selectedTime || !selectedHospital}
					onPress={async () => {
						if (!doctor || !selectedTime || !selectedHospital) return

						const targetHospitalEntry = doctor?.hospitals.find((h) => h.hospital.id === selectedHospital)
						const fee = getSelectedFee()
						const formattedDate = formatDateForApi(selectedDate)
						const formattedTime = formatTimeForApi(selectedTime)

						navigation.navigate(ROUTES.STACK.CONSENT_FORM, {
							paymentParams: {
								doctor: doctor,
								hospitalId: selectedHospital,
								hospitalName: targetHospitalEntry?.hospital.name || '',
								appointmentDate: formattedDate,
								appointmentDateDisplay: formatDateDisplay(selectedDate),
								startTime: formattedTime,
								startTimeDisplay: selectedTime,
								appointmentMode: apptType === 'offline' ? 'offline' : 'online',
								consultationTypeLabel: apptType === 'offline' ? 'Clinic Visit' : 'Video Call',
								fee: fee,
								referralId: referralId,
							},
						})
					}}
				>
					{selectedTime ? `Book at ${selectedTime}` : 'Select a Time Slot'}
				</AppButton>
			</View>
		</View>
	)
}

// ----------------------------------------------------------------------
// Styles
// ----------------------------------------------------------------------
const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: PAGE_BG },
	scrollArea: { flex: 1 },

	// Hero
	heroBanner: {
		height: 84,
		backgroundColor: PRIMARY,
		borderBottomLeftRadius: 28,
		borderBottomRightRadius: 28,
		overflow: 'hidden',
		position: 'relative',
	},
	heroDecorCircleTop: {
		position: 'absolute',
		right: -40,
		top: -60,
		width: 180,
		height: 180,
		borderRadius: 9999,
		backgroundColor: '#276668',
	},
	heroDecorCircleBottom: {
		position: 'absolute',
		left: '40%',
		top: 30,
		width: 80,
		height: 80,
		borderRadius: 9999,
		backgroundColor: '#9FD3D1',
		opacity: 0.18,
	},
	profileCard: {
		alignItems: 'center',
		gap: 4,
		paddingBottom: 16,
		paddingHorizontal: 16,
		marginTop: -60,
		backgroundColor: '#fff',
	},
	profileAvatarWrap: {
		position: 'relative',
	},
	profileAvatarImage: {
		width: 112,
		height: 112,
		borderRadius: 9999,
		backgroundColor: SPEC_TONE_BG,
		borderWidth: 4,
		borderColor: '#FFFFFF',
	},
	profileAvatarPlaceholder: {
		alignItems: 'center',
		justifyContent: 'center',
	},
	profileAvatarBadge: {
		position: 'absolute',
		right: 6,
		bottom: 6,
		width: 22,
		height: 22,
		borderRadius: 9999,
		backgroundColor: SUCCESS,
		borderWidth: 3,
		borderColor: '#FFFFFF',
	},
	doctorName: {
		marginTop: 8,
		fontWeight: '800',
		color: INK,
		fontSize: 22,
		lineHeight: 28,
		letterSpacing: -0.22,
		textAlign: 'center',
	},
	doctorSpec: {
		color: SPEC_TONE,
		fontSize: 14,
		lineHeight: 20,
		fontWeight: '700',
	},
	qualificationText: {
		color: INK_MUTED,
		fontSize: 13,
		lineHeight: 18,
	},
	badgeRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'center',
		gap: 6,
		marginTop: 6,
	},
	availableBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 9999,
		backgroundColor: SUCCESS_BG,
	},
	availableDot: {
		width: 6,
		height: 6,
		borderRadius: 9999,
		backgroundColor: SUCCESS,
	},
	availableBadgeText: {
		fontSize: 12,
		lineHeight: 16,
		fontWeight: '700',
		color: SUCCESS,
	},
	videoBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 9999,
		backgroundColor: SKY_BG,
	},
	videoBadgeText: {
		fontSize: 12,
		lineHeight: 16,
		fontWeight: '700',
		color: SKY,
	},
	languageBadge: {
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 9999,
		backgroundColor: PAGE_BG,
	},
	languageBadgeText: {
		fontSize: 12,
		lineHeight: 16,
		fontWeight: '600',
		color: INK,
	},
	statsRow: {
		flexDirection: 'row',
		gap: 8,
		marginTop: 14,
		alignSelf: 'stretch',
	},
	statBox: {
		flex: 1,
		borderRadius: 16,
		padding: 12,
		gap: 2,
	},
	statLabel: {
		fontSize: 12,
		lineHeight: 16,
		fontWeight: '600',
	},
	statValue: {
		fontSize: 17,
		lineHeight: 22,
		fontWeight: '800',
		color: INK,
	},

	// Tabs
	tabsRow: {
		flexDirection: 'row',
		gap: 6,
		paddingHorizontal: 16,
		paddingVertical: 8,
		backgroundColor: '#fff',
		borderTopWidth: 1,
		borderBottomWidth: 1,
		borderColor: DIVIDER,
	},
	tabButton: {
		flex: 1,
		height: 36,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: DIVIDER,
		backgroundColor: '#FFFFFF',
		alignItems: 'center',
		justifyContent: 'center',
	},
	tabButtonActive: {
		backgroundColor: PRIMARY,
		borderColor: PRIMARY,
	},
	tabButtonText: {
		fontSize: 13,
		fontWeight: '600',
		color: INK,
	},
	tabButtonTextActive: {
		color: '#FFFFFF',
		fontWeight: '700',
	},

	section: {
		backgroundColor: '#fff',
		padding: 16,
		marginTop: 8,
	},
	sectionTitle: { color: INK, fontWeight: '700', fontSize: 18, marginBottom: 8 },
	rowBetween: {
		flexDirection: 'row',
		alignItems: 'baseline',
		justifyContent: 'space-between',
		marginBottom: 4,
	},
	mutedSmall: { color: INK_MUTED, fontSize: 12 },

	bottomBar: {
		position: 'absolute',
		bottom: 0,
		left: 0,
		right: 0,
		backgroundColor: '#fff',
		padding: 16,
		borderTopWidth: 1,
		borderTopColor: DIVIDER,
	},
	bookButton: { backgroundColor: INK, borderRadius: 8, paddingVertical: 6 },

	// About
	aboutBodyText: {
		color: INK_MUTED,
		lineHeight: 21,
		fontSize: 14,
	},
	linkText: {
		color: PRIMARY,
		fontWeight: '700',
		marginTop: 8,
	},

	// Areas of expertise
	chipRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	expertiseChip: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 9999,
		backgroundColor: SPEC_TONE_BG,
	},
	expertiseChipText: {
		fontSize: 13,
		lineHeight: 18,
		fontWeight: '500',
		color: INK,
	},

	// Treatments & services
	treatmentRow: {
		flexDirection: 'row',
		gap: 10,
		alignItems: 'flex-start',
		paddingVertical: 10,
	},
	treatmentRowDivider: {
		borderBottomWidth: 1,
		borderBottomColor: DIVIDER,
	},
	treatmentName: {
		fontSize: 14,
		lineHeight: 20,
		fontWeight: '600',
		color: INK,
		flex: 1,
	},

	// Achievements
	achievementRow: {
		flexDirection: 'row',
		gap: 12,
		alignItems: 'center',
		paddingVertical: 10,
	},
	achievementIconBox: {
		width: 36,
		height: 36,
		borderRadius: 9999,
		backgroundColor: '#FBEFD5',
		alignItems: 'center',
		justifyContent: 'center',
	},
	achievementTitle: {
		fontSize: 14,
		lineHeight: 20,
		fontWeight: '600',
		color: INK,
	},

	// Education timeline
	timelineRow: {
		flexDirection: 'row',
		gap: 12,
	},
	timelineMarkerCol: {
		alignItems: 'center',
	},
	timelineDot: {
		width: 12,
		height: 12,
		marginTop: 4,
		borderRadius: 9999,
		borderWidth: 2,
		borderColor: PRIMARY,
		backgroundColor: '#fff',
	},
	timelineLine: {
		flex: 1,
		width: 2,
		backgroundColor: DIVIDER,
		marginVertical: 2,
	},
	timelineTitle: {
		fontSize: 14,
		lineHeight: 20,
		fontWeight: '600',
		color: INK,
	},

	// Good to know
	bulletRow: {
		flexDirection: 'row',
		gap: 8,
		alignItems: 'flex-start',
		marginTop: 4,
	},
	bulletDot: {
		width: 4,
		height: 4,
		borderRadius: 9999,
		backgroundColor: INK_MUTED,
		marginTop: 8,
	},
	bulletText: {
		flex: 1,
		fontSize: 14,
		lineHeight: 20,
		color: INK_MUTED,
	},
})
