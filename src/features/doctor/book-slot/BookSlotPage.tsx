import React, { useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View, ScrollView } from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import type { NavigationProp, RouteProp } from '@react-navigation/native'
import {
	AppAvatar,
	AppButton,
	AppFamilyMemberSheet,
	type FamilyMemberDraft,
	AppFooterBar,
	AppIconButton,
	AppIconTile,
	AppPatientRow,
	AppRadio,
	AppScreenHeader,
	AppSection,
	AppSegmentedControl,
	AppTag,
	AppTypography,
	DateStrip,
	familyMemberFirstName,
	SlotChipGrid,
} from '../../../components/common'
import { useFamilyMembers } from '../../../hooks/useFamilyMembers'
import { useBookingRestriction } from '../../appointment/useBookingRestriction'
import BookingRestrictedBanner from '../../appointment/components/BookingRestrictedBanner'
import { ROUTES } from '../../../navigation/routes'
import type { AppStackParamList } from '../../../navigation/types'
import { formatDateDisplay, formatDateForApi, formatTimeForApi, nextDays } from '../../../utils/date'
import { openDirections } from '../../../utils/maps'
import { showComingSoon } from '../../../utils/toast'
import {
	AppointmentModeKey,
	emptyAvailabilityByMode,
	firstOpenSlot,
	isClosedDay,
	isSameDay,
	isSlotBooked,
	isSlotSelectable,
	MONTH_LONG,
	MONTH_SHORT,
	DOW_LABELS,
	normalizeAvailabilityByMode,
	startOfDay,
} from '../availability'
import { APP_COLORS, TONES, formatInr, toneAt } from '../../../config/theme'
import { getDoctorAvailability, SlotGroup } from '../doctorService'

// "4 · Clinic & slot" (Step 1 of 2) from the consultation design.
//
// Booking logic moved here from DoctorDetailPage unchanged: availability is
// fetched per (doctor, hospital, date), fees come from the selected hospital
// entry, and Continue hands off to CONSENT_FORM with the same paymentParams
// shape PatientPayment expects (plus the optional patient / reason fields).

/** How many days ahead (starting today) the Date grid offers: two rows of seven. */
const BOOKING_WINDOW_DAYS = 14

const cleanGroupLabel = (label: string) => label.replace(/\s*\(.*\)\s*$/, '')

