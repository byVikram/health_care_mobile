// src/features/ancillary/staff/components/ProviderScheduledOrdersSection.tsx
//
// Provider's scheduled-order queue on the staff dashboard (GET /api/ancillary/provider/me/orders).
// Patients book a SCHEDULED order with 1..7 visits (same provider); the provider must accept within 30 minutes
// or it expires. Lists orders with a live countdown, Accept / Decline (reason sheet), and refreshes on focus,
// on filter change, after every action, on the "new scheduled request" websocket event and when a countdown ends.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useIsFocused } from '@react-navigation/native'
import Toast from 'react-native-toast-message'
import { AppChip, AppInfoBanner, AppTag, AppTextLink } from '../../../../components/common'
import { APP_COLORS } from '../../../../config/theme'
import {
	acceptScheduledOrder,
	declineScheduledOrder,
	getProviderScheduledOrders,
} from '../../ancillaryProviderBookingService'
import { extractApiErrorMessage } from '../../ancillaryService'
import { useAncillaryWebSocket } from '../../hooks/useAncillaryWebSocket'
import { RescheduleProposalModal } from '../../components/RescheduleProposalModal'
import {
	firstVisitStart,
	isOrderActionable,
	isPendingOrder,
	normalizeProviderOrder,
	type ProviderOrderView,
	type RawProviderOrder,
} from '../providerOrderView'
import { DeclineOrderSheet } from './DeclineOrderSheet'
import { ProviderScheduledOrderCard } from './ProviderScheduledOrderCard'

type OrdersFilter = 'ALL' | 'PENDING_ACTION' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'

const FILTERS: { key: OrdersFilter; label: string }[] = [
	{ key: 'ALL', label: 'All' },
	{ key: 'PENDING_ACTION', label: 'Awaiting you' },
	{ key: 'CONFIRMED', label: 'Confirmed' },
	{ key: 'COMPLETED', label: 'Completed' },
	{ key: 'CANCELLED', label: 'Cancelled' },
]

/** Actionable requests first (soonest to expire on top), then everything else by first visit. */
const sortOrders = (orders: ProviderOrderView[], nowMs: number) =>
	[...orders].sort((a, b) => {
		const aAct = isOrderActionable(a, nowMs)
		const bAct = isOrderActionable(b, nowMs)
		if (aAct !== bAct) return aAct ? -1 : 1
		if (aAct && bAct) {
			const ae = a.expiresAt?.getTime() ?? Number.MAX_SAFE_INTEGER
			const be = b.expiresAt?.getTime() ?? Number.MAX_SAFE_INTEGER
			if (ae !== be) return ae - be
		}
		return firstVisitStart(a) - firstVisitStart(b)
	})

