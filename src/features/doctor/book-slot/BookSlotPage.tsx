import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
	ActivityIndicator,
	Keyboard,
	Platform,
	Pressable,
	StyleSheet,
	TextInput,
	TouchableOpacity,
	View,
	ScrollView,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useNavigation, useRoute } from '@react-navigation/native'
import type { NavigationProp, RouteProp } from '@react-navigation/native'
import {
	AppAvatar,
	AppBottomSheet,
	AppButton,
	AppChip,
	AppFooterBar,
	AppIconTile,
	AppRadio,
	AppScreenHeader,
	AppSection,
	AppTypography,
	DateStrip,
	SlotChipGrid,
} from '../../../components/common'
import { useAuth } from '../../../context/AuthContext'
import { ROUTES } from '../../../navigation/routes'
import type { AppStackParamList } from '../../../navigation/types'
import { formatDateDisplay, formatDateForApi, formatTimeForApi } from '../../../utils/date'
import { openOnMap } from '../../../utils/maps'
import { showComingSoon } from '../../../utils/toast'
import { getFamilyMembers } from '../../profile/patient/PatientProfileService'
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
	nextSevenDays,
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

interface Member {
	/** Patient public id; undefined for "self" so the backend books for the caller */
	id?: string
	key: string
	name: string
	relation: string
	avatar?: string | null
}

const RELATIONS = ['Spouse', 'Child', 'Parent', 'Sibling', 'Other']
const GENDERS = ['Female', 'Male', 'Other', 'Prefer not to say']

const firstNameOf = (m: Member) => (m.relation === 'Self' ? 'yourself' : m.name.split(' ')[0])

const cleanGroupLabel = (label: string) => label.replace(/\s*\(.*\)\s*$/, '')

/** Family-member avatar: photo, or initials on the member's soft tone (design 16-17/22 700). */
const MemberAvatar = ({
	member,
	index,
	size,
	ring,
}: {
	member: Member
	index: number
	size: number
	ring?: boolean
}) => {
	const tone = toneAt(index)
	return (
		<AppAvatar
			uri={member.avatar}
			name={member.name}
			size={size}
			backgroundColor={tone.bg}
			initialsColor={tone.ink}
			initialsStyle={{ fontSize: size > 50 ? 17 : 16, lineHeight: 22, fontWeight: '700' }}
			ring={ring}
		/>
	)
}

/**
 * iOS keyboard height. AppBottomSheet has no built-in keyboard avoidance, so the sheet footer
 * grows by this much while the keyboard is up, lifting the sheet like the old
 * KeyboardAvoidingView (behavior="padding", iOS only) did.
 */
const useIosKeyboardHeight = () => {
	const [height, setHeight] = useState(0)
	useEffect(() => {
		if (Platform.OS !== 'ios') return
		const show = Keyboard.addListener('keyboardWillShow', (e) => setHeight(e.endCoordinates.height))
		const hide = Keyboard.addListener('keyboardWillHide', () => setHeight(0))
		return () => {
			show.remove()
			hide.remove()
		}
	}, [])
	return height
}

