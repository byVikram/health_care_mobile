import React, { useRef, useState } from 'react'
import {
	LayoutChangeEvent,
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
import type { NavigationProp, RouteProp } from '@react-navigation/native'
import {
	AppActionChip,
	AppAvatar,
	AppButton,
	AppChip,
	AppDashedDivider,
	AppFooterBar,
	AppIconButton,
	AppIconTile,
	AppScreenHeader,
	AppSection,
	AppSkeleton,
	AppStatRow,
	AppStatTile,
	AppTag,
	AppTypography,
} from '../../../components/common'
import { getDoctorById, getDoctorAvailability, TimeSlot } from '../doctorService'
import { DoctorDetailData } from '../../../types/doctor-detail'
import { ROUTES } from '../../../navigation/routes'
import type { AppStackParamList } from '../../../navigation/types'
import { formatDateForApi } from '../../../utils/date'
import { capitalize } from '../../../utils/formatters'
import { openOnMap } from '../../../utils/maps'
import { AppointmentModeKey, firstOpenSlot, normalizeAvailabilityByMode } from '../availability'
import { shortClinic } from '../doctorFormatters'
import { APP_COLORS, TONES, formatInr, toneAt } from '../../../config/theme'
import { DOCTOR_PROFILE_GOOD_TO_KNOW_MOCK } from './doctorProfileMockData'

// Design tokens matching the "Doctor profile" HTML design exactly.
const PRIMARY = APP_COLORS.primary
const INK = APP_COLORS.ink
const INK_MUTED = APP_COLORS.inkMuted
const DIVIDER = APP_COLORS.divider
const PAGE_BG = APP_COLORS.pageBg
const SPEC_TONE = TONES.lilac.ink
const SPEC_TONE_BG = TONES.lilac.bg
const SUCCESS = APP_COLORS.success

type ProfileTabKey = 'about' | 'services' | 'clinics' | 'awards'
const PROFILE_TABS: { key: ProfileTabKey; label: string }[] = [
	{ key: 'about', label: 'About' },
	{ key: 'services', label: 'Services' },
	{ key: 'clinics', label: 'Clinics' },
	{ key: 'awards', label: 'Awards' },
]

const TREATMENTS_COLLAPSED_COUNT = 4
// Scroll offset after which the header swaps "Doctor profile" for the doctor's identity.
const COMPACT_HEADER_AT = 150

/** Today's first open slot per hospital, split by mode (null = none left today). */
type TodaySlots = Record<string, Record<AppointmentModeKey, TimeSlot | null>>

const formatYear = (dateStr?: string | null): string => {
	if (!dateStr) return ''
	const parsed = new Date(dateStr)
	return isNaN(parsed.getTime()) ? dateStr : String(parsed.getFullYear())
}

// ----------------------------------------------------------------------
// Main Doctor Detail Page ("3 · Doctor profile")
//
// Slot selection now lives on its own step (book-slot/BookSlotPage.tsx,
// "4 · Clinic & slot"), which owns the availability fetch, fee handling and
// the CONSENT_FORM handoff that used to be here. This screen only reads
// today's availability to show real "Available today" / next-slot info and
// routes every Book button to that step.
// ----------------------------------------------------------------------
export default function DoctorDetailPage() {
	const navigation = useNavigation<NavigationProp<AppStackParamList>>()
	const route = useRoute<RouteProp<AppStackParamList, typeof ROUTES.STACK.DOCTOR_DETAIL>>()
	const referralId = route.params?.referralId

	const [doctor, setDoctor] = useState<DoctorDetailData | null>(null)
	const [loading, setLoading] = useState(true)

	// About section "Read more/less" toggle (matches the HTML's 2-line clamp)
	const [aboutExpanded, setAboutExpanded] = useState(false)
	// Treatments & services "Show all / Show fewer" toggle
	const [treatmentsExpanded, setTreatmentsExpanded] = useState(false)

	// Real "next slot today" per hospital (undefined = still loading)
	const [todaySlots, setTodaySlots] = useState<TodaySlots | undefined>(undefined)

	// Collapsing header: swap the title for the doctor's identity once scrolled past the hero
	const [compact, setCompact] = useState(false)

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
		// 52 = sticky tab bar height, so the section title lands just below it
		scrollRef.current?.scrollTo?.({ y: Math.max(0, sectionOffsets.current[tab] - 52), animated: true })
	}

	const handleContentScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
		const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent
		const y = contentOffset.y
		const nextCompact = y > COMPACT_HEADER_AT
		setCompact((prev) => (prev === nextCompact ? prev : nextCompact))
		if (jumpingRef.current) return
		const offsets = sectionOffsets.current
		let next: ProfileTabKey = 'about'
		;(Object.keys(offsets) as ProfileTabKey[]).forEach((key) => {
			if (offsets[key] > 0 && y + 60 >= offsets[key]) next = key
		})
		if (y + layoutMeasurement.height >= contentSize.height - 2) next = 'awards'
		setActiveTab((prev) => (prev === next ? prev : next))
	}

	// Records a section's scroll offset for the tab scroll-spy (AppSection passes onLayout
	// through; the reported y is the section's own y, below its 8px margin).
	const trackSection =
		(key: ProfileTabKey, when = true) =>
		(e: LayoutChangeEvent) => {
			if (when) sectionOffsets.current[key] = e.nativeEvent.layout.y
		}

	React.useEffect(() => {
		const fetchDetail = async () => {
			if (!route.params?.id) return
			try {
				const res = await getDoctorById(route.params.id)
				if (res.success && res.data) {
					setDoctor(res.data)
				}
			} catch (error) {
				console.error('Error fetching doctor details:', error)
			} finally {
				setLoading(false)
			}
		}
		fetchDetail()
	}, [route.params?.id])

	// Today's availability for every clinic -> real "Available today" badge,
	// "Next available" card and each clinic's NEXT SLOT pill.
	React.useEffect(() => {
		if (!doctor?.id || !doctor.hospitals?.length) {
			setTodaySlots({})
			return
		}
		let active = true
		const today = formatDateForApi(new Date())
		const fetchTodaySlots = async () => {
			const entries = await Promise.all(
				doctor.hospitals.map(async (h) => {
					try {
						const res = await getDoctorAvailability({
							doctor_id: doctor.id,
							hospital_id: h.hospital.id,
							date: today,
						})
						const byMode = normalizeAvailabilityByMode(res)
						return [
							h.hospital.id,
							{ clinic: firstOpenSlot(byMode.clinic), video: firstOpenSlot(byMode.video) },
						] as const
					} catch {
						return [h.hospital.id, { clinic: null, video: null }] as const
					}
				})
			)
			if (active) setTodaySlots(Object.fromEntries(entries))
		}
		fetchTodaySlots()
		return () => {
			active = false
		}
	}, [doctor?.id, doctor?.hospitals])

	const primaryHospital =
		doctor?.hospitals.find((h) => h.is_primary) || (doctor?.hospitals.length ? doctor.hospitals[0] : null)

	const goToBookSlot = (hospitalId?: string, mode: AppointmentModeKey = 'clinic') => {
		if (!doctor) return
		navigation.navigate(ROUTES.STACK.DOCTOR_BOOK_SLOT, {
			doctor,
			hospitalId: hospitalId || primaryHospital?.hospital.id,
			mode,
			referralId,
		})
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

	// Fees shown on the profile come from the primary clinic (the design's
	// "Clinic visit" / "Video call" tiles); each clinic card shows its own.
	const offlineFee = Number(primaryHospital?.offline_consultation_fee) || null
	const videoHospital = hospitals.find((h) => Number(h.video_consultation_fee) > 0) || null
	const videoFee = Number(videoHospital?.video_consultation_fee) || null
	const hasVideoConsult = !!videoFee && videoFee > 0
	const allFees = hospitals
		.flatMap((h) => [Number(h.offline_consultation_fee), Number(h.video_consultation_fee)])
		.filter((n) => Number.isFinite(n) && n > 0)
	const feeFrom = allFees.length ? Math.min(...allFees) : null

	const slotsKnown = todaySlots !== undefined
	const availableToday = !!todaySlots && Object.values(todaySlots).some((m) => m.clinic || m.video)
	// First clinic (primary first) with a slot left today; in-clinic preferred over video
	const nextAvailable = (() => {
		if (!todaySlots) return null
		const ordered = primaryHospital
			? [primaryHospital, ...hospitals.filter((h) => h !== primaryHospital)]
			: hospitals
		for (const mode of ['clinic', 'video'] as AppointmentModeKey[]) {
			for (const h of ordered) {
				const slot = todaySlots[h.hospital.id]?.[mode]
				if (slot) return { hospital: h, slot, mode }
			}
		}
		return null
	})()

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

	const headerSub = [
		(specialities || [])[0],
		details?.experience_years != null ? `${details.experience_years} yrs` : '',
		offlineFee ? formatInr(offlineFee) : '',
	]
		.filter(Boolean)
		.join(' · ')

	const videoNextSlot = hospitals.map((h) => todaySlots?.[h.hospital.id]?.video).find(Boolean) || null

	return (
		<View style={styles.container}>
			{/* Header -- "Doctor profile" collapses into the doctor's identity on scroll */}
			<AppScreenHeader
				variant="bar"
				title={compact ? doctor.name : 'Doctor profile'}
				subtitle={compact ? headerSub : undefined}
				leading={
					compact ? (
						<AppAvatar
							uri={avatarUrl}
							size={36}
							borderWidth={2}
							borderColor="#fff"
							backgroundColor={SPEC_TONE_BG}
							fallbackIcon="account"
							initialsColor={SPEC_TONE}
						/>
					) : undefined
				}
				onBack={() => navigation.goBack()}
				backAccessibilityLabel="Back to doctors"
				style={compact && styles.headerCompact}
				rightElement={
					<AppIconButton
						icon="share-variant-outline"
						variant="ghost"
						size={44}
						onPress={handleShare}
						accessibilityLabel="Share profile"
						style={styles.headerShareBtn}
					/>
				}
			/>

			<ScrollView
				ref={scrollRef}
				style={styles.scrollArea}
				contentContainerStyle={{ paddingBottom: 8 }}
				scrollEventThrottle={16}
				onScroll={handleContentScroll}
				stickyHeaderIndices={[1]}
			>
				{/* Hero / profile identity */}
				<View style={styles.heroSection}>
					<View style={styles.heroBanner}>
						<View style={styles.heroDecorCircleTop} />
						<View style={styles.heroDecorCircleBottom} />
					</View>
					<View style={styles.profileCard}>
						<View style={styles.profileAvatarWrap}>
							<AppAvatar
								uri={avatarUrl}
								size={112}
								borderWidth={4}
								borderColor="#FFFFFF"
								backgroundColor={SPEC_TONE_BG}
								fallbackIcon="account"
								initialsColor={SPEC_TONE}
							/>
							{availableToday && <View style={styles.profileAvatarBadge} />}
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
							{availableToday && (
								<AppTag
									label="Available today"
									tone="confirmed"
									shape="pill"
									dot
									style={styles.availableBadge}
								/>
							)}
							{hasVideoConsult && (
								<AppTag label="Video consult" tone="sky" shape="pill" icon="video-outline" />
							)}
							{!!languagesText && (
								<AppTag
									label={languagesText}
									tone="neutral"
									shape="pill"
									textStyle={styles.languageBadgeText}
								/>
							)}
						</View>
					</View>

					<AppStatRow style={styles.statsRow}>
						<AppStatTile label="Experience" value={experienceYearsText} tone="lilac" />
						<AppStatTile label="Clinic visit" value={formatInr(offlineFee)} tone="mint" />
						<AppStatTile label="Video call" value={formatInr(videoFee)} tone="sky" />
					</AppStatRow>

					{/* Next available -- real first open slot today, else a plain entry into the slot step */}
					<TouchableOpacity
						style={styles.nextCard}
						activeOpacity={0.85}
						disabled={!hospitals.length}
						onPress={() => goToBookSlot(nextAvailable?.hospital.hospital.id, nextAvailable?.mode)}
					>
						<AppIconTile
							icon="calendar-blank-outline"
							size={40}
							radius={12}
							iconSize={20}
							backgroundColor={APP_COLORS.mintAccent}
							iconColor={INK}
						/>
						<View style={{ flex: 1, minWidth: 0 }}>
							<AppTypography style={styles.nextEyebrow}>NEXT AVAILABLE</AppTypography>
							<AppTypography style={styles.nextTitle} numberOfLines={1}>
								{nextAvailable
									? `Today, ${nextAvailable.slot.start_time}`
									: slotsKnown
										? 'See upcoming slots'
										: 'Checking slots…'}
							</AppTypography>
							<AppTypography style={styles.nextSub} numberOfLines={1}>
								{nextAvailable
									? nextAvailable.mode === 'video'
										? 'Video consultation'
										: `${shortClinic(nextAvailable.hospital.hospital.name)}${
												nextAvailable.hospital.hospital.distance
													? ` · ${nextAvailable.hospital.hospital.distance} km`
													: ''
											}`
									: 'Pick a clinic, date and time'}
							</AppTypography>
						</View>
						<View style={styles.nextBookBtn}>
							<AppTypography style={styles.nextBookText}>Book</AppTypography>
							<MaterialCommunityIcons name="chevron-right" size={16} color={INK} />
						</View>
					</TouchableOpacity>
				</View>

				{/* Sticky tab nav -- wrapped because a sticky child's own style is moved onto RN's
				    sticky wrapper (and replaced with flex: 1), which would drop flexDirection: 'row' */}
				<View>
					<View style={styles.tabsRow}>
						{PROFILE_TABS.map((tab) => {
							const isActive = activeTab === tab.key
							return (
								<AppChip
									key={tab.key}
									label={tab.label}
									selected={isActive}
									onPress={() => handleTabPress(tab.key)}
									variant="solid"
									size="sm"
									radius={10}
									borderColor={DIVIDER}
									style={styles.tabChip}
									textStyle={{ fontWeight: isActive ? '700' : '600' }}
								/>
							)
						})}
					</View>
				</View>

				{/* About -- flat section, 2-line clamp + Read more/less */}
				<AppSection title="About" gap={8} onLayout={trackSection('about')}>
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
				</AppSection>

				{/* Areas of expertise -- flat chip row (Services tab) */}
				{areasOfExpertise.length > 0 && (
					<AppSection title="Areas of expertise" gap={8} onLayout={trackSection('services')}>
						<View style={styles.chipRow}>
							{areasOfExpertise.map((item) => (
								<AppTag
									key={item.id}
									label={item.label}
									size="md"
									shape="pill"
									tone="lilac"
									ink={INK}
									style={styles.expertiseChip}
									textStyle={styles.expertiseChipText}
								/>
							))}
						</View>
					</AppSection>
				)}

				{/* Treatments & services -- checkmark list (Services tab) */}
				{treatments.length > 0 && (
					<AppSection
						title="Treatments & services"
						gap={8}
						onLayout={trackSection('services', !areasOfExpertise.length)}
						right={
							<AppTypography variant="caption" style={styles.mutedSmall}>
								{treatments.length} offered
							</AppTypography>
						}
					>
						<View style={{ marginTop: 4 }}>
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
								<AppTypography variant="caption" style={styles.linkText}>
									{treatmentsExpanded ? 'Show fewer' : `Show all ${treatments.length} treatments`}
								</AppTypography>
							</TouchableOpacity>
						)}
					</AppSection>
				)}

				{/* Practises at -- one card per clinic + video; each Book goes to the slot step */}
				<AppSection
					title="Practises at"
					gap={12}
					onLayout={trackSection('clinics')}
					right={
						practicesSubtitle ? (
							<AppTypography variant="caption" style={styles.muted13}>
								{practicesSubtitle}
							</AppTypography>
						) : undefined
					}
				>
					{hospitals.map((entry, n) => {
						const tone = n === 0 ? TONES.mint : toneAt(n + 2)
						const slot = todaySlots?.[entry.hospital.id]?.clinic
						return (
							<PractiseCard
								key={entry.hospital.id}
								icon="hospital-building"
								tone={tone}
								title={entry.hospital.name}
								subtitle={[
									entry.hospital.address,
									entry.hospital.distance ? `${entry.hospital.distance} km` : '',
								]
									.filter(Boolean)
									.join(' · ')}
								fee={formatInr(entry.offline_consultation_fee)}
								feeUnit="per visit"
								nextSlot={slot ? `Today, ${slot.start_time}` : slotsKnown ? 'See all slots' : '…'}
								nextToday={!!slot}
								onDirections={() => openOnMap(entry.hospital.address, entry.hospital.name)}
								directionsLabel={`Directions to ${entry.hospital.name}`}
								onBook={() => goToBookSlot(entry.hospital.id, 'clinic')}
							/>
						)
					})}

					{hasVideoConsult && videoHospital && (
						<PractiseCard
							icon="video-outline"
							tone={TONES.sky}
							title="Video consultation"
							subtitle="Join from the app, no travel"
							fee={formatInr(videoFee)}
							feeUnit="per call"
							nextSlot={
								videoNextSlot
									? `Today, ${videoNextSlot.start_time}`
									: slotsKnown
										? 'See all slots'
										: '…'
							}
							nextToday={!!videoNextSlot}
							onBook={() => goToBookSlot(videoHospital.hospital.id, 'video')}
						/>
					)}

					{hospitals.length === 0 && (
						<AppTypography variant="caption" style={styles.mutedSmall}>
							No hospitals available for this doctor
						</AppTypography>
					)}
				</AppSection>

				{/* Achievements & recognition -- real data, flat list (Awards tab) */}
				{achievements.length > 0 && (
					<AppSection title="Achievements & recognition" gap={8} onLayout={trackSection('awards')}>
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
										<AppIconTile icon="medal-outline" tone="sand" size={36} circle iconSize={18} />
										<View style={{ flex: 1 }}>
											<AppTypography style={styles.achievementTitle}>{item.title}</AppTypography>
											{!!sub && <AppTypography style={styles.muted13}>{sub}</AppTypography>}
										</View>
									</View>
								)
							})}
						</View>
					</AppSection>
				)}

				{/* Education & training -- vertical timeline, real degrees data */}
				{educationItems.length > 0 && (
					<AppSection
						title="Education & training"
						gap={8}
						onLayout={trackSection('awards', !achievements.length)}
					>
						<View>
							{educationItems.map((deg, idx) => (
								<View key={deg.id ?? idx} style={styles.timelineRow}>
									<View style={styles.timelineMarkerCol}>
										<View style={styles.timelineDot} />
										{idx !== educationItems.length - 1 && <View style={styles.timelineLine} />}
									</View>
									<View
										style={{
											paddingBottom: idx !== educationItems.length - 1 ? 14 : 0,
											flex: 1,
										}}
									>
										<AppTypography style={styles.timelineTitle}>
											{deg.specialization ? `${deg.degree}, ${deg.specialization}` : deg.degree}
										</AppTypography>
										<AppTypography style={styles.muted13}>
											{[deg.college, deg.year_of_passing].filter(Boolean).join(' · ')}
										</AppTypography>
									</View>
								</View>
							))}
						</View>
					</AppSection>
				)}

				{/* Good to know -- static policy copy (see doctorProfileMockData.ts) */}
				<AppSection title="Good to know" gap={8}>
					<View>
						{DOCTOR_PROFILE_GOOD_TO_KNOW_MOCK.map((line, idx) => (
							<View key={idx} style={styles.bulletRow}>
								<View style={styles.bulletDot} />
								<AppTypography style={styles.bulletText}>{line}</AppTypography>
							</View>
						))}
					</View>
				</AppSection>
			</ScrollView>

			{/* Footer -- "Fee from" + Book appointment (goes to the Clinic & slot step) */}
			<AppFooterBar gap={12}>
				<View>
					<AppTypography style={styles.feeFromLabel}>Fee from</AppTypography>
					<AppTypography style={styles.feeFromValue}>{formatInr(feeFrom)}</AppTypography>
				</View>
				<AppButton
					size="lg"
					disabled={!hospitals.length}
					onPress={() => goToBookSlot()}
					style={styles.bookButton}
					contentStyle={styles.bookButtonContent}
				>
					Book appointment
				</AppButton>
			</AppFooterBar>
		</View>
	)
}

