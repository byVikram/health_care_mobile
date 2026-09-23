import React, { useMemo, useState } from 'react'
import { FlatList, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { AppTypography } from '../../components/common/AppTypography'
import { AppInput } from '../../components/common/AppInput'
import { ROUTES } from '../../navigation/routes'
import { HEALTH_CHECKUP_PACKAGES, HealthPackageItem, PACKAGE_CATEGORIES } from './data/laboratoryMockData'
import { PackageCategoryTabs } from './components/PackageCategoryTabs'
import { ServiceCatalogCard, ServiceDetailsSheet, ServiceProcedureItem } from '../../components/common'
import { toPackageProcedureItem } from './utils/mapToServiceItem'

const ALL_CATEGORY_ID = 'all'

export const AllHealthPackagesScreen: React.FC = () => {
	const insets = useSafeAreaInsets()
	const navigation = useNavigation<any>()
	const [query, setQuery] = useState('')
	const [activeCategory, setActiveCategory] = useState<string>(ALL_CATEGORY_ID)
	const [detailsService, setDetailsService] = useState<ServiceProcedureItem | null>(null)

	const categories = useMemo(
		() => [{ id: ALL_CATEGORY_ID, label: 'All Packages', icon: 'view-grid-outline' }, ...PACKAGE_CATEGORIES],
		[]
	)

	const filteredPackages = useMemo(() => {
		const q = query.trim().toLowerCase()
		return HEALTH_CHECKUP_PACKAGES.filter((pkg) => {
			const matchesCategory = activeCategory === ALL_CATEGORY_ID || pkg.category === activeCategory
			if (!matchesCategory) return false
			if (!q) return true
			return (
				pkg.name.toLowerCase().includes(q) ||
				pkg.includesSummary.toLowerCase().includes(q) ||
				pkg.ageRange.toLowerCase().includes(q)
			)
		})
	}, [query, activeCategory])

	// Same direct "select → Sample Collection" navigation the Home screen
	// uses (no cart) — carries the single chosen package as a route param.
	const handleSelectPackage = (pkg: HealthPackageItem) => {
		navigation.navigate(ROUTES.STACK.LABORATORY_SAMPLE_COLLECTION, {
			packageId: pkg.id,
			package: pkg,
			selectionType: 'package',
		})
	}

	const handleOpenDetails = (pkg: HealthPackageItem) => {
		setDetailsService(toPackageProcedureItem(pkg))
	}

	const handleBookFromSheet = (service: ServiceProcedureItem) => {
		const pkg = HEALTH_CHECKUP_PACKAGES.find((p) => p.id === service.id)
		if (pkg) handleSelectPackage(pkg)
	}

	return (
		<View style={styles.container}>
			<View style={styles.searchContainer}>
				<AppInput
					placeholder="Search tests or packages"
					value={query}
					onChangeText={setQuery}
					isSearch
					noMargin
					numberOfLines={1}
					multiline={false}
				/>
			</View>

			<PackageCategoryTabs
				categories={categories}
				activeId={activeCategory}
				onSelectCategory={setActiveCategory}
				style={styles.tabs}
			/>

			<FlatList<HealthPackageItem>
				data={filteredPackages}
				keyExtractor={(item) => item.id}
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
				contentContainerStyle={[
					styles.listContent,
					{ paddingBottom: Math.max(insets.bottom, 24) + 16 },
				]}
				ListHeaderComponent={
					<AppTypography variant="caption" style={styles.resultCount}>
						{filteredPackages.length} {filteredPackages.length === 1 ? 'package' : 'packages'} available
					</AppTypography>
				}
				ListEmptyComponent={
					<View style={styles.emptyState}>
						<MaterialCommunityIcons name="magnify-close" size={44} color="#94A3B8" />
						<AppTypography variant="subtitle" style={styles.emptyTitle} align="center">
							No packages found
						</AppTypography>
						<AppTypography variant="caption" style={styles.emptySubtitle} align="center">
							Try a different category or search term.
						</AppTypography>
					</View>
				}
				renderItem={({ item }) => (
					<ServiceCatalogCard
						item={toPackageProcedureItem(item)}
						quantity={0}
						onSelectService={() => handleSelectPackage(item)}
						onCardPress={() => handleOpenDetails(item)}
					/>
				)}
			/>

			<ServiceDetailsSheet
				visible={!!detailsService}
				service={detailsService}
				onClose={() => setDetailsService(null)}
				onAddToBooking={handleBookFromSheet}
				showReviews={false}
			/>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#F8FAFC',
	},
	searchContainer: {
		paddingHorizontal: 16,
		paddingTop: 12,
		paddingBottom: 8,
	},
	tabs: {
		marginTop: 8,
	},
	listContent: {
		paddingHorizontal: 16,
		paddingTop: 8,
	},
	resultCount: {
		marginBottom: 8,
		color: '#64748B',
		fontWeight: '600',
	},
	emptyState: {
		alignItems: 'center',
		paddingVertical: 56,
		paddingHorizontal: 32,
		gap: 6,
	},
	emptyTitle: {
		marginTop: 12,
		marginBottom: 2,
		fontWeight: '700',
		color: '#181C1D',
	},
	emptySubtitle: {
		color: '#64748B',
	},
})

export default AllHealthPackagesScreen
