import React, { useState } from "react";
import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	ScrollView,
	StyleSheet,
	Image,
	ActivityIndicator,
	Alert,
} from "react-native";

export type PatientQuestion = {
	id: string;
	askedFor: string;
	age: number;
	location: string;
	timeAgo: string;
	title: string;
	body: string;
	answerCount: number;
	avatarUrl?: string;
};

type Props = {
	questions?: PatientQuestion[];
	loading?: boolean;
	onSubmitAnswer?: (questionId: string, answer: string) => Promise<void>;
};

const MOCK_QUESTIONS: PatientQuestion[] = [
	{
		id: "1",
		askedFor: "Female",
		age: 30,
		location: "Bengaluru",
		timeAgo: "1d ago",
		title: "Chance of esophageal cancer?",
		body: "2 months ago i vomited with 1.5 cup blood, some days ago i had severe heart burn and difficulty swallowing. The swallowing diffi...",
		answerCount: 10,
	},
	{
		id: "2",
		askedFor: "Female",
		age: 30,
		location: "Bengaluru",
		timeAgo: "1d ago",
		title: "Chance of esophageal cancer?",
		body: "2 months ago i vomited with 1.5 cup blood, some days ago i had severe heart burn and difficulty swallowing. The swallowing diffi...",
		answerCount: 10,
	},
	{
		id: "3",
		askedFor: "Female",
		age: 30,
		location: "Bengaluru",
		timeAgo: "1d ago",
		title: "Chance of esophageal cancer?",
		body: "2 months ago i vomited with 1.5 cup blood, some days ago i had severe heart burn and difficulty swallowing. The swallowing diffi...",
		answerCount: 10,
	},
	{
		id: "4",
		askedFor: "Female",
		age: 30,
		location: "Bengaluru",
		timeAgo: "1d ago",
		title: "Chance of esophageal cancer?",
		body: "2 months ago i vomited with 1.5 cup blood, some days ago i had severe heart burn and difficulty swallowing. The swallowing diffi...",
		answerCount: 10,
	},
];

const TEAL = "#2E8B8B";
const TEAL_LIGHT = "#E6F4F4";

