// src/features/patient-payment/AppointmentConfirmedPage.tsx
//
// Replaces the old "just a popup" success modal with a real, routed
// confirmation screen -- reached after a successful booking + pre-intake
// step in PatientPayment.tsx. Matches the "Appointment confirmed" HTML
// design: success hero, an overlapping appointment summary card, a static
// "before your visit" checklist, a real payment line, and footer actions to
// go home or view the full Appointment Details screen.

import React from 'react'
import { Image, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useNavigation, useRoute } from '@react-navigation/native'
import type { NavigationProp, RouteProp } from '@react-navigation/native'
import { AppTypography } from '../../components/common'
import { ROUTES } from '../../navigation/routes'
import type { AppStackParamList } from '../../navigation/types'
import { openOnMap } from '../../utils/maps'

const INK = '#12373E'
const INK_MUTED = '#5B6B6E'
const DIVIDER = '#D5E1E2'
const PAGE_BG = '#F5F8F8'
const PRIMARY = '#2B6F71'
const PRIMARY_TINT = '#E3EFEF'
const SKY_TINT = '#DDEBFA'
const SKY = '#2463A8'
const SUCCESS = '#1E7A4E'
const SUCCESS_RING = '#9FD3D1'
const SPEC_TONE = '#6A4BB5'

// Static, non-per-booking checklist copy -- matches the HTML's "Before your
// visit" section exactly. Not fetched from any API (no per-doctor variance
// in the reference design either).
const BEFORE_VISIT_STEPS = [
	{
		title: 'Bring your reports',
		description: 'Recent lab results and a list of your medicines.',
	},
	{
		title: 'Arrive 10 minutes early',
		description: 'Show your booking ID at the front desk to check in.',
	},
	{
		title: 'Prescription in the app',
		description: "We'll add the doctor's notes and prescription to your records after the visit.",
	},
]

function addToCalendar(params: { title: string; dateDisplay: string; location: string }) {
	// No native calendar module in this app yet -- opens Google Calendar's
	// "quick add" web flow with the real appointment details prefilled,
	// which works without adding any new native dependency.
	const text = encodeURIComponent(params.title)
	const details = encodeURIComponent(`Appointment: ${params.dateDisplay}`)
	const location = encodeURIComponent(params.location)
	Linking.openURL(
		`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&details=${details}&location=${location}`
	).catch(() => {})
}

