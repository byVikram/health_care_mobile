import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
	ActivityIndicator,
	FlatList,
	StyleSheet,
	TextInput,
	TouchableOpacity,
	View,
	useWindowDimensions,
} from 'react-native'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import Toast from 'react-native-toast-message'
import { useNavigation } from '@react-navigation/native'
import type { NavigationProp } from '@react-navigation/native'

import { AppTypography } from '../../components/common'
import { FavouriteDoctor, getDoctors, getFavouriteDoctors, toggleFavouriteDoctor } from '../doctor/doctorService'
import { DoctorSearchItem } from '../../types/doctor-search'
import MyDoctorCard, { DoctorCardItem } from './components/MyDoctorCard'
import { ROUTES } from '../../navigation/routes'
import type { AppStackParamList } from '../../navigation/types'

type DoctorRow = DoctorCardItem & {
	id: string
	isVerified?: boolean
}

type HeaderProps = {
	searchQuery: string
	searchLoading: boolean
	isSearching: boolean
	searchResults: DoctorRow[] // all results (including saved)
	favouriteIds: Set<string>
	favouritesCount: number
	favLoading: boolean
	hasFavourites: boolean
	togglingIds: Set<string>
	onSearchChange: (value: string) => void
	onToggleSaved: (doctor: DoctorRow) => void
	onPressDoctor?: (doctor: DoctorRow) => void
}

function mapDoctorToRow(doctor: FavouriteDoctor | DoctorSearchItem): DoctorRow {
	const experienceYears = doctor.experience_years

	return {
		id: doctor.id,
		image: doctor.avatar_s3_key || '',
		name: doctor.name,
		speciality: doctor.specialities?.[0] || 'General Physician',
		experience: experienceYears != null ? `${experienceYears} yrs exp` : 'Experience not available',
		location: doctor.location || '',
		isVerified: doctor.is_verified,
	}
}

const DoctorsListHeader = React.memo(function DoctorsListHeader({
	searchQuery,
	searchLoading,
	isSearching,
	searchResults,
	favouriteIds,
	favouritesCount,
	favLoading,
	hasFavourites,
	togglingIds,
	onSearchChange,
	onToggleSaved,
	onPressDoctor,
}: HeaderProps) {
	return (
		<View style={styles.headerContent}>
			<View style={styles.searchSection}>
				<View style={styles.searchBar}>
					<MaterialCommunityIcons name="magnify" size={20} color="#64748b" style={styles.searchIcon} />
					<TextInput
						value={searchQuery}
						onChangeText={onSearchChange}
						placeholder="Search doctor by name, speciality..."
						placeholderTextColor="#94a3b8"
						style={styles.searchInput}
						autoCorrect={false}
						returnKeyType="search"
					/>
					{searchQuery.length > 0 ? (
						<TouchableOpacity
							style={styles.clearButton}
							onPress={() => onSearchChange('')}
							activeOpacity={0.7}
							hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
						>
							<MaterialCommunityIcons name="close-circle" size={18} color="#94a3b8" />
						</TouchableOpacity>
					) : (
						<View style={styles.searchBarEnd} />
					)}
				</View>
			</View>

			{isSearching && (
				<View style={styles.resultsSection}>
					<View style={styles.sectionHeaderRow}>
						<AppTypography variant="caption" style={styles.sectionTitle}>
							SEARCH RESULTS
						</AppTypography>
						{!searchLoading && (
							<View style={styles.countBadge}>
								<AppTypography variant="caption" style={styles.countBadgeText}>
									{searchResults.length}
								</AppTypography>
							</View>
						)}
					</View>

					{searchLoading ? (
						<View style={styles.loadingBlock}>
							<ActivityIndicator size="small" color="#1f5f68" />
							<AppTypography variant="caption" style={styles.loadingText}>
								Searching doctors...
							</AppTypography>
						</View>
					) : searchResults.length === 0 ? (
						<View style={styles.searchEmptyCard}>
							<MaterialCommunityIcons name="account-search-outline" size={36} color="#94a3b8" />
							<AppTypography variant="caption" style={styles.searchEmptyTitle}>
								No doctors found
							</AppTypography>
							<AppTypography variant="caption" style={styles.searchEmptySub}>
								No matches found for "{searchQuery.trim()}"
							</AppTypography>
						</View>
					) : (
						<View style={styles.inlineList}>
							{searchResults.map((doctor, index) => (
								<View key={doctor.id}>
									<MyDoctorCard
										{...doctor}
										saved={favouriteIds.has(doctor.id)}
										disabled={togglingIds.has(doctor.id)}
										onToggleSaved={() => onToggleSaved(doctor)}
										onPress={() => onPressDoctor?.(doctor)}
									/>
									{index < searchResults.length - 1 && <View style={styles.cardGap} />}
								</View>
							))}
						</View>
					)}
					<View style={styles.searchDivider} />
				</View>
			)}

			<View style={styles.savedHeader}>
				<View style={styles.sectionHeaderRow}>
					<AppTypography variant="caption" style={styles.sectionTitle}>
						SAVED DOCTORS
					</AppTypography>
					<View style={styles.savedBadge}>
						<AppTypography variant="caption" style={styles.savedBadgeText}>
							{favouritesCount}
						</AppTypography>
					</View>
				</View>
			</View>

			{favLoading && (
				<View style={styles.loadingBlock}>
					<ActivityIndicator size="small" color="#1f5f68" />
					<AppTypography variant="caption" style={styles.loadingText}>
						Loading saved doctors...
					</AppTypography>
				</View>
			)}

			{!favLoading && !hasFavourites && (
				<View style={styles.emptyBlock}>
					<View style={styles.emptyIconCircle}>
						<MaterialCommunityIcons name="heart-outline" size={32} color="#1f5f68" />
					</View>
					<AppTypography variant="h4" style={styles.emptyTitle}>
						No Favorite Doctors Yet
					</AppTypography>
					<AppTypography variant="caption" style={styles.emptySubText}>
						Doctors you mark as favorite will appear here for fast access and direct booking.
					</AppTypography>
				</View>
			)}
		</View>
	)
})

