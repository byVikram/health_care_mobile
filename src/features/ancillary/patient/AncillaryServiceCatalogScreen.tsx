import React, { useEffect, useMemo, useState } from 'react'
import {
	ActivityIndicator,
	BackHandler,
	ScrollView,
	StyleSheet,
	TouchableOpacity,
	View,
} from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ROUTES } from '../../../navigation/routes'
import { AppTypography, AppInput } from '../../../components/common'
import AppScreenHeader from '../../../components/common/AppScreenHeader'

import { ServiceProcedureItem, AllServiceCard } from '../components/AllServiceCard'
import { ServiceDetailsBottomSheet } from '../components/ServiceDetailsBottomSheet'
import { ViewCartFloatingBar } from '../components/ViewCartFloatingBar'
import { NursingQuickActionCards } from '../components/NursingQuickActionCards'
import { PhysiotherapyConditionsGrid, PHYSIOTHERAPY_CONDITIONS } from '../components/PhysiotherapyConditionsGrid'
import {
	AncillaryCategoryApiItem,
	AncillaryServiceItem,
	fetchAncillaryCategories,
	fetchAncillaryServices,
} from '../ancillaryService'

interface CategoryGroup {
	id: string
	categoryName: string
	procedures: ServiceProcedureItem[]
}

const SERVICE_UI: Record<string, {
	title: string
	searchPlaceholder: string
	image: string
	premiumBadgeText?: string
}> = {
	'nursing-care': {
		title: 'Nursing Care & Procedures',
		searchPlaceholder: 'Search procedures e.g. Dressing, IV, Injection...',
		image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=300&q=80',
	},
	physiotherapy: {
		title: 'Physiotherapy & Rehab',
		searchPlaceholder: 'Search physiotherapy e.g. Back pain, Knee pain...',
		image: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=300&q=80',
		premiumBadgeText: 'Verified PT',
	},
	'rehab-care': {
		title: 'Rehab Care Support',
		searchPlaceholder: 'Search rehab care e.g. Stroke, Cardiac...',
		image: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=300&q=80',
	},
	'elder-day-care': {
		title: 'Elder Day Care & Assistance',
		searchPlaceholder: 'Search elder care e.g. Companion, Mobility...',
		image: 'https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?auto=format&fit=crop&w=300&q=80',
	},
}

