import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { ROUTES } from '../../../navigation/routes'
import {
	AncillaryBooking,
	AncillaryReviewData,
	fetchMyPatientBookings,
	fetchAncillaryReviewByBooking,
	submitAncillaryReview,
} from '../ancillaryService'
import UpcomingBookingCard from '../components/UpcomingBookingCard'
import CompletedBookingCard from '../components/CompletedBookingCard'
import CancelledBookingCard from '../components/CancelledBookingCard'
import RateAncillaryReviewModal from '../components/RateAncillaryReviewModal'
import { AppScreenHeader, AppSkeleton } from '../../../components/common'
import StatusModal from '../../../components/common/StatusModal'
import BookingsSearchBar from '../../bookings/components/BookingsSearchBar'

type BookingTab = 'all' | 'upcoming' | 'completed' | 'cancelled'

const TABS: { key: BookingTab; label: string }[] = [
	{ key: 'all', label: 'All' },
	{ key: 'upcoming', label: 'Upcoming' },
	{ key: 'completed', label: 'Completed' },
	{ key: 'cancelled', label: 'Cancelled' },
]

const PAGE_SIZE = 10

interface MyBookingsPageProps {
	showHeader?: boolean
	embedded?: boolean
	searchQuery?: string
	activeTab?: BookingTab
}

