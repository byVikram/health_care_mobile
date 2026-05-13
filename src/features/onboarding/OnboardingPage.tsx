import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react'
import {
	FlatList,
	NativeScrollEvent,
	NativeSyntheticEvent,
	Pressable,
	StatusBar,
	StyleSheet,
	Text,
	TextStyle,
	useWindowDimensions,
	View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'

import { useAuth } from '../../context/AuthContext'
import type { AppNavigationParamList, AuthStackParamList } from '../../navigation/types'
import { ROUTES } from '../../navigation/routes'

import { onboardingData } from '../../constants/onboardingData'
import type { UserRole } from '../../constants/constants'

type OnboardingPageProps = {
	navigation: NativeStackNavigationProp<AppNavigationParamList, typeof ROUTES.AUTH.ONBOARDING>
	route: RouteProp<AuthStackParamList, typeof ROUTES.AUTH.ONBOARDING>
}

type Slide = {
	key: string
	description: string
	Illustration: React.ComponentType<{
		width?: number | string
		height?: number | string
	}>
}

export default function OnboardingPage({ navigation, route }: OnboardingPageProps) {
	const { accessToken } = useAuth()
	const { width } = useWindowDimensions()
	const insets = useSafeAreaInsets()
	const isTablet = width >= 768
	const backButtonOffset = insets.top + 22

	const flatListRef = useRef<FlatList<Slide>>(null)
	const [activeIndex, setActiveIndex] = useState(0)

	const { roleId, roleLabel } = route.params || {}

	const resolvedRoleId = roleId ?? ''
	const resolvedRoleLabel = roleLabel ?? ''

	// 🚨 Redirect if no role
	useEffect(() => {
		if (!accessToken && !roleId) {
			navigation.replace(ROUTES.AUTH.ROLE_SELECTION)
		}
	}, [accessToken, roleId, navigation])

	// ✅ Dynamic slides based on role
	const slides: Slide[] = useMemo(() => {
		if (!resolvedRoleId) return []

		const roleKey = resolvedRoleId as UserRole
		const roleData = onboardingData[roleKey]

		if (!roleData) return []

		return roleData.screens.map((screen, index) => ({
			key: `${roleKey}-${index}`,
			description: screen.description,
			Illustration: screen.Illustration,
		}))
	}, [resolvedRoleId])

	// 🚨 Prevent crash if no slides
	if (!slides.length) return null

	const cardWidth = useMemo(() => Math.max(width, 320), [width])

	const illustrationSize = useMemo(() => Math.min(cardWidth * 0.62, 250), [cardWidth])

	const finishOnboarding = useCallback(() => {
		if (accessToken) {
			navigation.replace(ROUTES.MAIN.TABS)
		} else {
			navigation.replace(ROUTES.AUTH.REGISTER, {
				roleId: resolvedRoleId,
				roleLabel: resolvedRoleLabel,
			})
		}
	}, [accessToken, navigation, resolvedRoleId, resolvedRoleLabel])

	const scrollToIndex = useCallback((index: number) => {
		flatListRef.current?.scrollToIndex({
			index,
			animated: true,
		})
		setActiveIndex(index)
	}, [])

	const handleNext = useCallback(() => {
		if (activeIndex === slides.length - 1) {
			finishOnboarding()
			return
		}

		scrollToIndex(activeIndex + 1)
	}, [activeIndex, slides.length, finishOnboarding, scrollToIndex])

	const handleSkip = useCallback(() => {
		if (activeIndex === slides.length - 1) {
			finishOnboarding()
			return
		}

		scrollToIndex(slides.length - 1)
	}, [activeIndex, slides.length, finishOnboarding, scrollToIndex])

	const handleBack = useCallback(() => {
		if (navigation.canGoBack()) {
			navigation.goBack()
		} else {
			navigation.replace(ROUTES.AUTH.ROLE_SELECTION)
		}
	}, [navigation])

	const handleMomentumScrollEnd = useCallback(
		(event: NativeSyntheticEvent<NativeScrollEvent>) => {
			const nextIndex = Math.round(event.nativeEvent.contentOffset.x / cardWidth)

			if (nextIndex !== activeIndex) {
				setActiveIndex(nextIndex)
			}
		},
		[activeIndex, cardWidth]
	)

	const renderItem = useCallback(
		({ item }: { item: Slide }) => {
			const { Illustration } = item

			return (
				<View style={[styles.slide, { width: cardWidth }]}>
					<View style={styles.illustrationArea}>
						<Illustration width={illustrationSize} height={illustrationSize} />
					</View>

					<TextLabel text={item.description} style={styles.description} />

					{/* {roleLabel ? (
						<Text style={styles.roleBadge}>
							Registering as: {roleLabel}
						</Text>
					) : null} */}
				</View>
			)
		},
		[cardWidth, illustrationSize, roleLabel]
	)

	return (
		<SafeAreaView style={styles.safeArea}>
			<StatusBar barStyle="light-content" />
			<Pressable
				style={[
					styles.backButton,
					{ top: backButtonOffset },
					isTablet && styles.backButtonTablet,
				]}
				onPress={handleBack}
				accessibilityRole="button"
				accessibilityLabel="Go back"
				hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
			>
				<Ionicons name="chevron-back" size={24} color="#ffffff" />
			</Pressable>

			<View style={styles.container}>
				<View style={styles.topBar}>
					<Pressable
						onPress={handleSkip}
						style={[
							styles.skipButton,
							{
								marginTop: Math.max(insets.top, 8) + 4,
							},
						]}
					>
						<View style={styles.skipWrapper}>
							<TextLabel text="Skip" style={styles.skipText} />
							<TextLabel text=">>" style={styles.skipArrow} />
						</View>
					</Pressable>
				</View>

				<FlatList
					ref={flatListRef}
					data={slides}
					renderItem={renderItem}
					keyExtractor={(item) => item.key}
					horizontal
					pagingEnabled
					showsHorizontalScrollIndicator={false}
					bounces={false}
					onMomentumScrollEnd={handleMomentumScrollEnd}
					getItemLayout={(_, index) => ({
						index,
						length: cardWidth,
						offset: cardWidth * index,
					})}
				/>

				<View style={styles.footer}>
					<View style={styles.pagination}>
						{slides.map((slide, index) => (
							<View
								key={slide.key}
								style={[styles.dot, index === activeIndex ? styles.dotActive : styles.dotInactive]}
							/>
						))}
					</View>

					<Pressable onPress={handleNext} style={styles.nextButton}>
						<TextLabel
							text={activeIndex === slides.length - 1 ? 'Get Started' : 'Next'}
							style={styles.nextText}
						/>
					</Pressable>
				</View>
			</View>
		</SafeAreaView>
	)
}

function TextLabel({ text, style }: { text: string; style: TextStyle }) {
	return <Text style={style}>{text}</Text>
}

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: '#134149',
	},
	container: {
		flex: 1,
	},
	topBar: {
		alignItems: 'flex-end',
		paddingHorizontal: 20,
		paddingBottom: 6,
	},
	backButton: {
		position: 'absolute',
		left: 14,
		zIndex: 10,
		width: 36,
		height: 36,
		borderRadius: 18,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: 'rgba(255,255,255,0.10)',
	},
	backButtonTablet: {
		left: 24,
		width: 42,
		height: 42,
		borderRadius: 21,
	},
	skipButton: {
		paddingVertical: 6,
	},
	skipWrapper: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	skipText: {
		color: '#FFFFFF',
		fontSize: 16,
	},
	skipArrow: {
		color: '#FFFFFF',
		fontSize: 16,
	},
	slide: {
		justifyContent: 'center',
		paddingHorizontal: 20,
	},
	illustrationArea: {
		alignItems: 'center',
		marginBottom: 20,
	},
	description: {
		color: '#ffffff90',
		fontSize: 18,
		textAlign: 'center',
		marginBottom: 20,
	},
	roleBadge: {
		textAlign: 'center',
		color: '#fff',
		fontSize: 15,
		fontWeight: '600',
	},
	footer: {
		paddingHorizontal: 20,
		paddingBottom: 28,
	},
	pagination: {
		flexDirection: 'row',
		justifyContent: 'center',
		marginBottom: 30,
		gap: 10,
	},
	dot: {
		width: 18,
		height: 6,
		borderRadius: 999,
	},
	dotActive: {
		backgroundColor: '#ffffff',
	},
	dotInactive: {
		backgroundColor: '#6c9198',
	},
	nextButton: {
		backgroundColor: '#ffffff',
		borderRadius: 6,
		height: 56,
		alignItems: 'center',
		justifyContent: 'center',
	},
	nextText: {
		color: '#1f5d65',
		fontSize: 18,
		fontWeight: '500',
	},
})
