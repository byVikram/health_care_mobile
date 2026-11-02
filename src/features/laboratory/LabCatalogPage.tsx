// src/features/laboratory/LabCatalogPage.tsx
//
// "Lab tests and packages" from the Lab Tests Ordering design: collapsing ink header (greeting, search, cart),
// All / Packages / Single tests tabs, "Shop by concern" shortcuts, the health-packages and lab-tests lists with
// an Add toggle, a trust strip, the details sheet and the cart footer. Built from the shared catalogue blocks
// (AppCatalogHeader / Section / TrustStrip / ConcernGrid), AppCatalogItemRow, ServiceDetailsSheet (modern) and
// AppCartFooter. Data is the real LabStack catalogue through our API (labService.ts / labCatalogue.ts);
// prices are the lab's MRP ("from": the lowest across the labs that offer the item).

import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
	ActivityIndicator,
	LayoutAnimation,
	ScrollView,
	StyleSheet,
	Text,
	View,
	type NativeScrollEvent,
	type NativeSyntheticEvent,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import {
	AppBottomSheet,
	AppCartFooter,
	AppCatalogEmpty,
	AppCatalogHeader,
	AppCatalogItemRow,
	AppCatalogSection,
	AppConcernGrid,
	AppConcernRows,
	AppTabs,
	AppTrustStrip,
	LocationSelector,
	ServiceDetailsSheet,
	type AppTabItem,
	type ServiceDetailsContent,
} from '../../components/common'
import { APP_COLORS } from '../../config/theme'
import { useAuth } from '../../context/AuthContext'
import { useCurrentPincode } from '../../hooks/useCurrentPincode'
import { ROUTES } from '../../navigation/routes'
import type { AppStackParamList } from '../../navigation/types'
import { labItemById, useLabCatalogue, useLabItemDetail } from './labCatalogue'
import { cartItems, labBooking, totalsOf, useLabBooking } from './labBookingStore'
import { inr, plural } from './labFormat'
import { LAB_CONCERNS, LAB_ICONS, LAB_TYPES, type LabItem, type LabTypeId } from './labMock'
import type { ApiCatalogueDetail } from './labService'

type Nav = NativeStackNavigationProp<AppStackParamList>

const TYPE_TAB_ICONS: Record<LabTypeId, AppTabItem['icon']> = {
	all: 'view-grid-outline',
	packages: 'package-variant-closed',
	tests: 'flask-outline',
}

const KIND_OF_TYPE = { all: 'all', packages: 'package', tests: 'test' } as const

const MAIN_CONCERNS = 4
const MORE_TILES_PER_ROW = 4
const SEARCH_DEBOUNCE_MS = 350
const LOAD_MORE_DISTANCE = 600

const TRUST_CHIPS = [
	{ key: 'home', label: 'Home collection', icon: LAB_ICONS.home },
	{
		key: 'phleb',
		label: 'Accredited labs',
		icon: 'M10 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM3 21a7 7 0 0 1 14 0M16 11l2 2 4-4',
	},
	{
		key: 'reports',
		label: 'Reports in the app',
		icon: 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h6',
	},
]

const priceLabelOf = (item: LabItem) => (item.price > 0 ? `From ${inr(item.price)}` : 'Price shown at checkout')

