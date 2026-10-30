// src/components/common/booking/AppointmentActionCard.tsx
//
// The request/upcoming appointment card from the "Doctor Dashboard" design's Schedule → Requests
// and Schedule → Upcoming tabs: avatar-initials + name/meta + status chip, a mode row (icon + slot +
// mode/fee), the patient's reason, an optional urgent banner, then either a pending action row
// (Reject/Cancel · Reschedule · Refer, plus Accept for genuine requests) or a resolved outcome
// banner with Undo. Generic enough to reuse for any future "act on this booking" card (Ancillary,
// Pharmacy, Laboratory order requests) — nothing here is appointment-specific beyond the props shape.

import React from 'react'
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { APP_COLORS, TONES, type ToneKey } from '../../../config/theme'
import { AppTag, type AppTagTone } from '../display/AppTag'

export type AppointmentActionOutcome = {
	kind: 'accept' | 'reject' | 'reschedule' | 'refer'
	title: string
	sub: string
	tone: 'success' | 'danger' | 'info' | 'purple'
}

export type AppointmentActionCardProps = {
	id: string
	initials: string
	avatarTone?: ToneKey
	name: string
	meta: string
	/** Genuine new booking request (shows Accept + "Reject") vs an already-confirmed booking (shows "Cancel" only). */
	isRequest: boolean
	/** The chip text of a request (default "Request"), e.g. "Rescheduled" for a patient's reschedule request. */
	requestLabel?: string
	/** Chip text of an already-accepted booking (default "Confirmed"), e.g. "Reschedule needed" while the patient still has to pick a new time. */
	statusLabel?: string
	/** Derived from pre_intake.severity === 'severe' upstream — never fabricated, only passed when the backend actually flagged it. */
	urgent?: boolean
	slotLabel: string
	mode: 'Video' | 'In-clinic'
	payLabel: string
	reason?: string | null
	busy?: boolean
	outcome?: AppointmentActionOutcome | null
	onAccept?: () => void
	onReject: () => void
	onReschedule: () => void
	onRefer: () => void
	onUndo?: () => void
}

const OUTCOME_TONE: Record<AppointmentActionOutcome['tone'], { bg: string; fg: string }> = {
	success: { bg: APP_COLORS.successBg, fg: APP_COLORS.success },
	danger: { bg: APP_COLORS.dangerBg, fg: APP_COLORS.danger },
	info: { bg: '#DDEBFA', fg: '#2463A8' },
	purple: { bg: '#ECE6FA', fg: '#6A4BB5' },
}

export function AppointmentActionCard({
	initials,
	avatarTone = 'mint',
	name,
	meta,
	isRequest,
	requestLabel = 'Request',
	statusLabel = 'Confirmed',
	urgent = false,
	slotLabel,
	mode,
	payLabel,
	reason,
	busy = false,
	outcome,
	onAccept,
	onReject,
	onReschedule,
	onRefer,
	onUndo,
}: AppointmentActionCardProps) {
	const pending = !outcome
	const chipLabel = outcome
		? { accept: 'Confirmed', reject: isRequest ? 'Declined' : 'Cancelled', reschedule: 'Reschedule needed', refer: 'Referred' }[
				outcome.kind
			]
		: isRequest
			? urgent
				? 'Red flag'
				: requestLabel
			: statusLabel
	const chipTone: AppTagTone = outcome
		? outcome.kind === 'accept'
			? 'confirmed'
			: outcome.kind === 'reject'
				? 'cancelled'
				: 'sky'
		: urgent
			? 'cancelled'
			: isRequest
				? 'sand'
				: statusLabel === 'Confirmed'
					? 'confirmed'
					: 'sand'

	return (
		<View
			style={[
				styles.card,
				{ borderColor: outcome ? APP_COLORS.divider : urgent ? '#F3B7AE' : APP_COLORS.divider },
				{ backgroundColor: outcome ? APP_COLORS.pageBg : APP_COLORS.surface },
			]}
		>
			<View style={styles.topRow}>
				<View style={[styles.avatar, { backgroundColor: TONES[avatarTone].bg }]}>
					<Text style={[styles.avatarText, { color: TONES[avatarTone].ink }]}>{initials}</Text>
				</View>
				<View style={{ flex: 1, minWidth: 0 }}>
					<Text style={styles.name} numberOfLines={1}>
						{name}
					</Text>
					<Text style={styles.meta} numberOfLines={1}>
						{meta}
					</Text>
				</View>
				<AppTag label={chipLabel} tone={chipTone} />
			</View>

			<View style={styles.modeRow}>
				<MaterialCommunityIcons
					name={mode === 'Video' ? 'video-outline' : 'hospital-building'}
					size={18}
					color={APP_COLORS.primary}
				/>
				<View style={{ flex: 1, minWidth: 0 }}>
					<Text style={styles.slotText} numberOfLines={1}>
						{slotLabel}
					</Text>
					<Text style={styles.slotSub} numberOfLines={1}>
						{mode} · {payLabel}
					</Text>
				</View>
			</View>

			{!!reason && (
				<Text style={styles.reasonText}>
					<Text style={{ fontWeight: '800' }}>Reason · </Text>
					{reason}
				</Text>
			)}

			{urgent && pending && (
				<View style={styles.urgentBanner}>
					<MaterialCommunityIcons name="alert" size={16} color={APP_COLORS.danger} />
					<Text style={styles.urgentText}>Symptoms may need urgent in-person care. Consider referring.</Text>
				</View>
			)}

			{pending ? (
				<View style={{ gap: 8 }}>
					<View style={styles.actionGrid}>
						<TouchableOpacity style={styles.outlineBtnSmall} onPress={onReject} disabled={busy}>
							<Text style={[styles.outlineBtnText, { color: APP_COLORS.danger }]}>{isRequest ? 'Reject' : 'Cancel'}</Text>
						</TouchableOpacity>
						<TouchableOpacity style={styles.outlineBtnSmall} onPress={onReschedule} disabled={busy}>
							<Text style={styles.outlineBtnText}>Reschedule</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={[styles.outlineBtnSmall, urgent && styles.outlineBtnUrgent]}
							onPress={onRefer}
							disabled={busy}
						>
							<Text style={[styles.outlineBtnText, urgent && { color: '#6A4BB5' }]}>Refer</Text>
						</TouchableOpacity>
					</View>
					{isRequest && (
						<TouchableOpacity style={styles.primaryBtn} onPress={onAccept} disabled={busy}>
							{busy ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.primaryBtnText}>Accept</Text>}
						</TouchableOpacity>
					)}
				</View>
			) : (
				<View style={[styles.outcomeBanner, { backgroundColor: OUTCOME_TONE[outcome.tone].bg }]}>
					<View style={{ flex: 1, minWidth: 0 }}>
						<Text style={[styles.outcomeTitle, { color: OUTCOME_TONE[outcome.tone].fg }]} numberOfLines={1}>
							{outcome.title}
						</Text>
						<Text style={styles.outcomeSub} numberOfLines={2}>
							{outcome.sub}
						</Text>
					</View>
					{!!onUndo && (
						<TouchableOpacity onPress={onUndo}>
							<Text style={styles.undoText}>Undo</Text>
						</TouchableOpacity>
					)}
				</View>
			)}
		</View>
	)
}

