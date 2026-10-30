// src/features/ancillary/patient/AncillaryServiceCatalogScreen.tsx
//
// Home-care service catalogue (design "2 · Nursing care at home" + "2a · service details sheet open").
// Generic across every home-care type (nursing-care, home-care, physiotherapy, rehab-care, medical-equipment):
// the title / copy come from the serviceKey + serviceLabel route params (see ancillaryCatalogCopy.ts) and the
// lists from the API -- categories (GET /ancillary/categories), procedures (GET /ancillary/services) and care
// packages (GET /ancillary/packages), incl. the phase-4 detail fields (mrp, duration, includes, prep steps,
// is_featured, ...). Anything the backend doesn't send is hidden rather than faked.
//
// Cart rule (backend): a booking holds EITHER one package OR one-or-more procedures of this speciality.
// Adding a package over procedures (or procedures over a package, or a second package) asks to replace.
// Footer: "Later" -> ROUTES.STACK.ANCILLARY_BOOK_VISIT (Schedule a visit) and "Book now" ->
// ROUTES.STACK.ANCILLARY_BOOK_NOW_REVIEW (instant), both { serviceKey, serviceLabel, items: AncillaryCartItem[] }.
//
// Reached via ROUTES.STACK.ANCILLARY_SERVICES (AncillaryServicesPage) and the Ancillary tab (NursingCarePage,
// no params -> nursing-care).
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
	Alert,
	LayoutAnimation,
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
	type NativeScrollEvent,
	type NativeSyntheticEvent,
} from 'react-native'
import { useNavigation, useRoute, type NavigationProp, type RouteProp } from '@react-navigation/native'
import {
	AppBottomSheet,
	AppCarousel,
	AppCartFooter,
	AppCatalogEmpty,
	AppCatalogHeader,
	AppCatalogItemRow,
	AppCatalogSection,
	AppPathIcon,
	AppPromoCard,
	AppSkeleton,
	AppTabs,
	AppTextLink,
	AppTrustStrip,
	ServiceDetailsSheet,
	type AppPromoCardProps,
	type AppTabItem,
} from '../../../components/common'
import { APP_COLORS, toneForString } from '../../../config/theme'
import { ROUTES } from '../../../navigation/routes'
import type { AncillaryCartItem, AppStackParamList } from '../../../navigation/types'
import { useAuth } from '../../../context/AuthContext'
import { openContactUrl, telUrl, useAppConfig } from '../../dashboard/useHomeChromeData'
import CaregiverServicesScreen from './CaregiverServicesScreen'
import { PackageDetailsBottomSheet } from '../components/PackageDetailsBottomSheet'
import { getAncillaryImageSource } from '../utils/ancillaryImageResolver'
import {
	AncillaryCategoryApiItem,
	AncillaryPackageListItem,
	AncillaryServiceItem,
	fetchAncillaryCatalog,
	fetchAncillaryCategories,
} from '../ancillaryService'
import {
	CATALOG_ICONS,
	categoryIconFor,
	formatDurationMinutes,
	getAncillaryCatalogCopy,
	plural,
	rupees,
	type CatalogIconPath,
} from '../utils/ancillaryCatalogCopy'
import {
	buildProcedureSheetContent,
	packageCartItem,
	packageTone,
	procedureCartItem,
	procedureIcon,
	procedureIncludes,
	procedureName,
	procedureTone,
} from '../utils/ancillaryCatalogContent'
import { useServerSearch } from '../hooks/useServerSearch'

type CatalogRoute = RouteProp<AppStackParamList, typeof ROUTES.STACK.ANCILLARY_SERVICES>
type CatalogNavigation = NavigationProp<AppStackParamList, typeof ROUTES.STACK.ANCILLARY_SERVICES>

// Caregiver launcher keys keep their own screen (day / night care modes); every other key uses this catalogue.
const CAREGIVER_KEYS = new Set(['caregiver-services', 'elder-day-care'])

