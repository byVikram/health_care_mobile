// src/features/ancillary/staff/today/IncomingOfferSheet.tsx
//
// "NEW VISIT REQUEST" sheet of the provider design for open offers from GET /provider/requests/available:
//   - an INSTANT request (patient is waiting): badge, service, 56px ring timer counting down the 30 s, distance /
//     area / patient / what you collect after the visit (+ "incl. ₹N tip"), Decline / Accept; "Taken by another
//     nurse" and "Request missed" end states (the person word follows the speciality).
//   - one visit of a provider-less scheduled order (visitPublicId + scheduledDate / start / end): same sheet with
//     the slot instead of the badge and ring.
// Accept / decline use the unchanged offer endpoints (keyed by the request id). Collect-after-the-visit wording
// replaces the design's "You earn" / "paid online": the amount shown is the patient's charge, not a payout.
import React from 'react'
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { APP_COLORS, CARD_SHADOW, formatInr } from '../../../../config/theme'
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

/** Seconds an instant request is held (matches INSTANT_WINDOW_S in ProviderTodayContent). */
const WINDOW_S = 30
const RING_SIZE = 56
const RING_STROKE = 5
/** Design-only amber of the ring in the last 10 seconds. */
const RING_WARN = '#E0A100'

const PERSON_BY_SPECIALITY: Record<ProviderSpecialityCopy['id'], string> = {
	nursing: 'nurse',
	physiotherapy: 'physiotherapist',
	attendant: 'attendant',
	rehab: 'therapist',
	equipment: 'provider',
	default: 'provider',
}

