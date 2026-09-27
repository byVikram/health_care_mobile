import React, { useMemo } from 'react'
import { View, StyleSheet, TouchableOpacity } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useNavigation, type NavigationProp } from '@react-navigation/native'

import { DoctorSearchItem } from '../../../../types/doctor-search'
import { AppAvatar, AppButton, AppDashedDivider, AppTag, AppTypography, AppIcon } from '../../../../components/common'
import { ROUTES } from '../../../../navigation/routes'
import type { AppStackParamList } from '../../../../navigation/types'
import { APP_COLORS, formatInr, toneForString } from '../../../../config/theme'
import { formatKm, initialsOf } from '../../../../utils/formatters'

interface DoctorProps {
	doctor: DoctorSearchItem
}

export default function DoctorSearchCard({ doctor }: DoctorProps) {
	const navigation = useNavigation<NavigationProp<AppStackParamList>>()

	const speciality = doctor.specialities?.[0] || 'General physician'
	const tone = useMemo(() => toneForString(speciality), [speciality])

	const goToDetail = () => navigation.navigate(ROUTES.STACK.DOCTOR_DETAIL, { id: doctor.id })

	const qualificationsText = doctor.qualifications?.length
		? doctor.qualifications.map((q) => q.toUpperCase()).join(', ')
		: null

	const clinicName = doctor.hospital?.name || doctor.location || ''
	const distanceText = doctor.distance != null ? `${formatKm(doctor.distance)} km` : null

	const offersVideo = (doctor.hospital?.video_consultation_fee ?? 0) > 0
	const fee = doctor.hospital?.offline_consultation_fee ?? doctor.hospital?.video_consultation_fee ?? null

	return (
		<View style={styles.card}>
			<TouchableOpacity style={styles.topRow} onPress={goToDetail} activeOpacity={0.85}>
				<View style={styles.avatarWrap}>
					<AppAvatar
						uri={doctor.avatar_s3_key}
						name={initialsOf(doctor.name)}
						size={76}
						radius={20}
						backgroundColor={tone.bg}
						initialsColor={tone.ink}
						initialsStyle={styles.initials}
					/>
					{offersVideo && (
						<View style={styles.videoBadge}>
							<AppIcon name="video" size={12} color={APP_COLORS.surface} strokeWidth={2.4} />
						</View>
					)}
				</View>

				<View style={styles.infoCol}>
					<View style={styles.nameRow}>
						<AppTypography style={styles.name} numberOfLines={1}>
							{doctor.name}
						</AppTypography>
						{doctor.is_verified && (
							<MaterialCommunityIcons name="check-decagram" size={15} color={APP_COLORS.success} />
						)}
					</View>

					<AppTag label={speciality} bg={tone.bg} ink={tone.ink} style={styles.specBadge} />

					<AppTypography style={styles.metaText} numberOfLines={1}>
						{doctor.experience_years ?? 0} yrs experience
						{qualificationsText ? ` · ${qualificationsText}` : ''}
					</AppTypography>

					{!!clinicName && (
						<View style={styles.locationRow}>
							<AppIcon name="pin" size={14} color={APP_COLORS.inkMuted} />
							<AppTypography style={[styles.metaText, styles.locationText]} numberOfLines={1}>
								{clinicName}
								{distanceText ? ` · ${distanceText}` : ''}
							</AppTypography>
						</View>
					)}
				</View>
			</TouchableOpacity>

			<View>
				<AppDashedDivider />
				<View style={styles.bottomRow}>
					{/* The design's next-availability pill is omitted: DoctorSearchItem has no availability field. */}
					{fee != null ? (
						<AppTypography style={styles.feeText}>
							{formatInr(fee)} <AppTypography style={styles.feeSuffix}>per visit</AppTypography>
						</AppTypography>
					) : (
						<View />
					)}
					<AppButton size="md" onPress={goToDetail} labelStyle={styles.bookBtnLabel}>
						Book
					</AppButton>
				</View>
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	card: {
		backgroundColor: APP_COLORS.surface,
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
	},
	initials: {
		fontSize: 24,
		lineHeight: 30,
		fontWeight: '700',
	},
	videoBadge: {
		position: 'absolute',
		right: -2,
		bottom: -2,
		width: 24,
		height: 24,
		borderRadius: 9999,
		borderWidth: 2,
		borderColor: APP_COLORS.surface,
		backgroundColor: APP_COLORS.primary,
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
		color: APP_COLORS.ink,
		flexShrink: 1,
	},
	// AppTag sm (2x8, 12/16 700) at the design's fully round corners
	specBadge: {
		borderRadius: 9999,
	},
	metaText: {
		fontSize: 13,
		lineHeight: 18,
		color: APP_COLORS.inkMuted,
	},
	locationRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	locationText: {
		flexShrink: 1,
	},
	bottomRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 12,
		paddingTop: 12,
	},
	feeText: {
		fontSize: 18,
		lineHeight: 24,
		fontWeight: '800',
		color: APP_COLORS.ink,
	},
	feeSuffix: {
		fontSize: 12,
		fontWeight: '500',
		color: APP_COLORS.inkMuted,
	},
	// AppButton size="md" is 14/20 700 with Paper's 24px label margin; the design's Book button is 600 / 22px.
	bookBtnLabel: {
		fontWeight: '600',
		marginHorizontal: 22,
	},
})
