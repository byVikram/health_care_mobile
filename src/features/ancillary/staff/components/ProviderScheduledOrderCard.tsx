// src/features/ancillary/staff/components/ProviderScheduledOrderCard.tsx
//
// One order in the provider's visit list: patient + status, services, the visit address, EVERY visit date/time (AppVisitList),
// the total with "Pay after each visit", and a way into the visit while it can still be done. Read-only.
import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import {
	AppAvatar,
	AppButton,
	AppIcon,
	AppTag,
	AppVisitList,
	type AppVisitListItem,
} from '../../../../components/common'
import { APP_COLORS, TONES, formatInr } from '../../../../config/theme'
import { orderStatusMeta, type ProviderOrderView } from '../providerOrderView'

export type ProviderScheduledOrderCardProps = {
	order: ProviderOrderView
	/** Opens the visit screens (details / in progress). */
	onOpenVisit?: (order: ProviderOrderView) => void
}

export function ProviderScheduledOrderCard({ order, onOpenVisit }: ProviderScheduledOrderCardProps) {
	const status = orderStatusMeta(order.status)
	const visitsCount = order.visits.length

	const servicesLine = [order.packageName, ...order.services].filter(Boolean).join(', ') || 'Home care service'

	const visitItems: AppVisitListItem[] = order.visits.map((v) => ({
		key: v.key,
		index: v.index,
		title: v.title,
		sub: v.sub,
		current: v.isToday,
		// Visits progress individually, so each shows its own status.
		status: orderStatusMeta(v.status),
	}))

	const visitsTitle =
		visitsCount === 0 ? 'Visit time to be confirmed' : visitsCount === 1 ? '1 visit' : `${visitsCount} visits`

	return (
		<View style={styles.card} accessibilityLabel={`${order.patientName}, ${status.label}, ${servicesLine}`}>
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

			{onOpenVisit && order.openVisit ? (
				<AppButton
					variant="primary"
					size="sm"
					onPress={() => onOpenVisit(order)}
					accessibilityLabel={`Open visit with ${order.patientName}`}
				>
					{order.openVisit.inProgress ? 'Continue visit' : 'Open visit'}
				</AppButton>
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
})

export default ProviderScheduledOrderCard
