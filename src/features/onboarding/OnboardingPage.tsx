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
import AsyncStorage from '@react-native-async-storage/async-storage'
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

type SpecialtyKey = 'nursing-care' | 'physiotherapy' | 'rehab-care' | 'home-care'

export default function OnboardingPage({ navigation, route }: OnboardingPageProps) {
	const { accessToken } = useAuth()
	const { width, height } = useWindowDimensions()
	const insets = useSafeAreaInsets()
	const isTablet = width >= 768
	const isLandscape = width > height
	const backButtonOffset = insets.top + (isTablet ? 44 : isLandscape ? 24 : 22)

	const flatListRef = useRef<FlatList<Slide>>(null)
	const [activeIndex, setActiveIndex] = useState(0)

	const { roleId, roleLabel, specialty } = route.params || {}

	const resolvedRoleId = roleId?.toLowerCase() ?? ''
	const resolvedRoleLabel = roleLabel ?? ''

	// 🚨 Redirect if no role
	useEffect(() => {
		if (!accessToken && !roleId) {
			navigation.replace(ROUTES.AUTH.ROLE_SELECTION)
		}
	}, [accessToken, roleId, navigation])

	const isAncillary =
		resolvedRoleLabel.toLowerCase() === 'ancillary' || resolvedRoleId === 'ancillary'

	const [activeSpecialty, setActiveSpecialty] = useState<SpecialtyKey>(
		(specialty as SpecialtyKey) || 'nursing-care'
	)

	// Load persisted specialty if previously stored
	useEffect(() => {
		if (isAncillary) {
			if (specialty) {
				setActiveSpecialty(specialty as SpecialtyKey)
			} else {
				AsyncStorage.getItem('user_specialty').then((stored) => {
					if (
						stored &&
						(stored === 'nursing-care' ||
							stored === 'physiotherapy' ||
							stored === 'rehab-care' ||
							stored === 'home-care')
					) {
						setActiveSpecialty(stored as SpecialtyKey)
					}
				})
			}
		}
	}, [isAncillary, specialty])

	// ==========================================
	// SLIDES CONSTRUCTION
	// ==========================================
	const slides: Slide[] = useMemo(() => {
		if (!resolvedRoleId) return []

		if (isAncillary) {
			const specialtyScreens = onboardingData[activeSpecialty]?.screens || []
			return specialtyScreens.map((screen, index) => ({
				key: `ancillary-${activeSpecialty}-${index}`,
				description: screen.description,
				Illustration: screen.Illustration,
			}))
		}

		const roleKey = resolvedRoleId as UserRole
		const roleData = onboardingData[roleKey]

		if (!roleData) return []

		return roleData.screens.map((screen, index) => ({
			key: `${roleKey}-${index}`,
			description: screen.description,
			Illustration: screen.Illustration,
		}))
	}, [resolvedRoleId, isAncillary, activeSpecialty])

	// 🚨 Prevent crash if no slides
	if (!slides.length) return null

	const cardWidth = Math.max(width, 320)
	const illustrationSize = Math.min(cardWidth * 0.62, 250)

	const finishOnboarding = useCallback(async () => {
		if (isAncillary) {
			try {
				await AsyncStorage.setItem('user_specialty', activeSpecialty)
			} catch (e) {
				console.log('[OnboardingPage] Failed to save specialty:', e)
			}
		}

		if (accessToken) {
			navigation.replace(ROUTES.MAIN.TABS)
		} else {
			navigation.replace(ROUTES.AUTH.REGISTER, {
				roleId: resolvedRoleId,
				roleLabel: resolvedRoleLabel,
				...(isAncillary ? { specialty: activeSpecialty } : {}),
			})
		}
	}, [accessToken, navigation, resolvedRoleId, resolvedRoleLabel, isAncillary, activeSpecialty])

	const scrollToIndex = (index: number) => {
		flatListRef.current?.scrollToIndex({
			index,
			animated: true,
		})
		setActiveIndex(index)
	}

	const handleNext = () => {
		if (activeIndex === slides.length - 1) {
			finishOnboarding()
			return
		}

		scrollToIndex(activeIndex + 1)
	}

	const handleSkip = () => {
		finishOnboarding()
	}

	const handleBack = useCallback(() => {
		if (activeIndex > 0) {
			scrollToIndex(activeIndex - 1)
		} else if (navigation.canGoBack()) {
			navigation.goBack()
		} else {
			navigation.replace(ROUTES.AUTH.ROLE_SELECTION)
		}
	}, [activeIndex, navigation])

	const handleMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
		const nextIndex = Math.round(event.nativeEvent.contentOffset.x / cardWidth)

		if (nextIndex !== activeIndex) {
			setActiveIndex(nextIndex)
		}
	}

	const renderItem = ({ item }: { item: Slide }) => {
		const { Illustration } = item

		return (
			<View style={[styles.slide, { width: cardWidth }]}>
				<View style={styles.illustrationArea}>
					<Illustration width={illustrationSize} height={illustrationSize} />
				</View>

				<TextLabel text={item.description} style={styles.description} />
			</View>
		)
	}

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
