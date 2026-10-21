// src/features/ancillary/staff/today/BookingRequestSheet.tsx
//
// "1a · Booking request" sheet of the provider design: who chose the provider, the service, visit count and
// distance, a reply-in countdown (the order expires 30 min after it was sent), every visit's date and time,
// what the provider collects after each visit (pay after each visit), the patient's gender / age (full address
// only after accepting) and Decline / Accept all N. Decline opens the reason sheet (DeclineOrderSheet).
import React from 'react'
import {
	ActivityIndicator,
	Modal,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	useWindowDimensions,
	View,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { APP_COLORS, CARD_SHADOW, TONES, formatInr } from '../../../../config/theme'
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
	const insets = useSafeAreaInsets()
	const { height } = useWindowDimensions()
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
	const locked = accepting || expired
	const dismiss = () => {
		if (!accepting) onClose()
	}

	return (
		<Modal visible={!!request} transparent animationType="slide" statusBarTranslucent onRequestClose={dismiss}>
			<View style={styles.overlay}>
				<Pressable
					style={styles.scrim}
					onPress={dismiss}
					accessibilityRole="button"
					accessibilityLabel="Close"
				/>
				<View
					style={[styles.sheet, { maxHeight: height * 0.88, paddingBottom: Math.max(insets.bottom, 12) }]}
					accessibilityViewIsModal
				>
					<View style={styles.handle} />
					{request ? (
						<ScrollView
							contentContainerStyle={styles.body}
							showsVerticalScrollIndicator={false}
							bounces={false}
						>
							<View style={styles.topRow}>
								<View style={styles.headText}>
									<Text style={styles.eyebrow} numberOfLines={2}>
										{request.patient.name
											? `NEW BOOKING · ${upperName(request.patient.name)} CHOSE YOU`
											: 'NEW BOOKING'}
									</Text>
									<Text style={styles.title} accessibilityRole="header">
										{request.service_name}
									</Text>
									<Text style={styles.subtitle}>{subtitle}</Text>
								</View>
								{replyIn ? (
									<View style={styles.replyChip} accessibilityLabel={`Reply in ${replyIn}`}>
										<Text style={styles.replyText}>Reply in</Text>
										<Text style={styles.replyText}>{replyIn}</Text>
									</View>
								) : null}
							</View>

							<View style={styles.visitsBox}>
								{request.visits.map((v) => (
									<View key={v.visit_public_id} style={[styles.visitRow, styles.visitRowDivider]}>
										<Text style={styles.visitDay}>{shortDay(v.date)}</Text>
										<Text style={styles.visitTime}>{formatTimeSlot(v.start_time)}</Text>
									</View>
								))}
								<View style={styles.collectRow}>
									<Text style={styles.collectLabel}>Collect after each {copy.noun}</Text>
									<Text style={styles.collectValue}>{formatInr(request.totals.per_visit)}</Text>
								</View>
							</View>

							<View style={styles.patientRow}>
								<MaterialCommunityIcons name="account-outline" size={16} color={APP_COLORS.inkMuted} />
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

							<View style={styles.buttons}>
								<Pressable
									onPress={() => onDecline(request)}
									disabled={locked}
									accessibilityRole="button"
									style={({ pressed }) => [
										styles.decline,
										locked && styles.disabled,
										pressed && styles.pressed,
									]}
								>
									<Text style={styles.declineText}>Decline</Text>
								</Pressable>
								<Pressable
									onPress={() => onAccept(request)}
									disabled={locked}
									accessibilityRole="button"
									style={({ pressed }) => [
										styles.accept,
										locked && styles.disabled,
										pressed && styles.pressed,
									]}
								>
									{accepting ? (
										<ActivityIndicator color={APP_COLORS.surface} />
									) : (
										<>
											<MaterialCommunityIcons name="check" size={18} color={APP_COLORS.surface} />
											<Text style={styles.acceptText}>
												{count > 1 ? `Accept all ${count}` : 'Accept'}
											</Text>
										</>
									)}
								</Pressable>
							</View>
							<Text style={styles.note}>
								{expired
									? 'This request has expired.'
									: `These slots are held for you until you reply. If you decline, ${firstName} can pick another provider.`}
							</Text>
						</ScrollView>
					) : null}
				</View>
			</View>
		</Modal>
	)
}

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		justifyContent: 'flex-end',
	},
	scrim: {
		...StyleSheet.absoluteFill,
		backgroundColor: APP_COLORS.scrim,
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
	body: {
		paddingTop: 8,
		paddingHorizontal: 16,
		paddingBottom: 8,
		gap: 14,
	},
	topRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	headText: {
		flex: 1,
		minWidth: 0,
	},
	eyebrow: {
		fontSize: 11,
		lineHeight: 14,
		fontWeight: '800',
		letterSpacing: 0.66,
		color: TONES.sky.ink,
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
		textAlign: 'center',
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
		borderBottomWidth: 1,
		borderBottomColor: APP_COLORS.divider,
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
		flexDirection: 'row',
		justifyContent: 'space-between',
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
		flex: 1.4,
		height: 52,
		borderRadius: 12,
		backgroundColor: APP_COLORS.primary,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 6,
	},
	acceptText: {
		fontSize: 15,
		fontWeight: '700',
		color: APP_COLORS.surface,
	},
	disabled: {
		opacity: 0.6,
	},
	pressed: {
		opacity: 0.85,
	},
	note: {
		fontSize: 12,
		lineHeight: 16,
		color: APP_COLORS.inkMuted,
		textAlign: 'center',
	},
})

export default BookingRequestSheet
