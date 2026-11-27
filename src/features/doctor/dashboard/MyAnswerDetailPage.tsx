// src/features/doctor/dashboard/MyAnswerDetailPage.tsx
//
// A doctor's "Question & answers" (designs "5b · Question & all doctors' answers" and "5c · Question · only you answered"): the question,
// the doctor's own answer ("YOUR ANSWER", with when and how many found it helpful), then "N other doctors answered" (name, verified
// tick, role, a "New" chip for what arrived since the doctor last looked, the text, helpful votes and when), or a dashed note when
// only the doctor has answered. Data: the question handed over by the list, refreshed from GET /api/qa/{id}; the doctor's own answer is
// the one flagged `is_mine`. Opening it marks the answers as seen. (The design's "Edit answer" is not built: there is no edit endpoint.)

import React, { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useRoute, type RouteProp } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Toast from 'react-native-toast-message'
import { AppPathIcon, AppScreenHeader, AppSoftCard } from '../../../components/common'
import { APP_COLORS } from '../../../config/theme'
import { ROUTES } from '../../../navigation/routes'
import type { AppStackParamList } from '../../../navigation/types'
import { getQuestionDetail, type PatientQuestion } from '../../../services/qaService'
import { NewChip, QuestionArticle, VerifiedBadge } from '../../health-feed/QuestionCard'
import { FEED_ICONS, relativeTime } from '../../health-feed/feedTheme'
import { isNewAnswer, useSeenQuestions } from '../../health-feed/seenQuestions'

export default function MyAnswerDetailPage() {
	const route = useRoute<RouteProp<AppStackParamList, typeof ROUTES.STACK.DOCTOR_MY_ANSWER_DETAIL>>()
	const insets = useSafeAreaInsets()
	const questionId = String(route.params.questionId)
	const { seen, markSeen, ready } = useSeenQuestions()

	const [q, setQ] = useState<PatientQuestion | null>((route.params.question as PatientQuestion | undefined) ?? null)
	const [loading, setLoading] = useState(!q)
	const [refreshing, setRefreshing] = useState(false)
	// When the doctor last looked, kept from before this opening marks everything seen: it decides which answers say "New".
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

	const mine = q?.answers.find((a) => a.is_mine)
	const others = (q?.answers ?? []).filter((a) => !a.is_mine)

	return (
		<View style={styles.page}>
			<AppScreenHeader
				variant="bar"
				solid
				title="Question & answers"
				backAccessibilityLabel="Back to my answers"
			/>

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

					{!!mine && (
						<AppSoftCard borderColor={APP_COLORS.mintAccent} style={styles.mine}>
							<View style={styles.mineHead}>
								<Text style={styles.mineLabel}>YOUR ANSWER</Text>
								<Text style={styles.small}>Answered {relativeTime(mine.created_at)}</Text>
							</View>
							<Text style={styles.answerText}>{mine.answer}</Text>
							<View style={styles.votes}>
								<AppPathIcon
									d={FEED_ICONS.thumb}
									size={13}
									strokeWidth={2}
									color={APP_COLORS.inkMuted}
								/>
								<Text style={styles.small}>{mine.likes} found this helpful</Text>
							</View>
						</AppSoftCard>
					)}

					{others.length > 0 ? (
						<>
							<Text style={styles.othersHead}>
								{others.length} other {others.length === 1 ? 'doctor' : 'doctors'} answered
							</Text>
							{others.map((a) => (
								<AppSoftCard key={a.id} padding={12} style={styles.other}>
									<View style={styles.nameRow}>
										<Text style={styles.docName} numberOfLines={1}>
											{a.doctor_name}
										</Text>
										<VerifiedBadge />
										<Text style={styles.docRole} numberOfLines={1}>
											· {a.doctor_specialty}
										</Text>
										{isNewAnswer(a.created_at, since ?? undefined) && <NewChip text="New" />}
									</View>
									<Text style={styles.otherText}>{a.answer}</Text>
									<View style={styles.votes}>
										<AppPathIcon
											d={FEED_ICONS.thumb}
											size={13}
											strokeWidth={2}
											color={APP_COLORS.inkMuted}
										/>
										<Text style={styles.small}>
											{a.likes} helpful · {relativeTime(a.created_at)}
										</Text>
									</View>
								</AppSoftCard>
							))}
						</>
					) : (
						<AppSoftCard style={styles.only}>
							<Text style={styles.onlyText}>
								Only you have answered so far. Other doctors’ answers will appear here.
							</Text>
						</AppSoftCard>
					)}
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
	mine: { borderWidth: 1.5, gap: 10 },
	mineHead: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'space-between' },
	mineLabel: { fontSize: 13, lineHeight: 18, fontWeight: '800', letterSpacing: 0.5, color: APP_COLORS.primary },
	answerText: { fontSize: 14, lineHeight: 21, color: APP_COLORS.ink },
	votes: { flexDirection: 'row', alignItems: 'center', gap: 4 },
	small: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
	othersHead: { marginTop: 4, fontSize: 15, lineHeight: 20, fontWeight: '800', color: APP_COLORS.ink },
	other: { gap: 6 },
	nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
	docName: { flexShrink: 1, fontSize: 14, lineHeight: 20, fontWeight: '800', color: APP_COLORS.ink },
	docRole: { flex: 1, minWidth: 0, fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
	otherText: { fontSize: 13, lineHeight: 19, color: APP_COLORS.inkMuted },
	only: { borderStyle: 'dashed' },
	onlyText: { fontSize: 13, lineHeight: 19, color: APP_COLORS.inkMuted },
})
