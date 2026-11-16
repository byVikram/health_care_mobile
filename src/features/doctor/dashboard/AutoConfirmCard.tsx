// src/features/doctor/dashboard/AutoConfirmCard.tsx
//
// The "Auto-confirm bookings" card at the top of the Booking requests page ("Doctor Dashboard NEW"): a title, one line saying what the
// switch does, the switch, and, once it has confirmed waiting requests, "N requests confirmed automatically". The card tints green
// while it is on. The switch is the shared AppToggle; the server does the confirming (PUT /api/appointments/me/auto-confirm).

import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { AppPathIcon, AppToggle } from '../../../components/common'
import { APP_COLORS } from '../../../config/theme'

type Props = {
	enabled: boolean
	/** A change is being saved: the switch waits. */
	busy: boolean
	/** How many waiting requests the switch confirmed when it was turned on (0 hides the line). */
	confirmedCount: number
	onChange: (enabled: boolean) => void
}

export function AutoConfirmCard({ enabled, busy, confirmedCount, onChange }: Props) {
	return (
		<View style={[styles.card, enabled && styles.cardOn]}>
			<View style={styles.row}>
				<View style={{ flex: 1, minWidth: 0 }}>
					<Text style={styles.title}>Auto-confirm bookings</Text>
					<Text style={styles.sub}>
						{enabled
							? 'New bookings in your open slots are confirmed instantly.'
							: 'Confirm new bookings in your open slots instantly.'}
					</Text>
				</View>
				<AppToggle
					value={enabled}
					onValueChange={onChange}
					disabled={busy}
					showStatusText={false}
					accessibilityLabel="Auto-confirm bookings"
				/>
			</View>
			{enabled && confirmedCount > 0 && (
				<View style={styles.done}>
					<AppPathIcon d="M20 6L9 17l-5-5" size={14} strokeWidth={2.6} color={APP_COLORS.success} />
					<Text style={styles.doneText}>
						{confirmedCount} {confirmedCount === 1 ? 'request' : 'requests'} confirmed automatically
					</Text>
				</View>
			)}
		</View>
	)
}

const styles = StyleSheet.create({
	card: {
		gap: 8,
		paddingVertical: 12,
		paddingHorizontal: 14,
		borderRadius: 16,
		borderWidth: 1,
		borderColor: '#E3EAEB',
		backgroundColor: '#FFFFFF',
	},
	cardOn: { borderColor: APP_COLORS.mintAccent, backgroundColor: '#F0F7F7' },
	row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
	title: { fontSize: 15, lineHeight: 20, fontWeight: '800', color: APP_COLORS.ink },
	sub: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
	done: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		paddingTop: 8,
		borderTopWidth: 1,
		borderTopColor: APP_COLORS.divider,
	},
	doneText: { fontSize: 12, lineHeight: 16, fontWeight: '700', color: APP_COLORS.success },
})

export default AutoConfirmCard
