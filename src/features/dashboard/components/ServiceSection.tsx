import React from 'react'
import { FlatList, Image, StyleSheet, TouchableOpacity, useWindowDimensions, View } from 'react-native'

import { AppTypography } from '../../../components/common'
import DoctorsService from '../../../assets/Services/doctors-service.png'
import VideoConsultation from '../../../assets/Services/doctor-video-consultation.png'
import LabTests from '../../../assets/Services/lab-service.png'
import Surgeries from '../../../assets/Services/serguries.png'
import { useNavigation } from '@react-navigation/native'
import type { NavigationProp } from '@react-navigation/native'
import type { AppStackParamList } from '../../../navigation/types'
import { ROUTES } from '../../../navigation/routes'

interface ServiceType {
	id: number
	image: any
	title: string
	description: string
	mode?: 'clinic' | 'video'
}

const services: ServiceType[] = [
	{
		id: 1,
		image: DoctorsService,
		title: 'Find Doctors Near You',
		description: 'Confirmed appointments',
		mode: 'clinic',
	},
	{
		id: 2,
		image: VideoConsultation,
		title: 'Instant Video Consultation',
		description: 'Connect within 60 sec',
		mode: 'video',
	},
	{
		id: 3,
		image: LabTests,
		title: 'Lab Tests',
		description: 'Safe and trusted Lab tests',
	},
	{
		id: 4,
		image: Surgeries,
		title: 'Surgeries',
		description: 'Safe and trusted surgery centers',
	},
]

function ServicesSection() {
	const { width } = useWindowDimensions()
	const navigation = useNavigation<NavigationProp<AppStackParamList>>()
	const isTablet = width >= 768
	const cardWidth = isTablet ? 172 : Math.max(140, Math.min(140, (width - 56) / 4))
	const cardHeight = isTablet ? 238 : 200
	const imageHeight = isTablet ? 150 : 100

	return (
		<View style={styles.container}>
			<FlatList
				data={services}
				horizontal
				keyExtractor={(service) => String(service.id)}
				showsHorizontalScrollIndicator={false}
				contentContainerStyle={styles.listContent}
				renderItem={({ item, index }) => (
					<TouchableOpacity
						activeOpacity={0.86}
						style={[
							styles.card,
							{
								width: cardWidth,
								height: cardHeight,
								marginRight: index === services.length - 1 ? 0 : 12,
							},
						]}
						onPress={() => {
							if (item.id === 1) {
								navigation.navigate(ROUTES.STACK.DOCTOR_SEARCH, {
									nearby: true,
									mode: 'clinic',
								} as any)
							}

							if (item.id === 2) {
								navigation.navigate(ROUTES.STACK.SEARCH, {
									mode: 'video',
								} as any)
							}
							if (item.id === 3) {
								// Navigate to Lab Tests page
							}

							if (item.id === 4) {
								// Navigate to Surgeries page
							}
						}}
					>
						<Image source={item.image} resizeMode="cover" style={[styles.image, { height: imageHeight }]} />

						<View style={styles.textWrap}>
							<AppTypography
								style={[
									styles.title,
									{
										fontSize: isTablet ? 17 : 14,
										lineHeight: isTablet ? 22 : 18,
									},
								]}
								numberOfLines={isTablet ? 2 : 3}
							>
								{item.title}
							</AppTypography>

							<AppTypography
								style={[
									styles.description,
									{
										fontSize: isTablet ? 14 : 12,
										lineHeight: isTablet ? 20 : 17,
									},
								]}
								numberOfLines={2}
							>
								{item.description}
							</AppTypography>
						</View>
					</TouchableOpacity>
				)}
			/>
		</View>
	)
}

export default React.memo(ServicesSection) // verified export

const styles = StyleSheet.create({
	container: {
		paddingVertical: 12,
		paddingHorizontal: 16,
	},

	listContent: {
		paddingBottom: 10,
	},

	card: {
		backgroundColor: '#fff',
		borderRadius: 8,
		overflow: 'hidden',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.12,
		shadowRadius: 10,
		elevation: 4,
	},

	image: {
		width: '100%',
		backgroundColor: '#eef4f5',
	},

	textWrap: {
		flex: 1,
		paddingHorizontal: 10,
		paddingTop: 10,
		paddingBottom: 10,
	},

	title: {
		fontWeight: '700',
		color: '#13283A',
	},

	description: {
		marginTop: 7,
		color: '#617587',
	},
})
