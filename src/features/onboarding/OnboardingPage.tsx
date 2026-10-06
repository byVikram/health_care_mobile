import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Animated, Easing, Pressable, StatusBar, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useAuth } from '../../context/AuthContext'
import type { AppNavigationParamList, AuthStackParamList } from '../../navigation/types'
import { ROUTES } from '../../navigation/routes'
import { APP_COLORS } from '../../config/theme'
import { ICON_PATHS, PathIcon } from '../auth/components/AuthKit'
import { roleVariant } from '../auth/roleDisplay'
import { INTRO_EYEBROW, INTRO_SLIDES } from './introSlides'

type OnboardingPageProps = {
	navigation: NativeStackNavigationProp<AppNavigationParamList, typeof ROUTES.AUTH.ONBOARDING>
	route: RouteProp<AuthStackParamList, typeof ROUTES.AUTH.ONBOARDING>
}

const AUTO_ADVANCE_MS = 5000

export default function OnboardingPage({ navigation, route }: OnboardingPageProps) {
	const { accessToken } = useAuth()
	const { height } = useWindowDimensions()
	const insets = useSafeAreaInsets()
	const [index, setIndex] = useState(0)
	// 0 -> 1 over AUTO_ADVANCE_MS for the current slide; drives the fill of the active top bar.
	const progress = useRef(new Animated.Value(0)).current

	const { roleId, roleLabel, specialty } = route.params || {}
	const resolvedRoleId = roleId?.toLowerCase() ?? ''
	const variant = roleVariant(roleId, roleLabel)
	const slides = INTRO_SLIDES[variant]
	const slide = slides[Math.min(index, slides.length - 1)]
	const isLast = index === slides.length - 1
	const heroHeight = Math.min(430, Math.max(300, height * 0.5))

	// Redirect if no role
	useEffect(() => {
		if (!accessToken && !roleId) {
			navigation.replace(ROUTES.AUTH.ROLE_SELECTION)
		}
	}, [accessToken, roleId, navigation])

	const finishOnboarding = useCallback(async () => {
		if (variant === 'provider' && specialty) {
			try {
				await AsyncStorage.setItem('user_specialty', specialty)
			} catch (e) {
				console.log('[OnboardingPage] Failed to save specialty:', e)
			}
		}

		if (accessToken) {
			navigation.replace(ROUTES.MAIN.TABS)
		} else {
			navigation.replace(ROUTES.AUTH.REGISTER, {
				roleId: resolvedRoleId,
				roleLabel: roleLabel ?? '',
				...(variant === 'provider' && specialty ? { specialty } : {}),
			})
		}
	}, [accessToken, navigation, resolvedRoleId, roleLabel, variant, specialty])

	// Restart the active bar's fill whenever the slide changes (auto or manual).
	useEffect(() => {
		progress.setValue(0)
		const fill = Animated.timing(progress, {
			toValue: 1,
			duration: AUTO_ADVANCE_MS,
			easing: Easing.linear,
			useNativeDriver: false,
		})
		fill.start()
		return () => fill.stop()
	}, [index, progress])

	// Slides 1 and 2 move on after AUTO_ADVANCE_MS; the last slide waits for the user to tap "Create my account".
	// Manual taps change `index`, which restarts the timer for the new slide.
	useEffect(() => {
		if (isLast || (!accessToken && !roleId)) return
		const timer = setTimeout(() => setIndex((i) => i + 1), AUTO_ADVANCE_MS)
		return () => clearTimeout(timer)
	}, [index, isLast, accessToken, roleId])

	const handleBack = () => {
		if (navigation.canGoBack()) {
			navigation.goBack()
		} else {
			navigation.replace(ROUTES.AUTH.ROLE_SELECTION)
		}
	}

	return (
		<View style={styles.container}>
			<StatusBar barStyle="dark-content" />

			<View style={[styles.hero, { height: heroHeight, backgroundColor: slide.tint }]}>
				<View pointerEvents="none" style={styles.circleTop} />
				<View pointerEvents="none" style={styles.circleBottom} />

				{/* floating booking-style card */}
				<View style={[styles.card, { top: heroHeight * 0.41 }]}>
					<View style={styles.cardRow}>
						<View style={[styles.cardIcon, { backgroundColor: slide.tint }]}>
							<PathIcon d={slide.icon} size={24} color={slide.ink} />
						</View>
						<View style={styles.cardText}>
							<Text style={styles.cardTitle}>{slide.cardTitle}</Text>
							<Text style={styles.cardSub}>{slide.cardSub}</Text>
						</View>
					</View>
					<View style={styles.cardFoot}>
						<View style={[styles.chip, { backgroundColor: slide.chipBg }]}>
							<Text style={[styles.chipText, { color: slide.chipFg }]}>{slide.chip}</Text>
						</View>
						<View style={styles.action}>
							<Text style={styles.actionText}>{slide.action}</Text>
						</View>
					</View>
				</View>

				<View style={[styles.badge1, { top: heroHeight * 0.29 }]}>
					<PathIcon d={slide.b1} size={24} color={slide.ink} />
				</View>
				<View style={[styles.badge2, { bottom: 44 }]}>
					<PathIcon d={slide.b2} size={26} color={APP_COLORS.surface} strokeWidth={2.2} />
				</View>
			</View>

			{/* progress + back + skip, over the hero */}
			<View style={[styles.top, { paddingTop: insets.top + 12 }]}>
				<View accessibilityRole="tablist" style={styles.bars}>
					{slides.map((_, i) => (
						<Pressable
							key={i}
							onPress={() => setIndex(i)}
							accessibilityRole="tab"
							accessibilityLabel={`Slide ${i + 1} of ${slides.length}`}
							accessibilityState={{ selected: i === index }}
							hitSlop={{ top: 12, bottom: 12 }}
							style={styles.bar}
						>
							<Animated.View
								style={[
									styles.barFill,
									{
										width:
											i < index
												? '100%'
												: i === index
													? progress.interpolate({
															inputRange: [0, 1],
															outputRange: ['0%', '100%'],
														})
													: '0%',
									},
								]}
							/>
						</Pressable>
					))}
				</View>
				<View style={styles.topRow}>
					<Pressable
						onPress={handleBack}
						accessibilityRole="button"
						accessibilityLabel="Back"
						style={styles.topBack}
					>
						<PathIcon d={ICON_PATHS.back} size={24} color={APP_COLORS.ink} />
					</Pressable>
					<Pressable onPress={finishOnboarding} accessibilityRole="button" style={styles.skip}>
						<Text style={styles.skipText}>Skip</Text>
					</Pressable>
				</View>
			</View>

			<View accessibilityLiveRegion="polite" style={styles.main}>
				<Text style={styles.eyebrow}>{`${INTRO_EYEBROW[variant]} · ${index + 1} OF ${slides.length}`}</Text>
				<Text style={styles.title}>{slide.title}</Text>
				<Text style={styles.body}>{slide.body}</Text>
			</View>

			<View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 16 }]}>
				{index > 0 ? (
					<Pressable onPress={() => setIndex(index - 1)} accessibilityRole="button" style={styles.backBtn}>
						<Text style={styles.backBtnText}>Back</Text>
					</Pressable>
				) : null}
				<Pressable
					onPress={isLast ? finishOnboarding : () => setIndex(index + 1)}
					accessibilityRole="button"
					style={styles.nextBtn}
				>
					<Text style={styles.nextText}>
						{!isLast ? 'Next' : accessToken ? 'Get started' : 'Create my account'}
					</Text>
				</Pressable>
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: APP_COLORS.surface },
	hero: { overflow: 'hidden', borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
	circleTop: {
		position: 'absolute',
		right: -60,
		top: -40,
		width: 220,
		height: 220,
		borderRadius: 110,
		backgroundColor: APP_COLORS.surface,
		opacity: 0.35,
	},
	circleBottom: {
		position: 'absolute',
		left: -50,
		bottom: -70,
		width: 200,
		height: 200,
		borderRadius: 100,
		backgroundColor: APP_COLORS.surface,
		opacity: 0.3,
	},
	card: {
		position: 'absolute',
		left: 40,
		right: 40,
		padding: 16,
		borderRadius: 20,
		backgroundColor: APP_COLORS.surface,
		gap: 12,
		shadowColor: APP_COLORS.shadow,
		shadowOffset: { width: 0, height: 16 },
		shadowOpacity: 0.15,
		shadowRadius: 36,
		elevation: 8,
	},
	cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
	cardIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
	cardText: { flex: 1, minWidth: 0, gap: 2 },
	cardTitle: { fontSize: 15, lineHeight: 20, fontWeight: '800', color: APP_COLORS.ink },
	cardSub: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
	cardFoot: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 8,
		paddingTop: 10,
		borderTopWidth: 1,
		borderStyle: 'dashed',
		borderTopColor: APP_COLORS.divider,
	},
	chip: { paddingVertical: 3, paddingHorizontal: 10, borderRadius: 999 },
	chipText: { fontSize: 12, lineHeight: 16, fontWeight: '800' },
	action: {
		height: 30,
		paddingHorizontal: 12,
		borderRadius: 8,
		backgroundColor: APP_COLORS.primary,
		alignItems: 'center',
		justifyContent: 'center',
	},
	actionText: { fontSize: 12, fontWeight: '800', color: APP_COLORS.surface },
	badge1: {
		position: 'absolute',
		left: 28,
		width: 52,
		height: 52,
		borderRadius: 16,
		backgroundColor: APP_COLORS.surface,
		alignItems: 'center',
		justifyContent: 'center',
		transform: [{ rotate: '-8deg' }],
		shadowColor: APP_COLORS.shadow,
		shadowOffset: { width: 0, height: 8 },
		shadowOpacity: 0.12,
		shadowRadius: 20,
		elevation: 5,
	},
	badge2: {
		position: 'absolute',
		right: 30,
		width: 56,
		height: 56,
		borderRadius: 28,
		backgroundColor: APP_COLORS.primary,
		alignItems: 'center',
		justifyContent: 'center',
		shadowColor: APP_COLORS.shadow,
		shadowOffset: { width: 0, height: 8 },
		shadowOpacity: 0.2,
		shadowRadius: 20,
		elevation: 5,
	},
	top: { position: 'absolute', left: 0, right: 0, top: 0, paddingHorizontal: 16, gap: 10 },
	bars: { flexDirection: 'row', gap: 6 },
	bar: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden', backgroundColor: '#FFFFFFB3' },
	barFill: { height: '100%', borderRadius: 2, backgroundColor: APP_COLORS.primary },
	topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
	topBack: {
		width: 40,
		height: 40,
		marginLeft: -8,
		borderRadius: 20,
		alignItems: 'center',
		justifyContent: 'center',
	},
	skip: {
		height: 36,
		paddingHorizontal: 14,
		borderRadius: 999,
		backgroundColor: '#FFFFFF99',
		alignItems: 'center',
		justifyContent: 'center',
	},
	skipText: { fontSize: 14, fontWeight: '800', color: APP_COLORS.ink },
	main: { flex: 1, paddingHorizontal: 28, paddingTop: 28, gap: 10 },
	eyebrow: { fontSize: 12, lineHeight: 16, fontWeight: '800', letterSpacing: 1, color: APP_COLORS.primary },
	title: { fontSize: 28, lineHeight: 34, fontWeight: '800', letterSpacing: -0.3, color: APP_COLORS.ink },
	body: { fontSize: 16, lineHeight: 24, color: APP_COLORS.inkMuted },
	footer: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 12, paddingHorizontal: 24 },
	backBtn: {
		height: 52,
		paddingHorizontal: 18,
		borderWidth: 1.5,
		borderColor: APP_COLORS.divider,
		borderRadius: 12,
		backgroundColor: APP_COLORS.surface,
		alignItems: 'center',
		justifyContent: 'center',
	},
	backBtnText: { fontSize: 15, fontWeight: '700', color: APP_COLORS.ink },
	nextBtn: {
		flex: 1,
		height: 52,
		borderRadius: 12,
		backgroundColor: APP_COLORS.primary,
		alignItems: 'center',
		justifyContent: 'center',
	},
	nextText: { fontSize: 16, fontWeight: '800', color: APP_COLORS.surface },
})
