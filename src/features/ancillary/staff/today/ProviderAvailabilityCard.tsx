// src/features/ancillary/staff/today/ProviderAvailabilityCard.tsx
//
// "Availability" card at the top of the provider Today design: "You're online / offline", what that means, and
// the 64x36 switch (green card with a ringed dot while online). While offline an amber note says no new
// requests will arrive but booked ones stay.
import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { APP_COLORS } from '../../../../config/theme'
import type { ProviderNoun } from '../providerSpecialityCopy'

export type ProviderAvailabilityCardProps = {
	online: boolean
	/** Status loading or a change in flight: the switch is locked. */
	busy: boolean
	noun: ProviderNoun
	onChange: (online: boolean) => void
}

/** Design-only greens / greys for the status dot (success is the card border / title). */
const DOT_ON = '#1E9E5A'
const DOT_ON_RING = '#1E9E5A33'
const DOT_OFF_RING = '#A3B0B233'

export function ProviderAvailabilityCard({ online, busy, noun, onChange }: ProviderAvailabilityCardProps) {
	return (
		<View style={styles.wrap}>
			<View style={[styles.card, online && styles.cardOnline]} accessibilityLabel="Availability">
				<View style={styles.row}>
					<View style={[styles.dotRing, { backgroundColor: online ? DOT_ON_RING : DOT_OFF_RING }]}>
						<View style={[styles.dot, { backgroundColor: online ? DOT_ON : APP_COLORS.inkDisabled }]} />
					</View>
					<View style={styles.text}>
						<Text style={[styles.title, online && styles.titleOnline]}>
							{online ? 'You’re online' : 'You’re offline'}
						</Text>
						<Text style={styles.sub}>
							{online ? `You’ll get ${noun} requests near you` : `Go online to get ${noun} requests`}
						</Text>
					</View>
					<Pressable
						onPress={() => onChange(!online)}
						disabled={busy}
						hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
						accessibilityRole="switch"
						accessibilityState={{ checked: online, disabled: busy }}
						accessibilityLabel={`Taking ${noun} requests`}
						style={[
							styles.track,
							{ backgroundColor: online ? APP_COLORS.success : APP_COLORS.inkDisabled },
							busy && styles.trackBusy,
						]}
					>
						<View style={[styles.knob, { left: online ? 32 : 4 }]} />
					</Pressable>
				</View>
			</View>
			{!online ? (
				<View style={styles.note}>
					<Text style={styles.noteText}>
						{`You won’t get new ${noun} requests while offline. ${
							noun === 'visit' ? 'Visits' : noun === 'session' ? 'Sessions' : 'Shifts'
						} already booked stay.`}
					</Text>
				</View>
			) : null}
		</View>
	)
}

const styles = StyleSheet.create({
	wrap: {
		gap: 8,
	},
	card: {
		padding: 16,
		borderRadius: 16,
		borderWidth: 2,
		borderColor: APP_COLORS.divider,
		backgroundColor: APP_COLORS.surface,
	},
	cardOnline: {
		borderColor: APP_COLORS.success,
		backgroundColor: APP_COLORS.successBg,
	},
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	// 14px dot with a 5px soft ring (the design's box-shadow ring) -> 24px circle behind it.
	dotRing: {
		width: 24,
		height: 24,
		marginHorizontal: -5,
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
	},
	dot: {
		width: 14,
		height: 14,
		borderRadius: 7,
	},
	text: {
		flex: 1,
		minWidth: 0,
	},
	title: {
		fontSize: 20,
		lineHeight: 26,
		fontWeight: '800',
		color: APP_COLORS.ink,
	},
	titleOnline: {
		color: APP_COLORS.success,
	},
	sub: {
		fontSize: 13,
		lineHeight: 18,
		color: APP_COLORS.inkMuted,
	},
	track: {
		width: 64,
		height: 36,
		borderRadius: 18,
	},
	trackBusy: {
		opacity: 0.7,
	},
	knob: {
		position: 'absolute',
		top: 4,
		width: 28,
		height: 28,
		borderRadius: 14,
		backgroundColor: APP_COLORS.surface,
		shadowColor: APP_COLORS.shadow,
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.3,
		shadowRadius: 3,
		elevation: 2,
	},
	note: {
		padding: 12,
		borderRadius: 12,
		backgroundColor: APP_COLORS.warningBg,
	},
	noteText: {
		fontSize: 13,
		lineHeight: 18,
		fontWeight: '700',
		color: APP_COLORS.warning,
	},
})

export default ProviderAvailabilityCard
