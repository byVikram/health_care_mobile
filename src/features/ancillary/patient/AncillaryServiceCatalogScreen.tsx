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
import { ConditionGrid, ConditionGridItem } from '../components/ConditionGrid'
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
		title: 'Physiotherapy',
		searchPlaceholder: 'Search physiotherapy e.g. Back pain, Knee pain...',
		image: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=300&q=80',
		premiumBadgeText: 'Verified PT',
	},
	'rehab-care': {
		title: 'Rehab Care Support',
		searchPlaceholder: 'Search rehab care e.g. Stroke, Cardiac...',
		image: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=300&q=80',
	},
	'medical-equipment': {
		title: 'Medical Equipment',
		searchPlaceholder: 'Search medical equipment e.g. Wheelchair, Oxygen...',
		image: 'https://images.unsplash.com/photo-1576671081837-49000212a370?auto=format&fit=crop&w=300&q=80',
	},
	'elder-day-care': {
		title: 'Elder Day Care & Assistance',
		searchPlaceholder: 'Search elder care e.g. Companion, Mobility...',
		image: 'https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?auto=format&fit=crop&w=300&q=80',
	},
}

// Icon lookup for the Nursing filter cards (reusing ConditionGrid --
// see below). Categories themselves still come from the API (fetchAncillaryCategories),
// this only supplies an icon per known label so the reused card UI has something to
// show; any future/unknown category label falls back to NURSING_DEFAULT_ICON so the
// screen never breaks if the backend adds a new nursing category.
const NURSING_CATEGORY_ICONS: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
	'general nursing procedures': 'needle',
	'wound & recovery care': 'bandage',
	'specialized high dependency care': 'hospital-box-outline',
}
const NURSING_ALL_ICON: keyof typeof MaterialCommunityIcons.glyphMap = 'view-grid-outline'
const NURSING_DEFAULT_ICON: keyof typeof MaterialCommunityIcons.glyphMap = 'clipboard-text-outline'

// Sentinel id for the Nursing "All Services" chip/selection -- matches the
// existing `activeCategory` default of 'all' used by the category pill bar
// for other specialties, kept here so the toggle-handler factory below can
// treat Nursing and Physiotherapy identically.
const NURSING_ALL_CATEGORY_ID = 'all'

// Sentinel id for the Physiotherapy "All Services" chip/selection -- not a real
// lookup_ancillary_category.public_id, just means "show every fetched service,
// unfiltered". This is also the default selection when the screen opens.
// Lives here (not in ConditionGrid.tsx) because it's Physiotherapy-specific
// business data, same as PHYSIOTHERAPY_CONDITIONS below.
export const PHYSIOTHERAPY_ALL_CONDITION_ID = 'phys-all'

// The 9 "Find Physiotherapy for" condition cards. `id` values are the real
// lookup_ancillary_category.public_id rows used to filter already-fetched
// Physiotherapy services client-side (see displayGroups below) -- this array
// is the single source of truth for that data; ConditionGrid.tsx only renders
// whatever list of { id, label, icon } it's given.
// Icons restored from the original PhysiotherapyConditionsGrid.tsx implementation
// (recovered from git history, commit 99206c0) rather than newly invented ones.
const PHYSIOTHERAPY_CONDITIONS: ConditionGridItem[] = [
	{ id: 'phys-knee', label: 'Knee Pain', icon: 'bone' },
	{ id: 'phys-back', label: 'Back Pain', icon: 'human-male-height' },
	{ id: 'phys-neck', label: 'Neck Pain', icon: 'head-alert-outline' },
	{ id: 'phys-shoulder', label: 'Shoulder Pain', icon: 'arm-flex-outline' },
	{ id: 'phys-hand', label: 'Hand Pain', icon: 'hand-back-right-outline' },
	{ id: 'phys-leg', label: 'Leg Pain', icon: 'walk' },
	{ id: 'phys-sports-injury', label: 'Sports Injury', icon: 'dumbbell' },
	{ id: 'phys-stroke', label: 'Stroke Rehab', icon: 'brain' },
	{ id: 'phys-post-surgery', label: 'Post Surgery', icon: 'bandage' },
]

