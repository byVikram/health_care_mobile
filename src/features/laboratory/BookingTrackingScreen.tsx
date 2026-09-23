import React from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation, useRoute } from '@react-navigation/native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { AppTypography } from '../../components/common/AppTypography'
import { AppStickyFooter } from '../../components/common/AppStickyFooter'
import { ROUTES } from '../../navigation/routes'
import { SEMANTIC_STATUS_COLORS } from '../../constants/statusColors'
import type { LabBookingDraft } from './types'

interface RouteParams {
	bookingReference: string
	draft: LabBookingDraft
	// Only present when `draft.requiresLabSelection` is true — see
	// `BookingSummaryScreen`'s `RouteParams` doc comment for why.
	labId?: string
	labName?: string
	labAddress?: string
	labCity?: string
	date?: string
	timeSlot?: string
	totalAmount: number
}

type StageState = 'done' | 'upcoming'

interface Stage {
	/** Matches the real status vocabulary this app already uses —
	 *  see `STATUS_MAPPING` in `constants/statusColors.ts` — so a future
	 *  backend integration (`getLabBookingDetail(publicId).status`) can drive
	 *  this same timeline without relabeling anything. */
	key: string
	label: string
	description: string
	icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']
}

// Only "Booking Confirmed" is ever marked done here — it's the one status
// this flow can honestly claim the moment the patient taps Confirm. Every
// later stage is real (it's the same vocabulary the backend already uses
// for lab bookings — see `STATUS_MAPPING`), but nothing beyond it has
// actually happened yet, so it's shown as upcoming rather than invented.
// TODO(backend): once `placeLabOrder` + `getLabBookingDetail(publicId)` are
// wired into this flow, drive `currentStageIndex` from the booking's real
// `status` field instead of hard-coding it to the first stage.
const STAGES: Stage[] = [
	{
		key: 'confirmed',
		label: 'Booking Confirmed',
		description: 'Your appointment has been booked.',
		icon: 'check-decagram',
	},
	{
		key: 'awaiting_sample',
		label: 'Lab Visit / Sample Collection',
		description: 'Our team collects your sample, or you visit the center, as scheduled.',
		icon: 'home-map-marker',
	},
	{
		key: 'sample_collected',
		label: 'Sample Collected',
		description: 'Your sample has been received by the lab.',
		icon: 'test-tube',
	},
	{
		key: 'processing',
		label: 'Processing',
		description: 'The lab is running your test(s).',
		icon: 'cog-outline',
	},
	{
		key: 'report_ready',
		label: 'Report Ready',
		description: "You'll be notified as soon as your report is available.",
		icon: 'file-check-outline',
	},
]

const CURRENT_STAGE_INDEX = 0

/**
 * Booking Tracking — the final step after "Confirm Booking", reached by
 * every flow (individual tests with Home Sample Collection or a Diagnostic
 * Center Visit, and Packages). Shows the booking reference plus a status
 * timeline built from the app's existing status vocabulary
 * (`constants/statusColors.ts`), with only "Booking Confirmed" marked as
 * achieved — everything past it is a real future stage, not a fabricated
 * one, and is rendered as upcoming. Structured so a real backend
 * integration only has to change which stage index is "current", not the
 * labels or layout.
 *
 * The "Appointment / Collection" card branches on whether a lab was
 * actually chosen for this booking (see
 * `LabBookingDraft.requiresLabSelection`): Home Sample Collection bookings
 * never have a lab/date/time to show, so that card shows a collection note
 * instead.
 */
