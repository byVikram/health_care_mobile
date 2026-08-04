import React, { useEffect, useState } from 'react'
import {
	View,
	StyleSheet,
	ScrollView,
	TouchableOpacity,
	ActivityIndicator,
	Image,
	TextInput,
	Alert,
	RefreshControl,
} from 'react-native'
import { Text, Card, Avatar, Chip, Button } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useRoute, useNavigation, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'

import { getBlogPost, getBlogComments, createBlogComment, BlogPost, BlogComment } from '../../services/blogService'
import type { AppStackParamList } from '../../navigation/types'

type ArticleRouteProp = RouteProp<AppStackParamList, 'BlogArticle'>

function RenderParagraphs({ content }: { content: string }) {
	const paragraphs = content.split('\n\n').filter((p) => p.trim() !== '')

	return (
		<View style={{ marginVertical: 12 }}>
			{paragraphs.map((para, idx) => {
				if (para.startsWith('#### ')) {
					return (
						<Text key={idx} style={styles.h4Text}>
							{para.replace('#### ', '')}
						</Text>
					)
				}
				if (para.startsWith('### ')) {
					return (
						<Text key={idx} style={styles.h3Text}>
							{para.replace('### ', '')}
						</Text>
					)
				}
				if (para.startsWith('- ')) {
					const items = para.split('\n').map((line) => line.replace('- ', '').trim())
					return (
						<View key={idx} style={{ marginBottom: 12, paddingLeft: 8 }}>
							{items.map((item, i) => (
								<View key={i} style={styles.bulletRow}>
									<Text style={styles.bulletDot}>•</Text>
									<Text style={styles.bulletText}>{item}</Text>
								</View>
							))}
						</View>
					)
				}
				return (
					<Text key={idx} style={styles.bodyParagraph}>
						{para}
					</Text>
				)
			})}
		</View>
	)
}

function CommentNode({
	comment,
	activeReplyId,
	setActiveReplyId,
	replyText,
	setReplyText,
	onReplySubmit,
}: {
	comment: BlogComment
	activeReplyId: string | null
	setActiveReplyId: (id: string | null) => void
	replyText: string
	setReplyText: (text: string) => void
	onReplySubmit: (parentId: string) => void
}) {
	const isDoctor = comment.user_role === 'doctor'
	const isOpen = activeReplyId === comment.id

	return (
		<View style={styles.commentNodeBox}>
			<View style={styles.commentHeader}>
				<Avatar.Text
					size={32}
					label={comment.user_name.charAt(0).toUpperCase()}
					style={{ backgroundColor: isDoctor ? '#0d9488' : '#64748b' }}
				/>
				<View style={{ flex: 1, marginLeft: 8 }}>
					<View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
						<Text style={styles.commentUser}>{comment.user_name}</Text>
						{isDoctor && (
							<View style={styles.verifiedMdBadge}>
								<MaterialCommunityIcons name="check-decagram" size={12} color="#0d9488" />
								<Text style={styles.verifiedMdText}>Verified MD</Text>
							</View>
						)}
					</View>
					<Text style={styles.commentDate}>{new Date(comment.created_at).toLocaleDateString()}</Text>
				</View>

				<TouchableOpacity
					onPress={() => setActiveReplyId(isOpen ? null : comment.id)}
					style={styles.replyTriggerBtn}
				>
					<MaterialCommunityIcons name="reply" size={14} color="#0d9488" />
					<Text style={styles.replyTriggerText}>Reply</Text>
				</TouchableOpacity>
			</View>

			<Text style={styles.commentBody}>{comment.content}</Text>

			{/* Inline Reply Form */}
			{isOpen && (
				<View style={styles.inlineReplyBox}>
					<TextInput
						style={styles.inlineInput}
						placeholder={`Reply to ${comment.user_name}...`}
						value={replyText}
						onChangeText={setReplyText}
						multiline
					/>
					<View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
						<Button compact mode="outlined" onPress={() => setActiveReplyId(null)}>
							Cancel
						</Button>
						<Button
							compact
							mode="contained"
							buttonColor="#0d9488"
							onPress={() => onReplySubmit(comment.id)}
						>
							Submit
						</Button>
					</View>
				</View>
			)}

			{/* Nested Replies */}
			{comment.replies && comment.replies.length > 0 && (
				<View style={styles.nestedBox}>
					{comment.replies.map((reply) => (
						<CommentNode
							key={reply.id}
							comment={reply}
							activeReplyId={activeReplyId}
							setActiveReplyId={setActiveReplyId}
							replyText={replyText}
							setReplyText={setReplyText}
							onReplySubmit={onReplySubmit}
						/>
					))}
				</View>
			)}
		</View>
	)
}

