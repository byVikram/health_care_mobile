import React, { useEffect, useMemo, useState } from 'react'
import {
	ActivityIndicator,
	BackHandler,
	Image,
	ScrollView,
	StyleSheet,
	TouchableOpacity,
	View,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ROUTES } from '../../../navigation/routes'
import { AppTypography, AppInput } from '../../../components/common'
import AppScreenHeader from '../../../components/common/AppScreenHeader'

import { ServiceProcedureItem, AllServiceCard } from '../components/AllServiceCard'
import { ServiceDetailsBottomSheet } from '../components/ServiceDetailsBottomSheet'
import { ViewCartFloatingBar } from '../components/ViewCartFloatingBar'
import {
	AncillaryCategoryApiItem,
	AncillaryServiceItem,
	fetchAncillaryCategoriesBackend,
	fetchAncillaryServicesBackend,
} from '../ancillaryService'

interface CategoryGroup {
	id: string
	categoryName: string
	procedures: ServiceProcedureItem[]
}

interface NursingCarePageProps {
	serviceKey?: string
	serviceLabel?: string
}

const SERVICE_UI = {
	'nursing-care': {
		title: 'Nursing Care & Procedures',
		searchPlaceholder: 'Search procedures e.g. Dressing, IV, Injection...',
		featuredTitle: 'Instant Home Nurse Dispatch (~25 mins)',
		urgentTitle: 'Need Urgent Nursing',
		bullets: ['Verified RNs', 'Sterile Medical Equipment', '24/7 Availability'],
		emptyTitle: 'No Procedures Found',
		emptySub: 'Try searching with another term or reset your category filter.',
		badge: 'Verified RN',
		image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=300&q=80',
	},
	physiotherapy: {
		title: 'Physiotherapy',
		searchPlaceholder: 'Search physiotherapy e.g. Back pain, Mobility, Rehab...',
		featuredTitle: 'Instant Home Physiotherapy (~25 mins)',
		urgentTitle: 'Need Urgent Physiotherapy',
		bullets: ['Verified Physiotherapists', 'Guided Recovery Plans', 'Home Sessions'],
		emptyTitle: 'No Physiotherapy Services Found',
		emptySub: 'Try searching with another term or reset your category filter.',
		badge: 'Verified PT',
		image: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=300&q=80',
	},
	'rehab-care': {
		title: 'Rehab Care',
		searchPlaceholder: 'Search rehab care e.g. Stroke, Cardiac, Occupational...',
		featuredTitle: 'Instant Rehab Care Support (~25 mins)',
		urgentTitle: 'Need Urgent Rehab Support',
		bullets: ['Verified Rehab Specialists', 'Recovery Programs', 'At-home Support'],
		emptyTitle: 'No Rehab Services Found',
		emptySub: 'Try searching with another term or reset your category filter.',
		badge: 'Verified Rehab',
		image: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=300&q=80',
	},
	'medical-equipment': {
		title: 'Medical Equipment',
		searchPlaceholder: 'Search equipment e.g. Bed, Oxygen, Wheelchair...',
		featuredTitle: 'Instant Medical Equipment Delivery (~25 mins)',
		urgentTitle: 'Need Urgent Medical Equipment',
		bullets: ['Sanitized Equipment', 'Home Delivery', 'Setup Support'],
		emptyTitle: 'No Equipment Found',
		emptySub: 'Try searching with another term or reset your category filter.',
		badge: 'Sanitized',
		image: 'https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&w=300&q=80',
	},
} as const

const formatPrice = (price: unknown) => {
	const numeric = Number(price)
	if (!Number.isFinite(numeric) || numeric <= 0) return 'Custom Pricing'
	return `₹${numeric}`
}

const readValue = (item: any, keys: string[], fallback = '') => {
	for (const key of keys) {
		const value = item?.[key]
		if (value !== undefined && value !== null && String(value).trim().length > 0) {
			return String(value)
		}
	}
	return fallback
}

