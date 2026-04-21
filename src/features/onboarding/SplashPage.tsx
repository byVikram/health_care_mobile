import React from 'react'
import {
	Image,
	ImageSourcePropType,
	Pressable,
	StatusBar,
	StyleSheet,
	Text,
	View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'

import Pharmacy from '../../assets/splash/pharamcy.png'
import Ancillary from '../../assets/splash/ancillary.png'
import Laboratory from '../../assets/splash/laboratory.png'
import Radiology from '../../assets/splash/radiology.png'

type SplashPageProps = {
	navigation: {
		navigate: (screen: string) => void
	}
}

type ServiceCard = {
	key: string
	title: string
	subtitle: string
	icon: ImageSourcePropType
	cardColor: string
}

const services: ServiceCard[] = [
	{
		key: 'pharmacy',
		title: 'Pharamcy',
		subtitle: 'login',
		icon: Pharmacy,
		cardColor: '#f8ecde',
	},
	{
		key: 'laboratory',
		title: 'Laboratory',
		subtitle: 'login',
		icon: Laboratory,
		cardColor: '#f2e5f2',
	},
	{
		key: 'radiology',
		title: 'Radiology',
		subtitle: 'login',
		icon: Radiology,
		cardColor: '#e4e9f2',
	},
	{
		key: 'ancillary',
		title: 'Ancillary',
		subtitle: 'login',
		icon: Ancillary,
		cardColor: '#e8f0e5',
	},
]

export default function SplashPage({ navigation }: SplashPageProps) {
	return (
		<SafeAreaView style={styles.safeArea}>
			<StatusBar barStyle="light-content" />

			<View style={styles.backgroundLayer}>
				<View style={styles.topLeftOuter} />
				<View style={styles.topLeftMiddle} />
				<View style={styles.topLeftInner} />
				<View style={styles.bottomRightOuter} />
				<View style={styles.bottomRightMiddle} />
				<View style={styles.bottomRightInner} />
			</View>

			<View style={styles.container}>
				<View style={styles.content}>
					<View style={styles.cardsWrapper}>
						{services.map(({ key, title, subtitle, icon, cardColor }) => (
							<Pressable
								key={key}
								accessibilityRole="button"
								onPress={() => navigation.navigate('Onboarding')}
								style={[styles.card, { backgroundColor: cardColor }]}
							>
								<View style={styles.iconWrap}>
									<Image source={icon} style={styles.iconImage} resizeMode="contain" />
								</View>

								<View style={styles.textWrap}>
									<Text style={styles.title}>{title}</Text>
									<Text style={styles.subtitle}>{subtitle}</Text>
								</View>

								<Ionicons name="chevron-forward" size={20} color="#2a6e72" />
							</Pressable>
						))}
					</View>
				</View>

				<Text style={styles.footer}>{'\u00A9 2025 Whisper ai. All rights reserved.'}</Text>
			</View>
		</SafeAreaView>
	)
}

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: '#0f5b63',
	},
	backgroundLayer: {
		...StyleSheet.absoluteFillObject,
		pointerEvents: 'none',
		backgroundColor: '#0f5b63',
	},
	container: {
		flex: 1,
		paddingHorizontal: 12,
		paddingTop: 28,
		paddingBottom: 30,
		justifyContent: 'space-between',
	},
	content: {
		flex: 1,
		justifyContent: 'center',
	},
	cardsWrapper: {
		marginTop: -6,
		gap: 14,
	},
	card: {
		height: 61,
		borderRadius: 7,
		paddingHorizontal: 12,
		flexDirection: 'row',
		alignItems: 'center',
		borderWidth: 1,
		borderColor: 'rgba(255,255,255,0.45)',
		shadowColor: '#07393e',
		shadowOpacity: 0.12,
		shadowRadius: 5,
		shadowOffset: { width: 0, height: 2 },
		elevation: 2,
	},
	iconWrap: {
		width: 46,
		height: 46,
		alignItems: 'center',
		justifyContent: 'center',
	},
	iconImage: {
		width: 46,
		height: 46,
	},
	textWrap: {
		flex: 1,
		paddingLeft: 12,
	},
	title: {
		fontSize: 16,
		fontWeight: '500',
		color: '#2a2a2a',
	},
	subtitle: {
		marginTop: 2,
		fontSize: 12,
		fontWeight: '400',
		color: '#9a9a9a',
	},
	footer: {
		textAlign: 'center',
		fontSize: 12,
		color: 'rgba(255,255,255,0.65)',
		letterSpacing: 0.2,
		paddingBottom: 4,
	},
	topLeftOuter: {
		position: 'absolute',
		top: -26,
		left: -62,
		width: 220,
		height: 110,
		backgroundColor: 'rgba(141, 187, 187, 0.14)',
		borderBottomRightRadius: 124,
		borderTopRightRadius: 76,
		borderBottomLeftRadius: 38,
		borderTopLeftRadius: 26,
	},
	topLeftMiddle: {
		position: 'absolute',
		top: -12,
		left: -44,
		width: 196,
		height: 94,
		backgroundColor: 'rgba(111, 167, 166, 0.12)',
		borderBottomRightRadius: 118,
		borderTopRightRadius: 70,
		borderBottomLeftRadius: 34,
		borderTopLeftRadius: 24,
	},
	topLeftInner: {
		position: 'absolute',
		top: 4,
		left: -26,
		width: 168,
		height: 76,
		backgroundColor: 'rgba(82, 145, 145, 0.12)',
		borderBottomRightRadius: 104,
		borderTopRightRadius: 62,
		borderBottomLeftRadius: 28,
		borderTopLeftRadius: 20,
	},
	bottomRightOuter: {
		position: 'absolute',
		right: -54,
		bottom: -12,
		width: 224,
		height: 112,
		backgroundColor: 'rgba(141, 187, 187, 0.14)',
		borderTopLeftRadius: 130,
		borderBottomLeftRadius: 42,
		borderTopRightRadius: 44,
		borderBottomRightRadius: 22,
	},
	bottomRightMiddle: {
		position: 'absolute',
		right: -28,
		bottom: 6,
		width: 194,
		height: 96,
		backgroundColor: 'rgba(111, 167, 166, 0.12)',
		borderTopLeftRadius: 118,
		borderBottomLeftRadius: 36,
		borderTopRightRadius: 36,
		borderBottomRightRadius: 18,
	},
	bottomRightInner: {
		position: 'absolute',
		right: -4,
		bottom: 22,
		width: 164,
		height: 80,
		backgroundColor: 'rgba(82, 145, 145, 0.12)',
		borderTopLeftRadius: 102,
		borderBottomLeftRadius: 30,
		borderTopRightRadius: 30,
		borderBottomRightRadius: 16,
	},
})