export default function AppointmentConfirmedPage() {
	const navigation = useNavigation<NavigationProp<AppStackParamList>>()
	const route = useRoute<RouteProp<AppStackParamList, typeof ROUTES.STACK.APPOINTMENT_CONFIRMED>>()
	const params = route.params

	const modeLabel = params.appointmentMode === 'video_call' ? 'Video call' : 'In-clinic'

	return (
		<View style={styles.container}>
			<ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
				{/* Success hero */}
				<View style={styles.hero}>
					<View style={styles.heroDecorLeft} />
					<View style={styles.heroDecorRight} />

					<View style={styles.successRing}>
						<View style={styles.successCircle}>
							<MaterialCommunityIcons name="check" size={34} color="#fff" />
						</View>
					</View>

					<View style={styles.successBadge}>
						<Text style={styles.successBadgeText}>Payment successful · ₹{params.fee}</Text>
					</View>

					<Text style={styles.heroTitle}>You're all booked</Text>
					<Text style={styles.heroSubtitle}>
						See you {params.dateDisplay.toLowerCase().startsWith('today') ? '' : 'on '}
						{params.dateDisplay}, {params.timeDisplay}
						{params.hospitalName ? ` at ${params.hospitalName}` : ''}.
					</Text>
				</View>

				{/* Appointment summary card -- overlaps the hero */}
				<View style={styles.card}>
					<View style={styles.cardTopRow}>
						{params.doctorAvatar ? (
							<Image source={{ uri: params.doctorAvatar }} style={styles.avatar} resizeMode="cover" />
						) : (
							<View style={[styles.avatar, styles.avatarPlaceholder]}>
								<Text style={styles.avatarInitial}>{params.doctorName?.charAt(0) ?? 'D'}</Text>
							</View>
						)}
						<View style={{ flex: 1 }}>
							<Text style={styles.doctorName} numberOfLines={1}>
								{params.doctorName}
							</Text>
							<Text style={styles.doctorMeta} numberOfLines={1}>
								{[params.doctorSpecialty, modeLabel].filter(Boolean).join(' · ')}
							</Text>
						</View>
						<View style={styles.confirmedPill}>
							<Text style={styles.confirmedPillText}>Confirmed</Text>
						</View>
					</View>

					<View style={styles.dashedDivider} />

					<View style={styles.gridRow}>
						<View style={styles.gridCol}>
							<Text style={styles.gridLabel}>WHEN</Text>
							<Text style={styles.gridValueBig}>{params.timeDisplay}</Text>
							<Text style={styles.gridSub}>{params.dateDisplay}</Text>
						</View>
						<View style={styles.gridCol}>
							<Text style={styles.gridLabel}>BOOKING ID</Text>
							<Text style={styles.gridValue}>{params.appointmentId}</Text>
							<Text style={styles.gridSub}>For {params.patientName}</Text>
						</View>
						{!!params.hospitalName && (
							<View style={[styles.gridCol, { width: '100%' }]}>
								<Text style={styles.gridLabel}>WHERE</Text>
								<Text style={styles.gridValue}>{params.hospitalName}</Text>
								{!!params.hospitalAddress && (
									<Text style={styles.gridSub}>{params.hospitalAddress}</Text>
								)}
							</View>
						)}
					</View>

					<View style={styles.cardActionsRow}>
						<TouchableOpacity
							style={[styles.cardActionBtn, { backgroundColor: PRIMARY_TINT }]}
							onPress={() =>
								addToCalendar({
									title: `Appointment with ${params.doctorName}`,
									dateDisplay: `${params.dateDisplay}, ${params.timeDisplay}`,
									location: params.hospitalName || modeLabel,
								})
							}
						>
							<MaterialCommunityIcons name="calendar-plus" size={18} color={PRIMARY} />
							<Text style={styles.cardActionText}>Add to calendar</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={[styles.cardActionBtn, { backgroundColor: SKY_TINT }]}
							onPress={() => openOnMap(params.hospitalAddress, params.hospitalName)}
						>
							<MaterialCommunityIcons name="navigation-variant" size={18} color={SKY} />
							<Text style={styles.cardActionText}>Directions</Text>
						</TouchableOpacity>
					</View>
				</View>

				{/* Before your visit -- static checklist, numbered timeline */}
				<View style={styles.section}>
					<AppTypography variant="h4" style={styles.sectionTitle}>
						Before your visit
					</AppTypography>
					{BEFORE_VISIT_STEPS.map((step, idx) => (
						<View key={step.title} style={styles.timelineRow}>
							<View style={styles.timelineMarkerCol}>
								<View style={styles.timelineNumberCircle}>
									<Text style={styles.timelineNumberText}>{idx + 1}</Text>
								</View>
								{idx !== BEFORE_VISIT_STEPS.length - 1 && <View style={styles.timelineLine} />}
							</View>
							<View style={{ flex: 1, paddingBottom: 16 }}>
								<Text style={styles.timelineTitle}>{step.title}</Text>
								<Text style={styles.timelineDescription}>{step.description}</Text>
							</View>
						</View>
					))}
				</View>

				{/* Payment -- real fee + selected method, no fabricated transaction id */}
				<View style={[styles.section, styles.paymentRow]}>
					<View>
						<Text style={styles.paymentAmount}>
							₹{params.fee} paid via {params.paymentMethodLabel}
						</Text>
					</View>
				</View>
			</ScrollView>

			<View style={styles.footer}>
				<TouchableOpacity
					style={styles.footerOutlineBtn}
					onPress={() => navigation.navigate(ROUTES.MAIN.TABS, { screen: ROUTES.MAIN.HOME })}
				>
					<Text style={styles.footerOutlineBtnText}>Back to home</Text>
				</TouchableOpacity>
				<TouchableOpacity
					style={styles.footerFilledBtn}
					onPress={() =>
						navigation.navigate(ROUTES.STACK.APPOINTMENT_DETAILS, { appointmentId: params.appointmentId })
					}
				>
					<Text style={styles.footerFilledBtnText}>View appointment</Text>
				</TouchableOpacity>
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: PAGE_BG },
	scrollContent: { paddingBottom: 24 },

	hero: {
		backgroundColor: INK,
		paddingTop: 48,
		paddingHorizontal: 24,
		paddingBottom: 64,
		alignItems: 'center',
		gap: 8,
		overflow: 'hidden',
	},
	heroDecorLeft: {
		position: 'absolute',
		left: -60,
		bottom: -80,
		width: 200,
		height: 200,
		borderRadius: 9999,
		backgroundColor: PRIMARY,
		opacity: 0.7,
	},
	heroDecorRight: {
		position: 'absolute',
		right: -50,
		top: -50,
		width: 160,
		height: 160,
		borderRadius: 9999,
		backgroundColor: PRIMARY,
	},
	successRing: {
		width: 104,
		height: 104,
		borderRadius: 9999,
		backgroundColor: 'rgba(30,122,78,0.2)',
		alignItems: 'center',
		justifyContent: 'center',
	},
	successCircle: {
		width: 76,
		height: 76,
		borderRadius: 9999,
		backgroundColor: SUCCESS,
		borderWidth: 4,
		borderColor: SUCCESS_RING,
		alignItems: 'center',
		justifyContent: 'center',
	},
	successBadge: {
		marginTop: 8,
		paddingHorizontal: 12,
		paddingVertical: 4,
		borderRadius: 9999,
		backgroundColor: SUCCESS_RING,
	},
	successBadgeText: {
		fontSize: 12,
		lineHeight: 16,
		fontWeight: '800',
		color: INK,
	},
	heroTitle: {
		fontSize: 26,
		lineHeight: 32,
		fontWeight: '800',
		color: '#fff',
	},
	heroSubtitle: {
		fontSize: 15,
		lineHeight: 22,
		color: '#E3EFEF',
		textAlign: 'center',
		maxWidth: 300,
	},

	card: {
		marginTop: -48,
		marginHorizontal: 16,
		borderRadius: 16,
		backgroundColor: '#fff',
		shadowColor: INK,
		shadowOffset: { width: 0, height: 8 },
		shadowOpacity: 0.16,
		shadowRadius: 24,
		elevation: 6,
		overflow: 'hidden',
	},
	cardTopRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		padding: 16,
	},
	avatar: {
		width: 52,
		height: 52,
		borderRadius: 9999,
	},
	avatarPlaceholder: {
		backgroundColor: PRIMARY,
		alignItems: 'center',
		justifyContent: 'center',
	},
	avatarInitial: {
		fontSize: 18,
		fontWeight: '700',
		color: '#fff',
	},
	doctorName: {
		fontSize: 16,
		lineHeight: 22,
		fontWeight: '800',
		color: INK,
	},
	doctorMeta: {
		fontSize: 13,
		lineHeight: 18,
		fontWeight: '600',
		color: SPEC_TONE,
	},
	confirmedPill: {
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 9999,
		backgroundColor: '#E6F4EC',
	},
	confirmedPillText: {
		fontSize: 12,
		fontWeight: '800',
		color: SUCCESS,
	},
	dashedDivider: {
		marginHorizontal: 20,
		borderTopWidth: 2,
		borderStyle: 'dashed',
		borderTopColor: DIVIDER,
	},
	gridRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 12,
		padding: 16,
	},
	gridCol: {
		width: '46%',
		flexGrow: 1,
	},
	gridLabel: {
		fontSize: 12,
		lineHeight: 16,
		fontWeight: '700',
		letterSpacing: 0.4,
		color: PRIMARY,
	},
	gridValueBig: {
		fontSize: 20,
		lineHeight: 26,
		fontWeight: '800',
		color: INK,
	},
	gridValue: {
		fontSize: 15,
		lineHeight: 22,
		fontWeight: '700',
		color: INK,
	},
	gridSub: {
		fontSize: 13,
		lineHeight: 18,
		color: INK_MUTED,
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
		color: INK,
	},

	section: {
		backgroundColor: '#fff',
		padding: 16,
		marginTop: 8,
	},
	sectionTitle: {
		color: INK,
		fontWeight: '700',
		fontSize: 18,
		marginBottom: 8,
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
		backgroundColor: PRIMARY_TINT,
		alignItems: 'center',
		justifyContent: 'center',
	},
	timelineNumberText: {
		fontSize: 13,
		fontWeight: '700',
		color: PRIMARY,
	},
	timelineLine: {
		flex: 1,
		width: 2,
		backgroundColor: DIVIDER,
		marginVertical: 4,
	},
	timelineTitle: {
		fontSize: 15,
		lineHeight: 22,
		fontWeight: '600',
		color: INK,
	},
	timelineDescription: {
		fontSize: 14,
		lineHeight: 20,
		color: INK_MUTED,
		marginTop: 2,
	},

	paymentRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	paymentAmount: {
		fontSize: 14,
		lineHeight: 20,
		fontWeight: '600',
		color: INK,
	},

	footer: {
		backgroundColor: '#fff',
		borderTopWidth: 1,
		borderTopColor: DIVIDER,
		padding: 16,
		flexDirection: 'row',
		gap: 8,
	},
	footerOutlineBtn: {
		flex: 1,
		height: 52,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: PRIMARY,
		alignItems: 'center',
		justifyContent: 'center',
	},
	footerOutlineBtnText: {
		color: PRIMARY,
		fontSize: 15,
		fontWeight: '600',
	},
	footerFilledBtn: {
		flex: 1,
		height: 52,
		borderRadius: 12,
		backgroundColor: PRIMARY,
		alignItems: 'center',
		justifyContent: 'center',
	},
	footerFilledBtnText: {
		color: '#fff',
		fontSize: 15,
		fontWeight: '600',
	},
})
