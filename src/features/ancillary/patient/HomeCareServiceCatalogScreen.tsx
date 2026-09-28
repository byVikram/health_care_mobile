import React, { useEffect, useMemo, useState } from 'react'
import {
	ActivityIndicator,
	BackHandler,
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons'
import {
	AppTypography,
	AppInput,
	AppScreenHeader,
	ServiceProcedureItem,
	ServiceCatalogCard,
	ServiceDetailsSheet,
	SelectionRowCard,
} from '../../../components/common'
import { getAncillaryImageSource } from '../utils/ancillaryImageResolver'
import { ViewCartFloatingBar } from '../components/ViewCartFloatingBar'
import { ConditionGrid, ConditionGridItem } from '../components/ConditionGrid'
import { ROUTES } from '../../../navigation/routes'
import {
	AncillaryCategoryApiItem,
	AncillaryServiceItem,
	fetchAncillaryCategoriesBackend,
	fetchAncillaryServicesBackend,
} from '../ancillaryService'

// Icon lookup for the Home Care category grid (reusing ConditionGrid, the
// same pattern Nursing Care and Physiotherapy already use in
// AncillaryServiceCatalogScreen.tsx) -- categories still come from the API;
// this only supplies an icon per known label so the shared grid has
// something to show. Any unknown/future category label falls back to
// HOME_CARE_DEFAULT_ICON.
const HOME_CARE_CATEGORY_ICONS: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
	'personal care': 'account-heart-outline',
	'mobility support': 'walk',
	'companionship': 'account-group-outline',
}
const HOME_CARE_DEFAULT_ICON: keyof typeof MaterialCommunityIcons.glyphMap = 'clipboard-text-outline'
const HOME_CARE_ALL_CATEGORY_ID = 'all'

export type CareBookingMode = 'COMPLETE_CARE' | 'FIXED_DURATION'

interface CategoryGroup {
	id: string
	categoryName: string
	procedures: ServiceProcedureItem[]
}

const HOME_CARE_HEADER_IMAGE = 'https://images.unsplash.com/photo-1581579438747-1dc8d17bbce4?auto=format&fit=crop&w=300&q=80'

