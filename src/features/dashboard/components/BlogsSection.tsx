import React, { useEffect, useState } from 'react'
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image } from 'react-native'
import { Text, Card } from 'react-native-paper'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'

import { listBlogs, BlogPost } from '../../../services/blogService'
import { ROUTES } from '../../../navigation/routes'
import type { AppStackParamList } from '../../../navigation/types'

const CARD_WIDTH = 240
const IMAGE_HEIGHT = 120

function BlogsSection() {
	const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>()

	const [blogs, setBlogs] = useState<BlogPost[]>([])
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		let isMounted = true
		const fetchBlogs = async () => {
			setLoading(true)
			try {
				const res = await listBlogs(undefined, 1, 5)
				if (isMounted && res.success && res.data) {
					setBlogs(res.data)
				}
			} catch (err) {
				console.error('Error fetching blogs for dashboard:', err)
			} finally {
				if (isMounted) setLoading(false)
			}
		}
		fetchBlogs()
		return () => {
			isMounted = false
		}
	}, [])

	return (
		<View style={styles.container}>
			<TouchableOpacity
				activeOpacity={0.8}
				onPress={() => navigation.navigate(ROUTES.STACK.BLOG_LIST as any)}
			>
				<Text variant="titleMedium" style={styles.title}>
					Blogs
				</Text>
			</TouchableOpacity>

			{loading ? (
				<ActivityIndicator size="small" color="#0c7c7c" style={{ marginVertical: 20 }} />
			) : blogs.length === 0 ? (
				<View style={styles.emptyBox}>
					<Text style={styles.emptyText}>No blog articles available.</Text>
				</View>
			) : (
				<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
					{blogs.map((b) => (
						<TouchableOpacity
							key={b.id}
							activeOpacity={0.85}
							onPress={() => navigation.navigate(ROUTES.STACK.BLOG_ARTICLE as any, { slug: b.slug })}
						>
							<Card style={styles.card}>
								{/* IMAGE SECTION */}
								<View style={styles.imageContainer}>
									<Image
										source={{
											uri:
												b.image_url ||
												'https://images.unsplash.com/photo-1576091160550-2173dba999ef?q=80&w=400',
										}}
										style={{ width: '100%', height: '100%' }}
									/>
								</View>

								{/* CONTENT */}
								<Card.Content style={styles.content}>
									<Text numberOfLines={2} style={styles.titleText}>
										{b.title}
									</Text>

									<Text numberOfLines={3} style={styles.desc}>
										{b.content.replace(/[#*`]/g, '')}
									</Text>

									<View style={styles.footer}>
										<Text style={styles.meta}>{b.author?.name || 'Medical Editor'}</Text>
										<Text style={styles.meta}>{new Date(b.created_at).toLocaleDateString()}</Text>
									</View>
								</Card.Content>
							</Card>
						</TouchableOpacity>
					))}
				</ScrollView>
			)}
		</View>
	)
}

export default React.memo(BlogsSection)

const styles = StyleSheet.create({
	container: {
		marginVertical: 16,
	},

	title: {
		textAlign: 'center',
		fontWeight: 'bold',
		marginBottom: 12,
		color: '#0f172a',
	},

	emptyBox: {
		backgroundColor: '#fff',
		marginHorizontal: 16,
		padding: 16,
		borderRadius: 12,
		alignItems: 'center',
	},

	emptyText: {
		fontSize: 12,
		color: '#666',
	},

	scroll: {
		paddingHorizontal: 8,
		paddingBottom: 20,
	},

	card: {
		width: CARD_WIDTH,
		marginHorizontal: 8,
		borderRadius: 12,
		overflow: 'hidden',
		backgroundColor: '#fff',
	},

	imageContainer: {
		width: CARD_WIDTH,
		height: IMAGE_HEIGHT,
		backgroundColor: '#f0f4f8',
		overflow: 'hidden',
	},

	content: {
		padding: 12,
		justifyContent: 'space-between',
	},

	titleText: {
		fontWeight: 'bold',
		fontSize: 14,
		marginBottom: 4,
	},

	desc: {
		color: '#666',
		fontSize: 12,
		marginBottom: 12,
	},

	footer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginTop: 'auto',
	},

	meta: {
		fontSize: 10,
		color: '#777',
	},
})
