import React, { useEffect, useState } from 'react'
import {
	View,
	StyleSheet,
	ScrollView,
	TouchableOpacity,
	ActivityIndicator,
	TextInput,
	RefreshControl,
	Modal,
	Alert,
} from 'react-native'
import { Text, Card, Chip, Button } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'

import {
	listHealthQuestions,
	submitHealthQuestion,
	PatientQuestion,
} from '../../services/qaService'
import { getPatientDetails } from '../profile/patient/PatientProfileService'
import { ROUTES } from '../../navigation/routes'
import type { AppStackParamList } from '../../navigation/types'

type QuestionsListRouteProp = RouteProp<AppStackParamList, typeof ROUTES.STACK.PATIENT_QUESTIONS_LIST>

export default function PatientQuestionsListPage() {
	const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>()
	const route = useRoute<QuestionsListRouteProp>()

	const [questions, setQuestions] = useState<PatientQuestion[]>([])
	const [loading, setLoading] = useState(true)
	const [refreshing, setRefreshing] = useState(false)
	const [searchQuery, setSearchQuery] = useState('')

	// Ask Question Modal State
	const [modalVisible, setModalVisible] = useState(false)
	const [submitting, setSubmitting] = useState(false)
	const [profileLoading, setProfileLoading] = useState(false)

	const [gender, setGender] = useState('Male')
	const [age, setAge] = useState('30 Years')
	const [location, setLocation] = useState('Bengaluru')
	const [tag, setTag] = useState('General Health')
	const [questionTitle, setQuestionTitle] = useState('')
	const [fullDesc, setFullDesc] = useState('')
	const [history, setHistory] = useState('')

	const fetchQuestions = async () => {
		setLoading(true)
		try {
			const res = await listHealthQuestions(searchQuery)
			if (res.success && res.data) {
				setQuestions(res.data)
			}
		} catch (err) {
			console.error('Error fetching health questions:', err)
		} finally {
			setLoading(false)
			setRefreshing(false)
		}
	}

	useEffect(() => {
		fetchQuestions()
	}, [searchQuery])

	useEffect(() => {
		if (route.params?.openAskModal) {
			setModalVisible(true)
		}
	}, [route.params])

	useEffect(() => {
		const loadPatientProfile = async () => {
			setProfileLoading(true)
			try {
				const res = await getPatientDetails()
				if (res.success && res.data) {
					const personal = res.data.personal || res.data
					if (personal?.gender) setGender(personal.gender)
					if (personal?.age) setAge(`${personal.age} Years`)
					else if (personal?.date_of_birth) {
						const birthYear = new Date(personal.date_of_birth).getFullYear()
						const currentYear = new Date().getFullYear()
						setAge(`${currentYear - birthYear} Years`)
					}
					if (personal?.city || personal?.location) setLocation(personal.city || personal.location)
				}
			} catch (err) {
				console.error('Failed to load patient profile for question modal:', err)
			} finally {
				setProfileLoading(false)
			}
		}

		if (modalVisible) {
			loadPatientProfile()
		}
	}, [modalVisible])

	const handleSubmitQuestion = async () => {
		if (!questionTitle.trim() || !fullDesc.trim()) {
			Alert.alert('Incomplete Question', 'Please enter both a question subject and a detailed description.')
			return
		}
		setSubmitting(true)
		try {
			const res = await submitHealthQuestion({
				gender,
				age,
				location,
				tag,
				question: questionTitle,
				short_description: questionTitle.substring(0, 80) + '...',
				full_description: fullDesc,
				history: history.trim() ? history : undefined,
			})
			if (res.success) {
				Alert.alert('Question Submitted', 'Your health question has been posted successfully! Verified medical experts will review and answer.')
				setQuestionTitle('')
				setFullDesc('')
				setHistory('')
				setModalVisible(false)
				fetchQuestions()
			}
		} catch (err) {
			console.error('Error submitting question:', err)
			Alert.alert('Submission Error', 'Failed to post health question. Please try again.')
		} finally {
			setSubmitting(false)
		}
	}

	return (
		<View style={styles.container}>
			<ScrollView
				contentContainerStyle={styles.scrollContent}
				refreshControl={
					<RefreshControl
						refreshing={refreshing}
						onRefresh={() => {
							setRefreshing(true)
							fetchQuestions()
						}}
						colors={['#0c7c7c']}
					/>
				}
			>
				{/* Header Section */}
				<View style={styles.headerBox}>
					<View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
						<Text style={styles.headerTitle}>Ask Health Questions</Text>
						<Button
							mode="contained"
							buttonColor="#0c7c7c"
							icon="plus"
							style={{ borderRadius: 10 }}
							labelStyle={{ fontSize: 12, fontWeight: '700' }}
							onPress={() => setModalVisible(true)}
						>
							Ask Question
						</Button>
					</View>
					<Text style={styles.headerSub}>
						Get confidential, verified medical answers & opinions from licensed doctors.
					</Text>
				</View>

				{/* Search Bar */}
				<View style={styles.searchBar}>
					<MaterialCommunityIcons name="magnify" size={20} color="#94a3b8" style={{ marginRight: 8 }} />
					<TextInput
						style={styles.searchInput}
						placeholder="Search symptoms, topics, or questions..."
						placeholderTextColor="#94a3b8"
						value={searchQuery}
						onChangeText={setSearchQuery}
					/>
					{searchQuery.length > 0 && (
						<TouchableOpacity onPress={() => setSearchQuery('')}>
							<MaterialCommunityIcons name="close-circle" size={18} color="#94a3b8" />
						</TouchableOpacity>
					)}
				</View>

				<Text style={styles.sectionHeader}>Public Medical Queries ({questions.length})</Text>

				{loading && !refreshing ? (
					<ActivityIndicator size="large" color="#0c7c7c" style={{ marginVertical: 30 }} />
				) : questions.length === 0 ? (
					<View style={styles.emptyCard}>
						<MaterialCommunityIcons name="help-circle-outline" size={48} color="#94a3b8" />
						<Text style={styles.emptyTitle}>No Questions Found</Text>
						<Text style={styles.emptySub}>Be the first to ask a medical question to our expert doctors.</Text>
					</View>
				) : (
					questions.map((item) => (
						<Card
							key={item.id}
							style={styles.qCard}
							onPress={() => navigation.navigate(ROUTES.STACK.PATIENT_QUESTION_DETAIL, { questionId: item.id })}
						>
							<Card.Content>
								<View style={styles.topMetaRow}>
									<Chip compact style={styles.tagChip} textStyle={styles.tagChipText}>
										{item.tag || 'General Health'}
									</Chip>
									<Text style={styles.dateText}>{new Date(item.created_at).toLocaleDateString()}</Text>
								</View>

								<Text style={styles.qTitle}>{item.question}</Text>
								<Text style={styles.qSnippet} numberOfLines={2}>
									{item.short_description || item.full_description}
								</Text>

								<View style={styles.qFooterRow}>
									<View style={styles.demoBadge}>
										<MaterialCommunityIcons name="account-outline" size={14} color="#64748b" />
										<Text style={styles.demoText}>
											Asked for {item.gender || 'Patient'}{item.age ? `, ${item.age}` : ''}
										</Text>
									</View>

									<View style={styles.answersBadge}>
										<MaterialCommunityIcons name="doctor" size={14} color="#0f766e" />
										<Text style={styles.answersCountText}>
											{item.answers ? item.answers.length : 0} Doctors Answered
										</Text>
									</View>
								</View>
							</Card.Content>
						</Card>
					))
				)}
			</ScrollView>

			{/* Ask Question Modal */}
			<Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>Ask a Medical Question</Text>
							<TouchableOpacity onPress={() => setModalVisible(false)}>
								<MaterialCommunityIcons name="close" size={24} color="#64748b" />
							</TouchableOpacity>
						</View>

						<Text style={styles.modalSub}>
							Medical experts will review your question and respond with verified clinical guidance.
						</Text>

						<ScrollView showsVerticalScrollIndicator={false}>
							{/* Demographic Badges */}
							<View style={styles.demographicRow}>
								<View style={styles.demoCol}>
									<Text style={styles.inputLabel}>Gender</Text>
									<TextInput style={[styles.textInput, styles.readOnlyInput]} value={gender} editable={false} />
								</View>
								<View style={styles.demoCol}>
									<Text style={styles.inputLabel}>Age</Text>
									<TextInput style={[styles.textInput, styles.readOnlyInput]} value={age} editable={false} />
								</View>
								<View style={styles.demoCol}>
									<Text style={styles.inputLabel}>Location</Text>
									<TextInput style={[styles.textInput, styles.readOnlyInput]} value={location} editable={false} />
								</View>
							</View>

							<Text style={styles.inputLabel}>Question Tag / Speciality</Text>
							<TextInput
								style={styles.textInput}
								placeholder="e.g. Cardiology, Pediatrics, General Health"
								value={tag}
								onChangeText={setTag}
							/>

							<Text style={styles.inputLabel}>Subject Question</Text>
							<TextInput
								style={styles.textInput}
								placeholder="What is your main question or symptom?"
								value={questionTitle}
								onChangeText={setQuestionTitle}
							/>

							<Text style={styles.inputLabel}>Detailed Description</Text>
							<TextInput
								style={[styles.textInput, styles.textArea]}
								placeholder="Explain when it started, details of symptoms, duration..."
								multiline
								numberOfLines={4}
								textAlignVertical="top"
								value={fullDesc}
								onChangeText={setFullDesc}
							/>

							<Text style={styles.inputLabel}>Past Medical History (Optional)</Text>
							<TextInput
								style={styles.textInput}
								placeholder="E.g. GERD, Hypertension, Allergies, Medications..."
								value={history}
								onChangeText={setHistory}
							/>

							<View style={styles.modalActions}>
								<Button mode="outlined" onPress={() => setModalVisible(false)} style={{ flex: 1, marginRight: 8 }}>
									Cancel
								</Button>
								<Button
									mode="contained"
									buttonColor="#0c7c7c"
									loading={submitting}
									disabled={submitting}
									onPress={handleSubmitQuestion}
									style={{ flex: 1 }}
								>
									Submit Question
								</Button>
							</View>
						</ScrollView>
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
		marginBottom: 14,
	},
	headerTitle: {
		fontSize: 22,
		fontWeight: '800',
		color: '#0f172a',
	},
	headerSub: {
		fontSize: 13,
		color: '#64748b',
		lineHeight: 18,
		marginTop: 4,
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
		marginBottom: 16,
	},
	searchInput: {
		flex: 1,
		fontSize: 13.5,
		color: '#0f172a',
	},
	sectionHeader: {
		fontSize: 13.5,
		fontWeight: '800',
		color: '#475569',
		marginBottom: 10,
		textTransform: 'uppercase',
		letterSpacing: 0.5,
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
	qCard: {
		backgroundColor: '#ffffff',
		borderRadius: 14,
		marginBottom: 12,
		borderColor: '#e2e8f0',
		borderWidth: 1,
	},
	topMetaRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 6,
	},
	tagChip: {
		backgroundColor: '#ccfbf1',
		alignSelf: 'flex-start',
	},
	tagChipText: {
		color: '#0f766e',
		fontSize: 10.5,
		fontWeight: '700',
	},
	dateText: {
		fontSize: 11,
		color: '#64748b',
	},
	qTitle: {
		fontSize: 15.5,
		fontWeight: '700',
		color: '#0f172a',
		marginBottom: 4,
	},
	qSnippet: {
		fontSize: 13,
		color: '#475569',
		lineHeight: 18,
		marginBottom: 10,
	},
	qFooterRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		borderTopWidth: 1,
		borderTopColor: '#f1f5f9',
		paddingTop: 8,
	},
	demoBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	demoText: {
		fontSize: 11.5,
		color: '#64748b',
	},
	answersBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#ccfbf1',
		paddingHorizontal: 8,
		paddingVertical: 3,
		borderRadius: 12,
		gap: 4,
	},
	answersCountText: {
		fontSize: 11,
		fontWeight: '700',
		color: '#0f766e',
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
		maxHeight: '85%',
	},
	modalHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 4,
	},
	modalTitle: {
		fontSize: 17,
		fontWeight: '800',
		color: '#0f172a',
	},
	modalSub: {
		fontSize: 12,
		color: '#64748b',
		marginBottom: 14,
	},
	demographicRow: {
		flexDirection: 'row',
		gap: 8,
		marginBottom: 4,
	},
	demoCol: {
		flex: 1,
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
		paddingHorizontal: 10,
		paddingVertical: 7,
		fontSize: 13,
		backgroundColor: '#ffffff',
		marginBottom: 10,
	},
	readOnlyInput: {
		backgroundColor: '#f1f5f9',
		borderColor: '#e2e8f0',
		color: '#475569',
	},
	textArea: {
		height: 80,
	},
	modalActions: {
		flexDirection: 'row',
		marginTop: 8,
		marginBottom: 12,
	},
})
