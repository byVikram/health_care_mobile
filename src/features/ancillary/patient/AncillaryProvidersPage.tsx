import React, { useState } from 'react'
import {
	ActivityIndicator,
	FlatList,
	Image,
	ScrollView,
	StyleSheet,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { ANCILLARY_MOCK_DATA, AncillaryProvider } from '../ancillaryService'
import { ROUTES } from '../../../navigation/routes'
import { AppBottomSheet, AppButton, AppScreenHeader, AppTypography, StatusModal } from '../../../components/common'

const FILTERS = ['Available Now', 'Today', 'Tomorrow', 'Distance', 'Experience', 'Rating 4.9+']

export default function AncillaryProvidersPage() {
	const navigation = useNavigation<any>()
	const route = useRoute<any>()
	const { serviceKey, serviceLabel, procedureName, isSelectionMode, selectedNurseId } = route.params || {}

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
		if (isSelectionMode) {
			navigation.navigate(ROUTES.STACK.ANCILLARY_BOOKING_DETAILS, {
				selectedNurse: provider,
				assignmentMode: 'SELECT_NURSE',
			})
			return
		}

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
		const isSelected = isSelectionMode && item.id === selectedNurseId

		return (
			<View style={[styles.card, isSelected && styles.cardSelected]}>
				<View style={styles.cardHeader}>
					<Image source={{ uri: item.avatar }} style={styles.avatar} resizeMode="cover" />
					<View style={styles.providerInfo}>
						<View style={styles.nameRow}>
							<AppTypography variant="subtitle" style={styles.name}>{item.name}</AppTypography>
							<View style={styles.credentialsBadge}>
								<AppTypography variant="caption" style={styles.credentialsText}>{item.credentials}</AppTypography>
							</View>
						</View>
						<AppTypography variant="caption" style={styles.experience}>
							{item.experience} yrs exp • {item.distance} km away
						</AppTypography>
						<View style={styles.ratingRow}>
							<Ionicons name="star" size={13} color="#F59E0B" />
							<AppTypography variant="caption" style={styles.rating}>{item.rating}</AppTypography>
							<AppTypography variant="caption" style={styles.reviewsCount}>({item.reviewsCount})</AppTypography>
						</View>
					</View>
					<View style={styles.rateCol}>
						<AppTypography variant="caption" style={styles.rateLabel}>Starting at</AppTypography>
						<AppTypography variant="h4" style={styles.ratePrice}>₹{item.startingPrice}</AppTypography>
					</View>
				</View>

				{/* Metadata details list */}
				<View style={styles.metaBox}>
					<View style={styles.metaRow}>
						<Ionicons name="medkit-outline" size={13} color="#0C7C7C" />
						<AppTypography variant="caption" style={styles.metaText} numberOfLines={1}>
							{item.procedures.join(' • ')}
						</AppTypography>
					</View>
					<View style={styles.metaRow}>
						<Ionicons name="language-outline" size={13} color="#64748B" />
						<AppTypography variant="caption" style={styles.metaText}>
							Languages: {item.languages.join(', ')}
						</AppTypography>
					</View>
				</View>

				{/* Verifications tags list */}
				<View style={styles.badgeRow}>
					{item.badges.map((badge, idx) => (
						<View key={idx} style={styles.badge}>
							<Ionicons name="checkmark-circle" size={12} color="#047857" style={styles.badgeIcon} />
							<AppTypography variant="caption" style={styles.badgeText}>{badge}</AppTypography>
						</View>
					))}
				</View>

				{/* Action rows buttons using AppButton component */}
				<View style={styles.actions}>
					<AppButton
						variant="outline"
						onPress={() => handleViewProfile(item)}
						style={styles.profileBtn}
						labelStyle={styles.profileBtnLabel}
					>
						View Profile
					</AppButton>
					<AppButton
						variant="primary"
						onPress={() => handleBookNow(item)}
						style={[styles.bookBtn, isSelected && styles.bookBtnSelected]}
						labelStyle={styles.bookBtnLabel}
					>
						{isSelectionMode ? (isSelected ? 'Selected Nurse ✓' : 'Select Nurse') : 'Book Now'}
					</AppButton>
				</View>
			</View>
		)
	}

	return (
		<View style={styles.container}>
			{/* Header */}
			<AppScreenHeader
				title={isSelectionMode ? 'Select a Preferred Nurse' : (serviceLabel ? `Clinicians: ${serviceLabel}` : 'Available Clinicians')}
				onBack={() => navigation.goBack()}
			/>

			{/* Subtitle summary */} 
			<View style={styles.summaryBar}>
				<AppTypography variant="caption" style={styles.summaryText}>{filteredProviders.length} clinicians available</AppTypography>
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
								<AppTypography variant="caption" style={[styles.filterTagText, isActive && styles.filterTagTextActive]}>
									{filter}
								</AppTypography>
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
						<AppTypography variant="body" style={styles.emptyText}>No available clinicians found matching your criteria.</AppTypography>
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

			{/* Provider Profile Details Bottom Sheet */}
			<AppBottomSheet
				visible={showProfileModal}
				onClose={() => setShowProfileModal(false)}
				title="Clinician Information Profile"
				maxHeightRatio={0.85}
				footer={
					selectedProvider ? (
						<View style={styles.sheetFooterRow}>
							<AppButton
								variant="primary"
								formAction
								style={styles.sheetBookBtn}
								onPress={() => {
									setShowProfileModal(false)
									handleBookNow(selectedProvider)
								}}
							>
								{isSelectionMode ? 'Select Preferred Nurse' : 'Book Appointment'}
							</AppButton>
						</View>
					) : undefined
				}
			>
				{selectedProvider && (
					<View style={styles.modalProfileContent}>
						{/* Top Avatar & Name */}
						<View style={styles.modalHeaderBlock}>
							<Image source={{ uri: selectedProvider.avatar }} style={styles.modalAvatar} />
							<AppTypography variant="h3" style={styles.modalName}>
								{selectedProvider.name}
							</AppTypography>
							<View style={styles.modalCredentialsBadge}>
								<AppTypography variant="caption" style={styles.modalCredentialsText}>
									{selectedProvider.credentials} • Verified Clinician
								</AppTypography>
							</View>
						</View>

						{/* Quick 3-metric stats row */}
						<View style={styles.modalStatsRow}>
							<View style={styles.modalStatBox}>
								<AppTypography variant="subtitle" style={styles.modalStatVal}>
									{selectedProvider.experience} Yrs
								</AppTypography>
								<AppTypography variant="caption" style={styles.modalStatLabel}>
									Experience
								</AppTypography>
							</View>
							<View style={styles.modalStatDivider} />
							<View style={styles.modalStatBox}>
								<View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
									<Ionicons name="star" size={14} color="#F59E0B" />
									<AppTypography variant="subtitle" style={styles.modalStatVal}>
										{selectedProvider.rating}
									</AppTypography>
								</View>
								<AppTypography variant="caption" style={styles.modalStatLabel}>
									{selectedProvider.reviewsCount} Reviews
								</AppTypography>
							</View>
							<View style={styles.modalStatDivider} />
							<View style={styles.modalStatBox}>
								<AppTypography variant="subtitle" style={styles.modalStatVal}>
									{selectedProvider.distance} km
								</AppTypography>
								<AppTypography variant="caption" style={styles.modalStatLabel}>
									Distance
								</AppTypography>
							</View>
						</View>

						{/* Procedures Offered */}
						<View style={styles.modalSection}>
							<AppTypography variant="caption" style={styles.modalSectionTitle}>
								Procedures Offered
							</AppTypography>
							<View style={styles.modalPillsContainer}>
								{selectedProvider.procedures.map((p, idx) => (
									<View key={idx} style={styles.modalPill}>
										<Ionicons name="medkit-outline" size={12} color="#0C7C7C" />
										<AppTypography variant="caption" style={styles.modalPillText}>
											{p}
										</AppTypography>
									</View>
								))}
							</View>
						</View>

						{/* Languages Spoken */}
						<View style={styles.modalSection}>
							<AppTypography variant="caption" style={styles.modalSectionTitle}>
								Languages Spoken
							</AppTypography>
							<View style={styles.modalPillsContainer}>
								{selectedProvider.languages.map((lang, idx) => (
									<View key={idx} style={[styles.modalPill, { backgroundColor: '#F1F5F9', borderColor: '#E2E8F0' }]}>
										<Ionicons name="chatbubble-outline" size={12} color="#64748B" />
										<AppTypography variant="caption" style={[styles.modalPillText, { color: '#475569' }]}>
											{lang}
										</AppTypography>
									</View>
								))}
							</View>
						</View>

						{/* Pricing Info */}
						<View style={styles.modalPriceBox}>
							<AppTypography variant="caption" style={styles.modalPriceLabel}>
								Starting Consultation / Procedure Rate:
							</AppTypography>
							<AppTypography variant="h3" style={styles.modalPriceValue}>
								₹{selectedProvider.startingPrice}
							</AppTypography>
						</View>
					</View>
				)}
			</AppBottomSheet>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#F8FAFC',
	},
	summaryBar: {
		paddingHorizontal: 16,
		paddingVertical: 10,
		borderBottomWidth: 1,
		borderBottomColor: '#F1F5F9',
		backgroundColor: '#FFFFFF',
	},
	summaryText: {
		fontSize: 12.5,
		fontWeight: '600',
		color: '#475569',
	},
	searchBarContainer: {
		paddingHorizontal: 16,
		paddingVertical: 10,
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
		height: 42,
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
		paddingBottom: 10,
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
		paddingVertical: 6,
		borderRadius: 16,
		borderWidth: 1,
		borderColor: '#E2E8F0',
	},
	filterTagActive: {
		backgroundColor: '#0C7C7C',
		borderColor: '#0C7C7C',
	},
	filterTagText: {
		fontSize: 11.5,
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
		gap: 12,
		paddingBottom: 40,
	},
	card: {
		backgroundColor: '#FFFFFF',
		borderRadius: 14,
		padding: 14,
		borderWidth: 1,
		borderColor: '#E2E8F0',
		shadowColor: '#0F172A',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.04,
		shadowRadius: 6,
		elevation: 1.5,
	},
	cardSelected: {
		borderColor: '#0C7C7C',
		backgroundColor: '#F0FDFA',
	},
	cardHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 12,
	},
	avatar: {
		width: 52,
		height: 52,
		borderRadius: 16,
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
		fontSize: 14.5,
		fontWeight: '700',
		color: '#0F172A',
	},
	credentialsBadge: {
		backgroundColor: '#CCFBF1',
		paddingHorizontal: 6,
		paddingVertical: 1.5,
		borderRadius: 4,
	},
	credentialsText: {
		fontSize: 10,
		fontWeight: '700',
		color: '#0F766E',
	},
	experience: {
		fontSize: 11.5,
		color: '#64748B',
		marginBottom: 3,
	},
	ratingRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 3,
	},
	rating: {
		fontSize: 11.5,
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
		fontSize: 9.5,
		color: '#64748B',
		fontWeight: '500',
		marginBottom: 1,
	},
	ratePrice: {
		fontSize: 15,
		fontWeight: '800',
		color: '#0C7C7C',
	},
	metaBox: {
		backgroundColor: '#F8FAFC',
		borderRadius: 10,
		padding: 8,
		gap: 5,
		marginBottom: 10,
	},
	metaRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	metaText: {
		fontSize: 11.5,
		color: '#475569',
		fontWeight: '500',
		flex: 1,
	},
	badgeRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 6,
		marginBottom: 12,
	},
	badge: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#ECFDF5',
		borderWidth: 1,
		borderColor: '#D1FAE5',
		paddingHorizontal: 7,
		paddingVertical: 3,
		borderRadius: 6,
	},
	badgeIcon: {
		marginRight: 3,
	},
	badgeText: {
		fontSize: 9.5,
		fontWeight: '700',
		color: '#065F46',
	},
	actions: {
		flexDirection: 'row',
		gap: 10,
		alignItems: 'center',
	},
	profileBtn: {
		flex: 1,
		borderRadius: 10,
		borderColor: '#CBD5E1',
	},
	profileBtnLabel: {
		fontSize: 12.5,
		fontWeight: '600',
		color: '#475569',
		marginHorizontal: 0,
	},
	bookBtn: {
		flex: 1.3,
		borderRadius: 10,
		backgroundColor: '#0C7C7C',
	},
	bookBtnSelected: {
		backgroundColor: '#047857',
	},
	bookBtnLabel: {
		fontSize: 12.5,
		fontWeight: '700',
		color: '#FFFFFF',
		marginHorizontal: 0,
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
	/* Profile Modal Content Styles */
	modalProfileContent: {
		paddingVertical: 4,
	},
	modalHeaderBlock: {
		alignItems: 'center',
		paddingBottom: 14,
		borderBottomWidth: 1,
		borderBottomColor: '#F1F5F9',
	},
	modalAvatar: {
		width: 64,
		height: 64,
		borderRadius: 32,
		borderWidth: 2,
		borderColor: '#E2E8F0',
		marginBottom: 8,
		backgroundColor: '#F1F5F9',
	},
	modalName: {
		fontSize: 16.5,
		fontWeight: '700',
		color: '#0F172A',
		marginBottom: 3,
	},
	modalCredentialsBadge: {
		backgroundColor: '#CCFBF1',
		paddingHorizontal: 8,
		paddingVertical: 2.5,
		borderRadius: 6,
	},
	modalCredentialsText: {
		fontSize: 11,
		fontWeight: '700',
		color: '#0F766E',
	},
	modalStatsRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-around',
		backgroundColor: '#F8FAFC',
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#E2E8F0',
		paddingVertical: 10,
		paddingHorizontal: 6,
		marginVertical: 12,
	},
	modalStatBox: {
		alignItems: 'center',
		flex: 1,
	},
	modalStatDivider: {
		width: 1,
		height: 24,
		backgroundColor: '#E2E8F0',
	},
	modalStatVal: {
		fontSize: 14,
		fontWeight: '700',
		color: '#0F172A',
		marginBottom: 1,
	},
	modalStatLabel: {
		fontSize: 10.5,
		color: '#64748B',
	},
	modalSection: {
		marginBottom: 12,
	},
	modalSectionTitle: {
		fontSize: 11,
		fontWeight: '700',
		color: '#64748B',
		textTransform: 'uppercase',
		letterSpacing: 0.5,
		marginBottom: 6,
	},
	modalPillsContainer: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 6,
	},
	modalPill: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		backgroundColor: '#F0FDFA',
		borderWidth: 1,
		borderColor: '#CCFBF1',
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 6,
	},
	modalPillText: {
		fontSize: 11,
		fontWeight: '600',
		color: '#0F766E',
	},
	modalPriceBox: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		backgroundColor: '#F8FAFC',
		borderRadius: 10,
		paddingHorizontal: 12,
		paddingVertical: 10,
		marginTop: 4,
		marginBottom: 16,
		borderWidth: 1,
		borderColor: '#E2E8F0',
	},
	modalPriceLabel: {
		fontSize: 11.5,
		color: '#475569',
		fontWeight: '500',
	},
	modalPriceValue: {
		fontSize: 16,
		fontWeight: '800',
		color: '#0C7C7C',
	},
	sheetFooterRow: {
		width: '100%',
	},
	sheetBookBtn: {
		width: '100%',
		borderRadius: 10,
		marginTop: 0,
	},
})
