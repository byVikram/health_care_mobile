import React, { useEffect, useState } from 'react'
import {
	View,
	StyleSheet,
	ScrollView,
	TouchableOpacity,
	ActivityIndicator,
	TextInput,
	RefreshControl,
	Image,
} from 'react-native'
import { Text, Card, Chip } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'

import { listBlogs, BlogPost } from '../../services/blogService'
import { ROUTES } from '../../navigation/routes'
import type { AppStackParamList } from '../../navigation/types'

const CATEGORIES = ['All', 'Endocrinology', 'Oncology', 'Geriatrics', 'General']

export default function BlogListPage() {
	const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>()

	const [blogs, setBlogs] = useState<BlogPost[]>([])
	const [loading, setLoading] = useState(true)
	const [refreshing, setRefreshing] = useState(false)
	const [selectedCategory, setSelectedCategory] = useState('All')
	const [searchQuery, setSearchQuery] = useState('')

	const fetchBlogPosts = async () => {
		setLoading(true)
		try {
			const catFilter = selectedCategory === 'All' ? undefined : selectedCategory
			const res = await listBlogs(catFilter, 1, 20)
			if (res.success && res.data) {
				setBlogs(res.data)
			}
		} catch (err) {
			console.error('Error fetching blogs:', err)
		} finally {
			setLoading(false)
			setRefreshing(false)
		}
	}

	useEffect(() => {
		fetchBlogPosts()
	}, [selectedCategory])

	const filteredBlogs = blogs.filter(
		(blog) =>
			blog.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
			blog.content.toLowerCase().includes(searchQuery.toLowerCase())
	)

	return (
		<View style={styles.container}>
			<ScrollView
				contentContainerStyle={styles.scrollContent}
				refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchBlogPosts() }} colors={['#0d9488']} />}
			>
				{/* Header Section */}
				<View style={styles.headerBox}>
					<Text style={styles.headerTitle}>Health & Wellness Library</Text>
					<Text style={styles.headerSub}>
						Browse medical articles, health updates, and wellness guides reviewed by certified healthcare professionals.
					</Text>
				</View>

				{/* Search Bar */}
				<View style={styles.searchBar}>
					<MaterialCommunityIcons name="magnify" size={20} color="#0d9488" style={{ marginRight: 8 }} />
					<TextInput
						style={styles.searchInput}
						placeholder="Search health articles..."
						value={searchQuery}
						onChangeText={setSearchQuery}
					/>
					{searchQuery !== '' && (
						<TouchableOpacity onPress={() => setSearchQuery('')}>
							<MaterialCommunityIcons name="close-circle" size={18} color="#94a3b8" />
						</TouchableOpacity>
					)}
				</View>

				{/* Category Chips Scroll */}
				<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
					{CATEGORIES.map((cat) => {
						const isSelected = selectedCategory === cat
						return (
							<TouchableOpacity
								key={cat}
								style={[styles.categoryChip, isSelected && styles.categoryChipSelected]}
								onPress={() => setSelectedCategory(cat)}
								activeOpacity={0.8}
							>
								<Text style={[styles.categoryChipText, isSelected && styles.categoryChipTextSelected]}>
									{cat}
								</Text>
							</TouchableOpacity>
						)
					})}
				</ScrollView>

				{/* Blogs List */}
				{loading ? (
					<ActivityIndicator size="large" color="#0d9488" style={{ marginVertical: 40 }} />
				) : filteredBlogs.length === 0 ? (
					<View style={styles.emptyCard}>
						<MaterialCommunityIcons name="book-search-outline" size={48} color="#94a3b8" />
						<Text style={styles.emptyTitle}>No health articles found</Text>
						<Text style={styles.emptySub}>Try searching with different keywords or choosing another category.</Text>
					</View>
				) : (
					filteredBlogs.map((blog) => (
						<TouchableOpacity
							key={blog.id}
							activeOpacity={0.85}
							onPress={() => navigation.navigate(ROUTES.STACK.BLOG_ARTICLE, { slug: blog.slug })}
						>
							<Card style={styles.blogCard}>
								<Image
									source={{
										uri:
											blog.image_url ||
											'https://images.unsplash.com/photo-1576091160550-2173dba999ef?q=80&w=400',
									}}
									style={styles.blogCoverImage}
								/>
								<Card.Content style={{ paddingTop: 12 }}>
									<Chip style={styles.badgeChip} textStyle={styles.badgeChipText}>
										{blog.category}
									</Chip>
									<Text style={styles.blogTitle}>{blog.title}</Text>
									<Text style={styles.blogSnippet} numberOfLines={3}>
										{blog.content.replace(/[#*`]/g, '')}
									</Text>

									<View style={styles.blogFooterRow}>
										<View style={styles.authorRow}>
											<MaterialCommunityIcons name="account-circle-outline" size={16} color="#64748b" />
											<Text style={styles.authorText}>{blog.author?.name || 'Medical Team'}</Text>
										</View>
										<View style={styles.dateRow}>
											<MaterialCommunityIcons name="calendar-blank-outline" size={14} color="#64748b" />
											<Text style={styles.dateText}>
												{new Date(blog.created_at).toLocaleDateString()}
											</Text>
										</View>
									</View>
								</Card.Content>
							</Card>
						</TouchableOpacity>
					))
				)}
			</ScrollView>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f8fafc',
	},
	scrollContent: {
		padding: 16,
		paddingBottom: 90,
	},
	headerBox: {
		marginBottom: 16,
	},
	headerTitle: {
		fontSize: 22,
		fontWeight: '800',
		color: '#0f172a',
		marginBottom: 4,
	},
	headerSub: {
		fontSize: 13,
		color: '#64748b',
		lineHeight: 18,
	},
	searchBar: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#ffffff',
		borderRadius: 12,
		paddingHorizontal: 12,
		height: 44,
		borderWidth: 1,
		borderColor: '#e2e8f0',
		marginBottom: 14,
	},
	searchInput: {
		flex: 1,
		fontSize: 13.5,
		color: '#0f172a',
	},
	categoryScroll: {
		flexDirection: 'row',
		gap: 8,
		paddingRight: 16,
		marginBottom: 16,
	},
	categoryChip: {
		paddingHorizontal: 14,
		paddingVertical: 7,
		borderRadius: 20,
		backgroundColor: '#ffffff',
		borderWidth: 1,
		borderColor: '#e2e8f0',
	},
	categoryChipSelected: {
		backgroundColor: '#0d9488',
		borderColor: '#0d9488',
	},
	categoryChipText: {
		fontSize: 12.5,
		fontWeight: '600',
		color: '#475569',
	},
	categoryChipTextSelected: {
		color: '#ffffff',
		fontWeight: '700',
	},
	emptyCard: {
		backgroundColor: '#ffffff',
		borderRadius: 14,
		padding: 24,
		alignItems: 'center',
		borderColor: '#e2e8f0',
		borderWidth: 1,
		marginVertical: 20,
	},
	emptyTitle: {
		fontSize: 15,
		fontWeight: '700',
		color: '#334155',
		marginTop: 10,
	},
	emptySub: {
		fontSize: 12.5,
		color: '#64748b',
		textAlign: 'center',
		marginTop: 4,
	},
	blogCard: {
		backgroundColor: '#ffffff',
		borderRadius: 16,
		marginBottom: 16,
		borderColor: '#e2e8f0',
		borderWidth: 1,
		overflow: 'hidden',
	},
	blogCoverImage: {
		width: '100%',
		height: 160,
	},
	badgeChip: {
		backgroundColor: '#ccfbf1',
		alignSelf: 'flex-start',
		marginBottom: 6,
	},
	badgeChipText: {
		color: '#0f766e',
		fontSize: 10.5,
		fontWeight: '700',
	},
	blogTitle: {
		fontSize: 16,
		fontWeight: '800',
		color: '#0f172a',
		lineHeight: 22,
		marginBottom: 6,
	},
	blogSnippet: {
		fontSize: 13,
		color: '#475569',
		lineHeight: 18,
		marginBottom: 12,
	},
	blogFooterRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		borderTopWidth: 1,
		borderTopColor: '#f1f5f9',
		paddingTop: 10,
	},
	authorRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	authorText: {
		fontSize: 11.5,
		fontWeight: '600',
		color: '#475569',
	},
	dateRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	dateText: {
		fontSize: 11.5,
		color: '#64748b',
	},
})
