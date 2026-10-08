// src/features/care-ai/components/Composer.tsx
//
// The message box at the bottom of the chat: add a report (+), type, speak (mic) and send. While listening it
// swaps for the "Listening… speak now" bar with the animated waveform. The disclaimer sits underneath.

import React, { useEffect, useRef } from 'react'
import { Animated, Easing, StyleSheet, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AppButton, AppIconButton, AppPathIcon } from '../../../components/common'
import { APP_COLORS } from '../../../config/theme'
import { CARE_AI_ICONS } from '../careAiIcons'
import { CARE_AI } from '../careAiTheme'

const WAVE_BARS = 5
const WAVE_DELAY_MS = 150
const WAVE_CYCLE_MS = 900

function WaveBar({ index }: { index: number }) {
	const scale = useRef(new Animated.Value(0.35)).current

	useEffect(() => {
		// Stagger once, then loop, so the bars keep one shared period.
		const wave = Animated.sequence([
			Animated.delay(index * WAVE_DELAY_MS),
			Animated.loop(
				Animated.sequence([
					Animated.timing(scale, {
						toValue: 1,
						duration: WAVE_CYCLE_MS / 2,
						easing: Easing.inOut(Easing.ease),
						useNativeDriver: true,
					}),
					Animated.timing(scale, {
						toValue: 0.35,
						duration: WAVE_CYCLE_MS / 2,
						easing: Easing.inOut(Easing.ease),
						useNativeDriver: true,
					}),
				])
			),
		])
		wave.start()
		return () => wave.stop()
	}, [index, scale])

	return <Animated.View style={[styles.waveBar, { transform: [{ scaleY: scale }] }]} />
}

type Props = {
	draft: string
	onChangeDraft: (text: string) => void
	onSend: () => void
	onAttach: () => void
	listening: boolean
	onStartListening: () => void
	onStopListening: () => void
	/** Blocks sending while a reply is on its way. */
	busy: boolean
}

export function Composer({
	draft,
	onChangeDraft,
	onSend,
	onAttach,
	listening,
	onStartListening,
	onStopListening,
	busy,
}: Props) {
	const insets = useSafeAreaInsets()
	const canSend = draft.trim().length > 0 && !busy

	return (
		<View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 14) }]}>
			{listening ? (
				<View style={styles.listening}>
					<View
						style={styles.wave}
						accessibilityElementsHidden
						importantForAccessibility="no-hide-descendants"
					>
						{Array.from({ length: WAVE_BARS }, (_, i) => (
							<WaveBar key={i} index={i} />
						))}
					</View>
					<Text style={styles.listeningText} accessibilityLiveRegion="polite">
						Listening… speak now
					</Text>
					<AppButton size="md" radius={22} onPress={onStopListening}>
						Done
					</AppButton>
				</View>
			) : (
				<View style={styles.box}>
					<AppIconButton
						circle
						size={44}
						variant="soft"
						accessibilityLabel="Add a report or photo"
						onPress={onAttach}
						backgroundColor={CARE_AI.softSurface}
					>
						<AppPathIcon d={CARE_AI_ICONS.plus} size={20} strokeWidth={2.2} color={APP_COLORS.primary} />
					</AppIconButton>
					<TextInput
						value={draft}
						onChangeText={onChangeDraft}
						onSubmitEditing={canSend ? onSend : undefined}
						placeholder="Ask Care AI anything…"
						placeholderTextColor={APP_COLORS.inkMuted}
						returnKeyType="send"
						accessibilityLabel="Message Care AI"
						style={styles.input}
					/>
					<AppIconButton
						circle
						size={44}
						variant="ghost"
						accessibilityLabel="Speak your question"
						onPress={onStartListening}
					>
						<AppPathIcon d={CARE_AI_ICONS.mic} size={20} strokeWidth={2} color={APP_COLORS.primary} />
					</AppIconButton>
					<AppIconButton
						circle
						size={44}
						variant="filled"
						accessibilityLabel="Send"
						disabled={!canSend}
						backgroundColor={canSend ? APP_COLORS.primary : CARE_AI.composerBorder}
						onPress={onSend}
					>
						<AppPathIcon d={CARE_AI_ICONS.send} size={20} strokeWidth={2.4} color="#FFFFFF" />
					</AppIconButton>
				</View>
			)}
			<Text style={styles.disclaimer}>
				General health information, not a diagnosis. In an emergency, call 108.
			</Text>
		</View>
	)
}

const styles = StyleSheet.create({
	wrap: { gap: 8, paddingTop: 8, paddingHorizontal: 12, backgroundColor: APP_COLORS.surface },
	box: {
		minHeight: 56,
		padding: 6,
		borderRadius: 28,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		backgroundColor: '#FFFFFF',
		borderWidth: 1.5,
		borderColor: CARE_AI.composerBorder,
		shadowColor: APP_COLORS.shadow,
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.06,
		shadowRadius: 14,
		elevation: 2,
	},
	input: { flex: 1, minWidth: 0, height: 44, paddingHorizontal: 6, fontSize: 16, color: APP_COLORS.ink },
	listening: {
		height: 56,
		paddingLeft: 18,
		paddingRight: 6,
		borderRadius: 28,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		backgroundColor: APP_COLORS.mint,
	},
	wave: { flexDirection: 'row', alignItems: 'center', gap: 3 },
	waveBar: { width: 3, height: 22, borderRadius: 2, backgroundColor: APP_COLORS.primary },
	listeningText: { flex: 1, fontSize: 14, fontWeight: '700', color: APP_COLORS.primary },
	disclaimer: { textAlign: 'center', fontSize: 11, lineHeight: 15, color: CARE_AI.caption },
})
