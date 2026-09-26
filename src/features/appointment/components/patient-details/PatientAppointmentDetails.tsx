// src/features/appointment/components/patient-details/PatientAppointmentDetails.tsx
//
// Patient view of the Appointment details screen -- port of design
// 7_appt_details.html (in-clinic) and 7a_video_pending.html (video / payment
// pending). The doctor view and the AppointmentHistoryTab bottom sheet keep
// using the shared AppointmentDetailsContent.

import React, { useCallback, useEffect, useState } from 'react'
import { Alert, Linking, ScrollView, Share, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import type { NavigationProp } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Toast from 'react-native-toast-message'
import {
	AppAvatar,
	AppButton,
	AppDashedDivider,
	AppDetailRow,
	AppFooterBar,
	AppIconTile,
	AppInfoBanner,
	AppNumberedSteps,
	AppScreenHeader,
	AppSection,
	AppSkeleton,
	AppStatusTimeline,
} from '../../../../components/common'
import { getAppointmentById } from '../../../../services/appointmentService'
import { ROUTES } from '../../../../navigation/routes'
import type { AppStackParamList } from '../../../../navigation/types'
import { openOnMap } from '../../../../utils/maps'
import { buildS3Url } from '../../../../utils/s3Utils'
import { capitaliseWords } from '../../../../utils/formatters'
import { showComingSoon } from '../../../../utils/toast'
import { APP_COLORS, TONES, formatInr } from '../../../../config/theme'
import CancelAppointmentSheet from './CancelAppointmentSheet'
import CheckInQrSheet from './CheckInQrSheet'
import RescheduleSheet from './RescheduleSheet'
import {
	buildTimeline,
	combineDateTime,
	dayDiff,
	durationMinutes,
	fullDay,
	getPaymentState,
	getRawStatus,
	getVariant,
	isVideoMode,
	parseDateOnly,
	slotLabel,
	startsInLabel,
	type PatientAppointment,
} from './helpers'

// Wrapped so press events are never forwarded as showComingSoon's `text2`.
const comingSoon = () => showComingSoon()

const CLINIC_STEPS = [
	{ title: 'Bring your reports', body: 'Recent lab results, including HbA1c, and your medicine list.' },
	{ title: 'Arrive 10 minutes early', body: 'Show the QR code at the front desk to check in.' },
	{ title: 'Fasting not needed', body: 'Eat as usual unless the doctor told you otherwise.' },
]

const VIDEO_STEPS = [
	{ title: 'Find a quiet, well-lit spot', body: 'The doctor needs to see and hear you clearly.' },
	{ title: 'Keep reports and medicines handy', body: 'You can share photos of reports during the call.' },
	{ title: 'Check your internet', body: 'Wi-Fi or strong mobile data works best.' },
]

// ── Loading skeleton ─────────────────────────────────────────────────────────

function DetailsSkeleton() {
	return (
		<View style={styles.skeleton}>
			<AppSection marginTop={0} gap={12} style={styles.doctorCard}>
				<AppSkeleton width={60} height={60} borderRadius={16} style={styles.skelTone} />
				<View style={styles.skeletonCol}>
					<AppSkeleton width="60%" height={18} borderRadius={8} style={styles.skelTone} />
					<AppSkeleton width="45%" height={14} borderRadius={8} style={styles.skelTone} />
					<AppSkeleton width="70%" height={12} borderRadius={8} style={styles.skelTone} />
				</View>
			</AppSection>
			<AppSection marginTop={0}>
				<AppSkeleton width="30%" height={18} borderRadius={8} style={styles.skelTone} />
				{Array.from({ length: 5 }).map((_, i) => (
					<View key={i} style={styles.skeletonRow}>
						<AppSkeleton width={36} height={36} borderRadius={10} style={styles.skelTone} />
						<View style={styles.skeletonCol}>
							<AppSkeleton width="25%" height={10} borderRadius={8} style={styles.skelTone} />
							<AppSkeleton width="60%" height={14} borderRadius={8} style={styles.skelTone} />
						</View>
					</View>
				))}
			</AppSection>
			<AppSection marginTop={0}>
				<AppSkeleton width="30%" height={18} borderRadius={8} style={styles.skelTone} />
				<AppSkeleton width="100%" height={14} borderRadius={8} style={styles.skelTone} />
				<AppSkeleton width="100%" height={14} borderRadius={8} style={styles.skelTone} />
			</AppSection>
		</View>
	)
}

// ── Main ─────────────────────────────────────────────────────────────────────

export default function PatientAppointmentDetails({ appointmentId }: { appointmentId: string | null }) {
	const navigation = useNavigation<NavigationProp<AppStackParamList>>()
	const insets = useSafeAreaInsets()

	const [appt, setAppt] = useState<PatientAppointment | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [localCancelled, setLocalCancelled] = useState(false)
	const [localRescheduled, setLocalRescheduled] = useState(false)
	const [cancelOpen, setCancelOpen] = useState(false)
	const [qrOpen, setQrOpen] = useState(false)
	const [reschedOpen, setReschedOpen] = useState(false)

	const load = useCallback(
		async (silent = false) => {
			if (!appointmentId) {
				setLoading(false)
				setError('Appointment not found.')
				return
			}
			if (!silent) {
				setLoading(true)
				setError(null)
			}
			try {
				const data = (await getAppointmentById(appointmentId)) as PatientAppointment
				setAppt(data)
				setError(null)
			} catch {
				if (!silent) setError('We couldn’t load this appointment. Please try again.')
			} finally {
				if (!silent) setLoading(false)
			}
		},
		[appointmentId]
	)

	useEffect(() => {
		void load()
	}, [load])

	// ── Derived ──────────────────────────────────────────────────────────────
	const variant = localCancelled ? 'cancelled' : getVariant(getRawStatus(appt))
	const isVideo = isVideoMode(appt?.appointment_mode)
	const payment = appt ? getPaymentState(appt, variant) : 'unknown'
	const bookingId = appt ? appt.booking_id || appt.public_id || appt.id : ''
	const doctorName = appt?.doctor?.name || 'your doctor'
	const doctorId = appt?.doctor?.id
	const start = appt ? combineDateTime(appt.appointment_date, appt.start_time) : null
	const end = appt ? combineDateTime(appt.appointment_date, appt.end_time) : null
	const isPast = !!start && (end ?? start).getTime() < Date.now()
	const isCancelled = variant === 'cancelled'
	const isCompleted = variant === 'completed'
	const live = !isCancelled && !isCompleted
	const canAct = live && !isPast
	const showRescheduled = live && (localRescheduled || variant === 'rescheduled')
	const hospital = appt?.hospital ?? null
	const phone = hospital?.contact_number || hospital?.phone || ''
	const fee = appt?.fees
	const feeLabel = formatInr(fee)

	const apptDay = parseDateOnly(appt?.appointment_date)
	const whenLabel = appt ? slotLabel(appt.appointment_date, appt.start_time) : ''
	const startsIn = startsInLabel(start)
	const whenSub = !apptDay
		? undefined
		: showRescheduled
			? `${fullDay(apptDay)} · rescheduled`
			: startsIn
				? Math.abs(dayDiff(apptDay)) <= 1
					? `${fullDay(apptDay)} · ${startsIn}`
					: `${isVideo ? 'Video call' : 'Clinic visit'} · ${startsIn}`
				: fullDay(apptDay)

	const minutes = durationMinutes(appt?.start_time, appt?.end_time)
	const visitSub = isVideo
		? `${minutes ? `About ${minutes} minutes · ` : ''}in the Karolahealth app`
		: minutes
			? `About ${minutes} minutes with the doctor`
			: 'With the doctor, at the clinic'

	const created = appt?.created_at ? new Date(appt.created_at) : null
	const bookedSub =
		created && !Number.isNaN(created.getTime())
			? dayDiff(created) === 0
				? 'Booked today'
				: `Booked on ${fullDay(created)}`
			: undefined

	const speciality = appt?.doctor?.speciality || appt?.doctor?.specialty || appt?.doctor?.specialization || ''
	const quals = appt?.doctor?.qualifications || appt?.doctor?.degree || ''
	const avatarUri = buildS3Url(appt?.doctor?.avatar_s3_key ?? null)

	const patientSub = appt?.patient
		? [
				appt.patient.gender ? capitaliseWords(appt.patient.gender) : '',
				appt.patient.age ? `${appt.patient.age} yrs` : '',
			]
				.filter(Boolean)
				.join(' · ')
		: ''

	const refundCopy =
		payment === 'pending'
			? 'No payment was taken, so there’s nothing to refund.'
			: 'Any payment made will be refunded to the original method.'

	const timeline = appt ? buildTimeline({ appt, variant, isVideo, payment, isPast }) : []

	// ── Actions ──────────────────────────────────────────────────────────────
	const goBack = () => (navigation.canGoBack() ? navigation.goBack() : goBookings())
	const goBookings = () => navigation.navigate(ROUTES.MAIN.TABS, { screen: ROUTES.MAIN.PORTAL })
	const goDoctor = () => {
		if (doctorId) navigation.navigate(ROUTES.STACK.DOCTOR_DETAIL, { id: doctorId })
	}
	const goSummary = () => {
		if (appt) navigation.navigate(ROUTES.STACK.VISIT_SUMMARY, { appointmentId: appt.id })
	}
	const directions = () => openOnMap(hospital?.address, hospital?.name)

	const openReschedule = () => {
		if (!doctorId) {
			Alert.alert('Unable to reschedule', 'Doctor details are missing for this appointment.')
			return
		}
		setReschedOpen(true)
	}

	const rescheduleInstead = () => {
		setCancelOpen(false)
		// Let the first modal finish dismissing before presenting the next (iOS).
		setTimeout(openReschedule, 350)
	}

	const handleShare = async () => {
		if (!appt) return
		const where = isVideo
			? 'Video consultation'
			: `In-clinic consultation${hospital?.name ? ` at ${hospital.name}` : ''}${hospital?.address ? `, ${hospital.address}` : ''}`
		try {
			await Share.share({
				message: [
					`Appointment with ${appt.doctor?.name ?? 'doctor'}${speciality ? ` (${speciality})` : ''}`,
					`When: ${whenLabel}${apptDay ? ` (${fullDay(apptDay)})` : ''}`,
					where,
					`Booking ID: ${bookingId}`,
				].join('\n'),
			})
		} catch (e) {
			console.log('[PatientAppointmentDetails] share error:', e)
		}
	}

	const handleCancelled = () => {
		setCancelOpen(false)
		setLocalCancelled(true)
		setLocalRescheduled(false)
		Toast.show({ type: 'success', text1: 'Appointment cancelled' })
		void load(true)
	}

	const handleRescheduled = () => {
		setReschedOpen(false)
		setLocalRescheduled(true)
		Toast.show({ type: 'success', text1: 'Appointment rescheduled' })
		void load(true)
	}

	// ── Render ───────────────────────────────────────────────────────────────
	const header = (
		<>
			<StatusBar barStyle="light-content" backgroundColor={APP_COLORS.primary} />
			<AppScreenHeader
				variant="bar"
				title={isVideo ? 'Video appointment' : 'Appointment'}
				subtitle={bookingId ? `Booking ${bookingId}` : undefined}
				titleStyle={styles.headerTitle}
				onBack={goBack}
				backAccessibilityLabel="Back to bookings"
				rightElement={
					<View style={styles.headerActions}>
						<TouchableOpacity
							style={styles.headerBtn}
							onPress={handleShare}
							disabled={!appt}
							accessibilityRole="button"
							accessibilityLabel="Share"
						>
							<MaterialCommunityIcons name="share-variant-outline" size={22} color="#FFFFFF" />
						</TouchableOpacity>
						<TouchableOpacity
							style={[styles.headerBtn, styles.headerBtnRight]}
							onPress={comingSoon}
							accessibilityRole="button"
							accessibilityLabel="Help"
						>
							<MaterialCommunityIcons name="help-circle-outline" size={22} color="#FFFFFF" />
						</TouchableOpacity>
					</View>
				}
			/>
		</>
	)

	if (loading) {
		return (
			<View style={styles.container}>
				{header}
				<DetailsSkeleton />
			</View>
		)
	}

	if (error || !appt) {
		return (
			<View style={styles.container}>
				{header}
				<View style={styles.errorBox}>
					<AppIconTile
						icon="alert-circle-outline"
						size={56}
						radius={16}
						iconSize={28}
						backgroundColor={APP_COLORS.dangerBg}
						iconColor={APP_COLORS.danger}
						style={styles.errorTile}
					/>
					<Text style={styles.errorTitle}>Something went wrong</Text>
					<Text style={styles.errorBody}>{error ?? 'Appointment not found.'}</Text>
					<AppButton size="md" style={styles.retryBtn} onPress={() => void load()}>
						Try again
					</AppButton>
				</View>
			</View>
		)
	}

	const steps = isVideo ? VIDEO_STEPS : CLINIC_STEPS
	const totalLabel = payment === 'pending' ? 'To pay' : payment === 'paid' ? 'Paid' : 'Total'
	const paidMethod = appt.payment_method || appt.payment?.method || ''
	const paidTxn = appt.transaction_id || appt.payment?.transaction_id || ''

	return (
		<View style={styles.container}>
			{header}

			<ScrollView contentContainerStyle={styles.main} showsVerticalScrollIndicator={false}>
				{isCancelled && (
					<AppInfoBanner
						tone="danger"
						size="prominent"
						icon="close"
						eyebrow="Cancelled"
						title={`${isVideo ? 'Video call' : 'Appointment'} with ${doctorName}`}
						subtitle={refundCopy}
						style={styles.bannerTop}
					/>
				)}

				{showRescheduled && (
					<AppInfoBanner
						tone="success"
						icon="check"
						title="Rescheduled"
						subtitle={
							isVideo
								? payment === 'pending'
									? `We’ve told ${doctorName}. Pay before the new time to keep the slot.`
									: `We’ve told ${doctorName}. Your booking and fee stay the same.`
								: 'We’ve told the clinic. Your QR code and payment stay the same.'
						}
						style={styles.bannerTop}
					/>
				)}

				{live && payment === 'pending' && (
					<AppInfoBanner
						tone="warning"
						icon="clock-outline"
						title="Payment pending"
						subtitle={
							fee
								? `Pay ${feeLabel} to confirm your booking.`
								: 'Complete payment to confirm your booking.'
						}
						action={{ label: 'Pay now', onPress: comingSoon }}
						style={styles.bannerTop}
					/>
				)}

				{isCompleted && (
					<AppInfoBanner
						tone="success"
						icon="check"
						title="Visit completed"
						subtitle="Your prescription and notes are in the visit summary."
						action={{ label: 'View', onPress: goSummary }}
						style={styles.bannerTop}
					/>
				)}

				<View style={styles.spacer8} />

				{/* Doctor */}
				<AppSection marginTop={0} gap={12} style={styles.doctorCard}>
					<AppAvatar
						uri={avatarUri}
						name={(appt.doctor?.name ?? 'D').replace(/^Dr\.?\s*/i, '').charAt(0)}
						size={60}
						radius={16}
						backgroundColor={TONES.lilac.bg}
						initialsColor={TONES.lilac.ink}
						initialsStyle={styles.avatarInitial}
					/>
					<View style={styles.flexText}>
						<Text style={styles.doctorName} numberOfLines={1}>
							{appt.doctor?.name ?? 'Doctor'}
						</Text>
						{!!speciality && (
							<Text style={styles.doctorSpec} numberOfLines={1}>
								{speciality}
							</Text>
						)}
						{!!quals && (
							<Text style={styles.doctorQuals} numberOfLines={2}>
								{quals}
							</Text>
						)}
						{!!doctorId && (
							<TouchableOpacity
								onPress={goDoctor}
								style={styles.profileLink}
								accessibilityRole="link"
								hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
							>
								<Text style={styles.profileLinkText}>View profile</Text>
								<MaterialCommunityIcons name="chevron-right" size={16} color={APP_COLORS.primary} />
							</TouchableOpacity>
						)}
					</View>
					{!!phone && (
						<TouchableOpacity
							style={styles.callBtn}
							onPress={() => Linking.openURL(`tel:${phone}`)}
							accessibilityRole="button"
							accessibilityLabel="Call clinic"
						>
							<MaterialCommunityIcons name="phone-outline" size={20} color={APP_COLORS.primary} />
						</TouchableOpacity>
					)}
				</AppSection>

				{/* Details */}
				<AppSection title="Details" titleSize="sm" marginTop={0}>
					<AppDetailRow
						icon="calendar-blank-outline"
						label="When"
						value={whenLabel}
						sub={whenSub}
						action={live ? { label: 'Add to calendar', onPress: comingSoon } : undefined}
					/>
					{!!appt.patient && (
						<AppDetailRow
							icon="account-outline"
							label="Patient"
							value={appt.patient.name}
							sub={patientSub || undefined}
						/>
					)}
					<AppDetailRow
						icon={isVideo ? 'video-outline' : 'stethoscope'}
						label="Visit type"
						value={isVideo ? 'Video consultation' : 'In-clinic consultation'}
						sub={visitSub}
					/>
					{!isVideo && !!hospital && (
						<AppDetailRow
							icon="map-marker-outline"
							label="Clinic"
							value={hospital.name}
							sub={hospital.address || undefined}
							action={{ label: 'Directions', icon: 'navigation-variant-outline', onPress: directions }}
						/>
					)}
					<AppDetailRow
						icon="clipboard-text-outline"
						label="Booking ID"
						value={bookingId}
						sub={bookedSub}
						action={
							!isVideo && live
								? { label: 'Show QR', icon: 'qrcode', onPress: () => setQrOpen(true) }
								: undefined
						}
					/>
				</AppSection>

				{/* Video: join card */}
				{isVideo && canAct && (
					<AppInfoBanner
						tone="sky"
						icon="video-outline"
						title="Join opens 10 minutes before"
						subtitle="You’ll find the Join button here and in your notifications."
						action={{ label: 'Test camera', onPress: comingSoon, filled: false }}
						style={styles.bannerInline}
					/>
				)}

				{/* Prep steps */}
				{canAct && (
					<AppSection
						title={isVideo ? 'Get ready for the call' : 'Before your visit'}
						titleSize="sm"
						marginTop={0}
					>
						<AppNumberedSteps steps={steps} />
					</AppSection>
				)}

				{/* Payment */}
				<AppSection title="Payment" titleSize="sm" marginTop={0}>
					<View style={styles.payRow}>
						<Text style={styles.payText}>Consultation fee</Text>
						<Text style={styles.payText}>{feeLabel}</Text>
					</View>
					<View style={styles.payRow}>
						<Text style={styles.payText}>Booking fee</Text>
						<Text style={[styles.payText, styles.payFree]}>Free</Text>
					</View>
					<AppDashedDivider color={APP_COLORS.border} style={styles.dash} />
					<View style={styles.payTotalRow}>
						<Text style={styles.payTotalLabel}>{totalLabel}</Text>
						<Text style={styles.payTotalValue}>{feeLabel}</Text>
					</View>
					{payment === 'pending' && <Text style={styles.payPending}>Not paid yet</Text>}
					{payment === 'paid' && (
						<View style={styles.payMetaRow}>
							<Text style={styles.payPaid} numberOfLines={1}>
								{['Paid', paidMethod ? `via ${paidMethod}` : ''].filter(Boolean).join(' ')}
								{paidTxn ? ` · ${paidTxn}` : ''}
							</Text>
							<TouchableOpacity
								onPress={comingSoon}
								style={styles.receiptLink}
								accessibilityRole="button"
							>
								<MaterialCommunityIcons name="chevron-down" size={16} color={APP_COLORS.primary} />
								<Text style={styles.receiptText}>Receipt</Text>
							</TouchableOpacity>
						</View>
					)}
				</AppSection>

				{/* Status */}
				<AppSection title="Status" titleSize="sm" marginTop={0}>
					<AppStatusTimeline steps={timeline} />
				</AppSection>

				{canAct && (
					<View style={styles.cancelLinkWrap}>
						<TouchableOpacity
							style={styles.cancelLink}
							onPress={() => setCancelOpen(true)}
							accessibilityRole="button"
						>
							<Text style={styles.cancelLinkText}>Cancel appointment</Text>
						</TouchableOpacity>
					</View>
				)}

				{/* Help */}
				<TouchableOpacity
					style={styles.helpCard}
					onPress={comingSoon}
					activeOpacity={0.85}
					accessibilityRole="button"
				>
					<AppIconTile icon="message-question-outline" tone="lilac" size={36} iconSize={18} />
					<View style={styles.flexText}>
						<Text style={styles.helpTitle}>Need help with this booking?</Text>
						<Text style={styles.helpSub}>Chat with Karolahealth support</Text>
					</View>
					<MaterialCommunityIcons name="chevron-right" size={18} color={APP_COLORS.border} />
				</TouchableOpacity>
			</ScrollView>

			{/* Footer -- bottom padding stays max(20, inset) as in the design. */}
			<AppFooterBar bottomPadding={Math.max(0, 20 - insets.bottom)}>
				{canAct ? (
					<>
						<AppButton
							variant="outline"
							size="lg"
							icon="calendar-blank-outline"
							style={styles.footerBtn}
							onPress={openReschedule}
						>
							Reschedule
						</AppButton>
						{payment === 'pending' ? (
							<AppButton size="lg" style={styles.footerBtn} onPress={comingSoon}>
								{fee ? `Pay ${feeLabel}` : 'Pay now'}
							</AppButton>
						) : isVideo ? (
							<AppButton size="lg" icon="video-outline" style={styles.footerBtn} onPress={comingSoon}>
								Join call
							</AppButton>
						) : hospital ? (
							<AppButton
								size="lg"
								icon="navigation-variant-outline"
								style={styles.footerBtn}
								onPress={directions}
							>
								Get directions
							</AppButton>
						) : (
							<AppButton size="lg" icon="qrcode" style={styles.footerBtn} onPress={() => setQrOpen(true)}>
								Show QR
							</AppButton>
						)}
					</>
				) : isCompleted ? (
					<>
						<AppButton variant="outline" size="lg" style={styles.footerBtn} onPress={goDoctor}>
							Book again
						</AppButton>
						<AppButton size="lg" style={styles.footerBtn} onPress={goSummary}>
							View visit summary
						</AppButton>
					</>
				) : (
					<>
						<AppButton variant="outline" size="lg" style={styles.footerBtn} onPress={goBookings}>
							Back to bookings
						</AppButton>
						<AppButton size="lg" style={styles.footerBtn} onPress={goDoctor}>
							Book again
						</AppButton>
					</>
				)}
			</AppFooterBar>

			<CancelAppointmentSheet
				visible={cancelOpen}
				appointmentId={appt.id}
				subtitle={
					payment === 'pending'
						? 'No payment was taken for this booking'
						: 'Any payment made will be refunded to the original method'
				}
				onClose={() => setCancelOpen(false)}
				onRescheduleInstead={rescheduleInstead}
				onCancelled={handleCancelled}
			/>

			<CheckInQrSheet visible={qrOpen} bookingId={bookingId} onClose={() => setQrOpen(false)} />

			<RescheduleSheet
				visible={reschedOpen}
				appointmentId={appt.id}
				doctorId={doctorId}
				hospitalId={hospital?.id}
				isVideo={isVideo}
				currentDate={appt.appointment_date}
				currentStart={appt.start_time}
				title={isVideo ? 'Reschedule video call' : 'Reschedule appointment'}
				subtitle={`${appt.doctor?.name ?? 'Doctor'} · ${isVideo ? 'Video consultation' : (hospital?.name ?? 'In-clinic')}`}
				note={
					isVideo
						? 'Free to reschedule. Same doctor and fee.'
						: 'Free to reschedule. Same doctor, clinic and fee.'
				}
				onClose={() => setReschedOpen(false)}
				onRescheduled={handleRescheduled}
			/>
		</View>
	)
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: APP_COLORS.pageBg },
	flexText: { flex: 1, minWidth: 0 },

	// Header (AppScreenHeader 'bar' defaults to 16/20 with a subtitle; the design uses 18/24 700)
	headerTitle: { fontSize: 18, lineHeight: 24, fontWeight: '700' },
	headerActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
	headerBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
	headerBtnRight: { marginRight: -10 },

	main: { gap: 8, paddingBottom: 16 },
	spacer8: { height: 8 },
	bannerTop: { marginTop: 16, marginHorizontal: 16 },
	bannerInline: { marginHorizontal: 16 },

	// Doctor
	doctorCard: { flexDirection: 'row', alignItems: 'center' },
	avatarInitial: { fontSize: 24, fontWeight: '800' },
	doctorName: { fontSize: 17, lineHeight: 22, fontWeight: '800', color: APP_COLORS.ink },
	doctorSpec: { fontSize: 13, lineHeight: 18, fontWeight: '700', color: TONES.lilac.ink },
	doctorQuals: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
	profileLink: { alignSelf: 'flex-start', marginTop: 2, flexDirection: 'row', alignItems: 'center', gap: 2 },
	profileLinkText: { fontSize: 13, fontWeight: '700', color: APP_COLORS.primary },
	callBtn: {
		width: 44,
		height: 44,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: APP_COLORS.border,
		backgroundColor: APP_COLORS.surface,
		alignItems: 'center',
		justifyContent: 'center',
	},

	// Payment
	payRow: { flexDirection: 'row', justifyContent: 'space-between' },
	payText: { fontSize: 14, lineHeight: 20, color: APP_COLORS.ink },
	payFree: { color: APP_COLORS.success, fontWeight: '700' },
	dash: { marginTop: 2 },
	payTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
	payTotalLabel: { fontSize: 15, fontWeight: '800', color: APP_COLORS.ink },
	payTotalValue: { fontSize: 20, lineHeight: 26, fontWeight: '800', color: APP_COLORS.ink },
	payPending: { fontSize: 12, lineHeight: 16, fontWeight: '700', color: APP_COLORS.warning },
	payMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
	payPaid: { flex: 1, fontSize: 12, lineHeight: 16, fontWeight: '700', color: APP_COLORS.success },
	receiptLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
	receiptText: { fontSize: 12, lineHeight: 16, fontWeight: '700', color: APP_COLORS.primary },

	// Cancel link
	cancelLinkWrap: { paddingTop: 4, paddingHorizontal: 16, alignItems: 'center' },
	cancelLink: { height: 44, paddingHorizontal: 12, justifyContent: 'center' },
	cancelLinkText: { fontSize: 14, fontWeight: '700', color: APP_COLORS.danger },

	// Help
	helpCard: {
		marginHorizontal: 16,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		paddingVertical: 12,
		paddingHorizontal: 14,
		borderRadius: 12,
		backgroundColor: APP_COLORS.surface,
		borderWidth: 1,
		borderColor: APP_COLORS.divider,
	},
	helpTitle: { fontSize: 14, lineHeight: 20, fontWeight: '700', color: APP_COLORS.ink },
	helpSub: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },

	// Footer
	footerBtn: { flex: 1 },

	// Loading / error
	skeleton: { gap: 8, paddingTop: 16 },
	skelTone: { backgroundColor: APP_COLORS.divider },
	skeletonCol: { flex: 1, gap: 6 },
	skeletonRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
	errorBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 8 },
	errorTile: { marginBottom: 4 },
	errorTitle: { fontSize: 17, lineHeight: 22, fontWeight: '800', color: APP_COLORS.ink },
	errorBody: { fontSize: 13, lineHeight: 18, color: APP_COLORS.inkMuted, textAlign: 'center' },
	retryBtn: { marginTop: 8 },
})