export default function AncillaryServiceCatalogScreen() {
	const route = useRoute<CatalogRoute>()
	const serviceKey = route.params?.serviceKey || 'nursing-care'
	const serviceLabel = route.params?.serviceLabel || 'Nursing Care'
	if (CAREGIVER_KEYS.has(serviceKey)) return <CaregiverServicesScreen />
	// Keyed so switching speciality resets the cart / filters.
	return <HomeCareCatalog key={serviceKey} serviceKey={serviceKey} serviceLabel={serviceLabel} />
}

type TypeTab = 'all' | 'packages' | 'procedures'

type DetailTarget =
	{ kind: 'procedure'; item: AncillaryServiceItem } | { kind: 'package'; item: AncillaryPackageListItem } | null

// "Care for" tiles sit three to a row: at five/four per row a tile is ~65-85px wide and names like
// "General Nursing Procedures" or "Specialized High Dependency Care" wrapped past two lines and got
// cut off with an ellipsis. MAIN_TILES is how many tiles the main grid shows (two rows) before
// folding the rest behind "+N more".
const TILE_COLUMNS = 3
const MAIN_TILES = 6
// 8 padding + 34 icon + 4 gap + 3 label lines (3 x 16) + 6 padding + 4 border
const TILE_HEIGHT = 104

/** Cart handed back by the booking pages (new AncillaryCartItem[] or the old ServiceProcedureItem[]). */
const normalizeReturnedCart = (raw: unknown[]): AncillaryCartItem[] => {
	const items = raw
		.map((x: any): AncillaryCartItem | null => {
			if (!x?.id) return null
			if (x.kind === 'procedure' || x.kind === 'package') return x as AncillaryCartItem
			const price =
				typeof x.price === 'number' ? x.price : parseFloat(String(x.price ?? '').replace(/[^0-9.]/g, ''))
			return { id: String(x.id), kind: 'procedure', name: String(x.title ?? x.name ?? ''), price: price || 0 }
		})
		.filter((x): x is AncillaryCartItem => !!x)
	const pkg = items.find((i) => i.kind === 'package')
	return pkg ? [pkg] : items
}

