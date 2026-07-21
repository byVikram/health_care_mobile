import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, FlatList, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native'
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
					<MaterialCommunityIcons name="magnify" size={22} color="#7d8b94" />
					<TextInput
						value={searchQuery}
						onChangeText={onSearchChange}
						placeholder="Search doctor by name"
						placeholderTextColor="#8b9aa2"
						style={styles.searchInput}
						autoCorrect={false}
						returnKeyType="search"
					/>
					<TouchableOpacity style={styles.micButton} activeOpacity={0.75}>
						<MaterialCommunityIcons name="microphone-outline" size={22} color="#245f67" />
					</TouchableOpacity>
				</View>
			</View>

			{isSearching && (
				<View style={styles.resultsSection}>
					<AppTypography variant="caption" style={styles.sectionTitle}>
						SEARCH RESULTS
					</AppTypography>

					{searchLoading ? (
						<View style={styles.loadingBlock}>
							<ActivityIndicator size="small" color="#245f67" />
						</View>
					) : searchResults.length === 0 ? (
						<AppTypography variant="caption" style={styles.emptyText}>
							No doctors found
						</AppTypography>
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
				</View>
			)}

			<View style={styles.savedHeader}>
				<AppTypography variant="caption" style={styles.sectionTitle}>
					SAVED
				</AppTypography>
				<View style={styles.savedBadge}>
					<AppTypography variant="caption" style={styles.savedBadgeText}>
						{favouritesCount}
					</AppTypography>
				</View>
			</View>

			{favLoading && (
				<View style={styles.loadingBlock}>
					<ActivityIndicator size="small" color="#245f67" />
				</View>
			)}

			{!favLoading && !hasFavourites && (
				<View style={styles.emptyBlock}>
					<MaterialCommunityIcons name="bookmark-outline" size={38} color="#8ca0a9" />
					<AppTypography variant="caption" style={styles.emptyText}>
						No favourite doctors yet
					</AppTypography>
					<AppTypography variant="caption" style={styles.emptySubText}>
						Use the search bar above to find and save doctors
					</AppTypography>
				</View>
			)}
		</View>
	)
})

export default function MyDoctorPage() {
	const navigation = useNavigation<NavigationProp<AppStackParamList>>()
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
				contentContainerStyle={styles.listContent}
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
		paddingTop: 8,
		paddingBottom: 0,
	},
	headerContent: {
		paddingBottom: 0,
	},
	searchSection: {
		paddingBottom: 12,
		backgroundColor: '#f5f9fa',
	},
	searchBar: {
		minHeight: 48,
		borderRadius: 14,
		borderWidth: 1,
		borderColor: '#d9e6eb',
		backgroundColor: '#ffffff',
		paddingLeft: 14,
		paddingRight: 8,
		flexDirection: 'row',
		alignItems: 'center',
		shadowColor: '#12343b',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 8,
		elevation: 2,
	},
	searchInput: {
		flex: 1,
		minHeight: 48,
		paddingHorizontal: 10,
		color: '#22343d',
		fontSize: 14,
	},
	micButton: {
		width: 38,
		height: 38,
		borderRadius: 19,
		alignItems: 'center',
		justifyContent: 'center',
	},
	resultsSection: {
		paddingTop: 4,
		paddingBottom: 16,
	},
	savedHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 4,
		marginBottom: 12,
	},
	sectionTitle: {
		color: '#4e6670',
		fontSize: 12,
		fontWeight: '700',
		letterSpacing: 0,
	},
	savedBadge: {
		minWidth: 24,
		height: 22,
		borderRadius: 11,
		paddingHorizontal: 7,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#dcecee',
		marginLeft: 8,
	},
	savedBadgeText: {
		color: '#245f67',
		fontSize: 12,
		fontWeight: '700',
	},
	inlineList: {
		marginTop: 12,
	},
	cardGap: {
		height: 14,
	},
	loadingBlock: {
		paddingVertical: 18,
		alignItems: 'center',
		justifyContent: 'center',
	},
	emptyBlock: {
		alignItems: 'center',
		paddingVertical: 30,
	},
	emptyText: {
		color: '#7f98a3',
		fontSize: 12,
		textAlign: 'center',
		marginTop: 8,
	},
	emptySubText: {
		color: '#8b9aa2',
		fontSize: 11,
		textAlign: 'center',
		marginTop: 4,
	},
})
