import React from 'react'
import {
	View,
	StyleSheet,
	Image,
	TouchableOpacity,
	FlatList,
	useWindowDimensions,
} from 'react-native'

import { AppTypography } from '../../components/common'

const TEAL = '#0c7c7c'

const podcasts = [
	{
		id: '1',
		type: 'Podcast',
		title: 'Healthy Habits for a Busy Life',
		image:
			'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=400&h=300&fit=crop&crop=center',
	},
	{
		id: '2',
		type: 'Videocast',
		title: 'Expert Panel on Chronic Disease Management',
		image:
			'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400&h=300&fit=crop&crop=center',
	},
	{
		id: '3',
		type: 'Podcast',
		title: 'Mindfulness for Stress Reduction',
		image:
			'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=400&h=300&fit=crop&crop=center',
	},
]

export default function PodcastsSection() {
	const { width } = useWindowDimensions()

	const isTablet = width >= 768
	const cardWidth = isTablet ? 260 : Math.min(206, width * 0.58)
	const imageHeight = isTablet ? 116 : 88

	return (
		<View style={styles.container}>
			<View style={styles.headerRow}>
				<AppTypography variant="subtitle" style={styles.sectionTitle}>
					Podcasts & Videocasts
				</AppTypography>

				<TouchableOpacity activeOpacity={0.75}>
					<AppTypography
						variant="caption"
						color={TEAL}
						style={styles.viewAllText}
					>
						View All
					</AppTypography>
				</TouchableOpacity>
			</View>

			<FlatList
				data={podcasts}
				horizontal
				showsHorizontalScrollIndicator={false}
				keyExtractor={(item) => item.id}
				contentContainerStyle={styles.listContent}
				renderItem={({ item, index }) => (
					<View
						style={[
							styles.card,
							{
								width: cardWidth,
								marginRight:
									index === podcasts.length - 1 ? 0 : 12,
							},
						]}
					>
						<Image
							source={{ uri: item.image }}
							resizeMode="cover"
							style={[styles.image, { height: imageHeight }]}
						/>

						<View style={styles.cardBody}>
							<View style={styles.typeBadge}>
								<AppTypography
									variant="caption"
									style={styles.typeText}
								>
									{item.type}
								</AppTypography>
							</View>

							<AppTypography
								variant="body"
								style={[
									styles.title,
									isTablet && styles.titleTablet,
								]}
								numberOfLines={2}
							>
								{item.title}
							</AppTypography>

							<TouchableOpacity activeOpacity={0.8}>
								<AppTypography
									variant="caption"
									color={TEAL}
									style={styles.actionText}
								>
									Watch / Listen
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
		shadowOffset: {
			width: 0,
			height: 4,
		},
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

	typeBadge: {
		alignSelf: 'flex-start',
		borderWidth: 1,
		borderColor: '#D8D8D8',
		borderRadius: 20,
		paddingHorizontal: 8,
		paddingVertical: 3,
		marginBottom: 8,
	},

	typeText: {
		fontSize: 10,
		lineHeight: 14,
		color: '#496879',
	},

	title: {
		minHeight: 36,
		fontSize: 13,
		lineHeight: 17,
		fontWeight: '700',
		color: '#10263A',
	},

	titleTablet: {
		fontSize: 14,
		lineHeight: 19,
	},

	actionText: {
		marginTop: 8,
		fontSize: 10,
		lineHeight: 14,
		fontWeight: '700',
	},

})