/** Content for the shared "modern" details sheet (design: hero, at a glance, what it checks, included, prep). */
const sheetContentFor = (
	item: LabItem,
	detail: ApiCatalogueDetail | null,
	loading: boolean,
	hasAddress: boolean
): ServiceDetailsContent => {
	const isPkg = item.kind === 'package'
	const fastText = item.fasting ? `${item.fastingLabel ?? 'Yes'} fasting` : 'Not needed'
	const prep = item.preparations?.length
		? item.preparations
		: item.fasting
			? ['Don’t eat before your slot. Plain water is fine.']
			: ['Follow the lab’s instructions on the day.']
	const collection =
		detail?.supports_home_sample && detail?.supports_center_visit
			? 'Home or lab'
			: detail?.supports_center_visit
				? 'At the lab'
				: 'At home'
	const unavailable = !!detail && detail.live && hasAddress && detail.labs.length === 0
	return {
		id: item.id,
		kindLabel: isPkg ? 'Health package' : 'Lab test',
		name: item.name,
		tone: isPkg ? 'lilac' : 'mint',
		iconPath: isPkg ? LAB_ICONS.package : LAB_ICONS.flask,
		price: item.price,
		mrp: item.mrp,
		facts: [
			{
				key: 'first',
				label: isPkg ? 'Tests included' : 'Sample',
				value: isPkg ? plural(item.tests ?? 0, 'test', 'tests') : item.sample,
				icon: isPkg ? LAB_ICONS.flask : LAB_ICONS.drop,
				tone: 'lilac',
			},
			{ key: 'fasting', label: 'Fasting', value: fastText, icon: LAB_ICONS.fast, tone: 'sand' },
			{
				key: 'report',
				label: 'Report',
				value: item.report.replace('Reports in ', 'In ').replace('Report in ', 'In '),
				icon: LAB_ICONS.clock,
				tone: 'sky',
			},
			{
				key: 'last',
				label: isPkg ? 'Sample' : 'Collection',
				value: isPkg ? item.sample : collection,
				icon: isPkg ? LAB_ICONS.drop : LAB_ICONS.home,
				tone: 'mint',
			},
		],
		aboutTitle: 'What it checks',
		about: item.about || null,
		goodFor: null,
		includes: item.includedTests?.map((label) => ({ label })),
		includesLoading: isPkg && loading && !item.includedTests?.length,
		prepTitle: 'Before your test',
		prepSteps: prep,
		trustLine: unavailable
			? 'Not available at your address'
			: 'The price can differ by lab · report in the app',
		hideTrustIcon: true,
	}
}

