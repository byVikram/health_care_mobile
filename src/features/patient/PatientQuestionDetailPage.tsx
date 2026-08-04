import React, { useEffect, useState } from 'react'
import {
	View,
	StyleSheet,
	ScrollView,
	TouchableOpacity,
	ActivityIndicator,
	TextInput,
	Alert,
	RefreshControl,
} from 'react-native'
import { Text, Card, Avatar, Chip, Button } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useRoute, useNavigation, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'

import {
	getQuestionDetail,
	likeDoctorAnswer,
	submitAnswerReply,
	submitDoctorAnswer,
	PatientQuestion,
	DoctorAnswer,
	DoctorAnswerReply,
} from '../../services/qaService'
import type { AppStackParamList } from '../../navigation/types'
import { useAuth } from '../../context/AuthContext'

type DetailRouteProp = RouteProp<AppStackParamList, 'PatientQuestionDetail'>

function ReplyNode({
	reply,
	answerId,
	onReplySubmit,
}: {
	reply: DoctorAnswerReply
	answerId: string
	onReplySubmit: (ansId: string, text: string, parentId?: string) => void
}) {
	const [showReplyBox, setShowReplyBox] = useState(false)
	const [replyText, setReplyText] = useState('')

	const handleSend = () => {
		if (!replyText.trim()) return
		onReplySubmit(answerId, replyText, reply.id)
		setReplyText('')
		setShowReplyBox(false)
	}

	const isDoctor = reply.user_role === 'doctor'

	return (
		<View style={styles.replyNodeBox}>
			<View style={styles.replyHeader}>
				<Text style={styles.replyUser}>{reply.user_name}</Text>
				{isDoctor && (
					<View style={styles.verifiedMdBadge}>
						<MaterialCommunityIcons name="check-decagram" size={12} color="#0d9488" />
						<Text style={styles.verifiedMdText}>Verified MD</Text>
					</View>
				)}
				<Text style={styles.replyDate}>{new Date(reply.created_at).toLocaleDateString()}</Text>
			</View>
			<Text style={styles.replyBody}>{reply.content}</Text>

			<TouchableOpacity onPress={() => setShowReplyBox(!showReplyBox)} style={{ marginTop: 4 }}>
				<Text style={styles.replyTriggerText}>Reply</Text>
			</TouchableOpacity>

			{showReplyBox && (
				<View style={styles.inlineReplyForm}>
					<TextInput
						style={styles.inlineInput}
						placeholder={`Reply to ${reply.user_name}...`}
						value={replyText}
						onChangeText={setReplyText}
					/>
					<Button compact mode="contained" buttonColor="#0d9488" onPress={handleSend} style={{ marginTop: 4 }}>
						Send
					</Button>
				</View>
			)}

			{reply.replies &&
				reply.replies.map((child) => (
					<ReplyNode key={child.id} reply={child} answerId={answerId} onReplySubmit={onReplySubmit} />
				))}
		</View>
	)
}

