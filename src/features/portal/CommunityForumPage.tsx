import React, { useEffect, useState } from 'react'
import {
	View,
	StyleSheet,
	ScrollView,
	TouchableOpacity,
	ActivityIndicator,
	RefreshControl,
	Modal,
	TextInput,
} from 'react-native'
import { Text, Card, Chip, Button } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'

import {
	listCommunityGroups,
	listCommunityPosts,
	createCommunityPost,
	CommunityGroup,
	CommunityPost,
} from '../../services/communityService'
import { ROUTES } from '../../navigation/routes'
import type { AppStackParamList } from '../../navigation/types'
import { useAuth } from '../../context/AuthContext'
import Toast from 'react-native-toast-message'
import { showStatusModal } from '../../services/apiService'

export default function CommunityForumPage() {
	const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>()
	const { accessToken } = useAuth()

	const [groups, setGroups] = useState<CommunityGroup[]>([])
	const [activeGroupId, setActiveGroupId] = useState<string | null>(null)
	const [posts, setPosts] = useState<CommunityPost[]>([])
	const [loadingGroups, setLoadingGroups] = useState(true)
	const [loadingPosts, setLoadingPosts] = useState(false)
	const [refreshing, setRefreshing] = useState(false)

	// Modal State
	const [modalVisible, setModalVisible] = useState(false)
	const [threadTitle, setThreadTitle] = useState('')
	const [threadContent, setThreadContent] = useState('')
	const [submitting, setSubmitting] = useState(false)

	const fetchGroups = async () => {
		setLoadingGroups(true)
		try {
			const res = await listCommunityGroups()
			if (res.success && res.data) {
				setGroups(res.data)
				if (res.data.length > 0 && !activeGroupId) {
					setActiveGroupId(res.data[0].id)
				}
			}
		} catch (err) {
			console.error('Error fetching community groups:', err)
		} finally {
			setLoadingGroups(false)
		}
	}

	const fetchPosts = async (groupId: string) => {
		setLoadingPosts(true)
		try {
			const res = await listCommunityPosts(groupId)
			if (res.success && res.data) {
				setPosts(res.data)
			}
		} catch (err) {
			console.error('Error fetching community posts:', err)
		} finally {
			setLoadingPosts(false)
		}
	}

	useEffect(() => {
		fetchGroups()
	}, [])

	useEffect(() => {
		if (activeGroupId) {
			fetchPosts(activeGroupId)
		}
	}, [activeGroupId])

	const onRefresh = async () => {
		setRefreshing(true)
		await fetchGroups()
		if (activeGroupId) {
			await fetchPosts(activeGroupId)
		}
		setRefreshing(false)
	}

	const handleCreateThread = async () => {
		if (!activeGroupId) return
		if (!threadTitle.trim() || !threadContent.trim()) {
			Toast.show({ type: 'error', text1: 'Please enter both a title and content for your post.' })
			return
		}
		setSubmitting(true)
		try {
			const res = await createCommunityPost(activeGroupId, threadTitle, threadContent)
			if (res.success) {
				Toast.show({ type: 'success', text1: 'Discussion thread created successfully!' })
				setThreadTitle('')
				setThreadContent('')
				setModalVisible(false)
				fetchPosts(activeGroupId)
			}
		} catch (err) {
			console.error('Error creating thread:', err)
			showStatusModal({
				status: 'error',
				title: "Couldn't create the post",
				description: 'Failed to create discussion thread. Please try again.',
				submitText: 'OK',
			})
		} finally {
			setSubmitting(false)
		}
	}

	const activeGroup = groups.find((g) => g.id === activeGroupId)

	return (
		<View style={styles.container}>
			<ScrollView
				contentContainerStyle={styles.scrollContent}
				refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0d9488']} />}
			>
				{/* Welcome Header */}
				<View style={styles.headerBox}>
					<Text style={styles.headerTitle}>Community Support Forums</Text>
					<Text style={styles.headerSub}>
						Share insights, find encouragement, and connect with patient support groups and verified medical professionals.
					</Text>
				</View>

				{/* Support Networks Group Chips */}
				<View style={styles.groupSection}>
					<Text style={styles.sectionLabel}>Support Networks</Text>
					{loadingGroups ? (
						<ActivityIndicator size="small" color="#0d9488" style={{ marginVertical: 10 }} />
					) : (
						<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.groupScroll}>
							{groups.map((group) => {
								const isActive = group.id === activeGroupId
								return (
									<TouchableOpacity
										key={group.id}
										style={[styles.groupChip, isActive && styles.groupChipActive]}
										onPress={() => setActiveGroupId(group.id)}
										activeOpacity={0.8}
									>
										<MaterialCommunityIcons
											name="account-group"
											size={16}
											color={isActive ? '#ffffff' : '#0d9488'}
											style={{ marginRight: 6 }}
										/>
										<Text style={[styles.groupChipText, isActive && styles.groupChipTextActive]}>
											{group.name}
										</Text>
									</TouchableOpacity>
								)
							})}
						</ScrollView>
					)}
				</View>

				{/* Active Group Header Banner */}
				{activeGroup && (
					<Card style={styles.activeGroupCard}>
						<Card.Content>
							<View style={styles.activeGroupTopRow}>
								<View style={{ flex: 1 }}>
									<Chip style={styles.categoryChip} textStyle={styles.categoryChipText}>
										{activeGroup.category}
									</Chip>
									<Text style={styles.activeGroupName}>{activeGroup.name}</Text>
								</View>
								<Button
									mode="contained"
									buttonColor="#0d9488"
									icon="plus"
									style={{ borderRadius: 10 }}
									labelStyle={{ fontSize: 12, fontWeight: '700' }}
									onPress={() => setModalVisible(true)}
								>
									New Thread
								</Button>
							</View>
							{activeGroup.description && (
								<Text style={styles.activeGroupDesc}>{activeGroup.description}</Text>
							)}
						</Card.Content>
					</Card>
				)}

				{/* Threads List */}
				<Text style={styles.sectionLabel}>Discussion Threads</Text>
				{loadingPosts ? (
					<ActivityIndicator size="large" color="#0d9488" style={{ marginVertical: 30 }} />
				) : posts.length === 0 ? (
					<View style={styles.emptyCard}>
						<MaterialCommunityIcons name="forum-outline" size={48} color="#94a3b8" />
						<Text style={styles.emptyTitle}>No discussions started yet</Text>
						<Text style={styles.emptySub}>Be the first to create a discussion thread in this support group!</Text>
					</View>
				) : (
					posts.map((post) => {
						const isDoctor = post.user_role === 'doctor'
						return (
							<TouchableOpacity
								key={post.id}
								activeOpacity={0.85}
								onPress={() => navigation.navigate(ROUTES.STACK.COMMUNITY_THREAD, { threadId: post.id })}
							>
								<Card style={styles.postCard}>
									<Card.Content>
										<View style={styles.postMetaRow}>
											{post.is_pinned && (
												<MaterialCommunityIcons name="pin" size={16} color="#ef4444" style={{ marginRight: 4 }} />
											)}
											<Text style={styles.postMetaText}>
												Posted {new Date(post.created_at).toLocaleDateString()} by{' '}
												<Text style={{ fontWeight: '700', color: '#0f172a' }}>{post.user_name}</Text>
											</Text>
											{isDoctor && (
												<View style={styles.verifiedBadge}>
													<MaterialCommunityIcons name="check-decagram" size={14} color="#0d9488" />
													<Text style={styles.verifiedBadgeText}>Verified MD</Text>
												</View>
											)}
										</View>

										<Text style={styles.postTitle}>{post.title}</Text>
										<Text style={styles.postContentSnippet} numberOfLines={3}>
											{post.content}
										</Text>

										<View style={styles.postFooterRow}>
											<MaterialCommunityIcons name="comment-outline" size={16} color="#0d9488" />
											<Text style={styles.joinText}>Join Discussion</Text>
											<MaterialCommunityIcons name="chevron-right" size={16} color="#0d9488" />
										</View>
									</Card.Content>
								</Card>
							</TouchableOpacity>
						)
					})
				)}

				{/* Medical Disclaimer Box */}
				<View style={styles.disclaimerCard}>
					<MaterialCommunityIcons name="medical-bag" size={20} color="#0f766e" />
					<View style={{ flex: 1, marginLeft: 8 }}>
						<Text style={styles.disclaimerTitle}>Medical Advice Warning</Text>
						<Text style={styles.disclaimerSub}>
							Discussion boards are for peer support. Consult a verified physician or use the portal chat assistant for diagnostic queries.
						</Text>
					</View>
				</View>
			</ScrollView>

			{/* New Thread Modal */}
			<Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>Start a New Discussion</Text>
							<TouchableOpacity onPress={() => setModalVisible(false)}>
								<MaterialCommunityIcons name="close" size={22} color="#64748b" />
							</TouchableOpacity>
						</View>
						<Text style={styles.modalSub}>
							Ask a question, post a health experience, or seek advice from support group peers.
						</Text>

						<Text style={styles.inputLabel}>Title</Text>
						<TextInput
							style={styles.textInput}
							placeholder="E.g., Tips for managing diabetic glucose spikes after meals"
							value={threadTitle}
							onChangeText={setThreadTitle}
						/>

						<Text style={styles.inputLabel}>Content</Text>
						<TextInput
							style={[styles.textInput, styles.textArea]}
							placeholder="Provide details about your query or experience..."
							multiline
							numberOfLines={5}
							textAlignVertical="top"
							value={threadContent}
							onChangeText={setThreadContent}
						/>

						<View style={styles.modalActions}>
							<Button mode="outlined" onPress={() => setModalVisible(false)} style={{ flex: 1, marginRight: 8 }}>
								Cancel
							</Button>
							<Button
								mode="contained"
								buttonColor="#0d9488"
								loading={submitting}
								disabled={submitting}
								onPress={handleCreateThread}
								style={{ flex: 1 }}
							>
								Publish Post
							</Button>
						</View>
					</View>
				</View>
			</Modal>
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
	groupSection: {
		marginBottom: 16,
	},
	sectionLabel: {
		fontSize: 12,
		fontWeight: '800',
		color: '#475569',
		letterSpacing: 0.5,
		textTransform: 'uppercase',
		marginBottom: 8,
	},
	groupScroll: {
		flexDirection: 'row',
		gap: 8,
		paddingRight: 16,
	},
	groupChip: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 20,
		backgroundColor: '#ffffff',
		borderWidth: 1,
		borderColor: '#e2e8f0',
	},
	groupChipActive: {
		backgroundColor: '#0d9488',
		borderColor: '#0d9488',
	},
	groupChipText: {
		fontSize: 13,
		fontWeight: '600',
		color: '#334155',
	},
	groupChipTextActive: {
		color: '#ffffff',
		fontWeight: '700',
	},
	activeGroupCard: {
		backgroundColor: '#ffffff',
		borderRadius: 14,
		marginBottom: 16,
		borderColor: '#e2e8f0',
		borderWidth: 1,
	},
	activeGroupTopRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 8,
	},
	categoryChip: {
		backgroundColor: '#f0fdf4',
		alignSelf: 'flex-start',
		marginBottom: 4,
	},
	categoryChipText: {
		color: '#16a34a',
		fontSize: 10,
		fontWeight: '700',
	},
	activeGroupName: {
		fontSize: 18,
		fontWeight: '800',
		color: '#0f172a',
	},
	activeGroupDesc: {
		fontSize: 13,
		color: '#64748b',
		marginTop: 4,
	},
	emptyCard: {
		backgroundColor: '#ffffff',
		borderRadius: 14,
		padding: 24,
		alignItems: 'center',
		borderColor: '#e2e8f0',
		borderWidth: 1,
		marginVertical: 10,
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
	postCard: {
		backgroundColor: '#ffffff',
		borderRadius: 14,
		marginBottom: 12,
		borderColor: '#e2e8f0',
		borderWidth: 1,
	},
	postMetaRow: {
		flexDirection: 'row',
		alignItems: 'center',
		flexWrap: 'wrap',
		gap: 4,
		marginBottom: 8,
	},
	postMetaText: {
		fontSize: 11.5,
		color: '#64748b',
	},
	verifiedBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#ccfbf1',
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 6,
		gap: 2,
	},
	verifiedBadgeText: {
		fontSize: 10,
		fontWeight: '700',
		color: '#0f766e',
	},
	postTitle: {
		fontSize: 15.5,
		fontWeight: '700',
		color: '#0f172a',
		marginBottom: 6,
	},
	postContentSnippet: {
		fontSize: 13,
		color: '#475569',
		lineHeight: 18,
		marginBottom: 12,
	},
	postFooterRow: {
		flexDirection: 'row',
		alignItems: 'center',
		borderTopWidth: 1,
		borderTopColor: '#f1f5f9',
		paddingTop: 10,
		gap: 4,
	},
	joinText: {
		fontSize: 12.5,
		fontWeight: '700',
		color: '#0d9488',
		flex: 1,
	},
	disclaimerCard: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#f0fdf4',
		padding: 14,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#bbf7d0',
		marginTop: 12,
	},
	disclaimerTitle: {
		fontSize: 12.5,
		fontWeight: '700',
		color: '#0f766e',
	},
	disclaimerSub: {
		fontSize: 11.5,
		color: '#166534',
		marginTop: 2,
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(15, 23, 42, 0.5)',
		justifyContent: 'center',
		padding: 16,
	},
	modalContent: {
		backgroundColor: '#ffffff',
		borderRadius: 16,
		padding: 20,
	},
	modalHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 6,
	},
	modalTitle: {
		fontSize: 17,
		fontWeight: '800',
		color: '#0f172a',
	},
	modalSub: {
		fontSize: 12.5,
		color: '#64748b',
		marginBottom: 16,
	},
	inputLabel: {
		fontSize: 12,
		fontWeight: '700',
		color: '#334155',
		marginBottom: 4,
	},
	textInput: {
		borderWidth: 1,
		borderColor: '#cbd5e1',
		borderRadius: 8,
		paddingHorizontal: 12,
		paddingVertical: 8,
		fontSize: 14,
		backgroundColor: '#ffffff',
		marginBottom: 12,
	},
	textArea: {
		height: 100,
	},
	modalActions: {
		flexDirection: 'row',
		marginTop: 8,
	},
})
