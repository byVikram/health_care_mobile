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
import { ROUTES } from '../../../navigation/routes'
import { AppTypography, AppInput, AppScreenHeader } from '../../../components/common'
import { ServiceProcedureItem, AllServiceCard } from '../components/AllServiceCard'
import { ServiceDetailsBottomSheet } from '../components/ServiceDetailsBottomSheet'
import { ViewCartFloatingBar } from '../components/ViewCartFloatingBar'
import {
	AncillaryCategoryApiItem,
	AncillaryServiceItem,
	fetchAncillaryCategoriesBackend,
	fetchAncillaryServicesBackend,
} from '../ancillaryService'

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

	// Sync selection state if returning from Booking Details
	useEffect(() => {
		if (route.params?.updatedCart) {
			setCart(route.params.updatedCart)
			navigation.setParams({ updatedCart: undefined })
		}
		if (route.params?.careBookingMode) {
			setSelectedCareMode(route.params.careBookingMode)
			navigation.setParams({ careBookingMode: undefined })
		}
	}, [route.params?.updatedCart, route.params?.careBookingMode])

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
		navigation.navigate(ROUTES.STACK.HOME_CARE_BOOKING_DETAILS, {
			selectedServices: cart,
			careBookingMode: selectedCareMode,
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
						<Ionicons name="options-outline" size={18} color="#2B6F71" />
						<AppTypography variant="subtitle" style={styles.modeSectionTitle}>
							Choose Care Type
						</AppTypography>
					</View>

					<View style={styles.modeOptionsContainer}>
						{/* Complete Care Option Card */}
						<TouchableOpacity
							style={[styles.modeCard, selectedCareMode === 'COMPLETE_CARE' && styles.modeCardActive]}
							onPress={() => setSelectedCareMode('COMPLETE_CARE')}
							activeOpacity={0.85}
						>
							<View style={styles.modeCardTopRow}>
								<View style={[styles.modeRadio, selectedCareMode === 'COMPLETE_CARE' && styles.modeRadioActive]}>
									{selectedCareMode === 'COMPLETE_CARE' && <View style={styles.modeRadioDot} />}
								</View>
								<View style={[styles.modeBadge, selectedCareMode === 'COMPLETE_CARE' && styles.modeBadgeActive]}>
									<Text style={[styles.modeBadgeText, selectedCareMode === 'COMPLETE_CARE' && styles.modeBadgeTextActive]}>
										Assessment-Based
									</Text>
								</View>
							</View>
							<Text style={styles.modeTitle}>Complete Care</Text>
							<Text style={styles.modeDescription}>
								I need comprehensive home care support. Caregiver evaluates needs on-site to determine required daily hours.
							</Text>
							{selectedCareMode === 'COMPLETE_CARE' && (
								<TouchableOpacity
									style={[styles.quickSelectAllRow, allSelected && styles.quickSelectAllRowActive]}
									onPress={handleToggleSelectAll}
									activeOpacity={0.8}
								>
									<Ionicons
										name={allSelected ? 'checkmark-circle' : 'checkmark-circle-outline'}
										size={16}
										color={allSelected ? '#2B6F71' : '#64748B'}
									/>
									<Text style={[styles.quickSelectAllText, allSelected && styles.quickSelectAllTextActive]}>
										{allSelected ? 'All 18 activities selected' : 'Select all 18 care activities'}
									</Text>
								</TouchableOpacity>
							)}
						</TouchableOpacity>

						{/* Hourly Care Option Card */}
						<TouchableOpacity
							style={[styles.modeCard, selectedCareMode === 'FIXED_DURATION' && styles.modeCardActive]}
							onPress={() => setSelectedCareMode('FIXED_DURATION')}
							activeOpacity={0.85}
						>
							<View style={styles.modeCardTopRow}>
								<View style={[styles.modeRadio, selectedCareMode === 'FIXED_DURATION' && styles.modeRadioActive]}>
									{selectedCareMode === 'FIXED_DURATION' && <View style={styles.modeRadioDot} />}
								</View>
								<View style={[styles.modeBadge, selectedCareMode === 'FIXED_DURATION' && styles.modeBadgeActive]}>
									<Text style={[styles.modeBadgeText, selectedCareMode === 'FIXED_DURATION' && styles.modeBadgeTextActive]}>
										₹250/hr Standard
									</Text>
								</View>
							</View>
							<Text style={styles.modeTitle}>Hourly Care</Text>
							<Text style={styles.modeDescription}>
								Book dedicated caregiver support by the hour (1h – 12h) for your selected activities.
							</Text>
							<Text style={styles.modeHint}>
								Select activities below to form your visit care scope. Duration is configured during booking.
							</Text>
						</TouchableOpacity>
					</View>
				</View>

				{/* 2. CATEGORIES PILL BAR */}
				<View style={styles.categoriesHeader}>
					<AppTypography variant="caption" style={styles.sectionHeadingLabel}>
						BROWSE CARE ACTIVITIES ({procedureItems.length})
					</AppTypography>
				</View>

				<ScrollView
					horizontal
					showsHorizontalScrollIndicator={false}
					contentContainerStyle={styles.categoriesBar}
				>
					{categoryPills.map((cat) => {
						const isActive = activeCategory === cat.id
						return (
							<TouchableOpacity
								key={cat.id}
								style={[styles.categoryChip, isActive && styles.categoryChipActive]}
								onPress={() => setActiveCategory(cat.id)}
								activeOpacity={0.8}
							>
								<AppTypography
									variant="caption"
									style={[styles.categoryChipText, isActive && styles.categoryChipTextActive]}
								>
									{cat.label}
								</AppTypography>
							</TouchableOpacity>
						)
					})}
				</ScrollView>

				{/* 3. ACTIVITY LIST */}
				{loading ? (
					<View style={styles.loadingContainer}>
						<ActivityIndicator size="large" color="#2B6F71" />
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
									<AllServiceCard
										key={item.id}
										item={{
											...item,
											actionLabel: '+ Add',
										}}
										showStepper={false}
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
					totalAmount={selectedCareMode === 'COMPLETE_CARE' ? 'Complete Care' : '₹250/hr Standard'}
					onViewCart={handleProceedToBooking}
				/>
			)}

			{/* Activity Details Bottom Sheet */}
			<ServiceDetailsBottomSheet
				visible={!!selectedProcedure}
				service={selectedProcedure}
				onClose={() => setSelectedProcedure(null)}
				onAddToBooking={(service) => {
					handleAddProcedure(service)
					setSelectedProcedure(null)
				}}
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
	modeCard: {
		backgroundColor: '#FFFFFF',
		borderRadius: 14,
		padding: 14,
		borderWidth: 1.5,
		borderColor: '#E2E8F0',
		gap: 6,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.04,
		shadowRadius: 3,
		elevation: 1,
	},
	modeCardActive: {
		backgroundColor: '#F0F9F9',
		borderColor: '#2B6F71',
		shadowColor: '#2B6F71',
		shadowOpacity: 0.08,
		shadowRadius: 6,
		elevation: 2,
	},
	modeCardTopRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	modeRadio: {
		width: 18,
		height: 18,
		borderRadius: 9,
		borderWidth: 2,
		borderColor: '#94A3B8',
		alignItems: 'center',
		justifyContent: 'center',
	},
	modeRadioActive: {
		borderColor: '#2B6F71',
	},
	modeRadioDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: '#2B6F71',
	},
	modeBadge: {
		backgroundColor: '#F1F5F9',
		paddingHorizontal: 8,
		paddingVertical: 3,
		borderRadius: 6,
	},
	modeBadgeActive: {
		backgroundColor: '#E6F4F4',
	},
	modeBadgeText: {
		fontSize: 11,
		fontWeight: '700',
		color: '#475569',
	},
	modeBadgeTextActive: {
		color: '#2B6F71',
	},
	modeTitle: {
		fontSize: 15,
		fontWeight: '700',
		color: '#0F172A',
	},
	modeDescription: {
		fontSize: 12.5,
		color: '#475569',
		lineHeight: 17,
	},
	modeHint: {
		fontSize: 11,
		color: '#2B6F71',
		fontWeight: '600',
		marginTop: 2,
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
		borderColor: '#2B6F71',
		backgroundColor: '#E6F4F4',
	},
	quickSelectAllText: {
		fontSize: 11.5,
		fontWeight: '600',
		color: '#475569',
	},
	quickSelectAllTextActive: {
		color: '#2B6F71',
		fontWeight: '700',
	},
	categoriesHeader: {
		paddingHorizontal: 16,
		marginTop: 10,
		marginBottom: 2,
	},
	sectionHeadingLabel: {
		fontSize: 11.5,
		fontWeight: '700',
		color: '#64748B',
		letterSpacing: 0.5,
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
		backgroundColor: '#FFFFFF',
		borderWidth: 1,
		borderColor: '#E2E8F0',
	},
	categoryChipActive: {
		backgroundColor: '#2B6F71',
		borderColor: '#2B6F71',
	},
	categoryChipText: {
		fontSize: 13,
		fontWeight: '600',
		color: '#475569',
	},
	categoryChipTextActive: {
		color: '#FFFFFF',
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
