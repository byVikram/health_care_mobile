// src/features/laboratory/LabCatalogPage.tsx
//
// "Lab tests and packages" from the Lab Tests Ordering design: collapsing ink header (greeting, search, cart),
// All / Packages / Single tests tabs, "Shop by concern" tiles, an offers carousel, the health-packages and
// lab-tests lists with an Add toggle, a trust strip, the details sheet and the cart footer. Built from the
// shared catalogue blocks (AppCatalogHeader / Section / TrustStrip / ConcernGrid), AppCatalogItemRow,
// AppPromoCard + AppCarousel, ServiceDetailsSheet (modern) and AppCartFooter. Data is mock (labMock.ts).

import React, { useMemo, useRef, useState } from 'react'
import {
	LayoutAnimation,
	ScrollView,
	StyleSheet,
	View,
	type NativeScrollEvent,
	type NativeSyntheticEvent,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import {
	AppBottomSheet,
	AppCarousel,
	AppCartFooter,
	AppCatalogEmpty,
	AppCatalogHeader,
	AppCatalogItemRow,
	AppCatalogSection,
	AppConcernGrid,
	AppConcernRows,
	AppPromoCard,
	AppTabs,
	AppTrustStrip,
	ServiceDetailsSheet,
	type AppPromoCardProps,
	type AppTabItem,
	type ServiceDetailsContent,
} from '../../components/common'
import { APP_COLORS } from '../../config/theme'
import { useAuth } from '../../context/AuthContext'
import { ROUTES } from '../../navigation/routes'
import type { AppStackParamList } from '../../navigation/types'
import { cartItems, labBooking, totalsOf, useLabBooking } from './labBookingStore'
import { inr, plural } from './labFormat'
import {
	DIABETES_ITEM_ID,
	LAB_CONCERNS,
	LAB_ICONS,
	LAB_PACKAGES,
	LAB_TESTS,
	LAB_TYPES,
	VITAMIN_ITEM_IDS,
	labItemById,
	type LabItem,
	type LabTypeId,
} from './labMock'

type Nav = NativeStackNavigationProp<AppStackParamList>

const TYPE_TAB_ICONS: Record<LabTypeId, AppTabItem['icon']> = {
	all: 'view-grid-outline',
	packages: 'package-variant-closed',
	tests: 'flask-outline',
}

const MAIN_CONCERNS = 4
const MORE_TILES_PER_ROW = 4

const TRUST_CHIPS = [
	{ key: 'home', label: 'Free home collection', icon: LAB_ICONS.home },
	{
		key: 'phleb',
		label: 'Trained phlebotomists',
		icon: 'M10 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM3 21a7 7 0 0 1 14 0M16 11l2 2 4-4',
	},
	{
		key: 'reports',
		label: 'Reports in the app',
		icon: 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h6',
	},
]

const matchesQuery = (item: LabItem, q: string) => {
	if (!q) return true
	return `${item.name} ${item.about} ${item.bullets.join(' ')} ${item.tags.join(' ')}`.toLowerCase().includes(q)
}

/** Content for the shared "modern" details sheet (design: hero, at a glance, what it checks, included, prep). */
const sheetContentFor = (item: LabItem): ServiceDetailsContent => {
	const isPkg = item.kind === 'package'
	const fastText = item.fasting ? `${item.fastingLabel} fasting` : 'Not needed'
	const prep = item.fasting
		? [
				`Don’t eat for ${item.fastingLabel} before your slot. Plain water is fine.`,
				'Take your regular medicines unless your doctor has told you otherwise.',
				'Book a morning slot so fasting is easier.',
			]
		: [
				'No fasting needed. You can eat and drink as usual.',
				'Take your regular medicines unless your doctor has told you otherwise.',
				'Keep a photo ID handy for the phlebotomist.',
			]
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
				value: isPkg ? `${item.tests} tests` : item.sample,
				icon: isPkg
					? 'M9 3h6M10 3v6L4.8 18.2A1.9 1.9 0 0 0 6.4 21h11.2a1.9 1.9 0 0 0 1.6-2.8L14 9V3M7.5 15h9'
					: LAB_ICONS.drop,
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
				value: isPkg ? item.sample : 'At home',
				icon: isPkg ? LAB_ICONS.drop : LAB_ICONS.home,
				tone: 'mint',
			},
		],
		aboutTitle: 'What it checks',
		about: item.about,
		goodFor: item.forWho,
		includes: item.includes?.map(([label, n]) => ({ label, meta: plural(n, 'test', 'tests') })),
		prepTitle: 'Before your test',
		prepSteps: prep,
		trustLine: 'Free home sample collection · report in the app',
	}
}