export default function PatientQuestionsSection({
	questions = MOCK_QUESTIONS,
	loading = false,
	onSubmitAnswer,
}: Props) {
	const [answers, setAnswers] = useState<Record<string, string>>({});
	const [submitting, setSubmitting] = useState<Record<string, boolean>>({});

	const handleSubmit = async (questionId: string) => {
		const answer = answers[questionId]?.trim();
		if (!answer) {
			Alert.alert("Please write an answer before submitting.");
			return;
		}
		if (onSubmitAnswer) {
			setSubmitting((prev) => ({ ...prev, [questionId]: true }));
			try {
				await onSubmitAnswer(questionId, answer);
				setAnswers((prev) => ({ ...prev, [questionId]: "" }));
			} finally {
				setSubmitting((prev) => ({ ...prev, [questionId]: false }));
			}
		} else {
			Alert.alert("Answer submitted!", answer);
			setAnswers((prev) => ({ ...prev, [questionId]: "" }));
		}
	};

	return (
		<View style={styles.wrapper}>
			<Text style={styles.sectionTitle}>
				Take a time to answer the Patients questions
			</Text>

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
							{/* Card Header */}
							<View style={styles.cardHeader}>
								<View style={styles.avatarPlaceholder}>
									{q.avatarUrl ? (
										<Image
											source={{ uri: q.avatarUrl }}
											style={styles.avatar}
										/>
									) : (
										<Text style={styles.avatarText}>
											{q.askedFor[0]}
										</Text>
									)}
								</View>
								<View style={styles.headerInfo}>
									<Text style={styles.askedFor}>
										Asked for {q.askedFor},{"\n"}
										{q.age} Years, {q.location}
									</Text>
								</View>
								<Text style={styles.timeAgo}>{q.timeAgo}</Text>
							</View>

							{/* Question Content */}
							<Text style={styles.questionTitle}>{q.title}</Text>
							<Text style={styles.questionBody}>{q.body}</Text>

							{/* Answer Count Badge */}
							<View style={styles.answerCountRow}>
								<View style={styles.answerCountBadge}>
									<View style={styles.doctorAvatarRow}>
										<View style={[styles.miniAvatar, { zIndex: 2 }]} />
										<View
											style={[
												styles.miniAvatar,
												{ zIndex: 1, marginLeft: -8 },
											]}
										/>
										<View style={styles.plusBadge}>
											<Text style={styles.plusText}>6+</Text>
										</View>
									</View>
									<View>
										<Text style={styles.answerCountText}>
											{q.answerCount} answers
										</Text>
										<Text style={styles.fromDoctorsText}>
											from other doctors
										</Text>
									</View>
								</View>
							</View>

							{/* Answer Input */}
							<TextInput
								style={styles.answerInput}
								placeholder="Answer now:"
								placeholderTextColor="#aaa"
								multiline
								value={answers[q.id] ?? ""}
								onChangeText={(text) =>
									setAnswers((prev) => ({ ...prev, [q.id]: text }))
								}
							/>

							{/* Submit Button */}
							<TouchableOpacity
								style={[
									styles.submitButton,
									submitting[q.id] && styles.submitButtonDisabled,
								]}
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
						</View>
					))}
				</ScrollView>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	wrapper: {
		marginTop: 16,
		marginBottom: 8,
	},
	sectionTitle: {
		fontSize: 16,
		fontWeight: "700",
		color: "#1a1a1a",
		marginHorizontal: 16,
		marginBottom: 12,
	},
	scrollContent: {
		paddingHorizontal: 12,
		paddingBottom: 8,
	},
	card: {
		width: 240,
		backgroundColor: "#fff",
		borderRadius: 14,
		marginHorizontal: 6,
		padding: 14,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.07,
		shadowRadius: 6,
		elevation: 3,
	},
	cardHeader: {
		flexDirection: "row",
		alignItems: "flex-start",
		marginBottom: 10,
	},
	avatarPlaceholder: {
		width: 36,
		height: 36,
		borderRadius: 18,
		backgroundColor: TEAL_LIGHT,
		alignItems: "center",
		justifyContent: "center",
		marginRight: 8,
	},
	avatar: {
		width: 36,
		height: 36,
		borderRadius: 18,
	},
	avatarText: {
		color: TEAL,
		fontWeight: "700",
		fontSize: 14,
	},
	headerInfo: {
		flex: 1,
	},
	askedFor: {
		fontSize: 11,
		color: "#555",
		lineHeight: 15,
	},
	timeAgo: {
		fontSize: 11,
		color: "#999",
	},
	questionTitle: {
		fontSize: 14,
		fontWeight: "700",
		color: "#111",
		marginBottom: 6,
	},
	questionBody: {
		fontSize: 12,
		color: "#555",
		lineHeight: 18,
		marginBottom: 12,
	},
	answerCountRow: {
		marginBottom: 10,
	},
	answerCountBadge: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: TEAL_LIGHT,
		borderRadius: 8,
		padding: 8,
		gap: 10,
	},
	doctorAvatarRow: {
		flexDirection: "row",
		alignItems: "center",
	},
	miniAvatar: {
		width: 22,
		height: 22,
		borderRadius: 11,
		backgroundColor: "#b2d8d8",
		borderWidth: 1.5,
		borderColor: "#fff",
	},
	plusBadge: {
		width: 22,
		height: 22,
		borderRadius: 11,
		backgroundColor: TEAL,
		alignItems: "center",
		justifyContent: "center",
		marginLeft: -8,
		zIndex: 3,
	},
	plusText: {
		color: "#fff",
		fontSize: 9,
		fontWeight: "700",
	},
	answerCountText: {
		fontSize: 12,
		fontWeight: "600",
		color: "#333",
	},
	fromDoctorsText: {
		fontSize: 10,
		color: "#777",
	},
	answerInput: {
		borderWidth: 1,
		borderColor: "#ddd",
		borderRadius: 8,
		padding: 10,
		fontSize: 13,
		color: "#333",
		minHeight: 80,
		textAlignVertical: "top",
		marginBottom: 10,
	},
	submitButton: {
		backgroundColor: TEAL,
		borderRadius: 24,
		paddingVertical: 11,
		alignItems: "center",
	},
	submitButtonDisabled: {
		opacity: 0.6,
	},
	submitText: {
		color: "#fff",
		fontWeight: "600",
		fontSize: 14,
	},
});