export default function MyBookingsPage({
	showHeader = true,
	embedded = false,
	searchQuery: propSearchQuery,
	activeTab: propActiveTab,
}: MyBookingsPageProps = {}) {
	const navigation = useNavigation<any>()

	const [bookings, setBookings] = useState<AncillaryBooking[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [loadError, setLoadError] = useState<string | null>(null)
	const [activeTab, setActiveTab] = useState<BookingTab>(propActiveTab ?? 'all')
	const [draftActiveTab, setDraftActiveTab] = useState<BookingTab>(propActiveTab ?? 'all')
	const [searchQuery, setSearchQuery] = useState(propSearchQuery ?? '')
	const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
	const [filterModalVisible, setFilterModalVisible] = useState(false)

	useEffect(() => {
		if (embedded && propSearchQuery !== undefined) {
			setSearchQuery(propSearchQuery)
			setVisibleCount(PAGE_SIZE)
		}
	}, [embedded, propSearchQuery])

	useEffect(() => {
		if (embedded && propActiveTab !== undefined) {
			setActiveTab(propActiveTab)
			setDraftActiveTab(propActiveTab)
			setVisibleCount(PAGE_SIZE)
		}
	}, [embedded, propActiveTab])

	// Rating & Review Modal State
	const [reviewBooking, setReviewBooking] = useState<AncillaryBooking | null>(null)
	const [existingReview, setExistingReview] = useState<AncillaryReviewData | null>(null)
	const [reviewModalVisible, setReviewModalVisible] = useState(false)
	const [isSubmittingReview, setIsSubmittingReview] = useState(false)

	// Success / Error Feedback Modal
	const [statusModal, setStatusModal] = useState<{
		visible: boolean
		status?: 'success' | 'error' | 'info'
		title: string
		description: string
	} | null>(null)

	const loadBookings = useCallback(async () => {
		setIsLoading(true)
		setLoadError(null)
		try {
			const data = await fetchMyPatientBookings()
			setBookings(data)
		} catch (error) {
			setLoadError('Unable to load your ancillary orders right now. Please try again.')
		} finally {
			setIsLoading(false)
		}
	}, [])

	// Refetch on focus (not just mount) so a booking's status -- e.g. moving
	// to COMPLETED after the provider finishes the visit -- is reflected as
	// soon as the user returns to this list, instead of showing stale
	// Track Order / Reschedule actions from the last fetch.
	useFocusEffect(
		useCallback(() => {
			loadBookings()
		}, [loadBookings])
	)

	const filteredBookings = useMemo(() => {
		const query = searchQuery.trim().toLowerCase()

		return bookings.filter((booking) => {
			const matchesTab = activeTab === 'all' || booking.status === activeTab
			if (!matchesTab) return false
			if (!query) return true

			return (
				booking.serviceName.toLowerCase().includes(query) ||
				booking.provider.name.toLowerCase().includes(query) ||
				booking.date.toLowerCase().includes(query)
			)
		})
	}, [bookings, activeTab, searchQuery])

	const pagedBookings = useMemo(
		() => filteredBookings.slice(0, visibleCount),
		[filteredBookings, visibleCount]
	)

	const handleLoadMore = useCallback(() => {
		setVisibleCount((prev) => (prev >= filteredBookings.length ? prev : Math.min(prev + PAGE_SIZE, filteredBookings.length)))
	}, [filteredBookings.length])

	const handleChat = (booking: AncillaryBooking) => {
		Alert.alert('Chat', `Opening chat with ${booking.provider.name}...`)
	}

	const handleReschedule = (booking: AncillaryBooking) => {
		navigation.navigate(ROUTES.STACK.ANCILLARY_PROVIDERS, {
			serviceKey: booking.serviceKey,
			serviceLabel: booking.serviceLabel,
		})
	}

	const handleTrack = (booking: AncillaryBooking) => {
		const rawSt = String(booking.rawStatus || booking.status || '').toUpperCase()
		if (rawSt === 'SEARCHING' || rawSt === 'SEARCHING_FOR_NURSE' || rawSt === 'REQUESTED') {
			navigation.navigate(ROUTES.STACK.ANCILLARY_SERVICE_MATCHING, {
				bookingId: booking.id,
				serviceName: booking.serviceName,
				addressText: 'Selected Delivery Location',
			})
		} else {
			navigation.navigate(ROUTES.STACK.ANCILLARY_TRACK_APPOINTMENT, {
				bookingId: booking.id,
				bookingData: {
					provider: booking.provider,
					serviceKey: booking.serviceKey,
					serviceLabel: booking.serviceLabel,
					status: booking.rawStatus || booking.status,
					appointment: {
						service: booking.serviceName,
						dateTime: [booking.date, booking.timeRange].filter(Boolean).join('  •  '),
						locationLabel: 'Home Visit',
						address: '',
					},
				},
			})
		}
	}

	const handleViewInvoice = (booking: AncillaryBooking) => {
		Alert.alert('Invoice', `Invoice for "${booking.serviceName}" will be available shortly.`)
	}

	const handleBookAgain = (booking: AncillaryBooking) => {
		navigation.navigate(ROUTES.STACK.ANCILLARY_PROVIDERS, {
			serviceKey: booking.serviceKey,
			serviceLabel: booking.serviceLabel,
		})
	}

	const handleRateReview = async (booking: AncillaryBooking) => {
		let review = booking.review || null
		if (!review && (booking.hasReview || (booking.rating != null && booking.rating > 0))) {
			try {
				review = await fetchAncillaryReviewByBooking(booking.id)
			} catch (e) {
				// fallback to null
			}
		}
		setReviewBooking(booking)
		setExistingReview(review)
		setReviewModalVisible(true)
	}

	const handleSubmitReview = async (rating: number, comment: string) => {
		if (!reviewBooking) return
		setIsSubmittingReview(true)

		try {
			const savedReview = await submitAncillaryReview({
				bookingId: reviewBooking.id,
				providerId: reviewBooking.provider.id || 'n-prov-1',
				providerName: reviewBooking.provider.name,
				serviceName: reviewBooking.serviceName,
				rating,
				comment,
				patientName: '',
			})

			// Update in-place in local state array immediately
			setBookings((prev) =>
				prev.map((b) =>
					b.id === reviewBooking.id
						? {
								...b,
								rating,
								hasReview: true,
								review: savedReview,
						  }
						: b
				)
			)

			setReviewModalVisible(false)
			setReviewBooking(null)
			setExistingReview(null)

			// Show success status modal
			setStatusModal({
				visible: true,
				title: 'Feedback Submitted!',
				description: `Thank you for reviewing ${reviewBooking.provider.name}. Your rating helps us maintain top healthcare quality.`,
			})
		} catch (error: any) {
			const errorMsg =
				error?.response?.data?.detail ||
				error?.response?.data?.message ||
				error?.message ||
				'Unable to submit review. Please try again.'
			setStatusModal({
				visible: true,
				status: 'error',
				title: 'Review Submission Failed',
				description: errorMsg,
			})
		} finally {
			setIsSubmittingReview(false)
		}
	}

	const handleFilterPress = () => {
		setDraftActiveTab(activeTab)
		setFilterModalVisible(true)
	}

	const applyFilters = () => {
		setActiveTab(draftActiveTab)
		setVisibleCount(PAGE_SIZE)
		setFilterModalVisible(false)
	}

	const resetFilters = () => {
		setDraftActiveTab('all')
		setActiveTab('all')
		setVisibleCount(PAGE_SIZE)
	}

	const renderFilterModal = () => (
		<Modal
			visible={filterModalVisible}
			transparent
			animationType="fade"
			onRequestClose={() => setFilterModalVisible(false)}
		>
			<View style={styles.filterModalRoot}>
				<Pressable style={styles.filterBackdrop} onPress={() => setFilterModalVisible(false)} />
				<View style={styles.filterSheet}>
					<View style={styles.filterSheetHandle} />
					<View style={styles.filterSheetHeader}>
						<Text style={styles.filterSheetTitle}>Filters</Text>
						<TouchableOpacity style={styles.filterCloseButton} onPress={() => setFilterModalVisible(false)}>
							<Ionicons name="close" size={22} color="#64748B" />
						</TouchableOpacity>
					</View>

					<View style={styles.filterGroup}>
						<Text style={styles.filterGroupLabel}>Booking Status</Text>
						<ScrollView
							horizontal
							showsHorizontalScrollIndicator={false}
							contentContainerStyle={styles.filterChipRow}
							keyboardShouldPersistTaps="handled"
						>
							{TABS.map((tab) => {
								const selected = draftActiveTab === tab.key
								return (
									<TouchableOpacity
										key={tab.key}
										style={[styles.filterChip, selected && styles.filterChipActive]}
										onPress={() => setDraftActiveTab(tab.key)}
										activeOpacity={0.82}
									>
										<Text style={[styles.filterChipText, selected && styles.filterChipTextActive]}>
											{tab.label}
										</Text>
									</TouchableOpacity>
								)
							})}
						</ScrollView>
					</View>

					<View style={styles.filterSheetActions}>
						<TouchableOpacity style={styles.resetButton} onPress={resetFilters} activeOpacity={0.82}>
							<Text style={styles.resetButtonText}>Reset</Text>
						</TouchableOpacity>
						<TouchableOpacity style={styles.applyButton} onPress={applyFilters} activeOpacity={0.88}>
							<Text style={styles.applyButtonText}>Apply Filters</Text>
						</TouchableOpacity>
					</View>
				</View>
			</View>
		</Modal>
	)

	const renderItem = ({ item }: { item: AncillaryBooking }) => {
		if (item.status === 'upcoming') {
			return (
				<UpcomingBookingCard
					booking={item}
					onChat={handleChat}
					onReschedule={handleReschedule}
					onTrack={handleTrack}
				/>
			)
		}
		if (item.status === 'completed') {
			return (
				<CompletedBookingCard
					booking={item}
					onViewInvoice={handleViewInvoice}
					onBookAgain={handleBookAgain}
					onRateReview={handleRateReview}
					onViewDetails={handleTrack}
				/>
			)
		}
		return <CancelledBookingCard booking={item} />
	}

	return (
		<View style={styles.container}>
			{showHeader && (
				<AppScreenHeader
					title="Ancillary Orders"
					rightElement={null}
				/>
			)}

			{!embedded && (
				<BookingsSearchBar
					value={searchQuery}
					onChangeText={(text) => {
						setSearchQuery(text)
						setVisibleCount(PAGE_SIZE)
					}}
					placeholder="Search provider, service or date..."
					onFilterPress={handleFilterPress}
					filterActive={activeTab !== 'all' || filterModalVisible}
					accessibilityLabel="Filter ancillary bookings"
				/>
			)}

			{isLoading ? (
				<View style={styles.listContent}>
					{Array.from({ length: 4 }).map((_, i) => (
						<AppSkeleton key={i} width={'100%'} height={110} borderRadius={16} style={styles.loadingSkeletonCard} />
					))}
				</View>
			) : loadError ? (
				<View style={styles.emptyContainer}>
					<Ionicons name="alert-circle-outline" size={48} color="#CBD5E1" />
					<Text style={styles.emptyText}>{loadError}</Text>
					<TouchableOpacity style={styles.retryButton} onPress={loadBookings} activeOpacity={0.85}>
						<Text style={styles.retryButtonText}>Retry</Text>
					</TouchableOpacity>
				</View>
			) : (
				<FlatList
					data={pagedBookings}
					renderItem={renderItem}
					keyExtractor={(item) => item.id}
					contentContainerStyle={styles.listContent}
					showsVerticalScrollIndicator={false}
					onEndReached={handleLoadMore}
					onEndReachedThreshold={0.4}
					ListEmptyComponent={
						<View style={styles.emptyContainer}>
							<Ionicons name="calendar-outline" size={48} color="#CBD5E1" />
							<Text style={styles.emptyText}>
								{searchQuery
									? 'No bookings match your search.'
									: activeTab === 'all'
									? 'You have no ancillary orders yet.'
									: `You have no ${activeTab} orders yet.`}
							</Text>
						</View>
					}
					ListFooterComponent={
						visibleCount < filteredBookings.length ? (
							<View style={{ paddingVertical: 8, opacity: 0.6 }}>
								<AppSkeleton width={'100%'} height={110} borderRadius={16} />
							</View>
						) : null
					}
				/>
			)}

			{/* Rating & Review Bottom Sheet Modal */}
			<RateAncillaryReviewModal
				visible={reviewModalVisible}
				onClose={() => {
					setReviewModalVisible(false)
					setReviewBooking(null)
					setExistingReview(null)
				}}
				booking={reviewBooking}
				existingReview={existingReview}
				onSubmit={handleSubmitReview}
				isSubmitting={isSubmittingReview}
			/>

			{/* Status Feedback Confirmation */}
			{statusModal && (
				<StatusModal
					visible={statusModal.visible}
					status={statusModal.status || 'success'}
					title={statusModal.title}
					description={statusModal.description}
					submitText={statusModal.status === 'error' ? 'OK' : 'Done'}
					onSubmit={() => setStatusModal(null)}
					onCancel={() => setStatusModal(null)}
				/>
			)}
			{renderFilterModal()}
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#F8FAFA',
	},
	filterModalRoot: {
		flex: 1,
		justifyContent: 'flex-end',
		alignItems: 'center',
		backgroundColor: 'rgba(15, 23, 42, 0.34)',
	},
	filterBackdrop: {
		...StyleSheet.absoluteFill,
	},
	filterSheet: {
		width: '100%',
		maxWidth: 520,
		backgroundColor: '#FFFFFF',
		borderTopLeftRadius: 24,
		borderTopRightRadius: 24,
		paddingTop: 8,
		paddingBottom: 26,
		shadowColor: '#000000',
		shadowOffset: { width: 0, height: -10 },
		shadowOpacity: 0.14,
		shadowRadius: 24,
		elevation: 18,
	},
	filterSheetHandle: {
		width: 44,
		height: 4,
		borderRadius: 999,
		backgroundColor: '#D7DEE6',
		alignSelf: 'center',
		marginBottom: 10,
	},
	filterSheetHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 18,
		paddingBottom: 12,
	},
	filterSheetTitle: {
		fontSize: 18,
		lineHeight: 24,
		fontWeight: '700',
		color: '#111827',
	},
	filterCloseButton: {
		width: 36,
		height: 36,
		borderRadius: 18,
		alignItems: 'center',
		justifyContent: 'center',
	},
	filterGroup: {
		gap: 10,
		paddingHorizontal: 18,
		paddingTop: 4,
		paddingBottom: 20,
	},
	filterGroupLabel: {
		fontSize: 11,
		lineHeight: 14,
		fontWeight: '800',
		color: '#64748B',
		textTransform: 'uppercase',
	},
	filterChipRow: {
		flexDirection: 'row',
		gap: 10,
		paddingVertical: 1,
	},
	filterChip: {
		minHeight: 38,
		minWidth: 74,
		borderRadius: 19,
		paddingHorizontal: 18,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#F2F6FB',
		flexShrink: 0,
	},
	filterChipActive: {
		backgroundColor: '#2B6F71',
	},
	filterChipText: {
		fontSize: 12,
		lineHeight: 16,
		fontWeight: '700',
		color: '#64748B',
	},
	filterChipTextActive: {
		color: '#FFFFFF',
	},
	filterSheetActions: {
		flexDirection: 'row',
		paddingHorizontal: 18,
		paddingTop: 12,
		gap: 12,
		borderTopWidth: 1,
		borderTopColor: '#E2E8F0',
	},
	resetButton: {
		flex: 1,
		height: 48,
		borderRadius: 24,
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: 1,
		borderColor: '#E2E8F0',
		backgroundColor: '#FFFFFF',
	},
	resetButtonText: {
		fontSize: 14,
		fontWeight: '700',
		color: '#64748B',
	},
	applyButton: {
		flex: 2,
		height: 48,
		borderRadius: 24,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#2B6F71',
	},
	applyButtonText: {
		fontSize: 14,
		fontWeight: '700',
		color: '#FFFFFF',
	},
	tabsRow: {
		flexDirection: 'row',
		paddingHorizontal: 16,
		backgroundColor: '#FFFFFF',
		borderBottomWidth: 1,
		borderBottomColor: '#E2E8F0',
		gap: 24,
	},
	tabItem: {
		paddingVertical: 12,
	},
	tabText: {
		fontSize: 14,
		fontWeight: '600',
		color: '#3f4849',
	},
	tabTextActive: {
		color: '#055759',
	},
	tabIndicator: {
		marginTop: 8,
		height: 2,
		borderRadius: 1,
		backgroundColor: '#055759',
	},
	listContent: {
		gap: 16,
		padding: 16,
		paddingBottom: 32,
	},
	emptyContainer: {
		paddingVertical: 60,
		alignItems: 'center',
	},
	emptyText: {
		marginTop: 10,
		fontSize: 13,
		color: '#94A3B8',
		textAlign: 'center',
		paddingHorizontal: 32,
	},
	loadingSkeletonCard: {
		marginBottom: 16,
	},
	retryButton: {
		marginTop: 16,
		paddingHorizontal: 20,
		paddingVertical: 10,
		borderRadius: 999,
		backgroundColor: '#2B6F71',
	},
	retryButtonText: {
		fontSize: 13,
		fontWeight: '600',
		color: '#FFFFFF',
	},
})
