// src/components/common/layout/SplashScreen.tsx
//
// Animated launch screen — "Splash C · Services around the logo" in Offline & Models.html.
// Mounted once by App.tsx over the navigator on cold start. Frame 0 is identical to the native splash
// (assets/splash-icon.png: the logo tile at screen centre on primary teal), so the native splash is
// hidden on first layout with no visible jump. The logo beats, service tiles fly out and orbit, then the
// wordmark reveals. The splash stays up until the app is `ready` AND the intro has played
// (MIN_VISIBLE_MS) — or MAX_VISIBLE_MS passes — then fades out and calls `onFinish`.

import React, { useEffect, useRef, useState } from 'react'
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import * as ExpoSplashScreen from 'expo-splash-screen'
import Animated, {
	cancelAnimation,
	Easing,
	useAnimatedStyle,
	useReducedMotion,
	useSharedValue,
	withDelay,
	withRepeat,
	withSequence,
	withTiming,
	type SharedValue,
	type WithTimingConfig,
} from 'react-native-reanimated'
import Svg, { Circle } from 'react-native-svg'
import { AppPathIcon } from '../display/AppIcon'
import { APP_COLORS } from '../../../config/theme'

/** Intro must have played this long before the splash may leave (wordmark fully revealed). */
const MIN_VISIBLE_MS = 2000
/** Safety cap: leave even if the app never reports ready (AppNavigator's own spinner takes over). */
const MAX_VISIBLE_MS = 6000
const EXIT_MS = 250

// Geometry (dp), from the design.
const STAGE = 300
const LOGO = 104
const TILE = 52
const RING_INSET = 18
const WORDMARK_GAP = 36

// Timeline (ms after mount).
const T = {
	beat: 100,
	ring: 300,
	fly: 400,
	flyStagger: 110,
	title: 800,
	tagline: 1100,
	dots: 1300,
	dotStagger: 180,
	orbit: 1600,
}

const EASE_OUT = Easing.bezier(0.2, 0.8, 0.2, 1)
const EASE_FLY = Easing.bezier(0.2, 0.9, 0.3, 1.2) // overshoots, like the design's spFly
const EASE_CSS_OUT = Easing.bezier(0, 0, 0.58, 1)

type Service = { key: string; d: string; x: number; y: number }

// Clockwise from 12 o'clock; paths copied from the design, (x, y) = end offset from the stage centre.
const SERVICES: Service[] = [
	{
		key: 'doctor',
		d: 'M5 3v5a5 5 0 0 0 10 0V3M10 13v3a4 4 0 0 0 8 0v-3M18 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
		x: 0,
		y: -132,
	},
	{ key: 'lab', d: 'M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.7 3h10.6a2 2 0 0 0 1.7-3l-5-9V3M7.5 15h9', x: 114, y: -66 },
	{
		key: 'vaccination',
		d: 'M18 2l4 4M17 7l3-3M19 9l-8.7 8.7a2 2 0 0 1-2.8 0l-2.2-2.2a2 2 0 0 1 0-2.8L14 4M9 11l4 4M5 19l-3 3M14 4l6 6',
		x: 114,
		y: 66,
	},
	{ key: 'physio', d: 'M13 5a2 2 0 1 0 0-.01M7 21l3-7 3 2v5M10 14l-1-4 5-1 3 3 3-1', x: 0, y: 132 },
	{
		key: 'homeCare',
		d: 'M3 11l9-7 9 7M5 10v10h14V10M12 17.5s-3-1.8-3-4a1.5 1.5 0 0 1 3-.8 1.5 1.5 0 0 1 3 .8c0 2.2-3 4-3 4z',
		x: -114,
		y: 66,
	},
	{ key: 'pharmacy', d: 'M10.5 20.5a4.95 4.95 0 0 1-7-7l6-6a4.95 4.95 0 0 1 7 7zM8.5 8.5l7 7', x: -114, y: -66 },
]

type SplashScreenProps = {
	/** True once the app can show its first real screen (auth restored, network state known). */
	ready: boolean
	onFinish: () => void
}