export default function HomeCareServiceCatalogScreen() {
	const navigation = useNavigation<any>()
	const route = useRoute<any>()

	// Care Mode Selection (Complete Care vs Hourly Care) at catalog stage
	const [selectedCareMode, setSelectedCareMode] = useState<CareBookingMode>(
		route.params?.careBookingMode || 'COMPLETE_CARE'
	)

	const [categories, setCategories] = useState<AncillaryCategoryApiItem[]>([])
	const [rawServices, setRawServices] = useState<AncillaryServiceItem[]>([])
	const [loading, setLoading] = useState(true)
	const [activeCategory, setActiveCategory] = useState<string>('all')
	const [searchQuery, setSearchQuery] = useState('')
	const [selectedProcedure, setSelectedProcedure] = useState<ServiceProcedureItem | null>(null)
	const [cart, setCart] = useState<ServiceProcedureItem[]>([])

	useEffect(() => {
		let isMounted = true
		const loadCatalog = async () => {
			try {
				setLoading(true)
				const [cats, srvs] = await Promise.all([
					fetchAncillaryCategoriesBackend('home-care'),
					fetchAncillaryServicesBackend({ specialtyId: 'home-care' }),
				])
				if (isMounted) {
					setCategories(cats)
					setRawServices(srvs)
				}
			} catch (e) {
				console.log('[HomeCareServiceCatalogScreen] Catalog load error:', e)
			} finally {
				if (isMounted) setLoading(false)
			}
		}
		void loadCatalog()
		return () => {
			isMounted = false
		}
	}, [])

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
		return [{ id: 'all', label: 'All Activities' }, ...categories]
	}, [categories])

	// Home Care category filters, reusing the exact same ConditionGrid card UI
	// Nursing Care and Physiotherapy already use in AncillaryServiceCatalogScreen.tsx
	// (see NURSING_CATEGORY_ICONS there) -- categories/ids/labels are still exactly
	// what the API returns; only an icon is attached here for display.
	const homeCareConditions = useMemo<ConditionGridItem[]>(() => {
		return categories.map((cat) => ({
			id: cat.id,
			label: cat.label,
			icon: HOME_CARE_CATEGORY_ICONS[cat.label.trim().toLowerCase()] || HOME_CARE_DEFAULT_ICON,
		}))
	}, [categories])

	const procedureItems = useMemo<ServiceProcedureItem[]>(() => {
		return rawServices.map((s) => {
			const title = s.title || (s as any).label || (s as any).name || ''
			const description = s.description || s.about_service || s.aboutService || ''

			return {
				id: s.id,
				categoryId: s.categoryId ?? null,
				title,
				description,
				duration: '',
				price: '',
				image: HOME_CARE_HEADER_IMAGE,
				image_url: s.image_url ?? s.imageUrl ?? HOME_CARE_HEADER_IMAGE,
				premiumBadgeText: 'Home Care',
				about_service: s.about_service ?? s.aboutService ?? null,
				whats_included: s.whats_included ?? s.whatsIncluded ?? null,
			}
		})
	}, [rawServices])

	const allSelected = useMemo(() => {
		return procedureItems.length > 0 && cart.length === procedureItems.length
	}, [cart, procedureItems])

	const handleToggleSelectAll = () => {
		if (allSelected) {
			setCart([])
		} else {
			setCart([...procedureItems])
		}
	}

	const displayGroups = useMemo<CategoryGroup[]>(() => {
		let filtered = procedureItems
		let groupTitle = 'All Home Care Activities'

		if (activeCategory !== 'all') {
			filtered = filtered.filter((p) => p.categoryId === activeCategory)
			groupTitle = categoryPills.find((c) => c.id === activeCategory)?.label || 'Home Care Activities'
		}

		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase().trim()
			filtered = filtered.filter(
				(p) => p.title.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q)
			)
		}

		return [
			{
				id: 'group-all',
				categoryName: groupTitle,
				procedures: filtered,
			},
		]
	}, [procedureItems, searchQuery, activeCategory, categoryPills])

	const handleAddProcedure = (item: ServiceProcedureItem) => {
		setCart((prev) => {
			const exists = prev.some((c) => c.id === item.id)
			if (exists) return prev
			return [...prev, item]
		})
	}

	const handleRemoveProcedure = (item: ServiceProcedureItem) => {
		setCart((prev) => prev.filter((c) => c.id !== item.id))
	}

	const handleProceedToBooking = () => {
		if (cart.length === 0) return
		// Same continuation Nursing/Physiotherapy already use from
		// AncillaryServiceCatalogScreen.tsx's handleInstantDispatch --
		// Home Care activities are ServiceProcedureItem[] from the same
		// ancillary catalog API, so they carry into Booking Details, the
		// Booking Summary/Payment flow, and (for "Select a Caregiver")
		// AncillaryProvidersPage exactly the same way any other ancillary
		// specialty's selected services do.
		navigation.navigate(ROUTES.STACK.ANCILLARY_BOOKING_DETAILS, {
			services: cart,
			selectedServices: cart,
			bookingPayload: {
				bookingType: 'INSTANT',
				serviceKey: 'home-care',
				serviceLabel: 'Home Care & Daily Living',
				careBookingMode: selectedCareMode,
				services: cart,
			},
		})
	}

	return (
		<View style={styles.container}>
			<AppScreenHeader title="Home Care & Daily Living" onBack={() => navigation.goBack()} />

			<ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
				{/* Search Bar */}
				<View style={styles.searchContainer}>
					<AppInput
						placeholder="Search activities e.g. Bathing, Mobility, Feeding..."
						value={searchQuery}
						onChangeText={setSearchQuery}
					/>
				</View>

				{/* 1. CARE MODE SELECTION SECTION */}
				<View style={styles.careModeSection}>
					<View style={styles.modeSectionHeader}>
						<Ionicons name="options-outline" size={18} color="#0C7C7C" />
						<AppTypography variant="subtitle" style={styles.modeSectionTitle}>
							Choose Care Type
						</AppTypography>
					</View>

					<View style={styles.modeOptionsContainer}>
						<SelectionRowCard
							icon={
								<MaterialCommunityIcons
									name="clipboard-pulse-outline"
									size={20}
									color={selectedCareMode === 'COMPLETE_CARE' ? '#FFFFFF' : '#0C7C7C'}
								/>
							}
							title="Complete Care"
							subtitle="I need comprehensive home care support. Caregiver evaluates needs on-site to determine required daily hours."
							badgeText="Assessment-Based"
							selected={selectedCareMode === 'COMPLETE_CARE'}
							onPress={() => setSelectedCareMode('COMPLETE_CARE')}
						/>
						{selectedCareMode === 'COMPLETE_CARE' && (
							<TouchableOpacity
								style={[styles.quickSelectAllRow, allSelected && styles.quickSelectAllRowActive]}
								onPress={handleToggleSelectAll}
								activeOpacity={0.8}
							>
								<Ionicons
									name={allSelected ? 'checkmark-circle' : 'checkmark-circle-outline'}
									size={16}
									color={allSelected ? '#0C7C7C' : '#64748B'}
								/>
								<Text style={[styles.quickSelectAllText, allSelected && styles.quickSelectAllTextActive]}>
									{allSelected ? `All ${procedureItems.length} activities selected` : `Select all ${procedureItems.length} care activities`}
								</Text>
							</TouchableOpacity>
						)}

						<SelectionRowCard
							icon={
								<MaterialCommunityIcons
									name="clock-time-four-outline"
									size={20}
									color={selectedCareMode === 'FIXED_DURATION' ? '#FFFFFF' : '#0C7C7C'}
								/>
							}
							title="Hourly Care"
							subtitle="Book dedicated caregiver support by the hour (1h – 12h) for your selected activities."
							badgeText="₹250/hr Standard"
							selected={selectedCareMode === 'FIXED_DURATION'}
							onPress={() => setSelectedCareMode('FIXED_DURATION')}
						/>
						{selectedCareMode === 'FIXED_DURATION' && (
							<Text style={styles.modeHint}>Select activities below to form your visit care scope.</Text>
						)}
					</View>
				</View>

				{/* 2. CATEGORY FILTER GRID */}
				<ConditionGrid
					activeConditionId={activeCategory}
					onSelectCondition={(id) =>
						setActiveCategory((prev) => (prev === id && id !== HOME_CARE_ALL_CATEGORY_ID ? HOME_CARE_ALL_CATEGORY_ID : id))
					}
					conditions={homeCareConditions}
					title="Home Care For?"
					subtitle={`${procedureItems.length} activities available`}
					allChipId={HOME_CARE_ALL_CATEGORY_ID}
					cardWidthPercent="48%"
				/>

				{/* 3. ACTIVITY LIST */}
				{loading ? (
					<View style={styles.loadingContainer}>
						<ActivityIndicator size="large" color="#0C7C7C" />
						<AppTypography variant="caption" style={styles.loadingText}>
							Loading Home Care activities...
						</AppTypography>
					</View>
				) : displayGroups.length === 0 || displayGroups[0].procedures.length === 0 ? (
					<View style={styles.emptyContainer}>
						<MaterialCommunityIcons name="clipboard-text-search-outline" size={48} color="#94A3B8" />
						<AppTypography variant="h3" style={styles.emptyTitle}>
							No Activities Found
						</AppTypography>
						<AppTypography variant="caption" style={styles.emptySub}>
							Try searching with another term or reset your category filter.
						</AppTypography>
					</View>
				) : (
					displayGroups.map((group) => (
						<View key={group.id} style={styles.groupSection}>
							<AppTypography variant="h4" style={styles.groupTitle}>
								{group.categoryName} ({group.procedures.length})
							</AppTypography>

							{group.procedures.map((item) => {
								const isInCart = cart.some((c) => c.id === item.id)
								return (
									<ServiceCatalogCard
										key={item.id}
										item={{
											...item,
											actionLabel: '+ Add',
										}}
										quantity={isInCart ? 1 : 0}
										onIncrement={() => handleAddProcedure(item)}
										onDecrement={() => handleRemoveProcedure(item)}
										onSelectService={() => {
											if (isInCart) {
												handleRemoveProcedure(item)
											} else {
												handleAddProcedure(item)
											}
										}}
										onCardPress={() => setSelectedProcedure(item)}
										resolveImageSource={getAncillaryImageSource}
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
					itemLabel="Activity"
					totalAmount={selectedCareMode === 'COMPLETE_CARE' ? 'Complete Care' : 'â‚¹250/hr Standard'}
					onViewCart={handleProceedToBooking}
				/>
			)}

			{/* Activity Details Bottom Sheet */}
			<ServiceDetailsSheet
				visible={!!selectedProcedure}
				service={selectedProcedure}
				onClose={() => setSelectedProcedure(null)}
				onAddToBooking={(service: ServiceProcedureItem) => {
					handleAddProcedure(service)
					setSelectedProcedure(null)
				}}
				showReviews={false}
				actionButtonText="Add Activity"
				resolveImageSource={getAncillaryImageSource}
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
		paddingBottom: 110,
	},
	searchContainer: {
		paddingHorizontal: 16,
		paddingTop: 12,
		paddingBottom: 4,
	},
	careModeSection: {
		marginHorizontal: 16,
		marginTop: 8,
		marginBottom: 6,
		gap: 8,
	},
	modeSectionHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	modeSectionTitle: {
		fontSize: 14,
		fontWeight: '700',
		color: '#0F172A',
	},
	modeOptionsContainer: {
		gap: 10,
	},
	modeHint: {
		fontSize: 11,
		color: '#0C7C7C',
		fontWeight: '600',
		marginTop: 2,
		marginLeft: 2,
	},
	quickSelectAllRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		backgroundColor: '#FFFFFF',
		paddingVertical: 6,
		paddingHorizontal: 10,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#E6F4F4',
		alignSelf: 'flex-start',
		marginTop: 4,
	},
	quickSelectAllRowActive: {
		borderColor: '#0C7C7C',
		backgroundColor: '#E6F4F4',
	},
	quickSelectAllText: {
		fontSize: 11.5,
		fontWeight: '600',
		color: '#475569',
	},
	quickSelectAllTextActive: {
		color: '#0C7C7C',
		fontWeight: '700',
	},
	groupSection: {
		marginTop: 12,
		paddingHorizontal: 16,
	},
	groupTitle: {
		fontSize: 15,
		fontWeight: '700',
		color: '#0F172A',
		marginBottom: 10,
	},
	loadingContainer: {
		paddingVertical: 48,
		alignItems: 'center',
		justifyContent: 'center',
	},
	loadingText: {
		marginTop: 12,
		fontSize: 13,
		color: '#64748B',
	},
	emptyContainer: {
		paddingVertical: 48,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 24,
	},
	emptyTitle: {
		fontSize: 16,
		fontWeight: '700',
		color: '#334155',
		marginTop: 12,
	},
	emptySub: {
		fontSize: 13,
		color: '#64748B',
		textAlign: 'center',
		marginTop: 4,
	},
})

