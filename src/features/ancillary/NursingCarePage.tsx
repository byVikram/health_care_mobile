import React, { useState } from 'react'
import {
	View,
	StyleSheet,
	TouchableOpacity,
	ScrollView,
	Platform,
	useWindowDimensions,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ROUTES } from '../../navigation/routes'
import { AppTypography } from '../../components/common/AppTypography'
import { AppButton } from '../../components/common/AppButton'

import { PopularService, PopularServiceCard } from './components/PopularServiceCard'
import { RecommendationItem, RecommendationCard } from './components/RecommendationCard'
import { ServiceProcedureItem, AllServiceCard } from './components/AllServiceCard'
import { ServiceDetailsBottomSheet } from './components/ServiceDetailsBottomSheet'
import { ViewCartFloatingBar } from './components/ViewCartFloatingBar'

interface CategoryGroup {
	categoryName: string
	procedures: ServiceProcedureItem[]
}

const POPULAR_SERVICES: PopularService[] = [
	{
		id: '1',
		title: 'Injection at Home',
		description: 'Safe IV/IM injection administration by certified nurses',
		price: '₹299',
		image: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=500&q=80',
	},
	{
		id: '2',
		title: 'Wound Dressing',
		description: 'Sterile surgical & chronic wound care dressing',
		price: '₹499',
		image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=500&q=80',
	},
	{
		id: '3',
		title: 'IV Therapy',
		description: 'Hydration & medication IV drip administration',
		price: '₹799',
		image: 'https://images.unsplash.com/photo-1631815588090-d4bfec5b1cdb?auto=format&fit=crop&w=500&q=80',
	},
	{
		id: '4',
		title: 'Elder Care Visit',
		description: 'Comprehensive health monitoring & vitals check',
		price: '₹999',
		image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=500&q=80',
	},
]

const RECOMMENDED_SERVICES: RecommendationItem[] = [
	{
		id: 'rec1',
		title: 'Post-Surgical Care',
		description: '24/7 recovery monitoring & medication management',
		iconName: 'heart-pulse',
	},
	{
		id: 'rec2',
		title: 'Catheterization Care',
		description: 'Hygienic insertion, maintenance & bag removal',
		iconName: 'medical-bag',
	},
]

const ALL_NURSING_CATEGORIES: CategoryGroup[] = [
	{
		categoryName: 'General Nursing Procedures (Medical Procedures)',
		procedures: [
			{
				id: 'gen1',
				title: 'Wound Dressing & Care',
				description: 'Sterile dressing for surgical, burn, or chronic diabetic wounds',
				duration: '30 - 45 mins',
				price: '₹499',
				image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=500&q=80',
				verified: true,
			},
			{
				id: 'gen2',
				title: 'IV Fluids & Medication Drip',
				description: 'Intravenous fluid infusion & saline drip under doctor prescription',
				duration: '45 - 60 mins',
				price: '₹799',
				image: 'https://images.unsplash.com/photo-1631815588090-d4bfec5b1cdb?auto=format&fit=crop&w=500&q=80',
				verified: true,
			},
			{
				id: 'gen3',
				title: 'Vitals & Sugar Check',
				description: 'Blood pressure, pulse ox, blood glucose & temperature recording',
				duration: '20 mins',
				price: '₹199',
				image: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=500&q=80',
			},
		],
	},
	{
		categoryName: 'Wound & Recovery Care',
		procedures: [
			{
				id: 'wound1',
				title: 'Post-Surgical Surgical Dressing',
				description: 'Advanced wound debridement & sterile bandage change',
				duration: '40 mins',
				price: '₹599',
				image: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=500&q=80',
				verified: true,
			},
		],
	},
	{
		categoryName: 'Specialized Nursing Care (Special Care)',
		procedures: [
			{
				id: 'spec1',
				title: 'Tracheostomy Care',
				description: 'Suctioning, tube cleaning, and airway hygiene maintenance',
				duration: '60 mins',
				price: 'Custom Pricing',
				image: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=500&q=80',
				premiumBadgeText: 'PREMIUM',
				actionLabel: 'Enquire',
			},
			{
				id: 'spec2',
				title: 'Ryle’s Tube Feeding & Care',
				description: 'Nasogastric tube insertion, feeding assistance & monitoring',
				duration: '45 mins',
				price: 'Custom Pricing',
				image: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=500&q=80',
				verified: true,
				actionLabel: 'Enquire',
			},
		],
	},
]

