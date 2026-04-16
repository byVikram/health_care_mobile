import React, { useCallback, useMemo, useRef, useState } from 'react'
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

import Onboarding1 from '../../assets/Onboarding/onboarding-1.svg'
import Onboarding2 from '../../assets/Onboarding/onboarding-2.svg'
import Onboarding3 from '../../assets/Onboarding/onboarding-3.svg'
import Onboarding4 from '../../assets/Onboarding/onboarding-4.svg'

type OnboardingPageProps = {
	navigation: {
		replace: (screen: string) => void
	}
}

type Slide = {
	key: string
	description: string
	Illustration: React.ComponentType<{ width?: number | string; height?: number | string }>
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
		description: '10 million indians connect with doctors every year on Whisper AI.',
		Illustration: Onboarding4,
	},
]

export default function OnboardingPage({ navigation }: OnboardingPageProps) {
	const { width } = useWindowDimensions()
	const insets = useSafeAreaInsets()
	const flatListRef = useRef<FlatList<Slide>>(null)
	const [activeIndex, setActiveIndex] = useState(0)

	const cardWidth = useMemo(() => Math.max(width, 320), [width])
	const illustrationSize = useMemo(() => Math.min(cardWidth * 0.62, 250), [cardWidth])

	const finishOnboarding = useCallback(() => {
		navigation.replace('Login')
	}, [navigation])

	const scrollToIndex = useCallback(
		(index: number) => {
			flatListRef.current?.scrollToIndex({ index, animated: true })
			setActiveIndex(index)
		},
		[],
	)

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
			const nextIndex = Math.round(event.nativeEvent.contentOffset.x / cardWidth)
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
						<Illustration width={illustrationSize} height={illustrationSize} />
					</View>

					<TextLabel text={item.description} style={styles.description} />
				</View>
			)
		},
		[cardWidth, illustrationSize],
	)

	return (
		<SafeAreaView style={styles.safeArea}>
			<StatusBar barStyle="light-content" />
			<View style={styles.backgroundLayer}>
				<View style={styles.topLeftBlobOuter} />
				<View style={styles.topLeftBlobMiddle} />
				<View style={styles.topLeftBlobInner} />
				<View style={styles.topRightBlobOuter} />
				<View style={styles.topRightBlobInner} />
				<View style={styles.bottomRightBlobOuter} />
				<View style={styles.bottomRightBlobMiddle} />
				<View style={styles.bottomRightBlobInner} />
			</View>

			<View style={styles.container}>
				<View style={styles.topBar}>
					<Pressable
						accessibilityRole="button"
						onPress={handleSkip}
						hitSlop={12}
						style={[styles.skipButton, { marginTop: Math.max(insets.top, 8) + 4 }]}
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
					getItemLayout={(_, index) => ({ index, length: cardWidth, offset: cardWidth * index })}
					style={styles.carousel}
					contentContainerStyle={styles.carouselContent}
				/>

				<View style={styles.footer}>
					<View style={styles.pagination}>
						{slides.map((slide, index) => (
							<View
								key={slide.key}
								style={[
									styles.dot,
									index === activeIndex ? styles.dotActive : styles.dotInactive,
								]}
							/>
						))}
					</View>

					<Pressable accessibilityRole="button" onPress={handleNext} style={styles.nextButton}>
						<TextLabel text="Next" style={styles.nextText} />
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
	slide: {
		flex: 1,
		paddingHorizontal: 20,
		justifyContent: 'center',
	},
	backgroundLayer: {
		...StyleSheet.absoluteFillObject,
		pointerEvents: 'none',
	},
	topLeftBlobOuter: {
		position: 'absolute',
		top: -26,
		left: -30,
		width: 250,
		height: 132,
		borderBottomRightRadius: 170,
		borderTopRightRadius: 88,
		borderBottomLeftRadius: 88,
		borderTopLeftRadius: 34,
		backgroundColor: '#4a8384',
		opacity: 0.18,
	},
	topLeftBlobMiddle: {
		position: 'absolute',
		top: -6,
		left: -12,
		width: 214,
		height: 110,
		borderBottomRightRadius: 148,
		borderTopRightRadius: 80,
		borderBottomLeftRadius: 76,
		borderTopLeftRadius: 30,
		backgroundColor: '#3f7779',
		opacity: 0.2,
	},
	topLeftBlobInner: {
		position: 'absolute',
		top: 16,
		left: 4,
		width: 172,
		height: 84,
		borderBottomRightRadius: 124,
		borderTopRightRadius: 72,
		borderBottomLeftRadius: 62,
		borderTopLeftRadius: 28,
		backgroundColor: '#356d70',
		opacity: 0.24,
	},
	topRightBlobOuter: {
		position: 'absolute',
		top: -30,
		right: -26,
		width: 126,
		height: 86,
		borderBottomLeftRadius: 84,
		borderTopLeftRadius: 52,
		borderBottomRightRadius: 34,
		borderTopRightRadius: 30,
		backgroundColor: '#4f8788',
		opacity: 0.08,
	},
	topRightBlobInner: {
		position: 'absolute',
		top: 8,
		right: 10,
		width: 82,
		height: 38,
		borderBottomLeftRadius: 46,
		borderTopLeftRadius: 30,
		borderBottomRightRadius: 18,
		borderTopRightRadius: 16,
		backgroundColor: '#6a9797',
		opacity: 0.06,
	},
	bottomRightBlobOuter: {
		position: 'absolute',
		right: -34,
		bottom: -24,
		width: 202,
		height: 118,
		borderTopLeftRadius: 154,
		borderBottomLeftRadius: 52,
		borderTopRightRadius: 54,
		borderBottomRightRadius: 18,
		backgroundColor: '#4c8284',
		opacity: 0.13,
	},
	bottomRightBlobMiddle: {
		position: 'absolute',
		right: -4,
		bottom: 4,
		width: 168,
		height: 92,
		borderTopLeftRadius: 132,
		borderBottomLeftRadius: 42,
		borderTopRightRadius: 40,
		borderBottomRightRadius: 16,
		backgroundColor: '#3f7578',
		opacity: 0.18,
	},
	bottomRightBlobInner: {
		position: 'absolute',
		right: 24,
		bottom: 22,
		width: 134,
		height: 70,
		borderTopLeftRadius: 108,
		borderBottomLeftRadius: 32,
		borderTopRightRadius: 30,
		borderBottomRightRadius: 14,
		backgroundColor: '#346a6e',
		opacity: 0.22,
	},
	topBar: {
		alignItems: 'flex-end',
		paddingHorizontal: 20,
		paddingBottom: 6,
		zIndex: 5,
		elevation: 5,
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
		fontWeight: '500',
	},
	skipArrow: {
		color: '#FFFFFF',
		fontSize: 16,
		fontWeight: '500',
		letterSpacing: -1,
	},
	illustrationArea: {
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: 40,
		marginBottom: 20,
		paddingTop: 12,
	},
	description: {
		color: '#ffffff90',
		fontSize: 18,
		lineHeight: 24,
		textAlign: 'center',
		paddingHorizontal: 18,
		marginBottom: 50,
	},
	carousel: {
		flex: 1,
	},
	carouselContent: {
		flexGrow: 1,
	},
	footer: {
		paddingHorizontal: 20,
		paddingBottom: 28,
	},
	pagination: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 40,
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
