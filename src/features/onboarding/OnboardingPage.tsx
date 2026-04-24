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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '../../context/AuthContext'

import Onboarding1 from '../../assets/Onboarding/onboarding-1.svg'
import Onboarding2 from '../../assets/Onboarding/onboarding-2.svg'
import Onboarding3 from '../../assets/Onboarding/onboarding-3.svg'
import Onboarding4 from '../../assets/Onboarding/onboarding-4.svg'

type OnboardingPageProps = {
	navigation: {
		replace: (screen: string, params?: any) => void
	}
	route: {
		params?: {
			roleId: string
			roleLabel: string
		}
	}
}

type Slide = {
	key: string
	description: string
	Illustration: React.ComponentType<{
		width?: number | string
		height?: number | string
	}>
}

const slides: Slide[] = [
	{
		key: 'screen-1',
		description: 'Book an appointment for an\nin Clinic consultation',
		Illustration: Onboarding1,
	},
	{
		key: 'screen-2',
		description: 'Book an appointment to consult\n top doctors from your phone.',
		Illustration: Onboarding2,
	},
	{
		key: 'screen-3',
		description: 'Get upto 25% off on medicines,\n health and wellness products.',
		Illustration: Onboarding3,
	},
	{
		key: 'screen-4',
		description: '10 million Indians connect with doctors every year on Whisper AI.',
		Illustration: Onboarding4,
	},
]

export default function OnboardingPage({
	navigation,
	route,
}: OnboardingPageProps) {
	const { accessToken } = useAuth()
	const { width } = useWindowDimensions()
	const insets = useSafeAreaInsets()
	const flatListRef = useRef<FlatList<Slide>>(null)
	const [activeIndex, setActiveIndex] = useState(0)

	const { roleId, roleLabel } = route.params || {}

	useEffect(() => {
		if (!accessToken && !roleId) {
			navigation.replace('RoleSelection')
		}
	}, [accessToken, roleId, navigation])

	const cardWidth = useMemo(() => Math.max(width, 320), [width])
	const illustrationSize = useMemo(
		() => Math.min(cardWidth * 0.62, 250),
		[cardWidth],
	)

	const finishOnboarding = useCallback(() => {
		if (accessToken) {
			navigation.replace('MainTabs')
		} else {
			navigation.replace('Register', {
				roleId,
				roleLabel,
			})
		}
	}, [accessToken, navigation, roleId, roleLabel])

	const scrollToIndex = useCallback((index: number) => {
		flatListRef.current?.scrollToIndex({ index, animated: true })
		setActiveIndex(index)
	}, [])

	const handleNext = useCallback(() => {
		if (activeIndex === slides.length - 1) {
			finishOnboarding()
			return
		}

		scrollToIndex(activeIndex + 1)
	}, [activeIndex, finishOnboarding, scrollToIndex])

	const handleSkip = useCallback(() => {
		if (activeIndex === slides.length - 1) {
			finishOnboarding()
			return
		}

		scrollToIndex(slides.length - 1)
	}, [activeIndex, finishOnboarding, scrollToIndex])

	const handleMomentumScrollEnd = useCallback(
		(event: NativeSyntheticEvent<NativeScrollEvent>) => {
			const nextIndex = Math.round(
				event.nativeEvent.contentOffset.x / cardWidth,
			)

			if (nextIndex !== activeIndex) {
				setActiveIndex(nextIndex)
			}
		},
		[activeIndex, cardWidth],
	)

	const renderItem = useCallback(
		({ item }: { item: Slide }) => {
			const { Illustration } = item

			return (
				<View style={[styles.slide, { width: cardWidth }]}>
					<View style={styles.illustrationArea}>
						<Illustration
							width={illustrationSize}
							height={illustrationSize}
						/>
					</View>

					<TextLabel text={item.description} style={styles.description} />

					{roleLabel ? (
						<Text style={styles.roleBadge}>
							Registering as: {roleLabel}
						</Text>
					) : null}
				</View>
			)
		},
		[cardWidth, illustrationSize, roleLabel],
	)

	return (
		<SafeAreaView style={styles.safeArea}>
			<StatusBar barStyle="light-content" />

			<View style={styles.container}>
				<View style={styles.topBar}>
					<Pressable
						onPress={handleSkip}
						style={[
							styles.skipButton,
							{ marginTop: Math.max(insets.top, 8) + 4 },
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
								style={[
									styles.dot,
									index === activeIndex
										? styles.dotActive
										: styles.dotInactive,
								]}
							/>
						))}
					</View>

					<Pressable onPress={handleNext} style={styles.nextButton}>
						<TextLabel text="Next" style={styles.nextText} />
					</Pressable>
				</View>
			</View>
		</SafeAreaView>
	)
}

function TextLabel({
	text,
	style,
}: {
	text: string
	style: TextStyle
}) {
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