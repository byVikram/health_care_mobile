// src/features/ancillary/patient/AncillaryScheduledDetailsPage.tsx
//
// "Later · Booking details" for a scheduled ancillary order (provider-less, up to 7 visits): ink hero
// ("Your visits are booked" + the 20-30 min assignment note), the visit list with a status tag and -- once
// assigned -- the nurse for each visit (the nurse can differ per visit), "What happens next", and who/where.
// Visit status UNASSIGNED = nobody was available -> "reschedule or cancel". Polls the order while focused.
// Footer: Reschedule (starts a new Schedule a visit with the same services) + Back to home; "Book again"
// when the whole order was cancelled. "Cancel booking" asks in a sheet, then cancelAncillaryOrder.
// Also the target of the Bookings tab for scheduled orders (no route params beyond the request id).

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RouteProp } from '@react-navigation/native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import Toast from 'react-native-toast-message'
import { APP_COLORS } from '../../../config/theme'
import { ROUTES } from '../../../navigation/routes'
import type { AncillaryBookVisitParams, AncillaryCartItem, AppStackParamList } from '../../../navigation/types'
import { stampLabel } from '../../../utils/date'
import {
	AppBottomSheet,
	AppButton,
	AppFooterBar,
	AppInfoBanner,
	AppScreenHeader,
	AppSection,
	AppSkeleton,
	AppStatusTimeline,
	AppTag,
	AppTextLink,
	AppVisitList,
} from '../../../components/common'
import type { AppTagProps, AppTimelineStep, AppVisitListItem } from '../../../components/common'
import {
	cancelAncillaryOrder,
	getAncillaryOrder,
	isVisitUnassigned,
	type AncillaryOrder,
	type AncillaryOrderStatus,
} from '../ancillaryProviderBookingService'
import { capitalize, dayLabel, inr, itemsSummary, plural, providerNoun, timeLabel } from './ancillaryBookingCopy'

type Nav = NativeStackNavigationProp<AppStackParamList>
type Route = RouteProp<AppStackParamList, typeof ROUTES.STACK.ANCILLARY_SCHEDULED_DETAILS>

const POLL_MS = 15000
const MAX_POLL_FAILURES = 3

const isCancelled = (s?: AncillaryOrderStatus | null) => !!s && /CANCEL|EXPIRED/.test(s)
const isDone = (s?: AncillaryOrderStatus | null) => !!s && /COMPLETED/.test(s)
const isLive = (s?: AncillaryOrderStatus | null) => !!s && /EN_ROUTE|ARRIVED|IN_PROGRESS|VERIFICATION/.test(s)

const slugOf = (label: string) =>
	label
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')

/** The order's speciality as catalogue key + label, when the status endpoint includes it. */
const specialtyOf = (order: AncillaryOrder | null): { key: string; label: string } | null => {
	const s = order?.specialty
	if (!s) return null
	if (typeof s === 'string') return s.trim() ? { key: slugOf(s), label: s.trim() } : null
	const label = s.label?.trim() || ''
	const key = s.key?.trim() || (label ? slugOf(label) : '')
	return key ? { key, label: label || key } : null
}

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

/** "6:30–6:40 PM": the 20-30 min window before a visit that starts at "HH:MM" when a provider gets assigned. */
const assignWindow = (start: string) => {
	const [h, m] = start.split(':').map(Number)
	if (Number.isNaN(h) || Number.isNaN(m)) return ''
	const fmt = (mins: number) =>
		timeLabel(`${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`)
	const from = fmt(h * 60 + m - 30)
	const to = fmt(h * 60 + m - 20)
	const meridiem = (t: string) => t.slice(-2)
	return meridiem(from) === meridiem(to) ? `${from.replace(/ [AP]M$/, '')}–${to}` : `${from}–${to}`
}

