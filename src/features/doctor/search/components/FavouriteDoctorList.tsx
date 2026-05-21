import React from 'react'
import {
	ActivityIndicator,
	Image,
	ImageSourcePropType,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

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
		<View style={[styles.row, isCompact && styles.rowCompact]}>
			<Image
				source={imageSource}
				style={[styles.image, isCompact && styles.imageCompact]}
				resizeMode="cover"
			/>
			<View style={styles.info}>
				<Text style={[styles.name, isCompact && styles.nameCompact]} numberOfLines={1}>
					{doctor.name}
				</Text>
				<Text
					style={[styles.speciality, isCompact && styles.specialityCompact]}
					numberOfLines={1}
				>
					{speciality}
				</Text>
				<View style={styles.metaRow}>
					<MaterialCommunityIcons
						name="briefcase-outline"
						size={isCompact ? 12 : 15}
						color="#969696"
					/>
					<Text style={[styles.metaText, isCompact && styles.metaTextCompact]}>
						{experience}
					</Text>
					<MaterialCommunityIcons
						name="map-marker-outline"
						size={isCompact ? 12 : 15}
						color="#969696"
					/>
					<Text
						style={[styles.metaText, isCompact && styles.metaTextCompact]}
						numberOfLines={1}
					>
						{location}
					</Text>
				</View>
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
		</View>
	)
}

const styles = StyleSheet.create({
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 38,
	},
	rowCompact: { marginBottom: 22 },
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
		fontWeight: '700',
		color: '#172838',
		marginBottom: 8,
	},
	nameCompact: {
		fontSize: 15,
		marginBottom: 4,
	},
	speciality: {
		fontSize: 16,
		color: '#526b7a',
		marginBottom: 14,
	},
	specialityCompact: {
		fontSize: 13,
		marginBottom: 6,
	},
	metaRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		flexWrap: 'wrap',
	},
	metaText: {
		fontSize: 15,
		color: '#969696',
		marginRight: 16,
	},
	metaTextCompact: {
		fontSize: 11,
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
