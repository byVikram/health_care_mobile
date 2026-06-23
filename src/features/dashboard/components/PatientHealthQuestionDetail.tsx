import React, { useState } from 'react'
import {
	View,
	Text,
	Image,
	ScrollView,
	TouchableOpacity,
	StyleSheet,
	SafeAreaView,
	StatusBar,
	TextInput,
} from 'react-native'
import { useRoute, RouteProp } from '@react-navigation/native'
import { PatientQuestion } from '../../../constants/Questionmockdata'
import { useAuth } from '../../../context/AuthContext'
import { AppButton } from '../../../components/common'

type RouteParams = {
	question: PatientQuestion
}

export default function PatientHealthQuestionDetail() {
	const { role } = useAuth()
	const isDoctor = role === 'doctor'

	const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>()
	const [localQuestion, setLocalQuestion] = useState(route.params.question)

	const [liked, setLiked] = useState<Record<number, boolean>>({})
	const [activeReplyId, setActiveReplyId] = useState<number | null>(null)
	const [expandedReplies, setExpandedReplies] = useState<Record<number, boolean>>({})
	const [replyText, setReplyText] = useState<Record<number, string>>({})

	// LIKE
	const toggleLike = (id: number) => {
		setLiked((prev) => ({
			...prev,
			[id]: !prev[id],
		}))
	}

	// TOGGLE REPLIES
	const toggleReplies = (id: number) => {
		setExpandedReplies((prev) => ({
			...prev,
			[id]: !prev[id],
		}))
	}

	// INPUT
	const handleReplyChange = (id: number, text: string) => {
		setReplyText((prev) => ({
			...prev,
			[id]: text,
		}))
	}

	// SUBMIT (mock)
	const submitReply = (answerId: number) => {
		const text = replyText[answerId]

		if (!text?.trim()) return

		const newReply = {
			id: Date.now(),
			name: isDoctor ? 'Doctor' : 'Patient',
			avatar: isDoctor ? 'https://i.pravatar.cc/150?img=12' : 'https://i.pravatar.cc/150?img=47',
			timeAgo: 'Just now',
			reply: text,
			likes: 0,
		}

		const updatedAnswers = localQuestion.answers.map((ans) => {
			if (ans.id === answerId) {
				return {
					...ans,
					patientReplies: [...(ans.patientReplies || []), newReply],
				}
			}
			return ans
		})

		setLocalQuestion({
			...localQuestion,
			answers: updatedAnswers,
		})

		setReplyText((prev) => ({
			...prev,
			[answerId]: '',
		}))

		setActiveReplyId(null)

		setExpandedReplies((prev) => ({
			...prev,
			[answerId]: true,
		}))
	}

	return (
		<SafeAreaView style={styles.safeArea}>
			<StatusBar barStyle="dark-content" />

			<ScrollView>
				<View style={styles.content}>
					{/* QUESTION */}
					<Text style={styles.title}>{localQuestion.question}</Text>
					<Text style={styles.desc}>{localQuestion.fullDescription}</Text>

					{/* PATIENT INFO */}
					<View style={styles.patientCard}>
						<Image source={{ uri: localQuestion.patientAvatar }} style={styles.avatar} />
						<View>
							<Text style={styles.name}>{localQuestion.patientLabel}</Text>
							<Text style={styles.meta}>{localQuestion.patientLocation}</Text>
							<Text style={styles.meta}>{localQuestion.history}</Text>
						</View>
					</View>

					<Text style={styles.section}>Expert Answers ({localQuestion.answers.length})</Text>

					{/* ANSWERS */}
					{localQuestion.answers.map((answer) => (
						<View key={answer.id} style={styles.card}>
							{/* DOCTOR */}
							<View style={styles.docRow}>
								<Image source={{ uri: answer.avatar }} style={styles.docAvatar} />
								<View>
									<Text style={styles.docName}>
										{answer.doctorName} • {answer.specialty}
									</Text>
									<Text style={styles.docMeta}>
										{answer.hospital} • {answer.timeAgo}
									</Text>
								</View>
							</View>

							{/* ANSWER */}
							<Text style={styles.answer}>{answer.answer}</Text>

							{/* ACTIONS */}
							<View style={styles.actions}>
								<TouchableOpacity onPress={() => toggleLike(answer.id)}>
									<Text style={styles.actionText}>
										❤️ {liked[answer.id] ? answer.likes + 1 : answer.likes}
									</Text>
								</TouchableOpacity>

								<TouchableOpacity onPress={() => setActiveReplyId(answer.id)}>
									<Text style={styles.actionText}> 💬 Reply</Text>
								</TouchableOpacity>
							</View>

							{/* VIEW REPLIES */}
							{answer.patientReplies?.length ? (
								<TouchableOpacity onPress={() => toggleReplies(answer.id)}>
									<Text style={styles.viewReplies}>View {answer.patientReplies.length} replies</Text>
								</TouchableOpacity>
							) : null}

							{/* REPLIES */}
							{expandedReplies[answer.id] &&
								answer.patientReplies?.map((reply) => (
									<View key={reply.id} style={styles.replyBox}>
										<Image source={{ uri: reply.avatar }} style={styles.replyAvatar} />
										<View style={{ flex: 1 }}>
											<Text style={styles.replyName}>{reply.name}</Text>
											<Text style={styles.replyText}>{reply.reply}</Text>
											<Text style={styles.replyMeta}>
												{reply.timeAgo} • ❤️ {reply.likes}
											</Text>
										</View>
									</View>
								))}

							{/* INPUT */}
							{activeReplyId === answer.id && (
								<View style={styles.replyInputContainer}>
									{/* LEFT AVATAR */}
									<Image
										source={{
											uri: isDoctor
												? 'https://i.pravatar.cc/150?img=12'
												: 'https://i.pravatar.cc/150?img=47',
										}}
										style={styles.replyAvatarSmall}
									/>

									{/* INPUT AREA */}
									<View style={styles.replyBox}>
										{/* <Text style={styles.replyHint}>
				Reply as {isDoctor ? 'Doctor' : 'Patient'}
			</Text> */}

										<TextInput
											value={replyText[answer.id] || ''}
											onChangeText={(text) => handleReplyChange(answer.id, text)}
											placeholder="Write your reply..."
											placeholderTextColor="#999"
											style={styles.replyInput}
											multiline
										/>
									</View>

									{/* SEND BUTTON */}
									<AppButton
										variant="outline"
										onPress={() => submitReply(answer.id)}
										disabled={!replyText[answer.id]?.trim()}
									>
										Post
									</AppButton>
								</View>
							)}
						</View>
					))}
				</View>
			</ScrollView>
		</SafeAreaView>
	)
}
const styles = StyleSheet.create({
	replyInputContainer: {
		flexDirection: 'row',
		alignItems: 'flex-end',
		backgroundColor: '#fff',
		borderWidth: 1,
		borderColor: '#e6e6e6',
		borderRadius: 14,
		padding: 10,
		marginTop: 12,

		shadowColor: '#000',
		shadowOpacity: 0.06,
		shadowRadius: 6,
		elevation: 2,
	},

	replyAvatarSmall: {
		width: 30,
		height: 30,
		borderRadius: 15,
		marginRight: 8,
		marginBottom: 4,
	},

	replyBox: {
		flexDirection: 'row',
		backgroundColor: '#f9f9f9',
		padding: 10,
		borderRadius: 10,
		marginTop: 10,

		marginLeft: 12,
	},

	replyHint: {
		fontSize: 10,
		color: '#888',
		marginBottom: 2,
	},

	replyInput: {
		fontSize: 13,
		color: '#222',
		maxHeight: 80,
		paddingVertical: 4,
	},

	sendBtn: {
		backgroundColor: '#007bff',
		paddingHorizontal: 14,
		paddingVertical: 8,
		borderRadius: 20,
		marginLeft: 8,
		marginBottom: 2,
	},

	sendBtnDisabled: {
		backgroundColor: '#bcdcff',
	},

	sendText: {
		color: '#fff',
		fontWeight: '600',
		fontSize: 12,
	},
	// replyUserAvatar: {
	// 	width: 28,
	// 	height: 28,
	// 	borderRadius: 14,
	// 	marginRight: 8,
	// },

	// input: {
	// 	flex: 1,
	// 	fontSize: 13,
	// 	paddingVertical: 4,
	// },

	// sendButton: {
	// 	backgroundColor: '#007bff',
	// 	paddingHorizontal: 14,
	// 	paddingVertical: 6,
	// 	borderRadius: 20,
	// 	marginLeft: 8,
	// },

	safeArea: { flex: 1, backgroundColor: '#fff' },
	container: { flex: 1 },
	content: { padding: 20 },

	title: { fontSize: 20, fontWeight: '700', marginBottom: 10 },
	desc: { fontSize: 14, color: '#444', marginBottom: 20 },

	patientCard: {
		flexDirection: 'row',
		backgroundColor: '#f7f7f7',
		padding: 12,
		borderRadius: 10,
		marginBottom: 20,
	},

	avatar: { width: 45, height: 45, borderRadius: 22 },
	name: { fontWeight: '700' },
	meta: { fontSize: 12, color: '#666' },

	section: { fontWeight: '700', marginBottom: 10 },

	card: {
		backgroundColor: '#fff',
		borderBottomWidth: 1,
		borderBottomColor: '#eee',
		paddingVertical: 12,
	},

	docRow: { flexDirection: 'row', marginBottom: 8 },
	docAvatar: { width: 38, height: 38, borderRadius: 19, marginRight: 10 },
	docName: { fontWeight: '700' },
	docMeta: { fontSize: 11, color: '#888' },

	answer: { fontSize: 14, color: '#333', marginBottom: 10 },

	actions: { flexDirection: 'row', gap: 15, marginBottom: 6 },
	actionText: { color: '#666' },

	viewReplies: {
		color: '#007bff',
		fontSize: 12,
		marginBottom: 8,
	},

	replyAvatar: { width: 28, height: 28, borderRadius: 14, marginRight: 8 },
	replyName: { fontWeight: '600', fontSize: 12 },
	replyText: { fontSize: 12, color: '#333' },
	replyMeta: { fontSize: 10, color: '#888' },

	// replyInputBox: {
	// 	flexDirection: 'row',
	// 	alignItems: 'center',
	// 	marginTop: 10,
	// 	backgroundColor: '#f2f2f2',
	// 	borderRadius: 8,
	// 	paddingHorizontal: 8,
	// },
})
