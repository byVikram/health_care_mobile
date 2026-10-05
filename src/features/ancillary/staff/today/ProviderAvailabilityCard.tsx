// src/features/ancillary/staff/today/ProviderAvailabilityCard.tsx
//
// "Availability" card at the top of the provider Today design: "You're online / offline", what that means, and
// the switch (green card while online). While offline a note says no new requests will arrive but booked ones stay.
import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { AppToggle } from '../../../../components/common'
import { APP_COLORS } from '../../../../config/theme'
import type { ProviderNoun } from '../providerSpecialityCopy'

export type ProviderAvailabilityCardProps = {
	online: boolean
	/** Status loading or a change in flight: the switch is locked. */
	busy: boolean
	noun: ProviderNoun
	onChange: (online: boolean) => void
}

export function ProviderAvailabilityCard({ online, busy, noun, onChange }: ProviderAvailabilityCardProps) {
	return (
		<View style={styles.wrap}>
			<View style={[styles.card, online && styles.cardOnline]}>
				<View style={[styles.dot, online && styles.dotOnline]} />
				<View style={styles.text}>
					<Text style={[styles.title, online && styles.titleOnline]}>
						{online ? 'You’re online' : 'You’re offline'}
					</Text>
					<Text style={styles.sub}>
						{online ? `You’ll get ${noun} requests near you` : `Go online to get ${noun} requests`}
					</Text>
				</View>
				<AppToggle
					value={online}
					onValueChange={onChange}
					showStatusText={false}
					disabled={busy}
					size="small"
					hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
					activeColor={APP_COLORS.success}
					accessibilityLabel={`Taking ${noun} requests`}
				/>
			</View>
			{!online ? (
				<Text style={styles.note}>
					{`You won’t get new ${noun} requests while offline. Booked ${noun}s stay.`}
				</Text>
			) : null}
		</View>
	)
}

const styles = StyleSheet.create({
	wrap: {
		gap: 6,
	},
	card: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		padding: 14,
		borderRadius: 14,
		borderWidth: 1,
		borderColor: APP_COLORS.divider,
		backgroundColor: APP_COLORS.surface,
	},
	cardOnline: {
		borderColor: APP_COLORS.success,
		backgroundColor: APP_COLORS.successBg,
	},
	dot: {
		width: 10,
		height: 10,
		borderRadius: 5,
		backgroundColor: APP_COLORS.inkMuted,
	},
	dotOnline: {
		backgroundColor: APP_COLORS.success,
	},
	text: {
		flex: 1,
		minWidth: 0,
	},
	title: {
		fontSize: 16,
		lineHeight: 22,
		fontWeight: '800',
		color: APP_COLORS.ink,
	},
	titleOnline: {
		color: APP_COLORS.success,
	},
	sub: {
		fontSize: 12,
		lineHeight: 16,
		color: APP_COLORS.inkMuted,
	},
	note: {
		paddingHorizontal: 4,
		fontSize: 12,
		lineHeight: 16,
		color: APP_COLORS.inkMuted,
	},
})

export default ProviderAvailabilityCard
