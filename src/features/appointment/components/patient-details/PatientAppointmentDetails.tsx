// src/features/appointment/components/patient-details/PatientAppointmentDetails.tsx
//
// Patient view of the Appointment details screen -- port of design
// 7_appt_details.html (in-clinic) and 7a_video_pending.html (video / payment
// pending). The doctor view and the AppointmentHistoryTab bottom sheet keep
// using the shared AppointmentDetailsContent.

import React, { useCallback, useEffect, useState } from 'react'
import { Alert, Linking, ScrollView, Share, StatusBar, StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import type { NavigationProp } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Toast from 'react-native-toast-message'
import {
	AppAvatar,
	AppBillStatusLine,
	AppBillSummary,
	AppButton,
	AppDetailRow,
	AppFooterBar,
	AppIconButton,
	AppIconTile,
	AppInfoBanner,
	AppNavRow,
	AppNumberedSteps,
	AppScreenHeader,
	AppSection,
	AppSkeleton,
	AppStatusTimeline,
	AppTextLink,
} from '../../../../components/common'
import { getAppointmentById } from '../../../../services/appointmentService'
import { ROUTES } from '../../../../navigation/routes'
import type { AppStackParamList } from '../../../../navigation/types'
import { addToCalendar } from '../../../../utils/calendar'
import { openDirections } from '../../../../utils/maps'
import { buildS3Url } from '../../../../utils/s3Utils'
import { capitaliseWords } from '../../../../utils/formatters'
import { showComingSoon } from '../../../../utils/toast'
import { APP_COLORS, TONES, formatInr } from '../../../../config/theme'
import CancelAppointmentSheet from './CancelAppointmentSheet'
import CheckInQrSheet from './CheckInQrSheet'
import NoShowReplySheet from '../NoShowReplySheet'
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
	isAwaitingDoctorConfirm,
	isVideoMode,
	parseDateOnly,
	slotLabel,
	startsInLabel,
	type PatientAppointment,
} from './helpers'
import { getPrepSteps, getPrepStepsTitle } from '../../prepSteps'

// Wrapped so press events are never forwarded as showComingSoon's `text2`.
const comingSoon = () => showComingSoon()

// ── Loading skeleton ─────────────────────────────────────────────────────────

