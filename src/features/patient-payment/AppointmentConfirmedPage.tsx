// src/features/patient-payment/AppointmentConfirmedPage.tsx
//
// "6 · Appointment confirmed" -- reached after a successful booking + pre-intake
// step in PatientPayment.tsx. Success hero with confetti, an overlapping ticket
// card, a "before your visit" timeline (video variant: "Get ready for the call"),
// the payment line and footer actions (home / Appointment Details).

import React from 'react'
import {
	Linking,
	ScrollView,
	StatusBar,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
	useWindowDimensions,
} from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import type { NavigationProp, RouteProp } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ROUTES } from '../../navigation/routes'
import type { AppStackParamList } from '../../navigation/types'
import { openOnMap } from '../../utils/maps'
import { buildS3Url } from '../../utils/s3Utils'
import { showComingSoon } from '../../utils/toast'
import { APP_COLORS, TONES, formatInr } from '../../config/theme'
import {
	AppAvatar,
	AppBillStatusLine,
	AppBillSummary,
	AppButton,
	AppFooterBar,
	AppIcon,
	AppNumberedSteps,
	AppSection,
	AppTicketCard,
} from '../../components/common'
import { getPrepSteps, getPrepStepsTitle } from '../appointment/prepSteps'

const DESIGN_WIDTH = 390

// Confetti from the design (positions in 390-wide design px; x is scaled to screen width).
const CONFETTI: { left: number; top: number; size: number; radius: number; color: string; rotate: number }[] = [
	{ left: 40, top: 40, size: 10, radius: 9999, color: APP_COLORS.mintAccent, rotate: 0 },
	{ left: 320, top: 56, size: 12, radius: 3, color: TONES.peach.bg, rotate: 20 },
	{ left: 70, top: 150, size: 8, radius: 2, color: TONES.sand.bg, rotate: 35 },
	{ left: 300, top: 160, size: 10, radius: 9999, color: TONES.lilac.bg, rotate: 0 },
	{ left: 28, top: 100, size: 6, radius: 9999, color: TONES.sky.bg, rotate: 0 },
	{ left: 345, top: 112, size: 8, radius: 2, color: APP_COLORS.mintAccent, rotate: 45 },
	{ left: 250, top: 30, size: 7, radius: 9999, color: TONES.sand.bg, rotate: 0 },
	{ left: 120, top: 24, size: 6, radius: 2, color: TONES.lilac.bg, rotate: 30 },
]

function addToCalendar(params: { title: string; dateDisplay: string; location: string }) {
	// No native calendar module in this app yet -- opens Google Calendar's
	// "quick add" web flow with the appointment details prefilled.
	const text = encodeURIComponent(params.title)
	const details = encodeURIComponent(`Appointment: ${params.dateDisplay}`)
	const location = encodeURIComponent(params.location)
	Linking.openURL(
		`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&details=${details}&location=${location}`
	).catch(() => showComingSoon())
}

/** "Today, Thu 24 Sep" -> "today"; "Tomorrow, …" -> "tomorrow"; otherwise "on {date}". */
const relativeDayPhrase = (dateDisplay: string) => {
	const lower = dateDisplay.trim().toLowerCase()
	if (lower.startsWith('today')) return 'today'
	if (lower.startsWith('tomorrow')) return 'tomorrow'
	return dateDisplay ? `on ${dateDisplay}` : ''
}

