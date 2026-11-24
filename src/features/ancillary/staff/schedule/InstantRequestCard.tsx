// src/features/ancillary/staff/schedule/InstantRequestCard.tsx
//
// The request that arrives while the provider looks at her schedule (ancillary schedule design, S11 / S14): a bordered card with
// an INSTANT REQUEST tag and a countdown bar (30 s for an instant request), the patient, when and how far, what to do, and
// Decline / Accept. An unfilled scheduled visit sent out before its start is the same card with an "UNFILLED · STARTS 6:30 PM"
// tag and no countdown. Presentational: the offer, the seconds left and the handlers come from useScheduleOffer.
import React from 'react'
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { AppPathIcon } from '../../../../components/common'
import { APP_COLORS, CARD_SHADOW, formatInr } from '../../../../config/theme'
import { formatTimeSlot } from '../../../../utils/formatters'
import type { ProviderOffer } from '../../providerVisitService'
import { isInstantOffer, kmLabel, offerCollect, shortDay, tipLabel } from '../today/todayView'
import { INSTANT_WINDOW_S } from './useScheduleOffer'
import { PATHS, SCH } from './scheduleTheme'

type Props = {
	offer: ProviderOffer
	/** Whole seconds left for an instant request; null for a scheduled visit. */
	secondsLeft: number | null
	busy: boolean
	/** "Your next visit: 7:00 PM with Vikram K." (when she has one later today). */
	nextVisitLine: string | null
	onAccept: (offer: ProviderOffer) => void
	onDecline: (offer: ProviderOffer) => void
}

const initials = (name?: string | null) =>
	(name ?? '')
		.split(/\s+/)
		.filter(Boolean)
		.map((w) => w[0])
		.join('')
		.slice(0, 2)
		.toUpperCase()

export function InstantRequestCard({ offer, secondsLeft, busy, nextVisitLine, onAccept, onDecline }: Props) {
	const instant = isInstantOffer(offer)
	const start = offer.scheduledStartTime ? formatTimeSlot(offer.scheduledStartTime) : ''
	const mm = Math.floor((secondsLeft ?? 0) / 60)
	const ss = (secondsLeft ?? 0) % 60
	const urgent = secondsLeft != null && secondsLeft <= 15
	const tag = instant ? 'INSTANT REQUEST' : `UNFILLED · STARTS ${start}`.trim()
	const when = instant ? 'Now · the patient is waiting' : `${shortDay(offer.scheduledDate)} · ${start}`.trim()
	const collect = offerCollect(offer)
	const tip = tipLabel(offer.tipAmount)

	return (
		<View style={[styles.card, CARD_SHADOW]} accessibilityLiveRegion="polite">
			<View style={styles.top}>
				<View style={styles.tag}>
					<AppPathIcon d={PATHS.bolt} size={12} strokeWidth={2.6} color={SCH.instantInk} />
					<Text style={styles.tagText}>{tag}</Text>
				</View>
				<View style={{ flex: 1 }} />
				{secondsLeft != null && (
					<Text
						style={[styles.timer, { color: urgent ? APP_COLORS.danger : SCH.instantInk }]}
						accessibilityRole="timer"
					>
						{`${mm}:${ss < 10 ? '0' : ''}${ss} left`}
					</Text>
				)}
			</View>
			{secondsLeft != null && (
				<View style={styles.track}>
					<View style={[styles.bar, { width: `${Math.round((secondsLeft / INSTANT_WINDOW_S) * 100)}%` }]} />
				</View>
			)}

			<View style={styles.who}>
				<View style={styles.avatar}>
					<Text style={styles.avatarText}>{initials(offer.patientName) || 'P'}</Text>
				</View>
				<View style={{ flex: 1, minWidth: 0 }}>
					<Text style={styles.name} numberOfLines={1}>
						{offer.patientName ?? 'Patient'}
					</Text>
					<Text style={styles.whoLine} numberOfLines={1}>
						{[
							offer.ageGender,
							kmLabel(offer.distanceKm) ? `${kmLabel(offer.distanceKm)} away` : null,
							offer.area,
							offer.providerPayout != null
								? `You earn ${formatInr(offer.providerPayout)}`
								: collect > 0
									? `You collect ${formatInr(collect)}`
									: null,
							tip,
						]
							.filter(Boolean)
							.join(' · ')}
					</Text>
				</View>
			</View>

			<View style={styles.info}>
				<View style={styles.infoRow}>
					<AppPathIcon d={PATHS.clock} size={16} strokeWidth={2.2} color={SCH.instantInk} />
					<Text style={styles.when}>{when}</Text>
				</View>
				{!!nextVisitLine && <Text style={styles.next}>{nextVisitLine}</Text>}
			</View>

			<Text style={styles.line}>
				<Text style={styles.lineBold}>Service · </Text>
				{offer.services.length > 0
					? offer.services.map((x) => (x.minutes ? `${x.name} · ${x.minutes} min` : x.name)).join(', ')
					: offer.serviceName}
			</Text>

			<View style={styles.buttons}>
				<TouchableOpacity
					style={[styles.btn, styles.decline]}
					onPress={() => onDecline(offer)}
					disabled={busy}
					activeOpacity={0.8}
					accessibilityRole="button"
				>
					<Text style={styles.declineText}>Decline</Text>
				</TouchableOpacity>
				<TouchableOpacity
					style={[styles.btn, styles.accept]}
					onPress={() => onAccept(offer)}
					disabled={busy}
					activeOpacity={0.85}
					accessibilityRole="button"
				>
					{busy ? (
						<ActivityIndicator size="small" color="#FFFFFF" />
					) : (
						<Text style={styles.acceptText}>{instant ? 'Accept · go now' : 'Accept visit'}</Text>
					)}
				</TouchableOpacity>
			</View>
			<Text style={styles.foot}>
				{instant
					? 'Sent to nurses nearby · the first to accept gets the visit'
					: 'No nurse picked this up in advance, so it is now sent to nurses nearby'}
			</Text>
		</View>
	)
}

