import React, { useEffect } from 'react'
import {
	View,
	Text,
	StyleSheet,
	Pressable,
	StatusBar,
	useWindowDimensions,
	Image,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { AuthScreenProps } from '../../navigation/types'
import { ROUTES } from '../../navigation/routes'

type SpecialtySelectionProps = AuthScreenProps<typeof ROUTES.AUTH.SPECIALTY_SELECTION>

export type SpecialtyKey = 'nursing-care' | 'physiotherapy' | 'rehab-care' | 'home-care'

export interface SpecialtyOption {
	key: SpecialtyKey
	label: string
	image: any
}

const SPECIALTY_OPTIONS: SpecialtyOption[] = [
	{
		key: 'nursing-care',
		label: 'Nursing Care',
		image: require('../../assets/ancillary/nursing-care.png'),
	},
	{
		key: 'physiotherapy',
		label: 'Physiotherapy',
		image: require('../../assets/ancillary/physiotherapy.png'),
	},
	{
		key: 'rehab-care',
		label: 'Rehab Care',
		image: require('../../assets/therapeutic/rehabilitation.png'),
	},
	{
		key: 'home-care',
		label: 'Home Care',
		image: require('../../assets/ancillary/home-care.png'),
	},
]

export default function SpecialtySelectionScreen({ navigation, route }: SpecialtySelectionProps) {
	const { width, height } = useWindowDimensions()
	const insets = useSafeAreaInsets()
	const isTablet = width >= 768
	const isLandscape = width > height
	const backButtonOffset = insets.top + (isTablet ? 24 : 16)
	const horizontalPadding = isTablet ? 40 : 20
	const contentMaxWidth = isTablet ? 540 : 400
	const cardHeight = isTablet ? 78 : 68
	const iconBoxSize = isTablet ? 48 : 42
	const imageSize = isTablet ? 34 : 28

	const { roleId, roleLabel } = route.params || {}
	const resolvedRoleId = roleId?.toLowerCase() ?? 'ancillary'
	const resolvedRoleLabel = roleLabel ?? 'Ancillary'

	useEffect(() => {
		if (!roleId && !roleLabel) {
			navigation.replace(ROUTES.AUTH.ROLE_SELECTION)
		}
	}, [roleId, roleLabel, navigation])

	const handleSpecialtySelect = async (key: SpecialtyKey) => {
		try {
			await AsyncStorage.setItem('user_specialty', key)
		} catch (e) {
			console.log('[SpecialtySelectionScreen] Failed to save specialty:', e)
		}

		navigation.navigate(ROUTES.AUTH.ONBOARDING, {
			roleId: resolvedRoleId,
			roleLabel: resolvedRoleLabel,
			specialty: key,
		})
	}

	const handleBack = () => {
		if (navigation.canGoBack()) {
			navigation.goBack()
		} else {
			navigation.replace(ROUTES.AUTH.ROLE_SELECTION)
		}
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
				<Ionicons name="chevron-back" size={isTablet ? 26 : 22} color="#ffffff" />
			</Pressable>

			<View
				style={[
					styles.container,
					{
						paddingHorizontal: horizontalPadding,
						paddingTop: insets.top + (isTablet ? 64 : isLandscape ? 32 : 48),
					},
				]}
			>
				<View style={[styles.content, { maxWidth: contentMaxWidth }]}>
					<Text style={[styles.heading, isTablet && styles.headingTablet]}>Choose Specialty</Text>
					<Text style={[styles.subheading, isTablet && styles.subheadingTablet]}>
						Select how you want to continue
					</Text>

					<View style={styles.cardsWrapper}>
						{SPECIALTY_OPTIONS.map((opt) => (
							<Pressable
								key={opt.key}
								onPress={() => handleSpecialtySelect(opt.key)}
								style={[styles.card, { height: cardHeight }]}
								accessibilityRole="button"
								accessibilityLabel={opt.label}
							>
								<View style={[styles.iconBox, { width: iconBoxSize, height: iconBoxSize }]}>
									<Image
										source={opt.image}
										style={[styles.roleImage, { width: imageSize, height: imageSize }]}
										resizeMode="contain"
									/>
								</View>

								<View style={styles.textWrap}>
									<Text style={[styles.title, isTablet && styles.titleTablet]}>{opt.label}</Text>
								</View>

								<Ionicons
									name="chevron-forward"
									size={isTablet ? 22 : 18}
									color="#134149"
								/>
							</Pressable>
						))}
					</View>
				</View>
			</View>
		</SafeAreaView>
	)
}

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: '#134149',
	},

	container: {
		flex: 1,
		alignItems: 'center',
	},

	content: {
		width: '100%',
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
		backgroundColor: 'rgba(255,255,255,0.12)',
	},

	backButtonTablet: {
		left: 24,
		width: 42,
		height: 42,
		borderRadius: 21,
	},

	heading: {
		fontSize: 26,
		fontWeight: '700',
		color: '#ffffff',
		textAlign: 'left',
		marginBottom: 6,
	},

	headingTablet: {
		fontSize: 32,
		marginBottom: 8,
	},

	subheading: {
		fontSize: 14,
		color: '#d7e7e8',
		textAlign: 'left',
		marginBottom: 24,
	},

	subheadingTablet: {
		fontSize: 16,
		marginBottom: 30,
	},

	cardsWrapper: {
		gap: 14,
	},

	card: {
		borderRadius: 14,
		backgroundColor: '#ffffff',
		paddingHorizontal: 16,
		flexDirection: 'row',
		alignItems: 'center',
		shadowColor: '#000',
		shadowOpacity: 0.10,
		shadowRadius: 5,
		shadowOffset: { width: 0, height: 2 },
		elevation: 3,
	},

	iconBox: {
		borderRadius: 12,
		backgroundColor: 'rgba(19, 65, 73, 0.05)',
		alignItems: 'center',
		justifyContent: 'center',
	},

	roleImage: {
		maxWidth: '100%',
		maxHeight: '100%',
	},

	textWrap: {
		flex: 1,
		paddingLeft: 14,
	},

	title: {
		fontSize: 16,
		fontWeight: '600',
		color: '#1d1d1d',
		letterSpacing: 0.1,
	},

	titleTablet: {
		fontSize: 18,
	},
})
