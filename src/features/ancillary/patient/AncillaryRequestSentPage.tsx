// src/features/ancillary/patient/AncillaryRequestSentPage.tsx
//
// "2e · Request sent": ink hero (provider avatar ring, status pill, "Request sent to {first}"), a floating
// visit card (AppVisitList 'status'), "What happens next" steps and the footer actions.
// Live status: polls getAncillaryOrder every 10 s while the order is waiting (and on focus), with a
// countdown to `expires_at`.
//   SCHEDULED_CONFIRMED             -> success copy + "View booking" (TrackAppointment).
//   EXPIRED / CANCELLED_BY_PROVIDER -> "Choose another {provider}" -> Book visit with the same items + days,
//                                      the previous provider excluded.
//   cancelled by the patient        -> "Book again".
// "Cancel request" asks in a sheet, then cancelAncillaryOrder.
// `booking` is optional: without it (opened from the Bookings tab) everything comes from the order, and the
// rebook params are rebuilt from its services / package + speciality (no speciality -> the service catalogue).

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RouteProp } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Toast from 'react-native-toast-message'
import { APP_COLORS, CARD_SHADOW, toneForString } from '../../../config/theme'
import { ROUTES } from '../../../navigation/routes'
import type { AncillaryBookVisitParams, AncillaryCartItem, AppStackParamList } from '../../../navigation/types'
import { buildS3Url } from '../../../utils/s3Utils'
import {
	AppAvatar,
	AppBottomSheet,
	AppButton,
	AppFooterBar,
	AppIcon,
	AppInfoBanner,
	AppNumberedSteps,
	AppSection,
	AppSkeleton,
	AppTag,
	AppTextLink,
	AppVisitList,
} from '../../../components/common'
import type { AppTagProps, AppVisitListItem } from '../../../components/common'
import {
	ANCILLARY_BOOKING_CONFIRM_MINUTES,
	cancelAncillaryOrder,
	getAncillaryOrder,
	isOrderUnconfirmedEnd,
	type AncillaryOrder,
	type AncillaryOrderStatus,
} from '../ancillaryProviderBookingService'
import { dayLabel, firstName, inr, itemsSummary, plural, providerNoun, timeLabel } from './ancillaryBookingCopy'

type Nav = NativeStackNavigationProp<AppStackParamList>
type Route = RouteProp<AppStackParamList, typeof ROUTES.STACK.ANCILLARY_REQUEST_SENT>

const POLL_MS = 10000
const MAX_POLL_FAILURES = 3

type Phase = 'pending' | 'confirmed' | 'unconfirmed' | 'cancelled'

const phaseOf = (status?: AncillaryOrderStatus | null): Phase => {
	if (!status || status === 'SCHEDULED_PENDING') return 'pending'
	if (status === 'SCHEDULED_CONFIRMED') return 'confirmed'
	if (isOrderUnconfirmedEnd(status)) return 'unconfirmed'
	if (/CANCEL/.test(status)) return 'cancelled'
	// Any later lifecycle state (visit in progress, completed…) counts as confirmed here.
	return 'confirmed'
}

const visitTag = (status: AncillaryOrderStatus): AppTagProps => {
	if (status === 'SCHEDULED_PENDING') return { label: 'Waiting', tone: 'pending' }
	if (status === 'SCHEDULED_CONFIRMED') return { label: 'Confirmed', tone: 'confirmed' }
	if (status === 'EXPIRED') return { label: 'Expired', tone: 'done' }
	if (/CANCEL/.test(status)) return { label: 'Cancelled', tone: 'cancelled' }
	return { label: status.replace(/_/g, ' ').toLowerCase(), tone: 'scheduled' }
}

const slugOf = (label: string) =>
	label
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')

/** The order's home-care speciality as catalogue key + label, when the status endpoint includes it. */
const specialtyOf = (order: AncillaryOrder | null): { key: string; label: string } | null => {
	const s = order?.specialty
	if (!s) return null
	if (typeof s === 'string') return s.trim() ? { key: slugOf(s), label: s.trim() } : null
	const label = s.label?.trim() || ''
	const key = s.key?.trim() || (label ? slugOf(label) : '')
	return key ? { key, label: label || key } : null
}

/**
 * "Choose another provider" / "Book again" params rebuilt from the order, for when the page is opened
 * without `booking` (e.g. from the Bookings tab). Null when the order doesn't say which speciality it is.
 */
const bookingFromOrder = (order: AncillaryOrder | null): AncillaryBookVisitParams | null => {
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
	const days = (order.visits ?? []).map((v) => v.date)
	return {
		serviceKey: specialty.key,
		serviceLabel: specialty.label,
		items,
		initialDates: days.length ? days : undefined,
	}
}