export default function SplashScreen({ ready, onFinish }: SplashScreenProps) {
	const reduceMotion = useReducedMotion()
	const insets = useSafeAreaInsets()
	const [introDone, setIntroDone] = useState(false)
	const [timedOut, setTimedOut] = useState(false)
	const opacity = useSharedValue(1)
	const nativeHidden = useRef(false)
	const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

	useEffect(() => {
		const intro = setTimeout(() => setIntroDone(true), reduceMotion ? 0 : MIN_VISIBLE_MS)
		const cap = setTimeout(() => setTimedOut(true), MAX_VISIBLE_MS)
		return () => {
			clearTimeout(intro)
			clearTimeout(cap)
		}
	}, [reduceMotion])

	useEffect(
		() => () => {
			if (exitTimer.current) clearTimeout(exitTimer.current)
		},
		[]
	)

	const leaving = (ready && introDone) || timedOut

	useEffect(() => {
		if (!leaving || exitTimer.current) return
		opacity.value = withTiming(0, { duration: EXIT_MS })
		exitTimer.current = setTimeout(onFinish, EXIT_MS)
	}, [leaving, onFinish, opacity])

	// Our first frame matches the native splash exactly, so swap them as soon as we've laid out.
	const handleLayout = () => {
		if (nativeHidden.current) return
		nativeHidden.current = true
		ExpoSplashScreen.hideAsync().catch(() => {})
	}

	const rootStyle = useAnimatedStyle(() => ({ opacity: opacity.value }))

	return (
		<Animated.View
			style={[styles.root, rootStyle]}
			onLayout={handleLayout}
			pointerEvents={leaving ? 'none' : 'auto'}
			accessible
			accessibilityRole="progressbar"
			accessibilityLabel="Karola Health is loading"
		>
			<StatusBar style="light" />
			<View style={styles.stage}>
				<OrbitRing reduceMotion={reduceMotion} />
				<ServiceOrbit reduceMotion={reduceMotion} />
				<SplashLogo reduceMotion={reduceMotion} />
			</View>
			<View style={styles.wordmark}>
				<Title reduceMotion={reduceMotion} />
				<Tagline reduceMotion={reduceMotion} />
			</View>
			<View style={[styles.dots, { bottom: insets.bottom + 56 }]}>
				{[0, 1, 2].map((i) => (
					<LoadingDot key={i} delay={T.dots + i * T.dotStagger} reduceMotion={reduceMotion} />
				))}
			</View>
		</Animated.View>
	)
}

// ── Animation helpers ──────────────────────────────────────────────────────────

/** 0 → 1 once after `delay`; starts at 1 when motion is reduced. */
function useEntrance(
	delay: number,
	duration: number,
	reduceMotion: boolean,
	easing: WithTimingConfig['easing'] = EASE_OUT
) {
	const progress = useSharedValue(reduceMotion ? 1 : 0)
	useEffect(() => {
		if (reduceMotion) {
			progress.value = 1
			return
		}
		progress.value = withDelay(delay, withTiming(1, { duration, easing }))
	}, [delay, duration, easing, reduceMotion, progress])
	return progress
}

/** Endless 0 → 360 rotation (degrees) after `delay`; stays at 0 when motion is reduced. */
function useSpin(periodMs: number, delay: number, reduceMotion: boolean) {
	const degrees = useSharedValue(0)
	useEffect(() => {
		if (reduceMotion) return
		degrees.value = withDelay(delay, withRepeat(withTiming(360, { duration: periodMs, easing: Easing.linear }), -1))
		return () => cancelAnimation(degrees)
	}, [delay, periodMs, reduceMotion, degrees])
	return degrees
}

// ── Pieces ─────────────────────────────────────────────────────────────────────