export const BookingTrackingScreen: React.FC = () => {
	const insets = useSafeAreaInsets()
	const navigation = useNavigation<any>()
	const route = useRoute<any>()
	const params = (route.params || {}) as Partial<RouteParams>
	const { bookingReference, draft, labName, labAddress, labCity, date, timeSlot } = params

	// See `LabBookingDraft.requiresLabSelection` — false only for individual
	// tests booked with Home Sample Collection, which never has a lab/date/
	// time to show here.
	const hasLabAppointment = Boolean(draft?.requiresLabSelection && labName)

	const handleDone = () => {
		navigation.navigate(ROUTES.STACK.LABORATORY_LIST)
	}

	if (!bookingReference || !draft) {
		return (
			<View style={styles.container}>
				<View style={styles.emptyState}>
					<MaterialCommunityIcons name="alert-circle-outline" size={40} color="#EF4444" />
					<AppTypography variant="subtitle" style={styles.emptyTitle} align="center">
						No booking found
					</AppTypography>
					<AppTypography variant="caption" color="#64748B" align="center" style={styles.emptySubtitle}>
						Please book a test or package to see its status here.
					</AppTypography>
				</View>
			</View>
		)
	}

	return (
		<View style={styles.container}>
			<ScrollView
				contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}
				showsVerticalScrollIndicator={false}
			>
				{/* Confirmation header */}
				<View style={styles.confirmHeader}>
					<View style={styles.confirmIconCircle}>
						<MaterialCommunityIcons name="check-circle" size={40} color={SEMANTIC_STATUS_COLORS.success.color} />
					</View>
					<AppTypography variant="h3" style={styles.confirmTitle} align="center">
						Booking Confirmed
					</AppTypography>
					<AppTypography variant="caption" color="#64748B" align="center" style={styles.confirmSubtitle}>
						Booking Reference: {bookingReference}
					</AppTypography>
				</View>

				{/* Appointment / collection details */}
				<View style={styles.card}>
					<View style={styles.cardHeaderRow}>
						<MaterialCommunityIcons
							name={hasLabAppointment ? 'flask-plus' : 'home-map-marker'}
							size={18}
							color="#0C7C7C"
						/>
						<AppTypography variant="subtitle" style={styles.cardHeaderText}>
							{hasLabAppointment ? 'Appointment Details' : 'Sample Collection'}
						</AppTypography>
					</View>
					{hasLabAppointment ? (
						<>
							<Text style={styles.detailPrimary}>{labName}</Text>
							{(labAddress || labCity) ? (
								<Text style={styles.detailSecondary}>{[labAddress, labCity].filter(Boolean).join(', ')}</Text>
							) : null}
							<View style={styles.appointmentRow}>
								<View style={styles.appointmentChip}>
									<MaterialCommunityIcons name="calendar-outline" size={14} color="#0C7C7C" />
									<Text style={styles.appointmentChipText}>{date}</Text>
								</View>
								<View style={styles.appointmentChip}>
									<MaterialCommunityIcons name="clock-outline" size={14} color="#0C7C7C" />
									<Text style={styles.appointmentChipText}>{timeSlot}</Text>
								</View>
							</View>
						</>
					) : (
						<>
							<Text style={styles.detailPrimary}>Home Sample Collection</Text>
							<Text style={styles.detailSecondary}>
								Our team will contact you to schedule your home sample collection visit.
							</Text>
						</>
					)}
					<View style={styles.patientRow}>
						<MaterialCommunityIcons name="account-outline" size={14} color="#64748B" />
						<Text style={styles.patientRowText}>
							{draft.patient?.name} · {draft.collectionType === 'home_collection' ? 'Home Sample Collection' : 'Visit Diagnostic Center'}
						</Text>
					</View>
				</View>

				{/* Status timeline */}
				<View style={styles.card}>
					<View style={styles.cardHeaderRow}>
						<MaterialCommunityIcons name="timeline-check-outline" size={18} color="#0C7C7C" />
						<AppTypography variant="subtitle" style={styles.cardHeaderText}>
							Booking Status
						</AppTypography>
					</View>

					{STAGES.map((stage, index) => {
						const state: StageState = index <= CURRENT_STAGE_INDEX ? 'done' : 'upcoming'
						const isLast = index === STAGES.length - 1
						const isDone = state === 'done'
						return (
							<View key={stage.key} style={styles.timelineRow}>
								<View style={styles.timelineIconColumn}>
									<View style={[styles.timelineIconCircle, isDone && styles.timelineIconCircleDone]}>
										<MaterialCommunityIcons
											name={stage.icon}
											size={16}
											color={isDone ? '#fff' : '#94A3B8'}
										/>
									</View>
									{!isLast && <View style={[styles.timelineConnector, isDone && styles.timelineConnectorDone]} />}
								</View>
								<View style={[styles.timelineTextGroup, !isLast && styles.timelineTextGroupSpacing]}>
									<Text style={[styles.timelineLabel, isDone && styles.timelineLabelDone]}>{stage.label}</Text>
									<Text style={styles.timelineDescription}>{stage.description}</Text>
									{!isDone && index === CURRENT_STAGE_INDEX + 1 && (
										<Text style={styles.timelineUpNext}>Up next</Text>
									)}
								</View>
							</View>
						)
					})}
				</View>
			</ScrollView>

			<AppStickyFooter onPress={handleDone}>Done</AppStickyFooter>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#F8FAFC',
	},
	scrollContent: {
		paddingHorizontal: 16,
		paddingTop: 16,
	},
	confirmHeader: {
		alignItems: 'center',
		paddingVertical: 20,
	},
	confirmIconCircle: {
		width: 72,
		height: 72,
		borderRadius: 36,
		backgroundColor: SEMANTIC_STATUS_COLORS.success.bgColor,
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 14,
	},
	confirmTitle: {
		color: '#181C1D',
		marginBottom: 4,
	},
	confirmSubtitle: {
		fontWeight: '600',
	},
	card: {
		backgroundColor: '#FFFFFF',
		borderRadius: 14,
		borderWidth: 1,
		borderColor: '#E2E8F0',
		padding: 14,
		marginBottom: 14,
	},
	cardHeaderRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		marginBottom: 10,
	},
	cardHeaderText: {
		color: '#181C1D',
		fontWeight: '700',
	},
	detailPrimary: {
		fontSize: 13,
		fontWeight: '700',
		color: '#181C1D',
	},
	detailSecondary: {
		fontSize: 12,
		color: '#64748B',
		marginTop: 3,
		lineHeight: 17,
	},
	appointmentRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
		marginTop: 10,
	},
	appointmentChip: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 5,
		backgroundColor: '#E6F4F1',
		borderRadius: 20,
		paddingHorizontal: 10,
		paddingVertical: 6,
	},
	appointmentChipText: {
		fontSize: 12,
		fontWeight: '700',
		color: '#0C7C7C',
	},
	patientRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		marginTop: 10,
		paddingTop: 10,
		borderTopWidth: 1,
		borderTopColor: '#F1F5F9',
	},
	patientRowText: {
		fontSize: 12,
		color: '#64748B',
		flexShrink: 1,
	},

	// Timeline
	timelineRow: {
		flexDirection: 'row',
	},
	timelineIconColumn: {
		alignItems: 'center',
		width: 32,
	},
	timelineIconCircle: {
		width: 28,
		height: 28,
		borderRadius: 14,
		backgroundColor: '#F1F5F9',
		alignItems: 'center',
		justifyContent: 'center',
	},
	timelineIconCircleDone: {
		backgroundColor: SEMANTIC_STATUS_COLORS.success.color,
	},
	timelineConnector: {
		width: 2,
		flex: 1,
		minHeight: 24,
		backgroundColor: '#F1F5F9',
		marginTop: 2,
	},
	timelineConnectorDone: {
		backgroundColor: SEMANTIC_STATUS_COLORS.success.color,
	},
	timelineTextGroup: {
		flex: 1,
		minWidth: 0,
		paddingLeft: 10,
		paddingBottom: 4,
	},
	timelineTextGroupSpacing: {
		paddingBottom: 18,
	},
	timelineLabel: {
		fontSize: 13,
		fontWeight: '700',
		color: '#94A3B8',
	},
	timelineLabelDone: {
		color: '#181C1D',
	},
	timelineDescription: {
		fontSize: 12,
		color: '#64748B',
		marginTop: 2,
		lineHeight: 16,
	},
	timelineUpNext: {
		fontSize: 10.5,
		fontWeight: '700',
		color: '#D97706',
		marginTop: 4,
		textTransform: 'uppercase',
		letterSpacing: 0.4,
	},

	emptyState: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 32,
		gap: 8,
	},
	emptyTitle: {
		marginTop: 12,
		marginBottom: 2,
		fontWeight: '700',
		color: '#181C1D',
	},
	emptySubtitle: {
		lineHeight: 19,
	},
})

export default BookingTrackingScreen
