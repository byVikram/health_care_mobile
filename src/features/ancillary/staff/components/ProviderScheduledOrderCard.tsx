// src/features/ancillary/staff/components/ProviderScheduledOrderCard.tsx
//
// One scheduled order in the provider's queue: patient + status, services, a countdown to `expires_at` while
// it's pending (orders expire 30 minutes after they're sent), the visit address, EVERY visit date/time
// (AppVisitList), the total with "Pay after each visit", and Accept / Decline for actionable orders.
import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import {
	AppAvatar,
	AppButton,
	AppIcon,
	AppInfoBanner,
	AppTag,
	AppTextLink,
	AppVisitList,
	type AppVisitListItem,
} from '../../../../components/common'
import { APP_COLORS, TONES, formatInr } from '../../../../config/theme'
import {
	countdownLabel,
	isOrderActionable,
	isOrderExpired,
	isPendingOrder,
	orderStatusMeta,
	type ProviderOrderView,
} from '../providerOrderView'

export type ProviderScheduledOrderCardProps = {
	order: ProviderOrderView
	nowMs: number
	accepting?: boolean
	/** Disables both actions (another action on this order is in flight). */
	busy?: boolean
	onAccept: (order: ProviderOrderView) => void
	onDecline: (order: ProviderOrderView) => void
	/** Only offered for single-visit orders (the backend reschedules the primary visit only). */
	onProposeTime?: (order: ProviderOrderView) => void
	/** Opens the visit screens (details / in progress) for an accepted order. */
	onOpenVisit?: (order: ProviderOrderView) => void
}

export function ProviderScheduledOrderCard({
	order,
	nowMs,
	accepting = false,
	busy = false,
	onAccept,
	onDecline,
	onProposeTime,
	onOpenVisit,
}: ProviderScheduledOrderCardProps) {
	const expired = isOrderExpired(order, nowMs)
	const actionable = isOrderActionable(order, nowMs)
	const pending = isPendingOrder(order) && !expired
	const status = orderStatusMeta(order.status, expired)
	const countdown = pending ? countdownLabel(order.expiresAt, nowMs) : null
	const visitsCount = order.visits.length

	const servicesLine = [order.packageName, ...order.services].filter(Boolean).join(', ') || 'Home care service'

	const visitItems: AppVisitListItem[] = order.visits.map((v) => ({
		key: v.key,
		index: v.index,
		title: v.title,
		sub: v.sub,
		current: v.isToday && !expired,
		// Per-visit status once the order is past the pending stage (visits can progress individually).
		status: !pending && !expired ? orderStatusMeta(v.status) : undefined,
	}))

	const visitsTitle =
		visitsCount === 0 ? 'Visit time to be confirmed' : visitsCount === 1 ? '1 visit' : `${visitsCount} visits`

	return (
		<View
			style={[styles.card, expired && styles.cardMuted]}
			accessibilityLabel={`${order.patientName}, ${status.label}, ${servicesLine}`}
		>
			<View style={styles.head}>
				<AppAvatar
					name={order.patientName}
					size={44}
					radius={12}
					backgroundColor={TONES.peach.bg}
					initialsColor={TONES.peach.ink}
				/>
				<View style={styles.headText}>
					<View style={styles.nameRow}>
						<Text style={styles.name} numberOfLines={1}>
							{order.patientName}
						</Text>
						<AppTag label={status.label} tone={status.tone} size="sm" style={styles.statusTag} />
					</View>
					{!!order.patientRelation && order.patientRelation.toLowerCase() !== 'self' && (
						<Text style={styles.muted} numberOfLines={1}>
							Booked for {order.patientRelation.toLowerCase()}
						</Text>
					)}
					<Text style={styles.services} numberOfLines={2}>
						{servicesLine}
					</Text>
				</View>
			</View>

			{pending && countdown ? (
				<AppInfoBanner
					tone="warning"
					title={`Respond within ${countdown}`}
					subtitle="Unanswered requests expire and the patient picks another provider."
					accessibilityLabel={`Respond within ${countdown} minutes`}
				/>
			) : null}
			{expired ? (
				<AppInfoBanner
					tone="danger"
					icon="timer-off-outline"
					title="Request expired"
					subtitle="It wasn't accepted within 30 minutes, so it can no longer be accepted."
				/>
			) : null}

			{!!order.address && (
				<View style={styles.addressRow}>
					<AppIcon name="pin" size={16} color={APP_COLORS.inkMuted} />
					<Text style={styles.address} numberOfLines={2}>
						{order.address}
					</Text>
				</View>
			)}

			<AppVisitList visits={visitItems} variant="status" title={visitsTitle} style={styles.visits} />

			{!!order.note && (
				<Text style={styles.note} numberOfLines={3}>
					Note: {order.note}
				</Text>
			)}

			<View style={styles.totalRow}>
				<View style={styles.totalText}>
					<Text style={styles.totalLabel}>Total</Text>
					{order.perVisit != null && visitsCount > 1 ? (
						<Text style={styles.muted}>
							{formatInr(Math.round(order.perVisit))} × {visitsCount} visits
						</Text>
					) : null}
				</View>
				<View style={styles.totalRight}>
					<Text style={styles.totalValue}>{formatInr(order.total)}</Text>
					{order.payAfterVisit ? <AppTag label="Pay after each visit" tone="mint" size="sm" /> : null}
				</View>
			</View>

			{!pending && !expired && onOpenVisit && order.openVisit ? (
				<AppButton
					variant="primary"
					size="sm"
					onPress={() => onOpenVisit(order)}
					accessibilityLabel={`Open visit with ${order.patientName}`}
				>
					{order.openVisit.inProgress ? 'Continue visit' : 'Open visit'}
				</AppButton>
			) : null}

			{actionable ? (
				<View style={styles.actions}>
					<View style={styles.actionRow}>
						<AppButton
							variant="outline"
							size="sm"
							onPress={() => onDecline(order)}
							disabled={busy}
							style={styles.actionBtn}
							accessibilityLabel={`Decline booking from ${order.patientName}`}
						>
							Decline
						</AppButton>
						<AppButton
							variant="primary"
							size="sm"
							onPress={() => onAccept(order)}
							loading={accepting}
							disabled={busy}
							style={styles.actionBtn}
							accessibilityLabel={`Accept booking from ${order.patientName}`}
						>
							Accept
						</AppButton>
					</View>
					{onProposeTime && visitsCount === 1 && order.rescheduleCount < 2 ? (
						<AppTextLink
							label="Propose another time"
							onPress={() => onProposeTime(order)}
							size="sm"
							trailingIcon="none"
							disabled={busy}
							style={styles.proposeLink}
						/>
					) : null}
				</View>
			) : null}
		</View>
	)
}