function HomeCareCatalog({ serviceKey, serviceLabel }: { serviceKey: string; serviceLabel: string }) {
	const navigation = useNavigation<CatalogNavigation>()
	const route = useRoute<CatalogRoute>()
	const { user } = useAuth()
	const copy = useMemo(() => getAncillaryCatalogCopy(serviceKey, serviceLabel), [serviceKey, serviceLabel])
	const appConfig = useAppConfig(copy.isNursing)
	const helpline = copy.isNursing ? appConfig?.nursing_helpline_number?.trim() || '' : ''

	const [categories, setCategories] = useState<AncillaryCategoryApiItem[]>([])
	const [services, setServices] = useState<AncillaryServiceItem[]>([])
	const [loading, setLoading] = useState(true)
	const [packages, setPackages] = useState<AncillaryPackageListItem[]>([])
	const [catalogError, setCatalogError] = useState(false)
	const [reloadKey, setReloadKey] = useState(0)

	const [tab, setTab] = useState<TypeTab>('all')
	const [categoryId, setCategoryId] = useState<string | null>(null)
	const [query, setQuery] = useState('')
	const [cart, setCart] = useState<AncillaryCartItem[]>([])
	const [detail, setDetail] = useState<DetailTarget>(null)
	const [careForOpen, setCareForOpen] = useState(false)
	const [compact, setCompact] = useState(false)
	const compactRef = useRef(false)

	// ---- data ----
	// One request for the specialty's services and packages (GET /api/ancillary/catalog), plus its categories.
	useEffect(() => {
		let isMounted = true
		const loadCatalog = async () => {
			try {
				setLoading(true)
				setCatalogError(false)
				const [cats, catalog] = await Promise.all([fetchAncillaryCategories(serviceKey), fetchAncillaryCatalog({ specialtyId: serviceKey })])
				if (isMounted) {
					setCategories(cats)
					setServices(catalog.services)
					setPackages(catalog.packages)
				}
			} catch (e) {
				console.log('[AncillaryServiceCatalogScreen] Catalog load error:', e)
				if (isMounted) {
					setServices([])
					setPackages([])
					setCatalogError(true)
				}
			} finally {
				if (isMounted) setLoading(false)
			}
		}
		void loadCatalog()
		return () => {
			isMounted = false
		}
	}, [serviceKey, reloadKey])

	// Cart edited on a booking page and handed back via params.
	const returnedCart = route.params?.updatedCart
	useEffect(() => {
		if (!returnedCart) return
		setCart(normalizeReturnedCart(returnedCart))
		navigation.setParams({ updatedCart: undefined })
	}, [returnedCart, navigation])

	// ---- cart ----
	const isInCart = useCallback(
		(id: string, kind: AncillaryCartItem['kind']) => cart.some((c) => c.id === id && c.kind === kind),
		[cart]
	)

	const confirmReplace = (title: string, message: string, onReplace: () => void) => {
		Alert.alert(title, message, [
			{ text: 'Cancel', style: 'cancel' },
			{ text: 'Replace', onPress: onReplace },
		])
	}

	const addProcedure = (s: AncillaryServiceItem, onAdded?: () => void) => {
		const item = procedureCartItem(s)
		const current = cart.find((c) => c.kind === 'package')
		if (current) {
			confirmReplace(
				'Replace your package?',
				`A booking can have one package or single services, not both. Adding “${item.name}” removes “${current.name}”.`,
				() => {
					setCart([item])
					onAdded?.()
				}
			)
			return
		}
		setCart((prev) => (prev.some((c) => c.id === item.id) ? prev : [...prev, item]))
		onAdded?.()
	}

	const addPackage = (p: AncillaryPackageListItem, onAdded?: () => void) => {
		const item = packageCartItem(p)
		if (cart.length === 0) {
			setCart([item])
			onAdded?.()
			return
		}
		const current = cart[0]
		if (current.kind === 'package') {
			if (current.id === item.id) {
				onAdded?.()
				return
			}
			confirmReplace(
				'Replace your package?',
				`A booking can have one package. Adding “${item.name}” replaces “${current.name}”.`,
				() => {
					setCart([item])
					onAdded?.()
				}
			)
			return
		}
		confirmReplace(
			'Replace your services?',
			`A booking can have one package or single services, not both. Adding “${item.name}” removes the ${plural(cart.length, 'service', 'services')} you added.`,
			() => {
				setCart([item])
				onAdded?.()
			}
		)
	}

	const removeFromCart = (id: string, kind: AncillaryCartItem['kind']) =>
		setCart((prev) => prev.filter((c) => !(c.id === id && c.kind === kind)))

	const toggleProcedure = (s: AncillaryServiceItem) =>
		isInCart(s.id, 'procedure') ? removeFromCart(s.id, 'procedure') : addProcedure(s)
	const togglePackage = (p: AncillaryPackageListItem) =>
		isInCart(p.id, 'package') ? removeFromCart(p.id, 'package') : addPackage(p)

	const total = cart.reduce((sum, c) => sum + (c.price || 0), 0)
	const savings = cart.reduce((sum, c) => sum + (c.mrp != null && c.mrp > c.price ? c.mrp - c.price : 0), 0)
	const countLabel =
		cart[0]?.kind === 'package' ? '1 package added' : `${plural(cart.length, 'service', 'services')} added`

	const handleBookLater = () => {
		if (cart.length === 0) return
		navigation.navigate(ROUTES.STACK.ANCILLARY_BOOK_VISIT, { serviceKey, serviceLabel, items: cart })
	}

	const handleBookNow = () => {
		if (cart.length === 0) return
		navigation.navigate(ROUTES.STACK.ANCILLARY_BOOK_NOW_REVIEW, { serviceKey, serviceLabel, items: cart })
	}

	const callHelpline = async () => {
		if (!helpline) return
		const opened = await openContactUrl(telUrl(helpline))
		if (!opened) Alert.alert('Could not open the dialer', `Please call ${helpline}.`)
	}

	// ---- filtering ----
	const q = query.trim().toLowerCase()
	const toneIndex = useMemo(() => {
		const map = new Map<string, number>()
		services.forEach((s, i) => map.set(`s:${s.id}`, i))
		packages.forEach((p, i) => map.set(`p:${p.id}`, i))
		return map
	}, [services, packages])

	// Search is done by the backend (GET /api/ancillary/services?search= and /packages?search=): it matches each service's
	// name, about text, included tasks, good-for and category (a package's name, description, what it includes and the
	// procedures it bundles) and returns the matches best first. While the text is empty the full catalogue is shown.
	const search = useServerSearch(query, (text) => fetchAncillaryCatalog({ specialtyId: serviceKey, search: text }))
	// A failed search shows nothing (the empty state says so): neither the old results nor the full list match the text.
	const searchUnavailable = search.failed && !!query.trim()
	const filteredProcedures = useMemo(
		() =>
			searchUnavailable
				? []
				: (search.results?.services ?? services).filter((s) => !categoryId || s.categoryId === categoryId),
		[search.results, searchUnavailable, services, categoryId]
	)
	const filteredPackages = searchUnavailable ? [] : (search.results?.packages ?? packages)

	// Packages have no category, so a "Care for" filter narrows the list to procedures.
	const packagesAllowed = tab !== 'procedures' && !categoryId
	const showPackages = packagesAllowed && (loading || filteredPackages.length > 0)
	const showProcedures = tab !== 'packages' && (loading || filteredProcedures.length > 0)
	const noResults = !showPackages && !showProcedures
	const filtersActive = !!q || !!categoryId || tab !== 'all'
	const loadFailed = catalogError && !q

	const resetFilters = () => {
		setTab('all')
		setCategoryId(null)
		setQuery('')
	}

	const pickTab = (next: TypeTab) => {
		setTab(next)
		setCategoryId(null)
	}

	const pickCategory = (id: string) => {
		setCategoryId((prev) => (prev === id ? null : id))
		setTab('all')
		setCareForOpen(false)
	}

	// ---- featured slides ----
	const featuredPackage = useMemo(() => packages.find((p) => p.is_featured), [packages])
	const featuredProcedure = useMemo(() => services.find((s) => s.is_featured), [services])

	const slides: (AppPromoCardProps & { key: string })[] = []
	if (helpline) {
		slides.push({
			key: 'emergency',
			tone: 'ink',
			eyebrow: 'PRIORITY · 24/7',
			title: 'Need a nurse right now?',
			subtitle: 'Emergency nurse at home, day or night',
			ctaLabel: 'Call now',
			iconPath: CATALOG_ICONS.kit,
			accessibilityHint: `Calls ${helpline}`,
			onPress: () => void callHelpline(),
		})
	}
	if (featuredPackage) {
		slides.push({
			key: `pkg-${featuredPackage.id}`,
			tone: 'lilac',
			eyebrow: 'CARE PLAN',
			title: featuredPackage.label,
			subtitle: featuredPackage.visits_count
				? plural(featuredPackage.visits_count, 'visit', 'visits')
				: undefined,
			priceLabel: rupees(featuredPackage.packagePrice),
			mrpLabel:
				featuredPackage.mrp && featuredPackage.mrp > featuredPackage.packagePrice
					? rupees(featuredPackage.mrp)
					: undefined,
			ctaLabel: 'View package',
			iconPath: CATALOG_ICONS.bandage,
			onPress: () => setDetail({ kind: 'package', item: featuredPackage }),
		})
	}
	if (featuredProcedure) {
		const added = isInCart(featuredProcedure.id, 'procedure')
		const sub =
			procedureIncludes(featuredProcedure).slice(0, 3).join(', ') || featuredProcedure.good_for || undefined
		slides.push({
			key: `srv-${featuredProcedure.id}`,
			tone: 'peach',
			eyebrow: 'FIRST VISIT',
			title: procedureName(featuredProcedure),
			subtitle: sub,
			priceLabel: rupees(featuredProcedure.price),
			mrpLabel:
				featuredProcedure.mrp && featuredProcedure.mrp > featuredProcedure.price
					? rupees(featuredProcedure.mrp)
					: undefined,
			ctaLabel: added ? 'Added ✓' : 'Add to booking',
			ctaChevron: false,
			iconPath: CATALOG_ICONS.vitals,
			onPress: () =>
				added ? setDetail({ kind: 'procedure', item: featuredProcedure }) : addProcedure(featuredProcedure),
		})
	}

	// ---- header collapse ----
	const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
		const y = e.nativeEvent.contentOffset.y
		const next = compactRef.current ? y > 4 : y > 24
		if (next === compactRef.current) return
		compactRef.current = next
		LayoutAnimation.configureNext(LayoutAnimation.create(200, 'easeInEaseOut', 'opacity'))
		setCompact(next)
	}

	const firstName = (user?.name ?? '').trim().split(/\s+/)[0] ?? ''
	const typeTabs: AppTabItem<TypeTab>[] = [
		{ key: 'all', label: 'All', icon: 'view-grid-outline' },
		{ key: 'packages', label: 'Packages', icon: 'package-variant-closed' },
		{ key: 'procedures', label: copy.servicesTabLabel, icon: copy.isNursing ? 'needle' : 'medical-bag' },
	]

	// ---- sheet content ----
	const procedureDetail = detail?.kind === 'procedure' ? detail.item : null
	const packageDetail = detail?.kind === 'package' ? detail.item : null
	const procedureSheet = useMemo(
		() =>
			procedureDetail
				? buildProcedureSheetContent(
						procedureDetail,
						copy,
						procedureTone(toneIndex.get(`s:${procedureDetail.id}`) ?? 0)
					)
				: null,
		[procedureDetail, copy, toneIndex]
	)
	const closeDetail = () => setDetail(null)

	return (
		<View style={styles.container}>
			<AppCatalogHeader
				title={copy.title}
				eyebrow={firstName ? `HI ${firstName.toUpperCase()}` : undefined}
				subtitle={copy.subtitle}
				compact={compact}
				showBack={navigation.canGoBack()}
				cartCount={cart.length}
				onCartPress={handleBookNow}
				cartDisabled={cart.length === 0}
				cartLabel={`Booking, ${cart.length === 0 ? 'no services added' : countLabel}`}
				search={{
					value: query,
					onChange: setQuery,
					placeholder: copy.searchPlaceholder,
					accessibilityLabel: copy.searchAccessibilityLabel,
				}}
			/>

			<ScrollView
				style={styles.scroll}
				contentContainerStyle={styles.scrollContent}
				showsVerticalScrollIndicator={false}
				keyboardShouldPersistTaps="handled"
				onScroll={handleScroll}
				scrollEventThrottle={16}
			>
				<View style={styles.filters}>
					<AppTabs tabs={typeTabs} value={tab} onChange={pickTab} accessibilityLabel="Show" />
					{categories.length > 0 && (
						<CareForGrid
							categories={categories}
							activeId={categoryId}
							onPick={pickCategory}
							onClear={() => setCategoryId(null)}
							onMore={() => setCareForOpen(true)}
						/>
					)}
				</View>

				{slides.length > 0 && (
					<AppCarousel
						data={slides}
						autoPlay={slides.length > 1}
						autoPlayInterval={4500}
						accessibilityLabel="Offers"
						keyExtractor={(s) => s.key}
						renderItem={({ item }) => {
							const { key: _key, ...cardProps } = item
							return <AppPromoCard {...cardProps} />
						}}
					/>
				)}

				{showPackages && (
					<AppCatalogSection
					title={copy.packagesTitle}
					count={loading ? '' : plural(filteredPackages.length, 'package', 'packages')}
					subtitle={copy.packagesSubtitle}
					>
						{loading ? (
							<RowSkeletons />
						) : (
							filteredPackages.map((p, i) => (
								<AppCatalogItemRow
									key={p.id}
									divider={i > 0}
									name={p.label}
									priceLabel={rupees(p.packagePrice)}
									mrpLabel={p.mrp && p.mrp > p.packagePrice ? rupees(p.mrp) : undefined}
									metaLabel={
										p.visits_count
											? plural(p.visits_count, 'visit', 'visits')
											: p.procedureCount
												? plural(p.procedureCount, 'service', 'services')
												: undefined
									}
									imageSource={p.imageUrl ? getAncillaryImageSource(p.imageUrl) : undefined}
									iconPath={CATALOG_ICONS.elder}
									tone={packageTone(toneIndex.get(`p:${p.id}`) ?? i)}
									added={isInCart(p.id, 'package')}
									onToggle={() => togglePackage(p)}
									onPress={() => setDetail({ kind: 'package', item: p })}
								/>
							))
						)}
					</AppCatalogSection>
				)}

				<AppTrustStrip chips={copy.trustChips} />

				{showProcedures && (
					<AppCatalogSection
					title={copy.servicesTitle}
					count={loading ? '' : plural(filteredProcedures.length, 'service', 'services')}
					subtitle={copy.servicesSubtitle}
					>
						{loading ? (
							<RowSkeletons />
						) : (
							filteredProcedures.map((s, i) => {
								const imageUrl = s.image_url ?? s.imageUrl
								return (
									<AppCatalogItemRow
										key={s.id}
										divider={i > 0}
										name={procedureName(s)}
										priceLabel={rupees(s.price)}
										mrpLabel={s.mrp && s.mrp > s.price ? rupees(s.mrp) : undefined}
										metaLabel={formatDurationMinutes(s.duration_minutes) || undefined}
										imageSource={imageUrl ? getAncillaryImageSource(imageUrl) : undefined}
										iconPath={procedureIcon(s)}
										tone={procedureTone(toneIndex.get(`s:${s.id}`) ?? i)}
										added={isInCart(s.id, 'procedure')}
										onToggle={() => toggleProcedure(s)}
										onPress={() => setDetail({ kind: 'procedure', item: s })}
									/>
								)
							})
						)}
					</AppCatalogSection>
				)}

				{noResults && (
					<AppCatalogEmpty
						title={
							loadFailed
								? 'Services could not be loaded'
								: searchUnavailable
									? 'Search is unavailable right now'
									: q
										? 'No service matches your search'
										: 'No services here yet'
						}
						subtitle={
							loadFailed || searchUnavailable
								? 'Check your connection and try again.'
								: q
									? copy.emptySearchHint
									: filtersActive
										? 'Try another filter, or browse all services.'
										: copy.emptyCatalogHint
						}
						actionLabel={loadFailed ? 'Try again' : filtersActive ? 'Show all' : undefined}
						onAction={loadFailed ? () => setReloadKey((k) => k + 1) : resetFilters}
					/>
				)}
			</ScrollView>

			<AppCartFooter
				empty={cart.length === 0}
				countLabel={countLabel}
				totalLabel={rupees(total)}
				savingsLabel={savings > 0 ? `You save ${rupees(savings)}` : undefined}
				ctaLabel="Book now"
				onCtaPress={handleBookNow}
				secondaryCtaLabel="Later"
				onSecondaryCtaPress={handleBookLater}
				emptyHint={copy.emptyCartHint}
			/>

			<AppBottomSheet
				visible={careForOpen}
				title="Care for"
				subtitle={copy.careForSubtitle}
				onClose={() => setCareForOpen(false)}
				appearance="modern"
				showHeaderDivider={false}
			>
				<TileRows categories={categories} activeId={categoryId} onPick={pickCategory} perRow={TILE_COLUMNS} />
			</AppBottomSheet>

			<ServiceDetailsSheet
				variant="modern"
				visible={!!procedureDetail}
				content={procedureSheet}
				onClose={closeDetail}
				added={procedureDetail ? isInCart(procedureDetail.id, 'procedure') : false}
				onAdd={procedureDetail ? () => addProcedure(procedureDetail, closeDetail) : undefined}
				onRemove={procedureDetail ? () => removeFromCart(procedureDetail.id, 'procedure') : undefined}
			/>
			<PackageDetailsBottomSheet
				visible={!!packageDetail}
				pkg={packageDetail}
				onClose={closeDetail}
				copy={copy}
				toneIndex={packageDetail ? (toneIndex.get(`p:${packageDetail.id}`) ?? 0) : 0}
				added={packageDetail ? isInCart(packageDetail.id, 'package') : false}
				onAdd={packageDetail ? () => addPackage(packageDetail, closeDetail) : undefined}
				onRemove={packageDetail ? () => removeFromCart(packageDetail.id, 'package') : undefined}
			/>
		</View>
	)
}

