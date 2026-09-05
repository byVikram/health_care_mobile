import React, { useEffect, useMemo, useState } from 'react'
import {
	ActivityIndicator,
	FlatList,
	StyleSheet,
	Text,
	useWindowDimensions,
	View,
} from 'react-native'
import Toast from 'react-native-toast-message'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import type { NavigationProp } from '@react-navigation/native'

import {
	FavouriteDoctor,
	getFavouriteDoctors,
	toggleFavouriteDoctor,
} from '../../../doctor/doctorService'
import { AppInput } from '../../../../components/common'
import FavouriteDoctorList, {
	type FavouriteDoctorListItem,
} from '../../../doctor/search/components/FavouriteDoctorList'
import { ROUTES } from '../../../../navigation/routes'
import type { AppStackParamList } from '../../../../navigation/types'

const TEAL = '#0d8585'
const DOCTOR_IMAGE_PLACEHOLDER = require('../../../../assets/Banner/doctor.png')

const mapFavouriteDoctor = (doctor: FavouriteDoctor): FavouriteDoctorListItem => ({
	id: doctor.id,
	name: doctor.name,
	avatar_s3_key: doctor.avatar_s3_key ?? null,
	location: doctor.location ?? '',
	experience_years: doctor.experience_years ?? null,
	specialities: doctor.specialities ?? [],
	is_verified: doctor.is_verified,
})

