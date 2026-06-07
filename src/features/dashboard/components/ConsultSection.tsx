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
	onConsult?: () => void
}

function ConsultCard({ image, title, description, onConsult }: ConsultCardProps) {
	return (
		<TouchableOpacity style={styles.cardContainer} onPress={onConsult} activeOpacity={0.8}>
			<Image source={image} style={styles.cardImage} resizeMode="cover" />

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

	return (
		<View style={styles.sectionContainer}>
			{/* HEADER */}
			<View style={styles.headerRow}>
				<View style={[styles.titleBorder, { borderLeftColor: theme.colors.primary }]}>
					<Text variant="titleMedium" style={styles.mainTitle}>
						Book an appointment
					</Text>

					<Text variant="bodySmall">Find experienced doctors across all specialties</Text>
				</View>

				<Button
					mode="outlined"
					style={styles.viewAllBtn}
					labelStyle={{ fontSize: 12 }}
					onPress={() =>
						navigation.navigate(ROUTES.MAIN.TABS, {
							screen: ROUTES.MAIN.SEARCH,
						})
					}
				>
					View All
				</Button>
			</View>

			{/* CARDS */}
			<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
				{consults.map((s) => (
					<ConsultCard
						key={s.id}
						title={s.title}
						description={s.description}
						image={s.image}
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
		paddingHorizontal: 8,
	},

	cardContainer: {
		width: 160,
		marginHorizontal: 8,
		marginBottom: 16,
		backgroundColor: '#fff',
		borderRadius: 16,
		overflow: 'hidden',
		elevation: 2,
	},

	cardImage: {
		width: '100%',
		height: 120,
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
