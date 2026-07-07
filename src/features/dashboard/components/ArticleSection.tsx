import React from 'react'
import { FlatList, Image, StyleSheet, TouchableOpacity, useWindowDimensions, View } from 'react-native'

import { AppTypography } from '../../../components/common'

const TEAL = '#0c7c7c'
const AUTHOR_IMAGE = require('../../../assets/Banner/doctor.png')

const articles = [
	{
		id: 1,
		category: 'VITAMINS & SUPPLEMENTS',
		title: 'Eating Right to Build Immunity Against Cold and Viral Infections',
		author: 'Dr. Diana Borgio',
		image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500&h=320&fit=crop',
	},
	{
		id: 2,
		category: 'CORONAVIRUS',
		title: '12 Coronavirus Myths and Facts That You Should Be Aware Of',
		author: 'Dr. Diana Borgio',
		image: 'https://images.unsplash.com/photo-1584036561566-baf8f5f1b144?w=500&h=320&fit=crop',
	},
	{
		id: 3,
		category: 'FITNESS & WELLNESS',
		title: 'Simple Daily Habits for a Healthier and Happier You',
		author: 'Dr. Diana Borgio',
		image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=500&h=320&fit=crop',
	},
	{
		id: 4,
		category: 'MENTAL HEALTH',
		title: 'Managing Stress and Anxiety in Daily Life',
		author: 'Dr. Diana Borgio',
		image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=500&h=320&fit=crop',
	},
]

function ArticleSection() {
	const { width } = useWindowDimensions()
	const isTablet = width >= 768
	const cardWidth = isTablet ? 260 : Math.min(228, width * 0.64)
	const imageHeight = isTablet ? 132 : 108

	return (
		<View style={styles.container}>
			<View style={styles.headerRow}>
				<AppTypography variant="subtitle" style={styles.sectionTitle}>
					Health Articles
				</AppTypography>

				<TouchableOpacity activeOpacity={0.75} onPress={() => {}}>
					<AppTypography variant="caption" color={TEAL} style={styles.viewAllText}>
						View All
					</AppTypography>
				</TouchableOpacity>
			</View>

			<FlatList
				data={articles}
				horizontal
				keyExtractor={(item) => String(item.id)}
				showsHorizontalScrollIndicator={false}
				contentContainerStyle={styles.listContent}
				renderItem={({ item, index }) => (
					<TouchableOpacity
						activeOpacity={0.86}
						style={[
							styles.card,
							{
								width: cardWidth,
								marginRight: index === articles.length - 1 ? 0 : 12,
							},
						]}
					>
						<Image
							source={{ uri: item.image }}
							resizeMode="cover"
							style={[styles.image, { height: imageHeight }]}
						/>

						<View style={styles.cardBody}>
							<AppTypography variant="caption" color={TEAL} style={styles.category}>
								{item.category}
							</AppTypography>

							<AppTypography
								variant="body"
								style={[styles.title, isTablet && styles.titleTablet]}
								numberOfLines={3}
							>
								{item.title}
							</AppTypography>

							<View style={styles.authorRow}>
								<Image source={AUTHOR_IMAGE} style={styles.authorAvatar} />
								<AppTypography variant="caption" style={styles.author} numberOfLines={1}>
									{item.author}
								</AppTypography>
							</View>
						</View>
					</TouchableOpacity>
				)}
			/>
		</View>
	)
}

export default React.memo(ArticleSection)

const styles = StyleSheet.create({
	container: {
		marginTop: 8,
		paddingVertical: 12,
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
		minHeight: 122,
		paddingHorizontal: 10,
		paddingTop: 9,
		paddingBottom: 10,
	},

	category: {
		fontSize: 10,
		lineHeight: 14,
		fontWeight: '800',
		marginBottom: 5,
	},

	title: {
		fontSize: 13,
		lineHeight: 17,
		fontWeight: '700',
		color: '#10263A',
	},

	titleTablet: {
		fontSize: 14,
		lineHeight: 19,
	},

	authorRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 7,
		marginTop: 'auto',
		paddingTop: 10,
	},

	authorAvatar: {
		width: 22,
		height: 22,
		borderRadius: 11,
		backgroundColor: '#e7eef0',
	},

	author: {
		flex: 1,
		color: '#526b7a',
	},
})
