import React, { useEffect, useState } from 'react'
import { View, StyleSheet, ScrollView, Image, TouchableOpacity, useWindowDimensions, ActivityIndicator } from 'react-native'
import { Text, Button, useTheme } from 'react-native-paper'
import { useNavigation } from '@react-navigation/native'
import { ROUTES } from '../../../navigation/routes'
import type { AppStackParamList } from '../../../navigation/types'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { getSpecialities } from '../../doctor/doctorService'
import { SpecialityItem } from '../../../types/speciality'

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
// Each card maps to the real specialty by its DB label -- this is only used
// to pick the right illustration/description; the id used for navigation
// always comes from the fetched specialty record, never from here.
const consults = [
	{
		id: 1,
		title: 'Dentist',
		description: 'Teething troubles? Schedule a dental checkup',
		image: require('../../../assets/specialties/dentist.png'),
		specialityLabel: 'Dentistry',
	},
	{
		id: 2,
		title: 'Gynecologist',
		description: "Explore for women's health, pregnancy & infertility treatments",
		image: require('../../../assets/specialties/gynocologist.png'),
		specialityLabel: 'Gynecology',
	},
	{
		id: 3,
		title: 'Dietitian/Nutrition',
		description: 'Get guidance on eating right, weight management & sports nutrition',
		image: require('../../../assets/specialties/nutrition.png'),
		specialityLabel: 'Nutrition & Dietetics',
	},
	{
		id: 4,
		title: 'Physiotherapist',
		description: 'Pulled a muscle? Get it treated by a trained physiotherapist',
		image: require('../../../assets/specialties/physiotherapist.png'),
		specialityLabel: 'Physiotherapy',
	},
]

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
function ConsultSection() {
	const theme = useTheme()
	const { width } = useWindowDimensions()
	const navigation = useNavigation<NavigationProp>()
	const [specialities, setSpecialities] = useState<SpecialityItem[]>([])
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		let active = true
		setLoading(true)
		getSpecialities()
			.then((res) => {
				if (!active) return
				if (res.success && res.data) setSpecialities(res.data)
			})
			.catch((error) => {
				console.error('Error fetching specialities:', error)
			})
			.finally(() => {
				if (active) setLoading(false)
			})
		return () => {
			active = false
		}
	}, [])

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

	const handleConsult = async (specialityLabel: string) => {
		const match = specialities.find(
			(s) =>
				s.label.toLowerCase().trim() === specialityLabel.toLowerCase().trim() ||
				s.label.toLowerCase().includes(specialityLabel.toLowerCase()) ||
				specialityLabel.toLowerCase().includes(s.label.toLowerCase())
		)
		if (match) {
			navigation.navigate(ROUTES.STACK.DOCTOR_SEARCH, {
				specialityId: String(match.id),
				specialityName: match.label,
			})
			return
		}

		try {
			const res = await getSpecialities()
			if (res.success && res.data) {
				const retryMatch = res.data.find(
					(s) =>
						s.label.toLowerCase().trim() === specialityLabel.toLowerCase().trim() ||
						s.label.toLowerCase().includes(specialityLabel.toLowerCase()) ||
						specialityLabel.toLowerCase().includes(s.label.toLowerCase())
				)
				if (retryMatch) {
					navigation.navigate(ROUTES.STACK.DOCTOR_SEARCH, {
						specialityId: String(retryMatch.id),
						specialityName: retryMatch.label,
					})
					return
				}
			}
		} catch (error) {
			console.error('Error fetching specialities in ConsultSection:', error)
		}

		navigation.navigate(ROUTES.STACK.DOCTOR_SEARCH, {
			specialityName: specialityLabel,
		})
	}

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
			{loading ? (
				<View style={{ paddingVertical: 24, alignItems: 'center' }}>
					<ActivityIndicator size="small" color={theme.colors.primary} />
				</View>
			) : (
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
							onConsult={() => handleConsult(s.specialityLabel)}
						/>
					))}
				</ScrollView>
			)}
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