export default function AppointmentConfirmedPage() {
	const navigation = useNavigation<NavigationProp<AppStackParamList>>()
	const route = useRoute<RouteProp<AppStackParamList, typeof ROUTES.STACK.APPOINTMENT_CONFIRMED>>()
	const params = route.params
	const insets = useSafeAreaInsets()
	const { width } = useWindowDimensions()
	const scaleX = width / DESIGN_WIDTH

	const isVideo = params.appointmentMode === 'video_call'
	const isPayAtClinic = params.paymentMethodLabel === 'Pay at clinic'
	const feeText = formatInr(params.fee) === '--' ? `₹${params.fee}` : formatInr(params.fee)
	const avatarUri = buildS3Url(params.doctorAvatar)
	const steps = getPrepSteps(isVideo, 'confirmed')
	const doctorInitial = params.doctorName?.replace(/^Dr\.?\s*/i, '').charAt(0) || 'D'

	const dayPhrase = relativeDayPhrase(params.dateDisplay)
	const sentence = [
		'See you',
		dayPhrase,
		params.timeDisplay ? `at ${params.timeDisplay}` : '',
		isVideo ? 'for your video call' : params.hospitalName ? `at the ${params.hospitalName}` : '',
	]
		.filter(Boolean)
		.join(' ')

	return (
		<View style={styles.container}>
			<StatusBar barStyle="light-content" backgroundColor={APP_COLORS.ink} />
			<ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
				{/* Success hero */}
				<View style={[styles.hero, { paddingTop: 48 + insets.top }]}>
					<View style={styles.heroCircleLeft} />
					<View style={styles.heroCircleRight} />
					{CONFETTI.map((c, i) => (
						<View
							key={i}
							style={{
								position: 'absolute',
								left: c.left * scaleX,
								top: c.top + insets.top,
								width: c.size,
								height: c.size,
								borderRadius: c.radius,
								backgroundColor: c.color,
								transform: [{ rotate: `${c.rotate}deg` }],
							}}
						/>
					))}

					<View style={styles.successRing}>
						<View style={styles.successCircle}>
							<AppIcon name="check" size={38} color="#FFFFFF" strokeWidth={2.8} />
						</View>
					</View>

					<View style={styles.successBadge}>
						<Text style={styles.successBadgeText}>
							{isPayAtClinic ? 'Pay at clinic' : 'Payment successful'} · {feeText}
						</Text>
					</View>

					<Text style={styles.heroTitle} accessibilityRole="header">
						You're all booked
					</Text>
					<Text style={styles.heroSubtitle}>{sentence}.</Text>
				</View>

				{/* Ticket card -- overlaps the hero */}
				<AppTicketCard
					elevated
					style={styles.card}
					header={{
						leading: (
							<AppAvatar
								uri={avatarUri}
								name={doctorInitial}
								size={52}
								backgroundColor={TONES.lilac.bg}
								initialsColor={TONES.lilac.ink}
								initialsStyle={styles.avatarInitial}
							/>
						),
						title: params.doctorName,
						subtitle: [params.doctorSpecialty, isVideo ? 'Video call' : 'In-clinic']
							.filter(Boolean)
							.join(' · '),
						trailing: (
							<View style={styles.confirmedPill}>
								<Text style={styles.confirmedPillText}>Confirmed</Text>
							</View>
						),
					}}
					fields={[
						{ label: 'When', value: params.timeDisplay, sub: params.dateDisplay, emphasis: true },
						{
							label: 'Booking ID',
							value: params.appointmentId,
							sub: `For ${params.patientName}`,
							ellipsize: 'middle',
						},
						{
							label: 'Where',
							value: isVideo ? 'Video consultation' : params.hospitalName,
							sub: isVideo ? 'In the Karolahealth app' : params.hospitalAddress || undefined,
							full: true,
						},
					]}
					actions={
						<>
							<TouchableOpacity
								style={[styles.cardActionBtn, { backgroundColor: APP_COLORS.mint }]}
								activeOpacity={0.8}
								accessibilityRole="button"
								onPress={() =>
									addToCalendar({
										title: `Appointment with ${params.doctorName}`,
										dateDisplay: `${params.dateDisplay}, ${params.timeDisplay}`,
										location: isVideo ? 'Video consultation' : params.hospitalName,
									})
								}
							>
								<AppIcon name="calendar" size={18} color={APP_COLORS.primary} />
								<Text style={styles.cardActionText}>Add to calendar</Text>
							</TouchableOpacity>
							{!isVideo && (
								<TouchableOpacity
									style={[styles.cardActionBtn, { backgroundColor: TONES.sky.bg }]}
									activeOpacity={0.8}
									accessibilityRole="button"
									onPress={() => openOnMap(params.hospitalAddress, params.hospitalName)}
								>
									<AppIcon name="directions" size={18} color={TONES.sky.ink} />
									<Text style={styles.cardActionText}>Directions</Text>
								</TouchableOpacity>
							)}
						</>
					}
				/>

				{/* Before your visit / Get ready for the call */}
				<AppSection title={getPrepStepsTitle(isVideo)} marginTop={0} gap={12}>
					<AppNumberedSteps
						steps={steps}
						numberSize={28}
						numberWeight="700"
						connector
						connectorSpacing={4}
						gap={16}
						markerGap={12}
						textGap={2}
						titleStyle={styles.stepTitle}
						bodyStyle={styles.stepBody}
					/>
				</AppSection>

				{/* Payment -- real fee + selected method; no transaction id exists yet */}
				<AppBillSummary
					variant="flat"
					rows={[]}
					style={styles.paymentRow}
					footer={
						<AppBillStatusLine
							size="md"
							text={
								isPayAtClinic
									? `${feeText} to pay at the clinic`
									: `${feeText} paid via ${params.paymentMethodLabel}`
							}
							onReceiptPress={() => showComingSoon()}
						/>
					}
				/>
			</ScrollView>

			<AppFooterBar>
				<AppButton
					variant="outline"
					size="lg"
					style={styles.flex}
					onPress={() => navigation.navigate(ROUTES.MAIN.TABS, { screen: ROUTES.MAIN.HOME })}
				>
					Back to home
				</AppButton>
				<AppButton
					size="lg"
					style={styles.flex}
					onPress={() =>
						navigation.navigate(ROUTES.STACK.APPOINTMENT_DETAILS, { appointmentId: params.appointmentId })
					}
				>
					View appointment
				</AppButton>
			</AppFooterBar>
		</View>
	)
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: APP_COLORS.pageBg },
	flex: { flex: 1 },
	scrollContent: { gap: 12, paddingBottom: 8 },

	// Hero
	hero: {
		backgroundColor: APP_COLORS.ink,
		paddingHorizontal: 24,
		paddingBottom: 64,
		alignItems: 'center',
		gap: 8,
		overflow: 'hidden',
	},
	heroCircleLeft: {
		position: 'absolute',
		left: -60,
		bottom: -80,
		width: 200,
		height: 200,
		borderRadius: 9999,
		backgroundColor: APP_COLORS.primary,
		opacity: 0.7,
	},
	heroCircleRight: {
		position: 'absolute',
		right: -50,
		top: -50,
		width: 160,
		height: 160,
		borderRadius: 9999,
		backgroundColor: APP_COLORS.primary,
	},
	successRing: {
		width: 104,
		height: 104,
		borderRadius: 9999,
		backgroundColor: '#1E7A4E33',
		alignItems: 'center',
		justifyContent: 'center',
	},
	successCircle: {
		width: 76,
		height: 76,
		borderRadius: 9999,
		backgroundColor: APP_COLORS.success,
		borderWidth: 4,
		borderColor: APP_COLORS.mintAccent,
		alignItems: 'center',
		justifyContent: 'center',
	},
	successBadge: {
		marginTop: 8,
		paddingHorizontal: 12,
		paddingVertical: 4,
		borderRadius: 9999,
		backgroundColor: APP_COLORS.mintAccent,
	},
	successBadgeText: {
		fontSize: 12,
		lineHeight: 16,
		fontWeight: '800',
		color: APP_COLORS.ink,
	},
	heroTitle: {
		fontSize: 26,
		lineHeight: 32,
		fontWeight: '800',
		color: '#FFFFFF',
		textAlign: 'center',
	},
	heroSubtitle: {
		maxWidth: 300,
		fontSize: 15,
		lineHeight: 22,
		color: APP_COLORS.mint,
		textAlign: 'center',
	},

	// Ticket card
	card: {
		marginTop: -48 - 12, // -48 overlap; cancels the scroll content's 12px gap
		marginHorizontal: 16,
	},
	avatarInitial: {
		fontSize: 18,
		fontWeight: '700',
	},
	confirmedPill: {
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 9999,
		backgroundColor: APP_COLORS.successBg,
	},
	confirmedPillText: {
		fontSize: 12,
		fontWeight: '800',
		color: APP_COLORS.success,
	},
	cardActionBtn: {
		flex: 1,
		height: 44,
		borderRadius: 12,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 6,
	},
	cardActionText: {
		fontSize: 14,
		fontWeight: '700',
		color: APP_COLORS.ink,
	},

	// Before your visit
	stepTitle: {
		fontSize: 15,
		lineHeight: 22,
		fontWeight: '600',
	},
	stepBody: {
		fontSize: 14,
		lineHeight: 20,
	},

	// Payment
	paymentRow: {
		backgroundColor: APP_COLORS.surface,
		paddingVertical: 12,
		paddingHorizontal: 16,
	},
})
