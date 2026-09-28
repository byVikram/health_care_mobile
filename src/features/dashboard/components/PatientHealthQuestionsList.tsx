import React, { useEffect, useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet, ActivityIndicator, useWindowDimensions } from 'react-native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useNavigation, useRoute } from '@react-navigation/native'

import { AppInput } from '../../../components/common'
import { listHealthQuestions, PatientQuestion } from '../../../services/qaService'
import { ROUTES } from '../../../navigation/routes'
import type { AppNavigationParamList } from '../../../navigation/types'

type NavigationProp = NativeStackNavigationProp<AppNavigationParamList>

type Props = {
	showViewAll?: boolean
	itemLimit?: number
}

export default function PatientHealthQuestionsList({ showViewAll = true, itemLimit = 6 }: Props) {
	const navigation = useNavigation<NavigationProp>()
	const route = useRoute()
	const { width } = useWindowDimensions()
	const isTablet = width >= 768

	const isQuestionsListScreen = route.name === ROUTES.STACK.PATIENT_QUESTIONS_LIST

	const [searchQuery, setSearchQuery] = useState('')
	const [questions, setQuestions] = useState<PatientQuestion[]>([])
	const [loading, setLoading] = useState(true)

	const fetchQuestions = async () => {
		setLoading(true)
		try {
			const res = await listHealthQuestions(searchQuery)
			if (res.success && res.data) {
				setQuestions(res.data)
			}
		} catch (err) {
			console.error('Error fetching health expert questions:', err)
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		fetchQuestions()
	}, [searchQuery])

	const displayData = isQuestionsListScreen ? questions : questions.slice(0, itemLimit)

	const renderItem = ({ item }: { item: PatientQuestion }) => (
		<TouchableOpacity
			style={styles.card}
			onPress={() => navigation.navigate(ROUTES.STACK.PATIENT_QUESTION_DETAIL as any, { questionId: item.id })}
			activeOpacity={0.7}
		>
			<View style={styles.cardHeader}>

				<View style={styles.cardText}>
					<View style={styles.tagRow}>
						<Text style={styles.tag}>{item.tag || 'General'}</Text>
						<Text style={styles.timeAgo}>
							Asked for {item.gender || 'Patient'}{item.age ? `, ${item.age}` : ''}
						</Text>
					</View>
					<Text style={styles.question} numberOfLines={2}>
						{item.question}
					</Text>
					<Text style={styles.shortDesc} numberOfLines={2}>
						{item.short_description || item.full_description}
					</Text>
					<View style={styles.footerRow}>
						<Text style={styles.answersCount}>
							{item.answers ? item.answers.length : 0} Doctors Answered
						</Text>
						<Text style={styles.dateText}>
							{new Date(item.created_at).toLocaleDateString()}
						</Text>
					</View>
				</View>
			</View>
		</TouchableOpacity>
	)

	return (
		<>
			{/* Header outside card */}
			<View style={[styles.headerContainer, isTablet && styles.tabletContainer]}>
				<Text style={styles.sectionTitle}>Health Expert Answers to Your Health Questions</Text>

				{showViewAll && !isQuestionsListScreen && (
					<TouchableOpacity onPress={() => navigation.navigate(ROUTES.STACK.PATIENT_QUESTIONS_LIST as any)}>
						<Text style={styles.seeAllText}>View All</Text>
					</TouchableOpacity>
				)}
			</View>

			{/* Card */}
			<View style={[styles.container, isTablet && styles.tabletContainer]}>
				<View style={styles.searchRow}>
					<View style={styles.searchInputWrap}>
						<AppInput
							isSearch
							showMicrophone
							value={searchQuery}
							onChangeText={setSearchQuery}
							placeholder="Search questions or symptoms..."
							placeholderTextColor="#98a1aa"
							containerStyle={styles.searchInputContainer}
							style={styles.searchInput}
							contentStyle={styles.searchInputContent}
							outlineStyle={styles.searchInputOutline}
							outlineColor="#2e7b7d"
							activeOutlineColor="#2e7b7d"
							textColor="#1b2d3c"
							autoCorrect={false}
							returnKeyType="search"
							noMargin
						/>
					</View>
				</View>

				{loading ? (
					<ActivityIndicator size="small" color="#0c7c7c" style={{ marginVertical: 20 }} />
				) : (
					<FlatList
						data={displayData}
						keyExtractor={(item) => item.id.toString()}
						renderItem={renderItem}
						ItemSeparatorComponent={() => <View style={styles.separator} />}
						scrollEnabled={false}
						ListEmptyComponent={
							<View style={styles.emptyContainer}>
								<Text style={styles.emptyText}>No medical questions found.</Text>
							</View>
						}
					/>
				)}

				{!isQuestionsListScreen && (
					<TouchableOpacity
						style={styles.askButton}
						onPress={() => navigation.navigate(ROUTES.STACK.PATIENT_QUESTIONS_LIST as any, { openAskModal: true })}
					>
						<Text style={styles.askButtonText}>Ask a Free Question</Text>
					</TouchableOpacity>
				)}
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
	tabletContainer: {
		maxWidth: 840,
		width: '100%',
		alignSelf: 'center',
	},
	sectionTitle: {
		fontWeight: '700',
		fontSize: 14,
		color: '#1a1a1a',
		flex: 1,
		marginRight: 8,
	},
	seeAllText: {
		fontSize: 13,
		color: '#0c7c7c',
		fontWeight: '600',
	},
	searchRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		marginBottom: 12,
	},
	searchInputWrap: {
		flex: 1,
	},
	searchInputContainer: {
		width: '100%',
	},
	searchInput: {
		backgroundColor: '#ffffff',
	},
	searchInputContent: {
		height: 48,
		minHeight: 48,
		paddingVertical: 0,
		fontSize: 14,
	},
	searchInputOutline: {
		borderRadius: 12,
	},
	card: {
		paddingVertical: 12,
	},
	cardHeader: {
		flexDirection: 'row',
		alignItems: 'flex-start',
	},
	avatar: {
		width: 44,
		height: 44,
		borderRadius: 22,
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
		backgroundColor: '#ccfbf1',
		color: '#0f766e',
		fontSize: 10,
		fontWeight: '700',
		paddingHorizontal: 8,
		paddingVertical: 2,
		borderRadius: 4,
		overflow: 'hidden',
		marginRight: 8,
	},
	timeAgo: {
		fontSize: 11,
		color: '#64748b',
		fontWeight: '500',
	},
	question: {
		fontSize: 14.5,
		fontWeight: '700',
		color: '#0f172a',
		marginBottom: 4,
		lineHeight: 19,
	},
	shortDesc: {
		fontSize: 12.5,
		color: '#475569',
		lineHeight: 17,
		marginBottom: 6,
	},
	footerRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginTop: 4,
	},
	answersCount: {
		fontSize: 11.5,
		fontWeight: '700',
		color: '#0c7c7c',
	},
	dateText: {
		fontSize: 10.5,
		color: '#94a3b8',
	},
	separator: {
		height: 1,
		backgroundColor: '#f1f5f9',
	},
	emptyContainer: {
		padding: 20,
		alignItems: 'center',
	},
	emptyText: {
		fontSize: 13,
		color: '#94a3b8',
	},
	askButton: {
		backgroundColor: '#0c7c7c',
		borderRadius: 10,
		paddingVertical: 12,
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: 14,
	},
	askButtonText: {
		color: '#ffffff',
		fontSize: 14,
		fontWeight: '700',
	},
})
