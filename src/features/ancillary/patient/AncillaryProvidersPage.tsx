import React, { useState, useCallback, useEffect, useMemo } from 'react'
import {
	View,
	ScrollView,
	TouchableOpacity,
	Image,
	StyleSheet,
	StatusBar,
	TextInput,
	ActivityIndicator,
	useWindowDimensions,
} from 'react-native'
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import {
	AppScreenHeader,
	AppTypography,
	AppButton,
	AppSkeleton,
	DateStrip,
	SlotChipGrid,
	StatusModal,
} from '../../../components/common'
import {
	AncillaryProvider,
	fetchAvailableAncillarySlots,
	AvailableSlot,
	ProviderWithSlots,
} from '../ancillaryService'
import { ROUTES } from '../../../navigation/routes'

type RouteParams = {
	AncillaryProviders: {
		serviceKey?: string
		serviceLabel?: string
		procedureId?: string | number
		procedureName?: string
		isSelectionMode?: boolean
		selectedNurseId?: string
		latitude?: number
		longitude?: number
		services?: Array<{ id?: string | number }>
	}
}

const formatDateIso = (d: Date): string => {
	const year = d.getFullYear()
	const month = String(d.getMonth() + 1).padStart(2, '0')
	const day = String(d.getDate()).padStart(2, '0')
	return `${year}-${month}-${day}`
}