export default function LabCatalogPage() {
	const navigation = useNavigation<Nav>()
	const { user } = useAuth()
	const booking = useLabBooking()
	// Only what the labs serving the patient's pincode offer is listed; wait for the pincode so the full list does not flash first
	const { pincode, resolving } = useCurrentPincode()

	const [type, setType] = useState<LabTypeId>('all')
	const [concern, setConcern] = useState<string | null>(null)
	const [query, setQuery] = useState('')
	const [debounced, setDebounced] = useState('')
	const [detailId, setDetailId] = useState<string | null>(null)
	const [concernsOpen, setConcernsOpen] = useState(false)
	const [compact, setCompact] = useState(false)
	const compactRef = useRef(false)

	useEffect(() => {
		const t = setTimeout(() => setDebounced(query.trim()), SEARCH_DEBOUNCE_MS)
		return () => clearTimeout(t)
	}, [query])

	const concernDef = LAB_CONCERNS.find((c) => c.id === concern)
	const queries = useMemo(
		() => (concernDef ? concernDef.queries : debounced ? [debounced] : []),
		[concernDef, debounced]
	)
	const catalogue = useLabCatalogue({ queries, kind: KIND_OF_TYPE[type], pincode, paused: resolving })
	const { packages, tests, coverage } = catalogue
	// No lab serves the pincode: the list is empty and says so. Without coverage (no pincode, LabStack not answering) the
	// full list is shown and nothing is claimed about the area.
	const unserved = coverage?.serviceable === false
	const homeAvailable = !coverage?.serviceable || coverage.services.includes('HOME_SAMPLE')

	const items = cartItems(booking)
	const { total } = totalsOf(booking)
	const inCart = (id: string) => booking.cart.includes(id)
	const countLabel = `${plural(items.length, 'item', 'items')} added`

	const noResults = !catalogue.loading && !catalogue.error && !unserved && packages.length === 0 && tests.length === 0
	const filtersActive = type !== 'all' || !!concern || !!query.trim()

	const resetFilters = () => {
		setType('all')
		setConcern(null)
		setQuery('')
	}
	const pickType = (next: LabTypeId) => {
		setType(next)
		setConcern(null)
	}
	const pickConcern = (id: string) => {
		setConcern((cur) => (cur === id ? null : id))
		setType('all')
		setQuery('')
		setConcernsOpen(false)
	}
	const onSearch = (v: string) => {
		setQuery(v)
		setConcern(null)
	}

	// ---- header collapse + load more near the end ----
	const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
		const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent
		const y = contentOffset.y
		if (contentSize.height - (y + layoutMeasurement.height) < LOAD_MORE_DISTANCE) void catalogue.loadMore()
		const next = compactRef.current ? y > 4 : y > 24
		if (next === compactRef.current) return
		compactRef.current = next
		LayoutAnimation.configureNext(LayoutAnimation.create(200, 'easeInEaseOut', 'opacity'))
		setCompact(next)
	}

	const concernTiles = useMemo(
		() => LAB_CONCERNS.map((c) => ({ id: c.id, label: c.label, iconPath: c.icon, bg: c.bg, ink: c.ink })),
		[]
	)

	const listed = detailId ? labItemById(detailId) : undefined
	const { detail, item: detailItem, loading: detailLoading, ready: detailReady } = useLabItemDetail(
		listed,
		booking.addressId
	)
	const detailContent = useMemo(
		() => (detailItem ? sheetContentFor(detailItem, detail, detailLoading, !!booking.addressId) : null),
		[detailItem, detail, detailLoading, booking.addressId]
	)
	const closeDetail = () => setDetailId(null)

	const goCart = () => navigation.navigate(ROUTES.STACK.LABORATORY_SAMPLE_COLLECTION)

	const typeTabs: AppTabItem<LabTypeId>[] = LAB_TYPES.map((t) => ({
		key: t.id,
		label: t.label,
		icon: TYPE_TAB_ICONS[t.id],
	}))

	const firstName = (user?.name ?? '').trim().split(/\s+/)[0] ?? ''

	const changeLocation = () => navigation.navigate(ROUTES.STACK.LOCATION_SELECT as never)
	const servicesText = (coverage?.services ?? [])
		.map((svc) => (svc === 'HOME_SAMPLE' ? 'home collection' : svc === 'CENTER_VISIT' ? 'lab visit' : ''))
		.filter(Boolean)
		.join(' or ')
	const locationText = !pincode
		? resolving
			? 'Finding what is available near you…'
			: 'Set your location to see what is available near you'
		: coverage?.serviceable
			? `Available near ${pincode} · ${plural(coverage.labs.length, 'lab', 'labs')}${servicesText ? ` · ${servicesText}` : ''}`
			: `Near ${pincode}`

	const row = (item: LabItem, i: number) => (
		<AppCatalogItemRow
			key={item.id}
			divider={i > 0}
			name={item.name}
			priceLabel={priceLabelOf(item)}
			mrpLabel={item.mrp > item.price ? inr(item.mrp) : undefined}
			metaLabel={item.kind === 'test' ? item.report : undefined}
			points={item.kind === 'package' ? [plural(item.tests ?? 0, 'test', 'tests') + ' included'] : item.bullets}
			iconPath={item.kind === 'package' ? LAB_ICONS.package : LAB_ICONS.flask}
			tone={item.kind === 'package' ? 'lilac' : 'mint'}
			added={inCart(item.id)}
			onToggle={() => labBooking.toggleItem(item.id)}
			onPress={() => setDetailId(item.id)}
		/>
	)

	return (
		<View style={styles.container}>
			<AppCatalogHeader
				title="Lab tests at home"
				eyebrow={firstName ? `HI ${firstName.toUpperCase()}` : undefined}
				subtitle={homeAvailable ? 'Home collection · reports in the app' : 'Visit a lab · reports in the app'}
				compact={compact}
				showBack={navigation.canGoBack()}
				onBack={() => navigation.goBack()}
				cartCount={items.length}
				onCartPress={goCart}
				cartLabel={`Cart, ${items.length === 0 ? 'no items added' : countLabel}`}
				renderLocation={(isCompact) => (
					<LocationSelector
						color={APP_COLORS.mint}
						iconSize={isCompact ? 14 : 16}
						textStyle={isCompact ? styles.headerLocationCompact : styles.headerLocation}
					/>
				)}
				search={{
					value: query,
					onChange: onSearch,
					placeholder: 'Search lab tests or packages, e.g. HbA1c',
					hints: ['HbA1c', 'thyroid profile', 'vitamin D', 'full body checkup'],
					accessibilityLabel: 'Search tests and packages',
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
				<View style={styles.locationRow}>
					<MaterialCommunityIcons name="map-marker-outline" size={18} color={APP_COLORS.primary} />
					<Text style={styles.locationText} numberOfLines={1}>
						{locationText}
					</Text>
				</View>

				<View style={styles.filters}>
					<AppTabs tabs={typeTabs} value={type} onChange={pickType} accessibilityLabel="Show" />
					<AppConcernGrid
						title="Shop by concern"
						tiles={concernTiles}
						activeId={concern}
						onPick={pickConcern}
						onClear={resetFilters}
						onMore={() => setConcernsOpen(true)}
						mainCount={MAIN_CONCERNS}
						moreIconPath={LAB_TYPES[0].icon}
					/>
				</View>

				{catalogue.loading && packages.length === 0 && tests.length === 0 && (
					<ActivityIndicator style={styles.spinner} color={APP_COLORS.primary} />
				)}

				{!!catalogue.error && (
					<AppCatalogEmpty
						title="Couldn’t load the tests"
						subtitle={catalogue.error}
						actionLabel="Try again"
						onAction={catalogue.retry}
					/>
				)}

				{unserved && (
					<AppCatalogEmpty
						title={`No lab serves ${coverage?.pincode} yet`}
						subtitle="We’re adding labs. Try another location, for example where the sample would be collected."
						actionLabel="Change location"
						onAction={changeLocation}
					/>
				)}

				{packages.length > 0 && (
					<AppCatalogSection
						title="Health packages"
						count={plural(packages.length, 'package', 'packages')}
						subtitle="Bundled checkups, sample collected at home"
					>
						{packages.map(row)}
					</AppCatalogSection>
				)}

				<AppTrustStrip chips={homeAvailable ? TRUST_CHIPS : TRUST_CHIPS.filter((c) => c.key !== 'home')} />

				{tests.length > 0 && (
					<AppCatalogSection
						title="Lab tests"
						count={catalogue.hasMore ? `${tests.length}+ tests` : plural(tests.length, 'test', 'tests')}
						subtitle="Sample collected at your home by the lab"
					>
						{tests.map(row)}
					</AppCatalogSection>
				)}

				{catalogue.loadingMore && <ActivityIndicator style={styles.spinner} color={APP_COLORS.primary} />}

				{noResults && (
					<AppCatalogEmpty
						title="No tests match your search"
						subtitle="Try another name, or browse all tests and packages."
						actionLabel={filtersActive ? 'Show all' : undefined}
						onAction={resetFilters}
					/>
				)}
			</ScrollView>

			<AppCartFooter
				empty={items.length === 0}
				countLabel={countLabel}
				totalLabel={`From ${inr(total)}`}
				ctaLabel="View cart"
				onCtaPress={goCart}
				emptyHint="Add a test or package to continue"
			/>

			<AppBottomSheet
				visible={concernsOpen}
				title="Shop by concern"
				subtitle="Quick searches for common health concerns"
				onClose={() => setConcernsOpen(false)}
				appearance="modern"
				showHeaderDivider={false}
			>
				<AppConcernRows
					tiles={concernTiles}
					activeId={concern}
					onPick={pickConcern}
					perRow={MORE_TILES_PER_ROW}
				/>
			</AppBottomSheet>

			<ServiceDetailsSheet
				variant="modern"
				visible={!!detailItem && detailReady}
				content={detailContent}
				onClose={closeDetail}
				added={detailItem ? inCart(detailItem.id) : false}
				addLabel="Add to cart"
				addedLabel="In your cart"
				onAdd={
					detailItem
						? () => {
								labBooking.addItem(detailItem.id)
								closeDetail()
							}
						: undefined
				}
				onRemove={detailItem ? () => labBooking.removeItem(detailItem.id) : undefined}
			/>
		</View>
	)
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: APP_COLORS.pageBg },
	scroll: { flex: 1 },
	scrollContent: { paddingVertical: 16, gap: 16 },
	filters: { paddingHorizontal: 16, gap: 12 },
	spinner: { marginVertical: 24 },
	locationRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16 },
	locationText: { flex: 1, fontSize: 13, lineHeight: 18, color: APP_COLORS.ink },
	headerLocation: { fontSize: 13, fontWeight: '600' },
	headerLocationCompact: { fontSize: 12, fontWeight: '500' },
})
