// src/components/common/display/AppTimerBadge.tsx
//
// Elapsed-time badge from the "Visit in progress" header: 12% white pill (radius 10) with an 8px
// mintAccent dot and a 14px 800 tabular "mm:ss" (or "h:mm:ss") counting up from `startedAt`, ticking
// every second. For dark (primary / ink) headers.

import React, { useEffect, useState } from 'react'
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { APP_COLORS } from '../../../config/theme'

export const formatElapsed = (totalSeconds: number) => {
	const s = Math.max(0, Math.floor(totalSeconds))
	const h = Math.floor(s / 3600)
	const m = Math.floor(s / 60) % 60
	const pad = (x: number) => String(x).padStart(2, '0')
	return `${h ? `${h}:` : ''}${pad(m)}:${pad(s % 60)}`
}

export type AppTimerBadgeProps = {
	/** ISO timestamp the timer counts from. Nothing renders without it. */
	startedAt?: string | null
	style?: StyleProp<ViewStyle>
}

export function AppTimerBadge({ startedAt, style }: AppTimerBadgeProps) {
	const startMs = startedAt ? new Date(startedAt).getTime() : NaN
	const [nowMs, setNowMs] = useState(() => Date.now())

	useEffect(() => {
		if (!Number.isFinite(startMs)) return
		const t = setInterval(() => setNowMs(Date.now()), 1000)
		return () => clearInterval(t)
	}, [startMs])

	if (!Number.isFinite(startMs)) return null
	const label = formatElapsed((nowMs - startMs) / 1000)
	return (
		<View style={[styles.badge, style]} accessibilityRole="timer" accessibilityLabel={`Elapsed ${label}`}>
			<View style={styles.dot} />
			<Text style={styles.text}>{label}</Text>
		</View>
	)
}

const styles = StyleSheet.create({
	badge: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		paddingVertical: 6,
		paddingHorizontal: 10,
		borderRadius: 10,
		backgroundColor: `${APP_COLORS.surface}1F`,
	},
	dot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: APP_COLORS.mintAccent,
	},
	text: {
		fontSize: 14,
		lineHeight: 20,
		fontWeight: '800',
		color: APP_COLORS.surface,
		fontVariant: ['tabular-nums'],
	},
})

export default AppTimerBadge
