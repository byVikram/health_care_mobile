import React, { useState } from 'react'
import {
	ActivityIndicator,
	FlatList,
	Image,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { ANCILLARY_MOCK_DATA, AncillaryProvider } from './ancillaryService'
import { ROUTES } from '../../navigation/routes'
import StatusModal from '../../components/common/StatusModal'
import { AppModal } from '../../components/common/AppModal'

const FILTERS = ['Available Now', 'Today', 'Tomorrow', 'Distance', 'Experience', 'Rating 4.9+']

export default function AncillaryProvidersPage() {
	const navigation = useNavigation<any>()
	const route = useRoute<any>()
	const { serviceKey, serviceLabel, procedureName } = route.params || {}

	const [searchQuery, setSearchQuery] = useState('')
	const [activeFilters, setActiveFilters] = useState<string[]>(['Available Now'])

	const [selectedProvider, setSelectedProvider] = useState<AncillaryProvider | null>(null)
	const [showSuccessModal, setShowSuccessModal] = useState(false)
	const [showProfileModal, setShowProfileModal] = useState(false)

	const categoryData = ANCILLARY_MOCK_DATA[serviceKey] || ANCILLARY_MOCK_DATA['nursing-care']
	const providers = categoryData.providers

	const handleFilterPress = (filter: string) => {
		if (activeFilters.includes(filter)) {
			setActiveFilters(activeFilters.filter((f) => f !== filter))
		} else {
			setActiveFilters([...activeFilters, filter])
		}
	}

	const handleBookNow = (provider: AncillaryProvider) => {
		setSelectedProvider(provider)
		setShowSuccessModal(true)
	}

	const handleViewProfile = (provider: AncillaryProvider) => {
		setSelectedProvider(provider)
		setShowProfileModal(true)
	}

	const handleSuccessModalSubmit = () => {
		setShowSuccessModal(false)
		navigation.reset({
			index: 0,
			routes: [{ name: ROUTES.MAIN.TABS }],
		})
	}

	const filteredProviders = providers.filter((p) =>
		p.name.toLowerCase().includes(searchQuery.toLowerCase())
	)

	const renderProviderCard = ({ item }: { item: AncillaryProvider }) => {
		return (
			<View style={styles.card}>
				<View style={styles.cardHeader}>
					<Image source={{ uri: item.avatar }} style={styles.avatar} resizeMode="cover" />
					<View style={styles.providerInfo}>
						<View style={styles.nameRow}>
							<Text style={styles.name}>{item.name}</Text>
							<View style={styles.credentialsBadge}>
								<Text style={styles.credentialsText}>{item.credentials}</Text>
							</View>
						</View>
						<Text style={styles.experience}>{item.experience} years experience</Text>
						<View style={styles.ratingRow}>
							<Ionicons name="star" size={14} color="#F59E0B" />
							<Text style={styles.rating}>{item.rating}</Text>
							<Text style={styles.reviewsCount}>({item.reviewsCount})</Text>
						</View>
					</View>
					<View style={styles.rateCol}>
						<Text style={styles.rateLabel}>Starting</Text>
						<Text style={styles.ratePrice}>₹{item.startingPrice}</Text>
					</View>
				</View>

				{/* Metadata details list */}
				<View style={styles.metaBox}>
					<View style={styles.metaRow}>
						<Ionicons name="briefcase-outline" size={14} color="#64748B" />
						<Text style={styles.metaText} numberOfLines={1}>
							{item.procedures.join(' • ')}
						</Text>
					</View>
					<View style={styles.metaRow}>
						<Ionicons name="language-outline" size={14} color="#64748B" />
						<Text style={styles.metaText}>{item.languages.join(', ')}</Text>
					</View>
					<View style={styles.metaRow}>
						<Ionicons name="location-outline" size={14} color="#64748B" />
						<Text style={styles.metaText}>{item.distance} km away</Text>
					</View>
				</View>

				{/* Verifications tags list */}
				<View style={styles.badgeRow}>
					{item.badges.map((badge, idx) => (
						<View key={idx} style={styles.badge}>
							<Ionicons name="checkmark" size={10} color="#047857" style={styles.badgeIcon} />
							<Text style={styles.badgeText}>{badge}</Text>
						</View>
					))}
				</View>

				{/* Action rows buttons */}
				<View style={styles.actions}>
					<TouchableOpacity style={styles.profileBtn} onPress={() => handleViewProfile(item)}>
						<Text style={styles.profileBtnText}>View Profile</Text>
					</TouchableOpacity>
					<TouchableOpacity style={styles.bookBtn} onPress={() => handleBookNow(item)}>
						<Text style={styles.bookBtnText}>Book Now</Text>
					</TouchableOpacity>
				</View>
			</View>
		)
	}

	return (
		<View style={styles.container}>
			{/* Header */}
			<View style={styles.header}>
				<TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
					<Ionicons name="chevron-back" size={24} color="#16324A" />
				</TouchableOpacity>
				<View style={styles.titleContainer}>
					<Text style={styles.title}>Available Near You</Text>
					<View style={styles.headerSubRow}>
						{procedureName && (
							<View style={styles.filterPill}>
								<Text style={styles.filterPillText}>{procedureName}</Text>
							</View>
						)}
						<View style={styles.locationPill}>
							<Ionicons name="location-sharp" size={12} color="#64748B" />
							<Text style={styles.locationPillText}>Hyderabad, Telangana</Text>
						</View>
					</View>
				</View>
			</View>

			{/* Subtitle summary */}
			<View style={styles.summaryBar}>
				<Text style={styles.summaryText}>{filteredProviders.length} clinicians available</Text>
				<TouchableOpacity style={styles.mapBtn}>
					<Ionicons name="map-outline" size={16} color="#2B6F71" />
					<Text style={styles.mapBtnText}>Map View</Text>
				</TouchableOpacity>
			</View>

			{/* Search */}
			<View style={styles.searchBarContainer}>
				<View style={styles.searchBar}>
					<Ionicons name="search" size={20} color="#94A3B8" style={styles.searchIcon} />
					<TextInput
						style={styles.searchInput}
						placeholder="Search by clinician name or specialty..."
						placeholderTextColor="#94A3B8"
						value={searchQuery}
						onChangeText={setSearchQuery}
					/>
				</View>
			</View>

			{/* Horizontal filter pills */}
			<View style={styles.filterContainer}>
				<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
					{FILTERS.map((filter) => {
						const isActive = activeFilters.includes(filter)
						return (
							<TouchableOpacity
								key={filter}
								style={[styles.filterTag, isActive && styles.filterTagActive]}
								onPress={() => handleFilterPress(filter)}
							>
								<Text style={[styles.filterTagText, isActive && styles.filterTagTextActive]}>
									{filter}
								</Text>
								{isActive && <Ionicons name="close" size={12} color="#FFFFFF" style={styles.filterTagClose} />}
							</TouchableOpacity>
						)
					})}
				</ScrollView>
			</View>

			{/* Providers list */}
			<FlatList
				data={filteredProviders}
				renderItem={renderProviderCard}
				keyExtractor={(item) => item.id}
				contentContainerStyle={styles.listContent}
				ListEmptyComponent={
					<View style={styles.emptyContainer}>
						<Ionicons name="people-outline" size={48} color="#CBD5E1" />
						<Text style={styles.emptyText}>No available clinicians found matching your criteria.</Text>
					</View>
				}
			/>

			{/* Book Success status modal overlay */}
			<StatusModal
				visible={showSuccessModal}
				status="success"
				title="Booking Confirmed!"
				description={`Your appointment with ${selectedProvider?.name || 'the clinician'} has been successfully scheduled. Details have been logged in your Portal history.`}
				submitText="Go Home"
				onSubmit={handleSuccessModalSubmit}
			/>

			{/* Provider Profile details info popup */}
			<AppModal
				visible={showProfileModal}
				onDismiss={() => setShowProfileModal(false)}
				title="Clinician Information Profile"
			>
				{selectedProvider && (
					<View style={styles.modalProfileContent}>
						<Image source={{ uri: selectedProvider.avatar }} style={styles.modalAvatar} />
						<Text style={styles.modalName}>{selectedProvider.name}, {selectedProvider.credentials}</Text>
						<Text style={styles.modalExperience}>{selectedProvider.experience} Years Physical Practice</Text>

						<View style={styles.modalRatingRow}>
							<Ionicons name="star" size={16} color="#F59E0B" />
							<Text style={styles.modalRatingText}>{selectedProvider.rating} ({selectedProvider.reviewsCount} Patient Reviews)</Text>
						</View>

						<Text style={styles.modalSectionTitle}>Procedures Offered</Text>
						<Text style={styles.modalDescText}>{selectedProvider.procedures.join(', ')}</Text>

						<Text style={styles.modalSectionTitle}>Languages Spoken</Text>
						<Text style={styles.modalDescText}>{selectedProvider.languages.join(', ')}</Text>

						<TouchableOpacity style={styles.modalBookBtn} onPress={() => {
							setShowProfileModal(false)
							handleBookNow(selectedProvider)
						}}>
							<Text style={styles.modalBookBtnText}>Book Appointment now (₹{selectedProvider.startingPrice})</Text>
						</TouchableOpacity>
					</View>
				)}
			</AppModal>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#F8FAFC',
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
		marginBottom: 4,
	},
	headerSubRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	filterPill: {
		backgroundColor: '#EAF6F6',
		paddingHorizontal: 8,
		paddingVertical: 2,
		borderRadius: 6,
	},
	filterPillText: {
		fontSize: 10,
		fontWeight: '700',
		color: '#2B6F71',
	},
	locationPill: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 2,
	},
	locationPillText: {
		fontSize: 11,
		color: '#64748B',
		fontWeight: '600',
	},
	summaryBar: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#F1F5F9',
		backgroundColor: '#FFFFFF',
	},
	summaryText: {
		fontSize: 13,
		fontWeight: '700',
		color: '#475569',
	},
	mapBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		borderWidth: 1,
		borderColor: '#C7E7E8',
		backgroundColor: '#F0F9F9',
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 8,
	},
	mapBtnText: {
		fontSize: 11,
		fontWeight: '700',
		color: '#2B6F71',
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
		borderRadius: 12,
		paddingHorizontal: 12,
		height: 44,
	},
	searchIcon: {
		marginRight: 8,
	},
	searchInput: {
		flex: 1,
		fontSize: 13,
		color: '#1E293B',
	},
	filterContainer: {
		backgroundColor: '#FFFFFF',
		paddingBottom: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#E2E8F0',
	},
	filterScroll: {
		paddingHorizontal: 16,
		gap: 8,
	},
	filterTag: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#F1F5F9',
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 20,
		borderWidth: 1,
		borderColor: '#E2E8F0',
	},
	filterTagActive: {
		backgroundColor: '#2B6F71',
		borderColor: '#2B6F71',
	},
	filterTagText: {
		fontSize: 12,
		fontWeight: '600',
		color: '#475569',
	},
	filterTagTextActive: {
		color: '#FFFFFF',
	},
	filterTagClose: {
		marginLeft: 4,
	},
	listContent: {
		padding: 16,
		gap: 16,
		paddingBottom: 40,
	},
	card: {
		backgroundColor: '#FFFFFF',
		borderRadius: 16,
		padding: 16,
		borderWidth: 1,
		borderColor: '#E6EDF2',
		shadowColor: '#12373E',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.04,
		shadowRadius: 8,
		elevation: 2,
	},
	cardHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 14,
	},
	avatar: {
		width: 56,
		height: 56,
		borderRadius: 28,
		backgroundColor: '#F1F5F9',
	},
	providerInfo: {
		flex: 1,
		marginLeft: 12,
	},
	nameRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		marginBottom: 2,
	},
	name: {
		fontSize: 15,
		fontWeight: '700',
		color: '#16324A',
	},
	credentialsBadge: {
		backgroundColor: '#EAF6F6',
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 4,
	},
	credentialsText: {
		fontSize: 10,
		fontWeight: '700',
		color: '#2B6F71',
	},
	experience: {
		fontSize: 12,
		color: '#64748B',
		fontWeight: '500',
		marginBottom: 4,
	},
	ratingRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	rating: {
		fontSize: 12,
		fontWeight: '700',
		color: '#1E293B',
	},
	reviewsCount: {
		fontSize: 11,
		color: '#64748B',
	},
	rateCol: {
		alignItems: 'flex-end',
	},
	rateLabel: {
		fontSize: 10,
		color: '#64748B',
		fontWeight: '600',
		marginBottom: 2,
	},
	ratePrice: {
		fontSize: 16,
		fontWeight: '800',
		color: '#2B6F71',
	},
	metaBox: {
		backgroundColor: '#F8FAFC',
		borderRadius: 12,
		padding: 10,
		gap: 6,
		marginBottom: 12,
	},
	metaRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	metaText: {
		fontSize: 12,
		color: '#475569',
		fontWeight: '600',
		flex: 1,
	},
	badgeRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
		marginBottom: 16,
	},
	badge: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#ECFDF5',
		borderWidth: 1,
		borderColor: '#D1FAE5',
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 6,
	},
	badgeIcon: {
		marginRight: 4,
	},
	badgeText: {
		fontSize: 10,
		fontWeight: '700',
		color: '#065F46',
	},
	actions: {
		flexDirection: 'row',
		gap: 12,
	},
	profileBtn: {
		flex: 1,
		height: 42,
		borderRadius: 10,
		borderWidth: 1.5,
		borderColor: '#CBD5E1',
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#FFFFFF',
	},
	profileBtnText: {
		fontSize: 13,
		fontWeight: '700',
		color: '#475569',
	},
	bookBtn: {
		flex: 1.2,
		height: 42,
		borderRadius: 10,
		backgroundColor: '#2B6F71',
		justifyContent: 'center',
		alignItems: 'center',
	},
	bookBtnText: {
		fontSize: 13,
		fontWeight: '700',
		color: '#FFFFFF',
	},
	emptyContainer: {
		paddingVertical: 60,
		alignItems: 'center',
	},
	emptyText: {
		fontSize: 13,
		color: '#94A3B8',
		marginTop: 8,
		textAlign: 'center',
		paddingHorizontal: 24,
	},
	modalProfileContent: {
		alignItems: 'center',
		paddingVertical: 12,
	},
	modalAvatar: {
		width: 80,
		height: 80,
		borderRadius: 40,
		marginBottom: 12,
	},
	modalName: {
		fontSize: 18,
		fontWeight: '800',
		color: '#16324A',
		marginBottom: 4,
	},
	modalExperience: {
		fontSize: 14,
		color: '#64748B',
		fontWeight: '600',
		marginBottom: 8,
	},
	modalRatingRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		marginBottom: 20,
	},
	modalRatingText: {
		fontSize: 13,
		color: '#1E293B',
		fontWeight: '700',
	},
	modalSectionTitle: {
		fontSize: 13,
		fontWeight: '800',
		color: '#16324A',
		alignSelf: 'flex-start',
		marginTop: 12,
		marginBottom: 4,
		textTransform: 'uppercase',
		letterSpacing: 0.5,
	},
	modalDescText: {
		fontSize: 13,
		color: '#475569',
		alignSelf: 'flex-start',
		lineHeight: 18,
		marginBottom: 12,
	},
	modalBookBtn: {
		backgroundColor: '#2B6F71',
		width: '100%',
		height: 48,
		borderRadius: 12,
		justifyContent: 'center',
		alignItems: 'center',
		marginTop: 24,
	},
	modalBookBtnText: {
		color: '#FFFFFF',
		fontSize: 14,
		fontWeight: '700',
	},
})