export default function BlogArticlePage() {
	const route = useRoute<ArticleRouteProp>()
	const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>()
	const { slug } = route.params

	const [article, setArticle] = useState<BlogPost | null>(null)
	const [comments, setComments] = useState<BlogComment[]>([])
	const [loading, setLoading] = useState(true)
	const [refreshing, setRefreshing] = useState(false)

	// Comment Input
	const [mainCommentText, setMainCommentText] = useState('')
	const [submittingComment, setSubmittingComment] = useState(false)

	// Reply State
	const [activeReplyId, setActiveReplyId] = useState<string | null>(null)
	const [replyText, setReplyText] = useState('')

	const fetchArticleData = async () => {
		try {
			const blogRes = await getBlogPost(slug)
			if (blogRes.success && blogRes.data) {
				setArticle(blogRes.data)
			}
			const commentsRes = await getBlogComments(slug)
			if (commentsRes.success && commentsRes.data) {
				setComments(commentsRes.data)
			}
		} catch (err) {
			console.error('Error fetching blog article:', err)
			Alert.alert('Error', 'Article not found.')
			navigation.goBack()
		} finally {
			setLoading(false)
			setRefreshing(false)
		}
	}

	useEffect(() => {
		fetchArticleData()
	}, [slug])

	const handlePostMainComment = async () => {
		if (!mainCommentText.trim()) {
			Alert.alert('Empty Comment', 'Please enter your comment before posting.')
			return
		}
		setSubmittingComment(true)
		try {
			const res = await createBlogComment(slug, mainCommentText)
			if (res.success) {
				Alert.alert('Success', 'Comment posted successfully!')
				setMainCommentText('')
				fetchArticleData()
			}
		} catch (err) {
			console.error('Error posting comment:', err)
			Alert.alert('Error', 'Failed to post comment.')
		} finally {
			setSubmittingComment(false)
		}
	}

	const handlePostReply = async (parentId: string) => {
		if (!replyText.trim()) {
			Alert.alert('Empty Reply', 'Please enter text for your reply.')
			return
		}
		try {
			const res = await createBlogComment(slug, replyText, parentId)
			if (res.success) {
				Alert.alert('Success', 'Reply posted successfully!')
				setReplyText('')
				setActiveReplyId(null)
				fetchArticleData()
			}
		} catch (err) {
			console.error('Error posting reply:', err)
			Alert.alert('Error', 'Failed to post reply.')
		}
	}

	if (loading) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size="large" color="#0d9488" />
			</View>
		)
	}

	if (!article) return null

	return (
		<View style={styles.container}>
			<ScrollView
				contentContainerStyle={styles.scrollContent}
				refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchArticleData() }} colors={['#0d9488']} />}
			>
				{/* Back Button */}
				<TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
					<MaterialCommunityIcons name="arrow-left" size={20} color="#0d9488" />
					<Text style={styles.backBtnText}>Back to Library</Text>
				</TouchableOpacity>

				{/* Article Card */}
				<Card style={styles.articleCard}>
					<Image
						source={{
							uri:
								article.image_url ||
								'https://images.unsplash.com/photo-1576091160550-2173dba999ef?q=80&w=400',
						}}
						style={styles.coverImage}
					/>
					<Card.Content style={{ paddingTop: 14 }}>
						<Chip style={styles.categoryChip} textStyle={styles.categoryChipText}>
							{article.category}
						</Chip>

						<Text style={styles.articleTitle}>{article.title}</Text>

						{/* Author Meta Row */}
						<View style={styles.authorCard}>
							<Avatar.Text
								size={36}
								label={(article.author?.name || 'MD').charAt(0).toUpperCase()}
								style={{ backgroundColor: '#0d9488' }}
							/>
							<View style={{ flex: 1, marginLeft: 10 }}>
								<Text style={styles.authorName}>{article.author?.name || 'Medical Editorial Board'}</Text>
								<Text style={styles.authorRole}>Reviewed Healthcare Specialist</Text>
							</View>
							<Text style={styles.createdDate}>{new Date(article.created_at).toLocaleDateString()}</Text>
						</View>

						{/* Article Body */}
						<RenderParagraphs content={article.content} />
					</Card.Content>
				</Card>

				{/* Leave a Comment Box */}
				<Card style={styles.commentBoxCard}>
					<Card.Content>
						<Text style={styles.commentBoxTitle}>Leave a Comment</Text>
						<TextInput
							style={styles.mainInput}
							placeholder="Share your opinion or ask a follow-up question..."
							multiline
							numberOfLines={3}
							value={mainCommentText}
							onChangeText={setMainCommentText}
						/>
						<Button
							mode="contained"
							buttonColor="#0d9488"
							loading={submittingComment}
							disabled={submittingComment}
							onPress={handlePostMainComment}
							style={{ marginTop: 10, alignSelf: 'flex-end', borderRadius: 8 }}
						>
							Post Comment
						</Button>
					</Card.Content>
				</Card>

				{/* Comments Tree Section */}
				<Text style={styles.sectionHeader}>Article Comments ({comments.length})</Text>

				{comments.length === 0 ? (
					<View style={styles.emptyCommentsCard}>
						<MaterialCommunityIcons name="comment-text-outline" size={36} color="#94a3b8" />
						<Text style={styles.emptyCommentsText}>No comments yet. Be the first to share your thoughts!</Text>
					</View>
				) : (
					comments.map((comment) => (
						<CommentNode
							key={comment.id}
							comment={comment}
							activeReplyId={activeReplyId}
							setActiveReplyId={setActiveReplyId}
							replyText={replyText}
							setReplyText={setReplyText}
							onReplySubmit={handlePostReply}
						/>
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
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	scrollContent: {
		padding: 16,
		paddingBottom: 90,
	},
	backBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 12,
		gap: 4,
	},
	backBtnText: {
		fontSize: 13.5,
		fontWeight: '700',
		color: '#0d9488',
	},
	articleCard: {
		backgroundColor: '#ffffff',
		borderRadius: 16,
		marginBottom: 16,
		borderColor: '#e2e8f0',
		borderWidth: 1,
		overflow: 'hidden',
	},
	coverImage: {
		width: '100%',
		height: 200,
	},
	categoryChip: {
		backgroundColor: '#ccfbf1',
		alignSelf: 'flex-start',
		marginBottom: 8,
	},
	categoryChipText: {
		color: '#0f766e',
		fontSize: 11,
		fontWeight: '700',
	},
	articleTitle: {
		fontSize: 20,
		fontWeight: '800',
		color: '#0f172a',
		lineHeight: 26,
		marginBottom: 12,
	},
	authorCard: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#f8fafc',
		padding: 10,
		borderRadius: 12,
		marginBottom: 16,
		borderWidth: 1,
		borderColor: '#f1f5f9',
	},
	authorName: {
		fontSize: 13.5,
		fontWeight: '700',
		color: '#0f172a',
	},
	authorRole: {
		fontSize: 11,
		color: '#64748b',
	},
	createdDate: {
		fontSize: 11,
		color: '#64748b',
	},
	h3Text: {
		fontSize: 17,
		fontWeight: '800',
		color: '#0f172a',
		marginTop: 14,
		marginBottom: 6,
	},
	h4Text: {
		fontSize: 15,
		fontWeight: '700',
		color: '#0f172a',
		marginTop: 10,
		marginBottom: 4,
	},
	bodyParagraph: {
		fontSize: 14,
		color: '#334155',
		lineHeight: 22,
		marginBottom: 12,
	},
	bulletRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		marginBottom: 4,
	},
	bulletDot: {
		fontSize: 14,
		color: '#0d9488',
		marginRight: 6,
	},
	bulletText: {
		fontSize: 14,
		color: '#334155',
		lineHeight: 20,
		flex: 1,
	},
	commentBoxCard: {
		backgroundColor: '#ffffff',
		borderRadius: 14,
		marginBottom: 16,
		borderColor: '#e2e8f0',
		borderWidth: 1,
	},
	commentBoxTitle: {
		fontSize: 14,
		fontWeight: '700',
		color: '#0f172a',
		marginBottom: 8,
	},
	mainInput: {
		borderWidth: 1,
		borderColor: '#cbd5e1',
		borderRadius: 8,
		padding: 10,
		fontSize: 13.5,
		minHeight: 70,
		textAlignVertical: 'top',
		backgroundColor: '#f8fafc',
	},
	sectionHeader: {
		fontSize: 14,
		fontWeight: '800',
		color: '#475569',
		marginBottom: 10,
	},
	emptyCommentsCard: {
		backgroundColor: '#ffffff',
		borderRadius: 12,
		padding: 20,
		alignItems: 'center',
		borderColor: '#e2e8f0',
		borderWidth: 1,
	},
	emptyCommentsText: {
		fontSize: 12.5,
		color: '#64748b',
		marginTop: 8,
	},
	commentNodeBox: {
		backgroundColor: '#ffffff',
		borderRadius: 12,
		padding: 14,
		marginBottom: 10,
		borderColor: '#e2e8f0',
		borderWidth: 1,
	},
	commentHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 6,
	},
	commentUser: {
		fontSize: 13,
		fontWeight: '700',
		color: '#0f172a',
	},
	commentDate: {
		fontSize: 10.5,
		color: '#64748b',
	},
	replyTriggerBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 2,
	},
	replyTriggerText: {
		fontSize: 12,
		fontWeight: '700',
		color: '#0d9488',
	},
	commentBody: {
		fontSize: 13,
		color: '#334155',
		lineHeight: 18,
		marginTop: 2,
	},
	inlineReplyBox: {
		marginTop: 10,
		paddingLeft: 8,
		borderLeftWidth: 2,
		borderLeftColor: '#0d9488',
	},
	inlineInput: {
		borderWidth: 1,
		borderColor: '#cbd5e1',
		borderRadius: 6,
		padding: 8,
		fontSize: 12.5,
		backgroundColor: '#f8fafc',
	},
	nestedBox: {
		paddingLeft: 12,
		marginTop: 10,
		borderLeftWidth: 1,
		borderLeftColor: '#cbd5e1',
	},
	verifiedMdBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#ccfbf1',
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 6,
		gap: 2,
	},
	verifiedMdText: {
		fontSize: 10,
		fontWeight: '700',
		color: '#0f766e',
	},
})
