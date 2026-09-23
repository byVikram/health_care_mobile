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
	StatusModal,
} from '../../../components/common'
import {
	AncillaryProvider,
	fetchConsultedNursesBackend,
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

	const [consultedNurses, setConsultedNurses] = useState<AncillaryProvider[]>([])
	const [loading, setLoading] = useState<boolean>(true)
	const [error, setError] = useState<string | null>(null)
	const [searchQuery, setSearchQuery] = useState('')

	// Date & 30-min Slot Picker State
	const [selectedDate, setSelectedDate] = useState<Date>(new Date())
	const [expandedNurseId, setExpandedNurseId] = useState<string | null>(null)
	const [providerSlotsMap, setProviderSlotsMap] = useState<Record<string, { loading: boolean; slots: AvailableSlot[] }>>({})
	const [selectedSlotMap, setSelectedSlotMap] = useState<Record<string, AvailableSlot | null>>({})

	// Generate 7 upcoming dates starting today
	const upcomingDates = useMemo(() => {
		return Array.from({ length: 7 }, (_, i) => {
			const d = new Date()
			d.setDate(d.getDate() + i)
			return d
		})
	}, [])

	const loadConsultedNurses = useCallback(async () => {
		setLoading(true)
		setError(null)
		try {
			console.log('[AncillaryProvidersPage] Fetching available ancillary nurses...')
			const data = await fetchConsultedNursesBackend()
			setConsultedNurses(data)
		} catch (err: any) {
			console.log('[AncillaryProvidersPage] Failed to fetch nurses:', err)
			setError('Unable to load available nurses. Please check your connection and try again.')
		} finally {
			setLoading(false)
		}
	}, [])

	useEffect(() => {
		void loadConsultedNurses()
	}, [loadConsultedNurses])

	// Fetch real-time available 30-min slots for target date
	const loadSlotsForDate = useCallback(async (targetDate: Date) => {
		const targetDateStr = formatDateIso(targetDate)
		try {
			const res = await fetchAvailableAncillarySlots({
				latitude: lat,
				longitude: lng,
				target_date: targetDateStr,
			})

			const map: Record<string, { loading: boolean; slots: AvailableSlot[] }> = {}
			if (res.providers && res.providers.length > 0) {
				res.providers.forEach((p) => {
					const id = p.provider_public_id || p.provider_name || 'unknown'
					map[id] = {
						loading: false,
						slots: p.available_slots || [],
					}
				})
			}
			setProviderSlotsMap(map)
		} catch (e) {
			console.log('[AncillaryProvidersPage] Failed to load provider slots for date:', e)
		}
	}, [lat, lng])

	useEffect(() => {
		void loadSlotsForDate(selectedDate)
	}, [selectedDate, loadSlotsForDate])

	const filteredNurses = useMemo(() => {
		const q = searchQuery.toLowerCase().trim()
		if (!q) return consultedNurses
		return consultedNurses.filter((n) => {
			const nameMatch = n.name.toLowerCase().includes(q)
			const credsMatch = n.credentials?.toLowerCase().includes(q)
			const procMatch = n.procedures?.some((proc: string) => proc.toLowerCase().includes(q))
			return nameMatch || credsMatch || procMatch
		})
	}, [consultedNurses, searchQuery])

	const handleSelectNurse = (provider: AncillaryProvider, chosenSlot?: AvailableSlot | null) => {
		const targetSlot = chosenSlot || selectedSlotMap[provider.id]
		const targetDateStr = formatDateIso(selectedDate)

		navigation.navigate(ROUTES.STACK.ANCILLARY_BOOKING_DETAILS, {
			selectedNurse: provider,
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

	const renderNurseCard = (nurse: AncillaryProvider) => {
		const isSelected = isSelectionMode && nurse.id === selectedNurseId
		const isExpanded = expandedNurseId === nurse.id
		const expText =
			nurse.experience != null
				? `${nurse.experience} ${nurse.experience === 1 ? 'year' : 'years'} experience`
				: 'Experienced Registered Nurse'

		const providerSlotData = providerSlotsMap[nurse.id] || null
		const availableSlots = providerSlotData?.slots || [
			{ start_time: '09:00', end_time: '09:30', duration_mins: 30, is_available: true },
			{ start_time: '09:30', end_time: '10:00', duration_mins: 30, is_available: true },
			{ start_time: '10:00', end_time: '10:30', duration_mins: 30, is_available: true },
			{ start_time: '11:00', end_time: '11:30', duration_mins: 30, is_available: true },
			{ start_time: '14:00', end_time: '14:30', duration_mins: 30, is_available: true },
			{ start_time: '16:00', end_time: '16:30', duration_mins: 30, is_available: true },
		]
		const currentSelectedSlot = selectedSlotMap[nurse.id] || null

		return (
			<View
				key={nurse.id}
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
							source={{ uri: nurse.avatar }}
							style={styles.avatar}
							resizeMode="cover"
						/>
					</View>
					<View style={styles.nurseInfo}>
						<AppTypography variant="h4" style={styles.name} numberOfLines={1}>
							{nurse.name}
						</AppTypography>
						<AppTypography variant="caption" style={styles.credentials} numberOfLines={1}>
							{nurse.credentials || 'Registered Nurse (RN)'}
						</AppTypography>
						<View style={styles.experienceRow}>
							<MaterialCommunityIcons name="briefcase-outline" size={13} color="#64748B" />
							<AppTypography variant="caption" style={styles.experienceText}>
								{expText}
							</AppTypography>
						</View>
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

				{/* Relevant Procedures */}
				{nurse.procedures && nurse.procedures.length > 0 && (
					<View style={styles.proceduresBox}>
						<MaterialCommunityIcons name="medical-bag" size={14} color="#0C7C7C" />
						<AppTypography variant="caption" style={styles.proceduresText} numberOfLines={2}>
							{nurse.procedures.join(' • ')}
						</AppTypography>
					</View>
				)}

				{/* Expandable Date & 30-Min Time Slot Picker */}
				<TouchableOpacity
					style={styles.slotExpandToggle}
					onPress={() => setExpandedNurseId(isExpanded ? null : nurse.id)}
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

						{availableSlots.length > 0 ? (
							<View style={styles.slotsGridFlex}>
								{availableSlots.map((slot, sIdx) => {
									const isSlotSelected = currentSelectedSlot?.start_time === slot.start_time
									return (
										<TouchableOpacity
											key={`${slot.start_time}-${sIdx}`}
											style={[styles.slotChip, isSlotSelected && styles.slotChipSelected]}
											onPress={() =>
												setSelectedSlotMap((prev) => ({
													...prev,
													[nurse.id]: isSlotSelected ? null : slot,
												}))
											}
											activeOpacity={0.7}
										>
											<AppTypography
												variant="caption"
												style={[styles.slotChipText, isSlotSelected && styles.slotChipTextSelected]}
											>
												{slot.start_time} - {slot.end_time}
											</AppTypography>
										</TouchableOpacity>
									)
								})}
							</View>
						) : (
							<AppTypography variant="caption" style={styles.noSlotsText}>
								No 30-minute slots open for this provider on {formatDisplayDate(selectedDate)}.
							</AppTypography>
						)}
					</View>
				)}

				{/* Primary CTA Button */}
				<View style={styles.cardFooter}>
					<AppButton
						variant="primary"
						onPress={() => handleSelectNurse(nurse)}
						style={[styles.selectBtn, isSelected && styles.selectBtnActive]}
						contentStyle={styles.selectBtnContent}
						labelStyle={styles.selectBtnLabel}
					>
						{currentSelectedSlot
							? `Book ${currentSelectedSlot.start_time} Slot with ${nurse.name.split(' ')[0]}`
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
				<View style={[styles.dateStripContainer, isTablet && styles.sectionTablet]}>
					<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateScrollContent}>
						{upcomingDates.map((d) => {
							const isSelectedDate = formatDateIso(d) === formatDateIso(selectedDate)
							return (
								<TouchableOpacity
									key={d.toISOString()}
									style={[styles.dateChip, isSelectedDate && styles.dateChipSelected]}
									onPress={() => setSelectedDate(d)}
									activeOpacity={0.8}
								>
									<AppTypography variant="caption" style={[styles.dateChipDay, isSelectedDate && styles.dateChipTextSelected]}>
										{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()]}
									</AppTypography>
									<AppTypography variant="h4" style={[styles.dateChipNum, isSelectedDate && styles.dateChipTextSelected]}>
										{d.getDate()}
									</AppTypography>
								</TouchableOpacity>
							)
						})}
					</ScrollView>
				</View>

				{/* Search Bar - only shown if consulted nurses exist */}
				{!loading && consultedNurses.length > 0 && (
					<View style={[styles.searchSection, isTablet && styles.sectionTablet]}>
						<View style={styles.searchBar}>
							<Ionicons name="search-outline" size={18} color="#64748B" />
							<TextInput
								placeholder="Search by nurse name, credentials, or procedure..."
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
							Unable to Load Previous Nurses
						</AppTypography>
						<AppTypography variant="caption" style={styles.errorSubtitle}>
							{error}
						</AppTypography>
						<AppButton
							variant="primary"
							onPress={() => void loadConsultedNurses()}
							style={styles.retryBtn}
							contentStyle={styles.retryBtnContent}
							labelStyle={styles.retryBtnLabel}
						>
							Retry
						</AppButton>
					</View>
				) : consultedNurses.length === 0 ? (
					<View style={[styles.emptyContainer, isTablet && styles.sectionTablet]}>
						<View style={styles.emptyIconCircle}>
							<MaterialCommunityIcons name="account-clock-outline" size={38} color="#0C7C7C" />
						</View>
						<AppTypography variant="h3" style={styles.emptyTitle}>
							No Previous Nurses
						</AppTypography>
						<AppTypography variant="body" style={styles.emptySubtitle}>
							You haven't consulted a nurse through our service yet.
						</AppTypography>
						<AppTypography variant="caption" style={styles.emptyHelper}>
							Once you complete an ancillary appointment, your previously consulted nurses will appear here for fast rebooking.
						</AppTypography>
					</View>
				) : filteredNurses.length === 0 ? (
					<View style={[styles.emptyContainer, isTablet && styles.sectionTablet]}>
						<Ionicons name="search-outline" size={40} color="#94A3B8" />
						<AppTypography variant="h4" style={styles.noSearchTitle}>
							No Matching Nurses
						</AppTypography>
						<AppTypography variant="caption" style={styles.noSearchSubtitle}>
							No previously consulted nurses match "{searchQuery}".
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
								Available for Rebooking
							</AppTypography>
							<View style={styles.countBadge}>
								<AppTypography variant="caption" style={styles.countBadgeText}>
									{filteredNurses.length} {filteredNurses.length === 1 ? 'Nurse' : 'Nurses'}
								</AppTypography>
							</View>
						</View>

						{/* Nurse Cards List */}
						<View style={styles.cardsContainer}>
							{filteredNurses.map((nurse) => renderNurseCard(nurse))}
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
	proceduresBox: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 12,
		paddingTop: 10,
		borderTopWidth: 1,
		borderTopColor: '#F1F5F9',
		gap: 6,
	},
	proceduresText: {
		color: '#475569',
		fontSize: 12,
		flex: 1,
		lineHeight: 16,
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
	emptyHelper: {
		marginTop: 8,
		color: '#94A3B8',
		textAlign: 'center',
		fontSize: 12,
		lineHeight: 18,
		maxWidth: 280,
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
	dateScrollContent: {
		gap: 8,
		paddingHorizontal: 2,
	},
	dateChip: {
		width: 54,
		paddingVertical: 8,
		borderRadius: 10,
		backgroundColor: '#FFFFFF',
		borderWidth: 1,
		borderColor: '#E2E8F0',
		alignItems: 'center',
		justifyContent: 'center',
	},
	dateChipSelected: {
		backgroundColor: '#0C7C7C',
		borderColor: '#0C7C7C',
	},
	dateChipDay: {
		fontSize: 11,
		color: '#64748B',
	},
	dateChipNum: {
		fontSize: 15,
		fontWeight: '700',
		color: '#0F172A',
		marginTop: 2,
	},
	dateChipTextSelected: {
		color: '#FFFFFF',
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
	slotsGridFlex: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	slotChip: {
		backgroundColor: '#FFFFFF',
		borderWidth: 1,
		borderColor: '#CBD5E1',
		borderRadius: 8,
		paddingHorizontal: 10,
		paddingVertical: 6,
	},
	slotChipSelected: {
		backgroundColor: '#0C7C7C',
		borderColor: '#0C7C7C',
	},
	slotChipText: {
		fontSize: 12,
		fontWeight: '600',
		color: '#334155',
	},
	slotChipTextSelected: {
		color: '#FFFFFF',
	},
	noSlotsText: {
		fontSize: 12,
		color: '#64748B',
		fontStyle: 'italic',
		paddingVertical: 4,
	},
})
