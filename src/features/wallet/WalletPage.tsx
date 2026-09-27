// src/features/wallet/WalletPage.tsx
import React, { useEffect, useState, useCallback } from 'react'
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	TouchableOpacity,
	RefreshControl,
	ActivityIndicator,
	SafeAreaView,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import AppScreenHeader from '../../components/common/layout/AppScreenHeader'
import { ROUTES } from '../../navigation/routes'
import { getWallet, getWalletTransactions, WalletData, WalletTransactionData } from './walletService'
import { WalletTopUpModal } from './WalletTopUpModal'

export const WalletPage: React.FC = () => {
	const navigation = useNavigation<any>()

	const [wallet, setWallet] = useState<WalletData | null>(null)
	const [transactions, setTransactions] = useState<WalletTransactionData[]>([])
	const [loading, setLoading] = useState(true)
	const [refreshing, setRefreshing] = useState(false)
	const [topUpModalVisible, setTopUpModalVisible] = useState(false)

	const loadWalletData = useCallback(async () => {
		try {
			const [walletRes, txRes] = await Promise.all([
				getWallet(),
				getWalletTransactions({ limit: 5 }),
			])

			if (walletRes.success && walletRes.data) {
				setWallet(walletRes.data)
			}
			if (txRes.success && txRes.data) {
				setTransactions(txRes.data)
			}
		} catch (error) {
			console.log('Error loading wallet:', error)
		} finally {
			setLoading(false)
			setRefreshing(false)
		}
	}, [])

	useEffect(() => {
		loadWalletData()
	}, [loadWalletData])

	const onRefresh = () => {
		setRefreshing(true)
		loadWalletData()
	}

	const balanceNum = parseFloat(String(wallet?.balance || '0.00'))
	const isNegative = balanceNum < 0

	const formatCurrency = (val: number) => {
		const absVal = Math.abs(val).toFixed(2)
		return val < 0 ? `-₹${absVal}` : `₹${absVal}`
	}

	return (
		<SafeAreaView style={styles.container}>
			<AppScreenHeader title="My Wallet" onBack={() => navigation.goBack()} />

			{loading && !refreshing ? (
				<View style={styles.centerLoading}>
					<ActivityIndicator size="large" color="#42b883" />
				</View>
			) : (
				<ScrollView
					contentContainerStyle={styles.contentContainer}
					refreshControl={
						<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#42b883']} />
					}
				>
					{/* Balance Card */}
					<View style={[styles.balanceCard, isNegative && styles.balanceCardNegative]}>
						<View style={styles.balanceHeaderRow}>
							<Text style={styles.balanceTitle}>Available Balance</Text>
							{wallet?.is_frozen && (
								<View style={styles.badgeFrozen}>
									<Text style={styles.badgeFrozenText}>FROZEN</Text>
								</View>
							)}
						</View>

						<Text style={[styles.balanceValue, isNegative && styles.balanceValueNegative]}>
							{formatCurrency(balanceNum)}
						</Text>

						{isNegative && (
							<View style={styles.negativeNotice}>
								<MaterialCommunityIcons name="alert-circle-outline" size={16} color="#dc2626" />
								<Text style={styles.negativeNoticeText}>
									Amount owed to platform. Please top up to settle balance.
								</Text>
							</View>
						)}

						{/* Action Buttons */}
						<View style={styles.actionRow}>
							<TouchableOpacity
								style={styles.primaryActionBtn}
								onPress={() => setTopUpModalVisible(true)}
							>
								<MaterialCommunityIcons name="plus-circle-outline" size={20} color="#fff" />
								<Text style={styles.primaryActionBtnText}>Add Money</Text>
							</TouchableOpacity>

							<TouchableOpacity
								style={styles.secondaryActionBtn}
								onPress={() => navigation.navigate(ROUTES.STACK.WALLET_TRANSACTIONS)}
							>
								<MaterialCommunityIcons name="history" size={20} color="#42b883" />
								<Text style={styles.secondaryActionBtnText}>History</Text>
							</TouchableOpacity>
						</View>
					</View>

					{/* Recent Transactions Section */}
					<View style={styles.sectionHeader}>
						<Text style={styles.sectionTitle}>Recent Activity</Text>
						<TouchableOpacity onPress={() => navigation.navigate(ROUTES.STACK.WALLET_TRANSACTIONS)}>
							<Text style={styles.viewAllText}>View All</Text>
						</TouchableOpacity>
					</View>

					{transactions.length === 0 ? (
						<View style={styles.emptyContainer}>
							<MaterialCommunityIcons name="wallet-outline" size={48} color="#ccc" />
							<Text style={styles.emptyText}>No recent transactions</Text>
						</View>
					) : (
						transactions.map((tx) => {
							const isCredit = tx.transaction_type === 'CREDIT'
							const amountVal = parseFloat(String(tx.amount || '0'))

							return (
								<TouchableOpacity
									key={tx.public_id || tx.id}
									style={styles.txRow}
									onPress={() =>
										navigation.navigate(ROUTES.STACK.WALLET_TRANSACTION_DETAIL, {
											id: tx.public_id || tx.id,
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
										<Text style={styles.txCategory}>{tx.category || tx.transaction_type}</Text>
										<Text style={styles.txDate}>
											{new Date(tx.created_at).toLocaleDateString(undefined, {
												month: 'short',
												day: 'numeric',
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
						})
					)}
				</ScrollView>
			)}

			<WalletTopUpModal
				visible={topUpModalVisible}
				onClose={() => setTopUpModalVisible(false)}
				onSuccess={loadWalletData}
			/>
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
	contentContainer: {
		padding: 16,
	},
	balanceCard: {
		backgroundColor: '#15202b',
		borderRadius: 20,
		padding: 20,
		marginBottom: 24,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.15,
		shadowRadius: 8,
		elevation: 4,
	},
	balanceCardNegative: {
		backgroundColor: '#450a0a',
		borderColor: '#991b1b',
		borderWidth: 1,
	},
	balanceHeaderRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	balanceTitle: {
		color: '#94a3b8',
		fontSize: 14,
		fontWeight: '600',
	},
	badgeFrozen: {
		backgroundColor: '#dc2626',
		paddingHorizontal: 8,
		paddingVertical: 2,
		borderRadius: 6,
	},
	badgeFrozenText: {
		color: '#fff',
		fontSize: 10,
		fontWeight: '700',
	},
	balanceValue: {
		color: '#fff',
		fontSize: 32,
		fontWeight: '800',
		marginVertical: 12,
	},
	balanceValueNegative: {
		color: '#fca5a5',
	},
	negativeNotice: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#fee2e2',
		padding: 10,
		borderRadius: 10,
		marginBottom: 16,
	},
	negativeNoticeText: {
		color: '#991b1b',
		fontSize: 12,
		fontWeight: '600',
		marginLeft: 6,
		flex: 1,
	},
	actionRow: {
		flexDirection: 'row',
		marginTop: 8,
	},
	primaryActionBtn: {
		flex: 1,
		backgroundColor: '#42b883',
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 12,
		borderRadius: 12,
		marginRight: 8,
	},
	primaryActionBtnText: {
		color: '#fff',
		fontWeight: '700',
		fontSize: 14,
		marginLeft: 6,
	},
	secondaryActionBtn: {
		flex: 1,
		backgroundColor: '#ffffff20',
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 12,
		borderRadius: 12,
		marginLeft: 8,
	},
	secondaryActionBtnText: {
		color: '#42b883',
		fontWeight: '700',
		fontSize: 14,
		marginLeft: 6,
	},
	sectionHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 12,
	},
	sectionTitle: {
		fontSize: 16,
		fontWeight: '700',
		color: '#1e293b',
	},
	viewAllText: {
		fontSize: 14,
		fontWeight: '600',
		color: '#42b883',
	},
	emptyContainer: {
		alignItems: 'center',
		paddingVertical: 32,
	},
	emptyText: {
		color: '#94a3b8',
		fontSize: 14,
		marginTop: 8,
	},
	txRow: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#fff',
		padding: 14,
		borderRadius: 14,
		marginBottom: 10,
		borderWidth: 1,
		borderColor: '#f1f5f9',
	},
	txIconBox: {
		width: 40,
		height: 40,
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
		fontSize: 14,
		fontWeight: '700',
		color: '#1e293b',
	},
	txDate: {
		fontSize: 12,
		color: '#94a3b8',
		marginTop: 2,
	},
	txAmount: {
		fontSize: 15,
		fontWeight: '700',
	},
	txCredit: {
		color: '#16a34a',
	},
	txDebit: {
		color: '#dc2626',
	},
})
