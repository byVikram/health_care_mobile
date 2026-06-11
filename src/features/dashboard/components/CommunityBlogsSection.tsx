import React from 'react'
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { Card } from 'react-native-paper'

import { AppTypography } from '../../../components/common'

import Blog1 from '../../../assets/blog-and-community/blog-1.svg'
import Blog2 from '../../../assets/blog-and-community/blog-2.svg'
import Community1 from '../../../assets/blog-and-community/community-1.svg'

const TEAL = '#0c7c7c'

const communities = [
	{
		id: 1,
		name: 'Diabetics Association',
		location: 'Rajajinagar, Bengaluru',
		image: Community1,
	},
	{
		id: 2,
		name: 'Lions Health Club',
		location: 'Koramangala, Bengaluru',
		image: Community1,
	},
]

const blogs = [
	{
		id: 1,
		ImageComponent: Blog1,
		title: 'The Future of Digital Health: What to Expect!',
		description: 'Explore how technology is transforming healthcare and patient experiences.',
		author: 'Dr. Emily White',
		date: '15 May 2024',
	},
	{
		id: 2,
		ImageComponent: Blog2,
		title: 'Understanding Telemedicine: Your Guide to Virtual Care',
		description: 'A comprehensive guide to telemedicine services and virtual consultations.',
		author: 'Dr. Emily White',
		date: '15 May 2024',
	},
]

const CARD_WIDTH = 206
const IMAGE_HEIGHT = 88
const COMMUNITY_AVATAR_SIZE = 44

function CommunityBlogsSection() {
	return (
		<View style={styles.container}>
			<View style={styles.headerRow}>
				<AppTypography variant="subtitle" style={styles.sectionTitle}>
					Communities & Blogs
				</AppTypography>

				<TouchableOpacity activeOpacity={0.8}>
					<AppTypography variant="caption" color={TEAL} style={styles.viewAllText}>
						View All
					</AppTypography>
				</TouchableOpacity>
			</View>

			{communities.map((community) => (
				<View key={community.id} style={styles.communityRow}>
					<View style={styles.communityAvatar}>
						<community.image width="100%" height="100%" />
					</View>

					<View style={styles.communityInfo}>
						<AppTypography variant="body" style={styles.communityTitle}>
							{community.name}
						</AppTypography>

						<AppTypography variant="caption" style={styles.locationText}>
							{community.location}
						</AppTypography>
					</View>

					<TouchableOpacity style={styles.viewButton}>
						<AppTypography variant="caption" color={TEAL} style={styles.viewButtonText}>
							View
						</AppTypography>
					</TouchableOpacity>
				</View>
			))}

			<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.blogScroll}>
				{blogs.map((blog) => (
					<Card key={blog.id} style={styles.blogCard}>
						<View style={styles.blogImageContainer}>
							<View style={StyleSheet.absoluteFillObject}>
								<blog.ImageComponent width="100%" height="100%" preserveAspectRatio="xMidYMid slice" />
							</View>
						</View>

						<View style={styles.blogContent}>
							<AppTypography variant="body" numberOfLines={2} style={styles.blogTitle}>
								{blog.title}
							</AppTypography>

							<AppTypography variant="caption" numberOfLines={2} style={styles.blogDesc}>
								{blog.description}
							</AppTypography>

							<View style={styles.blogFooter}>
								<AppTypography variant="caption" style={styles.footerText}>
									{blog.author}
								</AppTypography>

								<AppTypography variant="caption" style={styles.footerText}>
									{blog.date}
								</AppTypography>
							</View>
						</View>
					</Card>
				))}
			</ScrollView>
		</View>
	)
}

export default React.memo(CommunityBlogsSection)

const styles = StyleSheet.create({
	container: {
		marginVertical: 16,
	},

	headerRow: {
		paddingHorizontal: 16,
		marginBottom: 12,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},

	sectionTitle: {
		fontWeight: '700',
		color: '#11283A',
	},

	viewAllText: {
		fontWeight: '700',
	},

	communityRow: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#fff',
		marginHorizontal: 16,
		marginBottom: 8,
		padding: 12,
		borderRadius: 8,

		shadowColor: '#000',
		shadowOffset: {
			width: 0,
			height: 2,
		},
		shadowOpacity: 0.06,
		shadowRadius: 4,

		elevation: 2,
	},

	communityAvatar: {
		width: COMMUNITY_AVATAR_SIZE,
		height: COMMUNITY_AVATAR_SIZE,
		borderRadius: COMMUNITY_AVATAR_SIZE / 2,
		backgroundColor: '#edf4f5',
		marginRight: 12,
	},

	communityInfo: {
		flex: 1,
	},

	communityTitle: {
		fontWeight: '600',
		color: '#10263A',
	},

	locationText: {
		color: '#496879',
		fontSize: 10,
		lineHeight: 14,
	},

	viewButton: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 6,
		borderWidth: 1,
		borderColor: TEAL,
	},

	viewButtonText: {
		fontWeight: '700',
	},

	blogScroll: {
		paddingHorizontal: 16,
		paddingTop: 8,
		paddingBottom: 10,
	},

	blogCard: {
		width: CARD_WIDTH,
		marginRight: 12,
		borderRadius: 8,
		backgroundColor: '#fff',
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

	blogImageContainer: {
		width: CARD_WIDTH,
		height: IMAGE_HEIGHT,
		backgroundColor: '#edf4f5',
		overflow: 'hidden',
	},

	blogContent: {
		paddingHorizontal: 10,
		paddingTop: 8,
		paddingBottom: 10,
	},

	blogTitle: {
		fontSize: 13,
		lineHeight: 17,
		fontWeight: '700',
		color: '#10263A',
		minHeight: 36,
		marginBottom: 4,
	},

	blogDesc: {
		fontSize: 10,
		lineHeight: 14,
		color: '#496879',
		marginBottom: 6,
	},

	blogFooter: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginTop: 4,
	},

	footerText: {
		fontSize: 10,
		lineHeight: 14,
		color: '#496879',
	},
})
