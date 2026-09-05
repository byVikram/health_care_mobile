// src/features/wallet/WalletTransactionDetailScreen.tsx
import React, { useEffect, useState } from 'react'
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	ActivityIndicator,
	SafeAreaView,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useNavigation, useRoute } from '@react-navigation/native'
import AppScreenHeader from '../../components/common/AppScreenHeader'
import { getWalletTransactionDetail, WalletTransactionData } from './walletService'

export const WalletTransactionDetailScreen: React.FC = () => {
	const navigation = useNavigation<any>()
	const route = useRoute<any>()

	const { id } = route.params || {}

	const [tx, setTx] = useState<WalletTransactionData | null>(null)
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		const loadDetail = async () => {
			try {
				if (id) {
					const res = await getWalletTransactionDetail(id)
					if (res.success && res.data) {
						setTx(res.data)
					}
				}
			} catch (error) {
				console.log('Error loading transaction detail:', error)
			} finally {
				setLoading(false)
			}
		}
		loadDetail()
	}, [id])

	if (loading) {
		return (
			<SafeAreaView style={styles.container}>
				<AppScreenHeader title="Transaction Details" onBack={() => navigation.goBack()} />
				<View style={styles.centerLoading}>
					<ActivityIndicator size="large" color="#42b883" />
				</View>
			</SafeAreaView>
		)
	}

	if (!tx) {
		return (
			<SafeAreaView style={styles.container}>
				<AppScreenHeader title="Transaction Details" onBack={() => navigation.goBack()} />
				<View style={styles.centerLoading}>
					<Text style={styles.errorText}>Transaction details not found.</Text>
				</View>
			</SafeAreaView>
		)
	}

	const isCredit = tx.transaction_type === 'CREDIT'
	const amountVal = parseFloat(String(tx.amount || '0'))
	const beforeVal = parseFloat(String(tx.balance_before || '0'))
	const afterVal = parseFloat(String(tx.balance_after || '0'))

	return (
		<SafeAreaView style={styles.container}>
			<AppScreenHeader title="Transaction Details" onBack={() => navigation.goBack()} />

			<ScrollView contentContainerStyle={styles.contentContainer}>
				{/* Status Icon & Amount Header */}
				<View style={styles.headerCard}>
					<View
						style={[
							styles.statusIconBox,
							isCredit ? styles.iconCredit : styles.iconDebit,
						]}
					>
						<MaterialCommunityIcons
							name={isCredit ? 'arrow-down-bold' : 'arrow-up-bold'}
							size={32}
							color={isCredit ? '#16a34a' : '#dc2626'}
						/>
					</View>

					<Text style={[styles.amountText, isCredit ? styles.txCredit : styles.txDebit]}>
						{isCredit ? '+' : '-'}₹{amountVal.toFixed(2)}
					</Text>

					<View style={styles.statusBadge}>
						<Text style={styles.statusBadgeText}>{tx.status}</Text>
					</View>
				</View>

				{/* Financial Audit Trail Details */}
				<View style={styles.detailsCard}>
					<Text style={styles.cardTitle}>Audit Summary</Text>

					<View style={styles.detailRow}>
						<Text style={styles.detailLabel}>Transaction ID</Text>
						<Text style={styles.detailValue}>{tx.public_id || tx.id}</Text>
					</View>

					<View style={styles.detailRow}>
						<Text style={styles.detailLabel}>Transaction Type</Text>
						<Text style={styles.detailValue}>{tx.transaction_type}</Text>
					</View>

					<View style={styles.detailRow}>
						<Text style={styles.detailLabel}>Category</Text>
						<Text style={styles.detailValue}>{tx.category}</Text>
					</View>

					{tx.payment_method && (
						<View style={styles.detailRow}>
							<Text style={styles.detailLabel}>Payment Method</Text>
							<Text style={styles.detailValue}>{tx.payment_method}</Text>
						</View>
					)}

					{tx.reference_id && (
						<View style={styles.detailRow}>
							<Text style={styles.detailLabel}>Reference ID</Text>
							<Text style={styles.detailValue}>{tx.reference_id}</Text>
						</View>
					)}

					{tx.description && (
						<View style={styles.detailRow}>
							<Text style={styles.detailLabel}>Description</Text>
							<Text style={styles.detailValue}>{tx.description}</Text>
						</View>
					)}

					<View style={styles.divider} />

					<View style={styles.detailRow}>
						<Text style={styles.detailLabel}>Balance Before</Text>
						<Text style={styles.detailValue}>
							{beforeVal < 0 ? `-₹${Math.abs(beforeVal).toFixed(2)}` : `₹${beforeVal.toFixed(2)}`}
						</Text>
					</View>

					<View style={styles.detailRow}>
						<Text style={styles.detailLabel}>Balance After</Text>
						<Text style={[styles.detailValue, { fontWeight: '800' }]}>
							{afterVal < 0 ? `-₹${Math.abs(afterVal).toFixed(2)}` : `₹${afterVal.toFixed(2)}`}
						</Text>
					</View>

					<View style={styles.detailRow}>
						<Text style={styles.detailLabel}>Date & Time</Text>
						<Text style={styles.detailValue}>
							{new Date(tx.created_at).toLocaleString()}
						</Text>
					</View>
				</View>
			</ScrollView>
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
	errorText: {
		color: '#94a3b8',
		fontSize: 14,
	},
	contentContainer: {
		padding: 16,
	},
	headerCard: {
		backgroundColor: '#fff',
		borderRadius: 20,
		padding: 24,
		alignItems: 'center',
		marginBottom: 16,
		borderWidth: 1,
		borderColor: '#f1f5f9',
	},
	statusIconBox: {
		width: 64,
		height: 64,
		borderRadius: 32,
		justifyContent: 'center',
		alignItems: 'center',
		marginBottom: 12,
	},
	iconCredit: {
		backgroundColor: '#dcfce7',
	},
	iconDebit: {
		backgroundColor: '#fee2e2',
	},
	amountText: {
		fontSize: 32,
		fontWeight: '800',
		marginBottom: 8,
	},
	txCredit: {
		color: '#16a34a',
	},
	txDebit: {
		color: '#dc2626',
	},
	statusBadge: {
		backgroundColor: '#e2e8f0',
		paddingHorizontal: 12,
		paddingVertical: 4,
		borderRadius: 12,
	},
	statusBadgeText: {
		fontSize: 12,
		fontWeight: '700',
		color: '#475569',
	},
	detailsCard: {
		backgroundColor: '#fff',
		borderRadius: 20,
		padding: 20,
		borderWidth: 1,
		borderColor: '#f1f5f9',
	},
	cardTitle: {
		fontSize: 16,
		fontWeight: '700',
		color: '#1e293b',
		marginBottom: 16,
	},
	detailRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingVertical: 10,
	},
	detailLabel: {
		fontSize: 14,
		color: '#64748b',
	},
	detailValue: {
		fontSize: 14,
		fontWeight: '600',
		color: '#1e293b',
		maxWidth: '60%',
		textAlign: 'right',
	},
	divider: {
		height: 1,
		backgroundColor: '#e2e8f0',
		marginVertical: 12,
	},
})