export default function BookSlotPage() {
	const navigation = useNavigation<NavigationProp<AppStackParamList>>()
	const route = useRoute<RouteProp<AppStackParamList, typeof ROUTES.STACK.DOCTOR_BOOK_SLOT>>()
	const { doctor, referralId } = route.params
	const { user } = useAuth()
	const keyboardHeight = useIosKeyboardHeight()

	const hospitals = doctor.hospitals || []
	const primary = hospitals.find((h) => h.is_primary) || hospitals[0]

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

	const selfMember: Member = { key: 'self', name: user?.name || 'Myself', relation: 'Self', avatar: user?.avatar }
	const [members, setMembers] = useState<Member[]>([selfMember])
	const [patientKey, setPatientKey] = useState('self')
	const [sheet, setSheet] = useState<null | 'list' | 'add'>(null)
	const [newName, setNewName] = useState('')
	const [newRel, setNewRel] = useState('Spouse')
	const [newGender, setNewGender] = useState(GENDERS[0])

	useEffect(() => {
		let active = true
		const fetchMembers = async () => {
			try {
				const list = await getFamilyMembers()
				if (!active || !list.length) return
				const self = list.find((m) => m.is_self || m.relation === 'SELF')
				const mapped: Member[] = [
					self ? { key: 'self', name: self.name, relation: 'Self', avatar: self.avatar_s3_key } : selfMember,
					...list
						.filter((m) => m !== self)
						.map((m) => {
							const id = m.public_id || m.publicId || String(m.id)
							const rel = m.relationship || m.relation || 'Family member'
							return {
								id,
								key: id,
								name: m.name,
								relation: rel.charAt(0).toUpperCase() + rel.slice(1).toLowerCase(),
								avatar: m.avatar_s3_key,
							}
						}),
				]
				setMembers(mapped)
			} catch {
				// Fall back to "self" only; the picker still works.
			}
		}
		fetchMembers()
		return () => {
			active = false
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

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
	const days = nextSevenDays()
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

	const saveMember = () => {
		// There is no create-family-member endpoint yet (the API only lists
		// members), so a locally-added person could not be booked for.
		showComingSoon('Add family members from your profile for now.')
	}

	const nameOk = newName.trim().length > 1

	// Last open sheet view, so the title/content don't flip while the sheet animates closed.
	const sheetViewRef = useRef<'list' | 'add'>('list')
	if (sheet) sheetViewRef.current = sheet
	const sheetView = sheetViewRef.current

	const sheetFooter =
		sheetView === 'add' ? (
			<AppButton
				size="lg"
				disabled={!nameOk}
				onPress={saveMember}
				style={!nameOk && styles.btnDisabledSoft}
				labelStyle={[styles.btnLabelBold, !nameOk && { color: APP_COLORS.inkMuted }]}
			>
				Save and select
			</AppButton>
		) : (
			<View style={{ gap: 8 }}>
				<TouchableOpacity
					style={styles.addMemberBtn}
					onPress={() => {
						setNewName('')
						setNewRel('Spouse')
						setSheet('add')
					}}
				>
					<MaterialCommunityIcons name="plus" size={18} color={APP_COLORS.primary} />
					<AppTypography style={styles.addMemberText}>Add family member</AppTypography>
				</TouchableOpacity>
				<AppButton size="lg" onPress={() => setSheet(null)} labelStyle={styles.btnLabelBold}>
					{`Book for ${firstNameOf(patient)}`}
				</AppButton>
			</View>
		)

	return (
		<View style={styles.container}>
			{/* Header */}
			<AppScreenHeader
				variant="bar"
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
						<View style={styles.feePill}>
							<AppTypography style={styles.feePillText}>{formatInr(fee)}</AppTypography>
						</View>
					</View>
				</View>

				{/* Consultation type (sticky) -- the outer View is the sticky child (RN replaces its style) */}
				<View style={styles.segmentWrap}>
					<View style={styles.segmentGroup} accessibilityRole="radiogroup">
						{(['clinic', 'video'] as AppointmentModeKey[]).map((m) => {
							const on = mode === m
							const disabled = m === 'video' && !videoFee
							return (
								<TouchableOpacity
									key={m}
									accessibilityRole="radio"
									accessibilityState={{ checked: on, disabled }}
									disabled={disabled}
									onPress={() => switchMode(m)}
									style={[styles.segment, on && styles.segmentOn, disabled && { opacity: 0.5 }]}
								>
									<MaterialCommunityIcons
										name={m === 'clinic' ? 'home-outline' : 'video-outline'}
										size={16}
										color={on ? APP_COLORS.ink : APP_COLORS.inkMuted}
									/>
									<AppTypography style={[styles.segmentText, on && { color: APP_COLORS.ink }]}>
										{m === 'clinic'
											? `In-clinic${clinicFee ? ` · ${formatInr(clinicFee)}` : ''}`
											: `Video${videoFee ? ` · ${formatInr(videoFee)}` : ''}`}
									</AppTypography>
								</TouchableOpacity>
							)
						})}
					</View>
				</View>

				{mode === 'clinic' ? (
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
										<TouchableOpacity
											accessibilityLabel={`Directions to ${h.hospital.name}`}
											onPress={() => openOnMap(h.hospital.address, h.hospital.name)}
											style={styles.directionsBtn}
										>
											<MaterialCommunityIcons
												name="navigation-variant-outline"
												size={16}
												color={APP_COLORS.primary}
											/>
										</TouchableOpacity>
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
					<View style={styles.patientRow}>
						<MemberAvatar member={patient} index={members.indexOf(patient)} size={48} />
						<View style={{ flex: 1, minWidth: 0 }}>
							<AppTypography style={styles.eyebrow}>APPOINTMENT FOR</AppTypography>
							<AppTypography style={styles.patientName}>{patient.name}</AppTypography>
							<AppTypography style={styles.muted13}>{patient.relation}</AppTypography>
						</View>
						<AppButton
							size="md"
							icon="swap-horizontal"
							onPress={() => setSheet('list')}
							accessibilityLabel="Change patient"
							style={styles.changeBtn}
						>
							Change
						</AppButton>
					</View>
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
			<AppFooterBar direction="column">
				<View style={styles.summaryRow}>
					<MaterialCommunityIcons name="calendar-blank-outline" size={16} color={APP_COLORS.primary} />
					<AppTypography style={styles.summaryText} numberOfLines={1}>
						{summary}
					</AppTypography>
				</View>
				{selectedTime ? (
					<AppButton size="lg" onPress={handleContinue}>
						{`Continue · ${formatInr(fee)}`}
					</AppButton>
				) : (
					<AppButton
						size="lg"
						disabled
						style={[styles.btnDisabledSoft, styles.pickTimeBtn]}
						contentStyle={styles.pickTimeBtnContent}
						labelStyle={{ color: APP_COLORS.ink }}
					>
						Pick a time to continue
					</AppButton>
				)}
			</AppFooterBar>

			{/* Who is this appointment for? */}
			<AppBottomSheet
				visible={!!sheet}
				onClose={() => setSheet(null)}
				appearance="modern"
				showHeaderDivider={false}
				maxHeightRatio={0.9}
				title={sheetView === 'add' ? 'Add family member' : 'Who is this appointment for?'}
				subtitle={sheetView === 'add' ? undefined : 'Pick a family member or add someone new'}
				onBack={sheetView === 'add' ? () => setSheet('list') : undefined}
				backAccessibilityLabel="Back to family members"
				footer={
					<>
						{sheetFooter}
						{keyboardHeight > 0 && <View style={{ height: keyboardHeight }} />}
					</>
				}
			>
				{sheetView === 'add' ? (
					<View style={{ gap: 16 }}>
						<View style={{ gap: 6 }}>
							<AppTypography style={styles.label}>Full name</AppTypography>
							<TextInput
								value={newName}
								onChangeText={setNewName}
								placeholder="As on their ID"
								placeholderTextColor={APP_COLORS.inkMuted}
								autoComplete="name"
								style={styles.input}
							/>
						</View>
						<View style={{ gap: 8 }}>
							<AppTypography style={styles.label}>Relationship</AppTypography>
							<View style={styles.chipWrap} accessibilityRole="radiogroup">
								{RELATIONS.map((r) => (
									<AppChip
										key={r}
										label={r}
										selected={r === newRel}
										onPress={() => setNewRel(r)}
										variant="solid"
										shape="pill"
										accessibilityRole="radio"
									/>
								))}
							</View>
						</View>
						<View style={{ flexDirection: 'row', gap: 12 }}>
							<View style={{ flex: 1, gap: 6 }}>
								<AppTypography style={styles.label}>Date of birth</AppTypography>
								<TextInput
									placeholder="DD/MM/YYYY"
									placeholderTextColor={APP_COLORS.inkMuted}
									keyboardType="numbers-and-punctuation"
									style={styles.input}
								/>
							</View>
							<View style={{ flex: 1, gap: 6 }}>
								<AppTypography style={styles.label}>Gender</AppTypography>
								<TouchableOpacity
									style={[styles.input, styles.selectInput]}
									onPress={() =>
										setNewGender((g) => GENDERS[(GENDERS.indexOf(g) + 1) % GENDERS.length])
									}
								>
									<AppTypography style={styles.selectText} numberOfLines={1}>
										{newGender}
									</AppTypography>
									<MaterialCommunityIcons name="chevron-down" size={18} color={APP_COLORS.ink} />
								</TouchableOpacity>
							</View>
						</View>
						<View style={{ gap: 6 }}>
							<AppTypography style={styles.label}>
								Mobile number <AppTypography style={styles.labelOptional}>(optional)</AppTypography>
							</AppTypography>
							<TextInput
								keyboardType="phone-pad"
								placeholder="For appointment reminders"
								placeholderTextColor={APP_COLORS.inkMuted}
								style={styles.input}
							/>
						</View>
					</View>
				) : (
					members.map((m, i) => {
						const on = m.key === patientKey
						return (
							<Pressable
								key={m.key}
								onPress={() => setPatientKey(m.key)}
								accessibilityRole="radio"
								accessibilityState={{ checked: on }}
								style={styles.memberRow}
							>
								<MemberAvatar member={m} index={i} size={52} ring={on} />
								<View style={{ flex: 1, minWidth: 0 }}>
									<AppTypography style={styles.patientName}>{m.name}</AppTypography>
									<AppTypography style={styles.muted13}>{m.relation}</AppTypography>
								</View>
								<AppRadio checked={on} />
							</Pressable>
						)
					})
				)}
			</AppBottomSheet>
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
	feePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9999, backgroundColor: APP_COLORS.mintAccent },
	feePillText: { fontSize: 13, lineHeight: 18, fontWeight: '800', color: APP_COLORS.ink },

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
	segmentGroup: {
		flexDirection: 'row',
		gap: 4,
		padding: 4,
		borderRadius: 9999,
		backgroundColor: APP_COLORS.pageBg,
		borderWidth: 1,
		borderColor: APP_COLORS.divider,
	},
	segment: {
		flex: 1,
		height: 40,
		borderRadius: 9999,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 6,
	},
	segmentOn: {
		backgroundColor: '#fff',
		shadowColor: APP_COLORS.shadow,
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.1,
		shadowRadius: 3,
		elevation: 1,
	},
	segmentText: { fontSize: 14, lineHeight: 20, fontWeight: '600', color: APP_COLORS.inkMuted },

	muted13: { fontSize: 13, lineHeight: 18, color: APP_COLORS.inkMuted },
	muted14: { fontSize: 14, lineHeight: 20, color: APP_COLORS.inkMuted },
	rowTitle: { fontSize: 15, lineHeight: 22, fontWeight: '600', color: APP_COLORS.ink },
	eyebrow: { fontSize: 12, lineHeight: 16, fontWeight: '700', letterSpacing: 0.5, color: APP_COLORS.inkMuted },

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
	// Icon-only 36x36 button (AppActionChip always has a label)
	directionsBtn: {
		width: 36,
		height: 36,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: APP_COLORS.border,
		backgroundColor: '#fff',
		alignItems: 'center',
		justifyContent: 'center',
	},

	videoInfo: { flexDirection: 'row', alignItems: 'flex-start' },

	groupLabel: { fontSize: 13, lineHeight: 18, fontWeight: '600', color: APP_COLORS.inkMuted },

	patientRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		minHeight: 72,
		borderBottomWidth: 1,
		borderBottomColor: APP_COLORS.divider,
		paddingBottom: 8,
	},
	patientName: { fontSize: 16, lineHeight: 22, fontWeight: '700', color: APP_COLORS.ink },
	changeBtn: {
		shadowColor: APP_COLORS.shadow,
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.16,
		shadowRadius: 6,
		elevation: 2,
	},
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

	summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
	summaryText: { flex: 1, fontSize: 13, lineHeight: 18, color: APP_COLORS.ink },
	btnLabelBold: { fontWeight: '700' },
	// Design's soft disabled CTA (Paper's own disabled colours would be grey)
	btnDisabledSoft: { backgroundColor: APP_COLORS.disabledBtn },
	// "Pick a time" placeholder keeps its original 48h / radius 8
	pickTimeBtn: { borderRadius: 8 },
	pickTimeBtnContent: { height: 48 },

	memberRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		minHeight: 72,
		borderBottomWidth: 1,
		borderBottomColor: APP_COLORS.divider,
	},
	addMemberBtn: {
		height: 48,
		borderRadius: 12,
		borderWidth: 1.5,
		borderStyle: 'dashed',
		borderColor: APP_COLORS.primary,
		backgroundColor: APP_COLORS.mint,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 6,
	},
	addMemberText: { fontSize: 15, lineHeight: 20, fontWeight: '700', color: APP_COLORS.primary },
	chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
	selectInput: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
	selectText: { flex: 1, fontSize: 16, lineHeight: 22, color: APP_COLORS.ink },
})