export default function MyDoctorPage() {
	const navigation = useNavigation<NavigationProp<AppStackParamList>>()
	const { width } = useWindowDimensions()
	const isTablet = width >= 768

	const [searchQuery, setSearchQuery] = useState('')
	const [searchResults, setSearchResults] = useState<DoctorRow[]>([])
	const [searchLoading, setSearchLoading] = useState(false)
	const [favouriteIds, setFavouriteIds] = useState<Set<string>>(new Set())
	const [favourites, setFavourites] = useState<DoctorRow[]>([])
	const [favLoading, setFavLoading] = useState(true)
	const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set())
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const togglingIdsRef = useRef<Set<string>>(new Set())

	const handleDoctorPress = useCallback(
		(doctor: DoctorRow) => {
			navigation.navigate(ROUTES.STACK.DOCTOR_DETAIL, { id: doctor.id })
		},
		[navigation]
	)

	const trimmedSearch = searchQuery.trim()
	const isSearching = trimmedSearch.length >= 3

	useEffect(() => {
		getFavouriteDoctors()
			.then((res) => {
				if (res.success) {
					setFavouriteIds(new Set(res.data.favourite_ids))
					setFavourites(res.data.favourites.map(mapDoctorToRow))
				}
			})
			.catch(() => {
				Toast.show({
					type: 'error',
					text1: 'Error',
					text2: 'Failed to load favourites',
				})
			})
			.finally(() => setFavLoading(false))
	}, [])

	useEffect(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current)

		if (!isSearching) {
			setSearchResults([])
			setSearchLoading(false)
			return
		}

		setSearchLoading(true)
		debounceRef.current = setTimeout(async () => {
			try {
				const res = await getDoctors({
					search: trimmedSearch || undefined,
					limit: 20,
				})

				if (res.success) {
					// ✅ Show ALL results (including doctors already favourited)
					setSearchResults(res.data.map(mapDoctorToRow))
				}
			} catch {
				Toast.show({
					type: 'error',
					text1: 'Error',
					text2: 'Search failed',
				})
			} finally {
				setSearchLoading(false)
			}
		}, 400)

		return () => {
			if (debounceRef.current) clearTimeout(debounceRef.current)
		}
	}, [isSearching, trimmedSearch])

	const handleToggleSaved = useCallback(
		async (doctor: DoctorRow) => {
			const doctorId = doctor.id

			if (togglingIdsRef.current.has(doctorId)) return

			togglingIdsRef.current = new Set(togglingIdsRef.current).add(doctorId)
			setTogglingIds(new Set(togglingIdsRef.current))

			const wasFavourite = favouriteIds.has(doctorId)

			// Optimistic update
			setFavouriteIds((current) => {
				const next = new Set(current)
				if (wasFavourite) {
					next.delete(doctorId)
				} else {
					next.add(doctorId)
				}
				return next
			})

			setFavourites((current) => {
				if (wasFavourite) {
					return current.filter((item) => item.id !== doctorId)
				}
				return current.some((item) => item.id === doctorId) ? current : [...current, doctor]
			})

			try {
				const res = await toggleFavouriteDoctor(doctorId)

				if (res.success === false) {
					throw new Error(res.message || 'Failed to update favourites')
				}

				const isFavourite = res.data?.action ? res.data.action === 'added' : !wasFavourite
				const nextIds = new Set(res.data?.favourite_ids ?? [])

				setFavouriteIds((current) => {
					if (nextIds.size > 0 || res.data?.favourite_ids) {
						return nextIds
					}
					const next = new Set(current)
					if (isFavourite) {
						next.add(doctorId)
					} else {
						next.delete(doctorId)
					}
					return next
				})
				setFavourites((current) => {
					if (res.data?.favourites) {
						return res.data.favourites.map(mapDoctorToRow)
					}
					if (!isFavourite) {
						return current.filter((item) => item.id !== doctorId)
					}
					return current.some((item) => item.id === doctorId) ? current : [...current, doctor]
				})

				Toast.show({
					type: 'success',
					text1: 'Success',
					text2: isFavourite ? 'Added to favourites' : 'Removed from favourites',
				})
			} catch {
				// Rollback optimistic update
				setFavouriteIds((current) => {
					const next = new Set(current)
					if (wasFavourite) {
						next.add(doctorId)
					} else {
						next.delete(doctorId)
					}
					return next
				})
				setFavourites((current) => {
					if (wasFavourite) {
						return current.some((item) => item.id === doctorId) ? current : [...current, doctor]
					}
					return current.filter((item) => item.id !== doctorId)
				})

				Toast.show({
					type: 'error',
					text1: 'Error',
					text2: 'Failed to update favourites',
				})
			} finally {
				const nextTogglingIds = new Set(togglingIdsRef.current)
				nextTogglingIds.delete(doctorId)
				togglingIdsRef.current = nextTogglingIds
				setTogglingIds(nextTogglingIds)
			}
		},
		[favouriteIds]
	)

	// No filtering – search results already contain everything
	const allSearchResults = searchResults

	const renderDoctorCard = useCallback(
		({ item }: { item: DoctorRow }) => (
			<MyDoctorCard
				{...item}
				saved={favouriteIds.has(item.id)}
				disabled={togglingIds.has(item.id)}
				onToggleSaved={() => handleToggleSaved(item)}
				onPress={() => handleDoctorPress(item)}
			/>
		),
		[favouriteIds, handleDoctorPress, handleToggleSaved, togglingIds]
	)

	const listHeader = useMemo(
		() => (
			<DoctorsListHeader
				searchQuery={searchQuery}
				searchLoading={searchLoading}
				isSearching={isSearching}
				searchResults={allSearchResults}
				favouriteIds={favouriteIds}
				favouritesCount={favourites.length}
				favLoading={favLoading}
				hasFavourites={favourites.length > 0}
				togglingIds={togglingIds}
				onSearchChange={setSearchQuery}
				onToggleSaved={handleToggleSaved}
				onPressDoctor={handleDoctorPress}
			/>
		),
		[
			searchQuery,
			searchLoading,
			isSearching,
			allSearchResults,
			favouriteIds,
			favourites.length,
			favLoading,
			togglingIds,
			handleToggleSaved,
			handleDoctorPress,
		]
	)

	return (
		<View style={styles.container}>
			<FlatList
				data={favLoading ? [] : favourites}
				keyExtractor={(item) => item.id}
				renderItem={renderDoctorCard}
				ListHeaderComponent={listHeader}
				ItemSeparatorComponent={() => <View style={styles.cardGap} />}
				contentContainerStyle={[styles.listContent, isTablet && styles.listContentTablet]}
				keyboardShouldPersistTaps="always"
				showsVerticalScrollIndicator={false}
			/>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f5f9fa',
	},
	listContent: {
		paddingHorizontal: 16,
		paddingTop: 16,
		paddingBottom: 28,
	},
	listContentTablet: {
		maxWidth: 760,
		alignSelf: 'center',
		width: '100%',
	},
	headerContent: {
		paddingBottom: 0,
	},
	searchSection: {
		paddingBottom: 14,
	},
	searchBar: {
		height: 48,
		borderRadius: 14,
		borderWidth: 1,
		borderColor: '#e2e8f0',
		backgroundColor: '#ffffff',
		paddingHorizontal: 14,
		flexDirection: 'row',
		alignItems: 'center',
		shadowColor: '#0f172a',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 6,
		elevation: 2,
	},
	searchIcon: {
		marginRight: 8,
	},
	searchInput: {
		flex: 1,
		height: 48,
		paddingVertical: 0,
		color: '#1e293b',
		fontSize: 14,
	},
	clearButton: {
		padding: 4,
		alignItems: 'center',
		justifyContent: 'center',
	},
	searchBarEnd: {
		width: 4,
	},
	resultsSection: {
		paddingTop: 2,
		paddingBottom: 4,
	},
	sectionHeaderRow: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	sectionTitle: {
		color: '#1f5f68',
		fontSize: 12,
		fontWeight: '700',
		letterSpacing: 0.5,
	},
	countBadge: {
		minWidth: 22,
		height: 20,
		borderRadius: 10,
		paddingHorizontal: 6,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#e2e8f0',
		marginLeft: 8,
	},
	countBadgeText: {
		color: '#475569',
		fontSize: 11,
		fontWeight: '700',
	},
	searchEmptyCard: {
		backgroundColor: '#ffffff',
		borderRadius: 14,
		paddingVertical: 24,
		paddingHorizontal: 16,
		alignItems: 'center',
		marginTop: 10,
		borderWidth: 1,
		borderColor: '#e2e8f0',
	},
	searchEmptyTitle: {
		color: '#334155',
		fontSize: 14,
		fontWeight: '600',
		marginTop: 8,
	},
	searchEmptySub: {
		color: '#64748b',
		fontSize: 12,
		textAlign: 'center',
		marginTop: 4,
	},
	searchDivider: {
		height: 1,
		backgroundColor: '#e2e8f0',
		marginTop: 16,
		marginBottom: 6,
	},
	savedHeader: {
		marginTop: 4,
		marginBottom: 12,
	},
	savedBadge: {
		minWidth: 24,
		height: 22,
		borderRadius: 11,
		paddingHorizontal: 8,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#e6f3f4',
		marginLeft: 8,
	},
	savedBadgeText: {
		color: '#1f5f68',
		fontSize: 12,
		fontWeight: '700',
	},
	inlineList: {
		marginTop: 10,
	},
	cardGap: {
		height: 12,
	},
	loadingBlock: {
		paddingVertical: 20,
		alignItems: 'center',
		justifyContent: 'center',
	},
	loadingText: {
		color: '#64748b',
		fontSize: 12,
		marginTop: 6,
	},
	emptyBlock: {
		backgroundColor: '#ffffff',
		borderRadius: 16,
		paddingVertical: 36,
		paddingHorizontal: 24,
		alignItems: 'center',
		marginTop: 4,
		borderWidth: 1,
		borderColor: '#e2e8f0',
		shadowColor: '#0f172a',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.04,
		shadowRadius: 8,
		elevation: 1,
	},
	emptyIconCircle: {
		width: 64,
		height: 64,
		borderRadius: 32,
		backgroundColor: '#e6f3f4',
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 14,
	},
	emptyTitle: {
		fontSize: 16,
		fontWeight: '700',
		color: '#1e293b',
		marginBottom: 6,
		textAlign: 'center',
	},
	emptySubText: {
		color: '#64748b',
		fontSize: 13,
		textAlign: 'center',
		lineHeight: 19,
		maxWidth: 280,
	},
})
