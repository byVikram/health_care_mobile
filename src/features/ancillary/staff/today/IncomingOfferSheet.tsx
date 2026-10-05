// src/features/ancillary/staff/today/IncomingOfferSheet.tsx
//
// "NEW VISIT REQUEST" sheet of the provider design for open offers from GET /provider/requests/available:
//   - an INSTANT request (patient is waiting): 30-second countdown, distance, patient, what you collect after the
//     visit (+ "incl. ₹N tip"), Decline / Accept; "Taken by another provider" and "Request missed" end states.
//   - one visit of a provider-less scheduled order (visitPublicId + scheduledDate / start / end): same sheet with
//     the slot instead of the countdown.
// Accept / decline use the unchanged offer endpoints (keyed by the request id). Collect-after-the-visit wording
// replaces the design's "paid online".
import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { AppBottomSheet, AppButton } from '../../../../components/common'
import { APP_COLORS, TONES, formatInr } from '../../../../config/theme'
import { formatTimeSlot } from '../../../../utils/formatters'
import type { ProviderOffer } from '../../providerVisitService'
import type { ProviderSpecialityCopy } from '../providerSpecialityCopy'
import { isInstantOffer, kmLabel, offerCollect, shortDay, tipLabel } from './todayView'

export type OfferPhase = 'open' | 'taken' | 'missed'

export type IncomingOfferSheetProps = {
	offer: ProviderOffer | null
	copy: ProviderSpecialityCopy
	phase: OfferPhase
	/** Whole seconds left to answer an instant request; null for scheduled offers. */
	secondsLeft: number | null
	busy?: boolean
	onAccept: (offer: ProviderOffer) => void
	onDecline: (offer: ProviderOffer) => void
	onClose: () => void
}

export function IncomingOfferSheet({
	offer,
	copy,
	phase,
	secondsLeft,
	busy = false,
	onAccept,
	onDecline,
	onClose,
}: IncomingOfferSheetProps) {
	const instant = offer ? isInstantOffer(offer) : false
	const tip = offer ? tipLabel(offer.tipAmount) : null
	const slot = offer?.scheduledDate
		? [shortDay(offer.scheduledDate), formatTimeSlot(offer.scheduledStartTime)].filter(Boolean).join(' · ')
		: null
	const subtitle = offer
		? [slot ?? `1 ${copy.noun}`, kmLabel(offer.distanceKm)].filter(Boolean).join(' · ')
		: undefined

	let body: React.ReactNode = null
	if (offer && phase === 'taken') {
		body = (
			<View style={styles.endBox}>
				<Text style={styles.endTitle}>Taken by another provider</Text>
				<Text style={styles.endText}>
					Another provider accepted first. The next request near you will come to you.
				</Text>
			</View>
		)
	} else if (offer && phase === 'missed') {
		body = (
			<View style={styles.endBox}>
				<Text style={styles.endTitle}>Request missed</Text>
				<Text style={styles.endText}>
					The time to accept ran out, so it went to another provider. Missing many requests can lower your
					priority.
				</Text>
			</View>
		)
	} else if (offer) {
		body = (
			<View style={styles.body}>
				<View style={styles.topRow}>
					<Text style={styles.eyebrow}>{instant ? 'INSTANT · PATIENT IS WAITING' : 'NEW VISIT REQUEST'}</Text>
					{instant && secondsLeft != null ? (
						<View style={styles.replyChip} accessibilityLabel={`${secondsLeft} seconds left to accept`}>
							<Text style={styles.replyText}>{secondsLeft}</Text>
							<Text style={styles.replyText}>sec</Text>
						</View>
					) : null}
				</View>
				<View style={styles.box}>
					{offer.distanceKm != null ? <Row label="Distance" value={kmLabel(offer.distanceKm) ?? ''} /> : null}
					<Row label="Area" value="Full address after you accept" />
					{offer.patientName ? <Row label="Patient" value={offer.patientName} /> : null}
					<Row
						label={`Collect after the ${copy.noun}`}
						value={formatInr(offerCollect(offer))}
						sub={tip}
						strong
					/>
				</View>
			</View>
		)
	}

	const ended = phase !== 'open'

	return (
		<AppBottomSheet
			visible={!!offer}
			title={offer?.serviceName ?? ''}
			subtitle={ended ? undefined : subtitle}
			onClose={onClose}
			appearance="modern"
			showHeaderDivider={false}
			dismissible={!busy}
			footer={
				offer ? (
					ended ? (
						<AppButton size="lg" onPress={onClose}>
							OK
						</AppButton>
					) : (
						<View style={styles.buttons}>
							<AppButton
								variant="outline"
								size="lg"
								style={styles.decline}
								disabled={busy}
								onPress={() => onDecline(offer)}
							>
								Decline
							</AppButton>
							<AppButton
								size="lg"
								icon="check"
								style={styles.accept}
								loading={busy}
								disabled={busy}
								softDisabled
								onPress={() => onAccept(offer)}
							>
								Accept
							</AppButton>
						</View>
					)
				) : undefined
			}
		>
			{body}
		</AppBottomSheet>
	)
}

function Row({ label, value, sub, strong }: { label: string; value: string; sub?: string | null; strong?: boolean }) {
	return (
		<View style={styles.row}>
			<Text style={[styles.rowLabel, strong && styles.collectLabel]}>{label}</Text>
			<View style={styles.rowValueBox}>
				<Text style={[styles.rowValue, strong && styles.collectValue]}>{value}</Text>
				{sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	body: {
		gap: 14,
		paddingBottom: 4,
	},
	topRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	eyebrow: {
		flex: 1,
		fontSize: 11,
		lineHeight: 14,
		fontWeight: '800',
		letterSpacing: 0.66,
		color: TONES.sky.ink,
	},
	replyChip: {
		paddingVertical: 6,
		paddingHorizontal: 12,
		borderRadius: 10,
		backgroundColor: APP_COLORS.warningBg,
		alignItems: 'center',
	},
	replyText: {
		fontSize: 12,
		lineHeight: 16,
		fontWeight: '800',
		color: APP_COLORS.warning,
	},
	box: {
		paddingVertical: 4,
		paddingHorizontal: 12,
		borderRadius: 12,
		backgroundColor: APP_COLORS.pageBg,
	},
	row: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		gap: 12,
		paddingVertical: 8,
	},
	rowLabel: {
		fontSize: 13,
		lineHeight: 18,
		color: APP_COLORS.inkMuted,
	},
	rowValueBox: {
		flexShrink: 1,
		alignItems: 'flex-end',
	},
	rowValue: {
		fontSize: 14,
		lineHeight: 20,
		fontWeight: '700',
		color: APP_COLORS.ink,
		textAlign: 'right',
	},
	rowSub: {
		fontSize: 12,
		lineHeight: 16,
		color: APP_COLORS.inkMuted,
	},
	collectLabel: {
		fontSize: 14,
		fontWeight: '700',
		color: APP_COLORS.success,
	},
	collectValue: {
		fontSize: 16,
		lineHeight: 22,
		fontWeight: '800',
	},
	endBox: {
		gap: 6,
		paddingBottom: 4,
	},
	endTitle: {
		fontSize: 16,
		lineHeight: 22,
		fontWeight: '800',
		color: APP_COLORS.ink,
	},
	endText: {
		fontSize: 14,
		lineHeight: 20,
		color: APP_COLORS.inkMuted,
	},
	buttons: {
		flexDirection: 'row',
		gap: 8,
	},
	decline: {
		flex: 1,
	},
	accept: {
		flex: 1.4,
	},
})

export default IncomingOfferSheet