const formatDisplayDate = (d: Date): string => {
	const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
	const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
	return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`
}

export const AncillaryProvidersPage = () => {
	const navigation = useNavigation<any>()
	const route = useRoute<RouteProp<RouteParams, 'AncillaryProviders'>>()
	const { width } = useWindowDimensions()
	const isTablet = width >= 768

	const isSelectionMode = Boolean(route.params?.isSelectionMode)
	const selectedNurseId = route.params?.selectedNurseId
	const lat = route.params?.latitude || 12.9716
	const lng = route.params?.longitude || 77.5946

	const procedureIds = useMemo(() => {
		const services = route.params?.services
		if (Array.isArray(services) && services.length > 0) {
			return services.map((s) => (s?.id != null ? String(s.id) : '')).filter(Boolean)
		}
		if (route.params?.procedureId != null) return [String(route.params.procedureId)]
		return undefined
	}, [route.params?.services, route.params?.procedureId])

	const [providers, setProviders] = useState<ProviderWithSlots[]>([])
	const [loading, setLoading] = useState<boolean>(true)
	const [error, setError] = useState<string | null>(null)
	const [searchQuery, setSearchQuery] = useState('')

	// Date & 30-min Slot Picker State
	const [selectedDate, setSelectedDate] = useState<Date>(new Date())
	const [expandedNurseId, setExpandedNurseId] = useState<string | null>(null)
	const [selectedSlotMap, setSelectedSlotMap] = useState<Record<string, AvailableSlot | null>>({})

	// Fetch real available nurses + their real saved availability slots for the target date
	const loadProviders = useCallback(async (targetDate: Date) => {
		setLoading(true)
		setError(null)
		try {
			const targetDateStr = formatDateIso(targetDate)
			const res = await fetchAvailableAncillarySlots({
				latitude: lat,
				longitude: lng,
				target_date: targetDateStr,
				procedure_ids: procedureIds,
			})
			setProviders(res.providers || [])
		} catch (err: any) {
			console.log('[AncillaryProvidersPage] Failed to fetch available nurses:', err)
			setError('Unable to load available nurses. Please check your connection and try again.')
			setProviders([])
		} finally {
			setLoading(false)
		}
	}, [lat, lng, procedureIds])

	useEffect(() => {
		void loadProviders(selectedDate)
	}, [selectedDate, loadProviders])

	const filteredNurses = useMemo(() => {
		const q = searchQuery.toLowerCase().trim()
		if (!q) return providers
		return providers.filter((p) => {
			const nameMatch = (p.name || '').toLowerCase().includes(q)
			const specialtyMatch = (p.specialty || '').toLowerCase().includes(q)
			const subspecialtyMatch = (p.subspecialty || '').toLowerCase().includes(q)
			return nameMatch || specialtyMatch || subspecialtyMatch
		})
	}, [providers, searchQuery])

	const handleSelectNurse = (provider: ProviderWithSlots, chosenSlot?: AvailableSlot | null) => {
		const providerId = provider.provider_public_id
		const targetSlot = chosenSlot || selectedSlotMap[providerId]
		const targetDateStr = formatDateIso(selectedDate)

		const selectedNurse: AncillaryProvider = {
			id: providerId,
			name: provider.name || provider.provider_name || 'Healthcare Nurse',
			credentials: provider.specialty || 'Registered Nurse (RN)',
			experience: undefined,
			procedures: [provider.subspecialty].filter((v): v is string => Boolean(v)),
			languages: [],
			distance: provider.distance_km,
			avatar: provider.avatar_url || provider.avatar || '',
			badges: [],
		}

		navigation.navigate(ROUTES.STACK.ANCILLARY_BOOKING_DETAILS, {
			selectedNurse,
			assignmentMode: 'SELECT_NURSE',
			bookingType: targetSlot ? 'SCHEDULED' : undefined,
			scheduledDate: targetSlot ? targetDateStr : undefined,
			scheduledStartTime: targetSlot ? targetSlot.start_time : undefined,
			scheduledEndTime: targetSlot ? targetSlot.end_time : undefined,
		})
	}

	const renderSkeleton = () => (
		<View style={styles.cardsContainer}>
			{[1, 2, 3].map((itemKey) => (
				<View key={itemKey} style={styles.skeletonCard}>
					<View style={styles.skeletonHeader}>
						<AppSkeleton width={56} height={56} borderRadius={28} />
						<View style={styles.skeletonInfo}>
							<AppSkeleton width="65%" height={16} borderRadius={4} style={{ marginBottom: 6 }} />
							<AppSkeleton width="45%" height={12} borderRadius={4} style={{ marginBottom: 6 }} />
							<AppSkeleton width="35%" height={12} borderRadius={4} />
						</View>
					</View>
					<AppSkeleton width={140} height={22} borderRadius={6} style={{ marginTop: 12 }} />
					<AppSkeleton width="100%" height={26} borderRadius={6} style={{ marginTop: 10 }} />
					<AppSkeleton width="100%" height={44} borderRadius={10} style={{ marginTop: 14 }} />
				</View>
			))}
		</View>
	)

	const renderNurseCard = (provider: ProviderWithSlots) => {
		const nurseId = provider.provider_public_id
		const nurseName = provider.name || provider.provider_name || 'Healthcare Nurse'
		const isSelected = isSelectionMode && nurseId === selectedNurseId
		const isExpanded = expandedNurseId === nurseId
		const professionalInfoText = [provider.specialty, provider.subspecialty].filter(Boolean).join(' • ')
		const distanceText =
			provider.distance_km != null
				? `${provider.distance_km} km away${provider.transit_buffer_mins != null ? ` • ~${provider.transit_buffer_mins} min travel buffer` : ''}`
				: null

		const availableSlots = provider.available_slots || []
		const currentSelectedSlot = selectedSlotMap[nurseId] || null

		return (
			<View
				key={nurseId}
				style={[
					styles.card,
					isSelected && styles.cardSelected,
					isTablet && styles.cardTablet,
				]}
			>
				{/* Top Profile Header */}
				<View style={styles.cardHeader}>
					<View style={styles.avatarWrap}>
						<Image
							source={{ uri: provider.avatar_url || provider.avatar }}
							style={styles.avatar}
							resizeMode="cover"
						/>
					</View>
					<View style={styles.nurseInfo}>
						<AppTypography variant="h4" style={styles.name} numberOfLines={1}>
							{nurseName}
						</AppTypography>
						{!!professionalInfoText && (
							<AppTypography variant="caption" style={styles.credentials} numberOfLines={1}>
								{professionalInfoText}
							</AppTypography>
						)}
						{!!distanceText && (
							<View style={styles.experienceRow}>
								<MaterialCommunityIcons name="map-marker-distance" size={13} color="#64748B" />
								<AppTypography variant="caption" style={styles.experienceText}>
									{distanceText}
								</AppTypography>
							</View>
						)}
					</View>
				</View>

				{/* Trust Indicator: Subtle Healthcare Badge */}
				<View style={styles.badgeWrap}>
					<View style={styles.consultedBadge}>
						<Ionicons name="checkmark-circle" size={13} color="#059669" style={styles.badgeIcon} />
						<AppTypography variant="caption" style={styles.consultedBadgeText}>
							Available Nearby
						</AppTypography>
					</View>
				</View>

				{/* Expandable Date & 30-Min Time Slot Picker */}
				<TouchableOpacity
					style={styles.slotExpandToggle}
					onPress={() => setExpandedNurseId(isExpanded ? null : nurseId)}
					activeOpacity={0.8}
				>
					<View style={styles.slotExpandLeft}>
						<Ionicons name="calendar-outline" size={16} color="#0C7C7C" />
						<AppTypography variant="caption" style={styles.slotExpandText}>
							{currentSelectedSlot
								? `Selected: ${currentSelectedSlot.start_time} - ${currentSelectedSlot.end_time}`
								: 'Select 30-Min Slot Availability'}
						</AppTypography>
					</View>
					<Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color="#0C7C7C" />
				</TouchableOpacity>

				{isExpanded && (
					<View style={styles.slotPickerContainer}>
						<AppTypography variant="caption" style={styles.slotPickerHeading}>
							AVAILABLE 30-MIN SLOTS FOR {formatDisplayDate(selectedDate).toUpperCase()}
						</AppTypography>

						<SlotChipGrid
							slots={availableSlots.map((slot) => ({
								value: slot.start_time,
								label: `${slot.start_time} - ${slot.end_time}`,
							}))}
							selectedValue={currentSelectedSlot?.start_time ?? null}
							onSelectValue={(value) => {
								const slot = availableSlots.find((s) => s.start_time === value)
								if (!slot) return
								setSelectedSlotMap((prev) => ({
									...prev,
									[nurseId]: currentSelectedSlot?.start_time === value ? null : slot,
								}))
							}}
							emptyLabel={`No 30-minute slots open for this provider on ${formatDisplayDate(selectedDate)}.`}
						/>
					</View>
				)}

				{/* Primary CTA Button */}
				<View style={styles.cardFooter}>
					<AppButton
						variant="primary"
						onPress={() => handleSelectNurse(provider)}
						style={[styles.selectBtn, isSelected && styles.selectBtnActive]}
						contentStyle={styles.selectBtnContent}
						labelStyle={styles.selectBtnLabel}
					>
						{currentSelectedSlot
							? `Book ${currentSelectedSlot.start_time} Slot with ${nurseName.split(' ')[0]}`
							: isSelected
							? 'Selected Nurse ✓'
							: 'Select Nurse'}
					</AppButton>
				</View>
			</View>
		)
	}

	return (
		<View style={styles.container}>
			<StatusBar barStyle="light-content" backgroundColor="#1F5F68" />

			{/* Shared AppScreenHeader */}
			<AppScreenHeader
				title="Available Ancillary Nurses"
				onBack={() => navigation.goBack()}
			/>

			<ScrollView
				contentContainerStyle={styles.scrollList}
				showsVerticalScrollIndicator={false}
			>
				{/* Contextual Sub-header / Supporting text */}
				<View style={[styles.subHeaderSection, isTablet && styles.sectionTablet]}>
					<AppTypography variant="h3" style={styles.pageHeading}>
						Available Ancillary Nurses
					</AppTypography>
					<AppTypography variant="subtitle" style={styles.pageDescription}>
						Browse nearby certified nurses, pick a target date, and select a 30-minute booking slot.
					</AppTypography>
				</View>

				{/* Target Date Strip Picker */}
				<DateStrip
					selectedDate={selectedDate}
					onSelectDate={setSelectedDate}
					style={[styles.dateStripContainer, isTablet && styles.sectionTablet]}
				/>

				{/* Search Bar - only shown once available nurses have loaded */}
				{!loading && !error && providers.length > 0 && (
					<View style={[styles.searchSection, isTablet && styles.sectionTablet]}>
						<View style={styles.searchBar}>
							<Ionicons name="search-outline" size={18} color="#64748B" />
							<TextInput
								placeholder="Search by nurse name or specialty..."
								placeholderTextColor="#94A3B8"
								value={searchQuery}
								onChangeText={setSearchQuery}
								style={styles.searchInput}
								returnKeyType="search"
							/>
							{searchQuery.length > 0 && (
								<TouchableOpacity
									onPress={() => setSearchQuery('')}
									hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
								>
									<Ionicons name="close-circle" size={18} color="#94A3B8" />
								</TouchableOpacity>
							)}
						</View>
					</View>
				)}

				{/* Main Content State Rendering */}
				{loading ? (
					<View style={isTablet ? styles.sectionTablet : undefined}>
						{renderSkeleton()}
					</View>
				) : error ? (
					<View style={[styles.errorContainer, isTablet && styles.sectionTablet]}>
						<View style={styles.errorIconWrap}>
							<Ionicons name="alert-circle-outline" size={36} color="#DC2626" />
						</View>
						<AppTypography variant="h3" style={styles.errorTitle}>
							Unable to Load Nurses
						</AppTypography>
						<AppTypography variant="caption" style={styles.errorSubtitle}>
							{error}
						</AppTypography>
						<AppButton
							variant="primary"
							onPress={() => void loadProviders(selectedDate)}
							style={styles.retryBtn}
							contentStyle={styles.retryBtnContent}
							labelStyle={styles.retryBtnLabel}
						>
							Retry
						</AppButton>
					</View>
				) : providers.length === 0 ? (
					<View style={[styles.emptyContainer, isTablet && styles.sectionTablet]}>
						<View style={styles.emptyIconCircle}>
							<MaterialCommunityIcons name="account-clock-outline" size={38} color="#0C7C7C" />
						</View>
						<AppTypography variant="h3" style={styles.emptyTitle}>
							No Available Nurses
						</AppTypography>
						<AppTypography variant="body" style={styles.emptySubtitle}>
							No nurses are currently available for the selected date and time. Please try another date or time.
						</AppTypography>
					</View>
				) : filteredNurses.length === 0 ? (
					<View style={[styles.emptyContainer, isTablet && styles.sectionTablet]}>
						<Ionicons name="search-outline" size={40} color="#94A3B8" />
						<AppTypography variant="h4" style={styles.noSearchTitle}>
							No Matching Nurses
						</AppTypography>
						<AppTypography variant="caption" style={styles.noSearchSubtitle}>
							No available nurses match "{searchQuery}".
						</AppTypography>
						<TouchableOpacity
							onPress={() => setSearchQuery('')}
							style={styles.clearSearchBtn}
							activeOpacity={0.7}
						>
							<AppTypography variant="caption" style={styles.clearSearchText}>
								Clear Search
							</AppTypography>
						</TouchableOpacity>
					</View>
				) : (
					<View style={isTablet ? styles.sectionTablet : undefined}>
						{/* List Summary Bar */}
						<View style={styles.summaryRow}>
							<AppTypography variant="subtitle" style={styles.summaryTitle}>
								Available Nurses Near You
							</AppTypography>
							<View style={styles.countBadge}>
								<AppTypography variant="caption" style={styles.countBadgeText}>
									{filteredNurses.length} {filteredNurses.length === 1 ? 'Nurse' : 'Nurses'}
								</AppTypography>
							</View>
						</View>

						{/* Nurse Cards List */}
						<View style={styles.cardsContainer}>
							{filteredNurses.map((provider) => renderNurseCard(provider))}
						</View>
					</View>
				)}
			</ScrollView>
		</View>
	)
}

export default AncillaryProvidersPage

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#F8FAFC',
	},
	scrollList: {
		paddingHorizontal: 16,
		paddingTop: 16,
		paddingBottom: 40,
	},
	sectionTablet: {
		maxWidth: 720,
		alignSelf: 'center',
		width: '100%',
	},
	subHeaderSection: {
		marginBottom: 16,
	},
	pageHeading: {
		color: '#0F172A',
		fontWeight: '700',
		fontSize: 18,
	},
	pageDescription: {
		color: '#64748B',
		marginTop: 4,
		fontSize: 13,
		lineHeight: 18,
	},
	searchSection: {
		marginBottom: 16,
	},
	searchBar: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#FFFFFF',
		borderRadius: 12,
		paddingHorizontal: 14,
		height: 44,
		borderWidth: 1,
		borderColor: '#E2E8F0',
		shadowColor: '#0F172A',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.03,
		shadowRadius: 3,
		elevation: 1,
	},
	searchInput: {
		flex: 1,
		marginLeft: 8,
		fontSize: 13.5,
		color: '#0F172A',
		paddingVertical: 0,
	},
	summaryRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 12,
		paddingHorizontal: 2,
	},
	summaryTitle: {
		fontSize: 14,
		fontWeight: '600',
		color: '#334155',
	},
	countBadge: {
		backgroundColor: '#E6F4F4',
		paddingHorizontal: 10,
		paddingVertical: 3,
		borderRadius: 12,
	},
	countBadgeText: {
		color: '#0C7C7C',
		fontWeight: '700',
		fontSize: 11.5,
	},
	cardsContainer: {
		gap: 14,
	},
	card: {
		backgroundColor: '#FFFFFF',
		borderRadius: 16,
		padding: 16,
		borderWidth: 1,
		borderColor: '#E2E8F0',
		shadowColor: '#0F172A',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 8,
		elevation: 2,
	},
	cardTablet: {
		padding: 20,
	},
	cardSelected: {
		borderColor: '#0C7C7C',
		backgroundColor: '#F0FDFA',
	},
	cardHeader: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	avatarWrap: {
		width: 56,
		height: 56,
		borderRadius: 28,
		backgroundColor: '#E2E8F0',
		overflow: 'hidden',
		borderWidth: 1.5,
		borderColor: '#CCECEB',
	},
	avatar: {
		width: '100%',
		height: '100%',
	},
	nurseInfo: {
		flex: 1,
		marginLeft: 14,
	},
	name: {
		fontWeight: '700',
		color: '#082B45',
		fontSize: 16,
		lineHeight: 20,
	},
	credentials: {
		color: '#0C7C7C',
		fontWeight: '600',
		fontSize: 12.5,
		marginTop: 2,
	},
	experienceRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 3,
		gap: 4,
	},
	experienceText: {
		color: '#64748B',
		fontSize: 12,
	},
	badgeWrap: {
		flexDirection: 'row',
		marginTop: 10,
	},
	consultedBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#ECFDF5',
		paddingHorizontal: 8,
		paddingVertical: 3.5,
		borderRadius: 6,
		borderWidth: 1,
		borderColor: '#A7F3D0',
	},
	badgeIcon: {
		marginRight: 4,
	},
	consultedBadgeText: {
		color: '#065F46',
		fontSize: 11.5,
		fontWeight: '600',
	},
	cardFooter: {
		marginTop: 14,
	},
	selectBtn: {
		borderRadius: 10,
		backgroundColor: '#1D7473',
	},
	selectBtnActive: {
		backgroundColor: '#095C5C',
	},
	selectBtnContent: {
		minHeight: 44,
		justifyContent: 'center',
	},
	selectBtnLabel: {
		fontSize: 14,
		lineHeight: 18,
		fontWeight: '600',
		marginVertical: 0,
	},
	skeletonCard: {
		backgroundColor: '#FFFFFF',
		borderRadius: 16,
		padding: 16,
		borderWidth: 1,
		borderColor: '#E2E8F0',
	},
	skeletonHeader: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	skeletonInfo: {
		flex: 1,
		marginLeft: 14,
	},
	emptyContainer: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 24,
		paddingVertical: 48,
		backgroundColor: '#FFFFFF',
		borderRadius: 16,
		borderWidth: 1,
		borderColor: '#E2E8F0',
		marginTop: 8,
	},
	emptyIconCircle: {
		width: 68,
		height: 68,
		borderRadius: 34,
		backgroundColor: '#E6F4F4',
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 16,
	},
	emptyTitle: {
		color: '#0F172A',
		fontWeight: '700',
		textAlign: 'center',
		fontSize: 17,
	},
	emptySubtitle: {
		marginTop: 8,
		color: '#475569',
		textAlign: 'center',
		fontSize: 13.5,
		lineHeight: 20,
	},
	noSearchTitle: {
		marginTop: 12,
		color: '#0F172A',
		textAlign: 'center',
	},
	noSearchSubtitle: {
		marginTop: 4,
		color: '#64748B',
		textAlign: 'center',
	},
	clearSearchBtn: {
		marginTop: 12,
		paddingVertical: 6,
		paddingHorizontal: 16,
		backgroundColor: '#E6F4F4',
		borderRadius: 8,
	},
	clearSearchText: {
		color: '#0C7C7C',
		fontWeight: '600',
	},
	errorContainer: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 24,
		paddingVertical: 40,
		backgroundColor: '#FFFFFF',
		borderRadius: 16,
		borderWidth: 1,
		borderColor: '#FEE2E2',
		marginTop: 8,
	},
	errorIconWrap: {
		width: 56,
		height: 56,
		borderRadius: 28,
		backgroundColor: '#FEF2F2',
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 12,
	},
	errorTitle: {
		color: '#991B1B',
		fontWeight: '700',
		textAlign: 'center',
	},
	errorSubtitle: {
		marginTop: 6,
		color: '#64748B',
		textAlign: 'center',
		lineHeight: 18,
		maxWidth: 280,
	},
	retryBtn: {
		marginTop: 16,
		borderRadius: 10,
		backgroundColor: '#1D7473',
		minWidth: 120,
	},
	retryBtnContent: {
		minHeight: 40,
		paddingHorizontal: 16,
	},
	retryBtnLabel: {
		fontSize: 13,
		fontWeight: '600',
	},
	dateStripContainer: {
		marginBottom: 14,
	},
	slotExpandToggle: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		backgroundColor: '#F0FDFA',
		borderWidth: 1,
		borderColor: '#CCFBF1',
		borderRadius: 10,
		paddingHorizontal: 12,
		paddingVertical: 10,
		marginTop: 12,
	},
	slotExpandLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		flex: 1,
	},
	slotExpandText: {
		fontSize: 12.5,
		fontWeight: '600',
		color: '#0C7C7C',
	},
	slotPickerContainer: {
		marginTop: 10,
		backgroundColor: '#F8FAFC',
		borderRadius: 10,
		padding: 10,
		gap: 8,
	},
	slotPickerHeading: {
		fontSize: 10.5,
		fontWeight: '700',
		color: '#64748B',
		letterSpacing: 0.5,
	},
})
