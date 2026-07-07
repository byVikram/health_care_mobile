import React, { useState } from 'react'

import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	ScrollView,
	StyleSheet,
	Image,
	ImageSourcePropType,
	ActivityIndicator,
	Alert,
} from 'react-native'
import { USER_ROLES } from '../../../constants/constants'
import { useAuth } from '../../../context/AuthContext'

export type PatientQuestion = {
	id: string
	askedFor: string
	age: number
	location: string
	timeAgo: string
	title: string
	body: string
	answerCount: number
	avatarUrl?: string
	avatarImage?: ImageSourcePropType
}

type Props = {
	questions?: PatientQuestion[]
	loading?: boolean
	onSubmitAnswer?: (questionId: string, answer: string) => Promise<void>
}

const MOCK_QUESTIONS: PatientQuestion[] = [
	{
		id: '1',
		askedFor: 'Female',
		avatarImage: { uri: 'https://i.pravatar.cc/100?img=47' },
		age: 30,
		location: 'Bengaluru',
		timeAgo: '1d ago',
		title: 'Chance of esophageal cancer?',
		body: '2 months ago i vomited with 1.5 cup blood, some days ago i had severe heart burn and difficulty swallowing. The swallowing diffi...',
		answerCount: 10,
	},
	{
		id: '2',
		askedFor: 'Female',
		avatarImage: { uri: 'https://i.pravatar.cc/100?img=32' },
		age: 30,
		location: 'Bengaluru',
		timeAgo: '1d ago',
		title: 'Chance of esophageal cancer?',
		body: '2 months ago i vomited with 1.5 cup blood, some days ago i had severe heart burn and difficulty swallowing. The swallowing diffi...',
		answerCount: 10,
	},
	{
		id: '3',
		askedFor: 'Female',
		avatarImage: { uri: 'https://i.pravatar.cc/100?img=48' },
		age: 30,
		location: 'Bengaluru',
		timeAgo: '1d ago',
		title: 'Chance of esophageal cancer?',
		body: '2 months ago i vomited with 1.5 cup blood, some days ago i had severe heart burn and difficulty swallowing. The swallowing diffi...',
		answerCount: 10,
	},
	{
		id: '4',
		askedFor: 'Male',
		avatarImage: { uri: 'https://i.pravatar.cc/100?img=12' },
		age: 30,
		location: 'Bengaluru',
		timeAgo: '1d ago',
		title: 'Chance of esophageal cancer?',
		body: '2 months ago i vomited with 1.5 cup blood, some days ago i had severe heart burn and difficulty swallowing. The swallowing diffi...',
		answerCount: 10,
	},
]

const TEAL = '#2E8B8B'
const CARD_BORDER = '#D0D5D8'
const FOOTER_BG = '#DCE5E6'

function PatientQuestionsSection({ questions = MOCK_QUESTIONS, loading = false, onSubmitAnswer }: Props) {
	const { role } = useAuth()
	const isDoctor = role === USER_ROLES.DOCTOR
	const sectionTitle = role === USER_ROLES.PATIENT ? 'Free Expert Q&A' : "Take time to answer patients' questions"

	const [answers, setAnswers] = useState<Record<string, string>>({})
	const [submitting, setSubmitting] = useState<Record<string, boolean>>({})

	const handleSubmit = async (questionId: string) => {
		const answer = answers[questionId]?.trim()
		if (!answer) {
			Alert.alert('Please write an answer before submitting.')
			return
		}
		if (onSubmitAnswer) {
			setSubmitting((prev) => ({ ...prev, [questionId]: true }))
			try {
				await onSubmitAnswer(questionId, answer)
				setAnswers((prev) => ({ ...prev, [questionId]: '' }))
			} finally {
				setSubmitting((prev) => ({ ...prev, [questionId]: false }))
			}
		} else {
			Alert.alert('Answer submitted!', answer)
			setAnswers((prev) => ({ ...prev, [questionId]: '' }))
		}
	}

	return (
		<View style={styles.wrapper}>
			<Text style={styles.sectionTitle}>{sectionTitle}</Text>

			{loading ? (
				<ActivityIndicator color={TEAL} style={{ marginTop: 24 }} />
			) : (
				<ScrollView
					horizontal
					showsHorizontalScrollIndicator={false}
					contentContainerStyle={styles.scrollContent}
				>
					{questions.map((q) => (
						<View key={q.id} style={styles.card}>
							<View style={styles.questionCard}>
								<View style={styles.questionContent}>
									<View style={styles.cardHeader}>
										<View style={styles.avatarPlaceholder}>
											{q.avatarImage ? (
												<Image source={q.avatarImage} style={styles.avatar} />
											) : q.avatarUrl ? (
												<Image source={{ uri: q.avatarUrl }} style={styles.avatar} />
											) : (
												<Text style={styles.avatarText}>{q.askedFor[0]}</Text>
											)}
										</View>
										<View style={styles.headerInfo}>
											<Text style={styles.askedForPrimary}>Asked for {q.askedFor},</Text>
											<Text style={styles.askedForSecondary}>
												{q.age} Years, {q.location}
											</Text>
										</View>
										<Text style={styles.timeAgo}>{q.timeAgo}</Text>
									</View>

									<Text style={styles.questionTitle}>{q.title}</Text>
									<Text style={styles.questionBody}>{q.body}</Text>
								</View>

								<View style={styles.answerCountBar}>
									<View>
										<Text style={styles.answerCountText}>{q.answerCount} answers</Text>
										<Text style={styles.fromDoctorsText}>from other doctors</Text>
									</View>
									<View style={styles.doctorAvatarRow}>
										<Image
											source={{ uri: 'https://i.pravatar.cc/60?img=14' }}
											style={[styles.doctorAvatarImage, styles.miniAvatarTop]}
										/>
										<Image
											source={{ uri: 'https://i.pravatar.cc/60?img=22' }}
											style={[styles.doctorAvatarImage, styles.miniAvatarOverlap]}
										/>
										<View style={styles.plusBadge}>
											<Text style={styles.plusText}>6+</Text>
										</View>
									</View>
								</View>
							</View>

							{isDoctor && (
								<>
									<TextInput
										style={styles.answerInput}
										placeholder="Answer now:"
										placeholderTextColor="#BFC5CC"
										multiline
										value={answers[q.id] ?? ''}
										onChangeText={(text) => setAnswers((prev) => ({ ...prev, [q.id]: text }))}
									/>

									<TouchableOpacity
										style={[styles.submitButton, submitting[q.id] && styles.submitButtonDisabled]}
										onPress={() => handleSubmit(q.id)}
										disabled={submitting[q.id]}
										activeOpacity={0.85}
									>
										{submitting[q.id] ? (
											<ActivityIndicator color="#fff" />
										) : (
											<Text style={styles.submitText}>Submit</Text>
										)}
									</TouchableOpacity>
								</>
							)}
						</View>
					))}
				</ScrollView>
			)}
		</View>
	)
}

