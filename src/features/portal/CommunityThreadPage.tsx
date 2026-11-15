import React, { useEffect, useState } from 'react'
import {
	View,
	StyleSheet,
	ScrollView,
	TouchableOpacity,
	ActivityIndicator,
	TextInput,
	RefreshControl,
} from 'react-native'
import { Text, Card, Avatar, Chip, Button } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useRoute, useNavigation, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'

import {
	getCommunityPostDetails,
	getCommunityPostComments,
	createCommunityComment,
	CommunityPost,
	CommunityComment,
} from '../../services/communityService'
import type { AppStackParamList } from '../../navigation/types'
import Toast from 'react-native-toast-message'

type ThreadRouteProp = RouteProp<AppStackParamList, 'CommunityThread'>

function CommentNode({
	comment,
	activeReplyId,
	setActiveReplyId,
	replyText,
	setReplyText,
	onReplySubmit,
}: {
	comment: CommunityComment
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

export default function CommunityThreadPage() {
	const route = useRoute<ThreadRouteProp>()
	const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>()
	const { threadId } = route.params

	const [post, setPost] = useState<CommunityPost | null>(null)
	const [comments, setComments] = useState<CommunityComment[]>([])
	const [loading, setLoading] = useState(true)
	const [refreshing, setRefreshing] = useState(false)

	// Comment Input
	const [mainCommentText, setMainCommentText] = useState('')
	const [submittingComment, setSubmittingComment] = useState(false)

	// Reply Input State
	const [activeReplyId, setActiveReplyId] = useState<string | null>(null)
	const [replyText, setReplyText] = useState('')

	const fetchThreadData = async () => {
		try {
			const postRes = await getCommunityPostDetails(threadId)
			if (postRes.success && postRes.data) {
				setPost(postRes.data)
			}
			const commentsRes = await getCommunityPostComments(threadId)
			if (commentsRes.success && commentsRes.data) {
				setComments(commentsRes.data)
			}
		} catch (err) {
			console.error('Error fetching thread:', err)
			Toast.show({ type: 'error', text1: 'Thread not found.' })
			navigation.goBack()
		} finally {
			setLoading(false)
			setRefreshing(false)
		}
	}

	useEffect(() => {
		fetchThreadData()
	}, [threadId])

	const handlePostMainComment = async () => {
		if (!mainCommentText.trim()) {
			Toast.show({ type: 'error', text1: 'Please enter your reply before posting.' })
			return
		}
		setSubmittingComment(true)
		try {
			const res = await createCommunityComment(threadId, mainCommentText)
			if (res.success) {
				Toast.show({ type: 'success', text1: 'Reply posted successfully!' })
				setMainCommentText('')
				fetchThreadData()
			}
		} catch (err) {
			console.error('Error posting comment:', err)
			Toast.show({ type: 'error', text1: "Couldn't post your reply", text2: 'Please try again.' })
		} finally {
			setSubmittingComment(false)
		}
	}

	const handlePostReply = async (parentId: string) => {
		if (!replyText.trim()) {
			Toast.show({ type: 'error', text1: 'Please enter text for your reply.' })
			return
		}
		try {
			const res = await createCommunityComment(threadId, replyText, parentId)
			if (res.success) {
				Toast.show({ type: 'success', text1: 'Reply posted successfully!' })
				setReplyText('')
				setActiveReplyId(null)
				fetchThreadData()
			}
		} catch (err) {
			console.error('Error posting reply:', err)
			Toast.show({ type: 'error', text1: "Couldn't post your reply", text2: 'Please try again.' })
		}
	}

	if (loading) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size="large" color="#0d9488" />
			</View>
		)
	}

	if (!post) return null

	const isDoctor = post.user_role === 'doctor'

	return (
		<View style={styles.container}>
			<ScrollView
				contentContainerStyle={styles.scrollContent}
				refreshControl={
					<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchThreadData() }} colors={['#0d9488']} />
				}
			>
				{/* Back Header */}
				<TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
					<MaterialCommunityIcons name="arrow-left" size={20} color="#0d9488" />
					<Text style={styles.backBtnText}>Back to Discussions</Text>
				</TouchableOpacity>

				{/* Post Details Card */}
				<Card style={styles.postCard}>
					<Card.Content>
						<View style={styles.authorRow}>
							<Avatar.Text
								size={40}
								label={post.user_name.charAt(0).toUpperCase()}
								style={{ backgroundColor: isDoctor ? '#0d9488' : '#64748b' }}
							/>
							<View style={{ flex: 1, marginLeft: 10 }}>
								<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
									<Text style={styles.authorName}>{post.user_name}</Text>
									{isDoctor && (
										<View style={styles.verifiedMdBadge}>
											<MaterialCommunityIcons name="check-decagram" size={13} color="#0d9488" />
											<Text style={styles.verifiedMdText}>Verified MD</Text>
										</View>
									)}
								</View>
								<Text style={styles.postDate}>{new Date(post.created_at).toLocaleDateString()}</Text>
							</View>
						</View>

						<Text style={styles.postTitle}>{post.title}</Text>
						<Text style={styles.postContent}>{post.content}</Text>
					</Card.Content>
				</Card>

				{/* Main Reply Box */}
				<Card style={styles.replyBoxCard}>
					<Card.Content>
						<Text style={styles.replyBoxTitle}>Join the Conversation</Text>
						<TextInput
							style={styles.mainInput}
							placeholder="Share your thoughts or answer questions..."
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
							Post Reply
						</Button>
					</Card.Content>
				</Card>

				{/* Comments Section */}
				<Text style={styles.sectionHeader}>Discussion Replies ({comments.length})</Text>

				{comments.length === 0 ? (
					<View style={styles.emptyCommentsCard}>
						<MaterialCommunityIcons name="message-text-outline" size={36} color="#94a3b8" />
						<Text style={styles.emptyCommentsText}>No replies yet. Be the first to join this discussion!</Text>
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
	postCard: {
		backgroundColor: '#ffffff',
		borderRadius: 14,
		marginBottom: 16,
		borderColor: '#e2e8f0',
		borderWidth: 1,
	},
	authorRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 12,
	},
	authorName: {
		fontSize: 14,
		fontWeight: '700',
		color: '#0f172a',
	},
	postDate: {
		fontSize: 11,
		color: '#64748b',
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
	postTitle: {
		fontSize: 17,
		fontWeight: '800',
		color: '#0f172a',
		marginBottom: 8,
	},
	postContent: {
		fontSize: 14,
		color: '#334155',
		lineHeight: 20,
	},
	replyBoxCard: {
		backgroundColor: '#ffffff',
		borderRadius: 14,
		marginBottom: 16,
		borderColor: '#e2e8f0',
		borderWidth: 1,
	},
	replyBoxTitle: {
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
})
