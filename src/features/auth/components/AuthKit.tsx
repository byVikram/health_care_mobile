// features/auth/components/AuthKit.tsx
//
// Building blocks for the login / register / role / intro / legal screens (the "login and register pages"
// design): dark hero and mint headers, brand mark, form field, info note, pinned CTA footer and OTP boxes.
// Colours come from APP_COLORS / TONES -- nothing here is hardcoded to a new palette.

import React, { useEffect, useRef, useState } from 'react'
import {
	ActivityIndicator,
	Animated,
	Easing,
	Keyboard,
	KeyboardEvent,
	LayoutChangeEvent,
	Platform,
	Pressable,
	StatusBar,
	StyleProp,
	StyleSheet,
	Text,
	TextInput,
	TextInputProps,
	useWindowDimensions,
	View,
	ViewStyle,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path } from 'react-native-svg'
import { APP_COLORS } from '../../../config/theme'
import { AppHeaderBackdrop } from '../../../components/common/layout/AppScreenHeader'

/* ------------------------------------------------------------------ icons */

export const ICON_PATHS = {
	phone: 'M8 2h8a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM11 18h2',
	shield: 'M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6zM8.5 12l2.5 2.5 4.5-4.5',
	check: 'M5 12l5 5 9-10',
	back: 'M15 18l-6-6 6-6',
	edit: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
	clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
	person: 'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21v-1a8 8 0 0 1 16 0v1',
	mail: 'M4 6h16v12H4zM4 7l8 6 8-6',
	doctor: 'M5 3v5a5 5 0 0 0 10 0V3M10 13v3a4 4 0 0 0 8 0v-3M18 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
	home: 'M3 11l9-7 9 7M5 10v10h14V10M12 17.5s-3-1.8-3-4a1.5 1.5 0 0 1 3-.8 1.5 1.5 0 0 1 3 .8c0 2.2-3 4-3 4z',
	info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8h.01',
	chevronDown: 'M6 9l6 6 6-6',
} as const

export function PathIcon({
	d,
	size = 20,
	color = APP_COLORS.ink,
	strokeWidth = 2,
}: {
	d: string
	size?: number
	color?: string
	strokeWidth?: number
}) {
	return (
		<Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
			<Path d={d} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
		</Svg>
	)
}

/* ------------------------------------------------------------ brand mark */

export function BrandMark() {
	return (
		<View style={styles.brand} accessibilityRole="image" accessibilityLabel="Karolahealth">
			<View style={[styles.brandBar, { left: 20, top: 10, width: 8, height: 28 }]} />
			<View style={[styles.brandBar, { left: 10, top: 20, width: 28, height: 8 }]} />
			<View style={styles.brandDot} />
		</View>
	)
}

/* --------------------------------------------------------------- headers */

type BackProps = { onBack?: () => void; backLabel?: string }

function BackButton({ onBack, backLabel = 'Back', color = APP_COLORS.ink }: BackProps & { color?: string }) {
	if (!onBack) return <View style={styles.backSlot} />
	return (
		<Pressable
			onPress={onBack}
			accessibilityRole="button"
			accessibilityLabel={backLabel}
			hitSlop={6}
			style={({ pressed }) => [styles.backSlot, pressed && { opacity: 0.6 }]}
		>
			<PathIcon d={ICON_PATHS.back} size={24} color={color} />
		</Pressable>
	)
}

/** Dark teal hero with decorative circles, brand mark, title and subtitle (login, role). */
export function AuthHero({
	title,
	subtitle,
	onBack,
	backLabel,
	height = 232,
}: BackProps & { title: string; subtitle: string; height?: number }) {
	const insets = useSafeAreaInsets()
	return (
		<View style={[styles.hero, { minHeight: height + insets.top, paddingTop: insets.top }]}>
			<StatusBar barStyle="light-content" />
			<AppHeaderBackdrop />
			{onBack ? (
				<View style={[styles.heroBack, { top: insets.top + 8 }]}>
					<BackButton onBack={onBack} backLabel={backLabel} color={APP_COLORS.surface} />
				</View>
			) : null}
			<View style={styles.heroBrand}>
				<BrandMark />
			</View>
			<Text style={styles.heroTitle}>{title}</Text>
			<Text style={styles.heroSubtitle}>{subtitle}</Text>
		</View>
	)
}