export default function BookSlotPage() {
	const navigation = useNavigation<NavigationProp<AppStackParamList>>()
	const route = useRoute<RouteProp<AppStackParamList, typeof ROUTES.STACK.DOCTOR_BOOK_SLOT>>()
	const { doctor, referralId } = route.params

	const hospitals = doctor.hospitals || []
	const primary = hospitals.find((h) => h.is_primary) || hospitals[0]

	// A clinic picked on the doctor profile (or the only clinic there is) is final: don't ask again.
	const clinicLocked = !!route.params.hospitalSelected || hospitals.length <= 1

	const [mode, setMode] = useState<AppointmentModeKey>(route.params.mode || 'clinic')
	const [selectedHospital, setSelectedHospital] = useState<string | null>(
		route.params.hospitalId || primary?.hospital.id || null
	)
	const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()))
	const [selectedTime, setSelectedTime] = useState<string | null>(null)
	const [slotsByMode, setSlotsByMode] = useState(emptyAvailabilityByMode)
	const [slotsLoading, setSlotsLoading] = useState(false)
	const [reason, setReason] = useState('')

	// Pre-select the first open slot on entry and whenever mode/clinic changes
	// (matches the design's switchTo()). A manual date pick clears the time instead.
	const autoPickRef = useRef(true)

	const { members, addFromDraft } = useFamilyMembers()
	// Online booking is paused after repeated no-shows: warn here and disable Continue (the server enforces it too).
	const { restricted, message: restrictedMessage } = useBookingRestriction()
	const [patientKey, setPatientKey] = useState('self')
	const [patientSheetVisible, setPatientSheetVisible] = useState(false)

	useEffect(() => {
		if (!doctor.id || !selectedHospital) return
		let active = true
		setSlotsLoading(true)
		const fetchAvailability = async () => {
			try {
				const res = await getDoctorAvailability({
					doctor_id: doctor.id,
					hospital_id: selectedHospital,
					date: formatDateForApi(selectedDate),
				})
				if (active) setSlotsByMode(normalizeAvailabilityByMode(res))
			} catch {
				if (active) setSlotsByMode(emptyAvailabilityByMode)
			} finally {
				if (active) setSlotsLoading(false)
			}
		}
		fetchAvailability()
		return () => {
			active = false
		}
	}, [doctor.id, selectedHospital, selectedDate])

	const groups: SlotGroup[] = slotsByMode[mode] || []

	useEffect(() => {
		if (slotsLoading || !autoPickRef.current) return
		autoPickRef.current = false
		setSelectedTime(firstOpenSlot(groups)?.start_time ?? null)
	}, [slotsLoading, groups])

	const hospitalEntry = hospitals.find((h) => h.hospital.id === selectedHospital) || primary
	const clinicFee = Number(hospitalEntry?.offline_consultation_fee) || 0
	const videoFee = Number(hospitalEntry?.video_consultation_fee) || 0
	const fee = mode === 'video' ? videoFee : clinicFee
	const days = nextDays(BOOKING_WINDOW_DAYS)
	const patient = members.find((m) => m.key === patientKey) || members[0]

	const specialityText = (doctor.specialities || []).filter(Boolean)[0] || ''
	const years = doctor.details?.experience_years
	const avatarUrl =
		typeof doctor.details?.avatar_s3_key === 'string' && doctor.details.avatar_s3_key.trim()
			? doctor.details.avatar_s3_key
			: null
	const headerSub = [specialityText, years != null ? `${years} yrs` : '', clinicFee ? formatInr(clinicFee) : '']
		.filter(Boolean)
		.join(' · ')

	const shortClinic = (name?: string) => {
		if (!name) return 'Clinic'
		const parts = name.split(',')
		return parts.length > 1 ? `${parts[parts.length - 1].trim()} clinic` : name
	}
	const where = mode === 'video' ? 'Video consult' : shortClinic(hospitalEntry?.hospital.name)
	const isToday = isSameDay(selectedDate, new Date())
	const dayText = `${isToday ? 'Today' : DOW_LABELS[selectedDate.getDay()]} ${selectedDate.getDate()} ${
		MONTH_SHORT[selectedDate.getMonth()]
	}`
	const summary = selectedTime ? `${dayText}, ${selectedTime} · ${where}` : `${dayText} · ${where} · choose a time`
	const eyebrow = selectedTime
		? isToday
			? 'TODAY'
			: `${DOW_LABELS[selectedDate.getDay()]} ${selectedDate.getDate()} ${MONTH_SHORT[selectedDate.getMonth()]}`.toUpperCase()
		: 'CHOOSE A TIME'

	const monthLabel = useMemo(() => {
		const first = days[0]
		const last = days[days.length - 1]
		return first.getMonth() === last.getMonth()
			? `${MONTH_LONG[first.getMonth()]} ${first.getFullYear()}`
			: `${MONTH_SHORT[first.getMonth()]} – ${MONTH_SHORT[last.getMonth()]} ${last.getFullYear()}`
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [days[0].getDate()])

	const switchMode = (next: AppointmentModeKey) => {
		if (next === mode) return
		if (next === 'video' && !videoFee) return
		autoPickRef.current = true
		setMode(next)
		setSelectedTime(null)
		// Slots for both modes come back in one response, so re-run the auto pick now.
		const nextGroups = slotsByMode[next] || []
		if (!slotsLoading) {
			autoPickRef.current = false
			setSelectedTime(firstOpenSlot(nextGroups)?.start_time ?? null)
		}
	}

	const pickClinic = (hospitalId: string) => {
		if (hospitalId === selectedHospital) return
		autoPickRef.current = true
		setSelectedHospital(hospitalId)
		setSelectedTime(null)
	}

	const pickDate = (d: Date) => {
		setSelectedDate(d)
		setSelectedTime(null)
	}

	const handleContinue = () => {
		if (!selectedTime || !selectedHospital || !hospitalEntry) return
		navigation.navigate(ROUTES.STACK.CONSENT_FORM, {
			paymentParams: {
				doctor,
				hospitalId: selectedHospital,
				hospitalName: hospitalEntry.hospital.name || '',
				appointmentDate: formatDateForApi(selectedDate),
				appointmentDateDisplay: formatDateDisplay(selectedDate),
				startTime: formatTimeForApi(selectedTime),
				startTimeDisplay: selectedTime,
				appointmentMode: mode === 'clinic' ? 'offline' : 'online',
				consultationTypeLabel: mode === 'clinic' ? 'Clinic Visit' : 'Video Call',
				fee,
				referralId,
				patientId: patient.id,
				patientName: patient.name,
				patientRelation: patient.relation,
				reasonForVisit: reason.trim() || undefined,
			},
		})
	}

	const saveMember = async (draft: FamilyMemberDraft) => {
		const key = await addFromDraft(draft)
		if (key) setPatientKey(key)
		return !!key
	}

	return (
		<View style={styles.container}>
			{/* Header */}
			<AppScreenHeader
				variant="bar"
				solid
				title={doctor.name}
				subtitle={headerSub}
				leading={
					<AppAvatar
						uri={avatarUrl}
						size={36}
						borderWidth={2}
						borderColor="#fff"
						backgroundColor={TONES.lilac.bg}
						fallbackIcon="account"
						initialsColor={TONES.lilac.ink}
					/>
				}
				badge="Step 1 of 2"
				onBack={() => navigation.goBack()}
				backAccessibilityLabel="Back to profile"
			/>

			{restricted && <BookingRestrictedBanner message={restrictedMessage} />}

			<ScrollView
				style={{ flex: 1 }}
				contentContainerStyle={{ paddingBottom: 8 }}
				stickyHeaderIndices={[1]}
				keyboardShouldPersistTaps="handled"
			>
				{/* Your booking */}
				<View style={styles.bookingWrap}>
					<View style={styles.bookingCard}>
						<View style={styles.bookingDecor} />
						<AppIconTile
							icon="calendar-check-outline"
							size={48}
							radius={12}
							iconSize={24}
							backgroundColor={APP_COLORS.mintAccent}
							iconColor={APP_COLORS.ink}
						/>
						<View style={{ flex: 1, minWidth: 0 }}>
							<AppTypography style={styles.bookingEyebrow}>{eyebrow}</AppTypography>
							<AppTypography style={styles.bookingBig}>{selectedTime || 'No time picked'}</AppTypography>
							<AppTypography style={styles.bookingSub} numberOfLines={1}>
								{doctor.name} · {where}
							</AppTypography>
						</View>
						<AppTag
							label={formatInr(fee)}
							size="md"
							shape="pill"
							bg={APP_COLORS.mintAccent}
							ink={APP_COLORS.ink}
							style={styles.feePill}
							textStyle={styles.feePillText}
						/>
					</View>
				</View>

				{/* Consultation type (sticky) -- the outer View is the sticky child (RN replaces its style) */}
				<View style={styles.segmentWrap}>
					<AppSegmentedControl<AppointmentModeKey>
						value={mode}
						onChange={switchMode}
						options={[
							{
								value: 'clinic',
								label: `In-clinic${clinicFee ? ` · ${formatInr(clinicFee)}` : ''}`,
								icon: 'home-outline',
							},
							{
								value: 'video',
								label: `Video${videoFee ? ` · ${formatInr(videoFee)}` : ''}`,
								icon: 'video-outline',
								disabled: !videoFee,
							},
						]}
					/>
				</View>

				{mode === 'clinic' && clinicLocked && hospitalEntry ? (
					<AppSection title="Clinic" gap={12}>
						<View style={[styles.clinicCard, styles.clinicCardOn]}>
							<AppIconTile
								icon="hospital-building"
								size={44}
								radius={12}
								iconSize={22}
								backgroundColor={APP_COLORS.primary}
								iconColor="#fff"
							/>
							<View style={{ flex: 1, minWidth: 0 }}>
								<AppTypography style={styles.clinicName}>{hospitalEntry.hospital.name}</AppTypography>
								<AppTypography style={styles.muted13} numberOfLines={2}>
									{(hospitalEntry.hospital.address || '') +
										(hospitalEntry.hospital.distance ? ` · ${hospitalEntry.hospital.distance} km` : '')}
								</AppTypography>
							</View>
							<AppIconButton
								icon="navigation-variant-outline"
								size={36}
								iconSize={16}
								accessibilityLabel={`Directions to ${hospitalEntry.hospital.name}`}
								onPress={() =>
									openDirections(
										hospitalEntry.hospital.latitude,
										hospitalEntry.hospital.longitude,
										hospitalEntry.hospital.address,
										hospitalEntry.hospital.name
									)
								}
							/>
						</View>
					</AppSection>
				) : mode === 'clinic' ? (
					<AppSection title="Choose a clinic" gap={12}>
						<View style={{ gap: 10 }} accessibilityRole="radiogroup">
							{hospitals.map((h, n) => {
								const on = h.hospital.id === selectedHospital
								const tone = n === 0 ? TONES.mint : toneAt(n + 2)
								const km = h.hospital.distance ? ` · ${h.hospital.distance} km` : ''
								return (
									<Pressable
										key={h.hospital.id}
										accessibilityRole="radio"
										accessibilityState={{ checked: on }}
										onPress={() => pickClinic(h.hospital.id)}
										style={[styles.clinicCard, on && styles.clinicCardOn]}
									>
										<AppIconTile
											icon="hospital-building"
											size={44}
											radius={12}
											iconSize={22}
											backgroundColor={on ? APP_COLORS.primary : tone.bg}
											iconColor={on ? '#fff' : tone.ink}
										/>
										<View style={{ flex: 1, minWidth: 0 }}>
											<AppTypography style={styles.clinicName}>{h.hospital.name}</AppTypography>
											<AppTypography style={styles.muted13} numberOfLines={2}>
												{(h.hospital.address || '') + km}
											</AppTypography>
										</View>
										<AppIconButton
											icon="navigation-variant-outline"
											size={36}
											iconSize={16}
											accessibilityLabel={`Directions to ${h.hospital.name}`}
											onPress={() => openDirections(h.hospital.latitude, h.hospital.longitude, h.hospital.address, h.hospital.name)}
										/>
										<AppRadio checked={on} />
									</Pressable>
								)
							})}
							{hospitals.length === 0 && (
								<AppTypography style={styles.muted14}>
									No clinics available for this doctor.
								</AppTypography>
							)}
						</View>
					</AppSection>
				) : (
					<AppSection gap={12} style={styles.videoInfo}>
						<AppIconTile icon="video-outline" tone="sky" size={40} radius={8} iconSize={20} />
						<View style={{ flex: 1, gap: 2 }}>
							<AppTypography style={styles.rowTitle}>Video consultation</AppTypography>
							<AppTypography style={styles.muted13}>
								Join from the app at your slot time. Keep your reports handy to share on screen.
							</AppTypography>
						</View>
					</AppSection>
				)}

				{/* Date */}
				<AppSection
					title="Date"
					flush
					gap={12}
					right={<AppTypography style={styles.muted13}>{monthLabel}</AppTypography>}
				>
					<DateStrip
						variant="grid"
						columns={7}
						dayCount={BOOKING_WINDOW_DAYS}
						selectedDate={selectedDate}
						onSelectDate={(d) => pickDate(startOfDay(d))}
						isDateDisabled={(d) => isClosedDay(d, hospitalEntry?.available_days)}
						disabledAccessibilityHint="clinic closed"
						style={{ paddingHorizontal: 16 }}
					/>
				</AppSection>

				{/* Time */}
				<AppSection title="Time" gap={12}>
					{slotsLoading ? (
						<ActivityIndicator color={APP_COLORS.primary} style={{ marginVertical: 12 }} />
					) : groups.length === 0 || !groups.some((g) => g.slots.some(isSlotSelectable)) ? (
						<AppTypography style={styles.muted14}>
							No slots left on this day. Try another date.
						</AppTypography>
					) : (
						groups.map((g, gi) => {
							const free = g.slots.filter(isSlotSelectable).length
							return (
								<View key={`${g.label}-${gi}`} style={{ gap: 8 }}>
									<AppTypography style={styles.groupLabel}>
										{cleanGroupLabel(g.label)} · {free === 0 ? 'none left' : `${free} available`}
									</AppTypography>
									<SlotChipGrid
										columns={3}
										slots={g.slots.map((s) => ({
											value: s.start_time,
											label: s.start_time,
											struck: isSlotBooked(s),
											disabled: !isSlotSelectable(s),
										}))}
										selectedValue={selectedTime}
										onSelectValue={setSelectedTime}
									/>
								</View>
							)
						})
					)}
				</AppSection>

				{/* Patient details */}
				<AppSection gap={12} style={{ paddingTop: 8 }}>
					<AppPatientRow
						member={patient}
						toneIndex={members.indexOf(patient)}
						label="APPOINTMENT FOR"
						onChange={() => setPatientSheetVisible(true)}
					/>
					<View style={{ gap: 6 }}>
						<AppTypography style={styles.label}>
							Reason for visit <AppTypography style={styles.labelOptional}>(optional)</AppTypography>
						</AppTypography>
						<TextInput
							value={reason}
							onChangeText={setReason}
							placeholder="e.g. Sugar levels high, follow-up"
							placeholderTextColor={APP_COLORS.inkMuted}
							style={[styles.input, { borderRadius: 4 }]}
						/>
					</View>
				</AppSection>
			</ScrollView>

			{/* Footer */}
			<AppFooterBar direction="column" summary={{ icon: 'calendar-blank-outline', text: summary }}>
				{selectedTime ? (
					<AppButton size="lg" onPress={handleContinue} disabled={restricted} softDisabled>
						{`Continue · ${formatInr(fee)}`}
					</AppButton>
				) : (
					<AppButton size="lg" disabled softDisabled radius={8} contentStyle={styles.pickTimeBtnContent}>
						Pick a time to continue
					</AppButton>
				)}
			</AppFooterBar>

			{/* Who is this appointment for? */}
			<AppFamilyMemberSheet
				visible={patientSheetVisible}
				onClose={() => setPatientSheetVisible(false)}
				members={members}
				selectedKey={patient.key}
				onSelect={(m) => setPatientKey(m.key)}
				confirmLabel={(m) => `Book for ${familyMemberFirstName(m)}`}
				onSave={saveMember}
			/>
		</View>
	)
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: APP_COLORS.pageBg },

	bookingWrap: { backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 16 },
	bookingCard: {
		overflow: 'hidden',
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		padding: 14,
		borderRadius: 16,
		backgroundColor: APP_COLORS.ink,
	},
	bookingDecor: {
		position: 'absolute',
		right: -30,
		top: -40,
		width: 120,
		height: 120,
		borderRadius: 60,
		backgroundColor: APP_COLORS.primary,
	},
	bookingEyebrow: { fontSize: 12, lineHeight: 16, fontWeight: '700', letterSpacing: 0.5, color: APP_COLORS.mintAccent },
	bookingBig: { fontSize: 20, lineHeight: 26, fontWeight: '800', color: '#fff' },
	bookingSub: { fontSize: 12, lineHeight: 16, color: APP_COLORS.mint },
	// AppTag md pill (13/18) centred in the card at the design's 800 weight
	feePill: { alignSelf: 'center' },
	feePillText: { fontWeight: '800' },

	segmentWrap: {
		backgroundColor: '#fff',
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: APP_COLORS.divider,
		shadowColor: APP_COLORS.shadow,
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.08,
		shadowRadius: 4,
		elevation: 2,
	},

	muted13: { fontSize: 13, lineHeight: 18, color: APP_COLORS.inkMuted },
	muted14: { fontSize: 14, lineHeight: 20, color: APP_COLORS.inkMuted },
	rowTitle: { fontSize: 15, lineHeight: 22, fontWeight: '600', color: APP_COLORS.ink },

	clinicCard: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		padding: 14,
		borderRadius: 16,
		borderWidth: 2,
		borderColor: 'transparent',
		backgroundColor: APP_COLORS.pageBg,
	},
	clinicCardOn: { borderColor: APP_COLORS.primary, backgroundColor: APP_COLORS.mint },
	clinicName: { fontSize: 15, lineHeight: 22, fontWeight: '700', color: APP_COLORS.ink },

	videoInfo: { flexDirection: 'row', alignItems: 'flex-start' },

	groupLabel: { fontSize: 13, lineHeight: 18, fontWeight: '600', color: APP_COLORS.inkMuted },

	label: { fontSize: 14, lineHeight: 20, fontWeight: '600', color: APP_COLORS.ink },
	labelOptional: { fontSize: 14, lineHeight: 20, fontWeight: '400', color: APP_COLORS.inkMuted },
	input: {
		height: 48,
		paddingHorizontal: 12,
		borderWidth: 1,
		borderColor: APP_COLORS.border,
		borderRadius: 8,
		fontSize: 16,
		color: APP_COLORS.ink,
		backgroundColor: '#fff',
	},

	// "Pick a time" placeholder keeps its original 48h (radius 8 via the radius prop)
	pickTimeBtnContent: { height: 48 },
})
