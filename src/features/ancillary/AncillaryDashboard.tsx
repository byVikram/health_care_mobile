import React from 'react'
import {
	ImageBackground,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
	useWindowDimensions,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { ROUTES } from '../../navigation/routes'

interface DashboardCard {
	key: string
	title: string
	subtitle: string
	iconName: keyof typeof MaterialCommunityIcons.glyphMap
	bgColor: string
	iconColor: string
}

const CARDS: DashboardCard[] = [
	{
		key: 'nursing-care',
		title: 'Nursing Care',
		subtitle: 'Professional nursing services at your doorstep',
		iconName: 'medical-bag',
		bgColor: '#EAF6F6',
		iconColor: '#2B6F71',
	},
	{
		key: 'physiotherapy',
		title: 'Physiotherapy',
		subtitle: 'Pain relief & mobility restoration sessions',
		iconName: 'walk',
		bgColor: '#EEF2FF',
		iconColor: '#4F46E5',
	},
	{
		key: 'rehab-care',
		title: 'Rehab Care',
		subtitle: 'Neuro, stroke, and cardiac rehab specialists',
		iconName: 'heart-pulse',
		bgColor: '#ECFDF5',
		iconColor: '#059669',
	},
	{
		key: 'elder-day-care',
		title: 'Elder Day Care',
		subtitle: 'Companionship & vital setup care for seniors',
		iconName: 'human-cane',
		bgColor: '#FFF7ED',
		iconColor: '#D97706',
	},
]

export default function AncillaryDashboard() {
	const navigation = useNavigation<any>()
	const { width } = useWindowDimensions()
	const isTablet = width >= 768

	const handleCardPress = (card: DashboardCard) => {
		navigation.navigate(ROUTES.STACK.ANCILLARY_SERVICES, {
			serviceKey: card.key,
			serviceLabel: card.title,
		})
	}

	return (
		<ScrollView style={styles.container} contentContainerStyle={styles.content}>
			{/* Banner Card */}
			<ImageBackground
				source={{ uri: 'https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?auto=format&fit=crop&q=80&w=600' }}
				style={[styles.banner, isTablet && styles.bannerTablet]}
				imageStyle={styles.bannerImage}
			>
				<View style={styles.bannerOverlay}>
					<View style={styles.badge}>
						<Text style={styles.badgeText}>Premium Care</Text>
					</View>
					<Text style={styles.bannerTitle}>Complete Home Healthcare</Text>
					<Text style={styles.bannerSub}>Professional clinicians dispatched instantly to you</Text>
				</View>
			</ImageBackground>

			{/* Search */}
			<View style={styles.searchBar}>
				<Ionicons name="search" size={20} color="#94A3B8" style={styles.searchIcon} />
				<TextInput
					style={styles.searchInput}
					placeholder="Search home care, injections, physio..."
					placeholderTextColor="#94A3B8"
				/>
			</View>

			{/* Services Section */}
			<Text style={styles.sectionTitle}>Ancillary Healthcare Services</Text>
			<Text style={styles.sectionDesc}>Select a category to view procedures and available providers</Text>

			<View style={[styles.grid, isTablet && styles.gridTablet]}>
				{CARDS.map((card) => (
					<TouchableOpacity
						key={card.key}
						style={[styles.card, { width: isTablet ? '48%' : '100%' }]}
						onPress={() => handleCardPress(card)}
						activeOpacity={0.9}
					>
						<View style={[styles.iconCircle, { backgroundColor: card.bgColor }]}>
							<MaterialCommunityIcons name={card.iconName} size={28} color={card.iconColor} />
						</View>
						<View style={styles.textContainer}>
							<Text style={styles.cardTitle}>{card.title}</Text>
							<Text style={styles.cardSub} numberOfLines={2}>
								{card.subtitle}
							</Text>
						</View>
						<Ionicons name="chevron-forward" size={18} color="#94A3B8" style={styles.chevron} />
					</TouchableOpacity>
				))}
			</View>

			{/* Safe Trust Banner */}
			<View style={styles.trustBanner}>
				<Ionicons name="shield-checkmark" size={24} color="#2B6F71" style={styles.trustIcon} />
				<View style={styles.trustTextCol}>
					<Text style={styles.trustTitle}>100% Certified & Background Checked</Text>
					<Text style={styles.trustDesc}>Every clinician undergoes rigorous vetting and credential verifications.</Text>
				</View>
			</View>
		</ScrollView>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#F8FAFC',
	},
	content: {
		padding: 16,
		paddingBottom: 40,
	},
	banner: {
		height: 160,
		borderRadius: 20,
		overflow: 'hidden',
		marginBottom: 20,
	},
	bannerTablet: {
		height: 220,
	},
	bannerImage: {
		resizeMode: 'cover',
	},
	bannerOverlay: {
		flex: 1,
		backgroundColor: 'rgba(18, 55, 62, 0.65)',
		padding: 20,
		justifyContent: 'center',
	},
	badge: {
		alignSelf: 'flex-start',
		backgroundColor: '#0c7c7c',
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 8,
		marginBottom: 8,
	},
	badgeText: {
		fontSize: 10,
		fontWeight: '800',
		color: '#FFFFFF',
		textTransform: 'uppercase',
	},
	bannerTitle: {
		fontSize: 20,
		fontWeight: '800',
		color: '#FFFFFF',
		marginBottom: 4,
	},
	bannerSub: {
		fontSize: 12,
		color: '#D1FAE5',
		fontWeight: '600',
	},
	searchBar: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#FFFFFF',
		borderWidth: 1,
		borderColor: '#E2E8F0',
		borderRadius: 14,
		paddingHorizontal: 14,
		height: 52,
		marginBottom: 24,
		shadowColor: '#12373E',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.03,
		shadowRadius: 6,
		elevation: 1,
	},
	searchIcon: {
		marginRight: 10,
	},
	searchInput: {
		flex: 1,
		fontSize: 14,
		color: '#1E293B',
	},
	sectionTitle: {
		fontSize: 16,
		fontWeight: '800',
		color: '#16324A',
		marginBottom: 2,
	},
	sectionDesc: {
		fontSize: 12,
		color: '#64748B',
		marginBottom: 16,
	},
	grid: {
		gap: 12,
	},
	gridTablet: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'space-between',
	},
	card: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#FFFFFF',
		borderWidth: 1,
		borderColor: '#E6EDF2',
		borderRadius: 18,
		padding: 16,
		shadowColor: '#12373E',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.03,
		shadowRadius: 6,
		elevation: 1,
	},
	iconCircle: {
		width: 52,
		height: 52,
		borderRadius: 26,
		justifyContent: 'center',
		alignItems: 'center',
	},
	textContainer: {
		flex: 1,
		marginLeft: 14,
		marginRight: 8,
	},
	cardTitle: {
		fontSize: 15,
		fontWeight: '700',
		color: '#16324A',
		marginBottom: 4,
	},
	cardSub: {
		fontSize: 12,
		color: '#587087',
		lineHeight: 16,
	},
	chevron: {
		alignSelf: 'center',
	},
	trustBanner: {
		flexDirection: 'row',
		backgroundColor: '#EAF6F6',
		borderWidth: 1,
		borderColor: '#C7E7E8',
		borderRadius: 16,
		padding: 14,
		marginTop: 28,
		alignItems: 'center',
	},
	trustIcon: {
		marginRight: 12,
	},
	trustTextCol: {
		flex: 1,
	},
	trustTitle: {
		fontSize: 13,
		fontWeight: '700',
		color: '#16324A',
		marginBottom: 2,
	},
	trustDesc: {
		fontSize: 11,
		color: '#587087',
		lineHeight: 14,
	},
})
