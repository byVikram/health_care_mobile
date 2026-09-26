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
import { APP_COLORS, CARD_SHADOW, TONES, formatInr } from '../../config/theme'
import { AppAvatar, AppButton, AppDashedDivider, AppFooterBar, AppIcon } from '../../components/common'

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

// Static checklist copy from the designs (6 · Confirmed and 7a · Video pending).
const CLINIC_STEPS = [
	{ title: 'Bring your reports', description: 'Recent lab results and a list of your medicines.' },
	{ title: 'Arrive 10 minutes early', description: 'Show your booking ID at the front desk to check in.' },
	{
		title: 'Prescription in the app',
		description: "We'll add the doctor's notes and prescription to your records after the visit.",
	},
]
const VIDEO_STEPS = [
	{ title: 'Find a quiet, well-lit spot', description: 'The doctor needs to see and hear you clearly.' },
	{ title: 'Keep reports and medicines handy', description: 'You can share photos of reports during the call.' },
	{ title: 'Check your internet', description: 'Wi-Fi or strong mobile data works best.' },
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
	const steps = isVideo ? VIDEO_STEPS : CLINIC_STEPS
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
				<View style={styles.card}>
					<View style={styles.cardInner}>
						<View style={styles.cardTopRow}>
							<AppAvatar
								uri={avatarUri}
								name={doctorInitial}
								size={52}
								backgroundColor={TONES.lilac.bg}
								initialsColor={TONES.lilac.ink}
								initialsStyle={styles.avatarInitial}
							/>
							<View style={styles.flex}>
								<Text style={styles.doctorName} numberOfLines={1}>
									{params.doctorName}
								</Text>
								<Text style={styles.doctorMeta} numberOfLines={1}>
									{[params.doctorSpecialty, isVideo ? 'Video call' : 'In-clinic']
										.filter(Boolean)
										.join(' · ')}
								</Text>
							</View>
							<View style={styles.confirmedPill}>
								<Text style={styles.confirmedPillText}>Confirmed</Text>
							</View>
						</View>

						<AppDashedDivider variant="ticket" color={APP_COLORS.divider} cutoutColor={APP_COLORS.pageBg} />

						<View style={styles.grid}>
							<View style={styles.gridCol}>
								<Text style={styles.gridLabel}>WHEN</Text>
								<Text style={styles.gridValueBig}>{params.timeDisplay}</Text>
								<Text style={styles.gridSub}>{params.dateDisplay}</Text>
							</View>
							<View style={styles.gridCol}>
								<Text style={styles.gridLabel}>BOOKING ID</Text>
								<Text style={styles.gridValue} numberOfLines={1} ellipsizeMode="middle">
									{params.appointmentId}
								</Text>
								<Text style={styles.gridSub} numberOfLines={1}>
									For {params.patientName}
								</Text>
							</View>
							<View style={styles.gridFull}>
								<Text style={styles.gridLabel}>WHERE</Text>
								<Text style={styles.gridValue}>
									{isVideo ? 'Video consultation' : params.hospitalName}
								</Text>
								{isVideo ? (
									<Text style={styles.gridSub}>In the Karolahealth app</Text>
								) : params.hospitalAddress ? (
									<Text style={styles.gridSub}>{params.hospitalAddress}</Text>
								) : null}
							</View>
						</View>

						<View style={styles.cardActionsRow}>
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
						</View>
					</View>
				</View>

				{/* Before your visit / Get ready for the call */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle} accessibilityRole="header">
						{isVideo ? 'Get ready for the call' : 'Before your visit'}
					</Text>
					{steps.map((step, idx) => {
						const isLast = idx === steps.length - 1
						return (
							<View key={step.title} style={styles.timelineRow}>
								<View style={styles.timelineMarkerCol}>
									<View style={styles.timelineNumberCircle}>
										<Text style={styles.timelineNumberText}>{idx + 1}</Text>
									</View>
									{!isLast && <View style={styles.timelineLine} />}
								</View>
								<View style={[styles.timelineBody, !isLast && styles.timelineBodyGap]}>
									<Text style={styles.timelineTitle}>{step.title}</Text>
									<Text style={styles.timelineDescription}>{step.description}</Text>
								</View>
							</View>
						)
					})}
				</View>

				{/* Payment -- real fee + selected method; no transaction id exists yet */}
				<View style={styles.paymentRow}>
					<Text style={styles.paymentAmount}>
						{isPayAtClinic
							? `${feeText} to pay at the clinic`
							: `${feeText} paid via ${params.paymentMethodLabel}`}
					</Text>
					<TouchableOpacity
						style={styles.receiptBtn}
						activeOpacity={0.7}
						accessibilityRole="button"
						onPress={() => showComingSoon()}
					>
						<AppIcon name="download" size={18} color={APP_COLORS.primary} />
						<Text style={styles.receiptText}>Receipt</Text>
					</TouchableOpacity>
				</View>
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
		borderRadius: 16,
		backgroundColor: APP_COLORS.surface,
		...CARD_SHADOW,
	},
	cardInner: {
		borderRadius: 16,
		overflow: 'hidden',
	},
	cardTopRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		padding: 16,
	},
	avatarInitial: {
		fontSize: 18,
		fontWeight: '700',
	},
	doctorName: {
		fontSize: 16,
		lineHeight: 22,
		fontWeight: '800',
		color: APP_COLORS.ink,
	},
	doctorMeta: {
		fontSize: 13,
		lineHeight: 18,
		fontWeight: '600',
		color: TONES.lilac.ink,
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
	grid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		rowGap: 12,
		columnGap: 12,
		padding: 16,
	},
	gridCol: {
		flexBasis: '40%',
		flexGrow: 1,
		minWidth: 0,
	},
	gridFull: {
		width: '100%',
	},
	gridLabel: {
		fontSize: 12,
		lineHeight: 16,
		fontWeight: '700',
		letterSpacing: 0.48,
		color: APP_COLORS.primary,
	},
	gridValueBig: {
		fontSize: 20,
		lineHeight: 26,
		fontWeight: '800',
		color: APP_COLORS.ink,
	},
	gridValue: {
		fontSize: 15,
		lineHeight: 22,
		fontWeight: '700',
		color: APP_COLORS.ink,
	},
	gridSub: {
		fontSize: 13,
		lineHeight: 18,
		color: APP_COLORS.inkMuted,
	},
	cardActionsRow: {
		flexDirection: 'row',
		gap: 8,
		paddingHorizontal: 16,
		paddingBottom: 16,
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
	section: {
		backgroundColor: APP_COLORS.surface,
		padding: 16,
	},
	sectionTitle: {
		fontSize: 18,
		lineHeight: 26,
		fontWeight: '700',
		color: APP_COLORS.ink,
		marginBottom: 12,
	},
	timelineRow: {
		flexDirection: 'row',
		gap: 12,
	},
	timelineMarkerCol: {
		alignItems: 'center',
	},
	timelineNumberCircle: {
		width: 28,
		height: 28,
		borderRadius: 9999,
		backgroundColor: APP_COLORS.mint,
		alignItems: 'center',
		justifyContent: 'center',
	},
	timelineNumberText: {
		fontSize: 13,
		fontWeight: '700',
		color: APP_COLORS.primary,
	},
	timelineLine: {
		flex: 1,
		width: 2,
		backgroundColor: APP_COLORS.divider,
		marginVertical: 4,
	},
	timelineBody: {
		flex: 1,
		gap: 2,
	},
	timelineBodyGap: {
		paddingBottom: 16,
	},
	timelineTitle: {
		fontSize: 15,
		lineHeight: 22,
		fontWeight: '600',
		color: APP_COLORS.ink,
	},
	timelineDescription: {
		fontSize: 14,
		lineHeight: 20,
		color: APP_COLORS.inkMuted,
	},

	// Payment
	paymentRow: {
		backgroundColor: APP_COLORS.surface,
		paddingVertical: 12,
		paddingHorizontal: 16,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 12,
	},
	paymentAmount: {
		flex: 1,
		fontSize: 14,
		lineHeight: 20,
		fontWeight: '600',
		color: APP_COLORS.ink,
	},
	receiptBtn: {
		minHeight: 44,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	receiptText: {
		fontSize: 14,
		fontWeight: '600',
		color: APP_COLORS.primary,
	},
})
