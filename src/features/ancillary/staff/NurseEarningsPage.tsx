import React, { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useNavigation, useIsFocused } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import AppScreenHeader from '../../../components/common/AppScreenHeader'
import { fetchProviderEarnings, ProviderEarningsData } from '../ancillaryService'

/**
 * Earnings & Payouts screen, shared by every ancillary provider role
 * (Nurse, Physiotherapist, etc).
 *
 * All earnings metrics (Today, This Week, This Month, Total Earned,
 * and recent completed visits) are fetched directly from the backend API
 * (GET /api/ancillary/provider/earnings), which calculates authoritative
 * figures server-side scoped to the logged-in provider.
 */

const formatInr = (amount: number): string => `₹${Math.round(amount).toLocaleString('en-IN')}`

const formatVisitDateTime = (raw?: string): string => {
	if (!raw) return 'Recently'
	const parsed = new Date(raw.replace(' ', 'T'))
	if (Number.isNaN(parsed.getTime())) return raw
	return `${parsed.toLocaleDateString('en-US', { day: '2-digit', month: 'short' })} • ${parsed.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
}

export default function NurseEarningsPage() {
	const navigation = useNavigation<any>()
	const isFocused = useIsFocused()

	const [earningsData, setEarningsData] = useState<ProviderEarningsData | null>(null)
	const [isLoading, setIsLoading] = useState(true)
	const [loadError, setLoadError] = useState<string | null>(null)

	const loadEarnings = useCallback(async () => {
		try {
			setLoadError(null)
			const data = await fetchProviderEarnings()
			setEarningsData(data)
		} catch (e) {
			console.log('[NurseEarningsPage] Failed to load earnings:', e)
			setLoadError('Could not load your earnings right now.')
		} finally {
			setIsLoading(false)
		}
	}, [])

	useEffect(() => {
		if (isFocused) {
			void loadEarnings()
		}
	}, [isFocused, loadEarnings])

	const todayTotal = earningsData?.todayTotal ?? 0
	const weekTotal = earningsData?.weekTotal ?? 0
	const monthTotal = earningsData?.monthTotal ?? 0
	const allTimeTotal = earningsData?.allTimeTotal ?? 0
	const recentVisits = earningsData?.recentVisits ?? []

	if (isLoading) {
		return (
			<View style={styles.container}>
				<AppScreenHeader title="Earnings & Payouts" onBack={() => navigation.goBack()} />
				<View style={styles.centerState}>
					<ActivityIndicator color="#0C7C7C" />
				</View>
			</View>
		)
	}

	return (
		<View style={styles.container}>
			{/* Shared AppScreenHeader */}
			<AppScreenHeader title="Earnings & Payouts" onBack={() => navigation.goBack()} />

			<ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
				{loadError ? (
					<View style={styles.errorBanner}>
						<Ionicons name="alert-circle-outline" size={16} color="#B91C1C" />
						<Text style={styles.errorText}>{loadError}</Text>
					</View>
				) : null}

				{/* Primary Hero Earnings Card */}
				<View style={styles.heroCard}>
					<Text style={styles.heroLabel}>Today's Earnings</Text>
					<Text style={styles.heroValue}>{formatInr(todayTotal)}</Text>

					{/* Sub-Metrics Row */}
					<View style={styles.subMetricsRow}>
						<View style={styles.subMetricCol}>
							<Text style={styles.subMetricLabel}>This Week</Text>
							<Text style={styles.subMetricVal}>{formatInr(weekTotal)}</Text>
						</View>
						<View style={styles.subMetricDivider} />
						<View style={styles.subMetricCol}>
							<Text style={styles.subMetricLabel}>This Month</Text>
							<Text style={styles.subMetricVal}>{formatInr(monthTotal)}</Text>
						</View>
						<View style={styles.subMetricDivider} />
						<View style={styles.subMetricCol}>
							<Text style={styles.subMetricLabel}>Total Earned</Text>
							<Text style={styles.subMetricVal}>{formatInr(allTimeTotal)}</Text>
						</View>
					</View>
				</View>

				{/* Itemized Recent Visit Earnings */}
				<View style={styles.sectionBlock}>
					<Text style={styles.sectionTitle}>COMPLETED VISIT EARNINGS</Text>

					{recentVisits.length === 0 ? (
						<View style={styles.emptyState}>
							<Ionicons name="wallet-outline" size={22} color="#94A3B8" />
							<Text style={styles.emptyText}>No completed visits yet</Text>
							<Text style={styles.emptySubtext}>
								Your completed bookings and their earnings will show up here.
							</Text>
						</View>
					) : (
						recentVisits.map((visit) => (
							<View key={visit.id} style={styles.earningItem}>
								<View style={styles.itemRow}>
									<Text style={styles.patientName}>{visit.patientName}</Text>
									<Text style={styles.itemAmount}>+ {formatInr(visit.earning)}</Text>
								</View>
								<Text style={styles.serviceName} numberOfLines={1}>
									{visit.serviceName}
								</Text>
								<Text style={styles.itemMeta}>
									{formatVisitDateTime(visit.completedAt)} • Completed
								</Text>
							</View>
						))
					)}
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
	centerState: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
	},
	scrollContent: {
		padding: 16,
		gap: 14,
	},
	errorBanner: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		backgroundColor: '#FEF2F2',
		borderColor: '#FECACA',
		borderWidth: 1,
		borderRadius: 10,
		padding: 10,
	},
	errorText: {
		fontSize: 12.5,
		color: '#B91C1C',
		flexShrink: 1,
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
	emptyState: {
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#FFFFFF',
		borderColor: '#E2E8F0',
		borderWidth: 1,
		borderRadius: 14,
		padding: 28,
		gap: 6,
	},
	emptyText: {
		fontSize: 14,
		fontWeight: '700',
		color: '#334155',
	},
	emptySubtext: {
		fontSize: 12.5,
		color: '#94A3B8',
		textAlign: 'center',
	},
})
