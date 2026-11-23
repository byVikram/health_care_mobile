import React, { ReactNode, useEffect, useRef, useState } from 'react'
import {
	AccessibilityInfo,
	Animated,
	Easing,
	Keyboard,
	Pressable,
	StyleProp,
	StyleSheet,
	Text,
	TextInput,
	TextInputProps,
	View,
	ViewStyle,
} from 'react-native'
import { APP_COLORS } from '../../../config/theme'
import { SEARCH_CONTEXTS, SearchContextKey } from '../../../config/searchContexts'
import { useVoiceSearch } from '../../../hooks/useVoiceSearch'
import { showComingSoon } from '../../../utils/toast'
import { AppPathIcon } from '../display/AppIcon'

// The KarolaHealth search field: a 48px white pill with a search icon, the input, and a mic button behind a
// hairline divider. While empty it shows a rotating `Search “<term>”` hint (a new example every 2.4s) so the
// bar tells the user what this screen can search; the hint disappears as soon as they type.
//
// What to search for comes from `context` (see `config/searchContexts.ts`), so every screen reads from one
// place. `placeholder` / `hints` override it for the few bars whose prompt is built at runtime.
//
// Two modes: editable (give it `value` + `onChangeText`) or tap-through (give it `onPress` and it renders a
// non-editable bar that fires `onPress`, e.g. the dashboard bar that opens the search screen).
//
// Voice: on an editable bar (any role) the mic listens (hooks/useVoiceSearch). What is being said shows in the input while
// listening, but is NOT put in the screen's search text; only the final text is (`onChangeText`, then `onSubmit`), so the
// screen's own search / debounce / filter runs once. The mic pulses while listening and the clear button becomes "cancel" (the
// text the bar had is kept). A tap-through bar's mic calls `onVoicePress`; the screen it opens starts listening through
// `autoStartVoice`. A tap-through bar with no `onVoicePress` opens its search screen, where the bar listens.

const LINE_HEIGHT = 22
const HINT_HOLD_MS = 2400
const HINT_SLIDE_MS = 360

const ICONS = {
	search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4',
	mic: 'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3',
	clear: 'M6 6l12 12M18 6L6 18',
}

export interface AppSearchBarProps {
	/** Which screen / viewer this bar belongs to; supplies the prompt and the rotating example terms. */
	context?: SearchContextKey
	/** Overrides the context prompt (also the accessibility label). Required when there is no `context`. */
	placeholder?: string
	/** Overrides the context's example terms. Pass `[]` to turn the rotation off and show `placeholder`. */
	hints?: readonly string[]
	value?: string
	onChangeText?: (text: string) => void
	onSubmit?: () => void
	/** Tap-through mode: the bar is not editable and a tap fires this instead of focusing it. */
	onPress?: () => void
	/** Mic button on a tap-through bar: what it does instead of the bar's `onPress` (the search screen it opens starts listening). */
	onVoicePress?: () => void
	/** Turn listening on / off for this bar. Default: on for an editable bar. */
	voice?: boolean
	/** Start listening once, as soon as this bar's screen is on screen (a one-time intent: clear it in `onVoiceAutoStarted`). */
	autoStartVoice?: boolean
	onVoiceAutoStarted?: () => void
	/** Sits after the input, before clear / mic (e.g. a spinner while results load). */
	trailing?: ReactNode
	showMicrophone?: boolean
	/** `onDark` sits on the ink header; `onLight` is on the page background and gets a hairline border. */
	tone?: 'onDark' | 'onLight'
	autoFocus?: boolean
	editable?: boolean
	style?: StyleProp<ViewStyle>
	inputProps?: Omit<TextInputProps, 'value' | 'onChangeText' | 'placeholder' | 'editable' | 'autoFocus'>
	testID?: string
	/** Lets the screen reach the input, e.g. to focus it on arrival. */
	inputRef?: React.Ref<TextInput>
}