// Shared toggle-select behavior for any ConditionGrid usage on this screen:
// tapping the already-active card unselects it and falls back to that grid's
// "All Services" sentinel, instead of leaving the card stuck selected with no
// way to turn it off. Tapping any other card (or the "All Services" chip
// itself) just selects that id as usual. This is the exact behavior
// Physiotherapy already had; Nursing now reuses the same factory instead of
// duplicating the logic.
function createConditionToggleHandler(
	setActiveId: (updater: (prev: string) => string) => void,
	allServicesId: string
) {
	return (id: string) => {
		setActiveId((prev) => {
			if (prev === id && id !== allServicesId) {
				return allServicesId
			}
			return id
		})
	}
}

export default function AncillaryServiceCatalogScreen() {
	const navigation = useNavigation<any>()
	const route = useRoute<any>()

	const serviceKey = route.params?.serviceKey || 'nursing-care'
	const serviceLabel = route.params?.serviceLabel || 'Nursing Care'
	const activeUi = SERVICE_UI[serviceKey] || SERVICE_UI['nursing-care']
	const isPhysiotherapy = serviceKey === 'physiotherapy'
	// Reuses the same ConditionGrid card UI for its filters (see
	// nursingConditions below / render block) -- functionality/state is unchanged.
	const isNursing = serviceKey === 'nursing-care'

	const [categories, setCategories] = useState<AncillaryCategoryApiItem[]>([])
	const [rawServices, setRawServices] = useState<AncillaryServiceItem[]>([])
	const [loading, setLoading] = useState(true)
	const [activeCategory, setActiveCategory] = useState<string>('all')
	const [searchQuery, setSearchQuery] = useState('')
	const [selectedProcedure, setSelectedProcedure] = useState<ServiceProcedureItem | null>(null)
	const [cart, setCart] = useState<ServiceProcedureItem[]>([])
	// For Physiotherapy, this holds the id of the selected "Find Physiotherapy for"
	// card. It is either a lookup_ancillary_category.public_id (e.g. "phys-knee"),
	// used to filter the already-fetched procedures, or the PHYSIOTHERAPY_ALL_CONDITION_ID
	// sentinel meaning "show every fetched service, unfiltered" -- which is also
	// the default selection when the screen opens.
	const [activeCondition, setActiveCondition] = useState<string | null>(isPhysiotherapy ? PHYSIOTHERAPY_ALL_CONDITION_ID : null)

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

	// Nursing filter cards, reusing ConditionGrid's card UI.
	// Only the 3 real categories go into the grid -- "All Services" is now the
	// existing top-right header chip (allChipId="all" in the render below)
	// instead of a card, so it isn't included here. Categories/ids/labels are
	// still exactly what the API returns via fetchAncillaryCategories -- only
	// an icon is attached here for display; the existing activeCategory state
	// and filtering in displayGroups below are completely unchanged.
	const nursingConditions = useMemo<ConditionGridItem[]>(() => {
		if (!isNursing) return []
		return categories.map((cat) => ({
			id: cat.id,
			label: cat.label,
			icon: NURSING_CATEGORY_ICONS[cat.label.trim().toLowerCase()] || NURSING_DEFAULT_ICON,
		}))
	}, [isNursing, categories])

	const activeConditionMeta = useMemo(() => {
		if (!isPhysiotherapy || !activeCondition) return null
		return PHYSIOTHERAPY_CONDITIONS.find((c) => c.id === activeCondition) || null
	}, [isPhysiotherapy, activeCondition])

	const procedureItems = useMemo<ServiceProcedureItem[]>(() => {
		return rawServices.map((s) => {
			const title = s.title || (s as any).label || (s as any).name || ''
			const description = s.description || s.about_service || s.aboutService || ''

			return {
				id: s.id,
				categoryId: s.categoryId ?? null,
				title,
				description,
				price: typeof s.price === 'number' ? `₹${s.price}` : String(s.price || '₹499'),
				duration: '30-45 mins',
				image: activeUi.image,
				image_url: s.image_url ?? s.imageUrl ?? null,
				premiumBadgeText: activeUi.premiumBadgeText,
				about_service: s.about_service ?? s.aboutService ?? null,
				whats_included: s.whats_included ?? s.whatsIncluded ?? null,
			}
		})
	}, [rawServices, activeUi.image, activeUi.premiumBadgeText])

	const displayGroups = useMemo<CategoryGroup[]>(() => {
		let filtered = procedureItems
		let groupTitle = activeUi.title

		if (isPhysiotherapy) {
			// The "Find Physiotherapy for" cards are the patient-facing filters
			// here. "All Services" (and no selection) show every service already
			// fetched for this specialty with no extra API call; any specific
			// condition filters the same already-fetched list by that condition's
			// category public_id (lookup_ancillary_category.public_id).
			if (activeConditionMeta && activeConditionMeta.id !== PHYSIOTHERAPY_ALL_CONDITION_ID) {
				filtered = filtered.filter((p) => p.categoryId === activeConditionMeta.id)
				groupTitle = `${activeConditionMeta.label} Services`
			} else {
				groupTitle = 'All Physiotherapy Services'
			}
		} else if (activeCategory !== 'all') {
			filtered = filtered.filter((p) => p.categoryId === activeCategory)
			groupTitle = categoryPills.find((c) => c.id === activeCategory)?.label || activeUi.title
		}

		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase().trim()
			filtered = filtered.filter(
				(p) => p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
			)
		}

		return [
			{
				id: 'group-all',
				categoryName: groupTitle,
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

	// Physiotherapy condition-card toggle: tapping the active card falls back
	// to PHYSIOTHERAPY_ALL_CONDITION_ID ("All Services"); tapping any other
	// card (or the "All Services" chip) just selects that id. Unchanged from
	// before -- now built from the shared factory above.
	const handleSelectCondition = useMemo(
		() => createConditionToggleHandler(setActiveCondition as (updater: (prev: string) => string) => void, PHYSIOTHERAPY_ALL_CONDITION_ID),
		[]
	)

	// Nursing category-card toggle: exactly the same behavior as Physiotherapy
	// above, reusing the same factory instead of new logic -- tapping the
	// active category card falls back to NURSING_ALL_CATEGORY_ID ('all'),
	// which is also what the top-right "All Services" chip already sets, so
	// displayGroups' existing `activeCategory !== 'all'` filtering needs no
	// changes.
	const handleSelectNursingCategory = useMemo(
		() => createConditionToggleHandler(setActiveCategory, NURSING_ALL_CATEGORY_ID),
		[]
	)

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

				{/* Categories Pill Bar -- Physiotherapy and Nursing no longer use this
				    row; their filtering is handled by the reusable card-grid UI below
				    instead (ConditionGrid, reused for both). */}
				{!isPhysiotherapy && !isNursing && (
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
				)}

				{/* Physiotherapy filters: conditions/labels/icons and the "All
				    Services" sentinel are all defined above in this file
				    (PHYSIOTHERAPY_CONDITIONS / PHYSIOTHERAPY_ALL_CONDITION_ID) --
				    ConditionGrid only renders whatever list + chip id it's given. */}
				{isPhysiotherapy && (
					<ConditionGrid
						activeConditionId={activeCondition}
						onSelectCondition={handleSelectCondition}
						conditions={PHYSIOTHERAPY_CONDITIONS}
						title="Find Physiotherapy for"
						allChipId={PHYSIOTHERAPY_ALL_CONDITION_ID}
					/>
				)}

				{/* Nursing filters: same card UI as Physiotherapy above, reusing
				    ConditionGrid with Nursing's category data and its own
				    Nursing-specific title/subtitle. Only the 3 real categories
				    (General Nursing Procedures, Wound & Recovery Care, Specialized
				    High Dependency Care) go into the grid -- "All Services" is
				    NOT one of the cards; it lives on the header's top-right chip
				    (allChipId="all") only. Tapping an already-active category card
				    now toggles it off back to "All Services" via
				    handleSelectNursingCategory, exactly like Physiotherapy's
				    handleSelectCondition -- the chip itself still just selects
				    'all' directly either way. Selection wiring otherwise still
				    just sets the existing activeCategory state, exactly like the
				    pill bar it replaced -- so displayGroups' filtering logic below
				    needs no changes. */}
				{isNursing && (
					<ConditionGrid
						activeConditionId={activeCategory}
						onSelectCondition={handleSelectNursingCategory}
						conditions={nursingConditions}
						title="Nursing Care For?"
						subtitle="Select a care category"
						allChipId={NURSING_ALL_CATEGORY_ID}
						cardWidthPercent="48%"
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
