import React, { useRef, useState, useMemo } from 'react'
import {
	LayoutChangeEvent,
	ScrollView,
	StyleSheet,
	TouchableOpacity,
	View,
	useWindowDimensions,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AppTypography } from '../../components/common/AppTypography'
import { AppInput } from '../../components/common/AppInput'
import { ROUTES } from '../../navigation/routes'
import {
	HEALTH_CHECKUP_PACKAGES,
	HealthPackageItem,
	PACKAGE_CATEGORIES,
	POPULAR_DIAGNOSTIC_TESTS,
	DiagnosticTestItem,
} from './data/laboratoryMockData'
import { ServiceCatalogCard, ServiceProcedureItem, ServiceDetailsSheet } from '../../components/common'
import { PackageCategoryTabs } from './components/PackageCategoryTabs'
import { SectionSeeAllLink } from './components/SectionSeeAllLink'
import { toPackageProcedureItem, toTestProcedureItem } from './utils/mapToServiceItem'

const HOME_TEST_PREVIEW_COUNT = 6

export const LaboratoryHomeScreen: React.FC = () => {
	const insets = useSafeAreaInsets()
	const navigation = useNavigation<any>()
	const { width } = useWindowDimensions()
	const isLargeTablet = width >= 1024
	const isTablet = width >= 768

	const scrollViewRef = useRef<ScrollView>(null)

	// Layout positions for smooth scrolling to sections
	const testsSectionY = useRef<number>(0)
	const packagesSectionY = useRef<number>(0)

	// Local UI State
	const [searchQuery, setSearchQuery] = useState<string>('')
	const [selectedPackageCategory, setSelectedPackageCategory] = useState<string>('all')
	const [detailsService, setDetailsService] = useState<ServiceProcedureItem | null>(null)

	// Category tabs including "All Packages" derived dynamically from mock data
	const categoryTabItems = useMemo(() => {
		return [{ id: 'all', label: 'All Packages', icon: 'view-grid-outline' }, ...PACKAGE_CATEGORIES]
	}, [])

	// Filtered Diagnostic Tests
	const filteredDiagnosticTests = useMemo(() => {
		const query = searchQuery.trim().toLowerCase()
		if (!query) {
			return POPULAR_DIAGNOSTIC_TESTS
		}
		return POPULAR_DIAGNOSTIC_TESTS.filter(
			(test) =>
				test.name.toLowerCase().includes(query) ||
				test.alsoKnownAs.toLowerCase().includes(query) ||
				test.description.toLowerCase().includes(query) ||
				test.category.toLowerCase().includes(query)
		)
	}, [searchQuery])

	// Filtered Health Checkup Packages
	const filteredPackages = useMemo(() => {
		const query = searchQuery.trim().toLowerCase()
		if (query) {
			return HEALTH_CHECKUP_PACKAGES.filter(
				(pkg) =>
					pkg.name.toLowerCase().includes(query) ||
					pkg.includesSummary.toLowerCase().includes(query) ||
					pkg.ageRange.toLowerCase().includes(query) ||
					pkg.category.toLowerCase().includes(query)
			)
		}
		if (selectedPackageCategory === 'all') {
			return HEALTH_CHECKUP_PACKAGES
		}
		return HEALTH_CHECKUP_PACKAGES.filter((pkg) => pkg.category === selectedPackageCategory)
	}, [searchQuery, selectedPackageCategory])

	const isSearching = searchQuery.trim().length > 0

	// Home previews tests outside of search
	const visibleDiagnosticTests = isSearching
		? filteredDiagnosticTests
		: filteredDiagnosticTests.slice(0, HOME_TEST_PREVIEW_COUNT)
	const hasMoreTests = !isSearching && POPULAR_DIAGNOSTIC_TESTS.length > HOME_TEST_PREVIEW_COUNT

	const scrollToTests = () => {
		if (testsSectionY.current > 0) {
			scrollViewRef.current?.scrollTo({
				y: Math.max(0, testsSectionY.current - 12),
				animated: true,
			})
		}
	}

	const scrollToPackages = () => {
		if (packagesSectionY.current > 0) {
			scrollViewRef.current?.scrollTo({
				y: Math.max(0, packagesSectionY.current - 12),
				animated: true,
			})
		}
	}

	const openAllTests = () => {
		navigation.navigate(ROUTES.STACK.LABORATORY_ALL_TESTS)
	}

	const openAllPackages = () => {
		navigation.navigate(ROUTES.STACK.LABORATORY_ALL_PACKAGES)
	}

	// Direct booking navigation for Diagnostic Tests: Select -> Sample Collection
	const handleBookTest = (test: DiagnosticTestItem) => {
		navigation.navigate(ROUTES.STACK.LABORATORY_SAMPLE_COLLECTION, {
			testId: test.id,
			test,
			selectionType: 'tests',
		})
	}

	// Direct booking navigation for Health Packages: Select -> Patient Details / Sample Collection
	const handleBookPackage = (pkg: HealthPackageItem) => {
		navigation.navigate(ROUTES.STACK.LABORATORY_SAMPLE_COLLECTION, {
			packageId: pkg.id,
			package: pkg,
			selectionType: 'package',
		})
	}

	// Data converters to the common `ServiceCatalogCard` interface —
	// `toTestProcedureItem` / `toPackageProcedureItem`, imported above, are
	// shared with `AllDiagnosticTestsScreen.tsx` / `AllHealthPackagesScreen.tsx`
	// via `./utils/mapToServiceItem` rather than redefined per screen.

	const handleOpenTestDetails = (test: DiagnosticTestItem) => {
		setDetailsService(toTestProcedureItem(test))
	}

	const handleOpenPackageDetails = (pkg: HealthPackageItem) => {
		setDetailsService(toPackageProcedureItem(pkg))
	}

	const handleBookFromSheet = (service: ServiceProcedureItem) => {
		const isPackage = HEALTH_CHECKUP_PACKAGES.some((p) => p.id === service.id)
		if (isPackage) {
			const pkg = HEALTH_CHECKUP_PACKAGES.find((p) => p.id === service.id)
			if (pkg) handleBookPackage(pkg)
		} else {
			const test = POPULAR_DIAGNOSTIC_TESTS.find((t) => t.id === service.id)
			if (test) handleBookTest(test)
		}
	}

	const maxContentWidth = isLargeTablet ? 960 : 800
	const hasNoResults = isSearching && filteredDiagnosticTests.length === 0 && filteredPackages.length === 0

	return (
		<View style={styles.container}>
			{/* Search Bar matching Nursing Care */}
			<View style={styles.searchContainer}>
				<View style={[styles.innerContentContainer, isTablet && { maxWidth: maxContentWidth, alignSelf: 'center' }]}>
					<AppInput
						placeholder="Search tests or packages"
						value={searchQuery}
						onChangeText={setSearchQuery}
						isSearch
						noMargin
						numberOfLines={1}
						multiline={false}
					/>
				</View>
			</View>

			<ScrollView
				ref={scrollViewRef}
				contentContainerStyle={[
					styles.scrollContent,
					{ paddingBottom: Math.max(insets.bottom, 24) + 24 },
				]}
				showsVerticalScrollIndicator={false}
				keyboardShouldPersistTaps="handled"
			>
				<View style={[styles.innerContentContainer, isTablet && { maxWidth: maxContentWidth, alignSelf: 'center' }]}>
					{/* Search Results Notice Banner */}
					{isSearching && (
						<View style={styles.searchNoticeBanner}>
							<View style={styles.searchNoticeLeft}>
								<MaterialCommunityIcons name="magnify" size={18} color="#0C7C7C" />
								<AppTypography variant="caption" style={styles.searchNoticeText}>
									Found{' '}
									<AppTypography variant="caption" style={styles.searchNoticeBold}>
										{filteredDiagnosticTests.length} tests
									</AppTypography>{' '}
									and{' '}
									<AppTypography variant="caption" style={styles.searchNoticeBold}>
										{filteredPackages.length} packages
									</AppTypography>
								</AppTypography>
							</View>
							<TouchableOpacity
								onPress={() => setSearchQuery('')}
								hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
							>
								<AppTypography variant="caption" style={styles.searchNoticeClear}>
									Clear
								</AppTypography>
							</TouchableOpacity>
						</View>
					)}

					{/* No Results Empty State */}
					{hasNoResults ? (
						<View style={styles.emptyState}>
							<View style={styles.emptyIconContainer}>
								<MaterialCommunityIcons
									name="flask-empty-remove-outline"
									size={48}
									color="#94A3B8"
								/>
							</View>
							<AppTypography variant="subtitle" style={styles.emptyTitle} align="center">
								No matching tests or packages
							</AppTypography>
							<AppTypography variant="caption" style={styles.emptySubtitle} align="center">
								We couldn&apos;t find anything matching &quot;{searchQuery}&quot;. Try searching for
								another test or package.
							</AppTypography>
						</View>
					) : (
						<>
							{/* Section 1: Compact Quick Navigation Entry Cards (What are you looking for?) */}
							{!isSearching && (
								<View style={styles.quickActionSection}>
									<AppTypography variant="h4" style={styles.quickActionHeading}>
										What are you looking for?
									</AppTypography>
									<View style={styles.quickActionRow}>
										<TouchableOpacity
											style={styles.quickActionCard}
											onPress={scrollToTests}
											activeOpacity={0.8}
										>
											<View style={styles.quickActionIconCircle}>
												<MaterialCommunityIcons name="flask-outline" size={18} color="#0C7C7C" />
											</View>
											<View style={styles.quickActionTextWrap}>
												<AppTypography variant="caption" style={styles.quickActionTitle} numberOfLines={1}>
													Diagnostic Tests
												</AppTypography>
												<AppTypography variant="caption" style={styles.quickActionSubtitle} numberOfLines={1}>
													{POPULAR_DIAGNOSTIC_TESTS.length} Tests
												</AppTypography>
											</View>
										</TouchableOpacity>

										<TouchableOpacity
											style={styles.quickActionCard}
											onPress={scrollToPackages}
											activeOpacity={0.8}
										>
											<View style={styles.quickActionIconCircle}>
												<MaterialCommunityIcons name="shield-check-outline" size={18} color="#0C7C7C" />
											</View>
											<View style={styles.quickActionTextWrap}>
												<AppTypography variant="caption" style={styles.quickActionTitle} numberOfLines={1}>
													Health Checkups
												</AppTypography>
												<AppTypography variant="caption" style={styles.quickActionSubtitle} numberOfLines={1}>
													{HEALTH_CHECKUP_PACKAGES.length} Packages
												</AppTypography>
											</View>
										</TouchableOpacity>
									</View>
								</View>
							)}

							{/* Section 2: Diagnostic Tests */}
							{visibleDiagnosticTests.length > 0 && (
								<View
									style={styles.section}
									onLayout={(e: LayoutChangeEvent) => {
										testsSectionY.current = e.nativeEvent.layout.y
									}}
								>
									<View style={styles.sectionHeader}>
										<View style={styles.sectionHeaderTopRow}>
											<View style={styles.sectionTitleRow}>
												<AppTypography variant="h4" style={styles.sectionTitle}>
													{isSearching ? 'Diagnostic Tests' : 'Popular Diagnostic Tests'}
												</AppTypography>
												<AppTypography variant="caption" style={styles.sectionCountText}>
													({isSearching ? filteredDiagnosticTests.length : POPULAR_DIAGNOSTIC_TESTS.length})
												</AppTypography>
											</View>
											{hasMoreTests && <SectionSeeAllLink label="See All" onPress={openAllTests} />}
										</View>
										<AppTypography variant="caption" style={styles.sectionSubtitle}>
											Frequently booked individual tests & profiles
										</AppTypography>
									</View>

									{visibleDiagnosticTests.map((test) => (
										<ServiceCatalogCard
											key={test.id}
											item={toTestProcedureItem(test)}
											quantity={0}
											onSelectService={() => handleBookTest(test)}
											onCardPress={() => handleOpenTestDetails(test)}
										/>
									))}
								</View>
							)}

							{/* Section 3: Health Checkup Packages */}
							{filteredPackages.length > 0 && (
								<View
									style={styles.section}
									onLayout={(e: LayoutChangeEvent) => {
										packagesSectionY.current = e.nativeEvent.layout.y
									}}
								>
									<View style={styles.sectionHeader}>
										<View style={styles.sectionHeaderTopRow}>
											<View style={styles.sectionTitleRow}>
												<AppTypography variant="h4" style={styles.sectionTitle}>
													Health Checkup Packages
												</AppTypography>
												<AppTypography variant="caption" style={styles.sectionCountText}>
													({filteredPackages.length})
												</AppTypography>
											</View>
											{!isSearching && (
												<SectionSeeAllLink label="See All" onPress={openAllPackages} />
											)}
										</View>
										<AppTypography variant="caption" style={styles.sectionSubtitle}>
											Comprehensive health checkups designed for prevention
										</AppTypography>
									</View>

									{/* Package Category Filter Tabs located directly inside Health Checkup Section */}
									{!isSearching && (
										<PackageCategoryTabs
											categories={categoryTabItems}
											activeId={selectedPackageCategory}
											onSelectCategory={setSelectedPackageCategory}
											style={styles.categoryTabs}
										/>
									)}

									{filteredPackages.map((pkg) => (
										<ServiceCatalogCard
											key={pkg.id}
											item={toPackageProcedureItem(pkg)}
											quantity={0}
											onSelectService={() => handleBookPackage(pkg)}
											onCardPress={() => handleOpenPackageDetails(pkg)}
										/>
									))}
								</View>
							)}
						</>
					)}
				</View>
			</ScrollView>

			{/* Half Bottom Sheet for Service Details */}
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
	innerContentContainer: {
		width: '100%',
	},
	scrollContent: {
		paddingTop: 4,
	},
	searchNoticeBanner: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		backgroundColor: 'rgba(12, 124, 124, 0.08)',
		marginHorizontal: 16,
		marginBottom: 12,
		paddingHorizontal: 12,
		paddingVertical: 9,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: 'rgba(12, 124, 124, 0.2)',
	},
	searchNoticeLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		flex: 1,
	},
	searchNoticeText: {
		fontSize: 13,
		color: '#181C1D',
	},
	searchNoticeBold: {
		fontWeight: '700',
		color: '#0C7C7C',
	},
	searchNoticeClear: {
		fontSize: 13,
		fontWeight: '700',
		color: '#0C7C7C',
		paddingHorizontal: 6,
	},
	quickActionSection: {
		paddingHorizontal: 16,
		marginTop: 4,
		marginBottom: 16,
	},
	quickActionHeading: {
		fontSize: 15,
		fontWeight: '700',
		color: '#181C1D',
		marginBottom: 8,
	},
	quickActionRow: {
		flexDirection: 'row',
		gap: 10,
	},
	quickActionCard: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#FFFFFF',
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#E2E8F0',
		paddingHorizontal: 10,
		paddingVertical: 10,
	},
	quickActionIconCircle: {
		width: 36,
		height: 36,
		borderRadius: 18,
		backgroundColor: '#E6F4F1',
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 8,
	},
	quickActionTextWrap: {
		flex: 1,
	},
	quickActionTitle: {
		fontSize: 13,
		fontWeight: '700',
		color: '#181C1D',
		lineHeight: 17,
	},
	quickActionSubtitle: {
		fontSize: 11.5,
		color: '#64748B',
		marginTop: 1,
	},
	section: {
		paddingHorizontal: 16,
		marginBottom: 20,
	},
	sectionHeader: {
		marginBottom: 8,
	},
	sectionHeaderTopRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 8,
	},
	sectionTitleRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		flexShrink: 1,
	},
	sectionTitle: {
		fontSize: 16,
		fontWeight: '700',
		color: '#0F172A',
		letterSpacing: -0.2,
	},
	sectionCountText: {
		fontSize: 13,
		fontWeight: '600',
		color: '#64748B',
	},
	sectionSubtitle: {
		fontSize: 12,
		color: '#64748B',
		marginTop: 2,
	},
	categoryTabs: {
		marginTop: 4,
		marginBottom: 8,
	},
	emptyState: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 56,
		paddingHorizontal: 32,
		marginHorizontal: 16,
		marginTop: 20,
		backgroundColor: '#FFFFFF',
		borderRadius: 16,
		borderWidth: 1,
		borderColor: '#E2E8F0',
	},
	emptyIconContainer: {
		width: 72,
		height: 72,
		borderRadius: 36,
		backgroundColor: '#F1F5F9',
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 16,
	},
	emptyTitle: {
		fontWeight: '700',
		color: '#181C1D',
		marginBottom: 8,
	},
	emptySubtitle: {
		color: '#64748B',
		lineHeight: 19,
		marginBottom: 20,
	},
})

export default LaboratoryHomeScreen