export default function PatientQuestionDetailPage() {
	const route = useRoute<DetailRouteProp>()
	const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>()
	const { questionId } = route.params || {}
	const { role } = useAuth()

	const [q, setQ] = useState<PatientQuestion | null>(null)
	const [loading, setLoading] = useState(true)
	const [refreshing, setRefreshing] = useState(false)

	// Doctor Answer Input
	const [doctorAnswerText, setDoctorAnswerText] = useState('')
	const [submittingAnswer, setSubmittingAnswer] = useState(false)

	// Answer Reply Input
	const [activeReplyAnswerId, setActiveReplyAnswerId] = useState<string | null>(null)
	const [replyInputText, setReplyInputText] = useState('')

	const fetchQuestionData = async () => {
		if (!questionId) return
		try {
			const res = await getQuestionDetail(questionId)
			if (res.success && res.data) {
				setQ(res.data)
			}
		} catch (err) {
			console.error('Error fetching question details:', err)
			Alert.alert('Error', 'Medical question not found.')
			navigation.goBack()
		} finally {
			setLoading(false)
			setRefreshing(false)
		}
	}

	useEffect(() => {
		fetchQuestionData()
	}, [questionId])

	const handleLikeAnswer = async (answerId: string) => {
		try {
			const res = await likeDoctorAnswer(answerId)
			if (res.success) {
				Alert.alert('Upvoted', 'Thank you for upvoting this medical opinion!')
				fetchQuestionData()
			}
		} catch (err) {
			console.error('Error liking answer:', err)
		}
	}

	const handleSubmitDoctorAns = async () => {
		if (!questionId) return
		if (!doctorAnswerText.trim()) {
			Alert.alert('Empty Answer', 'Please enter your medical answer.')
			return
		}
		setSubmittingAnswer(true)
		try {
			const res = await submitDoctorAnswer(questionId, doctorAnswerText)
			if (res.success) {
				Alert.alert('Success', 'Your medical answer has been submitted.')
				setDoctorAnswerText('')
				fetchQuestionData()
			}
		} catch (err) {
			console.error('Error submitting doctor answer:', err)
			Alert.alert('Error', 'Failed to submit answer.')
		} finally {
			setSubmittingAnswer(false)
		}
	}

	const handlePostReply = async (answerId: string, text: string, parentId?: string) => {
		if (!text.trim()) return
		try {
			const res = await submitAnswerReply(answerId, text, parentId)
			if (res.success) {
				Alert.alert('Success', 'Reply posted!')
				setReplyInputText('')
				setActiveReplyAnswerId(null)
				fetchQuestionData()
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

	if (!q) return null

	return (
		<View style={styles.container}>
			<ScrollView
				contentContainerStyle={styles.scrollContent}
				refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchQuestionData() }} colors={['#0d9488']} />}
			>
				{/* Back Button */}
				<TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
					<MaterialCommunityIcons name="arrow-left" size={20} color="#0d9488" />
					<Text style={styles.backBtnText}>Back to Health Queries</Text>
				</TouchableOpacity>

				{/* Question Details Card */}
				<Card style={styles.qDetailCard}>
					<Card.Content>
						<View style={styles.topMetaRow}>
							<Chip style={styles.tagChip} textStyle={styles.tagChipText}>
								{q.tag}
							</Chip>
							<Text style={styles.dateText}>
								{new Date(q.created_at).toLocaleDateString()}
							</Text>
						</View>

						<Text style={styles.qTitle}>{q.question}</Text>

						<View style={styles.demoCard}>
							<MaterialCommunityIcons name="account-details" size={18} color="#0d9488" />
							<Text style={styles.demoCardText}>
								{q.age} Years • {q.gender} • {q.location}
							</Text>
						</View>

						<Text style={styles.sectionLabel}>Detailed Symptom Overview</Text>
						<Text style={styles.fullDescText}>{q.full_description || q.short_description}</Text>

						{q.history ? (
							<View style={styles.historyBox}>
								<Text style={styles.historyTitle}>Past Medical History</Text>
								<Text style={styles.historyText}>{q.history}</Text>
							</View>
						) : null}
					</Card.Content>
				</Card>

				{/* Doctor Answers Section */}
				<Text style={styles.sectionHeader}>Doctor Answers & Medical Opinions ({q.answers ? q.answers.length : 0})</Text>

				{(!q.answers || q.answers.length === 0) ? (
					<View style={styles.emptyAnswersCard}>
						<MaterialCommunityIcons name="doctor" size={40} color="#94a3b8" />
						<Text style={styles.emptyAnswersTitle}>Awaiting Doctor Response</Text>
						<Text style={styles.emptyAnswersSub}>Specialist doctors review questions and respond with verified advice shortly.</Text>
					</View>
				) : (
					q.answers.map((ans) => (
						<Card key={ans.id} style={styles.answerCard}>
							<Card.Content>
								{/* Doctor Profile Info */}
								<View style={styles.doctorProfileRow}>
									<Avatar.Text
										size={40}
										label={(ans.doctor_name || 'Dr').charAt(0).toUpperCase()}
										style={{ backgroundColor: '#0d9488' }}
									/>
									<View style={{ flex: 1, marginLeft: 10 }}>
										<View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
											<Text style={styles.doctorName}>{ans.doctor_name}</Text>
											<View style={styles.verifiedMdBadge}>
												<MaterialCommunityIcons name="check-decagram" size={13} color="#0d9488" />
												<Text style={styles.verifiedMdText}>Verified Doctor</Text>
											</View>
										</View>
										<Text style={styles.doctorSpec}>
											{ans.doctor_specialty} • {ans.doctor_hospital}
										</Text>
									</View>

									{/* Upvote Button */}
									<TouchableOpacity
										style={styles.likeBtn}
										onPress={() => handleLikeAnswer(ans.id)}
										activeOpacity={0.8}
									>
										<MaterialCommunityIcons name="thumb-up-outline" size={16} color="#0d9488" />
										<Text style={styles.likeCount}>{ans.likes || 0}</Text>
									</TouchableOpacity>
								</View>

								<Text style={styles.answerText}>{ans.answer}</Text>

								{/* Replies Section */}
								{ans.replies && ans.replies.length > 0 && (
									<View style={styles.repliesContainer}>
										{ans.replies.map((reply) => (
											<ReplyNode
												key={reply.id}
												reply={reply}
												answerId={ans.id}
												onReplySubmit={handlePostReply}
											/>
										))}
									</View>
								)}

								{/* Reply Trigger Input */}
								{activeReplyAnswerId === ans.id ? (
									<View style={styles.rootReplyBox}>
										<TextInput
											style={styles.rootReplyInput}
											placeholder="Write a reply to doctor's opinion..."
											value={replyInputText}
											onChangeText={setReplyInputText}
											multiline
										/>
										<View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
											<Button compact mode="outlined" onPress={() => setActiveReplyAnswerId(null)}>
												Cancel
											</Button>
											<Button
												compact
												mode="contained"
												buttonColor="#0d9488"
												onPress={() => handlePostReply(ans.id, replyInputText)}
											>
												Submit
											</Button>
										</View>
									</View>
								) : (
									<TouchableOpacity
										style={styles.addReplyBtn}
										onPress={() => setActiveReplyAnswerId(ans.id)}
									>
										<MaterialCommunityIcons name="comment-plus-outline" size={14} color="#0d9488" />
										<Text style={styles.addReplyText}>Reply to Doctor Answer</Text>
									</TouchableOpacity>
								)}
							</Card.Content>
						</Card>
					))
				)}

				{/* Submit Doctor Answer Box */}
				{role === 'doctor' && (
					<Card style={styles.submitAnsCard}>
						<Card.Content>
							<Text style={styles.submitAnsTitle}>Provide Medical Answer / Opinion</Text>
							<TextInput
								style={styles.ansInput}
								placeholder="Enter detailed medical guidance, diagnostic steps, or advice..."
								multiline
								numberOfLines={4}
								value={doctorAnswerText}
								onChangeText={setDoctorAnswerText}
							/>
							<Button
								mode="contained"
								buttonColor="#0d9488"
								loading={submittingAnswer}
								disabled={submittingAnswer}
								onPress={handleSubmitDoctorAns}
								style={{ marginTop: 10, borderRadius: 8 }}
							>
								Publish Doctor Answer
							</Button>
						</Card.Content>
					</Card>
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
	qDetailCard: {
		backgroundColor: '#ffffff',
		borderRadius: 16,
		marginBottom: 16,
		borderColor: '#e2e8f0',
		borderWidth: 1,
	},
	topMetaRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 8,
	},
	tagChip: {
		backgroundColor: '#e0f2f1',
		alignSelf: 'flex-start',
	},
	tagChipText: {
		color: '#0d9488',
		fontSize: 11,
		fontWeight: '700',
	},
	dateText: {
		fontSize: 11,
		color: '#64748b',
	},
	qTitle: {
		fontSize: 18,
		fontWeight: '800',
		color: '#0f172a',
		lineHeight: 24,
		marginBottom: 10,
	},
	demoCard: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#f0fdf4',
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 8,
		marginBottom: 12,
		gap: 6,
	},
	demoCardText: {
		fontSize: 12.5,
		fontWeight: '700',
		color: '#0f766e',
	},
	sectionLabel: {
		fontSize: 12,
		fontWeight: '800',
		color: '#475569',
		textTransform: 'uppercase',
		letterSpacing: 0.5,
		marginTop: 6,
		marginBottom: 4,
	},
	fullDescText: {
		fontSize: 14,
		color: '#334155',
		lineHeight: 20,
		marginBottom: 12,
	},
	historyBox: {
		backgroundColor: '#f8fafc',
		padding: 10,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: '#e2e8f0',
	},
	historyTitle: {
		fontSize: 12,
		fontWeight: '700',
		color: '#0f172a',
		marginBottom: 2,
	},
	historyText: {
		fontSize: 12.5,
		color: '#64748b',
	},
	sectionHeader: {
		fontSize: 14,
		fontWeight: '800',
		color: '#475569',
		marginBottom: 10,
	},
	emptyAnswersCard: {
		backgroundColor: '#ffffff',
		borderRadius: 14,
		padding: 24,
		alignItems: 'center',
		borderColor: '#e2e8f0',
		borderWidth: 1,
		marginBottom: 16,
	},
	emptyAnswersTitle: {
		fontSize: 15,
		fontWeight: '700',
		color: '#334155',
		marginTop: 8,
	},
	emptyAnswersSub: {
		fontSize: 12,
		color: '#64748b',
		textAlign: 'center',
		marginTop: 2,
	},
	answerCard: {
		backgroundColor: '#ffffff',
		borderRadius: 14,
		marginBottom: 12,
		borderColor: '#e2e8f0',
		borderWidth: 1,
	},
	doctorProfileRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 10,
	},
	doctorName: {
		fontSize: 14,
		fontWeight: '700',
		color: '#0f172a',
	},
	doctorSpec: {
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
	likeBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#e0f2f1',
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 20,
		gap: 4,
	},
	likeCount: {
		fontSize: 12,
		fontWeight: '700',
		color: '#0d9488',
	},
	answerText: {
		fontSize: 14,
		color: '#334155',
		lineHeight: 20,
		marginBottom: 10,
	},
	repliesContainer: {
		borderTopWidth: 1,
		borderTopColor: '#f1f5f9',
		paddingTop: 8,
		marginTop: 6,
	},
	replyNodeBox: {
		backgroundColor: '#f8fafc',
		borderRadius: 8,
		padding: 8,
		marginTop: 6,
		borderWidth: 1,
		borderColor: '#e2e8f0',
	},
	replyHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	replyUser: {
		fontSize: 12,
		fontWeight: '700',
		color: '#0f172a',
	},
	replyDate: {
		fontSize: 10,
		color: '#64748b',
		marginLeft: 'auto',
	},
	replyBody: {
		fontSize: 12.5,
		color: '#334155',
		marginTop: 2,
	},
	replyTriggerText: {
		fontSize: 11.5,
		fontWeight: '700',
		color: '#0d9488',
	},
	inlineReplyForm: {
		marginTop: 6,
	},
	inlineInput: {
		borderWidth: 1,
		borderColor: '#cbd5e1',
		borderRadius: 6,
		padding: 6,
		fontSize: 12,
		backgroundColor: '#ffffff',
	},
	rootReplyBox: {
		marginTop: 10,
		borderTopWidth: 1,
		borderTopColor: '#f1f5f9',
		paddingTop: 8,
	},
	rootReplyInput: {
		borderWidth: 1,
		borderColor: '#cbd5e1',
		borderRadius: 8,
		padding: 8,
		fontSize: 13,
		backgroundColor: '#f8fafc',
	},
	addReplyBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 8,
		gap: 4,
	},
	addReplyText: {
		fontSize: 12,
		fontWeight: '700',
		color: '#0d9488',
	},
	submitAnsCard: {
		backgroundColor: '#ffffff',
		borderRadius: 14,
		marginTop: 10,
		marginBottom: 16,
		borderColor: '#e2e8f0',
		borderWidth: 1,
	},
	submitAnsTitle: {
		fontSize: 14,
		fontWeight: '700',
		color: '#0f172a',
		marginBottom: 8,
	},
	ansInput: {
		borderWidth: 1,
		borderColor: '#cbd5e1',
		borderRadius: 8,
		padding: 10,
		fontSize: 13.5,
		minHeight: 90,
		textAlignVertical: 'top',
		backgroundColor: '#f8fafc',
	},
})
