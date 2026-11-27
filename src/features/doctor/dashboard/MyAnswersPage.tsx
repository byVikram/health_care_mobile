// src/features/doctor/dashboard/MyAnswersPage.tsx
//
// A doctor's "My answers" (design "5a · My answers"): the shared app bar, one card per question the doctor answered, the newest answer
// first: the topic and who asked, "You: first line of my answer", an "N new answers" chip when other doctors answered since the doctor
// last looked, and a footer with the helpful votes, who else answered and when. Data: GET /api/qa?scope=answered_by_me. The card is the
// shared QuestionCard (variant 'answered'); a card opens "Question & answers" (MyAnswerDetailPage).

import React, { useCallback, useState } from 'react'
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AppEmptyCard, AppScreenHeader } from '../../../components/common'
import { APP_COLORS } from '../../../config/theme'
import { ROUTES } from '../../../navigation/routes'
import type { AppStackParamList } from '../../../navigation/types'
import { listMyAnswers, type PatientQuestion } from '../../../services/qaService'
import { QuestionCard } from '../../health-feed/QuestionCard'
import { newAnswerCount, useSeenQuestions } from '../../health-feed/seenQuestions'

type Nav = NativeStackNavigationProp<AppStackParamList>

const PAGE_SIZE = 50 // the API's maximum page size
const MAX_PAGES = 4

export default function MyAnswersPage() {
	const navigation = useNavigation<Nav>()
	const insets = useSafeAreaInsets()
	const { seen } = useSeenQuestions()

	const [questions, setQuestions] = useState<PatientQuestion[] | null>(null)
	const [refreshing, setRefreshing] = useState(false)
	const [error, setError] = useState(false)

	const load = useCallback(async () => {
		setError(false)
		try {
			const rows: PatientQuestion[] = []
			for (let page = 1; page <= MAX_PAGES; page++) {
				const res = await listMyAnswers(page, PAGE_SIZE)
				if (!res.success) throw new Error('answers failed')
				rows.push(...res.data)
				if (page >= (res.meta?.pages ?? 1)) break
			}
			setQuestions(rows)
		} catch {
			setError(true)
			setQuestions((prev) => prev ?? [])
		}
	}, [])

	// On every opening, so another doctor's new answer shows without a pull.
	useFocusEffect(
		useCallback(() => {
			void load()
		}, [load])
	)

	const onRefresh = async () => {
		setRefreshing(true)
		await load()
		setRefreshing(false)
	}

	return (
		<View style={styles.page}>
			<AppScreenHeader
				variant="bar"
				solid
				title="My answers"
				backAccessibilityLabel="Back to patient questions"
			/>

			{questions === null ? (
				<ActivityIndicator style={styles.loader} color={APP_COLORS.primary} />
			) : (
				<FlatList
					data={questions}
					keyExtractor={(q) => q.id}
					refreshControl={
						<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={APP_COLORS.primary} />
					}
					contentContainerStyle={{ paddingTop: 16, paddingBottom: 24 + insets.bottom, flexGrow: 1 }}
					showsVerticalScrollIndicator={false}
					ItemSeparatorComponent={() => <View style={styles.gap} />}
					renderItem={({ item }) => (
						<QuestionCard
							q={item}
							variant="answered"
							newCount={newAnswerCount(item, seen[item.id], true)}
							onPress={() =>
								navigation.navigate(ROUTES.STACK.DOCTOR_MY_ANSWER_DETAIL, {
									questionId: item.id,
									question: item,
								})
							}
						/>
					)}
					ListEmptyComponent={
						<AppEmptyCard
							style={styles.empty}
							title={error ? 'Couldn’t load your answers' : 'You haven’t answered a question yet'}
							message={
								error
									? 'Check your connection and pull down to try again.'
									: 'The questions you answer will be listed here, with the other doctors’ answers.'
							}
						/>
					}
				/>
			)}
		</View>
	)
}

const styles = StyleSheet.create({
	page: { flex: 1, backgroundColor: APP_COLORS.pageBg },
	loader: { marginTop: 40 },
	gap: { height: 10 },
	empty: { marginHorizontal: 16 },
})
