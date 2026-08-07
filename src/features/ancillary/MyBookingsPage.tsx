import React, { useMemo, useState } from 'react'
import { Alert, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { ROUTES } from '../../navigation/routes'
import { AncillaryBooking, MOCK_ANCILLARY_BOOKINGS } from './ancillaryService'
import UpcomingBookingCard from './components/UpcomingBookingCard'
import CompletedBookingCard from './components/CompletedBookingCard'
import CancelledBookingCard from './components/CancelledBookingCard'

type BookingTab = 'upcoming' | 'completed' | 'cancelled'

const TABS: { key: BookingTab; label: string }[] = [
	{ key: 'upcoming', label: 'Upcoming' },
	{ key: 'completed', label: 'Completed' },
	{ key: 'cancelled', label: 'Cancelled' },
]

export default function MyBookingsPage() {
	const navigation = useNavigation<any>()

	const [bookings] = useState<AncillaryBooking[]>(MOCK_ANCILLARY_BOOKINGS)
	const [activeTab, setActiveTab] = useState<BookingTab>('upcoming')
	const [searchQuery, setSearchQuery] = useState('')

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
		Alert.alert('Track Nurse', `Live tracking for ${booking.provider.name} will be available shortly.`)
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
				/>
			)
		}
		return <CancelledBookingCard booking={item} />
	}

	return (
		<View style={styles.container}>
			{/* Header */}
			<View style={styles.header}>
				<TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
					<Ionicons name="chevron-back" size={24} color="#16324A" />
				</TouchableOpacity>
				<View style={styles.titleContainer}>
					<Text style={styles.title}>My Bookings</Text>
				</View>
				<TouchableOpacity style={styles.moreBtn}>
					<Ionicons name="ellipsis-vertical" size={20} color="#16324A" />
				</TouchableOpacity>
			</View>

			{/* Search */}
			<View style={styles.searchBarContainer}>
				<View style={styles.searchBar}>
					<Ionicons name="search" size={20} color="#94A3B8" style={styles.searchIcon} />
					<TextInput
						style={styles.searchInput}
						placeholder="Search provider, service or date..."
						placeholderTextColor="#94A3B8"
						value={searchQuery}
						onChangeText={setSearchQuery}
					/>
				</View>
			</View>

			{/* Tabs */}
			<View style={styles.tabsRow}>
				{TABS.map((tab) => {
					const isActive = tab.key === activeTab
					return (
						<TouchableOpacity
							key={tab.key}
							style={styles.tabItem}
							onPress={() => setActiveTab(tab.key)}
							activeOpacity={0.8}
						>
							<Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tab.label}</Text>
							{isActive ? <View style={styles.tabIndicator} /> : null}
						</TouchableOpacity>
					)
				})}
			</View>

			{/* List */}
			<FlatList
				data={filteredBookings}
				renderItem={renderItem}
				keyExtractor={(item) => item.id}
				contentContainerStyle={styles.listContent}
				showsVerticalScrollIndicator={false}
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
			/>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#F8FAFA',
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingTop: 56,
		paddingBottom: 16,
		paddingHorizontal: 16,
		backgroundColor: '#FFFFFF',
		borderBottomWidth: 1,
		borderBottomColor: '#F1F5F9',
	},
	backBtn: {
		padding: 4,
		marginRight: 12,
	},
	titleContainer: {
		flex: 1,
	},
	title: {
		fontSize: 18,
		fontWeight: '800',
		color: '#16324A',
	},
	moreBtn: {
		padding: 4,
		marginLeft: 12,
	},
	searchBarContainer: {
		paddingHorizontal: 16,
		paddingVertical: 12,
		backgroundColor: '#FFFFFF',
	},
	searchBar: {
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
})
