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

import Pharmacy from '../../assets/splash/pharmacy.png'
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
	icon: ImageSourcePropType
	cardColor: string
}

const services: ServiceCard[] = [
	{
		key: 'pharmacy',
		title: 'Pharmacy',
		icon: Pharmacy,
		cardColor: '#f8ecde',
	},
	{
		key: 'laboratory',
		title: 'Laboratory',
		icon: Laboratory,
		cardColor: '#f2e5f2',
	},
	{
		key: 'radiology',
		title: 'Radiology',
		icon: Radiology,
		cardColor: '#e4e9f2',
	},
	{
		key: 'ancillary',
		title: 'Ancillary',
		icon: Ancillary,
		cardColor: '#e8f0e5',
	},
]

export default function SplashPage({ navigation }: SplashPageProps) {
	return (
		<SafeAreaView style={styles.safeArea}>
			<StatusBar barStyle="light-content" />

			<View style={styles.container}>
				<View style={styles.content}>
					<View style={styles.cardsWrapper}>
						{services.map(({ key, title, icon, cardColor }) => (
							<Pressable
								key={key}
								onPress={() => navigation.navigate('Onboarding')}
								style={[styles.card, { backgroundColor: cardColor }]}
							>
								{/* ICON */}
								<View style={styles.iconWrap}>
									<Image
										source={icon}
										style={[
											styles.iconImage,
											key === 'radiology' && styles.radiologyIcon, // bigger icon
										]}
										resizeMode="contain"
									/>
								</View>

								{/* TEXT */}
								<View style={styles.textWrap}>
									<Text style={styles.title}>{title}</Text>
								</View>

								{/* ARROW */}
								<Ionicons name="chevron-forward" size={20} color="#2a6e72" />
							</Pressable>
						))}
					</View>
				</View>

				<Text style={styles.footer}>
					{'\u00A9 2025 Whisper ai. All rights reserved.'}
				</Text>
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
		height: 70,
		borderRadius: 7,
		paddingHorizontal: 12,
		flexDirection: 'row',
		alignItems: 'center',
		borderWidth: 1,
		borderColor: 'rgba(255,255,255,0.45)',
		shadowColor: '#134149',
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

	radiologyIcon: {
		width: 52,
		height: 52,
	},

	textWrap: {
		flex: 1,
		paddingLeft: 12,
		justifyContent: 'center',
	},

	title: {
		fontSize: 16,
		fontWeight: '500',
		color: '#2a2a2a',
	},

	footer: {
		textAlign: 'center',
		fontSize: 12,
		color: 'rgba(255,255,255,0.65)',
		letterSpacing: 0.2,
		paddingBottom: 4,
	},
})
