import React, { useState, useMemo } from 'react'
import {
	BackHandler,
	Image,
	ScrollView,
	StyleSheet,
	TextInput,
	TouchableOpacity,
	View,
	useWindowDimensions,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ROUTES } from '../../../navigation/routes'
import { AppTypography } from '../../../components/common/AppTypography'
import AppScreenHeader from '../../../components/common/AppScreenHeader'

import { ServiceProcedureItem, AllServiceCard } from '../components/AllServiceCard'
import { ServiceDetailsBottomSheet } from '../components/ServiceDetailsBottomSheet'
import { ViewCartFloatingBar } from '../components/ViewCartFloatingBar'

interface CategoryGroup {
	id: string
	categoryName: string
	procedures: ServiceProcedureItem[]
}

const CATEGORY_CARDS = [
	{
		id: 'all',
		label: 'All Services',
		sublabel: '8 Available',
		image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=300&q=80',
	},
	{
		id: 'gen',
		label: 'General Care',
		sublabel: '4 Available',
		image: 'https://images.unsplash.com/photo-1631815588090-d4bfec5b1cdb?auto=format&fit=crop&w=300&q=80',
	},
	{
		id: 'wound',
		label: 'Wound Care',
		sublabel: '2 Available',
		image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=300&q=80',
	},
	{
		id: 'spec',
		label: 'Specialized Care',
		sublabel: '2 Available',
		image: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=300&q=80',
	},
]