function DetailsSkeleton() {
	return (
		<View style={styles.skeleton}>
			<AppSection marginTop={0} gap={12} style={styles.doctorCard}>
				<AppSkeleton width={60} height={60} borderRadius={16} color={APP_COLORS.divider} />
				<View style={styles.skeletonCol}>
					<AppSkeleton width="60%" height={18} borderRadius={8} color={APP_COLORS.divider} />
					<AppSkeleton width="45%" height={14} borderRadius={8} color={APP_COLORS.divider} />
					<AppSkeleton width="70%" height={12} borderRadius={8} color={APP_COLORS.divider} />
				</View>
			</AppSection>
			<AppSection marginTop={0}>
				<AppSkeleton width="30%" height={18} borderRadius={8} color={APP_COLORS.divider} />
				{Array.from({ length: 5 }).map((_, i) => (
					<View key={i} style={styles.skeletonRow}>
						<AppSkeleton width={36} height={36} borderRadius={10} color={APP_COLORS.divider} />
						<View style={styles.skeletonCol}>
							<AppSkeleton width="25%" height={10} borderRadius={8} color={APP_COLORS.divider} />
							<AppSkeleton width="60%" height={14} borderRadius={8} color={APP_COLORS.divider} />
						</View>
					</View>
				))}
			</AppSection>
			<AppSection marginTop={0}>
				<AppSkeleton width="30%" height={18} borderRadius={8} color={APP_COLORS.divider} />
				<AppSkeleton width="100%" height={14} borderRadius={8} color={APP_COLORS.divider} />
				<AppSkeleton width="100%" height={14} borderRadius={8} color={APP_COLORS.divider} />
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
	const [noShowOpen, setNoShowOpen] = useState(false)

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
	// A no-show is a finished appointment: nothing to cancel, reschedule or join; the patient can explain what happened.
	const isNoShow = variant === 'no_show'
	const live = !isCancelled && !isCompleted && !isNoShow
	const canAct = live && !isPast
	// The doctor asked for a new time and the patient has not picked one yet.
	const needsNewTime = live && variant === 'reschedule_required' && !localRescheduled
	const showRescheduled = live && (localRescheduled || variant === 'rescheduled')
	// The patient picked the slot: it now waits for the doctor to confirm (nothing for the patient to accept).
	const awaitingDoctor = showRescheduled && (localRescheduled || isAwaitingDoctorConfirm(appt))
	const hospital = appt?.hospital ?? null
	const phone = hospital?.contact_number || hospital?.phone || ''
	const fee = appt?.fees
	const feeLabel = formatInr(fee)

	const apptDay = parseDateOnly(appt?.appointment_date)
	const whenLabel = appt ? slotLabel(appt.appointment_date, appt.start_time) : ''
	const startsIn = startsInLabel(start)
	const whenSub = !apptDay
		? undefined
		: needsNewTime
			? `${fullDay(apptDay)} · needs a new time`
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
	const addToCalendarPress = () => {
		if (!start) return comingSoon()
		void addToCalendar({
			title: isVideo ? `Video consultation with ${doctorName}` : `Appointment with ${doctorName}`,
			start,
			end,
			location: isVideo
				? 'Video consultation (KarolaHealth app)'
				: [hospital?.name, hospital?.address].filter(Boolean).join(', '),
			notes: `Booked on KarolaHealth.${bookingId ? ` Booking ID: ${bookingId}.` : ''}`,
		})
	}
	const directions = () => openDirections(hospital?.latitude, hospital?.longitude, hospital?.address, hospital?.name)

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
				solid
				title={isVideo ? 'Video appointment' : 'Appointment'}
				subtitle={bookingId ? `Booking ${bookingId}` : undefined}
				titleStyle={styles.headerTitle}
				onBack={goBack}
				backAccessibilityLabel="Back to bookings"
				rightElement={
					<View style={styles.headerActions}>
						{/* No onPress until loaded: inert like before, without the disabled prop's 0.5 opacity */}
						<AppIconButton
							icon="share-variant-outline"
							variant="ghost"
							size={44}
							circle
							onPress={appt ? handleShare : undefined}
							accessibilityLabel="Share"
						/>
						<AppIconButton
							icon="help-circle-outline"
							variant="ghost"
							size={44}
							circle
							onPress={comingSoon}
							accessibilityLabel="Help"
							style={styles.headerBtnRight}
						/>
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

	const steps = getPrepSteps(isVideo, 'details')
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

				{needsNewTime && (
					<AppInfoBanner
						tone="warning"
						icon="calendar-clock"
						title="Your doctor asked you to choose a new time"
						subtitle={`${doctorName} can’t keep this slot. Pick a new time that suits you; your booking and fee stay the same.`}
						action={{ label: 'Choose a new time', onPress: openReschedule }}
						style={styles.bannerTop}
					/>
				)}

				{showRescheduled && awaitingDoctor && (
					<AppInfoBanner
						tone="success"
						icon="check"
						title="New time sent"
						subtitle={`Waiting for ${doctorName} to confirm it. We’ll let you know. Your booking and fee stay the same.`}
						style={styles.bannerTop}
					/>
				)}

				{showRescheduled && !awaitingDoctor && (
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

				{isNoShow && (
					<AppInfoBanner
						tone="warning"
						icon="calendar-remove-outline"
						title="You were marked as a no-show"
						subtitle={`${doctorName} marked this appointment as missed. Tell us what happened so we can review it.`}
						action={{ label: 'Tell us what happened', onPress: () => setNoShowOpen(true) }}
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
							<AppTextLink label="View profile" size="sm" onPress={goDoctor} style={styles.profileLink} />
						)}
					</View>
					{!!phone && (
						<AppIconButton
							icon="phone-outline"
							size={44}
							radius={12}
							iconSize={20}
							onPress={() => Linking.openURL(`tel:${phone}`)}
							accessibilityLabel="Call clinic"
						/>
					)}
				</AppSection>

				{/* Details */}
				<AppSection title="Details" titleSize="sm" marginTop={0}>
					<AppDetailRow
						icon="calendar-blank-outline"
						label="When"
						value={whenLabel}
						sub={whenSub}
						action={live ? { label: 'Add to calendar', onPress: addToCalendarPress } : undefined}
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
				{isVideo && canAct && !needsNewTime && (
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
				{canAct && !needsNewTime && (
					<AppSection title={getPrepStepsTitle(isVideo)} titleSize="sm" marginTop={0}>
						<AppNumberedSteps steps={steps} />
					</AppSection>
				)}

				{/* Payment */}
				<AppSection title="Payment" titleSize="sm" marginTop={0}>
					<AppBillSummary
						variant="flat"
						dashedDividers
						dividerSpacing={{ top: 2, bottom: 0 }}
						rows={[
							{ label: 'Consultation fee', value: feeLabel },
							{ label: 'Booking fee', value: 'Free', tone: 'free', valueStyle: styles.payFree },
							{
								label: totalLabel,
								value: feeLabel,
								tone: 'total',
								dividerBefore: true,
								labelStyle: styles.payTotalLabel,
								valueStyle: styles.payTotalValue,
							},
						]}
						footer={
							payment === 'pending' ? (
								<AppBillStatusLine tone="pending" text="Not paid yet" />
							) : payment === 'paid' ? (
								<AppBillStatusLine
									tone="paid"
									text={`${['Paid', paidMethod ? `via ${paidMethod}` : ''].filter(Boolean).join(' ')}${paidTxn ? ` · ${paidTxn}` : ''}`}
									onReceiptPress={comingSoon}
								/>
							) : undefined
						}
					/>
				</AppSection>

				{/* Status */}
				<AppSection title="Status" titleSize="sm" marginTop={0}>
					<AppStatusTimeline steps={timeline} />
				</AppSection>

				{canAct && (
					<View style={styles.cancelLinkWrap}>
						<AppTextLink
							label="Cancel appointment"
							tone="danger"
							trailingIcon="none"
							onPress={() => setCancelOpen(true)}
							style={styles.cancelLink}
						/>
					</View>
				)}

				{/* Help */}
				<AppNavRow
					title="Need help with this booking?"
					subtitle="Chat with Karolahealth support"
					onPress={comingSoon}
					leading={{ icon: 'message-question-outline', tone: 'lilac', size: 36, iconSize: 18 }}
					trailing={<MaterialCommunityIcons name="chevron-right" size={18} color={APP_COLORS.border} />}
					style={styles.helpCard}
					titleStyle={styles.helpTitle}
				/>
			</ScrollView>

			{/* Footer -- bottom padding stays max(20, inset) as in the design. */}
			<AppFooterBar bottomPadding={Math.max(0, 20 - insets.bottom)}>
				{needsNewTime ? (
					<AppButton
						size="lg"
						icon="calendar-blank-outline"
						style={styles.footerBtn}
						onPress={openReschedule}
					>
						Choose a new time
					</AppButton>
				) : canAct ? (
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
				) : isNoShow ? (
					<>
						<AppButton variant="outline" size="lg" style={styles.footerBtn} onPress={goDoctor}>
							Book again
						</AppButton>
						<AppButton
							size="lg"
							icon="message-text-outline"
							style={styles.footerBtn}
							onPress={() => setNoShowOpen(true)}
						>
							Tell us what happened
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

			<NoShowReplySheet
				visible={noShowOpen}
				appointmentId={appt.id}
				onClose={() => setNoShowOpen(false)}
				onReplied={() => void load(true)}
			/>

			<RescheduleSheet
				visible={reschedOpen}
				appointmentId={appt.id}
				doctorId={doctorId}
				hospitalId={hospital?.id}
				isVideo={isVideo}
				currentDate={appt.appointment_date}
				currentStart={appt.start_time}
				title={
					needsNewTime
						? 'Choose a new time'
						: isVideo
							? 'Reschedule video call'
							: 'Reschedule appointment'
				}
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
	profileLink: { alignSelf: 'flex-start', marginTop: 2 },

	// Payment (base bill styling comes from AppBillSummary's 'flat' variant; these match this screen's spec)
	payFree: { fontWeight: '700' },
	payTotalLabel: { fontSize: 15 },
	payTotalValue: { fontSize: 20 },

	// Cancel link
	cancelLinkWrap: { paddingTop: 4, paddingHorizontal: 16, alignItems: 'center' },
	// Keeps the design's 44px-high, 12px-padded tap row around the AppTextLink
	cancelLink: { height: 44, paddingHorizontal: 12 },

	// Help (AppNavRow restyled as the design's bordered card; title 14/20 700)
	helpCard: {
		marginHorizontal: 16,
		paddingVertical: 12,
		paddingHorizontal: 14,
		borderRadius: 12,
		backgroundColor: APP_COLORS.surface,
		borderWidth: 1,
		borderColor: APP_COLORS.divider,
	},
	helpTitle: { fontSize: 14, fontWeight: '700' },

	// Footer
	footerBtn: { flex: 1 },

	// Loading / error
	skeleton: { gap: 8, paddingTop: 16 },
	skeletonCol: { flex: 1, gap: 6 },
	skeletonRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
	errorBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 8 },
	errorTile: { marginBottom: 4 },
	errorTitle: { fontSize: 17, lineHeight: 22, fontWeight: '800', color: APP_COLORS.ink },
	errorBody: { fontSize: 13, lineHeight: 18, color: APP_COLORS.inkMuted, textAlign: 'center' },
	retryBtn: { marginTop: 8 },
})