function CountdownRing({ secondsLeft }: { secondsLeft: number }) {
	const r = (RING_SIZE - RING_STROKE) / 2
	const c = 2 * Math.PI * r
	const frac = Math.max(0, Math.min(1, secondsLeft / WINDOW_S))
	return (
		<View
			style={styles.ring}
			accessibilityRole="timer"
			accessibilityLabel={`${secondsLeft} seconds left to accept`}
		>
			<Svg width={RING_SIZE} height={RING_SIZE} style={StyleSheet.absoluteFill}>
				<Circle
					cx={RING_SIZE / 2}
					cy={RING_SIZE / 2}
					r={r}
					stroke={APP_COLORS.divider}
					strokeWidth={RING_STROKE}
					fill="none"
				/>
				<Circle
					cx={RING_SIZE / 2}
					cy={RING_SIZE / 2}
					r={r}
					stroke={secondsLeft <= 10 ? RING_WARN : APP_COLORS.primary}
					strokeWidth={RING_STROKE}
					fill="none"
					strokeDasharray={`${c * frac} ${c}`}
					rotation={-90}
					origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
				/>
			</Svg>
			<Text style={styles.ringValue}>{secondsLeft}</Text>
			<Text style={styles.ringUnit}>sec</Text>
		</View>
	)
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
	const insets = useSafeAreaInsets()
	const instant = offer ? isInstantOffer(offer) : false
	const tip = offer ? tipLabel(offer.tipAmount) : null
	const person = PERSON_BY_SPECIALITY[copy.id]
	const slot = offer?.scheduledDate
		? [shortDay(offer.scheduledDate), formatTimeSlot(offer.scheduledStartTime)].filter(Boolean).join(' · ')
		: null
	const subtitle = slot ?? `1 ${copy.noun}`

	let body: React.ReactNode = null
	if (offer && phase !== 'open') {
		const taken = phase === 'taken'
		body = (
			<View style={styles.endBox}>
				<Text style={styles.endTitle}>{taken ? `Taken by another ${person}` : 'Request missed'}</Text>
				<Text style={styles.endText}>
					{taken
						? `Another ${person} accepted first. Stay online and the next request near you will come to you.`
						: `The ${WINDOW_S} seconds ran out, so it went to another ${person}. Missing many requests can lower your priority.`}
				</Text>
				<Pressable
					onPress={onClose}
					accessibilityRole="button"
					style={({ pressed }) => [styles.okButton, pressed && styles.pressed]}
				>
					<Text style={styles.okText}>OK</Text>
				</Pressable>
			</View>
		)
	} else if (offer) {
		body = (
			<View style={styles.body}>
				<View style={styles.headRow}>
					<View style={styles.headText}>
						{instant ? (
							<View style={styles.badge}>
								<Text style={styles.badgeText}>INSTANT · patient is waiting</Text>
							</View>
						) : null}
						<Text style={styles.title} accessibilityRole="header">
							{offer.serviceName}
						</Text>
						<Text style={styles.subtitle}>{subtitle}</Text>
					</View>
					{instant && secondsLeft != null ? <CountdownRing secondsLeft={secondsLeft} /> : null}
				</View>

				<View style={styles.box}>
					{offer.distanceKm != null ? <Row label="Distance" value={kmLabel(offer.distanceKm) ?? ''} /> : null}
					<Row label="Area" value="Full address after accepting" />
					{offer.patientName ? <Row label="Patient" value={offer.patientName} /> : null}
					<View style={styles.earnRow}>
						<Text style={styles.earnLabel}>{`Collect after the ${copy.noun}`}</Text>
						<View style={styles.earnValueBox}>
							<Text style={styles.earnValue}>{formatInr(offerCollect(offer))}</Text>
							{tip ? <Text style={styles.earnTip}>{tip}</Text> : null}
						</View>
					</View>
				</View>

				<View style={styles.buttons}>
					<Pressable
						onPress={() => onDecline(offer)}
						disabled={busy}
						accessibilityRole="button"
						style={({ pressed }) => [styles.decline, busy && styles.disabled, pressed && styles.pressed]}
					>
						<Text style={styles.declineText}>Decline</Text>
					</Pressable>
					<Pressable
						onPress={() => onAccept(offer)}
						disabled={busy}
						accessibilityRole="button"
						style={({ pressed }) => [styles.accept, busy && styles.disabled, pressed && styles.pressed]}
					>
						{busy ? (
							<ActivityIndicator color={APP_COLORS.surface} />
						) : (
							<Text style={styles.acceptText}>Accept</Text>
						)}
					</Pressable>
				</View>
			</View>
		)
	}

	return (
		<Modal visible={!!offer} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
			<View style={styles.overlay}>
				<View style={styles.scrim} />
				<View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) }]} accessibilityViewIsModal>
					<View style={styles.handle} />
					<View style={styles.topRow}>
						<Text style={styles.topLabel}>NEW VISIT REQUEST</Text>
					</View>
					{body}
				</View>
			</View>
		</Modal>
	)
}

