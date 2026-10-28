// src/features/ancillary/patient/AncillaryScheduledDetailsPage.tsx
//
// "Later · Booking details" for a scheduled ancillary order (provider-less, up to 7 visits): ink hero
// ("Your visits are booked" + the assignment note), a card per visit (date tile, time, who comes / when they are
// assigned, status pill) with Reschedule | View visit, "How each visit works", and who / where.
// Every visit is edited on its own: Reschedule moves just that visit (until its provider is assigned, 1 hr before),
// "Cancel visits" cancels one, several or all of the remaining ones (up to 2 hrs before each) -- both rules come
// from the server (`policy`, visit.can_reschedule / can_cancel). Visit status UNASSIGNED = nobody was available.
// Polls the order while focused. Footer: Cancel visits + Back to home; Back to home + Book again once the whole
// booking is cancelled. Also the target of the Bookings tab for scheduled orders (just the request id).

import React, { useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RouteProp } from '@react-navigation/native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import Toast from 'react-native-toast-message'
import { APP_COLORS } from '../../../config/theme'
import { ROUTES } from '../../../navigation/routes'
import type { AncillaryBookVisitParams, AncillaryCartItem, AppStackParamList } from '../../../navigation/types'
import { DOW_LABELS, MONTH_SHORT, isSameDay, parseDateOnly } from '../../../utils/date'
import {
	AppBottomSheet,
	AppButton,
	AppFooterBar,
	AppIconTile,
	AppInfoBanner,
	AppScreenHeader,
	AppSection,
	AppSkeleton,
	AppTag,
} from '../../../components/common'
import { cancelAncillaryOrder, isVisitUnassigned, type AncillaryOrder } from '../ancillaryProviderBookingService'
import { CancelVisitsSheet, type CancelVisitRow } from '../components/CancelVisitsSheet'
import { RescheduleVisitSheet } from '../components/RescheduleVisitSheet'
import { ScheduledVisitCard } from '../components/ScheduledVisitCard'
import { capitalize, inr, leadText, plural, rangeLabel, timeLabel } from './ancillaryBookingCopy'
import {
	assignLine,
	isCancelledStatus,
	isOpenVisit,
	lockedReason,
	nextVisitId,
	orderNoun,
	orderPolicy,
	specialtyOf,
	visitChip,
	visitTitle,
} from './scheduledVisitView'
import { useScheduledOrder } from './useScheduledOrder'
import { useVisitEdits } from './useVisitEdits'

type Nav = NativeStackNavigationProp<AppStackParamList>
type Route = RouteProp<AppStackParamList, typeof ROUTES.STACK.ANCILLARY_SCHEDULED_DETAILS>

const GREY_TEXT = '#9AAFB2'
const CANCEL_BTN_DISABLED_RULE = '#E3EAEB'

/** "Schedule a visit" params rebuilt from the order. Null when the order doesn't say which speciality it is. */
const bookingFromOrder = (order: AncillaryOrder | null, dates?: string[]): AncillaryBookVisitParams | null => {
	const specialty = specialtyOf(order)
	if (!order || !specialty) return null
	const perVisit = Number(order.totals?.per_visit) || 0
	const items: AncillaryCartItem[] = order.package
		? [{ id: order.package.id, kind: 'package', name: order.package.name, price: perVisit }]
		: (order.services ?? []).map((s) => ({
				id: s.id,
				kind: 'procedure' as const,
				name: s.name,
				price: order.services.length ? Math.round(perVisit / order.services.length) : 0,
			}))
	if (!items.length) return null
	return {
		serviceKey: specialty.key,
		serviceLabel: specialty.label,
		items,
		initialDates: dates?.length ? dates : undefined,
	}
}