export default function FavouriteDoctorsTab() {
	const navigation = useNavigation<NavigationProp<AppStackParamList>>()
	const { width } = useWindowDimensions()
	const isCompact = width < 520
	const [favouriteDoctors, setFavouriteDoctors] = useState<FavouriteDoctorListItem[]>([])
	const [favouriteDoctorIds, setFavouriteDoctorIds] = useState<Set<string>>(new Set())
	const [loading, setLoading] = useState(true)
	const [searchQuery, setSearchQuery] = useState('')
	const [bookmarkingIds, setBookmarkingIds] = useState<Set<string>>(new Set())

	const trimmedSearch = searchQuery.trim()
	const isSearching = trimmedSearch.length >= 2

	// Filter favourites locally based on name or first specialty
	const filteredFavourites = useMemo(() => {
		if (!isSearching) return favouriteDoctors
		const query = trimmedSearch.toLowerCase()
		return favouriteDoctors.filter(
			(doctor) =>
				doctor.name.toLowerCase().includes(query) ||
				(doctor.specialities[0]?.toLowerCase().includes(query) ?? false)
		)
	}, [favouriteDoctors, isSearching, trimmedSearch])

	useEffect(() => {
		const fetchFavouriteDoctors = async () => {
			try {
				setLoading(true)
				const res = await getFavouriteDoctors()
				if (res.success) {
					setFavouriteDoctors((res.data?.favourites ?? []).map(mapFavouriteDoctor))
					setFavouriteDoctorIds(new Set(res.data?.favourite_ids ?? []))
				} else {
					Toast.show({
						type: 'error',
						text1: 'Error',
						text2: res.message || 'Failed to load favourite doctors',
					})
				}
			} catch {
				Toast.show({
					type: 'error',
					text1: 'Error',
					text2: 'Failed to load favourite doctors',
				})
			} finally {
				setLoading(false)
			}
		}

		fetchFavouriteDoctors()
	}, [])

	const handleToggleBookmark = async (doctor: FavouriteDoctorListItem) => {
		if (bookmarkingIds.has(doctor.id)) return

		const wasFavourite = favouriteDoctorIds.has(doctor.id)

		setBookmarkingIds((prev) => new Set(prev).add(doctor.id))
		setFavouriteDoctorIds((prev) => {
			const next = new Set(prev)
			if (wasFavourite) next.delete(doctor.id)
			else next.add(doctor.id)
			return next
		})
		setFavouriteDoctors((prev) => {
			if (wasFavourite) return prev.filter((item) => item.id !== doctor.id)
			return prev.some((item) => item.id === doctor.id) ? prev : [...prev, doctor]
		})

		try {
			const res = await toggleFavouriteDoctor(doctor.id)

			if (res.success === false) {
				throw new Error(res.message || 'Failed to update favourites')
			}

			const isFavourite = res.data?.action ? res.data.action === 'added' : !wasFavourite

			if (res.data?.favourite_ids) {
				setFavouriteDoctorIds(new Set(res.data.favourite_ids))
			} else {
				setFavouriteDoctorIds((prev) => {
					const next = new Set(prev)
					if (isFavourite) next.add(doctor.id)
					else next.delete(doctor.id)
					return next
				})
			}

			if (res.data?.favourites) {
				setFavouriteDoctors(res.data.favourites.map(mapFavouriteDoctor))
			} else {
				setFavouriteDoctors((prev) => {
					if (!isFavourite) return prev.filter((item) => item.id !== doctor.id)
					return prev.some((item) => item.id === doctor.id) ? prev : [...prev, doctor]
				})
			}

			Toast.show({
				type: 'success',
				text1: 'Success',
				text2: isFavourite ? 'Added to favourites' : 'Removed from favourites',
			})
		} catch {
			setFavouriteDoctorIds((prev) => {
				const next = new Set(prev)
				if (wasFavourite) next.add(doctor.id)
				else next.delete(doctor.id)
				return next
			})
			setFavouriteDoctors((prev) => {
				if (wasFavourite) {
					return prev.some((item) => item.id === doctor.id) ? prev : [...prev, doctor]
				}
				return prev.filter((item) => item.id !== doctor.id)
			})
			Toast.show({
				type: 'error',
				text1: 'Error',
				text2: 'Failed to update favourites',
			})
		} finally {
			setBookmarkingIds((prev) => {
				const next = new Set(prev)
				next.delete(doctor.id)
				return next
			})
		}
	}

	if (loading) {
		return (
			<View style={styles.centerState}>
				<ActivityIndicator color={TEAL} />
			</View>
		)
	}

	const dataToShow = isSearching ? filteredFavourites : favouriteDoctors
	const isEmpty = dataToShow.length === 0

	return (
		<View style={styles.container}>
			<FlatList
				data={dataToShow}
				keyExtractor={(item) => item.id}
				contentContainerStyle={[
					styles.listContent,
					isEmpty && styles.emptyListContent,
				]}
				ListHeaderComponent={
					<View style={styles.headerContent}>
						<AppInput
							value={searchQuery}
							onChangeText={setSearchQuery}
							placeholder="Search doctor..."
							placeholderTextColor="#98a1aa"
							containerStyle={[styles.searchInputContainer, isCompact && styles.searchInputContainerCompact]}
							style={[styles.searchInput, isCompact && styles.searchInputCompact]}
							contentStyle={[styles.searchInputContent, isCompact && styles.searchInputContentCompact]}
							outlineStyle={[styles.searchInputOutline, isCompact && styles.searchInputOutlineCompact]}
							outlineColor="#2e7b7d"
							activeOutlineColor="#2e7b7d"
							textColor="#1b2d3c"
							left={<AppInput.Icon icon="magnify" size={isCompact ? 20 : 28} color="#9b9b9b" />}
							right={<AppInput.Icon icon="microphone-outline" size={isCompact ? 20 : 28} color="#9b9b9b" />}
							autoCorrect={false}
							returnKeyType="search"
							noMargin
						/>

						<Text style={[styles.sectionTitle, isCompact && styles.sectionTitleCompact]}>
							{isSearching ? 'SEARCH RESULTS' : 'FAVOURITE DOCTORS'}
						</Text>
					</View>
				}
				renderItem={({ item }) => (
					<FavouriteDoctorList
						doctor={item}
						isCompact={isCompact}
						showShare={false}
						isBookmarked={favouriteDoctorIds.has(item.id)}
						isBookmarking={bookmarkingIds.has(item.id)}
						onToggleBookmark={handleToggleBookmark}
						placeholderImage={DOCTOR_IMAGE_PLACEHOLDER}
						primaryColor={TEAL}
						onPress={(doc) => navigation.navigate(ROUTES.STACK.DOCTOR_DETAIL, { id: doc.id })}
					/>
				)}
				ListEmptyComponent={
					<View style={styles.emptyState}>
						<MaterialCommunityIcons
							name={isSearching ? 'doctor' : 'bookmark-outline'}
							size={40}
							color="#8ca0a9"
						/>
						<Text style={styles.emptyTitle}>
							{isSearching ? 'No favourite doctors match your search' : 'No favourite doctors yet'}
						</Text>
					</View>
				}
				showsVerticalScrollIndicator={false}
				keyboardShouldPersistTaps="handled"
			/>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#fff',
	},
	listContent: {
		paddingHorizontal: 16,
		paddingTop: 16,
		paddingBottom: 24,
	},
	headerContent: {
		paddingBottom: 2,
	},
	searchInputContainer: {
		marginBottom: 12,
	},
	searchInputContainerCompact: {
		marginBottom: 10,
	},
	searchInput: {
		height: 54,
		backgroundColor: '#f8fbff',
	},
	searchInputCompact: {
		height: 44,
	},
	searchInputContent: {
		height: 54,
		paddingHorizontal: 0,
		paddingVertical: 0,
		fontSize: 17,
	},
	searchInputContentCompact: {
		height: 44,
		fontSize: 15,
	},
	searchInputOutline: {
		borderRadius: 18,
		borderWidth: 3,
	},
	searchInputOutlineCompact: {
		borderRadius: 14,
		borderWidth: 2,
	},
	sectionTitle: {
		fontSize: 15,
		fontWeight: '700',
		color: '#526b7a',
		letterSpacing: 0,
		marginBottom: 12,
	},
	sectionTitleCompact: {
		fontSize: 13,
		marginBottom: 10,
	},
	emptyListContent: {
		flexGrow: 1,
		justifyContent: 'center',
	},
	centerState: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 40,
	},
	emptyState: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 40,
	},
	emptyTitle: {
		color: '#7f98a3',
		fontSize: 13,
		fontWeight: '600',
		marginTop: 10,
		textAlign: 'center',
	},
})
// import React from 'react'
// import MyDoctorPage from '../../../patient/MyDoctorPage'
// export default function FavouriteDoctorsTab() {
// 	return <MyDoctorPage />
// }
