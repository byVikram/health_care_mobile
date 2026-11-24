// src/features/ancillary/staff/today/IncomingOfferSheet.tsx
//
// The request sheet of the provider design (Ancillary Home, "Instant request on Home") for open offers from
// GET /provider/requests/available:
//   - an INSTANT request (patient is waiting): a peach "INSTANT REQUEST" eyebrow, a "Patient is waiting" badge, the
//     service, a 60px ring timer counting down the 30 s (orange, red in the last 15), distance / area / patient / what
//     you collect after the visit (+ "incl. ₹N tip"), the provider's next visit, Decline / "Accept · go now" and a
//     footer line; "Taken by another nurse" and "Request missed" end states (the person word follows the speciality).
//   - one visit of a provider-less scheduled order (visitPublicId + scheduledDate / start / end): same sheet with
//     the slot instead of the badge and ring.
// Accept / decline use the unchanged offer endpoints (keyed by the request id). The offer says what the provider earns
// (`providerPayout`, "You earn"), how long her own offer has left (`expiresInMs`), the area, the ride time, the services, the
// patient's age and gender and any note; what she collects from the patient after the visit is shown beside it. An older backend
// sends none of these and the sheet shows the collect amount alone, as it used to.
import React from 'react'
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AppPathIcon } from '../../../../components/common'
import { APP_COLORS, CARD_SHADOW, formatInr } from '../../../../config/theme'
import { formatTimeSlot } from '../../../../utils/formatters'
import type { ProviderOffer } from '../../providerVisitService'
import type { ProviderSpecialityCopy } from '../providerSpecialityCopy'
import { PATHS, SCH } from '../schedule/scheduleTheme'
import { isInstantOffer, kmLabel, offerCollect, shortDay, tipLabel } from './todayView'

export type OfferPhase = 'open' | 'taken' | 'missed'

export type IncomingOfferSheetProps = {
	offer: ProviderOffer | null
	copy: ProviderSpecialityCopy
	phase: OfferPhase
	/** Whole seconds left to answer an instant request; null for scheduled offers. */
	secondsLeft: number | null
	busy?: boolean
	/** "Your next visit: 7:00 PM with Vikram K." (an instant request only; left out when she has none later today). */
	nextVisitLine?: string | null
	onAccept: (offer: ProviderOffer) => void
	onDecline: (offer: ProviderOffer) => void
	onClose: () => void
	/** The missed request is still open for other nurses (and for her) under Needed now on her Schedule. */
	stillOpen?: boolean
	/** "See in Needed now" on a missed request that is still open. */
	onSeeNeeded?: () => void
}

/** Seconds an instant request is held (matches INSTANT_WINDOW_S in ProviderTodayContent). */
const WINDOW_S = 30
const RING_SIZE = 60
const RING_STROKE = 5
/** The ring turns red in the last seconds. */
const RING_WARN_S = 15

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
					stroke={SCH.timerTrack}
					strokeWidth={RING_STROKE}
					fill="none"
				/>
				<Circle
					cx={RING_SIZE / 2}
					cy={RING_SIZE / 2}
					r={r}
					stroke={secondsLeft <= RING_WARN_S ? APP_COLORS.danger : SCH.accent}
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
	nextVisitLine = null,
	onAccept,
	onDecline,
	onClose,
	stillOpen = false,
	onSeeNeeded,
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
						: stillOpen
							? `The ${WINDOW_S} seconds ran out. Nobody has taken it yet, so it is still open under Needed now on your Schedule.`
							: `The ${WINDOW_S} seconds ran out, so it went to another ${person}. Missing many requests can lower your priority.`}
				</Text>
				<Pressable
					onPress={phase === 'missed' && stillOpen && onSeeNeeded ? onSeeNeeded : onClose}
					accessibilityRole="button"
					style={({ pressed }) => [styles.okButton, pressed && styles.pressed]}
				>
					<Text style={styles.okText}>
						{phase === 'missed' && stillOpen && onSeeNeeded ? 'See in Needed now' : 'OK'}
					</Text>
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
								<Text style={styles.badgeText}>Patient is waiting</Text>
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
					{offer.distanceKm != null ? (
						<Row
							label="Distance"
							value={[
								kmLabel(offer.distanceKm),
								offer.etaMinutes != null ? `about ${offer.etaMinutes} min` : null,
							]
								.filter(Boolean)
								.join(' · ')}
						/>
					) : null}
					<Row
						label="Area"
						value={
							offer.area ? `${offer.area} · full address after accepting` : 'Full address after accepting'
						}
					/>
					{offer.patientName ? (
						<Row label="Patient" value={[offer.patientName, offer.ageGender].filter(Boolean).join(' · ')} />
					) : null}
					{offer.services.length > 0 ? (
						<Row
							label="Services"
							value={offer.services
								.map((x) => (x.minutes ? `${x.name} · ${x.minutes} min` : x.name))
								.join(', ')}
						/>
					) : null}
					{offer.note ? <Row label="Note" value={offer.note} /> : null}
					{offer.providerPayout != null ? (
						<>
							<View style={styles.earnRow}>
								<Text style={styles.earnLabel}>You earn</Text>
								<View style={styles.earnValueBox}>
									<Text style={styles.earnValue}>{formatInr(offer.providerPayout)}</Text>
									{offer.tipAmount > 0 ? (
										<Text style={styles.earnTip}>{`+ ${formatInr(offer.tipAmount)} tip`}</Text>
									) : null}
								</View>
							</View>
							<Row
								label={`Collect after the ${copy.noun}`}
								value={`${formatInr(offerCollect(offer))}${tip ? ` · ${tip}` : ''}`}
							/>
						</>
					) : (
						<View style={styles.earnRow}>
							<Text style={styles.earnLabel}>{`Collect after the ${copy.noun}`}</Text>
							<View style={styles.earnValueBox}>
								<Text style={styles.earnValue}>{formatInr(offerCollect(offer))}</Text>
								{tip ? <Text style={styles.earnTip}>{tip}</Text> : null}
							</View>
						</View>
					)}
				</View>

				{instant && nextVisitLine ? <Text style={styles.nextLine}>{nextVisitLine}</Text> : null}

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
							<Text style={styles.acceptText}>{instant ? 'Accept · go now' : 'Accept'}</Text>
						)}
					</Pressable>
				</View>
				{instant ? (
					<Text style={styles.foot}>Sent to nurses nearby · the first to accept gets the visit</Text>
				) : null}
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
						{instant ? (
							<AppPathIcon d={PATHS.bolt} size={14} strokeWidth={2.4} color={SCH.instantInk} />
						) : null}
						<Text style={[styles.topLabel, instant && { color: SCH.instantInk }]}>
							{instant ? 'INSTANT REQUEST' : 'NEW VISIT REQUEST'}
						</Text>
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
		paddingTop: 6,
		paddingHorizontal: 16,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
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
		backgroundColor: SCH.instantBg,
	},
	badgeText: {
		fontSize: 11,
		lineHeight: 16,
		fontWeight: '800',
		color: SCH.instantInk,
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
	nextLine: {
		fontSize: 13,
		lineHeight: 18,
		fontWeight: '700',
		color: APP_COLORS.success,
	},
	foot: {
		textAlign: 'center',
		fontSize: 11,
		lineHeight: 14,
		color: APP_COLORS.inkMuted,
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
