import React from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import AppScreenHeader from '../../../components/common/AppScreenHeader'

export default function NurseEarningsPage() {
	const navigation = useNavigation<any>()

	return (
		<View style={styles.container}>
			{/* Shared AppScreenHeader */}
			<AppScreenHeader title="Earnings & Payouts" onBack={() => navigation.goBack()} />

			<ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
				{/* Primary Hero Earnings Card */}
				<View style={styles.heroCard}>
					<Text style={styles.heroLabel}>Today's Earnings</Text>
					<Text style={styles.heroValue}>₹1,300</Text>

					{/* Sub-Metrics Row */}
					<View style={styles.subMetricsRow}>
						<View style={styles.subMetricCol}>
							<Text style={styles.subMetricLabel}>This Week</Text>
							<Text style={styles.subMetricVal}>₹8,400</Text>
						</View>
						<View style={styles.subMetricDivider} />
						<View style={styles.subMetricCol}>
							<Text style={styles.subMetricLabel}>This Month</Text>
							<Text style={styles.subMetricVal}>₹24,400</Text>
						</View>
						<View style={styles.subMetricDivider} />
						<View style={styles.subMetricCol}>
							<Text style={styles.subMetricLabel}>Total Earned</Text>
							<Text style={styles.subMetricVal}>₹98,200</Text>
						</View>
					</View>
				</View>

				{/* Payout Status Banner */}
				<View style={styles.payoutCard}>
					<View style={styles.payoutHeaderRow}>
						<View style={styles.payoutLeft}>
							<Ionicons name="wallet-outline" size={16} color="#0C7C7C" />
							<Text style={styles.payoutTitle}>Next Scheduled Payout</Text>
						</View>
						<Text style={styles.payoutVal}>₹5,850</Text>
					</View>
					<Text style={styles.payoutSub}>
						Scheduled for Friday • Direct Bank Deposit (Active)
					</Text>
				</View>

				{/* Itemized Recent Visit Earnings */}
				<View style={styles.sectionBlock}>
					<Text style={styles.sectionTitle}>COMPLETED VISIT EARNINGS</Text>

					<View style={styles.earningItem}>
						<View style={styles.itemRow}>
							<Text style={styles.patientName}>Completed Care Visit</Text>
							<Text style={styles.itemAmount}>+ ₹850</Text>
						</View>
						<Text style={styles.serviceName} numberOfLines={1}>
							Vital Monitoring & IV Infusion
						</Text>
						<Text style={styles.itemMeta}>
							Today • Completed & Verified
						</Text>
					</View>
				</View>
			</ScrollView>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#F8FAFC',
	},
	scrollContent: {
		padding: 16,
		gap: 14,
	},
	heroCard: {
		backgroundColor: '#FFFFFF',
		borderColor: '#E2E8F0',
		borderWidth: 1,
		borderRadius: 14,
		padding: 16,
		gap: 4,
	},
	heroLabel: {
		fontSize: 12,
		fontWeight: '600',
		color: '#64748B',
	},
	heroValue: {
		fontSize: 22,
		fontWeight: '800',
		color: '#0C7C7C',
	},
	subMetricsRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginTop: 12,
		paddingTop: 12,
		borderTopWidth: 1,
		borderTopColor: '#F1F5F9',
	},
	subMetricCol: {
		flex: 1,
		alignItems: 'center',
	},
	subMetricLabel: {
		fontSize: 11.5,
		fontWeight: '600',
		color: '#64748B',
	},
	subMetricVal: {
		fontSize: 14,
		fontWeight: '700',
		color: '#0F172A',
		marginTop: 2,
	},
	subMetricDivider: {
		width: 1,
		height: 22,
		backgroundColor: '#E2E8F0',
	},
	payoutCard: {
		backgroundColor: '#F0FDFA',
		borderColor: '#CCFBF1',
		borderWidth: 1,
		borderRadius: 14,
		padding: 14,
		gap: 4,
	},
	payoutHeaderRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	payoutLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	payoutTitle: {
		fontSize: 13,
		fontWeight: '700',
		color: '#0F172A',
	},
	payoutVal: {
		fontSize: 14,
		fontWeight: '800',
		color: '#0C7C7C',
	},
	payoutSub: {
		fontSize: 11.5,
		color: '#64748B',
	},
	sectionBlock: {
		gap: 10,
		marginTop: 4,
	},
	sectionTitle: {
		fontSize: 12,
		fontWeight: '800',
		color: '#64748B',
		letterSpacing: 0.3,
	},
	earningItem: {
		backgroundColor: '#FFFFFF',
		borderColor: '#E2E8F0',
		borderWidth: 1,
		borderRadius: 14,
		padding: 14,
		gap: 4,
	},
	itemRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	patientName: {
		fontSize: 16,
		fontWeight: '700',
		color: '#0F172A',
	},
	serviceName: {
		fontSize: 14,
		fontWeight: '600',
		color: '#475569',
	},
	itemAmount: {
		fontSize: 14,
		fontWeight: '800',
		color: '#059669',
	},
	itemMeta: {
		fontSize: 12,
		color: '#64748B',
	},
})
