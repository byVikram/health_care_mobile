// src/features/ancillary/staff/today/BookingRequestSheet.tsx
//
// "1a · Booking request" sheet of the provider design: who chose the provider, the service, visit count and
// distance, a reply-in countdown (the order expires 30 min after it was sent), every visit's date and time,
// what the provider collects after each visit (pay after each visit), the patient's gender / age (full address
// only after accepting) and Decline / Accept all N. Decline opens the reason sheet (DeclineOrderSheet).
import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { AppBottomSheet, AppButton } from '../../../../components/common'
import { APP_COLORS, TONES, formatInr } from '../../../../config/theme'
import { formatTimeSlot } from '../../../../utils/formatters'
import type { ProviderPendingRequest } from '../../providerVisitService'
import type { ProviderSpecialityCopy } from '../providerSpecialityCopy'
import { kmLabel, patientBrief, replyInLabel, shortDay, upperName, visitsWord } from './todayView'

export type BookingRequestSheetProps = {
	request: ProviderPendingRequest | null
	copy: ProviderSpecialityCopy
	nowMs: number
	accepting?: boolean
	onClose: () => void
	onAccept: (request: ProviderPendingRequest) => void
	onDecline: (request: ProviderPendingRequest) => void
}

export function BookingRequestSheet({
	request,
	copy,
	nowMs,
	accepting = false,
	onClose,
	onAccept,
	onDecline,
}: BookingRequestSheetProps) {
	const count = request?.totals.visits_count || request?.visits.length || 1
	const replyIn = request ? replyInLabel(request.expires_at, nowMs) : null
	const expired = !!request?.expires_at && !replyIn
	const subtitle = request
		? [visitsWord(count, copy.noun), request.address_label, kmLabel(request.distance_km)]
				.filter(Boolean)
				.join(' · ')
		: undefined
	const brief = request ? patientBrief(request.patient) : ''
	const firstName = request?.patient.name?.split(' ')[0] || 'The patient'

	return (
		<AppBottomSheet
			visible={!!request}
			title={request?.service_name ?? ''}
			subtitle={subtitle}
			onClose={onClose}
			appearance="modern"
			showHeaderDivider={false}
			dismissible={!accepting}
			footer={
				request ? (
					<View style={styles.footer}>
						<View style={styles.buttons}>
							<AppButton
								variant="outline"
								size="lg"
								style={styles.decline}
								disabled={accepting || expired}
								onPress={() => onDecline(request)}
							>
								Decline
							</AppButton>
							<AppButton
								size="lg"
								icon="check"
								style={styles.accept}
								loading={accepting}
								disabled={accepting || expired}
								softDisabled
								onPress={() => onAccept(request)}
							>
								{count > 1 ? `Accept all ${count}` : 'Accept'}
							</AppButton>
						</View>
						<Text style={styles.note}>
							{expired
								? 'This request has expired.'
								: `These slots are held for you until you reply. If you decline, ${firstName} can pick another provider.`}
						</Text>
					</View>
				) : undefined
			}
		>
			{request ? (
				<View style={styles.body}>
					<View style={styles.topRow}>
						<Text style={styles.eyebrow} numberOfLines={2}>
							{request.patient.name
								? `NEW BOOKING · ${upperName(request.patient.name)} CHOSE YOU`
								: 'NEW BOOKING'}
						</Text>
						{replyIn ? (
							<View style={styles.replyChip} accessibilityLabel={`Reply in ${replyIn}`}>
								<Text style={styles.replyText}>Reply in</Text>
								<Text style={styles.replyText}>{replyIn}</Text>
							</View>
						) : null}
					</View>

					<View style={styles.visitsBox}>
						{request.visits.map((v, i) => (
							<View key={v.visit_public_id} style={[styles.visitRow, i > 0 && styles.visitRowDivider]}>
								<Text style={styles.visitDay}>{shortDay(v.date)}</Text>
								<Text style={styles.visitTime}>{formatTimeSlot(v.start_time)}</Text>
							</View>
						))}
						<View style={[styles.visitRow, styles.visitRowDivider, styles.collectRow]}>
							<Text style={styles.collectLabel}>Collect after each {copy.noun}</Text>
							<Text style={styles.collectValue}>{formatInr(request.totals.per_visit)}</Text>
						</View>
					</View>

					<View style={styles.patientRow}>
						<MaterialCommunityIcons name="account-outline" size={18} color={APP_COLORS.inkMuted} />
						<Text style={styles.patientText}>
							{[
								brief ? `Patient: ${brief}` : null,
								`pay after each ${copy.noun}`,
								'full address after you accept',
							]
								.filter(Boolean)
								.join(' · ')}
						</Text>
					</View>
				</View>
			) : null}
		</AppBottomSheet>
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
		paddingHorizontal: 10,
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
	visitsBox: {
		paddingVertical: 4,
		paddingHorizontal: 12,
		borderRadius: 12,
		backgroundColor: APP_COLORS.pageBg,
	},
	visitRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		gap: 8,
		paddingVertical: 8,
	},
	visitRowDivider: {
		borderTopWidth: 1,
		borderTopColor: APP_COLORS.divider,
	},
	visitDay: {
		fontSize: 14,
		lineHeight: 20,
		fontWeight: '700',
		color: APP_COLORS.ink,
	},
	visitTime: {
		fontSize: 14,
		lineHeight: 20,
		color: APP_COLORS.ink,
	},
	collectRow: {
		paddingTop: 10,
		paddingBottom: 6,
	},
	collectLabel: {
		fontSize: 14,
		lineHeight: 20,
		fontWeight: '700',
		color: APP_COLORS.success,
	},
	collectValue: {
		fontSize: 16,
		lineHeight: 22,
		fontWeight: '800',
		color: APP_COLORS.ink,
	},
	patientRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	patientText: {
		flex: 1,
		fontSize: 13,
		lineHeight: 18,
		color: APP_COLORS.inkMuted,
	},
	footer: {
		gap: 10,
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
	note: {
		fontSize: 12,
		lineHeight: 16,
		color: APP_COLORS.inkMuted,
		textAlign: 'center',
	},
})

export default BookingRequestSheet
