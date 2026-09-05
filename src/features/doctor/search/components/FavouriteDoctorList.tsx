import React from 'react'
import {
	ActivityIndicator,
	Image,
	ImageSourcePropType,
	StyleSheet,
	TouchableOpacity,
	View,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { AppTypography } from '../../../../components/common'

export type FavouriteDoctorListItem = {
	id: string
	name: string
	avatar_s3_key: string | null
	location: string | null
	experience_years: number | null
	specialities: string[]
	is_verified?: boolean
}

type FavouriteDoctorListProps = {
	doctor: FavouriteDoctorListItem
	isCompact?: boolean
	isSubmitting?: boolean
	isBookmarking?: boolean
	isBookmarked?: boolean
	showShare?: boolean
	onShare?: (doctor: FavouriteDoctorListItem) => void
	onToggleBookmark: (doctor: FavouriteDoctorListItem) => void
	placeholderImage: ImageSourcePropType
	primaryColor?: string
	onPress?: (doctor: FavouriteDoctorListItem) => void
}

export default function FavouriteDoctorList({
	doctor,
	isCompact = false,
	isSubmitting = false,
	isBookmarking = false,
	isBookmarked = false,
	showShare = true,
	onShare,
	onToggleBookmark,
	placeholderImage,
	primaryColor = '#0d8585',
	onPress,
}: FavouriteDoctorListProps) {
	const speciality = doctor.specialities?.[0] || 'General Physician'
	const experience =
		doctor.experience_years != null
			? `${doctor.experience_years} yrs exp`
			: 'Experience not available'
	const location = doctor.location || 'Bangalore'
	const imageSource = doctor.avatar_s3_key
		? { uri: doctor.avatar_s3_key }
		: placeholderImage

	return (
		<TouchableOpacity
			style={[styles.row, isCompact && styles.rowCompact]}
			onPress={() => onPress?.(doctor)}
			activeOpacity={onPress ? 0.8 : 1}
		>
			<Image
				source={imageSource}
				style={[styles.image, isCompact && styles.imageCompact]}
				resizeMode="cover"
			/>
			<View style={styles.info}>
				<AppTypography variant="h4" style={[styles.name, isCompact && styles.nameCompact]} numberOfLines={1}>
					{doctor.name}
				</AppTypography>
				<View style={styles.metaRow}>
					<MaterialCommunityIcons
						name="briefcase-outline"
						size={isCompact ? 12 : 15}
						color="#969696"
					/>
					<AppTypography variant="caption" style={[styles.metaText, isCompact && styles.metaTextCompact]}>
						{experience}
					</AppTypography>
					<MaterialCommunityIcons
						name="map-marker-outline"
						size={isCompact ? 12 : 15}
						color="#969696"
					/>
					<AppTypography
						variant="caption"
						style={[styles.metaText, isCompact && styles.metaTextCompact]}
						numberOfLines={1}
					>
						{location}
					</AppTypography>
				</View>
				<AppTypography
					variant="subtitle"
					style={[styles.speciality, isCompact && styles.specialityCompact]}
					numberOfLines={1}
				>
					{speciality}
				</AppTypography>
			</View>
			<View style={[styles.actionButtons, isCompact && styles.actionButtonsCompact]}>
				{showShare && onShare ? (
					<TouchableOpacity
						style={[
							styles.iconButton,
							styles.shareButton,
							isCompact && styles.iconButtonCompact,
							isSubmitting && styles.disabledButton,
						]}
						activeOpacity={0.8}
						disabled={isSubmitting}
						onPress={() => onShare(doctor)}
					>
						{isSubmitting ? (
							<ActivityIndicator size="small" color="#fff" />
						) : (
							<MaterialCommunityIcons
								name="share-variant"
								size={isCompact ? 18 : 22}
								color="#fff"
							/>
						)}
					</TouchableOpacity>
				) : null}

				<TouchableOpacity
					style={[
						styles.iconButton,
						styles.bookmarkButton,
						isBookmarked && styles.bookmarkButtonActive,
						isCompact && styles.iconButtonCompact,
						isBookmarking && styles.disabledButton,
						{ borderColor: primaryColor },
						isBookmarked && { backgroundColor: primaryColor },
					]}
					activeOpacity={0.8}
					disabled={isBookmarking}
					onPress={() => onToggleBookmark(doctor)}
				>
					{isBookmarking ? (
						<ActivityIndicator size="small" color={primaryColor} />
					) : (
						<MaterialCommunityIcons
							name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
							size={isCompact ? 18 : 22}
							color={isBookmarked ? '#fff' : primaryColor}
						/>
					)}
				</TouchableOpacity>
			</View>
		</TouchableOpacity>
	)
}

const styles = StyleSheet.create({
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 24,
	},
	rowCompact: { marginBottom: 16 },
	image: {
		width: 78,
		height: 78,
		borderRadius: 39,
		backgroundColor: '#eef3f5',
		marginLeft: 24,
		marginRight: 24,
	},
	imageCompact: {
		width: 52,
		height: 52,
		borderRadius: 26,
		marginLeft: 0,
		marginRight: 12,
	},
	info: {
		flex: 1,
		minWidth: 0,
	},
	name: {
		fontSize: 20,
		lineHeight: 24,
		fontWeight: '700',
		color: '#172838',
		marginBottom: 3,
	},
	nameCompact: {
		fontSize: 15,
		lineHeight: 18,
		marginBottom: 2,
	},
	speciality: {
		fontSize: 16,
		lineHeight: 20,
		color: '#526b7a',
		marginTop: 4,
		marginBottom: 0,
	},
	specialityCompact: {
		fontSize: 13,
		lineHeight: 16,
		marginTop: 2,
	},
	metaRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		flexWrap: 'wrap',
		marginBottom: 0,
	},
	metaText: {
		fontSize: 15,
		lineHeight: 18,
		color: '#969696',
		marginRight: 16,
	},
	metaTextCompact: {
		fontSize: 11,
		lineHeight: 14,
		marginRight: 8,
	},
	actionButtons: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		marginLeft: 16,
	},
	actionButtonsCompact: {
		gap: 8,
		marginLeft: 8,
	},
	iconButton: {
		width: 48,
		height: 48,
		borderRadius: 24,
		alignItems: 'center',
		justifyContent: 'center',
	},
	iconButtonCompact: {
		width: 36,
		height: 36,
		borderRadius: 18,
	},
	shareButton: {
		backgroundColor: '#0d8585',
	},
	bookmarkButton: {
		backgroundColor: '#fff',
		borderWidth: 1,
	},
	bookmarkButtonActive: {
		backgroundColor: '#0d8585',
	},
	disabledButton: { opacity: 0.65 },
})