function SplashLogo({ reduceMotion }: { reduceMotion: boolean }) {
	const scale = useSharedValue(1)
	useEffect(() => {
		if (reduceMotion) return
		// Single heartbeat (design's spBeat) — the tile itself is already on screen from the native splash.
		scale.value = withDelay(
			T.beat,
			withSequence(
				withTiming(1.12, { duration: 140, easing: EASE_OUT }),
				withTiming(0.98, { duration: 70 }),
				withTiming(1, { duration: 70 })
			)
		)
	}, [reduceMotion, scale])
	const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))

	return (
		<Animated.View style={[styles.logo, style]}>
			<View style={styles.logoBarV} />
			<View style={styles.logoBarH} />
			<View style={styles.logoDot} />
		</Animated.View>
	)
}

function OrbitRing({ reduceMotion }: { reduceMotion: boolean }) {
	const fade = useEntrance(T.ring, 600, reduceMotion)
	const spin = useSpin(30000, 0, reduceMotion)
	const style = useAnimatedStyle(() => ({ opacity: fade.value, transform: [{ rotate: `${spin.value}deg` }] }))
	const size = STAGE - RING_INSET * 2
	// SVG rather than a dashed border: dashed + borderRadius renders unreliably on Android.
	return (
		<Animated.View style={[styles.ring, style]}>
			<Svg width={size} height={size}>
				<Circle
					cx={size / 2}
					cy={size / 2}
					r={(size - 1.5) / 2}
					fill="none"
					stroke="rgba(255,255,255,0.35)"
					strokeWidth={1.5}
					strokeDasharray="5 5"
				/>
			</Svg>
		</Animated.View>
	)
}

function ServiceOrbit({ reduceMotion }: { reduceMotion: boolean }) {
	const spin = useSpin(24000, T.orbit, reduceMotion)
	const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value}deg` }] }))
	return (
		<Animated.View style={[StyleSheet.absoluteFill, style]}>
			{SERVICES.map((service, i) => (
				<ServiceTile
					key={service.key}
					service={service}
					delay={T.fly + i * T.flyStagger}
					spin={spin}
					reduceMotion={reduceMotion}
				/>
			))}
		</Animated.View>
	)
}

function ServiceTile({
	service,
	delay,
	spin,
	reduceMotion,
}: {
	service: Service
	delay: number
	spin: SharedValue<number>
	reduceMotion: boolean
}) {
	const progress = useEntrance(delay, 650, reduceMotion, EASE_FLY)
	const { x, y } = service
	const flyStyle = useAnimatedStyle(() => ({
		opacity: Math.min(progress.value, 1),
		transform: [
			{ translateX: x * progress.value },
			{ translateY: y * progress.value },
			{ scale: 0.2 + 0.8 * progress.value },
		],
	}))
	// Counter-rotate so the glyph stays upright while the orbit turns.
	const uprightStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${-spin.value}deg` }] }))

	return (
		<Animated.View style={[styles.tileSlot, flyStyle]}>
			<Animated.View style={[styles.tile, uprightStyle]}>
				<AppPathIcon d={service.d} size={24} color="#FFFFFF" strokeWidth={2} />
			</Animated.View>
		</Animated.View>
	)
}

function Title({ reduceMotion }: { reduceMotion: boolean }) {
	const progress = useEntrance(T.title, 600, reduceMotion)
	const style = useAnimatedStyle(() => ({
		opacity: progress.value,
		transform: [{ translateY: 16 * (1 - progress.value) }],
	}))
	return <Animated.Text style={[styles.title, style]}>Karola Health</Animated.Text>
}

function Tagline({ reduceMotion }: { reduceMotion: boolean }) {
	const progress = useEntrance(T.tagline, 900, reduceMotion, EASE_CSS_OUT)
	const width = useSharedValue(0)
	// No clip-path in RN: slide a background-coloured cover off the text, left to right.
	const coverStyle = useAnimatedStyle(() => ({ transform: [{ translateX: width.value * progress.value }] }))
	const handleLayout = (e: LayoutChangeEvent) => {
		width.value = e.nativeEvent.layout.width
	}
	return (
		<View style={styles.taglineClip} onLayout={handleLayout}>
			<Text style={styles.tagline}>Book Doctor Appointments</Text>
			<Animated.View style={[StyleSheet.absoluteFill, styles.taglineCover, coverStyle]} />
		</View>
	)
}