const styles = StyleSheet.create({
	card: {
		backgroundColor: APP_COLORS.surface,
		borderColor: APP_COLORS.divider,
		borderWidth: 1,
		borderRadius: 12,
		padding: 14,
		gap: 12,
	},
	cardMuted: {
		backgroundColor: APP_COLORS.pageBg,
	},
	head: {
		flexDirection: 'row',
		gap: 12,
	},
	headText: {
		flex: 1,
		minWidth: 0,
		gap: 2,
	},
	nameRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 8,
	},
	name: {
		flex: 1,
		fontSize: 16,
		lineHeight: 22,
		fontWeight: '800',
		color: APP_COLORS.ink,
	},
	statusTag: {
		flexShrink: 0,
	},
	services: {
		fontSize: 13,
		lineHeight: 18,
		fontWeight: '600',
		color: APP_COLORS.primary,
	},
	muted: {
		fontSize: 12,
		lineHeight: 16,
		color: APP_COLORS.inkMuted,
	},
	addressRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		gap: 8,
	},
	address: {
		flex: 1,
		fontSize: 13,
		lineHeight: 18,
		color: APP_COLORS.inkMuted,
	},
	visits: {
		paddingTop: 2,
	},
	note: {
		fontSize: 12,
		lineHeight: 16,
		color: APP_COLORS.inkMuted,
	},
	totalRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 8,
		paddingTop: 10,
		borderTopWidth: 1,
		borderTopColor: APP_COLORS.divider,
	},
	totalText: {
		flex: 1,
		minWidth: 0,
		gap: 2,
	},
	totalLabel: {
		fontSize: 14,
		lineHeight: 20,
		fontWeight: '700',
		color: APP_COLORS.ink,
	},
	totalRight: {
		alignItems: 'flex-end',
		gap: 4,
	},
	totalValue: {
		fontSize: 16,
		lineHeight: 22,
		fontWeight: '800',
		color: APP_COLORS.ink,
	},
	actions: {
		gap: 8,
	},
	actionRow: {
		flexDirection: 'row',
		gap: 10,
	},
	actionBtn: {
		flex: 1,
	},
	proposeLink: {
		alignSelf: 'center',
	},
})

export default ProviderScheduledOrderCard