// ---------------------------------------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------------------------------------

function RowSkeletons() {
	return (
		<View style={styles.skeletons}>
			{[0, 1].map((i) => (
				<View key={i} style={styles.skeletonRow}>
					<View style={styles.skeletonText}>
						<AppSkeleton height={20} width="80%" borderRadius={6} color={APP_COLORS.divider} />
						<AppSkeleton height={14} width="50%" borderRadius={6} color={APP_COLORS.divider} />
						<AppSkeleton height={14} width="65%" borderRadius={6} color={APP_COLORS.divider} />
					</View>
					<AppSkeleton width={112} height={112} borderRadius={16} color={APP_COLORS.divider} />
				</View>
			))}
		</View>
	)
}

type TileCategory = { id: string; label: string }

function CareTile({
	label,
	icon,
	active,
	onPress,
}: {
	label: string
	icon: CatalogIconPath
	active: boolean
	onPress: () => void
}) {
	const tone = toneForString(label)
	return (
		<TouchableOpacity
			onPress={onPress}
			activeOpacity={0.8}
			style={[
				styles.tile,
				{
					borderColor: active ? tone.ink : APP_COLORS.divider,
					backgroundColor: active ? tone.bg : APP_COLORS.surface,
				},
			]}
			accessibilityRole="button"
			accessibilityState={{ selected: active }}
			accessibilityLabel={label}
		>
			<View style={[styles.tileIcon, { backgroundColor: active ? tone.ink : tone.bg }]}>
				<AppPathIcon d={icon} size={18} strokeWidth={2} color={active ? APP_COLORS.surface : tone.ink} />
			</View>
			<Text style={styles.tileLabel} numberOfLines={3}>
				{label}
			</Text>
		</TouchableOpacity>
	)
}

