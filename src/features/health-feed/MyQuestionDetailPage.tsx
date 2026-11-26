// src/features/health-feed/MyQuestionDetailPage.tsx
//
// The patient's "Your question" (designs "My questions · 2 · Question with doctors' answers" and "· 3 · Waiting for an answer"): the
// question, then either a "Waiting for a doctor" card or "N doctors answered" with one card per answer (doctor, verified tick, role,
// a "New" chip for what arrived since the patient last looked, the text, a Helpful vote and Consult), and the general-advice note.
// Data: the question handed over by the list, refreshed from GET /api/qa/{id}. Opening it marks its answers as seen.

import React, { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Toast from 'react-native-toast-message'
import { AppInfoBanner, AppScreenHeader, AppSoftCard } from '../../components/common'
import { APP_COLORS } from '../../config/theme'
import { ROUTES } from '../../navigation/routes'
import type { AppStackParamList } from '../../navigation/types'
import { getQuestionDetail, likeDoctorAnswer, type DoctorAnswer, type PatientQuestion } from '../../services/qaService'
import { AnswerCard } from './AnswerCard'
import { QuestionArticle } from './QuestionCard'
import { relativeTime } from './feedTheme'
import { isNewAnswer, useSeenQuestions } from './seenQuestions'

type Nav = NativeStackNavigationProp<AppStackParamList>

export default function MyQuestionDetailPage() {
	const navigation = useNavigation<Nav>()
	const route = useRoute<RouteProp<AppStackParamList, typeof ROUTES.STACK.PATIENT_MY_QUESTION_DETAIL>>()
	const insets = useSafeAreaInsets()
	const questionId = String(route.params.questionId)
	const { seen, markSeen, ready } = useSeenQuestions()

	const [q, setQ] = useState<PatientQuestion | null>((route.params.question as PatientQuestion | undefined) ?? null)
	const [loading, setLoading] = useState(!q)
	const [refreshing, setRefreshing] = useState(false)
	const [voted, setVoted] = useState<Record<string, number>>({})
	// When the patient last looked, kept from before this opening marks everything seen: it decides which answers say "New".
	const [since, setSince] = useState<string | undefined | null>(null)

	const load = useCallback(async () => {
		try {
			const res = await getQuestionDetail(questionId)
			if (res.success) setQ(res.data)
		} catch {
			Toast.show({ type: 'error', text1: 'Couldn’t load this question' })
		}
	}, [questionId])

	useEffect(() => {
		let alive = true
		const run = async () => {
			await load()
			if (alive) setLoading(false)
		}
		void run()
		return () => {
			alive = false
		}
	}, [load])

	useEffect(() => {
		if (!q || !ready || since !== null) return
		setSince(seen[q.id])
		void markSeen(q.id)
		// the first look at the loaded question only
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [q, ready])

	const onRefresh = async () => {
		setRefreshing(true)
		await load()
		setRefreshing(false)
	}

	const onHelpful = async (a: DoctorAnswer) => {
		if (voted[a.id] !== undefined) return
		setVoted((prev) => ({ ...prev, [a.id]: a.likes + 1 }))
		try {
			const res = await likeDoctorAnswer(a.id)
			if (res.success) setVoted((prev) => ({ ...prev, [a.id]: res.likes }))
		} catch {
			setVoted((prev) => {
				const { [a.id]: _undone, ...rest } = prev
				return rest
			})
			Toast.show({ type: 'error', text1: 'Couldn’t save your vote' })
		}
	}

	const answers = q?.answers ?? []

	return (
		<View style={styles.page}>
			<AppScreenHeader variant="bar" solid title="Your question" backAccessibilityLabel="Back to my questions" />

			{loading ? (
				<ActivityIndicator style={styles.loader} color={APP_COLORS.primary} />
			) : !q ? (
				<View style={styles.missing}>
					<Text style={styles.missingTitle}>Question not found</Text>
					<Text style={styles.missingText}>It may have been removed.</Text>
				</View>
			) : (
				<ScrollView
					refreshControl={
						<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={APP_COLORS.primary} />
					}
					contentContainerStyle={[styles.content, { paddingBottom: 40 + insets.bottom }]}
					showsVerticalScrollIndicator={false}
				>
					<QuestionArticle q={q} when={`Asked ${relativeTime(q.created_at)}`} />

					{answers.length === 0 ? (
						<AppInfoBanner
							tone="warning"
							icon={null}
							title="Waiting for a doctor"
							subtitle="Your question has gone to verified doctors. Most questions get an answer within 24 hours, and we’ll notify you as soon as one arrives."
							titleStyle={styles.waitingTitle}
						/>
					) : (
						<Text style={styles.answersHead}>
							{answers.length} {answers.length === 1 ? 'doctor' : 'doctors'} answered
						</Text>
					)}

					{answers.map((a) => (
						<AnswerCard
							key={a.id}
							a={a}
							likes={voted[a.id] ?? a.likes}
							voted={voted[a.id] !== undefined}
							isNew={isNewAnswer(a.created_at, since ?? undefined)}
							whenPrefix="Answered "
							spread
							onHelpful={() => void onHelpful(a)}
							onConsult={() => navigation.navigate(ROUTES.STACK.DOCTOR_DETAIL, { id: a.doctor_id })}
						/>
					))}

					<AppSoftCard radius={12} padding={12}>
						<Text style={styles.noteText}>
							Answers are general guidance from verified doctors, not a diagnosis. For chest pain,
							breathlessness or very low sugar, go to emergency care.
						</Text>
					</AppSoftCard>
				</ScrollView>
			)}
		</View>
	)
}

const styles = StyleSheet.create({
	page: { flex: 1, backgroundColor: APP_COLORS.pageBg },
	loader: { marginTop: 40 },
	content: { padding: 16, gap: 12 },
	missing: { alignItems: 'center', paddingHorizontal: 32, paddingVertical: 64, gap: 4 },
	missingTitle: { fontSize: 16, lineHeight: 22, fontWeight: '800', color: APP_COLORS.ink },
	missingText: { fontSize: 13, lineHeight: 19, color: APP_COLORS.inkMuted },
	waitingTitle: { fontSize: 15, lineHeight: 20 },
	answersHead: { marginTop: 4, fontSize: 16, lineHeight: 22, fontWeight: '800', color: APP_COLORS.ink },
	noteText: { fontSize: 12, lineHeight: 17, color: APP_COLORS.inkMuted },
})