export default function AncillaryServiceCatalogScreen() {
	const navigation = useNavigation<any>()
	const route = useRoute<any>()

	const serviceKey = route.params?.serviceKey || 'nursing-care'
	const serviceLabel = route.params?.serviceLabel || 'Nursing Care'
	const activeUi = SERVICE_UI[serviceKey] || SERVICE_UI['nursing-care']
	const isPhysiotherapy = serviceKey === 'physiotherapy'

	const [categories, setCategories] = useState<AncillaryCategoryApiItem[]>([])
	const [rawServices, setRawServices] = useState<AncillaryServiceItem[]>([])
	const [loading, setLoading] = useState(true)
	const [activeCategory, setActiveCategory] = useState<string>('all')
	const [searchQuery, setSearchQuery] = useState('')
	const [selectedProcedure, setSelectedProcedure] = useState<ServiceProcedureItem | null>(null)
	const [cart, setCart] = useState<ServiceProcedureItem[]>([])
	const [activeCondition, setActiveCondition] = useState<string | null>(isPhysiotherapy ? 'knee' : null)

	useEffect(() => {
		let isMounted = true
		const loadCatalog = async () => {
			try {
				setLoading(true)
				const [cats, srvs] = await Promise.all([
					fetchAncillaryCategories(serviceKey),
					fetchAncillaryServices({ specialtyId: serviceKey }),
				])
				if (isMounted) {
					setCategories(cats)
					setRawServices(srvs)
				}
			} catch (e) {
				console.log('[AncillaryServiceCatalogScreen] Catalog load error:', e)
			} finally {
				if (isMounted) setLoading(false)
			}
		}
		void loadCatalog()
		return () => {
			isMounted = false
		}
	}, [serviceKey])

	// Sync selection state when returning from Booking Details. If a service
	// was removed there (via "Add Services"), the updated list is passed back
	// via route.params.updatedCart so the cart here doesn't stay stale.
	useEffect(() => {
		if (route.params?.updatedCart) {
			setCart(route.params.updatedCart)
			navigation.setParams({ updatedCart: undefined })
		}
	}, [route.params?.updatedCart])

	useEffect(() => {
		const onBackPress = () => {
			if (selectedProcedure) {
				setSelectedProcedure(null)
				return true
			}
			return false
		}
		const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress)
		return () => subscription.remove()
	}, [selectedProcedure])

	const categoryPills = useMemo(() => {
		return [{ id: 'all', label: 'All Services' }, ...categories]
	}, [categories])

	const activeConditionMeta = useMemo(() => {
		if (!isPhysiotherapy || !activeCondition) return null
		return PHYSIOTHERAPY_CONDITIONS.find((c) => c.id === activeCondition) || null
	}, [isPhysiotherapy, activeCondition])

	const procedureItems = useMemo<ServiceProcedureItem[]>(() => {
		return rawServices.map((s) => {
			const title = s.title || ''
			const description = s.description || ''
			let recommendedLabel: string | undefined

			if (activeConditionMeta) {
				const haystack = `${title} ${description}`.toLowerCase()
				const isMatch = activeConditionMeta.keywords.some((kw) => haystack.includes(kw))
				if (isMatch) {
					recommendedLabel = `Recommended for ${activeConditionMeta.label}`
				}
			}

			return {
				id: s.id,
				categoryId: s.categoryId ?? null,
				title,
				description,
				price: typeof s.price === 'number' ? `₹${s.price}` : String(s.price || '₹499'),
				duration: '30-45 mins',
				image: activeUi.image,
				premiumBadgeText: activeUi.premiumBadgeText,
				recommendedLabel,
			}
		})
	}, [rawServices, activeUi.image, activeUi.premiumBadgeText, activeConditionMeta])

	const displayGroups = useMemo<CategoryGroup[]>(() => {
		let filtered = procedureItems

		if (activeCategory !== 'all') {
			filtered = filtered.filter((p) => p.categoryId === activeCategory)
		}

		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase().trim()
			filtered = filtered.filter(
				(p) => p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
			)
		}

		if (activeConditionMeta) {
			filtered = [...filtered].sort((a, b) => {
				const aRec = a.recommendedLabel ? 1 : 0
				const bRec = b.recommendedLabel ? 1 : 0
				return bRec - aRec
			})
		}

		const activeCategoryLabel = activeCategory === 'all'
			? activeUi.title
			: categoryPills.find((c) => c.id === activeCategory)?.label || activeUi.title

		return [
			{
				id: 'group-all',
				categoryName: isPhysiotherapy ? 'Popular Physiotherapy Services' : activeCategoryLabel,
				procedures: filtered,
			},
		]
	}, [procedureItems, searchQuery, activeUi.title, activeCategory, categoryPills, activeConditionMeta, isPhysiotherapy])

	const handleToggleProcedure = (item: ServiceProcedureItem) => {
		setCart((prev) => {
			const exists = prev.some((c) => c.id === item.id)
			if (exists) {
				return prev.filter((c) => c.id !== item.id)
			} else {
				return [...prev, item]
			}
		})
	}

	const handleInstantDispatch = (item?: ServiceProcedureItem) => {
		let itemsToBook: ServiceProcedureItem[] = []
		if (item) {
			itemsToBook = cart.some((c) => c.id === item.id) ? cart : [...cart, item]
		} else {
			itemsToBook = cart.length > 0 ? cart : procedureItems[0] ? [procedureItems[0]] : []
		}
		navigation.navigate(ROUTES.STACK.ANCILLARY_BOOKING_DETAILS, {
			services: itemsToBook,
			selectedServices: itemsToBook,
			bookingPayload: {
				bookingType: 'INSTANT',
				serviceKey,
				serviceLabel,
				services: itemsToBook,
			},
		})
	}

	const handleSelectCondition = (id: string) => {
		setActiveCondition((prev) => (prev === id ? prev : id))
	}

	return (
		<View style={styles.container}>
			<AppScreenHeader title={activeUi.title} onBack={() => navigation.goBack()} />

			<ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
				{/* Search Bar */}
				<View style={styles.searchContainer}>
					<AppInput
						placeholder={activeUi.searchPlaceholder}
						value={searchQuery}
						onChangeText={setSearchQuery}
					/>
				</View>

				{serviceKey === 'nursing-care' && <NursingQuickActionCards />}

				{/* Categories Pill Bar */}
				<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesBar}>
					{categoryPills.map((cat) => {
						const isActive = activeCategory === cat.id
						return (
							<TouchableOpacity
								key={cat.id}
								style={[styles.categoryChip, isActive && styles.categoryChipActive]}
								onPress={() => setActiveCategory(cat.id)}
								activeOpacity={0.8}
							>
								<AppTypography variant="caption" style={[styles.categoryChipText, isActive && styles.categoryChipTextActive]}>
									{cat.label}
								</AppTypography>
							</TouchableOpacity>
						)
					})}
				</ScrollView>

				{isPhysiotherapy && (
					<PhysiotherapyConditionsGrid
						activeConditionId={activeCondition}
						onSelectCondition={handleSelectCondition}
					/>
				)}

				{loading ? (
					<View style={styles.loadingContainer}>
						<ActivityIndicator size="large" color="#0C7C7C" />
						<AppTypography variant="caption" style={styles.loadingText}>
							Loading services catalog...
						</AppTypography>
					</View>
				) : displayGroups.length === 0 || displayGroups[0].procedures.length === 0 ? (
					<View style={styles.emptyContainer}>
						<MaterialCommunityIcons name="clipboard-text-search-outline" size={48} color="#94A3B8" />
						<AppTypography variant="h3" style={styles.emptyTitle}>
							No Procedures Found
						</AppTypography>
						<AppTypography variant="caption" style={styles.emptySub}>
							Try searching with another term or reset your category filter.
						</AppTypography>
					</View>
				) : (
					displayGroups.map((group) => (
						<View key={group.id} style={styles.groupSection}>
							<AppTypography variant="h4" style={styles.groupTitle}>
								{group.categoryName}
							</AppTypography>

							{group.procedures.map((item) => {
								const isInCart = cart.some((c) => c.id === item.id)
								return (
									<AllServiceCard
										key={item.id}
										item={item}
										quantity={isInCart ? 1 : 0}
										onIncrement={() => handleToggleProcedure(item)}
										onDecrement={() => handleToggleProcedure(item)}
										onSelectService={() => handleToggleProcedure(item)}
										onCardPress={() => setSelectedProcedure(item)}
									/>
								)
							})}
						</View>
					))
				)}
			</ScrollView>

			{/* Floating Cart Bar */}
			{cart.length > 0 && (
				<ViewCartFloatingBar
					itemCount={cart.length}
					totalAmount={`₹${cart.reduce((sum, item) => sum + (parseFloat(item.price.replace('₹', '')) || 0), 0)}`}
					onViewCart={() => handleInstantDispatch()}
				/>
			)}

			{/* Procedure Details Bottom Sheet */}
			<ServiceDetailsBottomSheet
				visible={!!selectedProcedure}
				service={selectedProcedure}
				onClose={() => setSelectedProcedure(null)}
				onAddToBooking={(p: ServiceProcedureItem) => {
					handleToggleProcedure(p)
					setSelectedProcedure(null)
				}}
			/>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#F8FAFC',
	},
	scrollContent: {
		paddingBottom: 100,
	},
	searchContainer: {
		paddingHorizontal: 16,
		paddingTop: 12,
		paddingBottom: 8,
	},
	categoriesBar: {
		paddingHorizontal: 16,
		paddingVertical: 8,
		gap: 8,
	},
	categoryChip: {
		paddingHorizontal: 14,
		paddingVertical: 8,
		borderRadius: 20,
		backgroundColor: '#F1F5F9',
		borderWidth: 1,
		borderColor: '#E2E8F0',
	},
	categoryChipActive: {
		backgroundColor: '#0C7C7C',
		borderColor: '#0C7C7C',
	},
	categoryChipText: {
		color: '#475569',
		fontWeight: '600',
		fontSize: 12,
	},
	categoryChipTextActive: {
		color: '#FFFFFF',
	},
	loadingContainer: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 60,
	},
	loadingText: {
		marginTop: 12,
		color: '#64748B',
	},
	emptyContainer: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 60,
		paddingHorizontal: 32,
	},
	emptyTitle: {
		marginTop: 16,
		color: '#1E293B',
		fontWeight: '700',
	},
	emptySub: {
		marginTop: 6,
		color: '#64748B',
		textAlign: 'center',
	},
	groupSection: {
		paddingHorizontal: 16,
		marginTop: 16,
	},
	groupTitle: {
		fontSize: 16,
		fontWeight: '700',
		color: '#0F172A',
		marginBottom: 12,
	},
})