export default function AncillaryScheduledDetailsPage() {
	const navigation = useNavigation<Nav>()
	const route = useRoute<Route>()
	const { requestId } = route.params

	const [order, setOrder] = useState<AncillaryOrder | null>(null)
	const [loading, setLoading] = useState(true)
	const [failures, setFailures] = useState(0)
	const [cancelOpen, setCancelOpen] = useState(false)
	const [cancelling, setCancelling] = useState(false)

	const activeRef = useRef(true)
	const inFlightRef = useRef(false)
	const failuresRef = useRef(0)
	failuresRef.current = failures

	useEffect(() => {
		activeRef.current = true
		return () => {
			activeRef.current = false
		}
	}, [])

	const fetchOrder = useCallback(async () => {
		if (inFlightRef.current) return
		inFlightRef.current = true
		try {
			const o = await getAncillaryOrder(requestId)
			if (!activeRef.current) return
			setOrder(o)
			setFailures(0)
		} catch {
			if (activeRef.current) setFailures((f) => f + 1)
		} finally {
			inFlightRef.current = false
			if (activeRef.current) setLoading(false)
		}
	}, [requestId])

	// Poll while focused; stop after a few failures in a row (the Retry link restarts it).
	useFocusEffect(
		useCallback(() => {
			void fetchOrder()
			const id = setInterval(() => {
				if (failuresRef.current < MAX_POLL_FAILURES) void fetchOrder()
			}, POLL_MS)
			return () => clearInterval(id)
		}, [fetchOrder])
	)

	const retry = () => {
		setFailures(0)
		void fetchOrder()
	}

	const confirmCancel = async () => {
		setCancelling(true)
		try {
			await cancelAncillaryOrder(requestId)
			Toast.show({ type: 'success', text1: 'Booking cancelled' })
			setCancelOpen(false)
			await fetchOrder()
		} catch {
			Toast.show({ type: 'error', text1: "Couldn't cancel the booking", text2: 'Please try again.' })
		} finally {
			if (activeRef.current) setCancelling(false)
		}
	}

	const goHome = () => navigation.navigate(ROUTES.MAIN.TABS, { screen: ROUTES.MAIN.HOME })

	const visits = order?.visits ?? []
	const cancelled = isCancelled(order?.status)
	const unassigned = visits.filter((v) => isVisitUnassigned(v.status))
	const noun = providerNoun(specialtyOf(order)?.key ?? '')
	const nounCap = capitalize(noun)

	const reschedule = () => {
		// Only the days that still need a nurse when some were unassigned; otherwise all the booked days.
		const dates = (unassigned.length ? unassigned : visits).map((v) => v.date)
		const booking = bookingFromOrder(order, dates)
		if (!booking) {
			// The order has no speciality in the DB, so there's no catalogue to go back to -- don't guess one.
			Toast.show({ type: 'error', text1: 'Unable to reschedule', text2: 'This booking has no service type.' })
			return
		}
		navigation.navigate(ROUTES.STACK.ANCILLARY_BOOK_VISIT, booking)
	}

	// ---- Copy ----
	const n = visits.length
	const perVisit = order?.totals?.per_visit ?? 0
	const serviceNames = order?.package ? order.package.name : itemsSummary(order?.services ?? [])
	const nextIndex = visits.findIndex(
		(v) => !isCancelled(v.status) && !isDone(v.status) && !isVisitUnassigned(v.status)
	)

	let pill = ''
	let title = ''
	if (cancelled) {
		pill = 'Cancelled'
		title = 'Booking cancelled'
	} else {
		pill = perVisit > 0 ? `Booked · pay ${inr(perVisit)} after each visit` : 'Booked · pay after each visit'
		title = 'Your visits are booked'
	}

	const visitTag = (status: AncillaryOrderStatus, i: number): AppTagProps => {
		if (isVisitUnassigned(status)) return { label: 'No nurse yet', tone: 'cancelled' }
		if (isCancelled(status)) return { label: 'Cancelled', tone: 'cancelled' }
		if (isDone(status)) return { label: 'Completed', tone: 'completed' }
		if (isLive(status)) return { label: 'In progress', tone: 'scheduled' }
		if (i === nextIndex) return { label: 'Next', tone: 'pending' }
		return { label: 'Upcoming', tone: 'neutral' }
	}

	const visitItems: AppVisitListItem[] = visits.map((v, i) => {
		const who = v.provider?.name
		const sub = isVisitUnassigned(v.status)
			? `${timeLabel(v.start_time)} · no ${noun} available`
			: who
				? `${timeLabel(v.start_time)} · ${who}`
				: `${timeLabel(v.start_time)} · ${noun} assigned by ${assignWindow(v.start_time)}`
		return {
			key: v.visit_public_id || v.date,
			index: v.index ?? i + 1,
			title: `Visit ${v.index ?? i + 1} · ${dayLabel(v.date)}`,
			sub,
			status: visitTag(v.status, i),
			current: i === nextIndex,
		}
	})

	const anyAssigned = visits.some((v) => !!v.provider)
	const anyLive = visits.some((v) => isLive(v.status))
	const steps: AppTimelineStep[] = [
		{
			key: 'booked',
			title: 'Booked',
			sub: order?.created_at ? stampLabel(order.created_at) : undefined,
			state: 'done',
		},
		{
			key: 'assigned',
			title: `${nounCap} assigned`,
			sub: `${nounCap} assigned 20–30 min before each visit · you’ll get a notification`,
			state: anyAssigned || anyLive ? 'done' : 'current',
		},
		{
			key: 'arrives',
			title: `${nounCap} arrives`,
			sub: 'Share the start code to begin',
			state: anyLive ? 'current' : 'upcoming',
		},
		{ key: 'complete', title: 'Visit complete', sub: 'Share the completion code', state: 'upcoming' },
	]

	const patient = order?.patient
	const pollStalled = failures >= MAX_POLL_FAILURES

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
							bg={cancelled ? APP_COLORS.dangerBg : APP_COLORS.mintAccent}
							ink={cancelled ? APP_COLORS.danger : APP_COLORS.ink}
							textStyle={styles.pillText}
						/>
					)}
					<Text style={styles.heroTitle} accessibilityRole="header">
						{title}
					</Text>
					{cancelled ? (
						<Text style={styles.heroBody}>Nothing was charged. You can book again whenever you need.</Text>
					) : (
						<View style={styles.heroNote}>
							<MaterialCommunityIcons name="clock-outline" size={20} color={APP_COLORS.mintAccent} />
							<Text style={styles.heroNoteText}>
								{`A ${noun} will be assigned `}
								<Text style={styles.bold}>20–30 min before each visit</Text>
								{'. We’ll notify you with their name, photo and start code.'}
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
				{!cancelled && unassigned.length > 0 && (
					<View style={styles.bannerWrap}>
						<AppInfoBanner
							tone="warning"
							icon="alert-circle-outline"
							title={`No ${noun} available for ${plural(unassigned.length, 'visit')}`}
							subtitle="Reschedule those days or cancel the booking. Nothing is charged."
							action={{ label: 'Reschedule', onPress: reschedule }}
						/>
					</View>
				)}

				{/* Visits */}
				<AppSection marginTop={0}>
					{loading && !order ? (
						<View style={styles.skeletons}>
							<AppSkeleton height={36} borderRadius={10} color={APP_COLORS.neutralBg} />
							<AppSkeleton height={36} borderRadius={10} color={APP_COLORS.neutralBg} />
						</View>
					) : (
						<AppVisitList
							variant="status"
							title={`${plural(n, 'visit')}${serviceNames ? ` · ${serviceNames}` : ''}`}
							visits={visitItems}
						/>
					)}
					{!cancelled && (anyAssigned || anyLive) && (
						<AppTextLink
							label="View visit & start code"
							size="sm"
							onPress={() =>
								navigation.navigate(ROUTES.STACK.ANCILLARY_TRACK_APPOINTMENT, { bookingId: requestId })
							}
						/>
					)}
				</AppSection>

				{/* What happens next */}
				{!cancelled && (
					<AppSection title="What happens next" titleSize="sm" marginTop={0} gap={12}>
						<AppStatusTimeline steps={steps} />
						{!!order && (
							<AppTextLink
								label="Cancel booking"
								tone="danger"
								size="sm"
								trailingIcon="none"
								onPress={() => setCancelOpen(true)}
							/>
						)}
					</AppSection>
				)}

				{/* Visit for */}
				{!!order && (!!patient?.name || !!order.address?.street_address) && (
					<AppSection title="Visit for" titleSize="sm" marginTop={0}>
						{!!patient?.name && (
							<View style={styles.infoRow}>
								<MaterialCommunityIcons name="account-outline" size={20} color={APP_COLORS.primary} />
								<Text style={styles.infoText}>
									<Text style={styles.bold}>{patient.name}</Text>
									{patient.relation ? ` · ${patient.relation}` : ''}
								</Text>
							</View>
						)}
						{!!order.address?.street_address && (
							<View style={styles.infoRow}>
								<MaterialCommunityIcons
									name="map-marker-outline"
									size={20}
									color={APP_COLORS.primary}
								/>
								<Text style={styles.infoText}>
									{[order.address.label, order.address.street_address].filter(Boolean).join(' · ')}
								</Text>
							</View>
						)}
					</AppSection>
				)}
			</ScrollView>

			<AppFooterBar>
				{cancelled ? (
					<>
						<AppButton variant="outline" size="lg" style={styles.flex} onPress={goHome}>
							Back to home
						</AppButton>
						<AppButton size="lg" style={styles.flex} disabled={!order} softDisabled onPress={reschedule}>
							Book again
						</AppButton>
					</>
				) : (
					<>
						<AppButton
							variant="outline"
							size="lg"
							style={styles.flex}
							disabled={!order}
							onPress={reschedule}
						>
							Reschedule
						</AppButton>
						<AppButton size="lg" style={styles.flex} onPress={goHome}>
							Back to home
						</AppButton>
					</>
				)}
			</AppFooterBar>

			<AppBottomSheet
				visible={cancelOpen}
				onClose={() => setCancelOpen(false)}
				title="Cancel this booking?"
				subtitle={`All ${plural(n, 'visit')} will be cancelled.`}
				appearance="modern"
				showHeaderDivider={false}
				dismissible={!cancelling}
				footer={
					<View style={styles.sheetActions}>
						<AppButton
							variant="outline"
							size="lg"
							style={styles.flex}
							onPress={() => setCancelOpen(false)}
							disabled={cancelling}
						>
							Keep it
						</AppButton>
						<AppButton
							variant="danger"
							size="lg"
							style={styles.flex}
							onPress={() => void confirmCancel()}
							loading={cancelling}
							disabled={cancelling}
						>
							Cancel booking
						</AppButton>
					</View>
				}
			>
				<Text style={styles.sheetBody}>{"Nothing has been charged, so there's nothing to refund."}</Text>
			</AppBottomSheet>
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
	skeletons: { gap: 8, paddingVertical: 4 },
	infoRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
	infoText: { flex: 1, fontSize: 14, lineHeight: 20, color: APP_COLORS.ink },
	sheetActions: { flexDirection: 'row', gap: 8 },
	sheetBody: { fontSize: 14, lineHeight: 20, color: APP_COLORS.ink },
})