export default AppointmentActionCard

const styles = StyleSheet.create({
	card: {
		borderWidth: 1,
		borderRadius: 12,
		padding: 12,
		gap: 10,
	},
	topRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
	avatar: {
		width: 40,
		height: 40,
		borderRadius: 12,
		backgroundColor: APP_COLORS.mint,
		alignItems: 'center',
		justifyContent: 'center',
	},
	avatarText: { fontSize: 14, fontWeight: '800', color: APP_COLORS.primary },
	name: { fontSize: 15, lineHeight: 20, fontWeight: '800', color: APP_COLORS.ink },
	meta: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
	modeRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		padding: 10,
		borderRadius: 10,
		backgroundColor: APP_COLORS.pageBg,
	},
	slotText: { fontSize: 14, lineHeight: 19, fontWeight: '800', color: APP_COLORS.ink },
	slotSub: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
	reasonText: { fontSize: 13, lineHeight: 19, color: APP_COLORS.ink },
	urgentBanner: {
		flexDirection: 'row',
		gap: 8,
		padding: 10,
		borderRadius: 10,
		backgroundColor: APP_COLORS.dangerBg,
		alignItems: 'flex-start',
	},
	urgentText: { flex: 1, fontSize: 12, lineHeight: 17, fontWeight: '700', color: APP_COLORS.danger },
	actionGrid: { flexDirection: 'row', gap: 6 },
	outlineBtnSmall: {
		flex: 1,
		height: 40,
		borderWidth: 1.5,
		borderColor: APP_COLORS.divider,
		borderRadius: 10,
		alignItems: 'center',
		justifyContent: 'center',
	},
	outlineBtnUrgent: { borderColor: '#6A4BB5', backgroundColor: '#ECE6FA' },
	outlineBtnText: { fontSize: 13, lineHeight: 18, fontWeight: '700', color: APP_COLORS.ink },
	primaryBtn: {
		height: 44,
		borderRadius: 10,
		backgroundColor: APP_COLORS.primary,
		alignItems: 'center',
		justifyContent: 'center',
	},
	primaryBtnText: { fontSize: 14, lineHeight: 20, fontWeight: '800', color: '#FFFFFF' },
	outcomeBanner: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		padding: 10,
		borderRadius: 10,
	},
	outcomeTitle: { fontSize: 13, lineHeight: 18, fontWeight: '800' },
	outcomeSub: { fontSize: 12, lineHeight: 16, color: APP_COLORS.ink },
	undoText: { fontSize: 13, lineHeight: 18, fontWeight: '700', color: APP_COLORS.primary },
})
