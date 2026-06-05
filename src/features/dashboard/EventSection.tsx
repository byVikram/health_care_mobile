import React from 'react'
import {
	FlatList,
	Image,
	StyleSheet,
	TouchableOpacity,
	useWindowDimensions,
	View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import { AppTypography } from '../../components/common'

interface Props {
	variant?: 'row' | 'column'
}

const TEAL = '#0c7c7c'

const eventList = [
	{
		id: 1,
		title: 'Annual Health & Wellness Expo',
		date: '10 Aug 2024',
		location: 'City Park, Health Center',
		image:
			'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=500&h=320&fit=crop',
	},
	{
		id: 2,
		title: 'Community Blood Donation Drive',
		date: '05 Sep 2024',
		location: 'Central Hospital, Main Hall',
		image:
			'https://images.unsplash.com/photo-1615461066841-6116e61058f4?w=500&h=320&fit=crop',
	},
	{
		id: 3,
		title: 'Free Diabetes Screening Camp',
		date: '20 Jun 2024',
		location: 'City Community Hall',
		image:
			'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=500&h=320&fit=crop',
	},
	{
		id: 4,
		title: 'Online Yoga & Wellness Workshop',
		date: '25 Jul 2024',
		location: 'Virtual Event',
		image:
			'https://images.unsplash.com/photo-1524901548305-08eeddc35080?w=500&h=320&fit=crop',
	},
]

export default function UpcomingEventsSection({ variant = 'row' }: Props) {
	const { width } = useWindowDimensions()
	const isTablet = width >= 768
	const cardWidth = isTablet ? 260 : Math.min(206, width * 0.58)
	const imageHeight = isTablet ? 116 : 88

	return (
		<View style={styles.container}>
			<View style={styles.headerRow}>
				<AppTypography
					variant="subtitle"
					style={[
						styles.sectionTitle,
						variant === 'column' && styles.sectionTitleLeft,
					]}
				>
					Upcoming Events
				</AppTypography>

				<TouchableOpacity activeOpacity={0.75} onPress={() => {}}>
					<AppTypography variant="caption" color={TEAL} style={styles.viewAllText}>
						View All
					</AppTypography>
				</TouchableOpacity>
			</View>

			<FlatList
				data={eventList}
				horizontal
				keyExtractor={(item) => String(item.id)}
				showsHorizontalScrollIndicator={false}
				contentContainerStyle={styles.listContent}
				renderItem={({ item, index }) => (
					<View
						style={[
							styles.card,
							{
								width: cardWidth,
								marginRight: index === eventList.length - 1 ? 0 : 12,
							},
						]}
					>
						<Image
							source={{ uri: item.image }}
							resizeMode="cover"
							style={[styles.image, { height: imageHeight }]}
						/>

						<View style={styles.cardBody}>
							<AppTypography
								variant="body"
								style={[styles.eventTitle, isTablet && styles.eventTitleTablet]}
								numberOfLines={2}
							>
								{item.title}
							</AppTypography>

							<View style={styles.metaRow}>
								<Ionicons name="calendar-outline" size={13} color="#496879" />
								<AppTypography variant="caption" style={styles.metaText} numberOfLines={1}>
									{item.date}
								</AppTypography>
							</View>

							<View style={styles.metaRow}>
								<Ionicons name="location-outline" size={13} color="#496879" />
								<AppTypography variant="caption" style={styles.metaText} numberOfLines={1}>
									{item.location}
								</AppTypography>
							</View>

							<TouchableOpacity
								activeOpacity={0.82}
								style={styles.registerButton}
								onPress={() => {}}
							>
								<AppTypography variant="caption" color="#fff" style={styles.registerLabel}>
									Register Now
								</AppTypography>
							</TouchableOpacity>
						</View>
					</View>
				)}
			/>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		paddingTop: 8,
		paddingBottom: 14,
	},

	headerRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		marginBottom: 10,
	},

	sectionTitle: {
		fontWeight: '700',
		color: '#11283A',
	},

	sectionTitleLeft: {
		textAlign: 'left',
	},

	viewAllText: {
		fontWeight: '700',
	},

	listContent: {
		paddingHorizontal: 16,
		paddingBottom: 10,
	},

	card: {
		backgroundColor: '#fff',
		borderRadius: 8,
		overflow: 'hidden',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.1,
		shadowRadius: 10,
		elevation: 3,
	},

	image: {
		width: '100%',
		backgroundColor: '#edf4f5',
	},

	cardBody: {
		paddingHorizontal: 10,
		paddingTop: 8,
		paddingBottom: 10,
	},

	eventTitle: {
		minHeight: 36,
		fontSize: 13,
		lineHeight: 17,
		fontWeight: '700',
		color: '#10263A',
		marginBottom: 7,
	},

	eventTitleTablet: {
		fontSize: 14,
		lineHeight: 19,
	},

	metaRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 5,
		marginBottom: 5,
	},

	metaText: {
		flex: 1,
		color: '#496879',
		fontSize: 10,
		lineHeight: 14,
	},

	registerButton: {
		height: 28,
		borderRadius: 6,
		backgroundColor: TEAL,
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: 7,
	},

	registerLabel: {
		fontSize: 10,
		lineHeight: 14,
		fontWeight: '700',
	},
})
