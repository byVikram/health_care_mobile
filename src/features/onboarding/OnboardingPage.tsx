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
	TouchableOpacity, // ✅ Added
} from 'react-native'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons' // ✅ Added MaterialCommunityIcons
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

const resolvedRoleId = roleId?.toLowerCase() ?? ''
const resolvedRoleLabel = roleLabel ?? ''

	// 🚨 Redirect if no role
	useEffect(() => {
		if (!accessToken && !roleId) {
			navigation.replace(ROUTES.AUTH.ROLE_SELECTION)
		}
	}, [accessToken, roleId, navigation])

	const isAncillary = resolvedRoleLabel.toLowerCase() === 'ancillary' || resolvedRoleId === 'ancillary'
	const [selectedSpecialty, setSelectedSpecialty] = useState<'nursing-care' | 'physiotherapy' | 'rehab-care' | 'elder-day-care'>('nursing-care')

	// ✅ Dynamic slides based on role
	const slides: Slide[] = useMemo(() => {
		if (!resolvedRoleId) return []

		if (isAncillary) {
			const firstSlide: Slide = {
				key: 'specialty-selector',
				description: 'Select your clinical discipline to continue',
				Illustration: () => null,
			}

			const specialtyData = onboardingData[selectedSpecialty] || onboardingData['nursing-care']
			const specialtySlides = specialtyData.screens.map((screen, index) => ({
				key: `${selectedSpecialty}-${index}`,
				description: screen.description,
				Illustration: screen.Illustration,
			}))

			return [firstSlide, ...specialtySlides]
		}

		const roleKey = resolvedRoleId as UserRole
		const roleData = onboardingData[roleKey]

		if (!roleData) return []

		return roleData.screens.map((screen, index) => ({
			key: `${roleKey}-${index}`,
			description: screen.description,
			Illustration: screen.Illustration,
		}))
	}, [resolvedRoleId, isAncillary, selectedSpecialty])

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
				specialty: isAncillary ? selectedSpecialty : undefined,
			})
		}
	}, [accessToken, navigation, resolvedRoleId, resolvedRoleLabel, isAncillary, selectedSpecialty])

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

	const renderSpecialtySelector = () => {
		const options = [
			{ key: 'nursing-care', label: 'Nursing Care', sub: 'Home injections, IV drip setups, vitals logging', icon: 'medical-bag' },
			{ key: 'physiotherapy', label: 'Physiotherapy', sub: 'Joint mobilization, sports injury & stroke rehab', icon: 'run' },
			{ key: 'rehab-care', label: 'Rehabilitation', sub: 'Post-op recovery support & cognitive therapies', icon: 'wheelchair-accessibility' },
			{ key: 'elder-day-care', label: 'Elder Day Care', sub: 'Daily activities logs, meals, safety checks', icon: 'human-cane' },
		] as const

		return (
			<View style={[styles.slide, { width: cardWidth, justifyContent: 'flex-start', paddingTop: 64 }]}>
				<Text style={styles.selectorTitle}>Choose Specialty</Text>
				<Text style={styles.selectorSub}>Select your clinical discipline to continue</Text>

				<View style={styles.selectorGrid}>
					{options.map((opt) => {
						const isSelected = selectedSpecialty === opt.key
						return (
							<TouchableOpacity
								key={opt.key}
								activeOpacity={0.8}
								onPress={() => setSelectedSpecialty(opt.key)}
								style={[styles.selectorCard, isSelected && styles.selectorCardSelected]}
							>
								<View style={[styles.selectorIconBox, isSelected && styles.selectorIconBoxSelected]}>
									<MaterialCommunityIcons
										name={opt.icon as any}
										size={24}
										color={isSelected ? '#ffffff' : '#1f5d65'}
									/>
								</View>
								<View style={styles.selectorTextCol}>
									<Text style={[styles.selectorCardLabel, isSelected && styles.selectorLabelSelected]}>
										{opt.label}
									</Text>
									<Text style={styles.selectorCardSub}>{opt.sub}</Text>
								</View>
								{isSelected && (
									<Ionicons name="checkmark-circle" size={20} color="#ffffff" style={styles.checkIcon} />
								)}
							</TouchableOpacity>
						)
					})}
				</View>
			</View>
		)
	}

	const renderItem = useCallback(
		({ item }: { item: Slide }) => {
			if (item.key === 'specialty-selector') {
				return renderSpecialtySelector()
			}

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
		[cardWidth, illustrationSize, roleLabel, selectedSpecialty]
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
	selectorTitle: {
		fontSize: 24,
		fontWeight: '800',
		color: '#ffffff',
		textAlign: 'center',
		marginBottom: 6,
	},
	selectorSub: {
		fontSize: 14,
		color: '#d7e7e8',
		textAlign: 'center',
		marginBottom: 24,
	},
	selectorGrid: {
		gap: 12,
		width: '100%',
	},
	selectorCard: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: 'rgba(255, 255, 255, 0.08)',
		borderWidth: 1.5,
		borderColor: 'rgba(255, 255, 255, 0.15)',
		borderRadius: 12,
		padding: 14,
		gap: 14,
	},
	selectorCardSelected: {
		backgroundColor: '#ffffff',
		borderColor: '#ffffff',
	},
	selectorIconBox: {
		width: 44,
		height: 44,
		borderRadius: 8,
		backgroundColor: 'rgba(255, 255, 255, 0.15)',
		justifyContent: 'center',
		alignItems: 'center',
	},
	selectorIconBoxSelected: {
		backgroundColor: 'rgba(31, 93, 101, 0.1)',
	},
	selectorTextCol: {
		flex: 1,
	},
	selectorCardLabel: {
		fontSize: 15,
		fontWeight: '700',
		color: '#ffffff',
		marginBottom: 2,
	},
	selectorLabelSelected: {
		color: '#1f5d65',
	},
	selectorCardSub: {
		fontSize: 11,
		color: '#b0d1d4',
	},
	checkIcon: {
		marginLeft: 'auto',
		color: '#1f5d65',
	},
})
