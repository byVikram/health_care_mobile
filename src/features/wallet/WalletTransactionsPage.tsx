// src/features/wallet/WalletTransactionsPage.tsx
import React, { useEffect, useState, useCallback } from 'react'
import {
	View,
	Text,
	StyleSheet,
	FlatList,
	TouchableOpacity,
	RefreshControl,
	ActivityIndicator,
	SafeAreaView,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import AppScreenHeader from '../../components/common/AppScreenHeader'
import { ROUTES } from '../../navigation/routes'
import { getWalletTransactions, WalletTransactionData } from './walletService'

type FilterType = 'ALL' | 'CREDIT' | 'DEBIT'

export const WalletTransactionsPage: React.FC = () => {
	const navigation = useNavigation<any>()

	const [transactions, setTransactions] = useState<WalletTransactionData[]>([])
	const [activeFilter, setActiveFilter] = useState<FilterType>('ALL')
	const [loading, setLoading] = useState(true)
	const [refreshing, setRefreshing] = useState(false)
	const [page, setPage] = useState(1)
	const [hasMore, setHasMore] = useState(true)

	const fetchTransactions = useCallback(
		async (pageNum = 1, isRefresh = false) => {
			try {
				if (pageNum === 1) setLoading(true)

				const res = await getWalletTransactions({
					transaction_type: activeFilter === 'ALL' ? undefined : activeFilter,
					page: pageNum,
					limit: 15,
				})

				if (res.success && res.data) {
					if (isRefresh || pageNum === 1) {
						setTransactions(res.data)
					} else {
						setTransactions((prev) => [...prev, ...res.data])
					}
					setHasMore(pageNum < (res.meta?.pages || 1))
				}
			} catch (error) {
				console.log('Error fetching transactions:', error)
			} finally {
				setLoading(false)
				setRefreshing(false)
			}
		},
		[activeFilter]
	)

	useEffect(() => {
		setPage(1)
		fetchTransactions(1, true)
	}, [activeFilter, fetchTransactions])

	const onRefresh = () => {
		setRefreshing(true)
		setPage(1)
		fetchTransactions(1, true)
	}

	const loadMore = () => {
		if (!loading && hasMore) {
			const nextPage = page + 1
			setPage(nextPage)
			fetchTransactions(nextPage, false)
		}
	}

	return (
		<SafeAreaView style={styles.container}>
			<AppScreenHeader title="Transaction History" onBack={() => navigation.goBack()} />

			{/* Filter Tabs */}
			<View style={styles.filterContainer}>
				{(['ALL', 'CREDIT', 'DEBIT'] as const).map((filter) => (
					<TouchableOpacity
						key={filter}
						style={[styles.filterTab, activeFilter === filter && styles.filterTabActive]}
						onPress={() => setActiveFilter(filter)}
					>
						<Text style={[styles.filterText, activeFilter === filter && styles.filterTextActive]}>
							{filter}
						</Text>
					</TouchableOpacity>
				))}
			</View>

			{loading && page === 1 ? (
				<View style={styles.centerLoading}>
					<ActivityIndicator size="large" color="#42b883" />
				</View>
			) : (
				<FlatList
					data={transactions}
					keyExtractor={(item) => item.public_id || item.id}
					refreshControl={
						<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#42b883']} />
					}
					onEndReached={loadMore}
					onEndReachedThreshold={0.5}
					contentContainerStyle={styles.listContainer}
					ListEmptyComponent={
						<View style={styles.emptyContainer}>
							<MaterialCommunityIcons name="receipt" size={54} color="#cbd5e1" />
							<Text style={styles.emptyTitle}>No Transactions Found</Text>
							<Text style={styles.emptySub}>
								{activeFilter === 'ALL'
									? 'Your wallet transaction activity will appear here.'
									: `No ${activeFilter.toLowerCase()} transactions available.`}
							</Text>
						</View>
					}
					renderItem={({ item }) => {
						const isCredit = item.transaction_type === 'CREDIT'
						const amountVal = parseFloat(String(item.amount || '0'))

						return (
							<TouchableOpacity
								style={styles.txRow}
								onPress={() =>
									navigation.navigate(ROUTES.STACK.WALLET_TRANSACTION_DETAIL, {
										id: item.public_id || item.id,
									})
								}
							>
								<View
									style={[
										styles.txIconBox,
										isCredit ? styles.txIconCredit : styles.txIconDebit,
									]}
								>
									<MaterialCommunityIcons
										name={isCredit ? 'arrow-down-bold' : 'arrow-up-bold'}
										size={20}
										color={isCredit ? '#16a34a' : '#dc2626'}
									/>
								</View>

								<View style={styles.txDetails}>
									<Text style={styles.txCategory}>{item.category || item.transaction_type}</Text>
									<Text style={styles.txDate}>
										{new Date(item.created_at).toLocaleDateString(undefined, {
											month: 'short',
											day: 'numeric',
											year: 'numeric',
											hour: '2-digit',
											minute: '2-digit',
										})}
									</Text>
								</View>

								<Text style={[styles.txAmount, isCredit ? styles.txCredit : styles.txDebit]}>
									{isCredit ? '+' : '-'}₹{amountVal.toFixed(2)}
								</Text>
							</TouchableOpacity>
						)
					}}
				/>
			)}
		</SafeAreaView>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f8fafc',
	},
	centerLoading: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	filterContainer: {
		flexDirection: 'row',
		backgroundColor: '#fff',
		paddingHorizontal: 16,
		paddingVertical: 10,
		borderBottomWidth: 1,
		borderColor: '#e2e8f0',
	},
	filterTab: {
		flex: 1,
		paddingVertical: 8,
		alignItems: 'center',
		borderRadius: 8,
		marginHorizontal: 4,
	},
	filterTabActive: {
		backgroundColor: '#e6f7f0',
	},
	filterText: {
		fontSize: 13,
		fontWeight: '600',
		color: '#64748b',
	},
	filterTextActive: {
		color: '#15803d',
		fontWeight: '700',
	},
	listContainer: {
		padding: 16,
	},
	emptyContainer: {
		alignItems: 'center',
		paddingVertical: 64,
	},
	emptyTitle: {
		fontSize: 16,
		fontWeight: '700',
		color: '#334155',
		marginTop: 12,
	},
	emptySub: {
		fontSize: 13,
		color: '#94a3b8',
		marginTop: 4,
		textAlign: 'center',
	},
	txRow: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#fff',
		padding: 16,
		borderRadius: 14,
		marginBottom: 10,
		borderWidth: 1,
		borderColor: '#f1f5f9',
	},
	txIconBox: {
		width: 42,
		height: 42,
		borderRadius: 12,
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 12,
	},
	txIconCredit: {
		backgroundColor: '#dcfce7',
	},
	txIconDebit: {
		backgroundColor: '#fee2e2',
	},
	txDetails: {
		flex: 1,
	},
	txCategory: {
		fontSize: 15,
		fontWeight: '700',
		color: '#1e293b',
	},
	txDate: {
		fontSize: 12,
		color: '#94a3b8',
		marginTop: 3,
	},
	txAmount: {
		fontSize: 16,
		fontWeight: '700',
	},
	txCredit: {
		color: '#16a34a',
	},
	txDebit: {
		color: '#dc2626',
	},
})