function Row({ label, value }: { label: string; value: string }) {
	return (
		<View style={styles.row}>
			<Text style={styles.rowLabel}>{label}</Text>
			<Text style={styles.rowValue}>{value}</Text>
		</View>
	)
}

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		justifyContent: 'flex-end',
	},
	scrim: {
		...StyleSheet.absoluteFill,
		backgroundColor: '#12373E80',
	},
	sheet: {
		backgroundColor: APP_COLORS.surface,
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		...CARD_SHADOW,
	},
	handle: {
		alignSelf: 'center',
		width: 40,
		height: 4,
		marginTop: 8,
		borderRadius: 2,
		backgroundColor: APP_COLORS.divider,
	},
	topRow: {
		paddingTop: 4,
		paddingHorizontal: 16,
	},
	topLabel: {
		fontSize: 12,
		lineHeight: 16,
		fontWeight: '800',
		letterSpacing: 0.72,
		color: APP_COLORS.primary,
	},
	body: {
		paddingTop: 8,
		paddingHorizontal: 16,
		paddingBottom: 8,
		gap: 12,
	},
	headRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	headText: {
		flex: 1,
		minWidth: 0,
		gap: 4,
	},
	badge: {
		alignSelf: 'flex-start',
		paddingVertical: 2,
		paddingHorizontal: 8,
		borderRadius: 6,
		backgroundColor: APP_COLORS.successBg,
	},
	badgeText: {
		fontSize: 11,
		lineHeight: 16,
		fontWeight: '800',
		color: APP_COLORS.success,
	},
	title: {
		fontSize: 20,
		lineHeight: 26,
		fontWeight: '800',
		color: APP_COLORS.ink,
	},
	subtitle: {
		fontSize: 13,
		lineHeight: 18,
		color: APP_COLORS.inkMuted,
	},
	ring: {
		width: RING_SIZE,
		height: RING_SIZE,
		alignItems: 'center',
		justifyContent: 'center',
	},
	ringValue: {
		fontSize: 18,
		lineHeight: 20,
		fontWeight: '800',
		color: APP_COLORS.ink,
	},
	ringUnit: {
		fontSize: 9,
		lineHeight: 10,
		fontWeight: '700',
		color: APP_COLORS.inkMuted,
	},
	box: {
		paddingVertical: 2,
		paddingHorizontal: 12,
		borderRadius: 12,
		backgroundColor: APP_COLORS.pageBg,
	},
	row: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		gap: 12,
		paddingVertical: 8,
		borderBottomWidth: 1,
		borderBottomColor: APP_COLORS.divider,
	},
	rowLabel: {
		fontSize: 14,
		lineHeight: 20,
		color: APP_COLORS.inkMuted,
	},
	rowValue: {
		flexShrink: 1,
		fontSize: 14,
		lineHeight: 20,
		fontWeight: '700',
		color: APP_COLORS.ink,
		textAlign: 'right',
	},
	earnRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'baseline',
		gap: 12,
		paddingTop: 10,
		paddingBottom: 8,
	},
	earnLabel: {
		flexShrink: 1,
		fontSize: 14,
		fontWeight: '800',
		color: APP_COLORS.success,
	},
	earnValueBox: {
		alignItems: 'flex-end',
	},
	earnValue: {
		fontSize: 18,
		fontWeight: '800',
		color: APP_COLORS.ink,
	},
	earnTip: {
		fontSize: 11,
		fontWeight: '700',
		color: APP_COLORS.success,
	},
	buttons: {
		flexDirection: 'row',
		gap: 8,
	},
	decline: {
		flex: 1,
		height: 52,
		borderRadius: 12,
		borderWidth: 1.5,
		borderColor: APP_COLORS.border,
		backgroundColor: APP_COLORS.surface,
		alignItems: 'center',
		justifyContent: 'center',
	},
	declineText: {
		fontSize: 15,
		fontWeight: '700',
		color: APP_COLORS.ink,
	},
	accept: {
		flex: 1.6,
		height: 52,
		borderRadius: 12,
		backgroundColor: APP_COLORS.primary,
		alignItems: 'center',
		justifyContent: 'center',
	},
	acceptText: {
		fontSize: 16,
		fontWeight: '800',
		color: APP_COLORS.surface,
	},
	disabled: {
		opacity: 0.6,
	},
	pressed: {
		opacity: 0.85,
	},
	endBox: {
		alignItems: 'center',
		gap: 8,
		paddingTop: 12,
		paddingHorizontal: 16,
		paddingBottom: 8,
	},
	endTitle: {
		fontSize: 18,
		lineHeight: 24,
		fontWeight: '800',
		color: APP_COLORS.ink,
		textAlign: 'center',
	},
	endText: {
		fontSize: 14,
		lineHeight: 20,
		color: APP_COLORS.inkMuted,
		textAlign: 'center',
	},
	okButton: {
		alignSelf: 'stretch',
		marginTop: 6,
		height: 48,
		borderRadius: 12,
		backgroundColor: APP_COLORS.primary,
		alignItems: 'center',
		justifyContent: 'center',
	},
	okText: {
		fontSize: 15,
		fontWeight: '700',
		color: APP_COLORS.surface,
	},
})

export default IncomingOfferSheet