function RotatingHint({ hints, paused }: { hints: readonly string[]; paused: boolean }) {
	const offset = useRef(new Animated.Value(0)).current
	const step = useRef(0)
	const [reduceMotion, setReduceMotion] = useState(false)
	const hintsKey = hints.join('|')

	useEffect(() => {
		let mounted = true
		const checkReduceMotion = async () => {
			try {
				const enabled = await AccessibilityInfo.isReduceMotionEnabled()
				if (mounted) setReduceMotion(enabled)
			} catch {
				// Unknown: keep the animation.
			}
		}
		void checkReduceMotion()
		return () => {
			mounted = false
		}
	}, [])

	useEffect(() => {
		step.current = 0
		offset.setValue(0)
		if (paused || reduceMotion || hints.length < 2) return
		const timer = setInterval(() => {
			// The list ends on a copy of the first term. When that copy is showing, jump back to the real first term
			// (identical to the eye) before sliding on; doing it here, not in an animation callback, means it can't be
			// missed when frames are paused (a backgrounded app) and the counter can never run past the list.
			if (step.current >= hints.length) {
				step.current = 0
				offset.setValue(0)
			}
			step.current += 1
			Animated.timing(offset, {
				toValue: -step.current * LINE_HEIGHT,
				duration: HINT_SLIDE_MS,
				easing: Easing.inOut(Easing.ease),
				useNativeDriver: true,
			}).start()
		}, HINT_HOLD_MS)
		return () => clearInterval(timer)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [hintsKey, paused, reduceMotion, offset])

	const lines = hints.length > 1 ? [...hints, hints[0]] : hints

	return (
		<View style={styles.hintWindow} pointerEvents="none" importantForAccessibility="no-hide-descendants">
			<Animated.View style={{ transform: [{ translateY: offset }] }}>
				{lines.map((term, i) => (
					<Text key={`${term}-${i}`} style={styles.hintLine} numberOfLines={1}>
						{'Search “'}
						<Text style={styles.hintTerm}>{term}</Text>
						{'”'}
					</Text>
				))}
			</Animated.View>
		</View>
	)
}

/** The mic icon; while listening it pulses and turns red, and for a moment after the text arrives it turns green. */
function MicPulse({ active, done }: { active: boolean; done: boolean }) {
	const scale = useRef(new Animated.Value(1)).current

	useEffect(() => {
		if (!active) {
			scale.setValue(1)
			return
		}
		const loop = Animated.loop(
			Animated.sequence([
				Animated.timing(scale, {
					toValue: 1.25,
					duration: 520,
					easing: Easing.inOut(Easing.ease),
					useNativeDriver: true,
				}),
				Animated.timing(scale, {
					toValue: 1,
					duration: 520,
					easing: Easing.inOut(Easing.ease),
					useNativeDriver: true,
				}),
			])
		)
		loop.start()
		return () => loop.stop()
	}, [active, scale])

	return (
		<Animated.View style={{ transform: [{ scale }] }}>
			<AppPathIcon
				d={ICONS.mic}
				size={20}
				strokeWidth={2}
				color={active ? APP_COLORS.danger : done ? APP_COLORS.success : APP_COLORS.primary}
			/>
		</Animated.View>
	)
}

export default function AppSearchBar({
	context,
	placeholder,
	hints,
	value = '',
	onChangeText,
	onSubmit,
	onPress,
	onVoicePress,
	voice,
	autoStartVoice,
	onVoiceAutoStarted,
	trailing,
	showMicrophone = true,
	tone = 'onLight',
	autoFocus,
	editable = true,
	style,
	inputProps,
	testID,
	inputRef,
}: AppSearchBarProps) {
	const [focused, setFocused] = useState(false)
	const tapThrough = !!onPress
	const canEdit = editable && !tapThrough

	// Voice: only the final text reaches the screen. It is submitted once the screen has the new text (its `onSubmit` may read it).
	const voiceEditable = (voice ?? true) && showMicrophone && canEdit && !!onChangeText
	const submitAfter = useRef<string | null>(null)
	const speech = useVoiceSearch({
		enabled: voiceEditable,
		autoStart: autoStartVoice,
		onAutoStarted: onVoiceAutoStarted,
		onFinal: (text) => {
			if (text === value) {
				onSubmit?.()
				return
			}
			submitAfter.current = text
			onChangeText?.(text)
		},
	})
	useEffect(() => {
		if (submitAfter.current !== null && value === submitAfter.current) {
			submitAfter.current = null
			onSubmit?.()
		}
	}, [value, onSubmit])

	const fromContext = context ? SEARCH_CONTEXTS[context] : undefined
	const prompt = placeholder ?? fromContext?.placeholder ?? 'Search'
	const exampleTerms: readonly string[] = hints ?? (placeholder ? [] : (fromContext?.hints ?? []))
	// While listening the input shows what is being said (not yet the screen's search text).
	const shownValue = speech.active && speech.partial ? speech.partial : value
	const showHints = exampleTerms.length > 0 && shownValue.length === 0 && !speech.active
	const inputPrompt = speech.active ? (speech.partial ? '' : 'Listening…') : prompt

	const handleMic = () => {
		if (voiceEditable) {
			if (speech.active) {
				speech.stop()
			} else {
				Keyboard.dismiss()
				void speech.start()
			}
			return
		}
		if (onVoicePress) onVoicePress()
		else if (onPress) onPress()
		else showComingSoon('Voice search is not available here.')
	}

	const bar = (
		<View
			style={[
				styles.bar,
				tone === 'onLight' && styles.barOnLight,
				focused && { borderColor: tone === 'onDark' ? APP_COLORS.mintAccent : APP_COLORS.primary },
				style,
			]}
		>
			<AppPathIcon d={ICONS.search} size={20} strokeWidth={2.2} color={APP_COLORS.inkMuted} />

			<View style={styles.field}>
				<TextInput
					ref={inputRef}
					value={shownValue}
					onChangeText={onChangeText}
					onSubmitEditing={onSubmit}
					onFocus={() => setFocused(true)}
					onBlur={() => setFocused(false)}
					placeholder={showHints ? undefined : inputPrompt}
					placeholderTextColor={APP_COLORS.inkMuted}
					editable={canEdit && !speech.active}
					autoFocus={autoFocus && canEdit}
					autoCorrect={false}
					returnKeyType="search"
					clearButtonMode="never"
					accessibilityLabel={prompt}
					pointerEvents={tapThrough ? 'none' : 'auto'}
					testID={testID}
					{...inputProps}
					style={[styles.input, inputProps?.style]}
				/>
				{showHints && <RotatingHint hints={exampleTerms} paused={focused} />}
			</View>

			{trailing}

			{speech.active ? (
				<Pressable
					onPress={speech.cancel}
					hitSlop={8}
					accessibilityRole="button"
					accessibilityLabel="Cancel voice search"
					style={styles.clearBtn}
				>
					<AppPathIcon d={ICONS.clear} size={16} strokeWidth={2.2} color={APP_COLORS.inkMuted} />
				</Pressable>
			) : (
				canEdit &&
				value.length > 0 && (
					<Pressable
						onPress={() => onChangeText?.('')}
						hitSlop={8}
						accessibilityRole="button"
						accessibilityLabel="Clear search"
						style={styles.clearBtn}
					>
						<AppPathIcon d={ICONS.clear} size={16} strokeWidth={2.2} color={APP_COLORS.inkMuted} />
					</Pressable>
				)
			)}

			{showMicrophone && (
				<Pressable
					onPress={handleMic}
					accessibilityRole="button"
					accessibilityLabel={speech.active ? 'Stop voice search' : 'Search by voice'}
					accessibilityState={{ busy: speech.active }}
					style={[styles.micBtn, speech.active && styles.micBtnActive]}
				>
					<MicPulse active={speech.active} done={speech.state === 'done'} />
				</Pressable>
			)}
		</View>
	)

	if (!tapThrough) return bar

	return (
		<Pressable onPress={onPress} accessibilityRole="search" accessibilityLabel={prompt}>
			{bar}
		</Pressable>
	)
}

const styles = StyleSheet.create({
	bar: {
		height: 48,
		borderRadius: 9999,
		backgroundColor: APP_COLORS.surface,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		paddingLeft: 16,
		paddingRight: 6,
		// Reserved so the focus ring doesn't shift the content.
		borderWidth: 2,
		borderColor: 'transparent',
	},
	barOnLight: {
		borderColor: APP_COLORS.divider,
		borderWidth: 1,
		// Keep the same inner size as the focused (2px) state.
		paddingLeft: 17,
		paddingRight: 7,
	},
	field: {
		flex: 1,
		minWidth: 0,
		height: 44,
		justifyContent: 'center',
	},
	input: {
		height: 44,
		padding: 0,
		fontSize: 16,
		color: APP_COLORS.ink,
		backgroundColor: 'transparent',
		// react-native-web draws a default focus outline on the inner input
		...({ outlineStyle: 'none', outlineWidth: 0 } as object),
	},
	hintWindow: {
		position: 'absolute',
		left: 0,
		right: 0,
		top: '50%',
		marginTop: -LINE_HEIGHT / 2,
		height: LINE_HEIGHT,
		overflow: 'hidden',
	},
	hintLine: {
		height: LINE_HEIGHT,
		fontSize: 15,
		lineHeight: LINE_HEIGHT,
		color: APP_COLORS.inkMuted,
	},
	hintTerm: {
		fontWeight: '500',
		color: APP_COLORS.ink,
	},
	clearBtn: {
		width: 24,
		height: 24,
		alignItems: 'center',
		justifyContent: 'center',
	},
	micBtn: {
		width: 44,
		height: 40,
		alignItems: 'center',
		justifyContent: 'center',
		borderLeftWidth: 1,
		borderLeftColor: '#E3EAEB',
		borderTopRightRadius: 9999,
		borderBottomRightRadius: 9999,
	},
	micBtnActive: {
		backgroundColor: APP_COLORS.dangerBg,
	},
})