function TileRows({
	categories,
	activeId,
	onPick,
	perRow,
	trailing,
}: {
	categories: TileCategory[]
	activeId: string | null
	onPick: (id: string) => void
	perRow: number
	/** Extra last tile (the "+N more" button). */
	trailing?: React.ReactNode
}) {
	const cells: React.ReactNode[] = categories.map((c) => (
		<CareTile
			key={c.id}
			label={c.label}
			icon={categoryIconFor(c.label)}
			active={c.id === activeId}
			onPress={() => onPick(c.id)}
		/>
	))
	if (trailing) cells.push(<React.Fragment key="more">{trailing}</React.Fragment>)
	const rows: React.ReactNode[][] = []
	for (let i = 0; i < cells.length; i += perRow) rows.push(cells.slice(i, i + perRow))
	return (
		<View style={styles.tileRows}>
			{rows.map((row, r) => (
				<View key={r} style={styles.tileRow}>
					{row.map((cell, c) => (
						<View key={c} style={styles.tileCell}>
							{cell}
						</View>
					))}
					{Array.from({ length: perRow - row.length }).map((_, k) => (
						<View key={`pad-${k}`} style={styles.tileCell} />
					))}
				</View>
			))}
		</View>
	)
}

function CareForGrid({
	categories,
	activeId,
	onPick,
	onClear,
	onMore,
}: {
	categories: TileCategory[]
	activeId: string | null
	onPick: (id: string) => void
	onClear: () => void
	onMore: () => void
}) {
	const overflow = categories.length > MAIN_TILES
	const shownCount = overflow ? MAIN_TILES - 1 : MAIN_TILES
	// Keep the selected tile visible: move it into the last shown slot when it sits in the overflow.
	const ordered = [...categories]
	const idx = ordered.findIndex((c) => c.id === activeId)
	if (idx >= shownCount) {
		const [picked] = ordered.splice(idx, 1)
		ordered.splice(shownCount - 1, 0, picked)
	}
	const hidden = categories.length - shownCount

	return (
		<View style={styles.careFor}>
			<View style={styles.careForHead}>
				<Text style={styles.careForTitle} accessibilityRole="header">
					Care for
				</Text>
				{!!activeId && <AppTextLink label="Clear" size="sm" trailingIcon="none" onPress={onClear} />}
			</View>
			<TileRows
				categories={ordered.slice(0, shownCount)}
				activeId={activeId}
				onPick={onPick}
				perRow={TILE_COLUMNS}
				trailing={
					overflow ? (
						<TouchableOpacity
							onPress={onMore}
							activeOpacity={0.8}
							style={[styles.tile, styles.moreTile]}
							accessibilityRole="button"
							accessibilityLabel={`View all ${categories.length} care needs`}
						>
							<View style={[styles.tileIcon, { backgroundColor: APP_COLORS.ink }]}>
								<AppPathIcon
									d={CATALOG_ICONS.grid}
									size={16}
									strokeWidth={2}
									color={APP_COLORS.surface}
								/>
							</View>
							<Text style={styles.tileLabel} numberOfLines={1}>
								{`+${hidden} more`}
							</Text>
						</TouchableOpacity>
					) : undefined
				}
			/>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: APP_COLORS.pageBg,
	},
	scroll: {
		flex: 1,
	},
	scrollContent: {
		paddingVertical: 16,
		gap: 16,
	},
	filters: {
		paddingHorizontal: 16,
		gap: 12,
	},
	careFor: {
		gap: 8,
	},
	careForHead: {
		flexDirection: 'row',
		alignItems: 'baseline',
		justifyContent: 'space-between',
	},
	careForTitle: {
		fontSize: 15,
		lineHeight: 22,
		fontWeight: '700',
		color: APP_COLORS.ink,
	},
	tileRows: {
		gap: 6,
	},
	tileRow: {
		flexDirection: 'row',
		gap: 6,
	},
	tileCell: {
		flex: 1,
		minWidth: 0,
	},
	// Every tile fills its grid cell (same width, and the cell stretches to the row) and has the height of a
	// three-line label, so a tile with a short name is as tall as one with a long name, in every row.
	tile: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		gap: 4,
		paddingTop: 8,
		paddingBottom: 6,
		paddingHorizontal: 2,
		borderRadius: 12,
		borderWidth: 2,
		minHeight: TILE_HEIGHT,
	},
	moreTile: {
		borderStyle: 'dashed',
		borderColor: APP_COLORS.border,
		backgroundColor: APP_COLORS.pageBg,
	},
	tileIcon: {
		width: 34,
		height: 34,
		borderRadius: 17,
		alignItems: 'center',
		justifyContent: 'center',
	},
	tileLabel: {
		fontSize: 12,
		lineHeight: 16,
		fontWeight: '700',
		color: APP_COLORS.ink,
		textAlign: 'center',
	},
	skeletons: {
		paddingVertical: 8,
	},
	skeletonRow: {
		flexDirection: 'row',
		gap: 16,
		paddingVertical: 16,
	},
	skeletonText: {
		flex: 1,
		gap: 8,
	},
})