// Screen-specific clinic / video card, assembled from the shared icon tile and dashed divider.
function PractiseCard(props: {
	icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']
	tone: { bg: string; ink: string }
	title: string
	subtitle: string
	fee: string
	feeUnit: string
	nextSlot: string
	nextToday: boolean
	onBook: () => void
	onDirections?: () => void
	directionsLabel?: string
}) {
	return (
		<View style={styles.practiseCard}>
			<View style={styles.practiseTop}>
				<AppIconTile
					icon={props.icon}
					size={44}
					radius={12}
					iconSize={22}
					backgroundColor={props.tone.bg}
					iconColor={props.tone.ink}
				/>
				<View style={{ flex: 1, minWidth: 0 }}>
					<AppTypography style={styles.practiseTitle}>{props.title}</AppTypography>
					{!!props.subtitle && (
						<AppTypography style={styles.muted13} numberOfLines={2}>
							{props.subtitle}
						</AppTypography>
					)}
				</View>
				<View style={{ alignItems: 'flex-end' }}>
					<AppTypography style={styles.practiseFee}>{props.fee}</AppTypography>
					<AppTypography style={styles.practiseFeeUnit}>{props.feeUnit}</AppTypography>
				</View>
			</View>
			<AppDashedDivider />
			<View style={styles.practiseBottom}>
				<View style={{ flex: 1, minWidth: 0 }}>
					<AppTypography style={styles.nextSlotLabel}>NEXT SLOT</AppTypography>
					<AppTag
						label={props.nextSlot}
						size="md"
						tone={props.nextToday ? 'confirmed' : 'neutral'}
						style={styles.nextSlotPill}
					/>
				</View>
				{!!props.onDirections && (
					<AppIconButton
						icon="navigation-variant-outline"
						onPress={props.onDirections}
						accessibilityLabel={props.directionsLabel ?? 'Directions'}
					/>
				)}
				<AppActionChip
					label="Book"
					trailingIcon="chevron-right"
					variant="filled"
					size="md"
					onPress={props.onBook}
					style={styles.practiseBook}
				/>
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
		paddingHorizontal: 16,
		marginTop: -60,
	},
	profileAvatarWrap: {
		position: 'relative',
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
	// AppTag pill (4x10, 12/16 700) with the design's 6px dot gap
	availableBadge: { gap: 6 },
	languageBadgeText: { fontWeight: '600' },
	statsRow: {
		marginTop: 16,
		marginHorizontal: 16,
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
	// Profile tabs keep their original zero side padding so labels never truncate
	tabChip: { flex: 1, paddingHorizontal: 0 },

	mutedSmall: { color: INK_MUTED, fontSize: 12 },

	muted13: { color: INK_MUTED, fontSize: 13, lineHeight: 18 },

	// Header
	headerCompact: {
		shadowColor: APP_COLORS.shadow,
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.16,
		shadowRadius: 8,
		elevation: 4,
	},
	headerShareBtn: { marginRight: -10 },

	heroSection: { backgroundColor: '#fff', paddingBottom: 16 },

	// Next available
	nextCard: {
		marginTop: 12,
		marginHorizontal: 16,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		paddingVertical: 14,
		paddingHorizontal: 16,
		borderRadius: 16,
		backgroundColor: INK,
	},
	nextEyebrow: { fontSize: 12, lineHeight: 16, fontWeight: '700', letterSpacing: 0.5, color: APP_COLORS.mintAccent },
	nextTitle: { fontSize: 16, lineHeight: 22, fontWeight: '700', color: '#fff' },
	nextSub: { fontSize: 12, lineHeight: 16, color: APP_COLORS.mint },
	nextBookBtn: {
		height: 40,
		paddingHorizontal: 16,
		borderRadius: 10,
		backgroundColor: '#fff',
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	nextBookText: { fontSize: 14, lineHeight: 20, fontWeight: '700', color: INK },

	// Practises at cards
	practiseCard: { borderRadius: 16, backgroundColor: PAGE_BG, padding: 14, gap: 12 },
	practiseTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
	practiseTitle: { fontSize: 15, lineHeight: 22, fontWeight: '700', color: INK },
	practiseFee: { fontSize: 16, lineHeight: 22, fontWeight: '800', color: INK },
	practiseFeeUnit: { fontSize: 11, lineHeight: 14, fontWeight: '600', color: INK_MUTED },
	// Dashed top rule is the AppDashedDivider above it (card gap 12 = the old paddingTop)
	practiseBottom: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	nextSlotLabel: { fontSize: 11, lineHeight: 14, fontWeight: '700', letterSpacing: 0.4, color: INK_MUTED },
	nextSlotPill: { marginTop: 2 },
	// AppActionChip's 1px (primary) border + 15 = the design's 16px side padding
	practiseBook: { paddingHorizontal: 15 },

	// Footer
	feeFromLabel: { fontSize: 12, lineHeight: 16, color: INK_MUTED },
	feeFromValue: { fontSize: 18, lineHeight: 26, fontWeight: '700', color: INK },
	// AppButton size="lg" label (16/22 600) at this screen's original 48h / radius 8
	bookButton: { flex: 1, borderRadius: 8 },
	bookButtonContent: { height: 48 },

	// About
	aboutBodyText: {
		color: INK_MUTED,
		lineHeight: 21,
		fontSize: 14,
	},
	// Spacing above comes from the AppSection gap (8)
	linkText: {
		color: PRIMARY,
		fontWeight: '700',
	},

	// Areas of expertise
	chipRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	// AppTag md pill (13/18) at the design's 6x12 padding and 500 weight
	expertiseChip: { paddingHorizontal: 12, paddingVertical: 6 },
	expertiseChipText: { fontWeight: '500' },

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
