import React from 'react'
import { View, StyleSheet, ScrollView, Image, TouchableOpacity, useWindowDimensions } from 'react-native'
import { Text, Button, useTheme } from 'react-native-paper'
import { useNavigation } from '@react-navigation/native'
import { ROUTES } from '../../../navigation/routes'
import type { AppStackParamList } from '../../../navigation/types'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
type NavigationProp = NativeStackNavigationProp<AppStackParamList>

// ─────────────────────────────────────────────
// Card Component
// ─────────────────────────────────────────────
interface ConsultCardProps {
	image: any
	title: string
	description: string
	cardWidth: number
	cardImageHeight: number
	cardGap: number
	onConsult?: () => void
}

function ConsultCard({ image, title, description, cardWidth, cardImageHeight, cardGap, onConsult }: ConsultCardProps) {
	return (
		<TouchableOpacity
			style={[
				styles.cardContainer,
				{ width: cardWidth, marginRight: cardGap },
			]}
			onPress={onConsult}
			activeOpacity={0.8}
		>
			<Image source={image} style={[styles.cardImage, { height: cardImageHeight }]} resizeMode="cover" />

			<View style={styles.cardBody}>
				<Text variant="titleSmall" style={styles.cardTitle}>
					{title}
				</Text>

				<Text numberOfLines={2} style={styles.cardDesc}>
					{description}
				</Text>
			</View>
		</TouchableOpacity>
	)
}

// ─────────────────────────────────────────────
// Data
// ─────────────────────────────────────────────
const consults = [
	{
		id: 1,
		title: 'Dentist',
		description: 'Teething troubles? Schedule a dental checkup',
		image: require('../../../assets/specialties/dentist.png'),
	},
	{
		id: 2,
		title: 'Gynecologist',
		description: "Explore for women's health, pregnancy & infertility treatments",
		image: require('../../../assets/specialties/gynocologist.png'),
	},
	{
		id: 3,
		title: 'Dietitian/Nutrition',
		description: 'Get guidance on eating right, weight management & sports nutrition',
		image: require('../../../assets/specialties/nutrition.png'),
	},
	{
		id: 4,
		title: 'Physiotherapist',
		description: 'Pulled a muscle? Get it treated by a trained physiotherapist',
		image: require('../../../assets/specialties/physiotherapist.png'),
	},
]

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
function ConsultSection() {
	const theme = useTheme()
	const { width } = useWindowDimensions()
	const navigation = useNavigation<NavigationProp>()

	const isTablet = width >= 768

	// Calculate how many cards to show per visible window, with a peeking card
	// to signal that the list is scrollable.
	const HORIZONTAL_PADDING = 16 // container padding on each side
	const CARD_GAP = 12
	const visibleCards = isTablet ? 3.2 : 2.15
	const totalGaps = Math.floor(visibleCards) // gaps between fully-visible cards
	const cardWidth = Math.floor(
		(width - HORIZONTAL_PADDING * 2 - CARD_GAP * totalGaps) / visibleCards,
	)
	const cardImageHeight = Math.floor(cardWidth * 0.68)

	return (
		<View style={styles.sectionContainer}>

			{/* HEADER */}
			<View style={styles.headerRow}>
				<View style={[styles.titleBorder, { borderLeftColor: theme.colors.primary }]}>
					<Text variant="titleMedium" style={styles.mainTitle}>
						Book an Appointment
					</Text>

					<Text variant="bodySmall">Find experienced doctors across all specialties</Text>
				</View>

				<Button
					mode="outlined"
					style={styles.viewAllBtn}
					labelStyle={{ fontSize: 12 }}
					onPress={() =>
					navigation.navigate(ROUTES.STACK.ALL_SPECIALITIES as never)
						}
					
				>
					View All
				</Button>
			</View>

			{/* CARDS */}
			<ScrollView
				horizontal
				showsHorizontalScrollIndicator={false}
				contentContainerStyle={[
					styles.scrollContent,
					{ paddingHorizontal: HORIZONTAL_PADDING },
				]}
			>
				{consults.map((s, index) => (
					<ConsultCard
						key={s.id}
						title={s.title}
						description={s.description}
						image={s.image}
						cardWidth={cardWidth}
						cardImageHeight={cardImageHeight}
						cardGap={index < consults.length - 1 ? CARD_GAP : 0}
						onConsult={() =>
							navigation.navigate(ROUTES.STACK.DOCTOR_SEARCH, {
								query: s.title,
							})
						}
					/>
				))}
			</ScrollView>
		</View>
	)
}

export default React.memo(ConsultSection)

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
	sectionContainer: {
		marginVertical: 16,
	},

	headerRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingHorizontal: 16,
		marginBottom: 16,
	},

	titleBorder: {
		borderLeftWidth: 3,
		paddingLeft: 12,
		flex: 1,
		marginRight: 16,
	},

	mainTitle: {
		fontWeight: 'bold',
		marginBottom: 2,
	},

	viewAllBtn: {
		borderRadius: 20,
	},

	scrollContent: {
		paddingBottom: 4,
	},

	cardContainer: {
		marginBottom: 16,
		backgroundColor: '#fff',
		borderRadius: 16,
		overflow: 'hidden',
		elevation: 2,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.08,
		shadowRadius: 6,
	},

	cardImage: {
		width: '100%',
		backgroundColor: '#f0f4f8',
	},

	cardBody: {
		padding: 12,
	},

	cardTitle: {
		fontWeight: 'bold',
		marginBottom: 4,
	},

	cardDesc: {
		color: '#666',
		fontSize: 12,
	},
})