const ALL_NURSING_CATEGORIES: CategoryGroup[] = [
	{
		id: 'gen',
		categoryName: 'General Nursing Procedures',
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
				title: 'IV Fluids & Saline Drip',
				description: 'Intravenous fluid infusion & saline drip under doctor prescription',
				duration: '45 - 60 mins',
				price: '₹799',
				image: 'https://images.unsplash.com/photo-1631815588090-d4bfec5b1cdb?auto=format&fit=crop&w=500&q=80',
				verified: true,
			},
			{
				id: 'gen3',
				title: 'Vitals & Blood Sugar Check',
				description: 'Blood pressure, pulse, glucose & temperature check at home',
				duration: '20 mins',
				price: '₹199',
				image: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=500&q=80',
			},
			{
				id: 'gen4',
				title: 'Injection Administration (IM/IV)',
				description: 'Safe injection administration by certified nursing specialists',
				duration: '15 - 30 mins',
				price: '₹299',
				image: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=500&q=80',
				verified: true,
			},
		],
	},
	{
		id: 'wound',
		categoryName: 'Wound & Recovery Care',
		procedures: [
			{
				id: 'wound1',
				title: 'Post-Surgical Dressing',
				description: 'Advanced wound debridement & sterile bandage change',
				duration: '40 mins',
				price: '₹599',
				image: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=500&q=80',
				verified: true,
			},
			{
				id: 'wound2',
				title: 'Suture & Staple Removal',
				description: 'Safe removal of surgical sutures or staples by trained nurses',
				duration: '30 mins',
				price: '₹449',
				image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=500&q=80',
				verified: true,
			},
		],
	},
	{
		id: 'spec',
		categoryName: 'Specialized High Dependency Care',
		procedures: [
			{
				id: 'spec1',
				title: 'Tracheostomy Care & Hygiene',
				description: 'Suctioning, tube cleaning, and airway hygiene maintenance',
				duration: '60 mins',
				price: 'Custom Pricing',
				image: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=500&q=80',
				premiumBadgeText: 'PREMIUM',
				actionLabel: 'Enquire',
			},
			{
				id: 'spec2',
				title: 'Ryle’s Tube Insertion & Care',
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

	const [searchQuery, setSearchQuery] = useState('')
	const [activeCategory, setActiveCategory] = useState('all')
	const [selectedServicesMap, setSelectedServicesMap] = useState<Record<string, { item: ServiceProcedureItem; qty: number }>>({})
	const [detailSheetItem, setDetailSheetItem] = useState<ServiceProcedureItem | null>(null)

	// Filtered Procedure Groups
	const filteredCategories = useMemo(() => {
		return ALL_NURSING_CATEGORIES.map((cat) => {
			if (activeCategory !== 'all' && cat.id !== activeCategory) {
				return null
			}
			const matchingProcedures = cat.procedures.filter((p) => {
				const matchesSearch =
					p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
					p.description.toLowerCase().includes(searchQuery.toLowerCase())
				return matchesSearch
			})

			if (matchingProcedures.length === 0) return null

			return {
				...cat,
				procedures: matchingProcedures,
			}
		}).filter(Boolean) as CategoryGroup[]
	}, [searchQuery, activeCategory])

	// Total Cart Computations
	const selectedItemsList = useMemo(() => {
		return Object.values(selectedServicesMap).filter((x) => x.qty > 0).map((x) => x.item)
	}, [selectedServicesMap])

	const totalItemsCount = useMemo(() => {
		return Object.values(selectedServicesMap).reduce((sum, x) => sum + x.qty, 0)
	}, [selectedServicesMap])

	const totalPriceAmount = useMemo(() => {
		return Object.values(selectedServicesMap).reduce((sum, x) => {
			const rawPrice = parseInt(x.item.price.replace(/[^0-9]/g, '') || '0', 10)
			return sum + rawPrice * x.qty
		}, 0)
	}, [selectedServicesMap])

	const handleIncrement = (item: ServiceProcedureItem) => {
		setSelectedServicesMap((prev) => {
			const current = prev[item.id]?.qty || 0
			return {
				...prev,
				[item.id]: { item, qty: current + 1 },
			}
		})
	}

	const handleDecrement = (item: ServiceProcedureItem) => {
		setSelectedServicesMap((prev) => {
			const current = prev[item.id]?.qty || 0
			if (current <= 1) {
				const next = { ...prev }
				delete next[item.id]
				return next
			}
			return {
				...prev,
				[item.id]: { item, qty: current - 1 },
			}
		})
	}

	const handleProceedToBooking = () => {
		if (selectedItemsList.length === 0) return
		navigation.navigate(ROUTES.STACK.ANCILLARY_BOOKING_DETAILS, {
			services: selectedItemsList,
			selectedServices: selectedItemsList,
		})
	}

	const handleGoHome = () => {
		navigation.navigate(ROUTES.MAIN.TABS, { screen: ROUTES.MAIN.HOME })
	}

	React.useEffect(() => {
		const onBackPress = () => {
			handleGoHome()
			return true
		}

		const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress)
		return () => subscription.remove()
	}, [navigation])

	return (
		<View style={styles.container}>
			{/* App Bar / Header */}
			<AppScreenHeader title="Nursing Care & Procedures" onBack={handleGoHome} />

			{/* Main Scroll Content */}
			<ScrollView
				contentContainerStyle={[
					styles.scrollContent,
					{ paddingBottom: insets.bottom + (selectedItemsList.length > 0 ? 110 : 40) },
				]}
				showsVerticalScrollIndicator={false}
			>
				{/* 1. Search Bar */}
				<View style={styles.searchBar}>
					<Ionicons name="search" size={19} color="#2B6F71" />
					<TextInput
						style={styles.searchInput}
						placeholder="Search procedures e.g. Dressing, IV, Injection..."
						placeholderTextColor="#546E7A"
						value={searchQuery}
						onChangeText={setSearchQuery}
					/>
					{searchQuery.length > 0 && (
						<TouchableOpacity onPress={() => setSearchQuery('')}>
							<Ionicons name="close-circle" size={18} color="#E0E7EF" />
						</TouchableOpacity>
					)}
				</View>

				{/* 2. Dispatch Banner */}
				<View style={styles.dispatchBanner}>
					<View style={styles.boltIconWrap}>
						<MaterialCommunityIcons name="flash" size={18} color="#FFFFFF" />
					</View>
					<View style={styles.bannerTextCol}>
						<AppTypography variant="h4" style={styles.bannerTitle}>
							Instant Home Nurse Dispatch (~25 mins)
						</AppTypography>
						<View style={styles.bulletRow}>
							<AppTypography variant="caption" style={styles.bulletText}>
								Verified RNs
							</AppTypography>
							<View style={styles.bulletDot} />
							<AppTypography variant="caption" style={styles.bulletText}>
								Sterile Medical Equipment
							</AppTypography>
							<View style={styles.bulletDot} />
							<AppTypography variant="caption" style={styles.bulletText}>
								24/7 Availability
							</AppTypography>
						</View>
					</View>
				</View>

				{/* 3. Category Filter Cards Grid (2-Column Layout with Image Thumbnails) */}
				<View style={styles.categoryGrid}>
					{CATEGORY_CARDS.map((cat) => {
						const isActive = cat.id === activeCategory
						return (
							<TouchableOpacity
								key={cat.id}
								style={[styles.categoryCard, isActive && styles.categoryCardActive]}
								onPress={() => setActiveCategory(cat.id)}
								activeOpacity={0.85}
							>
								<Image source={{ uri: cat.image }} style={styles.categoryCardImg} resizeMode="cover" />
								<View style={styles.categoryCardTextCol}>
									<AppTypography
										variant="h4"
										style={[styles.categoryCardTitle, isActive && styles.categoryCardTitleActive]}
										numberOfLines={1}
									>
										{cat.label}
									</AppTypography>
									<AppTypography
										variant="caption"
										style={[styles.categoryCardSub, isActive && styles.categoryCardSubActive]}
									>
										{cat.sublabel}
									</AppTypography>
								</View>
							</TouchableOpacity>
						)
					})}
				</View>

				{/* 4. Procedure Lists */}
				{filteredCategories.length > 0 ? (
					filteredCategories.map((group) => (
						<View key={group.id} style={styles.categoryGroup}>
							<View style={styles.listHeaderRow}>
								<AppTypography variant="h2" style={styles.listHeaderTitle}>
									{group.categoryName}
								</AppTypography>
								<AppTypography variant="caption" style={styles.listHeaderCount}>
									{group.procedures.length} available
								</AppTypography>
							</View>

							<View style={styles.cardsDividerList}>
								{group.procedures.map((proc) => (
									<AllServiceCard
										key={proc.id}
										item={proc}
										quantity={selectedServicesMap[proc.id]?.qty || 0}
										onIncrement={handleIncrement}
										onDecrement={handleDecrement}
										onCardPress={setDetailSheetItem}
									/>
								))}
							</View>
						</View>
					))
				) : (
					<View style={styles.emptyWrap}>
						<MaterialCommunityIcons name="medical-bag" size={40} color="#E0E7EF" />
						<AppTypography variant="h3" style={styles.emptyTitle}>
							No Procedures Found
						</AppTypography>
						<AppTypography variant="caption" style={styles.emptySub}>
							Try searching with another term or reset your category filter.
						</AppTypography>
					</View>
				)}
			</ScrollView>

			{/* Procedure Detail Bottom Sheet */}
			<ServiceDetailsBottomSheet
				visible={detailSheetItem !== null}
				service={detailSheetItem}
				onClose={() => setDetailSheetItem(null)}
				onAddToBooking={handleIncrement}
			/>

			{/* Sticky Bottom Cart Bar */}
			{selectedItemsList.length > 0 && (
				<ViewCartFloatingBar
					itemCount={totalItemsCount}
					totalAmount={`₹${totalPriceAmount}`}
					onViewCart={handleProceedToBooking}
				/>
			)}
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
		paddingTop: 16,
		gap: 16,
	},

	/* 1. Search Bar */
	searchBar: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#FFFFFF',
		borderWidth: 1,
		borderColor: '#E0E7EF',
		borderRadius: 12,
		paddingHorizontal: 14,
		height: 48,
		gap: 10,
	},
	searchInput: {
		flex: 1,
		fontSize: 14,
		color: '#1A2B3C',
	},

	/* 2. Dispatch Banner */
	dispatchBanner: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		backgroundColor: 'rgba(43, 111, 113, 0.08)',
		borderWidth: 1,
		borderColor: 'rgba(43, 111, 113, 0.2)',
		borderRadius: 14,
		padding: 14,
		gap: 12,
	},
	boltIconWrap: {
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: '#2B6F71',
		justifyContent: 'center',
		alignItems: 'center',
		marginTop: 2,
	},
	bannerTextCol: {
		flex: 1,
	},
	bannerTitle: {
		fontSize: 14,
		fontWeight: '700',
		color: '#2B6F71',
		lineHeight: 18,
	},
	bulletRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		alignItems: 'center',
		gap: 6,
		marginTop: 4,
	},
	bulletText: {
		fontSize: 12,
		color: '#546E7A',
	},
	bulletDot: {
		width: 4,
		height: 4,
		borderRadius: 2,
		backgroundColor: '#E0E7EF',
	},

	/* 3. Category Filter Cards Grid (2-Column with Images) */
	categoryGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'space-between',
		gap: 10,
	},
	categoryCard: {
		width: '48.5%',
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#FFFFFF',
		borderRadius: 12,
		overflow: 'hidden',
		borderWidth: 1,
		borderColor: '#E0E7EF',
		height: 52,
	},
	categoryCardActive: {
		borderColor: '#2B6F71',
		backgroundColor: 'rgba(43, 111, 113, 0.08)',
	},
	categoryCardImg: {
		width: 52,
		height: 52,
		backgroundColor: '#F4F6F9',
	},
	categoryCardTextCol: {
		flex: 1,
		paddingHorizontal: 10,
		paddingVertical: 4,
		gap: 2,
	},
	categoryCardTitle: {
		fontSize: 12.5,
		fontWeight: '700',
		color: '#1A2B3C',
	},
	categoryCardTitleActive: {
		color: '#2B6F71',
	},
	categoryCardSub: {
		fontSize: 10.5,
		color: '#546E7A',
	},
	categoryCardSubActive: {
		color: '#2B6F71',
		fontWeight: '600',
	},

	/* 4. List Sections */
	categoryGroup: {
		marginTop: 4,
	},
	listHeaderRow: {
		flexDirection: 'row',
		alignItems: 'flex-end',
		justifyContent: 'space-between',
		marginBottom: 4,
	},
	listHeaderTitle: {
		fontSize: 18,
		fontWeight: '700',
		color: '#1A2B3C',
	},
	listHeaderCount: {
		fontSize: 13,
		color: '#546E7A',
	},
	cardsDividerList: {
		marginTop: 2,
	},

	/* Empty State */
	emptyWrap: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 60,
		paddingHorizontal: 20,
		gap: 8,
	},
	emptyTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: '#1A2B3C',
	},
	emptySub: {
		fontSize: 13,
		color: '#546E7A',
		textAlign: 'center',
	},
})
