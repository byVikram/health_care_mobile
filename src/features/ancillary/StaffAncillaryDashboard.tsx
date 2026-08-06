import React, { useEffect, useState } from 'react'
import {
	FlatList,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
	useWindowDimensions,
} from 'react-native'
import { useNavigation, useIsFocused } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { MOCK_NURSE_BOOKINGS, NurseBooking, getBookingState } from './ancillaryService'
import { ROUTES } from '../../navigation/routes'
import ServiceStatusIndicator from './components/ServiceStatusIndicator'

export default function StaffAncillaryDashboard() {
	const navigation = useNavigation<any>()
	const isFocused = useIsFocused()
	const { width } = useWindowDimensions()
	const isTablet = width >= 768

	const [bookings, setBookings] = useState<NurseBooking[]>(MOCK_NURSE_BOOKINGS)
	const [searchQuery, setSearchQuery] = useState('')
	const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending')

	useEffect(() => {
		const syncStatuses = async () => {
			const updated = await Promise.all(
				MOCK_NURSE_BOOKINGS.map(async (b) => {
					const state = await getBookingState(b.id)
					if (state) {
						return { ...b, status: state.status }
					}
					return b
				})
			)
			setBookings(updated)
		}
		if (isFocused) {
			void syncStatuses()
		}
	}, [isFocused])

	const filteredBookings = bookings.filter((b) => {
		const matchesSearch = b.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
			b.serviceName.toLowerCase().includes(searchQuery.toLowerCase())
		
		const matchesTab = activeTab === 'pending'
			? b.status !== 'completed'
			: b.status === 'completed'

		return matchesSearch && matchesTab
	})

	const handleCardPress = (booking: NurseBooking) => {
		if (booking.status === 'in_progress') {
			navigation.navigate(ROUTES.STACK.NURSE_SERVICE_IN_PROGRESS, { bookingId: booking.id })
		} else if (booking.status === 'verification_pending') {
			navigation.navigate(ROUTES.STACK.NURSE_PATIENT_VERIFICATION, { bookingId: booking.id })
		} else {
			navigation.navigate(ROUTES.STACK.NURSE_ACTIVE_BOOKING, { bookingId: booking.id })
		}
	}

	const renderBookingCard = ({ item }: { item: NurseBooking }) => {
		const isCompleted = item.status === 'completed'

		return (
			<TouchableOpacity
				style={styles.card}
				onPress={() => handleCardPress(item)}
				activeOpacity={0.88}
			>
				<View style={styles.cardHeader}>
					<View style={styles.headerInfo}>
						<Text style={styles.patientName}>{item.patientName}</Text>
						<Text style={styles.patientMeta}>
							{item.patientGender} • {item.patientAge} yrs
						</Text>
					</View>
					<ServiceStatusIndicator status={item.status} />
				</View>

				<Text style={styles.serviceName} numberOfLines={1}>
					{item.serviceName}
				</Text>

				<View style={styles.cardFooter}>
					<View style={styles.metaRow}>
						<Ionicons name="calendar-outline" size={15} color="#667B8F" />
						<Text style={styles.metaText}>{item.appointmentDate}</Text>
					</View>
					<View style={styles.metaRow}>
						<Ionicons name="time-outline" size={15} color="#667B8F" />
						<Text style={styles.metaText}>{item.appointmentTime.split(' - ')[0]}</Text>
					</View>
				</View>

				<View style={styles.addressRow}>
					<Ionicons name="location-outline" size={14} color="#667B8F" />
					<Text style={styles.addressText} numberOfLines={1}>
						{item.patientAddress}
					</Text>
				</View>

				{!isCompleted && (
					<View style={styles.actionPrompt}>
						<Text style={styles.actionPromptText}>
							{item.status === 'in_progress' ? 'Resume Care Service' : 'View Booking Details'}
						</Text>
						<Ionicons
							name="arrow-forward"
							size={16}
							color="#2B6F71"
						/>
					</View>
				)}
			</TouchableOpacity>
		)
	}

	const pendingCount = bookings.filter((b) => b.status !== 'completed').length
	const completedCount = bookings.filter((b) => b.status === 'completed').length

	return (
		<View style={styles.container}>
			{/* Stats Cards */}
			<View style={styles.statsRow}>
				<View style={[styles.statCard, styles.statCardPending]}>
					<Text style={[styles.statNum, styles.statNumPending]}>{pendingCount}</Text>
					<Text style={styles.statLabel}>Pending Visits</Text>
				</View>
				<View style={[styles.statCard, styles.statCardCompleted]}>
					<Text style={[styles.statNum, styles.statNumCompleted]}>{completedCount}</Text>
					<Text style={styles.statLabel}>Completed Visits</Text>
				</View>
			</View>

			{/* Search */}
			<View style={styles.searchBar}>
				<Ionicons name="search" size={20} color="#94A3B8" style={styles.searchIcon} />
				<TextInput
					style={styles.searchInput}
					placeholder="Search patients or procedures..."
					placeholderTextColor="#94A3B8"
					value={searchQuery}
					onChangeText={setSearchQuery}
				/>
				{searchQuery !== '' && (
					<TouchableOpacity onPress={() => setSearchQuery('')}>
						<Ionicons name="close-circle" size={18} color="#94A3B8" />
					</TouchableOpacity>
				)}
			</View>

			{/* Tabs */}
			<View style={styles.tabs}>
				<TouchableOpacity
					style={[styles.tab, activeTab === 'pending' && styles.tabActive]}
					onPress={() => setActiveTab('pending')}
				>
					<Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>
						Active Care
					</Text>
				</TouchableOpacity>
				<TouchableOpacity
					style={[styles.tab, activeTab === 'completed' && styles.tabActive]}
					onPress={() => setActiveTab('completed')}
				>
					<Text style={[styles.tabText, activeTab === 'completed' && styles.tabTextActive]}>
						Completed Care
					</Text>
				</TouchableOpacity>
			</View>

			{/* List */}
			<FlatList
				data={filteredBookings}
				renderItem={renderBookingCard}
				keyExtractor={(item) => item.id}
				contentContainerStyle={styles.listContent}
				ListEmptyComponent={
					<View style={styles.emptyContainer}>
						<Ionicons name="folder-open-outline" size={48} color="#CBD5E1" />
						<Text style={styles.emptyText}>No visits found matching search criteria.</Text>
					</View>
				}
				scrollEnabled={false}
			/>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		paddingHorizontal: 16,
		marginTop: 8,
	},
	statsRow: {
		flexDirection: 'row',
		gap: 12,
		marginBottom: 16,
	},
	statCard: {
		flex: 1,
		borderRadius: 16,
		padding: 14,
		backgroundColor: '#FFFFFF',
		borderWidth: 1,
		borderColor: '#E6EDF2',
	},
	statCardPending: {
		borderLeftWidth: 4,
		borderLeftColor: '#F59E0B',
	},
	statCardCompleted: {
		borderLeftWidth: 4,
		borderLeftColor: '#10B981',
	},
	statNum: {
		fontSize: 22,
		fontWeight: '800',
		marginBottom: 2,
	},
	statNumPending: {
		color: '#D97706',
	},
	statNumCompleted: {
		color: '#059669',
	},
	statLabel: {
		fontSize: 12,
		fontWeight: '600',
		color: '#64748B',
	},
	searchBar: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#FFFFFF',
		borderWidth: 1,
		borderColor: '#E2E8F0',
		borderRadius: 12,
		paddingHorizontal: 12,
		height: 48,
		marginBottom: 16,
	},
	searchIcon: {
		marginRight: 8,
	},
	searchInput: {
		flex: 1,
		fontSize: 14,
		color: '#1E293B',
	},
	tabs: {
		flexDirection: 'row',
		backgroundColor: '#F1F5F9',
		borderRadius: 12,
		padding: 4,
		marginBottom: 16,
	},
	tab: {
		flex: 1,
		paddingVertical: 10,
		alignItems: 'center',
		borderRadius: 8,
	},
	tabActive: {
		backgroundColor: '#FFFFFF',
		shadowColor: '#1E293B',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.06,
		shadowRadius: 4,
		elevation: 1,
	},
	tabText: {
		fontSize: 13,
		fontWeight: '600',
		color: '#64748B',
	},
	tabTextActive: {
		color: '#2B6F71',
		fontWeight: '700',
	},
	listContent: {
		gap: 12,
		paddingBottom: 24,
	},
	card: {
		backgroundColor: '#FFFFFF',
		borderRadius: 16,
		padding: 16,
		borderWidth: 1,
		borderColor: '#E6EDF2',
		shadowColor: '#12373E',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.03,
		shadowRadius: 6,
		elevation: 1,
	},
	cardHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'flex-start',
		marginBottom: 10,
	},
	cardHeaderTablet: {},
	headerInfo: {
		flex: 1,
		marginRight: 8,
	},
	patientName: {
		fontSize: 15,
		fontWeight: '700',
		color: '#16324A',
		marginBottom: 2,
	},
	patientMeta: {
		fontSize: 12,
		color: '#64748B',
		fontWeight: '500',
	},
	serviceName: {
		fontSize: 14,
		fontWeight: '600',
		color: '#334155',
		marginBottom: 12,
	},
	cardFooter: {
		flexDirection: 'row',
		gap: 16,
		borderTopWidth: 1,
		borderTopColor: '#F1F5F9',
		paddingTop: 10,
		marginBottom: 8,
	},
	metaRow: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	metaText: {
		fontSize: 12,
		fontWeight: '600',
		color: '#475569',
		marginLeft: 4,
	},
	addressRow: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#F8FAFC',
		paddingHorizontal: 10,
		paddingVertical: 8,
		borderRadius: 8,
		marginBottom: 10,
	},
	addressText: {
		fontSize: 11,
		color: '#64748B',
		fontWeight: '500',
		marginLeft: 6,
		flex: 1,
	},
	actionPrompt: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		borderTopWidth: 1,
		borderTopColor: '#F1F5F9',
		paddingTop: 10,
	},
	actionPromptText: {
		fontSize: 12,
		fontWeight: '700',
		color: '#2B6F71',
	},
	emptyContainer: {
		paddingVertical: 40,
		alignItems: 'center',
	},
	emptyText: {
		marginTop: 8,
		fontSize: 13,
		color: '#94A3B8',
		textAlign: 'center',
		paddingHorizontal: 24,
	},
})