const mapBackendService = (
	item: AncillaryServiceItem,
	ui: (typeof SERVICE_UI)[keyof typeof SERVICE_UI]
): ServiceProcedureItem => {
	const priceValue = (item as any).price ?? (item as any).basePrice ?? (item as any).startingPrice
	const price = formatPrice(priceValue)

	return {
		id: readValue(item, ['id', 'publicId', 'public_id', 'serviceId'], `service-${Date.now()}`),
		title: readValue(item, ['title', 'name', 'serviceName', 'label'], 'Healthcare Service'),
		description: readValue(item, ['description', 'subtitle', 'details'], 'Professional care service at your doorstep.'),
		duration: readValue(item, ['duration', 'estimatedDuration', 'estimated_duration', 'time'], '30 - 45 mins'),
		price,
		image: readValue(item, ['image', 'imageUrl', 'image_url', 'thumbnailUrl', 'thumbnail'], ui.image),
		verified: true,
		premiumBadgeText: ui.badge,
		actionLabel: price === 'Custom Pricing' ? 'Enquire' : 'Select',
	}
}

export default function NursingCarePage({ serviceKey = 'nursing-care', serviceLabel }: NursingCarePageProps) {
	const navigation = useNavigation<any>()
	const insets = useSafeAreaInsets()
	const ui = SERVICE_UI[serviceKey as keyof typeof SERVICE_UI] || {
		...SERVICE_UI['nursing-care'],
		title: serviceLabel || SERVICE_UI['nursing-care'].title,
	}

	const [searchQuery, setSearchQuery] = useState('')
	const [activeCategory, setActiveCategory] = useState('all')
	const [categoryGroups, setCategoryGroups] = useState<CategoryGroup[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [loadError, setLoadError] = useState('')
	const [selectedServicesMap, setSelectedServicesMap] = useState<Record<string, { item: ServiceProcedureItem; qty: number }>>({})
	const [detailSheetItem, setDetailSheetItem] = useState<ServiceProcedureItem | null>(null)

	useEffect(() => {
		let isMounted = true

		const loadServices = async () => {
			setIsLoading(true)
			setLoadError('')
			try {
				const [categories, services] = await Promise.all([
					fetchAncillaryCategoriesBackend(serviceKey),
					fetchAncillaryServicesBackend({ specialtyId: serviceKey }),
				])

				if (!isMounted) return

				const categoryMap = new Map<string, AncillaryCategoryApiItem>()
				categories.forEach((cat) => categoryMap.set(String(cat.id), cat))

				const grouped = services.reduce<Record<string, CategoryGroup>>((acc, service) => {
					const categoryId = readValue(service, ['categoryId', 'category_id'], 'available')
					const categoryName =
						readValue(service, ['categoryName', 'category_name']) ||
						categoryMap.get(categoryId)?.label ||
						'Available Services'

					if (!acc[categoryId]) {
						acc[categoryId] = { id: categoryId, categoryName, procedures: [] }
					}
					acc[categoryId].procedures.push(mapBackendService(service, ui))
					return acc
				}, {})

				setCategoryGroups(Object.values(grouped))
			} catch (error) {
				if (isMounted) {
					setLoadError('Unable to load services right now.')
					setCategoryGroups([])
				}
			} finally {
				if (isMounted) setIsLoading(false)
			}
		}

		loadServices()

		return () => {
			isMounted = false
		}
	}, [serviceKey])

	const filteredCategories = useMemo(() => {
		return categoryGroups.map((cat) => {
			if (activeCategory !== 'all' && cat.id !== activeCategory) return null

			const matchingProcedures = cat.procedures.filter((p) => {
				const query = searchQuery.toLowerCase()
				return p.title.toLowerCase().includes(query) || p.description.toLowerCase().includes(query)
			})

			if (matchingProcedures.length === 0) return null
			return { ...cat, procedures: matchingProcedures }
		}).filter(Boolean) as CategoryGroup[]
	}, [searchQuery, activeCategory, categoryGroups])

	const categoryCards = useMemo(() => {
		const totalCount = categoryGroups.reduce((sum, group) => sum + group.procedures.length, 0)
		return [
			{ id: 'all', label: 'All Services', sublabel: `${totalCount} Available`, image: ui.image },
			...categoryGroups.map((group) => ({
				id: group.id,
				label: group.categoryName,
				sublabel: `${group.procedures.length} Available`,
				image: group.procedures[0]?.image || ui.image,
			})),
		].slice(0, 4)
	}, [categoryGroups, ui.image])

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
			return { ...prev, [item.id]: { item, qty: current + 1 } }
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
			return { ...prev, [item.id]: { item, qty: current - 1 } }
		})
	}

	const handleProceedToBooking = () => {
		if (selectedItemsList.length === 0) return
		navigation.navigate(ROUTES.STACK.ANCILLARY_BOOKING_DETAILS, {
			services: selectedItemsList,
			selectedServices: selectedItemsList,
			serviceKey,
			serviceLabel: serviceLabel || ui.title,
		})
	}

	const handleGoHome = () => {
		navigation.navigate(ROUTES.MAIN.TABS, { screen: ROUTES.MAIN.HOME })
	}

	useEffect(() => {
		const onBackPress = () => {
			handleGoHome()
			return true
		}

		const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress)
		return () => subscription.remove()
	}, [navigation])

	return (
		<View style={styles.container}>
			<AppScreenHeader title={ui.title} onBack={handleGoHome} />

			<ScrollView
				contentContainerStyle={[
					styles.scrollContent,
					{ paddingBottom: insets.bottom + (selectedItemsList.length > 0 ? 130 : 40) },
				]}
				showsVerticalScrollIndicator={false}
			>
				<AppInput
					isSearch
					noMargin
					fieldSize="form"
					borderRadius={12}
					placeholder={ui.searchPlaceholder}
					placeholderTextColor="#546E7A"
					value={searchQuery}
					onChangeText={setSearchQuery}
					outlineColor="#E0E7EF"
					activeOutlineColor="#2B6F71"
					textColor="#1A2B3C"
					style={styles.searchInput}
					right={
						searchQuery.length > 0 ? (
							<AppInput.Icon
								icon="close-circle"
								size={18}
								color="#546E7A"
								onPress={() => setSearchQuery('')}
							/>
						) : undefined
					}
				/>

				{[ui.featuredTitle, ui.urgentTitle].map((title) => (
					<View key={title} style={styles.dispatchBanner}>
						<View style={styles.boltIconWrap}>
							<MaterialCommunityIcons name="flash" size={18} color="#FFFFFF" />
						</View>
						<View style={styles.bannerTextCol}>
							<AppTypography variant="h4" style={styles.bannerTitle}>
								{title}
							</AppTypography>
							<View style={styles.bulletRow}>
								{ui.bullets.map((bullet, index) => (
									<React.Fragment key={`${title}-${bullet}`}>
										{index > 0 && <View style={styles.bulletDot} />}
										<AppTypography variant="caption" style={styles.bulletText}>
											{bullet}
										</AppTypography>
									</React.Fragment>
								))}
							</View>
						</View>
					</View>
				))}

				<View style={styles.categoryGrid}>
					{categoryCards.map((cat) => {
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

				{isLoading ? (
					<View style={styles.loadingWrap}>
						<ActivityIndicator color="#2B6F71" />
						<AppTypography variant="caption" style={styles.emptySub}>
							Loading services...
						</AppTypography>
					</View>
				) : filteredCategories.length > 0 ? (
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
							{loadError || ui.emptyTitle}
						</AppTypography>
						<AppTypography variant="caption" style={styles.emptySub}>
							{loadError ? 'Please try again in a moment.' : ui.emptySub}
						</AppTypography>
						{(searchQuery.length > 0 || activeCategory !== 'all') && (
							<TouchableOpacity
								style={styles.resetSearchBtn}
								onPress={() => {
									setSearchQuery('')
									setActiveCategory('all')
								}}
							>
								<AppTypography variant="caption" style={styles.resetSearchBtnText}>
									Reset Search & Filters
								</AppTypography>
							</TouchableOpacity>
						)}
					</View>
				)}
			</ScrollView>

			<ServiceDetailsBottomSheet
				visible={detailSheetItem !== null}
				service={detailSheetItem}
				onClose={() => setDetailSheetItem(null)}
				onAddToBooking={handleIncrement}
			/>

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
	searchInput: {
		backgroundColor: '#FFFFFF',
		fontSize: 14,
	},
	resetSearchBtn: {
		marginTop: 6,
		paddingVertical: 8,
		paddingHorizontal: 16,
		borderRadius: 8,
		backgroundColor: 'rgba(43, 111, 113, 0.1)',
	},
	resetSearchBtnText: {
		color: '#2B6F71',
		fontWeight: '600',
	},
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
		justifyContent: 'center',
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
	loadingWrap: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 48,
		gap: 10,
	},
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
