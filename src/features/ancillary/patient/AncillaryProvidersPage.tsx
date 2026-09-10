import React, { useState, useCallback, useEffect, useMemo } from 'react'
import {
	View,
	ScrollView,
	TouchableOpacity,
	Image,
	StyleSheet,
	StatusBar,
	TextInput,
	useWindowDimensions,
} from 'react-native'
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import {
	AppScreenHeader,
	AppTypography,
	AppButton,
	AppSkeleton,
} from '../../../components/common'
import {
	AncillaryProvider,
	fetchConsultedNursesBackend,
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
	}
}

export const AncillaryProvidersPage = () => {
	const navigation = useNavigation<any>()
	const route = useRoute<RouteProp<RouteParams, 'AncillaryProviders'>>()
	const { width } = useWindowDimensions()
	const isTablet = width >= 768

	const isSelectionMode = Boolean(route.params?.isSelectionMode)
	const selectedNurseId = route.params?.selectedNurseId

	const [consultedNurses, setConsultedNurses] = useState<AncillaryProvider[]>([])
	const [loading, setLoading] = useState<boolean>(true)
	const [error, setError] = useState<string | null>(null)
	const [searchQuery, setSearchQuery] = useState('')

	const loadConsultedNurses = useCallback(async () => {
		setLoading(true)
		setError(null)
		try {
			console.log('[AncillaryProvidersPage] Fetching previously consulted nurses...')
			const data = await fetchConsultedNursesBackend()
			console.log('[AncillaryProvidersPage] Consulted nurses loaded:', data.length)
			setConsultedNurses(data)
		} catch (err: any) {
			console.log('[AncillaryProvidersPage] Failed to fetch consulted nurses:', err)
			setError('Unable to load your previous nurses. Please check your connection and try again.')
		} finally {
			setLoading(false)
		}
	}, [])

	useEffect(() => {
		void loadConsultedNurses()
	}, [loadConsultedNurses])

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

	const handleSelectNurse = (provider: AncillaryProvider) => {
		navigation.navigate(ROUTES.STACK.ANCILLARY_BOOKING_DETAILS, {
			selectedNurse: provider,
			assignmentMode: 'SELECT_NURSE',
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
		const expText =
			nurse.experience != null
				? `${nurse.experience} ${nurse.experience === 1 ? 'year' : 'years'} experience`
				: 'Experienced Registered Nurse'

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
							Previously Consulted
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

				{/* Primary CTA Button */}
				<View style={styles.cardFooter}>
					<AppButton
						variant="primary"
						onPress={() => handleSelectNurse(nurse)}
						style={[styles.selectBtn, isSelected && styles.selectBtnActive]}
						contentStyle={styles.selectBtnContent}
						labelStyle={styles.selectBtnLabel}
					>
						{isSelected ? 'Selected Nurse ✓' : 'Select Nurse'}
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
				title="Previously Consulted Nurses"
				onBack={() => navigation.goBack()}
			/>

			<ScrollView
				contentContainerStyle={styles.scrollList}
				showsVerticalScrollIndicator={false}
			>
				{/* Contextual Sub-header / Supporting text */}
				<View style={[styles.subHeaderSection, isTablet && styles.sectionTablet]}>
					<AppTypography variant="h3" style={styles.pageHeading}>
						Previously Consulted Nurses
					</AppTypography>
					<AppTypography variant="subtitle" style={styles.pageDescription}>
						Choose a nurse you've consulted before for your next care appointment.
					</AppTypography>
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
})