export default function AncillaryScheduledDetailsPage() {
	const navigation = useNavigation<Nav>()
	const route = useRoute<Route>()
	const { requestId } = route.params

	const { order, loading, failures, pollStalled, refresh, retry } = useScheduledOrder(requestId)
	const { cancelling, moving, cancelVisits, moveVisit } = useVisitEdits(requestId, refresh)
	const [cancelOpen, setCancelOpen] = useState(false)
	const [movingId, setMovingId] = useState<string | null>(null)
	const [legacyOpen, setLegacyOpen] = useState(false)
	const [legacyBusy, setLegacyBusy] = useState(false)

	const goHome = () => navigation.navigate(ROUTES.MAIN.TABS, { screen: ROUTES.MAIN.HOME })

	const visits = order?.visits ?? []
	const n = visits.length
	const policy = orderPolicy(order)
	const noun = orderNoun(order)
	const open = visits.filter(isOpenVisit)
	const cancelledCount = visits.filter((v) => isCancelledStatus(v.status)).length
	const allCancelled = isCancelledStatus(order?.status) || (n > 0 && cancelledCount === n)
	// Visits that are off the booking (cancelled, or nobody was available); completed ones still count as kept.
	const kept = visits.filter((v) => !isCancelledStatus(v.status) && !isVisitUnassigned(v.status)).length
	// The older chosen-provider orders are cancelled as a whole, not visit by visit.
	const legacy = !!order && order.visit_edits === false
	const nextId = nextVisitId(visits)
	const unassigned = visits.filter((v) => isVisitUnassigned(v.status))
	const perVisit = order?.totals?.per_visit ?? 0
	const movingVisit = visits.find((v) => v.visit_public_id === movingId) ?? null

	const cancelWholeBooking = async () => {
		setLegacyBusy(true)
		try {
			await cancelAncillaryOrder(requestId)
			Toast.show({ type: 'success', text1: 'Booking cancelled' })
			setLegacyOpen(false)
		} catch {
			Toast.show({ type: 'error', text1: "Couldn't cancel the booking", text2: 'Please try again.' })
		} finally {
			setLegacyBusy(false)
			void refresh()
		}
	}

	/** A new Schedule a visit for the days that need a provider again (or every booked day). */
	const bookAgain = (dates: string[]) => {
		const booking = bookingFromOrder(order, dates)
		if (!booking) {
			// The order has no speciality in the DB, so there's no catalogue to go back to -- don't guess one.
			Toast.show({ type: 'error', text1: 'Unable to book again', text2: 'This booking has no service type.' })
			return
		}
		navigation.navigate(ROUTES.STACK.ANCILLARY_BOOK_VISIT, booking)
	}

	// ---- Copy ----
	let pill: string
	if (allCancelled) pill = 'Cancelled · nothing was charged'
	else if (kept < n) pill = `Confirmed · ${kept} of ${n} visits`
	else pill = perVisit > 0 ? `Confirmed · pay ${inr(perVisit)} after each visit` : 'Confirmed · pay after each visit'

	const cancelRows: CancelVisitRow[] = open.map((v, i) => ({
		id: v.visit_public_id,
		title: visitTitle(v, i),
		sub: `${timeLabel(v.start_time)}${v.visit_public_id === nextId ? ' · next visit' : ''}`,
		fee: inr(perVisit),
		canCancel: v.can_cancel !== false,
		lockedNote: lockedReason(v.status, !!v.provider, noun, policy.cancel_cutoff_minutes),
	}))

	const patient = order?.patient

	return (
		<View style={styles.container}>
			<AppScreenHeader
				variant="bar"
				title="Booking details"
				subtitle={`Booking ID ${requestId}`}
				onBack={() => navigation.goBack()}
			/>

			<ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
				{/* Hero */}
				<View style={styles.hero}>
					{loading && !order ? (
						<AppSkeleton width={220} height={24} borderRadius={12} color={APP_COLORS.primary} />
					) : (
						<AppTag
							label={pill}
							shape="pill"
							bg={allCancelled ? APP_COLORS.dangerBg : APP_COLORS.mintAccent}
							ink={allCancelled ? APP_COLORS.danger : APP_COLORS.ink}
							textStyle={styles.pillText}
						/>
					)}
					<Text style={styles.heroTitle} accessibilityRole="header">
						{allCancelled ? 'Booking cancelled' : 'Your visits are booked'}
					</Text>
					{allCancelled ? (
						<Text style={styles.heroBody}>Nothing was charged. You can book again whenever you need.</Text>
					) : (
						<View style={styles.heroNote}>
							<MaterialCommunityIcons name="clock-outline" size={20} color={APP_COLORS.mintAccent} />
							<Text style={styles.heroNoteText}>
								{`Each visit gets its own ${noun}, assigned `}
								<Text style={styles.bold}>{`${leadText(policy.assign_lead_minutes)} before`}</Text>
								{` it starts. We’ll notify you with their name, photo and start code for that visit.`}
							</Text>
						</View>
					)}
				</View>

				{!order && !loading && failures > 0 && (
					<View style={styles.bannerWrap}>
						<AppInfoBanner
							tone="danger"
							title="Couldn't load the booking"
							subtitle="Check your connection and try again."
							action={{ label: 'Retry', onPress: retry }}
						/>
					</View>
				)}
				{!!order && pollStalled && (
					<View style={styles.bannerWrap}>
						<AppInfoBanner
							tone="warning"
							title="Couldn't refresh the status"
							subtitle="We'll still notify you when it changes."
							action={{ label: 'Retry', onPress: retry }}
						/>
					</View>
				)}
				{!allCancelled && unassigned.length > 0 && (
					<View style={styles.bannerWrap}>
						<AppInfoBanner
							tone="warning"
							icon="alert-circle-outline"
							title={`No ${noun} available for ${plural(unassigned.length, 'visit')}`}
							subtitle="Book those days again. Nothing is charged."
							action={{ label: 'Book again', onPress: () => bookAgain(unassigned.map((v) => v.date)) }}
						/>
					</View>
				)}

				{/* Your visits */}
				<AppSection
					title="Your visits"
					titleSize="sm"
					marginTop={0}
					gap={12}
					right={
						n > 0 ? (
							<AppTag
								label={kept < n ? `${kept} of ${n} active` : `${n} visits`}
								tone="mint"
								textStyle={styles.countText}
							/>
						) : undefined
					}
				>
					{loading && !order ? (
						<View style={styles.skeletons}>
							<AppSkeleton height={86} borderRadius={12} color={APP_COLORS.neutralBg} />
							<AppSkeleton height={86} borderRadius={12} color={APP_COLORS.neutralBg} />
						</View>
					) : (
						visits.map((v, i) => {
							const d = parseDateOnly(v.date)
							const today = !!d && isSameDay(d, new Date())
							const cancelled = isCancelledStatus(v.status)
							const isNext = v.visit_public_id === nextId
							return (
								<ScheduledVisitCard
									key={v.visit_public_id || v.date}
									dow={today ? 'TODAY' : DOW_LABELS[d?.getDay() ?? 0].toUpperCase()}
									day={String(d?.getDate() ?? '')}
									mon={MONTH_SHORT[d?.getMonth() ?? 0]}
									overline={`VISIT ${v.index ?? i + 1} OF ${n}${today ? ' · TODAY' : ''}`}
									range={rangeLabel(v.start_time, v.end_time)}
									assign={assignLine(v, noun, policy.assign_lead_minutes)}
									chip={visitChip(v, isNext, noun)}
									next={isNext}
									cancelled={cancelled}
									showActions={isOpenVisit(v)}
									canReschedule={v.can_reschedule !== false}
									cancelNote={
										cancelled ? 'Cancelled · you won’t be charged for this visit.' : undefined
									}
									onReschedule={() => setMovingId(v.visit_public_id)}
									onView={() =>
										navigation.navigate(ROUTES.STACK.ANCILLARY_TRACK_APPOINTMENT, {
											bookingId: requestId,
											visitId: v.visit_public_id,
										})
									}
								/>
							)
						})
					)}
				</AppSection>

				{/* How each visit works */}
				{!allCancelled && (
					<AppSection marginTop={0} gap={12}>
						<View>
							<Text style={styles.sectionTitle} accessibilityRole="header">
								How each visit works
							</Text>
							<Text style={styles.sectionSub}>
								Every visit runs on its own — its own {noun} and codes
							</Text>
						</View>
						{[
							{
								icon: 'account-outline' as const,
								title: `${leadText(policy.assign_lead_minutes)} before · ${noun} assigned`,
								sub: 'You get their name, photo and the start code',
							},
							{
								icon: 'home-outline' as const,
								title: 'At your door · share the start code',
								sub: `Only once the ${noun} has arrived`,
							},
							{
								icon: 'check' as const,
								title: 'When done · share the completion code',
								sub: 'That visit is marked complete',
							},
						].map((step) => (
							<View key={step.title} style={styles.step}>
								<AppIconTile icon={step.icon} size={32} radius={8} iconSize={16} />
								<View style={styles.stepText}>
									<Text style={styles.stepTitle}>{step.title}</Text>
									<Text style={styles.stepSub}>{step.sub}</Text>
								</View>
							</View>
						))}
					</AppSection>
				)}

				{/* Visit for */}
				{!!order && (!!patient?.name || !!order.address?.street_address) && (
					<AppSection title="Visit for" titleSize="sm" marginTop={0}>
						{!!patient?.name && (
							<View style={styles.infoRow}>
								<MaterialCommunityIcons name="account-outline" size={18} color={APP_COLORS.primary} />
								<Text style={styles.infoText}>
									<Text style={styles.bold}>{patient.name}</Text>
									{patient.relation ? ` · ${capitalize(patient.relation.toLowerCase())}` : ''}
								</Text>
							</View>
						)}
						{!!order.address?.street_address && (
							<View style={styles.infoRow}>
								<MaterialCommunityIcons name="home-outline" size={18} color={APP_COLORS.primary} />
								<Text style={styles.infoText}>
									{[order.address.label, order.address.street_address].filter(Boolean).join(' · ')}
								</Text>
							</View>
						)}
					</AppSection>
				)}
			</ScrollView>

			<AppFooterBar>
				{allCancelled ? (
					<>
						<AppButton variant="outline" size="lg" style={styles.flex} onPress={goHome}>
							Back to home
						</AppButton>
						<AppButton
							size="lg"
							style={styles.flex}
							disabled={!order}
							softDisabled
							onPress={() => bookAgain(visits.map((v) => v.date))}
						>
							Book again
						</AppButton>
					</>
				) : (
					<>
						<AppButton
							variant="outline"
							size="lg"
							style={[
								styles.flex,
								styles.cancelBtn,
								!open.length && { borderColor: CANCEL_BTN_DISABLED_RULE },
							]}
							labelStyle={[styles.cancelBtnText, !open.length && { color: GREY_TEXT }]}
							disabled={!open.length}
							onPress={() => (legacy ? setLegacyOpen(true) : setCancelOpen(true))}
						>
							{open.length || loading
								? legacy
									? 'Cancel booking'
									: 'Cancel visits'
								: cancelledCount === n
									? 'All visits cancelled'
									: 'No visits to cancel'}
						</AppButton>
						<AppButton size="lg" style={styles.flex} onPress={goHome}>
							Back to home
						</AppButton>
					</>
				)}
			</AppFooterBar>

			<CancelVisitsSheet
				visible={cancelOpen}
				rows={cancelRows}
				initialId={nextId}
				busy={cancelling}
				onClose={() => setCancelOpen(false)}
				onConfirm={async (ids, reason) => {
					if (await cancelVisits(ids, reason)) setCancelOpen(false)
				}}
			/>

			<AppBottomSheet
				visible={legacyOpen}
				onClose={() => setLegacyOpen(false)}
				title="Cancel this booking?"
				subtitle={`All ${plural(n, 'visit')} will be cancelled.`}
				appearance="modern"
				showHeaderDivider={false}
				dismissible={!legacyBusy}
				footer={
					<View style={styles.sheetActions}>
						<AppButton
							variant="outline"
							size="lg"
							style={styles.flex}
							onPress={() => setLegacyOpen(false)}
							disabled={legacyBusy}
						>
							Keep it
						</AppButton>
						<AppButton
							variant="danger"
							size="lg"
							style={styles.flex}
							onPress={() => void cancelWholeBooking()}
							loading={legacyBusy}
							disabled={legacyBusy}
						>
							Cancel booking
						</AppButton>
					</View>
				}
			>
				<Text style={styles.sheetBody}>{"Nothing has been charged, so there's nothing to refund."}</Text>
			</AppBottomSheet>

			{!!movingVisit && (
				<RescheduleVisitSheet
					visible
					title={`Reschedule visit ${movingVisit.index ?? visits.indexOf(movingVisit) + 1}`}
					currentDate={movingVisit.date}
					currentTime={movingVisit.start_time}
					takenDates={visits
						.filter(
							(o) =>
								o.visit_public_id !== movingVisit.visit_public_id &&
								!isCancelledStatus(o.status) &&
								!isVisitUnassigned(o.status)
						)
						.map((o) => o.date)}
					leadMinutes={policy.assign_lead_minutes}
					noun={noun}
					busy={moving}
					onClose={() => setMovingId(null)}
					onConfirm={async (date, startTime) => {
						if (await moveVisit(movingVisit.visit_public_id, date, startTime)) setMovingId(null)
					}}
				/>
			)}
		</View>
	)
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: APP_COLORS.pageBg },
	flex: { flex: 1 },
	scroll: { gap: 8, paddingBottom: 16 },
	hero: {
		backgroundColor: APP_COLORS.ink,
		paddingHorizontal: 16,
		paddingVertical: 20,
		gap: 8,
	},
	pillText: { fontSize: 12, fontWeight: '800' },
	heroTitle: { fontSize: 22, lineHeight: 28, fontWeight: '800', color: APP_COLORS.surface },
	heroBody: { fontSize: 14, lineHeight: 20, color: APP_COLORS.mint },
	heroNote: {
		flexDirection: 'row',
		gap: 10,
		padding: 12,
		borderRadius: 12,
		backgroundColor: 'rgba(255,255,255,0.1)',
	},
	heroNoteText: { flex: 1, fontSize: 14, lineHeight: 20, color: APP_COLORS.surface },
	bold: { fontWeight: '800' },
	bannerWrap: { marginHorizontal: 16 },
	skeletons: { gap: 12 },
	countText: { fontSize: 12, lineHeight: 18, fontWeight: '800' },
	sectionTitle: { fontSize: 16, lineHeight: 22, fontWeight: '800', color: APP_COLORS.ink },
	sectionSub: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
	step: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
	stepText: { flex: 1, minWidth: 0 },
	stepTitle: { fontSize: 14, lineHeight: 20, fontWeight: '800', color: APP_COLORS.ink },
	stepSub: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
	infoRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
	infoText: { flex: 1, fontSize: 14, lineHeight: 20, color: APP_COLORS.ink },
	sheetActions: { flexDirection: 'row', gap: 8 },
	sheetBody: { fontSize: 14, lineHeight: 20, color: APP_COLORS.ink },
	cancelBtn: { borderWidth: 1.5, borderColor: APP_COLORS.divider, backgroundColor: APP_COLORS.surface },
	cancelBtnText: { color: APP_COLORS.danger, fontSize: 15, fontWeight: '700' },
})