export default React.memo(PatientQuestionsSection)

const styles = StyleSheet.create({
	wrapper: {
		marginTop: 16,
		marginBottom: 8,
	},
	sectionTitle: {
		fontSize: 16,
		fontWeight: '700',
		color: '#1a1a1a',
		marginHorizontal: 16,
		marginBottom: 12,
	},
	scrollContent: {
		paddingHorizontal: 14,
		paddingBottom: 8,
	},
	card: {
		width: 234,
		marginHorizontal: 6,
	},
	questionCard: {
		backgroundColor: '#FFFFFF',
		borderRadius: 8,
		borderWidth: 1,
		borderColor: CARD_BORDER,
		overflow: 'hidden',
	},
	questionContent: {
		paddingHorizontal: 12,
		paddingTop: 12,
		paddingBottom: 10,
	},
	cardHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 10,
	},
	avatarPlaceholder: {
		width: 30,
		height: 30,
		borderRadius: 15,
		backgroundColor: '#DBE8EB',
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 8,
		overflow: 'hidden',
	},
	avatar: {
		width: 30,
		height: 30,
		borderRadius: 15,
	},
	avatarText: {
		color: TEAL,
		fontWeight: '700',
		fontSize: 12,
	},
	headerInfo: {
		flex: 1,
		paddingRight: 6,
	},
	askedForPrimary: {
		fontSize: 11,
		color: '#000',
		lineHeight: 13,
	},
	askedForSecondary: {
		fontSize: 11,
		color: '#6B6B6B',
		lineHeight: 13,
	},
	timeAgo: {
		fontSize: 11,
		color: '#797888',
	},
	questionTitle: {
		fontSize: 20,
		fontWeight: '500',
		color: '#000',
		lineHeight: 18,
		marginBottom: 18,
	},
	questionBody: {
		fontSize: 15,
		color: '#000',
		lineHeight: 20,
	},
	answerCountBar: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		backgroundColor: FOOTER_BG,
		paddingHorizontal: 12,
		paddingVertical: 10,
	},
	doctorAvatarRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginLeft: 10,
	},
	doctorAvatarImage: {
		width: 22,
		height: 22,
		borderRadius: 11,
		borderWidth: 1,
		borderColor: '#fff',
	},
	miniAvatarTop: {
		zIndex: 2,
	},
	miniAvatarOverlap: {
		marginLeft: -7,
		backgroundColor: '#8BC8D2',
		zIndex: 1,
	},
	plusBadge: {
		width: 22,
		height: 22,
		borderRadius: 11,
		backgroundColor: '#D9DDE0',
		alignItems: 'center',
		justifyContent: 'center',
		marginLeft: -7,
		zIndex: 3,
		borderWidth: 1,
		borderColor: '#fff',
	},
	plusText: {
		color: '#5F666D',
		fontSize: 9,
		fontWeight: '700',
	},
	answerCountText: {
		fontSize: 15,
		fontWeight: '500',
		color: '#797888',
		lineHeight: 18,
	},
	fromDoctorsText: {
		fontSize: 15,
		color: '#737B83',
		lineHeight: 18,
	},
	answerInput: {
		borderWidth: 1,
		borderColor: '#3D9395',
		borderRadius: 4,
		padding: 10,
		fontSize: 14,
		color: '#C7C9d9',
		minHeight: 108,
		textAlignVertical: 'top',
		marginTop: 10,
	},
	submitButton: {
		backgroundColor: '#2E7E80',
		borderRadius: 18,
		paddingVertical: 8,
		alignItems: 'center',
		marginTop: 12,
	},
	submitButtonDisabled: {
		opacity: 0.6,
	},
	submitText: {
		color: '#fff',
		fontWeight: '500',
		fontSize: 12,
	},
})
