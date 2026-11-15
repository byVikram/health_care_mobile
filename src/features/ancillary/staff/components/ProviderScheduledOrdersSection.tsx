// src/features/ancillary/staff/components/ProviderScheduledOrdersSection.tsx
//
// The provider's visits on the Schedule tab (GET /api/ancillary/provider/me/orders): the orders they have taken, newest or soonest
// first by filter, with a way into the visit screens. Read-only: nobody asks a provider to accept an order here (an offer is taken
// from Today, the first provider to accept gets it). Refreshes on focus and on filter change.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useIsFocused, useNavigation, type NavigationProp } from '@react-navigation/native'
import { AppChip, AppInfoBanner, AppTextLink } from '../../../../components/common'
import { APP_COLORS } from '../../../../config/theme'
import { ROUTES } from '../../../../navigation/routes'
import type { AppStackParamList } from '../../../../navigation/types'
import { getProviderScheduledOrders } from '../../ancillaryProviderBookingService'
import { extractApiErrorMessage } from '../../ancillaryService'
import {
	firstVisitStart,
	normalizeProviderOrder,
	type ProviderOrderView,
	type RawProviderOrder,
} from '../providerOrderView'
import { ProviderScheduledOrderCard } from './ProviderScheduledOrderCard'

/** The backend's `status_filter` values. */
type VisitsFilter = 'ALL' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'

const FILTERS: { key: VisitsFilter; label: string }[] = [
	{ key: 'ALL', label: 'All' },
	{ key: 'CONFIRMED', label: 'Upcoming' },
	{ key: 'COMPLETED', label: 'Completed' },
	{ key: 'CANCELLED', label: 'Cancelled' },
]

/** Upcoming: the soonest first. Everything else: the latest first. */
const sortOrders = (orders: ProviderOrderView[], filter: VisitsFilter) =>
	[...orders].sort((a, b) =>
		filter === 'CONFIRMED' ? firstVisitStart(a) - firstVisitStart(b) : firstVisitStart(b) - firstVisitStart(a)
	)

export function ProviderScheduledOrdersSection() {
	const isFocused = useIsFocused()
	const navigation = useNavigation<NavigationProp<AppStackParamList>>()
	const [filter, setFilter] = useState<VisitsFilter>('ALL')
	const [orders, setOrders] = useState<ProviderOrderView[]>([])
	const [loading, setLoading] = useState(false)
	const [loaded, setLoaded] = useState(false)
	const [loadError, setLoadError] = useState<string | null>(null)

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
			setLoadError(extractApiErrorMessage(e, 'Could not load your visits.'))
		} finally {
			if (seq === requestSeq.current) {
				setLoading(false)
				setLoaded(true)
			}
		}
	}, [])

	useEffect(() => {
		if (isFocused) void loadOrders()
	}, [isFocused, filter, loadOrders])

	const sorted = useMemo(() => sortOrders(orders, filter), [orders, filter])

	/** A visit that can still be done -> its visit screens (same ones the Today tab opens). */
	const handleOpenVisit = (order: ProviderOrderView) => {
		if (!order.openVisit) return
		navigation.navigate(
			order.openVisit.inProgress ? ROUTES.STACK.PROVIDER_VISIT_IN_PROGRESS : ROUTES.STACK.PROVIDER_VISIT_DETAILS,
			{ visitId: order.openVisit.id }
		)
	}

	return (
		<View style={styles.section}>
			<View style={styles.headerRow}>
				<Text style={styles.title} accessibilityRole="header">
					Visits
				</Text>
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
					title="Couldn't load your visits"
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
						<ProviderScheduledOrderCard key={order.id} order={order} onOpenVisit={handleOpenVisit} />
					))}
				</View>
			) : !loadError ? (
				<View style={styles.emptyBox}>
					<Text style={styles.emptyTitle}>No visits yet</Text>
					<Text style={styles.emptySub}>
						{filter === 'ALL'
							? 'Visits you accept from Today will appear here.'
							: 'Nothing in this category right now.'}
					</Text>
				</View>
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