export default function LabCatalogPage() {
	const navigation = useNavigation<Nav>()
	const { user } = useAuth()
	const booking = useLabBooking()

	const [type, setType] = useState<LabTypeId>('all')
	const [concern, setConcern] = useState<string | null>(null)
	const [query, setQuery] = useState('')
	const [detailId, setDetailId] = useState<string | null>(null)
	const [concernsOpen, setConcernsOpen] = useState(false)
	const [compact, setCompact] = useState(false)
	const compactRef = useRef(false)

	const items = cartItems(booking)
	const { total, savings } = totalsOf(booking)
	const inCart = (id: string) => booking.cart.includes(id)
	const countLabel = `${plural(items.length, 'item', 'items')} added`

	const q = query.trim().toLowerCase()
	const matches = (item: LabItem) => {
		const okType =
			type === 'all' ||
			(type === 'packages' && item.kind === 'package') ||
			(type === 'tests' && item.kind === 'test')
		return okType && (!concern || item.tags.includes(concern)) && matchesQuery(item, q)
	}
	const packages = LAB_PACKAGES.filter(matches)
	const tests = LAB_TESTS.filter(matches)
	const noResults = packages.length === 0 && tests.length === 0
	const filtersActive = type !== 'all' || !!concern || !!q

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
		setConcernsOpen(false)
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

	const concernTiles = useMemo(
		() => LAB_CONCERNS.map((c) => ({ id: c.id, label: c.label, iconPath: c.icon, bg: c.bg, ink: c.ink })),
		[]
	)

	// ---- offers ----
	const vitaminsAdded = VITAMIN_ITEM_IDS.every(inCart)
	const diabetes = labItemById(DIABETES_ITEM_ID)
	const slides = useMemo<(AppPromoCardProps & { key: string })[]>(
		() => [
			{
				key: 'full-body',
				tone: 'ink',
				eyebrow: 'UP TO 32% OFF',
				title: 'Full body checkup at home',
				subtitle: '62+ tests · Reports in 24 hrs',
				ctaLabel: 'Book now',
				ctaChevron: false,
				iconPath: LAB_ICONS.package,
				onPress: () => {
					setType('packages')
					setConcern(null)
					setQuery('')
				},
			},
			{
				key: 'diabetes',
				tone: 'lilac',
				eyebrow: 'DIABETES CARE',
				title: 'Know your sugar numbers',
				subtitle: 'HbA1c + 13 tests for',
				priceLabel: diabetes ? inr(diabetes.price) : undefined,
				mrpLabel: diabetes ? inr(diabetes.mrp) : undefined,
				ctaLabel: 'View package',
				ctaChevron: false,
				iconPath: 'M12 3s6 6.6 6 11a6 6 0 0 1-12 0c0-4.4 6-11 6-11zM9.5 14.5a2.5 2.5 0 0 0 2.5 2.5',
				onPress: () => setDetailId(DIABETES_ITEM_ID),
			},
			{
				key: 'vitamins',
				tone: 'peach',
				eyebrow: 'VITAMIN CHECK',
				title: 'Low energy? Check D & B12',
				subtitle: 'Both tests for ₹1,698 · No fasting',
				ctaLabel: vitaminsAdded ? 'Added to cart' : 'Add both',
				ctaChevron: false,
				iconPath:
					'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
				onPress: () => VITAMIN_ITEM_IDS.forEach((id) => labBooking.addItem(id)),
			},
		],
		[diabetes, vitaminsAdded]
	)

	const detailItem = detailId ? labItemById(detailId) : undefined
	const detailContent = useMemo(() => (detailItem ? sheetContentFor(detailItem) : null), [detailItem])
	const closeDetail = () => setDetailId(null)

	const goCart = () => navigation.navigate(ROUTES.STACK.LABORATORY_SAMPLE_COLLECTION)

	const typeTabs: AppTabItem<LabTypeId>[] = LAB_TYPES.map((t) => ({
		key: t.id,
		label: t.label,
		icon: TYPE_TAB_ICONS[t.id],
	}))

	const firstName = (user?.name ?? '').trim().split(/\s+/)[0] ?? ''

	const row = (item: LabItem, i: number) => (
		<AppCatalogItemRow
			key={item.id}
			divider={i > 0}
			name={item.name}
			priceLabel={inr(item.price)}
			mrpLabel={inr(item.mrp)}
			metaLabel={item.kind === 'test' ? item.report : undefined}
			points={item.bullets}
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
				subtitle="Free home collection · Next slot tomorrow, 7–9 AM"
				compact={compact}
				showBack={navigation.canGoBack()}
				onBack={() => navigation.goBack()}
				cartCount={items.length}
				onCartPress={goCart}
				cartLabel={`Cart, ${items.length === 0 ? 'no items added' : countLabel}`}
				search={{
					value: query,
					onChange: setQuery,
					placeholder: 'Search tests, e.g. thyroid, HbA1c',
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

				<AppCarousel
					data={slides}
					autoPlay
					autoPlayInterval={4500}
					accessibilityLabel="Offers"
					keyExtractor={(s) => s.key}
					renderItem={({ item }) => {
						const { key: _key, ...cardProps } = item
						return <AppPromoCard {...cardProps} />
					}}
				/>

				{packages.length > 0 && (
					<AppCatalogSection
						title="Health packages"
						count={plural(packages.length, 'package', 'packages')}
						subtitle="Full body checkups, sample collected at home"
					>
						{packages.map(row)}
					</AppCatalogSection>
				)}

				<AppTrustStrip chips={TRUST_CHIPS} />

				{tests.length > 0 && (
					<AppCatalogSection
						title="Lab tests at home"
						count={plural(tests.length, 'test', 'tests')}
						subtitle="A trained phlebotomist collects your sample at home"
					>
						{tests.map(row)}
					</AppCatalogSection>
				)}

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
				totalLabel={inr(total)}
				savingsLabel={savings > 0 ? `You save ${inr(savings)}` : undefined}
				ctaLabel="View cart"
				onCtaPress={goCart}
				emptyHint="Add a test or package to continue"
			/>

			<AppBottomSheet
				visible={concernsOpen}
				title="Shop by concern"
				subtitle="Tests and packages grouped by health concern"
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
				visible={!!detailItem}
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
})
