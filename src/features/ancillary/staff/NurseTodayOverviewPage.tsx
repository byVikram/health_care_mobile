import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
	ScrollView,
	StyleSheet,
	TouchableOpacity,
	View,
	useWindowDimensions,
} from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import AppScreenHeader from '../../../components/common/AppScreenHeader'
import { AppTypography } from '../../../components/common/AppTypography'
import { AppSkeleton } from '../../../components/common'
import { ROUTES } from '../../../navigation/routes'
import { fetchAvailableRequests, getNurseAppointments, NurseBooking } from '../ancillaryService'

export type FilterOption = 'all' | 'accepted' | 'completed' | 'cancelled'

const ACCEPTED_FAMILY_STATUSES = ['assigned', 'nurse_assigned', 'verification_pending', 'in_progress', 'en_route', 'arrived', 'EN_ROUTE', 'ARRIVED']

export default function NurseTodayOverviewPage() {
	const navigation = useNavigation<any>()
	const route = useRoute<any>()
	const { width } = useWindowDimensions()
	const isTablet = width >= 768

	const initialFilter: FilterOption = route.params?.filter || 'all'
	const [activeFilter, setActiveFilter] = useState<FilterOption>(initialFilter)
	const [requestsReceivedCount, setRequestsReceivedCount] = useState<number>(0)
	const [myBookings, setMyBookings] = useState<NurseBooking[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [loadError, setLoadError] = useState<string | null>(null)

	const loadBookings = useCallback(async () => {
		setIsLoading(true)
		setLoadError(null)
		try {
			const appointments = await getNurseAppointments()
			setMyBookings(appointments)
		} catch (e) {
			setLoadError('Unable to load today\'s activity right now. Please try again.')
		} finally {
			setIsLoading(false)
		}
	}, [])

	useEffect(() => {
		fetchAvailableRequests()
			.then((available) => setRequestsReceivedCount(available.length))
			.catch(() => console.log('[NurseTodayOverviewPage] Available requests fetch error'))

		loadBookings()
	}, [loadBookings])

	const acceptedBookings = useMemo(
		() => myBookings.filter((b) => ACCEPTED_FAMILY_STATUSES.includes(b.status)),
		[myBookings]
	)
	const completedBookings = useMemo(() => myBookings.filter((b) => b.status === 'completed'), [myBookings])
	const cancelledBookings = useMemo(() => myBookings.filter((b) => b.status === 'cancelled'), [myBookings])

	const acceptedCount = acceptedBookings.length
	const completedCount = completedBookings.length
	const declinedCount = 0

	// Single combined list the UI renders from -- 'all' keeps the API's own
	// (most-recent-first) ordering instead of grouping by status under headers.
	const visibleBookings = useMemo(() => {
		if (activeFilter === 'accepted') return acceptedBookings
		if (activeFilter === 'completed') return completedBookings
		if (activeFilter === 'cancelled') return cancelledBookings
		return myBookings
	}, [activeFilter, myBookings, acceptedBookings, completedBookings, cancelledBookings])

	const todayFormatted = new Date().toLocaleDateString('en-US', {
		weekday: 'short',
		month: 'short',
		day: 'numeric',
	})

	return (
		<View style={styles.container}>
			{/* Shared AppScreenHeader */}
			<AppScreenHeader title="Today's Activity" onBack={() => navigation.goBack()} />

			{/* Subheader Date Bar */}
			<View style={styles.dateBar}>
				<AppTypography variant="body" style={styles.dateText}>
					Today, {todayFormatted}
				</AppTypography>
				<Ionicons name="calendar-outline" size={16} color="#0C7C7C" />
			</View>

			<ScrollView
				contentContainerStyle={[styles.listContainer, isTablet && styles.listContainerTablet]}
				showsVerticalScrollIndicator={false}
			>
				{/* Activity Summary Card (4 Horizontal KPIs with vertical dividers) */}
				<View style={styles.activitySummaryCard}>
					<AppTypography variant="caption" style={styles.summaryCardTitle}>
						TODAY'S SUMMARY
					</AppTypography>

					<View style={styles.kpiRowContainer}>
						{/* KPI 1: Requests Received */}
						<View style={styles.kpiCol}>
							<View style={styles.kpiTopRow}>
								<View style={[styles.kpiCircleIcon, { backgroundColor: '#E6F4F1' }]}>
									<Ionicons name="clipboard-outline" size={15} color="#0C7C7C" />
								</View>
								<AppTypography variant="h2" style={styles.kpiNumberText}>
									{requestsReceivedCount}
								</AppTypography>
							</View>
							<AppTypography variant="caption" style={styles.kpiLabel}>
								Requests Received
							</AppTypography>
						</View>

						<View style={styles.kpiDivider} />

						{/* KPI 2: Accepted */}
						<View style={styles.kpiCol}>
							<View style={styles.kpiTopRow}>
								<View style={[styles.kpiCircleIcon, { backgroundColor: '#ECFDF5' }]}>
									<Ionicons name="checkmark-circle-outline" size={15} color="#059669" />
								</View>
								<AppTypography variant="h2" style={[styles.kpiNumberText, { color: '#059669' }]}>
									{acceptedCount}
								</AppTypography>
							</View>
							<AppTypography variant="caption" style={styles.kpiLabel}>
								Accepted
							</AppTypography>
						</View>

						<View style={styles.kpiDivider} />

						{/* KPI 3: Completed */}
						<View style={styles.kpiCol}>
							<View style={styles.kpiTopRow}>
								<View style={[styles.kpiCircleIcon, { backgroundColor: '#EFF6FF' }]}>
									<Ionicons name="bag-check-outline" size={15} color="#2563EB" />
								</View>
								<AppTypography variant="h2" style={[styles.kpiNumberText, { color: '#2563EB' }]}>
									{completedCount}
								</AppTypography>
							</View>
							<AppTypography variant="caption" style={styles.kpiLabel}>
								Completed
							</AppTypography>
						</View>

						<View style={styles.kpiDivider} />

						{/* KPI 4: Declined */}
						<View style={styles.kpiCol}>
							<View style={styles.kpiTopRow}>
								<View style={[styles.kpiCircleIcon, { backgroundColor: '#FEF2F2' }]}>
									<Ionicons name="close-circle-outline" size={15} color="#EF4444" />
								</View>
								<AppTypography variant="h2" style={[styles.kpiNumberText, { color: '#EF4444' }]}>
									{declinedCount}
								</AppTypography>
							</View>
							<AppTypography variant="caption" style={styles.kpiLabel}>
								Declined
							</AppTypography>
						</View>
					</View>
				</View>

				{/* Filter Pills Control */}
				<View style={styles.filterBar}>
					{(['all', 'accepted', 'completed', 'cancelled'] as FilterOption[]).map((filterKey) => {
						const isActive = activeFilter === filterKey
						const label = filterKey.charAt(0).toUpperCase() + filterKey.slice(1)
						return (
							<TouchableOpacity
								key={filterKey}
								style={[styles.filterPill, isActive && styles.filterPillActive]}
								onPress={() => setActiveFilter(filterKey)}
								activeOpacity={0.8}
							>
								<AppTypography
									variant="caption"
									style={[styles.filterPillText, isActive && styles.filterPillTextActive]}
								>
									{label}
								</AppTypography>
							</TouchableOpacity>
						)
					})}
				</View>

				{/* Unified Appointment List -- single continuous list for the active
					filter (All / Accepted / Completed / Cancelled), driven entirely by
					API data. Cards keep their per-status styling/badge inline instead
					of being grouped under separate section headers. */}
				{isLoading ? (
					<View style={styles.cardColumn}>
						{[0, 1, 2].map((key) => (
							<View key={key} style={styles.activityCard}>
								<AppSkeleton width={38} height={38} borderRadius={19} />
								<View style={[styles.cardBody, { gap: 6 }]}>
									<AppSkeleton width="60%" height={14} borderRadius={4} />
									<AppSkeleton width="40%" height={11} borderRadius={4} />
									<AppSkeleton width="80%" height={11} borderRadius={4} />
								</View>
							</View>
						))}
					</View>
				) : loadError ? (
					<View style={styles.stateCard}>
						<Ionicons name="alert-circle-outline" size={28} color="#DC2626" />
						<AppTypography variant="body" style={styles.stateTitle}>
							Couldn't load your activity
						</AppTypography>
						<AppTypography variant="caption" style={styles.stateSubtext}>
							{loadError}
						</AppTypography>
						<TouchableOpacity style={styles.retryBtn} onPress={loadBookings} activeOpacity={0.8}>
							<Ionicons name="refresh" size={14} color="#0C7C7C" />
							<AppTypography variant="caption" style={styles.retryBtnText}>
								Try Again
							</AppTypography>
						</TouchableOpacity>
					</View>
				) : visibleBookings.length === 0 ? (
					<View style={styles.stateCard}>
						<Ionicons name="calendar-clear-outline" size={28} color="#94A3B8" />
						<AppTypography variant="body" style={styles.stateTitle}>
							No {activeFilter === 'all' ? '' : `${activeFilter} `}appointments yet
						</AppTypography>
						<AppTypography variant="caption" style={styles.stateSubtext}>
							{activeFilter === 'all'
								? "You don't have any activity for today yet."
								: `You don't have any ${activeFilter} visits for today.`}
						</AppTypography>
					</View>
				) : (
					<View style={isTablet ? styles.tabletGrid : styles.cardColumn}>
						{visibleBookings.map((item, index) => {
							const isCompleted = item.status === 'completed'
							const isCancelled = item.status === 'cancelled'
							const isAccepted = !isCompleted && !isCancelled
							const isPurple = isAccepted && index % 2 === 1

							if (isCancelled) {
								return (
									<View
										key={item.id}
										style={[
											styles.activityCard,
											styles.activityCardCancelled,
											isTablet && styles.activityCardTablet,
										]}
									>
										{/* Left Avatar */}
										<View style={[styles.avatarCircle, { backgroundColor: '#FEE2E2' }]}>
											<Ionicons name="person" size={18} color="#DC2626" />
										</View>

										{/* Content Body */}
										<View style={styles.cardBody}>
											<View style={styles.cardHeaderRow}>
												<AppTypography variant="body" style={styles.patientName} numberOfLines={1}>
													{item.patientName}
												</AppTypography>
												<View style={styles.tagCancelled}>
													<Ionicons name="close-circle" size={12} color="#DC2626" />
													<AppTypography variant="caption" style={styles.tagTextCancelled}>
														Cancelled
													</AppTypography>
												</View>
											</View>

											<AppTypography
												variant="caption"
												style={[styles.serviceName, styles.cancelledServiceName]}
												numberOfLines={1}
											>
												{item.serviceName}
											</AppTypography>

											<View style={styles.metaRow}>
												<Ionicons name="time-outline" size={13} color="#DC2626" />
												<AppTypography variant="caption" style={styles.cancelledMetaText}>
													Original Time: {item.appointmentTime}
												</AppTypography>
											</View>

											<AppTypography variant="caption" style={styles.cancellationReasonText}>
												Reason: {item.cancellationReason || 'Not specified'}
											</AppTypography>
										</View>

										{/* Right Chevron */}
										<Ionicons name="chevron-forward" size={16} color="#FCA5A5" />
									</View>
								)
							}

							if (isCompleted) {
								return (
									<TouchableOpacity
										key={item.id}
										style={[styles.activityCard, isTablet && styles.activityCardTablet]}
										onPress={() =>
											navigation.navigate(ROUTES.STACK.NURSE_COMPLETE_SERVICE, { bookingId: item.id })
										}
										activeOpacity={0.85}
									>
										{/* Left Avatar */}
										<View style={[styles.avatarCircle, { backgroundColor: '#E0F2FE' }]}>
											<Ionicons name="person" size={18} color="#0284C7" />
										</View>

										{/* Content Body */}
										<View style={styles.cardBody}>
											<View style={styles.cardHeaderRow}>
												<AppTypography variant="body" style={styles.patientName} numberOfLines={1}>
													{item.patientName}
												</AppTypography>
												<View style={styles.tagCompleted}>
													<Ionicons name="checkmark-circle" size={12} color="#059669" />
													<AppTypography variant="caption" style={styles.tagTextCompleted}>
														Completed
													</AppTypography>
												</View>
											</View>

											<AppTypography variant="caption" style={styles.serviceName} numberOfLines={1}>
												{item.serviceName}
											</AppTypography>

											<View style={styles.metaRow}>
												<Ionicons name="checkmark-circle-outline" size={13} color="#059669" />
												<AppTypography variant="caption" style={styles.metaTextCompleted}>
													Completed today at {item.appointmentTime.split(' - ')[0]}
												</AppTypography>
											</View>

											{item.amount != null && (
												<View style={styles.earningsTagRow}>
													<Ionicons name="cash-outline" size={13} color="#059669" />
													<AppTypography variant="caption" style={styles.earningsTagText}>
														+ ₹{item.amount} Earned
													</AppTypography>
												</View>
											)}
										</View>

										{/* Right Chevron */}
										<Ionicons name="chevron-forward" size={16} color="#94A3B8" />
									</TouchableOpacity>
								)
							}

							return (
								<TouchableOpacity
									key={item.id}
									style={[styles.activityCard, isTablet && styles.activityCardTablet]}
									onPress={() =>
										navigation.navigate(ROUTES.STACK.NURSE_ACTIVE_BOOKING, { bookingId: item.id })
									}
									activeOpacity={0.85}
								>
									{/* Left Avatar */}
									<View
										style={[
											styles.avatarCircle,
											{ backgroundColor: isPurple ? '#F3E8FF' : '#E6F4F1' },
										]}
									>
										<Ionicons
											name="person"
											size={18}
											color={isPurple ? '#7E22CE' : '#0C7C7C'}
										/>
									</View>

									{/* Content Body */}
									<View style={styles.cardBody}>
										<View style={styles.cardHeaderRow}>
											<AppTypography variant="body" style={styles.patientName} numberOfLines={1}>
												{item.patientName}
											</AppTypography>
											<View style={styles.tagAccepted}>
												<AppTypography variant="caption" style={styles.tagTextAccepted}>
													Assigned
												</AppTypography>
											</View>
										</View>

										<AppTypography variant="caption" style={styles.serviceName} numberOfLines={1}>
											{item.serviceName}
										</AppTypography>

										<View style={styles.metaRow}>
											<Ionicons name="time-outline" size={13} color="#64748B" />
											<AppTypography variant="caption" style={styles.metaText}>
												{item.appointmentTime}
											</AppTypography>
											<AppTypography variant="caption" style={styles.metaDot}>
												•
											</AppTypography>
											<Ionicons name="location-outline" size={13} color="#64748B" />
											<AppTypography variant="caption" style={styles.metaText} numberOfLines={1}>
												{item.patientAddress}
											</AppTypography>
										</View>
									</View>

									{/* Right Chevron */}
									<Ionicons name="chevron-forward" size={16} color="#94A3B8" />
								</TouchableOpacity>
							)
						})}
					</View>
				)}

				{/* Bottom Tip & Manage Availability Banner */}
				<View style={styles.bottomTipBanner}>
					<View style={styles.tipTextRow}>
						<Ionicons name="bulb-outline" size={16} color="#0C7C7C" />
						<AppTypography variant="caption" style={styles.tipText}>
							<AppTypography variant="caption" style={styles.tipBold}>
								Tip:{' '}
							</AppTypography>
							Keep your schedule updated to receive more care requests.
						</AppTypography>
					</View>

					<TouchableOpacity
						style={styles.manageAvailabilityBtn}
						onPress={() => navigation.navigate(ROUTES.MAIN.PROFILE)}
						activeOpacity={0.8}
					>
						<AppTypography variant="caption" style={styles.manageAvailabilityText}>
							Manage Availability
						</AppTypography>
						<Ionicons name="chevron-forward" size={13} color="#0C7C7C" />
					</TouchableOpacity>
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
	dateBar: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'flex-start',
		gap: 6,
		paddingHorizontal: 16,
		paddingVertical: 8,
		backgroundColor: '#FFFFFF',
		borderBottomWidth: 1,
		borderBottomColor: '#E2E8F0',
	},
	dateText: {
		fontSize: 13,
		fontWeight: '700',
		color: '#0C7C7C',
	},
	listContainer: {
		padding: 14,
		gap: 14,
		paddingBottom: 40,
	},
	listContainerTablet: {
		padding: 20,
		maxWidth: 860,
		alignSelf: 'center',
		width: '100%',
	},

	/* Today's Summary Card */
	activitySummaryCard: {
		backgroundColor: '#FFFFFF',
		borderColor: '#E2E8F0',
		borderWidth: 1,
		borderRadius: 14,
		padding: 14,
		gap: 10,
		shadowColor: '#0F172A',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.02,
		shadowRadius: 2,
		elevation: 1,
	},
	summaryCardTitle: {
		fontSize: 10.5,
		fontWeight: '800',
		color: '#64748B',
		letterSpacing: 0.6,
		textTransform: 'uppercase',
	},
	kpiRowContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	kpiCol: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		gap: 3,
	},
	kpiTopRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	kpiCircleIcon: {
		width: 26,
		height: 26,
		borderRadius: 13,
		alignItems: 'center',
		justifyContent: 'center',
	},
	kpiNumberText: {
		fontSize: 18,
		fontWeight: '800',
		color: '#0F172A',
		lineHeight: 22,
	},
	kpiLabel: {
		fontSize: 10.5,
		fontWeight: '600',
		color: '#475569',
		textAlign: 'center',
	},
	kpiDivider: {
		width: 1,
		height: 32,
		backgroundColor: '#F1F5F9',
	},

	/* Filter Bar */
	filterBar: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		paddingVertical: 2,
	},
	filterPill: {
		paddingHorizontal: 14,
		paddingVertical: 6,
		borderRadius: 20,
		backgroundColor: '#FFFFFF',
		borderWidth: 1,
		borderColor: '#CBD5E1',
	},
	filterPillActive: {
		backgroundColor: '#0C7C7C',
		borderColor: '#0C7C7C',
	},
	filterPillText: {
		fontSize: 12,
		fontWeight: '600',
		color: '#475569',
	},
	filterPillTextActive: {
		color: '#FFFFFF',
		fontWeight: '700',
	},

	/* Sections */
	sectionBlock: {
		gap: 8,
	},
	sectionTitleRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	sectionHeaderTitle: {
		fontSize: 11,
		fontWeight: '800',
		color: '#64748B',
		letterSpacing: 0.5,
		textTransform: 'uppercase',
	},
	viewAllBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 2,
	},
	viewAllText: {
		fontSize: 12,
		fontWeight: '700',
		color: '#0C7C7C',
	},
	cardColumn: {
		gap: 10,
	},
	tabletGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 10,
	},
	stateCard: {
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#FFFFFF',
		borderColor: '#E2E8F0',
		borderWidth: 1,
		borderRadius: 12,
		paddingHorizontal: 18,
		paddingVertical: 24,
		gap: 8,
		shadowColor: '#0F172A',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.02,
		shadowRadius: 2,
		elevation: 1,
	},
	stateTitle: {
		fontSize: 14.5,
		fontWeight: '700',
		color: '#0F172A',
		textAlign: 'center',
	},
	stateSubtext: {
		fontSize: 12,
		fontWeight: '500',
		color: '#64748B',
		textAlign: 'center',
		lineHeight: 17,
	},
	retryBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#F0FDFA',
		borderColor: '#99F6E4',
		borderWidth: 1,
		borderRadius: 8,
		paddingHorizontal: 11,
		paddingVertical: 7,
		gap: 5,
		marginTop: 2,
	},
	retryBtnText: {
		fontSize: 12,
		fontWeight: '700',
		color: '#0C7C7C',
	},

	/* Activity Card with Left Highlight Border */
	activityCard: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#FFFFFF',
		borderColor: '#E2E8F0',
		borderWidth: 1,
		borderLeftWidth: 3.5,
		borderLeftColor: '#0C7C7C',
		borderRadius: 12,
		padding: 12,
		gap: 10,
		shadowColor: '#0F172A',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.02,
		shadowRadius: 2,
		elevation: 1,
	},
	activityCardTablet: {
		width: '49%',
	},
	activityCardCancelled: {
		backgroundColor: '#FFF5F5',
		borderColor: '#FECACA',
		borderLeftColor: '#EF4444',
	},
	avatarCircle: {
		width: 38,
		height: 38,
		borderRadius: 19,
		alignItems: 'center',
		justifyContent: 'center',
		flexShrink: 0,
	},
	cardBody: {
		flex: 1,
		minWidth: 0,
		gap: 3,
	},
	cardHeaderRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 6,
	},
	patientName: {
		flex: 1,
		minWidth: 0,
		fontSize: 14.5,
		fontWeight: '700',
		color: '#0F172A',
	},
	tagAccepted: {
		backgroundColor: '#F0FDFA',
		borderColor: '#99F6E4',
		borderWidth: 1,
		paddingHorizontal: 7,
		paddingVertical: 2,
		borderRadius: 6,
	},
	tagTextAccepted: {
		fontSize: 11,
		fontWeight: '700',
		color: '#0C7C7C',
	},
	tagCompleted: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 3,
		backgroundColor: '#ECFDF5',
		borderColor: '#A7F3D0',
		borderWidth: 1,
		paddingHorizontal: 7,
		paddingVertical: 2,
		borderRadius: 6,
	},
	tagTextCompleted: {
		fontSize: 11,
		fontWeight: '700',
		color: '#059669',
	},
	tagCancelled: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 3,
		backgroundColor: '#FEF2F2',
		borderColor: '#FECACA',
		borderWidth: 1,
		paddingHorizontal: 7,
		paddingVertical: 2,
		borderRadius: 6,
	},
	tagTextCancelled: {
		fontSize: 11,
		fontWeight: '700',
		color: '#DC2626',
	},
	serviceName: {
		fontSize: 12.5,
		fontWeight: '600',
		color: '#0C7C7C',
	},
	cancelledServiceName: {
		color: '#B91C1C',
	},
	metaRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		marginTop: 1,
	},
	metaText: {
		fontSize: 11.5,
		color: '#64748B',
		fontWeight: '500',
	},
	metaDot: {
		fontSize: 11.5,
		color: '#94A3B8',
		marginHorizontal: 2,
	},
	metaTextCompleted: {
		fontSize: 11.5,
		color: '#059669',
		fontWeight: '600',
	},
	cancelledMetaText: {
		fontSize: 11.5,
		color: '#B91C1C',
	},
	earningsTagRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		marginTop: 2,
	},
	earningsTagText: {
		fontSize: 12,
		fontWeight: '700',
		color: '#059669',
	},
	cancellationReasonText: {
		marginTop: 1,
		fontSize: 11,
		color: '#B91C1C',
		fontStyle: 'italic',
	},

	/* Bottom Tip Banner */
	bottomTipBanner: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		backgroundColor: '#F0FDFA',
		borderColor: '#CCFBF1',
		borderWidth: 1,
		borderRadius: 12,
		padding: 12,
		gap: 8,
		marginTop: 4,
	},
	tipTextRow: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	tipText: {
		flex: 1,
		fontSize: 11.5,
		color: '#134E4A',
		lineHeight: 16,
	},
	tipBold: {
		fontWeight: '700',
		color: '#0C7C7C',
	},
	manageAvailabilityBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#FFFFFF',
		borderColor: '#0C7C7C',
		borderWidth: 1,
		borderRadius: 8,
		paddingHorizontal: 10,
		paddingVertical: 6,
		gap: 3,
		flexShrink: 0,
	},
	manageAvailabilityText: {
		fontSize: 11.5,
		fontWeight: '700',
		color: '#0C7C7C',
	},
})