const countdownLabel = (ms: number) => {
	const total = Math.max(0, Math.floor(ms / 1000))
	const m = Math.floor(total / 60)
	const s = total % 60
	return `${m}:${String(s).padStart(2, '0')}`
}

export default function AncillaryRequestSentPage() {
	const navigation = useNavigation<Nav>()
	const route = useRoute<Route>()
	const { requestId, booking: bookingParam } = route.params
	const insets = useSafeAreaInsets()

	const [order, setOrder] = useState<AncillaryOrder | null>(null)
	// Passed in by the booking flow; otherwise (Bookings tab) rebuilt from the order once it loads.
	const booking = bookingParam ?? bookingFromOrder(order)
	const noun = providerNoun(booking?.serviceKey ?? '')
	const [loading, setLoading] = useState(true)
	const [failures, setFailures] = useState(0)
	const [now, setNow] = useState(() => Date.now())
	const [cancelOpen, setCancelOpen] = useState(false)
	const [cancelling, setCancelling] = useState(false)

	const activeRef = useRef(true)
	const inFlightRef = useRef(false)
	const phaseRef = useRef<Phase>('pending')
	const failuresRef = useRef(0)

	useEffect(() => {
		activeRef.current = true
		return () => {
			activeRef.current = false
		}
	}, [])

	const phase = phaseOf(order?.status)
	phaseRef.current = phase
	failuresRef.current = failures

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

	// Poll while focused and still waiting; stop after a few failures in a row (the Retry link restarts it).
	useFocusEffect(
		useCallback(() => {
			void fetchOrder()
			const id = setInterval(() => {
				if (phaseRef.current === 'pending' && failuresRef.current < MAX_POLL_FAILURES) void fetchOrder()
			}, POLL_MS)
			return () => clearInterval(id)
		}, [fetchOrder])
	)

	// Countdown to expires_at.
	const expiresAt = order?.expires_at ? new Date(order.expires_at).getTime() : null
	useEffect(() => {
		if (phase !== 'pending' || !expiresAt || Number.isNaN(expiresAt)) return
		const id = setInterval(() => setNow(Date.now()), 1000)
		return () => clearInterval(id)
	}, [phase, expiresAt])

	// Once the deadline passes, check straight away (the server expires the order lazily on read).
	const expiredLocally = phase === 'pending' && !!expiresAt && now >= expiresAt
	useEffect(() => {
		if (expiredLocally) void fetchOrder()
	}, [expiredLocally, fetchOrder])

	const retry = () => {
		setFailures(0)
		void fetchOrder()
	}

	const confirmCancel = async () => {
		setCancelling(true)
		try {
			await cancelAncillaryOrder(requestId)
			Toast.show({ type: 'success', text1: 'Request cancelled' })
			setCancelOpen(false)
			await fetchOrder()
		} catch {
			Toast.show({ type: 'error', text1: "Couldn't cancel the request", text2: 'Please try again.' })
		} finally {
			if (activeRef.current) setCancelling(false)
		}
	}

	const goHome = () => navigation.navigate(ROUTES.MAIN.TABS, { screen: ROUTES.MAIN.HOME })

	const rebook = (excludeProvider: boolean) => {
		if (!booking) {
			// The order has no speciality in the DB, so there's no catalogue to go back to -- don't guess one.
			Toast.show({ type: 'error', text1: 'Unable to rebook', text2: 'This booking has no service type.' })
			return
		}
		const days = (order?.visits ?? []).map((v) => v.date)
		navigation.replace(ROUTES.STACK.ANCILLARY_BOOK_VISIT, {
			...booking,
			initialDates: days.length ? days : booking.initialDates,
			excludeProviderId: excludeProvider ? order?.provider?.provider_public_id : undefined,
		})
	}

	// ---- Copy ----
	const provName = order?.provider?.name ?? ''
	const provFirst = firstName(provName) || `your ${noun}`
	const Who = firstName(provName) || `Your ${noun}`
	const visits = order?.visits ?? []
	const n = visits.length || booking?.initialDates?.length || 0
	const perVisit = order?.totals?.per_visit ?? 0
	const total = order?.totals?.total ?? 0
	const serviceNames = order?.package
		? order.package.name
		: order?.services?.length
			? itemsSummary(order.services)
			: itemsSummary(booking?.items ?? [])

	const remaining = expiresAt ? expiresAt - now : null
	const declined = order?.status === 'CANCELLED_BY_PROVIDER'

	let pill = ''
	let title = ''
	let body = ''
	if (phase === 'pending') {
		pill =
			total > 0 ? `Pay after each visit · ${inr(total)} · waiting for confirmation` : 'Waiting for confirmation'
		title = `Request sent to ${provFirst}`
		body = `We'll notify you as soon as ${provFirst} confirms. If there's no reply in ${ANCILLARY_BOOKING_CONFIRM_MINUTES} minutes, you can pick another ${noun}.`
	} else if (phase === 'confirmed') {
		pill = perVisit > 0 ? `Confirmed · pay ${inr(perVisit)} after each visit` : 'Confirmed'
		title = `${Who} confirmed your ${plural(n, 'visit').replace(/^\d+ /, '')}`
		body = "You'll get a start code for each visit, to share when they arrive."
	} else if (phase === 'unconfirmed') {
		pill = 'Nothing was charged'
		title = declined ? `${Who} can't take this booking` : `${Who} didn't confirm in time`
		body = `Pick another ${noun} for the same days — your services and dates are kept.`
	} else {
		pill = 'Cancelled'
		title = 'Request cancelled'
		body = 'Nothing was charged. You can book again whenever you need.'
	}

	const visitItems: AppVisitListItem[] = visits.map((v, i) => ({
		key: v.visit_public_id || v.date,
		index: v.index ?? i + 1,
		title: dayLabel(v.date),
		sub: timeLabel(v.start_time),
		status: visitTag(v.status),
	}))

	const steps =
		phase === 'confirmed'
			? [
					{ title: `${Who} confirmed`, body: 'Your visits are booked.' },
					{ title: 'You get a start code', body: 'for each visit, to share when they arrive.' },
					{
						title: `Pay ${perVisit > 0 ? inr(perVisit) : ''} after each visit`.replace('  ', ' '),
						body: `Cash or UPI to the ${noun}.`,
					},
				]
			: [
					{ title: `${Who} confirms`, body: `within ${ANCILLARY_BOOKING_CONFIRM_MINUTES} minutes.` },
					{ title: 'You get a start code', body: 'for each visit, to share when they arrive.' },
					{ title: `If ${provFirst} can't make it,`, body: `pick another ${noun} — nothing is charged.` },
				]

	const tone = toneForString(provName || noun)
	const pollStalled = failures >= MAX_POLL_FAILURES && phase === 'pending'

	return (
		<View style={styles.container}>
			<StatusBar barStyle="light-content" backgroundColor={APP_COLORS.ink} />
			<ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
				{/* Hero */}
				<View style={[styles.hero, { paddingTop: 48 + insets.top }]}>
					<View style={styles.heroCircle} />
					<View
						style={[
							styles.ring,
							phase === 'confirmed' && styles.ringOk,
							(phase === 'unconfirmed' || phase === 'cancelled') && styles.ringOff,
						]}
					>
						{phase === 'confirmed' ? (
							<View style={styles.okCircle}>
								<AppIcon name="check" size={32} color={APP_COLORS.surface} strokeWidth={2.8} />
							</View>
						) : (
							<AppAvatar
								uri={buildS3Url(order?.provider?.avatar_url)}
								name={provName || noun}
								size={70}
								backgroundColor={APP_COLORS.ink}
								initialsColor={APP_COLORS.surface}
								initialsStyle={styles.heroInitials}
							/>
						)}
					</View>
					{loading && !order ? (
						<AppSkeleton width={220} height={24} borderRadius={12} color={APP_COLORS.primary} />
					) : (
						<AppTag
							label={pill}
							shape="pill"
							bg={phase === 'unconfirmed' || phase === 'cancelled' ? tone.bg : APP_COLORS.mintAccent}
							ink={APP_COLORS.ink}
							textStyle={styles.pillText}
						/>
					)}
					<Text style={styles.heroTitle} accessibilityRole="header">
						{title}
					</Text>
					<Text style={styles.heroBody}>{body}</Text>
					{phase === 'pending' && remaining != null && remaining > 0 && (
						<Text style={styles.countdown} accessibilityLiveRegion="polite">
							{`Waiting for ${provFirst} · ${countdownLabel(remaining)} left`}
						</Text>
					)}
				</View>

				{/* Visit card */}
				<View style={styles.card}>
					<Text style={styles.cardEyebrow}>{`${plural(n, 'visit')} · ${serviceNames}`.toUpperCase()}</Text>
					{loading && !order ? (
						<View style={styles.skeletons}>
							<AppSkeleton height={36} borderRadius={10} color={APP_COLORS.neutralBg} />
							<AppSkeleton height={36} borderRadius={10} color={APP_COLORS.neutralBg} />
						</View>
					) : visitItems.length ? (
						<AppVisitList variant="status" visits={visitItems} />
					) : (
						<Text style={styles.muted}>
							{(booking?.initialDates ?? []).map((d) => dayLabel(d)).join(' · ') ||
								'Visit details will appear here.'}
						</Text>
					)}
					{!!order?.patient?.name && (
						<Text style={styles.muted}>
							{`For ${order.patient.name}${order.patient.relation && order.patient.relation !== 'Self' ? ` (${order.patient.relation})` : ''}`}
						</Text>
					)}
				</View>

				{!order && !loading && failures > 0 && (
					<View style={styles.bannerWrap}>
						<AppInfoBanner
							tone="danger"
							title="Couldn't load the request"
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

				<AppSection title="What happens next" titleSize="sm" marginTop={0} gap={12}>
					<AppNumberedSteps steps={steps} />
					{(phase === 'pending' || phase === 'confirmed') && !!order && (
						<AppTextLink
							label="Cancel request"
							tone="danger"
							size="sm"
							trailingIcon="none"
							onPress={() => setCancelOpen(true)}
						/>
					)}
				</AppSection>
			</ScrollView>

			<AppFooterBar>
				<AppButton variant="outline" size="lg" style={styles.flex} onPress={goHome}>
					Back to home
				</AppButton>
				{phase === 'unconfirmed' ? (
					<AppButton size="lg" style={styles.flex} onPress={() => rebook(true)}>
						{`Choose another ${noun}`}
					</AppButton>
				) : phase === 'cancelled' ? (
					<AppButton size="lg" style={styles.flex} onPress={() => rebook(false)}>
						Book again
					</AppButton>
				) : (
					<AppButton
						size="lg"
						style={styles.flex}
						disabled={!order}
						softDisabled
						onPress={() =>
							navigation.navigate(ROUTES.STACK.ANCILLARY_TRACK_APPOINTMENT, { bookingId: requestId })
						}
					>
						View booking
					</AppButton>
				)}
			</AppFooterBar>

			<AppBottomSheet
				visible={cancelOpen}
				onClose={() => setCancelOpen(false)}
				title="Cancel this request?"
				subtitle={
					phase === 'confirmed'
						? `All ${plural(n, 'visit')} with ${provFirst} will be cancelled.`
						: `${provFirst} won't be able to accept it any more.`
				}
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
							Cancel request
						</AppButton>
					</View>
				}
			>
				<Text style={styles.sheetBody}>Nothing has been charged, so there's nothing to refund.</Text>
			</AppBottomSheet>
		</View>
	)
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: APP_COLORS.pageBg },
	flex: { flex: 1 },
	scroll: { gap: 12, paddingBottom: 16 },
	hero: {
		backgroundColor: APP_COLORS.ink,
		paddingHorizontal: 24,
		paddingBottom: 56,
		alignItems: 'center',
		gap: 10,
		overflow: 'hidden',
	},
	heroCircle: {
		position: 'absolute',
		right: -50,
		top: -50,
		width: 160,
		height: 160,
		borderRadius: 9999,
		backgroundColor: APP_COLORS.primary,
	},
	ring: {
		width: 84,
		height: 84,
		borderRadius: 9999,
		borderWidth: 4,
		borderColor: APP_COLORS.mintAccent,
		alignItems: 'center',
		justifyContent: 'center',
		overflow: 'hidden',
	},
	ringOk: { borderColor: APP_COLORS.mintAccent, backgroundColor: APP_COLORS.success },
	ringOff: { borderColor: APP_COLORS.inkMuted },
	okCircle: { alignItems: 'center', justifyContent: 'center' },
	heroInitials: { fontSize: 18, fontWeight: '800' },
	pillText: { fontSize: 12, fontWeight: '800' },
	heroTitle: {
		fontSize: 24,
		lineHeight: 30,
		fontWeight: '800',
		color: APP_COLORS.surface,
		textAlign: 'center',
	},
	heroBody: {
		maxWidth: 300,
		fontSize: 14,
		lineHeight: 20,
		color: APP_COLORS.mint,
		textAlign: 'center',
	},
	countdown: { fontSize: 12, lineHeight: 16, fontWeight: '700', color: APP_COLORS.mintAccent },
	card: {
		marginTop: -36,
		marginHorizontal: 16,
		padding: 16,
		borderRadius: 14,
		backgroundColor: APP_COLORS.surface,
		gap: 6,
		...CARD_SHADOW,
	},
	cardEyebrow: { fontSize: 12, lineHeight: 16, fontWeight: '800', letterSpacing: 0.6, color: APP_COLORS.primary },
	skeletons: { gap: 8, paddingVertical: 4 },
	muted: { fontSize: 13, lineHeight: 18, color: APP_COLORS.inkMuted },
	bannerWrap: { marginHorizontal: 16 },
	sheetActions: { flexDirection: 'row', gap: 8 },
	sheetBody: { fontSize: 14, lineHeight: 20, color: APP_COLORS.ink },
})
