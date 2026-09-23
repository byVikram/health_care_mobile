import React, { useMemo, useState } from 'react'
import { FlatList, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { AppTypography } from '../../components/common/AppTypography'
import { AppInput } from '../../components/common/AppInput'
import { ROUTES } from '../../navigation/routes'
import { DiagnosticTestItem, POPULAR_DIAGNOSTIC_TESTS } from './data/laboratoryMockData'
import { ServiceCatalogCard, ServiceDetailsSheet, ServiceProcedureItem } from '../../components/common'
import { toTestProcedureItem } from './utils/mapToServiceItem'

export const AllDiagnosticTestsScreen: React.FC = () => {
	const insets = useSafeAreaInsets()
	const navigation = useNavigation<any>()
	const [query, setQuery] = useState('')
	const [detailsService, setDetailsService] = useState<ServiceProcedureItem | null>(null)

	const filteredTests = useMemo(() => {
		const q = query.trim().toLowerCase()
		if (!q) return POPULAR_DIAGNOSTIC_TESTS
		return POPULAR_DIAGNOSTIC_TESTS.filter(
			(test) =>
				test.name.toLowerCase().includes(q) ||
				test.alsoKnownAs.toLowerCase().includes(q) ||
				test.description.toLowerCase().includes(q) ||
				test.category.toLowerCase().includes(q)
		)
	}, [query])

	// Same direct "select → Sample Collection" navigation the Home screen
	// uses (no cart) — carries the single chosen test as a route param.
	const handleSelectTest = (test: DiagnosticTestItem) => {
		navigation.navigate(ROUTES.STACK.LABORATORY_SAMPLE_COLLECTION, {
			testId: test.id,
			test,
			selectionType: 'tests',
		})
	}

	const handleOpenDetails = (test: DiagnosticTestItem) => {
		setDetailsService(toTestProcedureItem(test))
	}

	const handleBookFromSheet = (service: ServiceProcedureItem) => {
		const test = POPULAR_DIAGNOSTIC_TESTS.find((t) => t.id === service.id)
		if (test) handleSelectTest(test)
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

			<FlatList<DiagnosticTestItem>
				data={filteredTests}
				keyExtractor={(item) => item.id}
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
				contentContainerStyle={[
					styles.listContent,
					{ paddingBottom: Math.max(insets.bottom, 24) + 16 },
				]}
				ListHeaderComponent={
					<AppTypography variant="caption" style={styles.resultCount}>
						{filteredTests.length} {filteredTests.length === 1 ? 'test' : 'tests'} available
					</AppTypography>
				}
				ListEmptyComponent={
					<View style={styles.emptyState}>
						<MaterialCommunityIcons name="flask-empty-remove-outline" size={44} color="#94A3B8" />
						<AppTypography variant="subtitle" style={styles.emptyTitle} align="center">
							No tests found
						</AppTypography>
						<AppTypography variant="caption" style={styles.emptySubtitle} align="center">
							Try a different name, like Thyroid, CBC, or Vitamin D.
						</AppTypography>
					</View>
				}
				renderItem={({ item }) => (
					<ServiceCatalogCard
						item={toTestProcedureItem(item)}
						quantity={0}
						onSelectService={() => handleSelectTest(item)}
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
	listContent: {
		paddingHorizontal: 16,
		paddingTop: 12,
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

export default AllDiagnosticTestsScreen
