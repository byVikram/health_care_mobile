import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { ROUTES } from '../../../navigation/routes'
import {
	AncillaryBooking,
	AncillaryReviewData,
	fetchMyPatientBookingsBackend,
	getAncillaryReviewByBookingId,
	submitAncillaryReview,
} from '../ancillaryService'
import UpcomingBookingCard from '../components/UpcomingBookingCard'
import CompletedBookingCard from '../components/CompletedBookingCard'
import CancelledBookingCard from '../components/CancelledBookingCard'
import RateAncillaryReviewModal from '../components/RateAncillaryReviewModal'
import { AppScreenHeader, AppSkeleton } from '../../../components/common'
import StatusModal from '../../../components/common/StatusModal'

type BookingTab = 'upcoming' | 'completed' | 'cancelled'

const TABS: { key: BookingTab; label: string }[] = [
	{ key: 'upcoming', label: 'Upcoming' },
	{ key: 'completed', label: 'Completed' },
	{ key: 'cancelled', label: 'Cancelled' },
]

const PAGE_SIZE = 10

export default function MyBookingsPage() {
	const navigation = useNavigation<any>()

	const [bookings, setBookings] = useState<AncillaryBooking[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [loadError, setLoadError] = useState<string | null>(null)
	const [activeTab, setActiveTab] = useState<BookingTab>('upcoming')
	const [searchQuery, setSearchQuery] = useState('')
	const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
	const [filterActive, setFilterActive] = useState(false)

	// Rating & Review Modal State
	const [reviewBooking, setReviewBooking] = useState<AncillaryBooking | null>(null)
	const [existingReview, setExistingReview] = useState<AncillaryReviewData | null>(null)
	const [reviewModalVisible, setReviewModalVisible] = useState(false)
	const [isSubmittingReview, setIsSubmittingReview] = useState(false)

	// Success Feedback Modal
	const [statusModal, setStatusModal] = useState<{
		visible: boolean
		title: string
		description: string
	} | null>(null)

	const loadBookings = useCallback(async () => {
		setIsLoading(true)
		setLoadError(null)
		try {
			const data = await fetchMyPatientBookingsBackend()
			setBookings(data)
		} catch (error) {
			setLoadError('Unable to load your ancillary orders right now. Please try again.')
		} finally {
			setIsLoading(false)
		}
	}, [])

	useEffect(() => {
		loadBookings()
	}, [loadBookings])

	const filteredBookings = useMemo(() => {
		const query = searchQuery.trim().toLowerCase()

		return bookings.filter((booking) => {
			const matchesTab = booking.status === activeTab
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
		navigation.navigate(ROUTES.STACK.ANCILLARY_TRACK_APPOINTMENT, {
			bookingId: booking.id,
			bookingData: {
				provider: booking.provider,
				serviceKey: booking.serviceKey,
				serviceLabel: booking.serviceLabel,
				appointment: {
					service: booking.serviceName,
					dateTime: [booking.date, booking.timeRange].filter(Boolean).join('  •  '),
					locationLabel: 'Home Visit',
					address: '',
				},
			},
		})
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

	const handleRateReview = (booking: AncillaryBooking) => {
		const review = getAncillaryReviewByBookingId(booking.id) || booking.review || null
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
				patientName: 'John Doe',
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
		} catch (error) {
			Alert.alert('Error', 'Unable to submit review. Please try again.')
		} finally {
			setIsSubmittingReview(false)
		}
	}

	const handleFilterPress = () => {
		setFilterActive((prev) => !prev)
	}

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
				/>
			)
		}
		return <CancelledBookingCard booking={item} />
	}

	return (
		<View style={styles.container}>
			<AppScreenHeader
				title="Ancillary Orders"
				rightElement={null}
			/>

			<View style={styles.searchSectionContainer}>
				<View style={styles.searchRow}>
					<View style={styles.searchBar}>
						<Ionicons name="search" size={20} color="#94A3B8" style={styles.searchIcon} />
						<TextInput
							style={styles.searchInput}
							placeholder="Search provider, service or date..."
							placeholderTextColor="#94A3B8"
							value={searchQuery}
							onChangeText={(text) => {
								setSearchQuery(text)
								setVisibleCount(PAGE_SIZE)
							}}
						/>
						{searchQuery.length > 0 && (
							<TouchableOpacity onPress={() => setSearchQuery('')}>
								<Ionicons name="close-circle" size={18} color="#94A3B8" />
							</TouchableOpacity>
						)}
					</View>
					<TouchableOpacity
						style={[styles.filterIconButton, filterActive && styles.filterIconButtonActive]}
						onPress={handleFilterPress}
						activeOpacity={0.84}
					>
						<MaterialCommunityIcons name="tune" size={22} color={filterActive ? '#ffffff' : '#2B6F71'} />
					</TouchableOpacity>
				</View>
			</View>

			<View style={styles.tabsRow}>
				{TABS.map((tab) => {
					const isActive = tab.key === activeTab
					return (
						<TouchableOpacity
							key={tab.key}
							style={styles.tabItem}
							onPress={() => {
								setActiveTab(tab.key)
								setVisibleCount(PAGE_SIZE)
							}}
							activeOpacity={0.8}
						>
							<Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tab.label}</Text>
							{isActive ? <View style={styles.tabIndicator} /> : null}
						</TouchableOpacity>
					)
				})}
			</View>

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
									: `You have no ${activeTab} bookings yet.`}
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
					status="success"
					title={statusModal.title}
					description={statusModal.description}
					submitText="Done"
					onSubmit={() => setStatusModal(null)}
					onCancel={() => setStatusModal(null)}
				/>
			)}
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#F8FAFA',
	},
	searchSectionContainer: {
		paddingHorizontal: 16,
		paddingVertical: 12,
		backgroundColor: '#FFFFFF',
	},
	searchRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
	},
	searchBar: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#F8FAFC',
		borderWidth: 1,
		borderColor: '#E2E8F0',
		borderRadius: 999,
		paddingHorizontal: 14,
		height: 48,
	},
	searchIcon: {
		marginRight: 8,
	},
	searchInput: {
		flex: 1,
		fontSize: 14,
		color: '#1E293B',
	},
	filterIconButton: {
		width: 48,
		height: 48,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#E2E8F0',
		backgroundColor: '#F8FAFC',
		alignItems: 'center',
		justifyContent: 'center',
	},
	filterIconButtonActive: {
		backgroundColor: '#2B6F71',
		borderColor: '#2B6F71',
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
