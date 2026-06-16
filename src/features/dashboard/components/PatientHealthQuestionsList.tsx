// src/features/dashboard/components/PatientHealthQuestionsList.tsx
import React, { useState } from 'react'
import { View, Text, TextInput, FlatList, TouchableOpacity, Image, StyleSheet } from 'react-native'

import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { MOCK_PATIENT_QUESTIONS, PatientQuestion } from '../../../constants/Questionmockdata'
import { ROUTES } from '../../../navigation/routes'
import type { AppNavigationParamList } from '../../../navigation/types'
import { useAuth } from '../../../context/AuthContext'
import { useNavigation, useRoute } from '@react-navigation/native'

type NavigationProp = NativeStackNavigationProp<AppNavigationParamList>

type Props = {
	showViewAll?: boolean
	itemLimit?: number
}

export default function PatientHealthQuestionsList({ showViewAll = true, itemLimit = 3 }: Props) {
	const navigation = useNavigation<NavigationProp>()
	const { role } = useAuth()

	const route = useRoute()

	const isQuestionsListScreen = route.name === ROUTES.STACK.PATIENT_QUESTIONS_LIST

	const [searchQuery, setSearchQuery] = useState('')

	const filteredQuestions = MOCK_PATIENT_QUESTIONS.filter(
		(q) =>
			q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
			q.shortDescription.toLowerCase().includes(searchQuery.toLowerCase())
	)

	const renderItem = ({ item }: { item: PatientQuestion }) => (
		<TouchableOpacity
			style={styles.card}
			onPress={() => navigation.navigate(ROUTES.STACK.PATIENT_QUESTION_DETAIL as any, { question: item })}
			activeOpacity={0.7}
		>
			<View style={styles.cardHeader}>
				<Image source={{ uri: item.patientAvatar }} style={styles.avatar} />
				<View style={styles.cardText}>
					<View style={styles.tagRow}>
						<Text style={styles.tag}>{item.tag}</Text>
						<Text style={styles.timeAgo}>{item.timeAgo}</Text>
					</View>
					<Text style={styles.question} numberOfLines={2}>
						{item.question}
					</Text>
					<Text style={styles.shortDesc} numberOfLines={2}>
						{item.shortDescription}
					</Text>
				</View>
			</View>
		</TouchableOpacity>
	)

	return (
		<>
			{/* Header outside card */}
			<View style={styles.headerContainer}>
				<Text style={styles.sectionTitle}>Health Questions</Text>

				{showViewAll && !isQuestionsListScreen && (
					<TouchableOpacity onPress={() => navigation.navigate(ROUTES.STACK.PATIENT_QUESTIONS_LIST as any)}>
						<Text style={styles.seeAllText}>View All</Text>
					</TouchableOpacity>
				)}
			</View>
			{/* Card */}
			<View style={styles.container}>
				<View style={styles.searchContainer}>
					<Text style={styles.searchIcon}>🔍</Text>

					<TextInput
						style={styles.searchInput}
						placeholder="Search questions..."
						placeholderTextColor="#999"
						value={searchQuery}
						onChangeText={setSearchQuery}
					/>
				</View>

				<FlatList
					data={isQuestionsListScreen ? filteredQuestions : filteredQuestions.slice(0, itemLimit)}
					keyExtractor={(item) => item.id.toString()}
					renderItem={renderItem}
					ItemSeparatorComponent={() => <View style={styles.separator} />}
					scrollEnabled={false}
					ListEmptyComponent={
						<View style={styles.emptyContainer}>
							<Text style={styles.emptyText}>No questions found</Text>
						</View>
					}
				/>
			</View>
		</>
	)
}

const styles = StyleSheet.create({
	headerContainer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginHorizontal: 16,
		marginTop: 16,
		marginBottom: 12,
	},

	container: {
		backgroundColor: '#fff',
		marginHorizontal: 16,
		borderRadius: 12,
		padding: 16,
	},
	sectionTitle: {
		fontWeight: '700',
		textAlign: 'center',
		color: '#1a1a1a',
	},
	seeAllText: {
		fontSize: 14,
		color: '#0c7c7c',
		fontWeight: '600',
	},
	searchContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#f7f7f7',
		paddingHorizontal: 12,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: '#e0e0e0',
		marginBottom: 12,
	},
	searchIcon: {
		fontSize: 18,
		marginRight: 8,
		color: '#888',
	},
	searchInput: {
		flex: 1,
		height: 44,
		fontSize: 16,
		color: '#333',
	},
	card: {
		paddingVertical: 12,
	},
	cardHeader: {
		flexDirection: 'row',
		alignItems: 'flex-start',
	},
	avatar: {
		width: 48,
		height: 48,
		borderRadius: 24,
		marginRight: 12,
		borderWidth: 1,
		borderColor: '#e0e0e0',
	},
	cardText: {
		flex: 1,
	},
	tagRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 4,
	},
	tag: {
		backgroundColor: '#e8f4f4',
		color: '#0c7c7c',
		fontSize: 10,
		fontWeight: '700',
		paddingHorizontal: 8,
		paddingVertical: 2,
		borderRadius: 4,
		overflow: 'hidden',
		marginRight: 8,
	},
	timeAgo: {
		fontSize: 10,
		color: '#888',
		fontWeight: '500',
	},
	question: {
		fontSize: 15,
		fontWeight: '700',
		color: '#1a1a1a',
		marginBottom: 4,
		lineHeight: 20,
	},
	shortDesc: {
		fontSize: 13,
		color: '#666',
		lineHeight: 18,
	},
	separator: {
		height: 1,
		backgroundColor: '#f0f0f0',
	},
	emptyContainer: {
		padding: 20,
		alignItems: 'center',
	},
	emptyText: {
		fontSize: 14,
		color: '#999',
	},
})