export function ProviderScheduledOrdersSection() {
	const isFocused = useIsFocused()
	const [filter, setFilter] = useState<OrdersFilter>('ALL')
	const [orders, setOrders] = useState<ProviderOrderView[]>([])
	const [loading, setLoading] = useState(false)
	const [loaded, setLoaded] = useState(false)
	const [loadError, setLoadError] = useState<string | null>(null)
	const [nowMs, setNowMs] = useState(() => Date.now())
	const [acceptingId, setAcceptingId] = useState<string | null>(null)
	const [declineTarget, setDeclineTarget] = useState<ProviderOrderView | null>(null)
	const [declining, setDeclining] = useState(false)
	const [rescheduleTarget, setRescheduleTarget] = useState<ProviderOrderView | null>(null)

	const filterRef = useRef(filter)
	filterRef.current = filter
	const requestSeq = useRef(0)

	const loadOrders = useCallback(async () => {
		const seq = ++requestSeq.current
		setLoading(true)
		try {
			const raw = await getProviderScheduledOrders(filterRef.current)
			if (seq !== requestSeq.current) return
			const list = Array.isArray(raw) ? (raw as RawProviderOrder[]) : []
			setOrders(list.map(normalizeProviderOrder).filter((o) => !!o.id))
			setLoadError(null)
		} catch (e) {
			if (seq !== requestSeq.current) return
			setLoadError(extractApiErrorMessage(e, 'Could not load your scheduled requests.'))
		} finally {
			if (seq === requestSeq.current) {
				setLoading(false)
				setLoaded(true)
				setNowMs(Date.now())
			}
		}
	}, [])

	useEffect(() => {
		if (isFocused) void loadOrders()
	}, [isFocused, filter, loadOrders])

	const onScheduledRequest = useCallback(() => {
		void loadOrders()
	}, [loadOrders])

	// Scheduled requests arrive whether or not the provider is online for instant dispatch.
	useAncillaryWebSocket({ enabled: isFocused, onScheduledRequest })

	// Tick once a second while any pending order is counting down to its expiry.
	const hasCountdown = orders.some((o) => isPendingOrder(o) && !!o.expiresAt && o.expiresAt.getTime() > nowMs)
	useEffect(() => {
		if (!isFocused || !hasCountdown) return
		const t = setInterval(() => setNowMs(Date.now()), 1000)
		return () => clearInterval(t)
	}, [isFocused, hasCountdown])

	// When a countdown reaches zero, re-read the list so the backend's lazy expiry is reflected.
	const expiredIdsRef = useRef<Set<string>>(new Set())
	useEffect(() => {
		const newlyExpired = orders.filter(
			(o) =>
				isPendingOrder(o) && !!o.expiresAt && o.expiresAt.getTime() <= nowMs && !expiredIdsRef.current.has(o.id)
		)
		if (newlyExpired.length === 0) return
		newlyExpired.forEach((o) => expiredIdsRef.current.add(o.id))
		void loadOrders()
	}, [orders, nowMs, loadOrders])

	const sorted = useMemo(() => sortOrders(orders, nowMs), [orders, nowMs])
	const pendingCount = orders.filter((o) => isOrderActionable(o, nowMs)).length

	const handleAccept = async (order: ProviderOrderView) => {
		if (acceptingId || declining) return
		setAcceptingId(order.id)
		try {
			await acceptScheduledOrder(order.id)
			Toast.show({
				type: 'success',
				text1: 'Booking accepted',
				text2:
					order.visits.length > 1
						? `All ${order.visits.length} visits with ${order.patientName} are confirmed.`
						: `Your visit with ${order.patientName} is confirmed.`,
			})
		} catch (e) {
			Toast.show({
				type: 'error',
				text1: 'Could not accept booking',
				text2: extractApiErrorMessage(e, 'This request may have expired. Please refresh and try again.'),
			})
		} finally {
			setAcceptingId(null)
			void loadOrders()
		}
	}

	const handleConfirmDecline = async (reason: string) => {
		if (!declineTarget || declining) return
		const target = declineTarget
		setDeclining(true)
		try {
			await declineScheduledOrder(target.id, reason)
			setDeclineTarget(null)
			Toast.show({
				type: 'success',
				text1: 'Booking declined',
				text2: `${target.patientName} has been notified.`,
			})
		} catch (e) {
			Toast.show({
				type: 'error',
				text1: 'Could not decline booking',
				text2: extractApiErrorMessage(e, 'Please try again.'),
			})
		} finally {
			setDeclining(false)
			void loadOrders()
		}
	}

	const busy = !!acceptingId || declining

	return (
		<View style={styles.section}>
			<View style={styles.headerRow}>
				<View style={styles.titleRow}>
					<Text style={styles.title} accessibilityRole="header">
						Scheduled requests
					</Text>
					{pendingCount > 0 ? <AppTag label={`${pendingCount} new`} tone="pending" size="sm" /> : null}
				</View>
				{loading && loaded ? (
					<ActivityIndicator size="small" color={APP_COLORS.primary} />
				) : (
					<AppTextLink
						label="Refresh"
						onPress={() => void loadOrders()}
						size="sm"
						trailingIcon="none"
						leadingIcon="refresh"
						disabled={loading}
					/>
				)}
			</View>

			<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
				{FILTERS.map((f) => (
					<AppChip
						key={f.key}
						label={f.label}
						selected={filter === f.key}
						onPress={() => setFilter(f.key)}
						variant="solid"
						shape="pill"
						size="sm"
					/>
				))}
			</ScrollView>

			{loadError ? (
				<AppInfoBanner
					tone="danger"
					title="Couldn't load requests"
					subtitle={loadError}
					action={{ label: 'Retry', onPress: () => void loadOrders() }}
				/>
			) : null}

			{!loaded && loading ? (
				<View style={styles.loadingBox}>
					<ActivityIndicator size="small" color={APP_COLORS.primary} />
				</View>
			) : sorted.length > 0 ? (
				<View style={styles.list}>
					{sorted.map((order) => (
						<ProviderScheduledOrderCard
							key={order.id}
							order={order}
							nowMs={nowMs}
							accepting={acceptingId === order.id}
							busy={busy}
							onAccept={handleAccept}
							onDecline={setDeclineTarget}
							onProposeTime={setRescheduleTarget}
						/>
					))}
				</View>
			) : !loadError ? (
				<View style={styles.emptyBox}>
					<Text style={styles.emptyTitle}>No scheduled requests</Text>
					<Text style={styles.emptySub}>
						{filter === 'ALL'
							? 'New home-care bookings from patients will appear here.'
							: 'Nothing in this category right now.'}
					</Text>
				</View>
			) : null}

			<DeclineOrderSheet
				visible={!!declineTarget}
				patientName={declineTarget?.patientName}
				visitsCount={declineTarget?.visits.length || 1}
				submitting={declining}
				onClose={() => {
					if (!declining) setDeclineTarget(null)
				}}
				onConfirm={(reason) => void handleConfirmDecline(reason)}
			/>

			{rescheduleTarget ? (
				<RescheduleProposalModal
					visible
					requestPublicId={rescheduleTarget.id}
					rescheduleCount={rescheduleTarget.rescheduleCount}
					onClose={() => setRescheduleTarget(null)}
					onSuccess={(msg, ok) => {
						Toast.show({
							type: ok === false ? 'error' : 'success',
							text1: ok === false ? 'Could not propose a new time' : 'New time proposed',
							text2: msg,
						})
						void loadOrders()
					}}
				/>
			) : null}
		</View>
	)
}

const styles = StyleSheet.create({
	section: {
		gap: 10,
	},
	headerRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 8,
		marginTop: 2,
	},
	titleRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		flexShrink: 1,
	},
	title: {
		fontSize: 16,
		lineHeight: 22,
		fontWeight: '800',
		color: APP_COLORS.ink,
	},
	filters: {
		gap: 8,
		paddingVertical: 2,
	},
	list: {
		gap: 12,
	},
	loadingBox: {
		paddingVertical: 24,
		alignItems: 'center',
	},
	emptyBox: {
		backgroundColor: APP_COLORS.surface,
		borderColor: APP_COLORS.divider,
		borderWidth: 1,
		borderRadius: 12,
		padding: 20,
		alignItems: 'center',
		gap: 4,
	},
	emptyTitle: {
		fontSize: 14,
		lineHeight: 20,
		fontWeight: '700',
		color: APP_COLORS.ink,
	},
	emptySub: {
		fontSize: 12,
		lineHeight: 16,
		color: APP_COLORS.inkMuted,
		textAlign: 'center',
	},
})

export default ProviderScheduledOrdersSection
