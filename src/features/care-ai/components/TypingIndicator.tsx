// src/features/care-ai/components/TypingIndicator.tsx
//
// "Care AI is typing": the small badge and three bouncing dots shown for the beat before a reply lands.

import React, { useEffect, useRef } from 'react'
import { Animated, Easing, StyleSheet, View } from 'react-native'
import { APP_COLORS } from '../../../config/theme'
import { CareAiAvatar } from './CareAiAvatar'

const DOT_COUNT = 3
const DOT_DELAY_MS = 150
const CYCLE_MS = 1100

function Dot({ index }: { index: number }) {
	const progress = useRef(new Animated.Value(0)).current

	useEffect(() => {
		// The stagger runs once, before the loop, so every dot keeps the same period and the wave stays in order.
		const bounce = Animated.sequence([
			Animated.delay(index * DOT_DELAY_MS),
			Animated.loop(
				Animated.sequence([
					Animated.timing(progress, {
						toValue: 1,
						duration: CYCLE_MS * 0.4,
						easing: Easing.inOut(Easing.ease),
						useNativeDriver: true,
					}),
					Animated.timing(progress, {
						toValue: 0,
						duration: CYCLE_MS * 0.4,
						easing: Easing.inOut(Easing.ease),
						useNativeDriver: true,
					}),
					Animated.delay(CYCLE_MS * 0.2),
				])
			),
		])
		bounce.start()
		return () => bounce.stop()
	}, [index, progress])

	return (
		<Animated.View
			style={[
				styles.dot,
				{
					opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0.25, 1] }),
					transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) }],
				},
			]}
		/>
	)
}

export function TypingIndicator() {
	return (
		<View style={styles.row} accessibilityLabel="Care AI is typing" accessibilityLiveRegion="polite">
			<CareAiAvatar size={22} ring={2} iconSize={12} />
			<View style={styles.dots}>
				{Array.from({ length: DOT_COUNT }, (_, i) => (
					<Dot key={i} index={i} />
				))}
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
	dots: { flexDirection: 'row', gap: 4, paddingVertical: 6, paddingHorizontal: 4 },
	dot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: APP_COLORS.primary },
})