function LoadingDot({ delay, reduceMotion }: { delay: number; reduceMotion: boolean }) {
	const pulse = useSharedValue(reduceMotion ? 1 : 0)
	useEffect(() => {
		if (reduceMotion) return
		// 1.2s loop: bright at 40%, dim from 80% (design's spDot).
		pulse.value = withDelay(
			delay,
			withRepeat(
				withSequence(
					withTiming(1, { duration: 480, easing: Easing.inOut(Easing.ease) }),
					withTiming(0, { duration: 480, easing: Easing.inOut(Easing.ease) }),
					withTiming(0, { duration: 240 })
				),
				-1
			)
		)
		return () => cancelAnimation(pulse)
	}, [delay, reduceMotion, pulse])
	const style = useAnimatedStyle(() => ({
		opacity: 0.25 + 0.75 * pulse.value,
		transform: [{ scale: 0.7 + 0.3 * pulse.value }],
	}))
	return <Animated.View style={[styles.dot, style]} />
}

const styles = StyleSheet.create({
	root: {
		position: 'absolute',
		top: 0,
		right: 0,
		bottom: 0,
		left: 0,
		zIndex: 2000,
		elevation: 2000,
		backgroundColor: APP_COLORS.primary,
	},
	// Centred on the screen (not the safe area) so the logo lands exactly where the native splash drew it.
	stage: {
		position: 'absolute',
		top: '50%',
		left: '50%',
		width: STAGE,
		height: STAGE,
		marginTop: -STAGE / 2,
		marginLeft: -STAGE / 2,
	},
	ring: {
		position: 'absolute',
		top: RING_INSET,
		left: RING_INSET,
		width: STAGE - RING_INSET * 2,
		height: STAGE - RING_INSET * 2,
	},
	tileSlot: {
		position: 'absolute',
		left: (STAGE - TILE) / 2,
		top: (STAGE - TILE) / 2,
		width: TILE,
		height: TILE,
	},
	tile: {
		width: TILE,
		height: TILE,
		borderRadius: 16,
		borderWidth: 1,
		borderColor: 'rgba(255,255,255,0.25)',
		backgroundColor: 'rgba(255,255,255,0.12)',
		alignItems: 'center',
		justifyContent: 'center',
	},
	logo: {
		position: 'absolute',
		left: (STAGE - LOGO) / 2,
		top: (STAGE - LOGO) / 2,
		width: LOGO,
		height: LOGO,
		borderRadius: 29,
		backgroundColor: '#FFFFFF',
		overflow: 'hidden',
	},
	logoBarV: {
		position: 'absolute',
		left: 43,
		top: 22,
		width: 18,
		height: 60,
		borderRadius: 9,
		backgroundColor: APP_COLORS.primary,
	},
	logoBarH: {
		position: 'absolute',
		left: 22,
		top: 43,
		width: 60,
		height: 18,
		borderRadius: 9,
		backgroundColor: APP_COLORS.primary,
	},
	logoDot: {
		position: 'absolute',
		left: 69,
		top: 21,
		width: 16,
		height: 16,
		borderRadius: 8,
		backgroundColor: APP_COLORS.ink,
	},
	wordmark: {
		position: 'absolute',
		top: '50%',
		left: 0,
		right: 0,
		marginTop: STAGE / 2 + WORDMARK_GAP,
		alignItems: 'center',
		gap: 6,
	},
	title: {
		fontSize: 32,
		lineHeight: 36,
		fontWeight: '800',
		letterSpacing: -0.32,
		color: '#FFFFFF',
	},
	taglineClip: {
		overflow: 'hidden',
	},
	tagline: {
		fontSize: 14,
		lineHeight: 20,
		fontWeight: '600',
		color: APP_COLORS.mint,
	},
	taglineCover: {
		backgroundColor: APP_COLORS.primary,
	},
	dots: {
		position: 'absolute',
		left: 0,
		right: 0,
		flexDirection: 'row',
		justifyContent: 'center',
		gap: 8,
	},
	dot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: '#FFFFFF',
	},
})
