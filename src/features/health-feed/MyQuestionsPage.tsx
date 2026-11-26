// src/features/health-feed/MyQuestionsPage.tsx
//
// The patient's "My questions" (design "My questions · 1 · All your questions"): the shared app bar with "Your name is never shown to
// others", one card per question the patient asked (the ones still waiting for a doctor first, then the answered ones), an "N new" chip
// where doctors answered since the patient last looked, and a pinned "Ask a new question" button. Data: GET /api/qa?scope=mine.
// The card is the shared QuestionCard (variant 'mine').

import React, { useCallback, useMemo, useState } from 'react'
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AppEmptyCard, AppPathIcon, AppScreenHeader } from '../../components/common'
import { APP_COLORS } from '../../config/theme'
import { ROUTES } from '../../navigation/routes'
import type { AppStackParamList } from '../../navigation/types'
import { listMyQuestions, type PatientQuestion } from '../../services/qaService'
import { AskQuestionSheet } from './AskQuestionSheet'
import { QuestionCard } from './QuestionCard'
import { FEED_ICONS } from './feedTheme'
import { newAnswerCount, useSeenQuestions } from './seenQuestions'

type Nav = NativeStackNavigationProp<AppStackParamList>

const PAGE_SIZE = 50 // the API's maximum page size
const MAX_PAGES = 4

export default function MyQuestionsPage() {
	const navigation = useNavigation<Nav>()
	const insets = useSafeAreaInsets()
	const { seen } = useSeenQuestions()

	const [questions, setQuestions] = useState<PatientQuestion[] | null>(null)
	const [refreshing, setRefreshing] = useState(false)
	const [error, setError] = useState(false)
	const [askOpen, setAskOpen] = useState(false)

	const load = useCallback(async () => {
		setError(false)
		try {
			const rows: PatientQuestion[] = []
			for (let page = 1; page <= MAX_PAGES; page++) {
				const res = await listMyQuestions(page, PAGE_SIZE)
				if (!res.success) throw new Error('questions failed')
				rows.push(...res.data)
				if (page >= (res.meta?.pages ?? 1)) break
			}
			setQuestions(rows)
		} catch {
			setError(true)
			setQuestions((prev) => prev ?? [])
		}
	}, [])

	// On every opening, so a question just asked, or an answer that just arrived, shows without a pull.
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

	// Waiting for a doctor first, then the answered ones, each newest first (the order the server sends).
	const list = useMemo(() => {
		const rows = questions ?? []
		return [...rows.filter((q) => q.answers.length === 0), ...rows.filter((q) => q.answers.length > 0)]
	}, [questions])

	const open = (q: PatientQuestion) =>
		navigation.navigate(ROUTES.STACK.PATIENT_MY_QUESTION_DETAIL, { questionId: q.id, question: q })

	return (
		<View style={styles.page}>
			<AppScreenHeader
				variant="bar"
				solid
				title="My questions"
				subtitle="Your name is never shown to others"
				backAccessibilityLabel="Back"
			/>

			{questions === null ? (
				<ActivityIndicator style={styles.loader} color={APP_COLORS.primary} />
			) : (
				<FlatList
					data={list}
					keyExtractor={(q) => q.id}
					refreshControl={
						<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={APP_COLORS.primary} />
					}
					contentContainerStyle={{ paddingTop: 16, paddingBottom: 100 + insets.bottom, flexGrow: 1 }}
					showsVerticalScrollIndicator={false}
					ItemSeparatorComponent={() => <View style={styles.gap} />}
					renderItem={({ item }) => (
						<QuestionCard
							q={item}
							variant="mine"
							newCount={newAnswerCount(item, seen[item.id])}
							onPress={() => open(item)}
						/>
					)}
					ListEmptyComponent={
						<AppEmptyCard
							style={styles.empty}
							title={error ? 'Couldn’t load your questions' : 'You haven’t asked a question yet'}
							message={
								error
									? 'Check your connection and pull down to try again.'
									: 'Ask a verified doctor for free. Your name is never shown to others.'
							}
						/>
					}
				/>
			)}

			<View pointerEvents="box-none" style={[styles.fabWrap, { bottom: Math.max(16, insets.bottom + 8) }]}>
				<Pressable onPress={() => setAskOpen(true)} accessibilityRole="button" style={styles.fab}>
					<AppPathIcon d={FEED_ICONS.plus} size={20} strokeWidth={2.4} color="#FFFFFF" />
					<Text style={styles.fabText}>Ask a new question</Text>
				</Pressable>
			</View>

			<AskQuestionSheet
				visible={askOpen}
				onClose={() => setAskOpen(false)}
				onPosted={() => void load()}
				onViewQuestion={(id) =>
					navigation.navigate(ROUTES.STACK.PATIENT_MY_QUESTION_DETAIL, { questionId: id })
				}
			/>
		</View>
	)
}

const styles = StyleSheet.create({
	page: { flex: 1, backgroundColor: APP_COLORS.pageBg },
	loader: { marginTop: 40 },
	gap: { height: 10 },
	empty: { marginHorizontal: 16 },
	fabWrap: { position: 'absolute', left: 16, right: 16 },
	fab: {
		height: 52,
		borderRadius: 12,
		backgroundColor: APP_COLORS.primary,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
		shadowColor: APP_COLORS.ink,
		shadowOpacity: 0.25,
		shadowRadius: 12,
		shadowOffset: { width: 0, height: 6 },
		elevation: 6,
	},
	fabText: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
})
