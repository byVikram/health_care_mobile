// src/features/care-ai/components/CareAiFab.tsx
//
// The "Ask Care AI" button on Home: a 58px dark round button with the sparkle and a pulsing mint ring, sitting
// to the right of the tab bar. For the first few seconds of an app session a small white bubble over it says
// what it is for ("Ask Care AI / Symptoms, medicines, reports").

import React, { useEffect, useRef, useState } from 'react'
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { AppPathIcon } from '../../../components/common'
import { APP_COLORS, CARD_SHADOW } from '../../../config/theme'
import { CARE_AI_ICONS } from '../careAiIcons'

export const CARE_AI_FAB_SIZE = 58
const RING_CYCLE_MS = 1800
const HINT_VISIBLE_MS = 6000
const HINT_MAX_WIDTH = 220

// The hint is a one-off per app session, not per visit to Home.
let hintShown = false

type Props = {
	onPress: () => void
}

export function CareAiFab({ onPress }: Props) {
	const ring = useRef(new Animated.Value(0)).current
	const [hint, setHint] = useState(!hintShown)

	useEffect(() => {
		const pulse = Animated.loop(
			Animated.timing(ring, {
				toValue: 1,
				duration: RING_CYCLE_MS,
				easing: Easing.out(Easing.ease),
				useNativeDriver: true,
			})
		)
		pulse.start()
		return () => pulse.stop()
	}, [ring])

	useEffect(() => {
		if (!hint) return
		hintShown = true
		const timer = setTimeout(() => setHint(false), HINT_VISIBLE_MS)
		return () => clearTimeout(timer)
	}, [hint])

	return (
		<View style={styles.anchor} pointerEvents="box-none">
			{hint ? (
				<View
					style={styles.hintWrap}
					pointerEvents="none"
					accessibilityElementsHidden
					importantForAccessibility="no-hide-descendants"
				>
					<View style={styles.hint}>
						<Text style={styles.hintTitle}>Ask Care AI</Text>
						<Text style={styles.hintSub}>Symptoms, medicines, reports</Text>
						<View style={styles.hintArrow} />
					</View>
				</View>
			) : null}
			<TouchableOpacity
				onPress={onPress}
				activeOpacity={0.85}
				accessibilityRole="button"
				accessibilityLabel="Ask Care AI, your health assistant"
				style={styles.fab}
			>
				<Animated.View
					pointerEvents="none"
					style={[
						styles.ring,
						{
							opacity: ring.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] }),
							transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] }) }],
						},
					]}
				/>
				<AppPathIcon d={CARE_AI_ICONS.sparkle} size={26} strokeWidth={1.9} color={APP_COLORS.mintAccent} />
			</TouchableOpacity>
		</View>
	)
}

const styles = StyleSheet.create({
	anchor: { width: CARE_AI_FAB_SIZE, height: CARE_AI_FAB_SIZE },
	fab: {
		width: CARE_AI_FAB_SIZE,
		height: CARE_AI_FAB_SIZE,
		borderRadius: CARE_AI_FAB_SIZE / 2,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: APP_COLORS.ink,
		borderWidth: 3,
		borderColor: '#FFFFFF',
		...CARD_SHADOW,
	},
	ring: {
		...StyleSheet.absoluteFill,
		borderRadius: CARE_AI_FAB_SIZE / 2,
		borderWidth: 2,
		borderColor: APP_COLORS.mintAccent,
	},
	// The anchor is only as wide as the button, and an absolute child cannot be wider than its parent, so the bubble sits in
	// a wider right-aligned wrapper and takes the width of its text instead of wrapping word by word.
	hintWrap: {
		position: 'absolute',
		right: -6,
		bottom: CARE_AI_FAB_SIZE + 12,
		width: HINT_MAX_WIDTH,
		alignItems: 'flex-end',
	},
	hint: {
		paddingVertical: 8,
		paddingHorizontal: 12,
		borderRadius: 14,
		backgroundColor: '#FFFFFF',
		...CARD_SHADOW,
	},
	hintTitle: { fontSize: 13, lineHeight: 18, fontWeight: '800', color: APP_COLORS.ink },
	hintSub: { fontSize: 11, lineHeight: 15, color: APP_COLORS.inkMuted },
	hintArrow: {
		position: 'absolute',
		right: 30,
		bottom: -5,
		width: 10,
		height: 10,
		backgroundColor: '#FFFFFF',
		transform: [{ rotate: '45deg' }],
	},
})
