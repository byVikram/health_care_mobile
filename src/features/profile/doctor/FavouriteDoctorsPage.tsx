// Doctor "Favourite doctors": colleagues the doctor bookmarked (for referrals). Tap to open their public
// profile; the heart removes them from favourites.

import React, { useCallback, useMemo, useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import Toast from 'react-native-toast-message'
import { AppAvatar, AppSearchBar, AppTag } from '../../../components/common'
import { APP_COLORS } from '../../../config/theme'
import { ROUTES } from '../../../navigation/routes'
import type { AppStackParamList } from '../../../navigation/types'
import { buildS3Url } from '../../../utils/s3Utils'
import { getFavouriteDoctors, toggleFavouriteDoctor, type FavouriteDoctor } from '../../doctor/doctorService'
import { ProfileScreen } from '../shared/components/ProfileScreen'

type Nav = NativeStackNavigationProp<AppStackParamList>

export default function FavouriteDoctorsPage() {
	const navigation = useNavigation<Nav>()
	const [doctors, setDoctors] = useState<FavouriteDoctor[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [busyId, setBusyId] = useState<string | null>(null)
	const [query, setQuery] = useState('')

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase()
		if (!q) return doctors
		return doctors.filter((d) =>
			[d.name, d.location, ...(d.specialities ?? [])].some((v) => v?.toLowerCase().includes(q))
		)
	}, [doctors, query])

	const load = useCallback(async () => {
		setError(null)
		try {
			const res = await getFavouriteDoctors()
			setDoctors(res.data?.favourites ?? [])
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Could not load favourite doctors')
		} finally {
			setLoading(false)
		}
	}, [])

	useFocusEffect(
		useCallback(() => {
			void load()
		}, [load])
	)

	const unfavourite = async (d: FavouriteDoctor) => {
		setBusyId(d.id)
		try {
			await toggleFavouriteDoctor(d.id)
			setDoctors((cur) => cur.filter((x) => x.id !== d.id))
			Toast.show({ type: 'success', text1: `${d.name} removed from favourites` })
		} catch (e) {
			Toast.show({
				type: 'error',
				text1: "Couldn't update favourites",
				text2: e instanceof Error ? e.message : undefined,
			})
		} finally {
			setBusyId(null)
		}
	}

	return (
		<ProfileScreen
			title="Favourite doctors"
			subtitle="Doctors you refer to often"
			loading={loading}
			loadError={error}
			onRetry={load}
		>
			{doctors.length > 0 && (
				<AppSearchBar context="favouriteDoctors" value={query} onChangeText={setQuery} style={styles.searchBar} />
			)}
			{filtered.length ? (
				<View style={styles.list}>
					{filtered.map((d, i) => (
						<TouchableOpacity
							key={d.id}
							style={[styles.row, i < filtered.length - 1 && styles.divider]}
							onPress={() => navigation.navigate(ROUTES.STACK.DOCTOR_DETAIL, { id: d.id })}
							accessibilityRole="button"
						>
							<AppAvatar
								uri={buildS3Url(d.avatar_s3_key)}
								name={d.name}
								size={48}
								backgroundColor={APP_COLORS.mint}
								initialsColor={APP_COLORS.primary}
							/>
							<View style={styles.text}>
								<View style={styles.nameRow}>
									<Text style={styles.name} numberOfLines={1}>
										{d.name}
									</Text>
									{d.is_verified && (
										<MaterialCommunityIcons
											name="check-decagram"
											size={16}
											color={APP_COLORS.primary}
										/>
									)}
								</View>
								<Text style={styles.sub} numberOfLines={1}>
									{[
										d.specialities?.[0],
										d.experience_years ? `${d.experience_years} yrs` : '',
										d.location,
									]
										.filter(Boolean)
										.join(' · ')}
								</Text>
							</View>
							<TouchableOpacity
								onPress={() => unfavourite(d)}
								disabled={busyId === d.id}
								style={styles.heart}
								accessibilityRole="button"
								accessibilityLabel={`Remove ${d.name} from favourites`}
							>
								<MaterialCommunityIcons name="heart" size={22} color={APP_COLORS.danger} />
							</TouchableOpacity>
						</TouchableOpacity>
					))}
				</View>
			) : (
				<View style={styles.empty}>
					<AppTag
						label={doctors.length ? 'No matching doctors' : 'No favourites yet'}
						tone="neutral"
						size="sm"
						shape="rounded"
					/>
					<Text style={styles.emptyText}>
						{doctors.length
							? 'Try a different name, speciality or location.'
							: "Tap the heart on a doctor's profile to save them here."}
					</Text>
				</View>
			)}
		</ProfileScreen>
	)
}

const styles = StyleSheet.create({
	searchBar: {
		marginHorizontal: 16,
		marginVertical: 12,
	},
	list: {
		backgroundColor: APP_COLORS.surface,
		paddingHorizontal: 16,
	},
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		minHeight: 72,
		paddingVertical: 10,
	},
	divider: {
		borderBottomWidth: 1,
		borderBottomColor: APP_COLORS.divider,
	},
	text: {
		flex: 1,
		minWidth: 0,
	},
	nameRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	name: {
		flexShrink: 1,
		fontSize: 16,
		lineHeight: 22,
		fontWeight: '700',
		color: APP_COLORS.ink,
	},
	sub: {
		fontSize: 13,
		lineHeight: 18,
		color: APP_COLORS.inkMuted,
	},
	heart: {
		width: 40,
		height: 40,
		alignItems: 'center',
		justifyContent: 'center',
	},
	empty: {
		margin: 16,
		padding: 24,
		borderRadius: 12,
		backgroundColor: APP_COLORS.surface,
		alignItems: 'center',
		gap: 8,
	},
	emptyText: {
		fontSize: 13,
		lineHeight: 18,
		color: APP_COLORS.inkMuted,
		textAlign: 'center',
	},
})
