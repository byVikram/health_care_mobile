// src/features/dashboard/components/ServiceSection.tsx
//
// Patient Home "Care options" bento ("1 · Home"): a tall primary "Find doctors near you" card (avatar
// stack of doctors from the search API, "{N} specialities · Confirmed appointments") beside two short
// tone cards — "Video consultation" (sky, Online tag) and "Lab tests at home" (lilac).
import React, { useEffect, useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useNavigation, type NavigationProp } from '@react-navigation/native'

import { AppAvatarStack, AppIconTile, AppPathIcon, AppSkeleton, AppTag } from '../../../components/common'
import type { AppAvatarStackItem } from '../../../components/common'
import { APP_COLORS, TONES } from '../../../config/theme'
import { ROUTES } from '../../../navigation/routes'
import type { AppStackParamList } from '../../../navigation/types'
import { getDoctors } from '../../doctor/doctorService'
import { HOME_ICONS } from '../homeTheme'

type Props = {
	/** Number of specialities (null while loading or when the list failed to load). */
	specialityCount: number | null
	specialitiesLoading?: boolean
	refreshToken?: number
}

function ServicesSection({ specialityCount, specialitiesLoading = false, refreshToken }: Props) {
	const navigation = useNavigation<NavigationProp<AppStackParamList>>()
	const [doctors, setDoctors] = useState<AppAvatarStackItem[]>([])

	useEffect(() => {
		let active = true
		const load = async () => {
			try {
				const res = await getDoctors({ page: 1, limit: 3 })
				if (!active || !res?.success || !Array.isArray(res.data)) return
				setDoctors(
					res.data.slice(0, 3).map((d) => ({
						uri: d.avatar_s3_key,
						name: d.name,
						label: d.name,
					}))
				)
			} catch {
				// Decorative only: the card simply shows without the avatar stack.
			}
		}
		void load()
		return () => {
			active = false
		}
	}, [refreshToken])

	const subtitle =
		specialityCount && specialityCount > 0
			? `${specialityCount} specialities · Confirmed appointments`
			: 'Confirmed appointments'

	return (
		<View style={styles.grid} accessibilityLabel="Care options">
			{/* Find doctors (tall) */}
			<TouchableOpacity
				style={styles.primaryCard}
				activeOpacity={0.9}
				onPress={() =>
					navigation.navigate(ROUTES.MAIN.TABS, { screen: ROUTES.MAIN.SEARCH, params: { mode: 'clinic' } })
				}
				accessibilityRole="button"
				accessibilityLabel={`Find doctors near you. ${subtitle}. Book visit`}
			>
				<View style={styles.primaryCircle} importantForAccessibility="no-hide-descendants" />
				{doctors.length > 0 ? (
					<AppAvatarStack items={doctors} size={40} overlap={12} max={3} />
				) : (
					<View style={styles.avatarPlaceholder} />
				)}
				<Text style={styles.primaryTitle}>Find doctors near you</Text>
				{specialitiesLoading ? (
					<AppSkeleton width={140} height={12} borderRadius={4} color={APP_COLORS.primaryDark} />
				) : (
					<Text style={styles.primarySub}>{subtitle}</Text>
				)}
				<View style={styles.bookButton}>
					<Text style={styles.bookButtonText}>Book visit</Text>
					<AppPathIcon d={HOME_ICONS.chevronRight} size={14} strokeWidth={2.6} color={APP_COLORS.ink} />
				</View>
			</TouchableOpacity>

			<View style={styles.sideCol}>
				{/* Video consultation */}
				<TouchableOpacity
					style={[styles.smallCard, { backgroundColor: TONES.sky.bg }]}
					activeOpacity={0.9}
					onPress={() => navigation.navigate(ROUTES.STACK.DOCTOR_SEARCH, { mode: 'video' })}
					accessibilityRole="button"
					accessibilityLabel="Video consultation, online. Connect in 60 seconds"
				>
					<View style={styles.smallTop}>
						<AppIconTile size={32} radius={10} backgroundColor={APP_COLORS.surface}>
							<AppPathIcon d={HOME_ICONS.video} size={18} strokeWidth={2} color={TONES.sky.ink} />
						</AppIconTile>
						<AppTag
							label="Online"
							dot
							bg={APP_COLORS.surface}
							ink={APP_COLORS.success}
							style={styles.onlineTag}
							textStyle={styles.onlineText}
						/>
					</View>
					<Text style={styles.smallTitle}>Video consultation</Text>
					<Text style={[styles.smallSub, { color: TONES.sky.ink }]}>Connect in 60 sec</Text>
				</TouchableOpacity>

				{/* Lab tests at home */}
				<TouchableOpacity
					style={[styles.smallCard, { backgroundColor: TONES.lilac.bg }]}
					activeOpacity={0.9}
					onPress={() => navigation.navigate(ROUTES.STACK.LABORATORY_LIST)}
					accessibilityRole="button"
					accessibilityLabel="Lab tests at home. Free sample pickup"
				>
					<AppIconTile size={32} radius={10} backgroundColor={APP_COLORS.surface}>
						<AppPathIcon d={HOME_ICONS.flask} size={18} strokeWidth={2} color={TONES.lilac.ink} />
					</AppIconTile>
					<Text style={styles.smallTitle}>Lab tests at home</Text>
					<Text style={[styles.smallSub, { color: TONES.lilac.ink }]}>Free sample pickup</Text>
				</TouchableOpacity>
			</View>
		</View>
	)
}

export default React.memo(ServicesSection)

const styles = StyleSheet.create({
	grid: {
		flexDirection: 'row',
		gap: 10,
		paddingHorizontal: 16,
	},
	primaryCard: {
		flex: 1.1,
		minHeight: 184,
		padding: 14,
		borderRadius: 12,
		backgroundColor: APP_COLORS.primary,
		overflow: 'hidden',
		gap: 6,
	},
	primaryCircle: {
		position: 'absolute',
		right: -40,
		bottom: -40,
		width: 140,
		height: 140,
		borderRadius: 70,
		backgroundColor: APP_COLORS.primaryDark,
	},
	avatarPlaceholder: {
		height: 40,
	},
	primaryTitle: {
		marginTop: 'auto',
		fontSize: 17,
		lineHeight: 22,
		fontWeight: '800',
		color: APP_COLORS.surface,
	},
	primarySub: {
		fontSize: 12,
		lineHeight: 16,
		color: APP_COLORS.mint,
	},
	bookButton: {
		alignSelf: 'flex-start',
		marginTop: 4,
		height: 32,
		paddingHorizontal: 12,
		borderRadius: 8,
		backgroundColor: APP_COLORS.surface,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 2,
	},
	bookButtonText: {
		fontSize: 13,
		fontWeight: '700',
		color: APP_COLORS.ink,
	},
	sideCol: {
		flex: 1,
		gap: 10,
	},
	smallCard: {
		flex: 1,
		minHeight: 87,
		padding: 12,
		borderRadius: 12,
		gap: 4,
	},
	smallTop: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	onlineTag: {
		paddingHorizontal: 6,
	},
	onlineText: {
		fontSize: 11,
		lineHeight: 14,
	},
	smallTitle: {
		fontSize: 14,
		lineHeight: 18,
		fontWeight: '800',
		color: APP_COLORS.ink,
	},
	smallSub: {
		fontSize: 12,
		lineHeight: 16,
		fontWeight: '600',
	},
})
