import React, { ReactNode, useEffect, useRef, useState } from 'react'
import {
	AccessibilityInfo,
	Animated,
	Easing,
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
	/** Mic button. Voice search isn't built yet, so without a handler it shows "coming soon". */
	onVoicePress?: () => void
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
		AccessibilityInfo.isReduceMotionEnabled()
			.then((enabled) => mounted && setReduceMotion(enabled))
			.catch(() => undefined)
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

export default function AppSearchBar({
	context,
	placeholder,
	hints,
	value = '',
	onChangeText,
	onSubmit,
	onPress,
	onVoicePress,
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

	const fromContext = context ? SEARCH_CONTEXTS[context] : undefined
	const prompt = placeholder ?? fromContext?.placeholder ?? 'Search'
	const exampleTerms: readonly string[] = hints ?? (placeholder ? [] : (fromContext?.hints ?? []))
	const showHints = exampleTerms.length > 0 && value.length === 0

	const handleMic = () => {
		if (onVoicePress) onVoicePress()
		else showComingSoon('Voice search is coming soon.')
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
					value={value}
					onChangeText={onChangeText}
					onSubmitEditing={onSubmit}
					onFocus={() => setFocused(true)}
					onBlur={() => setFocused(false)}
					placeholder={showHints ? undefined : prompt}
					placeholderTextColor={APP_COLORS.inkMuted}
					editable={canEdit}
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

			{canEdit && value.length > 0 && (
				<Pressable
					onPress={() => onChangeText?.('')}
					hitSlop={8}
					accessibilityRole="button"
					accessibilityLabel="Clear search"
					style={styles.clearBtn}
				>
					<AppPathIcon d={ICONS.clear} size={16} strokeWidth={2.2} color={APP_COLORS.inkMuted} />
				</Pressable>
			)}

			{showMicrophone && (
				<Pressable
					onPress={handleMic}
					accessibilityRole="button"
					accessibilityLabel="Search by voice"
					style={styles.micBtn}
				>
					<AppPathIcon d={ICONS.mic} size={20} strokeWidth={2} color={APP_COLORS.primary} />
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
})
