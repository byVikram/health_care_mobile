import React from 'react'
import { View, Image, Pressable } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useNavigation, type NavigationProp } from '@react-navigation/native'

import { DoctorSearchItem } from '../../../../types/doctor-search'
import { AppButton, AppTypography } from '../../../../components/common'
import { ROUTES } from '../../../../navigation/routes'
import type { AppStackParamList } from '../../../../navigation/types'

import { doctorCardStyles as styles } from './DoctorCard.styles'

interface DoctorProps {
	doctor: DoctorSearchItem
	mobile?: boolean
}

export default function DoctorSearchCard({ doctor, mobile = false }: DoctorProps) {
	const navigation = useNavigation<NavigationProp<AppStackParamList>>()

	// Using placeholder data matching the mockup where API doesn't provide it yet
	const avatarUrl =
		doctor.avatar_s3_key || 'https://tse4.mm.bing.net/th/id/OIP.JD5a5owVBjuj0w_D6PUYMwHaHJ?pid=Api&P=0&h=180' // fallback
	const location = doctor.location || 'Bangalore'
	const distance = '<0 km'
	const earliestSlot = 'Earliest available slot (Today 2:00 PM)'

	return (
		<Pressable
			style={[styles.card, mobile && styles.mobileCard]}
			onPress={() => navigation.navigate(ROUTES.STACK.DOCTOR_DETAIL, { id: doctor.id })}
		>
			{/* Top Half - Image */}
			<View style={[styles.imageContainer, mobile && styles.mobileImageContainer]}>
				<Image source={{ uri: avatarUrl }} style={styles.image} resizeMode="cover" />
				{/* <View style={styles.badge}>
                    <MaterialCommunityIcons name="thumb-up" size={14} color="#fff" style={{ marginRight: 4 }} />
                    <AppTypography variant="caption" style={styles.badgeText}>People Recommended</AppTypography>
                </View> */}
			</View>

			{/* Bottom Half - Content */}
			<View style={[styles.content, mobile && styles.mobileContent]}>
				<AppTypography style={[styles.name, mobile && styles.mobileName]} numberOfLines={mobile ? 2 : 1}>
					{doctor.name}
				</AppTypography>
				<AppTypography variant="caption" style={[styles.speciality, mobile && styles.mobileSpeciality]} numberOfLines={1}>
					{doctor.specialities && doctor.specialities.length > 0
						? doctor.specialities.join(', ')
						: 'Cardiology'}
				</AppTypography>

				<AppTypography variant="caption" style={[styles.slotText, mobile && styles.mobileSlotText]} numberOfLines={1}>
					Next: Today 2:00 PM
				</AppTypography>

				<View style={[styles.infoRow, mobile && styles.mobileInfoRow]}>
					<View style={styles.infoLeft}>
						<MaterialCommunityIcons name="briefcase" size={12} color="#5b7282" />
						<AppTypography variant="caption" style={[styles.infoText, mobile && styles.mobileInfoText]}>
							{doctor.experience_years}y
						</AppTypography>
					</View>
				</View>

				<View style={[styles.infoRow, mobile && styles.mobileInfoRow, !mobile && { marginBottom: 8 }]}>
					<View style={styles.infoLeft}>
						<MaterialCommunityIcons name="map-marker" size={12} color="#5b7282" />
						<AppTypography variant="caption" style={[styles.infoText, mobile && styles.mobileInfoText]}>
							{location}
						</AppTypography>
					</View>
					<View style={styles.infoRight}>
						<AppTypography variant="caption" style={[styles.infoTextBoldTeal, mobile && styles.mobileInfoText]}>
							{distance}
						</AppTypography>
					</View>
				</View>

				<AppButton
					variant="primary"
					onPress={() => navigation.navigate(ROUTES.STACK.DOCTOR_DETAIL, { id: doctor.id })}
					style={mobile ? [styles.bookButton, styles.mobileBookButton] : styles.bookButton}
					labelStyle={
						mobile
							? [{ fontSize: 12, marginHorizontal: 0 }, styles.mobileBookButtonLabel]
							: { fontSize: 12, marginHorizontal: 0 }
					}
				>
					Book
				</AppButton>
			</View>
		</Pressable>
	)
}

// const styles = StyleSheet.create({
//     card: {
//         flex: 1,
//         marginHorizontal: 8,
//         marginBottom: 16,
//         backgroundColor: '#fff',
//         borderRadius: 12,
//         overflow: 'hidden',
//         borderWidth: 1,
//         borderColor: '#e8edf0',
//         elevation: 2,
//         shadowColor: '#000',
//         shadowOffset: { width: 0, height: 2 },
//         shadowOpacity: 0.05,
//         shadowRadius: 4,
//     },
//     imageContainer: {
//         height: 120, // Reduced for 2-column
//         backgroundColor: '#f0f4f8',
//         position: 'relative',
//     },
//     image: {
//         width: '100%',
//         height: '100%',
//     },
//     badge: {
//         position: 'absolute',
//         top: 8,
//         left: 8,
//         backgroundColor: '#00a82d', // vibrant green
//         flexDirection: 'row',
//         alignItems: 'center',
//         paddingHorizontal: 6,
//         paddingVertical: 2,
//         borderRadius: 4,
//     },
//     badgeText: {
//         color: '#fff',
//         fontWeight: 'bold',
//         fontSize: 9,
//     },
//     content: {
//         padding: 10,
//     },
//     name: {
//         color: '#082b45',
//         fontWeight: 'bold',
//         fontSize: 14,
//         marginBottom: 2,
//     },
//     speciality: {
//         color: '#5b7282',
//         marginBottom: 6,
//     },
//     slotText: {
//         color: '#5b7282',
//         marginBottom: 8,
//     },
//     infoRow: {
//         flexDirection: 'row',
//         justifyContent: 'space-between',
//         alignItems: 'center',
//         marginBottom: 8,
//     },
//     infoLeft: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         flex: 1,
//     },
//     infoText: {
//         color: '#5b7282',
//         marginLeft: 4,
//         fontSize: 10,
//     },
//     infoRight: {
//         flexDirection: 'row',
//         alignItems: 'center',
//     },
//     infoTextBold: {
//         color: '#082b45',
//         fontWeight: 'bold',
//         fontSize: 11,
//     },
//     infoTextBoldTeal: {
//         color: '#287474',
//         fontWeight: 'bold',
//         fontSize: 11,
//     },
//     bookButton: {
//         marginTop: 4,
//         backgroundColor: '#2b7571',
//         borderRadius: 8,
//         paddingVertical: 2,
//     }
// });