export default function NursingCarePage() {
	const navigation = useNavigation<any>()
	const insets = useSafeAreaInsets()
	const { width } = useWindowDimensions()

	// Cart State mapping serviceId -> { item, quantity }
	const [cartItems, setCartItems] = useState<
		Record<string, { item: ServiceProcedureItem; quantity: number }>
	>({})

	const [activeServiceForSheet, setActiveServiceForSheet] = useState<ServiceProcedureItem | null>(null)
	const [sheetVisible, setSheetVisible] = useState(false)

	let numColumns = 1
	let paddingHorizontal = 16
	const gap = 16

	if (width >= 1024) {
		numColumns = 3
		paddingHorizontal = 28
	} else if (width >= 768) {
		numColumns = 2
		paddingHorizontal = 24
	}

	const isTablet = width >= 768
	const contentWidth = width - paddingHorizontal * 2
	const gridCardWidth = numColumns > 1
		? Math.floor((contentWidth - gap * (numColumns - 1)) / numColumns)
		: undefined

	const handleBack = () => {
		if (navigation.canGoBack()) {
			navigation.goBack()
		}
	}

	const getItemQuantity = (serviceId: string) => {
		return cartItems[serviceId]?.quantity || 0
	}

	const totalCartCount = Object.values(cartItems).reduce((sum, entry) => sum + entry.quantity, 0)

	const handleIncrement = (service: ServiceProcedureItem) => {
		setCartItems((prev) => {
			const existing = prev[service.id]
			const currentQty = existing ? existing.quantity : 0
			return {
				...prev,
				[service.id]: { item: service, quantity: currentQty + 1 },
			}
		})
	}

	const handleDecrement = (service: ServiceProcedureItem) => {
		setCartItems((prev) => {
			const existing = prev[service.id]
			if (!existing) return prev
			if (existing.quantity <= 1) {
				const next = { ...prev }
				delete next[service.id]
				return next
			}
			return {
				...prev,
				[service.id]: { item: service, quantity: existing.quantity - 1 },
			}
		})
	}

	const handleCardPress = (service: ServiceProcedureItem) => {
		setActiveServiceForSheet(service)
		setSheetVisible(true)
	}

	const handleAddToBookingFromSheet = (service: ServiceProcedureItem) => {
		handleIncrement(service)
	}

	const handleViewCart = () => {
		const selectedServices: ServiceProcedureItem[] = []
		Object.values(cartItems).forEach((entry) => {
			for (let i = 0; i < entry.quantity; i++) {
				selectedServices.push(entry.item)
			}
		})

		navigation.navigate(ROUTES.STACK.ANCILLARY_BOOKING_CART, {
			services: selectedServices,
		})
	}

	return (
		<View style={[styles.container, { paddingTop: insets.top }]}>
			<ScrollView
				contentContainerStyle={[styles.scrollContent, { paddingHorizontal }]}
				showsVerticalScrollIndicator={false}
			>
				{/* 1. Header Section */}
				<View style={styles.headerContainer}>
					<View style={styles.headerTopRow}>
						<TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.7}>
							<MaterialCommunityIcons name="arrow-left" size={24} color="#191C1D" />
						</TouchableOpacity>
						<View style={styles.titleContainer}>
							<AppTypography variant="h3" style={styles.pageTitle}>
								Nursing Care
							</AppTypography>
							<AppTypography variant="caption" style={styles.pageSubtitle}>
								Professional nursing services at your doorstep
							</AppTypography>
						</View>
						{Platform.OS === 'web' && (
							<TouchableOpacity style={styles.notificationButton} activeOpacity={0.7}>
								<MaterialCommunityIcons name="bell-outline" size={22} color="#191C1D" />
							</TouchableOpacity>
						)}
					</View>
				</View>

				{/* 2. Emergency Assistance Banner */}
				<View style={[styles.emergencyBanner, isTablet && styles.emergencyBannerTablet]}>
					<View style={[styles.emergencyContentCol, isTablet && styles.emergencyContentColTablet]}>
						<View style={styles.emergencyIconContainer}>
							<MaterialCommunityIcons name="octagram" size={28} color="#D32F2F" />
						</View>
						<View style={styles.emergencyTextContainer}>
							<AppTypography variant="h4" style={styles.emergencyHeading}>
								Need urgent nursing assistance?
							</AppTypography>
							<AppTypography variant="caption" style={styles.emergencySubtext}>
								Available 24/7 for medical emergencies at home.
							</AppTypography>
						</View>
					</View>
					<AppButton
						variant="primary"
						style={[styles.findNurseBtn, isTablet && styles.findNurseBtnTablet]}
						labelStyle={styles.findNurseBtnLabel}
						contentStyle={styles.findNurseBtnContent}
					>
						Find Nurse Now
					</AppButton>
				</View>

				{/* 3. Popular Nursing Services Section */}
				<View style={styles.sectionContainer}>
					<AppTypography variant="h3" style={styles.sectionTitle}>
						Popular Nursing Services
					</AppTypography>
					<ScrollView
						horizontal
						showsHorizontalScrollIndicator={false}
						contentContainerStyle={styles.horizontalScrollContent}
					>
						{POPULAR_SERVICES.map((service) => (
							<PopularServiceCard
								key={service.id}
								item={service}
								quantity={getItemQuantity(service.id)}
								onIncrement={handleIncrement}
								onDecrement={handleDecrement}
								onCardPress={handleCardPress}
							/>
						))}
					</ScrollView>
				</View>

				{/* 4. Recommended For You Section */}
				<View style={styles.sectionContainer}>
					<View style={styles.recommendedHeaderRow}>
						<MaterialCommunityIcons name="clock-outline" size={18} color="#1F5F68" style={styles.recommendedIcon} />
						<AppTypography variant="h3" style={styles.sectionTitleNoMargin}>
							Recommended For You
						</AppTypography>
					</View>
					<AppTypography variant="caption" style={styles.recommendedSubText}>
						BASED ON PREVIOUS SEARCHES
					</AppTypography>
					<View style={[styles.recommendedList, isTablet && styles.gridRow]}>
						{RECOMMENDED_SERVICES.map((rec) => (
							<View key={rec.id} style={gridCardWidth ? { width: gridCardWidth } : undefined}>
								<RecommendationCard item={rec} />
							</View>
						))}
					</View>
				</View>

				{/* 5. All Nursing Services Section */}
				<View style={styles.sectionContainer}>
					<AppTypography variant="h2" style={styles.mainSectionTitle}>
						All Nursing Services
					</AppTypography>

					{ALL_NURSING_CATEGORIES.map((category) => (
						<View key={category.categoryName} style={styles.categoryContainer}>
							<AppTypography variant="h3" style={styles.categoryTitle}>
								{category.categoryName}
							</AppTypography>
							<View style={[styles.procedureList, isTablet && styles.gridRow]}>
								{category.procedures.map((proc) => (
									<AllServiceCard
										key={proc.id}
										item={proc}
										cardWidth={gridCardWidth}
										quantity={getItemQuantity(proc.id)}
										onIncrement={handleIncrement}
										onDecrement={handleDecrement}
										onCardPress={handleCardPress}
									/>
								))}
							</View>
						</View>
					))}
				</View>
			</ScrollView>

			{/* 6. Persistent View Cart Floating Bar */}
			<ViewCartFloatingBar
				selectedCount={totalCartCount}
				onViewCart={handleViewCart}
			/>

			{/* 7. Service Details Bottom Sheet */}
			<ServiceDetailsBottomSheet
				visible={sheetVisible}
				service={activeServiceForSheet}
				onClose={() => setSheetVisible(false)}
				onAddToBooking={handleAddToBookingFromSheet}
			/>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#FFFFFF',
	},
	scrollContent: {
		paddingHorizontal: 16,
		paddingBottom: 80,
	},
	headerContainer: {
		paddingTop: 8,
		paddingBottom: 16,
	},
	headerTopRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		justifyContent: 'space-between',
	},
	backButton: {
		padding: 4,
		marginRight: 8,
	},
	titleContainer: {
		flex: 1,
	},
	pageTitle: {
		fontSize: 22,
		fontWeight: '700',
		color: '#191C1D',
		lineHeight: 28,
	},
	pageSubtitle: {
		fontSize: 13,
		color: '#526062',
		marginTop: 2,
	},
	notificationButton: {
		padding: 6,
		borderRadius: 20,
		backgroundColor: '#F4F7F8',
	},
	emergencyBanner: {
		backgroundColor: '#FFF2F2',
		borderRadius: 14,
		padding: 16,
		marginBottom: 20,
		borderWidth: 1,
		borderColor: '#FFD6D6',
	},
	emergencyBannerTablet: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		padding: 20,
		borderRadius: 16,
	},
	emergencyContentCol: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		marginBottom: 14,
	},
	emergencyContentColTablet: {
		flex: 1,
		marginBottom: 0,
		marginRight: 16,
		alignItems: 'center',
	},
	emergencyIconContainer: {
		marginRight: 12,
		marginTop: 2,
	},
	emergencyTextContainer: {
		flex: 1,
	},
	emergencyHeading: {
		fontSize: 15,
		fontWeight: '700',
		color: '#D32F2F',
		lineHeight: 20,
	},
	emergencySubtext: {
		fontSize: 12,
		color: '#7F1D1D',
		marginTop: 3,
		lineHeight: 16,
	},
	findNurseBtn: {
		backgroundColor: '#D32F2F',
		borderRadius: 10,
		width: '100%',
		paddingVertical: 0,
		marginVertical: 0,
	},
	findNurseBtnTablet: {
		width: 'auto',
		minWidth: 160,
		alignSelf: 'center',
	},
	findNurseBtnLabel: {
		color: '#FFFFFF',
		fontSize: 14,
		fontWeight: '700',
		marginVertical: 0,
	},
	findNurseBtnContent: {
		height: 42,
		justifyContent: 'center',
		alignItems: 'center',
	},
	sectionContainer: {
		marginBottom: 24,
	},
	sectionTitle: {
		fontSize: 17,
		fontWeight: '700',
		color: '#191C1D',
		marginBottom: 12,
	},
	sectionTitleNoMargin: {
		fontSize: 17,
		fontWeight: '700',
		color: '#191C1D',
	},
	horizontalScrollContent: {
		paddingRight: 16,
	},
	recommendedHeaderRow: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	recommendedIcon: {
		marginRight: 6,
	},
	recommendedSubText: {
		fontSize: 11,
		fontWeight: '600',
		color: '#526062',
		letterSpacing: 0.5,
		marginTop: 2,
		marginBottom: 12,
	},
	recommendedList: {
		marginTop: 4,
	},
	gridRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 16,
	},
	mainSectionTitle: {
		fontSize: 20,
		fontWeight: '700',
		color: '#191C1D',
		marginBottom: 16,
	},
	categoryContainer: {
		marginBottom: 20,
	},
	categoryTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: '#191C1D',
		marginBottom: 12,
	},
	procedureList: {
		marginTop: 4,
	},
})
