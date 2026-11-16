// src/features/doctor/components/SheetPatientCard.tsx
//
// The patient strip at the top of the doctor's appointment sheets ("Doctor Dashboard NEW": Ask to reschedule, Cancel appointment,
// Mark as no-show): a round initials badge (the shared AppAvatar), the name, and "Today, Thu 25 Sep, 4:00 PM · In-clinic".

import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { AppAvatar } from '../../../components/common'
import { APP_COLORS, TONES } from '../../../config/theme'

export function SheetPatientCard({ name, slotLabel }: { name: string; slotLabel?: string }) {
	return (
		<View style={styles.card}>
			<AppAvatar name={name} size={44} backgroundColor={TONES.sand.bg} initialsColor={TONES.sand.ink} />
			<View style={{ flex: 1, minWidth: 0 }}>
				<Text style={styles.name} numberOfLines={1}>
					{name}
				</Text>
				{!!slotLabel && (
					<Text style={styles.slot} numberOfLines={2}>
						{slotLabel}
					</Text>
				)}
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	card: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		padding: 12,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: APP_COLORS.divider,
		backgroundColor: '#FFFFFF',
	},
	name: { fontSize: 17, lineHeight: 22, fontWeight: '800', color: APP_COLORS.ink },
	slot: { fontSize: 13, lineHeight: 18, color: APP_COLORS.inkMuted },
})