/** Mint rounded header: back button, optional "STEP n OF 2" pill, then arbitrary children (OTP, register, legal). */
export function AuthHeaderMint({
	onBack,
	backLabel,
	step,
	totalSteps = 2,
	children,
	style,
}: BackProps & { step?: number; totalSteps?: number; children?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
	const insets = useSafeAreaInsets()
	return (
		<View style={[styles.mint, { paddingTop: insets.top + 8 }, style]}>
			<StatusBar barStyle="dark-content" />
			<View pointerEvents="none" style={styles.mintCircle} />
			<View style={styles.mintRow}>
				<BackButton onBack={onBack} backLabel={backLabel} />
				{step ? (
					<View style={styles.stepWrap} accessibilityLabel={`Step ${step} of ${totalSteps}`}>
						<Text style={styles.stepText}>{`STEP ${step} OF ${totalSteps}`}</Text>
						<View style={styles.stepBars}>
							{Array.from({ length: totalSteps }, (_, i) => (
								<View
									key={i}
									style={[
										styles.stepBar,
										{ backgroundColor: i < step ? APP_COLORS.primary : '#FFFFFFB3' },
									]}
								/>
							))}
						</View>
					</View>
				) : null}
			</View>
			{children}
		</View>
	)
}

/* ----------------------------------------------------------------- field */

type AuthFieldProps = Pick<
	TextInputProps,
	'keyboardType' | 'maxLength' | 'autoComplete' | 'autoCapitalize' | 'autoFocus' | 'textContentType' | 'inputMode'
> & {
	label: string
	icon: keyof typeof ICON_PATHS
	value: string
	onChangeText: (value: string) => void
	placeholder?: string
	prefix?: string
	valid?: boolean
	error?: string
	onBlur?: () => void
}

export function AuthField({
	label,
	icon,
	value,
	onChangeText,
	placeholder,
	prefix,
	valid,
	error,
	onBlur,
	...inputProps
}: AuthFieldProps) {
	const [focused, setFocused] = useState(false)
	const bad = !!error
	const border = bad
		? APP_COLORS.danger
		: valid
			? APP_COLORS.success
			: focused
				? APP_COLORS.primary
				: APP_COLORS.dotInactive
	const iconColor = bad
		? APP_COLORS.danger
		: valid
			? APP_COLORS.success
			: focused
				? APP_COLORS.primary
				: APP_COLORS.border
	return (
		<View style={styles.fieldWrap}>
			<Text style={styles.fieldLabel}>{label}</Text>
			<View
				style={[styles.field, { borderColor: border, backgroundColor: bad ? '#FFF8F7' : APP_COLORS.surface }]}
			>
				<PathIcon d={ICON_PATHS[icon]} size={20} color={iconColor} />
				{prefix ? <Text style={styles.fieldPrefix}>{prefix}</Text> : null}
				<TextInput
					{...inputProps}
					value={value}
					onChangeText={onChangeText}
					placeholder={placeholder}
					placeholderTextColor={APP_COLORS.inkMuted}
					accessibilityLabel={label}
					onFocus={() => setFocused(true)}
					onBlur={() => {
						setFocused(false)
						onBlur?.()
					}}
					selectionColor={APP_COLORS.primary}
					style={styles.fieldInput}
				/>
				{valid && !bad ? (
					<View style={styles.tick} accessibilityLabel="Looks good">
						<PathIcon d={ICON_PATHS.check} size={13} color={APP_COLORS.surface} strokeWidth={3} />
					</View>
				) : null}
			</View>
			{bad ? (
				<Text accessibilityRole="alert" style={styles.fieldError}>
					{error}
				</Text>
			) : null}
		</View>
	)
}

/** Grey strip with a leading icon (shield / info) used under the forms. */
export function InfoNote({ text, icon = 'shield' }: { text: string; icon?: keyof typeof ICON_PATHS }) {
	return (
		<View style={styles.note}>
			<PathIcon d={ICON_PATHS[icon]} size={18} color={APP_COLORS.primary} strokeWidth={2.2} />
			<Text style={styles.noteText}>{text}</Text>
		</View>
	)
}

/* ---------------------------------------------------------------- footer */

export function CtaButton({
	label,
	onPress,
	disabled,
	loading,
}: {
	label: string
	onPress: () => void
	disabled?: boolean
	loading?: boolean
}) {
	const off = !!disabled || !!loading
	return (
		<Pressable
			onPress={onPress}
			disabled={off}
			accessibilityRole="button"
			accessibilityState={{ disabled: off, busy: !!loading }}
			style={({ pressed }) => [
				styles.cta,
				{ backgroundColor: disabled ? APP_COLORS.inkDisabled : APP_COLORS.primary },
				pressed && { opacity: 0.9 },
			]}
		>
			{loading ? <ActivityIndicator color={APP_COLORS.surface} /> : <Text style={styles.ctaText}>{label}</Text>}
		</Pressable>
	)
}

// Space kept between the CTA and the top of the keyboard while it is open.
const KEYBOARD_GAP = 12
const KEYBOARD_ANDROID_MS = 180
const KEYBOARD_FALLBACK_MS = 250

// The height a screen has with the keyboard hidden, remembered across screens: the OTP step opens with the keyboard
// already up (it was open for the phone number), so it could not measure its full height itself.
let lastBaseHeight = { window: 0, value: 0 }

/** Bottom padding of the pinned footer at rest: clear of the home indicator. */
const footerRestingPadding = (bottomInset: number) => Math.max(bottomInset, 12) + 8

/**
 * Screen container whose pinned footer rides up with the keyboard: the footer (the last child, e.g. <AuthFooter>)
 * sits just above the keyboard while it is open, the content above it shrinks to make room, and everything glides
 * back down when the keyboard closes. Put it where a KeyboardAvoidingView would go; it replaces one.
 *
 * It adds an animated spacer under its children. Where the OS already shrinks the window for the keyboard
 * (Android adjustResize) it measures that shrink and lifts only by what is left, so it is never lifted twice.
 */
export function KeyboardLiftView({ style, children }: { style?: StyleProp<ViewStyle>; children: React.ReactNode }) {
	const insets = useSafeAreaInsets()
	const { width, height } = useWindowDimensions()
	const spacer = useRef(new Animated.Value(0)).current
	const spacerRef = useRef(0)
	const keyboardHeight = useRef(0)
	// Height of this view with the keyboard hidden, and its height now: the difference is the OS's own shrink.
	const baseHeight = useRef(lastBaseHeight.window === height ? lastBaseHeight.value : 0)
	const currentHeight = useRef(0)
	const restingPadding = footerRestingPadding(insets.bottom)

	const lift = (duration: number) => {
		const osShrink = Math.max(0, baseHeight.current - currentHeight.current)
		const target =
			keyboardHeight.current > 0
				? Math.max(0, Math.round(keyboardHeight.current - osShrink - (restingPadding - KEYBOARD_GAP)))
				: 0
		if (target === spacerRef.current) return
		spacerRef.current = target
		spacer.stopAnimation()
		if (duration <= 0) {
			spacer.setValue(target)
			return
		}
		Animated.timing(spacer, {
			toValue: target,
			duration,
			easing: Easing.out(Easing.cubic),
			// animates a layout height, so it cannot use the native driver
			useNativeDriver: false,
		}).start()
	}

	useEffect(() => {
		const show = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
		const hide = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'
		const ms = (e?: KeyboardEvent) =>
			Platform.OS === 'ios' ? e?.duration || KEYBOARD_FALLBACK_MS : KEYBOARD_ANDROID_MS
		const onShow = Keyboard.addListener(show, (e) => {
			keyboardHeight.current = e.endCoordinates.height
			lift(ms(e))
		})
		const onHide = Keyboard.addListener(hide, (e) => {
			keyboardHeight.current = 0
			lift(ms(e))
		})
		// Already open when this screen mounts (e.g. coming back from the next step).
		if (Keyboard.isVisible()) {
			keyboardHeight.current = Keyboard.metrics()?.height ?? 0
			lift(0)
		}
		return () => {
			onShow.remove()
			onHide.remove()
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [restingPadding])

	// Rotation / window resize with the keyboard hidden: measure the base height again.
	useEffect(() => {
		if (keyboardHeight.current <= 0) baseHeight.current = 0
	}, [width, height])

	const handleLayout = (e: LayoutChangeEvent) => {
		currentHeight.current = e.nativeEvent.layout.height
		if (keyboardHeight.current <= 0) {
			// the max, not the latest: on Android the window can shrink just before the keyboard event arrives
			baseHeight.current = Math.max(baseHeight.current, currentHeight.current)
			lastBaseHeight = { window: height, value: baseHeight.current }
			return
		}
		lift(Platform.OS === 'ios' ? 0 : KEYBOARD_ANDROID_MS)
	}

	return (
		<View style={[styles.liftRoot, style]} onLayout={handleLayout}>
			{children}
			<Animated.View style={{ height: spacer }} pointerEvents="none" />
		</View>
	)
}

/** Pinned bottom bar for the primary CTA (keeps clear of the home indicator). */
export function AuthFooter({
	children,
	divider = true,
	style,
}: {
	children: React.ReactNode
	divider?: boolean
	style?: StyleProp<ViewStyle>
}) {
	const insets = useSafeAreaInsets()
	return (
		<View
			style={[
				styles.footer,
				{ paddingBottom: footerRestingPadding(insets.bottom) },
				divider && styles.footerDivider,
				style,
			]}
		>
			{children}
		</View>
	)
}

/** "By continuing you agree to our Terms and Privacy policy." with both words linking to the legal screen. */
export function TermsLine({
	onOpen,
	trailing,
}: {
	onOpen: (tab: 'Terms' | 'Privacy') => void
	trailing?: React.ReactNode
}) {
	return (
		<Text style={styles.terms}>
			By continuing you agree to our{' '}
			<Text style={styles.termsLink} onPress={() => onOpen('Terms')} accessibilityRole="link">
				Terms
			</Text>{' '}
			and{' '}
			<Text style={styles.termsLink} onPress={() => onOpen('Privacy')} accessibilityRole="link">
				Privacy policy
			</Text>
			.{trailing}
		</Text>
	)
}

/* ------------------------------------------------------------- OTP boxes */

export const OTP_LENGTH = 6

/**
 * Six display boxes over one invisible input, so SMS auto-fill (`sms-otp` / `oneTimeCode`), paste and the
 * numeric keypad all work as a single field.
 */
export function OtpBoxes({
	value,
	onChange,
	error,
	success,
	autoFocus,
}: {
	value: string
	onChange: (value: string) => void
	error?: boolean
	success?: boolean
	autoFocus?: boolean
}) {
	const [focused, setFocused] = useState(false)
	const digits = value.split('')
	return (
		<View style={styles.otpRow}>
			{Array.from({ length: OTP_LENGTH }, (_, i) => {
				const has = i < digits.length
				const current = focused && i === digits.length && !success
				const borderColor = error
					? APP_COLORS.danger
					: success
						? APP_COLORS.success
						: current
							? APP_COLORS.primary
							: has
								? APP_COLORS.mintAccent
								: APP_COLORS.divider
				return (
					<View
						key={i}
						style={[
							styles.otpBox,
							{
								borderColor,
								backgroundColor: error ? APP_COLORS.dangerBg : has ? '#F2F8F8' : APP_COLORS.surface,
							},
							current && ({ boxShadow: '0 0 0 4px #2B6F711F' } as ViewStyle),
						]}
					>
						<Text style={styles.otpDigit}>{digits[i] ?? ''}</Text>
					</View>
				)
			})}
			<TextInput
				value={value}
				onChangeText={(t) => onChange(t.replace(/\D/g, '').slice(0, OTP_LENGTH))}
				keyboardType="number-pad"
				inputMode="numeric"
				maxLength={OTP_LENGTH}
				textContentType="oneTimeCode"
				autoComplete="sms-otp"
				autoFocus={autoFocus}
				onFocus={() => setFocused(true)}
				onBlur={() => setFocused(false)}
				caretHidden
				accessibilityLabel="6-digit code"
				style={styles.otpHiddenInput}
			/>
		</View>
	)
}

/* ---------------------------------------------------------------- styles */

const styles = StyleSheet.create({
	brand: { width: 48, height: 48, borderRadius: 13, backgroundColor: APP_COLORS.surface },
	brandBar: { position: 'absolute', borderRadius: 8, backgroundColor: APP_COLORS.primary },
	brandDot: {
		position: 'absolute',
		left: 32,
		top: 10,
		width: 7,
		height: 7,
		borderRadius: 4,
		backgroundColor: APP_COLORS.mintAccent,
	},

	backSlot: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },

	hero: {
		overflow: 'hidden',
		backgroundColor: APP_COLORS.ink,
		paddingHorizontal: 24,
		paddingBottom: 28,
		justifyContent: 'flex-end',
		gap: 6,
	},
	heroBack: { position: 'absolute', left: 8, zIndex: 2 },
	heroBrand: { marginBottom: 10 },
	heroTitle: { fontSize: 28, lineHeight: 34, fontWeight: '800', color: APP_COLORS.surface },
	heroSubtitle: { fontSize: 15, lineHeight: 22, color: APP_COLORS.mint },

	mint: {
		overflow: 'hidden',
		backgroundColor: APP_COLORS.mint,
		borderBottomLeftRadius: 28,
		borderBottomRightRadius: 28,
		paddingHorizontal: 24,
		paddingBottom: 24,
		gap: 14,
	},
	mintCircle: {
		position: 'absolute',
		right: -50,
		top: -60,
		width: 190,
		height: 190,
		borderRadius: 95,
		backgroundColor: APP_COLORS.surface,
		opacity: 0.45,
	},
	mintRow: {
		height: 44,
		marginLeft: -12,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	stepWrap: { flexDirection: 'row', alignItems: 'center', gap: 10 },
	stepText: { fontSize: 12, fontWeight: '800', color: APP_COLORS.primary },
	stepBars: { flexDirection: 'row', gap: 6, width: 72 },
	stepBar: { flex: 1, height: 4, borderRadius: 2 },

	fieldWrap: { gap: 6 },
	fieldLabel: { fontSize: 14, lineHeight: 20, fontWeight: '700', color: APP_COLORS.ink },
	field: {
		height: 56,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		paddingHorizontal: 14,
		borderWidth: 1.5,
		borderRadius: 14,
	},
	fieldPrefix: {
		paddingRight: 10,
		marginRight: 2,
		borderRightWidth: 1.5,
		borderRightColor: APP_COLORS.divider,
		fontSize: 17,
		fontWeight: '800',
		color: APP_COLORS.ink,
	},
	fieldInput: { flex: 1, minWidth: 0, height: 52, padding: 0, fontSize: 17, color: APP_COLORS.ink },
	tick: {
		width: 22,
		height: 22,
		borderRadius: 11,
		backgroundColor: APP_COLORS.success,
		alignItems: 'center',
		justifyContent: 'center',
	},
	fieldError: { fontSize: 13, lineHeight: 18, fontWeight: '600', color: APP_COLORS.danger },

	note: {
		flexDirection: 'row',
		gap: 10,
		padding: 12,
		paddingHorizontal: 14,
		borderRadius: 12,
		backgroundColor: APP_COLORS.pageBg,
	},
	noteText: { flex: 1, fontSize: 13, lineHeight: 18, color: '#3D5357' },

	liftRoot: { flex: 1 },
	footer: { paddingTop: 12, paddingHorizontal: 24, gap: 10, backgroundColor: APP_COLORS.surface },
	footerDivider: { borderTopWidth: 1, borderTopColor: '#EEF2F2' },
	cta: { height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
	ctaText: { fontSize: 16, fontWeight: '800', color: APP_COLORS.surface },
	terms: { fontSize: 12, lineHeight: 17, color: APP_COLORS.inkMuted, textAlign: 'center' },
	termsLink: { fontWeight: '700', color: APP_COLORS.primary },

	otpRow: { flexDirection: 'row', gap: 8 },
	otpBox: {
		flex: 1,
		height: 60,
		borderRadius: 14,
		borderWidth: 2,
		alignItems: 'center',
		justifyContent: 'center',
	},
	otpDigit: { fontSize: 26, fontWeight: '800', color: APP_COLORS.ink },
	otpHiddenInput: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0, fontSize: 16 },
})