const styles = StyleSheet.create({
	card: {
		padding: 14,
		gap: 12,
		borderRadius: 16,
		borderWidth: 1.5,
		borderColor: SCH.accent,
		backgroundColor: APP_COLORS.surface,
	},
	top: { flexDirection: 'row', alignItems: 'center', gap: 8 },
	tag: {
		height: 24,
		paddingHorizontal: 8,
		borderRadius: 6,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		backgroundColor: SCH.instantBg,
	},
	tagText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.4, color: SCH.instantInk },
	timer: { fontSize: 13, fontWeight: '800' },
	track: { height: 4, borderRadius: 9999, overflow: 'hidden', backgroundColor: SCH.timerTrack },
	bar: { height: 4, backgroundColor: SCH.accent },
	who: { flexDirection: 'row', alignItems: 'center', gap: 12 },
	avatar: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: SCH.instantBg,
		alignItems: 'center',
		justifyContent: 'center',
	},
	avatarText: { fontSize: 14, fontWeight: '800', color: SCH.instantInk },
	name: { fontSize: 16, lineHeight: 22, fontWeight: '700', color: APP_COLORS.ink },
	whoLine: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
	info: { padding: 10, paddingHorizontal: 12, gap: 6, borderRadius: 10, backgroundColor: APP_COLORS.pageBg },
	infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
	when: { flex: 1, fontSize: 14, fontWeight: '700', color: APP_COLORS.ink },
	next: { fontSize: 12, lineHeight: 16, fontWeight: '700', color: APP_COLORS.inkMuted },
	line: { fontSize: 13, lineHeight: 19, color: SCH.body },
	lineBold: { fontWeight: '700' },
	buttons: { flexDirection: 'row', gap: 8 },
	btn: { height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
	decline: { flex: 1, borderWidth: 1, borderColor: APP_COLORS.divider, backgroundColor: APP_COLORS.surface },
	declineText: { fontSize: 15, fontWeight: '800', color: APP_COLORS.ink },
	accept: { flex: 1.6, backgroundColor: APP_COLORS.primary },
	acceptText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
	foot: { textAlign: 'center', fontSize: 11, lineHeight: 14, color: APP_COLORS.inkMuted },
})
