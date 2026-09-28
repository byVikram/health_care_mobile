import React, { useMemo } from 'react'
import { View, Image, StyleSheet, TouchableOpacity } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useNavigation, type NavigationProp } from '@react-navigation/native'

import { DoctorSearchItem } from '../../../../types/doctor-search'
import { AppTypography } from '../../../../components/common'
import { ROUTES } from '../../../../navigation/routes'
import type { AppStackParamList } from '../../../../navigation/types'

interface DoctorProps {
	doctor: DoctorSearchItem
}

const INK = '#12373E'
const INK_MUTED = '#5B6B6E'
const DIVIDER = '#D5E1E2'

const TONES = [
	{ bg: '#ECE6FA', ink: '#6A4BB5' }, // lilac
	{ bg: '#DDEBFA', ink: '#2463A8' }, // sky
	{ bg: '#FDE8DC', ink: '#B4532A' }, // peach
	{ bg: '#FBEFD5', ink: '#8A5300' }, // sand
	{ bg: '#E3EFEF', ink: '#2B6F71' }, // mint
]

/** Deterministic tone per speciality name, so the same speciality always gets
 *  the same color across cards without needing a fixed lookup table. */
function toneForSpeciality(label: string) {
	let hash = 0
	for (let i = 0; i < label.length; i++) hash = (hash * 31 + label.charCodeAt(i)) >>> 0
	return TONES[hash % TONES.length]
}

export default function DoctorSearchCard({ doctor }: DoctorProps) {
	const navigation = useNavigation<NavigationProp<AppStackParamList>>()

	const speciality = doctor.specialities?.[0] || 'General physician'
	const tone = useMemo(() => toneForSpeciality(speciality), [speciality])

	const goToDetail = () => navigation.navigate(ROUTES.STACK.DOCTOR_DETAIL, { id: doctor.id })

	const qualificationsText = doctor.qualifications?.length
		? doctor.qualifications.map((q) => q.toUpperCase()).join(', ')
		: null

	const clinicName = doctor.hospital?.name || doctor.location || ''
	const distanceText = doctor.distance != null ? `${doctor.distance} km` : null

	const offersVideo = (doctor.hospital?.video_consultation_fee ?? 0) > 0
	const fee = doctor.hospital?.offline_consultation_fee ?? doctor.hospital?.video_consultation_fee ?? null

	return (
		<View style={styles.card}>
			<TouchableOpacity style={styles.topRow} onPress={goToDetail} activeOpacity={0.85}>
				<View style={[styles.avatarWrap, { backgroundColor: tone.bg }]}>
					{doctor.avatar_s3_key ? (
						<Image source={{ uri: doctor.avatar_s3_key }} style={styles.avatarImg} resizeMode="cover" />
					) : (
						<MaterialCommunityIcons name="account" size={34} color={tone.ink} />
					)}
					{offersVideo && (
						<View style={styles.videoBadge}>
							<MaterialCommunityIcons name="video" size={12} color="#FFFFFF" />
						</View>
					)}
				</View>

				<View style={styles.infoCol}>
					<View style={styles.nameRow}>
						<AppTypography style={styles.name} numberOfLines={1}>
							{doctor.name}
						</AppTypography>
						{doctor.is_verified && (
							<MaterialCommunityIcons name="check-decagram" size={15} color="#1E7A4E" />
						)}
					</View>

					<View style={[styles.specBadge, { backgroundColor: tone.bg }]}>
						<AppTypography style={[styles.specBadgeText, { color: tone.ink }]} numberOfLines={1}>
							{speciality}
						</AppTypography>
					</View>

					<AppTypography style={styles.metaText} numberOfLines={1}>
						{doctor.experience_years} yrs experience
						{qualificationsText ? ` · ${qualificationsText}` : ''}
					</AppTypography>

					{!!clinicName && (
						<View style={styles.locationRow}>
							<MaterialCommunityIcons name="map-marker-outline" size={14} color={INK_MUTED} />
							<AppTypography style={styles.metaText} numberOfLines={1}>
								{clinicName}
								{distanceText ? ` · ${distanceText}` : ''}
							</AppTypography>
						</View>
					)}
				</View>
			</TouchableOpacity>

			<View style={styles.bottomRow}>
				{fee != null ? (
					<AppTypography style={styles.feeText}>
						₹{fee} <AppTypography style={styles.feeSuffix}>per visit</AppTypography>
					</AppTypography>
				) : (
					<View />
				)}
				<TouchableOpacity style={styles.bookBtn} onPress={goToDetail} activeOpacity={0.85}>
					<AppTypography style={styles.bookBtnText}>Book</AppTypography>
				</TouchableOpacity>
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	card: {
		backgroundColor: '#FFFFFF',
		padding: 16,
		gap: 14,
	},
	topRow: {
		flexDirection: 'row',
		gap: 12,
		alignItems: 'flex-start',
	},
	avatarWrap: {
		width: 76,
		height: 76,
		borderRadius: 20,
		alignItems: 'center',
		justifyContent: 'center',
	},
	avatarImg: {
		width: 76,
		height: 76,
		borderRadius: 20,
	},
	videoBadge: {
		position: 'absolute',
		right: -2,
		bottom: -2,
		width: 24,
		height: 24,
		borderRadius: 9999,
		borderWidth: 2,
		borderColor: '#FFFFFF',
		backgroundColor: '#2B6F71',
		alignItems: 'center',
		justifyContent: 'center',
	},
	infoCol: {
		flex: 1,
		minWidth: 0,
		gap: 2,
	},
	nameRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	name: {
		fontSize: 17,
		lineHeight: 24,
		fontWeight: '700',
		color: INK,
		flexShrink: 1,
	},
	specBadge: {
		alignSelf: 'flex-start',
		paddingHorizontal: 8,
		paddingVertical: 2,
		borderRadius: 9999,
		marginTop: 2,
	},
	specBadgeText: {
		fontSize: 12,
		lineHeight: 16,
		fontWeight: '700',
	},
	metaText: {
		fontSize: 13,
		lineHeight: 18,
		color: INK_MUTED,
	},
	locationRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	bottomRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 12,
		paddingTop: 12,
		borderTopWidth: 1,
		borderTopColor: DIVIDER,
		borderStyle: 'dashed',
	},
	feeText: {
		fontSize: 18,
		lineHeight: 24,
		fontWeight: '800',
		color: INK,
	},
	feeSuffix: {
		fontSize: 12,
		fontWeight: '500',
		color: INK_MUTED,
	},
	bookBtn: {
		height: 44,
		paddingHorizontal: 22,
		borderRadius: 12,
		backgroundColor: '#2B6F71',
		alignItems: 'center',
		justifyContent: 'center',
	},
	bookBtnText: {
		fontSize: 14,
		fontWeight: '600',
		color: '#FFFFFF',
	},
})
